from itertools import combinations
from sympy import Matrix
from math import gcd

pt = input("Padded plaintext: ")
# b3w4reofbugs1ntheab0vec0de-ih4ve0nlyprov3ditc0rrectnottr13dit---
ct = input("Known ciphertext: ")
# 1: x3etd0vgd7z9v6bld4ba7p94s0acp-bvfjjfywypdkzuwsgah4shanrdaop4
# 2: odbewk453xyc3210-mlqxley8loydmzgy0k6ok4i9qjcwx42om5au1-hqqkr
n = len(ct)
alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-"
l = len(alphabet)
m = 4

# Extract 5 plaintext blocks (of length 4 letters) and 5 corresponding ciphertext blocks
# Define combs to traverse through all choices of 5 blocks, as some blocks create a noninvertible matrix (see below)
combs = combinations(range(n//m), m+1)
pt_vecs = [list(map(lambda x: alphabet.index(x), pt[m*i:m*(i+1)])) for i in range(n//m)]
ct_vecs = [list(map(lambda x: alphabet.index(x), ct[m*i:m*(i+1)])) for i in range(n//m)]

for comb in combs:
    ct_diff_matrix = Matrix([[ct_vecs[i][j] - ct_vecs[comb[0]][j] for j in range(m)] for i in comb[1:]])
    pt_diff_matrix = Matrix([[pt_vecs[i][j] - pt_vecs[comb[0]][j] for j in range(m)] for i in comb[1:]])

    # Check pt_diff_matrix is invertible (gcd = 1), then invert
    if gcd(pt_diff_matrix.det(), l) == 1:
        K = (pt_diff_matrix.inv_mod(l) * ct_diff_matrix) % l
        print(K) # We print K. The output K's should all be equal.
