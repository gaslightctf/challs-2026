using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace CompleteHttp.Tls;

/// <summary>
/// A server-side TLS 1.2 connection speaking exactly one cipher suite,
/// TLS_RSA_WITH_AES_128_CBC_SHA, with no resumption and no renegotiation.
/// </summary>
internal sealed class TlsConnection(Stream stream, X509Certificate2 certificate) : IDisposable
{
    private const int MaxHandshakeBytes = 64 * 1024;
    private const int MaxRequestBytes   = TlsConstants.MaxRecordPlaintext;
    private const int VerifyDataLength  = 12;

    private readonly Stream _stream = stream;
    private readonly X509Certificate2 _certificate = certificate;

    // Handshake reassembly buffer: handshake messages and records are
    // independently framed, so completed messages are drained from here.
    private readonly List<byte> _handshakeBuffer = [];

    // The version the client offered in its hello, remembered for the
    // premaster-secret rollback check in ClientKeyExchange.
    private ushort _clientVersion;

    // Set when the client offers extended_master_secret (RFC 7627); binding the
    // master secret to the handshake defeats the triple-handshake attack.
    private bool _extendedMasterSecret;

    private readonly byte[] _clientRandom = new byte[32];
    private readonly byte[] _serverRandom = new byte[32];
    private readonly byte[] _masterSecret = new byte[48];

    private readonly IncrementalHash _transcript =
        IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

    // A null state means the null cipher: records pass through unprotected.
    private ConnectionState? _read;
    private ConnectionState? _write;
    private ConnectionState? _pendingRead;
    private ConnectionState? _pendingWrite;

    public HandshakeState State { get; private set; } = HandshakeState.Start;

    // -- Handshake ---------------------------------------------------------

    /// <summary>Runs the full handshake, leaving the connection ready for data.</summary>
    public async Task HandshakeAsync(CancellationToken ct)
    {
        // Flight 1: the client's hello.
        ClientHello hello = ParseClientHello(
            await ReadHandshakeAsync(HandshakeType.ClientHello, ct));
        ValidateClientHello(hello);

        // Flight 2: our hello, our certificate, end of our flight.
        await WriteHandshakeAsync(HandshakeType.ServerHello, BuildServerHello(), ct);
        await WriteHandshakeAsync(HandshakeType.Certificate, BuildCertificate(), ct);
        await WriteHandshakeAsync(HandshakeType.ServerHelloDone, [], ct);

        // Flight 3: key exchange, then the client switches cipher and proves it.
        byte[] premaster = DecryptPremasterSecret(
            await ReadHandshakeAsync(HandshakeType.ClientKeyExchange, ct));
        DeriveKeys(premaster);

        await ReadChangeCipherSpecAsync(ct);
        await VerifyClientFinishedAsync(ct);

        // Flight 4: we switch cipher and prove it in turn.
        await WriteChangeCipherSpecAsync(ct);
        await WriteServerFinishedAsync(ct);
    }

    private ClientHello ParseClientHello(byte[] body)
    {
        if (State != HandshakeState.Start)
            throw new TlsAlertException(
                AlertDescription.UnexpectedMessage, "client hello out of order");

        var reader = new TlsReader(body);

        ushort clientVersion = reader.ReadUInt16();
        byte[] random = reader.ReadBytes(32).ToArray();
        byte[] sessionId = reader.ReadVector8().ToArray();
        ReadOnlySpan<byte> suitesRaw = reader.ReadVector16();
        byte[] compression = reader.ReadVector8().ToArray();
        ParseExtensions(ref reader);

        if (suitesRaw.Length == 0 || suitesRaw.Length % 2 != 0)
            throw new TlsAlertException(
                AlertDescription.DecodeError, "malformed cipher_suites vector");

        var suites = new ushort[suitesRaw.Length / 2];
        for (int i = 0; i < suites.Length; i++)
            suites[i] = BinaryPrimitives.ReadUInt16BigEndian(suitesRaw.Slice(i * 2, 2));

        random.CopyTo(_clientRandom, 0);
        _clientVersion = clientVersion;
        State = HandshakeState.ReceivedClientHello;

        return new ClientHello(clientVersion, random, sessionId, suites, compression);
    }

