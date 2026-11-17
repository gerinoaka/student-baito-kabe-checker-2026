'use strict';
// 依存ゼロのテスト。index.html の <script id="logic"> を抽出して評価する。実行: node tests/living.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const m = html.match(/<script id="logic">([\s\S]*?)<\/script>/);
if (!m) { console.error('logic script not found'); process.exit(1); }
const L = vm.runInNewContext(m[1] + ';LIVING', {});

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
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }

// ---- A. 給与所得・速算表
t('A1a', L.salaryIncome(740999), 0);
t('A1b', L.salaryIncome(741000), 1000);
t('A2a', L.salaryIncome(2200000), 1460000);
t('A2b', L.salaryIncome(2200001), 1460001);
t('A3a', L.salaryIncome(3600000), 2440000);
t('A3b', L.salaryIncome(3600001), 2440001);
t('A4a', L.taxOnTaxable(1949000), 99400);
t('A4b', L.taxOnTaxable(1950000), 99500);
t('A5a', L.taxOnTaxable(3299000), 237200);
t('A5b', L.taxOnTaxable(3300000), 237300);
t('A6a', L.taxOnTaxable(0), 0);
t('A6b', L.taxOnTaxable(1000), 0);
t('A6c', L.taxOnTaxable(3000), 100);

// ---- B. 社会保険
t('B1', L.socialInsurance(220000, 'tokyo'), { health: 10835, support: 253, pension: 20130, employment: 1100, total: 32318 });
t('B2', L.socialInsurance(220000, 'national'), { health: 10890, total: 32373 });
t('B3', L.socialInsurance(200000, 'tokyo'), { health: 9850, support: 230, pension: 18300, employment: 1000, total: 29380 });
t('B4', L.socialInsurance(400000, 'tokyo'), { health: 19700, support: 460, pension: 36600, employment: 2000, total: 58760 });
t('B5', L.socialInsurance(700000, 'tokyo'), { health: 34475, support: 805, pension: 59475, employment: 3500, total: 98255 });
t('B6a', L.socialInsurance(634999, 'tokyo').pension, 58102);
t('B6b', L.socialInsurance(635000, 'tokyo').pension, 59475);
t('B7', L.socialInsurance(0, 'tokyo'), { health: 0, support: 0, pension: 0, employment: 0, total: 0 });

// ---- 基礎控除の帯（令和8年分）と所得税の帯境界（追加: PM指示）
// 帯: G<=4,890,000 -> 1,040,000 / G<=6,550,000 -> 670,000 / G<=23,500,000 -> 620,000 / それ超 -> 0
t('N1', L.basicDeduction(4890000), 1040000);
t('N2', L.basicDeduction(4890001), 670000);
t('N3', L.basicDeduction(6550000), 670000);
t('N4', L.basicDeduction(6550001), 620000);
t('N4b', L.basicDeduction(23500000), 620000);
t('N4c', L.basicDeduction(23500001), 0);
// G=4,890,000,S=0: 課税所得=4,890,000-1,040,000=3,850,000 / 税=3,850,000*20%-427,500=342,500 / x1.021=349,692.5 -> 100円未満切捨 349,600
t('N5', L.incomeTax(4890000, 0), 349600);
// G=4,890,001,S=0: 課税所得=4,890,001-670,000=4,220,001 -> 1,000円未満切捨 4,220,000 / 税=844,000-427,500=416,500 / x1.021=425,246.5 -> 425,200
t('N6', L.incomeTax(4890001, 0), 425200);
// G=6,550,000,S=0: 課税所得=6,550,000-670,000=5,880,000 / 税=1,176,000-427,500=748,500 / x1.021=764,218.5 -> 764,200
t('N7', L.incomeTax(6550000, 0), 764200);
// G=6,550,001,S=0: 課税所得=6,550,001-620,000=5,930,001 -> 5,930,000 / 税=1,186,000-427,500=758,500 / x1.021=774,428.5 -> 774,400
t('N8', L.incomeTax(6550001, 0), 774400);

