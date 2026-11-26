'use strict';
// 依存ゼロのテスト。実行: node furusato-calc/tests/furusato-calc.test.js
// <script id="logic"> を vm で実行し、条文どおりに手計算した期待値と照合する。UI は tests/dom-stub.js で動かす。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const dir = path.join(__dirname, '..');
const root = path.join(dir, '..');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const BASE = 'https://gakusei-tools.com/furusato-calc/';
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }
const F = vm.runInNewContext(html.match(/<script id="logic">([\s\S]*?)<\/script>/)[1] + ';FURU', {});
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, (msg || '') + ' got ' + a + ' want ' + b);
const calc = (salary, o) => F.calc(Object.assign({ salary: String(salary), shaho: '', donation: '', kinro: false }, o || {}));

// ---- L01 給与所得（措置法29条の4。令和8年分・給与収入220万円以下）----
[[0, 0], [550000, 0], [690999, 0], [691000, 0], [740000, 0], [740999, 0], [741000, 1000], [1000000, 260000], [1190000, 450000], [1500000, 760000],
  [2190999, 1450999], [2191000, 1451000], [2192999, 1451000], [2193000, 1453000], [2195999, 1453000], [2196000, 1456000], [2199999, 1456000], [2200000, 1460000]]
  .forEach(([s, g]) => t('L01 kyuyo ' + s, () => assert.strictEqual(F.kyuyo(s), g)));

// ---- L02 期待値表（設計メモ＋今回の一次情報確認）----
// [給与, 勤労学生, 給与所得, 課税所得, 調整控除, 所得割(調整控除後), 最終の所得割, 特例分の上限, 割合, 上限の寄附(計算), 表示]
[
  [1200000, false, 460000, 30000, 1500, 1500, 1500, 300, 0.9, 2333, 2300],
  [1500000, false, 760000, 330000, 2500, 30500, 30500, 6100, 0.9, 8777, 8700],
  [1500000, true, 760000, 70000, 3000, 4000, 4000, 800, 0.9, 2888, 2800],
  [1630000, true, 890000, 200000, 3000, 17000, 17000, 3400, 0.9, 5777, 5700],
  [1780000, false, 1040000, 610000, 2500, 58500, 58500, 11700, 0.84895, 15781, 15700],
  [2000000, false, 1260000, 830000, 2500, 80500, 80500, 16100, 0.84895, 20964, 20900],
  [2200000, false, 1460000, 1030000, 2500, 100500, 100500, 20100, 0.84895, 25676, 25600]
].forEach(([s, k, G, T, adj, A, w, cap, rate, ex, sh]) => t('L02 table ' + s + (k ? '+kinro' : ''), () => {
  const r = calc(s, { kinro: k }); assert.ok(r.ok); const b = r.b;
  assert.strictEqual(b.G, G); assert.strictEqual(b.T, T); assert.strictEqual(b.adj, adj); assert.strictEqual(b.A, A); assert.strictEqual(b.wari, w);
  near(b.cap, cap, 'cap'); assert.strictEqual(b.rate, rate); assert.strictEqual(r.max.exact, ex); assert.strictEqual(r.max.shown, sh);
  assert.strictEqual(b.hikazei, false); assert.strictEqual(b.adjBand, false); assert.strictEqual(b.kinroOut, false);
}));

// ---- L03 所得割の非課税（附則3条の3第1項・単身扶養なし: 総所得金額等45万円以下）----
[0, 500000, 1000000, 1190000].forEach((s) => t('L03 hikazei ' + s, () => {
  const r = calc(s, { donation: '30000' }); assert.ok(r.b.hikazei); assert.strictEqual(r.b.wari, 0); assert.ok(r.max.none); assert.strictEqual(r.atMax, null);
  assert.strictEqual(r.atDon.onestop.total, 0); assert.strictEqual(r.atDon.onestop.burden, 30000); assert.strictEqual(r.atDon.kakutei.burden, 30000);
}));
// ---- L04 非課税限度額付近の調整（附則3条の3第2項・第5項）----
t('L04 adjustment band 1,191,000', () => {
  const r = calc(1191000, { donation: '2233' }); const b = r.b;
  assert.strictEqual(b.G, 451000); assert.strictEqual(b.T, 21000); assert.strictEqual(b.A, 1050); assert.strictEqual(b.L, 1000); assert.strictEqual(b.wari, 1000); assert.ok(b.adjBand);
  // 寄附2,233円: 基本分23.3円＋特例分min(209.7, 210)＝233円。所得割 min(1,050−233, 1,000)＝817円 → 減るのは183円
  near(r.atDon.onestop.jumin, 183); near(r.atDon.onestop.burden, 2050);
  // 寄附50円分までは控除しても所得割は1,000円のまま
  near(F.benefit(b, 2050, 'onestop').jumin, 0);
});
t('L04b no adjustment just above the band', () => { const b = calc(1192000).b; assert.strictEqual(b.A, 1100); assert.strictEqual(b.L, 2000); assert.strictEqual(b.adjBand, false); assert.strictEqual(b.wari, 1100); });

