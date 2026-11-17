'use strict';
// 依存ゼロのテスト。kakemochi/index.html の <script id="logic"> を抽出して評価する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'kakemochi', 'index.html'), 'utf8');
const m = html.match(/<script id="logic">([\s\S]*?)<\/script>/);
if (!m) { console.error('logic script not found'); process.exit(1); }
const K = vm.runInNewContext(m[1] + ';KAKE', {});

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
// 1件・年末調整済み・W=0 が既定
const C = (pay, extra) => {
  extra = extra || {};
  return K.calcRefund({
    jobs: [{ pay, withheld: extra.w || 0, nenmatsu: extra.ny === undefined ? true : extra.ny }],
    social: extra.s, student: extra.student });
};

t('01', C(740999), { ok: true, G: 0, annualTax: 0 });
t('02', C(741000), { G: 1000, T: 0 });
t('03', C(1780000), { G: 1040000, T: 0, annualTax: 0 });
t('04', C(1781000), { T: 1000, baseTax: 50, annualTax: 0 });
t('05', C(1781999), { G: 1041999, T: 1000, annualTax: 0 });
t('06', C(1782000), { T: 2000, baseTax: 100, annualTax: 100 });
t('07', C(2000000), { G: 1260000, T: 220000, baseTax: 11000, annualTax: 11200 });
t('08', C(2060000), { G: 1320000, T: 280000, baseTax: 14000, annualTax: 14200 });
t('09', C(2060001), { ok: false, outOfScope: true });
t('10', C(2000000, { s: 100000 }), { T: 120000, annualTax: 6100 });
t('11', C(2000000, { s: 123456 }), { T: 96000, annualTax: 4900 });
t('12', C(2000000, { s: 300000 }), { T: 0, annualTax: 0 });
t('13', C(1630000, { student: true }), { studentDeduction: 270000, T: 0 });
t('14', C(1630001, { student: true }), { studentDeduction: 0 });
t('15', [C(2000000, { student: true }), C(2000000, { student: false })], { 0: { studentDeduction: 0, annualTax: 11200 }, 1: { studentDeduction: 0, annualTax: 11200 } });
t('16', K.calcRefund({ jobs: [{ pay: 600000, withheld: 0, nenmatsu: true }, { pay: 900000, withheld: 40000, nenmatsu: false }] }),
  { X: 1500000, W: 40000, annualTax: 0, refund: 40000, unadjustedPay: 900000, filing: { need: 'maybe_required', reason: 'unadjusted_over_200k', exemption150Candidate: true } });
t('17', C(2000000, { w: 11200 }), { kind: 'none', refund: 0, short: 0 });
t('18', C(2000000, { w: 11300 }), { refund: 100 });
t('19', C(2000000, { w: 11100 }), { short: 100, filing: { need: 'maybe_required', reason: 'short' } });
t('20', K.calcRefund({ jobs: [{ pay: 1000000, withheld: 0, nenmatsu: true }, { pay: 200000, withheld: 6000, nenmatsu: false }] }),
  { unadjustedPay: 200000, filing: { need: 'probably_not_required' } });
t('21', K.calcRefund({ jobs: [{ pay: 1000000, withheld: 0, nenmatsu: true }, { pay: 200001, withheld: 6000, nenmatsu: false }] }),
  { filing: { need: 'maybe_required', reason: 'unadjusted_over_200k' } });
