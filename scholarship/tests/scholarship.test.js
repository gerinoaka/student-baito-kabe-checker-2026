'use strict';
// 依存ゼロのテスト。実行: node tests/scholarship.test.js
// <script id="logic"> を取り出して vm で実行し、手計算の期待値と照合する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const dir = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const rootHtml = fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8');
const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8');
const linksSrc = fs.readFileSync(path.join(dir, 'links-config.js'), 'utf8');

const BASE = 'https://gerinoaka.github.io/student-baito-kabe-checker-2026/scholarship/';
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }

const mLogic = html.match(/<script id="logic">([\s\S]*?)<\/script>/);
const S = vm.runInNewContext(mLogic[1] + ';SCHOLAR', {});
const ctxLinks = {};
vm.runInNewContext(linksSrc, { window: ctxLinks });
const LINKS = ctxLinks.SCHOLAR_LINKS;

const std = (kind, p1, p2, rate, years) => S.calcStd({ kind, p1, p2, rate: rate === undefined ? 3 : rate, years: years === undefined ? null : years });
const rev = (kind, p1, p2, rate, monthly) => S.calcRev({ kind, p1, p2, rate: rate === undefined ? 3 : rate, monthly });
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' got ' + a + ' want ' + b + ' +-' + tol);

// ---- 5-1 算出表の全16区分の境界（第一種）----
t('5-1 below min', () => { const r = std('1', 29999, 0); assert.ok(r.error); assert.strictEqual(r.code, 'min'); });
[
  [30000, 1, 1, 12, 2500],
  [200000, 1, 6, 72, 2777],
  [200001, 2, 5, 60, 3333],
  [400000, 2, 10, 120, 3333],
  [400001, 3, 8, 96, 4166],
  [500000, 3, 10, 120, 4166],
  [500001, 4, 8, 96, 5208],
  [600000, 4, 10, 120, 5000],
  [600001, 5, 8, 96, 6250],
  [700000, 5, 10, 120, 5833],
  [700001, 6, 8, 96, 7291],
  [900000, 6, 11, 132, 6818],
  [900001, 7, 10, 120, 7500],
  [1100000, 7, 12, 144, 7638],
  [1100001, 8, 11, 132, 8333],
  [1300000, 8, 13, 156, 8333],
  [1300001, 9, 11, 132, 9848],
  [1500000, 9, 13, 156, 9615],
  [1500001, 10, 12, 144, 10416],
  [1700000, 10, 14, 168, 10119],
  [1700001, 11, 13, 156, 10897],
  [1900000, 11, 14, 168, 11309],
  [1900001, 12, 13, 156, 12179],
  [2100000, 12, 15, 180, 11666],
  [2100001, 13, 14, 168, 12500],
  [2300000, 13, 15, 180, 12777],
  [2300001, 14, 14, 168, 13690],
  [2500000, 14, 15, 180, 13888],
  [2500001, 15, 14, 168, 14880],
  [3400000, 15, 20, 240, 14166],
  [3400001, 16, 20, 240, 14166]
].forEach(([P, band, years, n, m]) => {
  t('5-1 ' + P, () => {
    assert.strictEqual(S.bandIndex(P), band, 'band');
    assert.strictEqual(S.yearsOf(P), years, 'years');
    const r = std('1', P, 0);
    assert.strictEqual(r.error, null);
    assert.strictEqual(r.years, years); assert.strictEqual(r.n, n); assert.strictEqual(r.monthly, m);
    assert.strictEqual(r.total, P); assert.strictEqual(r.interest, 0); assert.strictEqual(r.band, band);
  });
});

// ---- 5-2 第一種の返還例（JASSO公表・切り捨て。6件目は確認できていないため5件）----
[[1440000, 13, 156, 9230], [2160000, 14, 168, 12857], [2448000, 15, 180, 13600], [3072000, 18, 216, 14222], [4608000, 20, 240, 19200]].forEach(([P, y, n, m]) => {
  t('5-2 ' + P, () => { const r = std('1', P, 0); assert.strictEqual(r.years, y); assert.strictEqual(r.n, n); assert.strictEqual(r.monthly, m); });
});
t('5-2 second kind years from JASSO examples', () => {
  [[1440000, 156], [2400000, 180], [3000000, 204], [3840000, 240]].forEach(([P, n]) => assert.strictEqual(S.yearsOf(P) * 12, n, String(P)));
});

