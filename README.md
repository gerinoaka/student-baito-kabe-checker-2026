# 学生バイトお役立ちツール（令和8年分・2026年）— 年収の壁チェッカー＋関連ミニツール2本

給与のみの学生向けの静的ツール3本。入力値は送信・保存しない（広告カードの表示時の ASP 計測用画像を除き外部リクエストなし、localStorage/cookie は自サイトでは不使用）。

- 年収の壁チェッカー（`index.html`）: 4つの壁（本人の所得税178万円／親の控除／親の健保の扶養／住民税）を判定。
- 掛け持ちバイトの源泉徴収・還付金チェッカー（`kakemochi/index.html`）: 年税額と還付の目安。
- 時給×シフト逆算計算機（`shift-limit/index.html`）: 壁を超えないための月・週の時間。

最終確認日: 年収の壁チェッカーの数値は 2026-11-16、新2ページは 2026-11-17。数値の正は `backlog/` のファクトシート（`20261116_student-baito-kabe-checker-2026_factsheet.md`、`20261117_kabe-tools-expansion_factsheet.md`）。

## 1. ASP の URL 差し替え手順（社長向け）

### 1-1 先に知っておくこと
- 書き換えるのは `links-config.js` の3行だけ（41行目・49行目・57行目）。
- 空のままなら、広告カードは出ない（死んだリンクは公開されない）。
- 間違えてもサイトは壊れず、カードが出ないだけ。
- A8.net の広告コードにある `<img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=...">` の src の URL は、`links-config.js` 末尾の `window.KABE_IMP = { ... }` の同じキーの `''` の中に貼る（計測用画像。他の4サイトは `LIVING_IMP` / `ES_IMP` / `NISA_IMP` / `SCHOLAR_IMP`）。空なら読み込まない。728×90 のバナー画像は使わない。
- 計測用画像は、そのキーの広告カードが画面に表示されたときだけ読み込まれる（カードが出ないときは一切読み込まない）。A8.net が Cookie 等で表示・クリック・成果を計測する。入力した金額・文章などは送信されない。

### 1-2 どのカードが、どのページの誰に出るか

| キー | 壁チェッカー（トップ） | 掛け持ち還付 | シフト逆算 |
|---|---|---|---|
| tanpatsu（単発バイトアプリ） | 19歳以上、壁を超えていない、次の壁まで10万円以上 | 出ない | 年齢で「19歳以上」を選び、結果が余裕あり（room）のとき |
| kakutei（確定申告アプリ） | 150万円超、健保ライン超え、掛け持ち | 結果表示時は常に（最大1枚） | 出ない |
| note（解説記事） | kakutei が空のときの代わり | 同左 | 出ない |

18歳以下・年齢未選択には tanpatsu を出さない。トップは最大2枠。

### 1-3 手順（Step1〜7）
1. ASP（A8.net / もしもアフィリエイト 等）で案件を探して提携申請する。探すキーワードの例:「単発バイト」「スキマバイト」「確定申告 アプリ」「会計ソフト」。
2. 提携承認後、広告リンクから **`https://` で始まるURLだけ**をコピーする（HTMLタグ全体は貼らない）。各ASPの規約（リンクの貼り方・表示条件）を確認する。
3. GitHub のリポジトリで `links-config.js` を開き、鉛筆アイコン（Edit this file）を押す。
4. 41行目・49行目・57行目の `url: '',` の `''` の間に貼る。
5. 緑の「Commit changes」を押す。
6. 1〜数分待って、3ページを開く。キャッシュが残る場合は Ctrl+F5。
7. 表示確認（1-4）。

サイトのフォルダ全体を GitHub に反映する場合は、git push 1回（またはブラウザの「Add file → Upload files」で上書き）。サブフォルダ3つ（living-cost-simulator / es-word-counter / nisa-simulator）も一緒に上がる。`.nojekyll` と `googlef0918a9bf30cf9a1.html` を含める。

### 1-4 編集前後の例
41行目（tanpatsu）:
```js
// 前
    url: '',
// 後（URLはダミー。実際はASPのURLを貼る）
    url: 'https://px.a8.net/svt/ejp?a8mat=XXXX',
```
49行目（kakutei）:
```js
// 前
    url: '',
// 後（ダミー）
    url: 'https://px.a8.net/svt/ejp?a8mat=YYYY',
```
57行目（note）:
```js
// 前
    url: '',
// 後（ダミー）
    url: 'https://px.a8.net/svt/ejp?a8mat=ZZZZ',
```
3キーとも書き換えた完成形の抜粋（ダミー）:
```js
window.KABE_LINKS = {
  tanpatsu: {
    url: 'https://px.a8.net/svt/ejp?a8mat=XXXX',
    label: 'PR',
    ...
  },
  kakutei: {
    url: 'https://px.a8.net/svt/ejp?a8mat=YYYY',
    label: 'PR',
    ...
  },
  note: {
    url: 'https://px.a8.net/svt/ejp?a8mat=ZZZZ',
    label: 'PR',
    ...
  }
};
```
表示確認の手順:
- トップ: 年齢「19〜22歳」、収入100万円などで判定する（tanpatsu）。収入160万円で判定する（kakutei）。
- シフト逆算: 年齢「19歳以上」を選んで計算する（tanpatsu）。
- 掛け持ち還付: 計算する（kakutei。空なら note）。

