#include <stdio.h>
#include <string.h>
#include <stdlib.h>

extern char *gets(char *s);

int main() {
    char buf[16];
    printf("[%p] du bist? ", buf);

    gets(buf);
    if (strncmp(buf, "gut genug", 9)) {
        printf("nein");
        return 1;
    }

    printf("bleib einfach nur du");
    return 0;
}


void win() {
    system("/bin/sh");
}
