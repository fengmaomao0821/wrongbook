/* =========================================================
   错题本 · 前端逻辑（原生 JS，无构建）
   分区：
     0. 常量与工具
     1. 全局状态 / 壳层 / 路由
     2. 全局组件（Toast / 确认框 / 图片查看器）
     3. 今日复习
     4. 复习模式
     5. 拍照录入
     6. 校对 / 编辑
     7. 错题本
     8. 错题详情
     9. 统计
    10. 设置
    11. 启动
   ========================================================= */
'use strict';

/* ======================= 0. 常量与工具 ======================= */

const CAUSE_LABELS = {
  concept: '概念不清', reading: '审题不清', calculation: '计算失误', method: '方法不当',
  expression: '表达不规范', memory: '知识点遗忘', careless: '粗心', other: '其他'
};
const TYPE_LABELS = {
  choice: '选择题', blank: '填空题', judge: '判断题', solve: '解答题',
  calc: '计算题', essay: '作文', experiment: '实验题', other: '其他'
};
const STATUS_LABELS = { new: '待复习', reviewing: '复习中', mastered: '已掌握' };
const REVIEW_RESULT_LABELS = { correct: '答对', wrong: '答错', postpone: '顺延', master: '标记已掌握' };
const GRADES = ['小学', '初中', '高中', '大学'];
const SUBJECT_COLORS = [
  '#2f6fed', '#e05252', '#7c3aed', '#0891b2', '#16a34a',
  '#65a30d', '#b45309', '#0d9488', '#be123c', '#6b7280'
];
const AI_PRESETS = [
  { key: 'dashscope', name: '阿里百炼（推荐，手机可直连）', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen3-vl-plus' },
  { key: 'zhipu', name: '智谱 GLM（手机版直连会被拦）', base_url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4v-flash' },
  { key: 'ark', name: '火山方舟（手机版直连会被拦）', base_url: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-1-5-vision-pro-32k-250115' },
  { key: 'openai', name: 'OpenAI 兼容', base_url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { key: 'ollama', name: 'Ollama（本地，仅电脑版）', base_url: 'http://127.0.0.1:11434/v1', model: 'qwen2.5vl:7b' }
];
const WB_LOCAL = !!window.WB_LOCAL;
const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const ICONS = {
  today: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>',
  camera: '<path d="M4 8.5h2.6l1.5-2.4h7.8l1.5 2.4H20a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.4" r="3.4"/>',
  notebook: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5v-15Z"/><path d="M9 3v18"/><path d="M13 8h4M13 12h4"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.4"/><circle cx="8" cy="17" r="2.4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  arrowRight: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  more: '<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17.5v.1"/>',
  wifiOff: '<path d="m2 2 20 20"/><path d="M8.5 8.7A8 8 0 0 1 21 10M3 10a8 8 0 0 1 3.2-1.9M6.6 13.6a8 8 0 0 1 3.1-1.2M10 17.3a3 3 0 0 1 4.2.3"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 16-5-5-9 9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9L6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  sparkles: '<path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6.5 6.5l2.5 2.5M18.5 17.5 16 15M17.5 6.5 15 9M8.5 17.5 6 20"/><circle cx="12" cy="12" r="3"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z"/><path d="M8 7h8M8 11h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  shield: '<path d="M12 3 5 6v6c0 4.2 3 7.5 7 9 4-1.5 7-4.8 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>'
};

/** HTML 转义（所有用户内容必须经过它） */
function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function icon(name, extraClass) {
  const body = ICONS[name] || '';
  return '<svg' + (extraClass ? ' class="' + esc(extraClass) + '"' : '') +
    ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
}

function starIcon() {
  return '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">' + ICONS.star + '</svg>';
}

/** 富文本：转义 + 换行 + 可选 KaTeX（加载失败降级为纯文本） */
function rich(text) {
  const src = String(text === null || text === undefined ? '' : text);
  if (!src) return '';
  const parts = [];
  const re = /\$([^$\n]{1,400})\$/g;
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) parts.push({ t: 'text', v: src.slice(last, m.index) });
    parts.push({ t: 'math', v: m[1] });
    last = re.lastIndex;
  }
  if (last < src.length) parts.push({ t: 'text', v: src.slice(last) });
  return parts.map(function (p) {
    if (p.t === 'text') return esc(p.v).replace(/\n/g, '<br>');
    if (window.katex && typeof window.katex.renderToString === 'function') {
      try {
        return window.katex.renderToString(p.v, { throwOnError: false, trust: false, strict: 'ignore', displayMode: false });
      } catch (e) { /* 降级 */ }
    }
    return esc('$' + p.v + '$');
  }).join('');
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function parseDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function dayDiff(a, b) {
  if (!a || !b) return 0;
  return Math.round((startOfDay(a) - startOfDay(b)) / 86400000);
}
function todayStr() { return ymd(new Date()); }
function fmtDateCN(s) {
  const d = parseDate(s);
  return d ? (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK_CN[d.getDay()] : '';
}
function fmtMMDD(s) {
  const d = parseDate(s);
  return d ? pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) : '';
}
function fmtDateShort(s) {
  const d = parseDate(s);
  return d ? (d.getMonth() + 1) + '月' + d.getDate() + '日' : '';
}
function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return fmtMMDD(iso) || '';
  const diff = dayDiff(d, new Date());
  const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  if (diff === 0) return hm;
  if (diff === 1) return '昨天';
  return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = dayDiff(d, new Date());
  const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  if (diff === 0) return '今天 ' + hm;
  if (diff === 1) return '昨天 ' + hm;
  return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + hm;
}
function fmtDueShort(s) {
  if (!s) return '';
  const diff = dayDiff(parseDate(s), new Date());
  if (diff < 0) return '今天';
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff < 7) return diff + ' 天后';
  return fmtMMDD(s);
}
function dueInfo(s) {
  const d = parseDate(s);
  if (!d) return { text: '', overdue: false };
  const diff = dayDiff(d, new Date());
  if (diff < 0) return { text: '逾期 ' + (-diff) + ' 天', overdue: true };
  if (diff === 0) return { text: '今天到期', overdue: false, today: true };
  return { text: '下次复习 ' + fmtMMDD(s), overdue: false };
}
function pct(v) {
  const n = Number(v);
  if (!isFinite(n)) return '0%';
  return Math.round(n * 100) + '%';
}
function statusBadge(s) {
  const key = s || 'new';
  return '<span class="badge ' + esc(key) + '">' + esc(STATUS_LABELS[key] || key) + '</span>';
}
function causeLabel(c) { return CAUSE_LABELS[c] || c || ''; }
function typeLabel(t) { return TYPE_LABELS[t] || t || ''; }
function normalizeImages(images) {
  return (images || []).filter(Boolean).map(function (im) {
    if (typeof im === 'string') return { url: im, thumb_url: im };
    return im;
  });
}
function thumbOf(im) { return im.thumb_url || im.url || ''; }

/* ======================= 1. 状态 / 壳层 / 路由 ======================= */

const app = document.getElementById('app');
const appbar = document.getElementById('appbar');
const tabbar = document.getElementById('tabbar');
const main = document.getElementById('main');
const toastWrap = document.getElementById('toast-wrap');
const overlayRoot = document.getElementById('overlay-root');

const state = {
  boot: null,
  bootError: null,
  path: '/today',
  route: 'today',
  params: {},
  args: {},
  lastHash: location.hash || '#/today',
  prevHash: null,
  guard: null,
  today: null,
  review: null,
  draft: null,
  capture: null,
  settings: null,
  notebook: {
    subjectId: '', status: '', cause: '', sort: 'created_desc', q: '',
    items: [], total: 0, offset: 0, loading: false, hasMore: true,
    searchOpen: false, loaded: false
  },
  statsRange: '30',
  statsSubject: ''
};

let pageSeq = 0;
let appbarHandlers = {};
let cleanups = [];

const TABS = [
  { id: 'today', label: '今日复习', hash: '#/today', icon: 'today' },
  { id: 'capture', label: '录入', hash: '#/capture', icon: 'camera' },
  { id: 'notebook', label: '错题本', hash: '#/notebook', icon: 'notebook' },
  { id: 'stats', label: '统计', hash: '#/stats', icon: 'stats' },
  { id: 'settings', label: '设置', hash: '#/settings', icon: 'settings' }
];

const ROUTES = [
  { re: /^\/today\/?$/, tab: 'today', render: renderToday },
  { re: /^\/capture\/?$/, tab: 'capture', render: renderCapture },
  { re: /^\/notebook\/?$/, tab: 'notebook', render: renderNotebook },
  { re: /^\/stats\/?$/, tab: 'stats', render: renderStats },
  { re: /^\/settings\/?$/, tab: 'settings', render: renderSettings },
  { re: /^\/question\/(\d+)\/?$/, tab: 'notebook', keys: ['id'], render: renderQuestion },
  { re: /^\/edit\/([A-Za-z0-9_-]+)\/?$/, tab: 'notebook', keys: ['id'], hideTab: true, render: renderEdit },
  { re: /^\/review\/?$/, tab: 'today', hideTab: true, render: renderReview }
];

function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function addCleanup(fn) { cleanups.push(fn); }

function renderTabbar() {
  tabbar.innerHTML = TABS.map(function (t) {
    if (t.id === 'capture') {
      return '<a class="tab tab-capture" href="' + t.hash + '" data-tab="capture" aria-label="录入">' +
        '<span class="tab-icon">' + icon('camera') + '</span>' +
        '<span class="tab-label">' + esc(t.label) + '</span></a>';
    }
    return '<a class="tab" href="' + t.hash + '" data-tab="' + t.id + '">' + icon(t.icon) +
      '<span>' + esc(t.label) + '</span></a>';
  }).join('');
  tabbar.addEventListener('click', function (e) {
    const a = e.target.closest('a.tab');
    if (!a) return;
    if (state.review && state.review.running && !state.review.finished) return; // 交给 guard
  });
}

function updateActiveTab(id) {
  $$('.tab', tabbar).forEach(function (a) {
    a.classList.toggle('active', a.dataset.tab === id);
  });
}

function setTabbarVisible(visible) {
  tabbar.hidden = !visible;
}

function setAppbar(cfg) {
  cfg = cfg || {};
  appbar.hidden = false;
  appbarHandlers = {};
  let left = '';
  if (cfg.left !== undefined) left = cfg.left;
  else if (cfg.back) left = '<button class="icon-btn" data-appbar-act="back" aria-label="返回">' + icon('chevronLeft') + '</button>';
  const titleHTML = '<div class="appbar-title' + (cfg.center ? ' center' : '') + '">' +
    (cfg.titleHTML || esc(cfg.title || '')) + (cfg.subHTML || '') + '</div>';
  appbar.innerHTML = '<div class="appbar-left">' + left + '</div>' + titleHTML +
    '<div class="appbar-right">' + (cfg.rightHTML || '') + '</div>';
  Object.assign(appbarHandlers, cfg.handlers || {});
  if (cfg.back && !appbarHandlers.back) {
    appbarHandlers.back = function () { goBack(cfg.backFallback || '#/notebook'); };
  }
}

appbar.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-appbar-act]');
  if (!btn) return;
  const fn = appbarHandlers[btn.dataset.appbarAct];
  if (typeof fn === 'function') fn(btn, e);
});

main.addEventListener('scroll', function () {
  appbar.classList.toggle('scrolled', main.scrollTop > 2);
}, { passive: true });

function renderPage(html, opts) {
  opts = opts || {};
  let cls = 'main';
  if (opts.noTabbar) cls += ' no-tabbar';
  if (opts.actionbar) cls += ' with-actionbar' + (opts.single ? ' single' : '');
  main.className = cls;
  main.innerHTML = '<div class="page">' + html + '</div>';
  if (opts.keepScroll !== true) main.scrollTop = 0;
}

function setActionbar(html) {
  let bar = document.getElementById('actionbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'actionbar';
    bar.className = 'actionbar';
    app.insertBefore(bar, tabbar);
  }
  bar.hidden = false;
  bar.innerHTML = html;
  return bar;
}
function hideActionbar() {
  const bar = document.getElementById('actionbar');
  if (bar) bar.remove();
}

function cleanupPage() {
  cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
  cleanups = [];
  hideActionbar();
  state.guard = null;
}

function skeletonCards(n, h) {
  let out = '<div class="skel" style="height:132px;border-radius:14px;margin-bottom:20px"></div>';
  for (let i = 0; i < (n || 3); i++) {
    out += '<div class="skel" style="height:' + (h || 96) + 'px;border-radius:14px;margin-bottom:10px"></div>';
  }
  return out;
}

function showPageError(err, retry) {
  const offline = err && err.offline;
  const msg = (err && err.message) || '加载失败，请稍后重试';
  const bar = document.getElementById('actionbar');
  if (bar) bar.remove();
  renderPage(
    '<div class="page-error">' +
      '<div class="err-icon">' + icon(offline ? 'wifiOff' : 'alert') + '</div>' +
      '<h3>' + (offline ? '无法连接服务' : '加载失败') + '</h3>' +
      '<p>' + esc(offline ? '无法连接服务，请确认电脑上的服务已启动，然后重试' : msg) + '</p>' +
      '<button class="btn primary block" id="btnPageRetry">' + icon('refresh') + '重试</button>' +
    '</div>',
    { noTabbar: tabbar.hidden }
  );
  const btn = $('#btnPageRetry');
  if (btn) btn.addEventListener('click', function () { if (retry) retry(); else route(); });
}

function parseHash() {
  let raw = (location.hash || '').replace(/^#/, '');
  if (!raw) raw = '/today';
  const qi = raw.indexOf('?');
  const path = qi >= 0 ? raw.slice(0, qi) : raw;
  const qs = qi >= 0 ? raw.slice(qi + 1) : '';
  const params = {};
  try {
    new URLSearchParams(qs).forEach(function (v, k) { params[k] = v; });
  } catch (e) { /* ignore */ }
  return { path: path, params: params };
}

function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function goBack(fallback) {
  if (state.prevHash && state.prevHash !== location.hash) location.hash = state.prevHash;
  else location.hash = fallback || '#/today';
}

async function route() {
  const parsed = parseHash();
  let def = null;
  let match = null;
  for (let i = 0; i < ROUTES.length; i++) {
    const m = parsed.path.match(ROUTES[i].re);
    if (m) { def = ROUTES[i]; match = m; break; }
  }
  if (!def) { location.replace('#/today'); return; }

  const args = {};
  (def.keys || []).forEach(function (k, i) {
    try { args[k] = decodeURIComponent(match[i + 1] || ''); } catch (e) { args[k] = match[i + 1] || ''; }
  });

  cleanupPage();
  clearOverlays();
  state.path = parsed.path;
  state.params = parsed.params;
  state.args = args;
  state.route = def.tab;
  setTabbarVisible(!def.hideTab);
  updateActiveTab(def.tab);
  appbar.classList.remove('scrolled');
  main.scrollTop = 0;
  main.className = 'main';
  const seq = ++pageSeq;
  try {
    await def.render(seq);
  } catch (err) {
    if (seq !== pageSeq) return;
    console.error(err);
    showPageError(err, function () { route(); });
  }
}

let allowHash = null;
window.addEventListener('hashchange', function () {
  const target = location.hash || '#/today';
  if (allowHash === target) {
    allowHash = null;
    state.prevHash = state.lastHash;
    state.lastHash = target;
    route();
    return;
  }
  if (state.guard) {
    const oldHash = state.lastHash || '#/today';
    const guardFn = state.guard;
    state.guard = null;
    try { history.replaceState(null, '', oldHash); } catch (e) { location.hash = oldHash; }
    Promise.resolve().then(guardFn).then(function (ok) {
      if (ok) {
        state.guard = null;
        allowHash = target;
        location.hash = target;
      } else {
        state.guard = guardFn;
      }
    });
    return;
  }
  state.prevHash = state.lastHash;
  state.lastHash = target;
  route();
});

/* ======================= 2. 全局组件 ======================= */

function toast(msg, type, ms) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = String(msg || '');
  toastWrap.appendChild(t);
  setTimeout(function () {
    t.classList.add('leaving');
    setTimeout(function () { t.remove(); }, 200);
  }, ms || 2000);
}

