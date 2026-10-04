// Mini JS lexer: extract string / template-text / regex literals containing CJK (comments excluded), with line numbers.
// usage: node tools/locale-work/extract-literals.mjs <file-or-dir>... [--json out.json]
// e.g. `public/js` (English UI: 0 literals) or `scripts tools/setup.mjs tools/doctor.mjs` (the launcher texts still to translate)
import fs from 'node:fs';
import path from 'node:path';
const CJK = /[一-鿿぀-ヿ＀-￯　-〿]/;
const HAN = /[一-鿿぀-ヿ]/;

export function lex(src) {
  const out = []; // { kind, text, line, col }
  let i = 0, line = 1;
  const n = src.length;
  const tplStack = []; // for template literals: brace depth counters
  let braceDepth = 0;
  let prevSignificant = ''; // last non-space char/token to decide regex vs divide
  const push = (kind, text, startLine) => { out.push({ kind, text, line: startLine }); };
  function readString(q) {
    const startLine = line; let s = ''; i++;
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') { s += src[i] + src[i + 1]; if (src[i + 1] === '\n') line++; i += 2; continue; }
      if (src[i] === '\n') { line++; }
      s += src[i++];
    }
    i++;
    push('str', s, startLine);
  }
  function readTemplate() {
    // positioned after the opening backtick or after a closing } of an expression: read quasi until ${ or `
    const startLine = line; let s = '';
    while (i < n) {
      const c = src[i];
      if (c === '\\') { s += c + src[i + 1]; if (src[i + 1] === '\n') line++; i += 2; continue; }
      if (c === '`') { i++; push('tpl', s, startLine); return 'end'; }
      if (c === '$' && src[i + 1] === '{') { i += 2; push('tpl', s, startLine); return 'expr'; }
      if (c === '\n') line++;
      s += c; i++;
    }
    push('tpl', s, startLine); return 'end';
  }
  const stack = []; // entries: 'brace' (normal {), 'tplexpr'
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'") { readString(c); prevSignificant = 'x'; continue; }
    if (c === '`') { i++; let r = readTemplate(); if (r === 'expr') stack.push('tplexpr'); else prevSignificant = 'x'; continue; }
    if (c === '{') { stack.push('brace'); i++; prevSignificant = '{'; continue; }
    if (c === '}') {
      const top = stack.pop(); i++;
      if (top === 'tplexpr') { let r = readTemplate(); if (r === 'expr') stack.push('tplexpr'); else prevSignificant = 'x'; }
      else prevSignificant = '}';
      continue;
    }
    if (c === '/') {
      // regex literal if previous significant token cannot end an expression
      if (/[(,=:;!&|?{}\[+\-*%<>~^]|^$/.test(prevSignificant) || prevSignificant === 'kw') {
        const startLine = line; let s = '/'; i++; let inClass = false;
        while (i < n) {
          const ch = src[i];
          if (ch === '\\') { s += ch + src[i + 1]; i += 2; continue; }
          if (ch === '[') inClass = true; else if (ch === ']') inClass = false;
          if (ch === '/' && !inClass) { s += ch; i++; break; }
          if (ch === '\n') break;
          s += ch; i++;
        }
        while (i < n && /[a-z]/.test(src[i])) { s += src[i++]; }
        push('re', s, startLine); prevSignificant = 'x'; continue;
      }
      i++; prevSignificant = '/'; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      let w = ''; while (i < n && /[A-Za-z0-9_$]/.test(src[i])) w += src[i++];
      prevSignificant = /^(return|typeof|case|in|of|delete|void|throw|new|else|do|yield|await)$/.test(w) ? 'kw' : 'x'; continue;
    }
    if (/[0-9]/.test(c)) { while (i < n && /[0-9a-zA-Z_.]/.test(src[i])) i++; prevSignificant = 'x'; continue; }
    prevSignificant = c; i++;
  }
  return out;
}

export function cjkLiterals(src) {
  return lex(src).filter((t) => HAN.test(t.text));
}

if (process.argv[1] && process.argv[1].endsWith('extract-literals.mjs')) {
  const args = process.argv.slice(2);
  const jsonIdx = args.indexOf('--json');
  let jsonOut = null;
  if (jsonIdx >= 0) { jsonOut = args[jsonIdx + 1]; args.splice(jsonIdx, 2); }
  const files = [];
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const f of fs.readdirSync(p)) walk(path.join(p, f));
    else if (/\.(m?js|html)$/.test(p)) files.push(p);
  };
  for (const a of args) walk(a);
  const all = [];
  let total = 0;
  for (const f of files.sort()) {
    const src = fs.readFileSync(f, 'utf8');
    const lits = f.endsWith('.html') ? [] : cjkLiterals(src);
    if (!lits.length) continue;
    total += lits.length;
    for (const l of lits) all.push({ file: f, ...l });
    if (!jsonOut) { console.log(`\n## ${f} (${lits.length})`); for (const l of lits) console.log(`${String(l.line).padStart(5)} ${l.kind} ${JSON.stringify(l.text).slice(0, 160)}`); }
  }
  console.log(`\nTOTAL literals with CJK: ${total} in ${new Set(all.map((a) => a.file)).size} files`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(all, null, 1));
}
