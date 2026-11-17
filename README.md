# 学生バイトお役立ちツール（令和8年分／令和8年度）— 14ページ

学生・新社会人向けの静的サイト。**ツール7本・解説記事4本・運営者情報・ツール一覧・プライバシーポリシー（計14ページ）**。入力値は送信・保存しない（広告カードの表示時の ASP 計測用画像、「Xでシェア」ボタンを押したときの X への移動、GA4（Google アナリティクス 4）によるアクセス解析、Google AdSense の広告配信を除き、外部リクエストなし。入力内容の Cookie・ローカルストレージ保存は不使用。GA4・AdSense は Cookie を使う）。GA4 は `G-3P5TMV0N6Z`、AdSense は `ca-pub-5481087816228542`（自動広告のみ）で有効。

| 区分 | ページ |
|---|---|
| ツール（7） | `index.html`（年収の壁チェッカー）／`kakemochi/`（掛け持ち還付）／`shift-limit/`（シフト逆算）／`living-cost-simulator/`（手取り・生活費）／`es-word-counter/`（ES文字数）／`nisa-simulator/`（新NISA積立）／`scholarship/`（奨学金返済） |
| ガイド（4） | `guides/150-wall-guide/`／`guides/kakemochi-tax-guide/`／`guides/es-star-method/`／`guides/student-nisa-start/` |
| サイト情報（3） | `about/`（運営者情報）／`tools/`（ツール一覧）／`privacy/`（プライバシーポリシー・外部送信先一覧） |

最終確認日: 各ページの上部の帯に表示（年収の壁チェッカー 2026-11-16、ほかは 2026-11-17）。sitemap の lastmod と tools・privacy の更新日だけ 2026-11-18。数値の正は `backlog/` のファクトシート。

## 1. ASP の URL 差し替え手順（社長向け）

### 1-1 先に知っておくこと
- 書き換えるのは各 `links-config.js` の `url:` 行だけ（行番号は 1-2 の表）。
- **url を貼るときは、同じキーの `*_IMP` も貼る。設定済みの行は上書きしない。**
- 空のままなら、広告カードは出ない（死んだリンクは公開されない）。間違えてもサイトは壊れず、カードが出ないだけ。
- A8.net の広告コードにある `<img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=...">` の src の URL は、同じ `links-config.js` 末尾の `*_IMP`（root は `KABE_IMP`、他は `LIVING_IMP` / `ES_IMP` / `NISA_IMP` / `SCHOLAR_IMP`）の同じキーの `''` の中に貼る。空なら読み込まない。728×90 のバナー画像は使わない。
- 計測用画像は、そのキーの広告カードが画面に表示されたときだけ読み込まれる（カードが出ないときは一切読み込まない）。A8.net が Cookie 等で表示・クリック・成果を計測する。入力した金額・文章などは送信されない。送信先と内容は `privacy/` に一覧がある。

### 1-2 `url:` 行番号（5つの links-config）

| ファイル | 変数 | `url:` の行（キー順） |
|---|---|---|
| `links-config.js`（root。年収の壁・掛け持ち・シフト逆算の3ページ共通） | `KABE_LINKS` / `KABE_IMP` | 41行目（tanpatsu）／49行目（kakutei）／57行目（note） |
| `es-word-counter/links-config.js` | `ES_LINKS` / `ES_IMP` | 40（shukatsuSite）／48（agent）／56（scout） |
| `nisa-simulator/links-config.js` | `NISA_LINKS` / `NISA_IMP` | 38（shoken1）／45（shoken2）／52（book） |
| `living-cost-simulator/links-config.js` | `LIVING_LINKS` / `LIVING_IMP` | 43（rentMove）／50（internet）／57（creditCard）／64（bank） |
| `scholarship/links-config.js` | `SCHOLAR_LINKS` / `SCHOLAR_IMP` | 40（kakeibo）／47（fp）／54（tsushin） |

各ファイルの3行目にも同じ行番号を書いてある。行を足したり消したりすると行番号がずれるので、編集は `url: ''` の中身だけにする。説明の追記は `*_IMP` の行より後ろ（ファイル末尾）に書く。

### 1-3 設定済みの3枠（2026-11-18 時点）

| サイト | キー | 行 | 対応する計測用画像 | ホスト |
|---|---|---|---|---|
| root（年収の壁） | kakutei | 49行目 | `KABE_IMP.kakutei` | www11.a8.net |
| nisa | shoken1 | 38行目 | `NISA_IMP.shoken1` | www15.a8.net |
| living | internet | 50行目 | `LIVING_IMP.internet` | www10.a8.net |