function clearOverlays() {
  overlayRoot.innerHTML = '';
}

function openOverlay(html, opts) {
  opts = opts || {};
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  wrap.innerHTML = html;
  overlayRoot.appendChild(wrap);
  const api = {
    wrap: wrap,
    close: function () {
      wrap.remove();
      if (opts.onClose) opts.onClose();
    }
  };
  wrap.addEventListener('click', function (e) {
    if (e.target === wrap && opts.onBackdrop) opts.onBackdrop();
  });
  if (opts.onMount) opts.onMount(api);
  return api;
}

function confirmDialog(opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    let done = false;
    let api = null;
    const finish = function (v) {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      if (api) api.close();
      resolve(v);
    };
    const onKey = function (e) {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') finish(true);
    };
    api = openOverlay(
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<h3>' + esc(opts.title || '确认操作') + '</h3>' +
        '<p>' + esc(opts.message || '') + '</p>' +
        '<div class="modal-actions">' +
          '<button class="btn ghost" data-act="cancel">' + esc(opts.cancelText || '取消') + '</button>' +
          '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-act="ok">' + esc(opts.okText || '确定') + '</button>' +
        '</div>' +
      '</div>',
      {
        onBackdrop: function () { finish(false); },
        onClose: function () { done = true; document.removeEventListener('keydown', onKey); },
        onMount: function (a) {
          a.wrap.querySelector('[data-act="cancel"]').addEventListener('click', function () { finish(false); });
          a.wrap.querySelector('[data-act="ok"]').addEventListener('click', function () { finish(true); });
        }
      }
    );
    document.addEventListener('keydown', onKey);
  });
}

function promptDialog(opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    let done = false;
    let api = null;
    const finish = function (v) {
      if (done) return;
      done = true;
      if (api) api.close();
      resolve(v);
    };
    api = openOverlay(
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<h3>' + esc(opts.title || '请输入') + '</h3>' +
        (opts.label ? '<p>' + esc(opts.label) + '</p>' : '') +
        '<input class="input" id="promptInput" maxlength="' + (opts.maxlength || 40) + '" ' +
          'value="' + esc(opts.value || '') + '" placeholder="' + esc(opts.placeholder || '') + '">' +
        '<div class="modal-actions">' +
          '<button class="btn ghost" data-act="cancel">取消</button>' +
          '<button class="btn primary" data-act="ok">' + esc(opts.okText || '保存') + '</button>' +
        '</div>' +
      '</div>',
      {
        onBackdrop: function () { finish(null); },
        onMount: function (a) {
          const input = a.wrap.querySelector('#promptInput');
          setTimeout(function () { input.focus(); input.select(); }, 40);
          a.wrap.querySelector('[data-act="cancel"]').addEventListener('click', function () { finish(null); });
          a.wrap.querySelector('[data-act="ok"]').addEventListener('click', function () {
            finish(input.value.trim() || null);
          });
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); finish(input.value.trim() || null); }
            if (e.key === 'Escape') finish(null);
          });
        }
      }
    );
  });
}

/** 全屏图片查看器（左右切换、点空白关闭） */
function openViewer(images, startIndex) {
  const list = normalizeImages(images);
  if (!list.length) return;
  let idx = Math.max(0, Math.min(Number(startIndex) || 0, list.length - 1));
  const multi = list.length > 1;
  let closed = false;
  let api = null;
  const close = function () { if (!closed) { closed = true; document.removeEventListener('keydown', onKey); if (api) api.close(); } };
  const onKey = function (e) {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  };
  function go(step) {
    const next = idx + step;
    if (next < 0 || next >= list.length) return;
    idx = next;
    paint();
  }
  function paint() {
    if (!api) return;
    const img = api.wrap.querySelector('.viewer-body img');
    const count = api.wrap.querySelector('.viewer-count');
    img.src = list[idx].url || thumbOf(list[idx]) || '';
    img.alt = '原题图片 ' + (idx + 1);
    count.textContent = (idx + 1) + ' / ' + list.length;
    const prev = api.wrap.querySelector('[data-act="prev"]');
    const next = api.wrap.querySelector('[data-act="next"]');
    if (prev) prev.disabled = idx <= 0;
    if (next) next.disabled = idx >= list.length - 1;
  }
  api = openOverlay(
    '<div class="viewer" role="dialog" aria-modal="true">' +
      '<div class="viewer-top">' +
        '<span class="viewer-count"></span>' +
        '<button class="icon-btn" data-act="close" aria-label="关闭">' + icon('x') + '</button>' +
      '</div>' +
      '<div class="viewer-body">' +
        (multi ? '<button class="viewer-nav prev" data-act="prev" aria-label="上一张">' + icon('chevronLeft') + '</button>' : '') +
        '<img alt="原题图片">' +
        (multi ? '<button class="viewer-nav next" data-act="next" aria-label="下一张">' + icon('chevronRight') + '</button>' : '') +
      '</div>' +
    '</div>',
    {
      onBackdrop: close,
      onClose: function () { closed = true; document.removeEventListener('keydown', onKey); },
      onMount: function (a) {
        paint();
        a.wrap.querySelector('[data-act="close"]').addEventListener('click', close);
        const prev = a.wrap.querySelector('[data-act="prev"]');
        const next = a.wrap.querySelector('[data-act="next"]');
        if (prev) prev.addEventListener('click', function () { go(-1); });
        if (next) next.addEventListener('click', function () { go(1); });
        a.wrap.querySelector('.viewer-body').addEventListener('click', function (e) {
          if (e.target.classList.contains('viewer-body') || e.target.classList.contains('viewer')) close();
        });
      }
    }
  );
  // onMount 执行时 api 还没赋值，paint 会提前返回；这里补一次渲染
  paint();
  document.addEventListener('keydown', onKey);
}

/** 图片条：绑定点击放大 */
function bindViewerThumbs(images, selector, root) {
  const list = normalizeImages(images);
  if (!list.length) return;
  $$(selector || '[data-img-idx]', root || main).forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openViewer(list, Number(el.dataset.imgIdx || 0));
    });
  });
}

function emptyIllustration(kind) {
  const common = 'viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  if (kind === 'search') {
    return '<svg ' + common + '><circle cx="54" cy="52" r="26"/><path d="m74 72 16 16"/><path d="M44 52h20M54 42v20"/></svg>';
  }
  if (kind === 'notebook') {
    return '<svg ' + common + '><rect x="26" y="18" width="66" height="84" rx="6"/><path d="M26 34h66M40 48h28M40 60h20"/><circle cx="78" cy="82" r="12" fill="currentColor" stroke="none" opacity=".18"/><path d="m72 82 4 4 8-8"/></svg>';
  }
  if (kind === 'stats') {
    return '<svg ' + common + '><path d="M26 96h68"/><rect x="32" y="64" width="12" height="26" rx="2"/><rect x="54" y="46" width="12" height="44" rx="2"/><rect x="76" y="56" width="12" height="34" rx="2"/><path d="M32 38c10-10 22-12 30-6s16 4 24-4"/></svg>';
  }
  return '<svg ' + common + '><rect x="26" y="24" width="68" height="76" rx="8"/><path d="M26 42h68M42 58h24M42 72h36"/><circle cx="80" cy="86" r="14" fill="currentColor" stroke="none" opacity=".16"/><path d="m74 86 4 4 8-8"/></svg>';
}

function emptyState(kind, title, desc, btnText, btnAction) {
  const btn = btnText ? '<button class="btn primary" id="emptyAction">' + esc(btnText) + '</button>' : '';
  return '<div class="empty">' + emptyIllustration(kind) +
    '<h3>' + esc(title) + '</h3>' +
    (desc ? '<p>' + esc(desc) + '</p>' : '') + btn + '</div>';
}

function bindEmptyAction(fn) {
  const btn = $('#emptyAction');
  if (btn) btn.addEventListener('click', fn);
}

/* ======================= 3. 今日复习 ======================= */

async function renderToday(seq) {
  setAppbar({
    title: '今日复习',
    rightHTML: '<span class="appbar-sub" id="todayDateLabel"></span>'
  });
  renderPage(skeletonCards(3, 92));
  let data;
  try {
    data = await api('/api/today');
  } catch (err) {
    if (seq !== pageSeq) return;
    showPageError(err, function () { route(); });
    return;
  }
  if (seq !== pageSeq) return;
  state.today = data;
  const label = $('#todayDateLabel');
  if (label) label.textContent = fmtDateShort(data.date);
  renderPage(todayHTML(data));
  bindToday(data);
}

function todayHTML(data) {
  const items = data.items || [];
  const boot = state.boot || {};
  const bt = boot.today || {};
  const due = items.length;
  const overdue = items.filter(function (i) { return Number(i.overdue_days) > 0; }).length;
  const reviewed = Number(bt.reviewed_today || 0);
  const mastered = Number(bt.mastered_today || 0);
  const dateStr = data.date || todayStr();

  let hero = '<section class="hero">' +
    '<div class="hero-date">' + esc(fmtDateCN(dateStr)) + '</div>' +
    '<div class="hero-main"><span class="hero-num">' + due + '</span><span class="hero-unit">题待复习</span></div>' +
    '<div class="hero-chips">' +
      '<span class="hero-chip">逾期 ' + overdue + ' 题</span>' +
      '<span class="hero-chip">今日已复习 ' + reviewed + ' 题</span>' +
      (mastered > 0 ? '<span class="hero-chip">今日掌握 ' + mastered + ' 题</span>' : '') +
    '</div>' +
    (due === 0
      ? '<div class="hero-empty">今天没有要复习的题，去录入一道新错题吧</div>'
      : '<button class="btn hero-btn block" id="btnStartReview">开始复习</button>') +
  '</section>';

  if (!items.length) {
    return hero +
      '<h2 class="section-title">待复习 <span class="count">0 道</span></h2>' +
      emptyState('today', '今天没有要复习的错题', '可以先拍一张新错题，或去错题本看看', '去录入错题', null);
  }

  const list = items.map(function (it) {
    const overdueDays = Number(it.overdue_days || 0);
    const dueLabel = overdueDays > 0 ? '逾期 ' + overdueDays + ' 天' : '今天到期';
    return '<a class="qcard" href="#/question/' + it.id + '">' +
      '<div class="qcard-head">' +
        '<span class="dot" style="background:' + esc(it.subject_color || '#6b7280') + '"></span>' +
        '<span class="qcard-subject">' + esc(it.subject_name || '') + '</span>' +
        '<span class="qcard-due' + (overdueDays > 0 ? '' : ' today') + '">' + esc(dueLabel) + '</span>' +
      '</div>' +
      '<div class="qcard-stem">' + esc(it.stem_preview || '') + '</div>' +
      '<div class="qcard-foot">' + statusBadge(it.status) +
        (Number(it.lapses) > 0 ? '<span>错过 ' + it.lapses + ' 次</span>' : '') +
      '</div>' +
      '<span class="qcard-arrow">' + icon('arrowRight') + '</span>' +
    '</a>';
  }).join('');

  return hero +
    '<h2 class="section-title">待复习 <span class="count">' + due + ' 道</span></h2>' +
    '<div>' + list + '</div>' +
    (reviewed > 0 ? '<div class="reviewed-tip">' + icon('check') + '<span>今天已复习 ' + reviewed + ' 题，继续保持</span></div>' : '');
}

function bindToday(data) {
  const btn = $('#btnStartReview');
  if (btn && !btn.disabled) {
    btn.addEventListener('click', function () { navigate('#/review'); });
  }
  bindEmptyAction(function () { navigate('#/capture'); });
}

/* ======================= 4. 复习模式 ======================= */

async function renderReview(seq) {
  setTabbarVisible(false);
  setAppbar({
    left: '<button class="icon-btn" data-appbar-act="exit" aria-label="退出复习">' + icon('x') + '</button>',
    title: '复习',
    rightHTML: '<span class="review-progress-num" id="reviewProgress"></span>',
    handlers: { exit: function () { navigate('#/today'); } }
  });
  renderPage('<div class="loading-block"><div class="spinner"></div>加载今日复习…</div>', { noTabbar: true, actionbar: true, single: true });

  let data;
  try {
    data = await api('/api/today');
  } catch (err) {
    if (seq !== pageSeq) return;
    showPageError(err, function () { route(); });
    return;
  }
  if (seq !== pageSeq) return;

  const items = data.items || [];
  if (!items.length) {
    setAppbar({ title: '复习', left: '<button class="icon-btn" data-appbar-act="back" aria-label="返回">' + icon('chevronLeft') + '</button>' });
    appbarHandlers.back = function () { navigate('#/today'); };
    renderPage(
      emptyState('today', '今天没有要复习的题', '去错题本看看吧', '返回今日复习', null),
      { noTabbar: true }
    );
    bindEmptyAction(function () { navigate('#/today'); });
    return;
  }

  state.review = {
    items: items,
    idx: 0,
    revealed: false,
    detail: null,
    results: {},
    running: true,
    finished: false,
    busy: false
  };
  state.guard = function () {
    return confirmDialog({
      title: '退出复习？',
      message: '已经记录的答题结果会保存，未完成的题目会留在今日复习里。',
      okText: '退出',
      cancelText: '继续复习'
    });
  };
  reviewShowCurrent();
}

async function reviewShowCurrent() {
  const r = state.review;
  if (!r || r.finished) return;
  if (r.idx >= r.items.length) { reviewShowDone(); return; }
  r.revealed = false;
  r.busy = false;
  updateReviewProgress();
  const item = r.items[r.idx];
  main.className = 'main no-tabbar with-actionbar single';
  main.innerHTML = '<div class="page"><div class="loading-block"><div class="spinner"></div>正在加载题目…</div></div>';
  setActionbar('<button class="btn ghost block" disabled>加载中…</button>');
  let q;
  try {
    q = await api('/api/questions/' + item.id);
  } catch (err) {
    if (state.review !== r) return;
    showPageError(err, function () { reviewShowCurrent(); });
    return;
  }
  if (state.review !== r || r.finished) return;
  r.detail = q;
  reviewRenderCard();
}

function updateReviewProgress() {
  const el = $('#reviewProgress');
  if (!el || !state.review) return;
  el.textContent = Math.min(state.review.idx + 1, state.review.items.length) + ' / ' + state.review.items.length;
}

