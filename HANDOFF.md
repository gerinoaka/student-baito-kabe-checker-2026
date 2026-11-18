# HANDOFF — gakusei-tools.com UI 刷新（不具合修正後の実態）

更新日: 2026-11-19
対象: `./products/student-baito-kabe-checker-2026/`（全17ページ）。git 操作・公開は行っていません。

---

## 1. 読み込んでいるファイル

| 種別 | ファイル | 読み込むページ |
|---|---|---|
| 共通CSS | 各ページの `<style>` 内 `/*ds:start v1*/ … /*ds:end*/`（全17ページ同一）。マスターは `assets/ui-system.css`（同じ内容。ページから `<link>` はしない） | 全17ページ（インライン） |
| 共通JS | `assets/ui-motion.js`（`<script src="…assets/ui-motion.js" defer>`。`site-config.js` の直前） | 7ツール（index / kakemochi / shift-limit / living-cost-simulator / nisa-simulator / scholarship / es-word-counter）と `tools/` |
| 設定 | `site-config.js`（全ページ）、`links-config.js`（ツール5ページ） | 変更なし |

- ツールページ末尾にあった `/*ui-motion-v2*/` のインラインIIFEは削除済み（`assets/ui-motion.js` に一本化）。
- about / privacy / guides は `ui-motion.js` を読み込みません（JSなしで完結）。
- ds を変更したら、全17ページと `assets/ui-system.css` を同じ内容にそろえる（テスト X01 / X08 / G01 / H20 が検査）。

## 2. モーションの適用範囲（`assets/ui-motion.js`）

1. **スクロール表示**: `.card, .rel .tools, .rel .sisters, .fband, .pts` を IntersectionObserver でフェードイン（従来どおり）。印刷時は ds の `@media print` で常時表示。
2. **カードの浮き上がり**: `.tl a` のみ。`pointerType==='mouse'` のときだけ。rect は `pointerenter` で取得し resize / scroll で破棄、更新は rAF で間引き、`translateY(-2px)` と影だけ（rotate なし）。`.qjump a` は対象外。
3. **スライダー塗り**: `input.range` の `--pct` を同期。
4. **数値カウントアップ（220ms）**: 対象は数値1つだけを持つ末端要素 `#rMonth` `#rWeek`（shift-limit）、`#netBig` `#freeBig`（living）、`#rBig`（kakemochi / nisa / scholarship。ただし子要素が `<small>` 以外の場合＝shift-limit の `#rBig` は対象外）。index / es の `#rCount`（離散値）は対象外。
   - render が書いた確定値を MutationObserver（characterData / childList / subtree）で検知し、表示中の数値から確定値へ rAF で補間。自分の書き込みは `takeRecords()` で無視。
   - 要素ごとに rAF ID を持ち、新しい変化で `cancelAnimationFrame`。終了時は必ず確定文字列に戻す。
   - カンマ・小数桁・前置き（約・＋）・後置き（円・万）を保持。前置き/後置き/桁が変わる、数字を複数含む（「17年10か月」等）、「－」などは補間しない。
   - `prefers-reduced-motion`、または rAF / MutationObserver が無い環境では何もしない。

## 3. 数値プレビュー（すべて「例」＋条件。値は各ツールの logic に通した結果）

