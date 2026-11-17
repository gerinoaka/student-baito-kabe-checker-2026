'use strict';
// UI の静的検査（N01〜N15）。依存ゼロ。HTML を文字列で読む。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }

const SITE = 'https://gerinoaka.github.io/student-baito-kabe-checker-2026/';
const NEW_BASE = SITE + 'es-word-counter/';
const G = 'https://gerinoaka.github.io/';
const OLD_BASE = G + 'es-word-counter/';
// 刷新前の logic（BASE のみ旧URL）の SHA-256
const LOGIC_SHA = 'a6eb5df47f37a87b114cc895768d359304ba1b350b3f8fca8d25018854a4f4bb';
const TITLE = 'ES文字数カウント｜8割目安・原稿用紙換算とガクチカ構成チェック';
const DESC = '就活のES・ガクチカの文字数をリアルタイムでカウント。空白抜き・原稿用紙換算（400字詰）・指定字数の達成率と8割の目安を表示し、結論・STAR・冗長表現のヒントも出します。登録不要で、入力は送信も保存もされません。';
const H1 = 'ES文字数カウント＆ガクチカ構成チェッカー';

function insideDetails(pos) {
  const before = html.slice(0, pos);
  return (before.match(/<details\b/g) || []).length - (before.match(/<\/details>/g) || []).length > 0;
}
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];

c('N01', () => assert.ok(Buffer.byteLength(html, 'utf8') <= 102400));