function reviewRenderCard() {
  const r = state.review;
  if (!r || !r.detail) return;
  const q = r.detail;
  const item = r.items[r.idx] || {};
  const images = normalizeImages(q.images);
  const overdueDays = Number(item.overdue_days || 0);
  const imageHTML = images.length ? '<div class="review-images">' + images.map(function (im, i) {
    return '<img class="thumb" src="' + esc(thumbOf(im)) + '" alt="原题图片 ' + (i + 1) + '" data-img-idx="' + i + '" loading="lazy">';
  }).join('') + '</div>' : '';

  const body = '<div class="review-page">' +
    '<div class="review-meta">' +
      '<span class="dot" style="background:' + esc(q.subject_color || '#6b7280') + '"></span>' +
      '<span>' + esc(q.subject_name || '') + '</span>' +
      statusBadge(q.status) +
      (overdueDays > 0 ? '<span class="badge due">逾期 ' + overdueDays + ' 天</span>' : '') +
    '</div>' +
    '<div class="card">' +
      '<div class="review-stem rich">' + rich(q.stem || item.stem_preview || '') + '</div>' +
      imageHTML +
    '</div>' +
    (r.revealed
      ? reviewAnswerHTML(q)
      : '<div class="review-hint">' + icon('info') + '<span>先在心里做一遍，再点「显示答案」核对。</span></div>') +
  '</div>';

  renderPage(body, { noTabbar: true, actionbar: true });
  bindViewerThumbs(images);

  if (r.revealed) {
    setActionbar(
      '<div class="actionbar-row">' +
        '<button class="btn success" data-grade="correct">' + icon('check') + '答对</button>' +
        '<button class="btn danger" data-grade="wrong">' + icon('x') + '答错</button>' +
      '</div>' +
      '<div class="actionbar-row secondary">' +
        '<button class="btn ghost" data-grade="postpone">顺延一天</button>' +
        '<button class="btn ghost" data-grade="master">标记已掌握</button>' +
      '</div>'
    );
    const bar = document.getElementById('actionbar');
    bar.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-grade]');
      if (btn) reviewGrade(btn.dataset.grade);
    });
  } else {
    setActionbar('<button class="btn primary block" id="btnShowAnswer">显示答案</button>');
    const btn = $('#btnShowAnswer');
    if (btn) btn.addEventListener('click', function () {
      if (!state.review || state.review.finished) return;
      state.review.revealed = true;
      reviewRenderCard();
    });
  }
  updateReviewProgress();
}

function reviewAnswerHTML(q) {
  const student = q.student_answer ? rich(q.student_answer) : '<span class="answer-empty">未记录孩子的作答</span>';
  const correct = q.correct_answer ? rich(q.correct_answer) : '<span class="answer-empty">未填写正确答案</span>';
  const analysis = q.analysis ? rich(q.analysis) : '<span class="answer-empty">未填写解析</span>';
  const kp = Array.isArray(q.knowledge_points) ? q.knowledge_points : [];
  const cause = q.error_cause_label || causeLabel(q.error_cause);
  const advice = q.error_advice;
  return '<div class="answer-stack">' +
    '<div class="answer-block wrong"><div class="answer-title">' + icon('x') + '孩子的作答 / 错解</div><div class="answer-body rich">' + student + '</div></div>' +
    '<div class="answer-block right"><div class="answer-title">' + icon('check') + '正确答案</div><div class="answer-body rich">' + correct + '</div></div>' +
    '<div class="answer-block plain"><div class="answer-title">解析</div><div class="answer-body rich">' + analysis + '</div></div>' +
    '<div class="answer-block advice"><div class="answer-title">错因与建议</div>' +
      '<div class="answer-body rich">' +
        (cause ? '<div style="margin-bottom:4px"><span class="tag">' + esc(cause) + '</span></div>' : '') +
        (advice ? rich(advice) : '<span class="answer-empty">暂无建议</span>') +
      '</div>' +
    '</div>' +
    (kp.length ? '<div class="tags">' + kp.map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') + '</div>' : '') +
  '</div>';
}

async function reviewGrade(result) {
  const r = state.review;
  if (!r || r.busy || r.finished || !r.detail) return;
  r.busy = true;
  $$('#actionbar .btn').forEach(function (b) { b.disabled = true; });
  let res;
  try {
    res = await api('/api/reviews', {
      method: 'POST',
      body: { question_id: r.detail.id, result: result }
    });
  } catch (err) {
    if (state.review !== r) return;
    r.busy = false;
    $$('#actionbar .btn').forEach(function (b) { b.disabled = false; });
    toast(err.message || '记录失败，请重试', 'error');
    return;
  }
  if (state.review !== r || r.finished) return;
  r.results[result] = (r.results[result] || 0) + 1;
  const msg = result === 'correct'
    ? (res.mastered ? '太棒了，这道题已标记为已掌握' : '已记录答对 · 下次复习 ' + fmtDueShort(res.next_due))
    : result === 'wrong'
      ? '已记录答错，明天再复习'
      : result === 'postpone'
        ? '已顺延到明天'
        : '已标记为已掌握';
  toast(msg, (result === 'correct' || result === 'master') ? 'success' : 'info');
  setTimeout(function () {
    if (state.review !== r || r.finished) return;
    r.idx++;
    r.busy = false;
    if (r.idx >= r.items.length) reviewShowDone();
    else reviewShowCurrent();
  }, 160);
}

function reviewShowDone() {
  const r = state.review;
  if (!r) return;
  r.finished = true;
  r.running = false;
  state.guard = null;
  hideActionbar();
  const correct = r.results.correct || 0;
  const wrong = r.results.wrong || 0;
  const postpone = r.results.postpone || 0;
  const master = r.results.master || 0;
  const total = correct + wrong + postpone + master;
  const extra = [];
  if (postpone) extra.push('顺延 ' + postpone + ' 题');
  if (master) extra.push('直接掌握 ' + master + ' 题');
  setAppbar({ left: '', title: '复习完成', rightHTML: '' });
  renderPage(
    '<div class="review-done" id="reviewDone">' +
      '<div class="done-icon">' + icon('check') + '</div>' +
      '<h2>本轮复习完成</h2>' +
      '<p class="done-line">本轮完成 ' + total + ' 题 · 答对 ' + correct + ' · 答错 ' + wrong + '</p>' +
      (extra.length ? '<p class="done-sub">' + esc(extra.join(' · ')) + '</p>' : '') +
      '<button class="btn primary block" id="btnReviewBack">返回今日复习</button>' +
    '</div>',
    { noTabbar: true }
  );
  const btn = $('#btnReviewBack');
  if (btn) btn.addEventListener('click', function () {
    state.review = null;
    navigate('#/today');
  });
  refreshBootstrap();
}

/* ======================= 5. 拍照录入 ======================= */

/* ---------- 网络请求（统一错误处理） ---------- */
class ApiError extends Error {
  constructor(message, offline) {
    super(message);
    this.name = 'ApiError';
    this.offline = !!offline;
  }
}

async function api(path, opts) {
  opts = opts || {};
  if (WB_LOCAL && window.WBLocal) return window.WBLocal.api(path, opts);
  const init = { method: opts.method || 'GET', headers: {} };
  if (opts.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  let res;
  try {
    res = await fetch(path, init);
  } catch (e) {
    throw new ApiError('无法连接服务，请确认电脑上的服务已启动', true);
  }
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.indexOf('application/json') >= 0) {
    try { data = await res.json(); } catch (e) { data = null; }
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || ('请求失败（HTTP ' + res.status + '）'), false);
  }
  if (data === null) throw new ApiError('服务返回了无法解析的数据', false);
  return data;
}

async function apiUpload(path, formData) {
  if (WB_LOCAL && window.WBLocal) return window.WBLocal.upload(formData);
  let res;
  try {
    res = await fetch(path, { method: 'POST', body: formData });
  } catch (e) {
    throw new ApiError('无法连接服务，请确认电脑上的服务已启动', true);
  }
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) throw new ApiError((data && data.error) || ('上传失败（HTTP ' + res.status + '）'), false);
  if (!data) throw new ApiError('上传返回数据异常', false);
  return data;
}

async function refreshBootstrap() {
  try {
    state.boot = await api('/api/bootstrap');
  } catch (e) { /* 静默失败，不打断用户 */ }
}

/* ---------- 本地草稿（sessionStorage，刷新不丢） ---------- */
function saveDraft() {
  try { sessionStorage.setItem('wb_draft', JSON.stringify(state.draft)); } catch (e) { /* ignore */ }
}
function loadDraft() {
  try {
    const s = sessionStorage.getItem('wb_draft');
    if (!s) return null;
    return JSON.parse(s);
  } catch (e) { return null; }
}
function clearDraft() {
  try { sessionStorage.removeItem('wb_draft'); } catch (e) { /* ignore */ }
}

/* ---------- 录入页状态 ---------- */
function captureState() {
  if (!state.capture) {
    state.capture = {
      files: [],
      uploaded: [],
      form: { source: '', date: todayStr(), subjectId: '' },
      busy: false,
      taskId: null,
      task: null,
      engine: '',
      startedAt: 0,
      error: '',
      pollTimer: null,
      elapsedTimer: null,
      resumed: false
    };
  }
  return state.capture;
}

function stopPollTimer(cs) {
  if (cs.pollTimer) { clearInterval(cs.pollTimer); cs.pollTimer = null; }
}
function stopElapsedTimer(cs) {
  if (cs.elapsedTimer) { clearInterval(cs.elapsedTimer); cs.elapsedTimer = null; }
}
function stopCaptureTimers(cs) {
  stopPollTimer(cs);
  stopElapsedTimer(cs);
}
function captureElapsed(cs) {
  if (!cs.startedAt) return 0;
  return Math.max(0, Math.round((Date.now() - cs.startedAt) / 1000));
}

async function renderCapture(seq) {
  setAppbar({ title: '拍照录入' });
  const cs = captureState();
  renderCaptureScreen();
  if (cs.busy && cs.taskId) {
    startElapsedTimer(cs);
    capturePollTask();
  } else if (!cs.busy && !cs.taskId && !cs.resumed) {
    cs.resumed = true;
    resumeActiveTask(cs);
  }
}

function captureHintHTML() {
  const boot = state.boot || {};
  const aiCfg = !!(boot.ai && boot.ai.configured);
  const ocrOk = !!(boot.ocr && boot.ocr.available);
  if (WB_LOCAL) {
    if (aiCfg) {
      return '<div class="hint-bar">' + icon('sparkles') +
        '<span>已配置 AI 识别：拍照或选图后自动提取题干、错解、答案解析与科目，保存前可逐项校对。</span></div>';
    }
    return '<div class="hint-bar warn">' + icon('alert') +
      '<span>手机本地版没有电脑 OCR：请先到「设置 → AI 识别」填写阿里百炼 Key，或直接点「手动录入」。</span></div>';
  }
  if (aiCfg) {
    return '<div class="hint-bar">' + icon('sparkles') +
      '<span>已配置 AI 识别：拍照或选图后自动提取题干、错解、答案解析与科目，保存前可逐项校对。</span></div>';
  }
  if (ocrOk) {
    return '<div class="hint-bar">' + icon('info') +
      '<span>AI 识别需在设置中填免费的智谱 Key；未配置时使用电脑本地 OCR，答案 / 解析需手动补充。</span></div>';
  }
  return '<div class="hint-bar warn">' + icon('alert') +
    '<span>当前电脑未检测到中文 OCR 语言包，拍照识别暂不可用。可先在 Windows 设置 → 时间和语言 → 语言 中添加中文，或直接手动录入。</span></div>';
}

function renderCaptureScreen() {
  const cs = captureState();
  const boot = state.boot || {};
  const aiCfg = !!(boot.ai && boot.ai.configured);
  const ocrOk = !!(boot.ocr && boot.ocr.available);
  let body = captureHintHTML();

  if (cs.busy || cs.taskId || cs.error) {
    body += captureTaskSection(cs, aiCfg, ocrOk);
  } else {
    body += capturePickerSection(cs) + captureFormSection(cs) + captureMainButtons(cs);
  }
  renderPage(body);
  bindCaptureScreen(cs);
}

function capturePickerSection(cs) {
  let previewHTML;
  if (cs.files.length) {
    previewHTML = '<div class="preview-grid">' + cs.files.map(function (f, i) {
      return '<div class="preview-item">' +
        '<img src="' + esc(f.url) + '" alt="待识别图片 ' + (i + 1) + '">' +
        '<button class="remove" data-remove-file="' + i + '" aria-label="删除这张图片">' + icon('x') + '</button>' +
      '</div>';
    }).join('') + '</div>';
  } else {
    previewHTML = '<div class="preview-grid"><div class="preview-empty">还没有图片，拍一张或从相册选择（最多 3 张）</div></div>';
  }
  return '<div class="capture-actions">' +
      '<button class="capture-tile primary" id="btnCamera">' + icon('camera') +
        '<span>拍照</span><span class="tile-sub">调用手机后置摄像头</span></button>' +
      '<button class="capture-tile" id="btnAlbum">' + icon('image') +
        '<span>从相册选</span><span class="tile-sub">可选 1~3 张</span></button>' +
    '</div>' +
    '<input type="file" id="fileCamera" accept="image/*" capture="environment" hidden>' +
    '<input type="file" id="fileAlbum" accept="image/*" multiple hidden>' +
    previewHTML;
}

