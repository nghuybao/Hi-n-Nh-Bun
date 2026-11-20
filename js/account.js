/* Hiên Nhà Bun — vào nhà: khách, Google, Email (mã OTP); chuyển dữ liệu khách lên tài khoản; hộp tài khoản.
   Chế độ khách giữ nguyên cách lưu cũ (localStorage + IndexedDB trên máy), không cần mạng hay đăng ký. */
(function () {
  'use strict';
  const B = window.B, U = B.util, A = B.art, esc = U.esc, ic = B.icon;
  const MODE = 'hien-nha-bun:mode', MIGR = 'hien-nha-bun:migration', DONE = 'hien-nha-bun:migrated', NUDGE = 'hien-nha-bun:nudged';
  const RESEND = 60; // giây chờ trước khi gửi lại mã (khớp giới hạn mặc định của Supabase)
  const acc = { mode: 'guest', uid: null, email: null, user: null, cloudOn: false, offline: false, deferred: [] };
  const GOOGLE = '<svg class="ic g-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>';

  const read = (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } };
  const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } };
  const readMode = () => read(MODE, {}) || {};
  const writeMode = (m) => write(MODE, m);
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  const fmtTime = (ms) => { if (!ms) return ''; const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ngày ${d.getDate()}/${d.getMonth() + 1}`; };

  /* ---------- Dữ liệu khách trên máy ---------- */
  function guestState() { const s = B.store.peek(B.store.GUEST_KEY); return s && s.bun ? s : null; }
  // Có đáng để chuyển không: đã dùng thật (không chỉ vừa mở thử)
  function meaningful(s) {
    if (!s) return false;
    return (s.tasks || []).length > 0 || ((s.totals || {}).tasksDone || 0) > 0 || (s.memories || []).length > 0 || (s.photos || []).length > 0
      || (s.pets || []).length > 0 || ((s.house || {}).owned || []).length > 3 || s.coins !== 60 || Date.now() - (s.createdAt || Date.now()) > 30 * 60000;
  }
  const migratedTo = (s) => (read(DONE, {}) || {})[String(s && s.createdAt)] || null;
  // Dữ liệu khách có thể chuyển cho tài khoản này (chưa chuyển, chưa từ chối)
  function guestCandidate(uid) {
    const s = guestState();
    if (!meaningful(s)) return null;
    const m = migratedTo(s);
    if (m && (m.migrationId || m.skippedBy === uid)) return null;
    return s;
  }
  function markGuest(s, info) { const d = read(DONE, {}) || {}; d[String(s.createdAt)] = Object.assign({ at: Date.now() }, info); write(DONE, d); }
  function summarize(s) {
    const h = s.house || {}, days = Math.max(1, Math.floor((Date.now() - ((s.bun && s.bun.bornAt) || Date.now())) / 86400000) + 1);
    return { name: (s.bun && s.bun.name) || 'Bun', gen: (s.bun && s.bun.gen) || 1, days, coins: s.coins || 0, tasks: (s.tasks || []).length, done: (s.totals || {}).tasksDone || 0,
      owned: (h.owned || []).length, level: h.level || 1, pets: (s.pets || []).length, memories: (s.memories || []).length, achievements: Object.keys(s.achievements || {}).length,
      photos: (s.photos || []).length, ledger: (s.ledger || []).length, lastSeen: s.lastSeen || 0 };
  }
  function sumHTML(x) {
    return `<ul class="mig-list">
      <li>${ic('paw')}<span><b>${esc(x.name)}</b> đời thứ ${x.gen}, ${x.days} ngày bên nhau</span></li>
      <li>${ic('coin')}<span><b>${x.coins}</b> xu và ${x.ledger} dòng chi tiêu</span></li>
      <li>${ic('check')}<span><b>${x.tasks}</b> việc trong sổ, đã hoàn thành ${x.done} việc</span></li>
      <li>${ic('home')}<span><b>${x.owned}</b> món đồ, nhà cấp ${x.level}</span></li>
      <li>${ic('heart')}<span><b>${x.pets}</b> bạn đồng hành, ${x.memories} kỷ niệm, ${x.achievements} thành tích</span></li>
      <li>${ic('frame')}<span><b>${x.photos}</b> ảnh trên tường</span></li></ul>`;
  }
  async function exportGuest() {
    const s = guestState();
    if (!s) return;
    const photos = await Promise.all((s.photos || []).map((p) => B.idb.get('photos', p.id).then((b) => (b ? new Promise((r) => { const f = new FileReader(); f.onload = () => r({ id: p.id, data: f.result }); f.onerror = () => r(null); f.readAsDataURL(b); }) : null)).catch(() => null)));
    const text = JSON.stringify({ app: 'hien-nha-bun', v: 2, exportedAt: new Date().toISOString(), state: s, photos: photos.filter(Boolean) });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = `hien-nha-bun-khach-${U.dateKey(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  /* ---------- Cổng vào (trước khi căn nhà được dựng) ---------- */
  let gateEl = null;
  function gate(html) {
    if (!gateEl) {
      gateEl = document.createElement('div');
      gateEl.id = 'gate'; gateEl.className = 'gate';
      gateEl.setAttribute('role', 'dialog'); gateEl.setAttribute('aria-modal', 'true'); gateEl.setAttribute('aria-label', 'Vào Hiên Nhà Bun');
      gateEl.innerHTML = `<div class="gate-card"><div class="gate-bun">${A.portrait({ head: null, face: null, neck: 'bandana_blue', body: null }, 'sit', 'happy')}</div><div class="gate-body"></div></div>`;
      document.body.appendChild(gateEl);
    }
    const body = gateEl.querySelector('.gate-body');
    body.innerHTML = html;
    const f = body.querySelector('[data-autofocus]');
    if (f) setTimeout(() => f.focus(), 30);
    return body;
  }
  function closeGate() { if (gateEl) { gateEl.classList.add('out'); const g = gateEl; gateEl = null; setTimeout(() => g.remove(), 260); } }
  const loading = (text) => gate(`<div class="gate-load"><span class="spin" aria-hidden="true"></span><p>${text || 'Đang mở cửa nhà Bun…'}</p></div>`);
  // Chờ người dùng bấm một nút có data-choice trong cổng
  function choose(html) {
    const body = gate(html);
    return new Promise((res) => {
      body.addEventListener('click', function on(e) {
        const b = e.target.closest('[data-choice]');
        if (!b) return;
        if (b.dataset.choice === 'backup') { exportGuest(); return; }
        if (b.dataset.choice === 'review') { const r = body.querySelector('.mig-review'); if (r) r.hidden = !r.hidden; return; }
        body.removeEventListener('click', on); res(b.dataset.choice);
      });
    });
  }

  /* ---------- Biểu mẫu đăng nhập (dùng chung cho cổng và hộp thoại trong nhà) ---------- */
  function authFlow(root, opts) {
    const f = { screen: opts.screen || 'choose', email: '', err: '', busy: false, timer: null };
    const left = () => { const t = Number(sessionStorage.getItem('hien-nha-bun:otp-at:' + f.email) || 0); return Math.max(0, RESEND - Math.floor((Date.now() - t) / 1000)); };
    function draw() {
      clearInterval(f.timer);
      const err = f.err ? `<p class="auth-err" role="alert">${esc(f.err)}</p>` : '<p class="auth-err" role="alert"></p>';
      if (f.screen === 'choose') {
        root.innerHTML = `${opts.head || ''}
          <div class="gate-actions">
            ${opts.guest ? `<button class="btn primary big" data-a="guest" data-autofocus>${ic('home')}Vào nhà với tư cách khách</button>
            <p class="gate-note">Không cần đăng ký. Mọi thứ được lưu ngay trên thiết bị này.</p>` : ''}
            ${acc.cloudOn ? `${opts.guest ? '<div class="gate-or"><span>hoặc mang Bun theo trên mọi thiết bị</span></div>' : ''}
            <button class="btn soft big g-btn" data-a="google" ${opts.guest ? '' : 'data-autofocus'}>${GOOGLE}Tiếp tục với Google</button>
            <button class="btn soft big" data-a="email">${ic('mail')}Tiếp tục với Email</button>`
            : `<p class="gate-note">Đăng nhập chưa được bật trên bản này${location.protocol === 'file:' ? ' (đang mở thẳng từ tệp)' : ''}. Bạn vẫn dùng đầy đủ mọi tính năng ở chế độ khách.</p>`}
          </div>${err}${opts.foot || ''}`;
      } else if (f.screen === 'email') {
        root.innerHTML = `<h2 class="gate-h">Tiếp tục với Email</h2><p class="gate-lead">Chúng mình sẽ gửi một mã gồm 6 chữ số. Không cần mật khẩu.</p>
          <form class="auth-form" data-f="email" novalidate><label class="sr" for="authEmail">Email</label>
            <input id="authEmail" type="email" autocomplete="email" inputmode="email" placeholder="Nhập địa chỉ email của bạn" value="${esc(f.email)}" required data-autofocus>
            <button class="btn primary big" type="submit" ${f.busy ? 'disabled' : ''}>${f.busy ? 'Đang gửi…' : 'Gửi mã xác nhận'}</button></form>
          ${err}<button class="btn ghost sm" data-a="back">Quay lại</button>`;
      } else {
        const l = left();
        root.innerHTML = `<h2 class="gate-h">Nhập mã xác nhận</h2><p class="gate-lead">Chúng mình đã gửi mã xác nhận đến email của bạn.</p>
          <p class="auth-mail"><b>${esc(f.email)}</b><button class="link" data-a="change">Đổi email</button></p>
          <form class="auth-form" data-f="code" novalidate><label class="sr" for="authCode">Mã xác nhận 6 chữ số</label>
            <input id="authCode" class="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" placeholder="······" data-autofocus>
            <button class="btn primary big" type="submit" ${f.busy ? 'disabled' : ''}>${f.busy ? 'Đang kiểm tra…' : 'Xác nhận'}</button></form>
          ${err}<p class="gate-note">Không thấy thư? Hãy xem cả mục Thư rác hoặc Quảng cáo. Mã chỉ có hiệu lực trong thời gian ngắn.</p>
          <button class="btn ghost sm" data-a="resend" ${l ? 'disabled' : ''}>${l ? `Gửi lại mã (${l} giây)` : 'Gửi lại mã'}</button>`;
        if (l) f.timer = setInterval(() => { const b = root.querySelector('[data-a="resend"]'), n = left(); if (!b) return clearInterval(f.timer); b.disabled = n > 0; b.textContent = n ? `Gửi lại mã (${n} giây)` : 'Gửi lại mã'; if (!n) clearInterval(f.timer); }, 1000);
      }
      const af = root.querySelector('[data-autofocus]');
      if (af) setTimeout(() => af.focus(), 30);
    }
    async function send() {
      if (!emailOk(f.email)) { f.err = 'Địa chỉ email chưa đúng. Hãy kiểm tra lại.'; return draw(); }
      if (left()) { f.screen = 'code'; f.err = ''; return draw(); }
      f.busy = true; f.err = ''; draw();
      try {
        await B.cloud.sendOtp(f.email);
        sessionStorage.setItem('hien-nha-bun:otp-at:' + f.email, String(Date.now()));
        f.screen = 'code';
      } catch (e) {
        const i = B.cloud.info(e);
        f.err = i.msg;
        if (i.kind === 'rate') { sessionStorage.setItem('hien-nha-bun:otp-at:' + f.email, String(Date.now())); f.screen = 'code'; }
      }
      f.busy = false; draw();
    }
    async function verify(code) {
      if (!/^\d{6}$/.test(code)) { f.err = 'Mã gồm đúng 6 chữ số.'; return draw(); }
      f.busy = true; f.err = ''; draw();
      try {
        const r = await B.cloud.verifyOtp(f.email, code);
        if (!r || !r.session) throw new Error('Không nhận được phiên đăng nhập.');
        sessionStorage.removeItem('hien-nha-bun:otp-at:' + f.email);
        clearInterval(f.timer);
        opts.onSignedIn(r.session.user);
      } catch (e) { f.busy = false; f.err = B.cloud.info(e).msg; draw(); }
    }
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]');
      if (!b || f.busy) return;
      const a = b.dataset.a;
      if (a === 'guest') return opts.onGuest && opts.onGuest();
      if (a === 'email') { f.screen = 'email'; f.err = ''; return draw(); }
      if (a === 'back') { f.screen = 'choose'; f.err = ''; return draw(); }
      if (a === 'change') { f.screen = 'email'; f.err = ''; return draw(); }
      if (a === 'resend') { sessionStorage.removeItem('hien-nha-bun:otp-at:' + f.email); return send(); }
      if (a === 'google') {
        f.busy = true;
        try { if (opts.beforeRedirect) opts.beforeRedirect(); await B.cloud.google(); /* trình duyệt chuyển sang Google */ }
        catch (err) { f.busy = false; f.err = B.cloud.info(err).msg; draw(); }
      }
    });
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      if (f.busy) return;
      if (e.target.dataset.f === 'email') { f.email = root.querySelector('#authEmail').value.trim().toLowerCase(); send(); }
      else verify(root.querySelector('#authCode').value.trim());
    });
    root.addEventListener('input', (e) => {
      if (e.target.id !== 'authCode') return;
      const v = e.target.value.replace(/\D/g, '').slice(0, 6);
      e.target.value = v;
      if (v.length === 6 && !f.busy) verify(v);
    });
    draw();
    return f;
  }

  /* ---------- Khởi động: quyết định mở ngăn dữ liệu nào ---------- */
  function cleanUrl() {
    const u = new URL(location.href);
    ['code', 'error', 'error_code', 'error_description', 'state'].forEach((k) => u.searchParams.delete(k));
    history.replaceState(null, '', u.pathname + (u.searchParams.toString() ? '?' + u.searchParams : ''));
  }
  function oauthError() {
    const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#/, ''));
    const e = q.get('error') || h.get('error'), d = q.get('error_description') || h.get('error_description') || '';
    if (!e) return null;
    return e === 'access_denied' || /cancel|denied/i.test(d) ? 'Bạn đã hủy đăng nhập Google. Không có gì thay đổi.' : 'Đăng nhập Google chưa thành công. Hãy thử lại sau ít phút.';
  }
  function useGuest() {
    B.store.use(B.store.GUEST_KEY);
    acc.mode = 'guest'; acc.uid = null;
    writeMode({ mode: 'guest' });
    closeGate();
  }
  function useAccount(user, o) {
    o = o || {};
    acc.mode = 'account'; acc.uid = user.id; acc.email = user.email || acc.email; acc.user = user; acc.offline = !!o.offline;
    writeMode({ mode: 'account', uid: user.id, email: acc.email });
    B.store.use(B.sync.keys(user.id).state);
    B.sync.attach(user.id);
    closeGate();
  }
  function showGate(notice) {
    return new Promise((res) => {
      const g = guestState(), mig = g && migratedTo(g);
      const body = gate('');
      authFlow(body, {
        guest: true,
        head: `<h1 class="gate-title">Hiên Nhà Bun</h1><p class="gate-lead">Bun đang ngồi đợi ở hiên nhà. Bạn muốn vào nhà theo cách nào?</p>${notice ? `<p class="gate-flag">${esc(notice)}</p>` : ''}`,
        foot: mig && mig.migrationId ? '<p class="gate-note small">Dữ liệu khách trên máy này đã được chuyển lên tài khoản. Vào chế độ khách sẽ mở lại bản cũ còn lưu trên máy.</p>' : '',
        onGuest: () => { useGuest(); res(); },
        onSignedIn: (user) => enterAccount(user, { fresh: true }).then(res),
      });
    });
  }

  async function enterAccount(user, o) {
    o = o || {};
    loading('Đang mở cửa nhà Bun…');
    const K = B.sync.keys(user.id), meta = read(K.meta, null), hasCache = !!localStorage.getItem(K.state);
    let head;
    try { head = await B.cloud.head(); } catch (e) {
      const i = B.cloud.info(e);
      if (hasCache) { useAccount(user, { offline: true }); acc.deferred.push(() => B.ui.toast('Chưa kết nối được máy chủ. Bạn vẫn dùng được dữ liệu đã lưu trên máy, thay đổi sẽ được gửi lên khi có mạng.', { icon: 'cloud', ms: 7000 })); return; }
      const c = await choose(`<h2 class="gate-h">Chưa mở được tài khoản</h2><p class="gate-lead">${esc(i.kind === 'network' ? 'Cần kết nối mạng để mở tài khoản lần đầu trên thiết bị này.' : i.msg)}</p>
        <div class="gate-actions"><button class="btn primary big" data-choice="retry" data-autofocus>${ic('refresh')}Thử lại</button><button class="btn soft big" data-choice="guest">${ic('home')}Tạm vào chế độ khách</button></div>`);
      if (c === 'retry') return enterAccount(user, o);
      await signOutQuiet(); useGuest(); return;
    }
    B.cloud.touchProfile(user.id);
    const pend = read(MIGR, null), wants = o.fresh || (pend && (!pend.uid || pend.uid === user.id) && pend.phase !== 'completed');
    const guest = wants ? guestCandidate(user.id) : null;

    if (head) {
      // Lần chuyển trước của chính máy này có thể đã ghi xong trên máy chủ nhưng mất phản hồi:
      // chạy lại với cùng mã chuyển. Máy chủ nhận ra mã cũ thì chỉ trả kết quả; nếu dữ liệu là của nơi khác thì sang tình huống B.
      if (guest && pend && pend.uid === user.id && pend.guest === guest.createdAt && ['photos', 'save', 'failed'].indexOf(pend.phase) >= 0) return migrate(user, guest);
      if (guest) {
        // Tình huống B: tài khoản đã có dữ liệu, máy này có dữ liệu khách. Không gộp, không ghi đè.
        const c = await scenarioB(guest);
        if (c === 'guest') { await signOutQuiet(); useGuest(); return; }
        markGuest(guest, { skippedBy: user.id }); write(MIGR, null);
      }
      if (hasCache && meta && meta.rev === head.rev) return useAccount(user);
      if (hasCache && meta && (meta.dirty || (read(K.outbox, []) || []).length)) {
        // Có thay đổi chưa gửi trên máy này và bản trên tài khoản cũng đã đổi: mở bản trên máy, rồi hỏi người dùng
        useAccount(user); acc.deferred.push(() => B.sync.check()); return;
      }
      try { loading('Đang tải thế giới của Bun từ tài khoản…'); B.sync.writeCache(user.id, await B.cloud.load()); }
      catch (e) {
        if (hasCache) { useAccount(user, { offline: true }); return; }
        const c = await choose(`<h2 class="gate-h">Chưa tải được dữ liệu</h2><p class="gate-lead">${esc(B.cloud.info(e).msg)}</p><div class="gate-actions"><button class="btn primary big" data-choice="retry" data-autofocus>${ic('refresh')}Thử lại</button><button class="btn soft big" data-choice="guest">${ic('home')}Tạm vào chế độ khách</button></div>`);
        if (c === 'retry') return enterAccount(user, o);
        await signOutQuiet(); useGuest(); return;
      }
      return useAccount(user);
    }

    // Tài khoản chưa có dữ liệu trên máy chủ
    if (guest) {
      const c = await scenarioA(guest);
      if (c === 'later') { await signOutQuiet(); useGuest(); return; }
      if (c === 'migrate') return migrate(user, guest);
      markGuest(guest, { skippedBy: user.id }); write(MIGR, null);
    }
    return createFresh(user, hasCache ? B.store.peek(K.state) : null);
  }

  /* ---------- Tình huống A: chuyển dữ liệu khách lên tài khoản mới ---------- */
  function scenarioA(g) {
    return choose(`<h2 class="gate-h">Mang thế giới này theo tài khoản?</h2>
      <p class="gate-lead">Trên thiết bị này đang có thế giới của Bun ở chế độ khách. Bạn có thể chuyển toàn bộ lên tài khoản để mở được trên mọi thiết bị.</p>
      ${sumHTML(summarize(g))}
      <p class="gate-note">Sẽ chuyển: Bun và chỉ số, xu và lịch sử chi tiêu, công việc và kế hoạch, đồ đạc và cách bày phòng, quần áo, bạn đồng hành, sổ sức khỏe, kỷ niệm, thành tích, ảnh trên tường và cài đặt. Nhạc bạn tự nhập vẫn chỉ ở trên máy này. Bản trên máy được giữ nguyên làm bản dự phòng.</p>
      <div class="gate-actions"><button class="btn primary big" data-choice="migrate" data-autofocus>${ic('cloud')}Chuyển lên tài khoản</button>
      <button class="btn soft big" data-choice="fresh">Bắt đầu thế giới mới trên tài khoản</button>
      <button class="btn ghost sm" data-choice="later">Để sau, tiếp tục làm khách</button></div>`);
  }

  /* ---------- Tình huống B: tài khoản đã có dữ liệu ---------- */
  async function scenarioB(g) {
    let cs = null;
    try { cs = await B.cloud.summary(); } catch (e) { cs = null; }
    const local = summarize(g);
    const row = (label, a, b) => `<tr><th>${label}</th><td>${a}</td><td>${b}</td></tr>`;
    const review = cs && cs.exists ? `<table class="mig-cmp"><thead><tr><th></th><td>Trên thiết bị này</td><td>Trên tài khoản</td></tr></thead><tbody>
      ${row('Xu', local.coins, cs.balance)}${row('Việc trong sổ', local.tasks, cs.tasks)}${row('Món đồ', local.owned, cs.owned)}
      ${row('Bạn đồng hành', local.pets, cs.pets)}${row('Kỷ niệm', local.memories, cs.memories)}${row('Thành tích', local.achievements, cs.achievements)}
      ${row('Ảnh', local.photos, cs.photos)}${row('Lần cuối dùng', local.lastSeen ? fmtTime(local.lastSeen) : '?', cs.updated_at ? fmtTime(Date.parse(cs.updated_at)) : '?')}</tbody></table>` : sumHTML(local);
    return choose(`<h2 class="gate-h">Tài khoản này đã có thế giới của Bun</h2>
      <p class="gate-lead">Thiết bị này cũng có dữ liệu ở chế độ khách. Để tránh trùng xu, trùng việc và mất kỷ niệm, hai thế giới sẽ không bị gộp hay ghi đè lên nhau.</p>
      <div class="mig-review" hidden>${review}</div>
      <div class="gate-actions"><button class="btn primary big" data-choice="cloud" data-autofocus>${ic('cloud')}Sử dụng dữ liệu trên tài khoản</button>
      <button class="btn soft big" data-choice="review">${ic('list')}Xem lại dữ liệu đang có trên thiết bị</button>
      <button class="btn soft big" data-choice="backup">${ic('download')}Lưu bản sao lưu trước khi xử lý</button>
      <button class="btn ghost sm" data-choice="guest">Tiếp tục làm khách trên thiết bị này</button></div>
      <p class="gate-note">Dùng dữ liệu trên tài khoản thì dữ liệu khách vẫn còn nguyên trên máy này, mở lại được khi vào chế độ khách.</p>`);
  }

  /* ---------- Chuyển dữ liệu: ảnh trước, rồi toàn bộ thế giới trong một giao dịch, rồi đối chiếu ---------- */
  function progress(step, detail) {
    const steps = ['Tải ảnh lên', 'Lưu thế giới của Bun', 'Kiểm tra lại dữ liệu'];
    gate(`<h2 class="gate-h">Đang chuyển thế giới của Bun</h2><p class="gate-lead">Đừng đóng trang nhé. Nếu bị gián đoạn, dữ liệu trên máy vẫn còn nguyên và bạn có thể thử lại.</p>
      <ol class="mig-steps">${steps.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'now' : ''}">${i < step ? ic('check') : i === step ? '<span class="spin" aria-hidden="true"></span>' : '<i></i>'}<span>${s}${i === step && detail ? ` <small>${esc(detail)}</small>` : ''}</span></li>`).join('')}</ol>`);
  }
  async function migrate(user, guest) {
    let mig = read(MIGR, null);
    if (!mig || (mig.uid && mig.uid !== user.id) || mig.guest !== guest.createdAt) mig = { id: B.sync.newId(), guest: guest.createdAt, startedAt: Date.now() };
    mig.uid = user.id; mig.phase = 'photos'; write(MIGR, mig);
    const S = B.store.normalize(JSON.parse(JSON.stringify(guest))), sum = summarize(S), uploaded = [];
    try {
      // 1. Ảnh: tải lên thư mục riêng, ghi đè an toàn nếu thử lại
      const list = S.photos || [];
      let missing = 0;
      for (let i = 0; i < list.length; i++) {
        progress(0, `${i + 1}/${list.length}`);
        const blob = await B.idb.get('photos', list[i].id).catch(() => null);
        if (!blob) { missing++; continue; }
        await B.cloud.uploadPhoto(user.id, list[i].id, blob);
        uploaded.push(list[i].id);
      }
      if (uploaded.length) {
        const names = new Set((await B.cloud.listPhotos(user.id)).map((o) => o.name));
        const lost = uploaded.filter((id) => !names.has(id + '.jpg'));
        if (lost.length) throw new Error(`Có ${lost.length} ảnh chưa lên được máy chủ.`);
      }
      // 2. Thế giới: một giao dịch duy nhất, mã chuyển cố định nên thử lại không tạo bản trùng
      mig.phase = 'save'; write(MIGR, mig);
      progress(1);
      const parts = B.sync.split(S);
      const res = await B.cloud.createSave({ migrationId: mig.id, sections: parts, opening: S.coins, source: 'guest', summary: sum, device: B.sync.deviceId() });
      // 3. Đối chiếu từng phần với bản gửi đi
      progress(2);
      const g = await B.cloud.load();
      if (!res.repeat || g.rev === 1) {
        const bad = Object.keys(parts).filter((s) => B.sync.canon(parts[s]) !== B.sync.canon((g.sections || {})[s] || {}));
        if (Number(g.balance) !== S.coins) bad.push('xu');
        if (res.tasks !== (S.tasks || []).length || res.owned !== ((S.house || {}).owned || []).length || res.pets !== (S.pets || []).length || res.memories !== (S.memories || []).length) bad.push('số lượng');
        if (bad.length) throw Object.assign(new Error('Dữ liệu trên máy chủ chưa khớp với bản trên máy (' + bad.join(', ') + ').'), { verify: true });
      }
      B.sync.writeCache(user.id, g);
      const K = B.sync.keys(user.id), meta = read(K.meta, {});
      meta.photosUp = uploaded; write(K.meta, meta);
      mig.phase = 'completed'; mig.completedAt = Date.now(); write(MIGR, mig);
      markGuest(guest, { uid: user.id, migrationId: mig.id });
      const c = await choose(`<h2 class="gate-h">Xong rồi!</h2><p class="gate-lead">Thế giới của Bun đã theo bạn lên tài khoản. Từ giờ, đăng nhập ở thiết bị nào cũng gặp lại Bun như lúc bạn rời đi.</p>
        ${sumHTML(summarize(Object.assign({}, S, { coins: Number(g.balance) })))}${missing ? `<p class="gate-note">${missing} ảnh không còn trong bộ nhớ máy nên không chuyển được.</p>` : ''}
        <p class="gate-note">Bản khách cũ vẫn được giữ trên máy này làm bản dự phòng.</p>
        <div class="gate-actions"><button class="btn primary big" data-choice="go" data-autofocus>${ic('home')}Vào nhà</button></div>`);
      if (c === 'go') useAccount(user);
    } catch (e) {
      const i = B.cloud.info(e);
      if (i.kind === 'cloud_not_empty') {
        // Thiết bị khác vừa tạo dữ liệu cho tài khoản này: chuyển sang tình huống B
        write(MIGR, null);
        return enterAccount(user, { fresh: true });
      }
      mig.phase = 'failed'; mig.error = e.message; write(MIGR, mig);
      const c = await choose(`<h2 class="gate-h">Chưa chuyển xong</h2><p class="gate-lead">${esc(e.verify ? e.message : i.kind === 'other' ? e.message : i.msg)}</p>
        <p class="gate-note">Dữ liệu trên máy này vẫn còn nguyên. Thử lại sẽ tiếp tục an toàn, không tạo bản trùng.</p>
        <div class="gate-actions"><button class="btn primary big" data-choice="retry" data-autofocus>${ic('refresh')}Thử lại</button>
        <button class="btn soft big" data-choice="backup">${ic('download')}Lưu bản sao lưu</button>
        <button class="btn ghost sm" data-choice="guest">Tạm vào chế độ khách</button></div>`);
      if (c === 'retry') return enterAccount(user, { fresh: true });
      await signOutQuiet(); useGuest();
    }
  }
  async function createFresh(user, from) {
    progress(1);
    const S = from ? B.store.normalize(from) : B.store.normalize(B.store.defaults());
    if (!from) S.v = 2;
    try {
      await B.cloud.createSave({ migrationId: B.sync.newId(), sections: B.sync.split(S), opening: S.coins, source: 'fresh', summary: summarize(S), device: B.sync.deviceId() });
      B.sync.writeCache(user.id, await B.cloud.load());
      useAccount(user);
    } catch (e) {
      const i = B.cloud.info(e);
      if (i.kind === 'cloud_not_empty') return enterAccount(user, {});
      const c = await choose(`<h2 class="gate-h">Chưa tạo được dữ liệu</h2><p class="gate-lead">${esc(i.msg)}</p><div class="gate-actions"><button class="btn primary big" data-choice="retry" data-autofocus>${ic('refresh')}Thử lại</button><button class="btn ghost sm" data-choice="guest">Tạm vào chế độ khách</button></div>`);
      if (c === 'retry') return createFresh(user, from);
      await signOutQuiet(); useGuest();
    }
  }
  async function signOutQuiet() { try { await B.cloud.signOut(); } catch (e) { /* bỏ qua */ } }

  async function boot() {
    const errMsg = oauthError(), hasCode = new URLSearchParams(location.search).has('code');
    try { acc.cloudOn = await B.cloud.init(); } catch (e) { acc.cloudOn = false; }
    let session = null, sessionFailed = false;
    if (acc.cloudOn) {
      if (hasCode) loading('Đang hoàn tất đăng nhập…');
      try { session = await B.cloud.session(); } catch (e) { sessionFailed = true; }
    }
    if (hasCode || errMsg) cleanUrl();
    if (errMsg) acc.deferred.push(() => B.ui.toast(errMsg, { icon: 'x', ms: 6500 }));
    const m = readMode();
    if (session) {
      if (errMsg && m.mode === 'guest') { /* hủy liên kết, phiên cũ vẫn còn: không đổi gì */ }
      return enterAccount(session.user, { fresh: m.mode !== 'account' || m.uid !== session.user.id });
    }
    if (m.mode === 'account' && m.uid) {
      const hasCache = !!localStorage.getItem(B.sync.keys(m.uid).state);
      // Mất mạng hoặc máy chủ chậm: vẫn mở được dữ liệu tài khoản đã lưu trên máy
      if (hasCache && (!acc.cloudOn || sessionFailed || !navigator.onLine)) { useAccount({ id: m.uid, email: m.email }, { offline: true }); return; }
      // Phiên hết hạn: dữ liệu trên máy vẫn giữ, đăng nhập lại sẽ tiếp tục đồng bộ
      return showGate('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục đồng bộ.');
    }
    if (m.mode === 'guest') return useGuest();
    if (m.mode === 'out') return showGate();
    // Chưa chọn lần nào: người dùng cũ có dữ liệu trên máy thì vào thẳng như trước, người mới thấy cổng chào
    if (guestState()) { useGuest(); acc.deferred.push(nudgeOnce); return; }
    return showGate();
  }
  function nudgeOnce() {
    if (!acc.cloudOn || read(NUDGE, false)) return;
    write(NUDGE, true);
    setTimeout(() => B.ui.toast('Mới: tạo tài khoản để mang thế giới của Bun theo bạn trên mọi thiết bị. Bấm biểu tượng đám mây ở góc trên.', { icon: 'cloud', ms: 8000 }), 6000);
  }

  /* ---------- Sau khi căn nhà đã dựng ---------- */
  function hud() {
    const b = document.getElementById('btnAccount');
    if (!b) return;
    const s = acc.mode === 'account' ? B.sync.status() : null;
    const cls = !s ? 'guest' : s.status;
    b.className = 'round acct ' + cls;
    b.innerHTML = ic('cloud') + '<i class="dot" aria-hidden="true"></i>';
    const t = !s ? 'Chế độ khách trên thiết bị này' : `${s.label}${s.lastSync ? ' Lần cuối: ' + fmtTime(s.lastSync) : ''}`;
    b.title = t; b.setAttribute('aria-label', 'Tài khoản và đồng bộ. ' + t);
  }
  function afterBoot() {
    hud();
    const b = document.getElementById('btnAccount');
    if (b) b.addEventListener('click', open);
    B.on('syncStatus', () => { hud(); if (openM && !openM.closed) openM.render(accountHTML()); });
    B.on('syncConflict', openConflict);
    if (acc.mode === 'account') {
      B.sync.start();
      if (acc.cloudOn) {
        B.cloud.onAuth((evt) => { if (evt === 'SIGNED_OUT' && acc.mode === 'account' && !acc.leaving) { B.sync.stop(); hud(); B.ui.toast('Phiên đăng nhập đã kết thúc. Dữ liệu vẫn ở trên máy, hãy đăng nhập lại để đồng bộ.', { icon: 'cloud', ms: 8000 }); } });
        if (!acc.offline) B.cloud.user().then((u) => { if (u) { acc.user = u; acc.email = u.email; } }).catch(() => {});
      }
    }
    let note = null;
    try { note = sessionStorage.getItem('hien-nha-bun:after-reload'); sessionStorage.removeItem('hien-nha-bun:after-reload'); } catch (e) { note = null; }
    if (note) setTimeout(() => B.ui.toast(esc(note), { icon: 'cloud', ms: 6000 }), 900);
    acc.deferred.splice(0).forEach((fn) => setTimeout(fn, 1200));
  }

  /* ---------- Hộp "Tài khoản và đồng bộ" ---------- */
  let openM = null;
  function providers() { const ids = (acc.user && acc.user.identities) || []; return ids.map((i) => i.provider); }
  function accountHTML() {
    if (acc.mode !== 'account') {
      return `<p class="acct-flag">${ic('home')}Bạn đang sử dụng chế độ khách trên thiết bị này.</p>
        <ul class="acct-facts"><li>Tiến trình được lưu trên thiết bị và trình duyệt này.</li><li>Không tự đồng bộ sang thiết bị khác.</li><li>Có thể mất dữ liệu nếu xóa dữ liệu trình duyệt hoặc đổi máy. Hãy xuất tệp sao lưu thỉnh thoảng.</li><li>Có thể nâng cấp thành tài khoản bất cứ lúc nào, mang theo toàn bộ tiến trình hiện tại.</li></ul>
        ${acc.cloudOn ? `<p class="hint">Tạo tài khoản để mang thế giới của Bun theo bạn trên mọi thiết bị.</p><div class="acct-auth"></div>` : `<p class="hint">Đăng nhập chưa được bật trên bản này${location.protocol === 'file:' ? ' (đang mở thẳng từ tệp)' : ''}.</p>`}`;
    }
    const s = B.sync.status(), pv = providers();
    const badge = (p, label, icon) => `<span class="pv ${pv.indexOf(p) >= 0 ? 'on' : ''}">${icon}${label}</span>`;
    return `<p class="acct-flag on">${ic('cloud')}Đã đăng nhập: <b>${esc(acc.email || 'tài khoản của bạn')}</b></p>
      ${pv.length ? `<div class="pv-row">${badge('google', 'Google', GOOGLE)}${badge('email', 'Email', ic('mail'))}</div>` : ''}
      <div class="sync-box ${s.status}"><span class="dot"></span><div><b>${s.label}</b>${s.lastSync ? `<small>Đồng bộ thành công lần cuối: ${fmtTime(s.lastSync)}</small>` : ''}${s.error && s.status !== 'synced' ? `<small>${esc(s.error)}</small>` : ''}</div>
        ${s.status === 'conflict' ? `<button class="btn primary sm" data-acct="conflict">Chọn bản dữ liệu</button>` : s.status === 'auth' ? `<button class="btn primary sm" data-acct="relogin">Đăng nhập lại</button>` : `<button class="btn soft sm" data-acct="sync" ${s.status === 'syncing' || acc.offline && !acc.cloudOn ? 'disabled' : ''}>${ic('refresh')}${s.status === 'error' || s.status === 'offline' ? 'Thử lại' : 'Đồng bộ ngay'}</button>`}</div>
      <p class="hint">Mọi thay đổi được lưu ngay trên máy và tự gửi lên tài khoản sau vài giây. Nhạc bạn tự nhập chỉ nằm trên từng thiết bị.</p>
      <div class="row">${acc.cloudOn && pv.length && pv.indexOf('google') < 0 ? `<button class="btn soft sm" data-acct="link">${ic('link')}Liên kết thêm Google</button>` : ''}<span class="grow"></span><button class="btn ghost sm" data-acct="logout">${ic('logout')}Đăng xuất</button></div>`;
  }
  function open() {
    openM = B.ui.modal({ title: 'Tài khoản và đồng bộ', cls: 'acct-m' });
    const draw = () => {
      openM.render(accountHTML());
      const box = openM.body.querySelector('.acct-auth');
      if (box) {
        authFlow(box, {
          head: '<h3 class="acct-h">Đồng bộ và lưu tài khoản</h3>',
          beforeRedirect: () => { write(MIGR, { id: B.sync.newId(), guest: B.S.createdAt, startedAt: Date.now(), phase: 'auth' }); B.store.saveNow(); },
          onSignedIn: () => { write(MIGR, Object.assign(read(MIGR, {}) || {}, { phase: 'auth' })); B.store.saveNow(); B.skipSave = true; location.reload(); },
        });
        // Bấm Email cũng ghi nhận ý định chuyển dữ liệu
        box.addEventListener('click', (e) => { if (e.target.closest('[data-a="email"]') && !read(MIGR, null)) write(MIGR, { id: B.sync.newId(), guest: B.S.createdAt, startedAt: Date.now(), phase: 'auth' }); }, true);
      }
    };
    draw();
    openM.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-acct]');
      if (!b) return;
      const a = b.dataset.acct;
      if (a === 'sync') { await B.sync.push({}); if (B.sync.status().status !== 'conflict') B.sync.check(); }
      else if (a === 'conflict') openConflict({});
      else if (a === 'relogin') { acc.leaving = true; writeMode({ mode: 'account', uid: acc.uid, email: acc.email }); B.store.saveNow(); B.skipSave = true; location.reload(); }
      else if (a === 'link') { try { B.store.saveNow(); await B.cloud.linkGoogle(); } catch (err) { B.ui.toast(esc(B.cloud.info(err).msg), { icon: 'x', ms: 6500 }); } }
      else if (a === 'logout') signOut();
    });
  }

  /* ---------- Xung đột giữa hai thiết bị ---------- */
  let conflictOpen = false;
  function openConflict(d) {
    if (conflictOpen || acc.mode !== 'account') return;
    conflictOpen = true;
    const m = B.ui.modal({ title: 'Có thay đổi trên thiết bị khác', cls: 'small', locked: true, onClose: () => (conflictOpen = false), html:
      `<p>Tài khoản vừa được cập nhật từ một thiết bị khác${d && d.at ? ` lúc ${fmtTime(Date.parse(d.at))}` : ''}, trong khi thiết bị này cũng có thay đổi chưa gửi lên. Bạn muốn giữ bản nào?</p>
      <div class="acct-choices">
        <button class="btn primary" data-c="cloud">${ic('cloud')}Sử dụng dữ liệu trên tài khoản</button>
        <button class="btn soft" data-c="local">${ic('home')}Giữ dữ liệu trên thiết bị này</button>
        <button class="btn soft" data-c="backup">${ic('download')}Lưu bản sao lưu trước khi xử lý</button></div>
      <p class="hint">Dùng dữ liệu trên tài khoản: bản trên máy này được cất lại làm bản dự phòng. Giữ dữ liệu trên máy: bản trên tài khoản sẽ được thay bằng bản này, trên mọi thiết bị. Số xu luôn tính theo sổ xu của tài khoản nên không bị cộng trùng.</p>` });
    m.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      if (b.dataset.c === 'backup') return exportCurrent();
      b.disabled = true;
      if (b.dataset.c === 'cloud') { await B.sync.useCloud(); b.disabled = false; return; }
      const ok = await B.ui.confirm('Thay bản trên tài khoản?', 'Bản trên tài khoản sẽ được thay bằng dữ liệu đang có trên thiết bị này, áp dụng cho mọi thiết bị.', 'Thay bằng bản này', true);
      if (!ok) { b.disabled = false; return; }
      const r = await B.sync.keepLocal(d && d.rev);
      if (r.ok) { m.close(); B.ui.toast('Đã lưu bản trên thiết bị này lên tài khoản.', { icon: 'cloud' }); } else b.disabled = false;
    });
  }
  function exportCurrent() {
    B.store.saveNow();
    return B.photos.exportAll().then((photos) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([B.store.exportText(photos)], { type: 'application/json' }));
      a.download = `hien-nha-bun-${B.time.today()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      B.ui.toast('Đã lưu bản sao lưu vào thư mục Tải xuống.', { icon: 'download' });
    });
  }

  /* ---------- Đăng xuất ---------- */
  async function signOut() {
    const synced = acc.cloudOn ? await B.sync.flush().catch(() => false) : false;
    const ok = await B.ui.confirm('Đăng xuất?', synced
      ? 'Mọi thứ đã được lưu trên tài khoản. Dữ liệu tài khoản sẽ được xóa khỏi thiết bị này để giữ riêng tư; đăng nhập lại là gặp lại Bun.'
      : 'Vẫn còn thay đổi chưa gửi lên tài khoản. Chúng được giữ lại trên thiết bị này và sẽ tự gửi khi bạn đăng nhập lại.', 'Đăng xuất', false);
    if (!ok) return;
    acc.leaving = true;
    B.store.saveNow();
    B.sync.stop();
    await signOutQuiet();
    if (synced) {
      const K = B.sync.keys(acc.uid), g = guestState(), keep = new Set(((g && g.photos) || []).map((p) => p.id));
      await Promise.all((B.S.photos || []).filter((p) => !keep.has(p.id)).map((p) => B.idb.del('photos', p.id).catch(() => {})));
      [K.state, K.state + ':backup', K.meta, K.outbox, K.backup].forEach((k) => write(k, null));
    }
    writeMode({ mode: 'out' }); // lần mở sau hiện cổng chào để chọn lại
    B.skipSave = true;
    location.reload();
  }

  /* ---------- Bắt đầu lại / nhập tệp khi đang dùng tài khoản ---------- */
  async function resetWorld() {
    const ids = (B.S.photos || []).map((p) => p.id);
    const fresh = B.store.normalize(B.store.defaults()); fresh.v = 2;
    try {
      await B.sync.replaceWorld(fresh, { resetCoins: true });
      await B.cloud.removePhotos(acc.uid, ids).catch(() => {});
      await Promise.all(ids.map((id) => B.idb.del('photos', id).catch(() => {})));
      B.skipSave = true; location.reload();
    } catch (e) { B.ui.toast(esc(e.message || 'Chưa bắt đầu lại được.'), { icon: 'x', ms: 7000 }); }
  }
  async function importWorld(s, photos) {
    try {
      await B.photos.importAll(photos);
      B.store.applyImport(s);
      await B.sync.replaceWorld(B.S, {});
      B.skipSave = true;
      try { sessionStorage.setItem('hien-nha-bun:after-reload', 'Đã nhập dữ liệu lên tài khoản. Số xu vẫn theo sổ xu của tài khoản.'); } catch (e) { /* bỏ qua */ }
      location.reload();
    } catch (e) { B.ui.toast(esc(e.message || 'Chưa nhập được dữ liệu lên tài khoản.'), { icon: 'x', ms: 7000 }); }
  }

  B.account = {
    boot, afterBoot, open, signOut, resetWorld, importWorld,
    get mode() { return acc.mode; },
    get email() { return acc.email; },
    get cloudOn() { return acc.cloudOn; },
    statusText() { return acc.mode === 'account' ? B.sync.status().label : 'Bạn đang sử dụng chế độ khách trên thiết bị này.'; },
  };
})();
