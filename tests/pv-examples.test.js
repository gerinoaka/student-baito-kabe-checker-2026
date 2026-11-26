'use strict';
// 依存ゼロ。数値プレビュー（.pv / .qjump-chip / .mq）の「例」が、各ツールの logic に例の入力を通した結果と一致することを確かめる。
// 実行: node tests/pv-examples.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const logic = (file, name) => {
  const m = rd(file).match(/<script id="logic">([\s\S]*?)<\/script>/);
  assert.ok(m, file + ' logic');
  return vm.runInNewContext(m[1] + ';' + name, {});
};
const KABE = logic('index.html', 'KABE');
const KAKE = logic('kakemochi/index.html', 'KAKE');
const SHIFT = logic('shift-limit/index.html', 'SHIFT');
const LIVING = logic('living-cost-simulator/index.html', 'LIVING');
const NISA = logic('nisa-simulator/index.html', 'NISA');
const SCHOLAR = logic('scholarship/index.html', 'SCHOLAR');
const FURU = logic('furusato-calc/index.html', 'FURU');
const ES = logic('es-word-counter/index.html', 'ES');

let pass = 0, fail = 0;
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }
const comma = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const man = (n) => Math.round(n / 10000);

// ---- 例の入力 → logic の結果 ----
const kabe = KABE.judge({ ageGroup: 'a19_22', salary: 1080000, commute: 0 });
const otsu = KAKE.estimateOtsu({ monthly: 50000, months: 12 });
const kake = KAKE.calcRefund({ jobs: [{ pay: 900000, withheld: 0, nenmatsu: true }, { pay: 600000, withheld: otsu.value, nenmatsu: false }] });
const shift = SHIFT.calcShift({ wall: 'w150', hourly: 1100, cum: 0, monthsLeft: 12, commute: 0 });
const live = LIVING.takeHome({ mode: 'shakaijin', monthly: 220000, bonus: 0, region: 'tokyo', year: 1 });
const liveRent = LIVING.idealBudget(live.monthlyNet);
const nisa10 = NISA.simulate({ monthly: 10000, ratePct: 3, years: 10 });
const nisa5 = NISA.simulate({ monthly: 5000, ratePct: 3, years: 10 });
const sch = SCHOLAR.calcStd({ kind: '1', p1: 3000000, p2: 0, rate: 0, years: null });
const esText = 'あ'.repeat(368);
const esCnt = ES.count(esText).count;
const esPg = ES.progress(esCnt, 400);
const one = (x) => (Math.round(x / 1000) / 10).toFixed(1); // 円 → 万円（小数1桁）

const E = {
  kabe: '例：19〜22歳・年収' + man(1080000) + '万円→' + man(kabe.health.limit) + '万円の壁まで約' + man(kabe.health.remain) + '万円',
  kake: '例：甲欄90万円＋乙欄60万円（月5万円・源泉3.063%）→還付目安' + comma(kake.refund) + '円',
  shift: '例：時給1,100円・累計0円・残り12か月→150万円未満まで月' + shift.hoursMonth + '時間（週' + shift.weeklyHours.toFixed(1) + '時間）',
  live: '例：新社会人・額面月22万円（東京・賞与なし）→手取り約' + one(live.monthlyNet) + '万円・家賃目安' + one(liveRent.rent) + '万円（手取りの' + liveRent.ratios.rent + '%）',
  es: '例：400字制限・' + esCnt + '字入力→達成' + esPg.pct + '%',
  nisa: '例：月1万円×10年・年3%の仮定→約' + NISA.fmtMan(nisa10.finalValue) + '万円（元本' + NISA.fmtMan(nisa10.principal) + '万円）',
  sch: '例：第一種（無利子）300万円→標準' + sch.years + '年・月' + comma(sch.monthly) + '円',
  nisa5: '例：月5千円×10年・年3%の仮定→約' + NISA.fmtMan(nisa5.finalValue) + '万円（元本' + NISA.fmtMan(nisa5.principal) + '万円）',
  furu: '例：給与150万円・社会保険料0円→自己負担2,000円で済む寄附は約' + comma(FURU.calc({ salary: '1500000', shaho: '0', donation: '', kinro: false }).max.shown) + '円まで'
};
const CHIP = {
  tax: '例：年収' + man(1080000) + '万円→150万円まで約' + man(kabe.health.remain) + '万円',
  life: '例：額面月22万円→手取り約' + one(live.monthlyNet) + '万円',
  job: '例：400字制限に' + esCnt + '字→達成' + esPg.pct + '%',
  asset: '例：月1万円×10年・年3%→約' + NISA.fmtMan(nisa10.finalValue) + '万円'
};
const MQ = [
  ['年収の壁（19〜22歳・年収108万円）', '150万円まで約' + man(kabe.health.remain) + '万円'],
  ['掛け持ち還付（甲欄90万＋乙欄60万円）', '約' + comma(kake.refund) + '円'],
  ['シフト逆算（時給1,100円・150万円未満）', '月' + shift.hoursMonth + '時間'],
  ['手取り（新社会人・額面月22万円）', '約' + one(live.monthlyNet) + '万円'],
  ['ES文字数（400字制限）', esCnt + '字・達成' + esPg.pct + '%'],
  ['新NISA（月1万円×10年・年3%の仮定）', '約' + NISA.fmtMan(nisa10.finalValue) + '万円'],
  ['奨学金（第一種300万円）', '月' + comma(sch.monthly) + '円']
];