// ---- C. 学生
const S = (o) => L.takeHome(Object.assign({ mode: 'student' }, o));
const SA = (annual) => S({ inputType: 'annual', annual });
t('C1', SA(1780000), { incomeTaxYear: 0, monthlyNet: 148333, outOfRange: false });
t('C2', SA(1781000), { incomeTaxYear: 0 });
t('C3', SA(1783000), { incomeTaxYear: 100, monthlyNet: 148575 });
t('C4', SA(2000000), { incomeTaxYear: 11200, monthlyNet: 165733, basicDeduction: 1040000 });
t('C5', SA(2060000), { incomeTaxYear: 14200, outOfRange: false, basicPartial: false });
t('C6', SA(2061000), { incomeTaxYear: 14300, outOfRange: true, basicPartial: true });
t('C7', S({ inputType: 'monthly', monthly: 100000, months: 12 }), { X: 1200000, incomeTaxYear: 0, residentNote: true, monthlyNet: 100000 });
t('C8a', SA(1190000), { residentNote: false });
t('C8b', SA(1190001), { residentNote: true });
t('C9', S({ inputType: 'monthly', monthly: 80000, months: 6 }), { X: 480000, incomeTaxYear: 0, monthlyNet: 40000 });
t('C10', SA(2640000), { incomeTaxYear: 37100, outOfRange: true });
t('C11a', typeof SA(-1).error, 'string');
t('C11b', typeof SA(NaN).error, 'string');
t('C11c', typeof L.takeHome({ mode: 'x' }).error, 'string');
t('C11d', SA(-1).error, '0以上の数字で入力してください');
t('C11e', SA(50000001).error, '入力できる上限を超えています');
t('C11f', typeof S({ inputType: 'monthly', monthly: 80000, months: 13 }).error, 'string');
t('C11g', typeof S({ inputType: 'monthly', monthly: 80000, months: 0 }).error, 'string');
t('C12', SA(1200000).residentYear, 0);

// ---- D. 新社会人
const D = (o) => L.takeHome(Object.assign({ mode: 'shakaijin', monthly: 220000, bonus: 0, region: 'tokyo', year: 1, priorMonths: 9 }, o));
t('D1', D({}), { X: 2640000, S: 387816, incomeTaxYear: 17300, incomeTaxMonth: 1441, residentYear: 0, monthlyNet: 186240, basicPartial: true, basicDeduction: 1040000 });
t('D2', D({ monthly: 200000 }), { S: 352560, incomeTaxYear: 10500, incomeTaxMonth: 875, monthlyNet: 169745 });
t('D3', D({ monthly: 300000 }), { S: 528840, incomeTaxYear: 44400, monthlyNet: 252230 });
t('D4', D({ monthly: 400000 }), { S: 705120, incomeTaxYear: 84400, incomeTaxMonth: 7033, monthlyNet: 334206 });
t('D5', D({ bonus: 600000 }), { S: 475956, X: 3240000, incomeTaxYear: 34300, monthlyNet: 227478 });
// D6 設計図は「D5と同じ」だが、賞与が500円多い分だけ額面Xが増えるため手取りは D5 と一致しない。
// 社保S・所得税は D5 と同じ（賞与の社保は600,000円=1,000円未満切捨）。
// X=2,640,000+600,500=3,240,500 / 手取り年額=3,240,500-475,956-34,300=2,730,244 / 月 floor(2,730,244/12)=227,520
t('D6', D({ bonus: 600500 }), { S: 475956, X: 3240500, incomeTaxYear: 34300, monthlyNet: 227520 });
t('D7', D({ region: 'national' }), { S: 388476, incomeTaxYear: 17300, monthlyNet: 186185 });
t('D8', D({ year: 2, priorMonths: 9 }), { residentYear: 56900, residentMonth: 4741, monthlyNet: 181498, residentTaxable: true });
t('D9', D({ year: 2, priorMonths: 12 }), { residentYear: 100000, residentMonth: 8333, monthlyNet: 177907 });
t('D10', D({ monthly: 100000, year: 2, priorMonths: 12 }), { residentYear: 5000, incomeTaxYear: 0 });
t('D11', D({ monthly: 99000, year: 2, priorMonths: 12 }), { residentYear: 0, residentTaxable: false });
t('D12a', D({ monthly: 400000, year: 1 }).residentYear, 0);
t('D12b', D({ monthly: 50000, bonus: 3000000, year: 1 }).residentYear, 0);
t('D13a', D({ monthly: 500000 }).outOfRange, false);
t('D13b', D({ monthly: 520000 }).outOfRange, true);
t('D13c', D({ monthly: 700000 }).outOfRange, true);
t('D14a', D({ monthly: 0 }), { monthlyNet: 0, X: 0, S: 0, incomeTaxYear: 0 });
t('D14b', Number.isNaN(D({ monthly: 0 }).monthlyNet), false);
t('D14c', D({ monthly: 0, bonus: 3000001 }).outOfRange, true);
t('D14d', D({ monthly: 0, bonus: 3000000 }).outOfRange, false);
t('D15a', typeof D({ monthly: -1 }).error, 'string');
t('D15b', typeof D({ monthly: 2000001 }).error, 'string');
t('D15c', typeof D({ monthly: NaN }).error, 'string');
t('D15d', typeof D({ bonus: -5 }).error, 'string');
t('D15e', typeof D({ year: 3 }).error, 'string');
// 基礎控除の帯: basicPartial は G>1,320,000。月給170,000 -> X=2,040,000, G=1,300,000 / 月給172,000 -> X=2,064,000, G=2,064,000-740,000=1,324,000
t('D16a', D({ monthly: 170000 }).basicPartial, false);
t('D16b', D({ monthly: 172000 }).basicPartial, true);

