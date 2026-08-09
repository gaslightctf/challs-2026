using System.Security.Cryptography;
using System.Text;

namespace CompleteHttp.Tls;

/// <summary>The TLS 1.2 pseudorandom function (RFC 5246 §5), SHA-256 flavour.</summary>
internal static class Prf
{
    /// <summary>PRF(secret, label, seed) = P_SHA256(secret, label || seed).</summary>
    public static byte[] Compute(
        byte[] secret, string label, ReadOnlySpan<byte> seed, int length)
    {
        byte[] labelBytes = Encoding.ASCII.GetBytes(label);

        var labelledSeed = new byte[labelBytes.Length + seed.Length];
        labelBytes.CopyTo(labelledSeed, 0);
        seed.CopyTo(labelledSeed.AsSpan(labelBytes.Length));

        return PHashSha256(secret, labelledSeed, length);
    }

    private static byte[] PHashSha256(byte[] secret, ReadOnlySpan<byte> seed, int length)
    {
        using var hmac = new HMACSHA256(secret);

        var output = new byte[length];
        byte[] a = seed.ToArray(); // A(0) = seed
        int written = 0;

        Span<byte> block = stackalloc byte[HMACSHA256.HashSizeInBytes];
        while (written < length)
        {
            a = hmac.ComputeHash(a); // A(i) = HMAC(secret, A(i-1))

            var input = new byte[a.Length + seed.Length];
            a.CopyTo(input, 0);
            seed.CopyTo(input.AsSpan(a.Length));
            hmac.TryComputeHash(input, block, out _);

            int take = Math.Min(block.Length, length - written);
            block[..take].CopyTo(output.AsSpan(written));
            written += take;
        }

        return output;
    }
}