### 1-5 文言を変えたいとき
`title` / `desc` / `cta` は広告主の規約に合わせて変更してよい。`label: 'PR'` は消さない。

### 1-6 うまく表示されないとき

| 症状・原因 | 確認すること |
|---|---|
| url が空のまま | 41/49/57行目に URL を貼ったか |
| 引用符 `'` の閉じ忘れ | `url: '...',` の両端の `'` |
| 行末のカンマ `,` を消した | 行末に `,` があるか |
| 全角の引用符を使った | 半角の `'` に直す |
| `http://` で始まっている | `https://` で始まるURLだけ有効 |
| 年齢未選択・条件外 | 1-2 の表の条件に当たっているか |

`https://<サイト>/links-config.js` をブラウザで直接開いて、書いた内容が反映されているか確認する。構文を壊すとカードが全部出ないだけで、ツール本体は動く。

### 1-7 やめたいとき
`url` を `''` に戻して Commit する。

### 1-8 してはいけないこと
- `label: 'PR'` の削除。
- `googlef0918a9bf30cf9a1.html` の削除。
- リポジトリ直下以外への `links-config.js` の移動。
- 年齢条件のあるサービスを tanpatsu 以外に差し込むこと。

## 2. ファイル構成
```
student-baito-kabe-checker-2026/
  index.html                年収の壁チェッカー（SEO・Xシェア・PRカード・Q&A・用語解説・共通ナビ）
  links-config.js           広告（PR）URLの一元管理（3ページ共通。サブページは ../links-config.js）
  sitemap.xml               6ページ（サブフォルダには sitemap・robots・.nojekyll を置かない）
  robots.txt                Sitemap 行つき
  CNAME                     独自ドメイン gakusei-tools.com（1行のみ。GitHub Pages のカスタムドメイン用）
  .nojekyll                 0バイト（GitHub Pages で Jekyll 処理を無効にする）
  googlef0918a9bf30cf9a1.html  Search Console 所有権確認（削除禁止）
  kakemochi/index.html      掛け持ち還付チェッカー
  shift-limit/index.html    シフト逆算計算機
  tests/judge.test.js       判定ロジック＋prPlan＋buildShare＋サイト横断チェック（113件）
  tests/dom-stub.js         依存ゼロの最小DOMスタブ
  tests/ui-smoke.test.js    UI動作テスト（25件）
  tests/ui-static.test.js   UI静的検査（51件）
  tests/site.test.js        6ページ横断テスト（7件。4つの作業がそろってから実行）
  tests/kakemochi.test.js   44件
  tests/shift.test.js       66件
  README.md                 本ファイル
```
各HTMLは CSS/JS 内包の1ファイル（100KB＝102,400バイト以内。現在 index 約88KB、kakemochi 約67KB、shift-limit 約65KB）。`<script id="logic">`（純粋関数・DOM非依存）と `<script id="ui">` に分離。外部共有は `links-config.js` のみ（広告カード表示時の計測用画像のみ www11.a8.net へリクエストする）。OGP画像は未作成（`og:image` なし・`twitter:card=summary`）。1200x630 の画像を作ったら `og:image` を追加し `twitter:card=summary_large_image` にできる。

3ページのフッター前に、6ページ共通の `<aside class="rel">`（関連ツール。`.tools` と `.sisters`（`#sisters`））がある。リンクはすべて相対パス（`living-cost-simulator/` / `es-word-counter/` / `nisa-simulator/`）。ヘッダーのナビにも「ほかのツール」（`#sisters`）がある。共通CSSは `/*ds:start v1*/`〜`/*ds:end*/`。6ページで同じにする。変えるときは6ページを同時に直す（`tests/site.test.js` の X01 で検査）。

## 3. テスト実行
Node が PATH に無い場合は `%LOCALAPPDATA%\nodejs-portable` 配下の node.exe をフルパスで指定する。

