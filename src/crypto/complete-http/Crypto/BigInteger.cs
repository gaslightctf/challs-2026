using System.Buffers.Binary;
using System.Security.Cryptography;
using SysBigInt = System.Numerics.BigInteger;

namespace CompleteHttp.Crypto;

/// <summary>
/// The slice of the bignum type CompleteFTP bundled that this challenge needs:
/// a little-endian array of 32-bit limbs, the RNG that fills it, and the number
/// theory helpers for turning its output into an RSA key.
///
/// Only the limb representation lives here. Every arithmetic operation is
/// delegated to <see cref="SysBigInt"/> via <see cref="ToBigInteger"/> — the
/// point of the class is <see cref="genRandomBits"/>, which is reproduced
/// verbatim, down to its naming.
/// </summary>
internal sealed class BigInteger
{
    /// <summary>Limb cap from the original library: 70 limbs, i.e. 2240 bits.</summary>
    private const int maxLength = 70;

    private readonly uint[] bignumLimbs = new uint[maxLength];
    private int dataLength;

    private static readonly RandomNumberGenerator rngProvider = RandomNumberGenerator.Create();

    private static readonly int[] SmallPrimes =
    [
        3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
        73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149,
    ];

    /// <summary>
    /// Verbatim from CompleteFTP. The flaw is the limb/RNG size mismatch: the
    /// output buffer is sized in <em>bytes</em> from a limb count, and
    /// Array.Copy widens each byte into a whole 32-bit limb. So a `bits`-bit
    /// number is built from only `bits / 32` bytes of entropy, and every limb
    /// but the topmost is a zero-extended value in [1, 255].
    /// </summary>
#pragma warning disable IDE1006 // naming: kept identical to the original
    public void genRandomBits(int bits)
    {
        // Calculate the number of limbs
        int numLimbs = bits / 32;
        // Allocate space for the RNG output
        byte[] array = new byte[numLimbs];
        // Call the system RNG
        rngProvider.GetNonZeroBytes(array);
        // Copy to the limbs of the big number
        Array.Copy(array, 0, bignumLimbs, 0, numLimbs);
        // Set the top bit to ensure proper bit length
        bignumLimbs[numLimbs - 1] |= 0x80000000;
        // Store the length
        dataLength = numLimbs;
    }

    /// <summary>
    /// Mirrors the original library's genPseudoPrime: draw a fresh candidate,
    /// force it odd, test it, and start over if it's composite.
    ///
    /// Re-drawing rather than incrementing is what keeps every limb inside its
    /// original byte range, which is the structure the attack relies on.
    /// </summary>
    public static SysBigInt genPseudoPrime(int bits, SysBigInt publicExponent)
    {
        if (bits % 32 != 0)
            throw new ArgumentException("bit length must be a whole number of limbs", nameof(bits));

        var result = new BigInteger();

        while (true)
        {
            result.genRandomBits(bits);
            result.bignumLimbs[0] |= 0x01; // make it odd

            SysBigInt candidate = result.ToBigInteger();

            // e must be coprime to p-1, or no private exponent exists.
            if (!SysBigInt.GreatestCommonDivisor(candidate - 1, publicExponent).IsOne)
                continue;

            if (IsProbablePrime(candidate))
                return candidate;
        }
    }
#pragma warning restore IDE1006

    /// <summary>Reassembles the limbs, least significant first, into a BigInteger.</summary>
    public SysBigInt ToBigInteger()
    {
        var bytes = new byte[dataLength * sizeof(uint)];
        for (int i = 0; i < dataLength; i++)
            BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(i * sizeof(uint)), bignumLimbs[i]);

        return new SysBigInt(bytes, isUnsigned: true, isBigEndian: false);
    }

    /// <summary>Miller-Rabin. 64 rounds puts the error rate below 2^-128.</summary>
    public static bool IsProbablePrime(SysBigInt n, int rounds = 64)
    {
        foreach (int small in SmallPrimes)
        {
            if (n % small == 0)
                return n == small;
        }

        // n - 1 = d * 2^s with d odd.
        SysBigInt nMinus1 = n - 1;
        SysBigInt d = nMinus1;
        int s = 0;
        while (d.IsEven)
        {
            d >>= 1;
            s++;
        }

        int byteCount = n.GetByteCount(isUnsigned: true);
        for (int round = 0; round < rounds; round++)
        {
            SysBigInt a;
            do
            {
                byte[] bytes = RandomNumberGenerator.GetBytes(byteCount);
                a = new SysBigInt(bytes, isUnsigned: true, isBigEndian: true);
            }
            while (a < 2 || a >= nMinus1);

            SysBigInt x = SysBigInt.ModPow(a, d, n);
            if (x.IsOne || x == nMinus1)
                continue;

            bool witness = true;
            for (int i = 1; i < s; i++)
            {
                x = SysBigInt.ModPow(x, 2, n);
                if (x == nMinus1)
                {
                    witness = false;
                    break;
                }
            }

            if (witness)
                return false;
        }

        return true;
    }

    public static SysBigInt ModInverse(SysBigInt value, SysBigInt modulus)
    {
        SysBigInt t = SysBigInt.Zero, newT = SysBigInt.One;
        SysBigInt r = modulus, newR = value;

        while (!newR.IsZero)
        {
            SysBigInt quotient = r / newR;
            (t, newT) = (newT, t - quotient * newT);
            (r, newR) = (newR, r - quotient * newR);
        }

        if (r > SysBigInt.One)
            throw new InvalidOperationException("value is not invertible");

        return t.Sign < 0 ? t + modulus : t;
    }

    /// <summary>
    /// RSAParameters takes unsigned big-endian buffers of an exact width, not
    /// BigInteger's minimal two's-complement encoding.
    /// </summary>
    public static byte[] ToFixedWidth(SysBigInt value, int length)
    {
        byte[] bytes = value.ToByteArray(isUnsigned: true, isBigEndian: true);
        if (bytes.Length == length)
            return bytes;

        if (bytes.Length > length)
            throw new InvalidOperationException($"value needs {bytes.Length} bytes, not {length}");

        var padded = new byte[length];
        bytes.CopyTo(padded, length - bytes.Length);
        return padded;
    }
}
