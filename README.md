# 学生バイトお役立ちツール（令和8年分・2026年）— 年収の壁チェッカー＋関連ミニツール2本

給与のみの学生向けの静的ツール3本。入力値は送信・保存しない（外部リクエスト0、localStorage/cookie 不使用）。

- 年収の壁チェッカー（`index.html`）: 4つの壁（本人の所得税178万円／親の控除／親の健保の扶養／住民税）を判定。
- 掛け持ちバイトの源泉徴収・還付金チェッカー（`kakemochi/index.html`）: 年税額と還付の目安。
- 時給×シフト逆算計算機（`shift-limit/index.html`）: 壁を超えないための月・週の時間。

最終確認日: 年収の壁チェッカーの数値は 2026-11-16、新2ページは 2026-11-17。数値の正は `backlog/` のファクトシート（`20261116_student-baito-kabe-checker-2026_factsheet.md`、`20261117_kabe-tools-expansion_factsheet.md`）。

## 1. ファイル構成
```
student-baito-kabe-checker-2026/
  index.html                年収の壁チェッカー（SEO・Xシェア・PRカード・共通ナビ）
  links-config.js           広告（PR）URLの一元管理（3ページ共通。サブページは ../links-config.js）
  sitemap.xml               3ページ
  robots.txt                Sitemap 行つき
  .nojekyll                 0バイト（GitHub Pages で Jekyll 処理を無効にする）
  kakemochi/index.html      掛け持ち還付チェッカー
  shift-limit/index.html    シフト逆算計算機
  tests/judge.test.js       判定ロジック＋prPlan＋buildShare＋サイト横断チェック（96件）
  tests/kakemochi.test.js   35件
  tests/shift.test.js       40件
  README.md                 本ファイル
```
各HTMLは CSS/JS 内包の1ファイル（61,440バイト以内）。`<script id="logic">`（純粋関数・DOM非依存）と `<script id="ui">` に分離。外部共有は `links-config.js` のみ。OGP画像は未作成（`og:image` なし・`twitter:card=summary`）。1200x630 の画像を作ったら `og:image` を追加し `twitter:card=summary_large_image` にできる。

## 2. テスト実行
Node が PATH に無い場合は `%LOCALAPPDATA%\nodejs-portable` 配下の node.exe をフルパスで指定する。

```powershell
$node = (Get-ChildItem $env:LOCALAPPDATA\nodejs-portable -Recurse -Filter node.exe | Select-Object -First 1).FullName
& $node tests\judge.test.js
& $node tests\kakemochi.test.js
& $node tests\shift.test.js
```
全件パスで `pass N / fail 0`、失敗があれば終了コード1。

## 3. 公開手順の概要
このフォルダの中身を、そのままリポジトリ直下へアップロードする（`.nojekyll` を含める。products フォルダは作らない）。GitHub Pages を有効にし、次の3URLが開くか確認する。
- `https://gerinoaka.github.io/student-baito-kabe-checker-2026/`
- `https://gerinoaka.github.io/student-baito-kabe-checker-2026/kakemochi/`
- `https://gerinoaka.github.io/student-baito-kabe-checker-2026/shift-limit/`

## 4. 置換トークン・書き換え箇所
- `__SITE_URL__`: 置換済み（`https://gerinoaka.github.io/student-baito-kabe-checker-2026/`）。連絡先 `gakusei.kabe.checker@gmail.com` も記載済み。
- リポジトリ名を変える場合に直す箇所: 3ページの canonical / og:url、JSON-LD の url（WebApplication と isPartOf）、`sitemap.xml`、`robots.txt`、`KABE.DATA.CANON`（`index.html` の logic）、`tests/judge.test.js` の `BASE`。
- AdSense: `index.html` の `.ad-slot`（`data-slot="after-result"` / `before-sources`）。審査通過後に広告コードを `div` 内へ入れ、**入れたら `hidden` を外す**。入力フォーム・ボタン付近・結果カードの間には置かない。
- 旧 `data-aff` / `aside#aff` / note 導線は廃止し、`links-config.js` に統合した。