// ---- L05 記事3（guides/furusato-gakusei/）の表と一致 ----
[[8700, 6700, 2000], [10000, 6900, 3100], [30000, 8900, 21100]].forEach(([d, ded, bur]) => t('L05 article3 ' + d, () => {
  const r = calc(1500000, { donation: String(d) });
  ['onestop', 'kakutei'].forEach((m) => { assert.strictEqual(Math.round(r.atDon[m].total), ded, m); assert.strictEqual(Math.round(r.atDon[m].burden), bur, m); });
}));

// ---- L06 特例分の割合（37条の2第11項）: 人的控除差調整額＝5万(+1万)＋(104万−48万) ----
t('L06 J', () => { assert.strictEqual(calc(1500000).b.J, 610000); assert.strictEqual(calc(1500000, { kinro: true }).b.J, 620000); });
t('L06b rate switches at X=0 (salary 1,780,000 -> 1,779,000)', () => {
  assert.strictEqual(calc(1780000).b.X, 0); assert.strictEqual(calc(1780000).b.rate, 0.84895);
  assert.strictEqual(calc(1779999).b.X, -1000); assert.strictEqual(calc(1779999).b.rate, 0.9);
});
t('L06c X equals income-tax taxable income when >= 0', () => [1790000, 1900000, 2000000, 2200000].forEach((s) => [false, true].forEach((k) => [0, 30000].forEach((h) => {
  const b = calc(s, { kinro: k, shaho: String(h) }).b; if (b.X >= 0) assert.strictEqual(b.X, b.itT, s + ' ' + k + ' ' + h);
}))));
t('L06d kinro: 所得税の課税所得 = G − 104万 − 27万', () => { const b = calc(2000000, { kinro: true }).b; assert.strictEqual(b.kinroOK, false); assert.strictEqual(b.kinroOut, true); assert.strictEqual(b.itT, 220000); });

// ---- L07 所得税（令和8年分）と確定申告・ワンストップ ----
t('L07 income tax 2,000,000', () => { const b = calc(2000000).b; assert.strictEqual(b.itT, 220000); assert.strictEqual(b.itTax, 11231); });
t('L07b onestop at max: burden 2,000 (84.895% + 申告特例控除額)', () => [1790000, 2000000, 2200000].forEach((s) => {
  const r = calc(s); near(r.atMax.onestop.shinkoku, r.atMax.onestop.tokurei * 5.105 / 84.895);
  assert.ok(Math.abs(r.atMax.onestop.burden - 2000) < 0.01, s + ' ' + r.atMax.onestop.burden);
}));
t('L07c kakutei at 1,780,000: income tax 0 -> burden over 2,000', () => {
  const r = calc(1780000); assert.strictEqual(r.b.itT, 0); assert.strictEqual(r.atMax.kakutei.it, 0); assert.strictEqual(r.atMax.kakutei.shinkoku, 0);
  near(r.atMax.kakutei.burden, 2000 + (15700 - 2000) * (1 - 0.1 - 0.84895));
});
t('L07d 90% band has no 申告特例控除額', () => { const r = calc(1500000); assert.strictEqual(r.atMax.onestop.shinkoku, 0); });
t('L07e credit never exceeds 所得割 / 30% cap of base', () => {
  const r = calc(1200000, { donation: '200000' }); const o = r.atDon.onestop;
  assert.ok(o.credit <= r.b.A); near(o.base, (Math.min(200000, 460000 * 0.3) - 2000) * 0.1); assert.strictEqual(o.jumin, 1500);
});
t('L07f donation <= 2,000', () => [0, 1000, 2000].forEach((d) => { const r = calc(1500000, { donation: String(d) }); assert.strictEqual(r.atDon.onestop.total, 0); assert.strictEqual(r.atDon.onestop.burden, d); }));
t('L07g burden over cap grows by the uncovered part', () => {
  const r = calc(1500000, { donation: '20000' }); near(r.atDon.onestop.total, 1800 + 6100); near(r.atDon.onestop.burden, 20000 - 7900);
});
t('L07h shaho lowers 所得割', () => { const b = calc(1500000, { shaho: '200000' }).b; assert.strictEqual(b.T, 130000); assert.strictEqual(b.A, 13000 - 2500); });
t('L07i shaho makes T=0 but not hikazei', () => { const r = calc(1300000, { shaho: '200000' }); assert.strictEqual(r.b.hikazei, false); assert.strictEqual(r.b.T, 0); assert.strictEqual(r.b.wari, 0); assert.ok(r.max.none); });

