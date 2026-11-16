/* Hiên Nhà Bun — công việc, phần thưởng, chuỗi ngày, tổng kết, phiên tập trung */
(function () {
  'use strict';
  const B = window.B, U = B.util, R = B.RULES;
  const rank = { ui: 0, i: 1, u: 2, n: 3 };

  function slotRate(n) {
    return n < R.fullSlots ? 1 : n < R.fullSlots + R.halfSlots ? 0.5 : R.tailRate;
  }
  const isFresh = (t) => !t.planned && B.now() - t.createdAt < R.freshMs;
  // Tính thưởng cho một việc nếu hoàn thành ngay lúc này.
  // ignoreFresh: dùng khi hiển thị trong danh sách, để việc vừa thêm vẫn hiện mức thưởng đầy đủ của nó
  function reward(t, ignoreFresh) {
    const S = B.S, base = B.PRI[t.priority].coins, notes = [];
    const slot = slotRate(S.day.rewardCount);
    if (slot < 1) notes.push(slot === 0.5 ? 'Đã qua 6 việc hôm nay: thưởng còn một nửa' : 'Đã qua 8 việc hôm nay: thưởng tượng trưng');
    let fresh = 1, plan = 1;
    if (t.planned && !t.carried) { plan = R.planBonus; notes.push('Đã lên kế hoạch từ hôm trước: +20%'); }
    else if (!ignoreFresh && isFresh(t)) { fresh = R.freshRate; notes.push('Việc vừa thêm đã xong ngay: Bun chỉ mừng nho nhỏ'); }
    return { coins: Math.max(1, Math.round(base * slot * fresh * plan)), notes, slot };
  }
  // Thưởng thêm khi xong trong thời gian đã định (không thưởng thêm cho việc làm vội để tránh khuyến khích làm ẩu)
  function timeBonus(t, slot) {
    return Math.max(2, Math.round(B.PRI[t.priority].coins * 0.12 * (slot || 1)));
  }

  function gapAllRest(last, today) {
    let k = U.addDays(last, 1), guard = 0;
    while (k < today && guard++ < 400) {
      if (!B.S.restDays[k]) return false;
      k = U.addDays(k, 1);
    }
    return true;
  }
  function bumpStreak(today) {
    const st = B.S.streak;
    if (st.lastDate === today) return false;
    st.current = st.lastDate && gapAllRest(st.lastDate, today) ? st.current + 1 : 1;
    st.lastDate = today;
    st.best = Math.max(st.best, st.current);
    return true;
  }

  function closeDay(date) {
    const S = B.S, list = S.tasks.filter((t) => t.date === date);
    if (!list.length && !S.restDays[date] && !(S.day.date === date && S.day.coinsEarned)) return;
    const sh = (s) => { const l = list.filter((t) => t.shift === s); return [l.filter((t) => t.done).length, l.length]; };
    const pri = {};
    B.PRI_ORDER.forEach((p) => { const l = list.filter((t) => t.priority === p); pri[p] = [l.filter((t) => t.done).length, l.length]; });
    const isDay = S.day.date === date, done = list.filter((t) => t.done);
    S.history[date] = {
      total: list.length, done: done.length, coins: isDay ? S.day.coinsEarned : 0, focusMin: isDay ? S.day.focusMin : 0,
      am: sh('am'), pm: sh('pm'), pri, rest: !!S.restDays[date],
      estMin: done.reduce((a, t) => a + (t.est || 0), 0), actMin: done.reduce((a, t) => a + (t.actual || 0), 0), onTime: done.filter((t) => t.onTime).length,
      items: list.map((t) => ({ t: t.title, d: t.done ? 1 : 0, p: t.priority, e: t.est || 0, a: t.actual || 0, c: t.cat || '' })),
    };
  }

  B.tasks = {
    today: () => B.time.today(),
    tomorrow: () => U.addDays(B.time.today(), 1),
    list(date) {
      return B.S.tasks.filter((t) => t.date === date).sort((a, b) => rank[a.priority] - rank[b.priority] || a.createdAt - b.createdAt);
    },
    get: (id) => B.S.tasks.find((t) => t.id === id),
    stats(date) {
      const l = B.S.tasks.filter((t) => t.date === date), c = (x) => x.filter((t) => t.done).length;
      const am = l.filter((t) => t.shift === 'am'), pm = l.filter((t) => t.shift === 'pm');
      return { total: l.length, done: c(l), am: { t: am.length, d: c(am) }, pm: { t: pm.length, d: c(pm) }, rate: l.length ? c(l) / l.length : 0 };
    },
    preview: (t, ignoreFresh) => reward(t, ignoreFresh),
    timeBonus: (t) => timeBonus(t, slotRate(B.S.day.rewardCount)),
    fullSlotsLeft: () => Math.max(0, R.fullSlots - B.S.day.rewardCount),
    liveStreak() {
      const st = B.S.streak, today = B.time.today();
      if (!st.lastDate) return 0;
      return st.lastDate === today || gapAllRest(st.lastDate, today) ? st.current : 0;
    },
    // Hạ mức ưu tiên nếu đã quá 3 việc "Gấp & Quan trọng" trong ngày
    capPriority(priority, date, exceptId) {
      if (priority !== 'ui') return { priority, capped: false };
      const n = B.S.tasks.filter((t) => t.date === date && t.priority === 'ui' && t.id !== exceptId).length;
      return n >= R.maxUiPerDay ? { priority: 'i', capped: true } : { priority, capped: false };
    },
    add(data) {
      const title = String(data.title || '').trim().slice(0, 140);
      if (!title) return null;
      const today = B.time.today(), date = data.date || today, g = B.plan.guess(title);
      const cap = B.tasks.capPriority(B.PRI[data.priority] ? data.priority : 'i', date);
      const est = U.clamp(Math.round(+data.est || 30), 5, 600), noon = B.plan.toMin(B.S.plan.noonAt);
      const t = {
        id: U.uid(), title, shift: data.shift === 'pm' || (!data.shift && date === today && B.plan.nowMin() >= noon) ? 'pm' : 'am', priority: cap.priority, date,
        done: false, doneAt: null, createdAt: B.now(), planned: date > today, carried: 0, reward: 0,
        cat: String(data.cat || g.cat).slice(0, 30), est, load: B.LOADS[data.load] ? data.load : g.load, diff: B.DIFFS[data.diff] ? data.diff : 'med',
        deadline: data.deadline || null, prefTime: data.prefTime || null, dod: String(data.dod || '').trim().slice(0, 240), dodAuto: false,
        notes: String(data.notes || '').trim().slice(0, 500), steps: [], spent: 0,
      };
      if (!t.dod) { t.dod = B.plan.scope(title, Math.min(est, 90)); t.dodAuto = true; }
      // Việc lớn hơn một phiên dài được chia thành các bước nhỏ, làm từng bước một
      if (data.steps && data.steps.length) t.steps = data.steps;
      else if (est > 90) t.steps = B.plan.makeSteps(title, est);
      B.S.tasks.push(t);
      B.store.save(); B.emit('tasks');
      return { task: t, capped: cap.capped };
    },
    update(id, patch) {
      const t = B.tasks.get(id);
      if (!t) return null;
      let capped = false;
      if (patch.title != null) { const s = String(patch.title).trim().slice(0, 140); if (s) t.title = s; }
      if (patch.priority && B.PRI[patch.priority]) { const c = B.tasks.capPriority(patch.priority, t.date, t.id); t.priority = c.priority; capped = c.capped; }
      if (patch.cat != null) t.cat = String(patch.cat).slice(0, 30) || 'Khác';
      if (patch.load && B.LOADS[patch.load]) t.load = patch.load;
      if (patch.diff && B.DIFFS[patch.diff]) t.diff = patch.diff;
      if (patch.deadline !== undefined) t.deadline = patch.deadline || null;
      if (patch.prefTime !== undefined) t.prefTime = patch.prefTime || null;
      if (patch.notes != null) t.notes = String(patch.notes).trim().slice(0, 500);
      if (patch.dod != null) { const d = String(patch.dod).trim().slice(0, 240); if (d !== t.dod) { t.dod = d; t.dodAuto = !d; } }
      if (patch.est != null && +patch.est !== t.est) {
        const est = U.clamp(Math.round(+patch.est), 5, 600), undone = t.steps.filter((s) => !s.done);
        if (undone.length) { const k = est / Math.max(5, undone.reduce((a, s) => a + s.est, 0)); undone.forEach((s) => (s.est = B.plan.round5(s.est * k))); t.est = t.steps.reduce((a, s) => a + s.est, 0); }
        else { t.est = est; if (est > 90 && !t.done) t.steps = B.plan.makeSteps(t.title, est); }
      }
      if (t.dodAuto || !t.dod) { t.dod = B.plan.scope(t.title, Math.min(90, t.est)); t.dodAuto = true; }
      B.store.save(); B.emit('tasks');
      return { task: t, capped };
    },
    remove(id) {
      const S = B.S, i = S.tasks.findIndex((t) => t.id === id);
      if (i < 0) return;
      if (S.focus && S.focus.taskId === id) S.focus.taskId = null;
      S.tasks.splice(i, 1);
      B.store.save(); B.emit('tasks');
    },
    toggle(id, opts) {
      const t = B.tasks.get(id);
      if (!t || t.date !== B.time.today()) return null;
      return t.done ? B.tasks.uncomplete(t) : B.tasks.complete(t, opts);
    },
    complete(t, opts) {
      opts = opts || {};
      const S = B.S, now = B.now(), today = B.time.today(), hr = new Date(now).getHours();
      if (S.focus && S.focus.taskId === t.id && S.focus.kind !== 'break') B.focus.finishEarly(true);
      const fresh = isFresh(t), r = reward(t), bonuses = [];
      t.done = true; t.doneAt = now; t.reward = r.coins; t.timeBonus = 0; t.slotAtDone = r.slot; t.freshDone = fresh;
      (t.steps || []).forEach((s) => { if (!s.done) { s.done = true; s.doneAt = now; } });
      t.shift = B.plan.nowMin() < B.plan.toMin(S.plan.noonAt) ? 'am' : 'pm';
      S.day.rewardCount++;
      B.earn(r.coins);
      S.totals.tasksDone++; S.bun.counters.tasks++; S.habit.hours[hr]++;
      if (hr < 8 && hr >= 4) S.totals.earlyTasks++;
      S.bun.stats.joy = U.clamp(S.bun.stats.joy + 6 * r.slot, 0, 100);
      B.addBond(3); B.care();
      // Thời gian thực tế: lấy từ đồng hồ nếu có, hoặc do người dùng báo lại
      t.actual = null; t.onTime = false; t.actualSrc = null;
      const actual = opts.actual != null ? Math.round(opts.actual) : t.spent >= 1 ? Math.round(t.spent) : null;
      let time = null;
      if (actual != null) time = B.tasks.setActual(t, actual, opts.actual != null ? 'user' : 'timer', bonuses);
      if (bumpStreak(today) && !S.day.bonus.streak) {
        S.day.bonus.streak = true;
        const c = Math.min(20, S.streak.current * 2);
        B.earn(c); bonuses.push({ label: `Chuỗi ${S.streak.current} ngày`, coins: c });
        if ([3, 7, 14, 30, 50, 100].indexOf(S.streak.current) >= 0) B.mem.add({ key: 'streak_' + S.streak.current, icon: 'flame', title: `Chuỗi ${S.streak.current} ngày`, text: 'Mỗi ngày một chút, và Bun đều ở đó.' });
      }
      const st = B.tasks.stats(today);
      const sk = t.shift, sh = st[sk];
      if (sh.t >= 2 && sh.d === sh.t && !S.day.bonus[sk]) {
        S.day.bonus[sk] = true; B.earn(R.shiftBonus);
        bonuses.push({ label: sk === 'am' ? 'Trọn ca sáng' : 'Trọn ca chiều tối', coins: R.shiftBonus });
      }
      let allDone = false;
      if (st.total >= 3 && st.done === st.total && !S.day.bonus.all) {
        S.day.bonus.all = true; allDone = true; B.earn(R.allDoneBonus); S.totals.daysAllDone++;
        bonuses.push({ label: 'Ngày trọn vẹn', coins: R.allDoneBonus });
        B.mem.add({ key: 'first_all_done', icon: 'star', title: 'Ngày trọn vẹn đầu tiên', text: `Hôm nay bạn hoàn thành cả ${st.total} việc. Bun chạy ba vòng quanh phòng để ăn mừng.` });
      }
      B.mem.add({ key: 'first_task', icon: 'check', title: 'Việc đầu tiên hoàn thành', text: `"${t.title}". Bun vẫy đuôi suốt một lúc lâu.` });
      if (S.totals.tasksDone === 100) B.mem.add({ key: 'tasks_100', icon: 'star', title: 'Việc thứ một trăm', text: 'Một trăm lần bạn giữ lời với chính mình.' });
      if (hr >= 23 || hr < 4) B.mem.add({ key: 'late_night', icon: 'moon', title: 'Thức khuya cùng nhau', text: 'Đã khuya mà bạn vẫn làm xong việc. Bun hé mắt nhìn rồi ngủ tiếp bên cạnh.' });
      B.store.save();
      const out = { task: t, coins: r.coins, notes: r.notes, bonuses, allDone, time, needActual: actual == null };
      B.emit('taskDone', out); B.emit('tasks');
      B.ach.check();
      return out;
    },
    // Ghi nhận thời gian thực tế của một việc đã xong; trao thưởng đúng giờ nếu chưa trao
    setActual(t, minutes, src, bonuses) {
      const S = B.S;
      if (!t || !t.done) return null;
      t.actual = Math.max(1, Math.round(minutes)); t.actualSrc = src || 'user';
      const est = t.est || 30, onTime = t.actual <= est * 1.1 + 1, early = t.actual <= est * 0.8;
      B.plan.learn(t, t.actual);
      const out = { actual: t.actual, est, onTime, early, coins: 0 };
      if (onTime && !t.timeBonus && !t.freshDone) {
        out.coins = t.timeBonus = timeBonus(t, t.slotAtDone);
        B.earn(out.coins); S.day.onTime++;
        if (bonuses) bonuses.push({ label: early ? 'Xong sớm hơn dự kiến' : 'Xong trong thời gian đã định', coins: out.coins });
      }
      t.onTime = onTime;
      B.store.save();
      if (!bonuses) { B.emit('tasks'); B.emit('change'); }
      return out;
    },
    uncomplete(t) {
      const S = B.S;
      t.done = false; t.doneAt = null;
      if (t.reward) B.refund(t.reward + (t.timeBonus || 0));
      if (t.timeBonus) S.day.onTime = Math.max(0, S.day.onTime - 1);
      t.reward = 0; t.timeBonus = 0; t.actual = null; t.onTime = false;
      if (t.steps && t.steps.length) { const last = t.steps[t.steps.length - 1]; last.done = false; last.doneAt = null; }
      S.day.rewardCount = Math.max(0, S.day.rewardCount - 1);
      S.totals.tasksDone = Math.max(0, S.totals.tasksDone - 1);
      S.bun.counters.tasks = Math.max(0, S.bun.counters.tasks - 1);
      B.store.save(); B.emit('tasks');
      return { task: t, undone: true };
    },

    // Chuyển ngày: lưu lịch sử, dời việc dang dở, đặt lại bộ đếm
    ensureDay() {
      const S = B.S, today = B.time.today();
      if (S.day.date === today) return false;
      if (S.day.date > today) { S.day = B.newDay(today); return true; } // đồng hồ máy bị chỉnh lùi
      B.store.backup();
      let k = S.day.date, guard = 0;
      while (k < today && guard++ < 800) { closeDay(k); k = U.addDays(k, 1); }
      const keep = [];
      let plannedToday = false;
      S.tasks.forEach((t) => {
        t.skipped = null;
        if (t.date >= today) { if (t.date === today && t.planned) plannedToday = true; keep.push(t); return; }
        if (t.done) return;
        t.date = today; t.carried = (t.carried || 0) + 1; t.planned = true;
        keep.push(t);
      });
      S.tasks = keep;
      if (plannedToday) S.totals.plannedDays++;
      const st = S.streak;
      if (st.lastDate && st.lastDate < U.addDays(today, -1) && !gapAllRest(st.lastDate, today)) st.current = 0;
      const keys = Object.keys(S.history).sort();
      while (keys.length > 400) delete S.history[keys.shift()];
      S.day = B.newDay(today);
      B.store.saveNow();
      B.emit('newDay'); B.emit('tasks');
      return true;
    },

    // Tổng kết: hôm nay lấy từ danh sách sống, ngày cũ lấy từ lịch sử
    summary(date) {
      const S = B.S, today = B.time.today();
      if (date === today || !date) {
        const l = B.tasks.list(today), st = B.tasks.stats(today), pri = {}, done = l.filter((t) => t.done);
        B.PRI_ORDER.forEach((p) => { const x = l.filter((t) => t.priority === p); pri[p] = [x.filter((t) => t.done).length, x.length]; });
        return { date: today, total: st.total, done: st.done, rate: st.rate, coins: S.day.coinsEarned, focusMin: S.day.focusMin, am: [st.am.d, st.am.t], pm: [st.pm.d, st.pm.t], pri,
          estMin: done.reduce((a, t) => a + (t.est || 0), 0), actMin: done.reduce((a, t) => a + (t.actual || 0), 0), onTime: done.filter((t) => t.onTime).length, acc: B.plan.accuracy(l),
          stuck: l.filter((t) => !t.done && t.carried >= 2), items: l.map((t) => ({ t: t.title, d: t.done ? 1 : 0, p: t.priority, e: t.est || 0, a: t.actual || 0, c: t.cat || '' })) };
      }
      const h = S.history[date];
      return h ? Object.assign({ date, rate: h.total ? h.done / h.total : 0, stuck: [] }, h) : null;
    },
    suggestions(sum) {
      const out = [], tmr = B.tasks.list(B.tasks.tomorrow()).length;
      const r = (x) => (x[1] ? x[0] / x[1] : null);
      if (!sum.total) out.push('Hôm nay chưa có việc nào được ghi lại. Ngày mai thử đặt ba việc nhỏ thôi, Bun sẽ chờ.');
      else {
        if (sum.rate >= 0.8 && sum.total >= 3) out.push(`Một ngày rất trọn vẹn. Số lượng ${sum.total} việc có vẻ vừa sức, hãy giữ nhịp này.`);
        if (sum.total > 6 && sum.rate < 0.7) out.push(`Hôm nay có ${sum.total} việc, hơi nhiều. Ngày mai thử chọn tối đa 5 việc.`);
        if (sum.acc && sum.acc.n >= 2 && sum.acc.ratio > 1.25) out.push(`Các việc hôm nay mất khoảng ${Math.round(sum.acc.ratio * 100)}% thời gian dự kiến. Ngày mai hãy cộng thêm một phần tư thời gian cho việc tương tự.`);
        const uiLeft = sum.pri.ui[1] - sum.pri.ui[0];
        if (uiLeft > 0) out.push(`Còn ${uiLeft} việc Gấp & Quan trọng dang dở. Ngày mai hãy làm nó đầu tiên, trước khi mở tin nhắn.`);
        const am = r(sum.am), pm = r(sum.pm);
        if (am != null && pm != null && am < pm - 0.3) out.push('Ca sáng hụt hơn ca chiều. Thử bắt đầu buổi sáng bằng một việc chỉ mất 10 phút để lấy đà.');
        if (am != null && pm != null && pm < am - 0.3) out.push('Ca chiều tối đuối hơn ca sáng. Thử dồn việc quan trọng lên buổi sáng.');
        if (sum.stuck && sum.stuck.length) out.push(`Việc "${sum.stuck[0].title}" đã dời ${sum.stuck[0].carried} lần. Thử chia nhỏ nó ra, hoặc mạnh dạn bỏ đi.`);
        if (!sum.focusMin && sum.rate < 0.8) out.push('Thử một phiên "Ngồi cùng Bun" 25 phút cho việc khó nhất của ngày mai.');
      }
      if (!tmr) out.push('Ngày mai chưa có kế hoạch. Dành hai phút chọn ba việc chính nhé.');
      return out.slice(0, 3);
    },
    // Ghi nhật ký cuối ngày (mỗi ngày một lần)
    eveningRitual() {
      const S = B.S;
      if (S.day.eveningDone) return false;
      S.day.eveningDone = true;
      const s = B.tasks.summary();
      B.earn(5); B.care();
      const txt = !s.total ? 'Một ngày thong thả. Bun nằm bên cửa sổ gần hết buổi chiều.' : s.rate >= 1 ? `Bạn làm xong cả ${s.total} việc. Bun đi ngủ với cái đuôi vẫn còn vẫy.` : `Bạn làm xong ${s.done}/${s.total} việc. Bun nói như vậy là đã cố gắng rồi.`;
      B.mem.add({ icon: 'moon', title: `Nhật ký ${U.fmtDate(s.date, true)}`, text: txt });
      B.store.save(); B.emit('change');
      return true;
    },
    morningRitual() {
      const S = B.S;
      if (S.day.morningDone) return false;
      S.day.morningDone = true;
      B.earn(5); B.care();
      B.store.save(); B.emit('change');
      return true;
    },
    noonRitual() {
      const S = B.S;
      if (S.day.noonDone) return false;
      S.day.noonDone = true;
      B.earn(5); B.care();
      B.store.save(); B.emit('change');
      return true;
    },
  };

  /* ---------- Phiên tập trung và quãng nghỉ ---------- */
  function credit(f, mins, full) {
    const S = B.S, t = f.taskId && B.tasks.get(f.taskId);
    mins = Math.max(0, Math.round(mins));
    if (t && mins >= 1) t.spent = (t.spent || 0) + mins;
    if (mins >= 1) {
      S.sessions.push({ at: f.startAt, min: mins, plan: f.minutes, title: t ? t.title : '', done: !!full });
      if (S.sessions.length > 200) S.sessions.splice(0, S.sessions.length - 200);
    }
  }
  function payout(f, mins) {
    const S = B.S;
    const capLeft = Math.max(0, R.focusDailyCapMin - S.day.focusMin);
    const coins = Math.round((Math.min(mins, capLeft) / 5) * R.focusCoinPer5);
    S.day.focusMin += mins; S.totals.focusMin += mins; S.totals.focusSessions++; S.bun.counters.focusMin += mins;
    S.habit.hours[new Date(f.startAt).getHours()]++;
    if (coins) B.earn(coins);
    S.bun.stats.joy = U.clamp(S.bun.stats.joy + 8, 0, 100);
    B.addBond(4); B.care();
    B.mem.add({ key: 'first_focus', icon: 'timer', title: 'Lần đầu ngồi cùng nhau', text: `${mins} phút bạn làm việc, Bun nằm im bên chân bàn không rời nửa bước.` });
    return coins;
  }
  B.focus = {
    // kind: 'work' (mặc định) hoặc 'break'
    start(minutes, taskId, stepId, kind) {
      const now = B.now();
      minutes = U.clamp(Math.round(minutes), 1, 180);
      B.S.focus = { startAt: now, endAt: now + minutes * 60000, minutes, taskId: taskId || null, stepId: stepId || null, kind: kind || 'work' };
      B.store.saveNow(); B.emit('focus', { type: 'start', kind: B.S.focus.kind });
    },
    remaining: () => (B.S.focus ? B.S.focus.endAt - B.now() : 0),
    elapsedMin: () => (B.S.focus ? U.clamp((B.now() - B.S.focus.startAt) / 60000, 0, B.S.focus.minutes) : 0),
    cancel() {
      const f = B.S.focus;
      if (!f) return;
      if (f.kind !== 'break') credit(f, B.focus.elapsedMin(), false); // thời gian đã làm vẫn được tính cho việc đó
      B.S.focus = null;
      B.store.saveNow(); B.emit('focus', { type: 'cancel', kind: f.kind }); B.emit('tasks');
    },
    // Kết thúc sớm vì việc đã xong: tính thưởng theo số phút thực làm
    finishEarly(silent) {
      const S = B.S, f = S.focus;
      if (!f || f.kind === 'break') return null;
      const mins = Math.round(B.focus.elapsedMin());
      S.focus = null;
      credit(f, mins, true);
      const coins = mins >= 5 ? payout(f, mins) : 0;
      B.store.saveNow();
      const out = { type: 'done', early: true, minutes: mins, coins, taskId: f.taskId, silent: !!silent };
      B.emit('focus', out); B.emit('change');
      return out;
    },
    // Gọi định kỳ; nếu phiên đã hết giờ thì trao thưởng (kể cả khi ứng dụng từng bị đóng)
    tick() {
      const S = B.S, f = S.focus;
      if (!f || B.now() < f.endAt) return null;
      S.focus = null;
      if (f.kind === 'break') { B.store.saveNow(); const o = { type: 'breakEnd', taskId: f.taskId, stepId: f.stepId }; B.emit('focus', o); return o; }
      credit(f, f.minutes, true);
      const coins = payout(f, f.minutes), t = f.taskId && B.tasks.get(f.taskId);
      B.store.saveNow();
      const out = { type: 'done', minutes: f.minutes, coins, taskId: f.taskId, stepId: f.stepId, timeUp: !!(t && !t.done) };
      B.emit('focus', out); B.emit('change'); B.emit('tasks');
      B.ach.check();
      return out;
    },
  };
})();
