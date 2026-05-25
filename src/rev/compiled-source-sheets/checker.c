void (*writeChar1)(char)          = (void*)(0x2000);
void (*writeChar4)(const char[4]) = (void*)(0x2002);
void (*writeChar8)(const char[8]) = (void*)(0x2004);
char (*readInput)(void)           = (void*)(0x2006);

int* SHOW_KEYBOARD = (int*)(0x2100);

int _start(void) {
    char password[10];
    int len = 0;

    // "guess the password: "
    writeChar8("guess th");
    writeChar8("e passwo");
    writeChar4("rd: ");

    while (len < 10) {
        *SHOW_KEYBOARD = 2;
        char c = readInput();
        if (!c) continue;
        *SHOW_KEYBOARD = 0;

        if (c == '\n') break;

        password[len++] = c;
        writeChar1(c);
    }

    writeChar1('\n');

    if (len % 2) {
        goto fail;
    }

    if (len >= 9) {
        goto fail;
    }

    // -- BEGIN gen
    if ((password[6] ^ password[2]) == (char)0x6f && (password[3] & password[7]) == (char)0x00 && (password[3] | password[7]) == (char)0x7f && (password[3] | password[6]) == (char)0x3f && (password[1] & password[5]) == (char)0x40) {
        if ((password[5] ^ password[2]) != (char)0x11 || (password[1] ^ password[2]) != (char)0x08 || (password[4] & password[1]) != (char)0x10) {
            goto fail;
        }

        if ((password[1] & password[2]) == (char)0x51 && (password[0] ^ password[6]) == (char)0x04 && (password[4] | password[7]) == (char)0x76) {
            if ((password[7] | password[2]) != (char)0x5f || (password[4] | password[3]) != (char)0x39 || (password[3] ^ password[5]) != (char)0x71 || (password[6] & password[1]) != (char)0x10) {
                goto fail;
            }
        }
    } else {
        goto fail;
    }

    if ((password[7] ^ password[4]) != (char)0x76 || (password[0] & password[3]) != (char)0x30 || (password[4] ^ password[2]) != (char)0x69 || (password[2] & password[1]) != (char)0x51 || !((password[2] | password[4]) == (char)0x79 && (password[4] ^ password[0]) == (char)0x02 && (password[1] & password[2]) == (char)0x51 && (password[3] ^ password[6]) == (char)0x0f)) {
        goto fail;
    }
    // -- END gen

    // congrats!\n
    writeChar8("congrats");
    writeChar4("!\n\0\0");

    // "gaslightCTF{ch3ck_0ut_lyra-horse!!_"
    writeChar8("gaslight");
    writeChar8("CTF{ch3c");
    writeChar8("k_0ut_ly");
    writeChar8("ra-horse");
    writeChar4("!!_\0");
    writeChar8(password);
    writeChar1('}');

    // busy loop
    volatile int counter = 1000;
    while (counter--) {}

    return 67;

fail:
    writeChar8("nope :(\n");
    return -67;
}
