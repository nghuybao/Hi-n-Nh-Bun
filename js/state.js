/* Hiên Nhà Bun — trạng thái, lưu trữ, mô phỏng thời gian, chăm sóc, thế hệ */
(function () {
  'use strict';
  const B = window.B;
  const KEY = 'hien-nha-bun:v1';
  const BACKUP = KEY + ':backup';
  const HOUR = 3600000, DAY = 86400000;

  /* ---------- Tiện ích ---------- */
  const DOW = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const U = (B.util = {
    $: (s, r) => (r || document).querySelector(s),
    $$: (s, r) => Array.from((r || document).querySelectorAll(s)),
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    rand: (a, b) => a + Math.random() * (b - a),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    dateKey(d) {
      d = d || new Date(B.now());
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    parseKey(k) {
      const p = k.split('-').map(Number);
      return new Date(p[0], p[1] - 1, p[2]);
    },
    addDays(k, n) {
      const d = U.parseKey(k);
      d.setDate(d.getDate() + n);
      return U.dateKey(d);
    },
    fmtDate(k, short) {
      const d = U.parseKey(k);
      return short ? `${d.getDate()}/${d.getMonth() + 1}` : `${DOW[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;
    },
    fmtDateTime(ms) {
      const d = new Date(ms);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    },
    fmtClock(ms) {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    },
    fmtAway(ms) {
      const m = Math.round(ms / 60000);
      if (m < 60) return `${Math.max(1, m)} phút`;
      const h = Math.round(ms / HOUR);
      if (h < 36) return `${h} giờ`;
      return `${Math.round(ms / DAY)} ngày`;
    },
  });

  /* ---------- Đồng hồ (có thể dịch giờ khi kiểm thử) ---------- */
  let off = 0;
  try { off = Number(sessionStorage.getItem('bun-time-offset') || 0) || 0; } catch (e) { /* bỏ qua */ }
  B._off = off;
  B.now = () => Date.now() + B._off;
  B.time = {
    preview: null, // xem thử ánh sáng ở một khung giờ khác
    weatherPreview: null,
    hour() {
      const d = new Date(B.now());
      return d.getHours() + d.getMinutes() / 60;
    },
    visualHour() {
      return this.preview != null ? this.preview : this.hour();
    },
    today: () => U.dateKey(new Date(B.now())),
  };

  /* ---------- Sự kiện nội bộ ---------- */
  const subs = {};
  B.on = (evt, fn) => ((subs[evt] = subs[evt] || []).push(fn), fn);
  B.emit = (evt, data) => (subs[evt] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });

  /* ---------- Trạng thái mặc định ---------- */
  function newDay(date) {
    return { date, rewardCount: 0, coinsEarned: 0, bonus: { am: false, pm: false, all: false, streak: false }, morningDone: false, eveningDone: false, focusMin: 0, focusCoins: 0, petCount: 0, bondCare: 0, freeMeal: false, freeWater: false, habitSaid: false, noonDone: false, treats: 0, onTime: 0, walks: 0, friendBond: 0 };
  }
  function newBun(gen, now) {
    return { gen, name: 'Bun', bornAt: now, stats: { hunger: 78, thirst: 80, joy: 76, energy: 88 }, bondXp: 0, counters: { pet: 0, play: 0, feed: 0, water: 0, treat: 0, tasks: 0, focusMin: 0 }, outfit: { head: null, face: null, neck: null, body: null }, asleep: false, nap: false, away: null,
      weight: 1, frame: 1, bcs: 4.5, diet: 1, wlog: [] };
  }
  function defaults() {
    const now = B.now();
    return {
      v: 1, createdAt: now, lastTick: now, lastSeen: now, lastCareAt: now,
      coins: 60, debt: 0, tickets: 1,
      settings: { difficulty: 'normal', rest: { on: false, until: null, since: null }, reduceMotion: false },
      bun: newBun(1, now),
      house: { level: 1, owned: ['bed0', 'rug0', 'cur0'], placed: { bed: 'bed0', rug: 'rug0', plant: null, lamp: null, wall: null, curtain: 'cur0', lights: null }, trophies: [] },
      tasks: [],
      day: newDay(B.time.today()),
      history: {}, restDays: {},
      streak: { current: 0, best: 0, lastDate: null },
      totals: { tasksDone: 0, coinsEarned: 0, focusMin: 0, focusSessions: 0, daysAllDone: 0, earlyTasks: 0, plannedDays: 0 },
      habit: { hours: new Array(24).fill(0) },
      memories: [], treasures: [], achievements: {}, generations: [],
      focus: null, lastSurprise: 0, seenIntro: false,
      // Bản 2: lập kế hoạch, dinh dưỡng, sức khỏe, tường ảnh, bạn bè, nhạc
      plan: { dayStart: '08:00', dayEnd: '22:00', lunchAt: '12:00', lunchMin: 60, dinnerAt: '18:30', dinnerMin: 45, focusLen: 50, breakLen: 10, noonAt: '12:00', noonOn: true, cats: [] },
      dayPlan: null, nextPlan: null, learn: {},
      pantry: {}, ledger: [], health: { items: [] },
      photos: [], pets: [], music: { favs: [], last: '', vol: 60, ambient: {}, ambVol: 40 }, sessions: [],
    };
  }
  // Nâng cấp dữ liệu từ bản cũ: chỉ thêm, không xóa
  function migrate(S) {
    if ((S.v || 1) < 2) {
      const age = Math.max(0, (B.now() - (S.bun.bornAt || B.now())) / 86400000);
      S.bun.frame = Math.min(3, 1 + 2 * (1 - Math.exp(-age / 45)));
      S.bun.weight = S.bun.frame;
      S.v = 2;
    }
    if (B.plan) S.tasks.forEach((t) => B.plan.norm(t));
  }
  function merge(target, def) {
    Object.keys(def).forEach((k) => {
      const dv = def[k], tv = target[k];
      if (tv === undefined || tv === null && dv !== null && typeof dv === 'object' && !Array.isArray(dv) && k !== 'focus' && k !== 'away') target[k] = dv;
      else if (dv && typeof dv === 'object' && !Array.isArray(dv) && tv && typeof tv === 'object' && !Array.isArray(tv)) merge(tv, dv);
    });
    return target;
  }
  B.newDay = newDay;

  /* ---------- Lưu trữ ---------- */
  let saveTimer = null;
  B.store = {
    KEY,
    load() {
      let S = null, raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { /* trình duyệt chặn lưu trữ */ }
      if (raw) { try { S = JSON.parse(raw); } catch (e) { S = null; } }
      if (!S || typeof S !== 'object' || !S.bun) {
        S = null;
        try { const b = localStorage.getItem(BACKUP); if (b) { S = JSON.parse(b); B.restoredFromBackup = true; } } catch (e) { S = null; }
      }
      B.isFirstRun = !S;
      B.S = merge(S || {}, defaults());
      if (!Array.isArray(B.S.habit.hours) || B.S.habit.hours.length !== 24) B.S.habit.hours = new Array(24).fill(0);
      if (B.isFirstRun) B.S.v = 2;
      migrate(B.S);
      return B.S;
    },
    save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(B.store.saveNow, 250);
    },
    saveNow() {
      clearTimeout(saveTimer);
      try { localStorage.setItem(KEY, JSON.stringify(B.S)); return true; } catch (e) { B.emit('saveError', e); return false; }
    },
    backup() {
      try { localStorage.setItem(BACKUP, JSON.stringify(B.S)); } catch (e) { /* bỏ qua */ }
    },
    // photos: ảnh trên tường (dạng data URL) để tệp sao lưu mang theo được cả ảnh
    exportText(photos) {
      return JSON.stringify({ app: 'hien-nha-bun', v: 2, exportedAt: new Date().toISOString(), state: B.S, photos: photos || [] }, null, photos && photos.length ? 0 : 2);
    },
    // Trả về trạng thái đã kiểm tra; ném lỗi tiếng Việt nếu tệp không hợp lệ
    parseImport(text) {
      let obj;
      try { obj = JSON.parse(text); } catch (e) { throw new Error('Tệp không phải là JSON hợp lệ.'); }
      if (!obj || obj.app !== 'hien-nha-bun' || !obj.state) throw new Error('Đây không phải tệp sao lưu của Hiên Nhà Bun.');
      const s = obj.state;
      if (typeof s !== 'object' || !s.bun || !s.bun.stats || !Array.isArray(s.tasks) || !s.house || !Array.isArray(s.house.owned)) throw new Error('Tệp sao lưu bị thiếu dữ liệu.');
      return s;
    },
    applyImport(s) {
      const now = B.now();
      const gap = U.clamp((s.lastTick || now) - (s.lastCareAt || now), 0, 60 * DAY);
      merge(s, defaults());
      migrate(s);
      // Thời gian tệp nằm trong ổ đĩa không tính là thời gian bỏ quên Bun
      s.lastTick = now; s.lastSeen = now; s.lastCareAt = now - gap; s.focus = null;
      B.S = s;
      return B.store.saveNow();
    },
    reset() {
      try { localStorage.removeItem(KEY); localStorage.removeItem(BACKUP); } catch (e) { /* bỏ qua */ }
    },
  };

  /* ---------- Xu ---------- */
  B.earn = (n) => {
    const S = B.S;
    n = Math.max(0, Math.round(n));
    if (!n) return 0;
    S.day.coinsEarned += n; S.totals.coinsEarned += n;
    const pay = Math.min(S.debt, n);
    S.debt -= pay; S.coins += n - pay;
    return n;
  };
  B.spend = (n) => {
    if (B.S.coins < n) return false;
    B.S.coins -= n;
    return true;
  };
  // Thu hồi thưởng khi bỏ đánh dấu; phần thiếu ghi nợ để không thể "cày" bằng cách bật tắt
  B.refund = (n) => {
    const S = B.S;
    const take = Math.min(S.coins, n);
    S.coins -= take; S.debt += n - take;
    S.day.coinsEarned = Math.max(0, S.day.coinsEarned - n); S.totals.coinsEarned = Math.max(0, S.totals.coinsEarned - n);
  };

  /* ---------- Thân thiết & tính cách ---------- */
  B.bond = (xp) => {
    let i = 0;
    while (i + 1 < B.BOND.length && xp >= B.BOND[i + 1].xp) i++;
    const cur = B.BOND[i], next = B.BOND[i + 1];
    return { level: i + 1, name: cur.name, next: next ? next.xp : null, pct: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1 };
  };
  B.addBond = (n, care) => {
    const S = B.S;
    if (care) {
      if (S.day.bondCare >= 20) return;
      S.day.bondCare += n;
    }
    const before = B.bond(S.bun.bondXp).level;
    S.bun.bondXp += n;
    const after = B.bond(S.bun.bondXp);
    if (after.level > before) {
      B.mem.add({ icon: 'heart', title: `Thân thiết hơn: ${after.name}`, text: 'Bun tin bạn thêm một chút nữa.' });
      B.emit('bondUp', after);
    }
  };
  B.traits = () => {
    const S = B.S, c = S.bun.counters, out = [];
    if (c.play >= 10) out.push({ name: 'Ham chơi', desc: 'Thấy đồ chơi là mắt sáng lên.' });
    if (c.pet >= 30) out.push({ name: 'Quấn chủ', desc: 'Hay lại gần để được vuốt ve.' });
    if (c.treat >= 8) out.push({ name: 'Háu ăn', desc: 'Nghe tiếng túi bánh là chạy tới.' });
    if (c.focusMin >= 300) out.push({ name: 'Chăm chỉ', desc: 'Quen nằm cạnh bàn mỗi khi bạn làm việc.' });
    const hrs = S.habit.hours, total = hrs.reduce((a, b) => a + b, 0);
    if (total >= 15) {
      const early = hrs.slice(5, 9).reduce((a, b) => a + b, 0), late = hrs.slice(21).reduce((a, b) => a + b, 0) + hrs.slice(0, 3).reduce((a, b) => a + b, 0);
      if (early / total >= 0.3) out.push({ name: 'Chim sớm', desc: 'Dậy sớm cùng bạn.' });
      else if (late / total >= 0.3) out.push({ name: 'Cú đêm', desc: 'Thức khuya theo bạn.' });
    }
    if (!out.length) out.push({ name: 'Tò mò', desc: 'Còn đang làm quen với ngôi nhà.' });
    return out.slice(0, 3);
  };
  // Tâm trạng hiển thị trên mặt và dáng đi của Bun
  B.mood = () => {
    const s = B.S.bun.stats, sx = B.S.bun.stress || 0;
    if (s.hunger < 25 || s.thirst < 25) return 'needy';
    if (sx > 65) return 'stressed';
    if (s.joy < 30) return 'sad';
    if (s.hunger < 50) return 'hungry';
    if (s.energy < 25) return 'sleepy';
    return (s.hunger + s.thirst + s.joy + s.energy) / 4 >= 62 ? 'happy' : 'ok';
  };
  // Giảm căng thẳng khi được chăm sóc
  B.calm = (n) => { const b = B.S.bun; b.stress = Math.max(0, (b.stress || 0) - n); };

  /* ---------- Kỷ niệm ---------- */
  B.mem = {
    add(m) {
      const S = B.S;
      if (m.key && S.memories.some((x) => x.key === m.key && x.gen === S.bun.gen)) return null;
      const rec = { id: U.uid(), key: m.key || null, at: B.now(), gen: S.bun.gen, icon: m.icon || 'star', title: m.title, text: m.text || '' };
      S.memories.push(rec);
      if (S.memories.length > 500) S.memories.splice(0, S.memories.length - 500);
      B.emit('memory', rec);
      return rec;
    },
  };

  /* ---------- Chế độ nghỉ ---------- */
  B.rest = {
    activeAt(t) {
      const r = B.S.settings.rest;
      return !!r.on && (!r.until || t <= r.until);
    },
    set(on, days) {
      const now = B.now();
      B.S.settings.rest = on ? { on: true, since: now, until: days ? now + days * DAY : null } : { on: false, since: null, until: null };
      if (!on) B.S.lastCareAt = now;
      B.store.save();
      B.emit('change');
    },
  };

  /* ---------- Mô phỏng theo thời gian thật ---------- */
  function step(t, dt, live) {
    const S = B.S, st = S.bun.stats;
    if (B.rest.activeAt(t)) {
      // Bà trông giúp: chỉ số được giữ ở mức dễ chịu, đồng hồ vắng mặt dừng lại
      S.lastCareAt += dt;
      S.restDays[U.dateKey(new Date(t))] = 1;
      const k = Math.min(1, (dt / HOUR) * 0.5);
      ['hunger', 'thirst', 'joy', 'energy'].forEach((n) => (st[n] += (72 - st[n]) * k));
      S.bun.stress = (S.bun.stress || 0) + (10 - (S.bun.stress || 0)) * k;
      if (B.nutri) B.nutri.simStep(dt / HOUR, true);
      if (B.pets && B.pets.sim) B.pets.sim(dt / HOUR, true);
      return;
    }
    const h = dt / HOUR, k = B.DIFF[S.settings.difficulty].decay;
    const d = new Date(t), hr = d.getHours() + d.getMinutes() / 60, night = hr >= 22.5 || hr < 6;
    let asleep;
    if (live) asleep = !!S.bun.asleep;
    else {
      if (st.energy < 20) S.bun.nap = true;
      if (st.energy >= 85) S.bun.nap = false;
      asleep = night || S.bun.nap;
    }
    const slow = asleep ? 0.45 : 1;
    st.hunger -= 2.8 * k * slow * h;
    st.thirst -= 3.6 * k * slow * h;
    // Đói dưới 50% thì niềm vui giảm nhanh hơn; đói, khát nặng thì càng nhanh
    st.joy -= 2.1 * k * (asleep ? 0.3 : 1) * (st.hunger < 20 || st.thirst < 20 ? 1.9 : st.hunger < 50 ? 1.5 : 1) * h;
    // Căng thẳng: tăng dần khi niềm vui thấp kéo dài, giảm khi Bun được chăm sóc đầy đủ
    const b = S.bun, joy = st.joy;
    let sx = b.stress || 0;
    if (joy < 35) sx += (1.0 + 2.2 * (35 - joy) / 35) * (asleep ? 0.5 : 1) * h;
    else if (joy >= 55 && st.hunger >= 50 && st.thirst >= 40) sx -= (asleep ? 3 : 2.4) * h;
    else sx -= 0.4 * h;
    b.stress = U.clamp(sx, 0, 100);
    // Căng thẳng cao làm Bun ngủ kém hồi sức và hao năng lượng hơn khi thức
    st.energy += (asleep ? 13 * (1 - b.stress / 250) : -4.2 * (1 + b.stress / 160)) * h;
    // Căng thẳng cao kéo dài làm Bun gầy đi từ từ (thang cân nặng của trò chơi)
    if (b.stress > 65 && b.bcs != null) b.bcs = Math.max(1.5, b.bcs - 0.006 * (0.5 + (b.stress - 65) / 35) * h);
    ['thirst', 'joy', 'energy'].forEach((n) => (st[n] = U.clamp(st[n], 0, 100)));
    st.hunger = U.clamp(st.hunger, 0, 125); // trên 100 là "quá no", dùng cho thể trạng
    if (B.nutri) B.nutri.simStep(h, false);
    if (B.pets && B.pets.sim) B.pets.sim(h, false);
  }
  B.sim = {
    // Tiến đồng hồ tới "now". Trả về số mili giây đã trôi qua.
    advance(now) {
      const S = B.S;
      let from = S.lastTick || now;
      if (now < from) { S.lastTick = now; return 0; } // đồng hồ máy bị chỉnh lùi
      const elapsed = now - from;
      if (S.bun.away) { S.lastTick = now; return elapsed; }
      const live = elapsed < 5 * 60000;
      const stepMs = live ? Math.max(1, elapsed) : 30 * 60000;
      let t = from, guard = 0;
      while (t < now && guard++ < 5000) {
        const dt = Math.min(stepMs, now - t);
        step(t, dt, live);
        t += dt;
      }
      S.lastTick = now;
      const r = S.settings.rest;
      if (r.on && r.until && now > r.until) {
        S.settings.rest = { on: false, since: null, until: null };
        S.lastCareAt = Math.max(S.lastCareAt, r.until);
        B.emit('restEnded');
      }
      const limit = B.DIFF[S.settings.difficulty].limitH;
      if (limit && !B.rest.activeAt(now) && now - S.lastCareAt >= limit * HOUR) S.bun.away = { at: now, limit };
      return elapsed;
    },
    neglectHours() {
      return Math.max(0, (B.now() - B.S.lastCareAt) / HOUR);
    },
  };
  B.care = () => { B.S.lastCareAt = B.now(); };

  /* ---------- Hành động chăm sóc (logic; hoạt cảnh nằm ở bun.js) ---------- */
  B.careActions = {
    feed(foodId) {
      const S = B.S, st = S.bun.stats, f = B.FOODS.find((x) => x.id === foodId);
      if (!f) return { ok: false };
      if (f.id !== 'treat' && st.hunger > 90) return { ok: false, reason: 'full' };
      let free = false;
      if (S.coins < f.price) {
        if (f.id === 'kibble' && !S.day.freeMeal) { S.day.freeMeal = true; free = true; }
        else return { ok: false, reason: 'coins' };
      } else B.spend(f.price);
      st.hunger = U.clamp(st.hunger + f.hunger, 0, 100);
      st.joy = U.clamp(st.joy + f.joy, 0, 100);
      S.bun.counters.feed++;
      if (f.id === 'treat') S.bun.counters.treat++;
      B.addBond(2, true); B.care();
      B.mem.add({ key: 'first_feed', icon: 'food', title: 'Bữa ăn đầu tiên', text: `Bạn đổ ${f.name.toLowerCase()} vào bát, Bun ăn không ngẩng đầu lên.` });
      B.store.save(); B.emit('change');
      return { ok: true, food: f, free };
    },
    water() {
      const S = B.S, st = S.bun.stats;
      if (st.thirst > 90) return { ok: false, reason: 'full' };
      st.thirst = U.clamp(st.thirst + 55, 0, 100);
      S.bun.counters.water++;
      B.addBond(1, true); B.care();
      B.store.save(); B.emit('change');
      return { ok: true };
    },
    play() {
      const S = B.S, st = S.bun.stats;
      if (st.energy < 15) return { ok: false, reason: 'tired' };
      if (st.hunger < 30) return { ok: false, reason: 'hungry' }; // đói quá thì không còn sức chơi
      const toys = S.house.owned.filter((id) => id.indexOf('toy_') === 0).length;
      st.joy = U.clamp(st.joy + (22 + toys * 3) * (st.hunger < 50 ? 0.5 : 1), 0, 100); // đói thì chơi kém hăng
      B.calm(8);
      st.energy = U.clamp(st.energy - 9, 0, 100);
      st.hunger = U.clamp(st.hunger - 4, 0, 100);
      st.thirst = U.clamp(st.thirst - 5, 0, 100);
      S.bun.counters.play++;
      B.addBond(2, true); B.care();
      B.mem.add({ key: 'first_play', icon: 'ball', title: 'Lần đầu chơi cùng nhau', text: 'Bun chạy vòng quanh phòng, hai tai bay phần phật.' });
      B.store.save(); B.emit('change');
      return { ok: true };
    },
    pet() {
      const S = B.S, st = S.bun.stats;
      S.day.petCount++;
      S.bun.counters.pet++;
      if (S.day.petCount <= 12) { st.joy = U.clamp(st.joy + 2.5, 0, 100); B.calm(1.5); }
      B.addBond(1, true); B.care();
      B.store.save(); B.emit('change');
      return { ok: true };
    },
  };

  /* ---------- Mua sắm ---------- */
  B.shop = {
    owns: (id) => B.S.house.owned.indexOf(id) >= 0,
    placed(item) {
      const S = B.S;
      if (item.slot === 'toy') return B.shop.owns(item.id);
      if (B.WEAR_SLOTS.indexOf(item.slot) >= 0) return S.bun.outfit[item.slot] === item.id;
      return S.house.placed[item.slot] === item.id;
    },
    buy(id) {
      const S = B.S, it = B.item(id);
      if (!it || B.shop.owns(id)) return { ok: false };
      if (it.level && S.house.level < it.level) return { ok: false, reason: 'level' };
      if (!B.spend(it.price)) return { ok: false, reason: 'coins' };
      if (B.ledgerAdd) B.ledgerAdd(B.WEAR_SLOTS.indexOf(it.slot) >= 0 ? 'wear' : 'item', it.name, it.price);
      S.house.owned.push(id);
      B.shop.use(id, true);
      const isWear = B.WEAR_SLOTS.indexOf(it.slot) >= 0;
      B.mem.add({ key: 'buy_' + id, icon: isWear ? 'paw' : 'gift', title: `${it.name} về nhà`, text: it.desc });
      S.bun.stats.joy = U.clamp(S.bun.stats.joy + 8, 0, 100);
      B.store.save(); B.emit('change'); B.emit('house', { item: it, bought: true });
      return { ok: true, item: it };
    },
    // Dùng hoặc cất một món đã có
    use(id, silent) {
      const S = B.S, it = B.item(id);
      if (!it || !B.shop.owns(id) || it.slot === 'toy') return;
      const wear = B.WEAR_SLOTS.indexOf(it.slot) >= 0;
      const box = wear ? S.bun.outfit : S.house.placed;
      const required = it.slot === 'bed' || it.slot === 'rug' || it.slot === 'curtain';
      box[it.slot] = box[it.slot] === id && !required ? null : id;
      if (!silent) { B.store.save(); B.emit('change'); B.emit('house', { item: it }); }
    },
    upgrade() {
      const S = B.S, next = B.HOUSE.find((h) => h.level === S.house.level + 1);
      if (!next) return { ok: false };
      if (!B.spend(next.price)) return { ok: false, reason: 'coins' };
      if (B.ledgerAdd) B.ledgerAdd('house', next.name, next.price);
      S.house.level = next.level;
      B.mem.add({ key: 'house_' + next.level, icon: 'home', title: `Nhà mới: ${next.name}`, text: next.desc });
      S.bun.stats.joy = U.clamp(S.bun.stats.joy + 15, 0, 100);
      B.store.save(); B.emit('change'); B.emit('house', { level: next });
      B.ach.check();
      return { ok: true, level: next };
    },
  };

  /* ---------- Thành tích ---------- */
  B.ach = {
    check() {
      const S = B.S, got = [];
      B.ACH.forEach((a) => {
        if (S.achievements[a.id]) return;
        let ok = false;
        try { ok = a.check(S); } catch (e) { ok = false; }
        if (!ok) return;
        S.achievements[a.id] = B.now();
        const r = a.reward || {};
        if (r.coins) B.earn(r.coins);
        if (r.ticket) S.tickets = Math.min(3, S.tickets + r.ticket);
        if (r.trophy && S.house.trophies.indexOf(r.trophy) < 0) S.house.trophies.push(r.trophy);
        B.mem.add({ key: 'ach_' + a.id, icon: 'star', title: `Thành tích: ${a.name}`, text: a.desc + '.' });
        got.push(a);
      });
      if (got.length) { B.store.save(); got.forEach((a) => B.emit('achievement', a)); B.emit('change'); }
      return got;
    },
    rewardText(a) {
      const r = a.reward || {}, parts = [];
      if (r.coins) parts.push(`${r.coins} xu`);
      if (r.trophy) parts.push(B.TROPHIES[r.trophy]);
      if (r.ticket) parts.push('1 vé xe về nhà');
      return parts.join(' · ');
    },
  };

  /* ---------- Thế hệ ---------- */
  B.gen = {
    daysTogether() {
      return Math.max(1, Math.floor((B.now() - B.S.bun.bornAt) / DAY) + 1);
    },
    // Dùng vé xe: đón đúng Bun này về
    useTicket() {
      const S = B.S;
      if (!S.bun.away || S.tickets < 1) return false;
      S.tickets--;
      S.bun.away = null;
      const st = S.bun.stats;
      st.hunger = 60; st.thirst = 60; st.joy = 55; st.energy = 70;
      S.lastCareAt = B.now(); S.lastTick = B.now();
      B.mem.add({ icon: 'ticket', title: 'Chuyến xe về nhà', text: 'Bun ở quê với ông bà ít hôm rồi lại theo bạn về. Vừa thấy cửa nhà, Bun chạy một mạch vào.' });
      B.store.saveNow(); B.emit('change');
      return true;
    },
    // Khép lại thế hệ hiện tại và đón Bun thế hệ kế tiếp
    next() {
      const S = B.S, old = S.bun, now = B.now();
      const mems = S.memories.filter((m) => m.gen === old.gen);
      S.generations.push({
        gen: old.gen, name: old.name, bornAt: old.bornAt, endedAt: (old.away && old.away.at) || now, days: B.gen.daysTogether(),
        tasks: old.counters.tasks, focusMin: old.counters.focusMin, bond: B.bond(old.bondXp).name, traits: B.traits().map((t) => t.name),
        outfit: Object.assign({}, old.outfit), weight: old.weight, highlights: mems.slice(-60).filter((m) => !/^Nhật ký/.test(m.title)).slice(-6).map((m) => m.title),
      });
      const fresh = defaults().bun;
      fresh.gen = old.gen + 1; fresh.bornAt = now; fresh.name = old.name;
      S.bun = fresh;
      S.lastCareAt = now; S.lastTick = now;
      B.mem.add({ key: 'gen_start', icon: 'paw', title: `Bun đời thứ ${fresh.gen} về nhà`, text: 'Căn nhà vẫn vậy, chiếc giường vẫn ở chỗ cũ. Một hành trình mới bắt đầu.' });
      B.store.saveNow(); B.emit('change');
      return fresh;
    },
  };
})();
