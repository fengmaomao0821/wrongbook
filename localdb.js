/* =====================================================================
 * 错题本 · 手机本地版「后端」
 * 用 IndexedDB 实现与 server.py 相同的 /api/* 契约，数据只保存在本机。
 * 由 app.js 通过 window.WBLocal 调用（预览/开发时 WB_LOCAL=true）。
 * ===================================================================== */
(function () {
  'use strict';

  const VERSION = '1.0.0-pwa';
  const DB_NAME = 'wrongbook';
  const DB_VERSION = 1;

  const SUBJECT_PRESETS = [
    ['数学', '#2f6fed'], ['语文', '#e05252'], ['英语', '#7c3aed'], ['物理', '#0891b2'],
    ['化学', '#16a34a'], ['生物', '#65a30d'], ['历史', '#b45309'], ['地理', '#0d9488'],
    ['政治', '#be123c'], ['其他', '#6b7280']
  ];
  const ERROR_CAUSES = [
    ['concept', '概念不清'], ['reading', '审题不清'], ['calculation', '计算失误'],
    ['method', '方法不当'], ['expression', '表达不规范'], ['memory', '知识点遗忘'],
    ['careless', '粗心'], ['other', '其他']
  ];
  const QUESTION_TYPES = [
    ['choice', '选择题'], ['blank', '填空题'], ['judge', '判断题'], ['solve', '解答题'],
    ['calc', '计算题'], ['essay', '作文'], ['experiment', '实验题'], ['other', '其他']
  ];
  const STATUS_LABEL = { new: '待复习', reviewing: '复习中', mastered: '已掌握' };
  const STAGE_LABEL = { queued: '排队中', ocr: '本地 OCR 识别中', ai: 'AI 分析中', done: '已完成' };
  const ERROR_CAUSE_LABEL = Object.fromEntries(ERROR_CAUSES);
  const ERROR_CAUSE_CODE = Object.fromEntries(ERROR_CAUSES.map(function (x) { return [x[1], x[0]]; }));
  const QUESTION_TYPE_LABEL = Object.fromEntries(QUESTION_TYPES);
  const QUESTION_TYPE_CODE = Object.fromEntries(QUESTION_TYPES.map(function (x) { return [x[1], x[0]]; }));

  const DEFAULT_SETTINGS = {
    ai: {
      provider: 'dashscope',
      base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-vl-plus',
      api_key: '',
      timeout_sec: 90
    },
    review: { intervals: [1, 2, 4, 7, 15, 30, 60], mastery_streak: 4 },
    student: { name: '', grade: '初中' }
  };

  /* ------------------------------------------------------------------ */
  /* IndexedDB 基础                                                      */
  /* ------------------------------------------------------------------ */

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains('subjects')) db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('questions')) db.createObjectStore('questions', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('plans')) db.createObjectStore('plans', { keyPath: 'question_id' });
        if (!db.objectStoreNames.contains('reviews')) db.createObjectStore('reviews', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('tasks')) db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function getAll(storeName) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getOne(storeName, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function addOne(storeName, value) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).add(value);
        tx.oncomplete = function () { resolve(req.result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  function putOne(storeName, value) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  function delOne(storeName, key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /** 多 store 事务：fn(tx, capture) 内同步提交请求，事务完成时 resolve(捕获值)。 */
  function writeTx(stores, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(stores, 'readwrite');
        let captured;
        try {
          fn(tx, function (value) { captured = value; });
        } catch (err) {
          reject(err);
          return;
        }
        tx.oncomplete = function () { resolve(captured); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 时间 / 工具                                                         */
  /* ------------------------------------------------------------------ */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
  function todayStr() { return ymd(new Date()); }
  function dateShift(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return ymd(date);
  }
  function nowIso() {
    const date = new Date();
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    return ymd(date) + 'T' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds()) +
      sign + pad2(Math.floor(abs / 60)) + ':' + pad2(abs % 60);
  }
  function toInt(value, fallback) {
    const num = parseInt(value, 10);
    return Number.isFinite(num) ? num : fallback;
  }
  function clip(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function escapeRe(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function httpError(message, status) {
    const error = new Error(message);
    error.status = status || 400;
    return error;
  }

  function preview(text, limit) {
    let value = String(text || '').trim().replace(/\s+/g, ' ');
    const cap = limit || 120;
    if (value.length > cap) value = value.slice(0, cap) + '…';
    return value;
  }

  /* ------------------------------------------------------------------ */
  /* 设置                                                               */
  /* ------------------------------------------------------------------ */

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  async function getSettingsRaw() {
    const rows = await getAll('settings');
    const map = {};
    rows.forEach(function (row) { map[row.key] = row.value; });
    return map;
  }

  function mergeSettings(raw) {
    const result = {};
    Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
      result[key] = Object.assign(clone(DEFAULT_SETTINGS[key]), (raw && raw[key] && typeof raw[key] === 'object') ? raw[key] : {});
    });
    return result;
  }

  async function getSettings() {
    return mergeSettings(await getSettingsRaw());
  }

  function setSetting(key, value) {
    return putOne('settings', { key: key, value: value });
  }

  function maskKey(key) {
    return key ? '****' + String(key).slice(-4) : '';
  }

  async function settingsPayload() {
    const settings = await getSettings();
    const ai = Object.assign({}, settings.ai);
    const key = ai.api_key || '';
    delete ai.api_key;
    ai.has_key = !!key;
    ai.api_key_masked = maskKey(key);
    return {
      ai: ai,
      review: settings.review,
      student: settings.student,
      ocr: { available: false, engine: 'none', language: '', local: true }
    };
  }

  /* ------------------------------------------------------------------ */
  /* 图片：压缩、缩略图、对象 URL                                        */
  /* ------------------------------------------------------------------ */

  const urlCache = new Map();
  const imageCache = new Map();

  function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('读取图片失败')); };
      reader.readAsDataURL(blob);
    });
  }

  async function decodeImage(source) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(source); } catch (err) { /* 回退 */ }
    }
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(source);
      const image = new Image();
      image.onload = function () { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('无法解析图片格式（HEIC 等格式请先在相册里转成 JPEG 或截图后上传）'));
      };
      image.src = url;
    });
  }

  async function toJpeg(bitmap, maxSide, quality) {
    const w0 = bitmap.width || bitmap.naturalWidth || 1;
    const h0 = bitmap.height || bitmap.naturalHeight || 1;
    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    const width = Math.max(1, Math.round(w0 * scale));
    const height = Math.max(1, Math.round(h0 * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', quality); });
    if (!blob) throw new Error('图片压缩失败，请重试');
    return { blob: blob, width: width, height: height };
  }

  async function compressFile(file, maxSide, quality) {
    const bitmap = await decodeImage(file);
    return toJpeg(bitmap, maxSide, quality);
  }

  function imageURLFor(rec, thumb) {
    if (!rec) return '';
    const key = (thumb ? 't' : 'f') + rec.id;
    if (urlCache.has(key)) return urlCache.get(key);
    const blob = (thumb && rec.thumb) ? rec.thumb : rec.blob;
    let url = '';
    try { url = URL.createObjectURL(blob); } catch (err) { url = ''; }
    urlCache.set(key, url);
    return url;
  }

  async function getImage(id) {
    if (imageCache.has(id)) return imageCache.get(id);
    const rec = await getOne('images', id);
    if (rec) imageCache.set(id, rec);
    return rec;
  }

  function dropImageCache(id) {
    imageCache.delete(id);
    ['f', 't'].forEach(function (prefix) {
      const key = prefix + id;
      if (urlCache.has(key)) {
        try { URL.revokeObjectURL(urlCache.get(key)); } catch (err) { /* ignore */ }
        urlCache.delete(key);
      }
    });
  }

  async function imageMeta(rec) {
    return {
      id: rec.id,
      url: imageURLFor(rec, false),
      thumb_url: imageURLFor(rec, true),
      kind: rec.kind || 'original',
      width: rec.width,
      height: rec.height
    };
  }

  async function aiImageDataURL(id) {
    const rec = await getImage(id);
    if (!rec) throw new Error('图片不存在');
    const bitmap = await decodeImage(rec.blob);
    const small = await toJpeg(bitmap, 1600, 0.82);
    return blobToDataURL(small.blob);
  }

  async function uploadImage(formData) {
    const file = formData.get('file');
    if (!file) throw httpError('没有收到图片');
    let full;
    try {
      full = await compressFile(file, 2400, 0.86);
    } catch (err) {
      throw httpError(err.message || '图片处理失败');
    }
    let thumbBlob = null;
    try {
      const thumbBitmap = await decodeImage(full.blob);
      thumbBlob = (await toJpeg(thumbBitmap, 400, 0.78)).blob;
    } catch (err) {
      thumbBlob = full.blob;
    }
    const rec = {
      blob: full.blob,
      thumb: thumbBlob,
      width: full.width,
      height: full.height,
      kind: 'original',
      created_at: nowIso()
    };
    try {
      rec.id = await addOne('images', rec);
    } catch (err) {
      throw httpError('保存图片失败：手机存储空间可能已满');
    }
    imageCache.set(rec.id, rec);
    return {
      id: rec.id,
      url: imageURLFor(rec, false),
      thumb_url: imageURLFor(rec, true),
      width: rec.width,
      height: rec.height
    };
  }

  /* ------------------------------------------------------------------ */
  /* 题目：序列化 / 查询 / 增删改                                        */
  /* ------------------------------------------------------------------ */

  async function subjectMap() {
    const rows = await getAll('subjects');
    const map = {};
    rows.forEach(function (row) { map[row.id] = row; });
    return map;
  }

  function planPayload(plan) {
    return {
      stage: plan.stage,
      interval_days: plan.interval_days,
      next_due: plan.next_due,
      last_reviewed_at: plan.last_reviewed_at || null,
      streak: plan.streak,
      lapses: plan.lapses,
      overdue_days: overdueDays(plan.next_due)
    };
  }

  async function serializeQuestion(question, detail) {
    if (!question) return null;
    const subjects = await subjectMap();
    const subject = subjects[question.subject_id] || { name: '', color: '#6b7280' };
    const images = [];
    for (const imageId of (question.image_ids || [])) {
      const rec = await getImage(imageId);
      if (rec) images.push(await imageMeta(rec));
    }
    const plan = await getOne('plans', question.id);
    const data = {
      id: question.id,
      subject_id: question.subject_id,
      subject_name: subject.name,
      subject_color: subject.color,
      exam_name: question.exam_name || null,
      exam_date: question.exam_date || null,
      stem: question.stem,
      student_answer: question.student_answer || null,
      correct_answer: question.correct_answer || null,
      analysis: question.analysis || null,
      knowledge_points: question.knowledge_points || [],
      error_cause: question.error_cause || '',
      error_cause_label: ERROR_CAUSE_LABEL[question.error_cause] || '',
      error_advice: question.error_advice || null,
      difficulty: question.difficulty || 3,
      question_type: question.question_type || '',
      question_type_label: QUESTION_TYPE_LABEL[question.question_type] || '',
      status: question.status || 'new',
      status_label: STATUS_LABEL[question.status] || '',
      created_at: question.created_at,
      updated_at: question.updated_at,
      images: images
    };
    if (plan) data.plan = planPayload(plan);
    if (detail) {
      const reviews = (await getAll('reviews')).filter(function (r) { return r.question_id === question.id; });
      reviews.sort(function (a, b) { return b.id - a.id; });
      data.reviews = reviews.slice(0, 30).map(function (r) {
        return { id: r.id, result: r.result, reviewed_at: r.reviewed_at, note: r.note || null };
      });
      data.ai_raw = question.ai_raw || null;
      data.ocr_text = question.ocr_text || null;
      data.engine = question.engine || null;
    }
    return data;
  }

  function cleanKnowledgePoints(value) {
    let parts = [];
    if (Array.isArray(value)) parts = value.slice();
    else if (typeof value === 'string') parts = value.split(/[,，、;；]/);
    const result = [];
    parts.forEach(function (part) {
      const text = String(part).trim();
      if (text && result.indexOf(text) < 0) result.push(text);
    });
    return result.slice(0, 8);
  }

  async function createQuestion(data) {
    const subjectId = toInt(data.subject_id, 0);
    const subjects = await subjectMap();
    if (!subjects[subjectId]) throw httpError('科目不存在，请先选择科目');
    const stem = String(data.stem || '').trim();
    if (!stem) throw httpError('题干不能为空');
    const cause = ERROR_CAUSE_LABEL[data.error_cause] ? data.error_cause : '';
    const type = QUESTION_TYPE_LABEL[data.question_type] ? data.question_type : '';
    const now = nowIso();
    const imageIds = [];
    for (const raw of (data.image_ids || [])) {
      const id = toInt(raw, 0);
      if (id && await getImage(id)) imageIds.push(id);
    }
    const record = {
      subject_id: subjectId,
      exam_name: String(data.exam_name || '').trim() || null,
      exam_date: String(data.exam_date || '').trim() || null,
      stem: stem,
      student_answer: String(data.student_answer || '').trim() || null,
      correct_answer: String(data.correct_answer || '').trim() || null,
      analysis: String(data.analysis || '').trim() || null,
      knowledge_points: cleanKnowledgePoints(data.knowledge_points),
      error_cause: cause,
      error_advice: String(data.error_advice || '').trim() || null,
      difficulty: clip(toInt(data.difficulty, 3), 1, 5),
      question_type: type,
      status: 'new',
      ai_raw: data.ai_raw || null,
      ocr_text: data.ocr_text || null,
      engine: data.engine || null,
      image_ids: imageIds,
      created_at: now,
      updated_at: now
    };
    const questionId = await writeTx(['questions', 'plans'], function (tx, capture) {
      const req = tx.objectStore('questions').add(record);
      req.onsuccess = function () {
        const id = req.result;
        tx.objectStore('plans').put({
          question_id: id,
          stage: 0,
          interval_days: 1,
          next_due: dateShift(1),
          last_reviewed_at: null,
          streak: 0,
          lapses: 0
        });
        capture(id);
      };
    });
    return questionId;
  }

  async function updateQuestion(questionId, data) {
    const question = await getOne('questions', questionId);
    if (!question) throw httpError('错题不存在', 404);
    const patch = Object.assign({}, question);
    if ('subject_id' in data) {
      const subjectId = toInt(data.subject_id, 0);
      const subjects = await subjectMap();
      if (!subjects[subjectId]) throw httpError('科目不存在');
      patch.subject_id = subjectId;
    }
    ['exam_name', 'exam_date'].forEach(function (key) {
      if (key in data) patch[key] = String(data[key] || '').trim() || null;
    });
    if ('stem' in data) {
      const stem = String(data.stem || '').trim();
      if (!stem) throw httpError('题干不能为空');
      patch.stem = stem;
    }
    ['student_answer', 'correct_answer', 'analysis'].forEach(function (key) {
      if (key in data) patch[key] = String(data[key] || '').trim() || null;
    });
    if ('knowledge_points' in data) patch.knowledge_points = cleanKnowledgePoints(data.knowledge_points);
    if ('error_cause' in data) patch.error_cause = ERROR_CAUSE_LABEL[data.error_cause] ? data.error_cause : '';
    if ('error_advice' in data) patch.error_advice = String(data.error_advice || '').trim() || null;
    if ('difficulty' in data) patch.difficulty = clip(toInt(data.difficulty, 3), 1, 5);
    if ('question_type' in data) patch.question_type = QUESTION_TYPE_LABEL[data.question_type] ? data.question_type : '';
    if ('status' in data && STATUS_LABEL[data.status]) patch.status = data.status;
    if ('image_ids' in data) {
      const ids = [];
      for (const raw of (data.image_ids || [])) {
        const id = toInt(raw, 0);
        if (id && await getImage(id)) ids.push(id);
      }
      patch.image_ids = ids;
    }
    patch.id = questionId;
    patch.updated_at = nowIso();
    await putOne('questions', patch);
    return true;
  }

  async function deleteQuestion(questionId) {
    const question = await getOne('questions', questionId);
    if (!question) throw httpError('错题不存在', 404);
    for (const imageId of (question.image_ids || [])) {
      dropImageCache(imageId);
      await delOne('images', imageId);
    }
    const reviews = await getAll('reviews');
    await writeTx(['questions', 'plans', 'reviews'], function (tx) {
      tx.objectStore('questions').delete(questionId);
      tx.objectStore('plans').delete(questionId);
      reviews.forEach(function (row) {
        if (row.question_id === questionId) tx.objectStore('reviews').delete(row.id);
      });
    });
  }

  async function listQuestions(params) {
    const questions = await getAll('questions');
    let plans = {};
    (await getAll('plans')).forEach(function (plan) { plans[plan.question_id] = plan; });
    const subjects = await subjectMap();
    let rows = questions.slice();

    if (params.subject_id) {
      const subjectId = toInt(params.subject_id, -1);
      rows = rows.filter(function (q) { return q.subject_id === subjectId; });
    }
    if (params.status) {
      if (!STATUS_LABEL[params.status]) throw httpError('status 不合法');
      rows = rows.filter(function (q) { return q.status === params.status; });
    }
    if (params.cause) {
      if (!ERROR_CAUSE_LABEL[params.cause]) throw httpError('cause 不合法');
      rows = rows.filter(function (q) { return q.error_cause === params.cause; });
    }
    const keyword = String(params.q || '').trim().toLowerCase();
    if (keyword) {
      rows = rows.filter(function (q) {
        return [q.stem, q.student_answer, q.correct_answer, (q.knowledge_points || []).join(' ')]
          .some(function (text) { return String(text || '').toLowerCase().indexOf(keyword) >= 0; });
      });
    }
    if (params.from) rows = rows.filter(function (q) { return String(q.created_at || '').slice(0, 10) >= params.from; });
    if (params.to) rows = rows.filter(function (q) { return String(q.created_at || '').slice(0, 10) <= params.to; });

    const sort = params.sort || 'created_desc';
    rows.sort(function (a, b) {
      if (sort === 'due_asc') {
        const da = (plans[a.id] && plans[a.id].next_due) || '9999-12-31';
        const db = (plans[b.id] && plans[b.id].next_due) || '9999-12-31';
        return da < db ? -1 : da > db ? 1 : b.id - a.id;
      }
      if (sort === 'lapses_desc') {
        const la = (plans[a.id] && plans[a.id].lapses) || 0;
        const lb = (plans[b.id] && plans[b.id].lapses) || 0;
        return lb - la || b.id - a.id;
      }
      return String(b.created_at || '').localeCompare(String(a.created_at || '')) || b.id - a.id;
    });

    const total = rows.length;
    const limit = clip(toInt(params.limit, 30), 1, 100);
    const offset = Math.max(0, toInt(params.offset, 0));
    rows = rows.slice(offset, offset + limit);

    const items = [];
    for (const q of rows) {
      const subject = subjects[q.subject_id] || { name: '', color: '#6b7280' };
      let thumb = null;
      if ((q.image_ids || []).length) {
        const rec = await getImage(q.image_ids[0]);
        if (rec) thumb = imageURLFor(rec, true);
      }
      const plan = plans[q.id];
      items.push({
        id: q.id,
        subject_id: q.subject_id,
        subject_name: subject.name,
        subject_color: subject.color,
        stem_preview: preview(q.stem),
        knowledge_points: q.knowledge_points || [],
        error_cause: q.error_cause || '',
        error_cause_label: ERROR_CAUSE_LABEL[q.error_cause] || '',
        status: q.status,
        status_label: STATUS_LABEL[q.status] || '',
        difficulty: q.difficulty,
        thumb_url: thumb,
        created_at: q.created_at,
        next_due: plan ? plan.next_due : null,
        overdue_days: plan ? overdueDays(plan.next_due) : 0,
        lapses: plan ? plan.lapses : 0
      });
    }
    return { total: total, items: items };
  }

  function normalizeText(text) {
    return String(text || '').toLowerCase().replace(/[\s\W_]+/g, '');
  }

  function bigramScore(a, b) {
    const A = normalizeText(a).slice(0, 600);
    const B = normalizeText(b).slice(0, 600);
    if (!A || !B) return 0;
    if (A === B) return 1;
    if (A.length < 2 || B.length < 2) return A === B ? 1 : 0;
    const grams = new Map();
    for (let i = 0; i < A.length - 1; i++) {
      const gram = A.slice(i, i + 2);
      grams.set(gram, (grams.get(gram) || 0) + 1);
    }
    let hit = 0;
    let total = 0;
    for (let i = 0; i < B.length - 1; i++) {
      const gram = B.slice(i, i + 2);
      total++;
      const count = grams.get(gram) || 0;
      if (count > 0) {
        hit++;
        grams.set(gram, count - 1);
      }
    }
    const grammarTotal = Math.max(1, (A.length - 1) + total);
    return (2 * hit) / grammarTotal;
  }

  async function similarQuestions(stem, excludeId) {
    if (!String(stem || '').trim()) return [];
    const questions = await getAll('questions');
    const scored = [];
    for (const q of questions) {
      if (excludeId && q.id === excludeId) continue;
      const score = bigramScore(stem, q.stem);
      if (score >= 0.55) scored.push({ score: score, question: q });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 3).map(function (item) {
      return { id: item.question.id, stem_preview: preview(item.question.stem), score: Math.round(item.score * 1000) / 1000 };
    });
  }

  /* ------------------------------------------------------------------ */
  /* 复习引擎                                                            */
  /* ------------------------------------------------------------------ */

  function intervalsOf(settings) {
    const list = (settings.review && settings.review.intervals) || DEFAULT_SETTINGS.review.intervals;
    const values = list.map(function (x) { return toInt(x, 0); }).filter(function (x) { return x > 0; });
    return values.length ? values : DEFAULT_SETTINGS.review.intervals;
  }
  function masteryOf(settings) {
    return clip(toInt(settings.review && settings.review.mastery_streak, 4), 1, 20);
  }
  function overdueDays(nextDue) {
    if (!nextDue) return 0;
    const due = new Date(nextDue + 'T00:00:00');
    const now = new Date(todayStr() + 'T00:00:00');
    const diff = Math.round((now - due) / 86400000);
    return Math.max(0, diff);
  }

  async function todayItems(limit) {
    const questions = await getAll('questions');
    const plans = await getAll('plans');
    const planMap = {};
    plans.forEach(function (p) { planMap[p.question_id] = p; });
    const subjects = await subjectMap();
    const items = [];
    const cap = limit || 500;
    for (const q of questions) {
      const plan = planMap[q.id];
      if (!plan || plan.next_due > todayStr()) continue;
      if (q.status === 'mastered') continue;
      const subject = subjects[q.subject_id] || { name: '', color: '#6b7280' };
      items.push({
        id: q.id,
        subject_name: subject.name,
        subject_color: subject.color,
        stem_preview: preview(q.stem, 100),
        status: q.status,
        stage: plan.stage,
        next_due: plan.next_due,
        overdue_days: overdueDays(plan.next_due),
        lapses: plan.lapses,
        streak: plan.streak
      });
    }
    items.sort(function (a, b) {
      if (a.next_due !== b.next_due) return a.next_due < b.next_due ? -1 : 1;
      return a.id - b.id;
    });
    return items.slice(0, cap);
  }

  async function applyReview(questionId, result, note) {
    if (['correct', 'wrong', 'postpone', 'master'].indexOf(result) < 0) throw httpError('无效的复习结果');
    const settings = await getSettings();
    const intervals = intervalsOf(settings);
    const mastery = masteryOf(settings);
    const question = await getOne('questions', questionId);
    if (!question) throw httpError('错题不存在', 404);
    let plan = await getOne('plans', questionId);
    if (!plan) {
      await putOne('plans', {
        question_id: questionId, stage: 0, interval_days: 1, next_due: dateShift(1),
        last_reviewed_at: null, streak: 0, lapses: 0
      });
      plan = await getOne('plans', questionId);
    }
    let stage = plan.stage;
    let streak = plan.streak;
    let lapses = plan.lapses;
    let interval = plan.interval_days;
    let nextDue = plan.next_due;
    let status = question.status;

    if (result === 'correct') {
      stage = Math.min(stage + 1, intervals.length - 1);
      interval = intervals[stage];
      nextDue = dateShift(interval);
      streak += 1;
      status = streak >= mastery ? 'mastered' : 'reviewing';
    } else if (result === 'wrong') {
      stage = 0;
      interval = intervals[0];
      nextDue = dateShift(interval);
      streak = 0;
      lapses += 1;
      status = 'reviewing';
    } else if (result === 'postpone') {
      nextDue = dateShift(1);
    } else {
      interval = plan.interval_days;
      nextDue = dateShift(365);
      streak = Math.max(streak, mastery);
      status = 'mastered';
    }

    await writeTx(['plans', 'questions', 'reviews'], function (tx, capture) {
      tx.objectStore('plans').put({
        question_id: questionId,
        stage: stage,
        interval_days: interval,
        next_due: nextDue,
        last_reviewed_at: nowIso(),
        streak: streak,
        lapses: lapses
      });
      tx.objectStore('questions').put(Object.assign({}, question, { status: status, updated_at: nowIso() }));
      const req = tx.objectStore('reviews').add({
        question_id: questionId,
        result: result,
        reviewed_at: nowIso(),
        note: note || null
      });
      req.onsuccess = function () { capture(req.result); };
    });
    return {
      status: status,
      stage: stage,
      streak: streak,
      lapses: lapses,
      next_due: nextDue,
      mastered: status === 'mastered'
    };
  }

  async function setMastered(questionId, mastered) {
    const question = await getOne('questions', questionId);
    if (!question) throw httpError('错题不存在', 404);
    const settings = await getSettings();
    let plan = await getOne('plans', questionId);
    if (!plan) {
      await putOne('plans', {
        question_id: questionId, stage: 0, interval_days: 1, next_due: dateShift(1),
        last_reviewed_at: null, streak: 0, lapses: 0
      });
      plan = await getOne('plans', questionId);
    }
    if (mastered) {
      const streak = Math.max(plan.streak, masteryOf(settings));
      await writeTx(['plans', 'questions', 'reviews'], function (tx) {
        tx.objectStore('plans').put(Object.assign({}, plan, {
          streak: streak, next_due: dateShift(365), last_reviewed_at: nowIso()
        }));
        tx.objectStore('questions').put(Object.assign({}, question, { status: 'mastered', updated_at: nowIso() }));
        tx.objectStore('reviews').add({ question_id: questionId, result: 'master', reviewed_at: nowIso(), note: '手动标记已掌握' });
      });
      return 'mastered';
    }
    await writeTx(['plans', 'questions'], function (tx) {
      tx.objectStore('plans').put(Object.assign({}, plan, { next_due: dateShift(1) }));
      tx.objectStore('questions').put(Object.assign({}, question, { status: 'reviewing', updated_at: nowIso() }));
    });
    return 'reviewing';
  }

  /* ------------------------------------------------------------------ */
  /* 统计                                                                */
  /* ------------------------------------------------------------------ */

  function inRange(createdAt, since) {
    return !since || String(createdAt || '').slice(0, 10) >= since;
  }

  async function dueStats() {
    const questions = await getAll('questions');
    const plans = await getAll('plans');
    const planMap = {};
    plans.forEach(function (p) { planMap[p.question_id] = p; });
    let due = 0;
    let overdue = 0;
    questions.forEach(function (q) {
      if (q.status === 'mastered') return;
      const plan = planMap[q.id];
      if (!plan) return;
      if (plan.next_due <= todayStr()) due++;
      if (plan.next_due < todayStr()) overdue++;
    });
    return { due: due, overdue: overdue };
  }

  async function counts() {
    const questions = await getAll('questions');
    const result = { total: questions.length, new: 0, reviewing: 0, mastered: 0, due: 0 };
    questions.forEach(function (q) {
      if (result[q.status] !== undefined) result[q.status]++;
    });
    result.due = (await dueStats()).due;
    return result;
  }

  async function reviewedToday() {
    const today = todayStr();
    const reviews = await getAll('reviews');
    return reviews.filter(function (r) {
      return String(r.reviewed_at || '').slice(0, 10) === today && (r.result === 'correct' || r.result === 'wrong');
    }).length;
  }

  async function subjectList() {
    const subjects = await getAll('subjects');
    const questions = await getAll('questions');
    const plans = await getAll('plans');
    const planMap = {};
    plans.forEach(function (p) { planMap[p.question_id] = p; });
    const result = subjects.map(function (subject) {
      const list = questions.filter(function (q) { return q.subject_id === subject.id; });
      const due = list.filter(function (q) {
        const plan = planMap[q.id];
        return q.status !== 'mastered' && plan && plan.next_due <= todayStr();
      }).length;
      return { id: subject.id, name: subject.name, color: subject.color, total: list.length, due: due };
    });
    result.sort(function (a, b) { return a.id - b.id; });
    return result;
  }

  async function stats(rangeKey, subjectId) {
    const settings = await getSettings();
    const reviewSettings = settings.review;
    const range = String(rangeKey || '30');
    const days = range === '7' ? 7 : range === '30' ? 30 : null;
    const since = days ? dateShift(-(days - 1)) : null;
    const questions = (await getAll('questions')).filter(function (q) {
      return inRange(q.created_at, since) && (!subjectId || q.subject_id === subjectId);
    });
    const plans = await getAll('plans');
    const planMap = {};
    plans.forEach(function (p) { planMap[p.question_id] = p; });
    const subjects = await subjectMap();
    const reviews = await getAll('reviews');

    const result = {
      range: range,
      counts: { total: questions.length, mastered: 0, new: 0, reviewing: 0, due: 0 },
      reviewed_today: await reviewedToday(),
      mastery_rate: 0,
      by_subject: [],
      by_cause: [],
      trend: [],
      weak_kp: [],
      repeat_wrong: []
    };
    questions.forEach(function (q) {
      if (result.counts[q.status] !== undefined) result.counts[q.status]++;
    });
    result.counts.due = (await dueStats()).due;
    result.mastery_rate = questions.length ? Math.round((result.counts.mastered / questions.length) * 10000) / 10000 : 0;

    const subjectAgg = {};
    questions.forEach(function (q) {
      const subject = subjects[q.subject_id] || { name: '其他', color: '#6b7280' };
      const entry = subjectAgg[q.subject_id] || { subject_id: q.subject_id, name: subject.name, color: subject.color, total: 0, mastered: 0 };
      entry.total++;
      if (q.status === 'mastered') entry.mastered++;
      subjectAgg[q.subject_id] = entry;
    });
    result.by_subject = Object.values(subjectAgg).sort(function (a, b) { return b.total - a.total; });

    const causeAgg = {};
    questions.forEach(function (q) {
      if (!q.error_cause) return;
      causeAgg[q.error_cause] = (causeAgg[q.error_cause] || 0) + 1;
    });
    result.by_cause = Object.keys(causeAgg).map(function (code) {
      return { cause: code, label: ERROR_CAUSE_LABEL[code] || code, count: causeAgg[code] };
    }).sort(function (a, b) { return b.count - a.count; });

    const trendDays = days || 14;
    const createdMap = {};
    const reviewedMap = {};
    questions.forEach(function (q) {
      const date = String(q.created_at || '').slice(0, 10);
      if (date >= dateShift(-(trendDays - 1))) createdMap[date] = (createdMap[date] || 0) + 1;
    });
    const questionIds = new Set(questions.map(function (q) { return q.id; }));
    reviews.forEach(function (r) {
      const date = String(r.reviewed_at || '').slice(0, 10);
      if (date < dateShift(-(trendDays - 1))) return;
      if (!questionIds.has(r.question_id)) return;
      reviewedMap[date] = (reviewedMap[date] || 0) + 1;
    });
    for (let offset = trendDays - 1; offset >= 0; offset--) {
      const date = dateShift(-offset);
      result.trend.push({ date: date, created: createdMap[date] || 0, reviewed: reviewedMap[date] || 0 });
    }

    const kpMap = {};
    questions.forEach(function (q) {
      (q.knowledge_points || []).forEach(function (name) {
        const entry = kpMap[name] || { name: name, total: 0, due: 0 };
        entry.total++;
        if (q.status !== 'mastered') entry.due++;
        kpMap[name] = entry;
      });
    });
    result.weak_kp = Object.values(kpMap)
      .sort(function (a, b) { return b.due - a.due || b.total - a.total; })
      .slice(0, 10);

    result.repeat_wrong = questions
      .filter(function (q) { return (planMap[q.id] || {}).lapses > 0; })
      .sort(function (a, b) { return (planMap[b.id].lapses - planMap[a.id].lapses) || (b.id - a.id); })
      .slice(0, 10)
      .map(function (q) {
        const subject = subjects[q.subject_id] || { name: '' };
        return { id: q.id, stem_preview: preview(q.stem, 80), lapses: planMap[q.id].lapses, subject_name: subject.name };
      });
    return result;
  }

  /* ------------------------------------------------------------------ */
  /* AI 识别                                                             */
  /* ------------------------------------------------------------------ */

  const SYSTEM_PROMPT = '你是一位经验丰富的中小学老师，擅长从学生作业/试卷的照片里整理错题。'
    + '你的任务是：识别图片中的题目和学生的原始作答，判断科目与错因，并给出正确答案和简明解析。'
    + '你只输出一个 JSON 对象，不要输出解释、不要用代码块包裹、不要输出 JSON 以外的任何字符。';

  function buildAiMessages(subjectNames, grade, imageDataURLs) {
    const studentInfo = grade ? '学生年级：' + grade + '。' : '';
    const prompt = '请整理这张错题照片，只输出一个 JSON 对象，字段如下：\n'
      + '- subject：科目，必须从这些里选一个：' + subjectNames.join('、') + '\n'
      + '- stem：完整题干（保留题号、选项、公式；公式用 LaTeX，例如 $x^2+1$）\n'
      + '- student_answer：学生在这道题上的原始作答/错误过程，原样保留（包括错误的步骤）；没有作答就填空字符串\n'
      + '- correct_answer：正确答案\n'
      + '- analysis：简明解析（2~5 步，讲清关键思路）\n'
      + '- knowledge_points：知识点数组（1~3 个短语）\n'
      + '- error_cause：错因，必须从这些里选一个：concept 概念不清 / reading 审题不清 / calculation 计算失误 / method 方法不当 / expression 表达不规范 / memory 知识点遗忘 / careless 粗心 / other 其他；无法判断填空字符串\n'
      + '- error_advice：针对这个错因的一句具体建议（30 字以内）\n'
      + '- difficulty：难度 1~5 的整数（3 为中等）\n'
      + '- question_type：题型，必须从 choice 选择题 / blank 填空题 / judge 判断题 / solve 解答题 / calc 计算题 / essay 作文 / experiment 实验题 / other 其他 里选一个\n'
      + '- exam_name：如果图片上有试卷/考试名称就填，否则 null\n'
      + '- confidence：你对自己识别的把握 0~1\n'
      + '- warnings：字符串数组，列出识别不准、需要人工核对的地方；没有就 []\n\n'
      + '规则：\n'
      + '1. 只整理图片中最主要、完整的一道题；如果图里有多道题，把其余题的说明写进 warnings。\n'
      + '2. 学生作答必须保留原话，不要纠正、不要美化。\n'
      + '3. 如果图片上已印有标准答案，优先采用；否则请你独立解答。\n'
      + '4. 看不清的字段留空，不要编造。\n'
      + studentInfo;
    const content = [{ type: 'text', text: prompt }];
    imageDataURLs.forEach(function (url) {
      content.push({ type: 'image_url', image_url: { url: url } });
    });
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: content }
    ];
  }

  function httpErrorPrefix(status) {
    if (status === 401) return 'API Key 无效或已过期（401）';
    if (status === 403) return '没有权限访问该模型（403），请确认模型已开通';
    if (status === 404) return '接口或模型不存在（404），请检查 Base URL 和模型名称';
    if (status === 429) return '调用太频繁或额度用尽（429）';
    if (status >= 500) return 'AI 服务暂时不可用（' + status + '）';
    return 'AI 接口返回 ' + status;
  }

  async function callAI(settings, messages, maxTokens) {
    const ai = settings.ai || {};
    const base = String(ai.base_url || '').trim().replace(/\/+$/, '');
    if (!base) throw new Error('未配置 AI 接口地址（Base URL）');
    if (!/^https?:\/\//i.test(base)) throw new Error('Base URL 必须以 http:// 或 https:// 开头');
    let response;
    try {
      response = await fetch(base + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + String(ai.api_key || '').trim()
        },
        body: JSON.stringify({
          model: ai.model || 'qwen-vl-plus',
          messages: messages,
          temperature: 0.1,
          max_tokens: maxTokens || 1024
        })
      });
    } catch (err) {
      throw new Error('无法连接 AI 服务：可能是网络问题，或该渠道不允许浏览器直连（请用阿里百炼）');
    }
    if (!response.ok) {
      let detail = '';
      try {
        const payload = await response.json();
        const error = payload && payload.error;
        detail = (error && (error.message || error.code)) || JSON.stringify(payload).slice(0, 300);
      } catch (err) { /* ignore */ }
      throw new Error(httpErrorPrefix(response.status) + (detail ? '：' + detail : ''));
    }
    const data = await response.json();
    const choice = (data.choices || [])[0];
    let content = choice && choice.message && choice.message.content;
    if (Array.isArray(content)) content = content.map(function (part) { return (part && part.text) || ''; }).join('');
    return String(content || '').trim();
  }

  function parseJson(text) {
    if (!text) return null;
    let cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const candidates = [];
    if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));
    candidates.push(cleaned);
    for (const candidate of candidates) {
      try { return JSON.parse(candidate); } catch (err) { /* 尝试修复 */ }
      try {
        const fixed = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(fixed);
      } catch (err) { /* continue */ }
    }
    return null;
  }

  function textOf(value) {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.filter(Boolean).join('、');
    return String(value).trim();
  }

  function normalizeDraft(raw, subjects, subjectHint) {
    const names = subjects.map(function (s) { return s.name; });
    const byName = {};
    subjects.forEach(function (s) { byName[s.name] = s; });
    let subject = byName[raw.subject];
    if (!subject) {
      for (const name of names) {
        if (String(raw.subject || '').indexOf(name) >= 0) { subject = byName[name]; break; }
      }
    }
    if (!subject && subjectHint) {
      subjects.forEach(function (s) { if (s.id === Number(subjectHint)) subject = s; });
    }
    if (!subject) subject = byName['其他'] || subjects[0];
    let cause = textOf(raw.error_cause);
    if (cause && !ERROR_CAUSE_LABEL[cause]) cause = ERROR_CAUSE_CODE[cause] || '';
    let questionType = textOf(raw.question_type);
    if (questionType && !QUESTION_TYPE_LABEL[questionType]) questionType = QUESTION_TYPE_CODE[questionType] || '';
    let knowledgePoints = raw.knowledge_points || [];
    if (typeof knowledgePoints === 'string') knowledgePoints = knowledgePoints.split(/[,，、;；]/);
    knowledgePoints = knowledgePoints.map(function (x) { return String(x).trim(); }).filter(Boolean).slice(0, 5);
    let warnings = raw.warnings || [];
    if (typeof warnings === 'string') warnings = [warnings];
    warnings = warnings.map(function (x) { return String(x).trim(); }).filter(Boolean).slice(0, 5);
    const confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0));
    return {
      subject_id: subject.id,
      subject_name: subject.name,
      subject_confidence: Math.round(confidence * 100) / 100,
      stem: textOf(raw.stem),
      student_answer: textOf(raw.student_answer),
      correct_answer: textOf(raw.correct_answer),
      analysis: textOf(raw.analysis),
      knowledge_points: knowledgePoints,
      error_cause: cause,
      error_advice: textOf(raw.error_advice),
      difficulty: clip(toInt(raw.difficulty, 3), 1, 5),
      question_type: questionType,
      exam_name: textOf(raw.exam_name) || null,
      exam_date: textOf(raw.exam_date) || null,
      warnings: warnings,
      engine: 'ai'
    };
  }

  async function aiRecognize(settings, imageIds, subjectHint) {
    const subjects = await getAll('subjects');
    const grade = (settings.student && settings.student.grade) || '';
    const dataURLs = [];
    for (const id of imageIds) dataURLs.push(await aiImageDataURL(id));
    const messages = buildAiMessages(subjects.map(function (s) { return s.name; }), grade, dataURLs);
    let raw = await callAI(settings, messages, 1024);
    let parsed = parseJson(raw);
    if (!parsed) {
      const retry = messages.concat([
        { role: 'assistant', content: raw.slice(0, 4000) },
        { role: 'user', content: '上面的输出无法解析为 JSON。请重新输出，只输出一个合法 JSON 对象，不要代码块、不要解释。' }
      ]);
      raw = await callAI(settings, retry, 1024);
      parsed = parseJson(raw);
    }
    if (!parsed) {
      const subject = subjects.find(function (s) { return s.id === Number(subjectHint); }) || subjects[0];
      return {
        draft: {
          subject_id: subject.id,
          subject_name: subject.name,
          subject_confidence: 0,
          stem: raw.slice(0, 4000),
          student_answer: '', correct_answer: '', analysis: '',
          knowledge_points: [], error_cause: '', error_advice: '',
          difficulty: 3, question_type: '', exam_name: null, exam_date: null,
          warnings: ['AI 返回格式无法解析，已把原始返回填进题干，请手动整理'],
          engine: 'ai'
        },
        raw: raw
      };
    }
    return { draft: normalizeDraft(parsed, subjects, subjectHint), raw: raw };
  }

  async function testAI(settings) {
    const started = Date.now();
    try {
      const content = await callAI(settings, [{ role: 'user', content: '只回复两个字符：ok' }], 8);
      return { ok: true, message: '连接成功，模型返回：' + (content.slice(0, 40) || '（空）'), latency_ms: Date.now() - started };
    } catch (err) {
      return { ok: false, message: err.message, latency_ms: Date.now() - started };
    }
  }

  /* ------------------------------------------------------------------ */
  /* 识别任务                                                            */
  /* ------------------------------------------------------------------ */

  function taskPayload(task) {
    const result = task.result || null;
    return {
      id: task.id,
      status: task.status,
      stage: task.stage,
      stage_label: STAGE_LABEL[task.stage] || task.stage,
      result: result ? result.draft : null,
      ai_raw: result ? (result.ai_raw || '') : '',
      error: task.error || null,
      created_at: task.created_at,
      finished_at: task.finished_at || null
    };
  }

  async function createTask(imageIds, subjectHint) {
    const task = {
      status: 'queued',
      stage: 'queued',
      image_ids: imageIds,
      subject_hint: subjectHint || null,
      result: null,
      error: null,
      created_at: nowIso(),
      finished_at: null
    };
    const id = await addOne('tasks', task);
    return id;
  }

  async function updateTask(taskId, patch) {
    const task = await getOne('tasks', taskId);
    if (!task) return;
    Object.assign(task, patch);
    if (patch.status === 'done' || patch.status === 'failed') task.finished_at = nowIso();
    await putOne('tasks', task);
  }

  async function runRecognize(taskId, imageIds, subjectHint) {
    try {
      await updateTask(taskId, { status: 'running', stage: 'ai' });
      const settings = await getSettings();
      const result = await aiRecognize(settings, imageIds, subjectHint);
      const draft = result.draft;
      if (subjectHint) draft.subject_id = Number(subjectHint);
      draft.image_ids = imageIds;
      draft.ocr_text = '';
      await updateTask(taskId, { status: 'done', stage: 'done', result: { draft: draft, ai_raw: result.raw } });
    } catch (err) {
      await updateTask(taskId, { status: 'failed', stage: 'done', error: String((err && err.message) || err).slice(0, 500) });
    }
  }

  async function recognize(body) {
    const imageIds = [];
    for (const raw of (body.image_ids || [])) {
      const id = toInt(raw, 0);
      if (id && await getImage(id)) imageIds.push(id);
    }
    if (!imageIds.length) throw httpError('请先上传图片');
    const mode = body.mode || 'auto';
    if (['auto', 'ocr', 'ai'].indexOf(mode) < 0) throw httpError('mode 不合法');
    const settings = await getSettings();
    const hasKey = !!(settings.ai && settings.ai.api_key);
    if (mode === 'ocr') throw httpError('手机本地版没有本地 OCR，请配置 AI 识别或手动录入');
    if (!hasKey) throw httpError('还没有配置 AI 识别：请到设置页填写阿里百炼 API Key，或改用「手动录入」');
    const subjectHint = body.subject_hint ? toInt(body.subject_hint, 0) : null;
    const taskId = await createTask(imageIds, subjectHint);
    setTimeout(function () { runRecognize(taskId, imageIds, subjectHint); }, 30);
    return { task_id: taskId, engine: 'ai' };
  }

  async function retryTask(taskId) {
    const task = await getOne('tasks', taskId);
    if (!task) throw httpError('识别任务不存在', 404);
    const newId = await createTask(task.image_ids, task.subject_hint);
    setTimeout(function () { runRecognize(newId, task.image_ids, task.subject_hint); }, 30);
    return { task_id: newId, engine: 'ai' };
  }

  async function activeTasks() {
    const tasks = await getAll('tasks');
    return tasks
      .filter(function (t) { return t.status === 'queued' || t.status === 'running'; })
      .sort(function (a, b) { return b.id - a.id; })
      .slice(0, 20)
      .map(taskPayload);
  }

  /* ------------------------------------------------------------------ */
  /* 导出 / 备份 / 导入                                                  */
  /* ------------------------------------------------------------------ */

  const CRC_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  /** 极简 ZIP（仅存储，不压缩）：files = [{name, data: Uint8Array}] */
  function zipStore(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    files.forEach(function (file) {
      const nameBytes = encoder.encode(file.name);
      const data = file.data;
      const crc = crc32(data);
      const header = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, 0x21, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
      header.set(nameBytes, 30);
      chunks.push(header, data);
      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const cview = new DataView(centralHeader.buffer);
      cview.setUint32(0, 0x02014b50, true);
      cview.setUint16(4, 20, true);
      cview.setUint16(6, 20, true);
      cview.setUint16(8, 0x0800, true);
      cview.setUint16(10, 0, true);
      cview.setUint16(12, 0, true);
      cview.setUint16(14, 0x21, true);
      cview.setUint32(16, crc, true);
      cview.setUint32(20, data.length, true);
      cview.setUint32(24, data.length, true);
      cview.setUint16(28, nameBytes.length, true);
      cview.setUint16(30, 0, true);
      cview.setUint16(32, 0, true);
      cview.setUint16(34, 0, true);
      cview.setUint16(36, 0, true);
      cview.setUint32(38, 0, true);
      cview.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);
      central.push(centralHeader);
      offset += header.length + data.length;
    });
    const centralSize = central.reduce(function (sum, item) { return sum + item.length; }, 0);
    const end = new Uint8Array(22);
    const eview = new DataView(end.buffer);
    eview.setUint32(0, 0x06054b50, true);
    eview.setUint16(8, files.length, true);
    eview.setUint16(10, files.length, true);
    eview.setUint32(12, centralSize, true);
    eview.setUint32(16, offset, true);
    return new Blob(chunks.concat(central, [end]), { type: 'application/zip' });
  }

  /** 读取仅存储（method=0）的 zip：返回 [{name, data: Uint8Array}] */
  function zipRead(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(bytes.buffer);
    const files = [];
    let offset = 0;
    while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
      const method = view.getUint16(offset + 8, true);
      const size = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const name = new TextDecoder('utf-8').decode(bytes.slice(nameStart, nameStart + nameLength));
      const dataStart = nameStart + nameLength + extraLength;
      if (method !== 0) throw new Error('暂不支持压缩过的备份文件');
      files.push({ name: name, data: bytes.slice(dataStart, dataStart + size) });
      offset = dataStart + size;
    }
    return files;
  }

  function questionsMarkdown(rows) {
    const subjectName = {};
    return rows.map(function (row) {
      const lines = [];
      const meta = [row.subject_name || subjectName[row.subject_id] || ''];
      if (row.exam_name) meta.push(row.exam_name);
      if (row.exam_date) meta.push(row.exam_date);
      if (row.created_at) meta.push('录入 ' + row.created_at.slice(0, 10));
      meta.push(STATUS_LABEL[row.status] || row.status);
      lines.push('## ' + row.id + '. ' + (row.subject_name || '') + '错题', '');
      lines.push('*' + meta.join(' · ') + '*', '');
      lines.push('**题干**', '', row.stem || '', '');
      if (row.student_answer) lines.push('**孩子的作答（错解，原样保留）**', '', row.student_answer, '');
      if (row.correct_answer) lines.push('**正确答案**', '', row.correct_answer, '');
      if (row.analysis) lines.push('**解析**', '', row.analysis, '');
      if ((row.knowledge_points || []).length) lines.push('- 知识点：' + row.knowledge_points.join('、'));
      if (row.error_cause) {
        const cause = ERROR_CAUSE_LABEL[row.error_cause] || row.error_cause;
        lines.push('- 错因：' + cause + (row.error_advice ? '（' + row.error_advice + '）' : ''));
      }
      if (row.difficulty) lines.push('- 难度：' + '★'.repeat(row.difficulty));
      if (row.plan && row.plan.next_due) lines.push('- 下次复习：' + row.plan.next_due);
      lines.push('', '---', '');
      return lines.join('\n');
    }).join('\n');
  }

  async function allQuestionDetails() {
    const questions = await getAll('questions');
    const details = [];
    for (const q of questions) details.push(await serializeQuestion(q, true));
    details.sort(function (a, b) { return a.id - b.id; });
    return details;
  }

  async function exportMarkdownZip() {
    const details = await allQuestionDetails();
    const encoder = new TextEncoder();
    const files = [];
    const bySubject = {};
    details.forEach(function (row) {
      const name = row.subject_name || '其他';
      (bySubject[name] = bySubject[name] || []).push(row);
    });
    const stamp = todayStr();
    Object.keys(bySubject).forEach(function (name) {
      const rows = bySubject[name];
      const content = '# ' + name + '错题\n\n> 导出时间：' + stamp + '　共 ' + rows.length + ' 道\n\n' + questionsMarkdown(rows);
      files.push({ name: '错题本/' + name + '/错题本-' + name + '-' + stamp + '.md', data: encoder.encode(content) });
    });
    return zipStore(files);
  }

  async function exportJsonBlob() {
    const details = await allQuestionDetails();
    const payload = {
      version: VERSION,
      exported_at: nowIso(),
      subjects: await getAll('subjects'),
      questions: details.map(function (q) {
        return {
          id: q.id, subject: q.subject_name, exam_name: q.exam_name, exam_date: q.exam_date,
          stem: q.stem, student_answer: q.student_answer, correct_answer: q.correct_answer,
          analysis: q.analysis, knowledge_points: q.knowledge_points, error_cause: q.error_cause,
          error_advice: q.error_advice, difficulty: q.difficulty, question_type: q.question_type,
          status: q.status, created_at: q.created_at, plan: q.plan || null
        };
      }),
      reviews: (await getAll('reviews')).map(function (r) {
        return { question_id: r.question_id, result: r.result, reviewed_at: r.reviewed_at, note: r.note };
      })
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  }

  async function exportBackupBlob() {
    const settings = await getSettings();
    const safeSettings = {
      ai: { provider: settings.ai.provider, base_url: settings.ai.base_url, model: settings.ai.model, timeout_sec: settings.ai.timeout_sec },
      review: settings.review,
      student: settings.student
    };
    const state = {
      version: VERSION,
      exported_at: nowIso(),
      subjects: await getAll('subjects'),
      questions: (await getAll('questions')).map(function (q) { return q; }),
      plans: await getAll('plans'),
      reviews: await getAll('reviews'),
      settings: safeSettings
    };
    const encoder = new TextEncoder();
    const files = [{ name: 'state.json', data: encoder.encode(JSON.stringify(state)) }];
    const images = await getAll('images');
    for (const rec of images) {
      const buffer = await rec.blob.arrayBuffer();
      files.push({ name: 'images/' + rec.id + '.jpg', data: new Uint8Array(buffer) });
    }
    return zipStore(files);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      try { link.remove(); URL.revokeObjectURL(url); } catch (err) { /* ignore */ }
    }, 2000);
  }

  async function exportBlob(kind) {
    if (kind === 'markdown-zip') return exportMarkdownZip();
    if (kind === 'json') return exportJsonBlob();
    if (kind === 'backup') return exportBackupBlob();
    throw new Error('未知导出类型');
  }

  async function download(kind) {
    const stamp = todayStr();
    const names = {
      'markdown-zip': '错题本-markdown-' + stamp + '.zip',
      json: '错题本数据-' + stamp + '.json',
      backup: '错题本完整备份-' + stamp + '.zip'
    };
    downloadBlob(await exportBlob(kind), names[kind]);
  }

  async function restoreState(state, imageEntries) {
    const subjects = (state.subjects || []).slice();
    const questions = (state.questions || []).slice();
    const plans = (state.plans || []).slice();
    const reviews = (state.reviews || []).slice();
    const importedSettings = state.settings || {};
    const current = await getSettingsRaw();
    const merged = mergeSettings(Object.assign({}, current, importedSettings));
    if (importedSettings.ai && !importedSettings.ai.api_key && current.ai && current.ai.api_key) {
      merged.ai.api_key = current.ai.api_key;
    }
    const imageBlobs = new Map();
    for (const entry of imageEntries) {
      const match = entry.name.match(/^images\/(\d+)\.(?:jpg|jpeg|png|webp)$/i);
      if (!match) continue;
      imageBlobs.set(Number(match[1]), new Blob([entry.data], { type: 'image/jpeg' }));
    }
    await writeTx(['subjects', 'questions', 'images', 'plans', 'reviews', 'settings'], function (tx) {
      ['subjects', 'questions', 'images', 'plans', 'reviews', 'settings'].forEach(function (name) {
        tx.objectStore(name).clear();
      });
      subjects.forEach(function (subject) { tx.objectStore('subjects').put(subject); });
      questions.forEach(function (question) {
        question.image_ids = (question.image_ids || []).filter(function (id) { return imageBlobs.has(id); });
        tx.objectStore('questions').put(question);
      });
      imageBlobs.forEach(function (blob, id) {
        tx.objectStore('images').put({ id: id, blob: blob, thumb: blob, width: null, height: null, kind: 'original', created_at: nowIso() });
      });
      plans.forEach(function (plan) { tx.objectStore('plans').put(plan); });
      reviews.forEach(function (review) { tx.objectStore('reviews').put(review); });
      Object.keys(merged).forEach(function (key) {
        tx.objectStore('settings').put({ key: key, value: merged[key] });
      });
    });
    // 后台补缩略图（失败不影响使用）
    setTimeout(async function () {
      for (const rec of await getAll('images')) {
        if (rec.thumb && rec.thumb.size !== rec.blob.size) continue;
        try {
          const bitmap = await decodeImage(rec.blob);
          const thumb = await toJpeg(bitmap, 400, 0.78);
          rec.thumb = thumb.blob;
          await putOne('images', rec);
        } catch (err) { /* ignore */ }
      }
    }, 800);
    // 清空对象 URL 缓存
    urlCache.forEach(function (url) { try { URL.revokeObjectURL(url); } catch (err) { /* ignore */ } });
    urlCache.clear();
    imageCache.clear();
  }

  async function importFile(file) {
    if (!file) throw new Error('没有选择文件');
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      const entries = zipRead(buffer);
      const stateEntry = entries.find(function (entry) { return entry.name === 'state.json'; });
      if (!stateEntry) throw new Error('备份文件里没有 state.json，可能不是本应用的备份');
      const state = JSON.parse(new TextDecoder('utf-8').decode(stateEntry.data));
      const images = entries.filter(function (entry) { return entry.name.indexOf('images/') === 0; });
      await restoreState(state, images);
      return { questions: (state.questions || []).length, images: images.length };
    }
    const text = new TextDecoder('utf-8').decode(bytes);
    const data = JSON.parse(text);
    if (!data.questions) throw new Error('JSON 里没有 questions 字段');
    const settings = await getSettings();
    const subjects = await getAll('subjects');
    const subjectByName = {};
    subjects.forEach(function (s) { subjectByName[s.name] = s; });
    const now = nowIso();
    let count = 0;
    for (const item of data.questions) {
      const subject = subjectByName[item.subject] || subjects[0];
      const question = {
        subject_id: subject.id,
        exam_name: item.exam_name || null,
        exam_date: item.exam_date || null,
        stem: item.stem || '',
        student_answer: item.student_answer || null,
        correct_answer: item.correct_answer || null,
        analysis: item.analysis || null,
        knowledge_points: item.knowledge_points || [],
        error_cause: ERROR_CAUSE_CODE[item.error_cause] ? ERROR_CAUSE_CODE[item.error_cause] : (item.error_cause || ''),
        error_advice: item.error_advice || null,
        difficulty: item.difficulty || 3,
        question_type: item.question_type || '',
        status: 'new',
        image_ids: [],
        created_at: item.created_at || now,
        updated_at: now
      };
      if (!question.stem) continue;
      if (!ERROR_CAUSE_LABEL[question.error_cause]) question.error_cause = '';
      if (!QUESTION_TYPE_LABEL[question.question_type]) question.question_type = '';
      await writeTx(['questions', 'plans'], function (tx, capture) {
        const req = tx.objectStore('questions').add(question);
        req.onsuccess = function () {
          tx.objectStore('plans').put({
            question_id: req.result, stage: 0, interval_days: 1, next_due: dateShift(1),
            last_reviewed_at: null, streak: 0, lapses: 0
          });
          capture(req.result);
        };
      });
      count++;
    }
    return { questions: count, images: 0 };
  }

  /* ------------------------------------------------------------------ */
  /* API 路由                                                            */
  /* ------------------------------------------------------------------ */

  async function handleGet(parts, params) {
    const resource = parts[1] || '';
    const identifier = parts[2] || '';

    if (resource === 'health') return { ok: true, version: VERSION };
    if (resource === 'bootstrap') {
      const settings = await getSettings();
      const subjects = await subjectList();
      const count = await counts();
      const due = await dueStats();
      const reviewed = await reviewedToday();
      const reviews = await getAll('reviews');
      const masteredToday = reviews.filter(function (r) {
        return String(r.reviewed_at || '').slice(0, 10) === todayStr() && r.result === 'master';
      }).length;
      return {
        server: { time: nowIso(), date: todayStr(), version: VERSION },
        subjects: subjects,
        today: {
          date: todayStr(),
          due_count: due.due,
          overdue_count: due.overdue,
          reviewed_today: reviewed,
          mastered_today: masteredToday
        },
        counts: count,
        review: {
          intervals: intervalsOf(settings),
          mastery_streak: masteryOf(settings)
        },
        ai: {
          configured: !!(settings.ai && settings.ai.api_key),
          provider: settings.ai.provider || '',
          base_url: settings.ai.base_url || '',
          model: settings.ai.model || ''
        },
        ocr: { available: false, engine: 'none', language: '', local: true }
      };
    }
    if (resource === 'today') return { date: todayStr(), items: await todayItems() };
    if (resource === 'questions') {
      if (identifier === 'similar') {
        return { matches: await similarQuestions(params.get('stem') || '', toInt(params.get('exclude_id'), null)) };
      }
      if (!identifier) {
        const query = {};
        ['subject_id', 'status', 'cause', 'q', 'from', 'to', 'sort', 'limit', 'offset'].forEach(function (key) {
          if (params.has(key)) query[key] = params.get(key);
        });
        return listQuestions(query);
      }
      return serializeQuestion(await getOne('questions', toInt(identifier, 0)), true);
    }
    if (resource === 'tasks') {
      if (identifier) {
        const task = await getOne('tasks', toInt(identifier, 0));
        if (!task) throw httpError('识别任务不存在', 404);
        return taskPayload(task);
      }
      return { items: await activeTasks() };
    }
    if (resource === 'stats') {
      return stats(params.get('range') || '30', toInt(params.get('subject_id'), null));
    }
    if (resource === 'settings') return settingsPayload();
    if (resource === 'subjects') {
      return { items: await subjectList(), subjects: await getAll('subjects') };
    }
    if (resource === 'ocr' && identifier === 'status') {
      return { available: false, engine: 'none', language: '', local: true };
    }
    throw httpError('接口不存在', 404);
  }

  async function handlePost(parts, body) {
    const resource = parts[1] || '';
    const identifier = parts[2] || '';
    const third = parts[3] || '';

    if (resource === 'recognize') return recognize(body);
    if (resource === 'tasks' && third === 'retry') return retryTask(toInt(identifier, 0));
    if (resource === 'questions') {
      const id = await createQuestion(body);
      const detail = await serializeQuestion(await getOne('questions', id), false);
      return { id: id, plan: detail ? detail.plan : null };
    }
    if (resource === 'questions' && third === 'master') {
      return { ok: true, status: await setMastered(toInt(identifier, 0), true) };
    }
    if (resource === 'questions' && third === 'unmaster') {
      return { ok: true, status: await setMastered(toInt(identifier, 0), false) };
    }
    if (resource === 'reviews') {
      return applyReview(toInt(body.question_id, 0), body.result, body.note);
    }
    if (resource === 'settings' && identifier === 'test-ai') {
      const settings = await getSettings();
      if (body && body.ai && typeof body.ai === 'object') {
        settings.ai = Object.assign({}, settings.ai, body.ai);
        if (body.ai.api_key === '__clear__') settings.ai.api_key = '';
        if (!settings.ai.api_key) throw httpError('还没有填写 API Key');
      }
      if (!settings.ai.api_key) return { ok: false, message: '还没有填写 API Key', latency_ms: 0 };
      return testAI(settings);
    }
    if (resource === 'subjects') {
      const name = String(body.name || '').trim();
      if (!name) throw httpError('科目名称不能为空');
      const subjects = await getAll('subjects');
      if (subjects.some(function (s) { return s.name === name; })) throw httpError('科目已存在');
      const color = /^#[0-9a-fA-F]{6}$/.test(String(body.color || '')) ? body.color : '#6b7280';
      const id = await addOne('subjects', { name: name, color: color, sort: subjects.length ? Math.max.apply(null, subjects.map(function (s) { return s.sort || 0; })) + 1 : 0 });
      return { id: id, name: name, color: color };
    }
    throw httpError('接口不存在', 404);
  }

  async function handlePut(pathParts, body) {
    const resource = pathParts[1] || '';
    const identifier = pathParts[2] || '';
    if (resource === 'questions' && identifier) {
      await updateQuestion(toInt(identifier, 0), body);
      const question = await serializeQuestion(await getOne('questions', toInt(identifier, 0)), true);
      return { ok: true, question: question };
    }
    if (resource === 'settings') {
      const current = await getSettings();
      const next = Object.assign({}, current);
      if (body && body.ai && typeof body.ai === 'object') {
        const ai = Object.assign({}, current.ai);
        ['provider', 'base_url', 'model'].forEach(function (key) {
          if (key in body.ai && body.ai[key] !== undefined) ai[key] = String(body.ai[key]).trim();
        });
        if ('timeout_sec' in body.ai) ai.timeout_sec = clip(toInt(body.ai.timeout_sec, 90), 10, 600);
        if (body.ai.api_key === '__clear__') ai.api_key = '';
        else if (body.ai.api_key) ai.api_key = String(body.ai.api_key).trim();
        next.ai = ai;
      }
      if (body && body.review && typeof body.review === 'object') {
        if ('mastery_streak' in body.review) next.review.mastery_streak = clip(toInt(body.review.mastery_streak, 4), 1, 20);
        if (Array.isArray(body.review.intervals)) next.review.intervals = body.review.intervals;
      }
      if (body && body.student && typeof body.student === 'object') {
        ['name', 'grade'].forEach(function (key) {
          if (key in body.student) next.student[key] = String(body.student[key] || '').trim();
        });
      }
      for (const key of Object.keys(next)) await setSetting(key, next[key]);
      return settingsPayload();
    }
    if (resource === 'subjects' && identifier) {
      const id = toInt(identifier, 0);
      const subjects = await getAll('subjects');
      const subject = subjects.find(function (s) { return s.id === id; });
      if (!subject) throw httpError('科目不存在', 404);
      const name = String(body.name || subject.name).trim();
      if (!name) throw httpError('科目名称不能为空');
      if (subjects.some(function (s) { return s.name === name && s.id !== id; })) throw httpError('科目名称已存在');
      const color = /^#[0-9a-fA-F]{6}$/.test(String(body.color || subject.color)) ? (body.color || subject.color) : subject.color;
      await putOne('subjects', Object.assign({}, subject, { name: name, color: color }));
      return { ok: true, id: id, name: name, color: color };
    }
    throw httpError('接口不存在', 404);
  }

  async function handleDelete(pathParts) {
    const resource = pathParts[1] || '';
    const identifier = pathParts[2] || '';
    if (resource === 'questions' && identifier) {
      await deleteQuestion(toInt(identifier, 0));
      return { ok: true };
    }
    if (resource === 'subjects' && identifier) {
      const subjectId = toInt(identifier, 0);
      const questions = await getAll('questions');
      const count = questions.filter(function (q) { return q.subject_id === subjectId; }).length;
      if (count) throw httpError('该科目下还有 ' + count + ' 道错题，请先移动或删除');
      const subjects = await getAll('subjects');
      if (subjects.length <= 1) throw httpError('至少要保留一个科目');
      await delOne('subjects', subjectId);
      return { ok: true };
    }
    throw httpError('接口不存在', 404);
  }

  function parsePath(path) {
    const index = String(path).indexOf('?');
    const pathname = index >= 0 ? String(path).slice(0, index) : String(path);
    const query = index >= 0 ? String(path).slice(index + 1) : '';
    return { parts: pathname.split('/').filter(Boolean), params: new URLSearchParams(query) };
  }

  async function api(path, opts) {
    await ready();
    const parsed = parsePath(path);
    const method = (opts && opts.method) || 'GET';
    if (method === 'GET') return handleGet(parsed.parts, parsed.params);
    if (method === 'POST') return handlePost(parsed.parts, (opts && opts.body) || {});
    if (method === 'PUT') return handlePut(parsed.parts, (opts && opts.body) || {});
    if (method === 'DELETE') return handleDelete(parsed.parts);
    throw httpError('不支持的请求方法', 405);
  }

  /* ------------------------------------------------------------------ */
  /* 初始化                                                              */
  /* ------------------------------------------------------------------ */

  let readyPromise = null;

  async function init() {
    await openDB();
    const subjects = await getAll('subjects');
    if (!subjects.length) {
      for (let i = 0; i < SUBJECT_PRESETS.length; i++) {
        await addOne('subjects', { name: SUBJECT_PRESETS[i][0], color: SUBJECT_PRESETS[i][1], sort: i });
      }
    }
    const settings = await getAll('settings');
    if (!settings.length) {
      for (const key of Object.keys(DEFAULT_SETTINGS)) await setSetting(key, DEFAULT_SETTINGS[key]);
    }
    const tasks = await getAll('tasks');
    for (const task of tasks) {
      if (task.status === 'queued' || task.status === 'running') {
        task.status = 'failed';
        task.stage = 'done';
        task.error = '上次识别被中断，请重试';
        task.finished_at = nowIso();
        await putOne('tasks', task);
      }
    }
    // 尽力申请持久化存储，降低被系统清理的概率
    try {
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persist();
        if (!persisted) console.warn('浏览器未授予持久化存储，建议定期导出备份');
      }
    } catch (err) { /* ignore */ }
  }

  function ready() {
    if (!readyPromise) readyPromise = init();
    return readyPromise;
  }

  window.WBLocal = {
    version: VERSION,
    ready: ready,
    api: api,
    upload: uploadImage,
    download: download,
    exportBlob: exportBlob,
    importFile: importFile,
    getSettings: getSettings
  };
})();