const PAGES = [];
(function w(d) { for (const f of fs.readdirSync(d)) { if (f === '.git' || f === 'node_modules') continue; const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (f === 'index.html') PAGES.push(path.relative(ROOT, p).split(path.sep).join('/')); } })(ROOT);

// ---- 例の前提が logic の結果として妥当か ----
c('P01 kabe: 19-22歳・108万円 → 健保扶養150万円まで420,000円', () => {
  assert.strictEqual(kabe.ok, true);
  assert.strictEqual(kabe.health.limit, 1500000);
  assert.strictEqual(kabe.health.remain, 420000);
  assert.strictEqual(man(kabe.health.remain), 42);
});
c('P02 kake: 乙欄3.063%・月5万円×12 = 18,372円 源泉 → 年税額0円・還付18,372円', () => {
  assert.strictEqual(otsu.value, 18372);
  assert.strictEqual(kake.ok, true);
  assert.strictEqual(kake.X, 1500000);
  assert.strictEqual(kake.annualTax, 0);
  assert.strictEqual(kake.kind, 'refund');
  assert.strictEqual(kake.refund, 18372);
});
c('P03 shift: 時給1,100円・累計0・残り12か月・150万円の壁 → 月113時間・週26.0時間', () => {
  assert.strictEqual(shift.status, 'room');
  assert.strictEqual(shift.hoursMonth, 113);
  assert.strictEqual(shift.weeklyHours, 26);
});
c('P04 living: 額面月22万円・東京・賞与なし・1年目 → 手取り18.6万円・家賃目安5.2万円（28%）', () => {
  assert.strictEqual(live.error, null);
  assert.strictEqual(one(live.monthlyNet), '18.6');
  assert.strictEqual(liveRent.ratios.rent, 28);
  assert.strictEqual(one(liveRent.rent), '5.2');
});
c('P05 es: 368字 / 400字 → 92%', () => { assert.strictEqual(esCnt, 368); assert.strictEqual(esPg.pct, 92); });
c('P06 nisa: 月1万円×10年・年3% → 約139万円（元本120万円）／月5千円 → 約70万円（元本60万円）', () => {
  assert.strictEqual(NISA.fmtMan(nisa10.finalValue), 139); assert.strictEqual(NISA.fmtMan(nisa10.principal), 120);
  assert.strictEqual(NISA.fmtMan(nisa5.finalValue), 70); assert.strictEqual(NISA.fmtMan(nisa5.principal), 60);
});
c('P07 scholarship: 第一種300万円 → 標準17年・月14,705円', () => {
  assert.strictEqual(sch.years, 17); assert.strictEqual(sch.monthly, 14705);
});

