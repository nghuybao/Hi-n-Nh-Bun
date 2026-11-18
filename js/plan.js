/* Hiên Nhà Bun — lập kế hoạch thông minh: thời gian quyết định phạm vi, sắp thứ tự, xếp khối giờ, sắp lại linh hoạt */
(function () {
  'use strict';
  const B = window.B, U = B.util;
  const PW = { ui: 100, i: 70, u: 55, n: 25 };
  const TIERS = [15, 30, 45, 60, 90];
  const toMin = (s) => { const p = String(s || '0:0').split(':'); return (+p[0] || 0) * 60 + (+p[1] || 0); };
  const fmtMin = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  const ceil5 = (m) => Math.ceil(m / 5) * 5;
  const round5 = (m) => Math.max(5, Math.round(m / 5) * 5);
  const nowMin = () => { const d = new Date(B.now()); return d.getHours() * 60 + d.getMinutes(); };
  const dayGap = (a, b) => Math.round((U.parseKey(b) - U.parseKey(a)) / 86400000);

  /* ---------- Đoán loại việc, lĩnh vực, phạm vi ---------- */
  function typeOf(title) {
    const s = ' ' + String(title || '') + ' ';
    return B.WORK_TYPES.find((w) => w.re.test(s)) || B.WORK_TYPES[B.WORK_TYPES.length - 1];
  }
  function guess(title) {
    const w = typeOf(title), hit = B.CAT_HINTS.find((h) => h[0].test(' ' + title + ' '));
    return { type: w.id, load: w.load, cat: hit ? hit[1] : 'Khác' };
  }
  // Kết quả vừa sức cho đúng số phút đã dành
  function scope(title, minutes) {
    const w = typeOf(title);
    let tier = 15;
    TIERS.forEach((t) => { if (minutes >= t) tier = t; });
    return w.scope[tier];
  }
  // Chia một việc lớn thành các bước nhỏ, mỗi bước có thời lượng và kết quả đo được
  function makeSteps(title, total, unitLen) {
    const w = typeOf(title), out = [];
    unitLen = unitLen || B.S.plan.focusLen;
    w.steps.forEach((ph) => {
      const m = Math.max(10, total * ph[1]), n = Math.ceil(m / unitLen);
      for (let i = 1; i <= n; i++) out.push({ id: U.uid(), title: n > 1 ? `${ph[0]} (phần ${i}/${n})` : ph[0], est: round5(m / n), outcome: ph[2], done: false, doneAt: null });
    });
    return out;
  }
  // Bổ sung trường mới cho việc cũ (dữ liệu từ bản trước vẫn dùng được)
  function norm(t) {
    const g = guess(t.title);
    if (!t.est) t.est = 30;
    if (!t.load) t.load = g.load;
    if (!t.diff) t.diff = 'med';
    if (!t.cat) t.cat = g.cat;
    if (!Array.isArray(t.steps)) t.steps = [];
    if (t.spent == null) t.spent = 0;
    if (t.dod == null) { t.dod = scope(t.title, t.est); t.dodAuto = true; }
    if (t.notes == null) t.notes = '';
    return t;
  }

  /* ---------- Trạng thái theo ngày ---------- */
  function dayState(date) {
    const S = B.S, today = B.time.today();
    if (date === today) {
      if (!S.dayPlan || S.dayPlan.date !== today) {
        const nx = S.nextPlan && S.nextPlan.date === today ? S.nextPlan : null;
        S.dayPlan = { date: today, plan: null, sig: '', order: nx ? nx.order : null, energy: 'normal', busy: nx ? nx.busy || [] : [], endMin: null, amIds: [] };
      }
      return S.dayPlan;
    }
    if (!S.nextPlan || S.nextPlan.date !== date) S.nextPlan = { date, order: null, busy: [], plan: null, sig: '' };
    return S.nextPlan;
  }
  function units(date, shrink) {
    const out = [];
    B.S.tasks.filter((t) => t.date === date && !t.done && t.skipped !== date).forEach((t) => {
      norm(t);
      const steps = t.steps.filter((s) => !s.done);
      if (steps.length) steps.forEach((s) => out.push({ key: t.id + ':' + s.id, task: t, step: s, est: s.est }));
      else {
        let est = t.spent > 0 ? Math.max(10, round5(t.est - t.spent)) : t.est;
        if (shrink && shrink[t.id]) est = Math.min(est, shrink[t.id]);
        out.push({ key: t.id, task: t, step: null, est });
      }
    });
    return out;
  }
  const essential = (u, date) => u.task.priority === 'ui' || !!(u.task.deadline && u.task.deadline <= date);
  function baseScore(u, date) {
    const t = u.task;
    let s = PW[t.priority] || 25;
    s += t.diff === 'hard' ? 18 : t.diff === 'med' ? 8 : 0;
    if (t.load === 'deep') s += 10;
    if (t.deadline) { const g = dayGap(date, t.deadline); s += g < 0 ? 50 : g === 0 ? 40 : g === 1 ? 20 : g <= 3 ? 8 : 0; }
    return s + Math.min(12, (t.carried || 0) * 4);
  }

  /* ---------- Xếp lịch ---------- */
  function build(date, o) {
    o = o || {};
    const S = B.S, P = S.plan, today = B.time.today(), isToday = date === today, dp = dayState(date);
    const energy = o.energy || (isToday ? dp.energy : 'normal') || 'normal';
    const focusLen = energy === 'low' ? Math.min(P.focusLen, 30) : P.focusLen, breakLen = P.breakLen;
    const from = o.from != null ? o.from : isToday ? Math.max(toMin(P.dayStart), ceil5(nowMin())) : toMin(P.dayStart);
    // Giới hạn "còn ít thời gian" chỉ có hiệu lực khi còn đủ chỗ để xếp việc; hết hạn rồi thì quay về giờ kết thúc ngày
    if (isToday && dp.endMin != null && dp.endMin < from + 30) dp.endMin = null;
    const endMin = o.endMin != null ? o.endMin : isToday && dp.endMin != null ? dp.endMin : toMin(P.dayEnd);
    let cursor = from;
    const order = dp.order, manual = !!(order && order.length) && !o.auto;

    const obs = [];
    if (P.lunchMin > 0) obs.push({ type: 'meal', title: 'Ăn trưa và nghỉ', s: toMin(P.lunchAt), e: toMin(P.lunchAt) + P.lunchMin });
    if (P.dinnerMin > 0) obs.push({ type: 'meal', title: 'Ăn tối', s: toMin(P.dinnerAt), e: toMin(P.dinnerAt) + P.dinnerMin });
    (dp.busy || []).concat(o.busy || []).forEach((b) => obs.push({ type: 'busy', id: b.id, title: b.title || 'Việc riêng', s: b.s, e: b.e }));
    let remaining = units(date, o.shrink);
    // Việc có giờ cố định đứng yên tại chỗ, các việc khác chảy quanh nó
    remaining = remaining.filter((u) => {
      if (u.step || !u.task.prefTime) return true;
      const pt = toMin(u.task.prefTime);
      if (pt < cursor - 5 || pt + u.est > endMin + 90) return true;
      obs.push({ type: 'task', u, s: Math.max(pt, cursor), e: Math.max(pt, cursor) + u.est });
      return false;
    });
    obs.sort((a, b) => a.s - b.s);

    const blocks = [], overflow = [];
    let prev = null, deepStreak = 0, workRun = 0, guard = 0;
    const withBreaks = (est) => (est > focusLen + 10 ? est + (Math.ceil(est / focusLen) - 1) * breakLen : est);
    const nextObs = () => obs.find((x) => !x.used && x.e > cursor);
    const free = () => { let f = Math.max(0, endMin - cursor); obs.forEach((x) => { const s = Math.max(x.s, cursor), e = Math.min(x.e, endMin); if (e > s) f -= e - s; }); return Math.max(0, f); };
    const cands = (maxLen) => { const seen = {}; return remaining.filter((u) => { if (u.step) { if (seen[u.task.id]) return false; seen[u.task.id] = 1; } return !maxLen || withBreaks(u.est) <= maxLen; }); };
    function reasonFor(u) {
      const t = u.task, deep = t.load === 'deep';
      if (t.deadline && t.deadline < date) return 'Đã quá hạn, nên xử lý sớm';
      if (t.deadline === date) return 'Có hạn trong hôm nay';
      if (!prev && deep && (t.priority === 'ui' || t.priority === 'i')) return t.diff === 'hard' ? 'Việc khó và quan trọng nhất, làm khi đầu óc còn tỉnh' : 'Việc quan trọng làm trước, khi năng lượng còn cao';
      if (prev && prev.task.id === t.id) return 'Làm tiếp bước kế của cùng một việc';
      if (prev && prev.task.load === 'light' && deep) return 'Quay lại việc cần tập trung sau quãng nhẹ';
      if (prev && prev.task.cat !== t.cat) return 'Đổi lĩnh vực để đỡ nhàm';
      if (t.priority === 'ui') return 'Gấp và quan trọng';
      return deep ? 'Việc cần tập trung' : 'Việc nhẹ, làm nhanh gọn';
    }
    function pick(maxLen) {
      let list = cands(maxLen);
      if (!list.length) return null;
      if (manual) {
        const idx = (k) => { const i = order.indexOf(k); return i < 0 ? 1e6 : i; };
        list.sort((a, b) => idx(a.key) - idx(b.key) || baseScore(b, date) - baseScore(a, date));
        return { u: list[0], reason: 'Theo thứ tự bạn đã sắp' };
      }
      const ess = remaining.filter((u) => essential(u, date));
      if (!maxLen && ess.length && free() < ess.reduce((a, u) => a + u.est, 0) + 15) { const only = list.filter((u) => essential(u, date)); if (only.length) list = only; }
      // Rải đều việc nhẹ vào giữa các khối việc sâu: cứ k khối sâu thì chen một việc nhẹ
      const dLeft = remaining.filter((u) => u.task.load === 'deep').length, lLeft = remaining.length - dLeft;
      const k = !lLeft ? 99 : energy === 'low' ? 1 : U.clamp(Math.round(dLeft / (lLeft + 1)), 1, 2);
      if (deepStreak >= k && lLeft) { const lights = list.filter((u) => u.task.load !== 'deep'); if (lights.length) list = lights; }
      let best = null;
      list.forEach((u) => {
        const t = u.task, deep = t.load === 'deep', isEss = essential(u, date);
        let s = baseScore(u, date), why = null;
        if (deep) { if (deepStreak >= k && lLeft) s -= isEss ? 32 : 48; else if (prev && prev.task.load === 'light') s += 10; }
        else if (deepStreak >= k) { s += 48; why = 'Việc nhẹ xen giữa để đầu óc hồi sức'; }
        else if (dLeft && cursor < 780) s -= 18;
        if (prev) {
          if (prev.task.id === t.id) s += 6;
          else if (prev.task.cat === t.cat) {
            if (!deep && prev.task.load === 'light' && u.est <= 20 && prev.est <= 20) { s += 10; why = 'Gom việc vặt cùng lĩnh vực, đỡ phải đổi ngữ cảnh'; } else s -= 12;
          }
        }
        if (cursor < 720 && deep) s += t.diff === 'hard' ? 18 : 12;
        if (cursor >= 780 && cursor < 870 && !deep) s += 12;
        if (cursor >= 1200 && deep) s -= 20;
        if (energy === 'low' && deep && !isEss) s -= 18;
        if (!best || s > best.s) best = { u, s, why };
      });
      return { u: best.u, reason: best.why || reasonFor(best.u) };
    }
    function put(u, reason, fixedAt) {
      const s = fixedAt != null ? fixedAt : cursor, dur = withBreaks(u.est), deep = u.task.load === 'deep';
      blocks.push({ type: 'task', key: u.key, taskId: u.task.id, stepId: u.step ? u.step.id : null, s, e: s + dur, est: u.est, inner: Math.round((dur - u.est) / Math.max(1, breakLen)), reason, fixed: fixedAt != null });
      cursor = s + dur;
      remaining = remaining.filter((x) => x !== u);
      deepStreak = deep ? deepStreak + 1 : 0;
      workRun += u.est;
      let rest = deep ? (u.est >= 45 ? breakLen : 5) : u.est >= 25 ? 5 : 0, long = false;
      if (workRun >= 110) { rest = Math.max(rest, 15); workRun = 0; long = true; }
      const ob = nextObs();
      if (ob && cursor + rest >= ob.s - 5) rest = 0; // sắp tới giờ ăn hoặc giờ hẹn thì không cần chèn nghỉ
      if (rest >= 10 && remaining.length) blocks.push({ type: 'break', s: cursor, e: cursor + rest, title: long ? 'Nghỉ dài, đứng dậy đi lại' : 'Nghỉ ngắn' });
      if (remaining.length) cursor += rest;
      prev = u;
    }
    function useObs(ob) {
      ob.used = true;
      if (ob.type === 'task') { const at = Math.max(ob.s, cursor); put(ob.u, 'Giờ bạn đã chọn', at); return; }
      blocks.push({ type: ob.type, id: ob.id, s: Math.max(ob.s, Math.min(cursor, ob.e)), e: ob.e, title: ob.title });
      cursor = Math.max(cursor, ob.e);
      workRun = 0; deepStreak = 0;
    }
    while ((remaining.length || obs.some((x) => !x.used && x.type === 'task')) && guard++ < 300) {
      const ob = nextObs();
      if (ob && cursor >= ob.s) { useObs(ob); continue; }
      if (!remaining.length) { if (ob) { cursor = ob.s; useObs(ob); continue; } break; }
      const gap = ob ? ob.s - cursor : Infinity;
      let p = pick();
      if (!p) break;
      if (withBreaks(p.u.est) > gap) {
        const filler = gap >= 15 ? pick(gap) : null;
        if (filler) p = { u: filler.u, reason: manual ? filler.reason : 'Vừa khít khoảng trống trước ' + (ob.type === 'meal' ? 'giờ ăn' : 'việc đã hẹn') };
        else { cursor = ob.s; useObs(ob); continue; }
      }
      if (cursor + withBreaks(p.u.est) > endMin) {
        const small = pick(endMin - cursor);
        if (small && endMin - cursor >= 10) p = small; else break;
      }
      put(p.u, p.reason);
    }
    remaining.forEach((u) => overflow.push({ key: u.key, taskId: u.task.id, stepId: u.step ? u.step.id : null, est: u.est }));
    const lastEnd = blocks.reduce((a, b) => (b.type === 'task' ? Math.max(a, b.e) : a), from);
    obs.forEach((ob) => { if (!ob.used && ob.type !== 'task' && ob.e > from && ob.s < lastEnd) blocks.push({ type: ob.type, id: ob.id, s: Math.max(ob.s, from), e: ob.e, title: ob.title }); });
    blocks.sort((a, b) => a.s - b.s || (a.type === 'task' ? 1 : -1));

    const tb = blocks.filter((b) => b.type === 'task');
    const stats = { work: tb.reduce((a, b) => a + b.est, 0), deep: 0, light: 0, breaks: blocks.filter((b) => b.type === 'break').length, end: lastEnd, free: Math.max(0, endMin - lastEnd) };
    tb.forEach((b) => { const t = B.tasks.get(b.taskId); stats[t && t.load === 'deep' ? 'deep' : 'light'] += b.est; });
    const summary = [];
    if (tb.length) {
      const t0 = B.tasks.get(tb[0].taskId);
      summary.push(manual ? 'Lịch đang theo thứ tự bạn tự sắp.' : `Bắt đầu bằng "${t0.title}": ${tb[0].reason.charAt(0).toLowerCase() + tb[0].reason.slice(1)}.`);
      if (!manual && stats.deep && stats.light) summary.push('Việc sâu và việc nhẹ được xen kẽ để bạn không bị quá tải.');
      if (stats.breaks || stats.free > 20) summary.push(`Có ${stats.breaks} quãng nghỉ${stats.free > 20 ? ` và còn trống ${Math.floor(stats.free / 60) ? Math.floor(stats.free / 60) + ' giờ ' : ''}${stats.free % 60} phút cuối ngày` : ''}, không xếp kín từng phút.`);
    }
    if (overflow.length) summary.push(`${new Set(overflow.map((x) => x.taskId)).size} việc không vừa quỹ thời gian còn lại, nên dời hoặc rút gọn.`);
    return { date, blocks, overflow, stats, summary, energy, endMin, from, madeAt: B.now(), manual };
  }
  function signature(date) {
    const dp = dayState(date);
    return units(date).map((u) => u.key + '.' + u.est + '.' + u.task.priority + (u.task.prefTime || '') + u.task.load).join('|') + '#' + (dp.order || []).join(',') + '#' + (dp.busy || []).map((b) => b.s + '-' + b.e).join(',') + '#' + dp.energy + '#' + dp.endMin + '#' + JSON.stringify([B.S.plan.dayStart, B.S.plan.dayEnd, B.S.plan.focusLen, B.S.plan.breakLen, B.S.plan.lunchAt, B.S.plan.lunchMin, B.S.plan.dinnerAt, B.S.plan.dinnerMin]);
  }
  function rebuild(date) {
    date = date || B.time.today();
    const dp = dayState(date);
    dp.plan = build(date);
    dp.sig = signature(date);
    const noonAt = toMin(B.S.plan.noonAt);
    dp.plan.blocks.forEach((b) => { if (b.type === 'task') { const t = B.tasks.get(b.taskId); if (t) t.shift = b.s < noonAt ? 'am' : 'pm'; } });
    if (date === B.time.today()) {
      const noon = noonAt;
      dp.plan.blocks.forEach((b) => { if (b.type === 'task' && b.s < noon && dp.amIds.indexOf(b.taskId) < 0) dp.amIds.push(b.taskId); });
    }
    return dp.plan;
  }
  function get(date) {
    date = date || B.time.today();
    const dp = dayState(date);
    if (!dp.plan || dp.sig !== signature(date)) rebuild(date);
    return dp.plan;
  }
  // Lịch đang trễ bao nhiêu phút so với khối việc đầu tiên chưa làm
  function lateBy() {
    const S = B.S, p = get();
    if (S.focus) return 0;
    const first = p.blocks.find((b) => b.type === 'task');
    return first ? Math.max(0, nowMin() - first.s) : 0;
  }

  /* ---------- Sắp lại linh hoạt ---------- */
  function propose(kind, prm) {
    prm = prm || {};
    const date = B.time.today(), dp = dayState(date), o = { shrink: {}, auto: true }, changes = [];
    o.energy = prm.energy || (kind === 'tired' ? 'low' : dp.energy);
    if (kind === 'busy') o.busy = [{ id: U.uid(), title: prm.title || 'Việc đột xuất', s: prm.s, e: prm.e }];
    if (kind === 'less') o.endMin = Math.min(toMin(B.S.plan.dayEnd), nowMin() + prm.minutes);
    if (prm.from != null) o.from = prm.from;
    if (o.energy === 'low') units(date).forEach((u) => { if (!u.step && u.task.load === 'deep' && u.est > 30 && !essential(u, date)) { o.shrink[u.task.id] = 30; changes.push({ taskId: u.task.id, action: 'shrink', to: 30, rest: u.est - 30 }); } });
    let plan = build(date, o);
    if (plan.overflow.length) {
      let more = false;
      units(date).forEach((u) => { if (!u.step && u.est >= 45 && !o.shrink[u.task.id] && plan.overflow.some((x) => x.taskId === u.task.id)) { o.shrink[u.task.id] = 30; changes.push({ taskId: u.task.id, action: 'shrink', to: 30, rest: u.est - 30 }); more = true; } });
      if (more) plan = build(date, o);
    }
    const gone = {};
    plan.overflow.forEach((x) => {
      if (gone[x.taskId]) return;
      const t = B.tasks.get(x.taskId), placed = plan.blocks.some((b) => b.taskId === x.taskId);
      gone[x.taskId] = 1;
      if (!placed) changes.push({ taskId: x.taskId, action: 'tomorrow' }); else if (t) changes.push({ taskId: x.taskId, action: 'partial' });
    });
    return { kind, o, plan, changes: changes.filter((c) => c.action !== 'shrink' || !changes.some((d) => d.taskId === c.taskId && d.action === 'tomorrow')) };
  }
  function apply(pr) {
    const dp = dayState(B.time.today());
    pr.changes.forEach((c) => { if (c.action === 'shrink') splitTask(c.taskId, c.to, true); else if (c.action === 'tomorrow') moveTomorrow(c.taskId, true); });
    if (pr.o.energy) dp.energy = pr.o.energy;
    if (pr.o.busy) dp.busy = (dp.busy || []).concat(pr.o.busy);
    if (pr.o.endMin != null) dp.endMin = pr.o.endMin;
    dp.order = null;
    rebuild();
    B.store.save(); B.emit('tasks');
  }

  /* ---------- Thao tác trên từng việc ---------- */
  const remainingOf = (t) => (t.steps && t.steps.some((s) => !s.done) ? t.steps.filter((s) => !s.done).reduce((a, s) => a + s.est, 0) : t.spent > 0 ? Math.max(10, round5(t.est - t.spent)) : t.est);
  // Làm "minutes" phút hôm nay, phần còn lại thành một việc nối tiếp cho ngày mai. Tiến độ đã có được giữ nguyên.
  function splitTask(id, minutes, silent) {
    const t = B.tasks.get(id);
    if (!t) return null;
    const rem = remainingOf(t), rest = round5(rem - minutes);
    if (rem - minutes < 10) return null;
    let moved = [];
    if (t.steps.some((s) => !s.done)) {
      let acc = 0;
      t.steps = t.steps.filter((s) => { if (s.done) return true; if (acc < minutes) { acc += s.est; return true; } moved.push(s); return false; });
      if (!moved.length) return null;
      t.est = round5(t.steps.reduce((a, s) => a + s.est, 0));
    } else {
      t.est = round5((t.spent || 0) + minutes);
      if (t.dodAuto) t.dod = scope(t.title, minutes);
    }
    const base = t.title.replace(/ \(phần tiếp\)$/, ''), restMin = moved.length ? moved.reduce((a, s) => a + s.est, 0) : rest;
    const nt = { id: U.uid(), title: base + ' (phần tiếp)', shift: 'am', priority: t.priority, date: B.tasks.tomorrow(), done: false, doneAt: null, createdAt: B.now(), planned: true, carried: 0, reward: 0,
      cat: t.cat, est: restMin, load: t.load, diff: t.diff, deadline: t.deadline || null, prefTime: null, dod: scope(base, Math.min(restMin, 90)), dodAuto: true, notes: t.notes || '', steps: moved, spent: 0, parentId: t.id };
    B.S.tasks.push(nt);
    t.split = true;
    if (!silent) { B.store.save(); B.emit('tasks'); }
    return nt;
  }
  function moveTomorrow(id, silent) {
    const t = B.tasks.get(id);
    if (!t) return;
    t.date = B.tasks.tomorrow(); t.planned = true; t.skipped = null; t.moved = (t.moved || 0) + 1;
    if (!silent) { B.store.save(); B.emit('tasks'); }
  }
  function skipToday(id, on) {
    const t = B.tasks.get(id);
    if (!t) return;
    t.skipped = on === false ? null : B.time.today();
    B.store.save(); B.emit('tasks');
  }
  function setEst(id, est) {
    const t = B.tasks.get(id);
    if (!t) return;
    est = U.clamp(round5(est), 5, 600);
    const undone = t.steps.filter((s) => !s.done);
    if (undone.length) { const k = est / Math.max(5, undone.reduce((a, s) => a + s.est, 0)); undone.forEach((s) => (s.est = round5(s.est * k))); t.est = round5(t.steps.reduce((a, s) => a + s.est, 0)); }
    else { t.est = Math.max(est, round5((t.spent || 0) + 5)); if (t.dodAuto) t.dod = scope(t.title, Math.min(90, t.est - (t.spent || 0))); }
    B.store.save(); B.emit('tasks');
  }
  function toSteps(id) {
    const t = B.tasks.get(id);
    if (!t) return;
    t.steps = t.steps.filter((s) => s.done).concat(makeSteps(t.title, remainingOf(t)));
    B.store.save(); B.emit('tasks');
  }
  function stepToggle(taskId, stepId) {
    const t = B.tasks.get(taskId), s = t && t.steps.find((x) => x.id === stepId);
    if (!s || t.done) return null;
    // Đang đếm giờ cho đúng bước này thì khép phiên lại, thời gian đã làm được cộng vào việc
    const f = B.S.focus;
    if (!s.done && f && f.kind !== 'break' && f.taskId === taskId && (!f.stepId || f.stepId === stepId)) B.focus.finishEarly(true);
    s.done = !s.done; s.doneAt = s.done ? B.now() : null;
    if (s.done) { B.S.bun.stats.joy = U.clamp(B.S.bun.stats.joy + 2, 0, 100); B.care(); }
    if (s.done && t.steps.every((x) => x.done)) return B.tasks.complete(t);
    B.store.save(); B.emit('tasks');
    return { step: s, task: t };
  }
  function reorder(date, keys) {
    dayState(date).order = keys;
    rebuild(date);
    B.store.save(); B.emit('tasks');
  }
  function autoOrder(date) { dayState(date).order = null; rebuild(date); B.store.save(); B.emit('tasks'); }
  function addBusy(date, b) {
    const dp = dayState(date);
    dp.busy = (dp.busy || []).concat([{ id: U.uid(), title: b.title || 'Việc riêng', s: b.s, e: Math.max(b.e, b.s + 10) }]);
    rebuild(date); B.store.save(); B.emit('tasks');
  }
  function removeBusy(date, id) {
    const dp = dayState(date);
    dp.busy = (dp.busy || []).filter((b) => b.id !== id);
    rebuild(date); B.store.save(); B.emit('tasks');
  }

  /* ---------- Học từ thời gian thực tế ---------- */
  function learn(t, actual) {
    if (!actual || !t.est) return;
    const L = B.S.learn, ratio = U.clamp(actual / t.est, 0.3, 3);
    [t.cat, '@' + t.load].forEach((k) => { const x = L[k] || (L[k] = { n: 0, r: 1 }); x.r = x.n ? x.r * 0.7 + ratio * 0.3 : ratio; x.n++; });
  }
  function suggestEst(cat, est) {
    const x = B.S.learn[cat];
    if (!x || x.n < 3 || Math.abs(x.r - 1) < 0.15) return null;
    return { ratio: x.r, est: round5(est * x.r), n: x.n };
  }
  // Độ chính xác ước lượng của các việc đã xong trong ngày
  function accuracy(list) {
    const l = list.filter((t) => t.done && t.actual);
    if (!l.length) return null;
    const est = l.reduce((a, t) => a + t.est, 0), act = l.reduce((a, t) => a + t.actual, 0);
    return { n: l.length, est, act, ratio: act / Math.max(1, est), onTime: l.filter((t) => t.onTime).length };
  }

  /* ---------- Nhìn lại buổi sáng ---------- */
  function noonData() {
    const S = B.S, today = B.time.today(), dp = dayState(today), noonM = toMin(S.plan.noonAt);
    const d0 = U.parseKey(today), noonTs = d0.getTime() + noonM * 60000;
    const list = S.tasks.filter((t) => t.date === today).map(norm);
    const doneAm = list.filter((t) => t.done && t.doneAt < noonTs);
    doneAm.forEach((t) => { if (dp.amIds.indexOf(t.id) < 0) dp.amIds.push(t.id); });
    list.forEach((t) => { if (!t.plan && t.shift === 'am' && t.createdAt < noonTs && !t.auto && dp.amIds.indexOf(t.id) < 0) dp.amIds.push(t.id); });
    const planned = list.filter((t) => dp.amIds.indexOf(t.id) >= 0);
    const left = list.filter((t) => !t.done);
    const minutes = doneAm.reduce((a, t) => a + (t.actual || t.spent || 0), 0) + left.reduce((a, t) => a + (t.spent || 0), 0);
    const acc = accuracy(doneAm), insights = [];
    if (acc) insights.push(acc.ratio > 1.2 ? `Sáng nay các việc mất khoảng ${Math.round(acc.ratio * 100)}% thời gian dự kiến. Buổi chiều nên ước lượng rộng tay hơn một chút.` : acc.ratio < 0.85 ? `Bạn làm nhanh hơn dự kiến (${Math.round(acc.ratio * 100)}% thời gian). Có thể rút ngắn ước lượng cho các việc tương tự.` : 'Bạn ước lượng thời gian khá sát với thực tế sáng nay.');
    const deepDone = doneAm.filter((t) => t.load === 'deep').length;
    if (deepDone) insights.push(`Bạn đã xong ${deepDone} việc cần tập trung sâu trước buổi trưa, đúng lúc đầu óc tỉnh táo nhất.`);
    else if (doneAm.length) insights.push('Sáng nay bạn chủ yếu xử lý việc nhẹ. Buổi chiều hãy dành một phiên cho việc cần tập trung.');
    if (!doneAm.length && planned.length) insights.push('Buổi sáng trôi qua mà chưa khép được việc nào. Thử bắt đầu buổi chiều bằng một phiên 25 phút thật gọn.');
    if (!planned.length && !doneAm.length) insights.push('Sáng nay chưa có kế hoạch. Chỉ cần chọn một việc quan trọng cho buổi chiều là đủ.');
    return { planned, doneAm, important: doneAm.filter((t) => t.priority === 'ui' || t.priority === 'i'), left, minutes, acc, insights, rate: planned.length ? doneAm.filter((t) => dp.amIds.indexOf(t.id) >= 0).length / planned.length : doneAm.length ? 1 : 0 };
  }
  // Việc quan trọng nhất còn lại
  function mit(plan) {
    const date = B.time.today();
    let best = null;
    (plan || get()).blocks.forEach((b) => { if (b.type !== 'task') return; const t = B.tasks.get(b.taskId); if (!t) return; const s = baseScore({ task: t }, date); if (!best || s > best.s) best = { s, block: b, task: t }; });
    return best;
  }

  B.plan = { toMin, fmtMin, round5, nowMin, typeOf, guess, scope, makeSteps, norm, dayState, units, build, get, rebuild, lateBy, propose, apply, remainingOf, splitTask, moveTomorrow, skipToday, setEst, toSteps, stepToggle, reorder, autoOrder, addBusy, removeBusy, learn, suggestEst, accuracy, noonData, mit, essential };
})();