function captureFormSection(cs) {
  const subjects = (state.boot && state.boot.subjects) || [];
  const subjectOptions = subjects.map(function (s) {
    return '<option value="' + s.id + '"' + (String(cs.form.subjectId) === String(s.id) ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');
  return '<div class="card capture-form">' +
    '<label class="field"><span class="field-label">来源</span>' +
      '<input class="input" id="capSource" value="' + esc(cs.form.source) + '" placeholder="如 期中卷 / 作业 12" maxlength="60"></label>' +
    '<div class="field-row">' +
      '<label class="field"><span class="field-label">日期</span>' +
        '<input class="input" type="date" id="capDate" value="' + esc(cs.form.date) + '"></label>' +
      '<label class="field"><span class="field-label">科目</span>' +
        '<select class="select" id="capSubject"><option value="">自动判断</option>' + subjectOptions + '</select></label>' +
    '</div>' +
  '</div>';
}

function captureMainButtons(cs) {
  const boot = state.boot || {};
  const aiCfg = !!(boot.ai && boot.ai.configured);
  const ocrOk = !!(boot.ocr && boot.ocr.available);
  const disabled = !cs.files.length || cs.busy;
  return '<div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">' +
    '<button class="btn primary block" id="btnRecognize"' + (disabled ? ' disabled' : '') + '>' +
      (aiCfg || ocrOk ? '开始识别' : '识别不可用') + '</button>' +
    '<button class="btn ghost block" id="btnManual">手动录入</button>' +
  '</div>' +
  '<p class="tiny muted center" style="margin-top:12px">多张图片时按第一张识别生成草稿，其余图片会作为附加原图一起保存。</p>';
}

function captureStageInfo(cs) {
  const t = cs.task || {};
  let stage = 'upload';
  if (cs.taskId) {
    if (t.stage === 'done') stage = 'done';
    else if (t.stage === 'ai') stage = 'ai';
    else stage = 'ocr';
  }
  const label = t.stage_label || (stage === 'ai' ? 'AI 分析中' : stage === 'ocr' ? '本地 OCR 识别中' : stage === 'done' ? '识别完成' : '正在上传图片…');
  return { stage: stage, label: label };
}

function captureTaskSection(cs, aiCfg, ocrOk) {
  if (cs.error) {
    return '<div class="card task-card failed">' +
      '<div class="task-title">识别失败</div>' +
      '<div class="task-error">' + esc(cs.error) + '</div>' +
      '<div class="btn-row">' +
        '<button class="btn primary" id="btnRetryTask">' + icon('refresh') + '重试识别</button>' +
        '<button class="btn ghost" id="btnManualFail">改为手动录入</button>' +
      '</div>' +
      (cs.files.length ? '<p class="tiny muted center" style="margin-top:10px">原图已保留，可直接重试或手动录入</p>' : '') +
    '</div>';
  }
  const st = captureStageInfo(cs);
  const recogLabel = aiCfg ? 'AI 分析' : '本地 OCR 识别';
  return '<div class="card task-card" id="capTaskCard">' +
    '<div class="spinner"></div>' +
    '<div class="task-title" id="capTaskTitle">' + esc(st.label) + '</div>' +
    '<div class="task-sub" id="capTaskSub">已用 ' + captureElapsed(cs) + ' 秒 · 请稍候</div>' +
    '<div class="step-list" id="capSteps">' +
      '<div class="step-item ' + (cs.uploaded.length ? 'done' : 'active') + '" data-step="upload"><span class="step-dot"></span>上传原图</div>' +
      '<div class="step-item ' + (cs.taskId ? 'active' : '') + '" data-step="recognize"><span class="step-dot"></span>' + esc(recogLabel) + '</div>' +
      '<div class="step-item" data-step="edit"><span class="step-dot"></span>校对并保存</div>' +
    '</div>' +
  '</div>' +
  '<button class="btn ghost block" id="btnManualAbort" style="margin-top:12px">改为手动录入</button>';
}

function updateCaptureProgress(cs) {
  const title = document.getElementById('capTaskTitle');
  if (!title) return;
  const st = captureStageInfo(cs);
  title.textContent = st.label;
  const sub = document.getElementById('capTaskSub');
  if (sub) sub.textContent = '已用 ' + captureElapsed(cs) + ' 秒 · 请稍候';
  const up = document.querySelector('#capSteps [data-step="upload"]');
  const rec = document.querySelector('#capSteps [data-step="recognize"]');
  if (up) up.className = 'step-item done';
  if (rec) rec.className = 'step-item active';
}

function bindCaptureScreen(cs) {
  const boot = state.boot || {};
  const fileCamera = $('#fileCamera');
  const fileAlbum = $('#fileAlbum');
  const btnCamera = $('#btnCamera');
  const btnAlbum = $('#btnAlbum');
  if (btnCamera && fileCamera) btnCamera.addEventListener('click', function () { fileCamera.click(); });
  if (btnAlbum && fileAlbum) btnAlbum.addEventListener('click', function () { fileAlbum.click(); });
  if (fileCamera) fileCamera.addEventListener('change', function () {
    handleCaptureFiles(fileCamera.files);
    fileCamera.value = '';
  });
  if (fileAlbum) fileAlbum.addEventListener('change', function () {
    handleCaptureFiles(fileAlbum.files);
    fileAlbum.value = '';
  });

  $$('[data-remove-file]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const i = Number(btn.dataset.removeFile);
      const f = cs.files[i];
      if (f) { try { URL.revokeObjectURL(f.url); } catch (e) { /* ignore */ } }
      cs.files.splice(i, 1);
      renderCaptureScreen();
    });
  });

  // 点击待识别的预览图，全屏查看原图
  $$('.preview-item img', main).forEach(function (img, idx) {
    img.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openViewer(cs.files.map(function (f) { return { url: f.url, thumb_url: f.url }; }), idx);
    });
  });

  const source = $('#capSource');
  if (source) source.addEventListener('input', function () { cs.form.source = source.value; });
  const date = $('#capDate');
  if (date) date.addEventListener('change', function () { cs.form.date = date.value || todayStr(); });
  const subject = $('#capSubject');
  if (subject) subject.addEventListener('change', function () { cs.form.subjectId = subject.value; });

  const recognize = $('#btnRecognize');
  if (recognize) recognize.addEventListener('click', function () {
    if (!cs.files.length) { toast('请先拍照或选择图片'); return; }
    if (!(boot.ai && boot.ai.configured) && !(boot.ocr && boot.ocr.available)) {
      toast('当前没有可用的识别方式，请手动录入', 'error');
      return;
    }
    startRecognize();
  });
  const manual = $('#btnManual');
  if (manual) manual.addEventListener('click', function () { manualEntry(false); });
  const manualFail = $('#btnManualFail');
  if (manualFail) manualFail.addEventListener('click', function () { manualEntry(true); });
  const manualAbort = $('#btnManualAbort');
  if (manualAbort) manualAbort.addEventListener('click', function () {
    stopCaptureTimers(cs);
    cs.busy = false; cs.taskId = null; cs.task = null; cs.error = '';
    manualEntry(true);
  });
  const retry = $('#btnRetryTask');
  if (retry) retry.addEventListener('click', function () { retryRecognize(); });
}

function handleCaptureFiles(fileList) {
  const cs = captureState();
  const files = Array.prototype.slice.call(fileList || []);
  if (!files.length) return;
  const room = 3 - cs.files.length;
  if (room <= 0) { toast('最多选择 3 张图片'); return; }
  let added = 0;
  files.forEach(function (f) {
    if (added >= room) return;
    const isImage = /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic|bmp)$/i.test(f.name || '');
    if (!isImage) { toast('请选择图片文件'); return; }
    cs.files.push({ file: f, url: URL.createObjectURL(f) });
    added++;
  });
  if (files.length > room) toast('最多选择 3 张图片');
  cs.error = '';
  renderCaptureScreen();
}

async function startRecognize() {
  const cs = captureState();
  if (cs.busy) return;
  if (!cs.files.length) return;
  stopCaptureTimers(cs);
  cs.busy = true;
  cs.error = '';
  cs.uploaded = [];
  cs.taskId = null;
  cs.task = null;
  cs.engine = '';
  cs.startedAt = Date.now();
  renderCaptureScreen();
  startElapsedTimer(cs);
  try {
    const imageIds = [];
    for (let i = 0; i < cs.files.length; i++) {
      const fd = new FormData();
      fd.append('file', cs.files[i].file, cs.files[i].file.name || ('photo-' + (i + 1) + '.jpg'));
      const up = await apiUpload('/api/upload', fd);
      cs.uploaded.push(up);
      imageIds.push(up.id);
      updateCaptureProgress(cs);
    }
    const body = { image_ids: imageIds, mode: 'auto' };
    if (cs.form.subjectId) body.subject_hint = Number(cs.form.subjectId);
    const rec = await api('/api/recognize', { method: 'POST', body: body });
    cs.engine = rec.engine || '';
    cs.taskId = rec.task_id;
    cs.startedAt = Date.now();
    renderCaptureScreen();
    capturePollTask();
  } catch (err) {
    stopCaptureTimers(cs);
    cs.busy = false;
    cs.error = err.message || '上传或识别失败';
    renderCaptureScreen();
    toast(cs.error, 'error');
  }
}

function capturePollTask() {
  const cs = captureState();
  stopPollTimer(cs);
  if (!cs.taskId) return;
  if (!cs.elapsedTimer) startElapsedTimer(cs);
  const tick = async function () {
    const taskId = cs.taskId;
    if (!taskId) return;
    let t;
    try {
      t = await api('/api/tasks/' + taskId);
    } catch (err) {
      stopCaptureTimers(cs);
      cs.busy = false;
      cs.error = err.message || '获取识别状态失败';
      renderCaptureScreen();
      return;
    }
    if (state.capture !== cs) return;
    cs.task = t;
    if (t.status === 'done') {
      stopCaptureTimers(cs);
      cs.busy = false;
      const draft = Object.assign({}, t.result || {});
      draft.image_ids = cs.uploaded.map(function (u) { return u.id; });
      draft.images = cs.uploaded.slice();
      draft.engine = draft.engine || cs.engine;
      if (!draft.exam_name) draft.exam_name = cs.form.source || '';
      if (!draft.exam_date) draft.exam_date = cs.form.date || '';
      if (!draft.subject_id && cs.form.subjectId) draft.subject_id = Number(cs.form.subjectId);
      state.draft = draft;
      saveDraft();
      const keepForm = true;
      resetCaptureAfterTask(cs, keepForm);
      toast('识别完成，请校对后保存', 'success');
      navigate('#/edit/new?task=' + taskId);
      return;
    }
    if (t.status === 'failed') {
      stopCaptureTimers(cs);
      cs.busy = false;
      cs.error = t.error || '识别失败，请重试';
      renderCaptureScreen();
      return;
    }
    updateCaptureProgress(cs);
  };
  tick();
  cs.pollTimer = setInterval(tick, 700);
  addCleanup(function () { stopPollTimer(cs); });
}

function startElapsedTimer(cs) {
  stopElapsedTimer(cs);
  cs.elapsedTimer = setInterval(function () {
    const sub = document.getElementById('capTaskSub');
    if (!sub) return;
    sub.textContent = '已用 ' + captureElapsed(cs) + ' 秒 · 请稍候';
  }, 500);
  addCleanup(function () { stopElapsedTimer(cs); });
}

function resetCaptureAfterTask(cs, keepForm) {
  stopCaptureTimers(cs);
  cs.busy = false;
  cs.taskId = null;
  cs.task = null;
  cs.error = '';
  cs.startedAt = 0;
  cs.uploaded = [];
  cs.files.forEach(function (f) { try { URL.revokeObjectURL(f.url); } catch (e) { /* ignore */ } });
  cs.files = [];
  if (!keepForm) cs.form = { source: '', date: todayStr(), subjectId: '' };
}

async function retryRecognize() {
  const cs = captureState();
  if (!cs.taskId) { startRecognize(); return; }
  stopCaptureTimers(cs);
  cs.error = '';
  cs.busy = true;
  cs.startedAt = Date.now();
  renderCaptureScreen();
  try {
    const r = await api('/api/tasks/' + cs.taskId + '/retry', { method: 'POST', body: {} });
    cs.taskId = r.task_id;
    cs.task = null;
    cs.engine = r.engine || '';
    renderCaptureScreen();
    capturePollTask();
  } catch (err) {
    cs.busy = false;
    cs.error = err.message || '重试失败';
    renderCaptureScreen();
  }
}

function manualEntry(keepImages) {
  const cs = captureState();
  stopCaptureTimers(cs);
  const images = keepImages ? cs.uploaded.slice() : [];
  state.draft = {
    subject_id: cs.form.subjectId ? Number(cs.form.subjectId) : null,
    exam_name: cs.form.source || '',
    exam_date: cs.form.date || todayStr(),
    stem: '', student_answer: '', correct_answer: '', analysis: '',
    knowledge_points: [], error_cause: '', error_advice: '', difficulty: 3, question_type: '',
    images: images,
    image_ids: images.map(function (u) { return u.id; })
  };
  saveDraft();
  resetCaptureAfterTask(cs, true);
  navigate('#/edit/new');
}

async function resumeActiveTask(cs) {
  let data;
  try {
    data = await api('/api/tasks?status=active');
  } catch (e) { return; }
  if (state.capture !== cs) return;
  const item = ((data && data.items) || [])[0];
  if (!item || (item.status !== 'queued' && item.status !== 'running')) return;
  cs.taskId = item.id;
  cs.task = item;
  cs.busy = true;
  cs.startedAt = Date.now();
  renderCaptureScreen();
  startElapsedTimer(cs);
  capturePollTask();
}

/* ======================= 6. 校对 / 编辑 ======================= */

function renderEdit(seq) {
  const id = state.args.id;
  const isNew = id === 'new';
  const boot = state.boot || {};
  const subjects = boot.subjects || [];
  if (!isNew) {
    renderPage(skeletonCards(2, 160));
    return loadEditQuestion(seq, id, subjects);
  }
  const draft = state.draft || loadDraft() || {};
  state.draft = draft;
  openEditForm(null, draft, true, subjects);
}

async function loadEditQuestion(seq, id, subjects) {
  let data;
  try {
    data = await api('/api/questions/' + id);
  } catch (err) {
    if (seq !== pageSeq) return;
    showPageError(err, function () { route(); });
    return;
  }
  if (seq !== pageSeq) return;
  openEditForm(data, data, false, subjects);
}

function openEditForm(question, src, isNew, subjects) {
  const form = {
    subject_id: src.subject_id ? String(src.subject_id) : '',
    question_type: src.question_type || '',
    difficulty: Number(src.difficulty) || 3,
    error_cause: src.error_cause || '',
    stem: src.stem || '',
    student_answer: src.student_answer || '',
    correct_answer: src.correct_answer || '',
    analysis: src.analysis || '',
    knowledge_points: Array.isArray(src.knowledge_points) ? src.knowledge_points.join('，') : (src.knowledge_points || ''),
    exam_name: src.exam_name || '',
    exam_date: src.exam_date || todayStr(),
    image_ids: (src.image_ids && src.image_ids.slice()) || (src.images || []).map(function (im) { return im.id; }).filter(Boolean),
    images: normalizeImages(src.images || []),
    ocr_text: src.ocr_text || '',
    warnings: Array.isArray(src.warnings) ? src.warnings : [],
    ai_raw: src.ai_raw || ''
  };
  if (!form.image_ids.length && form.images.length) {
    form.image_ids = form.images.map(function (im) { return im.id; }).filter(Boolean);
  }
  state.edit = {
    id: question ? question.id : null,
    isNew: isNew,
    form: form,
    dirty: false,
    saving: false,
    dupIgnored: false,
    similarTimer: null
  };
  setAppbar({
    left: '<button class="appbar-text-btn" data-appbar-act="close">关闭</button>',
    title: isNew ? '校对并保存' : '编辑错题',
    center: true,
    rightHTML: '<button class="appbar-text-btn" data-appbar-act="save">保存</button>',
    handlers: {
      close: function () { closeEdit(); },
      save: function () { saveEdit(false); }
    }
  });
  const html = editHTML(form, isNew, subjects);
  renderPage(html, { noTabbar: true, actionbar: true });
  setActionbar(
    '<button class="btn primary block" id="btnSave">' + icon('check') + '保存</button>' +
    '<button class="btn ghost block" id="btnSaveAgain">保存并再拍一题</button>'
  );
  bindEditForm(isNew, subjects);
  const saveBtn = $('#btnSave');
  if (saveBtn) saveBtn.addEventListener('click', function () { saveEdit(false); });
  const saveAgain = $('#btnSaveAgain');
  if (saveAgain) saveAgain.addEventListener('click', function () { saveEdit(true); });
  bindViewerThumbs(form.images);
  if (!isNew) checkSimilarImmediate(form.stem, form.id);
}