**この3つの `url` と `*_IMP` は上書きしない。**（es と scholarship は全枠が空。）

### 1-4 どのカードが、どのページの誰に出るか（年収の壁サイト）

| キー | 壁チェッカー（トップ） | 掛け持ち還付 | シフト逆算 |
|---|---|---|---|
| tanpatsu（単発バイトアプリ） | 19歳以上、壁を超えていない、次の壁まで10万円以上 | 出ない | 年齢で「19歳以上」を選び、結果が余裕あり（room）のとき |
| kakutei（確定申告アプリ） | 150万円超、健保ライン超え、掛け持ち | 結果表示時は常に（最大1枚） | 出ない |
| note（解説記事） | kakutei が空のときの代わり | 同左 | 出ない |

18歳以下・年齢未選択には tanpatsu を出さない。トップは最大2枠。ほかのツール（es・nisa・living・scholarship）の出し分けは、各フォルダの README とマニュアルパック第4章の対応表。

### 1-5 手順（Step1〜7）
1. ASP（A8.net / もしもアフィリエイト 等）で案件を探して提携申請する（キーワードの例はマニュアルパック第4章）。
2. 提携承認後、広告リンクから **`https://` で始まるURLだけ**をコピーする（HTMLタグ全体は貼らない）。各ASPの規約を確認する。
3. GitHub のリポジトリで、該当の `links-config.js` を開き、鉛筆アイコン（Edit this file）を押す。
4. 1-2 の表の行の `url: '',` の `''` の間に貼る。**同じキーの `*_IMP` にも計測用画像のURLを貼る。**
5. 緑の「Commit changes」を押す。
6. 1〜数分待って、ページを開く。キャッシュが残る場合は Ctrl+F5。
7. 表示確認（年齢条件に合う入力で結果を出す）。

サイトのフォルダ全体を GitHub に反映する場合は、git push 1回（またはブラウザの「Add file → Upload files」で上書き）。サブフォルダ（`kakemochi` `shift-limit` `living-cost-simulator` `es-word-counter` `nisa-simulator` `scholarship` `about` `tools` `privacy` `guides` `og` `tests`）も一緒に上げる。`.nojekyll` と `googlef0918a9bf30cf9a1.html` を含める。

### 1-6 編集前後の例（41行目 tanpatsu）
```js
// 前
    url: '',
// 後（URLはダミー。実際はASPのURLを貼る）
    url: 'https://px.a8.net/svt/ejp?a8mat=XXXX',
```
`KABE_IMP` も同じキーの値を貼る例（ダミー）:
```js
window.KABE_IMP = { tanpatsu: 'https://www11.a8.net/0.gif?a8mat=XXXX', kakutei: '（設定済み。上書きしない）', note: '' };
```

### 1-7 文言を変えたいとき・うまく表示されないとき
`title` / `desc` / `cta` は広告主の規約に合わせて変更してよい。`label: 'PR'` は消さない。

| 症状・原因 | 確認すること |
|---|---|
| url が空のまま | 1-2 の行に URL を貼ったか |
| 引用符 `'` の閉じ忘れ | `url: '...',` の両端の `'` |
| 行末のカンマ `,` を消した | 行末に `,` があるか |
| 全角の引用符を使った | 半角の `'` に直す |
| `http://` で始まっている | `https://` で始まるURLだけ有効 |
| 年齢未選択・条件外 | 1-4 の表の条件に当たっているか |
| カードは出るが計測されない | 同じキーの `*_IMP` が空ではないか |

`https://<サイト>/links-config.js` をブラウザで直接開いて、書いた内容が反映されているか確認する。構文を壊すとカードが全部出ないだけで、ツール本体は動く。やめたいときは `url` を `''` に戻して Commit する。

### 1-8 してはいけないこと
- `label: 'PR'` の削除。
- `googlef0918a9bf30cf9a1.html` の削除。
- 設定済みの `url` と `*_IMP` の上書き。
- `links-config.js` の移動。
- 年齢条件のあるサービスを、条件の合わないキーに差し込むこと。

