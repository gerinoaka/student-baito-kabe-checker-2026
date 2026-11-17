'use strict';
// 依存ゼロの静的検査（N01〜N15）。実行: node tests/ui-static.test.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const links = fs.readFileSync(path.join(root, 'links-config.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, msg) {
  if (cond) pass++;
  else { fail++; console.error('FAIL ' + name + (msg ? ' -> ' + msg : '')); }
}
const attr = (tag, a) => { const m = tag.match(new RegExp('\\s' + a + '="([^"]*)"')); return m ? m[1] : null; };

const SITE = 'https://gerinoaka.github.io/student-baito-kabe-checker-2026/';
const NEW_BASE = SITE + 'living-cost-simulator/';
const OLD_BASE = 'https://gerinoaka.github.io/' + 'living-cost-simulator/';
const OLD_URLS = ['living-cost-simulator/', 'es-word-counter/', 'nisa-simulator/'].map((x) => 'https://gerinoaka.github.io/' + x);
// 刷新前の <script id="logic"> の SHA-256（着手時に取得）
const LOGIC_SHA = 'd7672a6c848f28d5435461b1214b430af296d05bc432915266e8367e071d296f';

// N01
ok('N01', Buffer.byteLength(html, 'utf8') <= 102400, 'size ' + Buffer.byteLength(html, 'utf8'));

