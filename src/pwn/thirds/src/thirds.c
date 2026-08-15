#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main() {
    char m1[16], m2[16], m3[16];

    printf("1> ");
    fgets(m1, 16, stdin);
    printf(m1);

    printf("2> ");
    fgets(m2, 16, stdin);
    printf(m2);

    printf("3> ");
    fgets(m3, 16, stdin);
    printf(m3);

    return 0;
}
