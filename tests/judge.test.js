'use strict';
// 依存ゼロのテスト。index.html の <script id="logic"> を抽出して評価する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="logic">([\s\S]*?)<\/script>/);
if (!m) { console.error('logic script not found'); process.exit(1); }
const K = vm.runInNewContext(m[1] + ';KABE', {});

let pass = 0, fail = 0;
function subset(actual, exp, p) {
  if (exp !== null && typeof exp === 'object') {
    assert.ok(actual !== null && typeof actual === 'object', p + ' is not object');
    for (const k of Object.keys(exp)) subset(actual[k], exp[k], p + '.' + k);
  } else if (typeof exp === 'number' && Number.isNaN(exp)) {
    assert.ok(Number.isNaN(actual), p + ' expected NaN, got ' + actual);
  } else {
    assert.strictEqual(actual, exp, p + ': expected ' + exp + ' got ' + actual);
  }
}
function t(name, actual, exp) {
  try { subset(actual, exp, name); pass++; }
  catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); }
}
const J = (ageGroup, salary, commute, multiJob) => K.judge({ ageGroup, salary, commute, multiJob });
const A = 'a19_22';

t('01', J(A, 1190000), { ok: true, jumin: { status: 'within', remain: 0 }, tax: { status: 'within', remain: 590000 }, parent: { kind: 'tokutei_fuyo', amount: 630000, tierIndex: 0 }, health: { status: 'ok', remain: 310000 }, kinrou: { status: 'within', remain: 440000 } });
t('02', J(A, 1190001), { jumin: { status: 'over', excess: 1, shotokuwariZeroIfKinrou: true }, tax: { status: 'within' } });
t('03', J(A, 1360000), { parent: { kind: 'tokutei_fuyo', amount: 630000, next: { boundary: 1360000, remain: 0, kind: 'tokubetsu', amount: 630000 } } });
t('04', J(A, 1360001), { parent: { kind: 'tokubetsu', amount: 630000, tierIndex: 1, diffFromFull: 0 }, health: { status: 'ok' } });
t('05', J(A, 1590000), { parent: { kind: 'tokubetsu', amount: 630000, tierIndex: 1 }, kinrou: { status: 'within', remain: 40000 }, health: { status: 'ng', excess: 90000 } });
t('06', J(A, 1590001), { parent: { amount: 610000, tierIndex: 2, diffFromFull: 20000 } });
t('07', J(A, 1630000), { kinrou: { status: 'within', remain: 0 }, parent: { amount: 610000 } });
t('08', J(A, 1630001), { kinrou: { status: 'over', excess: 1 }, parent: { amount: 610000 } });
t('09', J(A, 1640000), { parent: { amount: 610000, tierIndex: 2 } });
t('10', J(A, 1640001), { parent: { amount: 510000, tierIndex: 3 } });
t('11', J(A, 1780000), { tax: { status: 'within', remain: 0 }, parent: { amount: 310000, tierIndex: 5 } });
t('12', J(A, 1780001), { tax: { status: 'over', excess: 1 }, parent: { amount: 310000, tierIndex: 5 }, summary: { exceededCount: 4 } });
t('13', J(A, 1970000), { parent: { kind: 'tokubetsu', amount: 30000, tierIndex: 9, next: { boundary: 1970000, remain: 0, kind: 'none', amount: 0 } } });
t('14', J(A, 1970001), { parent: { kind: 'none', amount: 0, tierIndex: 10, next: null } });
t('15', J(A, 1499999), { health: { status: 'ok', remain: 1, limit: 1500000, basis: '19_22' } });
t('16', J(A, 1500000), { health: { status: 'ng', remain: 0, excess: 0 } });
t('17', J(A, 1400000, 99999), { Y: 1499999, health: { status: 'ok', remain: 1 }, tax: { status: 'within' }, kinrou: { status: 'within' } });
t('18', J(A, 1400000, 100000), { Y: 1500000, health: { status: 'ng' }, tax: { status: 'within', remain: 380000 } });
t('19', J('a23p', 1299999), { health: { status: 'ok', remain: 1, limit: 1300000, basis: 'other' }, parent: { kind: 'fuyo', amount: 380000 } });
t('20', J('a23p', 1300000), { health: { status: 'ng' }, parent: { kind: 'fuyo', amount: 380000 } });
t('21', J('a16_18', 1360000), { parent: { kind: 'fuyo', amount: 380000, tierIndex: null }, health: { status: 'ng' }, jumin: { minorCaution: true } });
t('22', J('a16_18', 1360001), { parent: { kind: 'none', amount: 0, diffFromFull: 380000 }, summary: { exceededCount: 3 } });
t('23a', J(A, 1400000), { health: { status: 'ok' }, parent: { kind: 'tokubetsu', amount: 630000 } });
t('23b', J('a23p', 1400000), { health: { status: 'ng' }, parent: { kind: 'none', amount: 0 } });
t('24', J('u15', 500000), { parent: { kind: 'none', reason: 'under16', fullAmount: 0 }, health: { limit: 1300000 }, jumin: { minorCaution: true } });
t('25', J(A, 0), { ok: true, tax: { remain: 1780000 }, parent: { kind: 'tokutei_fuyo' }, health: { status: 'ok' }, summary: { exceededCount: 0 } });
t('26', J(A, 1000000), { summary: { nextBoundary: { wall: 'jumin', remain: 190000 } } });
t('27', J(A, 1250000), { jumin: { status: 'over' }, summary: { exceededCount: 1, nextBoundary: { wall: 'parent', remain: 110000 } } });

