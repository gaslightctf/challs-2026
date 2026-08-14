from pwn import xor
from chall import ToMatrix, FromMatrix, ShiftRows, GMul, MixColumns

def InvShiftRows(state):
    placeholder = state[1][0]
    state[1][0], state[1][1], state[1][2], state[1][3] = state[1][3], state[1][0], state[1][1], state[1][2]
    state[2][0], state[2][1], state[2][2], state[2][3] = state[2][2], state[2][3], state[2][0], state[2][1]
    state[3][0], state[3][1], state[3][2], state[3][3] = state[3][1], state[3][2], state[3][3], state[3][0]
    return state

def InvMixColumns(s):
    ss = [[0] * 4 for _ in range(4)]
    for c in range(4):
        ss[0][c] = hex(GMul(14, s[0][c]) ^ GMul(11, s[1][c]) ^ GMul(13, s[2][c]) ^ GMul(9, s[3][c]))[2:].zfill(2)
        ss[1][c] = hex(GMul(9, s[0][c]) ^ GMul(14, s[1][c]) ^ GMul(11, s[2][c]) ^ GMul(13, s[3][c]))[2:].zfill(2)
        ss[2][c] = hex(GMul(13, s[0][c]) ^ GMul(9, s[1][c]) ^ GMul(14, s[2][c]) ^ GMul(11, s[3][c]))[2:].zfill(2)
        ss[3][c] = hex(GMul(11, s[0][c]) ^ GMul(13, s[1][c]) ^ GMul(9, s[2][c]) ^ GMul(14, s[3][c]))[2:].zfill(2)
    
    for i in range(4):
        for j in range(4):
            s[i][j] = ss[i][j]
    return s

def find_K(plaintext: str, ciphertext: str) -> str:
    state = ToMatrix(plaintext)
    for _ in range(9):
        state = ShiftRows(state)
        state = MixColumns(state)
    state = ShiftRows(state)
    state = FromMatrix(state)

    return xor(bytes.fromhex(state), bytes.fromhex(ciphertext)).hex()

def recover_P(ciphertext: str, K: str) -> str:
    state = xor(bytes.fromhex(ciphertext), bytes.fromhex(K)).hex()
    state = ToMatrix(state)
    state = InvShiftRows(state)
    
    for _ in range(9):
        state = InvMixColumns(state)
        state = InvShiftRows(state)

    state = FromMatrix(state)
    return state

def hex_to_ascii(hex_text: str) -> str:
    ascii_text = ""
    hex_text_bytes = [int(hex_text[i:i+2], 16) for i in range(0, 32, 2)]
    for byte in hex_text_bytes:
        char = chr(byte)
        ascii_text += char
    
    return ascii_text



if __name__ == '__main__':
    pt = "696e636f6d70726568656e7369626c65"
    ct = "94ae785acdb0d7c919f4893697659c8c"
    K = find_K(pt, ct)

    flag_ct = "58f86ce660590bb05495c0dcd2d4d438"
    flag_hex_pt = recover_P(flag_ct, K)
    flag_pt = hex_to_ascii(flag_hex_pt)
    print(flag_hex_pt)
    print(f"Flag: {flag_pt}")