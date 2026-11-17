'use strict';
// UI静的検査（依存ゼロ）。年収の壁3ページの構造・a11y・不変条件（S01〜S13）と、禁止API・ID・リンク・幅の検査。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('node:assert');
const { parseHTML, walk } = require('./dom-stub');

const root = path.join(__dirname, '..');
const BASE = 'https://gerinoaka.github.io/student-baito-kabe-checker-2026/';
// S07: 刷新前の値（不変条件の保険）
const HEADS = {
 "index.html": {
  "title": "学生バイトの年収の壁チェッカー2026｜178万・150万を一発判定",
  "desc": "大学生・高校生のバイト年収を入れるだけで、令和8年分（2026年）の所得税178万円・親の特定親族特別控除・健保の扶養150万円・住民税の壁を判定。あと何万円稼げるかも分かる無料ツール。最終確認日2026-11-16。",
  "h1": "学生バイトの「年収の壁」チェッカー（令和8年分・2026年）",
  "url": "https://gerinoaka.github.io/student-baito-kabe-checker-2026/"
 },
 "kakemochi/index.html": {
  "title": "掛け持ちバイトの源泉徴収・還付金チェッカー2026｜確定申告の目安",
  "desc": "掛け持ちバイトの支払金額と源泉徴収税額を入れるだけで、令和8年分（2026年）の年税額と還付の目安を計算。乙欄で引かれた税金が戻るか、確定申告が必要かの整理つき。最終確認日2026-11-17。無料ツール。",
  "h1": "掛け持ちバイトの源泉徴収・還付金チェッカー（令和8年分・2026年）",
  "url": "https://gerinoaka.github.io/student-baito-kabe-checker-2026/kakemochi/"
 },
 "shift-limit/index.html": {
  "title": "時給×シフト逆算計算機2026｜年収の壁まであと何時間働ける？",
  "desc": "時給と今までの累計収入を入れると、136万・150万・178万の壁を超えないために、残り何か月で月何時間・週何時間まで働けるかを計算。令和8年分（2026年）対応の無料ツール。最終確認日2026-11-17。",
  "h1": "時給×シフト逆算計算機（令和8年分・2026年）",
  "url": "https://gerinoaka.github.io/student-baito-kabe-checker-2026/shift-limit/"
 }
};
// S08: 刷新前の <script id="logic"> 本文（UTF-8）の SHA-256
const HASH = {
  'index.html': '794b2e7bba35e49991d9a24ff8dd55c7b36f15d7d2da2bcbd847d36cfec6fc4d',
  'kakemochi/index.html': '88c244f9faf2e1ef26e384e0baca53e4faabfaf02836bcd51a7987f41c678964',
  'shift-limit/index.html': 'c9d036f0d275616b39ed9fd86062bd83bbcae852657f74dee022c1917cc4351e'
};
let pass = 0, fail = 0;
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }

function lum(hex) {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const f = (i) => { const v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4);
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
function vars(block) { const o = {}; for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)) o[m[1]] = m[2]; return o; }