## 2. ファイル構成
```
student-baito-kabe-checker-2026/
  index.html                年収の壁チェッカー（SEO・Xシェア・PRカード・Q&A・用語解説・共通ナビ）
  links-config.js           広告（PR）URLの一元管理（root の3ページ共通）
  site-config.js            AdSense・GA4 の一括設定（全14ページが読み込む。22・23行目だけ編集）
  sitemap.xml               14ページ（サブフォルダには sitemap・robots・.nojekyll を置かない）
  robots.txt                Sitemap 行つき
  ads.txt                   AdSense の認可リスト（1行。sitemap には入れない）
  CNAME                     独自ドメイン gakusei-tools.com（1行のみ）
  .nojekyll                 0バイト（GitHub Pages で Jekyll 処理を無効にする）
  googlef0918a9bf30cf9a1.html  Search Console 所有権確認（削除禁止）
  kakemochi/ shift-limit/ living-cost-simulator/ es-word-counter/ nisa-simulator/ scholarship/
                            各ツール（index.html。living・es・nisa・scholarship は links-config.js と README.md、tests/ も持つ）
  guides/150-wall-guide/ guides/kakemochi-tax-guide/ guides/es-star-method/ guides/student-nisa-start/
                            解説記事4本（各 index.html）
  about/index.html          運営者情報・計算方針・広告（PR）表記・免責
  tools/index.html          ツール一覧（目的別・時期別の説明つき）
  privacy/index.html        プライバシーポリシー・外部送信先一覧（14ページ目）
  og/                       OGP画像 PNG 7枚（default / kabe / kakemochi / living / scholarship / nisa / es。1200×630、各 約40〜47KB）
  tests/                    judge / kakemochi / shift / ui-smoke / ui-static / site / hardening ＋ dom-stub.js
  README.md                 本ファイル
```
各HTMLは CSS/JS 内包の1ファイル（102,400バイト以内）。2026-11-18 時点の実測（バイト）: index 90,657／kakemochi 70,633／shift-limit 69,011／living 77,418／es 57,488／nisa 56,425／scholarship 80,034／about 34,226／tools 30,840／privacy 32,622／guides 47,623・42,675・43,313・41,022。

ツール7ページは `<script id="logic">`（純粋関数・DOM非依存）と `<script id="ui">` に分離。**`<script id="logic">` は変えない**（`tests/hardening.test.js` の H16 と `tests/site.test.js` の G14 が SHA-256 で検査する）。変えてよいのは HTML と `<script id="ui">` 内の文言。共通CSSは `/*ds:start v1*/`〜`/*ds:end*/` で、**全14ページで同じ**にする（変えるときは14ページを同時に直す。`tests/site.test.js` の X01・X08 と H20 が検査）。ページ固有のCSSは `/*ds:end*/` の後ろに足す。

外部ホストへのリクエスト: A8.net の計測用画像（広告カード表示時のみ）、GA4（`www.googletagmanager.com` ほか。測定ID `G-3P5TMV0N6Z` 設定済み）。AdSense（`pagead2.googlesyndication.com` ほか。`ca-pub-5481087816228542` 設定済み）。ID を空にすればどちらも外部リクエストはゼロになる。

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
& $node tests\hardening.test.js
& $node es-word-counter\tests\es.test.js
& $node es-word-counter\tests\ui-static.test.js
& $node living-cost-simulator\tests\living.test.js
& $node living-cost-simulator\tests\ui-static.test.js
& $node nisa-simulator\tests\nisa.test.js
& $node nisa-simulator\tests\ui-static.test.js
& $node scholarship\tests\scholarship.test.js
```
全件パスで `pass N / fail 0`（2026-11-18 の実測）: judge 113 / kakemochi 44 / shift 66 / ui-smoke 34 / ui-static 51 / site 39 / hardening 20 / es 57 / es ui-static 15 / living 156 / living ui-static 115 / nisa 37 / nisa ui-static 15 / scholarship 109。**合計 871件、失敗 0**。失敗があれば終了コード1。

`tests/hardening.test.js`（H01〜H20）は、privacy・site-config.js・ads.txt・title/description・OGP・ad-slot の位置・PR 1行・links-config の行番号・marketing_pack・README・`logic` の SHA-256・HTMLサイズ、全14ページの構文・ID・リンク・JSON-LD・FAQ同文・共通CSS・375px幅の静的チェックを行う。

## 4. 公開手順の概要
このフォルダの中身を、そのままリポジトリ直下へ git push 1回で反映する（またはブラウザで上書きアップロード。サブフォルダごと、`og/` と `site-config.js`、`.nojekyll` と `googlef0918a9bf30cf9a1.html` を含める。products フォルダは作らない）。独自ドメイン gakusei-tools.com は設定済み（お名前.com で A レコード4つと www の CNAME、GitHub の Settings → Pages で Enforce HTTPS）。次の14URLが開くか確認する。
- `https://gakusei-tools.com/`
- `https://gakusei-tools.com/kakemochi/`
- `https://gakusei-tools.com/shift-limit/`
- `https://gakusei-tools.com/living-cost-simulator/`
- `https://gakusei-tools.com/es-word-counter/`
- `https://gakusei-tools.com/nisa-simulator/`
- `https://gakusei-tools.com/scholarship/`
- `https://gakusei-tools.com/about/`
- `https://gakusei-tools.com/tools/`
- `https://gakusei-tools.com/privacy/`
- `https://gakusei-tools.com/guides/150-wall-guide/`
- `https://gakusei-tools.com/guides/kakemochi-tax-guide/`
- `https://gakusei-tools.com/guides/es-star-method/`
- `https://gakusei-tools.com/guides/student-nisa-start/`