// ---- 5-3 第二種・併用・短縮 ----
t('S1', () => {
  const r = std('2', 0, 1440000, 3);
  assert.strictEqual(r.n, 156); near(S.annuity(1440000, 3, 156), 11158.86, 0.05);
  assert.strictEqual(r.monthly, 11159); near(r.total, 1740804, 1); near(r.interest, 300804, 1);
  const gap = (11293 - r.monthly) / 11293 * 100; assert.ok(gap >= 0.3 && gap <= 1.5, 'regression gap ' + gap);
});
t('S2', () => {
  const r = std('2', 0, 4800000, 1);
  assert.strictEqual(r.n, 240); near(r.monthly, 22075, 1); near(r.total, 5298000, 240); near(r.interest, 498000, 240);
  assert.strictEqual(r.monthly, 22075); assert.strictEqual(r.total, 5298000);
  const gap = (22172 - r.monthly) / 22172 * 100; assert.ok(gap >= 0.3 && gap <= 1.5, 'regression gap ' + gap);
});
t('S3', () => { const r = std('2', 0, 2400000, 0); assert.strictEqual(r.n, 180); assert.strictEqual(r.monthly, 13333); assert.strictEqual(r.total, 2400000); assert.strictEqual(r.interest, 0); });
t('S4', () => { const r = std('2', 0, 1440000, 3, 5); assert.strictEqual(r.n, 60); assert.strictEqual(r.monthly, 25875); assert.strictEqual(r.total, 1552500); assert.strictEqual(r.shorter, true); near(S.annuity(1440000, 3, 60), 25874.91, 0.05); });
t('S5', () => {
  const r = std('B', 1200000, 240000, 3);
  assert.strictEqual(r.years, 13); assert.strictEqual(r.n, 156); assert.strictEqual(r.m1, 7692); assert.strictEqual(r.m2, 1860); assert.strictEqual(r.monthly, 9552);
  assert.strictEqual(r.total, 1490160); assert.strictEqual(r.interest, 50160); near(S.annuity(240000, 3, 156), 1859.81, 0.05);
});
t('S6', () => { const r = std('B', 1000000, 1000000, 0); assert.strictEqual(r.years, 14); assert.strictEqual(r.n, 168); assert.strictEqual(r.m1, 5952); assert.strictEqual(r.m2, 5952); assert.strictEqual(r.monthly, 11904); assert.strictEqual(r.total, 2000000); assert.strictEqual(r.interest, 0); });
t('S7', () => { const r = std('B', 2000000, 1500000, 3); assert.strictEqual(r.years, 20); assert.strictEqual(r.n, 240); });
t('S8', () => { const r = std('B', 0, 30000, 3); assert.strictEqual(r.error, null); assert.strictEqual(r.years, 1); assert.strictEqual(r.n, 12); assert.strictEqual(r.m1, 0); assert.ok(r.m2 > 0); });
t('S9', () => { const r = std('B', 15000, 14999, 3); assert.ok(r.error); assert.strictEqual(r.code, 'min'); assert.strictEqual(r.field, 'p2'); assert.ok(/合計/.test(r.error)); });
t('S10', () => { const r = std('1', 3000000, 0, 3, 10); assert.strictEqual(r.n, 120); assert.strictEqual(r.monthly, 25000); assert.strictEqual(r.shorter, true); assert.strictEqual(r.capped, false); });
t('S11', () => { const r = std('1', 3000000, 0, 3, 17); assert.strictEqual(r.years, 17); assert.strictEqual(r.shorter, false); assert.strictEqual(r.capped, false); });
t('S12', () => { const r = std('1', 3000000, 0, 3, 18); assert.strictEqual(r.years, 17); assert.strictEqual(r.capped, true); assert.strictEqual(r.shorter, false); });
t('S13', () => { const r = std('1', 3000000, 0); assert.strictEqual(r.years, 17); assert.strictEqual(r.n, 204); assert.strictEqual(r.monthly, 14705); assert.strictEqual(r.total, 3000000); assert.strictEqual(r.mode, 'term'); });
t('S14', () => { const r = std('1', 30000001, 0); assert.ok(r.error); assert.strictEqual(r.code, 'max'); });
t('S15 validation messages', () => {
  assert.strictEqual(std('1', 1.5, 0).error, '数字（整数）で入力してください');
  assert.strictEqual(std('1', NaN, 0).error, '数字（整数）で入力してください');
  assert.strictEqual(std('1', 29999, 0).error, '3万円以上で入力してください');
  assert.strictEqual(std('1', 30000001, 0).error, '3,000万円以下で入力してください');
  assert.strictEqual(std('2', 0, 3000000, 5.5).error, '0〜5.000%の数字で入力してください');
  assert.strictEqual(std('1', 3000000, 0, 3, 0).error, '1以上の整数で入力してください');
  assert.strictEqual(std('1', 3000000, 0, 3, 2.5).field, 'years');
  assert.strictEqual(std('2', 0, 30000, 3).error, null);
  assert.strictEqual(std('B', 0, 0, 3).code, 'min');
  assert.strictEqual(std('1', 3000000, null, 99).error, null, 'rate ignored for kind 1');
});