c('N02', () => {
  assert.ok(/<details class="acc/.test(html));
  assert.ok(![...html.matchAll(/<details\b[^>]*>/g)].some((m) => /\sopen\b/.test(m[0])));
});

c('N03', () => {
  const band = html.indexOf('<div class="band"');
  assert.ok(band > 0 && !insideDetails(band));
  assert.ok(html.slice(band, band + 400).includes('目安です。数え方は提出先の表示が優先です／最終更新日 2026-11-17'));
  const foot = html.indexOf('<footer>');
  const lk = html.indexOf('href="#legal"', foot);
  assert.ok(lk > foot && !insideDetails(lk));
  const cf = html.indexOf('class="confirm"');
  assert.ok(cf > 0 && !insideDetails(cf));
  const sf = html.indexOf('class="safe"');
  assert.ok(sf > 0 && !insideDetails(sf));
});

c('N04', () => {
  const ta = html.indexOf('<textarea id="es"');
  const pn = html.indexOf('id="privNote"');
  const lc = html.indexOf('id="limitChips"');
  assert.ok(ta > 0 && pn > ta && lc > pn);
  assert.ok(html.slice(pn, pn + 200).includes('送信・保存しません'));
});

c('N05', () => {
  assert.ok(!/type="range"/.test(html));
  const chips = [...html.matchAll(/<button\b[^>]*class="chip"[^>]*>/g)];
  assert.strictEqual(chips.length, 6);
  chips.forEach((m) => assert.ok(/aria-pressed="(true|false)"/.test(m[0]), m[0]));
});

c('N06', () => {
  assert.ok(!/outline\s*:\s*(none|0)\b/.test(html));
  assert.ok(/@media\(prefers-reduced-motion/.test(html));
});

function lum(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function vars(s) {
  const o = {};
  for (const m of s.matchAll(/--([a-z-]+):(#[0-9a-fA-F]{3,6})\b/g)) {
    let h = m[2];
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    o[m[1]] = h;
  }
  return o;
}
c('N07', () => {
  const lightSrc = style.match(/:root\{color-scheme[\s\S]*?--t:\.18s\}/)[0];
  const darkSrc = style.match(/@media\(prefers-color-scheme:dark\)\{:root\{([\s\S]*?)\}\}/)[1];
  const L = vars(lightSrc);
  const D = Object.assign({}, L, vars(darkSrc));
  const pairs = [['on-primary', 'primary'], ['primary', 'soft'], ['primary', 'primary-soft'], ['fg', 'bg'], ['fg', 'card'],
    ['sub', 'card'], ['sub', 'bg'], ['sub', 'soft'], ['ok-fg', 'ok-bg'], ['ng-fg', 'ng-bg'], ['wn-fg', 'wn-bg'], ['nt-fg', 'nt-bg'], ['primary', 'card']];
  [['light', L], ['dark', D]].forEach(([nm, V]) => pairs.forEach(([f, b]) => {
    assert.ok(V[f] && V[b], nm + ' ' + f + '/' + b);
    assert.ok(ratio(V[f], V[b]) >= 4.5, nm + ' ' + f + '/' + b + ' = ' + ratio(V[f], V[b]).toFixed(2));
  }));
});

c('N08', () => {
  assert.ok(html.includes('<title>' + TITLE + '</title>'));
  assert.ok(html.includes('<meta name="description" content="' + DESC + '">'));
  assert.ok(html.includes('<meta property="og:title" content="' + TITLE + '">'));
  assert.ok(html.includes('<meta property="og:description" content="' + DESC + '">'));
  assert.strictEqual((html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1], H1);
});

c('N09', () => {
  const body = html.match(/<script id="logic">([\s\S]*?)<\/script>/)[1];
  assert.ok(body.includes("var BASE='" + NEW_BASE + "'"));
  const old = body.split(NEW_BASE).join(OLD_BASE);
  assert.strictEqual(crypto.createHash('sha256').update(old, 'utf8').digest('hex'), LOGIC_SHA);
});

c('N10', () => {
  const olds = [G + 'living-cost-simulator/', G + 'es-word-counter/', G + 'nisa-simulator/'];
  const files = [];
  (function walk(d) { fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(p); }); })(root);
  files.forEach((f) => {
    if (path.basename(f) === 'ui-static.test.js') return; // 旧URLの組み立てを含む検査自身
    const s = fs.readFileSync(f, 'utf8');
    olds.forEach((o) => assert.ok(!s.includes(o), path.relative(root, f) + ' has ' + o));
  });
});

c('N11', () => {
  const rel = html.match(/<aside class="rel"[\s\S]*?<\/aside>/)[0];
  assert.ok(html.indexOf('<aside class="rel"') > html.indexOf('</main>') && html.indexOf('<aside class="rel"') < html.indexOf('<footer>'));
  const hrefs = [...rel.matchAll(/<a href="([^"]*)"/g)].map((x) => x[1]);
  assert.strictEqual(hrefs.length, 6);
  ['../', '../kakemochi/', '../shift-limit/', '../living-cost-simulator/', './', '../nisa-simulator/']
    .forEach((u) => assert.ok(hrefs.includes(u), u));
  hrefs.forEach((u) => assert.ok(!/^https?:/.test(u), u));
  assert.ok(!/<a [^>]*(target|rel)=/.test(rel));
  hrefs.filter((u) => u !== './').forEach((u) =>
    assert.ok(fs.existsSync(path.join(root, u, 'index.html')), 'index.html missing: ' + u));
  const tools = rel.match(/<section class="tools"[\s\S]*?<\/section>/)[0];
  const sis = rel.match(/<section class="sisters"[\s\S]*?<\/section>/)[0];
  assert.strictEqual((tools.match(/<li>/g) || []).length, 3);
  assert.strictEqual((sis.match(/<li>/g) || []).length, 3);
  assert.strictEqual((tools.match(/aria-current="page"/g) || []).length, 0);
  assert.strictEqual((sis.match(/aria-current="page"/g) || []).length, 1);
  assert.ok(/aria-current="page"[^>]*><strong>[^<]*<\/strong><span>[^<]*（このページ）<\/span>/.test(sis));
  assert.strictEqual((html.match(/<nav\b/g) || []).length, 1);
});

c('N12', () => {
  const a = html.indexOf('<div class="card" id="actions">');
  assert.ok(a > 0);
  const end = html.indexOf('<div class="acc-list">', a);
  const blk = html.slice(a, end);
  assert.ok(!/type="range"/.test(blk) && !/class="chip"/.test(blk));
  assert.ok(blk.includes('id="shareX"') && blk.includes('id="prCards"'));
  const prev = html.slice(0, a).trimEnd();
  assert.ok(prev.endsWith('</div>'));
  const st = prev.lastIndexOf('<div class="acc-list">');
  assert.ok(st > 0 && prev.slice(st).includes('<details class="acc"'));
});

c('N13', () => {
  const lines = fs.readFileSync(path.join(root, 'links-config.js'), 'utf8').split('\n');
  [40, 48, 56].forEach((n) => assert.ok(/^\s+url: '(?:|https:\/\/[^']*)',/.test(lines[n - 1]), 'line ' + n + ': ' + lines[n - 1]));
  assert.strictEqual(lines.filter((l) => /^\s+url:/.test(l)).length, 3);
  assert.ok(lines.filter((l) => /label:/.test(l)).every((l) => /label: 'PR',/.test(l)));
  assert.ok(fs.readFileSync(path.join(root, 'README.md'), 'utf8').includes('40 / 48 / 56 行目'));
});

c('N14', () => {
  const vs = [...html.matchAll(/<button\b[^>]*class="chip"[^>]*data-v="(\d+)"/g)].map((x) => x[1]);
  assert.deepStrictEqual(vs, ['200', '300', '400', '500', '600', '800']);
  assert.ok(/class="chips pre" id="limitChips" data-cols="6"/.test(html));
  assert.ok(/data-v="400" aria-pressed="true"/.test(html));
});

c('N15', () => {
  const ui = html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1];
  assert.ok(ui.includes('aria-valuetext') && ui.includes('liveSr'));
  assert.ok(!/<section[^>]*id="result"[^>]*aria-live/.test(html));
  assert.strictEqual((html.match(/aria-live=/g) || []).length, 1);
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
