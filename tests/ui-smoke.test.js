'use strict';
// UIスモークテスト（依存ゼロ）。tests/dom-stub.js で3ページの <script id="ui"> を動かす。
const assert = require('node:assert');
const { load } = require('./dom-stub');

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }
const LK = (u) => ({
  tanpatsu: { url: u, label: 'PR', title: 'T1', desc: 'D1', cta: 'C1' },
  kakutei: { url: u, label: 'PR', title: 'T2', desc: 'D2', cta: 'C2' },
  note: { url: u, label: 'PR', title: 'T3', desc: 'D3', cta: 'C3' }
});
const ON = LK('https://example.com/x'), OFF = LK('');
const IDX = 'index.html', KK = 'kakemochi/index.html', SH = 'shift-limit/index.html';
const vis = (el) => !el.hidden;

// ---- U01
[IDX, KK, SH].forEach((p) => t('U01 ' + p, () => {
  const d = load(p);
  assert.strictEqual(d.$('result').getAttribute('data-state'), 'empty');
  assert.ok(d.$('resultBody').hidden); assert.ok(d.$('actions').hidden);
  assert.ok(d.doc.querySelectorAll('details.acc').every((x) => !x.open));
}));

// ---- index
const setSal = (d, v) => { d.type(d.$('salary'), v); };
t('U02 range -> salary/result', () => {
  const d = load(IDX);
  d.$('salaryRange').value = '1500000'; d.fire(d.$('salaryRange'), 'input');
  assert.strictEqual(d.$('salary').value, '1,500,000');
  assert.ok(vis(d.$('resultBody')));
  const exp = d.K('KABE').judge({ ageGroup: 'a19_22', salary: 1500000, commute: null, multiJob: false });
  assert.strictEqual(d.$('rCount').textContent, '超えた壁: ' + exp.summary.exceededCount + ' / 4');
  assert.strictEqual(d.$('result').getAttribute('data-state'), 'ready');
  assert.strictEqual(d.$('salaryRange').getAttribute('aria-valuetext'), '150万円');
  assert.ok(vis(d.$('actions')));
});
t('U03 chip', () => {
  const d = load(IDX);
  const chips = d.doc.querySelectorAll('#salaryChips button');
  d.click(chips.find((c) => c.getAttribute('data-v') === '1500000'));
  assert.strictEqual(d.$('salary').value, '1,500,000');
  assert.strictEqual(d.$('salaryRange').value, '1500000');
  chips.forEach((c) => assert.strictEqual(c.getAttribute('aria-pressed'), String(c.getAttribute('data-v') === '1500000')));
  assert.ok(/超えた壁: \d \/ 4/.test(d.$('rCount').textContent));
  d.click(chips.find((c) => c.getAttribute('data-v') === '1030000'));
  assert.strictEqual(d.$('rCount').textContent, '超えた壁: 0 / 4');
});
t('U04 typed salary', () => {
  const d = load(IDX); setSal(d, '1500000');
  assert.ok(vis(d.$('resultBody')));
  assert.strictEqual(d.$('salaryRange').value, '1500000');
  setSal(d, '1000000');
  assert.strictEqual(d.$('rCount').textContent, '超えた壁: 0 / 4');
});
t('U05 invalid midway keeps result', () => {
  const d = load(IDX); setSal(d, '1500000');
  const before = d.$('rCount').textContent;
  setSal(d, '15a');
  assert.strictEqual(d.$('rCount').textContent, before);
  assert.ok(d.$('e-salary').hidden);
  d.advance(1199); assert.ok(d.$('e-salary').hidden);
  d.advance(1);
  assert.ok(!d.$('e-salary').hidden);
  assert.strictEqual(d.$('salary').getAttribute('aria-invalid'), 'true');
  assert.strictEqual(d.$('rCount').textContent, before);
  assert.strictEqual(d.$('result').getAttribute('data-stale'), 'true');
  assert.ok(!d.$('staleNote').hidden);
  setSal(d, '1600000');
  assert.ok(d.$('e-salary').hidden); assert.strictEqual(d.$('result').getAttribute('data-stale'), 'false');
  setSal(d, '16x'); d.blur(d.$('salary'));
  assert.ok(!d.$('e-salary').hidden);
});
t('U06 empty keeps result, no error', () => {
  const d = load(IDX); setSal(d, '1500000');
  const before = d.$('rCount').textContent;
  setSal(d, ''); d.blur(d.$('salary')); d.advance(3000);
  assert.strictEqual(d.$('rCount').textContent, before);
  assert.ok(d.$('e-salary').hidden); assert.ok(vis(d.$('resultBody')));
  d.submit();
  assert.ok(!d.$('e-salary').hidden);
});
t('U07 submit no focus/scroll', () => {
  const d = load(IDX); setSal(d, '1500000');
  const before = d.$('rCount').textContent;
  const e = d.submit();
  assert.ok(e.defaultPrevented);
  assert.strictEqual(d.$('rCount').textContent, before);
  assert.strictEqual(d.calls.focus.length, 0);
  assert.strictEqual(d.calls.scroll.length, 0);
  d.type(d.$('salary'), '1600000'); d.click(d.doc.querySelectorAll('#salaryChips button')[0]); d.advance(2000);
  assert.strictEqual(d.calls.focus.length, 0); assert.strictEqual(d.calls.scroll.length, 0);
  d.doc._rect = () => ({ top: -100, bottom: 900 });
  d.submit(); assert.strictEqual(d.calls.scroll.length, 1);
});
t('U08 shareX', () => {
  const d = load(IDX); setSal(d, '1500000');
  const exp = d.K('KABE').buildShare(d.K('KABE').judge({ ageGroup: 'a19_22', salary: 1500000, commute: null, multiJob: false }));
  assert.strictEqual(d.$('shareX').href, exp.href);
  assert.ok(d.$('shareX').href.startsWith('https://x.com/intent/tweet?text='));
  const tx = decodeURIComponent(d.$('shareX').href.match(/text=([^&]*)/)[1]);
  assert.ok(!/1500000|150万|\d{3,}/.test(tx));
});
t('U09 PR index', () => {
  const d = load(IDX, { links: ON }); setSal(d, '1000000');
  assert.strictEqual(d.$('prCards').children.length, 0);
  d.advance(399); assert.strictEqual(d.$('prCards').children.length, 0);
  d.advance(1);
  const c = d.$('prCards').children[0];
  assert.ok(c, 'A card');
  assert.strictEqual(d.doc.querySelector('#prCards .pr-tag').textContent, 'PR');
  assert.strictEqual(d.doc.querySelector('#prCards .pr-disc').textContent, '広告を含みます');
  assert.strictEqual(d.doc.querySelector('#prCards a.pr-cta').getAttribute('rel'), 'sponsored nofollow noopener');
  assert.ok(!d.$('prNote').hidden);
  const e = load(IDX, { links: OFF }); setSal(e, '1000000'); e.advance(1000);
  assert.strictEqual(e.$('prCards').children.length, 0);
  // B: 150万超
  const g = load(IDX, { links: ON }); setSal(g, '1600000'); g.advance(400);
  assert.strictEqual(g.$('prCards').children.length, 1);
  assert.strictEqual(g.doc.querySelector('#prCards h3').textContent, 'T2');
  // 16-18歳には A を出さない
  const m = load(IDX, { links: ON }); m.click(m.doc.querySelector('input[value=a16_18]')); setSal(m, '1000000'); m.advance(400);
  assert.strictEqual(m.$('prCards').children.length, 0);
});
t('U16 liveSr throttled', () => {
  const d = load(IDX);
  const el = d.$('liveSr'); let n = 0;
  Object.defineProperty(el, 'textContent', { get() { return el.childNodes.map((x) => x.data).join(''); }, set(v) { n++; el.childNodes = v === '' ? [] : [{ nodeType: 3, data: String(v), parentNode: el }]; } });
  ['1000000', '1100000', '1200000', '1300000', '1400000'].forEach((v) => { setSal(d, v); d.advance(100); });
  assert.strictEqual(n, 0);
  d.advance(700);
  assert.strictEqual(n, 1); assert.ok(el.textContent.length > 5);
  setSal(d, '1400000'); d.advance(1000);
  assert.strictEqual(n, 1);
});
t('U17 reset index', () => {
  const d = load(IDX); setSal(d, '1500000'); setSal(d, '1a'); d.blur(d.$('salary'));
  d.click(d.$('rst')); d.advance(0);
  assert.strictEqual(d.$('result').getAttribute('data-state'), 'empty');
  assert.ok(d.$('e-salary').hidden); assert.ok(d.$('actions').hidden); assert.ok(d.$('resultBody').hidden);
  assert.strictEqual(d.$('salary').value, '');
  assert.strictEqual(d.$('result').getAttribute('data-stale'), 'false');
});
t('index: details closed / always-on elements', () => {
  const d = load(IDX);
  assert.ok(!d.$('advanced').open); assert.ok(!d.$('legal').open);
  assert.ok(d.doc.querySelector('.band')); assert.ok(d.doc.querySelector('footer a[href="#legal"]'));
  d.click(d.doc.querySelector('.band a')); assert.ok(d.$('legal').open);
});
t('index: helper -> apply', () => {
  const d = load(IDX);
  d.type(d.$('hCum'), '800000'); d.type(d.$('hMon'), '100000'); d.type(d.$('hLeft'), '2');
  assert.strictEqual(d.$('hOut').textContent, '見込み年収: 1,000,000円');
  d.click(d.$('hApply'));
  assert.strictEqual(d.$('salary').value, '1,000,000'); assert.ok(vis(d.$('resultBody')));
  assert.strictEqual(d.calls.focus.length, 0);
});
t('index: multi -> PR B + kakemochi link', () => {
  const d = load(IDX, { links: ON }); setSal(d, '1000000'); d.click(d.$('multi')); d.advance(400);
  assert.ok(!d.$('kkLink').hidden); assert.ok(d.$('prCards').children.length >= 1);
});