// バリデーション
t('v1', J(A, null), { ok: false, errors: { 0: { field: 'salary' } } });
t('v2', J(A, -1), { ok: false });
t('v3', J(A, 1.5), { ok: false });
t('v4', J(A, 100000000), { ok: false, errors: { 0: { message: '金額が大きすぎます。1億円未満で入力してください。' } } });
t('v5', J(A, 99999999), { ok: true });
t('v6', J('x', 1000000), { ok: false, errors: { 0: { field: 'ageGroup' } } });
t('v7', J(A, 1000000, -1), { ok: false, errors: { 0: { field: 'commute' } } });
t('v8', J(A, NaN), { ok: false });

// 補助関数
t('e1', K.estimateAnnual({ cumulative: 1000000, monthsLeft: 1, monthly: 150000 }), { ok: true, value: 1150000 });
t('e2', K.estimateAnnual({ cumulative: 1000000, monthsLeft: 13, monthly: 150000 }), { ok: false, errors: { 0: { field: 'monthsLeft' } } });
t('p1', K.parseYen('1,190,000'), 1190000);
t('p2', K.parseYen('１１９００００円'), 1190000);
t('p3', K.parseYen(''), null);
t('p4', K.parseYen('-5'), NaN);
t('p5', K.parseYen('1.5'), NaN);
t('p6', K.parseYen('abc'), NaN);
t('f1', K.fmtMan(1190001), '119万1円');
t('f2', K.fmtMan(1360000), '136万円');
t('f3', K.fmtMan(9999), '9,999円');
t('f4', K.fmtMan(1235000), '123万5,000円');
t('f5', K.fmtMan(0), '0円');
t('f6', K.fmtYen(1190000), '1,190,000円');

// ---- A. prPlan（commute 0、multiJob false）
const P = (age, X, commute, multi) => K.prPlan(K.judge({ ageGroup: age, salary: X, commute: commute || 0, multiJob: !!multi }));
t('pr01', P(A, 0), { a: true, b: false, kakemochi: false });
t('pr02', P(A, 1000000), { a: true, b: false });
t('pr03', P(A, 1090000), { a: true });
t('pr04', P(A, 1090001), { a: false });
t('pr05', P('a16_18', 1000000), { a: false });
t('pr06', P('u15', 0), { a: false });
t('pr07', P(A, 1200000), { a: false, b: false });
t('pr08', P(A, 1499999), { a: false, b: false });
t('pr09', P(A, 1500000), { b: true });
t('pr10', P(A, 1500001), { b: true });
t('pr11', P('a23p', 1300000), { b: true });
t('pr12', P('a23p', 1200000, 100000), { b: true });
t('pr13', P(A, 1000000, 0, true), { a: true, b: true, kakemochi: true });
t('pr14', P(A, 1000000, 0, false), { kakemochi: false });

