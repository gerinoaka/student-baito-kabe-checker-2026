'use strict';
// 依存ゼロのテスト。index.html の <script id="logic"> を抽出して評価する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const html = rd('index.html');
const m = html.match(/<script id="logic">([\s\S]*?)<\/script>/);
if (!m) { console.error('logic script not found'); process.exit(1); }
const ES = vm.runInNewContext(m[1] + ';ES', {});
const SITE = 'https://gakusei-tools.com/';
const BASE = SITE + 'es-word-counter/';
const rdP = (p) => fs.readFileSync(path.join(root, '..', p), 'utf8'); // 親フォルダ（読むだけ）
const HAS_SEG = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';

let pass = 0, fail = 0;
function subset(actual, exp, p) {
  if (exp !== null && typeof exp === 'object') {
    assert.ok(actual !== null && typeof actual === 'object', p + ' is not object');
    for (const k of Object.keys(exp)) subset(actual[k], exp[k], p + '.' + k);
  } else {
    assert.strictEqual(actual, exp, p + ': expected ' + exp + ' got ' + actual);
  }
}
function t(name, actual, exp) {
  try { subset(actual, exp, name); pass++; }
  catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); }
}
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }
const C = (s, o) => ES.count(s, o);
const cp = { unit: 'codepoint' };
const zero = (n) => 'あ'.repeat(n);
const ids = (arr) => arr.map((x) => x.id);
const FILL = '空は青いです。'.repeat(25); // 175字。STAR語・数字なし
const A = (s) => ES.analyze(s);
const find = (arr, id) => arr.find((x) => x.id === id);

// ---- C. count
t('C01', C(''), { count: 0, sheets: 0, sheetsCeil: 0, lines: 0 });
t('C02', C('あいう'), { count: 3 });
t('C03', C('a😀b', cp), { count: 3, utf16: 4 });
t('C04c', C('👨‍👩‍👧', cp), { count: 5 });
if (HAS_SEG) t('C04g', C('👨‍👩‍👧'), { count: 1 }); else pass++;
t('C05c', C('é', cp), { count: 2 });
if (HAS_SEG) t('C05g', C('é'), { count: 1 }); else pass++;
t('C06', C('𠮷野家', cp), { count: 3, utf16: 4 });
t('C07', C('あ\nい'), { count: 2, withNewline: 3, noNewline: 2 });
t('C08', C('あ\nい', { countNewline: true }), { count: 3 });
t('C09', C('あ\r\nい', { countNewline: true }), { count: 3 });
t('C10', C('あ い　う'), { count: 5, noSpace: 3 });
t('C11', C('あ い　う', { countSpace: false }), { count: 3 });
t('C12', C('  \n　'), { count: 3, noSpace: 0 });
t('C13', [C(zero(400)).sheets, C(zero(401)).sheets, C(zero(400)).sheetsCeil, C(zero(401)).sheetsCeil].join(','), '1,1,1,2');
t('C14', C(zero(200)), { sheets: 0.5, sheetsCeil: 1 });

// ---- P. progress
t('P01', ES.progress(0, 400), { status: 'empty', pct: 0 });
t('P02', ES.progress(315, 400), { status: 'low', pct: 78 });
t('P03', ES.progress(316, 400), { status: 'low', pct: 79 });
t('P04', ES.progress(319, 400), { status: 'low', pct: 79 });
t('P05', ES.progress(320, 400), { status: 'ok', pct: 80 });
t('P06', ES.progress(359, 400), { status: 'ok' });
t('P07', ES.progress(360, 400), { status: 'ideal', pct: 90 });
t('P08', ES.progress(400, 400), { status: 'ideal', pct: 100, over: 0 });
t('P09', ES.progress(401, 400), { status: 'over', over: 1, pct: 100 });
t('P10', [ES.progress(10, 0), ES.progress(10, ''), ES.progress(10, NaN), ES.progress(10, 10001), ES.progress(10, 2.5)].map((x) => x.hasLimit).join(','), 'false,false,false,false,false');
t('P11', ES.progress(5, 7).status + '/' + ES.progress(6, 7).status, 'low/ok');
t('P12', ES.progress(1, 1), { status: 'ideal' });
t('P13', ES.progress(300, 400), { min80: 320, toOk: 20, min90: 360 });

