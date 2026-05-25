# x86CSS

**Check out the live website [here](https://lyra.horse/x86css).**

**x86CSS** is a working CSS-only x86 CPU/emulator/computer. Yes, the _Cascading Style Sheets_ CSS. No JavaScript required.

What you're seeing above is a [C program](#) that was compiled using [GCC](https://en.wikipedia.org/wiki/GNU_Compiler_Collection) into native [8086](https://en.wikipedia.org/wiki/Intel_8086) machine code being executed fully within CSS.

## Frequently Asked Questions

### Is CSS a programming language?

Do you really need to ask at this point?

### How??

I plan on writing a blog post that explains how this works as well as many of the tricks used. Bookmark [my blog](https://lyra.horse/blog/) or add it to your RSS reader.

### Surely you still need a little bit of JavaScript?

Nope, this is CSS-only!

There is a script tag on this site, which is there to provide a clock to the CSS - but this is only there to make the entire thing a bit faster and more stable. The CSS also has a JS-less clock implementation, so if you disable scripts on this site, it will still run. **JavaScript is not required.**

My CSS clock uses an animation combined with style container queries, which means you don't need to interact with anything for the program to run, but it also means its a bit slower and less stable as a result. A hover-based clock, such as the one in [Jane Ori's CPU Hack](https://dev.to/janeori/expert-css-the-cpu-hack-4ddj), is fast and stable, but requires you to hold your mouse on the screen, [which some people claim](https://news.ycombinator.com/item?id=32622021) does not count as turing complete for whatever reason, so I wanted this demo to be fully functional with zero user input.

### But you still need HTML, right?

Not really... well, kind of?

This entire CPU runs in just CSS and doesn't require any HTML code, but there is no way to load the CSS without a \<style> tag, so that much is required. In Firefox [it is possible](https://lyra.horse/fun/tic-tac-nohtml/) to load CSS with no HTML, but atm this demo only works in Chromium-based browsers.

### What preprocessor do you use?

I straight up just write CSS! The CSS in [base\_template.html](https://github.com/rebane2001/x86css/blob/mane/base_template.html) is handwritten in Sublime Text, but for the more repetitive parts of the code I wrote a [python script](https://github.com/rebane2001/x86css/blob/mane/build_css.py).

### Is this practical?

Not really, you can get way better performance by writing code in CSS directly rather than emulating an entire archaic CPU architecture.

It is fun though, and computers are made for art and fun!

### Can I write/run my own programs?

Yes, but you'll have to compile them yourself. See below.

### What's x86?

[x86](https://en.wikipedia.org/wiki/X86) is the CPU architecture most computers these days run on. Heavily simplified, this demo runs the same machine code in CSS that your computer does in its processor. To be fair, modern x86 is 64bit and has a bunch of useful extensions, so it's not quite the same - this here is the original 16bit x86 that ran on the [8086](https://en.wikipedia.org/wiki/Intel_8086).

### What's horsle?

[neigh](https://cabletwo.net/horsle/).

## Compatibility

This project implements most of the x86 architecture, but not literally every single instruction and quirk, because a lot of it is unnecessary and not worth adding.

The way I approached this project was by writing programs I wanted to run in C, compiling them in GCC with various levels of optimization, and then implementing every instruction I needed. This way I know I have everything I need implemented.

There is some behaviour that's wrong, and some things are missing (e.g. setting the CF/OF flag bits). That's okay.

## Compiling

You can run your own software in this emulator!

If you have 8086 assembly ready to go, clone my repo, and put the assembly in a file called _program.bin_. Then, put the path to the \_start() function in _program.start_ as a number. Once that's set, you can just run _build\_css.py_ with Python3 (no dependencies required!) and the output will be in _x86css.html_.

If you want to write C code, you can do so using [gcc-ia16](https://gitlab.com/tkchia/build-ia16) (you can build it yourself or install it from the [PPA](https://launchpad.net/~tkchia/+archive/ubuntu/build-ia16/)). The _build\_c.py_ script does the build with the correct flags and also makes the _program.bin/start_ files. Don't forget to run _build\_css.py_ after! This building setup works on both Linux and WSL1/2 (I haven't tried on macOS).

By default there is 0x600 bytes (1.5kB) of memory, but this can be increased in the _build\_css.py_ file as necessary. The program gets loaded at memory address 0x100. There's some custom I/O addresses for you to be able to interface with the program.

Here's an example program:

    static const char STR_4BYTES[] = "hell";
    static const char STR_8BYTES[] = "o world!";
    
    void (*writeChar1)(char);
    void (*writeChar4)(const char[4]);
    void (*writeChar8)(const char[8]);
    char (*readInput)(void);
    
    int _start(void) {
      // Set up custom stuff
      writeChar1 = (void*)(0x2000);
      writeChar4 = (void*)(0x2002);
      writeChar8 = (void*)(0x2004);
      readInput = (void*)(0x2006);
      int* SHOW_KEYBOARD = (int*)(0x2100);
    
      // Write a single byte to screen
      writeChar1(0x0a);
      // Write 4 bytes from pointer to screen
      writeChar4(STR_4BYTES);
      // Write 8 bytes from pointer to screen
      writeChar8(STR_8BYTES);
      // Write a character from custom charset
      writeChar1(0x80);
    
      while (1) {
        // Show numeric keyboard
        *SHOW_KEYBOARD = 1;
        // Read keyboard input
        char input = readInput();
        if (!input) continue;
        *SHOW_KEYBOARD = 0;
        // Echo input
        writeChar1(input);
        break;
      }
    
      while (1) {
        // Show alphanumeric keyboard
        *SHOW_KEYBOARD = 2;
        char input = readInput();
        if (!input) continue;
        *SHOW_KEYBOARD = 0;
        writeChar1(input);
        break;
      }
    
      return 1337;
    }

## Credits

Greetz/thanks to:

*   Jane Ori for the original [CPU Hack](https://dev.to/janeori/expert-css-the-cpu-hack-4ddj)
*   Soo-Young Lee for the [8086 instruction set reference](https://www.eng.auburn.edu/~sylee/ee2220/8086_instruction_set.html)
*   mlsite.net for the [8086 opcode map](http://www.mlsite.net/8086/)
*   crtc-demos && tkchia for [gcc-ia16](https://gitlab.com/tkchia/build-ia16)
*   [polly](https://blog.polly.computer) for teaching me arm and hardware
*   cohosters for inspiring me to learn CSS in the first place

_Feb 2026_