function editHTML(form, isNew, subjects) {
  const subjectOptions = '<option value="">请选择科目</option>' + subjects.map(function (s) {
    return '<option value="' + s.id + '"' + (String(form.subject_id) === String(s.id) ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');
  const typeOptions = '<option value="">未分类</option>' + Object.keys(TYPE_LABELS).map(function (k) {
    return '<option value="' + k + '"' + (form.question_type === k ? ' selected' : '') + '>' + esc(TYPE_LABELS[k]) + '</option>';
  }).join('');
  const causeOptions = '<option value="">未分类</option>' + Object.keys(CAUSE_LABELS).map(function (k) {
    return '<option value="' + k + '"' + (form.error_cause === k ? ' selected' : '') + '>' + esc(CAUSE_LABELS[k]) + '</option>';
  }).join('');
  const stars = [1, 2, 3, 4, 5].map(function (n) {
    return '<button type="button" class="star' + (n <= form.difficulty ? ' on' : '') + '" data-star="' + n + '" aria-label="难度 ' + n + '">' + starIcon() + '</button>';
  }).join('');
  const images = form.images;
  const imageBar = images.length
    ? '<div class="img-strip">' + images.map(function (im, i) {
        return '<img class="thumb" src="' + esc(thumbOf(im)) + '" alt="原图 ' + (i + 1) + '" data-img-idx="' + i + '" loading="lazy">';
      }).join('') + '</div>'
    : '<div class="img-strip-empty">' + (isNew ? '本题没有原图（手动录入）' : '本题没有保留原图') + '</div>';
  const hasDetails = !!(form.ocr_text || form.warnings.length || form.ai_raw);
  const details = hasDetails ? '<details class="card sect">' +
      '<summary><h3>识别详情</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
      '<div class="sect-body">' +
        (form.warnings.length ? '<ul class="warn-list">' + form.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') +
        (form.ocr_text ? '<div class="field-label" style="margin-top:8px">OCR 原文</div><div class="pre-box">' + esc(form.ocr_text) + '</div>' : '') +
        (form.ai_raw ? '<div class="field-label" style="margin-top:12px">AI 原始返回</div><div class="pre-box">' + esc(form.ai_raw) + '</div>' : '') +
      '</div>' +
    '</details>' : '';

  return '<div class="edit-page">' +
    '<div class="dup-banner" id="dupBanner" hidden></div>' +
    '<div class="card">' + imageBar + '</div>' +
    '<div class="edit-section-title">分类</div>' +
    '<div class="card">' +
      '<div class="field-row">' +
        '<label class="field" id="field-subject"><span class="field-label">科目<span class="req">*</span></span>' +
          '<select class="select" id="fSubject">' + subjectOptions + '</select>' +
          '<div class="field-err">请选择科目</div></label>' +
        '<label class="field"><span class="field-label">题型</span>' +
          '<select class="select" id="fType">' + typeOptions + '</select></label>' +
      '</div>' +
      '<div class="field"><span class="field-label">难度</span><div class="stars" id="fStars">' + stars + '</div></div>' +
      '<label class="field"><span class="field-label">错因</span>' +
        '<select class="select" id="fCause">' + causeOptions + '</select></label>' +
    '</div>' +
    '<div class="edit-section-title">题目内容</div>' +
    '<div class="card">' +
      '<label class="field" id="field-stem"><span class="field-label">题干<span class="req">*</span></span>' +
        '<textarea class="textarea" id="fStem" style="min-height:160px" placeholder="输入题干，支持换行；公式可用 $...$">' + esc(form.stem) + '</textarea>' +
        '<div class="field-err">请填写题干</div></label>' +
      '<label class="field"><span class="field-label">孩子的作答 / 错解</span>' +
        '<textarea class="textarea" id="fStudent" style="min-height:100px" placeholder="原样保留孩子的错误过程">' + esc(form.student_answer) + '</textarea></label>' +
      '<label class="field"><span class="field-label">正确答案</span>' +
        '<textarea class="textarea" id="fCorrect" style="min-height:96px" placeholder="填写标准答案">' + esc(form.correct_answer) + '</textarea></label>' +
      '<label class="field"><span class="field-label">解析</span>' +
        '<textarea class="textarea" id="fAnalysis" style="min-height:100px" placeholder="解题思路、关键步骤">' + esc(form.analysis) + '</textarea></label>' +
    '</div>' +
    '<div class="edit-section-title">其他</div>' +
    '<div class="card">' +
      '<label class="field"><span class="field-label">知识点</span>' +
        '<input class="input" id="fKp" value="' + esc(form.knowledge_points) + '" placeholder="用逗号分隔，如：一元一次方程，移项"></label>' +
      '<div class="field-row">' +
        '<label class="field"><span class="field-label">来源</span>' +
          '<input class="input" id="fExamName" value="' + esc(form.exam_name) + '" placeholder="如 期中卷" maxlength="60"></label>' +
        '<label class="field"><span class="field-label">日期</span>' +
          '<input class="input" type="date" id="fExamDate" value="' + esc(form.exam_date) + '"></label>' +
      '</div>' +
    '</div>' +
    details +
  '</div>';
}

function bindEditForm(isNew, subjects) {
  const e = state.edit;
  if (!e) return;
  const markDirty = function () {
    if (!state.edit || state.edit !== e) return;
    e.dirty = true;
    state.guard = function () {
      return confirmDialog({
        title: '放弃修改？',
        message: '当前修改还没有保存，离开后将会丢失。',
        okText: '放弃修改',
        cancelText: '继续编辑',
        danger: true
      });
    };
  };
  ['fSubject', 'fType', 'fCause', 'fStem', 'fStudent', 'fCorrect', 'fAnalysis', 'fKp', 'fExamName', 'fExamDate'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      markDirty();
      const field = el.closest('.field');
      if (field) field.classList.remove('has-error');
    });
    el.addEventListener('change', markDirty);
  });
  $$('#fStars .star').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!state.edit) return;
      state.edit.form.difficulty = Number(btn.dataset.star);
      $$('#fStars .star').forEach(function (b) {
        b.classList.toggle('on', Number(b.dataset.star) <= state.edit.form.difficulty);
      });
      markDirty();
    });
  });
  const stem = $('#fStem');
  if (stem) {
    stem.addEventListener('input', function () {
      if (!state.edit) return;
      if (e.similarTimer) clearTimeout(e.similarTimer);
      e.similarTimer = setTimeout(function () {
        if (!state.edit || state.edit !== e) return;
        checkSimilar(stem.value);
      }, 600);
    });
    addCleanup(function () { if (e.similarTimer) clearTimeout(e.similarTimer); });
  }
  const dupView = $('#dupView');
  if (dupView) dupView.addEventListener('click', function (ev) { ev.preventDefault(); closeEdit(true); });
  const dupIgnore = $('#dupIgnore');
  if (dupIgnore) dupIgnore.addEventListener('click', function () {
    if (state.edit) state.edit.dupIgnored = true;
    hideDupBanner();
  });
  checkSimilarImmediate(state.edit.form.stem, state.edit.id);
}

function showFieldError(fieldId, hasError) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.toggle('has-error', !!hasError);
}

function closeEdit(force) {
  const e = state.edit;
  if (e && e.dirty && !force) {
    navigate(state.prevHash && state.prevHash !== location.hash ? state.prevHash : '#/capture');
    return;
  }
  if (e) e.dirty = false;
  state.guard = null;
  navigate(state.prevHash && state.prevHash !== location.hash ? state.prevHash : '#/capture');
}

async function saveEdit(again) {
  const e = state.edit;
  if (!e || e.saving) return;
  const form = readEditForm();
  let bad = false;
  if (!form.stem) { showFieldError('field-stem', true); bad = true; } else showFieldError('field-stem', false);
  if (!form.subject_id) { showFieldError('field-subject', true); bad = true; } else showFieldError('field-subject', false);
  if (bad) {
    toast('请补全题干和科目', 'error');
    const first = document.querySelector('.field.has-error');
    if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  e.saving = true;
  e?.form && (e.form.stem = form.stem);
  setEditSaving(true);
  const payload = {
    subject_id: Number(form.subject_id),
    question_type: form.question_type || null,
    difficulty: form.difficulty || 3,
    error_cause: form.error_cause || null,
    stem: form.stem,
    student_answer: form.student_answer || null,
    correct_answer: form.correct_answer || null,
    analysis: form.analysis || null,
    knowledge_points: form.knowledge_points,
    exam_name: form.exam_name || null,
    exam_date: form.exam_date || null,
    image_ids: form.image_ids
  };
  if (form.ai_raw) payload.ai_raw = form.ai_raw;
  try {
    let savedId = e.id;
    if (e.isNew) {
      const res = await api('/api/questions', { method: 'POST', body: payload });
      savedId = res.id;
    } else {
      await api('/api/questions/' + e.id, { method: 'PUT', body: payload });
    }
    if (state.edit !== e) return;
    e.saving = false;
    e.dirty = false;
    state.guard = null;
    state.draft = null;
    clearDraft();
    toast(e.isNew ? '已保存，已加入复习计划' : '修改已保存', 'success');
    refreshBootstrap();
    if (again) navigate('#/capture');
    else navigate('#/question/' + savedId);
  } catch (err) {
    if (state.edit === e) {
      e.saving = false;
      setEditSaving(false);
      toast(err.message || '保存失败，请重试', 'error');
    }
  }
}

function setEditSaving(saving) {
  ['btnSave', 'btnSaveAgain'].forEach(function (id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = !!saving;
    if (saving) { btn.classList.add('loading'); } else { btn.classList.remove('loading'); }
  });
  const appbarSave = document.querySelector('[data-appbar-act="save"]');
  if (appbarSave) appbarSave.disabled = !!saving;
}

function readEditForm() {
  const e = state.edit;
  const get = function (id) { const el = document.getElementById(id); return el ? el.value : ''; };
  return {
    subject_id: get('fSubject'),
    question_type: get('fType'),
    difficulty: e ? e.form.difficulty : 3,
    error_cause: get('fCause'),
    stem: get('fStem').trim(),
    student_answer: get('fStudent').trim(),
    correct_answer: get('fCorrect').trim(),
    analysis: get('fAnalysis').trim(),
    knowledge_points: parseKp(get('fKp')),
    exam_name: get('fExamName').trim(),
    exam_date: get('fExamDate'),
    image_ids: e ? e.form.image_ids : [],
    ai_raw: e ? e.form.ai_raw : '',
    ocr_text: e ? e.form.ocr_text : ''
  };
}

function parseKp(raw) {
  return String(raw || '').split(/[,，、]/).map(function (s) { return s.trim(); }).filter(Boolean);
}

function hideDupBanner() {
  const banner = document.getElementById('dupBanner');
  if (banner) { banner.hidden = true; banner.innerHTML = ''; }
}

function showDupBanner(match) {
  const banner = document.getElementById('dupBanner');
  if (!banner || !match) return;
  banner.hidden = false;
  banner.innerHTML = icon('alert') +
    '<div><div>疑似重复：与已有错题「' + esc(String(match.stem_preview || '').slice(0, 32)) + '」相似 ' +
    Math.round(Number(match.score) * 100) + '%</div>' +
    '<div class="dup-actions">' +
      '<a href="#/question/' + match.id + '" id="dupView">查看原题</a>' +
      '<button type="button" id="dupIgnore">仍要保存</button>' +
    '</div></div>';
  const dupView = document.getElementById('dupView');
  if (dupView) dupView.addEventListener('click', function (ev) { ev.preventDefault(); closeEdit(true); });
  const dupIgnore = document.getElementById('dupIgnore');
  if (dupIgnore) dupIgnore.addEventListener('click', function () {
    if (state.edit) state.edit.dupIgnored = true;
    hideDupBanner();
  });
}

async function checkSimilar(stem) {
  const e = state.edit;
  if (!e || e.dupIgnored) { hideDupBanner(); return; }
  if (!stem || stem.trim().length < 8) { hideDupBanner(); return; }
  const params = new URLSearchParams();
  params.set('stem', stem.trim().slice(0, 500));
  if (e.id) params.set('exclude_id', String(e.id));
  try {
    const data = await api('/api/questions/similar?' + params.toString());
    if (!state.edit || state.edit !== e) return;
    const top = (data.matches || [])[0];
    if (top && Number(top.score) >= 0.9 && !e.dupIgnored) showDupBanner(top);
    else hideDupBanner();
  } catch (err) { /* 判重失败不影响保存 */ }
}

function checkSimilarImmediate(stem, excludeId) {
  const e = state.edit;
  if (!e || !stem || stem.trim().length < 8) return;
  const params = new URLSearchParams();
  params.set('stem', stem.trim().slice(0, 500));
  if (excludeId) params.set('exclude_id', String(excludeId));
  api('/api/questions/similar?' + params.toString()).then(function (data) {
    if (!state.edit || state.edit !== e || e.dupIgnored) return;
    const top = (data.matches || [])[0];
    if (top && Number(top.score) >= 0.9) showDupBanner(top);
  }).catch(function () { /* ignore */ });
}


/* ======================= 7. 错题本 ======================= */

async function renderNotebook(seq) {
  const nb = state.notebook;
  if (state.params.q !== undefined) {
    nb.q = state.params.q;
    nb.searchOpen = true;
  }
  nb.items = [];
  nb.offset = 0;
  nb.total = 0;
  nb.hasMore = true;
  nb.loaded = false;
  nb.loading = false;
  setAppbar({
    title: '错题本',
    rightHTML: '<button class="icon-btn" data-appbar-act="search" aria-label="搜索">' + icon('search') + '</button>',
    handlers: {
      search: function () {
        nb.searchOpen = !nb.searchOpen;
        renderNotebookShell();
        const input = $('#nbSearch');
        if (input && nb.searchOpen) setTimeout(function () { input.focus(); }, 30);
      }
    }
  });
  renderNotebookShell();
  await loadNotebook(true, seq);
}

function notebookChipsHTML(nb) {
  const boot = state.boot || {};
  const subjects = boot.subjects || [];
  const counts = boot.counts || {};
  const allTotal = counts.total !== undefined && counts.total !== null ? counts.total : '';
  let html = '<button class="chip' + (!nb.subjectId ? ' active' : '') + '" data-subject="">全部' +
    '<span class="chip-num">(' + esc(allTotal) + ')</span></button>';
  html += subjects.map(function (s) {
    const active = String(nb.subjectId) === String(s.id);
    return '<button class="chip' + (active ? ' active' : '') + '" data-subject="' + s.id + '">' +
      '<span class="dot" style="background:' + esc(s.color || '#6b7280') + '"></span>' + esc(s.name) +
      '<span class="chip-num">(' + esc(s.total !== undefined ? s.total : '') + ')</span></button>';
  }).join('');
  return html;
}

function notebookStatusHTML(nb) {
  const statuses = [['', '全部状态'], ['new', '待复习'], ['reviewing', '复习中'], ['mastered', '已掌握']];
  return statuses.map(function (pair) {
    return '<button class="chip' + (nb.status === pair[0] ? ' active' : '') + '" data-status="' + pair[0] + '">' + pair[1] + '</button>';
  }).join('');
}

function notebookShellHTML(nb) {
  const causeOptions = '<option value="">全部错因</option>' + Object.keys(CAUSE_LABELS).map(function (k) {
    return '<option value="' + k + '"' + (nb.cause === k ? ' selected' : '') + '>' + esc(CAUSE_LABELS[k]) + '</option>';
  }).join('');
  const sortOptions = [['created_desc', '最新录入'], ['due_asc', '最急复习'], ['lapses_desc', '错最多']].map(function (p) {
    return '<option value="' + p[0] + '"' + (nb.sort === p[0] ? ' selected' : '') + '>' + p[1] + '</option>';
  }).join('');
  return '<div class="notebook-page">' +
    (nb.searchOpen
      ? '<div class="searchbar">' + icon('search') +
          '<input id="nbSearch" type="search" placeholder="搜索题干 / 知识点" value="' + esc(nb.q) + '" enterkeyhint="search">' +
          '<button class="clear" id="nbSearchClear" aria-label="清空搜索">' + icon('x') + '</button>' +
        '</div>'
      : '') +
    '<div class="chips">' + notebookChipsHTML(nb) + '</div>' +
    '<div class="chips">' + notebookStatusHTML(nb) + '</div>' +
    '<div class="filter-row">' +
      '<select class="select wide" id="nbCause">' + causeOptions + '</select>' +
      '<select class="select wide" id="nbSort">' + sortOptions + '</select>' +
    '</div>' +
    '<div class="list-meta"><span id="nbCount">加载中…</span><span id="nbSortLabel"></span></div>' +
    '<div id="nbList"></div>' +
    '<div id="nbSentinel" style="height:1px"></div>' +
  '</div>';
}

function renderNotebookShell() {
  const nb = state.notebook;
  renderPage(notebookShellHTML(nb));
  bindNotebookShell();
}

function bindNotebookShell() {
  const nb = state.notebook;
  $$('[data-subject]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      nb.subjectId = btn.dataset.subject;
      renderNotebookShell();
      loadNotebook(true);
    });
  });
  $$('[data-status]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      nb.status = btn.dataset.status;
      renderNotebookShell();
      loadNotebook(true);
    });
  });
  const cause = $('#nbCause');
  if (cause) cause.addEventListener('change', function () {
    nb.cause = cause.value;
    loadNotebook(true);
  });
  const sort = $('#nbSort');
  if (sort) sort.addEventListener('change', function () {
    nb.sort = sort.value;
    loadNotebook(true);
  });
  const search = $('#nbSearch');
  if (search) {
    let timer = null;
    const doSearch = function () {
      nb.q = search.value.trim();
      loadNotebook(true);
    };
    search.addEventListener('input', function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(doSearch, 300);
    });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (timer) clearTimeout(timer); doSearch(); search.blur(); }
    });
    addCleanup(function () { if (timer) clearTimeout(timer); });
  }
  const clear = $('#nbSearchClear');
  if (clear) clear.addEventListener('click', function () {
    nb.q = '';
    const input = $('#nbSearch');
    if (input) input.value = '';
    loadNotebook(true);
  });
}

