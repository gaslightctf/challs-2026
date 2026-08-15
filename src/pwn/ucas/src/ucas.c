#include <stdio.h>
#include <string.h>

int main() {
    int chars = 0;
    char q1[1334], q2[1334], q3[1334];

    char name[16];
    printf("welcome to the ucas portal\n");
    printf("please enter your name: ");
    fgets(name, 16, stdin);
    printf("welcome, ");
    printf(name);

    printf("Why do you want to study this course or subject? ");
    fgets(q1, 4000-chars, stdin);
    chars += strlen(q1);

    printf("How have your qualifications and studies helped you to prepare for this course or subject? ");
    fgets(q2, 4000-chars, stdin);
    chars += strlen(q2);

    printf("What else have you done to prepare outside of education, and why are these experiences useful? ");
    fgets(q3, 4000-chars, stdin);
    chars += strlen(q3);

    if (chars > 4000) {
        printf("your essay is too long\n");
        return 1;
    }

    printf("your essay is %d chars long\n", chars);

    if (chars % 8) {
        printf("you got no offers, have fun in clearing\n");
        return 0;
    }
    printf("congrats, your essay was accepted! your offer is 10a*\n");
}