// ---- A. analyze
t('A01', JSON.stringify([A(''), A('  \n')]), '[[],[]]');
{ const r = A(zero(100)); c('A02', () => { assert.ok(find(r, 'short')); assert.ok(!r.some((x) => x.kind === 'structure')); }); }
{ const r = find(A('私は何かをすることができた。'), 'redundant:dekiru');
  c('A03', () => { assert.ok(r); assert.strictEqual(r.count, 1); assert.ok(r.excerpts.length > 0); }); }
c('A04', () => { assert.ok(!find(A('彼ができる'), 'redundant:dekiru')); assert.ok(!find(A('することが得意'), 'redundant:dekiru')); });
c('A05', () => { assert.ok(!find(A('という話。'.repeat(2)), 'redundant:toiu')); assert.ok(find(A('という話。'.repeat(3)), 'redundant:toiu')); });
c('A06', () => { assert.ok(!find(A('させていただきました。'), 'redundant:itadaku')); assert.ok(find(A('させていただきました。'.repeat(2)), 'redundant:itadaku')); });
c('A07', () => { assert.ok(!find(A('思いやりを大切にしました'), 'redundant:omou')); assert.ok(find(A('と思います。'.repeat(3)), 'redundant:omou')); });
c('A08', () => assert.ok(!find(A('「と思います」'.repeat(3)), 'redundant:omou')));
c('A09', () => assert.ok(find(A('ないわけではない'), 'redundant:nitei')));
c('A10', () => { assert.ok(find(A('めっちゃ頑張った'), 'redundant:kogo')); assert.ok(!find(A('とかく'), 'redundant:kogo')); });
c('A11', () => {
  assert.ok(find(A('これは本です。'.repeat(3)), 'ending'));
  assert.ok(!find(A('これは本です。'.repeat(2)), 'ending'));
  assert.ok(!find(A('これは本です。これは本ます。これは本です。'), 'ending'));
  assert.ok(!find(A('です。ます。です。'), 'ending'));
});
c('A12', () => {
  const r = A(FILL);
  ['conclusion', 'situation', 'task', 'action', 'result'].forEach((id) => assert.strictEqual(find(r, id).found, false, id));
});
c('A13', () => {
  const r = A('私は学生時代に力を入れたことがあります。当時の課題は人手不足でした。改善を提案し、実施した結果、売上が30%向上しました。この経験から学んだことを活かします。' + FILL);
  assert.ok(!r.some((x) => x.kind === 'structure' && x.found === false), JSON.stringify(r.filter((x) => x.found === false).map((x) => x.id)));
});
c('A14', () => assert.strictEqual(find(A('2024年に参加' + FILL), 'result').found, false));
c('A15', () => assert.strictEqual(find(A('売上を30%向上' + FILL), 'result').found, true));
c('A16', () => assert.ok(find(A(FILL), 'number')));
c('A17', () => assert.ok(!JSON.stringify(A(FILL + '私は課題を改善しました。')).includes('score')));

// ---- S. buildShare
{ const b = ES.buildShare({ status: 'ok' });
  c('S01', () => { assert.ok(b.text.includes('目安ラインクリア')); assert.ok(b.href.startsWith('https://x.com/intent/tweet?')); }); }
{ const b = ES.buildShare({ status: 'ideal' });
  c('S02', () => { assert.strictEqual(JSON.stringify(b.hashtags), JSON.stringify(['就活', 'ES対策', 'ガクチカ'])); assert.ok(b.href.includes('url=' + encodeURIComponent(BASE)));
    assert.ok(b.href.includes('hashtags=' + ['就活', 'ES対策', 'ガクチカ'].map(encodeURIComponent).join(','))); }); }
{ const d = decodeURIComponent(ES.buildShare({ status: 'ok', count: 123, text: '秘密の本文' }).href);
  c('S03', () => { assert.ok(!d.includes('123')); assert.ok(!d.includes('秘密')); }); }
{ const tx = (s) => ES.buildShare(s).text;
  c('S04', () => {
    const lo = tx({ status: 'low' }), ov = tx({ status: 'over' }), df = tx({ status: 'zzz' });
    assert.strictEqual(new Set([lo, ov, df, tx({ status: 'ok' }), tx({ status: 'ideal' })]).size, 5);
    assert.strictEqual(df, 'ESの文字数をチェックしました');
    assert.strictEqual(tx({ status: 'empty' }), df); assert.strictEqual(tx(null), df);
  }); }