t('22', C(1000000), { filing: { need: 'not_required', reason: 'all_adjusted' }, kind: 'none' });
t('23', C(1000000, { w: 5000, ny: false }), { refund: 5000, unadjustedPay: 1000000, filing: { need: 'maybe_required' } });
t('24', K.calcRefund({ jobs: [] }), { ok: false, errors: { 0: { field: 'jobs' } } });
t('25', K.calcRefund({ jobs: [1, 2, 3, 4, 5, 6].map(() => ({ pay: 100000, withheld: 0, nenmatsu: true })) }), { ok: false, errors: { 0: { field: 'jobs' } } });
t('26', C(null), { ok: false, errors: { 0: { field: 'jobs.0.pay' } } });
t('27', [C(-1), C(1.5)], { 0: { ok: false, errors: { 0: { field: 'jobs.0.pay' } } }, 1: { ok: false, errors: { 0: { field: 'jobs.0.pay' } } } });
t('28', C(100000000), { ok: false });
t('29', C(99999999), { ok: false, outOfScope: true });
t('30', K.calcRefund({ jobs: [{ pay: 100000, withheld: null, nenmatsu: true }] }), { ok: false, errors: { 0: { field: 'jobs.0.withheld' } } });
t('31', K.calcRefund({ jobs: [{ pay: 100000, withheld: 100001, nenmatsu: true }] }), { ok: false, errors: { 0: { field: 'jobs.0.withheld' } } });
t('32', C(1000000, { s: -1 }), { ok: false, errors: { 0: { field: 'social' } } });
t('33', K.calcRefund({ jobs: [{ pay: 1000000, withheld: 0, nenmatsu: true }], social: null }), { ok: true, S: 0 });
const E = (monthly, months) => K.estimateOtsu({ monthly, months });
t('34', [E(100000, 1), E(104999, 1), E(105000, 1), E(88000, 12), E(50000, 3), E(0, 1)],
  { 0: { ok: true, value: 3063 }, 1: { ok: true, value: 3216 }, 2: { ok: false, errors: { 0: { field: 'monthly' } } }, 3: { value: 32340 }, 4: { value: 4593 }, 5: { ok: true, value: 0 } });
t('35', [E(100000, 0), E(100000, 13), E(100000, 1.5)],
  { 0: { ok: false, errors: { 0: { field: 'months' } } }, 1: { ok: false, errors: { 0: { field: 'months' } } }, 2: { ok: false, errors: { 0: { field: 'months' } } } });

// ---- buildShare（Xシェア文面）
const R_REF = (w) => C(1000000, { w: w === undefined ? 5000 : w, ny: false });
const R_NONE = C(2000000, { w: 11200 });
const R_SHORT = C(2000000, { w: 11100 });
const BASE = 'https://gakusei-tools.com/';
t('bs01', [K.buildShare(R_REF()).text.includes('戻る'), K.buildShare(R_REF()).text.includes('還付')], { 0: true, 1: true });
t('bs02', K.buildShare(R_NONE).text.includes('ほぼありません'), true);
t('bs03', K.buildShare(R_SHORT).text.includes('追加で納める'), true);
{
  const bad = [];
  [R_REF(), R_REF(40000), R_NONE, R_SHORT].forEach((r, i) => {
    const tx = decodeURIComponent(K.buildShare(r).href.match(/text=([^&]*)/)[1]);
    if (/\d/.test(tx) || /万/.test(tx) || /円/.test(tx) || /あと/.test(tx)) bad.push(i + ':' + tx);
  });
  t('bs04', bad.join('|'), '');
}
t('bs05', K.buildShare(R_REF(5000)).text === K.buildShare(R_REF(40000)).text, true);
{
  const b = K.buildShare(R_REF()), CANON = K.DATA.CANON;
  t('bs06', b.href.indexOf('https://x.com/intent/tweet?text=') === 0 && b.href.indexOf('&url=' + encodeURIComponent(CANON)) > 0 &&
    b.href.indexOf('hashtags=' + ['掛け持ちバイト', '確定申告', '還付金'].map(encodeURIComponent).join(',')) > 0, true);
  t('bs07', [b.url === CANON, CANON === BASE + 'kakemochi/'], { 0: true, 1: true });
}
{
  const a = K.buildShare(R_REF()).text, b = K.buildShare(R_NONE).text, c = K.buildShare(R_SHORT).text;
  t('bs08', a !== b && b !== c && a !== c, true);
}
t('bs09', K.buildShare({ kind: 'x' }).text === K.buildShare(R_NONE).text, true);

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
