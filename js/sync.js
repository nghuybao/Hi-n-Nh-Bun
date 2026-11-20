/* Hiên Nhà Bun — đồng bộ nhiều thiết bị khi đã đăng nhập.
   - Trên máy: mỗi tài khoản có một ngăn đệm riêng (hien-nha-bun:acct:<id>), mở ứng dụng ngay cả khi mất mạng.
   - Trên máy chủ: thế giới chia thành các phần; chỉ phần nào đổi mới được gửi lên, kèm số phiên bản (rev)
     để không bao giờ ghi đè dữ liệu mới hơn của thiết bị khác.
   - Xu: mỗi thay đổi là một giao dịch có mã riêng, xếp hàng chờ gửi; số dư do máy chủ tính. */
(function () {
  'use strict';
  const B = window.B, U = B.util;
  const SECTIONS = {
    core: ['v', 'createdAt', 'lastTick', 'lastSeen', 'lastCareAt', 'coins', 'debt', 'tickets', 'seenIntro', 'lastSurprise', 'focus', 'streak', 'totals', 'habit', 'day'],
    bun: ['bun', 'generations'],
    house: ['house', 'pantry'],
    tasks: ['tasks', 'dayPlan', 'nextPlan', 'learn', 'plan'],
    history: ['history', 'restDays', 'sessions', 'ledger'],
    memories: ['memories', 'treasures', 'achievements'],
    health: ['health'],
    pets: ['pets'],
    media: ['photos', 'music', 'audio'],
    settings: ['settings'],
    misc: [],
  };
  const KEYMAP = {};
  Object.keys(SECTIONS).forEach((s) => SECTIONS[s].forEach((k) => (KEYMAP[k] = s)));
  const USER_WINDOW = 8000; // lần lưu trong vòng 8 giây sau thao tác của người dùng được coi là thay đổi thật

  const st = {
    uid: null, on: false, meta: null, outbox: [], busy: false, status: 'idle', error: null,
    timer: null, started: false, firstDirtyAt: 0, lastInput: 0, changeNo: 0, retry: 0, pendingCloud: null, blocked: false, suppress: false,
  };

  /* ---------- Tiện ích ---------- */
  function split(S) {
    const out = {};
    Object.keys(SECTIONS).forEach((s) => (out[s] = {}));
    Object.keys(S).forEach((k) => { out[KEYMAP[k] || 'misc'][k] = S[k]; });
    return out;
  }
  function join(sections) { const S = {}; Object.keys(sections || {}).forEach((s) => Object.assign(S, sections[s])); return S; }
  // Băm nhanh (cyrb53) để biết phần nào đã đổi
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  // Chuỗi JSON với khóa đã sắp xếp: so sánh được dữ liệu gửi đi và dữ liệu máy chủ trả về (jsonb đổi thứ tự khóa)
  function canon(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map((x) => (x === undefined ? 'null' : canon(x))).join(',') + ']';
    return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  }
  const hashes = (parts) => { const h = {}; Object.keys(parts).forEach((s) => (h[s] = hash(JSON.stringify(parts[s])))); return h; };
  const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : U.uid() + U.uid());
  function deviceId() {
    const k = 'hien-nha-bun:device';
    try { let d = localStorage.getItem(k); if (!d) { d = 'd-' + newId().slice(0, 18); localStorage.setItem(k, d); } return d; } catch (e) { return 'd-unknown'; }
  }
  const keys = (uid) => ({ state: 'hien-nha-bun:acct:' + uid, meta: 'hien-nha-bun:acct:' + uid + ':sync', outbox: 'hien-nha-bun:acct:' + uid + ':outbox', backup: 'hien-nha-bun:acct:' + uid + ':conflict-backup' });
  const read = (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

  function saveMeta() { if (st.uid) write(keys(st.uid).meta, st.meta); }
  function saveOutbox() { if (st.uid) write(keys(st.uid).outbox, st.outbox); }
  const pendingCoins = () => st.outbox.reduce((a, e) => a + e.amount, 0);

  /* ---------- Trạng thái hiển thị ---------- */
  const LABEL = { idle: 'Chưa đồng bộ.', syncing: 'Đang đồng bộ...', synced: 'Đã đồng bộ.', pending: 'Chưa đồng bộ.', error: 'Đồng bộ thất bại.', offline: 'Chưa đồng bộ.', conflict: 'Cần bạn chọn bản dữ liệu.', auth: 'Cần đăng nhập lại.' };
  function setStatus(s, err) {
    st.status = s; st.error = err || null;
    B.emit('syncStatus', { status: s, label: LABEL[s], error: st.error, lastSync: st.meta && st.meta.lastSync });
  }

  /* ---------- Ghi nhận thay đổi ---------- */
  function markInput() { st.lastInput = Date.now(); }
  function markDirty() {
    if (!st.on || st.suppress) return;
    st.changeNo++;
    if (!st.meta.dirty) { st.meta.dirty = true; saveMeta(); }
    if (!st.firstDirtyAt) st.firstDirtyAt = Date.now();
    if (st.status === 'synced' || st.status === 'idle') setStatus('pending');
    schedule();
  }
  // Gửi sau 2,5 giây yên lặng, nhưng không để chờ quá 15 giây khi người dùng thao tác liên tục
  function schedule(ms) {
    if (!st.on || !st.started || st.blocked) return;
    clearTimeout(st.timer);
    const waited = st.firstDirtyAt ? Date.now() - st.firstDirtyAt : 0;
    st.timer = setTimeout(push, ms != null ? ms : Math.max(0, Math.min(2500, 15000 - waited)));
  }
  function reconcileCoins(render) {
    if (!st.meta || st.meta.balance == null || !B.S) return;
    const want = st.meta.balance + pendingCoins();
    if (B.S.coins !== want) {
      B.S.coins = want;
      st.suppress = true; B.store.saveNow(); st.suppress = false;
      if (render !== false) B.emit('change');
    }
  }

  /* ---------- Gửi lên ---------- */
  async function push(opts) {
    opts = opts || {};
    if (!st.on || !B.cloud.enabled) return { ok: false };
    if (st.busy) { schedule(1500); return { ok: false, busy: true }; }
    if (st.blocked && !opts.force) return { ok: false };
    if (!st.meta.dirty && !st.outbox.length && !opts.force) { setStatus('synced'); return { ok: true }; }
    if (!navigator.onLine) { setStatus('offline'); return { ok: false }; }
    st.busy = true; clearTimeout(st.timer);
    st.suppress = true; B.store.saveNow(); st.suppress = false;
    const parts = split(B.S), h = hashes(parts), changed = {};
    Object.keys(parts).forEach((s) => { if (opts.force || h[s] !== st.meta.hashes[s]) changed[s] = parts[s]; });
    const events = st.outbox.slice(0, 500), sent = new Set(events.map((e) => e.id)), stamp = st.changeNo;
    setStatus('syncing');
    try {
      const res = await B.cloud.save({ base: opts.base != null ? opts.base : st.meta.rev, sections: changed, events, device: deviceId() });
      st.meta.rev = res.rev; st.meta.balance = Number(res.balance);
      Object.keys(changed).forEach((s) => (st.meta.hashes[s] = h[s]));
      st.outbox = st.outbox.filter((e) => !sent.has(e.id)); saveOutbox();
      if (st.changeNo === stamp && !st.outbox.length) { st.meta.dirty = false; st.firstDirtyAt = 0; }
      st.meta.lastSync = Date.now(); st.meta.lastError = null; st.retry = 0; st.blocked = false;
      saveMeta();
      reconcileCoins();
      setStatus(st.meta.dirty ? 'pending' : 'synced');
      if (st.meta.dirty) schedule();
      return { ok: true };
    } catch (e) {
      const i = B.cloud.info(e);
      st.meta.lastError = i.msg; saveMeta();
      if (i.kind === 'conflict') { st.blocked = true; setStatus('conflict', i.msg); B.emit('syncConflict', { rev: i.rev }); return { ok: false, conflict: true }; }
      if (i.kind === 'auth') { setStatus('auth', i.msg); return { ok: false }; }
      setStatus(i.kind === 'network' ? 'offline' : 'error', i.msg);
      // Thử lại dần thưa hơn: 5 giây, 15 giây, 45 giây... tối đa 5 phút
      st.retry = Math.min(st.retry + 1, 6);
      schedule(Math.min(300000, 5000 * Math.pow(3, st.retry - 1)));
      return { ok: false, error: i };
    } finally { st.busy = false; }
  }

  /* ---------- Kéo về: kiểm tra phiên bản mới từ thiết bị khác ---------- */
  const idle = () => Date.now() - st.lastInput > 20000 && !(B.ui && B.ui.state.modals.length) && !(B.S && B.S.focus) && !(B.walk && B.walk.state.on) && !document.body.classList.contains('room-edit');
  async function check() {
    if (!st.on || st.busy || !B.cloud.enabled || !navigator.onLine) return;
    try {
      const h = await B.cloud.head();
      if (!h) return;
      if (h.rev === st.meta.rev) { if (st.status === 'offline' || st.status === 'error') { st.meta.dirty || st.outbox.length ? push() : setStatus('synced'); } return; }
      if (h.rev < st.meta.rev) return;
      if (st.meta.dirty || st.outbox.length) { st.blocked = true; setStatus('conflict'); B.emit('syncConflict', { rev: h.rev, at: h.updated_at }); return; }
      st.pendingCloud = h;
      if (document.hidden || idle()) adopt('Đã cập nhật dữ liệu mới từ thiết bị khác.');
      else setStatus('pending', 'Có dữ liệu mới từ thiết bị khác, sẽ cập nhật khi bạn rảnh tay.');
    } catch (e) { const i = B.cloud.info(e); if (i.kind === 'network') setStatus('offline', i.msg); else if (i.kind === 'auth') setStatus('auth', i.msg); }
  }
  // Tải bản trên tài khoản về ngăn đệm của máy rồi mở lại trang
  async function adopt(note) {
    if (!st.uid) return false;
    setStatus('syncing');
    try {
      const g = await B.cloud.load();
      if (!g || !g.exists) throw new Error('no_save');
      writeCache(st.uid, g);
      st.outbox = []; saveOutbox();
      try { if (note) sessionStorage.setItem('hien-nha-bun:after-reload', note); } catch (e) { /* bỏ qua */ }
      B.skipSave = true;
      location.reload();
      return true;
    } catch (e) { const i = B.cloud.info(e); setStatus(i.kind === 'network' ? 'offline' : 'error', i.msg); return false; }
  }
  // Ghi bản tải về vào ngăn đệm của máy, kèm thông tin đồng bộ
  function writeCache(uid, g) {
    const K = keys(uid), S = join(g.sections);
    S.coins = Number(g.balance);
    const ok = write(K.state, S);
    if (!ok) throw new Error('Bộ nhớ trình duyệt đầy, không lưu được dữ liệu tải về.');
    const norm = B.store.normalize(JSON.parse(JSON.stringify(S)));
    write(K.meta, { rev: g.rev, hashes: hashes(split(norm)), dirty: false, lastSync: Date.now(), balance: Number(g.balance), photosUp: (S.photos || []).map((p) => p.id) });
    return S;
  }

  /* ---------- Ảnh ---------- */
  async function syncPhotos() {
    if (!st.on || !B.cloud.enabled) return;
    const list = B.S.photos || [], up = new Set(st.meta.photosUp || []);
    let changed = false;
    for (const p of list) {
      try {
        const local = await B.idb.get('photos', p.id).catch(() => null);
        if (!local && up.has(p.id)) {
          const blob = await B.cloud.downloadPhoto(st.uid, p.id);
          if (blob) { await B.idb.put('photos', p.id, blob); B.photos.urls[p.id] = URL.createObjectURL(blob); changed = true; }
        } else if (local && !up.has(p.id)) {
          await B.cloud.uploadPhoto(st.uid, p.id, local); up.add(p.id);
        }
      } catch (e) { /* để lần sau */ }
    }
    st.meta.photosUp = Array.from(up).filter((id) => list.some((p) => p.id === id)); saveMeta();
    if (changed && B.scene) B.scene.build();
  }
  function onPhoto(d) {
    if (!st.on) return;
    const up = new Set(st.meta.photosUp || []);
    if (d.type === 'remove') {
      if (up.has(d.id)) { up.delete(d.id); B.cloud.removePhotos(st.uid, [d.id]).catch(() => {}); }
      st.meta.photosUp = Array.from(up); saveMeta(); return;
    }
    // Thêm hoặc thay ảnh: đánh dấu chưa tải lên để syncPhotos gửi bản mới
    up.delete(d.id); st.meta.photosUp = Array.from(up); saveMeta();
    clearTimeout(onPhoto.t); onPhoto.t = setTimeout(syncPhotos, 1200);
  }

  /* ---------- Khởi động ---------- */
  // Gắn vào tài khoản TRƯỚC khi nạp trạng thái, để giao dịch xu phát sinh lúc khởi động (vd. phiên tập trung
  // xong trong lúc vắng) cũng được ghi vào hàng chờ
  function attach(uid) {
    const K = keys(uid);
    st.uid = uid; st.on = true;
    st.meta = Object.assign({ rev: 0, hashes: {}, dirty: false, lastSync: 0, balance: null, photosUp: [] }, read(K.meta, {}));
    st.outbox = read(K.outbox, []);
    ['pointerdown', 'keydown', 'input', 'change', 'wheel'].forEach((ev) => document.addEventListener(ev, markInput, { capture: true, passive: true }));
    B.on('coin', (c) => {
      if (!st.on) return;
      st.outbox.push({ id: c.id || newId(), amount: c.delta, kind: c.kind, at: Date.now() });
      saveOutbox(); markDirty();
    });
    B.on('saved', () => { if (!st.suppress && Date.now() - st.lastInput < USER_WINDOW) markDirty(); });
    B.on('photo', onPhoto);
  }
  // Bắt đầu gửi/kéo định kỳ sau khi giao diện đã sẵn sàng
  function start() {
    if (!st.on || st.started) return;
    st.started = true;
    reconcileCoins(false);
    setStatus(st.meta.dirty || st.outbox.length ? 'pending' : st.meta.lastSync ? 'synced' : 'idle');
    if (st.meta.dirty || st.outbox.length) schedule(1500);
    setTimeout(syncPhotos, 4000);
    // Kiểm tra định kỳ khi trang đang mở, và ngay khi quay lại trang
    setInterval(() => { if (!document.hidden) { if (st.pendingCloud && idle()) adopt('Đã cập nhật dữ liệu mới từ thiết bị khác.'); else check(); } }, 60000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (st.meta.dirty || st.outbox.length) push(); }
      else check();
    });
    window.addEventListener('online', () => { st.retry = 0; st.meta.dirty || st.outbox.length ? push() : check(); });
    window.addEventListener('offline', () => setStatus('offline', 'Thiết bị đang ngoại tuyến. Thay đổi được giữ trên máy và sẽ gửi khi có mạng.'));
  }

  B.sync = {
    SECTIONS, split, join, canon, hash, hashes, keys, deviceId, newId, writeCache, read, write,
    attach, start, push, check, adopt, syncPhotos,
    get state() { return st; },
    status: () => ({ status: st.status, label: LABEL[st.status], error: st.error, lastSync: st.meta && st.meta.lastSync, dirty: !!(st.meta && (st.meta.dirty || st.outbox.length)) }),
    // Giữ bản trên máy: ghi đè bản trên tài khoản (chỉ khi người dùng chọn rõ ràng)
    async keepLocal(cloudRev) {
      st.blocked = false;
      let rev = cloudRev;
      if (rev == null) { const h = await B.cloud.head(); rev = h ? h.rev : st.meta.rev; }
      st.meta.rev = rev;
      return push({ force: true, base: rev });
    },
    // Dùng bản trên tài khoản: lưu bản trên máy làm bản dự phòng rồi tải bản trên tài khoản về
    useCloud() {
      write(keys(st.uid).backup, { savedAt: Date.now(), state: B.S });
      st.meta.dirty = false; saveMeta();
      return adopt('Đã dùng dữ liệu trên tài khoản. Bản trên thiết bị này được giữ lại làm bản dự phòng.');
    },
    // Thay cả thế giới (bắt đầu lại / nhập tệp) khi đang dùng tài khoản. Cần có mạng.
    async replaceWorld(s, opts) {
      opts = opts || {};
      if (!navigator.onLine) throw new Error('Cần kết nối mạng để thay dữ liệu trên tài khoản.');
      const head = await B.cloud.head();
      const balance = st.meta.balance != null ? st.meta.balance + pendingCoins() : B.S.coins;
      if (opts.resetCoins) st.outbox.push({ id: 'reset:' + newId(), amount: Math.max(-1000000, Math.min(60, 60 - balance)), kind: 'reset', at: Date.now() });
      saveOutbox();
      B.S = s;
      st.suppress = true; B.store.saveNow(); st.suppress = false;
      st.meta.dirty = true;
      const r = await push({ force: true, base: head ? head.rev : st.meta.rev });
      if (!r.ok) throw new Error(st.error || 'Không lưu được lên tài khoản.');
      return r;
    },
    // Trước khi đăng xuất: cố gửi nốt thay đổi
    async flush() { if (st.on && (st.meta.dirty || st.outbox.length)) await push(); return !(st.meta.dirty || st.outbox.length); },
    stop() { st.on = false; clearTimeout(st.timer); },
  };
})();
