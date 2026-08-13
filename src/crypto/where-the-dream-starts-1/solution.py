from string import ascii_lowercase

def all_decryptions(ct: str) -> list:
    ct = list(map(lambda x: ascii_lowercase.index(x), ct))
    pts = []
    for K in range(26):
        pt = list(map(lambda x: (x - K) % 26, ct))
        pt = list(map(lambda x: ascii_lowercase[x], pt))
        pt = ''.join(pt)
        pts.append(pt)
    
    return pts

pts = all_decryptions("fdhvduuhdoobolnhgdvkliwriwkuhh")
for K in range(26):
    print(f"K = {K}: {pts[K]}")
