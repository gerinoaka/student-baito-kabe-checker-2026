'use strict';
// 依存ゼロの最小DOMスタブ。HTMLを木に解析し、<script id="ui"> を vm で評価する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ent = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

class Text { constructor(d) { this.nodeType = 3; this.data = d; this.parentNode = null; } get textContent() { return this.data; } }
class Ev {
  constructor(type, o) { this.type = type; this.bubbles = !!(o && o.bubbles); this.defaultPrevented = false; this.target = null; }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this._stop = true; }
}

class El {
  constructor(tag, doc) {
    this.nodeType = 1; this.tagName = String(tag).toUpperCase(); this.ownerDocument = doc;
    this.attrs = {}; this.childNodes = []; this.parentNode = null; this._l = {};
    this._value = null; this._checked = null; this._sel = null;
    this._props = {}; const props = this._props;
    this.style = { setProperty(k, v) { props[k] = v; }, getPropertyValue(k) { return props[k] || ''; }, removeProperty(k) { delete props[k]; } };
    const self = this;
    this.classList = {
      add(...c) { const s = new Set(self._cls()); c.forEach((x) => s.add(x)); self.attrs['class'] = [...s].join(' '); },
      remove(...c) { self.attrs['class'] = self._cls().filter((x) => !c.includes(x)).join(' '); },
      contains(c) { return self._cls().includes(c); },
      toggle(c, f) { const on = f === undefined ? !this.contains(c) : !!f; on ? this.add(c) : this.remove(c); return on; }
    };
  }
  _cls() { return (this.attrs['class'] || '').split(/\s+/).filter(Boolean); }
  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); }
  _bool(k, v) { if (v) this.attrs[k] = ''; else delete this.attrs[k]; }
  get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = String(v); }
  get className() { return this.attrs['class'] || ''; } set className(v) { this.attrs['class'] = String(v); }
  get hidden() { return this.hasAttribute('hidden'); } set hidden(v) { this._bool('hidden', v); }
  get disabled() { return this.hasAttribute('disabled'); } set disabled(v) { this._bool('disabled', v); }
  get open() { return this.hasAttribute('open'); } set open(v) { this._bool('open', v); }
  get type() { return this.attrs.type || (this.tagName === 'INPUT' ? 'text' : this.tagName === 'BUTTON' ? 'submit' : ''); } set type(v) { this.attrs.type = String(v); }
  get name() { return this.attrs.name || ''; } set name(v) { this.attrs.name = String(v); }
  get href() { return this.attrs.href || ''; } set href(v) { this.attrs.href = String(v); }
  get target() { return this.attrs.target || ''; } set target(v) { this.attrs.target = String(v); }
  get rel() { return this.attrs.rel || ''; } set rel(v) { this.attrs.rel = String(v); }
  get defaultValue() { return this.attrs.value || ''; } set defaultValue(v) { this.attrs.value = String(v); }
  get value() {
    if (this.tagName === 'SELECT') { if (this._value !== null) return this._value; const o = this.querySelector('option'); return o ? (o.attrs.value || o.textContent) : ''; }
    if (this.tagName === 'OPTION') return this.attrs.value !== undefined ? this.attrs.value : this.textContent;
    if (this.tagName === 'TEXTAREA') return this._value !== null ? this._value : this.textContent;
    return this._value !== null ? this._value : (this.attrs.value || '');
  }
  set value(v) { this._value = String(v); }
  get checked() { return this._checked !== null ? this._checked : this.hasAttribute('checked'); }
  set checked(v) {
    this._checked = !!v;
    if (v && this.type === 'radio' && this.name) {
      const root = this.ownerDocument.documentElement;
      root.querySelectorAll('input[name=' + this.name + ']').forEach((o) => { if (o !== this) o._checked = false; });
    }
  }
  get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
  set textContent(v) { this.childNodes.forEach((n) => { n.parentNode = null; }); this.childNodes = []; if (v !== '' && v !== null && v !== undefined) this.appendChild(new Text(String(v))); }
  appendChild(n) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.push(n); return n; }
  insertBefore(n, ref) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; const i = this.childNodes.indexOf(ref); if (i < 0) this.childNodes.push(n); else this.childNodes.splice(i, 0, n); return n; }
  removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); n.parentNode = null; return n; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  contains(n) { while (n) { if (n === this) return true; n = n.parentNode; } return false; }
  closest(sel) { let e = this; while (e && e.nodeType === 1) { if (matches(e, sel)) return e; e = e.parentNode; } return null; }
  querySelectorAll(sel) { const out = []; walk(this, (e) => { if (e !== this && matchesAny(e, sel)) out.push(e); }); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); }
  removeEventListener(t, f) { this._l[t] = (this._l[t] || []).filter((x) => x !== f); }
  dispatchEvent(ev) {
    if (!ev.target) ev.target = this;
    let n = this;
    while (n) {
      ev.currentTarget = n;
      (n._l && n._l[ev.type] || []).slice().forEach((f) => f.call(n, ev));
      if (ev._stop || !ev.bubbles) break;
      n = n.parentNode || (n === this.ownerDocument.documentElement ? this.ownerDocument : null);
    }
    return !ev.defaultPrevented;
  }
  focus() { this.ownerDocument._calls.focus.push(this.id); this.ownerDocument.activeElement = this; }
  blur() {}
  scrollIntoView(o) { this.ownerDocument._calls.scroll.push({ id: this.id, o }); }
  getBoundingClientRect() { return this.ownerDocument._rect(this); }
  reset() {
    const f = new Ev('reset', { bubbles: true }); this.dispatchEvent(f);
    this.querySelectorAll('input,select,textarea').forEach((e) => { e._value = null; e._checked = null; });
  }
}
function walk(n, fn) { fn(n); (n.childNodes || []).forEach((c) => { if (c.nodeType === 1) walk(c, fn); }); }

