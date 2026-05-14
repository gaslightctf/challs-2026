import { REPLServer } from "node:repl";

import ivm from "isolated-vm";
const { Isolate } = ivm;

const FLAG = process.env.FLAG || "gaslightCTF{placeholder}";

// https://patorjk.com/software/taag/#p=display&f=Cosmike&t=jsbox&x=none&v=4&h=4&w=80&we=false
const BANNER =
  '    ....:::::: .::::::. :::::::.      ...      .,::      .:\n ;;;;;;;;;````;;;`    `  ;;;\'\';;\'  .;;;;;;;.   `;;;,  .,;; \n \'\'`  `[[.    \'[==/[[[[, [[[__[[\\.,[[     \\[[,   \'[[,,[[\'  \n,,,    `$$      \'\'\'    $ $$""""Y$$$$$,     $$$    Y$$$P    \n888boood88     88b    dP_88o,,od8P"888,_ _,88P  oP"``"Yo,  \n"MMMMMMMM"      "YMmMY" ""YUMMMP"   "YMMMMMP",m"       "Mm,';

let i = 0;
const lines = BANNER.split("\n");
for (const line of lines) {
  const t = lines.length > 1 ? i / (lines.length - 1) : 0;
  const r = Math.round(255);
  const g = Math.round(165 - 165 * t); // 255→165 (yellow→orange green channel)
  console.log(`\x1b[38;2;${r};${g};0m${line}\x1b[0m`);
  i++;
}

console.log();
console.log(`\x1b[1m> \x1b[0;35mblackbox("is this the flag?")\x1b[0m`);

const iso = new Isolate({ memoryLimit: 16 });
const ctx = iso.createContextSync();

ctx.evalSync(`function blackbox(flag) {
  const FLAG = ${JSON.stringify(FLAG)};

  if (typeof flag !== "string") {
    throw new TypeError("flag must be a string");
  }

  let ok = FLAG.length === flag.length;

  // "secure comparison"
  for (let i = 0; i < 10_000_000; i++) {
    if (FLAG[i % FLAG.length] !== flag[i % flag.length]) {
      ok = false;
    }
  }

  return ok;
}`);
ctx.evalSync(`
blackbox.toString = () => 'nice try';
`);

const repl = new REPLServer({
  input: process.stdin,
  output: process.stdout,

  eval: (code, context, filename, callback) => {
    try {
      const result = ctx.evalSync(code);
      callback(null, result);
    } catch (err) {
      callback(err);
    }
  },
});
