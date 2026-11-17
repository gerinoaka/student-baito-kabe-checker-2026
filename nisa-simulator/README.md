# 大学生からの新NISA・バイト代積立シミュレーター

## 1 概要
- 目的: バイト代の一部を新NISAのつみたて投資枠に回した場合の積立結果を、仮定の例として試算・グラフ表示する静的ツール（ビルド不要）。
- 公開URL: https://gerinoaka.github.io/student-baito-kabe-checker-2026/nisa-simulator/ （GitHub Pages。独立リポジトリではなく、親サイト `student-baito-kabe-checker-2026` のサブフォルダとして公開）
- 公開は親リポジトリの git push 1回（またはブラウザで上書き）。このフォルダに `sitemap.xml` / `robots.txt` / `.nojekyll` は置かない（サイト全体のものをルートに1つだけ置いているため。sitemap はルートの `sitemap.xml` の6URLに含まれる）。

## 2 ファイル一覧
- `index.html` … 本体（共通CSS `/*ds:start v1*/`〜`/*ds:end*/` は6ページ共通で変更しない。CSS/JS 内包。`<script id="logic">` は DOM 非依存の計算、`<script id="ui">` は画面）
- `links-config.js` … 広告（PR）リンクの設定
- `tests/nisa.test.js` … ロジック・構造テスト（依存ゼロ）
- `tests/ui-static.test.js` … 画面の静的テスト N01〜N15（依存ゼロ）`r`n- `tests/ui-static.test.js` … 画面の静的テスト N01〜N15（依存ゼロ）

## 3 計算仕様
- 毎月末に積立。年率（実効）を月利に換算: i = (1+年率)^(1/12) − 1。利回り0%は i=0 で元本＝評価額。
- 各年末の評価額は月次の逐次計算。最終値は閉形式 FV = P((1+i)^n − 1)/i で検算し、差が1円以上なら閉形式を採用。
- 丸めは表示時のみ（円は四捨五入、万円も四捨五入）。税・手数料・信託報酬は含めない。金融庁のシミュレーターと完全には一致しない。
- 元本累計が生涯の非課税保有限度額1,800万円を超えると警告。月額の年換算が120万円を超えると年間上限の警告。成長投資枠・売却は扱わない。

## 4 制度の根拠
- 金融庁 NISA 特設ページ https://www.fsa.go.jp/policy/nisa2/about/nisa2024/index.html （最終確認日 2026-11-17）
- 未成年向けの口座（通称「こどもNISA」、2027年開始予定）は二次情報のみのため、試算の対象外とし、免責に1行触れるのみ。
- 詳細は `backlog/20261117_nisa-simulator_factsheet.md` を参照。

## 5 テスト実行
`%LOCALAPPDATA%\nodejs-portable` 配下の node で:

    node tests/nisa.test.js
    node tests/ui-static.test.js

結果: nisa.test.js は pass 37 / fail 0、ui-static.test.js は pass 15 / fail 0。index.html は53,621 バイト。

失敗があれば exit code 1。

## 6 広告の設定手順
- `links-config.js` の `shoken1` / `shoken2` / `book` の `url: ''` の行（ファイル内の行番号は下記）に、ASP の https:// で始まるURLを貼る。空のままならカードは出ない。
  - shoken1: url 行 38 ／ shoken2: url 行 45 ／ book: url 行 52
- ASP 提携前に、管理画面で「年齢条件」「禁止表現」「素材ルール」を確認する。提携先は登録済みのネット証券に限る。
- PR表記（label）は変更しない。リンクには `rel="sponsored nofollow noopener"` が付く。証券カードは「今の年齢」が18歳以上のときのみ表示。
- AdSense 等を使う場合は `index.html` の `<div class="ad-slot">`（コメント AD-SLOT-1）に広告コードを入れ、`hidden` を外す。

## 7 公開前チェックリスト
- [ ] 金融庁などの公式ページで制度の数値（120万円・1,800万円・18歳要件）を再確認
- [ ] 断定表現の grep（「必ず」「確実」「保証」「最強」）。免責や禁止の説明として使う箇所以外にないこと
- [ ] 100KB以内、外部リクエスト0（links-config.js を除く）、320px幅で横スクロールなし、ダークモード、キーボード操作
- [ ] ルートの `sitemap.xml` の lastmod と、ページ内の最終確認日（免責・フッター）を更新

robots.txt は、プロジェクトサイト（サブパス公開）ではドメイン直下にないため検索エンジンに読まれない。本命は Search Console での sitemap 再送信（既存プロパティのまま）。

## 8 運営・連絡先・プライバシー
- 連絡先: gakusei.kabe.checker@gmail.com
- 入力値は端末内で計算し、送信・保存しない。Cookie・解析なし。X ボタン押下時のみ x.com へ遷移し、投稿文とURLを渡す。PRリンク先は広告主サイト。