function nbSortLabel(sort) {
  return sort === 'due_asc' ? '按最急复习' : sort === 'lapses_desc' ? '按错最多' : '按最新录入';
}

function nbCardHTML(it) {
  const due = dueInfo(it.next_due);
  const color = it.subject_color || '#6b7280';
  const kp = (it.knowledge_points || []).slice(0, 3);
  const thumb = it.thumb_url
    ? '<img src="' + esc(it.thumb_url) + '" alt="" loading="lazy">'
    : esc(String(it.subject_name || '题').slice(0, 1));
  return '<a class="nb-card" href="#/question/' + it.id + '">' +
    '<div class="nb-thumb" style="background:' + esc(color) + '">' + thumb + '</div>' +
    '<div class="nb-body">' +
      '<div class="nb-meta"><span class="dot" style="background:' + esc(color) + '"></span>' +
        esc(it.subject_name || '') + ' · ' + esc(fmtWhen(it.created_at)) + '</div>' +
      '<div class="nb-stem">' + esc(it.stem_preview || '') + '</div>' +
      (kp.length ? '<div class="tags nb-tags">' + kp.map(function (k) {
        return '<span class="tag">' + esc(k) + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="nb-foot">' +
        statusBadge(it.status) +
        (it.error_cause_label ? '<span class="cause-pill">' + esc(it.error_cause_label) + '</span>' : '') +
        '<span class="due-text' + (due.overdue ? ' overdue' : '') + '">' + esc(due.text) + '</span>' +
        (Number(it.lapses) > 0 ? '<span class="lapse-text">错过 ' + it.lapses + ' 次</span>' : '') +
      '</div>' +
    '</div>' +
  '</a>';
}

function renderNotebookList(loadingMore) {
  const nb = state.notebook;
  const list = $('#nbList');
  if (!list) return;
  const count = $('#nbCount');
  if (count) {
    count.textContent = nb.loaded ? '共 ' + nb.total + ' 道错题' : '加载中…';
  }
  const sortLabel = $('#nbSortLabel');
  if (sortLabel) sortLabel.textContent = nbSortLabel(nb.sort);
  if (!nb.items.length) {
    if (nb.loading) {
      list.innerHTML = '<div class="skel" style="height:96px;border-radius:14px;margin-bottom:10px"></div>' +
        '<div class="skel" style="height:96px;border-radius:14px;margin-bottom:10px"></div>' +
        '<div class="skel" style="height:96px;border-radius:14px"></div>';
      return;
    }
    const filtered = nb.subjectId || nb.status || nb.cause || nb.q;
    list.innerHTML = emptyState('notebook',
      filtered ? '没有符合条件的错题' : '错题本还是空的',
      filtered ? '换个筛选条件或清空搜索再试试' : '拍一张错题照片，或手动录入第一道题',
      filtered ? '清空筛选' : '去录入错题');
    bindEmptyAction(function () {
      if (filtered) {
        nb.subjectId = ''; nb.status = ''; nb.cause = ''; nb.q = '';
        renderNotebookShell();
        loadNotebook(true);
      } else {
        navigate('#/capture');
      }
    });
    return;
  }
  list.innerHTML = nb.items.map(nbCardHTML).join('') +
    (nb.loading ? '<div class="load-more"><span class="spinner sm"></span>加载中…</div>'
      : nb.hasMore ? '<div class="load-more">上滑加载更多</div>' : '');
}

function showNotebookError(err) {
  const list = $('#nbList');
  if (!list) return;
  list.innerHTML = '<div class="page-error">' +
    '<div class="err-icon">' + icon(err && err.offline ? 'wifiOff' : 'alert') + '</div>' +
    '<h3>' + (err && err.offline ? '无法连接服务' : '加载失败') + '</h3>' +
    '<p>' + esc((err && err.message) || '请稍后重试') + '</p>' +
    '<button class="btn primary block" id="nbRetry">重试</button>' +
  '</div>';
  const btn = $('#nbRetry');
  if (btn) btn.addEventListener('click', function () { loadNotebook(true); });
}

function maybeLoadMoreNotebook() {
  if (state.path !== '/notebook') return;
  const nb = state.notebook;
  if (!nb.loaded || nb.loading || !nb.hasMore) return;
  if (main.scrollHeight - main.scrollTop - main.clientHeight < 280) loadNotebook(false);
}

async function loadNotebook(reset, seq) {
  const nb = state.notebook;
  if (nb.loading) return;
  if (reset) {
    nb.items = [];
    nb.offset = 0;
    nb.total = 0;
    nb.hasMore = true;
    nb.loaded = false;
  } else if (!nb.hasMore) {
    return;
  }
  nb.loading = true;
  renderNotebookList(reset === false);
  const params = new URLSearchParams();
  if (nb.subjectId) params.set('subject_id', nb.subjectId);
  if (nb.status) params.set('status', nb.status);
  if (nb.cause) params.set('cause', nb.cause);
  if (nb.q) params.set('q', nb.q);
  params.set('sort', nb.sort);
  params.set('limit', '30');
  params.set('offset', String(nb.offset));
  let data;
  try {
    data = await api('/api/questions?' + params.toString());
  } catch (err) {
    nb.loading = false;
    if (seq !== undefined && seq !== pageSeq) return;
    if (nb.items.length) toast(err.message || '加载失败', 'error');
    else showNotebookError(err);
    return;
  }
  nb.loading = false;
  if (seq !== undefined && seq !== pageSeq) return;
  if (state.path !== '/notebook') return;
  const items = data.items || [];
  nb.items = reset ? items : nb.items.concat(items);
  nb.total = Number(data.total !== undefined ? data.total : nb.items.length);
  nb.offset = nb.items.length;
  nb.hasMore = items.length >= 30 && nb.items.length < nb.total;
  nb.loaded = true;
  renderNotebookList(false);
}

/* ======================= 8. 错题详情 ======================= */

async function renderQuestion(seq) {
  const id = state.args.id;
  setAppbar({
    back: true,
    backFallback: '#/notebook',
    title: '错题详情',
    rightHTML: '<button class="appbar-text-btn" data-appbar-act="edit">编辑</button>' +
      '<button class="icon-btn" data-appbar-act="more" aria-label="更多操作">' + icon('more') + '</button>',
    handlers: {
      edit: function () { navigate('#/edit/' + id); },
      more: function () { toggleQuestionMenu(); }
    }
  });
  renderPage(skeletonCards(2, 150));
  let q;
  try {
    q = await api('/api/questions/' + id);
  } catch (err) {
    if (seq !== pageSeq) return;
    showPageError(err, function () { route(); });
    return;
  }
  if (seq !== pageSeq) return;
  state.question = q;
  renderQuestionDetail(q);
}

function renderQuestionDetail(q) {
  const images = normalizeImages(q.images);
  const plan = q.plan || {};
  const kp = Array.isArray(q.knowledge_points) ? q.knowledge_points : [];
  const reviews = (q.reviews || []).slice(0, 5);
  const due = dueInfo(plan.next_due);
  const isMastered = q.status === 'mastered';
  const sourceParts = [];
  if (q.exam_name) sourceParts.push('来源：' + q.exam_name);
  if (q.exam_date) sourceParts.push('考试日期：' + q.exam_date);

  const block = function (title, content, cls) {
    if (!content) return '';
    return '<div class="card"><div class="q-block-title">' + esc(title) + '</div>' +
      '<div class="q-text' + (cls ? ' ' + cls : '') + ' rich">' + content + '</div></div>';
  };

  const imageBar = images.length ? '<div class="card"><div class="q-block-title">原题图片</div><div class="img-strip">' +
    images.map(function (im, i) {
      return '<img class="thumb" src="' + esc(thumbOf(im)) + '" alt="原图 ' + (i + 1) + '" data-img-idx="' + i + '" loading="lazy">';
    }).join('') + '</div></div>' : '';

  const timeline = reviews.length ? '<div class="timeline">' + reviews.map(function (r) {
    const cls = r.result === 'correct' ? 'correct' : r.result === 'wrong' ? 'wrong' : r.result === 'postpone' ? 'postpone' : 'master';
    return '<div class="timeline-item">' +
      '<span class="timeline-dot ' + cls + '"></span>' +
      '<div class="timeline-body"><div class="timeline-title">' + esc(REVIEW_RESULT_LABELS[r.result] || r.result) + '</div>' +
      '<div class="timeline-time">' + esc(fmtDateTime(r.reviewed_at)) + '</div>' +
      (r.note ? '<div class="timeline-note">' + esc(r.note) + '</div>' : '') +
      '</div></div>';
  }).join('') + '</div>' : '<p class="tiny muted" style="margin-top:12px">还没有复习记录</p>';

  const adviceHTML = (q.error_cause || q.error_advice) ? '<div class="card">' +
    '<div class="q-block-title">错因与建议</div>' +
    (q.error_cause_label || q.error_cause ? '<span class="tag" style="margin-bottom:8px;display:inline-block">' +
      esc(q.error_cause_label || causeLabel(q.error_cause)) + '</span>' : '') +
    (q.error_advice ? '<div class="q-advice-text rich" style="margin-top:6px">' + rich(q.error_advice) + '</div>' : '') +
  '</div>' : '';

  renderPage(
    '<div class="q-detail page">' +
      '<div class="q-info">' +
        '<span class="dot lg" style="background:' + esc(q.subject_color || '#6b7280') + '"></span>' +
        '<span class="subject-name">' + esc(q.subject_name || '') + '</span>' +
        statusBadge(q.status) +
        (q.question_type ? '<span class="tag">' + esc(q.question_type_label || typeLabel(q.question_type)) + '</span>' : '') +
        '<span class="time">录入 ' + esc(fmtWhen(q.created_at)) + '</span>' +
      '</div>' +
      (sourceParts.length ? '<div class="q-source">' + sourceParts.map(function (p) { return '<span>' + esc(p) + '</span>'; }).join('') + '</div>' : '') +
      imageBar +
      block('题目', rich(q.stem), 'q-text-lg') +
      (q.student_answer ? '<div class="card"><div class="q-block-title">孩子的作答 / 错解</div>' +
        '<div class="answer-block wrong" style="margin:0"><div class="answer-body rich">' + rich(q.student_answer) + '</div></div></div>' : '') +
      (q.correct_answer ? '<div class="card"><div class="q-block-title">正确答案</div>' +
        '<div class="answer-block right" style="margin:0"><div class="answer-body rich">' + rich(q.correct_answer) + '</div></div></div>' : '') +
      (q.analysis ? '<div class="card"><div class="q-block-title">解析</div><div class="q-text answer rich">' + rich(q.analysis) + '</div></div>' : '') +
      '<div class="card"><div class="q-block-title">知识点</div>' +
        (kp.length ? '<div class="q-kp">' + kp.map(function (k) { return '<span class="tag">' + esc(k) + '</span>'; }).join('') + '</div>'
          : '<span class="muted small">未标注知识点</span>') +
      '</div>' +
      adviceHTML +
      '<div class="card"><div class="q-block-title">复习计划</div>' +
        '<div class="plan-grid">' +
          '<div class="plan-cell"><div class="k">下次复习</div><div class="v' + (due.overdue ? ' danger' : '') + '">' + esc(due.text || '未排期') + '</div></div>' +
          '<div class="plan-cell"><div class="k">当前档位</div><div class="v">第 ' + (Number(plan.stage) || 0) + ' 档' +
            (plan.interval_days ? ' · ' + plan.interval_days + ' 天' : '') + '</div></div>' +
          '<div class="plan-cell"><div class="k">连对</div><div class="v">' + (Number(plan.streak) || 0) + ' 次</div></div>' +
          '<div class="plan-cell"><div class="k">错过次数</div><div class="v">' + (Number(plan.lapses) || 0) + ' 次</div></div>' +
        '</div>' +
        '<div class="q-block-title" style="margin-top:16px">复习历史</div>' +
        timeline +
      '</div>' +
      (q.ai_raw ? '<details class="card sect"><summary><h3>AI 原始记录</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
        '<div class="sect-body"><div class="pre-box">' + esc(q.ai_raw) + '</div></div></details>' : '') +
    '</div>',
    { noTabbar: false, actionbar: true }
  );
  setActionbar(
    '<button class="btn primary block" id="btnReviewAgain">' + icon('refresh') + '再复习一次</button>' +
    '<div class="actionbar-row">' +
      '<button class="btn ghost" id="btnToggleMaster">' + (isMastered ? '撤销已掌握' : '标记已掌握') + '</button>' +
      '<button class="btn danger-ghost" id="btnDeleteQ">' + icon('trash') + '删除</button>' +
    '</div>'
  );
  bindViewerThumbs(images);
  const again = $('#btnReviewAgain');
  if (again) again.addEventListener('click', function () { reviewAgain(q); });
  const master = $('#btnToggleMaster');
  if (master) master.addEventListener('click', function () { toggleMaster(q); });
  const del = $('#btnDeleteQ');
  if (del) del.addEventListener('click', function () { deleteQuestion(q); });
}

function toggleQuestionMenu() {
  const existing = document.getElementById('qMenu');
  if (existing) { existing.remove(); return; }
  const q = state.question;
  if (!q) return;
  const pop = document.createElement('div');
  pop.id = 'qMenu';
  pop.className = 'menu-pop';
  pop.innerHTML = '<button type="button" class="danger" id="qMenuDelete">' + icon('trash') + '删除错题</button>';
  app.appendChild(pop);
  const onDocClick = function (e) {
    if (!pop.contains(e.target) && !e.target.closest('[data-appbar-act="more"]')) close();
  };
  const close = function () {
    pop.remove();
    document.removeEventListener('click', onDocClick, true);
  };
  setTimeout(function () { document.addEventListener('click', onDocClick, true); }, 0);
  $('#qMenuDelete').addEventListener('click', function () { close(); deleteQuestion(q); });
  addCleanup(function () { close(); });
}

function reviewAgain(q) {
  let api = null;
  let done = false;
  const finish = function (result) {
    if (done) return;
    done = true;
    if (api) api.close();
    if (!result) return;
    api('/api/reviews', { method: 'POST', body: { question_id: q.id, result: result } }).then(function (res) {
      const msg = result === 'correct'
        ? (res.mastered ? '答对了，这道题已标记为已掌握' : '已记录答对 · 下次复习 ' + fmtDueShort(res.next_due))
        : '已记录答错，明天再复习';
      toast(msg, result === 'correct' ? 'success' : 'info');
      refreshBootstrap();
      route();
    }).catch(function (err) {
      toast(err.message || '记录失败', 'error');
    });
  };
  api = openOverlay(
    '<div class="modal" role="dialog" aria-modal="true">' +
      '<h3>再复习一次</h3>' +
      '<p>这次重做做对了吗？记录后会按艾宾浩斯规则更新下次复习时间。</p>' +
      '<div class="modal-actions">' +
        '<button class="btn danger" data-act="wrong">答错</button>' +
        '<button class="btn success" data-act="correct">答对</button>' +
      '</div>' +
    '</div>',
    {
      onBackdrop: function () { finish(null); },
      onMount: function (a) {
        a.wrap.querySelector('[data-act="wrong"]').addEventListener('click', function () { finish('wrong'); });
        a.wrap.querySelector('[data-act="correct"]').addEventListener('click', function () { finish('correct'); });
      }
    }
  );
}

async function toggleMaster(q) {
  const mastered = q.status === 'mastered';
  if (!mastered) {
    try {
      await api('/api/questions/' + q.id + '/master', { method: 'POST', body: {} });
      toast('已标记为已掌握', 'success');
      refreshBootstrap();
      route();
    } catch (err) { toast(err.message || '操作失败', 'error'); }
    return;
  }
  try {
    await api('/api/questions/' + q.id + '/unmaster', { method: 'POST', body: {} });
  } catch (err) {
    try {
      await api('/api/questions/' + q.id, { method: 'PUT', body: { status: 'reviewing' } });
    } catch (err2) {
      toast(err2.message || err.message || '操作失败', 'error');
      return;
    }
  }
  toast('已撤销「已掌握」', 'success');
  refreshBootstrap();
  route();
}

async function deleteQuestion(q) {
  const ok = await confirmDialog({
    title: '删除这道错题？',
    message: '删除后不可恢复，原图和复习记录会一起删除。',
    okText: '删除',
    cancelText: '取消',
    danger: true
  });
  if (!ok) return;
  try {
    await api('/api/questions/' + q.id, { method: 'DELETE' });
    toast('已删除', 'success');
    state.question = null;
    refreshBootstrap();
    navigate('#/notebook');
  } catch (err) {
    toast(err.message || '删除失败', 'error');
  }
}

/* ======================= 9. 统计 ======================= */

async function renderStats(seq) {
  setAppbar({ title: '统计' });
  const boot = state.boot || {};
  const subjects = boot.subjects || [];
  const ranges = [['7', '近 7 天'], ['30', '近 30 天'], ['all', '全部']];
  const subjectOptions = '<option value="">全部科目</option>' + subjects.map(function (s) {
    return '<option value="' + s.id + '"' + (String(state.statsSubject) === String(s.id) ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');
  renderPage(
    '<div class="stats-page">' +
      '<div class="stats-top">' +
        '<div class="chips" style="margin:0;padding:0">' + ranges.map(function (r) {
          return '<button class="chip' + (state.statsRange === r[0] ? ' active' : '') + '" data-range="' + r[0] + '">' + r[1] + '</button>';
        }).join('') + '</div>' +
        '<select class="select" id="statsSubject" aria-label="科目筛选">' + subjectOptions + '</select>' +
      '</div>' +
      '<div id="statsBody">' +
        '<div class="skel" style="height:118px;border-radius:14px;margin-bottom:12px"></div>' +
        '<div class="skel" style="height:200px;border-radius:14px;margin-bottom:12px"></div>' +
        '<div class="skel" style="height:150px;border-radius:14px"></div>' +
      '</div>' +
    '</div>'
  );
  $$('[data-range]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.statsRange = btn.dataset.range;
      $$('[data-range]').forEach(function (b) { b.classList.toggle('active', b === btn); });
      loadStats();
    });
  });
  const subjectSel = $('#statsSubject');
  if (subjectSel) subjectSel.addEventListener('change', function () {
    state.statsSubject = subjectSel.value;
    loadStats();
  });
  await loadStats(seq);
}

async function loadStats(seq) {
  const body = $('#statsBody');
  if (!body) return;
  body.innerHTML = '<div class="skel" style="height:118px;border-radius:14px;margin-bottom:12px"></div>' +
    '<div class="skel" style="height:200px;border-radius:14px;margin-bottom:12px"></div>' +
    '<div class="skel" style="height:150px;border-radius:14px"></div>';
  const params = new URLSearchParams();
  params.set('range', state.statsRange);
  if (state.statsSubject) params.set('subject_id', state.statsSubject);
  let data;
  try {
    data = await api('/api/stats?' + params.toString());
  } catch (err) {
    if (seq !== undefined && seq !== pageSeq) return;
    if (!body) return;
    body.innerHTML = '<div class="page-error">' +
      '<div class="err-icon">' + icon(err.offline ? 'wifiOff' : 'alert') + '</div>' +
      '<h3>' + (err.offline ? '无法连接服务' : '统计加载失败') + '</h3>' +
      '<p>' + esc(err.message || '请稍后重试') + '</p>' +
      '<button class="btn primary block" id="statsRetry">重试</button></div>';
    const btn = $('#statsRetry');
    if (btn) btn.addEventListener('click', function () { loadStats(); });
    return;
  }
  if (seq !== undefined && seq !== pageSeq) return;
  if (state.route !== 'stats') return;
  renderStatsBody(data);
}

function renderStatsBody(data) {
  const body = $('#statsBody');
  if (!body) return;
  const counts = data.counts || {};
  const rate = Number(data.mastery_rate) || 0;
  const rangeLabel = state.statsRange === '7' ? '近 7 天' : state.statsRange === 'all' ? '全部时间' : '近 30 天';
  let html = '<div class="stat-grid">' +
    '<div class="stat-card"><div class="k">累计错题</div><div class="v">' + (counts.total || 0) + '<small>道</small></div><div class="sub">' + rangeLabel + '</div></div>' +
    '<div class="stat-card"><div class="k">待复习</div><div class="v">' + (counts.due || 0) + '<small>道</small></div><div class="sub">含逾期</div></div>' +
    '<div class="stat-card"><div class="k">已掌握</div><div class="v">' + (counts.mastered || 0) + '<small>道</small></div><div class="sub">连对达标</div></div>' +
    '<div class="stat-card"><div class="k">掌握率</div><div class="v">' + pct(rate) + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(0, Math.min(100, Math.round(rate * 100))) + '%"></div></div></div>' +
  '</div>';

  html += '<div class="card" style="margin-top:12px"><div class="chart-head"><h3>录入 / 复习趋势</h3>' +
    '<div class="legend"><span><i style="background:#93b4f8"></i>新增</span><span><i style="background:#2f6fed"></i>复习</span></div></div>' +
    trendChartHTML(data.trend || []) + '</div>';

  const subjectBars = (data.by_subject || []).filter(function (s) { return Number(s.total) > 0; });
  const maxSub = Math.max(1, subjectBars.reduce(function (m, s) { return Math.max(m, Number(s.total) || 0); }, 0));
  html += '<div class="card" style="margin-top:12px"><div class="chart-head"><h3>科目分布</h3><span class="tiny muted">已掌握 / 总数</span></div>' +
    (subjectBars.length ? '<div class="bars-list">' + subjectBars.map(function (s) {
      const total = Number(s.total) || 0;
      const mastered = Number(s.mastered) || 0;
      return '<div class="bars-item"><div class="bars-top"><span class="name"><span class="dot" style="background:' +
        esc(s.color || '#6b7280') + ';margin-right:6px"></span>' + esc(s.name) + '</span>' +
        '<span class="num">' + mastered + ' / ' + total + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round(total / maxSub * 100) + '%;background:' +
        esc(s.color || '#6b7280') + '"></div></div></div>';
    }).join('') + '</div>' : '<p class="muted small">该时间范围内暂无数据</p>') + '</div>';

  const causes = (data.by_cause || []).filter(function (c) { return Number(c.count) > 0; }).sort(function (a, b) { return Number(b.count) - Number(a.count); });
  const maxCause = Math.max(1, causes.reduce(function (m, c) { return Math.max(m, Number(c.count) || 0); }, 0));
  html += '<div class="card" style="margin-top:12px"><div class="chart-head"><h3>错因分布</h3><span class="tiny muted">共 ' + causes.reduce(function (m, c) { return m + (Number(c.count) || 0); }, 0) + ' 次</span></div>' +
    (causes.length ? '<div class="bars-list">' + causes.map(function (c) {
      return '<div class="bars-item"><div class="bars-top"><span class="name">' + esc(c.label || causeLabel(c.cause)) + '</span>' +
        '<span class="num">' + c.count + ' 题</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round(Number(c.count) / maxCause * 100) + '%"></div></div></div>';
    }).join('') + '</div>' : '<p class="muted small">该时间范围内暂无数据</p>') + '</div>';

  const weak = (data.weak_kp || []).slice(0, 10);
  html += '<div class="card" style="margin-top:12px"><div class="chart-head"><h3>薄弱知识点 Top 10</h3><span class="tiny muted">待复习 / 总数</span></div>' +
    (weak.length ? '<div class="weak-list">' + weak.map(function (w, i) {
      const q = encodeURIComponent(w.name || '');
      return '<a class="weak-item" href="#/notebook?q=' + q + '">' +
        '<span class="idx">' + (i + 1) + '</span>' +
        '<span class="name">' + esc(w.name || '') + '</span>' +
        '<span class="ratio">' + (Number(w.due) || 0) + ' / ' + (Number(w.total) || 0) + '</span>' +
        '<span class="chev">' + icon('chevronRight') + '</span></a>';
    }).join('') + '</div>' : '<p class="muted small">暂无薄弱知识点</p>') + '</div>';

  const repeat = (data.repeat_wrong || []).slice(0, 10);
  html += '<div class="card" style="margin-top:12px"><div class="chart-head"><h3>反复错 Top 10</h3><span class="tiny muted">按错过次数</span></div>' +
    (repeat.length ? '<div class="repeat-list">' + repeat.map(function (r) {
      return '<a class="repeat-item" href="#/question/' + r.id + '">' +
        '<span class="stem">' + esc(r.stem_preview || '') + '</span>' +
        '<span class="lapses-count">错过 ' + (Number(r.lapses) || 0) + ' 次</span>' +
        '<span class="chev">' + icon('chevronRight') + '</span></a>';
    }).join('') + '</div>' : '<p class="muted small">暂无反复错的题，保持得不错</p>') + '</div>';

  body.innerHTML = html;
}

function trendChartHTML(trend) {
  const data = (trend || []).slice(-30);
  if (!data.length) return '<p class="muted small">该时间范围内暂无录入或复习记录</p>';
  const max = Math.max(1, data.reduce(function (m, d) {
    return Math.max(m, Number(d.created) || 0, Number(d.reviewed) || 0);
  }, 0));
  const cols = data.map(function (d) {
    const c = Number(d.created) || 0;
    const r = Number(d.reviewed) || 0;
    const ch = c === 0 ? 0 : Math.max(3, Math.round(c / max * 100));
    const rh = r === 0 ? 0 : Math.max(3, Math.round(r / max * 100));
    return '<div class="chart-col" title="' + esc(d.date + ' 新增 ' + c + ' · 复习 ' + r) + '">' +
      '<span class="bar created" style="height:' + ch + '%"></span>' +
      '<span class="bar reviewed" style="height:' + rh + '%"></span></div>';
  }).join('');
  const mid = data[Math.floor(data.length / 2)];
  return '<div class="chart">' + cols + '</div>' +
    '<div class="chart-axis"><span>' + esc(fmtMMDD(data[0].date)) + '</span>' +
      (data.length > 2 ? '<span>' + esc(fmtMMDD(mid.date)) + '</span>' : '') +
      '<span>' + esc(fmtMMDD(data[data.length - 1].date)) + '</span></div>';
}

/* ======================= 10. 设置 ======================= */

async function renderSettings(seq) {
  setAppbar({ title: '设置' });
  renderPage('<div class="skel" style="height:150px;border-radius:14px;margin-bottom:12px"></div>' +
    '<div class="skel" style="height:120px;border-radius:14px;margin-bottom:12px"></div>' +
    '<div class="skel" style="height:180px;border-radius:14px"></div>');
  let settings;
  let subjectsResp;
  try {
    const results = await Promise.all([api('/api/settings'), api('/api/subjects')]);
    settings = results[0];
    subjectsResp = results[1];
  } catch (err) {
    if (seq !== pageSeq) return;
    showPageError(err, function () { route(); });
    return;
  }
  if (seq !== pageSeq) return;
  state.settings = settings;
  state.settingsSubjects = subjectsResp.items || [];
  renderSettingsScreen(settings);
}

function settingsSubjectList() {
  const bootSubs = (state.boot && state.boot.subjects) || [];
  const list = (state.settingsSubjects && state.settingsSubjects.length) ? state.settingsSubjects : bootSubs;
  return list.map(function (s) {
    const match = bootSubs.filter(function (b) { return b.id === s.id; })[0];
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      total: match ? (match.total || 0) : 0
    };
  });
}

function aiPresetKeyOf(ai) {
  const found = AI_PRESETS.filter(function (p) {
    return p.base_url === ai.base_url && p.model === ai.model;
  })[0];
  return found ? found.key : 'custom';
}

function settingsHTML(s) {
  const ai = s.ai || {};
  const review = s.review || {};
  const student = s.student || {};
  const ocr = s.ocr || {};
  const hasKey = !!ai.has_key;
  const presetKey = aiPresetKeyOf(ai);
  const presetOptions = AI_PRESETS.map(function (p) {
    return '<option value="' + p.key + '"' + (presetKey === p.key ? ' selected' : '') + '>' + esc(p.name) + '</option>';
  }).join('') + '<option value="custom"' + (presetKey === 'custom' ? ' selected' : '') + '>自定义 / 其他兼容接口</option>';
  const intervals = (review.intervals || [1, 2, 4, 7, 15, 30, 60]);
  const subjects = settingsSubjectList();
  const subjectRows = subjects.length ? subjects.map(function (sub) {
    return '<div class="subject-row" data-subject-id="' + sub.id + '">' +
      '<span class="dot" style="background:' + esc(sub.color || '#6b7280') + '"></span>' +
      '<span class="name">' + esc(sub.name) + '</span>' +
      '<span class="num">' + (sub.total || 0) + ' 题</span>' +
      '<button class="row-btn" data-subject-rename="' + sub.id + '" data-name="' + esc(sub.name) + '" aria-label="重命名">' + icon('edit') + '</button>' +
      '<button class="row-btn danger" data-subject-delete="' + sub.id + '" data-name="' + esc(sub.name) + '" aria-label="删除">' + icon('trash') + '</button>' +
    '</div>';
  }).join('') : '<p class="muted small">还没有科目，先新增一个吧</p>';
  const colorSwatches = SUBJECT_COLORS.map(function (c, i) {
    return '<button type="button" class="color-swatch' + (i === 0 ? ' on' : '') + '" data-color="' + c + '" style="background:' + c + '" aria-label="颜色 ' + c + '"></button>';
  }).join('');

  return '<div class="settings-page">' +

    /* AI 识别 */
    '<details class="card sect" open>' +
      '<summary><h3>AI 识别（可选）</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
      '<div class="sect-body">' +
        '<div class="status-line ' + (hasKey ? 'ok' : 'warn') + '">' + icon(hasKey ? 'check' : 'info') +
          '<span>' + (hasKey ? '已配置（' + esc(ai.api_key_masked || '****') + '）' : '未配置 API Key，暂时只能手动录入') + '</span></div>' +
        '<p class="small muted" style="margin-bottom:8px">手机版必须用浏览器能直连的渠道，推荐「阿里百炼」：在 <a href="https://bailian.console.aliyun.com" target="_blank" rel="noopener">bailian.console.aliyun.com</a> 开通后创建 API Key（qwen-vl 系列有免费额度），粘贴到下面即可。智谱等渠道不支持浏览器直连，会提示无法连接。</p>' +
        '<label class="field"><span class="field-label">渠道预设</span><select class="select" id="aiPreset">' + presetOptions + '</select></label>' +
        '<label class="field"><span class="field-label">Base URL</span><input class="input" id="aiBase" value="' + esc(ai.base_url || '') + '" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"></label>' +
        '<label class="field"><span class="field-label">模型</span><input class="input" id="aiModel" value="' + esc(ai.model || '') + '" placeholder="qwen-vl-plus"></label>' +
        '<label class="field"><span class="field-label">API Key</span><div class="pw-wrap">' +
          '<input class="input" id="aiKey" type="password" autocomplete="off" placeholder="' + (hasKey ? '已保存，留空表示不修改' : '粘贴 API Key') + '">' +
          '<button type="button" class="pw-toggle" id="aiKeyToggle">显示</button></div></label>' +
        '<label class="field"><span class="field-label">超时（秒）</span><input class="input" id="aiTimeout" type="number" min="5" max="300" value="' + esc(ai.timeout_sec || 60) + '"></label>' +
        '<div class="btn-row"><button class="btn ghost" id="btnTestAI">测试连接</button><button class="btn primary" id="btnSaveAI">保存</button></div>' +
        (hasKey ? '<button class="btn sm danger-ghost" id="btnClearKey" style="margin-top:10px">清除已保存的 Key</button>' : '') +
        '<div class="test-result" id="aiTestResult" hidden></div>' +
      '</div>' +
    '</details>' +

    /* 手机本地存储 */
    '<details class="card sect">' +
      '<summary><h3>手机本地存储</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
      '<div class="sect-body">' +
        '<div class="status-line ok">' + icon('check') + '<span>数据保存在这台手机的浏览器里（IndexedDB），不上传任何服务器</span></div>' +
        '<p class="tiny muted">卸载应用、清理浏览器「网站数据」或长期不打开，都可能让数据丢失；建议每周在下方「数据与备份」导出一次。<br>手机版没有电脑本地 OCR：识别依赖上面的 AI 渠道；不填 Key 时可用「手动录入」。</p>' +
      '</div>' +
    '</details>' +

    /* 复习设置 */
    '<details class="card sect">' +
      '<summary><h3>复习设置</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
      '<div class="sect-body">' +
        '<label class="field"><span class="field-label">掌握阈值（连对次数）</span>' +
          '<input class="input" id="masteryStreak" type="number" min="1" max="10" value="' + esc(review.mastery_streak || 4) + '"></label>' +
        '<div class="field-label">复习间隔（天，只读）</div>' +
        '<div class="interval-chips">' + intervals.map(function (d) { return '<span class="interval-chip">' + d + ' 天</span>'; }).join('') + '</div>' +
        '<p class="tiny muted" style="margin-top:10px">答对升一档，答错回到第 1 档；连对达到阈值自动标记「已掌握」。</p>' +
        '<button class="btn primary" id="btnSaveReview" style="margin-top:14px">保存</button>' +
      '</div>' +
    '</details>' +

    /* 学生信息 */
    '<details class="card sect">' +
      '<summary><h3>学生信息</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
      '<div class="sect-body">' +
        '<label class="field"><span class="field-label">昵称</span>' +
          '<input class="input" id="studentName" value="' + esc(student.name || '') + '" placeholder="如 小明" maxlength="20"></label>' +
        '<label class="field"><span class="field-label">年级</span><select class="select" id="studentGrade">' +
          GRADES.map(function (g) { return '<option value="' + g + '"' + ((student.grade || '初中') === g ? ' selected' : '') + '>' + g + '</option>'; }).join('') +
        '</select></label>' +
        '<button class="btn primary" id="btnSaveStudent">保存</button>' +
      '</div>' +
    '</details>' +

    /* 科目管理 */
    '<details class="card sect">' +
      '<summary><h3>科目管理</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
      '<div class="sect-body">' +
        '<div class="subject-list" id="subjectList">' + subjectRows + '</div>' +
        '<div class="color-swatches" id="colorSwatches">' + colorSwatches + '</div>' +
        '<div class="add-subject">' +
          '<input class="input" id="newSubjectName" placeholder="新科目名称，如 物理" maxlength="12">' +
          '<button class="btn sm primary" id="btnAddSubject">添加</button>' +
        '</div>' +
        '<p class="tiny muted" style="margin-top:10px">删除科目时，若该科目下还有错题，需要先移动或删除这些错题。</p>' +
      '</div>' +
    '</details>' +

    /* 数据与备份 */
    '<details class="card sect">' +
      '<summary><h3>数据与备份</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
      '<div class="sect-body">' +
        '<div class="export-btns">' +
          '<button class="btn ghost" id="btnExportMd">' + icon('download') + '导出 Markdown（zip，按科目分文件）</button>' +
          '<button class="btn ghost" id="btnExportJson">' + icon('download') + '导出 JSON（结构化备份）</button>' +
          '<button class="btn ghost" id="btnBackup">' + icon('database') + '下载完整备份（含原图）</button>' +
          '<label class="btn ghost" style="cursor:pointer">导入备份（zip / json）<input type="file" id="importFile" accept=".zip,.json,application/zip,application/json" hidden></label>' +
        '</div>' +
        '<div class="tip-box">数据只保存在本机浏览器里。完整备份包含题目、复习记录和原图；导出后请存到网盘或电脑。换手机前先导出，再在新手机导入。</div>' +
      '</div>' +
    '</details>' +

    /* 关于 */
    '<details class="card sect">' +
      '<summary><h3>关于</h3><span class="chev">' + icon('chevronRight') + '</span></summary>' +
      '<div class="sect-body">' +
        '<div class="about-rows">' +
          '<div class="about-row"><span class="k">当前地址</span><span class="v mono">' + esc(location.origin) + '</span></div>' +
          '<div class="about-row"><span class="k">版本</span><span class="v">错题本 ' + esc((state.boot && state.boot.server && state.boot.server.version) || '1.0.0-pwa') + '</span></div>' +
        '</div>' +
        '<div class="tip-box">' + icon('phone') + ' 手机版：把本页「添加到主屏幕」后像 App 一样使用；数据只保存在本机浏览器，不上传服务器。断网也能录入、复习、统计。</div>' +
      '</div>' +
    '</details>' +

  '</div>';
}

function renderSettingsScreen(s) {
  renderPage(settingsHTML(s));
  bindSettingsScreen(s);
}

async function reloadSettings() {
  try {
    const results = await Promise.all([api('/api/settings'), api('/api/subjects')]);
    state.settings = results[0];
    state.settingsSubjects = results[1].items || [];
    if (state.route !== 'settings' || state.path !== '/settings') return;
    renderSettingsScreen(state.settings);
  } catch (err) {
    toast(err.message || '加载设置失败', 'error');
  }
}

function bindSettingsScreen(s) {
  const ai = s.ai || {};
  /* AI 预设 */
  const preset = $('#aiPreset');
  if (preset) preset.addEventListener('change', function () {
    const p = AI_PRESETS.filter(function (x) { return x.key === preset.value; })[0];
    if (p) {
      $('#aiBase').value = p.base_url;
      $('#aiModel').value = p.model;
    }
  });
  const keyToggle = $('#aiKeyToggle');
  if (keyToggle) keyToggle.addEventListener('click', function () {
    const input = $('#aiKey');
    if (!input) return;
    if (input.type === 'password') { input.type = 'text'; keyToggle.textContent = '隐藏'; }
    else { input.type = 'password'; keyToggle.textContent = '显示'; }
  });
  const testBtn = $('#btnTestAI');
  if (testBtn) testBtn.addEventListener('click', testAIConnection);
  const saveAI = $('#btnSaveAI');
  if (saveAI) saveAI.addEventListener('click', saveAISettings);
  const clearKey = $('#btnClearKey');
  if (clearKey) clearKey.addEventListener('click', async function () {
    const ok = await confirmDialog({
      title: '清除 API Key？',
      message: '清除后拍照识别会停止，只能手动录入；已有错题和复习进度不受影响。',
      okText: '清除',
      danger: true
    });
    if (!ok) return;
    try {
      await api('/api/settings', { method: 'PUT', body: { ai: { api_key: '__clear__' } } });
      toast('已清除 API Key', 'success');
      await refreshBootstrap();
      reloadSettings();
    } catch (err) { toast(err.message || '清除失败', 'error'); }
  });

  /* 复习设置 */
  const saveReview = $('#btnSaveReview');
  if (saveReview) saveReview.addEventListener('click', async function () {
    const n = Number($('#masteryStreak').value);
    if (!n || n < 1 || n > 10) { toast('掌握阈值需在 1~10 之间', 'error'); return; }
    try {
      await api('/api/settings', { method: 'PUT', body: { review: { mastery_streak: n } } });
      toast('复习设置已保存', 'success');
      await refreshBootstrap();
      reloadSettings();
    } catch (err) { toast(err.message || '保存失败', 'error'); }
  });

  /* 学生信息 */
  const saveStudent = $('#btnSaveStudent');
  if (saveStudent) saveStudent.addEventListener('click', async function () {
    const name = $('#studentName').value.trim();
    const grade = $('#studentGrade').value;
    try {
      await api('/api/settings', { method: 'PUT', body: { student: { name: name, grade: grade } } });
      toast('学生信息已保存', 'success');
    } catch (err) { toast(err.message || '保存失败', 'error'); }
  });

  /* 科目管理 */
  $$('[data-subject-rename]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const id = btn.dataset.subjectRename;
      const oldName = btn.dataset.name || '';
      const name = await promptDialog({ title: '重命名科目', label: '输入新的科目名称', value: oldName, okText: '保存' });
      if (!name || name === oldName) return;
      try {
        await api('/api/subjects/' + id, { method: 'PUT', body: { name: name } });
        toast('科目已重命名', 'success');
        await refreshBootstrap();
        reloadSettings();
      } catch (err) { toast(err.message || '重命名失败', 'error'); }
    });
  });
  $$('[data-subject-delete]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const id = btn.dataset.subjectDelete;
      const name = btn.dataset.name || '';
      const ok = await confirmDialog({
        title: '删除科目「' + name + '」？',
        message: '只有科目下没有错题时才能删除。',
        okText: '删除',
        danger: true
      });
      if (!ok) return;
      try {
        await api('/api/subjects/' + id, { method: 'DELETE' });
        toast('科目已删除', 'success');
        await refreshBootstrap();
        reloadSettings();
      } catch (err) { toast(err.message || '删除失败', 'error'); }
    });
  });
  let addColor = SUBJECT_COLORS[0];
  $$('#colorSwatches [data-color]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addColor = btn.dataset.color;
      $$('#colorSwatches [data-color]').forEach(function (b) { b.classList.toggle('on', b === btn); });
    });
  });
  const addSubject = $('#btnAddSubject');
  if (addSubject) addSubject.addEventListener('click', async function () {
    const name = $('#newSubjectName').value.trim();
    if (!name) { toast('请输入科目名称', 'error'); return; }
    try {
      await api('/api/subjects', { method: 'POST', body: { name: name, color: addColor } });
      toast('已新增科目', 'success');
      await refreshBootstrap();
      reloadSettings();
    } catch (err) { toast(err.message || '新增失败', 'error'); }
  });

  /* 数据备份 */
  const backup = $('#btnBackup');
  if (backup) backup.addEventListener('click', async function () {
    const ok = await confirmDialog({
      title: '下载完整备份？',
      message: '备份包含所有错题、复习记录和原图，文件可能较大，请确认网络与存储空间。',
      okText: '下载',
      cancelText: '取消'
    });
    if (ok) {
      if (WB_LOCAL && window.WBLocal) {
        window.WBLocal.download('backup').catch(function (err) { toast(err.message || '备份失败', 'error'); });
      } else {
        window.location.href = '/api/backup';
      }
    }
  });

  if (WB_LOCAL && window.WBLocal) {
    const exportMd = $('#btnExportMd');
    if (exportMd) exportMd.addEventListener('click', function () {
      window.WBLocal.download('markdown-zip').catch(function (err) { toast(err.message || '导出失败', 'error'); });
    });
    const exportJson = $('#btnExportJson');
    if (exportJson) exportJson.addEventListener('click', function () {
      window.WBLocal.download('json').catch(function (err) { toast(err.message || '导出失败', 'error'); });
    });
    const importInput = $('#importFile');
    if (importInput) importInput.addEventListener('change', async function () {
      const file = importInput.files && importInput.files[0];
      importInput.value = '';
      if (!file) return;
      const ok = await confirmDialog({
        title: '导入备份？',
        message: '导入会覆盖手机里现在的所有错题和复习记录，确定继续吗？',
        okText: '覆盖导入',
        cancelText: '取消',
        danger: true
      });
      if (!ok) return;
      try {
        const result = await window.WBLocal.importFile(file);
        toast('已导入 ' + result.questions + ' 道错题' + (result.images ? '、' + result.images + ' 张原图' : ''), 'success');
        await refreshBootstrap();
        navigate('#/notebook');
      } catch (err) {
        toast(err.message || '导入失败', 'error');
      }
    });
  }
}

