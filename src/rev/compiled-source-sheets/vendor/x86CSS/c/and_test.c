int _start(void) {
    register int foo __asm__("di");

    foo = 0x1336;
    // test foo, 0x1
    // jnz fail_1
    __asm__ volatile goto ("test $0x1, %[foo]\n\t"
                           "jnz %l[fail_1]\n\t"
                           : : [foo]"r"(foo) : "cc" : fail_1);

    foo = 0x1337;
    // test foo, 0x1
    // jz fail_2
    __asm__ volatile goto ("test $0x1, %[foo]\n\t"
                           "jz %l[fail_2]\n\t"
                           : : [foo]"r"(foo) : "cc" : fail_2);

    foo = 0x0;
    // test foo, foo
    // jnz fail_3
    __asm__ volatile goto ("test %[foo], %[foo]\n\t"
                           "jnz %l[fail_3]\n\t"
                           : : [foo]"r"(foo) : "cc" : fail_3);

    foo = 0x1;
    // test foo, foo
    // jz fail_4
    __asm__ volatile goto ("test %[foo], %[foo]\n\t"
                           "jz %l[fail_4]\n\t"
                           : : [foo]"r"(foo) : "cc" : fail_4);

    register int bar __asm__("ax");

    bar = 0x1336;
    // test di, 0x1
    // jnz fail_5
    __asm__ volatile goto ("test $0x1, %[bar]\n\t"
                           "jnz %l[fail_5]\n\t"
                           : : [bar]"r"(bar) : "cc" : fail_5);

    bar = 0x1337;
    // test di, 0x1
    // jz fail_6
    __asm__ volatile goto ("test $0x1, %[bar]\n\t"
                           "jz %l[fail_6]\n\t"
                           : : [bar]"r"(bar) : "cc" : fail_6);

    bar = 0x0;
    // test di, di
    // jnz fail_7
    __asm__ volatile goto ("test %[bar], %[bar]\n\t"
                           "jnz %l[fail_7]\n\t"
                           : : [bar]"r"(bar) : "cc" : fail_7);

    bar = 0x1;
    // test di, di
    // jz fail_8
    __asm__ volatile goto ("test %[bar], %[bar]\n\t"
                           "jz %l[fail_8]\n\t"
                           : : [bar]"r"(bar) : "cc" : fail_8);

    return 0;
fail_1:
    return 1;
fail_2:
    return 2;
fail_3:
    return 3;
fail_4:
    return 4;
fail_5:
    return 5;
fail_6:
    return 6;
fail_7:
    return 7;
fail_8:
    return 8;
}
