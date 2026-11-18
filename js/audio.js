/* Hiên Nhà Bun — âm thanh: 4 kênh độc lập (nhạc nền, môi trường, thú cưng, tương tác),
   tiếng động tự tạo bằng Web Audio, thư viện nhạc nền nhập từ máy lưu trong IndexedDB. */
(function () {
  'use strict';
  const B = window.B, U = B.util, $ = U.$, esc = U.esc, ic = B.icon;
  const CH = { music: 'Nhạc nền', ambience: 'Âm thanh môi trường', animals: 'Tiếng của Bun và các bạn', sfx: 'Tiếng tương tác, bước chân' };
  const BUILTIN = [{ id: 'builtin:rain', name: 'Mưa rơi', src: 'assets/audio/rain.mp3', note: 'Tệp âm thanh bạn cung cấp (nguồn: chosic.com)' }];
  const MAX_MB = 60;
  let ctx = null, master = null, bus = {}, noiseBuf = null, brownBuf = null;
  const st = { music: null, preview: null, scene: 'home', amb: {}, last: {}, idleT: 0, ytPlaying: false };

  /* ---------- Cài đặt ---------- */
  function cfg() {
    const S = B.S;
    if (!S.audio) S.audio = {};
    const a = S.audio;
    if (a.enabled == null) a.enabled = false;
    if (a.idle == null) a.idle = true;
    a.ch = a.ch || {};
    const def = { music: [true, 45], ambience: [true, 40], animals: [true, 70], sfx: [true, 55] };
    Object.keys(def).forEach((k) => { if (!a.ch[k]) a.ch[k] = { on: def[k][0], vol: def[k][1] }; });
    if (!Array.isArray(a.tracks)) a.tracks = [];
    if (!Array.isArray(a.favs)) a.favs = ['builtin:rain'];
    if (!a.trackId) a.trackId = 'builtin:rain';
    // Gộp âm lượng âm thanh nền cũ của Góc tập trung vào kênh môi trường
    if (S.music && S.music.ambVol != null && !a.migrated) { a.ch.ambience.vol = S.music.ambVol; a.migrated = true; }
    return a;
  }
  const level = (k) => { const c = cfg().ch[k]; return c.on ? c.vol / 100 : 0; };

  /* ---------- Bộ máy âm thanh ---------- */
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    Object.keys(CH).forEach((k) => { bus[k] = ctx.createGain(); bus[k].gain.value = level(k); bus[k].connect(master); });
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    brownBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const b = brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < b.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    return ctx;
  }
  const ready = () => cfg().enabled && ctx && ctx.state === 'running';
  // Trình duyệt chỉ cho phát tiếng sau một lần người dùng bấm: gọi hàm này trong sự kiện bấm
  function unlock() {
    const a = cfg();
    if (!a.enabled) return;
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().then(afterUnlock).catch(() => {}); else afterUnlock();
  }
  function afterUnlock() { applyLevels(); startScene(); if (level('music') > 0 && !st.ytPlaying) playMusic(); renderBtn(); }
  function applyLevels() {
    // Đặt âm lượng tức thì: không phụ thuộc đồng hồ âm thanh (có thể đứng yên khi thẻ bị ẩn)
    if (ctx) Object.keys(bus).forEach((k) => { const g = bus[k].gain; g.cancelScheduledValues(0); g.value = level(k); });
    if (st.music) st.music.volume = level('music');
  }

  /* ---------- Tiếng động tự tạo ---------- */
  function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
  function noise(t, dur, type, freq, q, peak, out, a) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    env(g, t, a || 0.005, peak, dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 1.5, dur + 0.05);
  }
  function tone(t, dur, wave, f0, f1, peak, out, filt, a) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, a || 0.01, peak, dur);
    let node = o;
    if (filt) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filt[0]; f.Q.value = filt[1]; o.connect(f); node = f; }
    node.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  const vary = (n, p) => n * (1 + (Math.random() - 0.5) * (p || 0.12));
  const SOUNDS = {
    // Tiếng của Bun và các bạn
    bark: { ch: 'animals', gap: 1200, fn(t, o) { const p = vary(1); [0, 0.2].slice(0, Math.random() < 0.5 ? 1 : 2).forEach((dt) => { tone(t + dt, 0.13, 'sawtooth', 420 * p, 230 * p, 0.32, o, [900, 2.2], 0.008); noise(t + dt, 0.07, 'bandpass', 1300, 1.4, 0.16, o); }); } },
    whine: { ch: 'animals', gap: 6000, fn(t, o) { tone(t, 0.55, 'sine', 950, 1250, 0.09, o, null, 0.06); tone(t + 0.5, 0.35, 'sine', 1250, 980, 0.07, o); } },
    happy: { ch: 'animals', gap: 1500, fn(t, o) { tone(t, 0.08, 'triangle', vary(700), 1050, 0.14, o); tone(t + 0.11, 0.09, 'triangle', vary(820), 1180, 0.12, o); } },
    pant: { ch: 'animals', gap: 4000, fn(t, o) { for (let i = 0; i < 5; i++) noise(t + i * 0.17, 0.07, 'bandpass', 1700, 1.2, 0.07, o, 0.02); } },
    sniff: { ch: 'animals', gap: 1200, fn(t, o) { for (let i = 0; i < 3; i++) noise(t + i * 0.09, 0.05, 'highpass', 2600, 0.8, 0.09, o, 0.01); } },
    sleep: { ch: 'animals', gap: 9000, fn(t, o) { noise(t, 1.6, 'bandpass', 420, 0.9, 0.05, o, 1.1); noise(t + 2.2, 1.4, 'bandpass', 360, 0.9, 0.035, o, 0.9); } },
    sigh: { ch: 'animals', gap: 20000, fn(t, o) { noise(t, 0.9, 'bandpass', 700, 0.8, 0.06, o, 0.25); tone(t + 0.2, 0.5, 'sine', 520, 380, 0.04, o, null, 0.1); } },
    cat: { ch: 'animals', gap: 3000, fn(t, o) { const p = vary(1, 0.2); tone(t, 0.55, 'sawtooth', 520 * p, 430 * p, 0.12, o, [1300, 3], 0.12); tone(t + 0.08, 0.32, 'sawtooth', 700 * p, 520 * p, 0.06, o, [2400, 4]); } },
    rabbit: { ch: 'animals', gap: 3000, fn(t, o) { tone(t, 0.09, 'sine', 140, 60, 0.3, o); noise(t + 0.25, 0.05, 'highpass', 3000, 0.8, 0.06, o); noise(t + 0.34, 0.05, 'highpass', 3000, 0.8, 0.06, o); } },
    hedgehog: { ch: 'animals', gap: 3000, fn(t, o) { for (let i = 0; i < 4; i++) noise(t + i * 0.12, 0.06, 'bandpass', vary(900, 0.3), 2.5, 0.09, o); } },
    duck: { ch: 'animals', gap: 2500, fn(t, o) { [0, 0.24].forEach((dt) => tone(t + dt, 0.16, 'sawtooth', 320, 280, 0.12, o, [1100, 5])); } },
    // Tiếng tương tác và di chuyển
    step: { ch: 'sfx', gap: 90, fn(t, o) { noise(t, 0.045, 'lowpass', vary(520, 0.3), 0.7, 0.12, o); } },
    run: { ch: 'sfx', gap: 70, fn(t, o) { noise(t, 0.035, 'lowpass', vary(800, 0.3), 0.7, 0.13, o); } },
    eat: { ch: 'sfx', gap: 2500, fn(t, o) { for (let i = 0; i < 7; i++) noise(t + i * vary(0.16, 0.4), 0.04, 'highpass', 2200, 0.7, 0.12, o); } },
    drink: { ch: 'sfx', gap: 2500, fn(t, o) { for (let i = 0; i < 6; i++) noise(t + i * 0.17, 0.05, 'bandpass', vary(750, 0.2), 4, 0.16, o); } },
    squeak: { ch: 'sfx', gap: 400, fn(t, o) { tone(t, 0.09, 'sine', 1500, 2300, 0.14, o); tone(t + 0.13, 0.08, 'sine', 1700, 2400, 0.12, o); } },
    bounce: { ch: 'sfx', gap: 200, fn(t, o) { tone(t, 0.12, 'sine', 210, 85, 0.25, o); } },
    swish: { ch: 'sfx', gap: 600, fn(t, o) { noise(t, 0.16, 'bandpass', 1200, 0.9, 0.06, o, 0.05); } },
    chime: { ch: 'sfx', gap: 300, fn(t, o) { tone(t, 0.6, 'sine', 880, null, 0.12, o, null, 0.005); tone(t + 0.09, 0.7, 'sine', 1320, null, 0.09, o, null, 0.005); } },
    coin: { ch: 'sfx', gap: 150, fn(t, o) { tone(t, 0.08, 'square', 1568, null, 0.05, o); tone(t + 0.07, 0.18, 'square', 2093, null, 0.05, o); } },
  };
  function play(name, opts) {
    const s = SOUNDS[name];
    if (!s || !ready() || level(s.ch) === 0) return false;
    const now = performance.now();
    if (st.last[name] && now - st.last[name] < s.gap) return false; // tránh dồn dập
    st.last[name] = now;
    try { s.fn(ctx.currentTime + 0.01, bus[s.ch], opts || {}); } catch (e) { return false; }
    return true;
  }

  /* ---------- Âm thanh môi trường theo cảnh ---------- */
  function loop(buf, type, freq, gain) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(bus.ambience); s.start();
    g.gain.setTargetAtTime(gain, ctx.currentTime, 0.6);
    return { stop() { g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => { try { s.stop(); } catch (e) { /* bỏ qua */ } }, 1500); } };
  }
  function birds() {
    let on = true, timer = 0;
    const chirp = () => {
      if (!on) return;
      if (ready()) { const t = ctx.currentTime + 0.02, f = vary(2600, 0.3), n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) tone(t + i * 0.11, 0.07, 'sine', f, f * 1.35, 0.05, bus.ambience); }
      timer = setTimeout(chirp, 900 + Math.random() * 3200);
    };
    chirp();
    return { stop() { on = false; clearTimeout(timer); } };
  }
  function startScene() {
    if (!ctx || !cfg().enabled) return;
    const want = {};
    const rain = B.scene && B.scene.weather() === 'rain', musicIsRain = cfg().trackId === 'builtin:rain' && level('music') > 0;
    if (st.scene === 'outdoor') { want.birds = 1; want.wind = 1; if (rain && !musicIsRain) want.rain = 1; }
    else { if (rain && !musicIsRain) want.rain = 1; if (B.scene && B.scene.light().fireOn) want.fire = 1; }
    Object.keys(st.amb).forEach((k) => { if (!want[k]) { st.amb[k].stop(); delete st.amb[k]; } });
    Object.keys(want).forEach((k) => {
      if (st.amb[k]) return;
      if (k === 'birds') st.amb[k] = birds();
      if (k === 'wind') st.amb[k] = loop(brownBuf, 'lowpass', 380, 0.45);
      if (k === 'rain') st.amb[k] = loop(noiseBuf, 'bandpass', 1800, 0.12);
      if (k === 'fire') st.amb[k] = loop(brownBuf, 'lowpass', 240, 0.35);
    });
  }
  function setScene(s) { st.scene = s; startScene(); }

  /* ---------- Nhạc nền ---------- */
  const tracks = () => BUILTIN.concat(cfg().tracks.map((t) => Object.assign({ src: null }, t)));
  const trackOf = (id) => tracks().find((t) => t.id === id);
  const urls = {};
  function srcOf(t) {
    if (t.src) return Promise.resolve(t.src);
    if (urls[t.id]) return Promise.resolve(urls[t.id]);
    return B.idb.get('audio', t.id).then((blob) => { if (!blob) throw new Error('missing'); urls[t.id] = URL.createObjectURL(blob); return urls[t.id]; });
  }
  function playMusic(id) {
    const a = cfg();
    if (id) a.trackId = id;
    const t = trackOf(a.trackId) || BUILTIN[0];
    if (!a.enabled || level('music') === 0) return Promise.resolve(false);
    return srcOf(t).then((src) => {
      if (!st.music) { st.music = new Audio(); st.music.loop = true; st.music.preload = 'auto'; }
      const el = st.music;
      if (el.dataset.id !== t.id) { el.src = src; el.dataset.id = t.id; }
      el.volume = level('music');
      return el.play().then(() => { renderBtn(); startScene(); return true; }).catch(() => false);
    }).catch(() => { B.ui.toast('Không tìm thấy tệp nhạc này trong bộ nhớ của trình duyệt.', { icon: 'x' }); return false; });
  }
  function pauseMusic() { if (st.music) st.music.pause(); renderBtn(); }
  const musicPlaying = () => !!(st.music && !st.music.paused);
  function nextFav() {
    const a = cfg(), list = a.favs.filter((id) => trackOf(id));
    if (!list.length) return;
    const i = list.indexOf(a.trackId);
    playMusic(list[(i + 1) % list.length]);
  }
  function importFiles(files) {
    const a = cfg();
    return files.reduce((p, f) => p.then(() => {
      if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|aac|ogg|oga|wav|flac|webm)$/i.test(f.name)) throw new Error(`"${f.name}" không phải tệp âm thanh.`);
      if (f.size > MAX_MB * 1048576) throw new Error(`"${f.name}" lớn hơn ${MAX_MB} MB.`);
      const id = 'user:' + U.uid();
      return B.idb.put('audio', id, f).then(() => { a.tracks.push({ id, name: f.name.replace(/\.[^.]+$/, '').slice(0, 60), size: f.size, addedAt: B.now() }); B.store.save(); });
    }), Promise.resolve());
  }
  function removeTrack(id) {
    const a = cfg();
    a.tracks = a.tracks.filter((t) => t.id !== id);
    a.favs = a.favs.filter((x) => x !== id);
    if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; }
    if (a.trackId === id) { a.trackId = 'builtin:rain'; if (musicPlaying()) playMusic(); }
    B.store.save();
    return B.idb.del('audio', id).catch(() => {});
  }
  function preview(id) {
    const t = trackOf(id);
    if (!t) return;
    stopPreview();
    srcOf(t).then((src) => {
      const el = (st.preview = new Audio(src));
      el.volume = Math.max(0.15, level('music') || cfg().ch.music.vol / 100);
      if (musicPlaying()) st.music.volume = level('music') * 0.25;
      el.play().catch(() => {});
      st.previewId = id;
      st.previewT = setTimeout(stopPreview, 15000);
      render();
    });
  }
  function stopPreview() {
    clearTimeout(st.previewT);
    if (st.preview) { st.preview.pause(); st.preview = null; }
    st.previewId = null;
    if (st.music) st.music.volume = level('music');
  }

  /* ---------- Tiếng động lúc rảnh: thưa thớt, theo đúng trạng thái ---------- */
  function idle() {
    if (!ready() || !cfg().idle || (B.walk && B.walk.state.on) || document.hidden) return;
    const S = B.S, bs = B.bun.state, m = B.mood();
    if (S.bun.away) return;
    if (bs.pose === 'sleep') { if (Math.random() < 0.5) play('sleep'); return; }
    if ((m === 'hungry' || m === 'needy') && Math.random() < 0.25) play('whine');
    else if (m === 'sad' || m === 'stressed') { if (Math.random() < 0.18) play('sigh'); }
    else if (m === 'happy' && Math.random() < 0.08) play('pant');
  }

  /* ---------- Giao diện ---------- */
  function renderBtn() {
    const b = $('#btnAudio');
    if (!b) return;
    const on = cfg().enabled;
    b.innerHTML = ic(on ? 'speaker' : 'mute');
    b.classList.toggle('needs-tap', !on);
    b.title = on ? 'Âm thanh' : 'Bật âm thanh';
  }
  let modal = null;
  function html() {
    const a = cfg(), list = tracks().sort((x, y) => (a.favs.indexOf(y.id) >= 0) - (a.favs.indexOf(x.id) >= 0));
    const row = (k) => `<div class="au-row"><button class="pill ${a.ch[k].on ? 'on' : ''}" data-au="toggle" data-ch="${k}" aria-pressed="${a.ch[k].on}">${a.ch[k].on ? 'Bật' : 'Tắt'}</button><label for="auv-${k}">${CH[k]}</label>
      <input type="range" id="auv-${k}" data-vol="${k}" min="0" max="100" value="${a.ch[k].vol}" aria-label="Âm lượng ${CH[k].toLowerCase()}"><span class="au-num">${a.ch[k].vol}</span>${k === 'music' ? '' : `<button class="mini" data-au="test" data-ch="${k}">Nghe thử</button>`}</div>`;
    return `${!a.enabled || !ctx || ctx.state !== 'running' ? `<div class="au-unlock"><div><strong>${a.enabled ? 'Bấm để tiếp tục âm thanh' : 'Âm thanh đang tắt'}</strong><span>Trình duyệt chỉ cho phát tiếng sau khi bạn bấm. Bấm một lần để bật.</span></div><button class="btn primary" data-au="enable" data-autofocus>${ic('speaker')}Bật âm thanh</button></div>` : `<div class="row" style="margin-bottom:6px"><span class="tags"><span>Âm thanh đang bật</span></span><span class="grow"></span><button class="btn ghost sm" data-au="disable">${ic('mute')}Tắt hết</button></div>`}
      <h3 class="sec-title" style="margin-top:4px">Các kênh</h3>${Object.keys(CH).map(row).join('')}
      <label class="check" style="margin:6px 0 0"><input type="checkbox" id="auIdle" ${a.idle ? 'checked' : ''}>Thỉnh thoảng Bun phát tiếng khi rảnh (thở lúc ngủ, rên khi đói)</label>
      <h3 class="sec-title">Thư viện nhạc nền <small>${musicPlaying() ? 'đang phát: ' + esc((trackOf(a.trackId) || {}).name || '') : 'đang dừng'}</small></h3>
      <div class="row" style="margin-bottom:8px"><button class="btn primary sm" data-au="${musicPlaying() ? 'pause' : 'play'}">${ic(musicPlaying() ? 'pause' : 'play')}${musicPlaying() ? 'Tạm dừng nhạc' : 'Phát nhạc nền'}</button><button class="btn soft sm" data-au="next">Bài yêu thích tiếp theo</button><button class="btn soft sm" data-au="import">${ic('upload')}Nhập tệp nhạc</button></div>
      <ul class="hlist">${list.map((t) => `<li class="${t.id === a.trackId ? 'au-cur' : ''}"><button class="mini" data-au="fav" data-id="${t.id}" aria-label="Yêu thích" title="Yêu thích">${ic('star')}</button><div><strong>${esc(t.name)}${a.favs.indexOf(t.id) >= 0 ? ' <small class="chip-c ok">yêu thích</small>' : ''}</strong><small>${t.note ? esc(t.note) : `Bạn nhập · ${(t.size / 1048576).toFixed(1).replace('.', ',')} MB`}${t.id === a.trackId ? ' · đang chọn' : ''}</small></div>
        <button class="mini" data-au="${st.previewId === t.id ? 'stopprev' : 'prev'}" data-id="${t.id}">${st.previewId === t.id ? 'Dừng nghe thử' : 'Nghe thử'}</button>${t.id !== a.trackId ? `<button class="mini" data-au="use" data-id="${t.id}">Dùng làm nhạc nền</button>` : ''}${t.src ? '' : `<button class="mini danger" data-au="del" data-id="${t.id}" aria-label="Xóa">${ic('trash')}</button>`}</li>`).join('')}</ul>
      <p class="hint">Nhạc nhập vào chỉ lưu trong trình duyệt trên máy này (không có trong tệp sao lưu). Mỗi tệp tối đa ${MAX_MB} MB. Khi nhạc YouTube đang phát, nhạc nền tự tạm dừng.</p>
      <input type="file" id="auFile" accept="audio/*" multiple hidden>`;
  }
  function render() { if (modal && !modal.closed) modal.render(html()); }
  function open() {
    modal = B.ui.modal({ title: 'Âm thanh', cls: 'wide', onClose: stopPreview });
    render();
    modal.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-au]');
      if (!b) return;
      const a = cfg(), k = b.dataset.ch, id = b.dataset.id, x = b.dataset.au;
      if (x === 'enable') { a.enabled = true; B.store.save(); unlock(); setTimeout(() => { play('happy'); render(); }, 120); return; }
      if (x === 'disable') { a.enabled = false; B.store.save(); pauseMusic(); Object.keys(st.amb).forEach((n) => { st.amb[n].stop(); delete st.amb[n]; }); if (ctx) ctx.suspend(); renderBtn(); return render(); }
      if (x === 'toggle') { a.ch[k].on = !a.ch[k].on; B.store.save(); applyLevels(); if (k === 'music') { if (a.ch[k].on) playMusic(); else pauseMusic(); } return render(); }
      if (x === 'test') { const sample = { ambience: null, animals: 'bark', sfx: 'squeak' }[k]; if (k === 'ambience') { setScene(st.scene); B.ui.toast('Âm thanh môi trường tự đổi theo cảnh: mưa, lò sưởi, chim hót khi đi dạo.', { icon: 'speaker', ms: 4000 }); } else { st.last[sample] = 0; play(sample); } return; }
      if (x === 'play') { playMusic().then(render); return; }
      if (x === 'pause') { pauseMusic(); return render(); }
      if (x === 'next') { nextFav(); setTimeout(render, 300); return; }
      if (x === 'import') return $('#auFile', modal.body).click();
      if (x === 'fav') { const i = a.favs.indexOf(id); if (i >= 0) a.favs.splice(i, 1); else a.favs.push(id); B.store.save(); return render(); }
      if (x === 'prev') return preview(id);
      if (x === 'stopprev') { stopPreview(); return render(); }
      if (x === 'use') { stopPreview(); a.trackId = id; B.store.save(); if (a.enabled && level('music') > 0) playMusic(id).then(render); else render(); return; }
      if (x === 'del') B.ui.confirm('Xóa tệp nhạc này?', `"${esc((trackOf(id) || {}).name || '')}" sẽ bị xóa khỏi bộ nhớ trình duyệt. Tệp gốc trên máy bạn không bị ảnh hưởng.`, 'Xóa', true).then((ok) => ok && removeTrack(id).then(render));
    });
    modal.body.addEventListener('input', (e) => {
      const k = e.target.dataset.vol;
      if (!k) return;
      cfg().ch[k].vol = +e.target.value; applyLevels();
      const n = e.target.parentElement.querySelector('.au-num'); if (n) n.textContent = e.target.value;
    });
    modal.body.addEventListener('change', (e) => {
      if (e.target.dataset.vol) { B.store.save(); if (e.target.dataset.vol === 'music' && cfg().enabled && !musicPlaying() && level('music') > 0) playMusic().then(render); }
      if (e.target.id === 'auIdle') { cfg().idle = e.target.checked; B.store.save(); }
      if (e.target.id === 'auFile') {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length) importFiles(files).then(() => { B.ui.toast(`Đã thêm ${files.length} tệp nhạc vào thư viện.`, { icon: 'music' }); render(); }).catch((err) => { B.ui.toast(esc(err.message), { icon: 'x', ms: 6000 }); render(); });
      }
    });
  }

  function init() {
    cfg();
    renderBtn();
    $('#btnAudio').addEventListener('click', () => { unlock(); open(); });
    // Lần bấm đầu tiên trong phiên mở khóa âm thanh nếu người dùng đã bật trước đó
    const first = () => { unlock(); };
    window.addEventListener('pointerdown', first, { capture: true });
    window.addEventListener('keydown', first, { capture: true });
    B.on('taskDone', () => play('chime'));
    B.on('focus', (d) => { if (d.type === 'done') play('chime'); });
    setInterval(idle, 25000);
    setInterval(() => { if (ready()) startScene(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (cfg().enabled) ctx.resume(); });
  }

  B.audio = { init, play, unlock, setScene, open, playMusic, pauseMusic, musicPlaying, importFiles, removeTrack, tracks, cfg, level, ensure: () => (ensure(), ctx), bus: (k) => (ensure(), bus[k]), noise: () => (ensure(), noiseBuf), applyLevels,
    // YouTube đang phát thì tạm dừng nhạc nền để không chồng tiếng
    youtube(on) { st.ytPlaying = !!on; if (on && musicPlaying()) pauseMusic(); }, state: st };
})();