// 帯が変わる新社会人: 月給500,000・賞与1,000,000・東京・1年目
// X=500,000*12+1,000,000=7,000,000 / 給与所得控除=floor(7,000,000/10)+1,100,000=1,800,000 (6,600,001〜8,500,000の帯) / G=7,000,000-1,800,000=5,200,000
// 月次社保: 健24,625 支575 厚45,750 雇2,500 = 73,450 / 年 881,400 ; 賞与社保: 健49,250 支1,150 厚91,500 雇5,000 = 146,900 ; S=881,400+146,900=1,028,300
// G=5,200,000 > 4,890,000 のため基礎控除は670,000 / 課税所得=5,200,000-1,028,300-670,000=3,501,700 -> 3,501,000
// 税=3,501,000*20%-427,500=700,200-427,500=272,700 / x1.021=278,426.7 -> 100円未満切捨 278,400
// (参考: 104万のままだと課税所得3,131,000, 税215,600, x1.021 -> 220,100 で約58,300円過少になる)
// 手取り年額=7,000,000-1,028,300-278,400=5,693,300 / 月 floor(5,693,300/12)=474,441
t('N9', D({ monthly: 500000, bonus: 1000000 }), { X: 7000000, S: 1028300, G: 5200000, basicDeduction: 670000, incomeTaxYear: 278400, netAnnual: 5693300, monthlyNet: 474441, outOfRange: true, basicPartial: true });
t('N9b', D({ monthly: 500000, bonus: 1000000 }).items.length, 8);

// ---- E. 理想バランス
t('E1', L.idealBudget(200000), { rent: 56000, food: 34000, util: 10000, comm: 8000, other: 20000, total: 128000, remaining: 72000 });
t('E2', L.idealBudget(186240), { rent: 52100, food: 31700 });
t('E3', L.idealBudget(0), { rent: 0, food: 0, util: 0, comm: 0, other: 0, total: 0, remaining: 0 });

// ---- F. バランス
const ideal = L.idealBudget(200000);
const E = (o) => Object.assign({ rent: ideal.rent, food: ideal.food, util: ideal.util, comm: ideal.comm, other: ideal.other }, o);
t('F1', L.balance(200000, E({}), 0.5), { free: 72000, save: 36000, play: 36000, level: 'ok', deficit: false });
t('F2a', L.balance(200000, E({}), 0), { save: 0, play: 72000 });
t('F2b', L.balance(200000, E({}), 1), { save: 72000, play: 0 });
t('F3a', L.balance(200000, E({}), 1.5), { save: 72000 });
t('F3b', L.balance(200000, E({}), -0.2), { save: 0 });
t('F3c', L.balance(200000, E({}), NaN).saveRatio, 0.5);
t('F4', L.balance(200000, E({ other: 19999 }), 0.5), { free: 72001, save: 36001, play: 36000 });
t('F5', L.balance(200000, E({ other: 92000 }), 0.5), { free: 0, level: 'tight', deficit: false, save: 0, play: 0 });
t('F6', L.balance(200000, E({ other: 122000 }), 0.5), { free: -30000, deficit: true, shortfall: 30000, level: 'deficit', save: 0, play: 0 });
t('F7', L.balance(200000, E({ other: 91999 }), 0.5), { free: 1, deficit: false, level: 'tight' });
t('F8a', L.balance(200000, E({ other: 52000 }), 0.5), { free: 40000, level: 'ok' });
t('F8b', L.balance(200000, E({ other: 52001 }), 0.5), { free: 39999, level: 'tight' });
t('F9a', L.balance(200000, E({ rent: 60000 })).rentLevel, 'ok');
t('F9b', L.balance(200000, E({ rent: 60001 })).rentLevel, 'caution');
t('F9c', L.balance(200000, E({ rent: 66000 })).rentLevel, 'caution');
t('F9d', L.balance(200000, E({ rent: 66001 })).rentLevel, 'high');
t('F10a', L.balance(200000, E({ comm: 12000 })).commHigh, false);
t('F10b', L.balance(200000, E({ comm: 12001 })).commHigh, true);
{
  const b = L.balance(0, { rent: 50000, food: 0, util: 0, comm: 0, other: 0 }, 0.5);
  t('F11a', b.rentRatio, null);
  t('F11b', b.deficit, true);
  t('F11c', JSON.stringify(b).indexOf('null') >= 0 && !Number.isNaN(b.free), true);
  t('F11d', L.balance(0, { rent: 0, food: 0, util: 0, comm: 0, other: 0 }, 0.5).level, 'tight');
}
t('F12a', typeof L.balance(200000, E({ rent: -1 }), 0.5).error, 'string');
t('F12b', typeof L.balance(200000, E({ food: NaN }), 0.5).error, 'string');
{
  const sum = (b) => b.segments.reduce((a, s) => a + s.amount, 0);
  const n = L.balance(200000, E({}), 0.5), d = L.balance(200000, E({ other: 122000 }), 0.5);
  t('F13a', sum(n), 200000);
  t('F13b', n.segments.length, 7);
  t('F13c', sum(d), 230000);
  t('F13d', d.segments.length, 5);
  t('F13e', sum(L.balance(200000, E({ other: 92000 }), 0.5)), 200000);
}

