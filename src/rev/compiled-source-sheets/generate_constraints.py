import random

# chosen by fair dice roll. guaranteed to be random
target = "2QY90H6F".encode()

print(f"{target.hex()=} {len(target)=}")

z3_constraints = []


def mk_xor_byte_byte(a, b):
    z3_constraints.append(
        f"(password[{a}] ^ password[{b}]) == 0x{target[a] ^ target[b]:02x}"
    )
    return f"(password[{a}] ^ password[{b}]) == (char)0x{target[a] ^ target[b]:02x}"


def mk_and_byte_byte(a, b):
    z3_constraints.append(
        f"(password[{a}] & password[{b}]) == 0x{target[a] & target[b]:02x}"
    )
    return f"(password[{a}] & password[{b}]) == (char)0x{target[a] & target[b]:02x}"


def mk_or_byte_byte(a, b):
    z3_constraints.append(
        f"(password[{a}] | password[{b}]) == 0x{target[a] | target[b]:02x}"
    )
    return f"(password[{a}] | password[{b}]) == (char)0x{target[a] | target[b]:02x}"


def mk_mul_byte_byte(a, b):
    z3_constraints.append(
        f"(password[{a}] * password[{b}]) == 0x{(target[a] * target[b]) & 0xff:02x}"
    )
    return f"(char)(password[{a}] * password[{b}]) == (char)0x{(target[a] * target[b]) & 0xff:02x}"


generators = [
    mk_xor_byte_byte,
    mk_and_byte_byte,
    mk_or_byte_byte,
    ## broken somehow (integer arithmetic is weird)
    # mk_mul_byte_byte,
]


def mk_constraint():
    generator = random.choice(generators)
    a = random.randint(0, 7)
    b = random.randint(0, 7)
    while a == b:
        b = random.randint(0, 7)

    return generator(a, b)


out = f"""
    if ({" && ".join([mk_constraint() for _ in range(5)])}) {{
        if ({" || ".join([mk_constraint().replace("==", "!=") for _ in range(3)])}) {{
            goto fail;
        }}

        if ({" && ".join([mk_constraint() for _ in range(3)])}) {{
            if ({" || ".join([mk_constraint().replace("==", "!=") for _ in range(4)])}) {{
                goto fail;
            }}
        }}
    }} else {{
        goto fail;
    }}

    if ({" || ".join([mk_constraint().replace("==", "!=") for _ in range(4)])} || !({
        " && ".join([mk_constraint() for _ in range(4)])
    })) {{
        goto fail;
    }}
"""

print("\n-----------\n")
print(out)

print("\n-----------\n")
print(",\n".join(z3_constraints))
