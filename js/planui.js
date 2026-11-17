/* Hiên Nhà Bun — giao diện lập kế hoạch: nhập việc nhanh, lịch theo khối giờ, sắp lại, nhìn lại buổi sáng */
(function () {
  'use strict';
  const B = window.B, U = B.util, $ = U.$, $$ = U.$$, esc = U.esc, ic = B.icon, P = () => B.plan;
  const st = { form: null, menu: null, askActual: null, drag: null, doneOpen: {}, focusForm: false, justDone: null };
  const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ' ' + (m % 60) + '′' : ''}` : m + '′');
  const cats = () => B.CATS.slice(0, -1).concat(B.S.plan.cats || [], ['Khác']).filter((c, i, a) => a.indexOf(c) === i);

  /* ---------- Biểu mẫu nhập việc ---------- */
  function newForm(date, task) {
    if (task) return { id: task.id, date: task.date, title: task.title, est: task.est, priority: task.priority, cat: task.cat, load: task.load, diff: task.diff, deadline: task.deadline || '', prefTime: task.prefTime || '', dod: task.dodAuto ? '' : task.dod || '', notes: task.notes || '', more: true, split: false };
    return { id: null, date, title: '', est: 30, priority: 'i', cat: null, load: null, diff: 'med', deadline: '', prefTime: '', dod: '', notes: '', more: false, split: false };
  }
  function formHints(f) {
    const g = P().guess(f.title || ''), cat = f.cat || g.cat, load = f.load || g.load, est = +f.est || 30;
    const learned = P().suggestEst(cat, est);
    return { g, cat, load, est, scope: P().scope(f.title || '', Math.min(est, 90)), learned };
  }
  function scopeLine(f, h) {
    if (h.est > 90) return `Việc dài ${dur(h.est)} sẽ được chia thành các bước nhỏ, mỗi bước tối đa ${B.S.plan.focusLen}′. Kết quả cuối: <b>${esc(h.scope)}</b>`;
    return `Với ${h.est} phút, mục tiêu vừa sức là: <b>${esc(h.scope)}</b>`;
  }
  function formHTML() {
    const f = st.form, h = formHints(f), custom = B.DURS.indexOf(+f.est) < 0;
    const pill = (attr, val, label, on, cls) => `<button type="button" class="pill ${cls || ''} ${on ? 'on' : ''}" data-${attr}="${val}" aria-pressed="${on}">${label}</button>`;
    return `<li class="task-form"><form data-form>
      <input type="text" name="title" maxlength="140" placeholder="Việc cần làm…" value="${esc(f.title)}" autocomplete="off" aria-label="Tên công việc">
      <div class="f-line"><span class="f-lbl">Thời lượng</span>${B.DURS.map((d) => pill('dur', d, d + '′', +f.est === d)).join('')}<input type="number" name="est" min="5" max="600" step="5" class="f-num ${custom ? 'on' : ''}" value="${custom ? f.est : ''}" placeholder="khác" aria-label="Số phút khác"></div>
      <div class="pri-pills" role="group" aria-label="Mức ưu tiên">${B.PRI_ORDER.map((p) => pill('pri', p, B.PRI[p].short, f.priority === p, 'p-' + p)).join('')}</div>
      <p class="f-scope">${scopeLine(f, h)}</p>
      ${h.learned ? `<p class="f-learn">${ic('timer')}<span>Việc thuộc "${esc(h.cat)}" của bạn thường mất khoảng ${h.learned.ratio.toFixed(1).replace('.', ',')} lần dự kiến.</span><button type="button" class="btn soft sm" data-dur="${h.learned.est}">Dùng ${h.learned.est}′</button></p>` : ''}
      <button type="button" class="f-more" data-more aria-expanded="${f.more}">${ic('chevron')}${f.more ? 'Ẩn bớt chi tiết' : `Thêm chi tiết <small class="f-guess">Bun đoán: ${esc(h.cat)} · ${B.LOADS[h.load]}</small>`}</button>
      ${f.more ? `<div class="f-adv">
        <div class="f-line"><span class="f-lbl">Lĩnh vực</span>${cats().map((c) => pill('cat', esc(c), esc(c), h.cat === c)).join('')}<input type="text" name="catNew" class="f-txt" maxlength="20" placeholder="lĩnh vực khác" aria-label="Lĩnh vực khác"></div>
        <div class="f-line"><span class="f-lbl">Mức tập trung</span>${pill('load', 'deep', 'Việc sâu', h.load === 'deep')}${pill('load', 'light', 'Việc nhẹ', h.load === 'light')}<span class="f-lbl" style="margin-left:8px">Độ khó</span>${Object.keys(B.DIFFS).map((d) => pill('diff', d, B.DIFFS[d], f.diff === d)).join('')}</div>
        <div class="f-line"><label class="f-lbl" for="fDeadline">Hạn</label><input type="date" id="fDeadline" name="deadline" value="${esc(f.deadline)}"><label class="f-lbl" for="fPref" style="margin-left:8px">Giờ muốn làm</label><input type="time" id="fPref" name="prefTime" value="${esc(f.prefTime)}"></div>
        <label class="f-lbl" for="fDod">Kết quả mong đợi</label><textarea id="fDod" name="dod" rows="2" maxlength="240" placeholder="${esc(h.scope)}">${esc(f.dod)}</textarea>
        <label class="f-lbl" for="fNotes">Ghi chú</label><textarea id="fNotes" name="notes" rows="2" maxlength="500" placeholder="Tùy chọn">${esc(f.notes)}</textarea>
        ${!f.id && h.est > 30 && h.est <= 90 ? `<label class="check"><input type="checkbox" name="split" ${f.split ? 'checked' : ''}>Chia sẵn thành các bước nhỏ</label>` : ''}
      </div>` : ''}
      <div class="form-row"><span class="grow"></span><button type="button" class="btn ghost sm" data-cancel>${f.id ? 'Hủy' : 'Xong'}</button><button type="submit" class="btn primary sm">${f.id ? 'Lưu' : 'Thêm việc'}</button></div>
    </form></li>`;
  }
  function submitForm() {
    const f = st.form;
    if (!f) return;
    const title = f.title.trim(), inp = $('#panel .task-form input[name=title]');
    if (!title) { if (inp) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); inp.focus(); } return; }
    const est = U.clamp(Math.round(+f.est || 30), 5, 600);
    const data = { title, est, priority: f.priority, cat: f.cat || undefined, load: f.load || undefined, diff: f.diff, deadline: f.deadline || null, prefTime: f.prefTime || null, dod: f.dod, notes: f.notes, date: f.date };
    if (f.cat && B.CATS.indexOf(f.cat) < 0 && (B.S.plan.cats || []).indexOf(f.cat) < 0) B.S.plan.cats = (B.S.plan.cats || []).concat([f.cat]).slice(-8);
    if (!f.id && f.split && est <= 90) data.steps = P().makeSteps(title, est, est >= 60 ? 30 : 15);
    const res = f.id ? B.tasks.update(f.id, data) : B.tasks.add(data);
    if (res && res.capped) B.ui.toast('Mỗi ngày chỉ nên có ba việc Gấp & Quan trọng. Việc này được xếp vào mức Quan trọng.', { icon: 'star', ms: 5500 });
    if (res && !f.id && res.task.steps.length) B.ui.toast(`Đã chia "${esc(res.task.title)}" thành ${res.task.steps.length} bước nhỏ. Bạn chỉ cần làm từng bước một.`, { icon: 'list', ms: 5500 });
    st.form = f.id ? null : newForm(f.date);
    st.focusForm = !f.id;
    B.ui.renderTabs();
  }

  /* ---------- Hàng trong lịch ---------- */
  function chips(t, extra) {
    const m = [`<span class="chip-p p-${t.priority}">${B.PRI[t.priority].short}</span>`, `<span class="chip-c">${esc(t.cat)}</span>`, `<span class="chip-c ${t.load}">${t.load === 'deep' ? 'Sâu' : 'Nhẹ'}${t.diff === 'hard' ? ' · khó' : ''}</span>`];
    if (t.deadline) { const g = Math.round((U.parseKey(t.deadline) - U.parseKey(B.time.today())) / 86400000); m.push(`<span class="chip-c ${g <= 0 ? 'due' : ''}">hạn ${g < 0 ? 'đã qua' : g === 0 ? 'hôm nay' : U.fmtDate(t.deadline, true)}</span>`); }
    if (t.carried) m.push(`<span class="t-carried">đã dời ${t.carried} lần</span>`);
    if (t.spent >= 1 && !t.done) m.push(`<span class="t-carried">đã làm ${Math.round(t.spent)}′</span>`);
    return m.concat(extra || []).join('');
  }
  function menuHTML(t, b, isToday) {
    const a = (act, label, icn) => `<button class="mini" data-act="${act}">${icn ? ic(icn) : ''}${label}</button>`;
    return `<div class="blk-menu">${a('edit', 'Sửa', 'pencil')}${a('minus', '−15′')}${a('plus', '+15′')}${!b.stepId ? a('steps', 'Chia thành bước nhỏ', 'list') : ''}${isToday && !b.stepId && b.est > 30 ? a('half', 'Chỉ làm 30′ hôm nay') : ''}${a('up', 'Đưa lên')}${a('down', 'Đưa xuống')}${isToday ? a('skip', 'Bỏ qua hôm nay') + a('tomorrow', 'Dời sang mai', 'arrow') : a('totoday', 'Chuyển về hôm nay')}${a('del', 'Xóa', 'trash')}</div>`;
  }
  function blockRow(b, date, isToday) {
    const t = B.tasks.get(b.taskId);
    if (!t) return '';
    if (st.form && st.form.id === t.id) return formHTML();
    const step = b.stepId && t.steps.find((s) => s.id === b.stepId), running = B.S.focus && B.S.focus.taskId === t.id && B.S.focus.kind !== 'break' && (!b.stepId || B.S.focus.stepId === b.stepId);
    const pv = isToday ? B.tasks.preview(t, true).coins : Math.round(B.PRI[t.priority].coins * B.RULES.planBonus);
    const nSteps = t.steps.length, doneSteps = t.steps.filter((s) => s.done).length;
    const extra = [`<span class="t-reward">${ic('coin')}+${pv}</span>`];
    if (nSteps) extra.push(`<span class="chip-c">bước ${doneSteps + 1}/${nSteps}</span>`);
    return `<li class="blk p-${t.priority} ${t.load} ${running ? 'running' : ''}" draggable="true" data-key="${b.key}" data-id="${t.id}" ${b.stepId ? `data-step="${b.stepId}"` : ''}>
      <div class="blk-time" title="${P().fmtMin(b.s)} đến ${P().fmtMin(b.e)}"><b>${P().fmtMin(b.s)}</b><span>${P().fmtMin(b.e)}</span><small>${dur(b.est)}${b.inner ? ` +${b.inner} nghỉ` : ''}</small></div>
      ${isToday ? `<button class="chk" data-act="toggle" role="checkbox" aria-checked="false" aria-label="Đánh dấu hoàn thành: ${esc(step ? step.title : t.title)}">${ic('check')}</button>` : ''}
      <div class="t-main"><div class="t-title">${esc(t.title)}${step ? `<small> · ${esc(step.title)}</small>` : ''}</div>
        <div class="t-dod">${ic('arrow')}<span>${esc(step ? step.outcome || '' : t.dod || '')}</span></div>
        <div class="t-meta">${chips(t, extra)}</div><div class="t-why">${esc(b.reason || '')}${b.fixed ? ' · giờ cố định' : ''}</div>
        ${st.menu === b.key ? menuHTML(t, b, isToday) : ''}</div>
      <div class="t-actions on">${isToday ? `<button data-act="start" title="${running ? 'Đang đếm giờ' : 'Bắt đầu đếm giờ cho khối này'}" aria-label="Bắt đầu đếm giờ">${ic('timer')}</button>` : ''}<button data-act="menu" title="Thao tác khác" aria-label="Thao tác khác" aria-expanded="${st.menu === b.key}">${ic('sliders')}</button></div>
    </li>`;
  }
  function restRow(b, date) {
    return `<li class="blk-rest ${b.type}"><span>${P().fmtMin(b.s)} – ${P().fmtMin(b.e)}</span><b>${esc(b.title)}</b>${b.type === 'busy' ? `<button class="mini" data-delbusy="${b.id}" data-date="${date}" aria-label="Xóa việc đã hẹn">${ic('x')}</button>` : ''}</li>`;
  }
  function doneRow(t) {
    const ask = st.askActual === t.id && !t.actual, est = t.est || 30;
    const time = t.actual ? `<span class="chip-c ${t.onTime ? 'ok' : ''}">${t.actual}′ / dự kiến ${est}′${t.onTime ? ' · đúng giờ' : ''}</span>` : `<button class="mini" data-act="ask">Ghi thời gian thực tế</button>`;
    return `<li class="task done p-${t.priority} ${st.justDone === t.id ? 'just-done' : ''}" data-id="${t.id}">
      <button class="chk" data-act="toggle" role="checkbox" aria-checked="true" aria-label="Bỏ đánh dấu: ${esc(t.title)}">${ic('check')}</button>
      <div class="t-main"><div class="t-title">${esc(t.title)}</div><div class="t-meta"><span class="t-reward got">${ic('coin')}+${(t.reward || 0) + (t.timeBonus || 0)}</span>${time}</div>
        ${ask ? `<div class="blk-menu"><span class="f-lbl">Mất bao lâu?</span><button class="mini" data-actual="${Math.max(5, Math.round(est * 0.75))}">Nhanh hơn</button><button class="mini" data-actual="${est}">Khoảng ${est}′</button><button class="mini" data-actual="${Math.round(est * 1.5)}">Lâu hơn</button><input type="number" class="f-num on" min="1" max="600" placeholder="phút" aria-label="Số phút thực tế" data-actualinput></div>` : ''}</div>
      <div class="t-actions"><button data-act="del" title="Xóa" aria-label="Xóa">${ic('trash')}</button></div></li>`;
  }
  function looseRow(t, kind, isToday) {
    return `<li class="task loose p-${t.priority}" data-id="${t.id}"><span class="dot"></span><div class="t-main"><div class="t-title">${esc(t.title)}</div><div class="t-meta">${chips(t, [`<span class="chip-c">${dur(P().remainingOf(t))}</span>`])}</div>
      <div class="blk-menu">${kind === 'skip' ? '<button class="mini" data-act="unskip">Làm lại hôm nay</button>' : '<button class="mini" data-act="half">Chỉ làm 30′</button><button class="mini" data-act="minus">−15′</button>'}${isToday ? '<button class="mini" data-act="tomorrow">Dời sang mai</button>' : ''}<button class="mini" data-act="edit">Sửa</button><button class="mini" data-act="del">Xóa</button></div></div></li>`;
  }

  /* ---------- Vẽ cả ngày ---------- */
  function renderDay(date, el) {
    const S = B.S, today = B.time.today(), isToday = date === today, plan = P().get(date), noon = P().toMin(S.plan.noonAt);
    const all = S.tasks.filter((t) => t.date === date), done = all.filter((t) => t.done), stt = B.tasks.stats(date);
    const pct = Math.round(stt.rate * 100), left = B.tasks.fullSlotsLeft(), late = isToday ? P().lateBy() : 0, dp = P().dayState(date);
    const adding = st.form && !st.form.id && st.form.date === date;
    let head;
    if (isToday) {
      const sub = !stt.total ? 'Thêm vài việc, Bun sẽ gợi ý thứ tự và giờ làm.' : stt.done === stt.total ? 'Xong hết rồi. Bun đang rất vui.' : `${dur(plan.stats.work)} việc còn lại, dự kiến xong lúc ${P().fmtMin(plan.stats.end)}.${left > 0 ? '' : ' Đã hết lượt thưởng đầy đủ.'}`;
      head = `<div class="progress-card"><div class="ring" style="--p:${pct}"><span>${pct}<small>%</small></span></div><div class="pc-text"><strong>${stt.total ? `${stt.done}/${stt.total} việc hôm nay` : 'Chưa có việc nào'}</strong><span>${sub}</span></div></div>`;
    } else {
      const n = all.length, tip = !n ? 'Chọn ba việc chính cho ngày mai. Việc lên kế hoạch trước được thưởng thêm 20%.' : n <= 5 ? `Đã có ${n} việc, tổng ${dur(plan.stats.work)}. Một ngày đẹp thường chỉ cần ba đến năm việc.` : `Đã có ${n} việc, hơi nhiều rồi. Thử bớt đi để ngày mai nhẹ hơn.`;
      let meter = '';
      for (let i = 0; i < 5; i++) meter += `<i class="${i < n ? 'on' : ''}"></i>`;
      head = `<div class="plan-card ${n > 5 ? 'warn' : ''}"><strong>${U.fmtDate(date)}</strong><span>${tip}</span><div class="plan-meter">${meter}${n > 5 ? `<b>+${n - 5}</b>` : ''}</div></div>`;
    }
    const why = plan.summary.length ? `<details class="why" ${st.whyOpen ? 'open' : ''}><summary>${ic('star')}Vì sao Bun xếp như vậy?</summary><ul>${plan.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>` : '';
    const lateBar = late >= 12 ? `<div class="late-bar">${ic('timer')}<span>Lịch đang chậm ${dur(late)} so với dự kiến. Không sao cả, mình sắp lại phần còn lại.</span><button class="btn primary sm" data-relate>Sắp lại từ bây giờ</button></div>` : '';
    const tools = `<div class="plan-tools"><button class="btn primary sm" data-add data-date="${date}">${ic('plus')}Thêm việc</button>${isToday ? `<button class="btn soft sm" data-replan>${ic('sliders')}Điều chỉnh ngày</button>` : ''}<button class="btn soft sm" data-addbusy data-date="${date}">Có hẹn</button>${dp.order && dp.order.length ? `<button class="btn ghost sm" data-auto data-date="${date}">Để Bun sắp lại</button>` : ''}<button class="btn ghost sm" data-plansettings title="Giờ làm việc và nhịp nghỉ" aria-label="Thiết lập lịch">${ic('timer')}</button></div>`;

    const rows = { am: '', pm: '' };
    plan.blocks.forEach((b) => { rows[b.s < noon ? 'am' : 'pm'] += b.type === 'task' ? blockRow(b, date, isToday) : restRow(b, date); });
    const doneOf = (sh) => done.filter((t) => t.shift === sh).sort((a, b) => a.doneAt - b.doneAt).map(doneRow).join('');
    const section = (sh, label, sub) => {
      const d = isToday ? doneOf(sh) : '', n = plan.blocks.filter((b) => b.type === 'task' && (b.s < noon) === (sh === 'am')).length, dn = done.filter((t) => t.shift === sh).length;
      if (!d && !rows[sh] && isToday && sh === 'am' && P().nowMin() >= noon) return '';
      return `<section class="shift"><header><span class="sh-ic">${ic(sh === 'am' ? 'sun' : 'moon')}</span><h3>${label}</h3><small>${sub}</small><span class="grow"></span>${n + dn ? `<span class="sh-count">${isToday ? dn + '/' : ''}${n + dn}</span>` : ''}</header>
        <ul class="tasks sched" data-date="${date}">${d}${rows[sh]}</ul>${!d && !rows[sh] ? `<p class="empty">${sh === 'am' ? 'Chưa có khối việc nào cho buổi sáng.' : 'Chưa có khối việc nào cho buổi chiều tối.'}</p>` : ''}</section>`;
    };
    const overIds = [], over = plan.overflow.filter((x) => (overIds.indexOf(x.taskId) < 0 ? overIds.push(x.taskId) : false)).map((x) => B.tasks.get(x.taskId)).filter(Boolean);
    const skipped = all.filter((t) => !t.done && t.skipped === date);
    const noonBtn = isToday && P().nowMin() >= noon ? `<button class="btn soft" data-noon>${ic('sun')}Nhìn lại buổi sáng</button>` : '';
    el.innerHTML = head + lateBar + tools + (adding ? `<ul class="tasks">${formHTML()}</ul>` : '') + why + section('am', 'Ca sáng', `trước ${S.plan.noonAt}`) + section('pm', 'Ca chiều tối', `từ ${S.plan.noonAt}`)
      + (over.length ? `<section class="shift"><header><h3>Chưa xếp vừa ${isToday ? 'hôm nay' : 'ngày mai'}</h3><small>quỹ thời gian không đủ</small></header><ul class="tasks">${over.map((t) => looseRow(t, 'over', isToday)).join('')}</ul></section>` : '')
      + (skipped.length ? `<section class="shift"><header><h3>Để sau</h3><small>đã bỏ qua hôm nay</small></header><ul class="tasks">${skipped.map((t) => looseRow(t, 'skip', isToday)).join('')}</ul></section>` : '')
      + (isToday ? `<div class="tab-foot">${noonBtn}<button class="btn soft" data-summary>${ic('moon')}Tổng kết ngày</button></div><p class="hint">Kéo thả để đổi thứ tự. Sáu việc đầu mỗi ngày nhận đủ thưởng; xong trong thời gian đã định được thưởng thêm.</p>` : '<p class="hint">Đây là lịch dự kiến. Sáng mai Bun sẽ tính lại theo giờ bạn thực sự bắt đầu.</p>');
    st.justDone = null;
    const inp = $('.task-form input[name=title]', el);
    if (inp && st.focusForm) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    st.focusForm = false;
  }

  /* ---------- Xử lý thao tác ---------- */
  function moveKey(date, key, dir, beforeKey) {
    const keys = P().get(date).blocks.filter((b) => b.type === 'task').map((b) => b.key).concat(P().get(date).overflow.map((x) => x.key));
    const i = keys.indexOf(key);
    if (i < 0) return;
    keys.splice(i, 1);
    let j = beforeKey ? keys.indexOf(beforeKey) : U.clamp(i + dir, 0, keys.length);
    if (j < 0) j = keys.length;
    keys.splice(j, 0, key);
    P().reorder(date, keys);
  }
  function completeBlock(row, btn) {
    const id = row.dataset.id, stepId = row.dataset.step, t = B.tasks.get(id), r = btn.getBoundingClientRect();
    if (!t) return;
    if (stepId && !t.done) {
      const res = P().stepToggle(id, stepId);
      if (res && res.coins == null) { B.bun.sayCat('taskDone', 2600); B.ui.toast(`Xong một bước của "${esc(t.title)}". Còn ${t.steps.filter((s) => !s.done).length} bước.`, { icon: 'check', ms: 3200 }); return; }
      if (res) afterDone(res, r);
      return;
    }
    st.justDone = t.done ? null : id;
    const res = B.tasks.toggle(id);
    if (!res) return;
    if (res.undone) { st.askActual = null; B.ui.toast('Đã bỏ đánh dấu, phần thưởng của việc này được thu lại.', { ms: 3200 }); B.ui.renderTabs(); } else afterDone(res, r);
  }
  function afterDone(res, r) {
    B.ui.floatText(`+${res.coins} xu`, r.left + r.width / 2, r.top);
    res.bonuses.forEach((b) => B.ui.toast(`<b>${b.label}</b>: thưởng thêm ${b.coins} xu`, { icon: 'gift' }));
    const note = res.notes.find((n) => /vừa thêm|qua \d việc/.test(n));
    if (note) B.ui.toast(note + '.', { icon: 'coin', ms: 5000 });
    if (res.time && !res.time.onTime) B.ui.toast(`Việc này mất ${res.time.actual}′ so với ${res.time.est}′ dự kiến. Bun đã ghi lại để lần sau ước lượng sát hơn.`, { icon: 'timer', ms: 5500 });
    st.askActual = res.needActual ? res.task.id : null;
    B.ui.renderTabs();
  }
  function onClick(e) {
    const t = e.target, q = (s) => t.closest(s);
    let m;
    if ((m = q('[data-add]')) && m.dataset.date) { st.form = newForm(m.dataset.date); st.focusForm = true; st.menu = null; return done(); }
    if (q('[data-cancel]')) { st.form = null; return done(); }
    if (st.form) {
      const f = st.form;
      if ((m = q('[data-pri]'))) { f.priority = m.dataset.pri; return done(true); }
      if ((m = q('[data-dur]'))) { f.est = +m.dataset.dur; return done(true); }
      if (q('[data-more]')) { f.more = !f.more; return done(true); }
      if ((m = q('[data-cat]'))) { f.cat = m.dataset.cat; return done(true); }
      if ((m = q('[data-load]'))) { f.load = m.dataset.load; return done(true); }
      if ((m = q('[data-diff]'))) { f.diff = m.dataset.diff; return done(true); }
    }
    if (q('[data-replan]')) { openAdjust(); return true; }
    if (q('[data-relate]')) { P().apply(P().propose('late')); B.ui.toast('Đã sắp lại phần còn lại của ngày, bắt đầu từ bây giờ.', { icon: 'timer' }); return true; }
    if ((m = q('[data-auto]'))) { P().autoOrder(m.dataset.date); return true; }
    if ((m = q('[data-addbusy]'))) { openBusy(m.dataset.date); return true; }
    if ((m = q('[data-delbusy]'))) { P().removeBusy(m.dataset.date, m.dataset.delbusy); return true; }
    if (q('[data-plansettings]')) { openPlanSettings(); return true; }
    if (q('[data-noon]')) { openNoon(true); return true; }
    if ((m = q('[data-actual]'))) { const row = q('.task'); recordActual(row.dataset.id, +m.dataset.actual); return true; }
    const act = q('[data-act]'), row = q('.blk, .task');
    if (!act || !row) return false;
    const id = row.dataset.id, key = row.dataset.key || id, task = B.tasks.get(id), date = task ? task.date : B.time.today(), a = act.dataset.act;
    if (!task) return true;
    if (a === 'toggle') completeBlock(row, act);
    else if (a === 'menu') { st.menu = st.menu === key ? null : key; done(); }
    else if (a === 'start') startBlock(task, row.dataset.step);
    else if (a === 'ask') { st.askActual = id; done(); }
    else if (a === 'edit') { st.form = newForm(date, task); st.focusForm = true; st.menu = null; done(); }
    else if (a === 'del') B.ui.confirm('Xóa việc này?', esc(task.title), 'Xóa', true).then((ok) => ok && B.tasks.remove(id));
    else if (a === 'minus' || a === 'plus') {
      const step = row.dataset.step && task.steps.find((s) => s.id === row.dataset.step), d = a === 'plus' ? 15 : -15;
      if (step) { step.est = U.clamp(step.est + d, 5, 180); task.est = task.steps.reduce((x, s) => x + s.est, 0); B.store.save(); B.emit('tasks'); } else P().setEst(id, P().remainingOf(task) + (task.spent || 0) + d);
    } else if (a === 'steps') { P().toSteps(id); st.menu = null; B.ui.toast(`Đã chia thành ${task.steps.filter((s) => !s.done).length} bước nhỏ, mỗi bước có kết quả riêng.`, { icon: 'list' }); }
    else if (a === 'half') { const nt = P().splitTask(id, 30); st.menu = null; B.ui.toast(nt ? `Hôm nay chỉ làm 30′. Phần còn lại (${dur(nt.est)}) đã chuyển sang ngày mai, tiến độ được giữ nguyên.` : 'Việc này đã đủ ngắn rồi.', { icon: 'arrow', ms: 5200 }); if (!nt) done(); }
    else if (a === 'up') moveKey(date, key, -1);
    else if (a === 'down') moveKey(date, key, 1);
    else if (a === 'skip') { P().skipToday(id); st.menu = null; B.ui.toast('Đã để việc này sang một bên hôm nay. Lịch còn lại được tính lại.', { ms: 3600 }); }
    else if (a === 'unskip') P().skipToday(id, false);
    else if (a === 'tomorrow') { P().moveTomorrow(id); st.menu = null; B.ui.toast('Đã dời sang ngày mai.', { icon: 'arrow', ms: 3000 }); }
    else if (a === 'totoday') { task.date = B.time.today(); task.planned = false; st.menu = null; B.store.save(); B.emit('tasks'); }
    return true;
    function done(keepFocus) { if (keepFocus) st.focusForm = true; B.ui.renderTabs(); return true; }
  }
  function recordActual(id, minutes) {
    const t = B.tasks.get(id);
    if (!t || !(minutes > 0)) return;
    const r = B.tasks.setActual(t, minutes, 'user');
    st.askActual = null;
    if (r && r.coins) B.ui.toast(`<b>${r.early ? 'Xong sớm hơn dự kiến' : 'Xong trong thời gian đã định'}</b>: thưởng thêm ${r.coins} xu`, { icon: 'gift' });
    else if (r && !r.onTime) B.ui.toast('Đã ghi lại. Lần sau Bun sẽ gợi ý thời lượng sát hơn cho việc tương tự.', { icon: 'timer' });
  }
  function onInput(e) {
    const el = e.target, f = st.form;
    if (el.dataset.actualinput !== undefined) return;
    if (!f || !el.closest('.task-form')) return;
    if (el.name === 'title') {
      f.title = el.value;
      const h = formHints(f), sc = $('#panel .f-scope'), gs = $('#panel .f-guess'), dod = $('#panel textarea[name=dod]');
      if (sc) sc.innerHTML = scopeLine(f, h);
      if (gs) gs.textContent = `Bun đoán: ${h.cat} · ${B.LOADS[h.load]}`;
      if (dod) dod.placeholder = h.scope;
    } else if (el.name === 'est') { if (+el.value >= 5) { f.est = Math.round(+el.value); const sc = $('#panel .f-scope'); if (sc) sc.innerHTML = scopeLine(f, formHints(f)); $$('#panel .task-form [data-dur]').forEach((b) => b.classList.toggle('on', +b.dataset.dur === f.est)); el.classList.add('on'); } }
    else if (el.name === 'catNew') f.cat = el.value.trim() || null;
    else if (el.name === 'split') f.split = el.checked;
    else if (['deadline', 'prefTime', 'dod', 'notes'].indexOf(el.name) >= 0) f[el.name] = el.value;
  }
  function onKey(e) {
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.actualinput !== undefined) { e.preventDefault(); recordActual(e.target.closest('.task').dataset.id, +e.target.value); }
  }
  // Kéo thả để đổi thứ tự
  function bindDrag(panel) {
    panel.addEventListener('dragstart', (e) => { const r = e.target.closest && e.target.closest('.blk'); if (!r) return; st.drag = r.dataset.key; r.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', st.drag); } catch (x) { /* bỏ qua */ } });
    panel.addEventListener('dragend', () => { st.drag = null; $$('.blk.dragging, .blk.over', panel).forEach((r) => r.classList.remove('dragging', 'over')); });
    panel.addEventListener('dragover', (e) => { const r = e.target.closest && e.target.closest('.blk'); if (!st.drag || !r) return; e.preventDefault(); $$('.blk.over', panel).forEach((x) => x !== r && x.classList.remove('over')); r.classList.add('over'); });
    panel.addEventListener('drop', (e) => {
      const r = e.target.closest && e.target.closest('.blk');
      if (!st.drag || !r) return;
      e.preventDefault();
      const t = B.tasks.get(r.dataset.id);
      if (t && r.dataset.key !== st.drag) moveKey(t.date, st.drag, 0, r.dataset.key);
      st.drag = null;
    });
  }

  /* ---------- Đếm giờ cho một khối ---------- */
  function startBlock(task, stepId) {
    const S = B.S;
    if (S.focus) return B.ui.toast('Đang có một phiên đếm giờ. Hãy kết thúc phiên đó trước.', { icon: 'timer' });
    const step = stepId && task.steps.find((s) => s.id === stepId), est = step ? step.est : P().remainingOf(task);
    B.focus.start(Math.min(est, S.plan.focusLen), task.id, stepId || null);
  }
  function openTimeUp(taskId, stepId) {
    const S = B.S, t = B.tasks.get(taskId);
    if (!t || t.done) return;
    const step = stepId && t.steps.find((s) => s.id === stepId), name = esc(t.title) + (step ? ' · ' + esc(step.title) : '');
    const m = B.ui.modal({ title: 'Hết giờ của khối này', cls: 'small', html: `<p><b>${name}</b></p><p>Bạn đã làm ${dur(Math.round(t.spent))} trên ${dur(t.est)} dự kiến. ${t.spent > t.est ? 'Lâu hơn dự kiến một chút cũng không sao, Bun ghi lại để lần sau ước lượng sát hơn.' : ''}</p>
      <div class="col-btns"><button class="btn primary" data-tu="done" data-autofocus>${ic('check')}Xong rồi</button><button class="btn soft" data-tu="break">Nghỉ ${S.plan.breakLen}′ rồi làm tiếp</button><button class="btn soft" data-tu="more">Thêm 10 phút nữa</button>
      <button class="btn soft" data-tu="later">Làm tiếp lúc khác trong hôm nay</button><button class="btn ghost" data-tu="tomorrow">Dời phần còn lại sang mai</button></div><p class="hint">Dù chọn gì, thời gian đã làm vẫn được giữ.</p>` });
    m.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tu]');
      if (!b) return;
      const a = b.dataset.tu;
      m.close();
      if (a === 'done') { const res = step ? P().stepToggle(taskId, stepId) : B.tasks.complete(t); if (res && res.coins != null) { res.bonuses.forEach((x) => B.ui.toast(`<b>${x.label}</b>: thưởng thêm ${x.coins} xu`, { icon: 'gift' })); B.ui.toast(`Hoàn thành "${esc(t.title)}": +${res.coins} xu.`, { icon: 'coin' }); } }
      else if (a === 'break') B.focus.start(S.plan.breakLen, taskId, stepId, 'break');
      else if (a === 'more') B.focus.start(10, taskId, stepId);
      else if (a === 'later') { if (step) step.est = Math.max(step.est, 15); else t.est = P().round5(t.spent + 30); B.store.save(); B.emit('tasks'); B.ui.toast('Đã cộng thêm thời gian và xếp lại việc này vào phần còn lại của ngày.', { icon: 'timer' }); }
      else if (a === 'tomorrow') { if (!step) t.est = P().round5(t.spent + 30); P().moveTomorrow(taskId); B.ui.toast('Đã dời sang mai. Phần đã làm hôm nay vẫn được ghi nhận.', { icon: 'arrow' }); }
    });
  }

  /* ---------- Điều chỉnh ngày ---------- */
  function changeText(c) {
    const t = B.tasks.get(c.taskId);
    if (!t) return '';
    if (c.action === 'shrink') return `<b>${esc(t.title)}</b>: hôm nay chỉ làm ${c.to}′, phần còn lại (${dur(c.rest)}) để ngày mai.`;
    if (c.action === 'tomorrow') return `<b>${esc(t.title)}</b>: dời sang ngày mai.`;
    return `<b>${esc(t.title)}</b>: làm được một phần, các bước còn lại để hôm sau.`;
  }
  function planPreview(plan) {
    const rows = plan.blocks.map((b) => { const t = b.type === 'task' && B.tasks.get(b.taskId), step = t && b.stepId && t.steps.find((s) => s.id === b.stepId); return `<li class="${b.type}"><span>${P().fmtMin(b.s)}</span><b>${t ? esc(t.title) + (step ? ' · ' + esc(step.title) : '') : esc(b.title)}</b><small>${b.type === 'task' ? dur(b.est) + (t.load === 'deep' ? ' · sâu' : ' · nhẹ') : dur(b.e - b.s)}</small></li>`; }).join('');
    return rows ? `<ul class="mini-plan">${rows}</ul>` : '<p class="empty">Không còn khối việc nào. Bạn có thể nghỉ ngơi.</p>';
  }
  function openAdjust() {
    const S = B.S;
    let kind = 'late', prm = {}, pr = P().propose('late');
    const m = B.ui.modal({ title: 'Điều chỉnh ngày hôm nay' });
    const draw = () => {
      const now = P().nowMin();
      m.render(`<p>Chuyện gì đang xảy ra? Bun sẽ sắp lại phần còn lại cho vừa sức.</p>
        <div class="seg">${[['late', 'Bắt đầu trễ'], ['tired', 'Đang mệt'], ['busy', 'Có việc đột xuất'], ['less', 'Còn ít thời gian']].map((k) => `<button data-kind="${k[0]}" class="${kind === k[0] ? 'on' : ''}">${k[1]}</button>`).join('')}</div>
        ${kind === 'busy' ? `<div class="f-line"><label class="f-lbl" for="bzS">Từ</label><input type="time" id="bzS" value="${P().fmtMin(prm.s != null ? prm.s : now)}"><label class="f-lbl" for="bzE">đến</label><input type="time" id="bzE" value="${P().fmtMin(prm.e != null ? prm.e : now + 60)}"><input type="text" id="bzT" class="f-txt on" maxlength="40" placeholder="việc gì" value="${esc(prm.title || '')}"></div>` : ''}
        ${kind === 'less' ? `<div class="f-line"><span class="f-lbl">Mình chỉ còn</span>${[60, 120, 180, 240].map((x) => `<button class="pill ${prm.minutes === x ? 'on' : ''}" data-less="${x}">${x / 60} giờ</button>`).join('')}</div>` : ''}
        ${kind === 'tired' ? '<p class="hint" style="margin:0 0 8px">Khi mệt, các phiên tập trung được rút còn tối đa 30 phút và việc sâu chưa gấp sẽ được thu nhỏ.</p>' : ''}
        <h3 class="sec-title" style="margin-top:6px">Thay đổi đề xuất</h3>${pr.changes.length ? `<ul class="tips">${pr.changes.map((c) => `<li>${ic('arrow')}<span>${changeText(c)}</span></li>`).join('')}</ul>` : '<p class="empty">Không cần bỏ bớt việc nào, chỉ dời giờ cho hợp lý.</p>'}
        <h3 class="sec-title">Lịch còn lại</h3>${planPreview(pr.plan)}
        <p class="hint">Một việc lỡ không làm hỏng cả ngày. Việc Gấp & Quan trọng và việc có hạn hôm nay luôn được giữ lại.</p>
        <div class="row end"><button class="btn ghost" data-close>Thôi</button><button class="btn primary" data-apply data-autofocus>Áp dụng lịch này</button></div>`);
    };
    const recalc = () => { const sE = $('#bzS', m.body); if (kind === 'busy' && sE) { prm.s = P().toMin(sE.value); prm.e = Math.max(prm.s + 10, P().toMin($('#bzE', m.body).value)); prm.title = $('#bzT', m.body).value; } if (kind === 'less' && !prm.minutes) prm.minutes = 120; if (kind === 'busy' && prm.s == null) { prm.s = P().nowMin(); prm.e = prm.s + 60; } pr = P().propose(kind, prm); draw(); };
    draw();
    m.body.addEventListener('click', (e) => {
      const k = e.target.closest('[data-kind]'), l = e.target.closest('[data-less]');
      if (k) { kind = k.dataset.kind; prm = {}; return recalc(); }
      if (l) { prm.minutes = +l.dataset.less; return recalc(); }
      if (e.target.closest('[data-apply]')) { if (kind === 'busy') { const sE = $('#bzS', m.body); prm.s = P().toMin(sE.value); prm.e = Math.max(prm.s + 10, P().toMin($('#bzE', m.body).value)); prm.title = $('#bzT', m.body).value; pr = P().propose(kind, prm); } P().apply(pr); m.close(); B.ui.toast('Đã sắp lại ngày hôm nay. Cứ làm từng khối một.', { icon: 'check' }); if (S.bun && !S.bun.away) B.bun.say('Không sao đâu, mình làm lại từ đây nha.', 4200); }
    });
    m.body.addEventListener('change', (e) => { if (['bzS', 'bzE'].indexOf(e.target.id) >= 0) recalc(); });
  }
  function openBusy(date) {
    const now = date === B.time.today() ? P().nowMin() : 14 * 60;
    const m = B.ui.modal({ title: 'Thêm việc đã hẹn', cls: 'small', html: `<p>Khoảng thời gian này sẽ được để trống, các khối việc tự chảy quanh nó.</p>
      <div class="f-line"><label class="f-lbl" for="bS">Từ</label><input type="time" id="bS" value="${P().fmtMin(Math.ceil(now / 30) * 30)}"><label class="f-lbl" for="bE">đến</label><input type="time" id="bE" value="${P().fmtMin(Math.ceil(now / 30) * 30 + 60)}"></div>
      <input type="text" id="bT" class="f-txt on" style="width:100%;margin-top:8px" maxlength="40" placeholder="Ví dụ: học trên lớp, đi khám, gặp bạn">
      <div class="row end"><button class="btn ghost" data-close>Thôi</button><button class="btn primary" data-ok data-autofocus>Thêm</button></div>` });
    m.body.addEventListener('click', (e) => { if (!e.target.closest('[data-ok]')) return; const s = P().toMin($('#bS', m.body).value); P().addBusy(date, { title: $('#bT', m.body).value.trim() || 'Việc đã hẹn', s, e: Math.max(s + 10, P().toMin($('#bE', m.body).value)) }); m.close(); });
  }
  function openPlanSettings() {
    const S = B.S, p = S.plan, pat = `${p.focusLen}/${p.breakLen}`;
    const m = B.ui.modal({ title: 'Thiết lập lịch làm việc', cls: 'small', html: `<div class="f-grid">
        <label for="psS">Bắt đầu ngày</label><input type="time" id="psS" value="${p.dayStart}"><label for="psE">Kết thúc ngày</label><input type="time" id="psE" value="${p.dayEnd}">
        <label for="psL">Ăn trưa lúc</label><input type="time" id="psL" value="${p.lunchAt}"><label for="psLm">Nghỉ trưa (phút)</label><input type="number" id="psLm" min="0" max="180" step="5" value="${p.lunchMin}">
        <label for="psD">Ăn tối lúc</label><input type="time" id="psD" value="${p.dinnerAt}"><label for="psDm">Ăn tối (phút)</label><input type="number" id="psDm" min="0" max="180" step="5" value="${p.dinnerMin}">
        <label for="psN">Nhìn lại buổi sáng lúc</label><input type="time" id="psN" value="${p.noonAt}"></div>
      <label class="check" style="margin:8px 0"><input type="checkbox" id="psNo" ${p.noonOn ? 'checked' : ''}>Tự mở màn hình nhìn lại buổi sáng</label>
      <span class="f-lbl">Nhịp làm và nghỉ</span><div class="seg" style="margin-top:4px">${[['25/5', '25′ làm, 5′ nghỉ'], ['50/10', '50′ làm, 10′ nghỉ'], ['x', 'Tự chọn']].map((k) => `<button data-pat="${k[0]}" class="${(k[0] === pat) || (k[0] === 'x' && pat !== '25/5' && pat !== '50/10') ? 'on' : ''}">${k[1]}</button>`).join('')}</div>
      <div class="f-line"><label class="f-lbl" for="psF">Làm</label><input type="number" id="psF" class="f-num on" min="10" max="120" step="5" value="${p.focusLen}"><label class="f-lbl" for="psB">Nghỉ</label><input type="number" id="psB" class="f-num on" min="3" max="30" value="${p.breakLen}"><span class="f-lbl">phút</span></div>
      <div class="row end"><button class="btn primary" data-save data-autofocus>Lưu</button></div>` });
    m.body.addEventListener('click', (e) => {
      const pt = e.target.closest('[data-pat]');
      if (pt && pt.dataset.pat !== 'x') { const v = pt.dataset.pat.split('/'); $('#psF', m.body).value = v[0]; $('#psB', m.body).value = v[1]; $$('[data-pat]', m.body).forEach((b) => b.classList.toggle('on', b === pt)); }
      if (!e.target.closest('[data-save]')) return;
      const g = (id) => $('#' + id, m.body).value;
      p.dayStart = g('psS') || p.dayStart; p.dayEnd = g('psE') || p.dayEnd; p.lunchAt = g('psL') || p.lunchAt; p.dinnerAt = g('psD') || p.dinnerAt; p.noonAt = g('psN') || p.noonAt;
      p.lunchMin = U.clamp(+g('psLm') || 0, 0, 180); p.dinnerMin = U.clamp(+g('psDm') || 0, 0, 180); p.focusLen = U.clamp(+g('psF') || 50, 10, 120); p.breakLen = U.clamp(+g('psB') || 10, 3, 30); p.noonOn = $('#psNo', m.body).checked;
      if (P().toMin(p.dayEnd) <= P().toMin(p.dayStart) + 60) p.dayEnd = P().fmtMin(P().toMin(p.dayStart) + 120);
      B.store.save(); m.close(); B.emit('tasks');
    });
  }

  /* ---------- Nhìn lại buổi sáng (mốc 12 giờ) ---------- */
  function shouldOpenNoon() {
    const S = B.S, now = P().nowMin();
    return S.plan.noonOn && !S.day.noonDone && !S.bun.away && now >= P().toMin(S.plan.noonAt) && now < 20 * 60 && !S.focus && !B.ui.state.modals.length && S.seenIntro;
  }
  function openNoon(manual) {
    const S = B.S;
    if (!manual && !shouldOpenNoon()) return false;
    let energy = P().dayState(B.time.today()).energy || 'normal', pr;
    const d = P().noonData(), m = B.ui.modal({ title: 'Nhìn lại buổi sáng của bạn', cls: 'wide noon' });
    const draw = () => {
      pr = P().propose(energy === 'low' ? 'tired' : 'late', { energy });
      const mit = P().mit(pr.plan), pct = Math.round(d.rate * 100), others = pr.plan.blocks.filter((b) => b.type === 'task' && (!mit || b.key !== mit.block.key));
      const endFree = Math.max(0, pr.plan.endMin - P().nowMin());
      m.render(`<div class="noon-grid"><div>
          <div class="sum-top"><div class="ring" style="--p:${pct}"><span>${d.doneAm.length}<small> việc</small></span></div><div><strong style="font:700 17px var(--font-h);color:var(--brown-d)">${d.doneAm.length ? `Sáng nay bạn đã xong ${d.doneAm.length} việc` : 'Buổi sáng đã qua'}</strong>
            <p style="margin:2px 0 0">${d.planned.length ? `Kế hoạch buổi sáng có ${d.planned.length} việc, bạn hoàn thành ${d.doneAm.filter((t) => d.planned.indexOf(t) >= 0).length}.` : 'Sáng nay chưa có kế hoạch cụ thể.'} ${d.minutes ? `Thời gian đã ghi nhận: ${dur(Math.round(d.minutes))}.` : ''}</p></div></div>
          ${d.doneAm.length ? `<h3 class="sec-title" style="margin-top:4px">Điều bạn đã làm được</h3><ul class="plain-list good">${d.doneAm.map((t) => `<li>${esc(t.title)}${t.actual ? ` <small>(${t.actual}′ / ${t.est}′)</small>` : ''}${t.priority === 'ui' || t.priority === 'i' ? ' <small class="chip-p p-' + t.priority + '">' + B.PRI[t.priority].short + '</small>' : ''}</li>`).join('')}</ul>` : ''}
          ${d.left.length ? `<h3 class="sec-title">Còn dang dở</h3><ul class="plain-list">${d.left.slice(0, 6).map((t) => `<li>${esc(t.title)} <small>(${dur(P().remainingOf(t))})</small></li>`).join('')}${d.left.length > 6 ? `<li>và ${d.left.length - 6} việc nữa</li>` : ''}</ul>` : ''}
          ${d.insights.length ? `<h3 class="sec-title">Điều rút ra</h3><ul class="tips">${d.insights.map((x) => `<li>${ic('star')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
        </div><div>
          <div class="noon-msg">${B.art.avatar(S.bun.outfit)}<p>Bạn vẫn còn cả buổi chiều và buổi tối. Một buổi sáng chưa hoàn hảo không quyết định cả ngày hôm nay. Bạn vẫn còn cơ hội để làm điều gì đó có ý nghĩa.</p></div>
          <span class="f-lbl">Năng lượng của bạn lúc này</span><div class="seg" style="margin-top:4px">${[['high', 'Còn khỏe'], ['normal', 'Bình thường'], ['low', 'Hơi đuối']].map((k) => `<button data-en="${k[0]}" class="${energy === k[0] ? 'on' : ''}">${k[1]}</button>`).join('')}</div>
          ${mit ? `<div class="mit"><small>Việc quan trọng nhất của nửa ngày còn lại</small><strong>${esc(mit.task.title)}</strong><span>${P().fmtMin(mit.block.s)} – ${P().fmtMin(mit.block.e)} · ${esc(mit.task.dod || '')}</span></div>` : '<p class="empty">Không còn việc nào đang chờ. Bạn có thể thêm một việc nhỏ có ý nghĩa cho buổi chiều.</p>'}
          ${others.length ? `<h3 class="sec-title">Kế hoạch chiều và tối</h3>${planPreview(pr.plan)}` : ''}
          ${pr.changes.length ? `<ul class="tips" style="margin-top:8px">${pr.changes.map((c) => `<li>${ic('arrow')}<span>${changeText(c)}</span></li>`).join('')}</ul>` : ''}
          <p class="hint">Còn khoảng ${dur(endFree)} đến hết ngày, đã trừ giờ ăn và các quãng nghỉ.</p>
        </div></div>
        <div class="row end"><button class="btn ghost" data-skip>Mình tự sắp</button><button class="btn primary" data-use data-autofocus>${ic('sun')}Bắt đầu nửa ngày mới${S.day.noonDone ? '' : ' (+5 xu)'}</button></div>`);
    };
    draw();
    m.body.addEventListener('click', (e) => {
      const en = e.target.closest('[data-en]');
      if (en) { energy = en.dataset.en; return draw(); }
      const use = e.target.closest('[data-use]'), skip = e.target.closest('[data-skip]');
      if (!use && !skip) return;
      if (use) { pr.o.energy = energy === 'high' ? 'normal' : energy; P().apply(pr); }
      if (B.tasks.noonRitual()) B.ui.toast('Nửa ngày mới bắt đầu. Thưởng 5 xu vì đã dừng lại nhìn lại.', { icon: 'sun' });
      m.close();
      if (!S.bun.away) B.bun.cheer('day');
    });
    return true;
  }

  B.planui = { renderDay, onClick, onInput, onKey, submitForm, bindDrag, openAdjust, openNoon, shouldOpenNoon, openTimeUp, openPlanSettings, startBlock, dur, state: st };
})();