// ---- 5-4 逆算モード ----
t('R1', () => { const r = rev('1', 1440000, 0, 0, 15000); assert.strictEqual(r.status, 'ok'); assert.strictEqual(r.n, 96); assert.strictEqual(r.years, 8); assert.strictEqual(r.total, 1440000); });
t('R2', () => { assert.strictEqual(rev('1', 1440001, 0, 0, 15000).n, 97); });
t('R3', () => {
  const r = rev('1', 3000000, 0, 0, 14705); assert.strictEqual(r.n, 205); assert.strictEqual(r.last, 180);
  assert.strictEqual(rev('1', 3000000, 0, 0, 14706).n, 204);
});
t('R4', () => { const r = rev('2', 0, 1440000, 3, 15000); assert.strictEqual(r.status, 'ok'); assert.strictEqual(r.n, 110); assert.strictEqual(r.years, 9); assert.strictEqual(r.rem, 2); near(r.total, 1648680, 2); near(r.interest, 208680, 2); });
t('R5', () => { const r = rev('2', 0, 1440000, 3, 3600); assert.strictEqual(r.status, 'noPay'); near(r.interest1, 3600, 0.001); });
t('R6', () => { assert.strictEqual(rev('2', 0, 1440000, 3, 3601).status, 'tooLong'); });
t('R7', () => { const r = rev('2', 0, 2400000, 0, 13333); assert.strictEqual(r.n, 181); assert.strictEqual(r.total, 2400000); assert.strictEqual(rev('2', 0, 2400000, 0, 13334).n, 180); });
t('R8', () => { assert.strictEqual(rev('1', 30000, 0, 0, 50).n, 600); assert.strictEqual(rev('1', 30000, 0, 0, 50).status, 'ok'); assert.strictEqual(rev('1', 30000, 0, 0, 49).status, 'tooLong'); });
t('R9', () => {
  const r = rev('B', 1200000, 240000, 3, 9600); assert.strictEqual(r.status, 'ok'); assert.strictEqual(r.n, 156); assert.strictEqual(r.monthly, 9552);
  assert.ok(1200000 / 156 + S.annuity(240000, 3, 156) <= 9600); assert.ok(1200000 / 155 + S.annuity(240000, 3, 155) > 9600);
});
t('R10', () => {
  assert.strictEqual(rev('B', 1200000, 240000, 3, 500).status, 'noPay');
  assert.strictEqual(rev('B', 1200000, 240000, 3, 601).status, 'tooLong');   // 第二種の利息(600円)より大きいが600回では終わらない
  assert.strictEqual(rev('B', 1200000, 240000, 3, 1).status, 'noPay');       // 設計の規則どおり M<=月の利息 は noPay
});
t('R11 monthly validation', () => {
  assert.strictEqual(rev('1', 1440000, 0, 0, 0).field, 'monthly');
  assert.strictEqual(rev('1', 1440000, 0, 0, 10000001).field, 'monthly');
  assert.strictEqual(rev('1', 1440000, 0, 0, 1500.5).error, '1円以上1,000万円以下の整数で入力してください');
  assert.strictEqual(rev('1', 1440000, 0, 0, 10000000).status, 'ok');
});

// ---- 5-5 完済年齢 ----
[
  ['E1', 22, 2027, 3, 156, [35, 6, 2040, 9], [22, 7, 2027, 10]],
  ['E2', 22, 2027, 3, 204, [39, 6, 2044, 9]],
  ['E3', 22, 2027, 3, 240, [42, 6, 2047, 9]],
  ['E4', 22, 2027, 3, 12, [23, 6, 2028, 9]],
  ['E5', 22, 2027, 9, 60, [27, 6, 2033, 3]],
  ['E6', 22, 2027, 12, 1, [22, 7, 2028, 7]],
  ['E7', 22, 2027, 3, 6, [23, 0, 2028, 3]],
  ['E8', 22, 2027, 3, 96, [30, 6, 2035, 9]]
].forEach(([id, age, endY, endM, n, last, first]) => {
  t(id, () => {
    const r = S.endInfo({ age, endY, endM, n });
    assert.deepStrictEqual([r.last.ageY, r.last.ageM, r.last.y, r.last.m], last);
    if (first) assert.deepStrictEqual([r.first.ageY, r.first.ageM, r.first.y, r.first.m], first);
  });
});
t('fmtAge/fmtTerm', () => {
  assert.strictEqual(S.fmtAge(35, 6), '35歳6か月'); assert.strictEqual(S.fmtAge(23, 0), '23歳');
  assert.strictEqual(S.fmtTerm(156), '13年'); assert.strictEqual(S.fmtTerm(110), '9年2か月'); assert.strictEqual(S.fmtTerm(6), '6か月');
});