    /// <summary>
    /// Walks the hello's extensions. Everything we don't understand is skipped,
    /// as required; the only one we act on is extended_master_secret.
    /// </summary>
    private void ParseExtensions(ref TlsReader reader)
    {
        if (reader.IsEmpty)
            return; // a hello may legitimately carry no extensions block

        var extensions = new TlsReader(reader.ReadVector16());

        while (!extensions.IsEmpty)
        {
            ushort type = extensions.ReadUInt16();
            ReadOnlySpan<byte> data = extensions.ReadVector16();

            switch (type)
            {
                case TlsConstants.ExtensionExtendedMasterSecret when data.Length == 0:
                    _extendedMasterSecret = true;
                    break;

                case TlsConstants.ExtensionRenegotiationInfo when data is [0]:
                    // Empty renegotiated_connection: this is an initial
                    // handshake, which is the only kind we do.
                    break;

                case TlsConstants.ExtensionRenegotiationInfo:
                    throw new TlsAlertException(
                        AlertDescription.HandshakeFailure, "renegotiation is not supported");
            }
        }
    }

    /// <summary>Rejects a hello that doesn't offer our suite or version.</summary>
    private static void ValidateClientHello(ClientHello hello)
    {
        // client_version is the *highest* the client supports; we only speak 1.2.
        if (hello.ClientVersion < TlsConstants.Tls12Version)
            throw new TlsAlertException(
                AlertDescription.ProtocolVersion, $"client offered 0x{hello.ClientVersion:x4}");

        if (!hello.CipherSuites.Contains(TlsConstants.TlsRsaWithAes128CbcSha))
            throw new TlsAlertException(
                AlertDescription.HandshakeFailure, "no shared cipher suite");

        if (!hello.CompressionMethods.Contains((byte)0))
            throw new TlsAlertException(
                AlertDescription.IllegalParameter, "null compression not offered");
    }

    private byte[] BuildServerHello()
    {
        RandomNumberGenerator.Fill(_serverRandom);

        var extensions = new TlsWriter();

        // RFC 5746: an empty renegotiation_info tells the client we understand
        // secure renegotiation. Without it, OpenSSL clients refuse to connect.
        WriteExtension(extensions, TlsConstants.ExtensionRenegotiationInfo, [0]);

        if (_extendedMasterSecret)
            WriteExtension(extensions, TlsConstants.ExtensionExtendedMasterSecret, []);

        var body = new TlsWriter();
        body.WriteUInt16(TlsConstants.Tls12Version);
        body.WriteBytes(_serverRandom);
        body.WriteVector8([]); // empty session id: we don't support resumption
        body.WriteUInt16(TlsConstants.TlsRsaWithAes128CbcSha);
        body.WriteUInt8(0);    // null compression
        body.WriteVector16(extensions.ToArray());
        return body.ToArray();
    }

    private static void WriteExtension(TlsWriter writer, ushort type, ReadOnlySpan<byte> data)
    {
        writer.WriteUInt16(type);
        writer.WriteVector16(data);
    }

    private byte[] BuildCertificate()
    {
        byte[] der = _certificate.Export(X509ContentType.Cert);

        // certificate_list: uint24 list length, then uint24-prefixed certs.
        var body = new TlsWriter();
        body.WriteUInt24(3 + der.Length);
        body.WriteUInt24(der.Length);
        body.WriteBytes(der);
        return body.ToArray();
    }

    /// <summary>RSA-decrypts the premaster secret from a ClientKeyExchange body.</summary>
    private byte[] DecryptPremasterSecret(byte[] body)
    {
        if (State != HandshakeState.SentServerHelloDone)
            throw new TlsAlertException(
                AlertDescription.UnexpectedMessage, "key exchange out of order");

        var reader = new TlsReader(body);
        byte[] encrypted = reader.ReadVector16().ToArray();
        reader.ExpectEnd("encrypted premaster");

        using RSA? rsa = _certificate.GetRSAPrivateKey();
        if (rsa is null)
            throw new TlsAlertException(AlertDescription.InternalError, "no RSA private key");

        byte[] premaster;
        try
        {
            premaster = rsa.Decrypt(encrypted, RSAEncryptionPadding.Pkcs1);
        }
        catch (CryptographicException)
        {
            throw new TlsAlertException(
                AlertDescription.DecryptError, "premaster secret is not valid PKCS#1");
        }

        // The premaster carries the version the client offered in its hello, so
        // that an attacker can't talk the two sides down to an older protocol.
        if (premaster.Length != 48 ||
            premaster[0] != (_clientVersion >> 8) || premaster[1] != (_clientVersion & 0xFF))
            throw new TlsAlertException(
                AlertDescription.DecryptError, "premaster secret is malformed");

        State = HandshakeState.ReceivedClientKeyExchange;
        return premaster;
    }

