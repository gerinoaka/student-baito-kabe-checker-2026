'use strict';
// サイト全体テスト（6ページ・統合後に実行）。依存ゼロ。
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
  assert.strictEqual(locs.length, 13);
  assert.deepStrictEqual(can.slice().sort(), DIRS.map((d) => BASE + d).sort());
  const extra = ['about/', 'tools/', 'guides/150-wall-guide/', 'guides/kakemochi-tax-guide/', 'guides/es-star-method/', 'guides/student-nisa-start/', 'scholarship/'];
  assert.deepStrictEqual(locs.slice().sort(), can.concat(extra.map((d) => BASE + d)).sort());
  extra.forEach((d) => assert.strictEqual(rd(d + 'index.html').match(/<link rel="canonical" href="([^"]*)"/)[1], BASE + d, d));
  assert.strictEqual(new Set(locs).size, 13);
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
const NEW_DIRS = ['about/', 'tools/'];
const NEW_PAGES = NEW_DIRS.map((d) => d + 'index.html');
const ALL_PAGES = PAGES.concat(NEW_PAGES);
const TOOL_DIRS = DIRS.concat(['scholarship/']);   // ツールのフォルダ（奨学金は6ページの DIRS には入れず、フェーズ4で足す）
const GUIDE_DIRS = ['guides/150-wall-guide/', 'guides/kakemochi-tax-guide/', 'guides/es-star-method/', 'guides/student-nisa-start/'];
const stripComments = (h) => h.replace(/<!--[\s\S]*?-->/g, '');
const ldBlocks = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const resolves = (page, href) => fs.existsSync(path.join(path.resolve(path.dirname(path.join(root, page)), href), 'index.html'));
const attr = (h, re) => { const m = h.match(re); assert.ok(m, 'missing ' + re); return m[1]; };
const MAIL = attr(rd('index.html'), /<p class="foot-links">[^]*?([\w.]+@[\w.]+)/);
const TITLE = { 'about/': '運営者情報・計算方針・広告表記｜学生バイトお役立ちツール', 'tools/': '学生向け無料ツール一覧｜バイトの税金・生活費・就活・積立' };

c('X08 shared css identical on 8 pages', () => {
  const base = css(rd(PAGES[0]));
  assert.strictEqual(ALL_PAGES.length, 8);
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
  assert.ok(attr(h, /<meta name="twitter:card" content="([^"]*)"/).length > 0);
  assert.ok(/<html lang="ja">/.test(h) && /<meta charset="utf-8">/.test(h) && /name="viewport"/.test(h));
}));
c('X10 new pages JSON-LD', () => NEW_DIRS.forEach((d) => {
  const h = rd(d + 'index.html'); const b = ldBlocks(h); assert.strictEqual(b.length, 2, d);
  b.forEach((x) => assert.strictEqual(x['@context'], 'https://schema.org'));
  const [main, crumb] = b;
  if (d === 'about/') {
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
    if (/^https?:/.test(x)) assert.ok(x === 'https://adssettings.google.com',p + ' external ' + x);
    else if (x.startsWith('mailto:') || x.startsWith('#')) return;
    else { assert.ok(!x.startsWith('/'), p + ' abs ' + x); assert.ok(resolves(p, x), p + ' -> ' + x); }
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
  sc.forEach((s) => assert.ok(/type="application\/ld\+json"/.test(s[1]), p + ' script ' + s[1]));
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
  ['運営事務局', MAIL, 'PR表記', '「PR」と「広告を含みます」', 'rel=&quot;sponsored&quot;', 'nofollow', 'noopener', '年齢による出し分け', '初期値が「19〜22歳」', '広告の有無や、広告主との関係が', '報酬を受け取ることがあります', 'ステルスマーケティング', '年齢', '目安・要確認', '最終確認日', '影響することはありません', 'id="disclaimer"', 'id="privacy"']
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
const ESMEDIA = ['crexgroup.com', 'jsite.mhlw.go.jp', 'reashu.com', 'lifestyle.assist-all.co.jp', 'www.onecareer.jp'];
const GCFG = {
  'guides/150-wall-guide/': { tools: ['../../', '../../shift-limit/'], hosts: GOV, must: ['5日以内', '14日以内', '連続2回', '特定親族特別控除', '63万円', '136万円', '159万円', '197万円', '事業主の証明', '被扶養者'], not: ['何度でも扶養に残れる'] },
  'guides/kakemochi-tax-guide/': { tools: ['../../kakemochi/'], hosts: GOV, must: ['乙欄', '源泉徴収票', '5年間', '3週間程度', '1か月〜1か月半程度', 'マイナンバーカード', '新規発行', '令和7年（2025年）10月1日', '令和13年12月31日'], not: [] },
  'guides/es-star-method/': { tools: ['../../es-word-counter/'], hosts: GOV.concat(ESMEDIA), must: ['経験則', '保証', '推測', '整理例', '320字', '360字', '提出画面'], not: [] },
  'guides/student-nisa-start/': { tools: ['../../nisa-simulator/'], hosts: GOV, must: ['元本割れ', '保証されません', '勧誘', '697,240', '600,000', '1,800万円', '1月1日時点で18歳以上', '10月1日', '9月30日', '1人1口座'], not: ['おすすめ', 'SBI', '楽天', 'マネックス', '松井', 'auカブコム', '野村', '大和', 'ゆうちょ', '親の同意は不要', '親権者の同意は不要'] }
};
const BANNED = ['落ちない', '必ず', '絶対', '確実', '間違いなく', '100%', '最強', '最安', '儲か', '損しない', '誰でも', '受かる', '合格できる', '通過できる', '業界最大'];
const SELLER = '学生バイトお役立ちツール 運営事務局';
const plain = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const mainOf = (h) => attr(h, /(<main id="main">[\s\S]*?<\/main>)/);
const rsl = (page, href) => resolves(page, href.split('#')[0]);   // ハッシュを外して解決
const gh = (d) => rd(d + 'index.html');

c('G01 shared css (ds + g block) identical on 4 guides, ds == tools', () => {
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
  assert.strictEqual(attr(h, /<meta name="twitter:card" content="([^"]*)"/), 'summary');
  assert.ok(!/property="og:image"/.test(h), d + ' og:image');
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
  assert.strictEqual(art.datePublished, '2026-11-17'); assert.strictEqual(art.dateModified, '2026-11-17');
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
  ['../../tools/', '../../about/', '../../about/#disclaimer'].forEach((w) => assert.ok(hrefs.includes(w), d + ' foot ' + w));
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
  [...h.matchAll(/<script\b([^>]*)>/g)].forEach((s) => assert.ok(/type="application\/ld\+json"/.test(s[1]), d + ' script'));
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
  assert.ok(/目安|仮定の試算/.test(band) && /(最終確認日|最終更新日) 2026-11-17/.test(band), d + ' band');
  assert.ok(h.includes('公開日 2026-11-17') && h.includes('学生バイトお役立ちツール 運営事務局'), d + ' meta');
  const src = attr(h, /(<details class="acc" id="sources">[\s\S]*?<\/details>)/); assert.ok(/確認日 2026-11-17|公開前に原文/.test(src) || /目安/.test(src), d + ' sources note');
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
const SHA0 = {
  'about/index.html': '744e875e7bd9891393abb77d1844b64ca7ecb6352b886f7c52b13900905a0795',
  'index.html': 'a5491c99b5fc15657330f3fac16334ced36db5e05bf12c7b5a9446cabca92fc1',
  'kakemochi/index.html': '952f87063669159c2505b9004b756f3d35eabd6afb2496facb7cf4de042ebcb7',
  'shift-limit/index.html': '7882246046a9e95703f305094e1ac3ac19f945c74b7ec0ce64216cc70fd5cf2c',
  'living-cost-simulator/index.html': '1e0d734f597e98aa2433e27eff8ed7864d8a6a73679cd0c0bb92dee17ea372e1',
  'es-word-counter/index.html': '4b41d7946fa0fd33a6fd5938aee89be447c85c7c76b67281b9cad4cd56047e36',
  'nisa-simulator/index.html': 'f2221f52dba9af5783e28eb55f293f5dc6415715957a973b25e781425b7a3a13',
};
c('G14 about/ and 6 tool pages: SHA-256 frozen (updated for A8 measurement img / PR notice)', () => {
  assert.strictEqual(attr(rd('about/index.html'), /<title>([^<]+)<\/title>/), TITLE['about/']);
  Object.keys(SHA0).forEach((k) => assert.strictEqual(require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root, k))).digest('hex'), SHA0[k], k + ' changed'));
});

console.log('pass ' + pass + ' / fail ' + fail);
if (fail) process.exit(1);