// ---- L08 入力チェック ----
t('L08 parse', () => { assert.strictEqual(F.parseYen('１，５００，０００円'), 1500000); assert.strictEqual(F.parseYen(' 1500000 '), 1500000); assert.strictEqual(F.parseYen(''), null); assert.ok(isNaN(F.parseYen('1.5'))); assert.ok(isNaN(F.parseYen('-1'))); });
t('L08b errors', () => {
  assert.ok(calc('').errors.salary); assert.ok(calc('abc').errors.salary); assert.ok(calc(2200001).errors.salary); assert.ok(/対象外/.test(calc(2200001).errors.salary));
  assert.ok(calc(1500000, { shaho: '2200001' }).errors.shaho); assert.ok(calc(1500000, { donation: '10000001' }).errors.donation); assert.ok(calc(1500000, { donation: 'x' }).errors.donation);
  assert.ok(calc(2200000).ok); assert.ok(calc(0).ok); assert.strictEqual(calc(1500000, { shaho: '' }).b.shaho, 0);
});
t('L08c monotone: 上限の寄附は給与が増えると減らない（勤労学生なし・社保0）', () => { let prev = 0; for (let s = 1191000; s <= 2200000; s += 1000) { const r = calc(s); const v = r.max.none ? 0 : r.max.exact; assert.ok(v >= prev - 1, s + ' ' + v + ' < ' + prev); prev = v; } });