あわせて `https://gakusei-tools.com/og/kabe.png` と `https://gakusei-tools.com/site-config.js` が開くこと、`sitemap.xml` が14件であることを確認する。

## 5. AdSense と GA4（`site-config.js`）
1. **ID を貼る**: AdSense の発行元ID（`ca-pub-` で始まる）を `site-config.js` の **22行目 `ADSENSE_CLIENT`**、GA4 の測定ID（`G-` で始まる）を **23行目 `GA4_ID`** の `''` の中に貼る。14ページすべてに反映される。形式（`ca-pub-`＋数字10〜20桁／`G-`＋英大文字・数字4〜12桁）が合わないときは読み込まない。空のままなら、その分の外部リクエストはゼロ（現状: GA4_ID・ADSENSE_CLIENT とも設定済み。AdSense は 2026-11-18 に `ca-pub-5481087816228542` を設定し、審査の申請ができる状態）。
2. **ads.txt**（AdSense を使うとき）: サイト直下に `ads.txt` を作る（2026-11-18 に作成済み。中身は `google.com, pub-5481087816228542, DIRECT, f08c47fec0942fa0` の1行）。別の ID に変えるときのテンプレート:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   `pub-` の後ろは、`ca-pub-1234567890123456` なら `pub-1234567890123456`。手順: ID を貼る → `ads.txt` を作る → 反映（数日かかることがある）→ ブラウザで `/ads.txt` を開いて確認 → AdSense の「サイト」画面で状態を見る。
3. **ID を貼った日の更新手順（必須）**:
   - （AdSense は 2026-11-18 に導入済みで、以下は反映済み。ID を外すときは逆に戻す。）`privacy/index.html` の「現在は導入していません」（要点・外部送信先の表の Google 行・`#google` 節）を「導入しています」に書き換え、送信先として Google LLC の行を表に追加する（送信される情報＝IPアドレス・ブラウザ情報・閲覧ページ・Cookie ID、目的＝広告配信／アクセス解析、停止方法＝同ページのオプトアウト）。
   - 7ツールと about の `#privacy` 要約の4項目目（「Google AdSense は利用していません」だった箇所）も「利用しています」に更新済み。
   - 最終更新日・制定日の下の更新日を当日にする。（`tests/hardening.test.js` の H06 が、ID があるのに「導入していません」が残っていると失敗にし、ID があるときは ads.txt の pub と一致することも検査する。）
4. **手動の広告枠**（任意）: 今は自動広告だけで運用し、`.ad-slot` は全て `hidden`（index・living・scholarship・nisa の4ページに各1つ。ページ末尾でPRカードとは離れている）。使うときは ①AdSense でディスプレイ広告ユニットを作る ②そのページの `.ad-slot` の `<div>` の中に `<ins class="adsbygoogle" …>` と `<script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>` を貼り `hidden` を外す ③同じページで自動広告と併用するなら、AdSense 管理画面の自動広告で、そのページ（または広告の掲載位置）を除外して二重にしない。
5. **自動広告の位置**: PRカードのすぐ近くに広告が出ないよう、AdSense の自動広告設定の「広告の掲載位置」で制御する。
6. 海外（EEA・英国・スイス）へ広告を出すときは、Google 認定の同意管理（CMP）が必要になる。今回は日本向けのため入れていない。拡大するときに要検討。

## 6. OGP画像
- `og/` に PNG 7枚（`default` `kabe` `kakemochi` `living` `scholarship` `nisa` `es`。1200×630、1枚300KB以内、合計1MB以内）。ガイドは対応するツールの画像、shift-limit は kabe、about・tools・privacy は default を使う（各ページの `og:image` と `og:image:alt`）。
- 画像は Microsoft Edge のヘッドレスで撮影して作った（背景 `#1a56c4`・白文字・システムフォントのカードHTMLを撮影）。作り直すときは、同じ配色の HTML カードを 1200×630 で撮影して `og/` に PNG だけを置く（撮影元の HTML は成果物に含めていない）。画像を変えたら、全ページの `og:image:alt` と対応表を確認する（`tests/hardening.test.js` の H08）。

