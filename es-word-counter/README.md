# ES文字数カウント＆ガクチカ構成チェッカー

## 1. 概要
就活のES・ガクチカの文字数を数え、指定字数に対する達成率（8割・9割の目安）と、構成・冗長表現のヒントを出す静的ツール。入力は端末内で処理し、送信・保存しない。
公開URL: https://gakusei-tools.com/es-word-counter/
デザインは6ページ共通基準（`index.html` 内の `/*ds:start v1*/`〜`/*ds:end*/`）に合わせている。この範囲は他の5ページと同じ内容にする。変えるときは6ページを同時に直す。

## 2. ファイル一覧
- `index.html` : CSS と JS を内包（`links-config.js` → `<script id="logic">` → `<script id="ui">`）。logic は純関数のみ（返却名 `ES`）。
- `links-config.js` : PR（広告）リンクの一元管理
- `tests/es.test.js` : ロジック＋サイト整合性テスト
- `tests/ui-static.test.js` : UI の静的検査（N01〜N15）

`sitemap.xml` / `robots.txt` / `.nojekyll` はこのフォルダに置かない。親フォルダ（サイトのルート）に1つだけある。

## 3. デプロイ手順
独立したリポジトリではなく、親サイト `student-baito-kabe-checker-2026` のサブフォルダ `es-word-counter/` として公開する。サイト全体を git push 1回（またはブラウザで上書きアップロード）で反映する。`.nojekyll` はルートのものを使う。

## 4. PR リンクの設定手順
`links-config.js` の `url: ''` の行（40 / 48 / 56 行目）に、承認済みの `https://` で始まる URL を貼る。
- url が空のキーはカードが出ない。0 件なら PR の注記ごと非表示。
- 表示は最大2枠（shukatsuSite → agent → scout の順）。
- リンクは `rel="sponsored nofollow noopener"`、ラベルは `PR`（変更しない。画面では CSS が【PR】と表示し、「広告を含みます」を添える）。
- ASP 案件の「ここに広告コードを入れる」枠（AdSense 等）は設けていない。導入時はプライバシーポリシー欄を更新する。

## 5. 数え方の仕様
- 既定: 改行は含めず、空白（全角・半角）は含める。詳細設定の切替で変更可。
- 補助表示: 空白抜き、改行を含む文字数、原稿用紙換算（文字数÷400、四捨五入と切上）、行数。
- 単位は書記素（`Intl.Segmenter`）。未対応の環境ではコードポイント単位に切り替わる。
- 達成率は整数比較で判定し、小数点以下は切り捨て（79.75% は 79%）。
- 指定文字数は、チップ（200〜800）か詳細設定の任意入力（1〜10000）。任意入力が不正な間は直前の指定文字数で結果を保ち、エラーは blur か最後の入力から1.2秒後に出す。

## 6. ヒントのロジックと辞書の更新方法
`index.html` の logic 内 `REDUNDANT`（冗長表現の正規表現と閾値 `th`）、`STRUCT`（構成語の辞書）を編集する。引用「」内は検出対象外。点数・合否は出さない。構成チェックは150字以上のときのみ。3000字超ではヒントを省略する。

## 7. テストの実行方法
- `node tests/es.test.js`（57件: count 16 / progress 13 / analyze 17 / share 4 / サイト整合 7）。`index.html` の logic を `vm.runInNewContext` で抽出して評価する。
- `node tests/ui-static.test.js`（N01〜N15。HTML を文字列で検査）。
依存パッケージなし。

## 8. SEO・サイトマップ
`sitemap.xml` と `robots.txt` はサイトのルートに1つだけ（6ページ分）。このフォルダには置かない。公開URLを変えたら、canonical・og:url・JSON-LD の url・logic の `BASE`・`tests/` の `BASE`・ルートの `sitemap.xml` を直す。検索エンジンへの通知は Search Console で `sitemap.xml` を再送信して行う。

## 9. 年次メンテナンス
29卒 / 30卒の日程、PR 案件の対象年度・成果条件、ステマ規制（景品表示法）の運用、リード文の時期表現を見直す。

## 10. 注意事項
外部リクエスト 0（links-config.js と、広告カード表示時の計測用画像を除く）を維持する。ブラウザの保存領域（ローカルストレージ等）は使わない。入力データを外部送信しない。DOM 生成は textContent / createElement のみ。HTML は 100KB 以内（現在 約54KB）。

## 11. 出典・根拠の性質
8割・9割は就活メディア・エージェントの経験則で、企業の公式基準ではない。冗長表現の辞書は出典未確認の一般的な目安。STAR とガクチカ構成の対応づけも目安である。