```powershell
$node = (Get-ChildItem $env:LOCALAPPDATA\nodejs-portable -Recurse -Filter node.exe | Select-Object -First 1).FullName
& $node tests\judge.test.js
& $node tests\kakemochi.test.js
& $node tests\shift.test.js
& $node tests\ui-smoke.test.js
& $node tests\ui-static.test.js
& $node tests\site.test.js
```
全件パスで `pass N / fail 0`（judge 113 / kakemochi 44 / shift 66 / ui-smoke 25 / ui-static 51 / site 7）、失敗があれば終了コード1。

## 4. 公開手順の概要
このフォルダの中身を、そのままリポジトリ直下へ git push 1回で反映する（またはブラウザで上書きアップロード。サブフォルダごと、`.nojekyll` と `googlef0918a9bf30cf9a1.html` を含める。products フォルダは作らない）。独自ドメインの手順: お名前.com で A レコード4つ（185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153）と www の CNAME（GitHubユーザー名 gerinoaka の github.io ホスト）を設定し、GitHub の Settings → Pages で DNS check を確認したあと Enforce HTTPS をオンにする。GitHub Pages は設定済み（カスタムドメイン gakusei-tools.com。旧URL `https://gerinoaka.github.io/student-baito-kabe-checker-2026/` からの移行）。次の6URLが開くか確認する。
- `https://gakusei-tools.com/`
- `https://gakusei-tools.com/kakemochi/`
- `https://gakusei-tools.com/shift-limit/`
- `https://gakusei-tools.com/living-cost-simulator/`
- `https://gakusei-tools.com/es-word-counter/`
- `https://gakusei-tools.com/nisa-simulator/`
## 5. 置換トークン・書き換え箇所
- `__SITE_URL__`: 置換済み（`https://gakusei-tools.com/`）。連絡先 `gakusei.kabe.checker@gmail.com` も記載済み。
- リポジトリ名を変える場合に直す箇所: 3ページの canonical / og:url、JSON-LD の url（WebApplication と isPartOf）、`sitemap.xml`、`robots.txt`、新3ツールの canonical・og:url・JSON-LD の url・`BASE`・各テストの `BASE`、各ページ logic の `CANON`（index は `KABE.DATA.CANON`、kakemochi は `KAKE.DATA.CANON`、shift-limit は `SHIFT.DATA.CANON`）、`tests/judge.test.js` の `BASE`、`tests/kakemochi.test.js` と `tests/shift.test.js` の `BASE`。
- AdSense: `index.html` の `.ad-slot`（`data-slot="after-result"` / `before-sources`）。審査通過後に広告コードを `div` 内へ入れ、**入れたら `hidden` を外す**。入力フォーム・ボタン付近・結果カードの間には置かない。
- 旧 `data-aff` / `aside#aff` / note 導線は廃止し、`links-config.js` に統合した。

## 6. SEO
- FAQPage 構造化データのリッチリザルトは2026年5月7日に終了済み。残す理由は、画面上のFAQと同文で保守コストが低いため（効果は薄い）。**FAQを変えたら可視FAQとJSON-LDを必ず同文に更新**（テストで一致を検査）。Q&A は index 15問、kakemochi 13問、shift-limit 12問。用語解説（`#glossary`）は FAQ の外に置く（FAQ の `<section>` の中に入れない）。
- `robots.txt` は独自ドメイン直下（`https://gakusei-tools.com/robots.txt`）に置かれるためクローラに読まれる。あわせて Search Console で `sitemap.xml` を直接送信する。
- Search Console は新URL `https://gakusei-tools.com/` のプロパティで運用する（旧URLのプロパティとは別。未登録なら追加する）。sitemap.xml を再送信し、新3URLをURL検査でリクエストする（任意）。参考（初回手順）: ①「URLプレフィックス」で `https://gakusei-tools.com/` を追加（ドメインプロパティ不可）②所有権確認は HTMLファイルをリポジトリ直下へ、または `index.html` の head に `<meta name="google-site-verification" content="...">`（HTMLファイル方式は消すと確認が外れる）③「サイトマップ」で `sitemap.xml` を送信 ④（任意）URL検査で3ページを「インデックス登録をリクエスト」。
- **所有権確認ファイル `googlef0918a9bf30cf9a1.html`（2026-11-17 設置）は削除禁止。** 消すと Search Console の確認が外れる。フォルダごと再アップロードするときも含めること。
- og:image は未作成。

## 7. Xシェア
- `https://x.com/intent/tweet` の `text` / `url` / `hashtags`。投稿文に金額・年齢・時間・残額・壁の数値は入れない（テストで検査）。
- 文面は結果の区分で変わる。index は超えた壁の数と名前、kakemochi は区分（還付／追加納付／差額なし）、shift-limit は壁の種類と余裕の区分（たっぷり／少し／わずか／ちょうど／超過）。
- ボタンを押すまで外部通信しない（広告カードの表示時の計測用画像を除く）。`intent/post` と旧ドメイン（twitter.com）は一次情報で未確認のため使わない。

