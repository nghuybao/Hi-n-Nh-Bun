/* Hiên Nhà Bun — giao diện: HUD, sổ công việc, cửa tiệm, nhật ký, hồ sơ, cài đặt, nghi thức */
(function () {
  'use strict';
  const B = window.B, U = B.util, A = B.art, $ = U.$, $$ = U.$$, esc = U.esc, ic = B.icon;
  const HOUR = 3600000;
  const ui = { tab: 'today', form: null, shopTab: 'furn', journalTab: 'mem', histOpen: null, justDone: null, modals: [], awayOpen: false, morningShown: false };

  /* ---------- Thông báo nổi ---------- */
  function toast(html, opts) {
    opts = opts || {};
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = (opts.icon ? ic(opts.icon) : '') + `<div>${html}</div>`;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, opts.ms || 4400);
  }
  function floatText(text, x, y) {
    const f = document.createElement('div');
    f.className = 'float-text';
    f.textContent = text;
    f.style.left = x + 'px'; f.style.top = y + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1300);
  }
  function notice(title, text, ms) {
    const n = $('#notice');
    n.innerHTML = `<strong>${title}</strong>${text}`;
    n.hidden = false;
    clearTimeout(notice.t);
    notice.t = setTimeout(() => (n.hidden = true), ms || 9000);
  }

  /* ---------- Hộp thoại ---------- */
  function modal(opts) {
    const wrap = document.createElement('div'), prev = document.activeElement;
    wrap.className = 'modal-wrap ' + (opts.wrapCls || '');
    wrap.innerHTML = `<div class="modal ${opts.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || opts.title || 'Hộp thoại')}">${opts.locked ? '' : `<button class="modal-x" data-close aria-label="Đóng">${ic('x')}</button>`}${opts.title ? `<h2 class="modal-title">${opts.title}</h2>` : ''}<div class="modal-body"></div></div>`;
    const body = wrap.querySelector('.modal-body');
    const m = {
      el: wrap, body, locked: !!opts.locked, closed: false,
      render(html) { body.innerHTML = html; },
      close() {
        if (m.closed) return;
        m.closed = true;
        wrap.classList.add('out');
        setTimeout(() => wrap.remove(), 170);
        ui.modals = ui.modals.filter((x) => x !== m);
        if (opts.onClose) opts.onClose();
        if (prev && prev.focus && document.contains(prev)) prev.focus();
      },
    };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) { if (!m.locked) m.close(); } else if (e.target.closest('[data-close]')) m.close();
    });
    $('#modalRoot').appendChild(wrap);
    ui.modals.push(m);
    if (opts.html) m.render(opts.html);
    setTimeout(() => { const f = wrap.querySelector('[data-autofocus]') || wrap.querySelector('.modal-body button, .modal-x'); if (f) f.focus(); }, 40);
    return m;
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise((res) => {
      const m = modal({ title, cls: 'small', html: `<p>${text}</p><div class="row end"><button class="btn ghost" data-close>Thôi</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes data-autofocus>${okLabel}</button></div>`, onClose: () => res(false) });
      m.body.addEventListener('click', (e) => { if (e.target.closest('[data-yes]')) { res(true); m.close(); } });
    });
  }

  /* ---------- HUD ---------- */
  const STAT_DEFS = [['hunger', 'food', 'Độ no', '#D98B58'], ['thirst', 'drop', 'Nước', '#6FA8C4'], ['joy', 'heart', 'Niềm vui', '#E07F78'], ['energy', 'bolt', 'Năng lượng', '#D9A93C']];
  let lastCoins = null;
  function skyText() {
    const h = B.time.visualHour(), wx = B.scene.weather();
    const part = h < 5 ? 'Đêm khuya' : h < 7 ? 'Sáng sớm' : h < 11 ? 'Buổi sáng' : h < 13.5 ? 'Buổi trưa' : h < 17 ? 'Buổi chiều' : h < 18.9 ? 'Hoàng hôn' : h < 22.5 ? 'Buổi tối' : 'Đêm';
    const w = wx === 'rain' ? 'trời mưa' : wx === 'cloudy' ? 'nhiều mây' : h >= 19 || h < 5 ? 'trời quang' : 'có nắng';
    return { icon: wx === 'rain' ? 'rain' : wx === 'cloudy' ? 'cloud' : h >= 18.9 || h < 5.6 ? 'moon' : 'sun', text: `${part}, ${w}` };
  }
  function renderHud() {
    const S = B.S, st = S.bun.stats, bond = B.bond(S.bun.bondXp);
    $('#btnProfile').innerHTML = `${A.avatar(S.bun.outfit)}<span class="np-text"><strong>${esc(S.bun.name)}</strong><small>${bond.name} · đời thứ ${S.bun.gen}</small></span>`;
    $('#stats').innerHTML = STAT_DEFS.map((d) => { const v = Math.round(st[d[0]]); return `<div class="stat ${v < 25 ? 'low' : ''}" style="--v:${v};--c:${d[3]}" title="${d[2]}: ${v}%" role="img" aria-label="${d[2]} ${v} phần trăm">${ic(d[1])}</div>`; }).join('');
    const chip = $('#chipCoins');
    chip.innerHTML = `${ic('coin')}<b>${S.coins}</b>`;
    if (lastCoins != null && lastCoins !== S.coins) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
    lastCoins = S.coins;
    $('#chipStreak').innerHTML = `${ic('flame')}<b>${B.tasks.liveStreak()}</b><span>ngày</span>`;
    const sky = skyText(), rest = B.rest.activeAt(B.now());
    $('#skyChip').innerHTML = `${ic(sky.icon)}<span>${B.time.preview != null ? 'Xem thử: ' : ''}${sky.text}${rest ? ' · bà đang trông Bun' : ''}</span>`;
  }
  function renderActions() {
    const acts = [['feed', 'food', 'Cho ăn'], ['water', 'drop', 'Cho uống'], ['play', 'ball', 'Chơi'], ['pet', 'heart', 'Vuốt ve'], ['call', 'bell', 'Gọi Bun'], ['focus', 'timer', 'Ngồi cùng']];
    $('#actions').innerHTML = acts.map((a) => `<button class="act ${a[0] === 'focus' && B.S.focus ? 'on' : ''}" data-act="${a[0]}">${ic(a[1])}${a[2]}</button>`).join('');
    $('#btnShop').innerHTML = ic('shop'); $('#btnJournal').innerHTML = ic('book'); $('#btnSettings').innerHTML = ic('sliders');
  }

  /* ---------- Chăm sóc ---------- */
  function closePopover() { $('#popover').hidden = true; }
  function openFeed() {
    const S = B.S, pop = $('#popover');
    if (!pop.hidden) return closePopover();
    pop.innerHTML = `<h4>Hôm nay Bun ăn gì?</h4>` + B.FOODS.map((f) => {
      const free = f.id === 'kibble' && S.coins < f.price && !S.day.freeMeal;
      return `<button class="pop-item" data-food="${f.id}"><span><strong>${f.name}</strong><small>${f.desc}</small></span><span class="price">${free ? 'Tặng' : ic('coin') + f.price}</span></button>`;
    }).join('');
    pop.hidden = false;
  }
  function doFeed(id) {
    closePopover();
    const r = B.careActions.feed(id);
    if (!r.ok) {
      if (r.reason === 'full') B.bun.sayCat('full');
      else if (r.reason === 'coins') toast('Chưa đủ xu. Hoàn thành một việc để mua thêm nhé.', { icon: 'coin' });
      return;
    }
    B.scene.updateBowls(); B.bun.feedAnim('food');
    if (r.free) toast('Ví đang trống nên bữa hạt hôm nay được tặng.', { icon: 'gift' });
  }
  function doWater() {
    const r = B.careActions.water();
    if (!r.ok) return B.bun.sayCat('notThirsty');
    B.scene.updateBowls(); B.bun.feedAnim('water');
  }
  function doPlay() {
    const r = B.careActions.play();
    if (!r.ok) return B.bun.sayCat('tired');
    B.bun.playAnim();
  }

  /* ---------- Sổ công việc ---------- */
  function renderHead() {
    $('#panelHead').innerHTML = `<div class="ph-greet">${B.GREET_BY_HOUR(B.time.hour())}</div><h1 class="ph-date">${U.fmtDate(B.time.today())}</h1>`;
  }
  function renderToday() { B.planui.renderDay(B.time.today(), $('#tab-today')); }
  function renderTomorrow() { B.planui.renderDay(B.tasks.tomorrow(), $('#tab-tomorrow')); }
  function renderJourney() {
    const S = B.S, today = B.time.today(), dows = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayInfo = (k) => (k === today ? B.tasks.summary() : S.history[k] || null);
    let wt = 0, wd = 0, week = '';
    for (let i = 6; i >= 0; i--) {
      const k = U.addDays(today, -i), s = dayInfo(k), rate = s && s.total ? s.done / s.total : 0;
      if (s) { wt += s.total; wd += s.done; }
      week += `<div class="col ${i === 0 ? 'today' : ''}"><div class="bar ${S.restDays[k] ? 'rest' : ''}" title="${U.fmtDate(k)}: ${s ? `${s.done}/${s.total} việc` : 'không có dữ liệu'}"><i style="--v:${Math.round(rate * 100)}"></i></div>${dows[U.parseKey(k).getDay()]}</div>`;
    }
    let heat = '';
    const start = U.addDays(today, -34 - ((U.parseKey(today).getDay() + 6) % 7) + 6);
    for (let i = 0; i < 35; i++) {
      const k = U.addDays(today, -34 + i), s = dayInfo(k), rate = s && s.total ? s.done / s.total : 0;
      const cls = S.restDays[k] ? 'rest' : !s || !s.done ? '' : rate >= 1 ? 'l3' : rate >= 0.5 ? 'l2' : 'l1';
      heat += `<i class="${cls} ${k === today ? 'now' : ''}" title="${U.fmtDate(k)}${s ? `: ${s.done}/${s.total} việc` : ''}"></i>`;
    }
    void start;
    const fm = S.totals.focusMin, got = B.ACH.filter((a) => S.achievements[a.id]), locked = B.ACH.filter((a) => !S.achievements[a.id]);
    const achRow = (a, ok) => `<li class="${ok ? '' : 'locked'}">${ic(ok ? 'star' : 'gift')}<div><strong>${a.name}</strong><small>${a.desc}${ok ? '' : ` · Thưởng: ${B.ach.rewardText(a)}`}</small></div></li>`;
    const keys = Object.keys(S.history).sort().reverse().slice(0, 14);
    const hist = keys.map((k) => {
      const hday = S.history[k], open = ui.histOpen === k;
      return `<li class="${open ? 'open' : ''}"><button class="hist-row" data-hist="${k}" aria-expanded="${open}">${ic('chevron')}<strong>${U.fmtDate(k)}</strong><span class="grow"></span><span>${hday.rest && !hday.total ? 'ngày nghỉ' : `${hday.done}/${hday.total} việc`}${hday.coins ? ` · ${hday.coins} xu` : ''}</span></button>
        ${open ? `<ul class="hist-items">${hday.items.length ? hday.items.map((it) => `<li class="${it.d ? 'd' : ''}">${esc(it.t)}</li>`).join('') : '<li>Không có việc nào được ghi lại.</li>'}</ul>` : ''}</li>`;
    }).join('');
    $('#tab-journey').innerHTML = `<div class="cards">
        <div class="card"><b>${B.tasks.liveStreak()} ngày</b><span>Chuỗi hiện tại · dài nhất ${S.streak.best}</span></div>
        <div class="card"><b>${S.totals.tasksDone}</b><span>Việc đã hoàn thành</span></div>
        <div class="card"><b>${wt ? Math.round((wd / wt) * 100) : 0}%</b><span>Tỉ lệ hoàn thành 7 ngày</span></div>
        <div class="card"><b>${fm >= 60 ? `${Math.floor(fm / 60)} giờ ${fm % 60 ? (fm % 60) + '′' : ''}` : fm + ' phút'}</b><span>Ngồi cùng Bun</span></div></div>
      <h3 class="sec-title">Bảy ngày qua</h3><div class="week">${week}</div>
      <h3 class="sec-title">Năm tuần gần đây <small>ô càng đậm là ngày càng trọn vẹn</small></h3><div class="heat">${heat}</div>
      <h3 class="sec-title">Thành tích <small>${got.length}/${B.ACH.length}</small></h3><ul class="ach">${got.map((a) => achRow(a, true)).join('')}${locked.map((a) => achRow(a, false)).join('')}</ul>
      <h3 class="sec-title">Lịch sử</h3>${hist ? `<ul class="hist">${hist}</ul>` : '<p class="empty">Lịch sử sẽ xuất hiện sau ngày đầu tiên.</p>'}`;
  }
  function renderTabs() {
    renderHead();
    if (ui.tab === 'today') renderToday(); else if (ui.tab === 'tomorrow') renderTomorrow(); else if (ui.tab === 'focus') { if (B.focusui) B.focusui.render($('#tab-focus')); } else renderJourney();
  }
  function setTab(tab) {
    ui.tab = tab; B.planui.state.form = null; B.planui.state.menu = null;
    $$('#panel .tabs button').forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('#panel .tab').forEach((s) => s.classList.toggle('on', s.id === 'tab-' + tab));
    renderTabs();
  }
  function onPanelClick(e) {
    const t = e.target, tabBtn = t.closest('[data-tab]');
    if (tabBtn) return setTab(tabBtn.dataset.tab);
    if (t.closest('[data-summary]')) return openSummary();
    const hist = t.closest('[data-hist]');
    if (hist) { ui.histOpen = ui.histOpen === hist.dataset.hist ? null : hist.dataset.hist; return renderJourney(); }
    if (ui.tab === 'focus' && B.focusui && B.focusui.onClick(e)) return;
    B.planui.onClick(e);
  }

  /* ---------- Ngồi cùng Bun ---------- */
  function openFocus(taskId) {
    const S = B.S;
    if (B.focusui) { setTab('focus'); B.focusui.preset(taskId); return; }
    if (S.focus) return toast('Đang có một phiên tập trung. Bấm "Dừng" trên thanh đếm giờ nếu muốn kết thúc sớm.', { icon: 'timer' });
    const tasks = B.tasks.list(B.time.today()).filter((t) => !t.done);
    let min = 25, tid = taskId || '';
    const m = modal({ title: 'Ngồi cùng Bun', cls: 'small' });
    const draw = () => m.render(`<p>Chọn thời gian, rồi cứ làm việc. Bun sẽ nằm cạnh bàn cho đến khi hết giờ. Đóng ứng dụng thì đồng hồ vẫn chạy.</p>
      <div class="seg">${[15, 25, 45, 60].map((x) => `<button data-min="${x}" class="${x === min ? 'on' : ''}">${x} phút</button>`).join('')}</div>
      ${tasks.length ? `<label for="focusTask" class="hint" style="margin:0 0 4px;display:block">Làm việc gì?</label><select id="focusTask" style="width:100%"><option value="">Không gắn với việc nào</option>${tasks.map((t) => `<option value="${t.id}" ${t.id === tid ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select>` : ''}
      <div class="row end"><button class="btn ghost" data-close>Để sau</button><button class="btn primary" data-start data-autofocus>${ic('timer')}Bắt đầu ${min} phút</button></div>
      <p class="hint">Mỗi 5 phút tập trung được 1 xu, tối đa 120 phút mỗi ngày.</p>`);
    draw();
    m.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-min]');
      if (b) { const sel = $('#focusTask', m.body); if (sel) tid = sel.value; min = +b.dataset.min; return draw(); }
      if (e.target.closest('[data-start]')) { const sel = $('#focusTask', m.body); B.focus.start(min, sel ? sel.value : tid); m.close(); }
    });
  }
  function renderFocus() {
    const f = B.S.focus, bar = $('#focusBar');
    if (!f) { if (!bar.hidden) { bar.hidden = true; document.title = 'Hiên Nhà Bun'; renderActions(); } return; }
    const left = B.focus.remaining(), task = f.taskId && B.tasks.get(f.taskId);
    if (bar.hidden) { bar.hidden = false; bar.innerHTML = `${ic('timer')}<b></b><span></span><button data-stopfocus>Dừng</button>`; renderActions(); }
    bar.querySelector('b').textContent = U.fmtClock(left);
    bar.querySelector('span').textContent = f.kind === 'break' ? 'Đang nghỉ giữa giờ' : task ? task.title : 'Đang ngồi cùng Bun';
    bar.classList.toggle('is-break', f.kind === 'break');
    document.title = `${U.fmtClock(left)} · Hiên Nhà Bun`;
    if (B.focusui) B.focusui.tickClock();
  }

  /* ---------- Cửa tiệm ---------- */
  function shopHTML() {
    const S = B.S, tab = ui.shopTab;
    let html = `<div class="row" style="margin-bottom:12px"><span class="wallet">${ic('coin')}${S.coins} xu</span><span class="hint" style="margin:0">Mỗi món mua về đều xuất hiện trong phòng.</span></div>
      <div class="seg" role="tablist">${B.SHOP_TABS.map((t) => `<button data-stab="${t.id}" class="${t.id === tab ? 'on' : ''}">${t.label}</button>`).join('')}</div>`;
    if (tab === 'house') {
      html += '<div class="house-list">' + B.HOUSE.map((h) => {
        const cur = h.level === S.house.level, own = h.level <= S.house.level, next = h.level === S.house.level + 1;
        return `<div class="house-row ${cur ? 'cur' : ''} ${!own && !next ? 'future' : ''}">${A.houseThumb(h.level)}<div><strong>Cấp ${h.level}: ${h.name}</strong><small>${h.desc}</small></div>
          ${cur ? '<span class="tags"><span>Đang ở</span></span>' : own ? '' : next ? `<button class="btn primary sm price-btn" data-upgrade>${ic('coin')}${h.price}</button>` : `<span class="hint" style="margin:0">${h.price} xu</span>`}</div>`;
      }).join('') + '</div>';
      return html;
    }
    const slots = B.SHOP_TABS.find((t) => t.id === tab).slots;
    html += '<div class="shop-grid">' + B.ITEMS.filter((it) => slots.indexOf(it.slot) >= 0).map((it) => {
      const own = B.shop.owns(it.id), using = own && B.shop.placed(it), lockLv = it.level && S.house.level < it.level, fixed = it.slot === 'bed' || it.slot === 'rug' || it.slot === 'curtain';
      let btn;
      if (!own) btn = lockLv ? `<button class="btn soft sm" disabled>Cần nhà cấp ${it.level}</button>` : `<button class="btn primary sm price-btn" data-buy="${it.id}">${ic('coin')}${it.price}</button>`;
      else if (it.slot === 'toy') btn = '<button class="btn soft sm" disabled>Đã có trong phòng</button>';
      else if (using) btn = fixed ? '<button class="btn soft sm" disabled>Đang dùng</button>' : `<button class="btn soft sm" data-use="${it.id}">Cất đi</button>`;
      else btn = `<button class="btn soft sm" data-use="${it.id}">Dùng</button>`;
      return `<div class="item ${using ? 'using' : ''}"><div class="thumb">${A.thumb(it, S.bun.outfit)}</div><span class="tag">${B.SLOT_NAMES[it.slot]}</span><strong>${it.name}</strong><small>${it.desc}</small>${btn}</div>`;
    }).join('') + '</div>';
    return html;
  }
  function openShop(tab) {
    if (tab) ui.shopTab = tab;
    const m = modal({ title: 'Cửa tiệm nhỏ', cls: 'wide' });
    const draw = () => m.render(shopHTML());
    draw();
    m.body.addEventListener('click', (e) => {
      const st = e.target.closest('[data-stab]'), buy = e.target.closest('[data-buy]'), use = e.target.closest('[data-use]');
      if (st) { ui.shopTab = st.dataset.stab; return draw(); }
      if (buy) {
        const it = B.item(buy.dataset.buy), r = B.shop.buy(it.id);
        if (!r.ok) return toast(r.reason === 'coins' ? `Còn thiếu ${it.price - B.S.coins} xu để mua ${it.name.toLowerCase()}.` : 'Chưa mua được món này.', { icon: 'coin' });
        toast(`<b>${it.name}</b> đã về nhà.`, { icon: 'gift' });
        return draw();
      }
      if (use) { B.shop.use(use.dataset.use); return draw(); }
      if (e.target.closest('[data-upgrade]')) {
        const next = B.HOUSE.find((h) => h.level === B.S.house.level + 1), r = B.shop.upgrade();
        if (!r.ok) return toast(`Còn thiếu ${next.price - B.S.coins} xu để nâng cấp nhà.`, { icon: 'coin' });
        toast(`Nhà đã lên <b>cấp ${next.level}: ${next.name}</b>.`, { icon: 'home', ms: 6000 });
        m.close();
      }
    });
  }

  /* ---------- Nhật ký ---------- */
  function journalHTML() {
    const S = B.S, tab = ui.journalTab;
    let html = `<div class="seg">${[['mem', 'Kỷ niệm'], ['tre', 'Kho báu'], ['gen', 'Các thế hệ']].map((t) => `<button data-jtab="${t[0]}" class="${t[0] === tab ? 'on' : ''}">${t[1]}</button>`).join('')}</div>`;
    if (tab === 'mem') {
      const list = S.memories.filter((m) => m.gen === S.bun.gen).slice().reverse();
      html += list.length ? `<ul class="mems">${list.map((m) => `<li><span class="mem-ic">${ic(m.icon)}</span><div><strong>${esc(m.title)}</strong><p>${esc(m.text)}</p><small>${U.fmtDateTime(m.at)}</small></div></li>`).join('')}</ul>` : '<p class="empty">Chưa có kỷ niệm nào. Hãy hoàn thành việc đầu tiên, hoặc chơi với Bun một lúc.</p>';
    } else if (tab === 'tre') {
      html += `<p class="hint" style="margin:0 0 10px">Thỉnh thoảng Bun tha về một món đồ nhỏ. Đã tìm thấy ${S.treasures.length}/${B.TREASURES.length}.</p><div class="treasures">${B.TREASURES.map((t) => {
        const f = S.treasures.indexOf(t.id) >= 0;
        return `<div class="treasure ${f ? '' : 'unknown'}">${A.treasure(t.id, f)}<strong>${f ? t.name : 'Chưa tìm thấy'}</strong>${f ? `<small>${t.text}</small>` : ''}</div>`;
      }).join('')}</div>`;
    } else {
      html += `<div class="gen-card">${A.avatar(S.bun.outfit)}<div><strong>${esc(S.bun.name)} đời thứ ${S.bun.gen}</strong><p>Đang ở cùng bạn, ngày thứ ${B.gen.daysTogether()}.</p><div class="tags">${B.traits().map((t) => `<span>${t.name}</span>`).join('')}</div></div></div>`;
      html += S.generations.slice().reverse().map((g) => `<div class="gen-card">${A.avatar(g.outfit)}<div><strong>${esc(g.name)} đời thứ ${g.gen}</strong>
        <p>${U.fmtDateTime(g.bornAt)} đến ${U.fmtDateTime(g.endedAt)} · ${g.days} ngày bên nhau</p><p>${g.tasks} việc đã cùng hoàn thành · mức thân thiết: ${esc(g.bond)}</p>
        <div class="tags">${(g.traits || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>${g.highlights && g.highlights.length ? `<ul>${g.highlights.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>`).join('');
      if (!S.generations.length) html += '<p class="hint">Những thế hệ trước sẽ được lưu giữ ở đây cùng kỷ niệm của mình.</p>';
    }
    return html;
  }
  function openJournal() {
    const m = modal({ title: 'Nhật ký của Bun', cls: 'wide' });
    const draw = () => m.render(journalHTML());
    draw();
    m.body.addEventListener('click', (e) => { const t = e.target.closest('[data-jtab]'); if (t) { ui.journalTab = t.dataset.jtab; draw(); } });
  }

  /* ---------- Hồ sơ Bun ---------- */
  function openProfile() {
    const S = B.S, st = S.bun.stats, bond = B.bond(S.bun.bondXp), c = S.bun.counters, limit = B.DIFF[S.settings.difficulty].limitH, mood = B.mood();
    const moodText = { happy: 'Đang rất vui', ok: 'Bình yên', needy: 'Đang đói hoặc khát', sad: 'Hơi buồn, muốn được chơi cùng', sleepy: 'Buồn ngủ' }[mood];
    const m = modal({ title: 'Hồ sơ của Bun', cls: 'wide', html: `<div class="profile"><div>${A.portrait(S.bun.outfit, 'sit', mood === 'sad' ? 'sad' : 'happy')}</div><div>
      <label class="hint" for="bunName" style="margin:0 0 4px;display:block">Tên gọi</label><input type="text" id="bunName" maxlength="16" value="${esc(S.bun.name)}">
      <p style="margin-top:8px">Đời thứ ${S.bun.gen} · ngày thứ ${B.gen.daysTogether()} bên nhau · ${moodText}</p>
      <strong style="font-family:var(--font-h)">Thân thiết: ${bond.name}</strong><div class="meter" style="--v:${Math.round(bond.pct * 100)}"><i></i></div>
      <div class="tags">${B.traits().map((t) => `<span title="${t.desc}">${t.name}</span>`).join('')}</div>
      <div class="kv">${STAT_DEFS.map((d) => `<span style="color:${d[3]};display:grid">${ic(d[1])}</span><span><span style="font-size:12.5px">${d[2]}</span><div class="meter" style="--v:${Math.round(st[d[0]])};--c:${d[3]}"><i></i></div></span><b>${Math.round(st[d[0]])}%</b>`).join('')}</div>
      <div class="facts"><div><b>${c.tasks}</b> việc cùng hoàn thành</div><div><b>${c.focusMin}</b> phút ngồi cùng</div><div><b>${c.pet}</b> lần vuốt ve</div><div><b>${c.play}</b> lần chơi đùa</div><div><b>${c.feed}</b> bữa ăn</div><div><b>${S.tickets}</b> vé xe về nhà</div></div>
      <p class="hint">${B.rest.activeAt(B.now()) ? 'Bà đang trông Bun, mọi chỉ số được giữ ổn định.' : limit ? `Lần chăm sóc gần nhất: ${U.fmtAway(B.now() - S.lastCareAt)} trước. Nếu vắng quá ${limit} giờ, Bun sẽ về quê ở với ông bà.` : 'Chế độ Thong thả: Bun luôn ở đây chờ bạn.'}</p>
    </div></div>` });
    const inp = $('#bunName', m.body);
    inp.addEventListener('change', () => { const v = inp.value.trim().slice(0, 16); if (v) { S.bun.name = v; B.store.save(); B.emit('change'); } });
  }

  /* ---------- Cài đặt ---------- */
  function hourLabel(h) { return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`; }
  function settingsHTML() {
    const S = B.S, r = S.settings.rest, restOn = B.rest.activeAt(B.now());
    return `<div class="set-sec"><h3>Nhịp độ chăm sóc</h3><p>Chọn mức phù hợp với cuộc sống của bạn. Có thể đổi bất cứ lúc nào.</p>
        <div class="opts">${Object.keys(B.DIFF).map((k) => `<button class="opt ${S.settings.difficulty === k ? 'on' : ''}" data-diff="${k}"><strong>${B.DIFF[k].label}</strong><small>${B.DIFF[k].desc}</small></button>`).join('')}</div></div>
      <div class="set-sec"><h3>Chế độ nghỉ</h3><p>Khi bạn bận, đi xa hoặc cần nghỉ, bà sẽ sang trông Bun. Chỉ số được giữ ổn định, chuỗi ngày không bị đứt.</p>
        ${restOn ? `<div class="row"><span class="tags"><span>Bà đang trông Bun${r.until ? ` đến ${U.fmtDateTime(r.until)}` : ''}</span></span><span class="grow"></span><button class="btn primary sm" data-rest="off">Mình về rồi</button></div>`
        : `<div class="row"><select id="restDays" aria-label="Thời gian nghỉ"><option value="0">Đến khi mình quay lại</option><option value="1">1 ngày</option><option value="3">3 ngày</option><option value="7">7 ngày</option><option value="14">14 ngày</option></select><span class="grow"></span><button class="btn soft sm" data-rest="on">Nhờ bà trông Bun</button></div>`}</div>
      <div class="set-sec"><h3>Sao lưu dữ liệu</h3><p>Dữ liệu được lưu ngay trong trình duyệt của máy này. Hãy xuất một tệp sao lưu thỉnh thoảng, nhất là trước khi xóa dữ liệu trình duyệt hoặc đổi máy.</p>
        <div class="row"><button class="btn soft sm" data-export>${ic('download')}Xuất tệp sao lưu</button><button class="btn soft sm" data-import>${ic('upload')}Nhập từ tệp</button></div></div>
      <div class="set-sec"><h3>Hiển thị</h3>
        <label for="hourPrev" style="font-size:13.5px">Xem thử ánh sáng trong ngày: <b id="hourLbl">${B.time.preview != null ? hourLabel(B.time.preview) : 'giờ thật'}</b></label>
        <input type="range" id="hourPrev" min="0" max="23.75" step="0.25" value="${B.time.preview != null ? B.time.preview : B.time.hour().toFixed(2)}">
        <div class="row" style="margin:6px 0 10px"><select id="wxPrev" aria-label="Xem thử thời tiết"><option value="">Thời tiết tự nhiên</option><option value="clear" ${B.time.weatherPreview === 'clear' ? 'selected' : ''}>Trời quang</option><option value="cloudy" ${B.time.weatherPreview === 'cloudy' ? 'selected' : ''}>Nhiều mây</option><option value="rain" ${B.time.weatherPreview === 'rain' ? 'selected' : ''}>Mưa</option></select><button class="btn ghost sm" data-realtime>Về giờ thật</button></div>
        <label class="check"><input type="checkbox" id="reduceMotion" ${S.settings.reduceMotion ? 'checked' : ''}>Giảm chuyển động</label></div>
      <div class="set-sec"><h3>Bắt đầu lại</h3><p>Xóa toàn bộ dữ liệu trên máy này: công việc, xu, đồ đạc, kỷ niệm và mọi thế hệ Bun.</p><button class="btn ghost sm" data-reset style="color:#C0483E">${ic('trash')}Xóa toàn bộ dữ liệu</button></div>`;
  }
  function doExport() {
    B.store.saveNow();
    const blob = new Blob([B.store.exportText()], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hien-nha-bun-${B.time.today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Đã xuất tệp sao lưu vào thư mục Tải xuống.', { icon: 'download' });
  }
  function importFromText(text) {
    let s;
    try { s = B.store.parseImport(text); } catch (err) { return toast(esc(err.message), { icon: 'x', ms: 6000 }); }
    confirmBox('Nhập dữ liệu từ tệp?', `Tệp này có ${s.tasks.length} việc đang mở, ${s.coins || 0} xu, Bun đời thứ ${(s.bun && s.bun.gen) || 1}. Dữ liệu hiện tại trên máy sẽ bị thay thế.`, 'Thay thế', true).then((ok) => {
      if (!ok) return;
      if (B.store.applyImport(s)) { B.skipSave = true; location.reload(); } else toast('Không lưu được dữ liệu vừa nhập.', { icon: 'x' });
    });
  }
  function openSettings() {
    const m = modal({ title: 'Cài đặt', onClose() { /* giữ nguyên chế độ xem thử cho tới khi bấm "Về giờ thật" */ } });
    const draw = () => m.render(settingsHTML());
    draw();
    m.body.addEventListener('click', (e) => {
      const t = e.target, d = t.closest('[data-diff]'), rest = t.closest('[data-rest]');
      if (d) { B.S.settings.difficulty = d.dataset.diff; B.S.lastCareAt = Math.max(B.S.lastCareAt, B.now() - 24 * HOUR); B.store.save(); B.emit('change'); return draw(); }
      if (rest) {
        if (rest.dataset.rest === 'on') { B.rest.set(true, +$('#restDays', m.body).value || 0); toast('Bà đã sang trông Bun. Bạn cứ yên tâm nghỉ ngơi.', { icon: 'heart' }); B.bun.sayCat('rest', 5000); }
        else { B.rest.set(false); toast('Mừng bạn về. Bà đã chăm Bun rất chu đáo.', { icon: 'home' }); }
        B.scene.build();
        return draw();
      }
      if (t.closest('[data-export]')) return doExport();
      if (t.closest('[data-import]')) return $('#importFile').click();
      if (t.closest('[data-realtime]')) { B.time.preview = null; B.time.weatherPreview = null; B.scene.updateLight(); renderHud(); return draw(); }
      if (t.closest('[data-reset]')) confirmBox('Xóa toàn bộ dữ liệu?', 'Mọi thứ sẽ trở về ngày đầu tiên và không thể khôi phục, trừ khi bạn đã xuất tệp sao lưu.', 'Xóa hết', true).then((ok) => { if (ok) { B.skipSave = true; B.store.reset(); location.reload(); } });
    });
    m.body.addEventListener('input', (e) => {
      if (e.target.id === 'hourPrev') { B.time.preview = +e.target.value; $('#hourLbl', m.body).textContent = hourLabel(B.time.preview); B.scene.updateLight(); renderHud(); }
    });
    m.body.addEventListener('change', (e) => {
      if (e.target.id === 'wxPrev') { B.time.weatherPreview = e.target.value || null; B.scene.updateLight(); renderHud(); }
      if (e.target.id === 'reduceMotion') { B.S.settings.reduceMotion = e.target.checked; B.store.save(); B.applyMotion(); }
    });
  }

  /* ---------- Nghi thức sáng, tối ---------- */
  function openSummary() {
    const S = B.S, s = B.tasks.summary(), tips = B.tasks.suggestions(s), pct = Math.round(s.rate * 100), h = B.time.hour(), late = h >= 19 || h < 4;
    const line = !s.total ? 'Một ngày thong thả cũng là một ngày tốt.' : pct === 100 ? 'Bạn đã làm xong tất cả. Bun rất tự hào.' : pct >= 60 ? 'Một ngày khá ổn. Phần còn lại để mai làm tiếp.' : 'Có ngày chậm một chút cũng không sao. Mai mình thử lại.';
    const m = modal({ title: 'Tổng kết hôm nay', html: `<div class="sum-top"><div class="ring" style="--p:${pct}"><span>${pct}<small>%</small></span></div><div><strong style="font:700 17px var(--font-h);color:var(--brown-d)">${s.done}/${s.total} việc hoàn thành</strong><p style="margin:2px 0 0">${line}</p></div></div>
      <div class="sum-grid"><div class="card"><b>${s.am[0]}/${s.am[1]}</b><span>Ca sáng</span></div><div class="card"><b>${s.pm[0]}/${s.pm[1]}</b><span>Ca chiều tối</span></div><div class="card"><b>${s.coins}</b><span>Xu kiếm được</span></div></div>
      <h3 class="sec-title" style="margin-top:0">Gợi ý cho ngày mai</h3><ul class="tips">${tips.map((t) => `<li>${ic('arrow')}<span>${esc(t)}</span></li>`).join('') || `<li>${ic('arrow')}<span>Cứ giữ nhịp như hôm nay.</span></li>`}</ul>
      <div class="col-btns"><button class="btn soft" data-plan>${ic('list')}Lên kế hoạch ngày mai</button>
        ${S.day.eveningDone ? '<p class="hint" style="margin:0;text-align:center">Bạn đã chúc Bun ngủ ngon hôm nay rồi.</p>' : `<button class="btn primary" data-night data-autofocus>${ic('moon')}${late ? 'Tắt đèn, chúc Bun ngủ ngon' : 'Ghi vào nhật ký hôm nay'} (+5 xu)</button>`}</div>` });
    m.body.addEventListener('click', (e) => {
      if (e.target.closest('[data-plan]')) { m.close(); setTab('tomorrow'); }
      if (e.target.closest('[data-night]')) {
        if (B.tasks.eveningRitual()) { toast('Đã ghi một trang nhật ký cho hôm nay. Thưởng 5 xu.', { icon: 'book' }); B.scene.updateLight(); B.bun.goodnight(); }
        m.close();
      }
    });
  }
  function doMorning() {
    if (!B.tasks.morningRitual()) return false;
    B.scene.updateLight(); B.bun.morning();
    toast('Chào buổi sáng. Rèm đã mở, thưởng 5 xu.', { icon: 'sun' });
    return true;
  }
  function openMorning() {
    const S = B.S;
    if (S.day.morningDone || ui.morningShown || ui.modals.length) return;
    ui.morningShown = true;
    const y = S.history[U.addDays(B.time.today(), -1)], list = B.tasks.list(B.time.today());
    const m = modal({ title: 'Chào buổi sáng', html: `<div class="hello">${A.avatar(S.bun.outfit)}<div><p>${y && y.total ? `Hôm qua bạn xong ${y.done}/${y.total} việc.` : 'Một ngày mới bắt đầu.'} ${list.length ? `Hôm nay có ${list.length} việc đang chờ:` : 'Hôm nay chưa có kế hoạch. Thử chọn ba việc chính nhé.'}</p>
        ${list.length ? `<ol class="plain-list">${list.slice(0, 4).map((t) => `<li>${esc(t.title)}</li>`).join('')}${list.length > 4 ? `<li>và ${list.length - 4} việc nữa</li>` : ''}</ol>` : ''}</div></div>
      <div class="row end"><button class="btn ghost" data-close>Để sau</button><button class="btn primary" data-open data-autofocus>${ic('sun')}Kéo rèm đón ngày mới (+5 xu)</button></div>` });
    m.body.addEventListener('click', (e) => { if (e.target.closest('[data-open]')) { m.close(); doMorning(); } });
  }
  function openIntro() {
    const S = B.S;
    const m = modal({ title: 'Chào mừng đến Hiên Nhà Bun', locked: true, html: `<div class="hello">${A.avatar(S.bun.outfit)}<div><p>Đây là Bun, và đây là căn phòng nhỏ của hai bạn. Mỗi khi bạn làm tốt hơn một chút, cuộc sống của Bun cũng tốt hơn một chút.</p></div></div>
      <ul class="tips"><li>${ic('check')}<span>Ghi việc cần làm vào sổ bên cạnh. Xong việc thì được xu, việc quan trọng được nhiều hơn.</span></li>
        <li>${ic('food')}<span>Dùng xu để cho Bun ăn, mua đồ và sửa sang căn nhà. Bấm vào Bun để vuốt ve.</span></li>
        <li>${ic('sun')}<span>Căn phòng chạy theo giờ thật: nắng sáng, đèn tối, và Bun đi ngủ khi đêm xuống.</span></li></ul>
      <div class="row end"><button class="btn primary" data-go data-autofocus>Vào nhà thôi</button></div>` });
    m.body.addEventListener('click', (e) => {
      if (!e.target.closest('[data-go]')) return;
      S.seenIntro = true;
      B.mem.add({ key: 'first_day', icon: 'home', title: 'Ngày đầu tiên', text: 'Bun bước vào căn phòng nhỏ, ngửi khắp các góc rồi chọn chiếc hộp các-tông làm giường.' });
      B.store.save(); m.close();
      B.bun.sayCat('day', 4500);
    });
  }
  function openAway() {
    if (ui.awayOpen) return;
    ui.awayOpen = true;
    const S = B.S, name = esc(S.bun.name), has = S.tickets > 0;
    const m = modal({ cls: 'letter-m', wrapCls: 'letter', locked: true, label: 'Thư từ quê', html: `<h2>Một lá thư từ quê</h2>
      <p>Bạn vắng nhà hơi lâu, nên ông bà đã đón ${name} về quê ở cùng. Ở đó có vườn rộng, có nắng, và ${name} đang rất vui.</p>
      <p>Căn nhà vẫn ở đây, mọi món đồ vẫn nguyên chỗ cũ. Không ai trách bạn cả, ai cũng có những ngày bận.</p>
      <div class="facts"><div><b>${B.gen.daysTogether()}</b> ngày bên nhau</div><div><b>${S.bun.counters.tasks}</b> việc cùng hoàn thành</div></div>
      <div class="col-btns">${has ? `<button class="btn primary" data-ticket data-autofocus>${ic('ticket')}Dùng vé xe đón ${name} về (còn ${S.tickets} vé)</button>` : ''}
        <button class="btn ${has ? 'soft' : 'primary'}" data-next>${ic('paw')}Đón Bun thế hệ tiếp theo</button></div>
      <p class="hint">Kỷ niệm của ${name} đời thứ ${S.bun.gen} luôn được giữ trong Nhật ký. Nếu hay bận, bạn có thể bật Chế độ nghỉ hoặc chọn nhịp Thong thả trong Cài đặt.</p>` });
    m.body.addEventListener('click', (e) => {
      const tk = e.target.closest('[data-ticket]'), nx = e.target.closest('[data-next]');
      if (!tk && !nx) return;
      if (tk) B.gen.useTicket(); else B.gen.next();
      ui.awayOpen = false; m.close();
      B.scene.build(); renderAll();
      B.bun.welcome(tk ? 72 * HOUR : 13 * HOUR);
      toast(tk ? `${name} đã về nhà. Còn ${S.tickets} vé xe.` : `${name} đời thứ ${S.bun.gen} đã về nhà. Một hành trình mới bắt đầu.`, { icon: 'home', ms: 6500 });
    });
  }

  /* ---------- Quà bất ngờ ---------- */
  function surprise() {
    const S = B.S, now = B.now(), bs = B.bun.state;
    if (S.bun.away || S.focus || ui.modals.length || now - S.lastSurprise < 4 * HOUR || bs.pose === 'sleep' || bs.busy) return false;
    S.lastSurprise = now;
    const pool = B.TREASURES.filter((t) => S.treasures.indexOf(t.id) < 0);
    if (pool.length && Math.random() < 0.55) {
      const t = U.pick(pool);
      S.treasures.push(t.id);
      B.mem.add({ icon: 'gift', title: `Kho báu: ${t.name}`, text: t.text });
      B.bun.gift();
      toast(`Bun tha về <b>${t.name}</b>. ${t.text}`, { icon: 'gift', ms: 7500 });
    } else {
      const c = Math.round(U.rand(5, 12));
      B.earn(c); B.bun.gift();
      toast(`Bun tìm thấy <b>${c} xu</b> dưới tấm thảm.`, { icon: 'coin', ms: 6000 });
    }
    B.store.save(); B.emit('change'); B.ach.check();
    return true;
  }

  /* ---------- Khởi tạo ---------- */
  function renderAll() { renderHud(); renderActions(); renderTabs(); renderFocus(); }
  function init() {
    renderAll();
    $('#panel').addEventListener('click', onPanelClick);
    $('#panel').addEventListener('input', (e) => { B.planui.onInput(e); if (B.focusui) B.focusui.onInput(e); });
    $('#panel').addEventListener('change', (e) => { if (B.focusui) B.focusui.onInput(e); });
    $('#panel').addEventListener('keydown', (e) => B.planui.onKey(e));
    $('#panel').addEventListener('submit', (e) => { e.preventDefault(); if (e.target.matches('[data-form]')) B.planui.submitForm(); else if (B.focusui) B.focusui.onSubmit(e); });
    B.planui.bindDrag($('#panel'));
    $('#actions').addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a !== 'feed') closePopover();
      if (a === 'feed') openFeed(); else if (a === 'water') doWater(); else if (a === 'play') doPlay(); else if (a === 'pet') B.bun.pet(); else if (a === 'call') B.bun.call(); else if (a === 'focus') openFocus();
    });
    $('#popover').addEventListener('click', (e) => { const f = e.target.closest('[data-food]'); if (f) doFeed(f.dataset.food); });
    $('#svgActors').addEventListener('click', closePopover);
    $('#btnShop').addEventListener('click', () => openShop());
    $('#btnJournal').addEventListener('click', openJournal);
    $('#btnSettings').addEventListener('click', openSettings);
    $('#btnProfile').addEventListener('click', openProfile);
    $('#focusBar').addEventListener('click', (e) => { if (e.target.closest('[data-stopfocus]')) confirmBox('Dừng phiên tập trung?', 'Phiên dừng giữa chừng sẽ không được tính thưởng, nhưng cũng không bị trừ gì cả.', 'Dừng', false).then((ok) => ok && B.focus.cancel()); });
    $('#notice').addEventListener('click', () => ($('#notice').hidden = true));
    $('#importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => importFromText(String(rd.result));
      rd.onerror = () => toast('Không đọc được tệp.', { icon: 'x' });
      rd.readAsText(file);
      e.target.value = '';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('#popover').hidden) return closePopover();
      const top = ui.modals[ui.modals.length - 1];
      if (top) { if (!top.locked) top.close(); } else if (B.planui.state.form || B.planui.state.menu) { B.planui.state.form = null; B.planui.state.menu = null; renderTabs(); }
    });
    B.on('tasks', () => { renderTabs(); renderHud(); B.scene.updateJar(); });
    B.on('change', renderHud);
    B.on('windowTap', () => { const h = B.time.hour(); if (!B.S.day.morningDone && h >= 4 && h < 12 && B.time.preview == null) doMorning(); });
    B.on('achievement', (a) => toast(`Thành tích mới: <b>${a.name}</b><br><small>${B.ach.rewardText(a)}</small>`, { icon: 'star', ms: 6500 }));
    B.on('bondUp', (b) => toast(`Mức thân thiết mới với Bun: <b>${b.name}</b>.`, { icon: 'heart', ms: 5500 }));
    B.on('saveError', () => toast('Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy hoặc đang bị chặn.', { icon: 'x', ms: 8000 }));
    B.on('restEnded', () => { toast('Kỳ nghỉ đã hết, bà vừa về. Bun đang chờ bạn.', { icon: 'home', ms: 6000 }); B.scene.build(); });
  }

  B.ui = { init, toast, notice, modal, confirm: confirmBox, floatText, closePopover, renderAll, renderHud, renderTabs, renderFocus, renderActions, setTab, openShop, openJournal, openSettings, openProfile, openSummary, openMorning, openIntro, openAway, openFocus, surprise, importFromText, state: ui };
})();