// ---- kakemochi
const kk = (d, i, pay, wh) => { d.type(d.$('j' + i + '-pay'), pay); d.type(d.$('j' + i + '-wh'), wh); };
t('U10 kakemochi realtime', () => {
  const d = load(KK);
  kk(d, 0, '500000', '10000');
  assert.ok(d.$('resultBody').hidden);
  d.type(d.$('j1-pay'), '500000'); assert.ok(d.$('resultBody').hidden);
  d.type(d.$('j1-wh'), '10000');
  assert.ok(vis(d.$('resultBody')));
  assert.strictEqual(d.$('rBig').textContent, '20,000円');
  assert.strictEqual(d.$('rLabel').textContent, '還付の目安');
  d.click(d.$('j1-z'));
  assert.strictEqual(d.$('j1-wh').value, '0'); assert.strictEqual(d.$('rBig').textContent, '10,000円');
  assert.ok(d.$('shareX').href.startsWith('https://x.com/intent/tweet'));
});
t('U11 kakemochi scope', () => {
  const d = load(KK); kk(d, 0, '1500000', '0'); kk(d, 1, '600000', '0');
  assert.strictEqual(d.$('result').getAttribute('data-state'), 'scope');
  assert.ok(!d.$('e-jobs').hidden); assert.ok(d.$('resultBody').hidden);
  d.type(d.$('j1-pay'), '100000');
  assert.strictEqual(d.$('result').getAttribute('data-state'), 'ready');
  assert.ok(d.$('e-jobs').hidden);
});
t('U12 kakemochi withheld > pay', () => {
  const d = load(KK); kk(d, 0, '500000', '10000'); kk(d, 1, '500000', '10000');
  const before = d.$('rBig').textContent;
  d.type(d.$('j0-wh'), '900000');
  assert.ok(d.$('e-j0-wh').hidden); d.advance(1200);
  assert.ok(!d.$('e-j0-wh').hidden); assert.strictEqual(d.$('rBig').textContent, before);
  assert.strictEqual(d.$('result').getAttribute('data-stale'), 'true');
});
t('kakemochi: add/delete rows, PR B, otsu, reset', () => {
  const d = load(KK, { links: ON });
  d.click(d.$('addJob')); assert.ok(d.$('j2-pay')); assert.strictEqual(d.$('otsuRow').children.length, 3);
  d.click(d.$('j2-del')); assert.strictEqual(d.$('j2-pay'), null);
  assert.strictEqual(d.doc.querySelectorAll('.job').length, 2);
  for (let i = 0; i < 5; i++) d.click(d.$('addJob'));
  assert.ok(d.$('addJob').disabled);
  d.click(d.$('rst')); d.advance(0); assert.strictEqual(d.doc.querySelectorAll('.job').length, 2);
  kk(d, 0, '500000', '10000'); kk(d, 1, '500000', '10000'); d.advance(400);
  assert.ok(!d.$('prWrap').hidden); assert.strictEqual(d.$('prCards').children.length, 1);
  assert.strictEqual(d.doc.querySelector('#prCards .pr-tag').textContent, 'PR');
  d.type(d.$('otsuMo'), '100000'); d.type(d.$('otsuMn'), '3'); d.$('otsuRow').value = '1'; d.click(d.$('otsuEst'));
  assert.strictEqual(d.$('j1-wh').value, '9189');
  d.click(d.$('rst')); d.advance(0);
  assert.strictEqual(d.$('result').getAttribute('data-state'), 'empty'); assert.ok(d.$('prWrap').hidden); assert.ok(d.$('actions').hidden);
});