// ---- M. サイト横断
c('M01', () => assert.ok(Buffer.byteLength(html, 'utf8') <= 102400));
c('M02', () => assert.ok(!/innerHTML|insertAdjacentHTML|localStorage|sessionStorage|document\.write|eval\(|fetch\(|XMLHttpRequest|sendBeacon|indexedDB/.test(html)));
c('M03', () => {
  const src = [...html.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((x) => x[1]);
  assert.deepStrictEqual(src, ['links-config.js', '../assets/ui-motion.js', '../site-config.js']);
  assert.ok(![...html.matchAll(/<link\b[^>]*>/g)].some((x) => /href="https?:/.test(x[0]) && !/rel="canonical"/.test(x[0])));
  assert.ok(!/<img\b/.test(html));
});
c('M04', () => {
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => JSON.parse(x[1]));
  assert.strictEqual(ld.length, 2); assert.strictEqual(ld[0]['@type'], 'WebApplication'); assert.strictEqual(ld[1]['@type'], 'FAQPage');
  const faq = html.match(/<section id="faq"[\s\S]*?<\/section>/)[0];
  const qs = [...faq.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((x) => x[1].replace(/<wbr>/g, ''));
  const as =[...faq.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => x[1].replace(/<[^>]+>/g, ''));
  assert.deepStrictEqual(ld[1].mainEntity.map((q) => q.name), qs);
  assert.deepStrictEqual(ld[1].mainEntity.map((q) => q.acceptedAnswer.text), as);
  assert.ok(qs.length >= 6 && qs.length <= 8);
});
c('M05', () => {
  assert.strictEqual(html.match(/<link rel="canonical" href="([^"]*)"/)[1], BASE);
  assert.strictEqual(html.match(/<meta property="og:url" content="([^"]*)"/)[1], BASE);
  const locs = [...rdP('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs.length, 25);
  assert.ok(locs.includes(BASE));
  assert.ok(rdP('robots.txt').includes('Sitemap: ' + SITE + 'sitemap.xml'));
  assert.ok(fs.existsSync(path.join(root, '..', '.nojekyll')));
  ['sitemap.xml', 'robots.txt', '.nojekyll'].forEach((f) => assert.ok(!fs.existsSync(path.join(root, f)), f));
});
c('M06', () => {
  const ctx = {};
  vm.runInNewContext(rd('links-config.js'), { window: ctx });
  const L = ctx.ES_LINKS;
  assert.deepStrictEqual(Object.keys(L), ['shukatsuSite', 'agent', 'scout']);
  Object.keys(L).forEach((k) => assert.strictEqual(L[k].url, ''));
  assert.ok(html.includes('sponsored nofollow noopener'));
});
c('M07', () => {
  const rel = html.match(/<aside class="rel"[\s\S]*?<\/aside>/)[0];
  const hrefs = [...rel.matchAll(/<a href="([^"]*)"/g)].map((x) => x[1]);
  assert.strictEqual(hrefs.length, 6);
  ['../', '../kakemochi/', '../shift-limit/', '../living-cost-simulator/', './', '../nisa-simulator/']
    .forEach((u) => assert.ok(hrefs.includes(u), u));
  hrefs.forEach((u) => assert.ok(!/^https?:/.test(u), u));
  hrefs.filter((u) => u !== './').forEach((u) =>
    assert.ok(fs.existsSync(path.join(root, u, 'index.html')), 'index.html missing: ' + u));
  const sis = rel.match(/<section class="sisters"[\s\S]*?<\/section>/)[0];
  assert.strictEqual((sis.match(/aria-current="page"/g) || []).length, 1);
  assert.strictEqual((html.match(/aria-current="page"/g) || []).length, 2);
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
