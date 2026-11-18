// scripts/qa-check.mjs — サイト全ページの表示・エラー検査（Playwright / Chromium）
//
// 使い方:
//   npm install --no-save playwright && npx playwright install chromium
//   node scripts/qa-check.mjs
//   （ローカルの Edge を使う場合: QA_CHANNEL=msedge node scripts/qa-check.mjs）
//
// 検査内容（全ページ × 375x812 / 1440x900）:
//   - HTTP 200
//   - JS コンソールエラー・未捕捉例外がゼロ
//   - 横はみ出しゼロ（documentElement.scrollWidth <= clientWidth）
//   - <title> と <meta name="description"> が存在し、空でない
// 失敗時は qa-screenshots/ にフルページのスクリーンショットを保存し、exit code 1 で終了する。
//
// 外部の広告・計測（Google Analytics / AdSense / A8.net など）への通信はすべて空の応答に差し替える。
// 検査で実際のアクセス数・広告表示回数が増えないようにするため。

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'qa-screenshots');
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'qa-screenshots', 'tests', 'scripts', '.github']);
// Search Console の所有権確認ファイル（ページではない）は対象外
const SKIP_FILES = [/^google[0-9a-f]+\.html$/];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function findPages(dir, rel = '') {
  const pages = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name) || ent.name.startsWith('.')) continue;
      pages.push(...findPages(path.join(dir, ent.name), rel + ent.name + '/'));
    } else if (ent.name.endsWith('.html') && !SKIP_FILES.some((re) => re.test(ent.name))) {
      pages.push(ent.name === 'index.html' ? '/' + rel : '/' + rel + ent.name);
    }
  }
  return pages.sort();
}

function startServer() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(ROOT, p);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function slug(url, vp) {
  const s = url === '/' ? 'top' : url.replace(/^\/|\/$/g, '').replace(/[\/.]/g, '_');
  return `${s}__${vp.name}.png`;
}

async function main() {
  const pages = findPages(ROOT);
  if (pages.length === 0) { console.error('ページが見つかりません'); process.exit(1); }
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.env.QA_CHANNEL ? { channel: process.env.QA_CHANNEL } : {});
  const failures = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    // 自サイト（ローカルサーバー）以外への通信は空の応答に差し替える
    await context.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.origin === base) return route.continue();
      const type = route.request().resourceType();
      if (type === 'script') return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
      if (type === 'image') return route.fulfill({ status: 204, body: '' });
      return route.fulfill({ status: 204, body: '' });
    });

    for (const url of pages) {
      const page = await context.newPage();
      const problems = [];
      page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`console: ${msg.text()}`); });
      page.on('pageerror', (err) => problems.push(`exception: ${err.message}`));
      try {
        const resp = await page.goto(base + url, { waitUntil: 'load', timeout: 30000 });
        if (!resp || resp.status() !== 200) problems.push(`HTTP ${resp ? resp.status() : 'no response'}`);
        await page.waitForTimeout(500); // 初期描画・アニメーションの完了を待つ
        const info = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
          title: (document.querySelector('head > title')?.textContent || '').trim(),
          desc: (document.querySelector('meta[name="description"]')?.getAttribute('content') || '').trim(),
        }));
        if (info.sw > info.cw) problems.push(`横はみ出し: scrollWidth ${info.sw} > clientWidth ${info.cw}`);
        if (!info.title) problems.push('<title> がない、または空');
        if (!info.desc) problems.push('<meta name="description"> がない、または空');
      } catch (e) {
        problems.push(`読み込み失敗: ${e.message}`);
      }
      if (problems.length) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
        const shot = path.join(OUT_DIR, slug(url, vp));
        try { await page.screenshot({ path: shot, fullPage: true }); } catch {}
        failures.push({ url, vp: vp.name, problems, shot: path.relative(ROOT, shot) });
        console.log(`NG  ${vp.name.padEnd(7)} ${url}`);
        problems.forEach((p) => console.log(`      - ${p}`));
      } else {
        console.log(`ok  ${vp.name.padEnd(7)} ${url}`);
      }
      await page.close();
    }
    await context.close();
  }

  await browser.close();
  server.close();
  const total = pages.length * VIEWPORTS.length;
  console.log(`\n${total - failures.length} / ${total} passed（${pages.length} ページ × ${VIEWPORTS.length} 画面幅）`);
  if (failures.length) {
    console.log(`失敗 ${failures.length} 件。スクリーンショット: qa-screenshots/`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