// ---- B. buildShare
const B = (age, X) => K.buildShare(K.judge({ ageGroup: age, salary: X }));
t('bs01', B(A, 1000000).text.includes('すべてセーフ'), true);
t('bs02', B(A, 1780001).text.includes('すべて超えて'), true);
t('bs03', B(A, 1200000).text.includes('1つ') && B(A, 1200000).text.includes('住民税'), true);
{
  const bad = [];
  [[A, 0], [A, 1000000], [A, 1200000], [A, 1300000], [A, 1500000], [A, 1780001], ['a23p', 1400000], ['a16_18', 1360001], ['u15', 500000]].forEach(([g, x]) => {
    const tx = decodeURIComponent(B(g, x).href.match(/text=([^&]*)/)[1]);
    if (/\d{2,}/.test(tx) || /万/.test(tx) || /円/.test(tx) || /あと/.test(tx)) bad.push(g + ':' + x + ':' + tx);
  });
  t('bs04', bad.join('|'), '');
}
t('bs05', B(A, 1300000).text === B(A, 1310000).text, true);
{
  const b = B(A, 1000000), CANON = K.DATA.CANON;
  const okHref = b.href.indexOf('https://x.com/intent/tweet?text=') === 0 && b.href.indexOf('&url=' + encodeURIComponent(CANON)) > 0 &&
    b.href.indexOf('hashtags=' + ['年収の壁', '学生バイト', '年収の壁チェッカー'].map(encodeURIComponent).join(',')) > 0;
  t('bs06', okHref, true);
  t('bs07', b.url === CANON, true);
}

