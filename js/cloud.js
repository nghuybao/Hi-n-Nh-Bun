/* Hiên Nhà Bun — kết nối Supabase: đọc cấu hình công khai, đăng nhập, gọi dữ liệu.
   Chỉ dùng khóa công khai (publishable/anon). Không có khóa bí mật nào trong mã trình duyệt. */
(function () {
  'use strict';
  const B = window.B;
  const CFG_KEY = 'hien-nha-bun:cloudcfg', BUCKET = 'photos';
  let client = null, cfg = null;

  const wait = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'timeout' })), ms))]);
  const isLocal = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  // Khóa bí mật (service role / sb_secret_) tuyệt đối không được nằm ở trình duyệt
  function looksSecret(key) {
    if (/^sb_secret_/.test(key)) return true;
    const p = String(key).split('.');
    if (p.length === 3) { try { return JSON.parse(atob(p[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role'; } catch (e) { return false; } }
    return false;
  }
  function valid(c) {
    if (!c || !c.url || !c.key) return false;
    if (looksSecret(c.key)) { console.error('Hiên Nhà Bun: cấu hình chứa khóa bí mật, đã từ chối sử dụng.'); return false; }
    if (c.mock) return isLocal();
    return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/.test(c.url) || (isLocal() && /^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(c.url));
  }
  async function loadConfig() {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch (e) { cached = null; }
    if (location.protocol === 'file:') return null; // mở thẳng từ tệp: chỉ dùng chế độ khách
    try {
      const r = await wait(fetch('api/config', { cache: 'no-store', credentials: 'omit' }), 3500);
      if (r.ok) {
        const j = await r.json();
        const c = j && j.url && j.key ? { url: j.url, key: j.key, mock: !!j.mock } : null;
        try { if (valid(c)) localStorage.setItem(CFG_KEY, JSON.stringify(c)); else localStorage.removeItem(CFG_KEY); } catch (e) { /* bỏ qua */ }
        return valid(c) ? c : null;
      }
      if (r.status === 404) return null;
    } catch (e) { /* mất mạng: dùng cấu hình đã nhớ */ }
    return valid(cached) ? cached : null;
  }
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }

  /* ---------- Lỗi: gom về vài loại và câu tiếng Việt ---------- */
  function info(err) {
    if (!err) return { kind: 'other', msg: 'Có lỗi không rõ.' };
    const code = err.code || '', m = String(err.message || err.error_description || err || ''), st = err.status || 0;
    if (code === 'timeout' || /Failed to fetch|NetworkError|Load failed|fetch failed|network/i.test(m) || err.name === 'AuthRetryableFetchError') return { kind: 'network', msg: 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.' };
    if (m === 'conflict') return { kind: 'conflict', rev: Number(err.hint) || null, msg: 'Thiết bị khác vừa lưu dữ liệu mới hơn.' };
    if (m === 'cloud_not_empty') return { kind: 'cloud_not_empty', msg: 'Tài khoản này đã có dữ liệu.' };
    if (m === 'no_save') return { kind: 'no_save', msg: 'Tài khoản chưa có dữ liệu trên máy chủ.' };
    if (code === 'otp_expired' || /expired|invalid.*(otp|token)|token.*(invalid|expired)/i.test(m)) return { kind: 'otp', msg: 'Mã không đúng hoặc đã hết hạn. Hãy kiểm tra lại, hoặc bấm gửi lại mã mới.' };
    if (st === 429 || /rate limit|over_.*rate|too many/i.test(code + m)) return { kind: 'rate', msg: 'Bạn thao tác hơi nhanh. Hãy chờ khoảng một phút rồi thử lại.' };
    if (code === 'email_address_invalid' || /invalid.*email|email.*invalid|validation_failed/i.test(code + m)) return { kind: 'email', msg: 'Địa chỉ email chưa đúng. Hãy kiểm tra lại.' };
    if (code === 'signup_disabled' || code === 'otp_disabled' || /signups? not allowed|disabled/i.test(m)) return { kind: 'disabled', msg: 'Cách đăng nhập này đang tạm tắt.' };
    if (code === 'manual_linking_disabled' || /manual linking/i.test(m)) return { kind: 'linking', msg: 'Máy chủ chưa bật tính năng liên kết thêm cách đăng nhập.' };
    if (code === 'identity_already_exists' || /identity.*already/i.test(m)) return { kind: 'linking', msg: 'Tài khoản Google này đã gắn với một tài khoản khác.' };
    if (st === 401 || code === 'PGRST301' || code === '28000' || /JWT|not_authenticated|session/i.test(m)) return { kind: 'auth', msg: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' };
    return { kind: 'other', msg: 'Có lỗi xảy ra: ' + m.slice(0, 140) };
  }
  // Gói kết quả supabase-js {data, error} thành Promise: lỗi thì ném ra
  const unwrap = (r) => { if (r && r.error) throw r.error; return r ? r.data : null; };

  B.cloud = {
    info,
    get enabled() { return !!client; },
    get config() { return cfg; },
    // Gọi một lần lúc khởi động. Không có cấu hình hoặc không tải được thư viện thì chỉ có chế độ khách.
    async init() {
      cfg = await loadConfig();
      if (!cfg) return false;
      try {
        let lib = window.supabase;
        if (cfg.mock) { await loadScript('tests/mock-supabase.js'); lib = window.BunMockSupabase; }
        if (!lib || !lib.createClient) return false;
        client = lib.createClient(cfg.url.replace(/\/$/, ''), cfg.key, {
          auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'hien-nha-bun-auth' },
        });
        return true;
      } catch (e) { console.error(e); client = null; return false; }
    },
    async session() {
      if (!client) return null;
      const r = await wait(client.auth.getSession(), 8000);
      return (r && r.data && r.data.session) || null;
    },
    onAuth(fn) { if (client) client.auth.onAuthStateChange((evt, s) => setTimeout(() => fn(evt, s), 0)); },
    redirectTo: () => location.origin + location.pathname,
    google() {
      return client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: B.cloud.redirectTo(), queryParams: { prompt: 'select_account' } } }).then(unwrap);
    },
    sendOtp(email) { return client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }).then(unwrap); },
    verifyOtp(email, token) { return client.auth.verifyOtp({ email, token, type: 'email' }).then(unwrap); },
    linkGoogle() { return client.auth.linkIdentity({ provider: 'google', options: { redirectTo: B.cloud.redirectTo() } }).then(unwrap); },
    async user() { const r = await client.auth.getUser(); return unwrap(r).user; },
    signOut() { return client.auth.signOut({ scope: 'local' }).then((r) => { if (r && r.error) throw r.error; }); },

    /* ---------- Dữ liệu (mọi bảng đều có RLS: chỉ đọc, ghi được dữ liệu của chính mình) ---------- */
    head() { return wait(client.from('game_saves').select('rev,updated_at,device_id').maybeSingle().then(unwrap), 10000); },
    load() { return wait(client.rpc('load_game').then(unwrap), 25000); },
    summary() { return wait(client.rpc('game_summary').then(unwrap), 15000); },
    createSave(a) {
      return wait(client.rpc('create_save', { p_migration_id: a.migrationId, p_sections: a.sections, p_opening: a.opening, p_source: a.source, p_summary: a.summary || {}, p_device: a.device }).then(unwrap), 45000);
    },
    save(a) {
      return wait(client.rpc('save_game', { p_base_rev: a.base, p_sections: a.sections, p_events: a.events, p_device: a.device }).then(unwrap), 30000);
    },
    touchProfile(uid) { return client.from('profiles').upsert({ id: uid, last_seen_at: new Date().toISOString() }).then(unwrap).catch(() => null); },

    /* ---------- Ảnh: thư mục riêng <user_id>/ trong kho "photos" (riêng tư) ---------- */
    photoPath: (uid, id) => `${uid}/${id}.jpg`,
    uploadPhoto(uid, id, blob) { return wait(client.storage.from(BUCKET).upload(B.cloud.photoPath(uid, id), blob, { upsert: true, contentType: blob.type || 'image/jpeg' }).then(unwrap), 60000); },
    downloadPhoto(uid, id) { return wait(client.storage.from(BUCKET).download(B.cloud.photoPath(uid, id)).then(unwrap), 60000); },
    listPhotos(uid) { return wait(client.storage.from(BUCKET).list(uid, { limit: 1000 }).then(unwrap), 20000); },
    removePhotos(uid, ids) { return ids.length ? client.storage.from(BUCKET).remove(ids.map((id) => B.cloud.photoPath(uid, id))).then(unwrap) : Promise.resolve(); },
  };
})();
