from sympy import Matrix, zeros
from chall import next_register, LFSR

def keystream_bits(partial_keystream: bytes) -> list[int]:
    bit_list = []
    for byte in partial_keystream:
        byte_string = bin(byte)[2:].zfill(8)
        bit_item = list(map(int, byte_string))
        bit_list += bit_item
    
    return bit_list

def find_coeffs(partial_keystream: bytes) -> list[int]:
    partial_keystream = keystream_bits(partial_keystream)
    M = []
    for i in range(16):
        M.append(partial_keystream[i:i+16])
    
    M = Matrix(M)
    z = Matrix(partial_keystream[16:32])

    coeffs = (M.inv_mod(2) * z) % 2
    return list(coeffs)

def generate_feedback(coeffs: list[int], register: int) -> int:
    feedback = 0
    for i, coeff in enumerate(coeffs[::-1]):
        if coeff == 1:
            feedback ^= (register >> i) & 1
    
    return feedback

def next_register(coeffs: list[int], register: int) -> int:
    for _ in range(16):
        feedback = generate_feedback(coeffs, register)
        register = ((register << 1) | feedback) & 0xffff

    return register

def LFSR(coeffs: list[int], pt_bytes: bytes, IV: int) -> bytes:
    assert len(pt_bytes) % 2 == 0
    register = IV
    ct = bytearray()
    ct.append(pt_bytes[0] ^ (register >> 8))
    ct.append(pt_bytes[1] ^ (register & 0x00ff))

    for i in range(2, len(pt_bytes), 2):
        register = next_register(coeffs, register)
        ct.append(pt_bytes[i] ^ (register >> 8))
        ct.append(pt_bytes[i+1] ^ (register & 0x00ff))
    
    return bytes(ct)

if __name__ == '__main__':
    with open('gaslight-down-the-stream-2/intercepted.txt', 'r') as file:
        pt = file.readline().strip()
        ct = file.readline().strip()
    with open('gaslight-down-the-stream-2/output.txt', 'r') as file:
        flag_enc_hex = file.readline().strip()
    
    pt_bytes = pt.encode()
    ct_bytes = bytes.fromhex(ct)
    flag_enc = bytes.fromhex(flag_enc_hex)

    partial_keystream = bytes([pt_byte ^ ct_byte for pt_byte, ct_byte in zip(pt_bytes, ct_bytes)])
    coeffs = find_coeffs(partial_keystream)
    flag = LFSR(coeffs, flag_enc, int("8ee8", 16))
    print(flag)