    /// <summary>Derives master secret + key block, filling the pending states.</summary>
    private void DeriveKeys(byte[] premasterSecret)
    {
        Span<byte> seed = stackalloc byte[64];

        if (_extendedMasterSecret)
        {
            // RFC 7627: bind the master secret to the whole handshake so far
            // (ClientHello through ClientKeyExchange) instead of the randoms.
            byte[] sessionHash = _transcript.GetCurrentHash();
            Prf.Compute(premasterSecret, "extended master secret", sessionHash, 48)
                .CopyTo(_masterSecret, 0);
        }
        else
        {
            _clientRandom.CopyTo(seed);
            _serverRandom.CopyTo(seed[32..]);
            Prf.Compute(premasterSecret, "master secret", seed, 48).CopyTo(_masterSecret, 0);
        }

        // key_expansion feeds the randoms in the opposite order.
        _serverRandom.CopyTo(seed);
        _clientRandom.CopyTo(seed[32..]);

        // 2 x 20-byte HMAC-SHA1 keys + 2 x 16-byte AES-128 keys. TLS 1.2 CBC
        // suites carry a per-record explicit IV, so no IVs in the key block.
        byte[] keyBlock = Prf.Compute(_masterSecret, "key expansion", seed, 2 * 20 + 2 * 16);

        _pendingRead = new ConnectionState(
            macKey: keyBlock[..20],     // client_write_MAC_key
            encKey: keyBlock[40..56]);  // client_write_key
        _pendingWrite = new ConnectionState(
            macKey: keyBlock[20..40],   // server_write_MAC_key
            encKey: keyBlock[56..72]);  // server_write_key
    }

    private async Task ReadChangeCipherSpecAsync(CancellationToken ct)
    {
        (ContentType type, byte[] plaintext) = await ReadRecordAsync(ct);

        if (type == ContentType.Alert)
            throw new IOException(DescribeAlert(plaintext));

        if (type != ContentType.ChangeCipherSpec)
            throw new TlsAlertException(
                AlertDescription.UnexpectedMessage, $"expected CCS, got {type}");

        if (plaintext is not [1])
            throw new TlsAlertException(
                AlertDescription.IllegalParameter, "malformed change_cipher_spec");

        // A CCS may not land in the middle of a handshake message.
        if (_handshakeBuffer.Count != 0)
            throw new TlsAlertException(
                AlertDescription.UnexpectedMessage, "CCS interleaved with a handshake message");

        // Activating a pending state also resets that direction's seq_num.
        _read = _pendingRead ?? throw new TlsAlertException(
            AlertDescription.UnexpectedMessage, "change_cipher_spec before key exchange");
        _pendingRead = null;
        _read.SeqNum = 0;

        State = HandshakeState.ReceivedChangeCipherSpec;
    }

    private async Task WriteChangeCipherSpecAsync(CancellationToken ct)
    {
        await WriteRecordAsync(ContentType.ChangeCipherSpec, new byte[] { 1 }, ct);

        _write = _pendingWrite ?? throw new TlsAlertException(
            AlertDescription.InternalError, "no pending write keys");
        _pendingWrite = null;
        _write.SeqNum = 0;
    }

    /// <summary>Reads the client Finished and checks verify_data against the transcript.</summary>
    private async Task VerifyClientFinishedAsync(CancellationToken ct)
    {
        if (State != HandshakeState.ReceivedChangeCipherSpec)
            throw new TlsAlertException(
                AlertDescription.UnexpectedMessage, "Finished before change_cipher_spec");

        // Finished is read without feeding the transcript: its own verify_data
        // covers the transcript *before* it, so it joins only once it checks out.
        byte[] verifyData =
            await ReadHandshakeAsync(HandshakeType.Finished, feedTranscript: false, ct);

        if (verifyData.Length != VerifyDataLength)
            throw new TlsAlertException(
                AlertDescription.DecodeError, $"verify_data of {verifyData.Length} bytes");

        byte[] expected = Prf.Compute(
            _masterSecret, "client finished", _transcript.GetCurrentHash(), VerifyDataLength);

        if (!expected.SequenceEqual(verifyData))
            throw new TlsAlertException(
                AlertDescription.DecryptError, "client verify_data mismatch");

        _transcript.AppendData(EncodeHandshake(HandshakeType.Finished, verifyData));
        State = HandshakeState.ReceivedFinished;
    }

    private async Task WriteServerFinishedAsync(CancellationToken ct)
    {
        byte[] verifyData = Prf.Compute(
            _masterSecret, "server finished", _transcript.GetCurrentHash(), VerifyDataLength);

        await WriteHandshakeAsync(HandshakeType.Finished, verifyData, ct);
    }

    // -- Handshake framing -------------------------------------------------