// ---- 5-6 残高の推移 ----
t('B1', () => { const r = std('1', 3000000, 0); const b = S.balances(r); assert.strictEqual(b[0].k, 0); assert.strictEqual(b[0].bal, 3000000); assert.strictEqual(b[1].k, 12); assert.strictEqual(b[1].bal, 2823540); assert.strictEqual(b[b.length - 1].k, 204); assert.strictEqual(b[b.length - 1].bal, 0); assert.strictEqual(b.length - 1, 17); });
t('B2', () => { const r = rev('1', 3000000, 0, 0, 14705); const b = S.balances(r); assert.strictEqual(b.length - 1, 18); assert.strictEqual(b[b.length - 2].k, 204); assert.strictEqual(b[b.length - 2].bal, 180); assert.strictEqual(b[b.length - 1].k, 205); assert.strictEqual(b[b.length - 1].bal, 0); });
t('B3', () => { const r = std('2', 0, 2400000, 0); const b = S.balances(r); assert.strictEqual(b[1].bal, 2240000); assert.strictEqual(b[b.length - 1].k, 180); assert.strictEqual(b[b.length - 1].bal, 0); });
t('B4', () => { const r = std('2', 0, 1440000, 3); const b = S.balances(r); for (let i = 1; i < b.length; i++) assert.ok(b[i].bal < b[i - 1].bal, 'monotone ' + i); assert.strictEqual(b[b.length - 1].k, 156); assert.strictEqual(b[b.length - 1].bal, 0); });
t('B5', () => { const r = rev('1', 1440000, 0, 0, 15000); const b = S.balances(r); assert.strictEqual(b[1].bal, 1260000); assert.strictEqual(b.length - 1, 8); });
t('B6 rows cap and non-multiple', () => {
  const r = rev('1', 30000, 0, 0, 50); assert.strictEqual(S.balances(r).length, 51);
  const r2 = rev('2', 0, 1440000, 3, 15000); const b2 = S.balances(r2); assert.strictEqual(b2[b2.length - 1].k, 110); assert.strictEqual(b2[b2.length - 1].bal, 0); assert.ok(b2[1].bal < 1440000 && b2[1].bal > 0);
  const r3 = rev('B', 1200000, 240000, 3, 9600); const b3 = S.balances(r3); assert.strictEqual(b3[b3.length - 1].bal, 0);
});