async function testAIConnection() {
  const btn = $('#btnTestAI');
  const box = $('#aiTestResult');
  if (!btn || !box) return;
  btn.disabled = true;
  btn.classList.add('loading');
  box.hidden = true;
  try {
    const r = await api('/api/settings/test-ai', { method: 'POST', body: {} });
    box.hidden = false;
    box.className = 'test-result ' + (r.ok ? 'ok' : 'bad');
    box.textContent = (r.ok ? '连接成功：' : '连接失败：') + (r.message || '') +
      (r.latency_ms !== undefined && r.latency_ms !== null ? '（' + r.latency_ms + ' ms）' : '');
  } catch (err) {
    box.hidden = false;
    box.className = 'test-result bad';
    box.textContent = err.message || '测试失败';
  }
  btn.disabled = false;
  btn.classList.remove('loading');
}

async function saveAISettings() {
  const base = ($('#aiBase').value || '').trim();
  const model = ($('#aiModel').value || '').trim();
  const key = ($('#aiKey').value || '').trim();
  const timeout = Number($('#aiTimeout').value) || 60;
  const presetKey = $('#aiPreset').value;
  const provider = presetKey === 'custom' ? 'custom' : presetKey;
  if (!base || !model) { toast('请填写 Base URL 和模型名', 'error'); return; }
  if (timeout < 5 || timeout > 300) { toast('超时需在 5~300 秒之间', 'error'); return; }
  const aiBody = { provider: provider, base_url: base, model: model, timeout_sec: timeout };
  if (key) aiBody.api_key = key;
  try {
    await api('/api/settings', { method: 'PUT', body: { ai: aiBody } });
    toast('AI 设置已保存', 'success');
    await refreshBootstrap();
    reloadSettings();
  } catch (err) {
    toast(err.message || '保存失败', 'error');
  }
}

/* ======================= 11. 启动 ======================= */

async function boot() {
  if (!tabbar.innerHTML) renderTabbar();
  appbar.hidden = false;
  tabbar.hidden = false;
  if (!location.hash) {
    try { history.replaceState(null, '', '#/today'); } catch (e) { /* ignore */ }
    state.lastHash = '#/today';
  }
  try {
    state.boot = await api('/api/bootstrap');
    state.bootError = null;
  } catch (err) {
    state.boot = null;
    state.bootError = err;
    setAppbar({ title: '错题本' });
    updateActiveTab('today');
    showPageError(err, function () { boot(); });
    return;
  }
  route();
}

window.__katexReady = function () {
  if (!state.boot || !state.path) return;
  if (state.guard) return;
  if (state.path === '/review' || state.path === '/capture' || state.path === '/settings') return;
  if (state.path.indexOf('/edit/') === 0) return;
  if (main.innerHTML.indexOf('$') === -1) return;
  route();
};

boot();