## 7. SEO（title / description）
- 14ページの title / description の一覧は `backlog/20261118_hardening-growth_design.md` 第3章。変えるときは、meta・og・twitter・JSON-LD の description（同文のもの）・テスト（`tests/hardening.test.js` の H07 ほか）を同時に直す。description に「最終確認日」は入れない（本文の帯に表示する）。
- FAQPage 構造化データのリッチリザルトは2026年5月7日に終了済み。残す理由は、画面上のFAQと同文で保守コストが低いため（効果は薄い）。**FAQを変えたら可視FAQとJSON-LDを必ず同文に更新**（テストで一致を検査）。用語解説（`#glossary`）は FAQ の外に置く。
- `robots.txt` は独自ドメイン直下に置かれる。Search Console で `sitemap.xml`（14件）を送信する。所有権確認ファイル `googlef0918a9bf30cf9a1.html` は削除禁止。

## 8. Xシェア・PRカード
- `https://x.com/intent/tweet` の `text` / `url` / `hashtags`。投稿文に金額・年齢・時間・残額の数値は入れない（テストで検査）。ボタンを押すまで外部通信しない。
- PRカードの見出しには（PR）を付け、広告であることを示す。「広告を含みます」（`pr-disc`）、`label: 'PR'`、`rel="sponsored nofollow noopener"` は変更しない。ガイド4本・ツール一覧のファーストビューにも「※当サイトのツールにはプロモーション（PR）を含みます」を置いている。
- 年収の壁チェッカーの閾値は `index.html` の `PR_A_MARGIN`（100,000）と `PR_B_X`（1,500,000）。

## 9. 年次更新チェックリスト
- [ ] 各ツールの `<script id="logic">` の定数（index: `LIMIT_*` / `AMT_*` / `TOKUTEI_TIERS` / `DATA`、kakemochi: `SCOPE_LIMIT` ほか、shift-limit: `WALLS` ほか、living・nisa・scholarship・es の各定数）。**logic を変えたら、`tests/hardening.test.js` の H16 と `tests/site.test.js` の G14 の SHA-256 を更新する**
- [ ] Q&A と用語解説の数値と、FAQ の可視・JSON-LD の同文
- [ ] 14ページの最終確認日（注意帯・JSON-LD dateModified・一次情報・免責）と `sitemap.xml` の lastmod
- [ ] `privacy/` の外部送信先の表（広告案件・ホストの追加時、Google の導入時）
- [ ] 一次情報リンクの生存確認、「令和9年分以降について」セクション
- [ ] ファクトシートの「未確認」項目の再確認
- [ ] 関連ツールのリンクの生存確認
- [ ] 全テストの期待値更新（上の3.の実行コマンド）

## 10. 根拠一覧（主なもの）
国税庁 No.1199 / 1410 / 1175 / 1177 / 1180 / 1900 / 2030 / 2260 / 1130 / 2509、令和8年分税額表・denshi_02.pdf（乙欄の計算。一部確認）、財務省 令和8年度税制改正の大綱、日本年金機構・厚生労働省・協会けんぽ、各自治体、出入国在留管理庁（留学生の資格外活動。本文は一部確認）、JASSO（返還年数算出表）、金融庁（新NISA）。
- 国税庁 No.2665 は削除（本文が年末調整の対象者の説明のみで、乙欄・従たる給与の記載がなかったため）。代わりに No.2030 を追加。

## 11. 未確認項目（ファクトシートより転記）
- 令和8年分月額表乙欄の105,000〜740,000円の税額（一次の表）、日額表の乙欄。
- 年税額の100円未満切捨ての一次根拠。所得金額調整控除の学生への非該当（一次根拠）。
- 国民年金の学生納付特例の税務上の扱い（NTA）。
- 労基法の法定労働時間（日本人学生・年少者）の一次URL。
- 入管庁ページの本文（直接取得403。二次・大学資料で補強）。
- 確定申告書の住民税連動（NTAの明記）。
- X: `intent/post` の存在、旧ドメインのリダイレクト。Google: FAQPage 構造化データの残存価値の一次記述。
- 住民税の令和9年度段階額、2・3級地、未成年者の住民税基準、勤労学生の住民税26万円。
- Q&A の「親にバレるか」は運用が市区町村・健保組合で異なり未確認。断定しない。
- A8.net のプライバシーポリシーの個別URL（`privacy/` では推測で書かず、「A8.net サイト内をご確認ください」と記載）。
