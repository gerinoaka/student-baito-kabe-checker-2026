'use strict';
// 依存ゼロのテスト。index.html の <script id="logic"> を抽出して評価する。
// 実行: node tests/nisa.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = rd('index.html');
const m = html.match(/<script id="logic">([\s\S]*?)<\/script>/);
if (!m) { console.error('logic script not found'); process.exit(1); }
const N = vm.runInNewContext(m[1] + ';NISA', {});

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); }
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' expected ' + b + ' +-' + tol + ' got ' + a);
const S = (monthly, ratePct, years) => N.simulate({ monthly, ratePct, years });
// 同式の再計算（閉形式）
const fv = (P, R, y) => { const i = R === 0 ? 0 : Math.pow(1 + R / 100, 1 / 12) - 1, n = y * 12; return i === 0 ? P * n : P * (Math.pow(1 + i, n) - 1) / i; };

t('01', () => { const r = S(10000, 0, 10); assert.strictEqual(r.principal, 1200000); assert.strictEqual(r.finalValue, 1200000); assert.strictEqual(r.gain, 0); });
t('02', () => { const r = S(10000, 3, 10); assert.strictEqual(r.principal, 1200000); near(r.finalValue, 1394480, 200); near(r.finalValue, fv(10000, 3, 10), 0.5); });
t('03', () => { const r = S(10000, 3, 10); near(r.gain, 194480, 200); near(r.gain, fv(10000, 3, 10) - 1200000, 0.5); });
t('04', () => { const r = S(10000, 3, 1); assert.strictEqual(r.principal, 120000); near(r.finalValue, 121640, 50); near(r.finalValue, fv(10000, 3, 1), 0.5); });
t('05', () => { const r = S(10000, 0, 1); assert.strictEqual(r.principal, 120000); assert.strictEqual(r.gain, 0); });
t('06', () => { const r = S(1000, 0, 1); assert.strictEqual(r.principal, 12000); assert.strictEqual(r.finalValue, 12000); });
t('07', () => { const r = S(100000, 0, 1); assert.strictEqual(r.principal, 1200000); assert.strictEqual(r.annualOver, false); });
t('08', () => { const r = S(100000, 0, 40); assert.strictEqual(r.principal, 48000000); assert.strictEqual(r.lifetimeExceeded, true); });
t('09', () => { const r = S(1000, 10, 1); near(r.finalValue, 12540, 30); near(r.finalValue, fv(1000, 10, 1), 0.5); });
t('10', () => { const r = S(100000, 10, 40); near(r.finalValue, 555035000, 555035000 * 0.001); near(r.finalValue, fv(100000, 10, 40), 0.5); assert.strictEqual(r.principal, 48000000); });
t('11', () => { const r = S(10000, 3, 40); assert.strictEqual(r.principal, 4800000); assert.strictEqual(r.lifetimeExceeded, false); near(r.finalValue, fv(10000, 3, 40), 0.5); });
t('12', () => { const r = S(0, 3, 10); assert.strictEqual(r.ok, true); assert.strictEqual(r.principal, 0); assert.strictEqual(r.finalValue, 0); assert.strictEqual(r.gain, 0); });
t('13', () => { const r = S(10000, 3, 10); assert.strictEqual(r.rows.length, 10); assert.strictEqual(r.rows[9].year, 10); assert.strictEqual(r.rows[9].principal, 1200000); });
t('14', () => { const r = S(10000, 3, 10); assert.ok(Math.abs(r.rows[9].value - r.finalValue) < 1); });
t('15', () => {
  const a = S(10000, 3, 10); for (let i = 1; i < a.rows.length; i++) assert.ok(a.rows[i].value > a.rows[i - 1].value);
  const b = S(10000, 0, 10); b.rows.forEach((x) => assert.strictEqual(x.gain, 0));
});
t('16', () => { assert.strictEqual(N.fmtYen(0.5), '1'); assert.strictEqual(N.fmtYen(1.4), '1'); });
t('17', () => assert.strictEqual(S(100000, 0, 1).annualOver, false));
t('18', () => { [100001, 999].forEach((p) => { const r = S(p, 0, 1); assert.strictEqual(r.ok, false); assert.ok(r.errors.includes('monthly')); }); });
t('19', () => { const r = S(100000, 0, 15); assert.strictEqual(r.principal, 18000000); assert.strictEqual(r.lifetimeExceeded, false); assert.strictEqual(r.exceedYear, null); });
t('20', () => { const r = S(100000, 0, 16); assert.strictEqual(r.principal, 19200000); assert.strictEqual(r.lifetimeExceeded, true); assert.strictEqual(r.exceedYear, 16); });
t('21', () => [0, 41].forEach((y) => { const r = S(10000, 3, y); assert.strictEqual(r.ok, false); assert.ok(r.errors.includes('years')); }));
t('22', () => [-0.1, 10.1, NaN].forEach((x) => { const r = S(10000, x, 10); assert.strictEqual(r.ok, false); assert.ok(r.errors.includes('rate')); }));
t('23', () => [-1, 1500.5, 999, 100001].forEach((x) => { const r = S(x, 3, 10); assert.strictEqual(r.ok, false); assert.ok(r.errors.includes('monthly')); }));
t('24', () => { const r = N.yearsFromAge(20, 22); assert.strictEqual(r.ok, true); assert.strictEqual(r.years, 2); assert.strictEqual(r.clamped, false); });
t('25', () => { assert.strictEqual(N.yearsFromAge(20, 30).years, 10); assert.strictEqual(N.yearsFromAge(18, 40).years, 22); });
t('26', () => { const r = N.yearsFromAge(18, 60); assert.strictEqual(r.years, 40); assert.strictEqual(r.clamped, true); });
t('27', () => { assert.strictEqual(N.yearsFromAge(22, 22).reason, 'order'); assert.strictEqual(N.yearsFromAge(17, 22).reason, 'under18'); });
t('28', () => {
  [[10000, 3, 10], [3000, 3, 10], [30000, 3, 10]].forEach(([a, b, c]) => {
    const s = N.buildShare({ monthly: a, ratePct: b, years: c });
    assert.ok(!/[0-9０-９]/.test(s.text), 'digit in text: ' + s.text);
    assert.ok(s.href.indexOf('https://x.com/intent/tweet?') === 0);
    assert.ok(s.href.indexOf('hashtags=') > 0);
  });
});

