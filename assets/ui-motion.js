/*
 * assets/ui-motion.js — 学生バイトお役立ちツール 共通モーション (v4)
 * 外部ライブラリ不使用。全ページで <script src="...assets/ui-motion.js" defer> として読み込む。
 * 1. スクロール連動フェードイン＆フッター手前ダーク帯のポップバッジ演出（IntersectionObserver）
 * 2. PCマウス操作時の3Dチルト＆浮き上がり（.qjump a 2x2カード・.tl a ツールカード）
 * 3. スライダー進捗の塗り（--pct）
 * 4. 結果数値のカウントアップ（MutationObserver で確定値を検知 → rAF で補間 → 必ず確定値に戻す）
 * 5. トップ（/）の2x2ヒーローカード（バイト・税金）のリアルタイム数値連動
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

  /* 1. スクロール連動フェードイン＆ダーク帯バッジのポップ演出 */
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
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    for (var k = 0; k < targets.length; k++) {
      var el = targets[k];
      var rect = el.getBoundingClientRect();
      var isFband = el.classList.contains('fband');
      if (!isFband && rect.top < (window.innerHeight || 667) * 0.92) {
        el.classList.add('is-in');
      } else {
        el.classList.add('rv');
        io.observe(el);
      }
    }
  }

  /* 2. PCポインター連動の3Dチルト（.qjump a 2x2カード・.tl a ツールカード） */
  function initLift() {
    if (!RAF) return;
    var cards = document.querySelectorAll('.qjump a, .tl a');
    if (!cards.length) return;
    var gen = 0;
    function bump() { gen++; }
    window.addEventListener('resize', bump, { passive: true });
    window.addEventListener('scroll', bump, { passive: true });
    Array.prototype.forEach.call(cards, function (el) {
      var isHero = !!(el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('qjump'));
      var rect = null, rectGen = -1, pending = false, px = 0.5, py = 0.5, dark = false;
      function paint() {
        pending = false;
        if (!rect) return;
        var maxDeg = isHero ? 10 : 5;
        var rx = ((0.5 - py) * maxDeg).toFixed(2);
        var ry = ((px - 0.5) * (maxDeg + 2)).toFixed(2);
        var dx = Math.round((0.5 - px) * 14);
        var dy = Math.round((0.5 - py) * 10) + (isHero ? 18 : 12);
        var lift = isHero ? '-5px' : '-3px';
        var sc = isHero ? ' scale(1.015)' : '';
        el.style.transform = 'perspective(880px) translateY(' + lift + ') rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)' + sc;
        el.style.boxShadow = dx + 'px ' + dy + 'px 34px rgba(' + (dark ? '0,0,0,.5' : '24,20,16,.15') + ')';
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
        if (!rect.width || !rect.height) return;
        px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
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
      if (!el || !isLeaf(el)) return;
      var raf = 0;
      var disp = null;
      var fmt = null;
      var obs;

      function write(node, text) {
        if (node.nodeValue !== text) node.nodeValue = text;
        obs.takeRecords();
      }
      function onChange() {
        if (raf) { CAF(raf); raf = 0; }
        var node = numericNode(el);
        if (!node) { disp = null; return; }
        var finalText = node.nodeValue;
        var to = parseNum(finalText);
        var fromVal = disp;
        disp = to ? to.value : null;
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
          if (q >= 1) { disp = to.value; write(node, finalText); return; }
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

  /* 5. トップ（/）の2x2ヒーローカード（バイト・税金）のリアルタイム数値連動 */
  function initLiveHero() {
    var salInput = document.getElementById('salary');
    var taxCard = document.querySelector('.qjump a[data-cat="tax"]');
    // KABE は index.html の <script id="logic"> で const 宣言（window のプロパティにはならない）
    var KB = (typeof KABE === 'object' && KABE) || window.KABE;
    if (!salInput || !taxCard || !KB || typeof KB.judge !== 'function') return;
    var kEl = taxCard.querySelector('.qk');
    var vEl = taxCard.querySelector('.qv');
    if (!kEl || !vEl) return;
    var defK = kEl.textContent;
    function setV(mainTxt, unitTxt) {
      while (vEl.firstChild) vEl.removeChild(vEl.firstChild);
      vEl.appendChild(document.createTextNode(mainTxt));
      if (unitTxt) {
        var sm = document.createElement('small');
        sm.textContent = unitTxt;
        vEl.appendChild(sm);
      }
    }
    var defV = vEl.firstChild && vEl.firstChild.nodeType === 3 ? vEl.firstChild.nodeValue : 'あと 42';
    var defU = vEl.querySelector('small') ? vEl.querySelector('small').textContent : '万円';
    function reset() { kEl.textContent = defK; setV(defV, defU); }
    // 0.1万円単位。残りは切り捨て（余裕を多く見せない）、超過は切り上げ（超過を小さく見せない）
    function man1(n, up) { var v = (up ? Math.ceil(n / 1000) : Math.floor(n / 1000)) / 10; return String(v); }
    function syncHero() {
      var sal = KB.parseYen(salInput.value);
      if (typeof sal !== 'number' || isNaN(sal)) { reset(); return; }
      var ageEl = document.querySelector('input[name=age]:checked');
      var age = ageEl ? ageEl.value : 'a19_22';
      var comEl = document.getElementById('commute');
      var com = comEl ? KB.parseYen(comEl.value) : 0;
      var r = KB.judge({ ageGroup: age, salary: sal, commute: typeof com === 'number' && !isNaN(com) ? com : 0 });
      if (!r || !r.ok || !r.health) { reset(); return; }
      var limMan = Math.round(r.health.limit / 10000);
      if (r.health.status === 'ok') {
        kEl.textContent = '現在：' + limMan + '万の壁まで';
        if (r.health.remain < 1000) setV('あと 1千円未満', '');
        else setV('あと ' + man1(r.health.remain, false), '万円');
      } else {
        if (r.health.excess > 0) {
          kEl.textContent = '現在：' + limMan + '万の壁を';
          setV('+' + man1(r.health.excess, true), '万円超過');
        } else {
          kEl.textContent = '現在：' + limMan + '万の壁に';
          setV('到達', '');
        }
      }
    }
    ['input', 'change', 'click'].forEach(function (ev) {
      document.addEventListener(ev, function () {
        (RAF || function (f) { setTimeout(f, 16); })(syncHero);
      }, true);
    });
  }

  function init() {
    initReveal();
    initLift();
    initRanges();
    initCountUp();
    initLiveHero();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();