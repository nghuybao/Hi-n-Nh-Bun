/* Hiên Nhà Bun — tường ảnh: ảnh nhập từ máy được lưu trong IndexedDB của trình duyệt, không rời khỏi máy */
(function () {
  'use strict';
  const B = window.B, U = B.util, DBN = 'hien-nha-bun', STORE = 'photos', urls = {}, MAX = 24;
  const SIZES = { s: 62, m: 90, l: 124 };
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('Trình duyệt không hỗ trợ lưu ảnh.'));
      const blocked = () => { dbp = null; rej(new Error('Trình duyệt đang chặn bộ nhớ lưu ảnh (thường gặp ở cửa sổ ẩn danh hoặc khi mở từ tệp). Hãy mở bằng "Mở Hiên Nhà Bun.cmd" hoặc một cửa sổ thường.')); };
      let rq;
      try { rq = indexedDB.open(DBN, 2); } catch (e) { return blocked(); }
      const t = setTimeout(blocked, 5000);
      // Phiên bản 2: thêm kho "audio" cho nhạc nền người dùng nhập; ảnh cũ giữ nguyên
      rq.onupgradeneeded = () => { const d = rq.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE); if (!d.objectStoreNames.contains('audio')) d.createObjectStore('audio'); };
      rq.onsuccess = () => { clearTimeout(t); res(rq.result); };
      rq.onerror = () => { clearTimeout(t); blocked(); };
    });
    return dbp;
  }
  function tx(mode, fn, store) {
    return db().then((d) => new Promise((res, rej) => {
      const t = d.transaction(store || STORE, mode), r = fn(t.objectStore(store || STORE));
      t.oncomplete = () => res(r && r.result);
      t.onerror = t.onabort = () => rej(t.error);
    }));
  }
  const put = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
  const get = (id) => tx('readonly', (s) => s.get(id));
  const del = (id) => tx('readwrite', (s) => s.delete(id));
  // Thu nhỏ ảnh trước khi lưu để nhẹ bộ nhớ
  function shrink(file) {
    return new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1100 / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(u);
        c.toBlob((b) => (b ? res({ blob: b, ar: w / h }) : rej(new Error('Không xử lý được ảnh.'))), 'image/jpeg', 0.86);
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Tệp này không phải ảnh đọc được.')); };
      img.src = u;
    });
  }
  const toDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  function fromDataURL(data) {
    const m = /^data:([^;]+);base64,(.*)$/.exec(data || '');
    if (!m) return null;
    const bin = atob(m[2]), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: m[1] });
  }

  // Kho chung cho tệp lớn (ảnh, nhạc), tách theo từng ngăn
  B.idb = { put: (store, id, blob) => tx('readwrite', (s) => s.put(blob, id), store), get: (store, id) => tx('readonly', (s) => s.get(id), store), del: (store, id) => tx('readwrite', (s) => s.delete(id), store) };

  B.photos = {
    MAX, SIZES, urls,
    init() {
      const list = B.S.photos || [];
      if (!list.length) return Promise.resolve();
      return Promise.all(list.map((p) => get(p.id).then((b) => { if (b) urls[p.id] = URL.createObjectURL(b); }).catch(() => {}))).then(() => B.scene.build());
    },
    add(file) {
      const S = B.S;
      if (S.photos.length >= MAX) return Promise.reject(new Error(`Tường chỉ treo được ${MAX} ảnh.`));
      return shrink(file).then((r) => {
        const id = U.uid(), n = S.photos.length;
        return put(id, r.blob).then(() => {
          urls[id] = URL.createObjectURL(r.blob);
          const p = { id, ar: +U.clamp(r.ar, 0.5, 2).toFixed(3), x: 0.1 + (n % 5) * 0.2, y: 0.22 + (Math.floor(n / 5) % 2) * 0.42, size: 'm', caption: '', date: B.time.today(), rot: +U.rand(-3, 3).toFixed(1) };
          S.photos.push(p);
          B.store.save();
          return p;
        });
      });
    },
    replace(id, file) {
      const p = B.S.photos.find((x) => x.id === id);
      if (!p) return Promise.reject(new Error('Không tìm thấy ảnh.'));
      return shrink(file).then((r) => put(id, r.blob).then(() => { if (urls[id]) URL.revokeObjectURL(urls[id]); urls[id] = URL.createObjectURL(r.blob); p.ar = +U.clamp(r.ar, 0.5, 2).toFixed(3); B.store.save(); return p; }));
    },
    remove(id) {
      B.S.photos = B.S.photos.filter((x) => x.id !== id);
      if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; }
      B.store.save();
      return del(id).catch(() => {});
    },
    clearAll: () => Promise.all([tx('readwrite', (s) => s.clear()), tx('readwrite', (s) => s.clear(), 'audio')]).catch(() => {}),
    exportAll: () => Promise.all((B.S.photos || []).map((p) => get(p.id).then((b) => (b ? toDataURL(b).then((data) => ({ id: p.id, data })) : null)).catch(() => null))).then((l) => l.filter(Boolean)),
    importAll: (list) => Promise.all((list || []).map((x) => { const b = fromDataURL(x.data); return b ? put(x.id, b) : null; })).catch(() => {}),
    // Vị trí khung ảnh trên tường tính theo tỉ lệ, để hợp mọi kích thước màn hình
    place(p, W) {
      const w = SIZES[p.size] || SIZES.m, h = w / (p.ar || 1);
      return { cx: U.clamp(p.x, 0.03, 0.97) * W, cy: 96 + U.clamp(p.y, 0, 1) * 290, w, h };
    },
    svg(L) {
      return (B.S.photos || []).map((p, i) => {
        const url = urls[p.id];
        if (!url) return '';
        const g = B.photos.place(p, L.W), fr = i % 2 ? '#F7EEDC' : '#96693F';
        return `<g transform="translate(${g.cx.toFixed(1)},${g.cy.toFixed(1)}) rotate(${p.rot || 0})"><rect x="${-g.w / 2 - 6}" y="${-g.h / 2 - 6}" width="${g.w + 16}" height="${g.h + 16}" rx="4" fill="#000" opacity=".07"/>
          <rect x="${-g.w / 2 - 8}" y="${-g.h / 2 - 8}" width="${g.w + 16}" height="${g.h + 16}" rx="4" fill="${fr}"/><rect x="${-g.w / 2 - 3}" y="${-g.h / 2 - 3}" width="${g.w + 6}" height="${g.h + 6}" fill="#FFFBF2"/>
          <image href="${url}" x="${-g.w / 2}" y="${-g.h / 2}" width="${g.w}" height="${g.h}" preserveAspectRatio="xMidYMid slice"/>
          ${p.caption && p.size !== 's' ? `<text x="0" y="${g.h / 2 + 22}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#6B4A32" font-family="Quicksand, sans-serif">${U.esc(p.caption.slice(0, 26))}</text>` : ''}</g>`;
      }).join('');
    },
  };
})();