// ---- C. サイト横断チェック
const root = path.join(__dirname, '..');
const BASE = 'https://gakusei-tools.com/';
const pages = [['index.html', BASE, 'links-config.js'], ['kakemochi/index.html', BASE + 'kakemochi/', '../links-config.js'], ['shift-limit/index.html', BASE + 'shift-limit/', '../links-config.js']];
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }
pages.forEach(([p, url, link]) => {
  const h = rd(p);
  c('x-canon ' + p, () => {
    assert.strictEqual(h.match(/<link rel="canonical" href="([^"]*)"/)[1], url);
    assert.strictEqual(h.match(/<meta property="og:url" content="([^"]*)"/)[1], url);
  });
  c('x-lang ' + p, () => { assert.ok(h.includes('<html lang="ja">')); assert.ok(h.includes('<meta name="twitter:card" content="summary_large_image">')); });
  c('x-jsonld ' + p, () => {
    const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => JSON.parse(x[1]));
    assert.strictEqual(ld.length, 2);
    assert.strictEqual(ld[0]['@type'], 'WebApplication');
    assert.strictEqual(ld[1]['@type'], 'FAQPage');
    const faq = h.match(/<section id="faq"[\s\S]*?<\/section>/)[0];
    const vis = [...faq.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => x[1].replace(/<[^>]+>/g, ''));
    const jl = ld[1].mainEntity.map((q) => q.acceptedAnswer.text);
    assert.deepStrictEqual(jl, vis);
    const qs = [...faq.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((x) => x[1]);
    assert.deepStrictEqual(ld[1].mainEntity.map((q) => q.name), qs);
  });
  c('x-size ' + p, () => assert.ok(Buffer.byteLength(h, 'utf8') <= 102400, 'size ' + Buffer.byteLength(h, 'utf8')));
  c('x-faqcount ' + p, () => {
    const faq = h.match(/<section id="faq"[\s\S]*?<\/section>/)[0];
    const n = (faq.match(/<h3>/g) || []).length;
    const min = { 'index.html': 15, 'kakemochi/index.html': 13, 'shift-limit/index.html': 12 }[p];
    assert.ok(n >= min, 'faq h3 count ' + n + ' < ' + min);
  });
  c('x-glossary ' + p, () => {
    const g = h.match(/<section id="glossary">[\s\S]*?<\/section>/);
    assert.ok(g, 'glossary missing');
    const n = (g[0].match(/<dt>/g) || []).length;
    assert.ok(n >= 10 && n <= 15, 'dt count ' + n);
    assert.ok(!h.match(/<section id="faq"[\s\S]*?<\/section>/)[0].includes('<dl'), 'glossary inside faq');
  });
  c('x-sisters ' + p, () => {
    const s = h.match(/<section class="sisters" id="sisters"[\s\S]*?<\/section>/);
    assert.ok(s, 'sisters missing');
    assert.ok(s[0].includes('<h2 id="sistersH">姉妹ツール</h2>'));
    assert.ok(!s[0].includes('aria-current'));
    const pre = p === 'index.html' ? '' : '../';
    ['living-cost-simulator', 'es-word-counter', 'nisa-simulator'].forEach((x) => {
      assert.ok(s[0].includes('href="' + pre + x + '/"'), x);
      assert.ok(fs.existsSync(path.join(root, x, 'index.html')), x + '/index.html');
    });
    assert.ok(h.indexOf('id="toolsH"') < h.indexOf('id="sisters"') && h.indexOf('id="sisters"') < h.indexOf('<footer>'));
    assert.strictEqual((h.match(/id="toolsH"[\s\S]*?<\/section>/)[0].match(/aria-current/g) || []).length, 1);
  });
  if (p !== 'index.html') {
    c('x-share ' + p, () => {
      const a = h.match(/<a id="shareX"[^>]*>/)[0];
      assert.ok(a.includes('href="https://x.com/intent/tweet"'));
      assert.ok(a.includes('rel="noopener noreferrer"'));
    });
    c('x-share-privacy ' + p, () => assert.ok(h.match(/<section id="privacy">[\s\S]*?<\/section>/)[0].includes('x.com')));
    c('x-prwrap ' + p, () => { assert.ok(h.includes('id="prWrap"')); assert.ok(h.includes('id="prCards"')); });
  }
  if (p === 'shift-limit/index.html') {
    c('x-age ' + p, () => {
      const r = [...h.matchAll(/<input type="radio" name="age"[^>]*>/g)].map((x) => x[0]);
      assert.strictEqual(r.length, 2);
      assert.ok(r[0].includes('value="u18"') && r[1].includes('value="a19p"'));
      r.forEach((x) => assert.ok(!/checked/.test(x)));
    });
  }
  c('x-nohash ' + p, () => { assert.ok(!h.includes('href="#"')); assert.ok(!h.includes('data-aff')); });
  c('x-tools ' + p, () => {
    const sec = h.match(/<section class="tools"[\s\S]*?<\/section>/)[0];
    assert.strictEqual((sec.match(/aria-current="page"/g) || []).length, 1);
    const dir = path.dirname(path.join(root, p));
    [...h.matchAll(/<(?:nav|section class="tools")[\s\S]*?<\/(?:nav|section)>/g)].forEach((blk) => {
      [...blk[0].matchAll(/href="([^"#]*)"/g)].forEach((x) => assert.ok(fs.existsSync(path.join(path.resolve(dir, x[1]), 'index.html')), 'unresolved ' + x[1]));
    });
  });
  c('x-linkscript ' + p, () => assert.ok(h.includes('<script src="' + link + '"></script>\n<script id="logic">')));
});
c('x-sitemap', () => {
  const sm = rd('sitemap.xml');
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs.length, 17);
  assert.deepStrictEqual(locs.slice().sort(), pages.map((x) => x[1]).concat(['living-cost-simulator/', 'es-word-counter/', 'nisa-simulator/', 'about/', 'tools/', 'privacy/', 'guides/150-wall-guide/', 'guides/kakemochi-tax-guide/', 'guides/es-star-method/', 'guides/student-nisa-start/', 'guides/nenmatsu-chosei-miss/', 'guides/kokuho-150-cost/', 'guides/baito-nisa-monthly/', 'scholarship/'].map((x) => BASE + x)).sort());
});
c('x-readme-lines', () => {
  const lines = rd('links-config.js').split(/\r?\n/);
  [41, 49, 57].forEach((n) => assert.ok(/^\s+url: '.*',$/.test(lines[n - 1]), 'line ' + n + ': ' + lines[n - 1]));
  const rm = rd('README.md');
  ['41行目', '49行目', '57行目'].forEach((x) => assert.ok(rm.includes(x), x));
});
c('x-robots', () => assert.ok(rd('robots.txt').includes('Sitemap: ' + BASE + 'sitemap.xml')));
c('x-nojekyll', () => assert.ok(fs.existsSync(path.join(root, '.nojekyll'))));
c('x-links-config', () => {
  const ctx = {};
  vm.runInNewContext(rd('links-config.js'), { window: ctx });
  const L = ctx.KABE_LINKS;
  assert.deepStrictEqual(Object.keys(L).sort(), ['kakutei', 'note', 'tanpatsu']);
  Object.keys(L).forEach((k) => {
    assert.strictEqual(L[k].label, 'PR');
    ['title', 'desc', 'cta'].forEach((f) => assert.ok(typeof L[k][f] === 'string' && L[k][f].length > 0));
    assert.ok(L[k].url === '' || /^https:\/\//.test(L[k].url));
  });
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
