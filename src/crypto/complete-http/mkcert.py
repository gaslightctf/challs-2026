#!/usr/bin/env python3
"""Rebuild a usable RSA key from recovered factors.

Feed the output to Wireshark (Preferences > Protocols > TLS > RSA keys list) to
decrypt a capture: the server negotiates TLS_RSA_WITH_AES_128_CBC_SHA, so the
private key alone recovers every premaster secret.

    ./mkcert.py <p-hex> <q-hex> -o recovered.key
"""
import argparse
import datetime
import sys
from math import lcm

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


def build_key(p: int, q: int, e: int) -> rsa.RSAPrivateKey:
    # iqmp is q^-1 mod p, so the larger factor has to come first.
    if p < q:
        p, q = q, p

    d = pow(e, -1, lcm(p - 1, q - 1))

    return rsa.RSAPrivateNumbers(
        p=p,
        q=q,
        d=d,
        dmp1=rsa.rsa_crt_dmp1(d, p),
        dmq1=rsa.rsa_crt_dmq1(d, q),
        iqmp=rsa.rsa_crt_iqmp(p, q),
        public_numbers=rsa.RSAPublicNumbers(e, p * q),
    ).private_key()


def build_cert(key: rsa.RSAPrivateKey, common_name: str) -> x509.Certificate:
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])
    now = datetime.datetime.now(datetime.timezone.utc)

    return (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=365))
        .sign(key, hashes.SHA256())
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("p", help="first prime factor, hex (0x prefix optional)")
    parser.add_argument("q", help="second prime factor, hex")
    parser.add_argument(
        "-e",
        "--exponent",
        type=lambda v: int(v, 0),
        default=65537,
        help="public exponent (default: 65537)",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="recovered.key",
        help="where to write the PEM (default: recovered.key)",
    )
    parser.add_argument(
        "-c",
        "--cert",
        action="store_true",
        help="append a matching self-signed certificate",
    )
    parser.add_argument(
        "--cn",
        default="complete-http",
        help="common name for --cert (default: complete-http)",
    )
    args = parser.parse_args()

    p, q = int(args.p, 16), int(args.q, 16)

    for label, value in (("p", p), ("q", q)):
        if value < 3 or value % 2 == 0:
            print(f"error: {label} is not a plausible prime", file=sys.stderr)
            return 1

    key = build_key(p, q, args.exponent)

    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    if args.cert:
        pem += build_cert(key, args.cn).public_bytes(serialization.Encoding.PEM)

    with open(args.output, "wb") as f:
        f.write(pem)

    n = key.public_key().public_numbers().n
    print(f"wrote {args.output} ({n.bit_length()}-bit modulus)")
    print(f"modulus={n:X}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