    /// <summary>Reads the next handshake message body, asserting its type.</summary>
    private Task<byte[]> ReadHandshakeAsync(HandshakeType expected, CancellationToken ct)
        => ReadHandshakeAsync(expected, feedTranscript: true, ct);

    private async Task<byte[]> ReadHandshakeAsync(
        HandshakeType expected, bool feedTranscript, CancellationToken ct)
    {
        while (true)
        {
            // Handshake framing is independent of record framing, so a message
            // may already sit complete in the buffer, or span several records.
            if (TryTakeHandshake(expected, feedTranscript, out byte[]? body))
                return body;

            (ContentType recordType, byte[] plaintext) = await ReadRecordAsync(ct);

            if (recordType == ContentType.Alert)
                throw new IOException(DescribeAlert(plaintext));

            if (recordType != ContentType.Handshake)
                throw new TlsAlertException(
                    AlertDescription.UnexpectedMessage, $"expected handshake, got {recordType}");

            _handshakeBuffer.AddRange(plaintext);
        }
    }

    /// <summary>Drains one complete message from the reassembly buffer, if there is one.</summary>
    private bool TryTakeHandshake(
        HandshakeType expected, bool feedTranscript, out byte[] body)
    {
        body = [];

        if (_handshakeBuffer.Count < 4)
            return false;

        int length = (_handshakeBuffer[1] << 16) | (_handshakeBuffer[2] << 8) | _handshakeBuffer[3];
        if (length > MaxHandshakeBytes)
            throw new TlsAlertException(
                AlertDescription.DecodeError, $"handshake message of {length} bytes");

        if (_handshakeBuffer.Count < 4 + length)
            return false;

        var message = new byte[4 + length];
        _handshakeBuffer.CopyTo(0, message, 0, message.Length);
        _handshakeBuffer.RemoveRange(0, message.Length);

        var type = (HandshakeType)message[0];
        if (type != expected)
            throw new TlsAlertException(
                AlertDescription.UnexpectedMessage, $"expected {expected}, got {type}");

        // The transcript covers messages verbatim, header included.
        if (feedTranscript)
            _transcript.AppendData(message);

        body = message[4..];
        return true;
    }

    /// <summary>Serialises and sends a handshake message, feeding the transcript.</summary>
    private async Task WriteHandshakeAsync(
        HandshakeType type, byte[] body, CancellationToken ct)
    {
        byte[] message = EncodeHandshake(type, body);

        _transcript.AppendData(message);
        await WriteRecordAsync(ContentType.Handshake, message, ct);

        State = type switch
        {
            HandshakeType.ServerHelloDone => HandshakeState.SentServerHelloDone,
            HandshakeType.Finished        => HandshakeState.Established,
            _                             => State,
        };
    }

    /// <summary>msg_type || uint24 length || body, the form the transcript covers.</summary>
    private static byte[] EncodeHandshake(HandshakeType type, ReadOnlySpan<byte> body)
    {
        var writer = new TlsWriter();
        writer.WriteUInt8((byte)type);
        writer.WriteUInt24(body.Length);
        writer.WriteBytes(body);
        return writer.ToArray();
    }

    // -- Application data --------------------------------------------------

    /// <summary>
    /// Minimal HTTP/1.1 responder: any GET gets the flag, anything else 400.
    /// One request per connection; the caller sends close_notify afterwards.
    /// </summary>
    public async Task ServeApplicationDataAsync(CancellationToken ct)
    {
        var buffer = new StringBuilder();
        string request = string.Empty;

        // Read records until we've seen the end of the request headers.
        while (!request.Contains("\r\n\r\n", StringComparison.Ordinal))
        {
            (ContentType type, byte[] plaintext) = await ReadRecordAsync(ct);

            if (type == ContentType.Alert)
                return; // peer is closing

            if (type != ContentType.ApplicationData)
                throw new TlsAlertException(
                    AlertDescription.UnexpectedMessage, $"unexpected {type} in application phase");

            buffer.Append(Encoding.ASCII.GetString(plaintext));

            if (buffer.Length > MaxRequestBytes)
                throw new TlsAlertException(AlertDescription.DecodeError, "request too large");

            request = buffer.ToString();
        }

        bool isGet = request.StartsWith("GET ", StringComparison.Ordinal);
        string status = isGet ? "200 OK" : "400 Bad Request";
        string body = isGet
            ? Environment.GetEnvironmentVariable("FLAG") ?? "gaslightCTF{fake_flag}"
            : "bad request";

        byte[] payload = Encoding.UTF8.GetBytes(
            $"HTTP/1.1 {status}\r\n" +
            "Content-Type: text/plain\r\n" +
            $"Content-Length: {Encoding.UTF8.GetByteCount(body)}\r\n" +
            "Connection: close\r\n" +
            "\r\n" +
            body);

        await WriteRecordAsync(ContentType.ApplicationData, payload, ct);
    }

