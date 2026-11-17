/* Hiên Nhà Bun — Góc tập trung: đồng hồ, nhịp làm và nghỉ, âm thanh nền tự tạo, nhạc YouTube nhúng chính thức, lịch sử phiên */
(function () {
  'use strict';
  const B = window.B, U = B.util, $ = U.$, esc = U.esc, ic = B.icon;
  const st = { pick: '', len: null, yt: null, ytReady: false, ytLoading: null, cur: null, playing: false, muted: false, err: null, amb: {} };
  const P = () => B.plan;

  /* ---------- YouTube: kiểm tra đường dẫn ---------- */
  const ID = /^[A-Za-z0-9_-]{11}$/, LIST = /^[A-Za-z0-9_-]{10,64}$/;
  function parseYT(raw) {
    let s = String(raw || '').trim();
    if (!s) return null;
    if (ID.test(s)) return { v: s, list: null };
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    let u;
    try { u = new URL(s); } catch (e) { return null; }
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
    let v = null, list = u.searchParams.get('list');
    if (host === 'youtu.be') v = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      v = u.searchParams.get('v');
      const m = /^\/(embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname);
      if (!v && m) v = m[2];
    } else return null;
    if (v && !ID.test(v)) v = null;
    if (list && !LIST.test(list)) list = null;
    if (list && /^(RD|UL|LL|WL)/.test(list) && !v) list = null; // danh sách tự sinh hoặc riêng tư không nhúng được
    return v || list ? { v, list } : null;
  }
  const watchUrl = (c) => (c.v ? `https://www.youtube.com/watch?v=${c.v}${c.list ? '&list=' + c.list : ''}` : `https://www.youtube.com/playlist?list=${c.list}`);
  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (st.ytLoading) return st.ytLoading;
    st.ytLoading = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) { /* bỏ qua */ } res(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { st.ytLoading = null; rej(new Error('offline')); };
      document.head.appendChild(s);
      setTimeout(() => rej(new Error('timeout')), 15000);
    });
    return st.ytLoading;
  }
  const ERR = { 2: 'Đường dẫn không hợp lệ.', 5: 'Trình duyệt không phát được video này.', 100: 'Video không tồn tại hoặc đã bị gỡ.', 101: 'Chủ video không cho phép phát nhúng ở trang khác.', 150: 'Chủ video không cho phép phát nhúng ở trang khác.', 153: 'YouTube từ chối phát khi ứng dụng được mở trực tiếp từ tệp trên máy.' };
  function play(raw, title) {
    const c = parseYT(raw);
    if (!c) { B.ui.toast('Đường dẫn này không phải video hoặc danh sách phát YouTube hợp lệ.', { icon: 'x', ms: 5000 }); return false; }
    st.cur = Object.assign({ raw, title: title || '' }, c); st.err = null;
    B.S.music.last = raw; B.store.save();
    // Dọn trình phát cũ trước khi tạo trình phát mới
    if (st.yt) { try { st.yt.destroy(); } catch (e) { /* bỏ qua */ } st.yt = null; }
    st.ytReady = false; st.playing = false;
    const mp = $('#miniPlayer');
    mp.hidden = false;
    mp.innerHTML = `<div class="mp-video"><div id="ytHost"></div></div><div class="mp-bar"><span class="mp-title">Đang tải…</span><button class="mini" data-mp="toggle" aria-label="Phát hoặc tạm dừng">${ic('play')}</button><button class="mini" data-mp="mute" aria-label="Tắt tiếng">${ic('volume')}</button><button class="mini" data-mp="close" aria-label="Đóng trình phát">${ic('x')}</button></div>`;
    loadApi().then(() => {
      const pv = { playsinline: 1, rel: 0, modestbranding: 1 };
      if (location.protocol.indexOf('http') === 0) pv.origin = location.origin;
      if (c.list) { pv.list = c.list; if (!c.v) pv.listType = 'playlist'; }
      st.ytReady = false;
      st.yt = new window.YT.Player('ytHost', {
        width: '100%', height: '100%', videoId: c.v || undefined, playerVars: pv,
        events: {
          onReady: (e) => { st.ytReady = true; try { e.target.setVolume(B.S.music.vol); e.target.playVideo(); } catch (x) { /* bỏ qua */ } sync(); },
          onStateChange: (e) => { st.playing = e.data === 1 || e.data === 3; sync(); },
          onError: (e) => { st.err = ERR[e.data] || 'Không phát được nội dung này.'; st.playing = false; sync(); },
        },
      });
    }).catch(() => { st.err = 'Không tải được trình phát YouTube. Hãy kiểm tra kết nối mạng.'; sync(); });
    if (B.ui.state.tab === 'focus') B.ui.renderTabs();
    return true;
  }
  function call(fn) { if (st.yt && st.ytReady && st.yt[fn]) try { return st.yt[fn].apply(st.yt, [].slice.call(arguments, 1)); } catch (e) { /* bỏ qua */ } return null; }
  function control(a) {
    if (a === 'toggle') { st.playing ? call('pauseVideo') : call('playVideo'); }
    else if (a === 'mute') { st.muted = !st.muted; call(st.muted ? 'mute' : 'unMute'); sync(); }
    else if (a === 'close') { call('destroy'); st.yt = null; st.cur = null; st.playing = false; st.err = null; const mp = $('#miniPlayer'); mp.hidden = true; mp.innerHTML = ''; if (B.ui.state.tab === 'focus') B.ui.renderTabs(); }
    else if (a === 'next') call('nextVideo');
    else if (a === 'prev') call('previousVideo');
  }
  function sync() {
    const mp = $('#miniPlayer');
    if (!mp || mp.hidden || !st.cur) return;
    let title = st.cur.title;
    const d = call('getVideoData');
    if (d && d.title) { title = d.title; st.cur.title = title; }
    const t = mp.querySelector('.mp-title');
    if (t) t.innerHTML = st.err ? `<a href="${watchUrl(st.cur)}" target="_blank" rel="noopener">Mở trên YouTube</a>` : esc(title || 'YouTube');
    const tg = mp.querySelector('[data-mp=toggle]'), mu = mp.querySelector('[data-mp=mute]');
    if (tg) tg.innerHTML = ic(st.playing ? 'pause' : 'play');
    if (mu) mu.innerHTML = ic(st.muted ? 'mute' : 'volume');
    mp.classList.toggle('has-err', !!st.err);
    if (B.ui.state.tab === 'focus') { const box = $('#tab-focus .yt-now'); if (box) box.outerHTML = nowHTML(); }
  }
  function nowHTML() {
    if (!st.cur) return '<div class="yt-now"></div>';
    return `<div class="yt-now ${st.err ? 'err' : ''}"><div><strong>${esc(st.cur.title || 'Đang tải…')}</strong>${st.err ? `<small>${esc(st.err)}</small>` : `<small>${st.cur.list ? 'Danh sách phát' : 'Video'} · ${st.playing ? 'đang phát' : 'tạm dừng'}</small>`}</div>
      <div class="row">${st.cur.list ? `<button class="mini" data-mp="prev" aria-label="Bài trước">‹</button>` : ''}<button class="mini" data-mp="toggle">${ic(st.playing ? 'pause' : 'play')}${st.playing ? 'Tạm dừng' : 'Phát'}</button>${st.cur.list ? `<button class="mini" data-mp="next" aria-label="Bài sau">›</button>` : ''}<button class="mini" data-mp="mute">${ic(st.muted ? 'mute' : 'volume')}</button>
      <button class="mini" data-fav>${ic('star')}Lưu</button><a class="mini" href="${watchUrl(st.cur)}" target="_blank" rel="noopener">Mở trên YouTube</a></div></div>`;
  }

  /* ---------- Âm thanh nền: tự tạo bằng Web Audio, không cần mạng ---------- */
  const AMB = { rain: 'Mưa rơi', fire: 'Lò sưởi tí tách', brown: 'Tiếng ồn êm' };
  let ctx = null, master = null, noiseBuf = null;
  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = B.S.music.ambVol / 100; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function brownSource() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  }
  function startAmb(kind) {
    if (!audio()) { B.ui.toast('Trình duyệt này không hỗ trợ âm thanh nền.', { icon: 'x' }); return; }
    if (ctx.state === 'suspended') ctx.resume();
    const g = ctx.createGain(), nodes = [];
    g.gain.value = 0; g.connect(master);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
    if (kind === 'rain') {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
      const v = ctx.createGain(); v.gain.value = 0.32;
      s.connect(hp); hp.connect(lp); lp.connect(v); v.connect(g); s.start(); nodes.push(s);
    } else if (kind === 'brown') {
      const s = brownSource(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 140; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      const v = ctx.createGain(); v.gain.value = 0.9; s.connect(lp); lp.connect(v); v.connect(g); s.start(); nodes.push(s, lfo);
    } else {
      const s = brownSource(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
      const v = ctx.createGain(); v.gain.value = 0.7; s.connect(lp); lp.connect(v); v.connect(g); s.start(); nodes.push(s);
      // tiếng củi nổ lách tách ngẫu nhiên
      const crackle = () => {
        if (!st.amb.fire) return;
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const b = ctx.createBufferSource(), e = ctx.createGain(), hp = ctx.createBiquadFilter(), t0 = ctx.currentTime + i * 0.04 + Math.random() * 0.05;
          b.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 2500;
          e.gain.setValueAtTime(0.0001, t0); e.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.35, t0 + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03 + Math.random() * 0.06);
          b.connect(hp); hp.connect(e); e.connect(g); b.start(t0, Math.random() * 2, 0.12);
        }
        st.amb.fire.timer = setTimeout(crackle, 120 + Math.random() * 900);
      };
      st.amb.fire = { g, nodes };
      crackle();
      return;
    }
    st.amb[kind] = { g, nodes };
  }
  function stopAmb(kind) {
    const a = st.amb[kind];
    if (!a) return;
    clearTimeout(a.timer);
    delete st.amb[kind];
    a.g.gain.cancelScheduledValues(ctx.currentTime);
    a.g.gain.setValueAtTime(a.g.gain.value, ctx.currentTime);
    a.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* bỏ qua */ } }); a.g.disconnect(); }, 900);
  }

  /* ---------- Vẽ thẻ Tập trung ---------- */
  function candidates() {
    const out = [], seen = {};
    P().get().blocks.forEach((b) => {
      if (b.type !== 'task' || seen[b.key]) return;
      seen[b.key] = 1;
      const t = B.tasks.get(b.taskId), s = b.stepId && t.steps.find((x) => x.id === b.stepId);
      out.push({ key: b.key, task: t, step: s, est: b.est, at: b.s });
    });
    return out;
  }
  function historyHTML() {
    const S = B.S, today = B.time.today(), list = S.sessions.slice().reverse();
    const todays = list.filter((s) => U.dateKey(new Date(s.at)) === today), week = [];
    for (let i = 6; i >= 0; i--) { const k = U.addDays(today, -i); week.push({ k, m: S.sessions.filter((s) => U.dateKey(new Date(s.at)) === k).reduce((a, s) => a + s.min, 0) }); }
    const max = Math.max(60, ...week.map((w) => w.m)), dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return `<h3 class="sec-title">Lịch sử tập trung <small>hôm nay ${todays.reduce((a, s) => a + s.min, 0)} phút · ${todays.length} phiên</small></h3>
      <div class="week">${week.map((w, i) => `<div class="col ${i === 6 ? 'today' : ''}"><div class="bar" title="${w.m} phút"><i style="--v:${Math.round(w.m / max * 100)}"></i></div>${dows[U.parseKey(w.k).getDay()]}</div>`).join('')}</div>
      ${list.length ? `<ul class="hlist" style="margin-top:10px">${list.slice(0, 8).map((s) => `<li><div><strong>${esc(s.title || 'Phiên tự do')}</strong><small>${U.fmtDateTime(s.at)} · ${new Date(s.at).getHours()}:${String(new Date(s.at).getMinutes()).padStart(2, '0')}</small></div><span class="chip-c ${s.done ? 'ok' : ''}">${s.min}′${s.plan && s.min < s.plan ? ` / ${s.plan}′` : ''}</span></li>`).join('')}</ul>` : '<p class="empty">Chưa có phiên nào. Phiên đầu tiên luôn là phiên khó nhất.</p>'}`;
  }
  function render(el) {
    const S = B.S, f = S.focus, p = S.plan;
    let top;
    if (f) {
      const t = f.taskId && B.tasks.get(f.taskId), s = t && f.stepId && t.steps.find((x) => x.id === f.stepId);
      top = `<div class="focus-now ${f.kind === 'break' ? 'is-break' : ''}"><div class="ring big" id="fRing" style="--p:0"><span id="fClock">--:--</span></div>
        <div class="fn-text"><small>${f.kind === 'break' ? 'Đang nghỉ giữa giờ' : 'Đang tập trung'}</small><strong>${f.kind === 'break' ? 'Đứng dậy, uống nước, nhìn ra cửa sổ' : esc(t ? t.title : 'Phiên tự do')}</strong>
          ${s ? `<span>${esc(s.title)}</span>` : ''}${t && f.kind !== 'break' ? `<span class="t-dod">${ic('arrow')}<span>${esc(s ? s.outcome : t.dod || '')}</span></span>` : ''}</div>
        <div class="row">${f.kind === 'break' ? '<button class="btn primary sm" data-fx="skipbreak">Vào việc luôn</button>' : `${t ? '<button class="btn primary sm" data-fx="done">' + ic('check') + (s ? 'Xong bước này' : 'Xong việc này') + '</button>' : ''}<button class="btn soft sm" data-fx="plus5">+5 phút</button>`}<button class="btn ghost sm" data-fx="stop">Dừng</button></div></div>`;
    } else {
      const c = candidates(), sel = c.find((x) => x.key === st.pick) || c[0], len = st.len || Math.min(sel ? sel.est : p.focusLen, p.focusLen);
      top = `<div class="focus-setup"><h3 class="sec-title" style="margin-top:0">Làm gì bây giờ?</h3>
        ${c.length ? `<select id="fTask" aria-label="Chọn việc">${c.map((x) => `<option value="${x.key}" ${sel && x.key === sel.key ? 'selected' : ''}>${P().fmtMin(x.at)} · ${esc(x.task.title)}${x.step ? ' · ' + esc(x.step.title) : ''}</option>`).join('')}<option value="" ${!sel ? 'selected' : ''}>Phiên tự do, không gắn việc</option></select>
          ${sel ? `<p class="f-scope">Mục tiêu của phiên: <b>${esc(sel.step ? sel.step.outcome : sel.task.dod || '')}</b></p>` : ''}` : '<p class="empty" style="margin:0 0 8px">Chưa có việc nào trong lịch. Bạn vẫn có thể bắt đầu một phiên tự do.</p>'}
        <div class="f-line"><span class="f-lbl">Thời lượng</span>${[15, 25, 30, 45, 50, 60].map((m) => `<button class="pill ${len === m ? 'on' : ''}" data-flen="${m}">${m}′</button>`).join('')}<input type="number" class="f-num ${[15, 25, 30, 45, 50, 60].indexOf(len) < 0 ? 'on' : ''}" id="fLen" min="5" max="180" value="${len}" aria-label="Số phút"></div>
        <div class="f-line"><span class="f-lbl">Nhịp</span>${[[25, 5], [50, 10]].map((r) => `<button class="pill ${p.focusLen === r[0] && p.breakLen === r[1] ? 'on' : ''}" data-rhythm="${r[0]}/${r[1]}">${r[0]}/${r[1]}</button>`).join('')}<button class="pill" data-fx="settings">Tự chọn…</button><span class="hint" style="margin:0">nghỉ ${p.breakLen}′ sau mỗi phiên</span></div>
        <div class="row" style="margin-top:6px"><button class="btn primary" data-fx="start">${ic('timer')}Bắt đầu ${len} phút</button><button class="btn soft" data-fx="break">Nghỉ ${p.breakLen}′</button></div></div>`;
    }
    const favs = S.music.favs || [];
    el.innerHTML = top + `
      <h3 class="sec-title">Nhạc từ YouTube</h3>
      <form class="yt-form" data-ytform><input type="url" id="ytUrl" placeholder="Dán đường dẫn video hoặc danh sách phát" value="${esc(st.cur ? st.cur.raw : S.music.last || '')}" aria-label="Đường dẫn YouTube"><button class="btn primary sm" type="submit">${ic('play')}Phát</button></form>
      ${nowHTML()}
      ${st.cur ? `<div class="f-line"><span class="f-lbl">Âm lượng</span><input type="range" id="ytVol" min="0" max="100" value="${S.music.vol}" aria-label="Âm lượng nhạc" style="flex:1"></div>` : ''}
      ${favs.length ? `<ul class="favs">${favs.map((x, i) => `<li><button class="mini grow" data-favplay="${i}">${ic('music')}<span>${esc(x.title || x.url)}</span></button><button class="mini" data-favdel="${i}" aria-label="Bỏ khỏi danh sách yêu thích">${ic('x')}</button></li>`).join('')}</ul>` : '<p class="hint" style="margin:4px 0 0">Bấm "Lưu" khi đang phát để giữ lại danh sách nhạc hay dùng.</p>'}
      ${location.protocol === 'file:' ? '<p class="hint">Bạn đang mở ứng dụng trực tiếp từ tệp, nên YouTube thường từ chối phát nhúng. Muốn nghe nhạc ngay trong ứng dụng, hãy mở bằng tệp <b>Mở Hiên Nhà Bun.cmd</b> trong thư mục dự án. Lúc này vẫn có thể bấm "Mở trên YouTube" hoặc dùng âm thanh nền bên dưới.</p>' : ''}
      <h3 class="sec-title">Âm thanh nền <small>tạo ngay trên máy, không cần mạng</small></h3>
      <div class="amb">${Object.keys(AMB).map((k) => `<button class="pill ${st.amb[k] ? 'on' : ''}" data-amb="${k}" aria-pressed="${!!st.amb[k]}">${AMB[k]}</button>`).join('')}</div>
      <div class="f-line"><span class="f-lbl">Âm lượng nền</span><input type="range" id="ambVol" min="0" max="100" value="${S.music.ambVol}" aria-label="Âm lượng âm thanh nền" style="flex:1"></div>
      ${historyHTML()}`;
    tickClock();
  }
  function tickClock() {
    const f = B.S.focus, c = document.getElementById('fClock');
    if (!f || !c) return;
    const left = B.focus.remaining(), pct = U.clamp(100 - (left / (f.minutes * 60000)) * 100, 0, 100);
    c.textContent = U.fmtClock(left);
    document.getElementById('fRing').style.setProperty('--p', pct.toFixed(1));
  }

  /* ---------- Thao tác ---------- */
  function onClick(e) {
    const t = e.target, q = (s) => t.closest(s), S = B.S;
    let m;
    if ((m = q('[data-mp]'))) { control(m.dataset.mp); return true; }
    if (q('[data-fav]') && st.cur) {
      const favs = S.music.favs || (S.music.favs = []);
      if (!favs.some((x) => x.url === st.cur.raw)) favs.unshift({ url: st.cur.raw, title: st.cur.title || '' });
      S.music.favs = favs.slice(0, 12); B.store.save(); B.ui.toast('Đã lưu vào danh sách nhạc yêu thích.', { icon: 'music', ms: 2500 }); B.ui.renderTabs(); return true;
    }
    if ((m = q('[data-favplay]'))) { const x = S.music.favs[+m.dataset.favplay]; if (x) play(x.url, x.title); return true; }
    if ((m = q('[data-favdel]'))) { S.music.favs.splice(+m.dataset.favdel, 1); B.store.save(); B.ui.renderTabs(); return true; }
    if ((m = q('[data-amb]'))) { const k = m.dataset.amb; st.amb[k] ? stopAmb(k) : startAmb(k); B.ui.renderTabs(); return true; }
    if ((m = q('[data-flen]'))) { st.len = +m.dataset.flen; B.ui.renderTabs(); return true; }
    if ((m = q('[data-rhythm]'))) { const v = m.dataset.rhythm.split('/'); S.plan.focusLen = +v[0]; S.plan.breakLen = +v[1]; st.len = null; B.store.save(); B.emit('tasks'); return true; }
    const fx = q('[data-fx]');
    if (!fx) return false;
    const a = fx.dataset.fx, f = S.focus;
    if (a === 'settings') B.planui.openPlanSettings();
    else if (a === 'start') {
      const sel = $('#fTask'), key = sel ? sel.value : '', ids = key.split(':'), lenEl = $('#fLen');
      const len = U.clamp(Math.round(+(lenEl && lenEl.value) || st.len || S.plan.focusLen), 5, 180);
      B.focus.start(len, ids[0] || null, ids[1] || null); st.len = null;
    } else if (a === 'break') B.focus.start(S.plan.breakLen, null, null, 'break');
    else if (a === 'skipbreak') { const tid = f && f.taskId, sid = f && f.stepId; B.focus.cancel(); const tk = tid && B.tasks.get(tid); if (tk && !tk.done) B.planui.startBlock(tk, sid); }
    else if (a === 'plus5' && f) { f.endAt += 5 * 60000; f.minutes += 5; B.store.saveNow(); tickClock(); }
    else if (a === 'stop') B.ui.confirm('Dừng phiên này?', 'Thời gian đã làm vẫn được cộng vào việc, chỉ là không nhận thưởng phiên.', 'Dừng', false).then((ok) => ok && B.focus.cancel());
    else if (a === 'done' && f) {
      const tk = B.tasks.get(f.taskId), sid = f.stepId;
      if (!tk) return true;
      const r = sid ? B.plan.stepToggle(tk.id, sid) : B.tasks.complete(tk);
      if (r && r.coins != null) { r.bonuses.forEach((x) => B.ui.toast(`<b>${x.label}</b>: thưởng thêm ${x.coins} xu`, { icon: 'gift' })); B.ui.toast(`Hoàn thành "${esc(tk.title)}": +${r.coins} xu.`, { icon: 'coin' }); }
      else if (r) B.ui.toast(`Xong một bước. Còn ${tk.steps.filter((x) => !x.done).length} bước của "${esc(tk.title)}".`, { icon: 'check' });
      B.bun.celebrate(r && r.coins != null ? r : {});
      B.ui.renderTabs();
    }
    return true;
  }
  function onInput(e) {
    const el = e.target;
    if (el.id === 'ytVol') { B.S.music.vol = +el.value; call('setVolume', +el.value); B.store.save(); }
    else if (el.id === 'ambVol') { B.S.music.ambVol = +el.value; if (master) master.gain.value = +el.value / 100; B.store.save(); }
    else if (el.id === 'fLen' && e.type === 'change') { st.len = U.clamp(Math.round(+el.value) || 25, 5, 180); B.ui.renderTabs(); }
    else if (el.id === 'fTask' && e.type === 'change') { st.pick = el.value; st.len = null; B.ui.renderTabs(); }
  }
  function onSubmit(e) {
    if (!e.target.matches('[data-ytform]')) return;
    play($('#ytUrl').value);
  }
  function init() {
    $('#miniPlayer').addEventListener('click', (e) => { const m = e.target.closest('[data-mp]'); if (m) control(m.dataset.mp); });
    setInterval(() => { if (st.cur && st.ytReady) sync(); }, 4000);
  }

  B.focusui = { init, render, tickClock, onClick, onInput, onSubmit, preset(taskId) { if (taskId) { const c = candidates().find((x) => x.task.id === taskId); if (c) st.pick = c.key; } B.ui.renderTabs(); }, parseYT, play, state: st };
})();