// ---- S 静的検査 ----
const attr = (re) => { const m = html.match(re); assert.ok(m, 'missing ' + re); return m[1]; };
const markup = html.replace(/<style>[\s\S]*?<\/style>/, '');
t('S01 canonical / og:url / BASE', () => { assert.strictEqual(attr(/<link rel="canonical" href="([^"]*)"/), BASE); assert.strictEqual(attr(/<meta property="og:url" content="([^"]*)"/), BASE); assert.strictEqual(F.BASE, BASE); });
t('S02 title / description / og / twitter', () => {
  const ti = attr(/<title>([^<]+)<\/title>/), de = attr(/<meta name="description" content="([^"]*)"/);
  assert.ok(de.length >= 80); assert.strictEqual(attr(/<meta property="og:title" content="([^"]*)"/), ti); assert.strictEqual(attr(/<meta name="twitter:title" content="([^"]*)"/), ti);
  assert.strictEqual(attr(/<meta property="og:description" content="([^"]*)"/), de); assert.strictEqual(attr(/<meta name="twitter:description" content="([^"]*)"/), de);
  assert.strictEqual(attr(/<meta property="og:image" content="([^"]*)"/), 'https://gakusei-tools.com/og/kabe.png'); assert.ok(fs.existsSync(path.join(root, 'og/kabe.png')));
  assert.ok(html.includes('<meta name="google-adsense-account" content="ca-pub-5481087816228542">'));
});
t('S03 shared css identical to root', () => { const c = (h) => h.match(/\/\*ds:start v1\*\/[\s\S]*?\/\*ds:end\*\//)[0]; assert.strictEqual(c(html), c(rd('index.html'))); });
t('S04 scripts', () => {
  const sc = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1].trim());
  assert.deepStrictEqual(sc, ['type="application/ld+json"', 'type="application/ld+json"', 'id="logic"', 'id="ui"', 'src="../assets/ui-motion.js" defer', 'src="../site-config.js" defer']);
  ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'indexedDB', 'new Function'].forEach((w) => assert.ok(!html.includes(w), w));
});
t('S05 no PR cards / affiliate / ad markup / share', () => ['links-config.js', 'prCards', 'px.a8.net', 'a8mat', 'rel="sponsored', 'class="pr-', 'ad-slot', 'shareX', 'furusato-tax', 'satofull', 'rakuten', 'ふるなび', 'さとふる', '楽天'].forEach((w) => assert.ok(!markup.includes(w), w)));
t('S06 band / PR / last confirmed', () => {
  const band = attr(/(<div class="band"[\s\S]*?<\/div>)/);
  assert.ok(band.includes('目安です。対象：2026年中の寄附（令和9年度の住民税・令和8年分の所得税）／最終確認日 2026-11-26<br>※当サイトのツールにはプロモーション（PR）を含みます'));
  assert.strictEqual(F.DATA.LAST_CONFIRMED, '2026-11-26');
});
t('S07 size / ids / skip / theme-color / one h1 / nav', () => {
  assert.ok(Buffer.byteLength(html, 'utf8') <= 102400);
  const ids = [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]); assert.strictEqual(new Set(ids).size, ids.length);
  assert.ok(html.includes('<a class="skip" href="#main">') && html.includes('<main id="main">'));
  assert.ok(html.includes('<meta name="theme-color" content="#f8fafc">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">'));
  assert.strictEqual((html.match(/<h1\b/g) || []).length, 1); assert.ok(html.includes('<a href="./" aria-current="page">ふるさと納税の目安</a>'));
  assert.ok(html.includes('<body data-cat="tax">'));
});
t('S08 every $(id) used by ui exists', () => {
  const ui = html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1];
  const used = new Set([...ui.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)].map((m) => m[1]));
  ['salary', 'shaho', 'donation'].forEach((f) => { used.add(f); used.add('e-' + f); });
  used.forEach((id) => assert.ok(html.includes('id="' + id + '"'), id));
});
t('S09 links: relative resolve, external only https in #sources (allowlisted hosts)', () => {
  const body = html.replace(/<!--[\s\S]*?-->/g, '');
  const src = body.match(/<section id="sources">[\s\S]*?<\/section>/)[0];
  const outside = body.replace(src, '');
  const hrefs = [...outside.matchAll(/<a\b[^>]*?\bhref="([^"]*)"/g)].map((m) => m[1]);
  hrefs.forEach((x) => {
    assert.ok(!/^https?:/.test(x), 'external outside sources ' + x);
    if (x.startsWith('#') || x.startsWith('mailto:')) return;
    assert.ok(fs.existsSync(path.join(path.resolve(dir, x.split('#')[0]), 'index.html')), 'resolve ' + x);
  });
  const ext = [...src.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);
  assert.strictEqual(ext.length, 10);
  ext.forEach((u) => assert.ok(/^https:\/\/(www\.soumu\.go\.jp|www\.nta\.go\.jp|laws\.e-gov\.go\.jp|www\.city\.koto\.lg\.jp)\//.test(u), u));
  assert.ok(!/<a\b[^>]*target="_blank"(?![^>]*rel="noopener noreferrer")[^>]*>/.test(body), 'noopener');
});
t('S10 FAQ html == JSON-LD (3)', () => {
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.strictEqual(ld[0]['@type'], 'WebApplication'); assert.strictEqual(ld[0].url, BASE);
  const sec = html.match(/<section id="faq" class="faq">([\s\S]*?)<\/section>/)[1];
  const qs = [...sec.matchAll(/<h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p>/g)].map((m) => [m[1], m[2]]);
  assert.strictEqual(qs.length, 3); assert.strictEqual(ld[1].mainEntity.length, 3);
  qs.forEach((q, i) => { assert.strictEqual(ld[1].mainEntity[i].name, q[0]); assert.strictEqual(ld[1].mainEntity[i].acceptedAnswer.text, q[1]); });
});
t('S11 FAQ numbers come from logic', () => {
  const sec = html.match(/<section id="faq" class="faq">([\s\S]*?)<\/section>/)[1];
  const r = calc(1500000), k = calc(1500000, { kinro: true });
  const c = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  ['所得割は' + c(r.b.wari) + '円', '上限は' + c(r.b.cap) + '円', '約' + c(r.max.shown) + '円まで', '約' + c(k.max.shown) + '円まで', '給与収入119万円以下'].forEach((w) => assert.ok(sec.includes(w), w));
  assert.ok(calc(1190000).b.hikazei && !calc(1191000).b.hikazei);
});
t('S12 rel aside: 7 links, all resolve, no about/tools', () => {
  const aside = html.match(/<aside class="rel"[\s\S]*?<\/aside>/)[0];
  const hrefs = [...aside.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(hrefs, ['../', '../kakemochi/', '../shift-limit/', '../living-cost-simulator/', '../scholarship/', '../nisa-simulator/', '../es-word-counter/']);
  hrefs.forEach((x) => assert.ok(fs.existsSync(path.join(path.resolve(dir, x), 'index.html')), x));
});
t('S13 footer links', () => {
  const m = html.match(/<p class="foot-links">([\s\S]*?)<\/p>/)[1];
  ['#legal', '../privacy/', '../about/', '../tools/'].forEach((x) => assert.ok(m.includes('href="' + x + '"'), x));
  assert.ok(m.includes('gakusei.kabe.checker@gmail.com'));
  assert.ok(!html.includes('A8.net'), 'no A8 privacy text (no PR cards)');
});
t('S14 no pushy wording / required notes', () => {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '');
  ['おすすめ', '今すぐ', 'お得', '実質無料', '必ず', '全額戻る', '絶対'].forEach((w) => assert.ok(!text.includes(w), w));
  ['寄附をすすめるツールではなく', '均等割', '市区町村の住民税の担当部署', '給与が220万円を超える人', '18歳以上', '84.895%', '附則第3条の3', '第37条の2第11項'].forEach((w) => assert.ok(text.includes(w), w));
});

// ---- U UI（tests/dom-stub.js）----
const { load } = require(path.join(root, 'tests/dom-stub.js'));
const P = 'furusato-calc/index.html';
t('U01 initial render 1,500,000', () => {
  const d = load(P);
  assert.strictEqual(d.$('rBig').textContent, '約8,700円');
  assert.strictEqual(d.$('stWari').textContent, '30,500円'); assert.strictEqual(d.$('stCap').textContent, '6,100円'); assert.strictEqual(d.$('stRate').textContent, '90%'); assert.strictEqual(d.$('stIt').textContent, '0円');
  assert.ok(d.$('hikazeiMsg').hidden && d.$('adjMsg').hidden && d.$('kinroMsg').hidden && d.$('itMsg').hidden && d.$('zeroMsg').hidden);
  assert.strictEqual(d.$('tblBody').childNodes.length, 2); assert.ok(!d.$('tblWrap').hidden);
  assert.ok(d.$('stepList').childNodes.length >= 7); assert.ok(d.$('liveSr').textContent.includes('約8,700円'));
  assert.strictEqual(d.doc.querySelectorAll('#sChips button').filter((b) => b.getAttribute('aria-pressed') === 'true').length, 1);
});
t('U02 chip 100万 -> なし + hikazei', () => {
  const d = load(P); d.click(d.doc.querySelectorAll('#sChips button')[0]); assert.strictEqual(d.doc.querySelectorAll('#sChips button').length, 6);
  assert.strictEqual(d.$('salary').value, '1000000'); assert.strictEqual(d.$('rBig').textContent, 'なし'); assert.ok(!d.$('hikazeiMsg').hidden); assert.ok(!d.$('ngBadge').hidden); assert.ok(d.$('okBadge').hidden);
  assert.ok(d.$('tblWrap').hidden);
});
t('U03 kinro + donation', () => {
  const d = load(P); d.click(d.$('kinroY')); assert.strictEqual(d.$('rBig').textContent, '約2,800円');
  d.type(d.$('donation'), '10000'); assert.strictEqual(d.$('tblBody').childNodes.length, 4);
  const r = calc(1500000, { kinro: true, donation: '10000' });
  assert.ok(d.$('tblBody').textContent.includes(String(Math.round(r.atDon.onestop.burden)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '円'));
});
t('U04 kinro out + income tax band', () => {
  const d = load(P); d.click(d.$('kinroY')); d.type(d.$('salary'), '2000000');
  assert.ok(!d.$('kinroMsg').hidden); assert.ok(!d.$('itMsg').hidden); assert.strictEqual(d.$('stRate').textContent, '84.895%'); assert.strictEqual(d.$('rBig').textContent, '約20,900円'); assert.strictEqual(d.$('stIt').textContent, '約11,231円');
});
t('U05 error keeps previous result (stale)', () => {
  const d = load(P); d.type(d.$('salary'), '3000000');
  assert.ok(!d.$('e-salary').hidden); assert.strictEqual(d.$('salary').getAttribute('aria-invalid'), 'true'); assert.ok(!d.$('staleNote').hidden); assert.strictEqual(d.$('result').getAttribute('data-stale'), 'true'); assert.strictEqual(d.$('rBig').textContent, '約8,700円');
  d.type(d.$('salary'), '1191000'); assert.ok(d.$('e-salary').hidden); assert.ok(!d.$('adjMsg').hidden); assert.strictEqual(d.$('stWari').textContent, '1,000円');
});
t('U06 shaho -> zero (not hikazei)', () => { const d = load(P); d.type(d.$('salary'), '1300000'); d.type(d.$('shaho'), '200000'); assert.ok(!d.$('zeroMsg').hidden); assert.ok(d.$('hikazeiMsg').hidden); assert.strictEqual(d.$('rBig').textContent, 'なし'); });

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