// N02
{
  const tags = html.match(/<details class="acc[^>]*>/g) || [];
  ok('N02-count', tags.length >= 8, 'details ' + tags.length);
  ok('N02', tags.every((t) => !/\sopen[\s>=]/.test(t)), 'open attr found');
}

// N03
{
  const band = html.match(/<div class="band"[^>]*>[\s\S]*?<\/div>/);
  ok('N03-band', !!band && band[0].includes('目安です。対象：令和8年度の料率・令和8年分の税／最終確認日 2026-11-17'));
  const header = html.slice(0, html.indexOf('<main>'));
  ok('N03-band-outside', !!band && header.includes(band[0]) && !/<details/.test(header));
  const foot = html.slice(html.indexOf('<footer>'), html.indexOf('</footer>'));
  const fi = foot.indexOf('href="#legal"'), di = foot.indexOf('<details');
  ok('N03-footer', fi >= 0 && di >= 0 && fi < di);
  const res = html.slice(html.indexOf('<section id="result"'), html.indexOf('<section id="s2"'));
  ok('N03-confirm', /class="confirm"/.test(res) && !/<details/.test(res));
}

// N04: living には risk / privNote は無い（nisa / es 用）。living は confirm の存在で N03 が担う
ok('N04', true);

// N05
{
  const ranges = html.match(/<input[^>]*type="range"[^>]*>/g) || [];
  ok('N05-range-count', ranges.length === 8, 'ranges ' + ranges.length);
  ranges.forEach((r) => {
    const id = attr(r, 'id');
    ok('N05-label-' + id, new RegExp('<label[^>]*\\sfor="' + id + '"').test(html));
  });
  const chips = html.match(/<button[^>]*class="chip"[^>]*>/g) || [];
  ok('N05-chip-count', chips.length === 8, 'chips ' + chips.length);
  ok('N05-chips', chips.every((c) => /aria-pressed="(true|false)"/.test(c)));
}

// N06
ok('N06-outline', !/outline\s*:\s*(none|0(?![.\d]))/.test(html));
ok('N06-reduced', html.includes('@media(prefers-reduced-motion'));

// N07 コントラスト
{
  const css = html.match(/\/\*ds:start v1\*\/([\s\S]*?)\/\*ds:end\*\//)[1];
  const light = css.match(/:root\{color-scheme[^{}]*\}/)[0];
  const dark = css.match(/@media\(prefers-color-scheme:dark\)\{:root\{([^{}]*)\}/)[1];
  const vars = (s) => { const o = {}; for (const m of s.matchAll(/--([a-z-]+):(#[0-9a-fA-F]{3,6})/g)) o[m[1]] = m[2]; return o; };
  const L = vars(light), D = Object.assign({}, L, vars(dark));
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join(''); const n = parseInt(h, 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const pairs = [['on-primary', 'primary'], ['primary', 'soft'], ['primary', 'primary-soft'], ['primary', 'card'], ['fg', 'bg'], ['fg', 'card'], ['sub', 'card'], ['sub', 'bg'], ['sub', 'soft'], ['ok-fg', 'ok-bg'], ['ng-fg', 'ng-bg'], ['wn-fg', 'wn-bg'], ['nt-fg', 'nt-bg'], ['ng-fg', 'card'], ['nt-fg', 'soft'], ['wn-fg', 'wn-bg'], ['ring', 'card']];
  [['light', L], ['dark', D]].forEach(([n, v]) => pairs.forEach(([a, b]) => {
    const r = ratio(v[a], v[b]);
    ok('N07-' + n + '-' + a + '/' + b, r >= (a === 'ring' ? 3 : 4.5), r.toFixed(2));
  }));
}

// N08
ok('N08-title', html.includes('<title>手取り計算 新卒｜初任給の手取りと一人暮らし生活費シミュレーター</title>'));
{
  const D = '初任給・バイト代の額面から手取りを目安計算。社会保険・所得税・住民税の内訳、家賃・食費など一人暮らし生活費の理想バランス、毎月の貯金・遊びに使える額をグラフで確認。令和8年度対応。';
  ok('N08-desc', html.includes('<meta name="description" content="' + D + '">'));
  ok('N08-ogt', html.includes('<meta property="og:title" content="手取り計算 新卒｜初任給の手取りと一人暮らし生活費シミュレーター">'));
  ok('N08-ogd', html.includes('<meta property="og:description" content="' + D + '">'));
  ok('N08-h1', html.includes('<h1>新卒の手取り計算＆一人暮らし生活費シミュレーター（令和8年度）</h1>'));
  ok('N08-canon', html.includes('<link rel="canonical" href="' + NEW_BASE + '">') && html.includes('<meta property="og:url" content="' + NEW_BASE + '">'));
}

// N09
{
  const lg = html.match(/<script id="logic">([\s\S]*?)<\/script>/)[1];
  const back = lg.split(NEW_BASE).join(OLD_BASE);
  ok('N09', crypto.createHash('sha256').update(back, 'utf8').digest('hex') === LOGIC_SHA);
  ok('N09-base', lg.includes("var BASE='" + NEW_BASE + "';"));
  ok('N09-order', /<script src="links-config\.js"><\/script>\s*<script id="logic">/.test(html));
}

// N10
{
  const bad = [];
  (function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      const s = fs.readFileSync(p, 'utf8');
      OLD_URLS.forEach((u) => { if (s.includes(u)) bad.push(p + ' ' + u); });
    });
  })(root);
  ok('N10', bad.length === 0, bad.join(', '));
}

// N11
{
  const aside = html.match(/<aside class="rel"[\s\S]*?<\/aside>/);
  ok('N11-aside', !!aside);
  const a = aside ? aside[0] : '';
  ok('N11-position', html.indexOf('</main>') < html.indexOf('<aside class="rel"') && html.indexOf('<aside class="rel"') < html.indexOf('<footer>'));
  const hrefs = [...a.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
  ok('N11-count', hrefs.length === 6, String(hrefs.length));
  ok('N11-relative', hrefs.every((h) => !/^https?:/.test(h)));
  ok('N11-targets', hrefs.every((h) => h === './' || fs.existsSync(path.join(root, h, 'index.html'))), hrefs.join(' '));
  const sis = a.match(/<section class="sisters"[\s\S]*?<\/section>/)[0];
  const tls = a.match(/<section class="tools"[\s\S]*?<\/section>/)[0];
  ok('N11-sisters', (sis.match(/aria-current="page"/g) || []).length === 1 && (sis.match(/<li>/g) || []).length === 3);
  ok('N11-tools', (tls.match(/<li>/g) || []).length === 3 && !/aria-current/.test(tls));
  ok('N11-this', /<a href="\.\/" aria-current="page">[\s\S]*（このページ）/.test(sis));
  ok('N11-nav-one', (html.match(/<nav[\s>]/g) || []).length === 1);
  ok('N11-no-target', !/target=|rel=/.test(a));
}

// N12
{
  const i = html.indexOf('<div class="card" id="actions">');
  const e = html.indexOf('<!-- AD-SLOT-1');
  ok('N12-found', i > 0 && e > i);
  const blk = html.slice(i, e);
  ok('N12-no-range-chip', !/type="range"/.test(blk) && !/class="chip"/.test(blk));
  ok('N12-ids', blk.includes('id="shareX"') && blk.includes('id="prCards"'));
  const before = html.slice(0, i);
  const al = before.lastIndexOf('<div class="acc-list">');
  ok('N12-before-acc', al >= 0 && before.trimEnd().endsWith('</div>') && !/<section|class="card/.test(before.slice(al)));
  ok('N12-single', (html.match(/id="actions"/g) || []).length === 1);
}

// N13
{
  const lines = links.split('\n');
  const exp = { rentMove: 43, internet: 50, creditCard: 57, bank: 64 };
  Object.keys(exp).forEach((k) => {
    const ln = exp[k];
    ok('N13-' + k, /^\s+url: '',/.test(lines[ln - 1]) && /^\s+(rentMove|internet|creditCard|bank): \{/.test(lines[ln - 2]), 'line ' + ln + ': ' + lines[ln - 1]);
    ok('N13-readme-' + k, readme.includes(ln + '行目'));
  });
  ok('N13-comment-lines', lines.slice(0, 40).join('\n').trimEnd().endsWith('*/') && lines[39] === ' */' && lines[40].startsWith('window.LIVING_LINKS'));
}

// N14
{
  const need = [
    ['monthlyRange', 100000, 500000, 5000], ['sMonthlyRange', 0, 200000, 5000], ['rentRange', 0, 150000, 1000],
    ['foodRange', 0, 80000, 1000], ['utilRange', 0, 30000, 500], ['commRange', 0, 20000, 500], ['otherRange', 0, 80000, 1000], ['slider', 0, 100, 5]
  ];
  need.forEach(([id, mn, mx, st]) => {
    const t = html.match(new RegExp('<input[^>]*\\sid="' + id + '"[^>]*>'));
    ok('N14-' + id, !!t && attr(t[0], 'min') === String(mn) && attr(t[0], 'max') === String(mx) && attr(t[0], 'step') === String(st) && /class="range"/.test(t[0]));
  });
  ['monthly', 'sMonthly', 'rent', 'food', 'util', 'comm', 'other'].forEach((id) => ok('N14-num-' + id, new RegExp('<input id="' + id + '"').test(html)));
  const chips = (id) => { const m = html.match(new RegExp('<div class="chips" id="' + id + '" data-cols="4"[^>]*>([\\s\\S]*?)</div>')); return m ? [...m[1].matchAll(/data-v="(\d+)"[^>]*aria-label="([^"]*)"/g)].map((x) => x[1] + ':' + x[2]) : null; };
  ok('N14-chips-m', JSON.stringify(chips('monthlyChips')) === JSON.stringify(['200000:20万円', '220000:22万円', '250000:25万円', '300000:30万円']));
  ok('N14-chips-s', JSON.stringify(chips('sMonthlyChips')) === JSON.stringify(['50000:5万円', '80000:8万円', '100000:10万円', '120000:12万円']));
}

// N15
{
  const ui = html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1];
  ok('N15-ui', ui.includes('aria-valuetext') && ui.includes('liveSr'));
  const sec = html.match(/<section id="result"[^>]*>/)[0];
  ok('N15-no-live-on-section', !/aria-live/.test(sec));
  ok('N15-one-live', (html.match(/aria-live=/g) || []).length === 1);
  ok('N15-no-focus', !/\.focus\(/.test(ui));
  ok('N15-scroll-only-bar', (ui.match(/scrollIntoView/g) || []).length === 1);
}

// 追加: 禁止API・375px 固定幅
{
  ok('X-forbidden', !/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|indexedDB/.test(html));
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const fixed = [...css.matchAll(/(^|[{};,])\s*([^{}]*)\{([^{}]*)\}/g)].filter((m) => /(^|[;{])\s*(min-)?width\s*:\s*\d{3,}px/.test(m[3])).map((m) => m[2].trim());
  ok('X-fixed-width', fixed.every((s) => /^table$/.test(s)), fixed.join(' | '));
  ok('X-script-src', JSON.stringify([...html.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1])) === '["links-config.js"]');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  ok('X-dup-id', dup.length === 0, dup.join(','));
}

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
