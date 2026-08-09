using System.Buffers.Binary;
using System.Security.Cryptography;

namespace CompleteHttp.Tls;

/// <summary>
/// The TLS_RSA_WITH_AES_128_CBC_SHA record protection: MAC-then-encrypt with a
/// per-record explicit IV.
/// </summary>
internal static class RecordProtection
{
    /// <summary>AES block size, and the length of an HMAC-SHA1 tag.</summary>
    private const int BlockSize = 16;
    private const int MacLength = 20;

    /// <summary>
    /// Ciphertext may exceed the plaintext cap by the explicit IV, MAC and
    /// padding; RFC 5246 allows 2048 bytes of expansion.
    /// </summary>
    public const int MaxExpansion = 2048;

    /// <summary>Produces explicit IV || AES-CBC(plaintext || mac || pad).</summary>
    public static byte[] Protect(
        ConnectionState state, ContentType type, ReadOnlySpan<byte> plaintext)
    {
        byte[] mac = ComputeMac(state.MacKey, state.SeqNum, type, plaintext);

        var content = new byte[plaintext.Length + mac.Length];
        plaintext.CopyTo(content);
        mac.CopyTo(content.AsSpan(plaintext.Length));

        byte[] padded = AddPadding(content);

        // A fresh random IV per record: TLS 1.1+ made it explicit precisely so
        // that the IV isn't the previous record's last block (BEAST).
        byte[] iv = RandomNumberGenerator.GetBytes(BlockSize);

        using Aes aes = Aes.Create();
        aes.Key = state.EncKey;
        byte[] ciphertext = aes.EncryptCbc(padded, iv, PaddingMode.None);

        var record = new byte[iv.Length + ciphertext.Length];
        iv.CopyTo(record, 0);
        ciphertext.CopyTo(record, iv.Length);
        return record;
    }

    public static byte[] Unprotect(
        ConnectionState state, ContentType type, ReadOnlySpan<byte> ciphertext)
    {
        // Shortest legal record: explicit IV + one block holding MAC and padding.
        if (ciphertext.Length < BlockSize + MacLength + 1 ||
            (ciphertext.Length - BlockSize) % BlockSize != 0)
            throw new TlsAlertException(
                AlertDescription.BadRecordMac, "ciphertext is not a whole number of blocks");

        byte[] iv = ciphertext[..BlockSize].ToArray();

        byte[] decrypted;
        using (Aes aes = Aes.Create())
        {
            aes.Key = state.EncKey;
            decrypted = aes.DecryptCbc(ciphertext[BlockSize..], iv, PaddingMode.None);
        }

        ReadOnlySpan<byte> unpadded = StripPadding(decrypted);

        int contentLength = unpadded.Length - MacLength;
        if (contentLength < 0)
            throw new TlsAlertException(AlertDescription.BadRecordMac, "record is shorter than its MAC");

        ReadOnlySpan<byte> content = unpadded[..contentLength];
        byte[] expected = ComputeMac(state.MacKey, state.SeqNum, type, content);

        if (!unpadded[contentLength..].SequenceEqual(expected))
            throw new TlsAlertException(AlertDescription.BadRecordMac, "record MAC check failed");

        return content.ToArray();
    }

    /// <summary>HMAC-SHA1 over seq_num || type || version || length || plaintext.</summary>
    private static byte[] ComputeMac(
        byte[] macKey, ulong seqNum, ContentType type, ReadOnlySpan<byte> plaintext)
    {
        Span<byte> header = stackalloc byte[13];
        BinaryPrimitives.WriteUInt64BigEndian(header[..8], seqNum);
        header[8] = (byte)type;
        BinaryPrimitives.WriteUInt16BigEndian(header[9..11], TlsConstants.Tls12Version);
        BinaryPrimitives.WriteUInt16BigEndian(header[11..13], (ushort)plaintext.Length);

        using var hmac = new HMACSHA1(macKey);
        hmac.TransformBlock(header.ToArray(), 0, header.Length, null, 0);
        byte[] body = plaintext.ToArray();
        hmac.TransformFinalBlock(body, 0, body.Length);
        return hmac.Hash!;
    }

    /// <summary>TLS padding: (n+1) bytes each holding value n. Not PKCS7.</summary>
    private static byte[] AddPadding(ReadOnlySpan<byte> input)
    {
        int padLength = BlockSize - 1 - (input.Length % BlockSize);

        var padded = new byte[input.Length + padLength + 1];
        input.CopyTo(padded);
        padded.AsSpan(input.Length).Fill((byte)padLength);
        return padded;
    }

    /// <summary>Removes TLS padding, rejecting a block that isn't padded as promised.</summary>
    private static ReadOnlySpan<byte> StripPadding(ReadOnlySpan<byte> input)
    {
        int padLength = input[^1];
        int total = padLength + 1;

        if (total > input.Length)
            throw new TlsAlertException(AlertDescription.BadRecordMac, "padding runs past the record");

        ReadOnlySpan<byte> padding = input[^total..];
        if (padding.IndexOfAnyExcept((byte)padLength) >= 0)
            throw new TlsAlertException(AlertDescription.BadRecordMac, "inconsistent padding bytes");

        return input[..^total];
    }
}