// ---- 5-7 シェア・PR・links-config ----
t('H1', () => {
  [[120, '短め'], [121, 'ふつう'], [180, 'ふつう'], [181, '長め'], [96, '短め'], [204, '長め'], [null, '']].forEach(([n, band]) => {
    const s = S.buildShare(n === null ? null : { n }); assert.strictEqual(s.band, band, String(n));
    if (band) assert.ok(s.text.includes('「' + band + '」')); else assert.ok(!s.text.includes('（返済期間は'));
  });
});
t('H2', () => {
  [null, { n: 12 }, { n: 96 }, { n: 156 }, { n: 204 }, { n: 600 }, { n: NaN }, 'x'].forEach((r) => {
    const s = S.buildShare(r);
    assert.ok(!/[0-9０-９]/.test(s.text), 'digit in text ' + s.text);
    assert.ok(!/[0-9０-９]/.test(s.hashtags), 'digit in tags');
    assert.ok(!/円|歳/.test(s.text));
    assert.ok(decodeURIComponent(s.href).includes(BASE));
    assert.ok(s.href.startsWith('https://x.com/intent/tweet?text='));
  });
});
t('K1', () => {
  const all = { kakeibo: { url: 'https://example.com/a' }, fp: { url: 'https://example.com/b' }, tsushin: { url: 'https://example.com/c' } };
  const p = (o) => Array.from(S.pickPR(Object.assign({ links: all, monthly: 0, hasKind2: false }, o)));
  assert.deepStrictEqual(p({ age: '' }), ['kakeibo']);
  assert.deepStrictEqual(p({ age: 'u18' }), []);
  assert.deepStrictEqual(p({ age: 'adult', monthly: 15000 }), ['kakeibo', 'tsushin']);
  assert.deepStrictEqual(p({ age: 'adult', monthly: 15000, hasKind2: true }), ['kakeibo', 'fp']);
  assert.deepStrictEqual(p({ age: 'adult', monthly: 20000 }), ['kakeibo', 'fp']);
  assert.ok(!p({ age: 'adult', monthly: 19999 }).includes('fp'));
});
t('K2', () => {
  assert.deepStrictEqual(Array.from(S.pickPR({ age: 'adult', monthly: 1, links: { kakeibo: { url: '' }, fp: { url: 'http://x' }, tsushin: { url: 'https://x.example/t' } } })), ['tsushin']);
  assert.strictEqual(S.pickPR({ age: 'adult', monthly: 99999, hasKind2: true, links: { kakeibo: { url: 'https://a' }, fp: { url: 'https://b' }, tsushin: { url: 'https://c' } } }).length, 2);
  assert.strictEqual(S.pickPR({ age: '', links: {} }).length, 0);
  assert.strictEqual(S.pickPR({ age: 'adult' }).length, 0);
});
t('L1', () => {
  assert.deepStrictEqual(Array.from(Object.keys(LINKS)), ['kakeibo', 'fp', 'tsushin']);
  Object.keys(LINKS).forEach((k) => {
    assert.strictEqual(LINKS[k].label, 'PR');
    ['title', 'desc', 'cta'].forEach((f) => assert.ok(typeof LINKS[k][f] === 'string' && LINKS[k][f].length > 0, k + f));
    assert.ok(LINKS[k].url === '' || /^https:\/\//.test(LINKS[k].url), k + ' url');
  });
});
t('L2', () => {
  const lines = linksSrc.split('\n');
  [40, 47, 54].forEach((n) => assert.strictEqual(lines[n - 1].trim(), "url: '',", 'line ' + n));
  assert.strictEqual(lines.filter((l) => /^\s*url:/.test(l)).length, 3);
  ['40行目', '47行目', '54行目'].forEach((w) => assert.ok(readme.includes(w), 'README ' + w));
  assert.ok(linksSrc.includes('（40行目・47行目・54行目）'));
});

// ---- 補助関数 ----
t('parseYen', () => {
  assert.strictEqual(S.parseYen('３,０００,０００円'), 3000000); assert.strictEqual(S.parseYen(' 1 200 '), 1200);
  assert.strictEqual(S.parseYen(''), null); assert.ok(Number.isNaN(S.parseYen('12.5'))); assert.ok(Number.isNaN(S.parseYen('abc'))); assert.ok(Number.isNaN(S.parseYen('-5')));
});
t('checkRate', () => {
  assert.strictEqual(S.checkRate('3.000').value, 3); assert.strictEqual(S.checkRate('2.274').error, null); assert.strictEqual(S.checkRate('０').value, 0);
  assert.strictEqual(S.checkRate('5').error, null); assert.strictEqual(S.checkRate('5.001').error, '0〜5.000%の数字で入力してください');
  assert.strictEqual(S.checkRate('-1').error, '0〜5.000%の数字で入力してください'); assert.strictEqual(S.checkRate('').error, '0〜5.000%の数字で入力してください');
  assert.strictEqual(S.checkRate('abc').error, '0〜5.000%の数字で入力してください');
  assert.strictEqual(S.checkRate('2.2741').error, '小数第3位（0.001%刻み）までで入力してください'); assert.strictEqual(S.checkRate('2.27400').error, null);
});
t('checkAge/checkYear', () => {
  assert.strictEqual(S.checkAge(22), null); assert.strictEqual(S.checkAge(14), '15〜80の整数で入力してください'); assert.strictEqual(S.checkAge(81), '15〜80の整数で入力してください'); assert.ok(S.checkAge(NaN)); assert.ok(S.checkAge(null));
  assert.strictEqual(S.checkYear(2027), null); assert.strictEqual(S.checkYear(1999), '2000〜2100の整数で入力してください'); assert.ok(S.checkYear(2101));
});
t('annuity', () => { assert.strictEqual(S.annuity(0, 3, 12), 0); assert.strictEqual(S.annuity(120000, 0, 12), 10000); });
t('DATA', () => { assert.strictEqual(S.DATA.LAST_CONFIRMED, '2026-11-17'); assert.strictEqual(S.DATA.TAX_YEAR, '令和8年度'); assert.strictEqual(S.BASE, BASE); });

// ---- 5-8 静的検査（HTML）----
const strip = (h) => h.replace(/<!--[\s\S]*?-->/g, '');
const attr = (h, re) => { const m = h.match(re); assert.ok(m, 'missing ' + re); return m[1]; };
const markup = html.replace(/<style>[\s\S]*?<\/style>/, '');
const ids = [...strip(html).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

t('M01 size', () => assert.ok(Buffer.byteLength(html, 'utf8') <= 102400, 'size ' + Buffer.byteLength(html, 'utf8')));
t('M02 meta', () => {
  assert.strictEqual(attr(html, /<link rel="canonical" href="([^"]*)"/), BASE);
  assert.strictEqual(attr(html, /<meta property="og:url" content="([^"]*)"/), BASE);
  const title = attr(html, /<title>([^<]+)<\/title>/); assert.strictEqual(title, '奨学金（JASSO）返済シミュレーター｜月額・完済年齢を計算');
  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  assert.strictEqual(attr(html, /<meta property="og:title" content="([^"]*)"/), title);
  assert.strictEqual(attr(html, /<meta property="og:description" content="([^"]*)"/), desc);
  assert.strictEqual(attr(html, /<meta property="og:type" content="([^"]*)"/), 'website');
  assert.strictEqual(attr(html, /<meta property="og:locale" content="([^"]*)"/), 'ja_JP');
  assert.strictEqual(attr(html, /<meta property="og:site_name" content="([^"]*)"/), '学生バイトお役立ちツール');
  assert.strictEqual(attr(html, /<meta name="twitter:card" content="([^"]*)"/), 'summary');
  assert.ok(!/og:image/.test(html));
  assert.ok(/<html lang="ja">/.test(html) && /<meta charset="utf-8">/.test(html) && /name="viewport"/.test(html) && /name="robots" content="index,follow"/.test(html));
  assert.ok(html.includes('<!-- 公開URL: ' + BASE + ' （canonical と og:url の2か所） -->'));
  assert.strictEqual(attr(html, /<h1>([^<]+)<\/h1>/), '奨学金（JASSO）返済シミュレーター');
});
t('M03 JSON-LD', () => {
  const b = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.strictEqual(b.length, 2);
  assert.strictEqual(b[0]['@type'], 'WebApplication'); assert.strictEqual(b[0].url, BASE); assert.strictEqual(b[0].applicationCategory, 'FinanceApplication'); assert.strictEqual(b[0].offers.price, '0');
  assert.strictEqual(b[1]['@type'], 'FAQPage');
  const sec = attr(html, /(<section id="faq"[\s\S]*?<\/section>)/);
  const qs = [...sec.matchAll(/<h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p>/g)].map((m) => [plain(m[1]), plain(m[2])]);
  assert.strictEqual(qs.length, 8); assert.strictEqual(b[1].mainEntity.length, 8);
  qs.forEach((q, i) => { assert.strictEqual(b[1].mainEntity[i].name, q[0]); assert.strictEqual(b[1].mainEntity[i].acceptedAnswer.text, q[1]); });
});
t('M04 details closed', () => {
  const tags = html.match(/<details class="acc[^>]*>/g) || [];
  assert.ok(tags.length >= 8, 'count ' + tags.length);
  assert.ok(tags.every((x) => !/\sopen[\s>=]/.test(x)));
});
t('M05 always visible', () => {
  const band = attr(html, /(<div class="band"[\s\S]*?<\/div>)/);
  assert.ok(band.includes('最終確認日 2026-11-17') && band.includes('目安です'));
  const stripDetails = (h) => { let o = h; for (let i = 0; i < 20; i++) o = o.replace(/<details[^>]*>(?:(?!<details)[\s\S])*?<\/details>/g, ''); return o; };
  const outside = stripDetails(html);
  assert.ok(outside.includes('class="band"'));
  assert.ok(outside.includes('id="estNote"') && outside.includes('id="floorNote"'), 'notes outside details');
  assert.ok(html.includes('第二種（有利子）の額は目安です。JASSO公式の返還シミュレーション／返還例より少し低めに出る場合があります（据置期間の利息などの扱いのため）。正確な額は JASSO 公式で確認してください。'));
  assert.ok(html.includes('第一種の月額は、総額÷回数の小数点以下を切り捨てた額です。最終回で調整される場合あり（目安）。'));
  assert.ok(html.indexOf('class="band"') < html.indexOf('<details'), 'band before first details');
});
t('M06 forbidden / structure', () => {
  ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'indexedDB'].forEach((w) => assert.ok(!html.includes(w), 'forbidden ' + w));
  assert.ok(!/outline:\s*(none|0)/.test(html));
  assert.ok(html.includes('@media(prefers-reduced-motion'));
  assert.strictEqual((html.match(/<nav\b/g) || []).length, 1);
  assert.strictEqual((html.match(/<h1\b/g) || []).length, 1);
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate id: ' + ids.filter((x, i) => ids.indexOf(x) !== i));
  assert.ok(html.includes('<meta name="theme-color" content="#f8fafc">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">'));
  assert.strictEqual((html.match(/name="theme-color"/g) || []).length, 2);
  assert.ok(html.includes('<a class="skip" href="#main">') && html.includes('<main id="main">'));
  [...html.matchAll(/<script\b([^>]*)>/g)].forEach((s) => assert.ok(/type="application\/ld\+json"|src="links-config\.js"|id="logic"|id="ui"/.test(s[1]), 'script ' + s[1]));
});
t('M07 shared css == root', () => {
  const css = (h) => attr(h, /(\/\*ds:start v1\*\/[\s\S]*?\/\*ds:end\*\/)/);
  assert.strictEqual(css(html), css(rootHtml));
});
t('M08 range label / chip aria-pressed', () => {
  const ranges = [...html.matchAll(/<input type="range"[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.strictEqual(ranges.length, 4);
  ranges.forEach((id) => assert.ok(new RegExp('<label[^>]*for="' + id + '"').test(html), 'label for ' + id));
  const chips = html.match(/<button[^>]*class="chip"[^>]*>/g) || [];
  assert.strictEqual(chips.length, 19);
  chips.forEach((c) => assert.ok(/aria-pressed="/.test(c) && /data-v="/.test(c) && /aria-label="/.test(c), c));
  assert.ok(html.includes('class="range" id="p1Range" min="0" max="6000000" step="10000"'));
  assert.ok(html.includes('id="p2Range" min="0" max="9600000" step="10000"'));
  assert.ok(html.includes('id="yearsRange" min="1" max="20" step="1"'));
  assert.ok(html.includes('id="monthlyRange" min="1000" max="100000" step="1000"'));
});
t('M09 actions', () => {
  const a = attr(html, /(<div class="card" id="actions">[\s\S]*?<\/div>\s*<\/div>)/);
  assert.ok(a.includes('id="shareX"') && a.includes('id="prCards"'));
  assert.ok(!/type="range"/.test(a) && !/class="chip"/.test(a));
  const i = html.indexOf('<div class="card" id="actions">');
  assert.ok(html.slice(0, i).trimEnd().endsWith('</details>\n</div>'), 'acc-list directly before actions');
  const pre = html.slice(0, i); assert.ok(pre.lastIndexOf('<div class="acc-list">') > pre.indexOf('<section id="cond"'), 'acc-list after cond section');
  assert.ok(html.indexOf('<div class="acc-list">') < i);
});
t('M10 script order', () => {
  const a = html.indexOf('<script src="links-config.js"></script>\n<script id="logic">'), b = html.indexOf('<script id="ui">');
  assert.ok(a > 0 && b > a);
  assert.ok(html.indexOf('SCHOLAR_LINKS') > 0);
});
t('M11 related tools', () => {
  const aside = attr(html, /(<aside class="rel"[\s\S]*?<\/aside>)/);
  assert.ok(html.indexOf('</main>') < html.indexOf('<aside class="rel"') && html.indexOf('<aside class="rel"') < html.indexOf('<footer'));
  const hrefs = [...aside.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
  assert.strictEqual(hrefs.length, 7);
  hrefs.forEach((x) => { assert.ok(!/^(https?:|\/)/.test(x), x); assert.ok(fs.existsSync(path.join(path.resolve(dir, x), 'index.html')), x); });
  assert.strictEqual((aside.match(/aria-current="page"/g) || []).length, 1);
  const sis = attr(aside, /(<section class="sisters"[\s\S]*?<\/section>)/); assert.ok(sis.includes('aria-current="page"'));
  const sh = [...sis.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(sh.slice(0, 2), ['../living-cost-simulator/', '../nisa-simulator/']);
  hrefs.forEach((x) => assert.ok(!/(^|\/)(about|tools)\/$/.test(x), x));
});
t('M12 footer', () => {
  const m = attr(html, /(<p class="foot-links">[\s\S]*?<\/p>)/);
  assert.ok(m.startsWith('<p class="foot-links"><a href="#legal" data-open="legal">'));
  assert.ok(m.includes('../about/') && m.includes('../tools/') && m.includes('gakusei.kabe.checker@gmail.com'));
  assert.ok(m.indexOf('href="#legal"') < m.indexOf('gakusei.kabe.checker@gmail.com'));
  const fi = html.lastIndexOf('<footer'); const seg = html.slice(fi, html.indexOf(m, fi));
  assert.strictEqual((seg.match(/<details\b/g) || []).length, (seg.match(/<\/details>/g) || []).length, 'foot-links outside details');
  assert.ok(html.includes('<details class="acc" id="legal">'));
});
t('M13 bands table', () => {
  const tb = attr(html, /(<section id="bands">[\s\S]*?<\/section>)/);
  assert.strictEqual((tb.match(/<tr><td/g) || []).length, 16);
  [...tb.matchAll(/<tr><td class="n">(\d+)<\/td><td>([^<]*)<\/td><td class="n">([^<]*)<\/td><\/tr>/g)].forEach((m, i) => {
    assert.strictEqual(Number(m[1]), i + 1);
    if (i < 15) { assert.strictEqual(m[3], S.BANDS[i][1].toLocaleString('en-US') + '円'); assert.ok(m[2].endsWith(S.BANDS[i][0].toLocaleString('en-US') + '円') || m[2].endsWith('以下')); }
  });
  assert.ok(tb.includes('200,001円〜400,000円') && tb.includes('3,400,001円以上'));
  assert.ok(tb.includes('200,000円は6年、200,001円は5年。1,500,000円は13年、1,500,001円は12年'));
});
t('M14 ui script', () => {
  const ui = attr(html, /<script id="ui">([\s\S]*?)<\/script>/);
  assert.ok(ui.includes('aria-valuetext') && ui.includes('liveSr'));
  assert.ok(!/aria-live/.test(attr(html, /(<section id="result"[^>]*>)/)));
  assert.strictEqual((html.match(/aria-live=/g) || []).length, 1);
  assert.ok(!/\.focus\(/.test(ui), 'no focus()');
});
t('M15 required ids', () => {
  'kind1 kind2 kindB p1 p1Range p1Chips p2 p2Range p2Chips modeTerm modePay tStd tCustom years yearsRange yChips monthly monthlyRange mChips rate rChips age endY endM rBig stats tblBody chart shareX prCards faq terms sources legal'.split(' ')
    .forEach((id) => assert.ok(ids.includes(id), 'missing id ' + id));
  'w1 w2 wRate wTerm wPay wYears advanced result liveSr resultCard resultH stdBadge estBadge rLabel rSub cM cN cEnd cTotal cInt stM stN stEnd stEndYm stTotal stInt startNote breakdown rateNote chartBox noPay estNote floorNote capNote staleNote konnan nextLinks cond tableAcc bandsAcc basisAcc actions aboutAcc sourcesAcc liveBar liveBarText liveBarGo prMsg prCond ageU ageA e-p1 e-p2 e-years e-monthly e-rate e-age e-endY rateWarn'.split(' ')
    .forEach((id) => assert.ok(ids.includes(id), 'missing id ' + id));
});
t('M16 old URL format', () => {
  assert.ok(!/https:\/\/gerinoaka\.github\.io\/(?!student-baito-kabe-checker-2026\/)/.test(html));
  [linksSrc, readme].forEach((x) => assert.ok(!/https:\/\/gerinoaka\.github\.io\/(?!student-baito-kabe-checker-2026\/)/.test(x)));
});
t('M17 layout safety', () => {
  const tbls = (markup.match(/<table/g) || []).length;
  assert.strictEqual((markup.match(/<div class="tw"><table/g) || []).length, tbls, 'tables wrapped by .tw');
  assert.ok(!/<img\b/.test(html));
  const css = attr(html, /<style>([\s\S]*?)<\/style>/);
  assert.ok(!/(^|[;{\s])width:\s*\d{3,}px/.test(css.replace(/@media[^{]*\{/g, '').replace(/\.range::[^{]*\{[^}]*\}/g, '')), 'fixed wide width');
});
t('M18 no sitemap/robots/nojekyll in folder', () => ['sitemap.xml', 'robots.txt', '.nojekyll'].forEach((f) => assert.ok(!fs.existsSync(path.join(dir, f)), f)));
t('M19 notes and share text', () => {
  assert.ok(html.includes('投稿文に金額・年齢は入りません。'));
  assert.ok(html.includes('給付型奨学金は返還不要です。このツールは貸与型（返還が必要なもの）が対象です。'));
  assert.ok(html.includes('id="nextLinks"') && html.includes('href="../living-cost-simulator/"') && html.includes('href="../nisa-simulator/"'));
  const pr = attr(html, /(<div class="pr-wrap">[\s\S]*?<div id="prCards"><\/div>)/);
  assert.ok(pr.includes('広告を含みます') && pr.includes('18歳未満') && pr.includes('18歳以上'));
  assert.ok(!/ad-slot/.test(markup.replace(/<div class="ad-slot"[^>]*hidden>/, '')), 'ad slot hidden');
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
