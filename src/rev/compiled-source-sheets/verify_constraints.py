# make sure the constraints actually lead to a valid solution

from z3 import *

password = [BitVec(f"password{i}", 8) for i in range(8)]
s = Solver()

s.add(
    (password[6] ^ password[2]) == 0x6F,
    (password[3] & password[7]) == 0x00,
    (password[3] | password[7]) == 0x7F,
    (password[3] | password[6]) == 0x3F,
    (password[1] & password[5]) == 0x40,
    (password[5] ^ password[2]) == 0x11,
    (password[1] ^ password[2]) == 0x08,
    (password[4] & password[1]) == 0x10,
    (password[1] & password[2]) == 0x51,
    (password[0] ^ password[6]) == 0x04,
    (password[4] | password[7]) == 0x76,
    (password[7] | password[2]) == 0x5F,
    (password[4] | password[3]) == 0x39,
    (password[3] ^ password[5]) == 0x71,
    (password[6] & password[1]) == 0x10,
    (password[7] ^ password[4]) == 0x76,
    (password[0] & password[3]) == 0x30,
    (password[4] ^ password[2]) == 0x69,
    (password[2] & password[1]) == 0x51,
    (password[2] | password[4]) == 0x79,
    (password[4] ^ password[0]) == 0x02,
    (password[1] & password[2]) == 0x51,
    (password[3] ^ password[6]) == 0x0F,
)

if s.check() == sat:
    m = s.model()
    vals = [m.evaluate(password[i]).as_long() for i in range(8)]
    print(f"{vals=}")

    raw = bytes(vals)
    print(f"{raw=} {raw.hex()=}")

    target = "2QY90H6F".encode()
    assert raw == target

    s.add(Or([password[i] != vals[i] for i in range(8)]))
    if s.check() == sat:
        m2 = s.model()
        other = [m2.evaluate(password[i]).as_long() for i in range(8)]
        print(f"found another solution: {other=} {bytes(other).hex()=} {bytes(other)=}")
    else:
        print("solution is unique")
else:
    print("unsat")
