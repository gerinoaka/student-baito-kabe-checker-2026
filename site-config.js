/*
 * site-config.js ── AdSense と Google アナリティクス4（GA4）の一括設定【全14ページ共通】
 * 社長が編集するのは、下の「ADSENSE_CLIENT」「GA4_ID」の2行だけです（22行目・23行目）。
 *
 * 【使い方】
 *  1. AdSense の審査に通ったら、発行元ID（ca-pub- で始まる文字列）を ADSENSE_CLIENT の '' の中に貼る。
 *       例)  ADSENSE_CLIENT: 'ca-pub-1234567890123456',
 *  2. GA4 を使うときは、測定ID（G- で始まる文字列）を GA4_ID の '' の中に貼る。
 *       例)  GA4_ID: 'G-ABCDE12345'
 *  3. 保存してサイトに反映する（git push、またはブラウザで上書きアップロード）。数分で14ページすべてに反映される。
 *  4. AdSense を貼ったときは、ルートに ads.txt を作り、プライバシーポリシーを更新する（README の手順）。
 *
 * 【ルール】
 *  - 空のままのときは、広告・解析のスクリプトを読み込まず、外部へのリクエストも出さない。
 *  - 形式が合わないとき（ADSENSE_CLIENT は ca-pub- ＋数字10〜20桁、GA4_ID は G- ＋英大文字・数字4〜12桁）も、読み込まない。
 *  - 文字列はシングルクォート ' で囲み、ADSENSE_CLIENT の行末のカンマ , を消さない。
 *  - この2行より下の読み込みロジックは書き換えない。
 *  - 設定済みの値を上書きしない。
 */
window.SITE_CONFIG = {
  // ↓ 貼るのはこの2行だけ
  ADSENSE_CLIENT: 'ca-pub-5481087816228542',
  GA4_ID: 'G-3P5TMV0N6Z'
};

(function () {
  'use strict';
  var C = window.SITE_CONFIG || {};
  var AD = typeof C.ADSENSE_CLIENT === 'string' ? C.ADSENSE_CLIENT.trim() : '';
  var GA = typeof C.GA4_ID === 'string' ? C.GA4_ID.trim() : '';
  var AD_OK = /^ca-pub-\d{10,20}$/.test(AD);
  var GA_OK = /^G-[A-Z0-9]{4,12}$/.test(GA);
  function load(src, cross) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    if (cross) { s.crossOrigin = 'anonymous'; }
    (document.head || document.documentElement).appendChild(s);
  }
  if (GA_OK) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA);
    load('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA), false);
  }
  if (AD_OK) {
    load('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(AD), true);
  }
})();
