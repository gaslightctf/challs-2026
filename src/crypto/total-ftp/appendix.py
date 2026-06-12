from sympy import symbols, Poly

n_1 = bytes.fromhex(
    "c889f7ef523b08e400000000000000014d2ee8284c7a03c000000000000000012c16eeaeab96ddc8000000000000000201036d671407a06600000000000000022f743377005a840d0000000000000001e8e3c0efdd8054ba000000000000000306ee98c677dfdf190000000000000002de525d2b1011ceae0000000000000424455c59eec3a0654500000000000003f8d762d68bcbe8cc3a00000000000000d31291f9aaa7e9a7d60000000000000337a82a59342aadff570000000000000295c495b3690a69b66c00000000000000d9c5e55654e9b14cba000000000000040f0f0f7d3bfdce03d6000000000000026b89ac77db000000000000000000036a77"
)
n_2 = bytes.fromhex(
    "40000049000014ac8000900e00010ec58000b17b8001e0720001be890002169f80029cd5000349190003cd4480037c8c000397660003b28300041021000418cb00058a210004c2708004924980053b8780051cbd8005ebe80006bb27800765e6800651478007f62300073949800860950008614d800863988008d103800884c100099a260009a6d90009578f0007e84300080db800072e59000724f10007c0ec0006ec6600062231000605930005ca4c000566cc0005da92000574dd00040bf1000457dc0004cfbe0004c5640003fe6d0003ada60002de110002cbb30002d5a6000243840001cdf40001a8a9000151be000113f4000101070000acdf000029e5"
)

n_2 = n_1


print("====== SOLVING n_2 ======")


def limbify(x):
    return [int.from_bytes(x[i : i + 4], "big") for i in range(0, len(x), 4)][::-1]


# n_2_limbs = limbify(n_2)
#
# for x in n_2_limbs:
#     bit_length = x.bit_length()
#     print(f"{x=:08x} {bit_length=}")
# print("---\n")

# four_n2 = (int.from_bytes(n_2, "big") * 4).to_bytes(len(n_2) + 4, "big")
four_n2 = (int.from_bytes(n_2, "big") * 1).to_bytes(len(n_2) + 0, "big")
four_n2_limbs = limbify(four_n2)

for x in four_n2_limbs:
    bit_length = x.bit_length()
    print(f"{x=:08x} {bit_length=}")
print("---\n")

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

print("\n\n====== SOLVING n_1 ======")

import random
import Crypto.Util.number


def gen_n1_prime():
    count = 1024 // 128
    w = 128
    b = 32
    p = 0
    for i in range(count):
        pi = random.randrange(2**b)
        p += 2 ** (w * i) * pi
    p <<= 96
    while not Crypto.Util.number.isPrime(p):
        p += 1
    return p


def limbify(x):
    return [int.from_bytes(x[i : i + 16], "big") for i in range(0, len(x), 16)][::-1]


n_1_limbs = limbify(n_1)
for x in n_1_limbs:
    bit_length = x.bit_length()
    print(f"{x=:08x} {bit_length=}")
print("---\n")

four_n1 = (int.from_bytes(n_1, "big") << 64).to_bytes(len(n_1) + 16, "big")
four_n1_limbs = limbify(four_n1)

for x in four_n1_limbs:
    bit_length = x.bit_length()
    print(f"{x=:08x} {bit_length=}")
print("---\n")

n1_prime = gen_n1_prime()
print(f"{n1_prime=} {hex(n1_prime)=}")
print(f"{n1_prime.bit_length()=}")

n1_prime_limbs = limbify(n1_prime.to_bytes(1024 // 8, "big"))
for x in n1_prime_limbs:
    bit_length = x.bit_length()
    print(f"{x=:08x} {bit_length=}")
print("---\n")


def limbify(x):
    return [int.from_bytes(x[i : i + 4], "big") for i in range(0, len(x), 4)][::-1]


n1_prime_limbs = limbify(n1_prime.to_bytes(1024 // 8, "big"))
for x in n1_prime_limbs:
    bit_length = x.bit_length()
    print(f"{x=:08x} {bit_length=}")
print("---\n")