// ---- サイト横断チェック
const SITE = 'https://gakusei-tools.com/';
const BASE = SITE + 'nisa-simulator/';
t('x-canon', () => {
  assert.strictEqual(html.match(/<link rel="canonical" href="([^"]*)"/)[1], BASE);
  assert.strictEqual(html.match(/<meta property="og:url" content="([^"]*)"/)[1], BASE);
  assert.strictEqual(N.BASE, BASE);
});
t('x-meta', () => {
  assert.ok(html.includes('<html lang="ja">'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary">'));
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
  assert.ok(/<meta name="theme-color"/.test(html));
  assert.ok(!/og:image/.test(html));
});
t('x-jsonld', () => {
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => JSON.parse(x[1]));
  assert.strictEqual(ld.length, 2);
  assert.strictEqual(ld[0]['@type'], 'WebApplication');
  assert.strictEqual(ld[1]['@type'], 'FAQPage');
  const faq = html.match(/<section id="faq"[\s\S]*?<\/section>/)[0];
  const vis = [...faq.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => x[1]);
  assert.strictEqual(vis.length, 7);
  assert.deepStrictEqual(ld[1].mainEntity.map((q) => q.acceptedAnswer.text), vis);
  assert.deepStrictEqual(ld[1].mainEntity.map((q) => q.name), [...faq.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((x) => x[1]));
});
t('x-size', () => assert.ok(Buffer.byteLength(html, 'utf8') <= 102400));
t('x-sister', () => {
  const rel = html.match(/<aside class="rel"[\s\S]*?<\/aside>/)[0];
  const hrefs = [...rel.matchAll(/href="([^"]*)"/g)].map((x) => x[1]);
  assert.strictEqual(hrefs.length, 6);
  assert.strictEqual((rel.match(/https:\/\//g) || []).length, 0);
  const sis = rel.match(/<section class="sisters"[\s\S]*?<\/section>/)[0];
  assert.strictEqual((sis.match(/aria-current="page"/g) || []).length, 1);
  assert.strictEqual((html.match(/<nav[ >]/g) || []).length, 1);
  hrefs.forEach((h) => assert.ok(fs.existsSync(path.join(root, h, 'index.html')), 'missing ' + h));
});
t('x-sitemap', () => {
  const sm = fs.readFileSync(path.join(root, '..', 'sitemap.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs.length, 13);
  assert.ok(locs.includes(BASE));
  assert.ok(sm.includes('<lastmod>2026-11-17</lastmod>'));
  assert.ok(!fs.existsSync(path.join(root, 'sitemap.xml')));
});
t('x-robots', () => {
  assert.ok(fs.readFileSync(path.join(root, '..', 'robots.txt'), 'utf8').includes('Sitemap: ' + SITE + 'sitemap.xml'));
  assert.ok(!fs.existsSync(path.join(root, 'robots.txt')));
});
t('x-nojekyll', () => {
  assert.ok(fs.existsSync(path.join(root, '..', '.nojekyll')));
  assert.ok(!fs.existsSync(path.join(root, '.nojekyll')));
});
t('x-links-config', () => {
  const ctx = {};
  vm.runInNewContext(rd('links-config.js'), { window: ctx });
  const L = ctx.NISA_LINKS;
  assert.deepStrictEqual(Object.keys(L).sort(), ['book', 'shoken1', 'shoken2']);
  Object.keys(L).forEach((k) => {
    assert.strictEqual(L[k].label, 'PR');
    ['title', 'desc', 'cta'].forEach((f) => assert.ok(typeof L[k][f] === 'string' && L[k][f].length > 0));
    assert.ok(L[k].url === '' || /^https:\/\//.test(L[k].url));
  });
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
