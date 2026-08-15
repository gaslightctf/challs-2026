from chall import LFSR

ct = bytes.fromhex("e944b3a55e47c5d8f3af3c93e2f7f2b1892094001e95a16b779b907bd374e2327a2dace45d222f69138b")

for IV in range(256):
    pt = LFSR(ct, IV)
    try: 
        pt = pt.decode()
        print(pt)
    except UnicodeDecodeError:
        pass