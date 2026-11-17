'use strict';
// 総点検の是正＋AdSense審査前の整備（2026-11-18）の追加テスト H01〜H17、全14ページ横断チェック H18〜H20。依存ゼロ。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const BASE = 'https://gakusei-tools.com/';
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }
const ds = (h) => { const m = h.match(/\/\*ds:start v1\*\/[\s\S]*?\/\*ds:end\*\//); assert.ok(m, 'ds block'); return m[0]; };
const attr = (h, re) => { const m = h.match(re); assert.ok(m, 'missing ' + re); return m[1]; };
const ldBlocks = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

const TOOLS = ['index.html', 'kakemochi/index.html', 'shift-limit/index.html', 'living-cost-simulator/index.html', 'es-word-counter/index.html', 'nisa-simulator/index.html', 'scholarship/index.html'];
const GUIDES = ['guides/150-wall-guide/index.html', 'guides/kakemochi-tax-guide/index.html', 'guides/es-star-method/index.html', 'guides/student-nisa-start/index.html'];
const INFO = ['about/index.html', 'tools/index.html', 'privacy/index.html'];
const ALL = TOOLS.concat(GUIDES, INFO);
const rel = (p) => (p === 'index.html' ? '' : p.startsWith('guides/') ? '../../' : '../');

// 第3章の title / description
const META = {
  'index.html': ['学生バイトの年収の壁2026｜扶養は178万・150万？無料判定', '令和8年分、学生バイトの所得税は給与収入178万円以下なら0円が目安。年末調整・扶養の確認に、親の控除136万円と健保の扶養150万円、住民税の壁まであと何万円かを無料で判定します。', 'kabe'],
  'kakemochi/index.html': ['掛け持ちバイトの還付金計算2026｜乙欄で引かれた税金は戻る？', '掛け持ちバイトの乙欄で引かれた税金は、年税額より多ければ確定申告で還付される場合があります。支払金額と源泉徴収税額を入れて、令和8年分の還付金の目安を計算。年末調整後の確認にも使えます。', 'kakemochi'],
  'shift-limit/index.html': ['時給×シフト逆算2026｜年末まで壁を超えない月・週の時間', '年収の壁を超えないために、あと月何時間・週何時間まで働けるかを時給から逆算します。11〜12月の年末に向けて、136万・150万・178万の壁までの残り時間を無料で計算できます。', 'kabe'],
  'living-cost-simulator/index.html': ['新卒の手取り計算2026｜初任給と新生活の家賃・生活費を試算', '新卒の手取りは、額面から社会保険料・所得税・住民税を引いた額が目安。初任給や新生活（2〜3月）の家賃・食費など一人暮らしの生活費配分と、毎月の貯金額を無料で試算できます。令和8年度対応。', 'living'],
  'es-word-counter/index.html': ['就活ES文字数カウント｜ガクチカの8割目安・原稿用紙換算', 'ESの文字数は指定字数の8〜9割が目安（就活メディアの経験則）。ガクチカの文字数をリアルタイムでカウントし、原稿用紙換算と構成のヒントも表示。登録不要で、入力内容は送信も保存もされません。', 'es'],
  'nisa-simulator/index.html': ['大学生の新NISA積立シミュレーター｜月1万円積立の試算', '新NISAの積立結果は、月額・想定利回り・期間で大きく変わります。大学生がバイト代の一部を積み立てる場合の試算を、グラフで確認できます。税・手数料は含まず、元本割れの可能性があり結果は保証されません。', 'nisa'],
  'scholarship/index.html': ['奨学金（JASSO）返済シミュレーター｜月額と完済年齢を計算', '奨学金（JASSO）の毎月の返還額は、借入総額・返還年数・利率で決まります。第一種・第二種に対応し、月額・返還回数・完済年齢・総返還額を計算。就職前の返済計画に。令和8年度の返還年数算出表をもとにした目安です。', 'scholarship'],
  'guides/150-wall-guide/index.html': ['150万円を超えそうな大学生へ｜扶養を外れる手続きと親への説明', '大学生のバイト収入が150万円（健保の扶養）に近づいたら、事業主の証明で一時的に超えられる場合と、扶養を外れる場合があります。年末に向けた手続きの流れ、親の税金との関係、親への説明手順を整理しました。令和8年分。', 'kabe'],
  'guides/kakemochi-tax-guide/index.html': ['バイトの掛け持ちで乙欄に｜確定申告で還付を受ける手順と必要書類', '掛け持ちバイトで乙欄になり税金を多く引かれたときは、確定申告で還付を受けられる場合があります。源泉徴収票の集め方、申告書の作成手順、還付金の振込時期の目安、よくある失敗を整理しました。令和8年分。', 'kakemochi'],
  'guides/es-star-method/index.html': ['ガクチカの書き方｜構成の型と文字数ごとの配分例（400字）', 'ガクチカは「結論→状況→課題→行動→結果」の型で書くと整理しやすいです。200〜600字の配分例と、足りない・多いときの調整のコツ、提出前チェックリストを掲載。8割の目安は経験則で、合否の保証はありません。', 'es'],
  'guides/student-nisa-start/index.html': ['大学生が新NISAを始める前に｜月5,000円の試算例と口座開設', '大学生が新NISAを始める前の基礎知識。月5,000円・年3%・10年の試算例（元本60万円、評価額約70万円）、口座開設の条件、1人1口座と金融機関変更のルールを整理。元本割れの可能性があり、結果は保証されません。', 'nisa'],
  'about/index.html': ['運営者情報・計算方針・広告表記｜学生バイトお役立ちツール', '学生バイトお役立ちツールの運営者情報・計算方針・広告（PR）表記・免責をまとめたページです。数字は公式の一次情報を確認して作り、結果は目安として表示します。連絡先とプライバシーポリシーへのリンクもあります。', 'default'],
  'tools/index.html': ['学生向け無料ツール一覧｜バイトの税金・新生活・就活・奨学金', '年末調整・扶養・確定申告・還付の確認から、新生活の手取り、就活のES、奨学金の返済まで、学生向けの無料ツールと解説記事を目的別に一覧にしました。入力内容は送信されず、結果はすべて目安です。', 'default'],
  'privacy/index.html': ['プライバシーポリシー・外部送信先一覧｜学生バイトお役立ちツール', '当サイトのプライバシーポリシーです。入力内容は端末内で計算し送信しません。広告の計測でA8.netへ、Xシェア時にXへ情報が送られる場合があります。送信先・送信される情報・停止方法を一覧で説明します。', 'default'],
};
// 着手前（2026-11-18 の総点検の前）に採った <script id="logic"> の SHA-256（手順0）
const LOGIC0 = {
  'index.html': 'd0ef39fb19ffe3a23a8c61e95c8253982b7604c2009d38c02c10914bcd46b8aa',
  'kakemochi/index.html': '193ee57f717e9d371efb9ace4bbda661943f9509d2f3c6c31c2a38b548d9fbee',
  'shift-limit/index.html': '9bc764c896bf84b78546d7514f4764691a876e0b26cb88808627ebe115d7320c',
  'living-cost-simulator/index.html': '83725e14a8fb818e570a110281fd8cc737c0adcb5cc810c3eca0ccb1860f4cb7',
  'es-word-counter/index.html': 'a39f7041db6e642f49081c29ff96881137daecb1af92e786ad623e1f51f4405c',
  'nisa-simulator/index.html': 'faa451ee994c6889d214909d6bfd0bf10a462b7c1fac04781649dbe738981ebe',
  'scholarship/index.html': 'a0bcd651b310875ed56fc074dff2bbacb61bd40b8ca7b80e872f903980efe1fb',
};

// ---- site-config.js を vm で評価（偽の document。実際の Google へは通信しない）----
function runConfig(cfg) {
  const added = [];
  const doc = {
    head: { appendChild: (s) => { added.push(s); } },
    documentElement: { appendChild: (s) => { added.push(s); } },
    createElement: (t) => ({ tagName: t.toUpperCase(), set src(v) { this._src = v; }, get src() { return this._src; } }),
  };
  const win = {};
  const ctx = { window: win, document: doc, encodeURIComponent, Date };
  let src = rd('site-config.js');
  if (cfg) {
    // 出荷状態の window.SITE_CONFIG の中身だけを差し替える（ロジック部分はそのまま）
    src = src.replace(/window\.SITE_CONFIG = \{[\s\S]*?\n\};/, 'window.SITE_CONFIG = ' + JSON.stringify(cfg) + ';');
  }
  vm.runInNewContext(src, ctx);
  return { added, win };
}

c('H01 privacy page', () => {
  const h = rd('privacy/index.html');
  assert.strictEqual(attr(h, /<link rel="canonical" href="([^"]*)"/), BASE + 'privacy/');
  assert.strictEqual(attr(h, /<meta property="og:url" content="([^"]*)"/), BASE + 'privacy/');
  assert.strictEqual(attr(h, /<title>([^<]*)<\/title>/), META['privacy/index.html'][0]);
  assert.strictEqual(attr(h, /<meta name="description" content="([^"]*)"/), META['privacy/index.html'][1]);
  const b = ldBlocks(h); assert.strictEqual(b.length, 2);
  assert.strictEqual(b[0]['@type'], 'WebPage'); assert.strictEqual(b[1]['@type'], 'BreadcrumbList');
  assert.strictEqual(ds(h), ds(rd('index.html')));
  const sm = rd('sitemap.xml'); const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs.length, 14); assert.ok(locs.includes(BASE + 'privacy/'));
  assert.ok(h.includes('.tw table.ext{min-width:640px}'));
  assert.ok(h.includes('<script src="../site-config.js" defer></script>\n</body>'));
});
c('H02 privacy required words and links', () => {
  const h = rd('privacy/index.html');
  ['株式会社ファンコミュニケーションズ', 'A8.net', 'IPアドレス', 'ユーザーエージェント', 'Cookie', '閲覧中のページのURL', '広告の表示・クリック・成果', '（A8.net サイト内）をご確認ください', 'x.com', 'オプトアウト', 'Google AdSense', 'Google アナリティクス', '学生バイトお役立ちツール 運営事務局', 'gakusei.kabe.checker@gmail.com', '電気通信事業法']
    .forEach((w) => assert.ok(h.includes(w), 'privacy missing ' + w));
  const hrefs = [...h.matchAll(/<a\b[^>]*?\bhref="([^"]*)"/g)].map((m) => m[1]);
  const ext = hrefs.filter((x) => /^https?:/.test(x)).sort();
  assert.deepStrictEqual(ext, ['https://adssettings.google.com', 'https://tools.google.com/dlpage/gaoptout']);
  assert.ok(!hrefs.some((x) => /a8\.net/i.test(x)), 'A8 URL in href');
  ['innerHTML', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'indexedDB', 'eval(', 'document.write'].forEach((w) => assert.ok(!h.includes(w), 'forbidden ' + w));
});
c('H03 footer privacy link on 14 pages', () => ALL.forEach((p) => {
  const h = rd(p); const m = attr(h, /(<p class="foot-links">[\s\S]*?<\/p>)/);
  const hrefs = [...m.matchAll(/href="([^"]*)"/g)].map((x) => x[1]);
  const want = p === 'privacy/index.html' ? './' : (p === 'about/index.html' ? '../privacy/' : rel(p) + 'privacy/');
  assert.ok(hrefs.includes(want), p + ' privacy link ' + want);
  if (p !== 'privacy/index.html') assert.ok(fs.existsSync(path.join(path.resolve(path.dirname(path.join(root, p)), want), 'index.html')), p + ' resolves');
  if (TOOLS.includes(p)) {
    assert.ok(m.startsWith('<p class="foot-links"><a href="#legal"'), p + ' #legal first');
    assert.strictEqual(hrefs.indexOf(rel(p) + 'privacy/'), 1, p + ' privacy right after #legal');
  }
}));
c('H04 site-config.js script on 14 pages', () => ALL.forEach((p) => {
  const h = rd(p);
  const all = [...h.matchAll(/<script\b[^>]*src="[^"]*site-config\.js"[^>]*>/g)];
  assert.strictEqual(all.length, 1, p + ' count');
  const want = '<script src="' + (p === 'index.html' ? '' : p.startsWith('guides/') ? '../../' : '../') + 'site-config.js" defer></script>';
  assert.strictEqual(all[0][0] + '</script>', want, p + ' tag');
  assert.ok(h.includes(want + '\n</body>'), p + ' right before </body>');
  assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(root, p)), rel(p) + 'site-config.js')), p + ' resolves');
}));
c('H05 site-config.js behaviour (no real network)', () => {
  const lines = rd('site-config.js').split('\n');
  assert.ok(/^\s*ADSENSE_CLIENT:/.test(lines[21]), '22行目 ' + lines[21]);
  assert.ok(/^\s*GA4_ID:/.test(lines[22]), '23行目 ' + lines[22]);
  assert.ok(!rd('site-config.js').includes('anonymize_ip'));
  const shipped = vm.runInNewContext(rd('site-config.js') + '\n;window.SITE_CONFIG', { window: {}, document: { head: { appendChild() { throw new Error('append'); } }, createElement() { throw new Error('create'); } }, encodeURIComponent, Date });
  assert.strictEqual(shipped.ADSENSE_CLIENT, ''); assert.strictEqual(shipped.GA4_ID, '');
  // 空（出荷状態）: script 0・dataLayer/gtag なし
  let r = runConfig();
  assert.strictEqual(r.added.length, 0); assert.ok(!('dataLayer' in r.win) && !('gtag' in r.win));
  r = runConfig({ ADSENSE_CLIENT: '   ', GA4_ID: '' }); assert.strictEqual(r.added.length, 0);
  // 不正な形式
  [['ca-pub-123', ''], ['', 'G-ab'], ['', 'G-ABCD"><script'], ['CA-PUB-1234567890', ''], ['ca-pub-123456789', ''], ['ca-pub-' + '1'.repeat(21), ''], ['', 'g-abcd1234'], ['', 'G-ABC'], ['', 'G-' + 'A'.repeat(13)], [null, 123], ['ca-pub-1234567890"x', '']]
    .forEach(([a, g]) => { const x = runConfig({ ADSENSE_CLIENT: a, GA4_ID: g }); assert.strictEqual(x.added.length, 0, JSON.stringify([a, g])); assert.ok(!('gtag' in x.win), 'gtag ' + g); });
  // 正しい形式（ダミーID）: script が1つずつ
  r = runConfig({ ADSENSE_CLIENT: 'ca-pub-1234567890123456', GA4_ID: 'G-ABCDE12345' });
  assert.strictEqual(r.added.length, 2);
  const srcs = r.added.map((s) => s.src);
  assert.ok(srcs.includes('https://www.googletagmanager.com/gtag/js?id=G-ABCDE12345'));
  assert.ok(srcs.includes('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456'));
  assert.ok(r.added.every((s) => s.async === true));
  assert.strictEqual(r.added.find((s) => /adsbygoogle/.test(s.src)).crossOrigin, 'anonymous');
  assert.strictEqual(r.win.dataLayer.length, 2); assert.strictEqual(typeof r.win.gtag, 'function');
  r = runConfig({ ADSENSE_CLIENT: ' ca-pub-1234567890123456 ', GA4_ID: '' }); assert.strictEqual(r.added.length, 1);
  r = runConfig({ ADSENSE_CLIENT: '', GA4_ID: 'G-ABCD' }); assert.strictEqual(r.added.length, 1);
});
c('H06 ads.txt / privacy consistency', () => {
  const cfg = vm.runInNewContext(rd('site-config.js') + '\n;window.SITE_CONFIG', { window: {}, document: {}, encodeURIComponent, Date });
  const hasAd = cfg.ADSENSE_CLIENT.trim() !== '', hasGa = cfg.GA4_ID.trim() !== '';
  const exists = fs.existsSync(path.join(root, 'ads.txt'));
  if (!hasAd) assert.ok(!exists, 'ads.txt must not exist while ADSENSE_CLIENT is empty');
  else {
    assert.ok(exists, 'ads.txt needed');
    const pub = cfg.ADSENSE_CLIENT.trim().replace(/^ca-/, '');
    assert.ok(rd('ads.txt').includes('google.com, ' + pub + ', DIRECT, f08c47fec0942fa0'));
  }
  if (hasAd || hasGa) {
    assert.ok(!rd('privacy/index.html').includes('導入していません'), 'privacy says not introduced');
    TOOLS.concat(['about/index.html']).forEach((p) => assert.ok(!/（現在は導入していません）/.test(rd(p)), p + ' summary says not introduced'));
  }
});
c('H07 title / description of 14 pages', () => ALL.forEach((p) => {
  const h = rd(p); const [t, d] = META[p];
  assert.strictEqual(attr(h, /<title>([^<]*)<\/title>/), t, p + ' title');
  assert.strictEqual(attr(h, /<meta name="description" content="([^"]*)"/), d, p + ' desc');
  assert.ok(t.length >= 20 && t.length <= 36, p + ' title len ' + t.length);
  assert.ok(d.length >= 80 && d.length <= 112, p + ' desc len ' + d.length);
  assert.ok(!d.includes('最終確認日'), p + ' desc 最終確認日');
  assert.strictEqual(attr(h, /<meta property="og:title" content="([^"]*)"/), t);
  assert.strictEqual(attr(h, /<meta property="og:description" content="([^"]*)"/), d);
  assert.strictEqual(attr(h, /<meta name="twitter:title" content="([^"]*)"/), t);
  assert.strictEqual(attr(h, /<meta name="twitter:description" content="([^"]*)"/), d);
}));
function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.slice(0, 8).toString('hex'), '89504e470d0a1a0a', 'png signature');
  assert.strictEqual(b.slice(12, 16).toString(), 'IHDR');
  return [b.readUInt32BE(16), b.readUInt32BE(20), b.length];
}
c('H08 OGP on 14 pages and og/*.png', () => {
  ALL.forEach((p) => {
    const h = rd(p); const img = META[p][2];
    const og = attr(h, /<meta property="og:image" content="([^"]*)"/);
    assert.strictEqual(og, BASE + 'og/' + img + '.png', p);
    assert.strictEqual(attr(h, /<meta property="og:image:width" content="([^"]*)"/), '1200');
    assert.strictEqual(attr(h, /<meta property="og:image:height" content="([^"]*)"/), '630');
    assert.ok(attr(h, /<meta property="og:image:alt" content="([^"]*)"/).length > 0);
    assert.strictEqual(attr(h, /<meta name="twitter:card" content="([^"]*)"/), 'summary_large_image');
    assert.strictEqual(attr(h, /<meta name="twitter:image" content="([^"]*)"/), og);
    assert.ok(fs.existsSync(path.join(root, 'og', img + '.png')), p + ' file');
  });
  let total = 0;
  ['default', 'kabe', 'kakemochi', 'living', 'scholarship', 'nisa', 'es'].forEach((k) => {
    const [w, h, n] = pngSize(path.join(root, 'og', k + '.png'));
    assert.strictEqual(w, 1200, k + ' width'); assert.strictEqual(h, 630, k + ' height');
    assert.ok(n <= 300 * 1024, k + ' size ' + n); total += n;
  });
  assert.ok(total <= 1024 * 1024, 'og total ' + total);
  assert.deepStrictEqual(fs.readdirSync(path.join(root, 'og')).sort(), ['default.png', 'es.png', 'kabe.png', 'kakemochi.png', 'living.png', 'nisa.png', 'scholarship.png']);
});
c('H09 JSON-LD description', () => ALL.forEach((p) => {
  const h = rd(p);
  ldBlocks(h).forEach((b) => {
    if (['WebApplication', 'Article', 'WebPage', 'CollectionPage', 'AboutPage'].includes(b['@type']) && b.description) assert.ok(!b.description.includes('最終確認日'), p + ' ld description');
    if (b['@type'] === 'Article') assert.strictEqual(b.description, attr(h, /<meta name="description" content="([^"]*)"/), p + ' article desc');
  });
}));
c('H10 ad-slot position', () => ['index.html', 'living-cost-simulator/index.html', 'scholarship/index.html', 'nisa-simulator/index.html'].forEach((p) => {
  const h = rd(p); const markup = h.replace(/<style>[\s\S]*?<\/style>/, '');
  const slots = [...markup.matchAll(/<div class="ad-slot"[^>]*>[\s\S]*?<\/div>/g)].map((m) => m[0]);
  assert.strictEqual(slots.length, p === 'index.html' ? 1 : 1, p + ' slots');
  slots.forEach((s) => { assert.ok(/\shidden[\s>]/.test(s), p + ' hidden'); assert.ok(s.includes('<span class="ad-label">広告</span>'), p + ' label'); assert.ok(s.includes('role="complementary"') && s.includes('aria-label="広告"'), p + ' role'); });
  const pc = h.indexOf('id="prCards"'); const sl = h.indexOf('<div class="ad-slot"');
  assert.ok(pc > 0 && sl > pc, p + ' order');
  assert.ok(h.slice(pc, sl).includes('<div class="acc-list">'), p + ' acc-list between prCards and ad-slot');
  assert.ok(/\/\*ds:end\*\/\n\.ad-slot\{margin:var\(--s5\) 0 var\(--s2\)\}/.test(h), p + ' css');
  assert.ok(!markup.includes('after-result') && !markup.includes('after-account'), p + ' old data-slot');
}));
c('H11 PR line in first view', () => {
  const PR = '※当サイトのツールにはプロモーション（PR）を含みます';
  GUIDES.concat(['tools/index.html']).forEach((p) => { const h = rd(p); assert.ok(h.slice(0, h.indexOf('<main')).includes(PR), p); });
  ['about/index.html', 'privacy/index.html'].forEach((p) => assert.ok(!rd(p).includes('プロモーション（PR）を含みます') || p === 'about/index.html'));
  assert.ok(!rd('privacy/index.html').includes(PR)); assert.ok(!rd('about/index.html').slice(0, rd('about/index.html').indexOf('<main')).includes(PR));
  TOOLS.forEach((p) => { const h = rd(p); assert.ok(h.slice(0, h.indexOf('<main')).includes('※当サイトはプロモーション（PR）を含みます'), p); });
});
c('H12 links-config url lines and IMP', () => {
  const L = { 'links-config.js': [41, 49, 57], 'es-word-counter/links-config.js': [40, 48, 56], 'nisa-simulator/links-config.js': [38, 45, 52], 'living-cost-simulator/links-config.js': [43, 50, 57, 64], 'scholarship/links-config.js': [40, 47, 54] };
  const SET = { 'links-config.js': { 49: 'https://px.a8.net/svt/ejp?a8mat=4BGNCK+C210S2+4JGQ+C4TB5' }, 'es-word-counter/links-config.js': {}, 'nisa-simulator/links-config.js': { 38: 'https://px.a8.net/svt/ejp?a8mat=4BGNCL+RDYLU+1WP2+15Q22P' }, 'living-cost-simulator/links-config.js': { 50: 'https://px.a8.net/svt/ejp?a8mat=4BGNCL+201GZ6+3SPO+CKHNGY' }, 'scholarship/links-config.js': {} };
  const IMP = { 'links-config.js': ['KABE_IMP', 'kakutei', 'https://www11.a8.net/0.gif?a8mat=4BGNCK+C210S2+4JGQ+C4TB5'], 'nisa-simulator/links-config.js': ['NISA_IMP', 'shoken1', 'https://www15.a8.net/0.gif?a8mat=4BGNCL+RDYLU+1WP2+15Q22P'], 'living-cost-simulator/links-config.js': ['LIVING_IMP', 'internet', 'https://www10.a8.net/0.gif?a8mat=4BGNCL+201GZ6+3SPO+CKHNGY'] };
  Object.keys(L).forEach((f) => {
    const lines = rd(f).split('\n');
    const urlLines = []; lines.forEach((ln, i) => { if (/^\s+url: '.*',$/.test(ln)) urlLines.push(i + 1); });
    assert.deepStrictEqual(urlLines, L[f], f + ' url lines');
    assert.ok(lines[2].includes('上書きしない'), f + ' line3');
    urlLines.forEach((n) => { const v = lines[n - 1].match(/url: '(.*)',/)[1]; assert.strictEqual(v, SET[f][n] || '', f + ' line ' + n + ' value'); });
    const ctx = {}; vm.runInNewContext(rd(f), { window: ctx });
    const links = Object.values(ctx).find((v) => v && typeof v === 'object' && Object.values(v).every((x) => x && x.label));
    const imp = Object.values(ctx).find((v) => v && typeof v === 'object' && !Object.values(v).some((x) => x && typeof x === 'object'));
    Object.keys(links).forEach((k) => { if (links[k].url) assert.ok(imp[k], f + ' ' + k + ' needs IMP'); });
    assert.deepStrictEqual(Object.keys(links).filter((k) => links[k].url), Object.keys(SET[f]).length ? [{ 'links-config.js': 'kakutei', 'nisa-simulator/links-config.js': 'shoken1', 'living-cost-simulator/links-config.js': 'internet' }[f]] : [], f + ' configured keys');
    if (IMP[f]) assert.strictEqual(imp[IMP[f][1]], IMP[f][2], f + ' IMP value');
  });
});
// twitter-text 風の重み付き長さ（URL=23、CJK等=2、半角=1、改行=1）
function weighted(s) {
  let n = 0; const re = /https?:\/\/\S+/g; let last = 0, m;
  const cnt = (t) => { for (const ch of t) { const cp = ch.codePointAt(0); n += ((cp <= 0x10FF) || (cp >= 0x2000 && cp <= 0x200D) || (cp >= 0x2010 && cp <= 0x201F) || (cp >= 0x2032 && cp <= 0x2037)) ? 1 : 2; } };
  while ((m = re.exec(s))) { cnt(s.slice(last, m.index)); n += 23; last = m.index + m[0].length; }
  cnt(s.slice(last)); return n;
}
c('H13 marketing_pack.md', () => {
  const f = path.join(root, '..', 'marketing_pack.md');
  if (!fs.existsSync(f)) return;
  const t = fs.readFileSync(f, 'utf8');
  ['6URL', '13ページ'].forEach((w) => assert.ok(!t.includes(w), 'has ' + w));
  ['14ページ', '14URL', 'SCHOLAR_LINKS', 'SCHOLAR_IMP', '上書きしない', 'ads.txt', 'google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0'].forEach((w) => assert.ok(t.includes(w), 'missing ' + w));
  const ch = t.slice(t.indexOf('## 第6章'), t.indexOf('## 第7章'));
  const posts = [...ch.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  assert.strictEqual(posts.length, 25, 'posts');
  posts.forEach((p, i) => {
    assert.ok(weighted(p) <= 280, 'post ' + (i + 1) + ' weighted ' + weighted(p));
    assert.ok(p.includes('https://gakusei-tools.com/'), 'post ' + (i + 1) + ' url'); assert.ok(!p.includes('github.io'), 'post ' + (i + 1) + ' github.io');
  });
});
c('H14 README', () => {
  const t = rd('README.md');
  ['14ページ', 'site-config.js', 'ads.txt', 'google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0', '上書きしない'].forEach((w) => assert.ok(t.includes(w), 'README missing ' + w));
  assert.ok(!t.includes('6ページ'), 'README has 6ページ'); assert.ok(!t.includes('6URL'), 'README has 6URL');
});
c('H15 microcopy', () => {
  TOOLS.forEach((p) => {
    const h = rd(p);
    [...h.matchAll(/<h3 class="ct">([^<]*)<\/h3>/g)].forEach((m) => { assert.ok(!['次のおすすめアクション', 'PR・おすすめ'].includes(m[1]), p + ' h3 ' + m[1]); });
    const pr = [...h.matchAll(/<(?:p|h3)[^>]*(?:class="(?:pr-note|ct)"|id="prNote")[^>]*>[^<]*<\/(?:p|h3)>/g)].map((m) => m[0]).join('\n');
    assert.ok(!/今すぐ|必ず|お得|限定|絶対/.test(pr), p + ' pushy PR copy');
    assert.ok(!h.includes('次のおすすめアクション') && !h.includes('PR・おすすめ'), p + ' old h3');
  });
  ['index.html', 'kakemochi/index.html', 'shift-limit/index.html'].forEach((p) => { const ui = rd(p).match(/<script id="ui">[\s\S]*?<\/script>/)[0]; assert.ok(!/今すぐ|必ず|お得|限定|絶対/.test(ui.match(/PR_LEAD[\s\S]*?;/)[0]), p + ' PR_LEAD'); });
});
c('H16 logic block SHA-256 unchanged (7 tools)', () => Object.keys(LOGIC0).forEach((p) => {
  const m = rd(p).match(/<script id="logic">[\s\S]*?<\/script>/); assert.ok(m, p);
  assert.strictEqual(crypto.createHash('sha256').update(m[0]).digest('hex'), LOGIC0[p], p + ' logic changed');
}));
c('H17 HTML size <= 102400 bytes (14 pages)', () => ALL.forEach((p) => { const n = Buffer.byteLength(rd(p), 'utf8'); assert.ok(n <= 102400, p + ' ' + n); }));

// ---- 全14ページ横断（構文・ID・リンク・JSON-LD・FAQ・共通CSS・375px）----
c('H18 inline scripts syntax (14 pages)', () => ALL.forEach((p) => {
  [...rd(p).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].forEach((m) => {
    if (/ld\+json/.test(m[1])) { JSON.parse(m[2]); return; }
    if (/\ssrc=/.test(m[1])) return;
    new vm.Script(m[2], { filename: p });
  });
  ['site-config.js', 'links-config.js', 'es-word-counter/links-config.js', 'nisa-simulator/links-config.js', 'living-cost-simulator/links-config.js', 'scholarship/links-config.js'].forEach((f) => new vm.Script(rd(f), { filename: f }));
}));
c('H19 ids, anchors, relative links, FAQ == JSON-LD (14 pages)', () => ALL.forEach((p) => {
  const raw = rd(p); const h = raw.replace(/<!--[\s\S]*?-->/g, '');
  const body = h.slice(h.indexOf('<body'));
  const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  // JS が動的に作る id は静的HTMLに無いので、重複だけを見る
  assert.strictEqual(new Set(ids).size, ids.length, p + ' duplicate id: ' + ids.filter((x, i) => ids.indexOf(x) !== i));
  const idset = new Set(ids);
  [...body.matchAll(/<a\b[^>]*?\bhref="([^"]*)"/g)].map((m) => m[1]).forEach((x) => {
    if (/^(https?:|mailto:)/.test(x)) return;
    assert.notStrictEqual(x, '#', p + ' href="#"');
    if (x.startsWith('#')) { assert.ok(idset.has(x.slice(1)), p + ' anchor ' + x); return; }
    assert.ok(!x.startsWith('/'), p + ' abs ' + x);
    const [pp, hash] = x.split('#'); const dir = path.resolve(path.dirname(path.join(root, p)), pp);
    assert.ok(fs.existsSync(path.join(dir, 'index.html')), p + ' -> ' + x);
    if (hash) assert.ok(new RegExp('\\sid="' + hash + '"').test(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')), p + ' hash ' + x);
  });
  [...body.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)="([^"]*)"/g)].map((m) => m[1]).forEach((x) => {
    if (/^(https?:|data:)/.test(x)) return;
    if (x.startsWith('#')) return;
    assert.ok(fs.existsSync(path.resolve(path.dirname(path.join(root, p)), x)), p + ' file ' + x);
  });
  // JSON-LD 妥当性と FAQ の同文
  const blocks = ldBlocks(h); assert.ok(blocks.length >= 1);
  blocks.forEach((b) => assert.strictEqual(b['@context'], 'https://schema.org'));
  const faq = blocks.find((b) => b['@type'] === 'FAQPage');
  if (faq) {
    const sec = h.match(/<section[^>]*id="faq"[\s\S]*?<\/section>/);
    assert.ok(sec, p + ' faq section');
    const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const qs = [...sec[0].matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [plain(m[1]), plain(m[2])]);
    assert.strictEqual(qs.length, faq.mainEntity.length, p + ' faq count');
    qs.forEach((q, i) => { assert.strictEqual(faq.mainEntity[i].name, q[0], p + ' Q' + i); assert.strictEqual(plain(faq.mainEntity[i].acceptedAnswer.text), q[1], p + ' A' + i); });
  }
}));
c('H20 shared CSS identical and 375px static overflow check (14 pages)', () => {
  const base = ds(rd('index.html'));
  ALL.forEach((p) => {
    const h = rd(p);
    assert.strictEqual(ds(h), base, p + ' ds');
    assert.ok(/<meta name="viewport" content="width=device-width, initial-scale=1">/.test(h), p + ' viewport');
    const css = attr(h, /<style>([\s\S]*?)<\/style>/);
    // 固定の幅（px）が 343px（375px - 左右16px）を超える指定は、横スクロールする .tw の中の表だけ許す
    [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].forEach((m) => {
      const sel = m[1].trim();
      [...m[2].matchAll(/(?:^|;)\s*(?:min-)?width:\s*(\d+)px/g)].forEach((d) => {
        if (+d[1] > 343) assert.ok(/(\.tw|table)/.test(sel), p + ' wide fixed width ' + sel + ' ' + d[1]);
      });
    });
    const tables = (h.match(/<table\b/g) || []).length;
    const wrapped = (h.match(/<div class="tw">\s*<table\b/g) || []).length;
    assert.strictEqual(wrapped, tables, p + ' tables not wrapped by .tw (' + wrapped + '/' + tables + ')');
    assert.ok(/\.tw\{[^}]*overflow-x:\s*auto/.test(css), p + ' .tw overflow-x');
    assert.ok(!/<(?:img|video|iframe)\b[^>]*\bwidth="(?:[4-9]\d\d|\d{4,})"/.test(h), p + ' wide media');
  });
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