// ---- HTML 上のプレビュー文字列 ----
const pvs = (h) => [...h.matchAll(/<span class="pv"([^>]*)>([^<]*)<\/span>/g)].map((m) => m[2]);
const OLD = ['例：150万まで あと42万円', '例：還付目安 20,000円', '例：月82時間 / 週18.9時間', '例：手取り18.6万 / 家賃7.0万', '例：368 / 400字 (達成92%)', '例：月1万円×10年→約139万円', '例：月14,705円 / 完済39歳', '月5千円×10年→約70万円', '月1.47万円'];
c('P10 旧プレビュー文言が全17ページに残っていない', () => PAGES.forEach((p) => { const h = rd(p); OLD.forEach((o) => assert.ok(!h.includes(o), p + ' old ' + o)); assert.ok(!/class="pv nw"/.test(h), p + ' pv nw'); }));
c('P11 .pv の「例：」はすべて logic 由来の文言と一致（全17ページ）', () => PAGES.forEach((p) => {
  const ok = new Set(Object.values(E));
  pvs(rd(p)).filter((t) => t.startsWith('例：')).forEach((t) => assert.ok(ok.has(t), p + ' unknown pv: ' + t));
}));
c('P12 ツールを紹介する .pv は必ず「例：」と条件を持つ（tools/）', () => {
  const t = pvs(rd('tools/index.html'));
  Object.values(E).forEach((e) => assert.ok(t.includes(e), 'tools missing ' + e));
  t.filter((x) => /\d/.test(x) && !x.startsWith('例：')).forEach((x) => assert.ok(/(?:仕組み|手順|構成|試算表|決まり方|選択肢|配分|%・)/.test(x), 'non-example numeric pv: ' + x));
});
c('P13 各ツールのページの関連ツール欄に例が出る（15ページ共通）', () => {
  ['index.html', 'kakemochi/index.html', 'shift-limit/index.html', 'living-cost-simulator/index.html', 'nisa-simulator/index.html', 'scholarship/index.html', 'es-word-counter/index.html', 'guides/150-wall-guide/index.html', 'tools/index.html'].forEach((p) => {
    const t = pvs(rd(p));
    [E.kabe, E.kake, E.shift].forEach((e) => assert.ok(t.includes(e), p + ' missing ' + e));
  });
});
c('P14 NISA の例には「年3%の仮定」と「元本」が付く', () => {
  [E.nisa, E.nisa5, CHIP.asset].forEach((e) => assert.ok(/年3%/.test(e)));
  [E.nisa, E.nisa5].forEach((e) => assert.ok(/元本\d+万円/.test(e)));
  PAGES.forEach((p) => pvs(rd(p)).filter((t) => /NISA|月1万円|月5千円/.test(t) || /×10年/.test(t)).forEach((t) => assert.ok(/年3%の仮定/.test(t) && /元本/.test(t), p + ' ' + t)));
});
c('P15 qjump-chip は「例：」で、index と tools で logic 由来の値', () => ['index.html', 'tools/index.html'].forEach((p) => {
  const h = rd(p);
  const chips = [...h.matchAll(/<a href="([^"]*)" data-cat="(tax|life|job|asset)"><span class="nw">[^<]*<\/span><span class="qjump-chip nw">([^<]*)<\/span>/g)].filter((m) => m[1] !== '#cat-guides');
  assert.strictEqual(chips.length, 4, p + ' chips');
  chips.forEach((m) => assert.strictEqual(m[3], CHIP[m[2]], p + ' chip ' + m[2]));
  if (p === 'index.html') { const hr = Object.fromEntries(chips.map((m) => [m[2], m[1]])); assert.strictEqual(hr.asset, 'nisa-simulator/'); assert.strictEqual(hr.life, 'living-cost-simulator/'); }
}));
c('P16 .mq: 先頭に「計算例」・role=group・複製は aria-hidden・直下に注記', () => ['index.html', 'tools/index.html'].forEach((p) => {
  const h = rd(p);
  const m = h.match(/<div class="mq" role="group"[^>]*><div class="mq-track">([\s\S]*?)<\/div><\/div>\n<p class="mq-note">※数値は入力例です。実際の結果は入力で変わります。<\/p>/);
  assert.ok(m, p + ' mq structure');
  const sets = m[1].split('<div class="mq-set"').slice(1);
  assert.strictEqual(sets.length, 2);
  assert.ok(!/aria-hidden/.test(sets[0].split('>')[0]) && /aria-hidden="true"/.test(sets[1].split('>')[0]));
  sets.forEach((s) => {
    const items = [...s.matchAll(/<span class="mq-item[^"]*">(.*?)<\/span>(?=<span class="mq-item|<\/div>|$)/g)].map((x) => x[1]);
    assert.strictEqual(items[0], '計算例');
    MQ.forEach(([a, b], i) => assert.strictEqual(items[i + 1], a + ' <strong>' + b + '</strong>', p + ' mq item ' + i));
    assert.strictEqual(items.length, MQ.length + 1);
  });
  assert.strictEqual(sets[0].replace(/ aria-hidden="true"/, ''), sets[1].replace(/ aria-hidden="true"/, ''));
}));
c('P17 PR 表記はファーストビュー（.band）に残り、mq より前にある', () => ['index.html', 'tools/index.html'].forEach((p) => {
  const h = rd(p);
  const a = h.indexOf('プロモーション（PR）を含みます'), b = h.indexOf('class="mq"'), q = h.indexOf('class="qjump"');
  assert.ok(a > 0 && a < q && q < b, p + ' PR position');
}));

console.log('pass ' + pass + ' / fail ' + fail);
process.exit(fail ? 1 : 0);
