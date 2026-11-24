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
  assert.strictEqual(locs.length, 24);
  assert.deepStrictEqual(can.slice().sort(), DIRS.map((d) => BASE + d).sort());
  const extra = ['about/', 'tools/', 'privacy/', 'guides/150-wall-guide/', 'guides/kakemochi-tax-guide/', 'guides/es-star-method/', 'guides/student-nisa-start/', 'guides/nenmatsu-chosei-miss/', 'guides/kokuho-150-cost/', 'guides/baito-nisa-monthly/', 'guides/gensen-choshu-hyo/', 'guides/kinro-gakusei-kojo/', 'guides/student-juminzei/', 'guides/oya-kojo-daigakusei/', 'guides/fuyo-kojo-shinkokusho/', 'guides/gakusei-nofu-tokurei/', 'guides/furusato-gakusei/', 'scholarship/'];
  assert.deepStrictEqual(locs.slice().sort(), can.concat(extra.map((d) => BASE + d)).sort());
  extra.forEach((d) => assert.strictEqual(rd(d + 'index.html').match(/<link rel="canonical" href="([^"]*)"/)[1], BASE + d, d));
  assert.strictEqual(new Set(locs).size, 24);
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
const GUIDE_DIRS = ['guides/150-wall-guide/', 'guides/kakemochi-tax-guide/', 'guides/es-star-method/', 'guides/student-nisa-start/', 'guides/nenmatsu-chosei-miss/', 'guides/kokuho-150-cost/', 'guides/baito-nisa-monthly/', 'guides/gensen-choshu-hyo/', 'guides/kinro-gakusei-kojo/', 'guides/student-juminzei/', 'guides/oya-kojo-daigakusei/', 'guides/fuyo-kojo-shinkokusho/', 'guides/gakusei-nofu-tokurei/', 'guides/furusato-gakusei/'];
const SEASON = ['guides/gensen-choshu-hyo/', 'guides/kinro-gakusei-kojo/', 'guides/student-juminzei/', 'guides/oya-kojo-daigakusei/'];
const FUYO = 'guides/fuyo-kojo-shinkokusho/';   // 2026-11-23 追加（扶養控除等申告書の書き方・令和9年分）
const NOFU = 'guides/gakusei-nofu-tokurei/';   // 2026-11-24 追加（国民年金の学生納付特例）
const FURU = 'guides/furusato-gakusei/';   // 2026-11-24 追加（大学生のふるさと納税）
const GDATE = (d) => (d === NOFU || d === FURU ? '2026-11-24' : d === FUYO ? '2026-11-23' : SEASON.includes(d) ? '2026-11-22' : ['guides/nenmatsu-chosei-miss/', 'guides/kokuho-150-cost/', 'guides/baito-nisa-monthly/'].includes(d) ? '2026-11-19' : '2026-11-17');   // 公開日・更新日（11-19 の3本、11-22 の季節4本）
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
  'guides/oya-kojo-daigakusei/': { tools: ['../../', '../../shift-limit/'], hosts: GOV_SEASON, must: ['特定親族特別控除', '特定扶養控除', '136万円', '159万円', '197万円', '63万円', '150万円未満', '12月31日', '19歳以上23歳未満', '63,000', '126,000', '21,000', '42,000', '1,231,000'], not: ['必ず戻る', '全員が対象', '確実に非課税', '130万円まで非課税です', '年調未済'] },
  'guides/fuyo-kojo-shinkokusho/': { tools: ['../../', '../../kakemochi/'], hosts: GOV_SEASON, must: ['扶養控除等（異動）申告書', '令和9年分', '勤労学生', '163万円', '89万円', '74万円', '760,000', '890,000', '900,000', '1か所', '簡易な申告書', '源泉控除対象親族', '専修学校', '最初の給与'], not: ['必ず戻る', '全員が対象', '確実に非課税', '130万円まで非課税です', '年調未済', '給料が多い方', '給与が多い方'] },
  'guides/gakusei-nofu-tokurei/': { tools: ['../../', '../../shift-limit/'], hosts: ['www.nenkin.go.jp', 'www.nta.go.jp'], must: ['学生納付特例', '128万円', '17,920円', '2年1か月', '10年以内', '3年度目', 'マイナポータル', '受給資格期間', '障害基礎年金', '社会保険料控除', '令和7年', '194万円', '1,283,600', '1,278,000'], not: ['必ず戻る', '全員が対象', '確実に', '親の所得で', '払わなくてよい'] },
  'guides/furusato-gakusei/': { tools: ['../../', '../../shift-limit/'], hosts: ['www.soumu.go.jp', 'www.nta.go.jp', 'laws.e-gov.go.jp', 'www.city.koto.lg.jp'], must: ['2,000円', '所得割', '所得割額の20%', '調整控除', '30,500', '6,100', '8,700円', '760,000', '330,000', '90%', '5団体以内', 'ワンストップ特例', '名義', '一時所得', '178万円', '119万円', '令和9年度'], not: ['必ず戻る', '実質無料', '全額戻る', 'お得', '翌年1月10日必着', '申請書は翌年1月10日', '9,300円'] }
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
c('T1 ds identical to about, canonical/og:url/sitemap, lastmod, sitemap 24, tools 4 links + ItemList 21', () => {
  const base = css(rd('about/index.html'));
  const sm = rd('sitemap.xml'); const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs.length, 24); assert.strictEqual(new Set(locs).size, 24);
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
  assert.strictEqual(ldBlocks(rd('tools/index.html'))[0].mainEntity.numberOfItems, 21);
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
    const hs = [...new Set([...m.matchAll(/<a\b[^>]*?\bhref="(\.\.\/[a-z0-9-]+\/)"/g)].map((x) => x[1]))].filter((x) => x !== '../' + sid(FUYO) + '/' && x !== '../' + sid(NOFU) + '/' && x !== '../' + sid(FURU) + '/');   // 2026-11-23 の FUYO、2026-11-24 の NOFU・FURU への1文リンクは公開時の本数に数えない
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

// ---- 扶養控除等申告書の書き方（2026-11-23 追加）。F1〜F11（季節4本の T1〜T11 相当）----
c('F1 ds identical to about, canonical/og:url/sitemap lastmod 2026-11-23, sitemap 24, tools link + ItemList 21 + count text', () => {
  const h = gh(FUYO); assert.strictEqual(css(h), css(rd('about/index.html')));
  assert.strictEqual(attr(h, /<link rel="canonical" href="([^"]*)"/), BASE + FUYO);
  assert.strictEqual(attr(h, /<meta property="og:url" content="([^"]*)"/), BASE + FUYO);
  const sm = rd('sitemap.xml'); const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs.length, 24); assert.strictEqual(new Set(locs).size, 24); assert.strictEqual(locs[locs.length - 3], BASE + FUYO);
  const lm = (d) => { const b = sm.match(new RegExp('<loc>' + (BASE + d).replace(/[.\/]/g, '\\$&') + '</loc>\\s*<lastmod>([^<]*)</lastmod>')); assert.ok(b, d + ' lastmod'); return b[1]; };
  assert.strictEqual(lm(FUYO), '2026-11-23');
  SEASON.forEach((d) => assert.strictEqual(lm(d), '2026-11-22', d + ' lastmod unchanged'));
  const t = stripComments(rd('tools/index.html')); assert.ok(t.includes('href="../' + FUYO + '"'));
  const ld = ldBlocks(rd('tools/index.html'))[0].mainEntity; assert.strictEqual(ld.numberOfItems, 21); assert.strictEqual(ld.itemListElement.length, 21);
  assert.strictEqual(ld.itemListElement[18].url, BASE + FUYO); assert.strictEqual(ld.itemListElement[18].position, 19);
  assert.ok(t.includes('全' + GUIDE_DIRS.length + '本') && t.includes('解説記事' + GUIDE_DIRS.length + '本'), 'guide count text');
  const art = ldBlocks(h)[0]; assert.strictEqual(art.datePublished, '2026-11-23'); assert.strictEqual(art.dateModified, '2026-11-23');
  assert.ok(h.includes('<span class="nw">公開日 2026-11-23</span> ／ <span class="nw">最終確認日 2026-11-23</span>'), 'meta line');
});
c('F2 og:image kabe.png exists, alt', () => {
  const h = gh(FUYO); const og = attr(h, /<meta property="og:image" content="([^"]*)"/);
  assert.strictEqual(og, BASE + 'og/kabe.png'); assert.ok(fs.existsSync(path.join(root, 'og', 'kabe.png')));
  assert.strictEqual(attr(h, /<meta name="twitter:image" content="([^"]*)"/), og);
  assert.strictEqual(attr(h, /<meta property="og:image:alt" content="([^"]*)"/), '扶養控除等申告書の書き方の解説のイメージ画像');
});
c('F3 sources: >=5, NTA only, no external outside #sources, hint date', () => {
  const h = stripComments(gh(FUYO)); const src = attr(h, /(<details class="acc" id="sources">[\s\S]*?<\/details>)/);
  const ext = [...src.matchAll(/<a\b[^>]*href="(https?:[^"]*)"/g)].map((m) => m[1]);
  assert.ok(ext.length >= 5, 'ext ' + ext.length);
  ext.forEach((x) => { assert.strictEqual(new URL(x).hostname, 'www.nta.go.jp', x); SECONDARY.forEach((s2) => assert.ok(!x.includes(s2))); });
  ['1648_01.htm', '2027bun_01.pdf', '2027bun_01-1.pdf', 'nencho2026/pdf/309.pdf', '2027bun_02-2.pdf', '1175.htm', '1410.htm'].forEach((u) => assert.ok(ext.some((x) => x.endsWith(u)), 'source ' + u));
  assert.ok(!/<a\s[^>]*href="https?:/.test(h.replace(src, '')), 'external outside sources');
  assert.ok(src.includes('<p class="hint">最終確認日 2026-11-23。国税庁が公開している令和9年分の用紙と記載例をもとにしています。'), 'hint');
  assert.ok(!/<details[^>]*\bopen\b/.test(src));
});
c('F4 old values only next to an old/period marker', () => {
  const KEYS = ['65万円', '58万円', '48万円', '95万円', '130万円まで'];
  sentences(gh(FUYO)).forEach((s2) => KEYS.forEach((k) => { if (s2.includes(k)) assert.ok(/旧|令和7年|令和6年|令和8年度/.test(s2), '[' + k + '] ' + s2); }));
});
c('F5 forbidden / unconfirmed phrases absent, simple-form sentence says it cannot be used', () => {
  const body = plain(mainOf(gh(FUYO)));
  ['年調未済', '1月31日は日曜', '令和9年1月31日', '2月16日', '1月12日', '1月20日', '115.5万円', '112万円', '令和11年度',
    '「父」', '「母」', '「子」', '給料が多い方', '給与が多い方', '通勤手当', '交通費', '兼用', '1枚にまとめ', 'クラウド', '年調ソフト', '住民票の住所を書'].forEach((w) => assert.ok(!body.includes(w), 'has ' + w));
  const s2 = sentences(gh(FUYO)).filter((x) => x.includes('簡易な申告書'));
  assert.ok(s2.some((x) => x.includes('使えない')), 'simple form: 使えない');
  assert.ok(/勤務先の指示の下/.test(body), 'simple form: 勤務先の指示の下');
});
c('F6 no ad / affiliate markup, band text + PR, go-d PR', () => {
  const h = gh(FUYO); const markup = h.replace(/<style>[\s\S]*?<\/style>/, '');
  ['links-config.js', 'px.a8.net', 'a8mat', '0.gif', 'rel="sponsored', 'class="pr-', 'prCards', 'ad-slot'].forEach((w) => assert.ok(!markup.includes(w), 'has ' + w));
  const band = attr(h, /(<div class="band"[\s\S]*?<\/div>)/);
  assert.ok(band.includes('目安です。対象：令和9年分（2027年）の扶養控除等申告書／最終確認日 2026-11-23<br>※当サイトのツールにはプロモーション（PR）を含みます') && band.includes('href="../../about/#disclaimer"'), 'band');
  const kk = [...mainOf(h).matchAll(/<a class="go" href="\.\.\/\.\.\/kakemochi\/">[\s\S]*?<\/a>/g)].map((m) => m[0]);
  assert.strictEqual(kk.length, 2); kk.forEach((g) => assert.ok(g.includes('結果によってPR（広告）が表示されることがあります'), 'go-d PR'));
});
c('F7 calculations: income = X - 740,000 and the table equals it', () => {
  const inc = (x) => x - 740000; const fmt = (n) => n.toLocaleString('en-US');
  const sec = attr(gh(FUYO), /(<section class="card" id="s4"[\s\S]*?<\/section>)/);
  const rows = [...sec.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].map((m) => [m[1], m[2], m[3]]);
  const EXP = [[1200000, '当たる'], [1500000, '当たる'], [1630000, '当たる（上限）'], [1640000, '当たらない']];
  assert.strictEqual(rows.length, EXP.length);
  EXP.forEach(([x, k], i) => { assert.deepStrictEqual(rows[i], [fmt(x) + '円', fmt(inc(x)) + '円', k]); assert.strictEqual(inc(x) <= 890000, k !== '当たらない'); });
  assert.strictEqual(inc(1630000), 890000); assert.strictEqual(89 + 74, 163);
  assert.ok(sec.includes('「〇〇大学　令和7年4月入学　給与所得　' + fmt(inc(1500000)) + '円」'), 'example');   // 全角空白は plain() で潰れるので生の HTML で見る
});
c('F8 text length', () => {
  const h = gh(FUYO); const m = plain(mainOf(h)).length; assert.ok(m >= 3000 && m <= 5000, 'main ' + m);
  assert.ok(plain(attr(h, /(<article class="art">[\s\S]*?<\/article>)/)).length >= 2200, 'article');
});
c('F9 banned words, hedging count', () => {
  const body = plain(mainOf(gh(FUYO)));
  BANNED.forEach((x) => assert.ok(!body.includes(x), x));
  assert.ok((body.match(/目安/g) || []).length >= 4, '目安');
  GCFG[FUYO].not.forEach((w) => assert.ok(!body.includes(w), 'not ' + w));
});
c('F10 cross links: 3-6 internal article links incl. the planned 5, existing guides link to it', () => {
  const m = mainOf(gh(FUYO));
  const hs = [...new Set([...m.matchAll(/<a\b[^>]*?\bhref="(\.\.\/[a-z0-9-]+\/)"/g)].map((x) => x[1]))];
  assert.ok(hs.length >= 3 && hs.length <= 6, 'internal links ' + hs.length);
  ['kinro-gakusei-kojo', 'oya-kojo-daigakusei', 'kakemochi-tax-guide', 'nenmatsu-chosei-miss', 'gensen-choshu-hyo'].forEach((x) => assert.ok(hs.includes('../' + x + '/'), 'missing ' + x));
  hs.forEach((x) => assert.ok(rsl(FUYO + 'index.html', x), '-> ' + x));
  [...m.matchAll(/<a\b[^>]*?\bhref="\.\.\/[a-z0-9-]+\/"[^>]*>([^<]*)<\/a>/g)].forEach((x) => assert.ok(!/\d/.test(x[1]), 'link text has digits ' + x[1]));
  ['guides/kinro-gakusei-kojo/', 'guides/nenmatsu-chosei-miss/', 'guides/kakemochi-tax-guide/'].forEach((d) => {
    const mm = mainOf(gh(d)); assert.strictEqual((mm.match(/href="\.\.\/fuyo-kojo-shinkokusho\/"/g) || []).length, 1, d + ' -> fuyo');
    assert.ok(mm.includes('<a href="../fuyo-kojo-shinkokusho/">扶養控除等申告書の書き方</a>'), d + ' link text');
  });
});
c('F11 FAQ is 3 Q&A, equals JSON-LD and the plan', () => {
  const h = gh(FUYO); const faq = ldBlocks(h)[2]; const sec = attr(h, /(<section class="card" id="faq"[\s\S]*?<\/section>)/);
  const qs = [...sec.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [plain(m[1]), plain(m[2])]);
  assert.strictEqual(qs.length, 3); assert.strictEqual(faq.mainEntity.length, 3);
  qs.forEach((q, i) => { assert.strictEqual(faq.mainEntity[i].name, q[0]); assert.strictEqual(faq.mainEntity[i].acceptedAnswer.text, q[1]); assert.ok(!/&[a-z]+;|<wbr>/.test(q[0] + q[1])); });
  assert.deepStrictEqual(qs.map((q) => q[0]), ['親の扶養に入っています。親の名前やマイナンバーを書く必要はありますか？', '年の途中で、給与収入が163万円を超えそうになったらどうしますか？', '扶養控除等申告書を出し忘れたら、どうなりますか？']);
});

// ---- 学生納付特例（2026-11-24 追加）。N1〜N10（F1〜F11 相当）----
c('N1 ds identical to about, canonical/og:url, sitemap lastmod 2026-11-24 (last), tools link + ItemList 20 + count text, dates', () => {
  const h = gh(NOFU); assert.strictEqual(css(h), css(rd('about/index.html')));
  assert.strictEqual(attr(h, /<link rel="canonical" href="([^"]*)"/), BASE + NOFU);
  assert.strictEqual(attr(h, /<meta property="og:url" content="([^"]*)"/), BASE + NOFU);
  const sm = rd('sitemap.xml'); const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs[locs.length - 2], BASE + NOFU);
  const b = sm.match(new RegExp('<loc>' + (BASE + NOFU).replace(/[.\/]/g, '\\$&') + '</loc>\\s*<lastmod>([^<]*)</lastmod>')); assert.ok(b); assert.strictEqual(b[1], '2026-11-24');
  const t = stripComments(rd('tools/index.html')); assert.ok(t.includes('href="../' + NOFU + '"'));
  const ld = ldBlocks(rd('tools/index.html'))[0].mainEntity; assert.strictEqual(ld.itemListElement[19].url, BASE + NOFU); assert.strictEqual(ld.itemListElement[19].position, 20);
  assert.ok(t.includes('全' + GUIDE_DIRS.length + '本') && t.includes('解説記事' + GUIDE_DIRS.length + '本'), 'guide count text');
  const art = ldBlocks(h)[0]; assert.strictEqual(art.datePublished, '2026-11-24'); assert.strictEqual(art.dateModified, '2026-11-24');
  assert.ok(h.includes('<span class="nw">公開日 2026-11-24</span> ／ <span class="nw">最終確認日 2026-11-24</span>'), 'meta line');
  assert.ok(h.includes('最終更新日: <span class="nw">2026-11-24</span>'), 'footer date');
});
c('N2 og:image kabe.png, alt, nav label', () => {
  const h = gh(NOFU); assert.strictEqual(attr(h, /<meta property="og:image" content="([^"]*)"/), BASE + 'og/kabe.png');
  assert.strictEqual(attr(h, /<meta property="og:image:alt" content="([^"]*)"/), '国民年金の学生納付特例の解説のイメージ画像');
  assert.ok(h.includes('<a href="./" aria-current="page">学生納付特例</a>'));
  assert.ok(h.includes('<body data-cat="tax">'));
});
c('N3 sources: nenkin/nta only, planned URLs, hint', () => {
  const h = stripComments(gh(NOFU)); const src = attr(h, /(<details class="acc" id="sources">[\s\S]*?<\/details>)/);
  const ext = [...src.matchAll(/<a\b[^>]*href="(https?:[^"]*)"/g)].map((m) => m[1]);
  assert.ok(ext.length >= 7, 'ext ' + ext.length);
  ext.forEach((x) => assert.ok(['www.nenkin.go.jp', 'www.nta.go.jp'].includes(new URL(x).hostname), x));
  ['menjo/20150514.html', 'menjo/20150402-01.html', 'menjoyuyo/gakusei.html', 'gakutokutaisyouko.html', 'hatachi-tetsuduki.html', 'hokenryo/hokenryo.html', 'hokenryo/zenno.html', 'menjo/20150331.html', '20250527-03.html', 'shotoku/1130.htm', 'shotoku/1410.htm'].forEach((u) => assert.ok(ext.some((x) => x.endsWith(u)), 'source ' + u));
  assert.ok(src.includes('<p class="hint">最終確認日 2026-11-24。日本年金機構・国税庁の案内をもとにしています。'), 'hint');
});
c('N4 band text + PR, go-d PR on both tool cards, no ad markup', () => {
  const h = gh(NOFU); const markup = h.replace(/<style>[\s\S]*?<\/style>/, '');
  ['links-config.js', 'px.a8.net', 'a8mat', 'rel="sponsored', 'class="pr-', 'prCards', 'ad-slot'].forEach((w) => assert.ok(!markup.includes(w), 'has ' + w));
  const band = attr(h, /(<div class="band"[\s\S]*?<\/div>)/);
  assert.ok(band.includes('目安です。対象：国民年金保険料 令和8年度（2026年4月〜2027年3月）／最終確認日 2026-11-24<br>※当サイトのツールにはプロモーション（PR）を含みます') && band.includes('href="../../about/#disclaimer"'), 'band');
  const go = [...mainOf(h).matchAll(/<a class="go" href="[^"]*">[\s\S]*?<\/a>/g)].map((m) => m[0]);
  assert.strictEqual(go.length, 4); go.forEach((g) => assert.ok(g.includes('結果によってPR（広告）が表示されることがあります'), 'go-d PR'));
});
c('N5 income table: R7 salary deduction (別表第五 4,000-yen steps) vs 1,280,000', () => {
  const inc = (x) => { if (x <= 1900000) return x - 650000; const b = Math.floor(x / 4000) * 4000; return b * 0.7 - 80000; };
  const fmt = (n) => n.toLocaleString('en-US');
  const sec = attr(gh(NOFU), /(<section class="card" id="s2"[\s\S]*?<\/section>)/);
  const rows = [...sec.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].map((m) => [m[1], m[2], m[3]]);
  const X = [1500000, 1900000, 1940000, 1950000]; assert.strictEqual(rows.length, X.length);
  X.forEach((x, i) => { const v = Math.round(inc(x)); assert.deepStrictEqual(rows[i], [fmt(x) + '円', fmt(v) + '円', v <= 1280000 ? '以下' : '超える']); });
  assert.strictEqual(Math.round(inc(1943999)), 1278000); assert.ok(Math.round(inc(1944000)) > 1280000);   // 境目は194万円前後
});
c('N6 text length, banned words, hedging', () => {
  const h = gh(NOFU); const body = plain(mainOf(h)); assert.ok(body.length >= 3000 && body.length <= 5000, 'main ' + body.length);
  assert.ok(plain(attr(h, /(<article class="art">[\s\S]*?<\/article>)/)).length >= 2200, 'article');
  BANNED.forEach((x) => assert.ok(!body.includes(x), x));
  assert.ok((body.match(/目安/g) || []).length >= 4, '目安');
});
c('N7 unconfirmed points are not written', () => {
  const body = plain(mainOf(gh(NOFU)));
  ['202万円', '令和9年度分は128万円', '令和8年中の所得で審査', 'はがきを返すだけ', '返送期限', '科目履修生は対象外', '通信制は対象外', '時効', '2年を過ぎると納付できない', '親が追納', '厚生労働省', 'デジタル庁'].forEach((w) => assert.ok(!body.includes(w), 'has ' + w));
  assert.ok(body.includes('令和9年度分（2027年4月〜）の基準') && body.includes('この記事では扱いません'), 'R9 not covered');
  const s5 = attr(gh(NOFU), /(<section class="card" id="s5"[\s\S]*?<\/section>)/); assert.ok(s5.includes('<tr><td>あとから納める（追納）</td><td>10年以内ならできる</td><td>—</td></tr>'), 'tsuino row');
});
c('N8 cross links: planned 4 internal articles, digits-free link text in the new article, existing guides link to it once', () => {
  const m = mainOf(gh(NOFU));
  const hs = [...new Set([...m.matchAll(/<a\b[^>]*?\bhref="(\.\.\/[a-z0-9-]+\/)"/g)].map((x) => x[1]))];
  assert.ok(hs.length >= 3 && hs.length <= 6, 'internal links ' + hs.length);
  ['oya-kojo-daigakusei', '150-wall-guide', 'kokuho-150-cost', 'gensen-choshu-hyo'].forEach((x) => assert.ok(hs.includes('../' + x + '/'), 'missing ' + x));
  hs.forEach((x) => assert.ok(rsl(NOFU + 'index.html', x), '-> ' + x));
  [...m.matchAll(/<a\b[^>]*?\bhref="\.\.\/[a-z0-9-]+\/"[^>]*>([^<]*)<\/a>/g)].forEach((x) => assert.ok(!/\d/.test(x[1]), 'link text has digits ' + x[1]));
  ['guides/oya-kojo-daigakusei/', 'guides/150-wall-guide/'].forEach((d) => {
    const mm = mainOf(gh(d)); assert.strictEqual((mm.match(/href="\.\.\/gakusei-nofu-tokurei\/"/g) || []).length, 1, d + ' -> nofu');
    assert.ok(mm.includes('<a href="../gakusei-nofu-tokurei/">大学生の国民年金（学生納付特例）</a>'), d + ' link text');
  });
});
c('N9 FAQ is 3 Q&A, equals JSON-LD and the plan', () => {
  const h = gh(NOFU); const faq = ldBlocks(h)[2]; const sec = attr(h, /(<section class="card" id="faq"[\s\S]*?<\/section>)/);
  const qs = [...sec.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [plain(m[1]), plain(m[2])]);
  assert.strictEqual(qs.length, 3); assert.strictEqual(faq.mainEntity.length, 3);
  qs.forEach((q, i) => { assert.strictEqual(faq.mainEntity[i].name, q[0]); assert.strictEqual(faq.mainEntity[i].acceptedAnswer.text, q[1]); assert.ok(!/&[a-z]+;|<wbr>/.test(q[0] + q[1])); });
  assert.deepStrictEqual(qs.map((q) => q[0]), ['親の収入が多いと、学生納付特例は使えませんか？', '申請を忘れていました。あとからでも間に合いますか？', '学生納付特例の期間は、あとで払わないといけませんか？']);
});
c('N10 fixed facts present as written by the source', () => {
  const body = plain(mainOf(gh(NOFU)));
  ['月17,920円', '月18,290円', '16,980円', '17,510円', '約2万円', 'おおむね2〜3か月後', '4月から翌年3月までの1年度分', '家族の所得の多寡は問われず', '3月末にはがき形式の申請書', '街角の年金相談センターではできません', '付加年金と国民年金基金は利用できません', '払った時点で判定'].forEach((w) => assert.ok(body.includes(w), 'missing ' + w));
});

// ---- 大学生のふるさと納税（2026-11-24 追加）。R1〜R9 ----
c('R1 ds identical to about, canonical/og:url, sitemap last + lastmod, tools link + ItemList 21, dates', () => {
  const h = gh(FURU); assert.strictEqual(css(h), css(rd('about/index.html')));
  assert.strictEqual(attr(h, /<link rel="canonical" href="([^"]*)"/), BASE + FURU);
  assert.strictEqual(attr(h, /<meta property="og:url" content="([^"]*)"/), BASE + FURU);
  const sm = rd('sitemap.xml'); const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((x) => x[1]);
  assert.strictEqual(locs[locs.length - 1], BASE + FURU);
  const b = sm.match(new RegExp('<loc>' + (BASE + FURU).replace(/[.\/]/g, '\\$&') + '</loc>\\s*<lastmod>([^<]*)</lastmod>')); assert.ok(b); assert.strictEqual(b[1], '2026-11-24');
  const ld = ldBlocks(rd('tools/index.html'))[0].mainEntity; assert.strictEqual(ld.itemListElement[20].url, BASE + FURU); assert.strictEqual(ld.itemListElement[20].position, 21);
  assert.ok(stripComments(rd('tools/index.html')).includes('href="../' + FURU + '"'));
  const art = ldBlocks(h)[0]; assert.strictEqual(art.datePublished, '2026-11-24'); assert.strictEqual(art.dateModified, '2026-11-24');
  assert.ok(h.includes('<span class="nw">公開日 2026-11-24</span> ／ <span class="nw">最終確認日 2026-11-24</span>') && h.includes('最終更新日: <span class="nw">2026-11-24</span>'));
});
c('R2 og:image, alt, nav, band + PR, go-d PR, no ad / affiliate markup', () => {
  const h = gh(FURU); const markup = h.replace(/<style>[\s\S]*?<\/style>/, '');
  assert.strictEqual(attr(h, /<meta property="og:image" content="([^"]*)"/), BASE + 'og/kabe.png');
  assert.strictEqual(attr(h, /<meta property="og:image:alt" content="([^"]*)"/), '大学生のふるさと納税の解説のイメージ画像');
  assert.ok(h.includes('<a href="./" aria-current="page">学生のふるさと納税</a>'));
  ['links-config.js', 'px.a8.net', 'a8mat', 'rel="sponsored', 'class="pr-', 'prCards', 'ad-slot', 'furunavi', 'satofull', 'furusato-tax.jp', 'rakuten', 'ふるなび', 'さとふる', '楽天'].forEach((w) => assert.ok(!markup.includes(w), 'has ' + w));
  const band = attr(h, /(<div class="band"[\s\S]*?<\/div>)/);
  assert.ok(band.includes('目安です。対象：2026年中の寄附（令和9年度の住民税）／最終確認日 2026-11-24<br>※当サイトのツールにはプロモーション（PR）を含みます'), 'band');
  const go = [...mainOf(h).matchAll(/<a class="go" href="[^"]*">[\s\S]*?<\/a>/g)].map((m) => m[0]);
  assert.strictEqual(go.length, 4); go.forEach((g) => assert.ok(g.includes('結果によってPR（広告）が表示されることがあります')));
});
c('R3 sources: soumu / nta / e-Gov / Koto only, planned URLs, hint', () => {
  const h = stripComments(gh(FURU)); const src = attr(h, /(<details class="acc" id="sources">[\s\S]*?<\/details>)/);
  const ext = [...src.matchAll(/<a\b[^>]*href="(https?:[^"]*)"/g)].map((m) => m[1]);
  assert.strictEqual(ext.length, 8);
  ['mechanism/about.html', 'mechanism/deduction.html', 'furusato/faq/', 'topics/20150401.html', 'shotoku/1155.htm', 'shotoku/1410.htm', 'law/325AC0000000226', 'kaise/9kaisei.html'].forEach((u) => assert.ok(ext.some((x) => x.endsWith(u)), 'source ' + u));
  assert.ok(src.includes('<p class="hint">最終確認日 2026-11-24。総務省・国税庁・地方税法・江東区の案内をもとにしています。'), 'hint');
});
c('R4 calculation example follows the Local Tax Act (調整控除後の所得割×20%, 90%)', () => {
  const sal = 1500000; const inc = sal - 740000; const taxable = inc - 430000; const before = taxable * 0.10;
  const adj = Math.min(50000, taxable) * 0.05; const shotokuwari = before - adj; const cap = shotokuwari * 0.2;
  assert.strictEqual(inc, 760000); assert.strictEqual(taxable, 330000); assert.strictEqual(adj, 2500); assert.strictEqual(shotokuwari, 30500); assert.strictEqual(cap, 6100);
  // 人的控除差調整額 = 5万円 + (所得税の基礎控除 − 48万円)。基礎控除が95万円でも104万円でも 330,000 を上回る → 90%
  [950000, 1040000].forEach((k) => assert.ok(taxable - (50000 + (k - 480000)) < 0));
  const ded = (d) => Math.round((d - 2000) * 0.1 + Math.min((d - 2000) * 0.9, cap));
  assert.ok((8700 - 2000) * 0.9 <= cap && (8800 - 2000) * 0.9 > cap, 'limit about 8,700');
  const sec = attr(gh(FURU), /(<section class="card" id="s3"[\s\S]*?<\/section>)/);
  const rows = [...sec.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].map((m) => [m[1], m[2], m[3]]);
  const fmt = (n) => n.toLocaleString('en-US') + '円';
  const X = [8700, 10000, 30000]; assert.strictEqual(rows.length, 3);
  X.forEach((x, i) => assert.deepStrictEqual(rows[i], [fmt(x), fmt(ded(x)), fmt(x - ded(x))]));
  ['330,000円×10%＝33,000円から、調整控除2,500円を引いて30,500円', '30,500円×20%＝6,100円', '約8,700円まで'].forEach((w) => assert.ok(plain(sec).includes(w), 'missing ' + w));
});
c('R5 text length, banned words, hedging, no pushy wording', () => {
  const h = gh(FURU); const body = plain(mainOf(h)); assert.ok(body.length >= 3000 && body.length <= 5000, 'main ' + body.length);
  assert.ok(plain(attr(h, /(<article class="art">[\s\S]*?<\/article>)/)).length >= 2200, 'article');
  BANNED.forEach((x) => assert.ok(!body.includes(x), x));
  assert.ok((body.match(/目安/g) || []).length >= 4, '目安');
  ['おすすめ', '今すぐ', '実質2,000円で返礼品'].forEach((w) => assert.ok(!body.includes(w), 'pushy ' + w));
});
c('R6 unconfirmed points are not written', () => {
  const body = plain(mainOf(gh(FURU)));
  assert.ok(!/1月10日(?!までに変更届出書)/.test(body), '1月10日 only for the change notification');
  ['年収○○万円以下なら意味がない', '全額自己負担になります', 'ポイントが一切', '193万円', '60%以上', '6.1万円', '民間のシミュレーター', '親のカードで払っても'].forEach((w) => assert.ok(!body.includes(w), 'has ' + w));
  assert.ok(body.includes('調達費用の基準で、返礼品の市場価値'), '3割 is about procurement cost');
});
c('R7 cross links: 4-5 internal articles, digit-free link text, existing guides link to it once', () => {
  const m = mainOf(gh(FURU));
  const hs = [...new Set([...m.matchAll(/<a\b[^>]*?\bhref="(\.\.\/[a-z0-9-]+\/)"/g)].map((x) => x[1]))];
  assert.ok(hs.length >= 3 && hs.length <= 6, 'internal links ' + hs.length);
  ['student-juminzei', 'kinro-gakusei-kojo', 'gensen-choshu-hyo', 'oya-kojo-daigakusei'].forEach((x) => assert.ok(hs.includes('../' + x + '/'), 'missing ' + x));
  hs.forEach((x) => assert.ok(rsl(FURU + 'index.html', x), '-> ' + x));
  [...m.matchAll(/<a\b[^>]*?\bhref="\.\.\/[a-z0-9-]+\/"[^>]*>([^<]*)<\/a>/g)].forEach((x) => assert.ok(!/\d/.test(x[1]), 'link text has digits ' + x[1]));
  ['guides/student-juminzei/', 'guides/kinro-gakusei-kojo/'].forEach((d) => {
    const mm = mainOf(gh(d)); assert.strictEqual((mm.match(/href="\.\.\/furusato-gakusei\/"/g) || []).length, 1, d + ' -> furusato');
    assert.ok(mm.includes('<a href="../furusato-gakusei/">大学生のふるさと納税</a>'), d + ' link text');
  });
});
c('R8 FAQ is 3 Q&A, equals JSON-LD and the plan', () => {
  const h = gh(FURU); const faq = ldBlocks(h)[2]; const sec = attr(h, /(<section class="card" id="faq"[\s\S]*?<\/section>)/);
  const qs = [...sec.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [plain(m[1]), plain(m[2])]);
  assert.strictEqual(qs.length, 3); assert.strictEqual(faq.mainEntity.length, 3);
  qs.forEach((q, i) => { assert.strictEqual(faq.mainEntity[i].name, q[0]); assert.strictEqual(faq.mainEntity[i].acceptedAnswer.text, q[1]); assert.ok(!/&[a-z]+;|<wbr>/.test(q[0] + q[1])); });
  assert.deepStrictEqual(qs.map((q) => q[0]), ['大学生でもふるさと納税はできますか？', '住民税を払っている大学生は、いくらまでなら自己負担2,000円で済みますか？', '返礼品をもらうと、税金がかかりますか？']);
});
c('R9 fixed facts present as written by the source', () => {
  const body = plain(mainOf(gh(FURU)));
  ['所得税や住民税を納めている方が寄附金控除を受けられます', '1年間（1月〜12月）の寄附の合計', '5団体以内', 'チェックしただけでは、申請は完了しません', '申請は無効になります', '3月15日', '住民税に関する申告書', 'ふるさと納税を行う名義も本人である必要があります', '年間50万円を超える部分', '均等割は、寄附をしても減りません', '所得割の納税義務者'].forEach((w) => assert.ok(body.includes(w), 'missing ' + w));
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
