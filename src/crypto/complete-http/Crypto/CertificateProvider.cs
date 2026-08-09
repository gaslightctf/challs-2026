using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using SysBigInt = System.Numerics.BigInteger;

namespace CompleteHttp.Crypto;

/// <summary>
/// Certificate and key generation — the intentionally weak part of the
/// challenge. The private key is assembled from two factors we generate
/// ourselves, so the prime source is the only thing that decides its strength.
/// </summary>
internal static class CertificateProvider
{
    /// <summary>Must be a whole number of 32-bit limbs; see <see cref="BigInteger"/>.</summary>
    private const int PrimeBits = 1024;

    private static readonly SysBigInt PublicExponent = 65537;

    /// <summary>
    /// Generates the server's RSA key and a self-signed certificate. Both
    /// factors come from CompleteFTP's prime generator, so each is a 1024-bit
    /// number carrying only 32 bytes of entropy — a "short sleeve" key.
    /// </summary>
    public static X509Certificate2 CreateCertificate()
    {
        SysBigInt p = BigInteger.genPseudoPrime(PrimeBits, PublicExponent);
        SysBigInt q;
        do
        {
            q = BigInteger.genPseudoPrime(PrimeBits, PublicExponent);
        }
        while (q == p);

        // InverseQ is q^-1 mod p, which only exists in the form RSAParameters
        // wants when p is the larger factor.
        if (p < q)
            (p, q) = (q, p);

        using RSA key = RSA.Create();
        key.ImportParameters(BuildParameters(p, q));

        var request = new CertificateRequest(
            "CN=complete-http", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        DateTimeOffset now = DateTimeOffset.UtcNow;
        return request.CreateSelfSigned(now.AddDays(-1), now.AddYears(1));
    }

    /// <summary>
    /// Assembles the full private key from its two factors: the CRT parameters
    /// are derived here rather than by the platform, so nothing but p and q is
    /// chosen by us.
    /// </summary>
    private static RSAParameters BuildParameters(SysBigInt p, SysBigInt q)
    {
        SysBigInt n = p * q;
        SysBigInt pMinus1 = p - 1;
        SysBigInt qMinus1 = q - 1;

        // Carmichael's lambda, the smallest modulus for which d works.
        SysBigInt lambda = pMinus1 / SysBigInt.GreatestCommonDivisor(pMinus1, qMinus1) * qMinus1;
        SysBigInt d = BigInteger.ModInverse(PublicExponent, lambda);

        int half = PrimeBits / 8;
        return new RSAParameters
        {
            Modulus  = BigInteger.ToFixedWidth(n, half * 2),
            Exponent = BigInteger.ToFixedWidth(PublicExponent, 3),
            D        = BigInteger.ToFixedWidth(d, half * 2),
            P        = BigInteger.ToFixedWidth(p, half),
            Q        = BigInteger.ToFixedWidth(q, half),
            DP       = BigInteger.ToFixedWidth(d % pMinus1, half),
            DQ       = BigInteger.ToFixedWidth(d % qMinus1, half),
            InverseQ = BigInteger.ToFixedWidth(BigInteger.ModInverse(q, p), half),
        };
    }
}
