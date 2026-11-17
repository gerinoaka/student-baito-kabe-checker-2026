'use strict';
// サイト全体テスト（6ページ・統合後に実行）。依存ゼロ。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const BASE = 'https://gerinoaka.github.io/student-baito-kabe-checker-2026/';
const DIRS = ['', 'kakemochi/', 'shift-limit/', 'living-cost-simulator/', 'es-word-counter/', 'nisa-simulator/'];
const PAGES = DIRS.map((d) => d + 'index.html');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }
function css(h) { const m = h.match(/\/\*ds:start v1\*\/[\s\S]*?\/\*ds:end\*\//); assert.ok(m, 'ds block missing'); return m[0]; }

c('X01 shared css identical', () => {
  const base = css(rd(PAGES[0]));
  PAGES.forEach((p) => assert.strictEqual(css(rd(p)), base, p));
});
c('X02 related links', () => {
  PAGES.forEach((p, i) => {
    const h = rd(p);
    const aside = h.match(/<aside class="rel"[\s\S]*?<\/aside>/); assert.ok(aside, p + ' aside');
    const hrefs = [...aside[0].matchAll(/<a href="([^"]*)"/g)].map((x) => x[1]);
    assert.strictEqual(hrefs.length, 6, p + ' links');
    const dir = path.dirname(path.join(root, p));
    hrefs.forEach((x) => assert.ok(fs.existsSync(path.join(path.resolve(dir, x), 'index.html')), p + ' -> ' + x));
    assert.strictEqual((aside[0].match(/aria-current="page"/g) || []).length, 1, p + ' aria-current in rel');
  });
});
c('X03 sitemap == canonicals', () => {
  const locs = [...rd('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  const can = PAGES.map((p) => rd(p).match(/<link rel="canonical" href="([^"]*)"/)[1]);
  assert.strictEqual(locs.length, 6);
  assert.deepStrictEqual(locs.slice().sort(), can.slice().sort());
  assert.deepStrictEqual(can.slice().sort(), DIRS.map((d) => BASE + d).sort());
});
c('X04 no stray root files in subfolders', () => {
  DIRS.slice(1).forEach((d) => ['sitemap.xml', 'robots.txt', '.nojekyll'].forEach((f) => assert.ok(!fs.existsSync(path.join(root, d, f)), d + f)));
  ['sitemap.xml', 'robots.txt', '.nojekyll', 'googlef0918a9bf30cf9a1.html'].forEach((f) => assert.ok(fs.existsSync(path.join(root, f)), f));
});
c('X05 no old URLs', () => {
  const old = ['living-cost-simulator', 'es-word-counter', 'nisa-simulator'].map((n) => 'https://gerinoaka.github.io/' + n + '/');
  const hits = [];
  (function w(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'tests' && e.name !== 'node_modules') w(p); return; }
      if (!/\.(html|js|css|md|xml|txt|json)$/.test(e.name)) return;
      const t = fs.readFileSync(p, 'utf8'); old.forEach((o) => { if (t.includes(o)) hits.push(path.relative(root, p) + ' ' + o); });
    });
  })(root);
  assert.deepStrictEqual(hits, []);
});
c('X06 theme-color', () => PAGES.forEach((p) => {
  const h = rd(p);
  assert.ok(h.includes('<meta name="theme-color" content="#f8fafc">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">'), p);
  assert.strictEqual((h.match(/name="theme-color"/g) || []).length, 2, p);
}));
c('X07 links-config labels', () => ['', 'living-cost-simulator/', 'es-word-counter/', 'nisa-simulator/'].forEach((d) => {
  const ctx = {}; vm.runInNewContext(rd(d + 'links-config.js'), { window: ctx });
  const L = Object.values(ctx).find((v) => v && typeof v === 'object');
  assert.ok(L && Object.keys(L).length >= 3, d);
  Object.keys(L).forEach((k) => assert.strictEqual(L[k].label, 'PR', d + k));
}));

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
