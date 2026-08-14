import secrets
from string import ascii_lowercase

def col_transposition(pt: str, m: int) -> str:
    n = len(pt)
    # null padding, illustrated in https://en.wikipedia.org/wiki/Transposition_cipher#Columnar_transposition
    for _ in range((m - (n % m))):
        index = secrets.randbelow(26)
        pt += ascii_lowercase[index]

    ct_chunks = [pt[i::m] for i in range(m)]
    ct = ''.join(ct_chunks)

    return ct

def inv_col_transposition(ct: str, m: int) -> str:
    n = len(ct)
    ct_chunks = [ct[i::n//m] for i in range(n//m)]
    ct = ''.join(ct_chunks)

    return ct

flag = "The flag is gaslightCTF{tr4nsp0s3-2-th3-k3y-0f-g-fl4t!}"
enc_flag = col_transposition(flag, 3)
print(enc_flag)