// ---- G. シェア
const lv = (level, mode) => L.buildShare({ level, mode });
t('G1a', lv('ok', 'shakaijin').text.indexOf('余裕あり') >= 0, true);
t('G1b', lv('tight', 'shakaijin').text.indexOf('ギリギリ') >= 0, true);
t('G1c', lv('deficit', 'student').text.indexOf('赤字') >= 0, true);
t('G1d', lv('ok', 'student').text.indexOf('学生バイトモード') >= 0, true);
['ok', 'tight', 'deficit', 'zzz'].forEach((x) => {
  const s = L.buildShare({ level: x, mode: 'shakaijin', free: 123456, save: 7777 });
  const dec = decodeURIComponent(s.href.replace(/&url=[^&]*/, '')); // url= は公開URL（2026を含む）なので除いて、投稿文とタグに数字がないことを検査
  t('G2-' + x, /\d/.test(dec), false);
  t('G2t-' + x, s.text.indexOf('円') < 0, true);
  t('G4-' + x, JSON.stringify(s).indexOf('123456') < 0 && JSON.stringify(s).indexOf('7777') < 0, true);
});
t('G3a', lv('ok').href.indexOf('https://x.com/intent/tweet?text=') === 0, true);
t('G3b', decodeURIComponent(lv('ok').href.match(/hashtags=([^&]*)/)[1]).split(',').length <= 3, true);
c('G5', () => { L.buildShare(); L.buildShare(null); L.buildShare({ level: 'unknown' }); });

// ---- H. PR
const LK = (o) => ({ rentMove: { url: 'https://example.com/a' }, internet: { url: 'https://example.com/b' }, creditCard: { url: 'https://example.com/c' }, bank: { url: 'https://example.com/d' } });
const PR = (o) => JSON.stringify(L.pickPR(Object.assign({ ageOk: true, mode: 'shakaijin', rentLevel: 'ok', commHigh: false, links: LK() }, o)));
t('H1a', PR({ ageOk: null }), '[]');
t('H1b', PR({ ageOk: false }), '[]');
t('H2', PR({}), '["creditCard","bank"]');
t('H3', PR({ rentLevel: 'high', commHigh: true }), '["rentMove","internet"]');
t('H4', PR({ rentLevel: 'high' }), '["rentMove","creditCard"]');
t('H5', PR({ mode: 'student' }), '["creditCard"]');
{ const l = LK(); l.rentMove.url = ''; t('H6', PR({ rentLevel: 'high', links: l }), '["creditCard","bank"]'); }
{ const l = LK(); l.creditCard.url = 'http://example.com'; l.bank.url = ''; t('H7', PR({ links: l }), '[]'); }
t('H8', PR({ links: {} }), '[]');

