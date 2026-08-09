#!/usr/bin/env python3
from sympy import Poly, symbols
from mkcert import build_cert, build_key
from cryptography.hazmat.primitives import serialization

n_2 = bytes.fromhex(
    "400000b30000677980006876800121f90001a6ec8002597080022c028002a19a8002cae68002d8848002f1bf8002d772000331d180038f5100039aef0003b3ac0003f52e800439a50003ef180003978480043d4e0003c2d60003c9300003e6e28003f2cc800414660004ea0c80053cb8000585e880056948000524af8004bf6f000506050005006a000493bc000479bb00047163000370d8000364e500037cca00033b65000345010002fb4600027bc10002441e000216c60001bbb40001bf1f0001a3ee0001a8410001476b000163ce000181100001027f00018669000188d40001021400013ff8000092f1000066210000795e00003c5c0000365100003633"
)


def limbify(x):
    return [int.from_bytes(x[i : i + 4], "big") for i in range(0, len(x), 4)][::-1]


four_n2 = (int.from_bytes(n_2, "big") * 4).to_bytes(len(n_2) + 4, "big")
four_n2_limbs = limbify(four_n2)

x = symbols("x")
P = Poly(four_n2_limbs[::-1], x)

print(f"{P.as_expr()=}")

_, [(a, _), (b, _)] = P.factor_list()
print(f"{a=}")
print(f"{b=}")

p = a(2**32) / 2
q = b(2**32) / 2
print(f"{p=}")
print(f"{q=}")

assert p * q == (int.from_bytes(n_2, "big"))

print("ok")

E = 65537
OUTPUT = "recovered.key"
COMMON_NAME = "complete-http"
key = build_key(int(p), int(q), E)
pem = key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)
pem += build_cert(key, COMMON_NAME).public_bytes(serialization.Encoding.PEM)

with open(OUTPUT, "wb") as f:
    f.write(pem)
    print(f"wrote {OUTPUT}")
