from string import ascii_lowercase
# relative frequency list (English) for A, B, ..., Z
freq = [0.082, 0.015, 0.028, 0.043, 0.127, 0.022, 0.020, 0.061, 0.070, 0.002, 0.008, 0.040, 
        0.024, 0.067, 0.075, 0.019, 0.001, 0.060, 0.063, 0.091, 0.028, 0.010, 0.023, 0.001, 
        0.020, 0.001]

def to_vigenere_ct(ct: str, m: int) -> str:
    ct = list(map(lambda x: ascii_lowercase.index(x), ct))
    for i in range(len(ct)):
        ct[i] = (ct[i] - (i // m)) % 26
    
    ct = list(map(lambda x: ascii_lowercase[x], ct))
    ct = ''.join(ct)
    return ct

def IC(text: str) -> float:
    n = len(text)
    result = 0
    for i in range(26):
        temp_freq = text.count(ascii_lowercase[i])
        temp_result = (temp_freq * (temp_freq - 1)) / (n * (n - 1))
        result += temp_result
    
    return round(result, 6)

def combined_IC(text: str, K: int, freq: list[float]) -> float:
    result = 0
    n = len(text)
    for i in range(26):
        temp_freq = text.count(ascii_lowercase[(i + K) % 26])
        temp_result = (temp_freq / n) * freq[i]
        result += temp_result
    
    return round(result, 6)

# (Modified) Friedman test by index of coincidence (IC) https://en.wikipedia.org/wiki/VigenÃ¨re_cipher#Friedman_test
def friedman_test(ct: str, m: int) -> list[float]:
    ct = to_vigenere_ct(ct, m)
    # divide ct into m chunks
    ct_chunks = [ct[i::m] for i in range(m)]

    IC_list = []
    for ct_chunk in ct_chunks:
        temp_IC = IC(ct_chunk)
        IC_list.append(temp_IC)

    return IC_list

# Kasiski test implementation https://github.com/Periculum/Vigenere-Chiffre/blob/main/kasiski.py is an alternative to Friedman test

def combined_IC_test(text: str, freq: list[float]) -> list[float]:
    combined_IC_list = []
    for K in range(26):
        temp_combined_IC = combined_IC(text, K, freq)
        combined_IC_list.append(temp_combined_IC)

    return combined_IC_list

# Print most possible key values and combined IC list
def combined_IC_attack(ct: str, m: int, freq: list[float]) -> None:
    ct = to_vigenere_ct(ct, m)
    ct_chunks = [ct[i::m] for i in range(m)]
    for i, ct_chunk in enumerate(ct_chunks):
        temp_combined_IC_list = combined_IC_test(ct_chunk, freq)
        max_K = temp_combined_IC_list.index(max(temp_combined_IC_list))
        print(f"{i+1}: K = {max_K} ({ascii_lowercase[max_K]}): {temp_combined_IC_list}")

def decrypt(ct: str, keyword: str) -> str:
    m = len(keyword)
    ct = list(map(lambda x: ascii_lowercase.index(x), ct))
    key = list(map(lambda x: ascii_lowercase.index(x), keyword))

    pt = ""
    for i in range (len(ct)):
        index = (ct[i] - key[i % m] - (i // m)) % 26
        char = ascii_lowercase[index]
        pt += char

    return pt

with open('gaslight-where-the-dream-starts-3/output.txt', 'r') as file:
    ct = file.readline()

'''
# Determine keylength by (modified) Friedman test
for m in range(1, 10):
    temp_IC_list = friedman_test(ct, m)
    print(f"m = {m}: {temp_IC_list}")

# Therefore keylength m = 5

# Determine keyword
combined_IC_attack(ct, 5, freq)

# Therefore keyword is "dream"
'''
print(decrypt(ct, "dream"))