// ---- parseYen
t('P1', L.parseYen('1,190,000'), 1190000);
t('P2', L.parseYen('１１９００００円'), 1190000);
t('P3', L.parseYen(''), null);
t('P4', L.parseYen('-5'), NaN);
t('P5', L.parseYen('abc'), NaN);

// ---- I. 静的検査
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const SITE = 'https://gakusei-tools.com/';
const BASE = SITE + 'living-cost-simulator/';
c('I1-jsonld', () => {
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => JSON.parse(x[1]));
  assert.strictEqual(ld.length, 2);
  assert.strictEqual(ld[0]['@type'], 'WebApplication');
  assert.strictEqual(ld[1]['@type'], 'FAQPage');
  const faq = html.match(/<section id="faq"[\s\S]*?<\/section>/)[0];
  const vis = [...faq.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((x) => x[1].replace(/<[^>]+>/g, ''));
  assert.deepStrictEqual(ld[1].mainEntity.map((q) => q.acceptedAnswer.text), vis);
  const qs = [...faq.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((x) => x[1]);
  assert.deepStrictEqual(ld[1].mainEntity.map((q) => q.name), qs);
  assert.strictEqual(qs.length, 8);
});
c('I1-size', () => assert.ok(Buffer.byteLength(html, 'utf8') <= 102400, 'size ' + Buffer.byteLength(html, 'utf8')));
c('I1-noinner', () => { assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/.test(html)); });
c('I1-script-src', () => {
  const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]*)"/g)].map((x) => x[1]);
  assert.deepStrictEqual(srcs, ['links-config.js', '../site-config.js']);
});
c('I1-external-urls', () => {
  let s = html.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/g, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  s = s.replace(/<a [^>]*>/g, '').replace(/<link rel="canonical"[^>]*>/, '').replace(/<meta property="og:url"[^>]*>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<meta (?:property|name)="(?:og|twitter):image"[^>]*>/g, '');
  assert.ok(!/https:\/\//.test(s), 'stray https url');
});
c('I1-head', () => {
  assert.ok(html.includes('<html lang="ja">'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'));
  assert.strictEqual(html.match(/<link rel="canonical" href="([^"]*)"/)[1], BASE);
  assert.strictEqual(html.match(/<meta property="og:url" content="([^"]*)"/)[1], BASE);
  assert.ok(html.includes('<meta property="og:image" content="' + SITE + 'og/living.png">'));
  assert.ok(/<title>新卒の手取り計算2026｜初任給と新生活の家賃・生活費を試算<\/title>/.test(html));
});
c('I1-sisters', () => {
  const sec = html.match(/<section class="sisters"[\s\S]*?<\/section>/)[0];
  assert.strictEqual((sec.match(/aria-current="page"/g) || []).length, 1);
  assert.strictEqual((sec.match(/<li>/g) || []).length, 3);
  const tools = html.match(/<section class="tools"[\s\S]*?<\/section>/)[0];
  assert.strictEqual((tools.match(/<li>/g) || []).length, 3);
  assert.strictEqual((tools.match(/aria-current="page"/g) || []).length, 0);
});
c('I1-sitemap', () => { const x = fs.readFileSync(path.join(root, '..', 'sitemap.xml'), 'utf8'); assert.ok(x.includes('<loc>' + BASE + '</loc>')); assert.ok(x.includes('2026-11-18')); });
c('I1-robots', () => assert.ok(fs.readFileSync(path.join(root, '..', 'robots.txt'), 'utf8').includes('Sitemap: ' + SITE + 'sitemap.xml')));
c('I1-nojekyll', () => assert.ok(fs.existsSync(path.join(root, '..', '.nojekyll'))));
c('I1-no-local-site-files', () => ['sitemap.xml', 'robots.txt', '.nojekyll'].forEach((n) => assert.ok(!fs.existsSync(path.join(root, n)), n + ' must not exist')));
c('I1-links-config', () => {
  const ctx = {};
  vm.runInNewContext(rd('links-config.js'), { window: ctx });
  const LL = ctx.LIVING_LINKS;
  assert.deepStrictEqual(Object.keys(LL).sort(), ['bank', 'creditCard', 'internet', 'rentMove']);
  Object.keys(LL).forEach((k) => {
    assert.strictEqual(LL[k].label, 'PR');
    ['title', 'desc', 'cta'].forEach((f) => assert.ok(typeof LL[k][f] === 'string' && LL[k][f].length > 0));
    assert.ok(LL[k].url === '' || /^https:\/\//.test(LL[k].url));
  });
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