Object.keys(HASH).forEach((p) => {
  const h = fs.readFileSync(path.join(root, p), 'utf8');
  const doc = { _calls: {} };
  const tree = parseHTML(h, doc);
  const all = (sel) => tree.querySelectorAll(sel);
  const dir = path.dirname(path.join(root, p));
  const isPage = (p === 'index.html') ? 'index' : p.split('/')[0];

  c('S01 acc closed ' + p, () => all('details').filter((d) => d._cls().includes('acc')).forEach((d) => assert.ok(!d.hasAttribute('open'), d.id || 'acc')));
  c('S02 faq/glossary in acc ' + p, () => ['faq', 'glossary'].forEach((id) => {
    const s = all('#' + id)[0]; assert.ok(s, id);
    const d = s.parentNode; assert.ok(d.tagName === 'DETAILS' && d._cls().includes('acc'), id + ' parent');
    const sm = d.children[0]; assert.ok(sm.tagName === 'SUMMARY' && sm.querySelector('h2'), id + ' summary h2');
  }));
  c('S03 always-on elements ' + p, () => {
    const out = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentNode) assert.notStrictEqual(n.tagName, 'DETAILS', 'inside details'); };
    const band = all('.band')[0]; assert.ok(band); out(band);
    ['目安です', '令和8年分', '最終確認日'].forEach((x) => assert.ok(band.textContent.includes(x), x));
    const fa = all('footer a').find((a) => a.getAttribute('href') === '#legal'); assert.ok(fa); out(fa);
    assert.ok(all('#actions #shareX')[0], 'shareX in actions');
    const ui = all('script').find((s) => s.id === 'ui').textContent;
    assert.ok(ui.includes('pr-disc') && ui.includes('広告を含みます'));
    const cf = all('.confirm')[0]; assert.ok(cf); out(cf);
  });
  c('S04 range label / chip aria-pressed ' + p, () => {
    all('input').filter((i) => i.type === 'range').forEach((i) => assert.ok(all('label').some((l) => l.getAttribute('for') === i.id), 'label for ' + i.id));
    all('button').filter((b) => b._cls().includes('chip')).forEach((b) => assert.ok(b.hasAttribute('aria-pressed')));
  });
  c('S05 outline / reduced-motion ' + p, () => { assert.ok(!/outline\s*:\s*(none|0)\b/.test(h)); assert.ok(h.includes('@media(prefers-reduced-motion')); });
  c('S06 contrast ' + p, () => {
    const css = h.match(/<style>([\s\S]*?)<\/style>/)[1];
    const li = vars(css.match(/:root\{([\s\S]*?)\}/)[1]);
    const dk = vars(css.match(/prefers-color-scheme:dark\)\{:root\{([\s\S]*?)\}\}/)[1]);
    [['light', li], ['dark', dk]].forEach(([nm, v]) => {
      const pairs = [['ok-fg', 'ok-bg'], ['ng-fg', 'ng-bg'], ['wn-fg', 'wn-bg'], ['nt-fg', 'nt-bg'], ['fg', 'bg'], ['fg', 'card'], ['sub', 'card'], ['sub', 'bg'], ['sub', 'soft'], ['on-primary', 'primary'], ['primary', 'soft'], ['primary', 'primary-soft'], ['primary', 'card']];
      pairs.forEach(([a, b]) => assert.ok(ratio(v[a], v[b]) >= 4.5, nm + ' ' + a + '/' + b + ' ' + ratio(v[a], v[b]).toFixed(2)));
    });
  });
  c('S07 head unchanged ' + p, () => {
    const H = HEADS[p];
    assert.strictEqual(h.match(/<title>([\s\S]*?)<\/title>/)[1], H.title);
    assert.strictEqual(h.match(/<meta name="description" content="([^"]*)"/)[1], H.desc);
    assert.strictEqual(h.match(/<meta property="og:title" content="([^"]*)"/)[1], H.title);
    assert.strictEqual(h.match(/<meta property="og:description" content="([^"]*)"/)[1], H.desc);
    assert.strictEqual(h.match(/<link rel="canonical" href="([^"]*)"/)[1], H.url);
    assert.strictEqual(h.match(/<h1>([\s\S]*?)<\/h1>/)[1], H.h1);
    assert.strictEqual((h.match(/<meta name="theme-color"/g) || []).length, 2);
  });
  c('S08 logic hash ' + p, () => {
    const body = h.match(/<script id="logic">([\s\S]*?)<\/script>/)[1];
    assert.strictEqual(crypto.createHash('sha256').update(body, 'utf8').digest('hex'), HASH[p]);
  });
  c('S09 shareX ' + p, () => {
    const a = h.match(/<a id="shareX"[^>]*>/)[0];
    assert.ok(a.includes('href="https://x.com/intent/tweet"') && a.includes('rel="noopener noreferrer"'));
    assert.ok(!h.includes('twitter.com'));
  });
  c('S10 size ' + p, () => assert.ok(Buffer.byteLength(h, 'utf8') <= 102400));
  c('S11 related ' + p, () => {
    const i = h.indexOf('<aside class="rel"');
    assert.ok(i > h.indexOf('</main>') && i < h.indexOf('<footer>'));
    const a = tree.querySelector('aside.rel').querySelectorAll('a');
    assert.strictEqual(a.length, 6);
    a.forEach((x) => { const hr = x.getAttribute('href'); assert.ok(!/^https?:/.test(hr)); assert.ok(fs.existsSync(path.join(path.resolve(dir, hr), 'index.html')), hr); assert.ok(!x.hasAttribute('target') && !x.hasAttribute('rel')); });
    assert.strictEqual(tree.querySelectorAll('section.tools [aria-current=page]').length, 1);
    assert.strictEqual(tree.querySelectorAll('aside.rel [aria-current=page]').length, 1);
    assert.strictEqual(tree.querySelectorAll('section.sisters [aria-current]').length, 0);
  });
  c('S12 nav ' + p, () => {
    const n = tree.querySelectorAll('nav'); assert.strictEqual(n.length, 1); assert.strictEqual((h.match(/<nav/g) || []).length, 1);
    const l = n[0].querySelectorAll('a'); assert.strictEqual(l.length, 4); assert.strictEqual(l[3].getAttribute('href'), '#sisters');
    assert.strictEqual(l.filter((x) => x.hasAttribute('aria-current')).length, 1);
  });
  c('S13 actions position ' + p, () => {
    const a = tree.querySelector('#actions');
    assert.strictEqual(a.querySelectorAll('input[type=range]').length, 0); assert.strictEqual(a.querySelectorAll('.chip').length, 0);
    assert.ok(a.querySelector('#prCards'));
    const sib = a.parentNode.children; const prev = sib[sib.indexOf(a) - 1];
    assert.ok((prev.tagName === 'DETAILS' && prev._cls().includes('acc')) || (prev.tagName === 'DIV' && prev._cls().includes('acc-list')), 'prev ' + prev.tagName + '.' + prev.className);
  });
  c('forbidden APIs ' + p, () => ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'indexedDB'].forEach((w) => assert.ok(!h.includes(w), w)));
  c('ids unique, anchors resolve ' + p, () => {
    const ids = []; walk(tree, (e) => { if (e.id) ids.push(e.id); });
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i); assert.deepStrictEqual(dup, []);
    all('a').forEach((a) => { const hr = a.getAttribute('href') || ''; if (/^#./.test(hr)) assert.ok(ids.includes(hr.slice(1)), 'anchor ' + hr); const d = a.getAttribute('data-open'); if (d) assert.ok(ids.includes(d), 'data-open ' + d); });
    all('label').forEach((l) => { const f = l.getAttribute('for'); if (f) assert.ok(ids.includes(f), 'label for ' + f); });
    all('*').forEach((e) => (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).forEach((x) => { if (p === 'kakemochi/index.html' && /^h-j\d/.test(x)) return; assert.ok(ids.includes(x), 'describedby ' + x); }));
  });
  c('ui ids exist ' + p, () => {
    const ui = all('script').find((s) => s.id === 'ui').textContent;
    const ids = new Set(); walk(tree, (e) => { if (e.id) ids.add(e.id); });
    const dyn = /^(j\d|e-j\d|h-j\d)/;
    [...ui.matchAll(/\$\('([\w-]+)'\)/g)].map((m) => m[1]).forEach((x) => { if (!dyn.test(x)) assert.ok(ids.has(x), 'missing #' + x); });
  });
  c('375px static: no fixed wide widths ' + p, () => {
    const css = h.match(/<style>([\s\S]*?)<\/style>/)[1];
    for (const m of css.matchAll(/(^|[;{}\s])(min-width|width)\s*:\s*(\d+)px/g)) {
      const v = Number(m[3]); if (m[2] === 'min-width' && v === 400) continue; assert.ok(v <= 320, m[2] + ':' + v + 'px');
    }
    assert.ok(!/(^|[;{])\s*width\s*:\s*\d{3,}px/.test(css.replace(/@media[^{]*\{/g, '')));
  });
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
