#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <sys/types.h>
#include <fcntl.h>
#include <limits.h>
#include <stdlib.h>

void slurp(int fd) {
    char buf[4096];
    ssize_t n;

    while ((n = read(fd, buf, sizeof(buf) - 1)) > 0) {
        buf[n] = '\0';
        puts(buf);
    }

    close(fd);
}

int main(int argc, char **argv) {
    setbuf(stdin, NULL);
    setbuf(stdout, NULL);

    if (argc < 2) {
        slurp(0);
        return 0;
    }

    uid_t euid = geteuid();
    gid_t egid = getegid();

    seteuid(getuid());
    setegid(getgid());

    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "-")) {
            slurp(0);
        } else if (!strcmp(argv[i], "/flag")) {
            seteuid(euid);
            setegid(egid);

            int fd = open(argv[i], O_RDONLY | O_NOFOLLOW);
            if (fd == -1) {
                fprintf(stderr, "%s: %s: %s\n", argv[0], argv[i], strerror(errno));
                return 1;
            }

            char flag_buf[9] = {0};
            if (read(fd, flag_buf, 8) > 0) {
                printf("psst, here's a sneak peek: %s\n", flag_buf);
            }

            seteuid(getuid());
            setegid(getgid());
        } else {
            char resolved[PATH_MAX];
            if (realpath(argv[i], resolved) == NULL) {
                fprintf(stderr, "%s: %s: %s\n", argv[0], argv[i], strerror(errno));
                return 1;
            }
            if (!strncmp(resolved, "/proc", 5) || !strncmp(resolved, "/dev", 4)) {
                fprintf(stderr, "%s: %s: nuh uh\n", argv[0], argv[i]);
                return 1;
            }

            int fd = open(resolved, O_RDONLY | O_NOFOLLOW);
            if (fd == -1) {
                fprintf(stderr, "%s: %s: %s\n", argv[0], argv[i], strerror(errno));
                return 1;
            }
            slurp(fd);
        }
    }

    return 0;
}
