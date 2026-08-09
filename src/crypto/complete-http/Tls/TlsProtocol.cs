namespace CompleteHttp.Tls;

// ---------------------------------------------------------------------------
// Wire constants
// ---------------------------------------------------------------------------

internal enum ContentType : byte
{
    ChangeCipherSpec = 20,
    Alert            = 21,
    Handshake        = 22,
    ApplicationData  = 23,
}

internal enum HandshakeType : byte
{
    ClientHello       = 1,
    ServerHello       = 2,
    Certificate       = 11,
    ServerHelloDone   = 14,
    ClientKeyExchange = 16,
    Finished          = 20,
}

internal enum AlertLevel : byte
{
    Warning = 1,
    Fatal   = 2,
}

internal enum AlertDescription : byte
{
    CloseNotify          = 0,
    UnexpectedMessage    = 10,
    BadRecordMac         = 20,
    HandshakeFailure     = 40,
    IllegalParameter     = 47,
    DecodeError          = 50,
    DecryptError         = 51,
    ProtocolVersion      = 70,
    InsufficientSecurity = 71,
    InternalError        = 80,
}

internal static class TlsConstants
{
    public const ushort Tls12Version = 0x0303;
    public const ushort TlsRsaWithAes128CbcSha = 0x002F;

    public const ushort ExtensionExtendedMasterSecret = 0x0017;
    public const ushort ExtensionRenegotiationInfo    = 0xFF01;

    /// <summary>The largest plaintext fragment a single record may carry.</summary>
    public const int MaxRecordPlaintext = 16384;
}

/// <summary>Handshake progress, used to reject out-of-order messages.</summary>
internal enum HandshakeState
{
    Start,
    ReceivedClientHello,
    SentServerHelloDone,
    ReceivedClientKeyExchange,
    ReceivedChangeCipherSpec,
    ReceivedFinished,
    Established,
    Closed,
}

/// <summary>Thrown to abort a connection with a specific TLS alert.</summary>
internal sealed class TlsAlertException : Exception
{
    public AlertDescription Description { get; }
    public AlertLevel Level { get; }

    public TlsAlertException(AlertDescription description,
                             string? message = null,
                             AlertLevel level = AlertLevel.Fatal)
        : base(message ?? description.ToString())
    {
        Description = description;
        Level = level;
    }
}

/// <summary>
/// One direction's cipher state (RFC 5246 "connection state"). A null reference
/// stands for the null cipher, so an active state always has both its keys.
/// </summary>
internal sealed class ConnectionState(byte[] macKey, byte[] encKey)
{
    public byte[] MacKey { get; } = macKey;
    public byte[] EncKey { get; } = encKey;

    /// <summary>Record sequence number, reset to zero when this state activates.</summary>
    public ulong SeqNum;
}

/// <summary>The fields of a ClientHello that we parse off the wire.</summary>
internal sealed record ClientHello(
    ushort   ClientVersion,
    byte[]   Random,
    byte[]   SessionId,
    ushort[] CipherSuites,
    byte[]   CompressionMethods);