| 場所 | 文言 | 計算条件 |
|---|---|---|
| 年収の壁 | 例：19〜22歳・年収108万円→150万円の壁まで約42万円 | `KABE.judge({ageGroup:'a19_22', salary:1080000})` の `health.remain`=420,000 |
| 掛け持ち還付 | 例：甲欄90万円＋乙欄60万円（月5万円・源泉3.063%）→還付目安18,372円 | 乙欄源泉 = `estimateOtsu({monthly:50000, months:12})`=18,372。甲欄90万円（年末調整済・源泉0）＋乙欄60万円で `calcRefund` → 年税額0円・還付18,372円 |
| シフト逆算 | 例：時給1,100円・累計0円・残り12か月→150万円未満まで月113時間（週26.0時間） | `calcShift({wall:'w150', hourly:1100, cum:0, monthsLeft:12})` |
| 手取り・生活費 | 例：新社会人・額面月22万円（東京・賞与なし）→手取り約18.6万円・家賃目安5.2万円（手取りの28%） | `takeHome({mode:'shakaijin', monthly:220000, bonus:0, region:'tokyo', year:1})` の `monthlyNet`=186,240、`idealBudget` の家賃（理想配分28%）=52,100 |
| ES | 例：400字制限・368字入力→達成92% | `ES.progress(368,400).pct` |
| 新NISA | 例：月1万円×10年・年3%の仮定→約139万円（元本120万円） | `NISA.simulate({monthly:10000, ratePct:3, years:10})` |
| NISAガイド | 例：月5千円×10年・年3%の仮定→約70万円（元本60万円） | 同上（月5,000円） |
| 奨学金 | 例：第一種（無利子）300万円→標準17年・月14,705円 | `SCHOLAR.calcStd({kind:'1', p1:3000000, p2:0, rate:0})` |

- `.qjump-chip`（index / tools）と `.mq`（index / tools）も同じ例を短縮表記で使用。`.mq` は先頭に「計算例」、直下に「※数値は入力例です。実際の結果は入力で変わります。」。複製側は `aria-hidden="true"`、`.mq` は `role="group"`。reduced-motion では `.mq` は横スクロール・複製側は非表示。継ぎ目のズレは gap をやめ margin にして解消。
- 例の文言と logic の一致は `tests/pv-examples.test.js` が検査（logic を vm で抽出）。

## 4. ファーストビュー・色・改行

- `.eyebrow` は `.nw` を外し「カテゴリ｜<wbr>大学生向け無料計算ツール・登録不要」形式に統一。`tools/` の h1 は「大学生向け無料計算ツール一覧（登録不要）」（title / description / JSON-LD は不変）。
- PR 表記（「※当サイトはプロモーション（PR）を含みます」）は `.band` 内の元の位置のまま（qjump / mq より上）。
- 色: `[data-cat="life"]` の `--cat-accent` は `#c2410c`。`.pv` は `.tl a .pv[data-cat=…]` の4ルール＋ダークモード補正。12px以上。
- 改行: body は `word-break:normal; overflow-wrap:break-word; line-break:strict`（対応ブラウザは `auto-phrase`）。`keep-all` は見出し・summary・pill・chip・eyebrow・qjump・navb 等に限定し、見出しとカード名は対応ブラウザで `auto-phrase`。`overflow-wrap:anywhere` は `.src` / `code` / `.url` / `a[href^="http"]` のみ。`th` は nowrap。日付と「一人暮らし」に `.nw`。見出し（h1〜h3）は文節の切れ目に `<wbr>` を挿入済み（index.html は容量のため FAQ の一部のみ）。
- grid は `minmax(0,1fr)` に統一（chips / stats / seg-group / `.tl`）。chips の6列は 420px 以下で3列。

## 5. テスト

実行: `node tests/<name>.test.js` と `node <dir>/tests/<name>.test.js`（node は `%LOCALAPPDATA%\nodejs-portable` 配下）。

| テスト | 件数 |
|---|---|
| tests/hardening.test.js | 20 |
| tests/judge.test.js | 113 |
| tests/kakemochi.test.js | 44 |
| tests/shift.test.js | 66 |
| tests/site.test.js | 41 |
| tests/ui-smoke.test.js | 34 |
| tests/ui-static.test.js | 51 |
| tests/pv-examples.test.js（新規） | 15 |
| es-word-counter/tests/es.test.js / ui-static.test.js | 57 / 15 |
| living-cost-simulator/tests/living.test.js / ui-static.test.js | 156 / 115 |
| nisa-simulator/tests/nisa.test.js / ui-static.test.js | 37 / 15 |
| scholarship/tests/scholarship.test.js | 109 |
| 合計 | 888（失敗 0） |

テストの修正は最小限: 許可する script src に `assets/ui-motion.js` を追加、見出しの `<wbr>` / `.nw` を除いて文言を比較。
