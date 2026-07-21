from sympy import Matrix

alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-"
pt = input("Padded plaintext: ")
# b3w4reofbugs1ntheab0vec0de-ih4ve0nlyprov3ditc0rrectnottr13dit---
ct1 = input("Ciphertext 1: ")
ct2 = input("Ciphertext 2: ")
# 1: x3etd0vgd7z9v6bld4ba7p94s0acp-bvfjjfywypdkzuwsgah4shanrdaop4
# 2: odbewk453xyc3210-mlqxley8loydmzgy0k6ok4i9qjcwx42om5au1-hqqkr
l = len(alphabet)
m = 4

# extract one plaintext-ciphertext pair for each keyword
pt_0 = Matrix(list(map(lambda x : alphabet.index(x), pt[:m]))).T
ct1_0 = Matrix(list(map(lambda x : alphabet.index(x), ct1[:m]))).T
ct2_0 = Matrix(list(map(lambda x : alphabet.index(x), ct2[:m]))).T

# K1, K2 are derived from sample-recover-K.py
# Compute b by b = y - xK mod l as y = xK + b
K1 = Matrix([[10, 13, 26, 22], [13, 36, 15, 11], [30, 27, 13, 19], [29, 23, 19, 36]])
b1 = (ct1_0 - pt_0 * K1) % l
keyword1 = ''.join(map(lambda x : alphabet[x], list(K1))) + ''.join(map(lambda x : alphabet[x], list(b1)))

K2 = Matrix([[2, 10, 18, 36], [30, 17, 29, 36], [18, 20, 15, 29], [17, 36, 18, 27]])
b2 = (ct2_0 - pt_0 * K2) % l
keyword2 = ''.join(map(lambda x : alphabet[x], list(K2))) + ''.join(map(lambda x : alphabet[x], list(b2)))

print(keyword1)
print(keyword2)
'''
Output: 
kn0wn-pl41nt3xt-4tt4
cks-4r3-sup3r-s1mpl3
'''