## 8. PRカード
- 表の対応は 1-2 のとおり。tanpatsu は 19歳以上のみ（18歳以下・年齢未選択には出さない）。shift-limit は年齢「19歳以上」を選び、結果が余裕ありのときだけ tanpatsu を1枚出す。
- 壁チェッカー: A枠（`tanpatsu`）は超えた壁が0かつ次の壁まで10万円以上。B枠（`kakutei`、未設定なら `note`）は給与収入150万円超、または健保の扶養ライン超え、または掛け持ち。最大2枠。内部リンク（掛け持ち還付チェッカーへ）はPRではないのでラベルなし。
- 閾値は `index.html` の `PR_A_MARGIN`（100,000）と `PR_B_X`（1,500,000）。
- kakemochi は B枠のみ（最大1枚）。
- shift-limit の年齢ラジオは任意入力で、広告の表示判定にだけ使い、計算結果は変えない（既定は未選択）。

## 9. 年次更新チェックリスト
- [ ] index: `<script id="logic">` の `LIMIT_*` / `AMT_*` / `TOKUTEI_TIERS` / `DATA`、段階表（`#tierTbl`）、早見表、ゲージ（`.g-tick` の `left`＝万円÷200×100%）。Q&A と用語解説は `<details>` の中にあるが、構造は変えない
- [ ] kakemochi: `SCOPE_LIMIT`（支払金額の合計206万円以下が対象。基礎控除104万円が確認済みなのは合計所得132万円以下のため）/ `STUDENT_AMT` / `STUDENT_G_MAX` / `OTSU_LT` / `OTSU_RATE_NUM`、乙欄の閾値（令和9年分は111,000円未満）、年税額の端数処理（100円未満切捨は未確認）
- [ ] shift-limit: `WALLS`、`defaultMonthsLeft` の年（2026）、留学生の週28時間（`weeklyFromMonthly` の 1456 = 28×52）、`shareTier` の境界（余裕2分の1・5分の1）
- [ ] Q&A と用語解説の数値（178万・136万・159万・197万・150万・119万・105,000円・3.063%・時給例の計算値）
- [ ] FAQ の可視と JSON-LD の同文確認（テストで検査）
- [ ] 6ページの最終確認日（注意帯・description・JSON-LD dateModified・一次情報・免責・DATA）と `sitemap.xml` の lastmod
- [ ] 一次情報リンクの生存確認、「令和9年分以降について」セクション
- [ ] ファクトシートの「未確認」項目の再確認
- [ ] 関連ツールのリンク（6ページ×6件=36件）の生存確認
- [ ] 3本のテストの期待値更新

## 10. 根拠一覧（主なもの）
国税庁 No.1199 / 1410 / 1175 / 1177 / 1180 / 1900 / 2030 / 2260 / 1130 / 2509、令和8年分税額表・denshi_02.pdf（乙欄の計算。一部確認）、財務省 令和8年度税制改正の大綱、日本年金機構・厚生労働省・協会けんぽ、各自治体、出入国在留管理庁（留学生の資格外活動。本文は一部確認）。
- 国税庁 No.2665 は削除（本文が年末調整の対象者の説明のみで、乙欄・従たる給与の記載がなかったため）。代わりに No.2030 を追加。

## 11. 未確認項目（拡張ファクトシートより転記）
- 令和8年分月額表乙欄の105,000〜740,000円の税額（一次の表）、日額表の乙欄。
- 年税額の100円未満切捨ての一次根拠。所得金額調整控除の学生への非該当（一次根拠）。
- 国民年金の学生納付特例の税務上の扱い（NTA）。
- 労基法の法定労働時間（日本人学生・年少者）の一次URL。
- 入管庁ページの本文（直接取得403。二次・大学資料で補強）。
- 確定申告書の住民税連動（NTAの明記）。
- X: `intent/post` の存在、旧ドメインのリダイレクト。Google: FAQPage 構造化データの残存価値の一次記述。
- 住民税の令和9年度段階額、2・3級地、未成年者の住民税基準、勤労学生の住民税26万円（既存ファクトシート）。
- Q&A の「親にバレるか」は運用が市区町村・健保組合で異なり未確認。断定しない。

## 6a. SEO 補足（UI刷新後）
- 閉じた `<details>` 内の本文もインデックス対象。FAQ・用語解説は `<details class="acc">` の中の `<section id="faq">` / `<section id="glossary">`。
- 広告枠（`.ad-slot`）は結果カードの直下・アコーディオン群の間にあり、入力フォームの直近には置かない（新レイアウトでも維持）。
