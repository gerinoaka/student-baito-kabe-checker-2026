'use strict';
// 依存ゼロのテスト。shift-limit/index.html の <script id="logic"> を抽出して評価する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'shift-limit', 'index.html'), 'utf8');
const m = html.match(/<script id="logic">([\s\S]*?)<\/script>/);
if (!m) { console.error('logic script not found'); process.exit(1); }
const S = vm.runInNewContext(m[1] + ';SHIFT', {});

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
// 既定: 時給1,100 / 通勤0 / 残り12か月
const C = (wall, o) => S.calcShift(Object.assign({ wall, hourly: 1100, monthsLeft: 12 }, o || {}));

t('01', C('w178', { cum: 0 }), { slot: 1780000, monthlyLimit: 148333, hoursMonth: 134, weeklyHours: 30.9 });
t('02', C('w136', { cum: 0 }), { slot: 1360000, monthlyLimit: 113333, hoursMonth: 103, weeklyHours: 23.7 });
t('03', C('w150', { cum: 0 }), { cap: 1499999, slot: 1499999, monthlyLimit: 124999, hoursMonth: 113, weeklyHours: 26.0 });
t('04', C('w150', { commute: 10000 }), { commuteYear: 120000, slot: 1379999, monthlyLimit: 114999, hoursMonth: 104, weeklyHours: 24.0 });
t('05', C('w136', { commute: 10000 }), { commuteYear: 0, slot: 1360000 });
t('06', C('w178', { commute: 10000 }), { slot: 1780000 });
t('07', C('w136', { cum: 1360000 }), { status: 'reached', exceeded: false, hoursMonth: 0 });
t('08', C('w136', { cum: 1360001 }), { status: 'reached', exceeded: true });
t('09', C('w136', { cum: 1359999, monthsLeft: 1 }), { status: 'room', slot: 1, monthlyLimit: 1, hoursMonth: 0, weeklyHours: 0 });
t('10', C('w150', { cum: 1499999 }), { slot: 0, status: 'reached', exceeded: false });
t('11', C('w150', { cum: 1499998 }), { slot: 1, status: 'room' });
t('12', C('w150', { cum: 1500000 }), { slot: -1, status: 'reached', exceeded: true });
t('13', C('w150', { cum: 1379999, commute: 10000 }), { slot: 0, status: 'reached' });
t('14', C('w150', { cum: 1379998, commute: 10000 }), { slot: 1, status: 'room' });
t('15', C('w178', { hourly: 1000, monthsLeft: 7 }), { monthlyLimit: 254285, hoursMonth: 254, weeklyHours: 58.6 });
t('16', C('w178', { hourly: 1200, cum: 1000000, monthsLeft: 6 }), { monthlyLimit: 130000, hoursMonth: 108, weeklyHours: 24.9 });
t('17', C('w178', { hourly: 99999 }), { hoursMonth: 1, weeklyHours: 0.2 });
t('18', C('w178', { monthsLeft: 1 }), { monthlyLimit: 1780000, hoursMonth: 1618 });
t('19', S.weeklyFromMonthly(0), { weekly: 0, over28: false });
t('20', S.weeklyFromMonthly(100), { weekly: 23.0, over28: false });
t('21', S.weeklyFromMonthly(121), { weekly: 27.9, over28: false });
t('22', S.weeklyFromMonthly(122), { weekly: 28.1, over28: true });
t('23', S.weeklyFromMonthly(104), { weekly: 24.0, over28: false });
t('24', S.defaultMonthsLeft(2026, 11), 1);
t('25', S.defaultMonthsLeft(2026, 12), 1);
t('26', S.defaultMonthsLeft(2026, 1), 11);
t('27', S.defaultMonthsLeft(2027, 3), 12);
t('28', C('x'), { ok: false, errors: { 0: { field: 'wall' } } });
t('29', C('w178', { hourly: 0 }), { ok: false, errors: { 0: { field: 'hourly' } } });
t('30', C('w178', { hourly: 1.5 }), { ok: false });
t('31', C('w178', { hourly: 100000 }), { ok: false });
t('32', C('w178', { hourly: null }), { ok: false, errors: { 0: { field: 'hourly' } } });
t('33', C('w178', { cum: -1 }), { ok: false, errors: { 0: { field: 'cum' } } });
t('34', C('w178', { cum: null }), { ok: true });
t('35', C('w178', { monthsLeft: 0 }), { ok: false, errors: { 0: { field: 'monthsLeft' } } });
t('36', C('w178', { monthsLeft: 13 }), { ok: false, errors: { 0: { field: 'monthsLeft' } } });
t('37', C('w150', { commute: -1 }), { ok: false, errors: { 0: { field: 'commute' } } });
t('38', C('w178', { hourly: 1000, monthsLeft: 1, intl: true }), { monthlyLimit: 1780000, hoursMonth: 1780, intl: { checked: true, over28: true } });
t('39', C('w178', { hourly: 1000, monthsLeft: 1, intl: false }), { intl: { checked: false, over28: true } });
t('40', S.WALLS, { w136: { limit: 1360000, useCommute: false, unit: 'ika' }, w150: { limit: 1500000, useCommute: true, unit: 'miman' }, w178: { limit: 1780000, useCommute: false, unit: 'ika' } });

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