## 5. links-config.js（広告リンクの一元管理）
社長が書き換えるのは、26行目（`tanpatsu`）・34行目（`kakutei`）・42行目（`note`）の `url: '',` の `''` の中だけ（`https://` で始まる広告リンク）。書き換えたら再アップロード。
- `url` が空、または `https://` で始まらないキーは、カード自体が表示されない（死んだリンクは公開されない）。
- `label: 'PR'` は消さない。`title` / `desc` / `cta` は広告主の規約に合わせて変更してよい。
- `kakeibo`・`card` は廃止（18歳未満問題・最大2枠方針）。必要ならキーを追加して復活できる。
- 出荷状態は全て `url: ''`（PRカードは1枚も出ない。内部リンクとXシェアは動く）。

## 6. SEO
- FAQPage 構造化データのリッチリザルトは2026年5月7日に終了済み。残す理由は、画面上のFAQと同文で保守コストが低いため（効果は薄い）。**FAQを変えたら可視FAQとJSON-LDを必ず同文に更新**（テストで一致を検査）。
- `robots.txt` は `https://<user>.github.io/<repo>/robots.txt` では クローラに読まれない（プロジェクトサイトのサブパス）。本命は Search Console で `sitemap.xml` を直接送信すること。
- Search Console 手順: ①「URLプレフィックス」で `https://gerinoaka.github.io/student-baito-kabe-checker-2026/` を追加（ドメインプロパティ不可）②所有権確認は HTMLファイルをリポジトリ直下へ、または `index.html` の head に `<meta name="google-site-verification" content="...">`（HTMLファイル方式は消すと確認が外れる）③「サイトマップ」で `sitemap.xml` を送信 ④URL検査で3ページを「インデックス登録をリクエスト」。
- og:image は未作成。

## 7. Xシェア（index.html）
- `https://x.com/intent/tweet` の `text` / `url` / `hashtags`。投稿文は超えた壁の数と名前のみ。金額・年齢・残額・壁の数値は入れない（テストで検査）。
- ボタンを押すまで外部通信しない。`intent/post` と旧ドメイン（twitter.com）は一次情報で未確認のため使わない。

## 8. PRカード
- A枠（`tanpatsu`）: 超えた壁が0かつ次の壁まで10万円以上、18歳以下には出さない。
- B枠（`kakutei`、未設定なら `note`）: 給与収入150万円超、または健保の扶養ライン超え、または掛け持ち。
- 最大2枠。内部リンク（掛け持ち還付チェッカーへ）はPRではないのでラベルなし。
- 閾値は `index.html` の `PR_A_MARGIN`（100,000）と `PR_B_X`（1,500,000）。
- 新ページ: kakemochi は B枠のみ（最大1枚）。shift-limit には PR カードを置かない（年齢入力がなく、18歳以下を除外できないため）。内部リンクのみ。

## 9. 年次更新チェックリスト
- [ ] index: `<script id="logic">` の `LIMIT_*` / `AMT_*` / `TOKUTEI_TIERS` / `DATA`、段階表（`#tierTbl`）、早見表、ものさし（`.tk` の `left`＝万円÷200×100%）
- [ ] kakemochi: `SCOPE_LIMIT`（支払金額の合計206万円以下が対象。基礎控除104万円が確認済みなのは合計所得132万円以下のため）/ `STUDENT_AMT` / `STUDENT_G_MAX` / `OTSU_LT` / `OTSU_RATE_NUM`、乙欄の閾値（令和9年分は111,000円未満）、年税額の端数処理（100円未満切捨は未確認）
- [ ] shift-limit: `WALLS`、`defaultMonthsLeft` の年（2026）、留学生の週28時間（`weeklyFromMonthly` の 1456 = 28×52）
- [ ] FAQ を変えたら可視FAQと JSON-LD（FAQPage）を同文に
- [ ] 3ページの最終確認日（注意帯・description・JSON-LD dateModified・一次情報・免責・DATA）と `sitemap.xml` の lastmod
- [ ] 一次情報リンクの生存確認、「令和9年分以降について」セクション
- [ ] ファクトシートの「未確認」項目の再確認
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