// ---- セレクタ（tag, #id, .class, [attr], [attr=v], :checked, 子孫 ' ', 子 '>', カンマ）
function parseCompound(s) {
  const c = { tag: null, id: null, cls: [], attrs: [], checked: false };
  const re = /^([a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:=("[^"]*"|'[^']*'|[^\]]*))?\]|:(checked)/y;
  let m; re.lastIndex = 0;
  while (re.lastIndex < s.length && (m = re.exec(s))) {
    if (m[1]) c.tag = m[1].toUpperCase(); else if (m[2]) c.id = m[2]; else if (m[3]) c.cls.push(m[3]);
    else if (m[4]) c.attrs.push([m[4], m[5] === undefined ? null : m[5].replace(/^["']|["']$/g, '')]); else if (m[6]) c.checked = true;
  }
  return c;
}
function mc(e, c) {
  if (c.tag && e.tagName !== c.tag) return false;
  if (c.id && e.id !== c.id) return false;
  if (c.cls.some((x) => !e._cls().includes(x))) return false;
  if (c.attrs.some(([k, v]) => (v === null ? !e.hasAttribute(k) : e.getAttribute(k) !== v))) return false;
  if (c.checked && !e.checked) return false;
  return true;
}
function matches(e, sel) {
  const parts = sel.trim().replace(/\s*>\s*/g, ' > ').split(/\s+/);
  const toks = []; let child = false;
  parts.forEach((p) => { if (p === '>') child = true; else { toks.push({ c: parseCompound(p), child }); child = false; } });
  let i = toks.length - 1, el = e;
  if (!mc(el, toks[i].c)) return false;
  while (i > 0) {
    const direct = toks[i].child; i--;
    let p = el.parentNode;
    if (direct) { if (!p || p.nodeType !== 1 || !mc(p, toks[i].c)) return false; el = p; }
    else { while (p && p.nodeType === 1 && !mc(p, toks[i].c)) p = p.parentNode; if (!p || p.nodeType !== 1) return false; el = p; }
  }
  return true;
}
function matchesAny(e, sel) { return sel.split(',').some((s) => matches(e, s)); }

// ---- HTML 解析
function parseHTML(html, doc) {
  const root = new El('html', doc); let cur = root;
  const re = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|([^<]+)|</g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) { const t = m[1].toUpperCase(); let n = cur; while (n && n !== root && n.tagName !== t) n = n.parentNode; if (n && n !== root) cur = n.parentNode; }
    else if (m[2]) {
      const e = new El(m[2], doc);
      const ar = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g; let a;
      while ((a = ar.exec(m[3]))) e.attrs[a[1]] = ent(a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '');
      cur.appendChild(e);
      const tag = m[2].toLowerCase();
      if (tag === 'script' || tag === 'style') {
        const end = html.indexOf('</' + tag + '>', re.lastIndex);
        e.appendChild(new Text(html.slice(re.lastIndex, end))); re.lastIndex = end + tag.length + 3;
      } else if (!VOID.has(tag)) cur = e;
    } else if (m[4] !== undefined) cur.appendChild(new Text(ent(m[4])));
  }
  return root;
}

function load(file, opt) {
  opt = opt || {};
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const doc = { _calls: { focus: [], scroll: [] }, _rect: () => ({ top: 0, bottom: 0, left: 0, right: 0 }), _l: {} };
  doc.documentElement = parseHTML(html, doc);
  doc.nodeType = 9;
  doc.getElementById = (id) => { let r = null; walk(doc.documentElement, (e) => { if (!r && e.id === id) r = e; }); return r; };
  doc.querySelector = (s) => doc.documentElement.querySelector(s);
  doc.querySelectorAll = (s) => doc.documentElement.querySelectorAll(s);
  doc.createElement = (t) => new El(t, doc);
  doc.createTextNode = (t) => new Text(t);
  doc.addEventListener = (t, f) => { (doc._l[t] = doc._l[t] || []).push(f); };
  doc.dispatchEvent = (ev) => { (doc._l[ev.type] || []).forEach((f) => f(ev)); };
  // タイマー
  let now = 0, seq = 0, timers = [];
  const ctx = {};
  ctx.setTimeout = (fn, ms) => { const id = ++seq; timers.push({ id, at: now + (ms || 0), fn }); return id; };
  ctx.clearTimeout = (id) => { timers = timers.filter((t) => t.id !== id); };
  ctx.requestAnimationFrame = (fn) => { fn(0); return 1; };
  const D = class extends Date { constructor(...a) { if (a.length) super(...a); else super(opt.date || '2026-11-17T12:00:00'); } static now() { return new D().getTime(); } };
  ctx.Date = D;
  ctx.window = ctx; ctx.document = doc; ctx.console = console;
  ctx.innerHeight = 667;
  ctx.location = { hash: '' };
  ctx.matchMedia = () => ({ matches: false });
  const wl = {}; ctx.addEventListener = (t, f) => { (wl[t] = wl[t] || []).push(f); };
  ctx.Event = Ev;
  vm.createContext(ctx);
  const sc = (id) => { let r = null; walk(doc.documentElement, (e) => { if (e.tagName === 'SCRIPT' && e.id === id) r = e; }); return r; };
  vm.runInContext(fs.readFileSync(path.join(root, 'links-config.js'), 'utf8'), ctx);
  if (opt.links) ctx.KABE_LINKS = opt.links;
  vm.runInContext(sc('logic').textContent, ctx);
  vm.runInContext(sc('ui').textContent, ctx);
  const api = {
    ctx, doc, $: (id) => doc.getElementById(id), calls: doc._calls, Ev,
    fire(el, type, bubbles) { const e = new Ev(type, { bubbles: bubbles !== false }); el.dispatchEvent(e); return e; },
    type(el, v) { el.value = v; api.fire(el, 'input'); },
    blur(el) { api.fire(el, 'blur', false); },
    click(el) {
      if (el.disabled) return;
      const e = api.fire(el, 'click');
      if (e.defaultPrevented) return;
      if (el.tagName === 'INPUT' && el.type === 'radio') { if (!el.checked) { el.checked = true; api.fire(el, 'input'); api.fire(el, 'change'); } }
      else if (el.tagName === 'INPUT' && el.type === 'checkbox') { el.checked = !el.checked; api.fire(el, 'input'); api.fire(el, 'change'); }
      else if (el.tagName === 'BUTTON' && el.type === 'submit') { const f = el.closest('form'); if (f) api.fire(f, 'submit'); }
    },
    submit() { return api.fire(api.$('f'), 'submit'); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!due) break;
        timers = timers.filter((t) => t !== due); now = due.at; due.fn();
      }
      now = end;
    },
    pendingTimers() { return timers.length; },
    K: (n) => vm.runInContext(n, ctx)
  };
  return api;
}
module.exports = { load, parseHTML, El, Text, walk, matchesAny };
