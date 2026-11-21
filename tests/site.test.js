'use strict';
// サイト全体テスト（全17ページ。DIRS は当初の6ツール、新ページは各セクションで追加）。依存ゼロ。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert');

const root = path.join(__dirname, '..');
const BASE = 'https://gakusei-tools.com/';
const DIRS = ['', 'kakemochi/', 'shift-limit/', 'living-cost-simulator/', 'es-word-counter/', 'nisa-simulator/'];
const PAGES = DIRS.map((d) => d + 'index.html');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function c(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.error('FAIL ' + name + ' -> ' + e.message); } }
function css(h) { const m = h.match(/\/\*ds:start v1\*\/[\s\S]*?\/\*ds:end\*\//); assert.ok(m, 'ds block missing'); return m[0]; }

c('X01 shared css identical', () => {
  const base = css(rd(PAGES[0]));
  PAGES.forEach((p) => assert.strictEqual(css(rd(p)), base, p));
});
c('X02 related links', () => {
  PAGES.forEach((p, i) => {
    const h = rd(p);
    const aside = h.match(/<aside class="rel"[\s\S]*?<\/aside>/); assert.ok(aside, p + ' aside');
    const hrefs = [...aside[0].matchAll(/<a href="([^"]*)"/g)].map((x) => x[1]);
    assert.strictEqual(hrefs.length, 6, p + ' links');
    const dir = path.dirname(path.join(root, p));
    hrefs.forEach((x) => assert.ok(fs.existsSync(path.join(path.resolve(dir, x), 'index.html')), p + ' -> ' + x));
    assert.strictEqual((aside[0].match(/aria-current="page"/g) || []).length, 1, p + ' aria-current in rel');
  });
});
c('X03 sitemap == canonicals', () => {
  const locs = [...rd('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  const can = PAGES.map((p) => rd(p).match(/<link rel="canonical" href="([^"]*)"/)[1]);
  assert.strictEqual(locs.length, 21);
  assert.deepStrictEqual(can.slice().sort(), DIRS.map((d) => BASE + d).sort());
  const extra = ['about/', 'tools/', 'privacy/', 'guides/150-wall-guide/', 'guides/kakemochi-tax-guide/', 'guides/es-star-method/', 'guides/student-nisa-start/', 'guides/nenmatsu-chosei-miss/', 'guides/kokuho-150-cost/', 'guides/baito-nisa-monthly/', 'guides/gensen-choshu-hyo/', 'guides/kinro-gakusei-kojo/', 'guides/student-juminzei/', 'guides/oya-kojo-daigakusei/', 'scholarship/'];
  assert.deepStrictEqual(locs.slice().sort(), can.concat(extra.map((d) => BASE + d)).sort());
  extra.forEach((d) => assert.strictEqual(rd(d + 'index.html').match(/<link rel="canonical" href="([^"]*)"/)[1], BASE + d, d));
  assert.strictEqual(new Set(locs).size, 21);
});
c('X04 no stray root files in subfolders', () => {
  DIRS.slice(1).forEach((d) => ['sitemap.xml', 'robots.txt', '.nojekyll'].forEach((f) => assert.ok(!fs.existsSync(path.join(root, d, f)), d + f)));
  ['sitemap.xml', 'robots.txt', '.nojekyll', 'googlef0918a9bf30cf9a1.html'].forEach((f) => assert.ok(fs.existsSync(path.join(root, f)), f));
});
c('X05 no old URLs', () => {
  const old = ['living-cost-simulator', 'es-word-counter', 'nisa-simulator'].map((n) => 'https://gerino' + 'aka.github.io/' + n + '/');
  const hits = [];
  (function w(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'tests' && e.name !== 'node_modules') w(p); return; }
      if (!/\.(html|js|css|md|xml|txt|json)$/.test(e.name)) return;
      const t = fs.readFileSync(p, 'utf8'); old.forEach((o) => { if (t.includes(o)) hits.push(path.relative(root, p) + ' ' + o); });
    });
  })(root);
  assert.deepStrictEqual(hits, []);
});
c('X06 theme-color', () => PAGES.forEach((p) => {
  const h = rd(p);
  assert.ok(h.includes('<meta name="theme-color" content="#f8fafc">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">'), p);
  assert.strictEqual((h.match(/name="theme-color"/g) || []).length, 2, p);
}));
c('X07 links-config labels', () => ['', 'living-cost-simulator/', 'es-word-counter/', 'nisa-simulator/', 'scholarship/'].forEach((d) => {
  const ctx = {}; vm.runInNewContext(rd(d + 'links-config.js'), { window: ctx });
  const L = Object.values(ctx).find((v) => v && typeof v === 'object');
  assert.ok(L && Object.keys(L).length >= 3, d);
  Object.keys(L).forEach((k) => assert.strictEqual(L[k].label, 'PR', d + k));
}));

// ---- about/ と tools/（フェーズ1）----
const NEW_DIRS = ['about/', 'tools/', 'privacy/'];
const NEW_PAGES = NEW_DIRS.map((d) => d + 'index.html');
const ALL_PAGES = PAGES.concat(NEW_PAGES);
const TOOL_DIRS = DIRS.concat(['scholarship/']);   // ツールのフォルダ（奨学金は6ページの DIRS には入れず、フェーズ4で足す）
const GUIDE_DIRS = ['guides/150-wall-guide/', 'guides/kakemochi-tax-guide/', 'guides/es-star-method/', 'guides/student-nisa-start/', 'guides/nenmatsu-chosei-miss/', 'guides/kokuho-150-cost/', 'guides/baito-nisa-monthly/', 'guides/gensen-choshu-hyo/', 'guides/kinro-gakusei-kojo/', 'guides/student-juminzei/', 'guides/oya-kojo-daigakusei/'];
const SEASON = ['guides/gensen-choshu-hyo/', 'guides/kinro-gakusei-kojo/', 'guides/student-juminzei/', 'guides/oya-kojo-daigakusei/'];
const GDATE = (d) => (SEASON.includes(d) ? '2026-11-22' : ['guides/nenmatsu-chosei-miss/', 'guides/kokuho-150-cost/', 'guides/baito-nisa-monthly/'].includes(d) ? '2026-11-19' : '2026-11-17');   // 公開日・更新日（11-19 の3本、11-22 の季節4本）
const stripComments = (h) => h.replace(/<!--[\s\S]*?-->/g, '');
const ldBlocks = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const resolves = (page, href) => fs.existsSync(path.join(path.resolve(path.dirname(path.join(root, page)), href), 'index.html'));
const attr = (h, re) => { const m = h.match(re); assert.ok(m, 'missing ' + re); return m[1]; };
const MAIL = attr(rd('index.html'), /<p class="foot-links">[^]*?([\w.]+@[\w.]+)/);
const TITLE = { 'about/': '運営者情報・計算方針・広告表記｜学生バイトお役立ちツール', 'tools/': '学生向け無料ツール一覧｜バイトの税金・新生活・就活・奨学金' };

c('X08 shared css identical on 9 pages', () => {
  const base = css(rd(PAGES[0]));
  assert.strictEqual(ALL_PAGES.length, 9);
  ALL_PAGES.forEach((p) => assert.strictEqual(css(rd(p)), base, p));
});
c('X09 new pages meta', () => NEW_DIRS.forEach((d) => {
  const h = rd(d + 'index.html');
  assert.strictEqual(attr(h, /<link rel="canonical" href="([^"]*)"/), BASE + d, d + ' canonical');
  assert.strictEqual(attr(h, /<meta property="og:url" content="([^"]*)"/), BASE + d, d + ' og:url');
  const title = attr(h, /<title>([^<]+)<\/title>/); assert.ok(title.length > 0);
  const desc = attr(h, /<meta name="description" content="([^"]*)"/); assert.ok(desc.length >= 80, d + ' desc len');
  assert.strictEqual(attr(h, /<meta property="og:title" content="([^"]*)"/), title);
  assert.strictEqual(attr(h, /<meta property="og:description" content="([^"]*)"/), desc);
  assert.strictEqual(attr(h, /<meta property="og:type" content="([^"]*)"/), 'website');
  assert.ok(attr(h, /<meta property="og:site_name" content="([^"]*)"/).length > 0);
  assert.strictEqual(attr(h, /<meta name="twitter:card" content="([^"]*)"/), 'summary_large_image');
  assert.ok(/<html lang="ja">/.test(h) && /<meta charset="utf-8">/.test(h) && /name="viewport"/.test(h));
}));
c('X10 new pages JSON-LD', () => NEW_DIRS.forEach((d) => {
  const h = rd(d + 'index.html'); const b = ldBlocks(h); assert.strictEqual(b.length, 2, d);
  b.forEach((x) => assert.strictEqual(x['@context'], 'https://schema.org'));
  const [main, crumb] = b;
  if (d === 'privacy/') {
    assert.strictEqual(main['@type'], 'WebPage'); assert.strictEqual(main.url, BASE + d);
  } else if (d === 'about/') {
    assert.strictEqual(main['@type'], 'AboutPage'); assert.strictEqual(main.mainEntity['@type'], 'Organization');
    assert.strictEqual(main.url, BASE + d); assert.strictEqual(main.mainEntity.email, MAIL);
  } else {
    assert.strictEqual(main['@type'], 'CollectionPage'); assert.strictEqual(main.mainEntity['@type'], 'ItemList');
    const l = main.mainEntity.itemListElement;
    assert.strictEqual(main.mainEntity.numberOfItems, l.length);
    l.forEach((x, i) => assert.strictEqual(x.position, i + 1));
    assert.strictEqual(main.url, BASE + d);
  }
  assert.strictEqual(crumb['@type'], 'BreadcrumbList');
  const it = crumb.itemListElement; assert.strictEqual(it[it.length - 1].item, BASE + d);
}));
c('X11 new pages links', () => NEW_PAGES.forEach((p) => {
  const h = stripComments(rd(p));
  const hrefs = [...h.matchAll(/<a\b[^>]*?\bhref="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 0);
  hrefs.forEach((x) => {
    assert.notStrictEqual(x, '#', p + ' href="#"');
    if (/^https?:/.test(x)) assert.ok(x === 'https://adssettings.google.com' || x === 'https://tools.google.com/dlpage/gaoptout' || x === 'https://policies.google.com/privacy' || x === 'https://policies.google.com/technologies/partner-sites' || x === 'https://policies.google.com/technologies/ads' || x === 'https://www.aboutads.info', p + ' external ' + x);
    else if (x.startsWith('mailto:') || x.startsWith('#')) return;
    else { assert.ok(!x.startsWith('/'), p + ' abs ' + x); assert.ok(resolves(p, x.split('#')[0]), p + ' -> ' + x); }
  });
}));
c('X12 footer links to about/tools', () => {
  const pre = (p) => (p === 'index.html' ? '' : '../');
  ALL_PAGES.forEach((p) => {
    const h = rd(p);
    const m = h.match(/<p class="foot-links">([\s\S]*?)<\/p>/); assert.ok(m, p + ' foot-links');
    const hrefs = [...m[1].matchAll(/href="([^"]*)"/g)].map((x) => x[1]);
    const wantAbout = p === 'about/index.html' ? './' : pre(p) + 'about/';
    const wantTools = p === 'tools/index.html' ? './' : pre(p) + 'tools/';
    assert.ok(hrefs.includes(wantAbout), p + ' about link ' + wantAbout);
    assert.ok(hrefs.includes(wantTools), p + ' tools link ' + wantTools);
    [wantAbout, wantTools].forEach((x) => assert.ok(resolves(p, x), p + ' resolves ' + x));
    if (PAGES.includes(p)) {
      assert.ok(m[0].startsWith('<p class="foot-links"><a href="#legal"'), p + ' starts with #legal');
      assert.ok(m[1].indexOf('href="#legal"') < m[1].indexOf('href="' + pre(p) + 'privacy/"') && m[1].indexOf('href="' + pre(p) + 'privacy/"') < m[1].indexOf('href="' + pre(p) + 'about/"'), p + ' privacy after #legal');
      assert.ok(m[1].indexOf('href="#legal"') < m[1].indexOf('gakusei.kabe.checker@gmail.com'), p + ' legal before mail');
      const fi = h.lastIndexOf('<footer'); const seg = h.slice(fi, h.indexOf(m[0], fi));
      assert.strictEqual((seg.match(/<details\b/g) || []).length, (seg.match(/<\/details>/g) || []).length, p + ' foot-links inside details');
    }
  });
});
c('X13 new pages structure', () => NEW_PAGES.forEach((p) => {
  const h = rd(p); const t = stripComments(h);
  assert.strictEqual((h.match(/<nav\b/g) || []).length, 1, p + ' nav');
  assert.strictEqual((h.match(/<h1\b/g) || []).length, 1, p + ' h1');
  const sc = [...h.matchAll(/<script\b([^>]*)>/g)]; assert.ok(sc.length > 0);
  sc.forEach((s) => assert.ok(/type="application\/ld\+json"/.test(s[1]) || /^\s*src="(\.\.\/)*(?:site-config|assets\/ui-motion)\.js"\s+defer\s*$/.test(s[1]), p + ' script ' + s[1]));
  ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'indexedDB']
    .forEach((w) => assert.ok(!h.includes(w), p + ' forbidden ' + w));
  assert.ok(!/outline:\s*(none|0)/.test(h), p + ' outline');
  const markup = h.replace(/<style>[\s\S]*?<\/style>/, '');   // 共通CSSには .ad-slot の定義があるため、マークアップだけを見る
  ['id="shareX"', 'id="prCards"', 'ad-slot'].forEach((w) => assert.ok(!markup.includes(w), p + ' ' + w));
  assert.ok(h.includes('<meta name="theme-color" content="#f8fafc">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">'), p + ' theme-color');
  assert.ok(Buffer.byteLength(h, 'utf8') <= 102400, p + ' size');
  const ids = [...t.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.strictEqual(new Set(ids).size, ids.length, p + ' duplicate id');
  assert.ok(h.includes('<a class="skip" href="#main">') && h.includes('<main id="main">'), p + ' skip/main');
}));
c('X14 about content', () => {
  const h = rd('about/index.html');
  assert.strictEqual(attr(h, /<title>([^<]+)<\/title>/), TITLE['about/']);
  ['運営事務局', MAIL, 'PR表記', '「PR」と「広告を含みます」', 'rel=&quot;sponsored&quot;', 'nofollow', 'noopener', '年齢による出し分け', '初期値が「19〜22歳」', '広告の有無や、広告主との関係が', '報酬を受け取ることがあります', 'ステルスマーケティング', '年齢', '目安・要確認', '最終確認日', '影響することはありません', 'id="disclaimer"', 'id="privacy"', 'プライバシーポリシー']
    .forEach((w) => assert.ok(h.includes(w), 'about missing ' + w));
  ['No.1', '業界最大', '累計', '実績', '代表', '創業', '設立'].forEach((w) => assert.ok(!h.includes(w), 'about has ' + w));
});
c('X15 about table dates == page bands', () => {
  const h = rd('about/index.html');
  PAGES.forEach((p, i) => {
    const band = attr(rd(p), /(<div class="band"[\s\S]*?<\/div>)/);
    const date = attr(band, /(?:最終確認日|最終更新日) (\d{4}-\d{2}-\d{2})/);
    const href = i === 0 ? '../' : '../' + DIRS[i];
    const row = [...h.matchAll(/<tr>[\s\S]*?<\/tr>/g)].map((m) => m[0]).find((r) => r.includes('<a href="' + href + '">'));
    assert.ok(row, 'row ' + href);
    assert.strictEqual(attr(row, /(\d{4}-\d{2}-\d{2})/), date, p);
  });
});
c('X16 tools list', () => {
  const raw = rd('tools/index.html'); const h = stripComments(raw);
  (raw.match(/<!--[\s\S]*?-->/g) || []).forEach((cm) => assert.ok(!/<a\s/.test(cm), 'link inside comment'));
  const lists = [...h.matchAll(/<ul class="tl">([\s\S]*?)<\/ul>/g)].map((m) => m[1]);
  const hrefs = lists.flatMap((l) => [...l.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]));
  assert.strictEqual(new Set(hrefs).size, hrefs.length, 'dup');
  hrefs.forEach((x) => assert.ok(resolves('tools/index.html', x), x));
  TOOL_DIRS.forEach((d) => assert.ok(hrefs.includes('../' + d), 'missing tool ' + d));
  GUIDE_DIRS.forEach((d) => assert.ok(hrefs.includes('../' + d), 'missing guide ' + d));
  const main = ldBlocks(raw)[0].mainEntity.itemListElement;
  assert.strictEqual(main.length, hrefs.length);
  assert.deepStrictEqual(main.map((x) => '../' + x.url.replace(BASE, '')).sort(), hrefs.slice().sort());
});
c('X17 rel aside has no about/tools', () => PAGES.forEach((p) => {
  const aside = rd(p).match(/<aside class="rel"[\s\S]*?<\/aside>/); assert.ok(aside, p);
  [...aside[0].matchAll(/<a href="([^"]*)"/g)].forEach((m) => assert.ok(!/(^|\/)(about|tools)\/$/.test(m[1]), p + ' ' + m[1]));
}));

// ---- scholarship/（フェーズ3）。6ページの DIRS には入れない（X02・X03 が6件固定のため。7ページ化はフェーズ4）----
const SCH = 'scholarship/';
const SCH_HTML = SCH + 'index.html';
c('X20 scholarship shared css identical to root', () => assert.strictEqual(css(rd(SCH_HTML)), css(rd('index.html'))));
c('X21 scholarship canonical / og:url', () => {
  const h = rd(SCH_HTML);
  assert.strictEqual(attr(h, /<link rel="canonical" href="([^"]*)"/), BASE + SCH);
  assert.strictEqual(attr(h, /<meta property="og:url" content="([^"]*)"/), BASE + SCH);
});
c('X22 scholarship related links', () => {
  const h = rd(SCH_HTML);
  const aside = h.match(/<aside class="rel"[\s\S]*?<\/aside>/); assert.ok(aside, 'aside');
  const hrefs = [...aside[0].matchAll(/<a href="([^"]*)"/g)].map((x) => x[1]);
  assert.strictEqual(hrefs.length, 7, 'links');
  hrefs.forEach((x) => assert.ok(resolves(SCH_HTML, x), SCH + ' -> ' + x));
  assert.strictEqual((aside[0].match(/aria-current="page"/g) || []).length, 1, 'aria-current in rel');
  assert.ok(/<section class="sisters"[\s\S]*?aria-current="page"[\s\S]*?<\/section>/.test(aside[0]), 'aria-current in sisters');
  hrefs.forEach((x) => assert.ok(!/(^|\/)(about|tools)\/$/.test(x), 'about/tools in rel ' + x));
  assert.ok(h.indexOf('</main>') < h.indexOf('<aside class="rel"') && h.indexOf('<aside class="rel"') < h.indexOf('<footer'), 'rel position');
});
c('X23 scholarship footer', () => {
  const h = rd(SCH_HTML);
  const m = h.match(/<p class="foot-links">([\s\S]*?)<\/p>/); assert.ok(m, 'foot-links');
  const hrefs = [...m[1].matchAll(/href="([^"]*)"/g)].map((x) => x[1]);
  ['../about/', '../tools/'].forEach((x) => { assert.ok(hrefs.includes(x), x); assert.ok(resolves(SCH_HTML, x), 'resolves ' + x); });
  assert.ok(m[0].startsWith('<p class="foot-links"><a href="#legal"'), 'starts with #legal');
  assert.ok(m[1].indexOf('href="#legal"') < m[1].indexOf(MAIL), 'legal before mail');
  const fi = h.lastIndexOf('<footer'); const seg = h.slice(fi, h.indexOf(m[0], fi));
  assert.strictEqual((seg.match(/<details\b/g) || []).length, (seg.match(/<\/details>/g) || []).length, 'foot-links inside details');
});
c('X24 scholarship theme-color / nav', () => {
  const h = rd(SCH_HTML);
  assert.ok(h.includes('<meta name="theme-color" content="#f8fafc">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">'));
  assert.strictEqual((h.match(/name="theme-color"/g) || []).length, 2);
  assert.strictEqual((h.match(/<nav\b/g) || []).length, 1);
});
c('X25 scholarship has no sitemap/robots/nojekyll', () => ['sitemap.xml', 'robots.txt', '.nojekyll'].forEach((f) => assert.ok(!fs.existsSync(path.join(root, SCH, f)), f)));
c('X26 tools links scholarship, ADD marker replaced', () => {
  const raw = rd('tools/index.html');
  assert.ok(raw.includes('href="../scholarship/"'));
  assert.ok(!/ADD:scholarship/.test(raw));
});
c('X27 living links scholarship', () => {
  const h = rd('living-cost-simulator/index.html');
  const m = h.match(/<p class="hint" id="scholarLink">([\s\S]*?)<\/p>/); assert.ok(m, 'scholarLink');
  const hrefs = [...m[1].matchAll(/href="([^"]*)"/g)].map((x) => x[1]);
  assert.ok(hrefs.includes('../scholarship/'));
  hrefs.forEach((x) => assert.ok(resolves('living-cost-simulator/index.html', x), x));
});

// ---- guides/（フェーズ2）----
const GUIDE_FILES = GUIDE_DIRS.map((d) => d + 'index.html');
const GOV = ['www.nta.go.jp', 'www.nenkin.go.jp', 'www.kyoukaikenpo.or.jp', 'www.mhlw.go.jp', 'www.fsa.go.jp', 'www.e-tax.nta.go.jp', 'www.pref.nara.jp', 'www.okayama-u.ac.jp', 'www.city.itabashi.tokyo.jp', 'www.city.setagaya.lg.jp'];
const GOV_SEASON = GOV.concat(['www.soumu.go.jp', 'www.mof.go.jp', 'www.city.edogawa.tokyo.jp', 'www.city.chiba.jp', 'www.city.nagoya.jp', 'www.city.koto.lg.jp', 'www.city.minato.tokyo.jp', 'www.tax.metro.tokyo.lg.jp', 'www.city.kagoshima.lg.jp', 'www.city.ota.tokyo.jp']);
const ESMEDIA = ['crexgroup.com', 'jsite.mhlw.go.jp', 'reashu.com', 'lifestyle.assist-all.co.jp', 'www.onecareer.jp'];
const GCFG = {
  'guides/150-wall-guide/': { tools: ['../../', '../../shift-limit/'], hosts: GOV, must: ['5日以内', '14日以内', '連続2回', '特定親族特別控除', '63万円', '136万円', '159万円', '197万円', '事業主の証明', '被扶養者'], not: ['何度でも扶養に残れる'] },
  'guides/kakemochi-tax-guide/': { tools: ['../../kakemochi/'], hosts: GOV, must: ['乙欄', '源泉徴収票', '5年間', '3週間程度', '1か月〜1か月半程度', 'マイナンバーカード', '新規発行', '令和7年（2025年）10月1日', '令和13年12月31日'], not: [] },
  'guides/es-star-method/': { tools: ['../../es-word-counter/'], hosts: GOV.concat(ESMEDIA), must: ['経験則', '保証', '推測', '整理例', '320字', '360字', '提出画面'], not: [] },
  'guides/student-nisa-start/': { tools: ['../../nisa-simulator/'], hosts: GOV, must: ['元本割れ', '保証されません', '勧誘', '697,240', '600,000', '1,800万円', '1月1日時点で18歳以上', '10月1日', '9月30日', '1人1口座'], not: ['おすすめ', 'SBI', '楽天', 'マネックス', '松井', 'auカブコム', '野村', '大和', 'ゆうちょ', '親の同意は不要', '親権者の同意は不要'] },
  'guides/nenmatsu-chosei-miss/': { tools: ['../../kakemochi/'], hosts: GOV, must: ['扶養控除等申告書', '年末調整', '還付申告', '5年間', '令和13年12月31日', '1か月以内', '源泉徴収票', '要確認', '乙欄'], not: ['必ず戻る'] },
  'guides/kokuho-150-cost/': { tools: ['../../', '../../shift-limit/'], hosts: GOV, must: ['いくらかは', '所得割', '均等割', '前年', '14日以内', '自治体の例', '150万円未満', '130万円未満', '通勤手当', '連続2回', '事業主の証明'], not: ['月額', '円くらい', '円程度', '何度でも扶養に残れる', '扶養のままの方が得'] },
  'guides/baito-nisa-monthly/': { tools: ['../../nisa-simulator/'], hosts: GOV, must: ['元本割れ', '保証されません', '勧誘', '税・手数料は含み', '仮定の例', '123,466', '187,990', '254,451', '246,932', '375,981', '508,901'], not: ['おすすめ', 'SBI', '楽天', 'マネックス', '松井', 'auカブコム', '野村', '大和', 'ゆうちょ', '元本保証'] },
  'guides/gensen-choshu-hyo/': { tools: ['../../kakemochi/', '../../'], hosts: GOV_SEASON, must: ['源泉徴収税額', '甲欄', '乙欄', '支払金額', '178万円', '74万円', '104万円', '1か月以内', '翌年1月31日', '1,300,000', '560,000', '1,310,000', '1,780,000', '1,781,000'], not: ['必ず戻る', '全員が対象', '確実に非課税', '130万円まで非課税です', '年調未済'] },
  'guides/kinro-gakusei-kojo/': { tools: ['../../', '../../kakemochi/'], hosts: GOV_SEASON, must: ['27万円', '26万円', '89万円', '163万円', '178万円', '143万円', '134万円', '扶養控除等（異動）申告書', '乙欄', '660,000', '23,000', '17,000', '43,000', '調整控除'], not: ['必ず戻る', '全員が対象', '確実に非課税', '130万円まで非課税です', '年調未済'] },
  'guides/student-juminzei/': { tools: ['../../', '../../shift-limit/'], hosts: GOV_SEASON, must: ['119万円', '110万円', '178万円', '143万円', '1級地', '均等割', '所得割', '5,000円', '令和8年度', '令和9年度', '410,000', '13,000', '560,000', '500,000'], not: ['必ず戻る', '全員が対象', '確実に非課税', '130万円まで非課税です', '年調未済'] },
  'guides/oya-kojo-daigakusei/': { tools: ['../../', '../../shift-limit/'], hosts: GOV_SEASON, must: ['特定親族特別控除', '特定扶養控除', '136万円', '159万円', '197万円', '63万円', '150万円未満', '12月31日', '19歳以上23歳未満', '63,000', '126,000', '21,000', '42,000', '1,231,000'], not: ['必ず戻る', '全員が対象', '確実に非課税', '130万円まで非課税です', '年調未済'] }
};
const BANNED = ['落ちない', '必ず', '絶対', '確実', '間違いなく', '100%', '最強', '最安', '儲か', '損しない', '誰でも', '受かる', '合格できる', '通過できる', '業界最大'];
const SELLER = '学生バイトお役立ちツール 運営事務局';
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const mainOf = (h) => attr(h, /(<main id="main">[\s\S]*?<\/main>)/);
const rsl = (page, href) => resolves(page, href.split('#')[0]);   // ハッシュを外して解決
const gh = (d) => rd(d + 'index.html');

c('G01 shared css (ds + g block) identical on guides, ds == tools', () => {
  const base = css(rd('about/index.html'));
  const g = (h) => attr(h, /(\/\*g:start v1\*\/[\s\S]*?\/\*g:end\*\/)/);
  GUIDE_DIRS.forEach((d) => { assert.strictEqual(css(gh(d)), base, d); assert.strictEqual(g(gh(d)), g(gh(GUIDE_DIRS[0])), d + ' g block'); });
});
c('G02 meta / canonical / OGP', () => GUIDE_DIRS.forEach((d) => {
  const h = gh(d);
  assert.strictEqual(attr(h, /<link rel="canonical" href="([^"]*)"/), BASE + d, d);
  assert.strictEqual(attr(h, /<meta property="og:url" content="([^"]*)"/), BASE + d, d);
  const title = attr(h, /<title>([^<]+)<\/title>/); assert.ok(title.length >= 20 && title.length <= 60, d + ' title len ' + title.length);
  const desc = attr(h, /<meta name="description" content="([^"]*)"/); assert.ok(desc.length >= 80 && desc.length <= 160, d + ' desc len ' + desc.length);
  assert.strictEqual(attr(h, /<meta property="og:title" content="([^"]*)"/), title);
  assert.strictEqual(attr(h, /<meta property="og:description" content="([^"]*)"/), desc);
  assert.strictEqual(attr(h, /<meta property="og:type" content="([^"]*)"/), 'article');
  assert.ok(attr(h, /<meta property="og:site_name" content="([^"]*)"/).length > 0);
  assert.strictEqual(attr(h, /<meta name="twitter:card" content="([^"]*)"/), 'summary_large_image');
  assert.ok(/<meta property="og:image" content="https:\/\/gakusei-tools\.com\/og\/[a-z]+\.png">/.test(h), d + ' og:image');
  assert.ok(/<html lang="ja">/.test(h) && /<meta charset="utf-8">/.test(h) && /name="viewport"/.test(h) && /name="robots" content="index,follow"/.test(h));
  assert.ok(h.includes('<meta name="theme-color" content="#f8fafc">\n<meta name="theme-color" content="#0b1220" media="(prefers-color-scheme: dark)">'), d + ' theme-color');
}));
c('G03 JSON-LD Article/Breadcrumb/FAQPage', () => GUIDE_DIRS.forEach((d) => {
  const h = gh(d); const b = ldBlocks(h); assert.strictEqual(b.length, 3, d);
  b.forEach((x) => assert.strictEqual(x['@context'], 'https://schema.org'));
  const [art, crumb, faq] = b;
  assert.strictEqual(art['@type'], 'Article');
  assert.strictEqual(art.headline, plain(attr(h, /<h1>([\s\S]*?)<\/h1>/)));
  assert.ok(art.headline.length <= 110, d + ' headline');
  assert.strictEqual(art.author.name, SELLER); assert.strictEqual(art.publisher.name, SELLER);
  assert.strictEqual(art.datePublished, GDATE(d)); assert.strictEqual(art.dateModified, GDATE(d));
  assert.strictEqual(art.mainEntityOfPage['@id'], BASE + d);
  assert.strictEqual(art.description, attr(h, /<meta name="description" content="([^"]*)"/));
  assert.strictEqual(crumb['@type'], 'BreadcrumbList');
  const it = crumb.itemListElement; assert.strictEqual(it[it.length - 1].item, BASE + d); assert.strictEqual(it[0].item, BASE);
  it.forEach((x, i) => assert.strictEqual(x.position, i + 1));
  assert.strictEqual(faq['@type'], 'FAQPage');
  const sec = attr(h, /(<section class="card" id="faq"[\s\S]*?<\/section>)/);
  const qs = [...sec.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [plain(m[1]), plain(m[2])]);
  assert.strictEqual(qs.length, 3, d + ' faq count');
  assert.strictEqual(faq.mainEntity.length, qs.length);
  qs.forEach((q, i) => { assert.strictEqual(faq.mainEntity[i].name, q[0], d + ' Q' + i); assert.strictEqual(faq.mainEntity[i].acceptedAnswer.text, q[1], d + ' A' + i); });
}));
c('G04 links resolve (relative, hash, external allowlist in #sources)', () => GUIDE_DIRS.forEach((d) => {
  const p = d + 'index.html'; const raw = rd(p); const h = stripComments(raw);
  const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const src = attr(h, /(<details class="acc" id="sources">[\s\S]*?<\/details>)/);
  const hrefs = [...h.matchAll(/<a\b[^>]*?\bhref="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length > 0);
  hrefs.forEach((x) => {
    assert.notStrictEqual(x, '#', d + ' href="#"');
    if (/^https?:/.test(x)) {
      assert.ok(src.includes('href="' + x + '"'), d + ' external outside #sources ' + x);
      assert.ok(GCFG[d].hosts.includes(new URL(x).hostname.toLowerCase()), d + ' host ' + x);
      assert.ok(x.startsWith('https://'), d + ' https ' + x);
    } else if (x.startsWith('mailto:')) { assert.strictEqual(x, 'mailto:' + MAIL); }
    else if (x.startsWith('#')) { assert.ok(ids.has(x.slice(1)), d + ' anchor ' + x); }
    else { assert.ok(!x.startsWith('/') && !x.startsWith(BASE), d + ' abs ' + x); assert.ok(rsl(p, x), d + ' -> ' + x); }
  });
  [...h.matchAll(/<a\b[^>]*href="https?:[^>]*>/g)].forEach((m) => assert.ok(/target="_blank"/.test(m[0]) && /rel="noopener noreferrer"/.test(m[0]), d + ' ext attrs'));
  assert.ok((src.match(/<a\b/g) || []).length >= 5, d + ' sources count');
}));
c('G05 footer links + rel aside + nav', () => GUIDE_DIRS.forEach((d) => {
  const p = d + 'index.html'; const h = rd(p);
  const m = attr(h, /(<p class="foot-links">[\s\S]*?<\/p>)/);
  const hrefs = [...m.matchAll(/href="([^"]*)"/g)].map((x) => x[1]);
  ['../../tools/', '../../about/', '../../about/#disclaimer', '../../privacy/'].forEach((w) => assert.ok(hrefs.includes(w), d + ' foot ' + w));
  hrefs.filter((x) => !x.startsWith('mailto:')).forEach((x) => assert.ok(rsl(p, x), d + ' foot resolves ' + x));
  const fi = h.lastIndexOf('<footer'); assert.ok(fi > 0 && !/<details/.test(h.slice(fi)), d + ' footer has details');
  const aside = attr(h, /(<aside class="rel"[\s\S]*?<\/aside>)/);
  const ah = [...aside.matchAll(/<a href="([^"]*)"/g)].map((x) => x[1]);
  assert.deepStrictEqual(ah.slice().sort(), ['../../', '../../kakemochi/', '../../shift-limit/', '../../living-cost-simulator/', '../../es-word-counter/', '../../nisa-simulator/'].sort(), d + ' rel links');
  ah.forEach((x) => assert.ok(rsl(p, x), d + ' rel ' + x));
  assert.ok(!/aria-current/.test(aside), d + ' rel aria-current');
  assert.ok(aside.includes('id="toolsH"') && aside.includes('id="sisters"'), d + ' rel ids');
  assert.ok(h.indexOf('</main>') < h.indexOf('<aside class="rel"') && h.indexOf('<aside class="rel"') < h.indexOf('<footer'), d + ' rel position');
  assert.ok(!/<a[^>]*href="(\.\.\/)*(about|tools)\/"[^>]*>/.test(aside), d + ' rel has about/tools');
  const nav = attr(h, /(<nav\b[\s\S]*?<\/nav>)/);
  const nh = [...nav.matchAll(/href="([^"]*)"/g)].map((x) => x[1]);
  assert.deepStrictEqual(nh, ['../../', './', '#toolsH'], d + ' nav');
  assert.strictEqual((nav.match(/aria-current="page"/g) || []).length, 1, d + ' nav current');
}));
c('G06 structure', () => GUIDE_DIRS.forEach((d) => {
  const h = gh(d); const t = stripComments(h);
  assert.strictEqual((h.match(/<nav\b/g) || []).length, 1, d + ' nav');
  assert.strictEqual((h.match(/<h1\b/g) || []).length, 1, d + ' h1');
  [...h.matchAll(/<script\b([^>]*)>/g)].forEach((s) => assert.ok(/type="application\/ld\+json"/.test(s[1]) || s[1].trim() === 'src="../../site-config.js" defer', d + ' script'));
  ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'indexedDB'].forEach((w) => assert.ok(!h.includes(w), d + ' forbidden ' + w));
  assert.ok(!/outline:\s*(none|0)/.test(h), d + ' outline');
  const markup = h.replace(/<style>[\s\S]*?<\/style>/, '');
  ['id="shareX"', 'id="prCards"', 'id="actions"', 'ad-slot', 'class="pr-', 'rel="sponsored'].forEach((w) => assert.ok(!markup.includes(w), d + ' ' + w));
  assert.ok(Buffer.byteLength(h, 'utf8') <= 102400, d + ' size');
  const ids = [...t.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]); assert.strictEqual(new Set(ids).size, ids.length, d + ' duplicate id');
  assert.ok(h.includes('<a class="skip" href="#main">') && h.includes('<main id="main">'), d + ' skip/main');
  ['pts', 'toc', 'faq', 'sources', 'disc', 'tc-end'].forEach((i) => assert.ok(h.includes('id="' + i + '"') || h.includes('class="' + i + '"'), d + ' missing ' + i));
  assert.ok(!/<details[^>]*\bopen\b/.test(h), d + ' details open');
  assert.ok(/<table/.test(h) && /<div class="tw">/.test(h), d + ' table in .tw');
  assert.ok((h.match(/<\/table>/g) || []).length === (h.match(/<div class="tw"><table/g) || []).length, d + ' every table wrapped by .tw');
  assert.ok(h.indexOf('class="chk"') > 0, d + ' checklist');
}));
c('G07 always-visible band / meta / disclaimer', () => GUIDE_DIRS.forEach((d) => {
  const h = gh(d);
  const band = attr(h, /(<div class="band"[\s\S]*?<\/div>)/);
  assert.ok(/目安|仮定の試算/.test(band) && new RegExp('(最終確認日|最終更新日) ' + GDATE(d)).test(band), d + ' band');
  assert.ok(h.includes('公開日 ' + GDATE(d)) && h.includes('学生バイトお役立ちツール 運営事務局'), d + ' meta');
  const src = attr(h, /(<details class="acc" id="sources">[\s\S]*?<\/details>)/); assert.ok(new RegExp('確認日 ' + GDATE(d) + '|公開前に原文').test(src) || /目安/.test(src), d + ' sources note');
  const disc = attr(h, /(<section class="card" id="disc"[\s\S]*?<\/section>)/); assert.ok(/目安|保証|助言|勧誘/.test(disc), d + ' disc');
  const before = h.slice(0, h.indexOf('<details class="acc toc"'));
  assert.ok(before.includes('class="band"') && before.includes('class="pts"'), d + ' band/pts before toc');
}));
c('G08 text length / banned words / must words', () => GUIDE_DIRS.forEach((d) => {
  const h = gh(d); const body = plain(mainOf(h));
  assert.ok(body.length >= 2500 && body.length <= 7000, d + ' main text length ' + body.length);
  const art = plain(attr(h, /(<article class="art">[\s\S]*?<\/article>)/)); assert.ok(art.length >= 2200, d + ' article length ' + art.length);
  BANNED.forEach((w) => assert.ok(!body.includes(w), d + ' banned ' + w));
  GCFG[d].must.forEach((w) => assert.ok(body.includes(w), d + ' missing ' + w));
  GCFG[d].not.forEach((w) => assert.ok(!body.includes(w) && !h.includes(w), d + ' has ' + w));
  assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(h.replace(/<style>[\s\S]*?<\/style>/, '')), d + ' emoji');
}));
c('G09 tool cards (mid + end, correct links)', () => GUIDE_DIRS.forEach((d) => {
  const p = d + 'index.html'; const h = rd(p); const main = mainOf(h);
  const groups = [...main.matchAll(/<div class="tc"[\s\S]*?<\/div>/g)].map((m) => m[0]);
  assert.ok(groups.length >= 2, d + ' tc groups');
  assert.ok(main.indexOf('class="tc"') < main.indexOf('id="tc-end"'), d + ' mid before end');
  assert.ok(main.indexOf('id="tc-end"') > main.indexOf('</article>'), d + ' end after article');
  assert.ok(main.lastIndexOf('class="go"') > main.indexOf('id="tc-end"') - 1, d + ' go in end');
  GCFG[d].tools.forEach((t) => {
    assert.ok(rsl(p, t), d + ' tool ' + t);
    const n = groups.filter((g) => g.includes('href="' + t + '"')).length; assert.ok(n >= 2, d + ' tool ' + t + ' count ' + n);
  });
  groups.forEach((g) => [...g.matchAll(/class="go" href="([^"]*)"/g)].forEach((m) => assert.ok(!/^https?:|^\//.test(m[1]), d + ' go rel')));
  assert.ok(!/今すぐ|お得|無料でお試し|限定/.test(plain(main)), d + ' pushy');
}));
c('G10 nisa risk notice visible and prominent', () => {
  const h = gh('guides/student-nisa-start/'); const m = mainOf(h);
  const i = m.indexOf('class="risk"'); assert.ok(i > 0, 'risk');
  assert.ok(i < m.indexOf('id="toc"') && i < m.indexOf('id="s1"'), 'risk before toc/body');
  const r = plain(attr(m, /(<p class="risk"[\s\S]*?<\/p>)/));
  ['元本割れ', '保証されません', '勧誘', '推奨', '仮定'].forEach((w) => assert.ok(r.includes(w), 'risk ' + w));
  assert.ok(!/class="pr-|id="prCards"/.test(h));
});
c('G10b baito-nisa-monthly: 4 notices prominent, table == formula, no brand', () => {
  const h = gh('guides/baito-nisa-monthly/'); const m = mainOf(h);
  const i = m.indexOf('class="risk"'); assert.ok(i > 0 && i < m.indexOf('id="toc"'), 'risk before toc');
  const r = plain(attr(m, /(<p class="risk"[\s\S]*?<\/p>)/));
  ['元本割れの可能性', '利回りは保証されません', '勧誘', '推奨', '税・手数料は含みません', '仮定'].forEach((w) => assert.ok(r.includes(w), 'risk ' + w));
  assert.ok(/元本割れ/.test(plain(attr(h, /(<div class="band"[\s\S]*?<\/div>)/))), 'band');
  assert.ok(m.indexOf('<p class="note">') > m.indexOf('id="s2"') && m.indexOf('<p class="note">') < m.indexOf('<table'), 'note above table');
  const fv = (P, R, y) => { const n = y * 12; if (R === 0) return P * n; const i2 = Math.pow(1 + R / 100, 1 / 12) - 1; return Math.round(P * (Math.pow(1 + i2, n) - 1) / i2); };
  const tbl = plain(attr(m, /(<table[\s\S]*?<\/table>)/));
  [5000, 10000].forEach((P) => [2, 3, 4].forEach((y) => { [0, 3].forEach((R) => assert.ok(tbl.includes(fv(P, R, y).toLocaleString('en-US') + '円'), 'cell ' + P + '/' + y + '/' + R)); }));
  assert.ok(!/class="pr-|id="prCards"/.test(h));
});
c('G10c kokuho-150-cost: no concrete premium amounts', () => {
  const k = plain(mainOf(gh('guides/kokuho-150-cost/')));
  assert.ok(/いくらかは[^。]*自治体/.test(k) || /自治体で違/.test(k));
  const yenHits = [...k.matchAll(/(\d[\d,]*)(万)?円/g)].map((x) => x[0]);
  yenHits.forEach((x) => assert.ok(x === '150万円' || x === '130万円', 'unexpected yen amount ' + x));
  assert.ok(!/月[◯〇0-9]+円|[0-9]円くらい/.test(k));
});
c('G11 es: not assertive about outcome', () => {
  const h = gh('guides/es-star-method/'); const m = plain(mainOf(h));
  assert.ok(!/落ちない|通過する|必ず評価|合格を保証|内定を保証します/.test(m));
  assert.ok((m.match(/経験則/g) || []).length >= 3, 'keiken x3');
  assert.ok(/公式[のな]?基準ではなく/.test(m) || /公式な基準ではなく/.test(m), 'not official');
  assert.ok(/29卒/.test(m) ? /推測/.test(m) : true, '29 conj');
});
c('G12 kakemochi / 150: hedged facts', () => {
  const k = plain(mainOf(gh('guides/kakemochi-tax-guide/')));
  assert.ok(!/今から取得できる|ID・パスワード方式を使えます/.test(k));
  assert.ok(/新規発行[^。]*停止/.test(k), 'id/pw stopped');
  assert.ok(/還付はありません/.test(k), '0 yen no refund');
  assert.ok(!/〇日で振り込まれます|必ず還付/.test(k));
  const w = plain(mainOf(gh('guides/150-wall-guide/')));
  assert.ok(/目安/.test(w) && /加入先|保険者/.test(w), '150 hedge');
  assert.ok(!/今すぐ扶養が外れ|全員に共通の期限です|扶養のままの方が得/.test(w));
  assert.ok(/全員に共通の期限ではありません/.test(w) || /共通の期限/.test(w), '150 not universal');
});
c('G13 tools lists all guides, no stray root files in guides', () => {
  const t = stripComments(rd('tools/index.html'));
  GUIDE_DIRS.forEach((d) => { assert.ok(t.includes('href="../' + d + '"'), d + ' in tools'); assert.ok(fs.existsSync(path.join(root, d, 'index.html')), d + ' exists');
    ['sitemap.xml', 'robots.txt', '.nojekyll'].forEach((f) => assert.ok(!fs.existsSync(path.join(root, d, f)), d + f)); });
  assert.ok(/id="cat-guides"/.test(t) && !/<!-- ADD:guides/.test(rd('tools/index.html')), 'ADD:guides replaced');
  assert.ok(!/ADD:scholarship/.test(rd('tools/index.html')), 'ADD:scholarship replaced');
  assert.strictEqual(ldBlocks(rd('tools/index.html'))[0].mainEntity.numberOfItems, TOOL_DIRS.length + GUIDE_DIRS.length);
});
// G14: logic ブロック（<script id="logic">…</script>）の SHA-256 は着手前（2026-11-18 の総点検の前）から不変。about は title のみ固定。
const LOGIC0 = {
  'index.html': 'd0ef39fb19ffe3a23a8c61e95c8253982b7604c2009d38c02c10914bcd46b8aa',
  'kakemochi/index.html': '193ee57f717e9d371efb9ace4bbda661943f9509d2f3c6c31c2a38b548d9fbee',
  'shift-limit/index.html': '9bc764c896bf84b78546d7514f4764691a876e0b26cb88808627ebe115d7320c',
  'living-cost-simulator/index.html': '83725e14a8fb818e570a110281fd8cc737c0adcb5cc810c3eca0ccb1860f4cb7',
  'es-word-counter/index.html': 'a39f7041db6e642f49081c29ff96881137daecb1af92e786ad623e1f51f4405c',
  'nisa-simulator/index.html': 'faa451ee994c6889d214909d6bfd0bf10a462b7c1fac04781649dbe738981ebe',
  'scholarship/index.html': 'a0bcd651b310875ed56fc074dff2bbacb61bd40b8ca7b80e872f903980efe1fb'
};
c('G14 7 tool pages: logic block SHA-256 frozen; about title fixed', () => {
  assert.strictEqual(attr(rd('about/index.html'), /<title>([^<]+)<\/title>/), TITLE['about/']);
  Object.keys(LOGIC0).forEach((k) => {
    const m = rd(k).match(/<script id="logic">[\s\S]*?<\/script>/); assert.ok(m, k + ' logic');
    assert.strictEqual(require('crypto').createHash('sha256').update(m[0]).digest('hex'), LOGIC0[k], k + ' logic changed');
  });
});

// ---- 季節ガイド4本（2026-11-22 追加）。T1〜T11 ----
const SEASON_OG = { 'guides/gensen-choshu-hyo/': 'kakemochi', 'guides/kinro-gakusei-kojo/': 'kabe', 'guides/student-juminzei/': 'kabe', 'guides/oya-kojo-daigakusei/': 'kabe' };
const SECONDARY = ['moneyforward', 'yayoi', 'mmea.biz', 'limo.media', 'freee', 'zeimo', 'keiri-tools'];
const sid = (d) => d.replace(/^guides\//, '').replace(/\/$/, '');
const sentences = (h) => { const m = mainOf(h); const out = [];
  [...m.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].forEach((x) => plain(x[2]).split('。').forEach((s) => out.push(s))); return out; };
c('T1 ds identical to about, canonical/og:url/sitemap, lastmod, sitemap 21, tools 4 links + ItemList 18', () => {
  const base = css(rd('about/index.html'));
  const sm = rd('sitemap.xml'); const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs.length, 21); assert.strictEqual(new Set(locs).size, 21);
  const tools = stripComments(rd('tools/index.html'));
  SEASON.forEach((d) => {
    const h = gh(d);
    assert.strictEqual(css(h), base, d + ' ds');
    assert.strictEqual(attr(h, /<link rel="canonical" href="([^"]*)"/), BASE + d);
    assert.strictEqual(attr(h, /<meta property="og:url" content="([^"]*)"/), BASE + d);
    assert.ok(locs.includes(BASE + d), d + ' in sitemap');
    const blk = sm.match(new RegExp('<loc>' + (BASE + d).replace(/[.\/]/g, '\\$&') + '</loc>\\s*<lastmod>([^<]*)</lastmod>')); assert.ok(blk, d + ' lastmod'); assert.strictEqual(blk[1], '2026-11-22');
    assert.ok(tools.includes('href="../' + d + '"'), d + ' in tools');
  });
  assert.strictEqual(ldBlocks(rd('tools/index.html'))[0].mainEntity.numberOfItems, 18);
});
c('T2 og:image png exists and matches the plan', () => SEASON.forEach((d) => {
  const h = gh(d); const og = attr(h, /<meta property="og:image" content="([^"]*)"/);
  assert.strictEqual(og, BASE + 'og/' + SEASON_OG[d] + '.png', d); assert.ok(fs.existsSync(path.join(root, 'og', SEASON_OG[d] + '.png')), d + ' png');
  assert.strictEqual(attr(h, /<meta name="twitter:image" content="([^"]*)"/), og);
  assert.strictEqual(attr(h, /<meta property="og:image:width" content="([^"]*)"/), '1200'); assert.strictEqual(attr(h, /<meta property="og:image:height" content="([^"]*)"/), '630');
}));
c('T3 sources: >=5 external, allowlist, no secondary media, no external links outside #sources, hint date', () => SEASON.forEach((d) => {
  const h = stripComments(gh(d)); const src = attr(h, /(<details class="acc" id="sources">[\s\S]*?<\/details>)/);
  const ext = [...src.matchAll(/<a\b[^>]*href="(https?:[^"]*)"/g)].map((m) => m[1]);
  assert.ok(ext.length >= 5, d + ' ext ' + ext.length);
  ext.forEach((x) => { assert.ok(GCFG[d].hosts.includes(new URL(x).hostname), d + ' host ' + x); SECONDARY.forEach((s) => assert.ok(!x.includes(s), d + ' secondary ' + x)); });
  const rest = h.replace(src, ''); assert.ok(!/<a\s[^>]*href="https?:/.test(rest), d + ' external outside sources');
  assert.ok(/<p class="hint">最終確認日 2026-11-22/.test(src), d + ' hint');
  assert.ok(!/<details[^>]*\bopen\b/.test(src));
}));
c('T4 old values only next to an old/period marker (p/li sentences)', () => SEASON.forEach((d) => {
  const KEYS = ['65万円', '58万円', '48万円', '95万円', '130万円まで'];
  sentences(gh(d)).forEach((s) => KEYS.forEach((k) => { if (s.includes(k)) assert.ok(/旧|令和7年|令和6年|令和8年度/.test(s), d + ' [' + k + '] ' + s); }));
}));
c('T5 forbidden phrases absent', () => SEASON.forEach((d) => {
  const body = plain(mainOf(gh(d)));
  ['年調未済', '1月31日は日曜', '令和9年1月31日', '2月16日', '1月12日', '1月20日', '115.5万円', '112万円', '令和11年度'].forEach((w) => assert.ok(!body.includes(w), d + ' has ' + w));
  if (d === 'guides/oya-kojo-daigakusei/') assert.ok(!body.includes('33万円') && !body.includes('45万円'), d + ' resident-tax amounts');
  if (d === 'guides/kinro-gakusei-kojo/') { const s = sentences(gh(d)).filter((x) => x.includes('簡易な申告書')); assert.ok(s.length >= 1 && s.every((x) => x.includes('使えない')), d + ' simple form'); }
}));
c('T6 no ad / affiliate markup, band has PR notice', () => SEASON.forEach((d) => {
  const h = gh(d); const markup = h.replace(/<style>[\s\S]*?<\/style>/, '');
  ['links-config.js', 'px.a8.net', 'a8mat', '0.gif', 'rel="sponsored', 'class="pr-', 'prCards', 'ad-slot'].forEach((w) => assert.ok(!markup.includes(w), d + ' has ' + w));
  assert.ok(attr(h, /(<div class="band"[\s\S]*?<\/div>)/).includes('プロモーション（PR）'), d + ' band PR');
  if (d.includes('gensen') || d.includes('kinro')) assert.ok(/結果によってPR（広告）が表示されることがあります/.test(markup), d + ' go-d PR');
}));
c('T7 calculations: income = X - 740,000 and the worked numbers are in the text', () => {
  const inc = (x) => x - 740000; const fmt = (n) => n.toLocaleString('en-US');
  const body = (d) => plain(mainOf(gh(d)));
  let b = body('guides/gensen-choshu-hyo/');
  assert.strictEqual(inc(1300000), 560000); assert.strictEqual(1040000 + 270000, 1310000); assert.ok(inc(1300000) < 1310000);
  assert.strictEqual(inc(1780000), 1040000); assert.strictEqual(Math.max(0, inc(1780000) - 1040000), 0); assert.strictEqual(inc(1781000) - 1040000, 1000);
  [1300000, 560000, 1310000, 1780000, 1781000, 1040000, 1041000].forEach((n) => assert.ok(b.includes(fmt(n)), 'gensen ' + n));
  b = body('guides/kinro-gakusei-kojo/');
  const wari = (x, k) => Math.max(0, inc(x) - 430000 - (k ? 260000 : 0)) * 0.1;
  assert.strictEqual(inc(1400000), 660000); assert.strictEqual(wari(1400000, 0), 23000); assert.strictEqual(wari(1400000, 1), 0);
  assert.strictEqual(inc(1600000), 860000); assert.strictEqual(wari(1600000, 0), 43000); assert.strictEqual(wari(1600000, 1), 17000); assert.strictEqual(wari(1600000, 0) - wari(1600000, 1), 26000);
  assert.ok(inc(1640000) > 890000 && inc(1630000) === 890000);
  assert.strictEqual(74 + 43 + 26, 143); assert.strictEqual(65 + 43 + 26, 134);
  [660000, 23000, 43000, 17000, 860000, 900000, 26000].forEach((n) => assert.ok(b.includes(fmt(n)), 'kinro ' + n));
  b = body('guides/student-juminzei/');
  assert.strictEqual(inc(1150000), 410000); assert.ok(inc(1150000) <= 450000); assert.strictEqual(45 + 74, 119); assert.strictEqual(45 + 65, 110);
  assert.strictEqual(inc(1300000), 560000); assert.strictEqual((560000 - 430000) * 0.1, 13000); assert.strictEqual(13000 + 5000, 18000); assert.strictEqual(Math.max(0, 560000 - 430000 - 260000), 0);
  assert.strictEqual(1150000 - 650000, 500000); assert.ok(500000 > 450000);
  [410000, 560000, 13000, 18000, 500000, 1150000].forEach((n) => assert.ok(b.includes(fmt(n)), 'juminzei ' + n));
  b = body('guides/oya-kojo-daigakusei/');
  const EXP = [['62万円以下', '特定扶養63万円', '136万円以下'], ['62万円超85万円以下', '63万円', '136万円超159万円以下'], ['85万円超90万円以下', '61万円', '159万円超164万円以下'], ['90万円超95万円以下', '51万円', '164万円超169万円以下'], ['95万円超100万円以下', '41万円', '169万円超174万円以下'], ['100万円超105万円以下', '31万円', '174万円超179万円以下'], ['105万円超110万円以下', '21万円', '179万円超184万円以下'], ['110万円超115万円以下', '11万円', '184万円超189万円以下'], ['115万円超120万円以下', '6万円', '189万円超194万円以下'], ['120万円超123万円以下', '3万円', '194万円超197万円以下'], ['123万円超', '0円', '197万円超']];
  const sec = attr(gh('guides/oya-kojo-daigakusei/'), /(<section class="card" id="s2"[\s\S]*?<\/section>)/);
  const rows = [...sec.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.strictEqual(rows.length, 11); assert.deepStrictEqual(rows, EXP);
  // 給与換算列は 合計所得上限 + 74万円
  const hi = [62, 85, 90, 95, 100, 105, 110, 115, 120, 123]; hi.forEach((v, i) => assert.ok(EXP[i][2].endsWith((v + 74) + '万円以下'), 'oya conv ' + v));
  const ctl = (i2) => (i2 <= 850000 ? 630000 : i2 <= 900000 ? 610000 : i2 <= 950000 ? 510000 : i2 <= 1000000 ? 410000 : i2 <= 1050000 ? 310000 : i2 <= 1100000 ? 210000 : i2 <= 1150000 ? 110000 : i2 <= 1200000 ? 60000 : i2 <= 1230000 ? 30000 : 0);
  assert.strictEqual(ctl(inc(1360000)), 630000); assert.strictEqual(ctl(inc(1500000)), 630000); assert.strictEqual(ctl(inc(1800000)), 210000); assert.strictEqual(ctl(inc(1970000)), 30000); assert.strictEqual(ctl(inc(1971000)), 0);
  assert.strictEqual(630000 * 0.1, 63000); assert.strictEqual(630000 * 0.2, 126000); assert.strictEqual(63000 - 21000, 42000);
  [63000, 126000, 21000, 42000, 1231000, 1230000, 620000, 760000, 1060000].forEach((n) => assert.ok(b.includes(fmt(n)), 'oya ' + n));
});
c('T8 text length', () => SEASON.forEach((d) => {
  const h = gh(d); const m = plain(mainOf(h)).length; assert.ok(m >= 3000 && m <= 5000, d + ' main ' + m);
  assert.ok(plain(attr(h, /(<article class="art">[\s\S]*?<\/article>)/)).length >= 2200, d + ' article');
}));
c('T9 banned words, hedging counts', () => SEASON.forEach((d) => {
  const body = plain(mainOf(gh(d)));
  ['必ず', '絶対', '確実'].forEach((x) => assert.ok(!body.includes(x), d + ' ' + x));
  assert.ok((body.match(/目安/g) || []).length >= 4, d + ' 目安');
  if (!d.includes('gensen')) assert.ok((body.match(/自治体/g) || []).length >= 2, d + ' 自治体');
  GCFG[d].not.forEach((w) => assert.ok(!body.includes(w), d + ' not ' + w));
}));
c('T10 cross links: 3-6 internal article links, >=1 to a new article, existing guides link to new', () => {
  SEASON.forEach((d) => {
    const m = mainOf(gh(d));
    const hs = [...new Set([...m.matchAll(/<a\b[^>]*?\bhref="(\.\.\/[a-z0-9-]+\/)"/g)].map((x) => x[1]))];
    assert.ok(hs.length >= 3 && hs.length <= 6, d + ' internal links ' + hs.length);
    hs.forEach((x) => assert.ok(rsl(d + 'index.html', x), d + ' -> ' + x));
    assert.ok(hs.filter((x) => SEASON.some((s) => '../' + sid(s) + '/' === x) && x !== '../' + sid(d) + '/').length >= 1, d + ' links to a new article');
    [...m.matchAll(/<a\b[^>]*?\bhref="\.\.\/[a-z0-9-]+\/"[^>]*>([^<]*)<\/a>/g)].forEach((x) => assert.ok(!/\d/.test(x[1]), d + ' link text has digits ' + x[1]));
  });
  const MAP = { 'guides/nenmatsu-chosei-miss/': ['../kinro-gakusei-kojo/', '../gensen-choshu-hyo/'], 'guides/150-wall-guide/': ['../oya-kojo-daigakusei/'], 'guides/kakemochi-tax-guide/': ['../gensen-choshu-hyo/'], 'guides/kokuho-150-cost/': ['../student-juminzei/'] };
  Object.keys(MAP).forEach((d) => { const m = mainOf(gh(d)); MAP[d].forEach((x) => { assert.ok(m.includes('href="' + x + '"'), d + ' -> ' + x); assert.ok(rsl(d + 'index.html', x)); }); });
});
c('T11 FAQ is 3 Q&A and equals JSON-LD', () => SEASON.forEach((d) => {
  const h = gh(d); const faq = ldBlocks(h)[2]; const sec = attr(h, /(<section class="card" id="faq"[\s\S]*?<\/section>)/);
  const qs = [...sec.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [plain(m[1]), plain(m[2])]);
  assert.strictEqual(qs.length, 3); assert.strictEqual(faq.mainEntity.length, 3);
  qs.forEach((q, i) => { assert.strictEqual(faq.mainEntity[i].name, q[0]); assert.strictEqual(faq.mainEntity[i].acceptedAnswer.text, q[1]); assert.ok(!/&[a-z]+;|<wbr>/.test(faq.mainEntity[i].name + faq.mainEntity[i].acceptedAnswer.text)); });
}));

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
