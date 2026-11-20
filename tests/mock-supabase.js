/* Backend Supabase GIẢ LẬP — chỉ để kiểm thử giao diện và bộ đồng bộ trên máy, KHÔNG dùng cho bản thật.
   Chỉ được nạp khi tools/serve.ps1 trả về cấu hình {"mock": true} (config.local.json) và trang chạy ở localhost.
   Dữ liệu dùng chung qua /__mock/db của serve.ps1, nên localhost:5173 và 127.0.0.1:5173 đóng vai hai thiết bị.
   Mô phỏng đúng các quy tắc của supabase/migrations/*.sql: rev/xung đột, sổ xu (giới hạn, chống trùng), chủ sở hữu ảnh.
   Bật lỗi mạng: localStorage['mock-offline'] = '1'. Mã OTP mới nhất: window.BunMockSupabase.lastOtp */
(function () {
  'use strict';
  const SESSION = 'mock-session';
  const SECTIONS = ['core', 'bun', 'house', 'tasks', 'history', 'memories', 'health', 'pets', 'media', 'settings', 'misc'];
  const ascii = (s) => s.replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  const offline = () => localStorage.getItem('mock-offline') === '1';
  const netErr = () => Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError' });
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'u' + Math.random().toString(16).slice(2));
  const err = (message, extra) => ({ data: null, error: Object.assign({ message }, extra || {}) });
  const ok = (data) => ({ data, error: null });

  async function db() {
    if (offline()) throw netErr();
    const r = await fetch('/__mock/db', { cache: 'no-store' });
    const d = await r.json();
    return Object.assign({ users: [], otps: {}, saves: {}, sections: {}, coins: [], migrations: [], objects: {}, profiles: {} }, d);
  }
  async function put(d) { await fetch('/__mock/db', { method: 'PUT', body: ascii(JSON.stringify(d)) }); }
  const getSession = () => { try { return JSON.parse(localStorage.getItem(SESSION) || 'null'); } catch (e) { return null; } };
  const uidNow = () => { const s = getSession(); return s && s.user ? s.user.id : null; };

  function userFor(d, email, provider) {
    email = email.toLowerCase();
    let u = d.users.find((x) => x.email === email);
    if (!u) { u = { id: uuid(), email, identities: [] }; d.users.push(u); }
    if (!u.identities.some((i) => i.provider === provider)) u.identities.push({ provider });
    return u;
  }
  function makeSession(u) { return { access_token: 'mock.' + u.id, user: { id: u.id, email: u.email, identities: u.identities.slice() } }; }

  function balance(d, uid) { return d.coins.filter((c) => c.user_id === uid).reduce((a, c) => a + c.amount, 0); }
  function guard(d, uid, e) {
    const k = e.kind, a = e.amount;
    if (k === 'opening') { if (a < 0 || a > 200000) return false; if (d.coins.some((c) => c.user_id === uid && c.kind === 'opening')) return false; }
    else if (k === 'earn') { if (a < 0 || a > 1000) return false; }
    else if (k === 'spend' || k === 'refund') { if (a > 0 || a < -5000) return false; }
    else if (k === 'reset') { if (a > 60 || a < -1000000) return false; }
    else return false;
    if (a > 0 && k !== 'opening') {
      const day = Date.now() - 86400000;
      const earned = d.coins.filter((c) => c.user_id === uid && c.amount > 0 && c.kind !== 'opening' && c.at > day).reduce((s, c) => s + c.amount, 0);
      if (earned + a > 6000) return false;
    }
    return true;
  }
  function addCoin(d, uid, e) {
    if (d.coins.some((c) => c.user_id === uid && c.event_id === e.id)) return;
    if (!guard(d, uid, e)) return;
    d.coins.push({ user_id: uid, event_id: e.id, amount: e.amount, kind: e.kind, at: Date.now() });
  }
  function sectionsOf(d, uid) { const s = {}; Object.keys(d.sections[uid] || {}).forEach((k) => (s[k] = d.sections[uid][k].data)); return s; }
  function summary(d, uid) {
    const h = d.saves[uid];
    if (!h) return { exists: false };
    const s = sectionsOf(d, uid), len = (v) => (Array.isArray(v) ? v.length : 0);
    return { exists: true, rev: h.rev, updated_at: h.updated_at, balance: balance(d, uid), tasks: len(s.tasks && s.tasks.tasks), memories: len(s.memories && s.memories.memories),
      achievements: Object.keys((s.memories && s.memories.achievements) || {}).length, owned: len(s.house && s.house.house && s.house.house.owned), pets: len(s.pets && s.pets.pets),
      photos: len(s.media && s.media.photos), ledger: len(s.history && s.history.ledger), bun_gen: s.bun && s.bun.bun && String(s.bun.bun.gen), sections: Object.keys(s).length };
  }
  const badSections = (p) => !p || typeof p !== 'object' || Object.keys(p).some((k) => SECTIONS.indexOf(k) < 0);

  const RPC = {
    load_game(d, uid) { const h = d.saves[uid]; return h ? { exists: true, rev: h.rev, updated_at: h.updated_at, device_id: h.device_id, sections: sectionsOf(d, uid), balance: balance(d, uid) } : { exists: false }; },
    game_summary(d, uid) { return summary(d, uid); },
    create_save(d, uid, a) {
      if (badSections(a.p_sections)) throw { message: 'bad_section' };
      if (d.migrations.some((m) => m.user_id === uid && m.migration_id === a.p_migration_id)) return Object.assign(summary(d, uid), { repeat: true });
      if (d.saves[uid]) throw { message: 'cloud_not_empty' };
      const now = new Date().toISOString();
      d.saves[uid] = { rev: 1, updated_at: now, device_id: a.p_device };
      d.sections[uid] = {};
      Object.keys(a.p_sections).forEach((k) => (d.sections[uid][k] = { data: a.p_sections[k], rev: 1 }));
      addCoin(d, uid, { id: 'opening:' + a.p_migration_id, amount: Math.max(0, Math.min(a.p_opening || 0, 200000)), kind: 'opening' });
      d.migrations.push({ user_id: uid, migration_id: a.p_migration_id, source: a.p_source });
      return Object.assign(summary(d, uid), { repeat: false });
    },
    save_game(d, uid, a) {
      if (badSections(a.p_sections) || !Array.isArray(a.p_events) || a.p_events.length > 500) throw { message: 'bad_payload' };
      const h = d.saves[uid];
      if (!h) throw { message: 'no_save' };
      if (h.rev !== a.p_base_rev) throw { message: 'conflict', hint: String(h.rev) };
      const nrev = h.rev + 1;
      Object.keys(a.p_sections).forEach((k) => (d.sections[uid][k] = { data: a.p_sections[k], rev: nrev }));
      a.p_events.forEach((e) => addCoin(d, uid, e));
      h.rev = nrev; h.updated_at = new Date().toISOString(); h.device_id = a.p_device;
      return { rev: nrev, balance: balance(d, uid), updated_at: h.updated_at };
    },
  };

  function query(table) {
    const q = { table, filters: [] };
    const run = async (single) => {
      const d = await db(), uid = uidNow();
      if (!uid) return single ? ok(null) : ok([]); // RLS: chưa đăng nhập thì không thấy gì
      if (table === 'game_saves') { const h = d.saves[uid]; return ok(single ? (h ? { rev: h.rev, updated_at: h.updated_at, device_id: h.device_id } : null) : h ? [Object.assign({ user_id: uid }, h)] : []); }
      return ok(single ? null : []);
    };
    const b = {
      select() { return b; }, eq(c, v) { q.filters.push([c, v]); return b; },
      maybeSingle() { return run(true).catch(() => err('Failed to fetch')); },
      then(res, rej) { return run(false).then(res, rej); },
      upsert(row) {
        return (async () => {
          const d = await db(), uid = uidNow();
          if (!uid || row.id !== uid) return err('new row violates row-level security policy', { code: '42501' });
          d.profiles[uid] = Object.assign(d.profiles[uid] || {}, row); await put(d); return ok(null);
        })().catch(() => err('Failed to fetch'));
      },
    };
    return b;
  }

  const listeners = [];
  const emit = (evt, s) => listeners.forEach((fn) => { try { fn(evt, s); } catch (e) { console.error(e); } });

  window.BunMockSupabase = {
    lastOtp: null,
    createClient() {
      // Hoàn tất "đăng nhập Google" giả khi quay lại với ?code=mock:<email>
      const init = (async () => {
        const q = new URLSearchParams(location.search), code = q.get('code');
        if (code && code.indexOf('mock:') === 0) {
          const d = await db(), email = decodeURIComponent(code.slice(5)), link = localStorage.getItem('mock-linking');
          let u;
          if (link) { u = d.users.find((x) => x.id === link); localStorage.removeItem('mock-linking'); if (u && !u.identities.some((i) => i.provider === 'google')) u.identities.push({ provider: 'google' }); }
          else u = userFor(d, email, 'google');
          await put(d);
          localStorage.setItem(SESSION, JSON.stringify(makeSession(u)));
          emit('SIGNED_IN', getSession());
        }
      })().catch(() => {});
      return {
        auth: {
          async getSession() { await init; return ok({ session: getSession() }); },
          async getUser() { const s = getSession(); if (!s) return err('not_authenticated', { status: 401 }); try { const d = await db(); const u = d.users.find((x) => x.id === s.user.id); return ok({ user: u ? makeSession(u).user : s.user }); } catch (e) { return err('Failed to fetch'); } },
          onAuthStateChange(fn) { listeners.push(fn); return { data: { subscription: { unsubscribe() {} } } }; },
          async signInWithOtp({ email }) {
            try {
              const d = await db(), o = d.otps[email.toLowerCase()];
              if (o && Date.now() - o.at < 60000) return err('For security purposes, you can only request this after 60 seconds.', { status: 429, code: 'over_email_send_rate_limit' });
              const code = String(Math.floor(100000 + Math.random() * 900000));
              d.otps[email.toLowerCase()] = { code, at: Date.now() };
              await put(d);
              window.BunMockSupabase.lastOtp = code;
              console.info('[mock] Mã OTP cho ' + email + ': ' + code);
              return ok({});
            } catch (e) { return { data: null, error: netErr() }; }
          },
          async verifyOtp({ email, token }) {
            try {
              const d = await db(), o = d.otps[email.toLowerCase()];
              if (!o || o.code !== token || Date.now() - o.at > 600000) return err('Token has expired or is invalid', { status: 403, code: 'otp_expired' });
              delete d.otps[email.toLowerCase()];
              const u = userFor(d, email, 'email');
              await put(d);
              const s = makeSession(u);
              localStorage.setItem(SESSION, JSON.stringify(s));
              emit('SIGNED_IN', s);
              return ok({ session: s, user: s.user });
            } catch (e) { return { data: null, error: netErr() }; }
          },
          async signInWithOAuth({ options }) {
            const email = localStorage.getItem('mock-oauth-email') || 'google.user@example.com';
            location.assign(options.redirectTo + '?code=mock:' + encodeURIComponent(email));
            return ok({});
          },
          async linkIdentity({ options }) {
            const s = getSession();
            localStorage.setItem('mock-linking', s.user.id);
            location.assign(options.redirectTo + '?code=mock:' + encodeURIComponent(s.user.email));
            return ok({});
          },
          async signOut() { localStorage.removeItem(SESSION); emit('SIGNED_OUT', null); return { error: null }; },
        },
        from: query,
        async rpc(name, args) {
          try {
            const d = await db(), uid = uidNow();
            if (!uid) return err('not_authenticated', { code: '28000', status: 401 });
            const data = RPC[name](d, uid, args || {});
            if (name === 'create_save' || name === 'save_game') await put(d);
            return ok(JSON.parse(JSON.stringify(data)));
          } catch (e) { return e && e.message && e.message !== 'Failed to fetch' ? { data: null, error: e } : { data: null, error: netErr() }; }
        },
        storage: {
          from() {
            const own = (path) => path.split('/')[0] === uidNow();
            const wrap = (fn) => fn().catch(() => ({ data: null, error: netErr() }));
            return {
              upload: (path, blob) => wrap(async () => {
                if (!own(path)) return err('new row violates row-level security policy', { statusCode: '403' });
                const data = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
                const d = await db(); d.objects[path] = data; await put(d); return ok({ path });
              }),
              download: (path) => wrap(async () => {
                if (!own(path)) return err('Object not found', { statusCode: '400' });
                const d = await db(), u = d.objects[path];
                if (!u) return err('Object not found', { statusCode: '400' });
                return ok(await (await fetch(u)).blob());
              }),
              list: (prefix) => wrap(async () => {
                if (prefix !== uidNow()) return ok([]);
                const d = await db();
                return ok(Object.keys(d.objects).filter((k) => k.indexOf(prefix + '/') === 0).map((k) => ({ name: k.slice(prefix.length + 1) })));
              }),
              remove: (paths) => wrap(async () => { const d = await db(); paths.filter(own).forEach((p) => delete d.objects[p]); await put(d); return ok([]); }),
            };
          },
        },
      };
    },
  };
})();
