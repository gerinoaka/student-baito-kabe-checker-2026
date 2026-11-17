'use strict';
// 依存ゼロの静的テスト（N01〜N15）。実行: node tests/ui-static.test.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const SITE = 'https://gerinoaka.github.io/student-baito-kabe-checker-2026/';
const BASE = SITE + 'nisa-simulator/';
const OLD = 'https://gerinoaka.github.io/nisa-simulator/';
const LOGIC_SHA = 'a37fa90f1c301e8afb968ec124dd5e3a53d85a9266563f6d385f6e1719c344d0'; // 刷新前（旧BASE）の logic

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); }
}
const uiJs = html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1];
const styleCss = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const noDetails = (s) => s.replace(/<details[\s\S]*?<\/details>/g, '');

t('N01', () => assert.ok(Buffer.byteLength(html, 'utf8') <= 102400));
t('N02', () => {
  const tags = html.match(/<details class="acc[^>]*>/g) || [];
  assert.ok(tags.length >= 7);
  tags.forEach((x) => assert.ok(!/\bopen\b/.test(x), x));
});
t('N03', () => {
  // band は <details> の外（header 内）
  const header = html.match(/<header>[\s\S]*?<\/header>/)[0];
  assert.ok(/<div class="band"[^>]*>[\s\S]*?仮定の試算です。元本割れの可能性があり、結果は保証されません／最終確認日 2026-11-17[\s\S]*?<\/div>/.test(noDetails(header)));
  const footer = html.match(/<footer>[\s\S]*?<\/footer>/)[0];
  assert.ok(/<p class="foot-links"><a href="#legal"/.test(noDetails(footer)));
  const res = html.match(/<section id="result"[\s\S]*?<\/section>/)[0];
  assert.ok(/class="risk"/.test(noDetails(res)));
});
t('N04', () => {
  const res = html.match(/<section id="result"[\s\S]*?<\/section>/)[0];
  const risk = res.match(/<p class="risk"[^>]*>([\s\S]*?)<\/p>/)[1];
  ['元本割れ', '保証', '勧誘', '税', '手数料'].forEach((w) => assert.ok(risk.includes(w), w));
  const pr = html.match(/<section class="pr-wrap" id="prSec"[\s\S]*?<\/section>/)[0];
  ['広告を含みます', '元本割れ', '18歳以上', '保証', '勧誘', '手数料'].forEach((w) => assert.ok(pr.includes(w), w));
  // 結果カードより PR のほうが後ろ
  assert.ok(html.indexOf('id="prSec"') > html.indexOf('class="risk"'));
});
t('N05', () => {
  [...html.matchAll(/<input[^>]*type="range"[^>]*>/g)].forEach((m) => {
    const id = m[0].match(/id="([^"]+)"/)[1];
    assert.ok(new RegExp('<label[^>]*for="' + id + '"').test(html), 'label for ' + id);
  });
  const chips = [...html.matchAll(/<button[^>]*class="chip"[^>]*>/g)];
  assert.strictEqual(chips.length, 14);
  chips.forEach((m) => assert.ok(/aria-pressed="(true|false)"/.test(m[0]), m[0]));
});
t('N06', () => {
  assert.ok(!/outline\s*:\s*(none|0)\b/.test(html));
  assert.ok(/@media\(prefers-reduced-motion/.test(styleCss));
});
t('N07', () => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = (hx) => { const n = parseInt(hx.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const root1 = styleCss.match(/:root\{color-scheme[\s\S]*?\}/)[0];
  const dark = styleCss.match(/prefers-color-scheme:dark\)\{:root\{([\s\S]*?)\}\}/)[1];
  const vars = (s) => { const o = {}; [...s.matchAll(/--([a-z-]+):(#[0-9a-fA-F]{3,6})\b/g)].forEach((m) => { o[m[1]] = m[2].length === 4 ? '#' + m[2][1] + m[2][1] + m[2][2] + m[2][2] + m[2][3] + m[2][3] : m[2]; }); return o; };
  const lt = vars(root1), dk = Object.assign({}, lt, vars(dark));
  [lt, dk].forEach((v, k) => {
    const pairs = [['on-primary', 'primary'], ['primary', 'soft'], ['primary', 'primary-soft'], ['primary', 'card'], ['fg', 'bg'], ['fg', 'card'], ['sub', 'card'], ['sub', 'bg'], ['sub', 'soft'],
      ['ok-fg', 'ok-bg'], ['ng-fg', 'ng-bg'], ['wn-fg', 'wn-bg'], ['nt-fg', 'nt-bg']];
    pairs.forEach(([a, b]) => assert.ok(cr(v[a], v[b]) >= 4.5, (k ? 'dark ' : 'light ') + a + '/' + b + ' ' + cr(v[a], v[b]).toFixed(2)));
  });
});
t('N08', () => {
  const T = '大学生の新NISA積立シミュレーター｜バイト代で月1万円なら';
  const D = '大学生向けに、毎月の積立額・想定利回り・期間をスライダーで動かして新NISAの積立結果をグラフで確認。バイト代の一部を回すといくらになるかを例として試算します。税・手数料は含まず、結果は保証されません。';
  assert.ok(html.includes('<title>' + T + '</title>'));
  assert.ok(html.includes('<meta name="description" content="' + D + '">'));
  assert.ok(html.includes('<meta property="og:title" content="' + T + '">'));
  assert.ok(html.includes('<meta property="og:description" content="' + D + '">'));
  assert.ok(html.includes('<h1>大学生からの新NISA・バイト代積立シミュレーター</h1>'));
  assert.ok(html.includes('<meta name="theme-color" content="#f8fafc">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">'));
});
t('N09', () => {
  const logic = html.match(/<script id="logic">([\s\S]*?)<\/script>/)[1];
  assert.ok(logic.includes("const BASE='" + BASE + "'"));
  const back = logic.split(BASE).join(OLD);
  assert.strictEqual(crypto.createHash('sha256').update(back).digest('hex'), LOGIC_SHA);
  assert.ok(html.indexOf('<script src="links-config.js"></script>\n<script id="logic">') > 0);
});
t('N10', () => {
  const files = ['index.html', 'links-config.js', 'README.md'].map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
  ['https://gerinoaka.github.io/living-cost-simulator/', 'https://gerinoaka.github.io/es-word-counter/', OLD].forEach((u) => files.forEach((s) => assert.ok(!s.includes(u), u)));
});
t('N11', () => {
  const rel = html.match(/<aside class="rel"[\s\S]*?<\/aside>/)[0];
  assert.ok(html.indexOf('</main>') < html.indexOf('<aside class="rel"') && html.indexOf('</aside>') < html.indexOf('<footer>'));
  const hrefs = [...rel.matchAll(/href="([^"]*)"/g)].map((x) => x[1]);
  assert.deepStrictEqual(hrefs, ['../', '../kakemochi/', '../shift-limit/', '../living-cost-simulator/', '../es-word-counter/', './']);
  assert.ok(!/https?:\/\//.test(rel));
  assert.ok(!/target=|rel=/.test(rel.replace('<aside class="rel"', '')));
  hrefs.forEach((h) => assert.ok(fs.existsSync(path.join(root, h, 'index.html')), 'no index.html in ' + h));
  const tools = rel.match(/<section class="tools"[\s\S]*?<\/section>/)[0];
  const sis = rel.match(/<section class="sisters"[\s\S]*?<\/section>/)[0];
  assert.strictEqual((tools.match(/<li>/g) || []).length, 3);
  assert.strictEqual((sis.match(/<li>/g) || []).length, 3);
  assert.strictEqual((tools.match(/aria-current/g) || []).length, 0);
  assert.strictEqual((sis.match(/aria-current="page"/g) || []).length, 1);
  assert.ok(/<a href="\.\/" aria-current="page">[\s\S]*?（このページ）<\/span>/.test(sis));
  assert.strictEqual((html.match(/<nav[ >]/g) || []).length, 1);
  assert.strictEqual((html.match(/aria-current="page"/g) || []).length, 2);
});
t('N12', () => {
  const act = html.match(/<div class="card" id="actions">[\s\S]*?<\/section>\s*<\/div>/)[0];
  assert.ok(!/type="range"/.test(act) && !/class="chip"/.test(act));
  assert.ok(act.includes('id="shareX"') && act.includes('id="prCards"'));
  const before = html.slice(0, html.indexOf('<div class="card" id="actions">')).trimEnd();
  assert.ok(before.endsWith('</details>\n</div>'));
  assert.ok(/<div class="acc-list">\n<details class="acc" id="tableAcc">/.test(html));
});
t('N13', () => {
  const lines = fs.readFileSync(path.join(root, 'links-config.js'), 'utf8').split('\n');
  const at = (k) => lines.map((l, i) => (/^\s+url: '(?:|https:\/\/[^']*)',/.test(l) ? i + 1 : 0)).filter(Boolean);
  assert.deepStrictEqual(at(), [38, 45, 52]);
  const rd = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  ['url 行 38', 'url 行 45', 'url 行 52'].forEach((s) => assert.ok(rd.includes(s), s));
});
t('N14', () => {
  const need = [['mNum', 1000, 100000, 1000], ['mRange', 1000, 100000, 1000], ['rNum', 0, 10, 0.1], ['rRange', 0, 10, 0.1], ['yNum', 1, 40, 1], ['yRange', 1, 40, 1]];
  need.forEach(([id, mn, mx, st]) => {
    const tag = html.match(new RegExp('<input id="' + id + '"[^>]*>'))[0];
    assert.ok(tag.includes('min="' + mn + '"') && tag.includes('max="' + mx + '"') && tag.includes('step="' + st + '"'), id);
  });
  const vs = (id) => [...html.match(new RegExp('<div class="chips" id="' + id + '" data-cols="(\\d)">([\\s\\S]*?)</div>'))[2].matchAll(/data-v="([^"]+)"/g)].map((x) => x[1]);
  assert.deepStrictEqual(vs('mChips'), ['3000', '5000', '10000', '30000']);
  assert.deepStrictEqual(vs('rChips'), ['0', '3', '5']);
  assert.deepStrictEqual(vs('yChips'), ['5', '10', '20', '30']);
  assert.ok(html.includes('id="mChips" data-cols="4"') && html.includes('id="rChips" data-cols="3"') && html.includes('id="yChips" data-cols="4"'));
  ['pGrad', 'p30', 'p40'].forEach((id) => assert.ok(new RegExp('<button type="button" class="chip" id="' + id + '"').test(html), id));
});
t('N15', () => {
  assert.ok(uiJs.includes('aria-valuetext') && uiJs.includes('liveSr'));
  const sec = html.match(/<section id="result"[^>]*>/)[0];
  assert.ok(!/aria-live/.test(sec));
  assert.strictEqual((html.match(/aria-live=/g) || []).length, 1);
  ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'indexedDB'].forEach((w) => assert.ok(!html.includes(w), w));
  assert.ok(!/<dt[^>]*>\s*<h\d/.test(html));
  ['必ず', '確実', '元本保証', '最強', 'おすすめNo.1', '絶対'].forEach((w) => assert.ok(!html.includes(w), w));
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