    // -- Alerts ------------------------------------------------------------

    public async Task SendAlertAsync(
        AlertLevel level, AlertDescription description, CancellationToken ct)
    {
        if (State == HandshakeState.Closed)
            return;

        await WriteRecordAsync(
            ContentType.Alert, new[] { (byte)level, (byte)description }, ct);

        if (level == AlertLevel.Fatal || description == AlertDescription.CloseNotify)
            State = HandshakeState.Closed;
    }

    private static string DescribeAlert(ReadOnlySpan<byte> body)
        => body.Length == 2
            ? $"peer alert: {(AlertLevel)body[0]}/{(AlertDescription)body[1]}"
            : "peer sent a malformed alert";

    // -- Record layer ------------------------------------------------------

    /// <summary>Reads one record, decrypting and MAC-checking once the read state is active.</summary>
    private async Task<(ContentType Type, byte[] Plaintext)> ReadRecordAsync(CancellationToken ct)
    {
        var header = new byte[5];
        await ReadExactAsync(header, ct);

        var type = (ContentType)header[0];
        if (!Enum.IsDefined(type))
            throw new TlsAlertException(
                AlertDescription.UnexpectedMessage, $"unknown content type {header[0]}");

        // The initial ClientHello is stamped with a legacy version (usually
        // 0x0301) for compatibility with ancient servers, so only the major
        // version is meaningful until we've negotiated (RFC 5246 appendix E).
        ushort version = BinaryPrimitives.ReadUInt16BigEndian(header.AsSpan(1, 2));
        bool acceptable = State == HandshakeState.Start
            ? header[1] == 0x03
            : version == TlsConstants.Tls12Version;

        if (!acceptable)
            throw new TlsAlertException(
                AlertDescription.ProtocolVersion, $"record version 0x{version:x4}");

        int length = BinaryPrimitives.ReadUInt16BigEndian(header.AsSpan(3, 2));

        int maxLength = _read is null
            ? TlsConstants.MaxRecordPlaintext
            : TlsConstants.MaxRecordPlaintext + RecordProtection.MaxExpansion;

        if (length > maxLength)
            throw new TlsAlertException(
                AlertDescription.DecodeError, $"record of {length} bytes too large");

        var fragment = new byte[length];
        await ReadExactAsync(fragment, ct);

        if (_read is null)
            return (type, fragment);

        byte[] plaintext = RecordProtection.Unprotect(_read, type, fragment);
        _read.SeqNum++;
        return (type, plaintext);
    }

    /// <summary>Fragments and writes plaintext, encrypting once the write state is active.</summary>
    private async Task WriteRecordAsync(
        ContentType type, ReadOnlyMemory<byte> plaintext, CancellationToken ct)
    {
        // A zero-length fragment is still a legal record, so this runs at least once.
        int offset = 0;
        do
        {
            int chunk = Math.Min(TlsConstants.MaxRecordPlaintext, plaintext.Length - offset);
            ReadOnlyMemory<byte> fragment = plaintext.Slice(offset, chunk);
            offset += chunk;

            byte[] payload;
            if (_write is null)
            {
                payload = fragment.ToArray();
            }
            else
            {
                payload = RecordProtection.Protect(_write, type, fragment.Span);
                _write.SeqNum++;
            }

            var record = new byte[5 + payload.Length];
            record[0] = (byte)type;
            BinaryPrimitives.WriteUInt16BigEndian(record.AsSpan(1, 2), TlsConstants.Tls12Version);
            BinaryPrimitives.WriteUInt16BigEndian(record.AsSpan(3, 2), (ushort)payload.Length);
            payload.CopyTo(record.AsSpan(5));

            await _stream.WriteAsync(record, ct);
        }
        while (offset < plaintext.Length);

        await _stream.FlushAsync(ct);
    }

    /// <summary>Fills the buffer or throws; a truncated record is not recoverable.</summary>
    private async Task ReadExactAsync(Memory<byte> buffer, CancellationToken ct)
    {
        int read = 0;
        while (read < buffer.Length)
        {
            int n = await _stream.ReadAsync(buffer[read..], ct);
            if (n == 0)
                throw new IOException("peer closed mid-record");
            read += n;
        }
    }

    public void Dispose()
    {
        _transcript.Dispose();
        State = HandshakeState.Closed;
    }
}