// ---- shift
const hrs = (d, v) => d.type(d.$('hourly'), v);
t('U13 shift controls', () => {
  const d = load(SH);
  assert.strictEqual(d.$('left').value, '1'); assert.ok(d.$('leftDec').disabled);
  hrs(d, '1200');
  assert.ok(vis(d.$('resultBody')));
  const a = d.K('SHIFT').calcShift({ wall: 'w150', hourly: 1200, cum: null, monthsLeft: 1, commute: null });
  assert.strictEqual(d.$('rMonth').textContent, String(a.hoursMonth));
  d.click(d.$('w178')); const b = d.$('rMonth').textContent; assert.notStrictEqual(b, String(a.hoursMonth));
  d.$('hourlyRange').value = '1500'; d.fire(d.$('hourlyRange'), 'input');
  assert.strictEqual(d.$('hourly').value, '1,500');
  d.click(d.doc.querySelectorAll('#hourlyChips button')[0]); assert.strictEqual(d.$('hourly').value, '1,000');
  assert.strictEqual(d.doc.querySelectorAll('#hourlyChips button')[0].getAttribute('aria-pressed'), 'true');
  const m0 = d.$('rMonth').textContent;
  d.$('cumRange').value = '500000'; d.fire(d.$('cumRange'), 'input');
  assert.strictEqual(d.$('cum').value, '500,000'); assert.notStrictEqual(d.$('rMonth').textContent, m0);
  d.click(d.$('leftInc')); assert.strictEqual(d.$('left').value, '2'); assert.ok(!d.$('leftDec').disabled);
  for (let i = 0; i < 15; i++) d.click(d.$('leftInc'));
  assert.strictEqual(d.$('left').value, '12'); assert.ok(d.$('leftInc').disabled);
  d.click(d.$('leftDec')); assert.strictEqual(d.$('left').value, '11');
  d.type(d.$('left'), 'x'); d.click(d.$('leftInc')); assert.strictEqual(d.$('left').value, '2');
});
t('U14 shift cards / reached', () => {
  const d = load(SH); hrs(d, '1000');
  const cs = d.$('cCards').children;
  assert.strictEqual(cs.length, 3);
  assert.deepStrictEqual(cs.map((c) => c.getAttribute('aria-current')), [null, 'true', null]);
  d.click(d.$('w136')); assert.deepStrictEqual(d.$('cCards').children.map((c) => c.getAttribute('aria-current')), ['true', null, null]);
  d.click(d.$('w150')); d.type(d.$('cum'), '1499999');
  assert.ok(/到達済み/.test(d.$('cCards').children[1].textContent));
  assert.strictEqual(d.$('rMonth').textContent, '－'); assert.ok(!d.$('rState').hidden);
  d.type(d.$('cum'), '1500000'); assert.ok(/超過済み/.test(d.$('cCards').children[1].textContent));
  assert.ok(vis(d.$('roomGauge')));
});
t('U15 shift PR', () => {
  const d = load(SH, { links: ON }); hrs(d, '1200'); d.advance(1000);
  assert.strictEqual(d.$('prCards').children.length, 0); assert.ok(d.$('prWrap').hidden);
  d.click(d.$('age18')); d.advance(1000); assert.strictEqual(d.$('prCards').children.length, 0);
  d.click(d.$('age19')); d.advance(399); assert.strictEqual(d.$('prCards').children.length, 0);
  d.advance(1); assert.strictEqual(d.$('prCards').children.length, 1);
  assert.strictEqual(d.doc.querySelector('#prCards .pr-tag').textContent, 'PR');
  d.type(d.$('cum'), '1499999'); d.advance(1000);
  assert.strictEqual(d.$('prCards').children.length, 0);
  const e = load(SH, { links: OFF }); hrs(e, '1200'); e.click(e.$('age19')); e.advance(1000);
  assert.strictEqual(e.$('prCards').children.length, 0);
});
t('shift: errors delayed, submit, reset', () => {
  const d = load(SH); hrs(d, '1200');
  const before = d.$('rMonth').textContent;
  hrs(d, '12a'); assert.ok(d.$('e-hourly').hidden); d.advance(1200);
  assert.ok(!d.$('e-hourly').hidden); assert.strictEqual(d.$('rMonth').textContent, before);
  hrs(d, ''); d.submit(); assert.ok(!d.$('e-hourly').hidden);
  d.click(d.$('rst')); d.advance(0);
  assert.strictEqual(d.$('result').getAttribute('data-state'), 'empty'); assert.ok(d.$('e-hourly').hidden);
  assert.strictEqual(d.$('left').value, '1'); assert.strictEqual(d.$('w150').checked, true);
  assert.strictEqual(d.calls.focus.length, 0);
});
t('shift: intl warn and w150 warn', () => {
  const d = load(SH); hrs(d, '1000'); d.click(d.$('w178'));
  d.type(d.$('cum'), '0'); d.type(d.$('left'), '1'); d.click(d.$('intl'));
  assert.ok(d.$('rWarn').children.length >= 1);
});

