/*
 * assets/ui-motion.js — 学生バイトお役立ちツール 共通モーション (v3)
 * 外部ライブラリ不使用。全ページで <script src="...assets/ui-motion.js" defer> として読み込む。
 * 1. スクロール連動フェードイン（IntersectionObserver）
 * 2. マウス操作時のみのカード浮き上がり（translateY(-2px) と影。rect は pointerenter で取得）
 * 3. スライダー進捗の塗り（--pct）
 * 4. 結果数値のカウントアップ（MutationObserver で確定値を検知 → rAF で補間 → 必ず確定値に戻す）
 * prefers-reduced-motion のとき、または rAF が無いときは 2・4 は何もしない。
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var RAF = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : null;
  var CAF = typeof window.cancelAnimationFrame === 'function' ? window.cancelAnimationFrame.bind(window) : null;

  function isReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* 1. スクロール連動フェードイン（従来動作を維持） */
  function initReveal() {
    var targets = document.querySelectorAll('.card, .rel .tools, .rel .sisters, .fband, .pts');
    if (!targets.length) return;
    if (isReduced() || typeof IntersectionObserver !== 'function') {
      for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        if (entries[j].isIntersecting) {
          entries[j].target.classList.add('is-in');
          io.unobserve(entries[j].target);
        }
      }
    }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });
    for (var k = 0; k < targets.length; k++) {
      var rect = targets[k].getBoundingClientRect();
      if (rect.top < (window.innerHeight || 667) * 0.95) {
        targets[k].classList.add('is-in');
      } else {
        targets[k].classList.add('rv');
        io.observe(targets[k]);
      }
    }
  }

  /* 2. マウスのみの浮き上がり（rotate なし・rAF で間引き・rect キャッシュ） */
  function initLift() {
    if (!RAF) return;
    var cards = document.querySelectorAll('.tl a');
    if (!cards.length) return;
    var gen = 0; // resize / scroll で rect を破棄するための世代番号
    function bump() { gen++; }
    window.addEventListener('resize', bump, { passive: true });
    window.addEventListener('scroll', bump, { passive: true });
    Array.prototype.forEach.call(cards, function (el) {
      var rect = null, rectGen = -1, pending = false, px = 0.5, dark = false;
      function paint() {
        pending = false;
        if (!rect) return;
        var dx = Math.round((px - 0.5) * 10);
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = dx + 'px 10px 24px rgba(' + (dark ? '0,0,0,.45' : '24,28,38,.16') + ')';
      }
      el.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || isReduced()) return;
        rect = el.getBoundingClientRect();
        rectGen = gen;
        dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      });
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || isReduced()) return;
        if (!rect || rectGen !== gen) {
          rect = el.getBoundingClientRect();
          rectGen = gen;
        }
        if (!rect.width) return;
        px = (e.clientX - rect.left) / rect.width;
        if (!pending) {
          pending = true;
          RAF(paint);
        }
      });
      el.addEventListener('pointerleave', function () {
        rect = null;
        el.style.transform = '';
        el.style.boxShadow = '';
      });
    });
  }

  /* 3. スライダー進捗の塗り */
  function syncRanges() {
    var ranges = document.querySelectorAll('input.range');
    for (var i = 0; i < ranges.length; i++) {
      var rg = ranges[i];
      var mn = Number(rg.getAttribute('min')) || 0;
      var mx = rg.hasAttribute('max') ? Number(rg.getAttribute('max')) : 100;
      var v = Number(rg.value) || 0;
      var pct = mx > mn ? Math.min(100, Math.max(0, (v - mn) / (mx - mn) * 100)) : 0;
      rg.style.setProperty('--pct', pct.toFixed(2) + '%');
    }
  }
  function initRanges() {
    if (!document.querySelector('input.range')) return;
    var queued = false;
    function sched() {
      if (queued) return;
      queued = true;
      (RAF || function (f) { return setTimeout(f, 16); })(function () { queued = false; syncRanges(); });
    }
    ['input', 'change', 'click', 'keyup'].forEach(function (t) { document.addEventListener(t, sched, true); });
    syncRanges();
  }

  /* 4. 結果数値のカウントアップ */
  var COUNT_IDS = ['rBig', 'rMonth', 'rWeek', 'netBig', 'freeBig'];
  // 前置き（数字を含まない）＋ 符号 ＋ 数値（カンマ・小数可）＋ 後置き（数字を含まない）
  var NUM_RE = /^([^0-9+−\-]*)([+−\-]?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?([^0-9]*)$/;

  function parseNum(s) {
    var m = NUM_RE.exec(s);
    if (!m) return null;
    var dec = m[4] ? m[4].length : 0;
    var abs = Number(m[3].replace(/,/g, '') + (dec ? '.' + m[4] : ''));
    if (!isFinite(abs)) return null;
    return {
      pre: m[1], sign: m[2], comma: m[3].indexOf(',') >= 0, dec: dec, suf: m[5],
      value: m[2] === '+' || m[2] === '' ? abs : -abs
    };
  }
  function formatNum(p, v) {
    var neg = v < 0;
    var abs = Math.abs(v);
    var f = p.dec ? abs.toFixed(p.dec) : String(Math.round(abs));
    var parts = f.split('.');
    if (p.comma) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var sign = neg ? (p.sign === '-' ? '-' : '−') : (p.sign === '+' ? '+' : '');
    return p.pre + sign + parts.join('.') + p.suf;
  }
  // 数値を持つ末端のテキストノード（<small> など単位の子要素は無視）を返す
  function numericNode(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && parseNum(n.nodeValue)) return n;
    }
    return null;
  }
  function isLeaf(el) {
    for (var i = 0; i < el.children.length; i++) {
      if (el.children[i].tagName !== 'SMALL') return false;
    }
    return true;
  }

  function initCountUp() {
    if (!RAF || !CAF || typeof MutationObserver !== 'function') return;
    COUNT_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !isLeaf(el)) return; // shift-limit の #rBig のようなコンテナは対象外
      var raf = 0;       // この要素の rAF ID
      var disp = null;   // 画面に出している数値
      var fmt = null;    // 直前の表記（前置き・後置き・小数桁）
      var obs;

      function write(node, text) {
        if (node.nodeValue !== text) node.nodeValue = text;
        obs.takeRecords(); // 自分の書き込みは検知しない
      }
      function onChange() {
        if (raf) { CAF(raf); raf = 0; }
        var node = numericNode(el);
        if (!node) { disp = null; return; }
        var finalText = node.nodeValue;            // render が書いた確定値
        var to = parseNum(finalText);
        var fromVal = disp;                        // 補間中に割り込まれたら、表示中の値から続ける
        disp = to ? to.value : null;
        // 前置き・後置き・小数桁が変わる（形式が違う）ときは補間しない
        var okFmt = !!(fmt && to && fmt.pre === to.pre && fmt.suf === to.suf && fmt.dec === to.dec);
        fmt = to;
        if (isReduced() || fromVal === null || !to || fromVal === to.value || !okFmt) return;
        var start = 0, DUR = 220;
        write(node, formatNum(to, fromVal));
        function step(ts) {
          raf = 0;
          if (!node.parentNode) return;
          if (!start) start = ts || 1;
          var q = Math.min(1, ((ts || start) - start) / DUR);
          if (q >= 1) { disp = to.value; write(node, finalText); return; } // 必ず確定値に戻す
          var e = 1 - Math.pow(1 - q, 3);
          disp = fromVal + (to.value - fromVal) * e;
          write(node, formatNum(to, disp));
          raf = RAF(step);
        }
        raf = RAF(step);
      }

      obs = new MutationObserver(onChange);
      var first = numericNode(el);
      var p0 = first ? parseNum(first.nodeValue) : null;
      disp = p0 ? p0.value : null;
      fmt = p0;
      obs.observe(el, { characterData: true, childList: true, subtree: true });
    });
  }

  function init() {
    initReveal();
    initLift();
    initRanges();
    initCountUp();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