// ---- 計測用画像（A8.net インプレッション）。カードが出たときだけ 1x1 img を出す
const A8_URL = 'https://px.a8.net/svt/ejp?a8mat=4BGNCK+C210S2+4JGQ+C4TB5';
const A8_IMP = 'https://www11.a8.net/0.gif?a8mat=4BGNCK+C210S2+4JGQ+C4TB5';
const imgs = (d) => d.doc.querySelectorAll('#prCards img');
const chkImg = (d) => {
  const card = d.doc.querySelector('#prCards .pr-card'); assert.ok(card, 'card');
  const a = card.querySelector('a.pr-cta');
  assert.strictEqual(a.getAttribute('href'), A8_URL); assert.strictEqual(a.getAttribute('rel'), 'sponsored nofollow noopener');
  const im = card.querySelectorAll('img'); assert.strictEqual(im.length, 1); assert.ok(card.contains(im[0]));
  assert.strictEqual(im[0].getAttribute('src'), A8_IMP);
  assert.strictEqual(im[0].getAttribute('width'), '1'); assert.strictEqual(im[0].getAttribute('height'), '1');
  assert.strictEqual(im[0].getAttribute('alt'), ''); assert.strictEqual(im[0].getAttribute('aria-hidden'), 'true');
};
t('IMP1 shipped links-config: kakutei url/imp set, others empty', () => {
  const d = load(IDX);
  assert.strictEqual(d.ctx.KABE_LINKS.kakutei.url, A8_URL); assert.strictEqual(d.ctx.KABE_LINKS.tanpatsu.url, ''); assert.strictEqual(d.ctx.KABE_LINKS.note.url, '');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(d.ctx.KABE_IMP)), { tanpatsu: '', kakutei: A8_IMP, note: '' });
});
t('IMP2 top over 1.5M: kakutei card + 1x1 img', () => {
  const d = load(IDX); setSal(d, '1600000'); d.advance(400); chkImg(d);
  const e = load(IDX); setSal(e, '1000000'); e.advance(1000);
  assert.strictEqual(e.$('prCards').children.length, 0); assert.strictEqual(imgs(e).length, 0);
});
t('IMP3 kakemochi result: kakutei card + 1x1 img', () => {
  const d = load(KK); kk(d, 0, '500000', '10000'); kk(d, 1, '500000', '10000'); d.advance(400); chkImg(d);
});
t('IMP4 empty url: no card, no img', () => {
  const d = load(IDX, { links: OFF }); d.ctx.KABE_IMP = { tanpatsu: A8_IMP, kakutei: A8_IMP, note: A8_IMP };
  setSal(d, '1600000'); d.advance(400);
  assert.strictEqual(d.$('prCards').children.length, 0); assert.strictEqual(imgs(d).length, 0);
});
t('IMP5 http:// imp: card yes, img no', () => {
  const d = load(IDX, { links: ON }); d.ctx.KABE_IMP = { tanpatsu: 'http://www11.a8.net/0.gif?x', kakutei: 'http://www11.a8.net/0.gif?x', note: '' };
  setSal(d, '1600000'); d.advance(400);
  assert.strictEqual(d.$('prCards').children.length, 1); assert.strictEqual(imgs(d).length, 0);
});
t('IMP6 KABE_IMP missing or empty: card yes, img no', () => {
  [undefined, {}, { kakutei: '' }, { kakutei: 5 }].forEach((v) => {
    const d = load(IDX, { links: ON }); d.ctx.KABE_IMP = v;
    setSal(d, '1600000'); d.advance(400);
    assert.strictEqual(d.$('prCards').children.length, 1); assert.strictEqual(imgs(d).length, 0);
  });
  const k = load(KK, { links: ON }); k.ctx.KABE_IMP = undefined; kk(k, 0, '500000', '10000'); kk(k, 1, '500000', '10000'); k.advance(400);
  assert.strictEqual(k.$('prCards').children.length, 1); assert.strictEqual(imgs(k).length, 0);
});
t('IMP7 shift-limit tanpatsu: imp only when set', () => {
  const d = load(SH, { links: ON }); d.ctx.KABE_IMP = { tanpatsu: A8_IMP }; hrs(d, '1200'); d.click(d.$('age19')); d.advance(1000);
  assert.strictEqual(d.$('prCards').children.length, 1); assert.strictEqual(imgs(d).length, 1);
  const e = load(SH, { links: ON }); hrs(e, '1200'); e.click(e.$('age19')); e.advance(1000);
  assert.strictEqual(e.$('prCards').children.length, 1); assert.strictEqual(imgs(e).length, 0);
});
t('IMP8 other 4 links-config: *_IMP exists, only "" or https', () => {
  const fs = require('fs'), path = require('path'), vm = require('vm');
  [['living-cost-simulator', 'LIVING_LINKS', 'LIVING_IMP'], ['es-word-counter', 'ES_LINKS', 'ES_IMP'], ['nisa-simulator', 'NISA_LINKS', 'NISA_IMP'], ['scholarship', 'SCHOLAR_LINKS', 'SCHOLAR_IMP'], ['.', 'KABE_LINKS', 'KABE_IMP']].forEach(([dir, L, I]) => {
    const w = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', dir, 'links-config.js'), 'utf8'), { window: w });
    assert.deepStrictEqual(Object.keys(w[I]).sort(), Object.keys(w[L]).sort(), dir + ' keys');
    Object.keys(w[I]).forEach((k) => { assert.ok(w[I][k] === '' || /^https:\/\//.test(w[I][k]), dir + ' ' + k); if (w[I][k]) assert.ok(/^https:\/\//.test(w[L][k].url), dir + ' imp without url ' + k); });
  });
});
t('IMP9 ES page: imp img only on shown card', () => {
  const d = load('es-word-counter/index.html');
  d.ctx.ES_LINKS = { shukatsuSite: { url: 'https://example.com/a', label: 'PR', title: 'T', desc: 'D', cta: 'C' }, agent: { url: '', label: 'PR', title: 'T', desc: 'D', cta: 'C' }, scout: { url: '', label: 'PR', title: 'T', desc: 'D', cta: 'C' } };
  d.ctx.ES_IMP = { shukatsuSite: A8_IMP, agent: A8_IMP, scout: '' };
  d.K(require('fs').readFileSync(require('path').join(__dirname, '..', 'es-word-counter/index.html'), 'utf8').match(/<script id="ui">([\s\S]*?)<\/script>/)[1]);
  assert.strictEqual(d.doc.querySelectorAll('#prCards .pr-card').length, 1); assert.strictEqual(imgs(d).length, 1);
});
console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
