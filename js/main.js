/* Hiên Nhà Bun — khởi động, vòng lặp thời gian, kết nối các phần */
(function () {
  'use strict';
  const B = window.B, U = B.util;
  const HOUR = 3600000;
  let hiddenAt = 0;

  B.applyMotion = () => {
    const sys = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('reduce-motion', !!(B.S.settings.reduceMotion || sys));
  };

  function awayText(ms, before) {
    const st = B.S.bun.stats, bits = [];
    if (B.rest.activeAt(B.now())) bits.push('Bà đã trông Bun giúp bạn.');
    else {
      if (ms > 5 * HOUR) bits.push('Bun đã ngủ một giấc ngon.');
      if (before.hunger - st.hunger > 25) bits.push('Bát hạt đã vơi nhiều.');
      if (before.thirst - st.thirst > 25) bits.push('Bát nước gần cạn.');
      if (!bits.length) bits.push('Bun vẫn ổn và đang chờ bạn.');
    }
    return bits.join(' ');
  }

  // Nhịp chạy định kỳ: tiến đồng hồ mô phỏng, kiểm tra sang ngày, cập nhật ánh sáng
  function tick() {
    const S = B.S, now = B.now();
    B.sim.advance(now);
    S.lastSeen = now;
    B.tasks.ensureDay();
    B.focus.tick();
    if (S.bun.away) B.ui.openAway();
    B.scene.updateLight(); B.scene.updateBowls();
    B.ui.renderHud(); B.bun.refresh();
    if (!document.hidden && B.planui.shouldOpenNoon()) B.planui.openNoon();
    if (B.worldui) B.worldui.tick();
    B.store.save();
  }

  function boot() {
    B.store.load();
    const S = B.S, now = B.now();
    const away = Math.max(0, now - (S.lastSeen || now)), before = Object.assign({}, S.bun.stats);
    if (B.isFirstRun) S.lastSurprise = now;
    B.applyMotion();
    B.sim.advance(now);
    B.tasks.ensureDay();
    const focusDone = B.focus.tick();
    S.lastSeen = now;
    B.store.saveNow();

    // Lịch còn lại của hôm nay luôn được tính lại từ thời điểm mở ứng dụng
    if (!S.focus) B.plan.rebuild();
    document.body.classList.toggle('focus-mode', !!(S.focus && S.focus.kind !== 'break'));
    B.scene.build();
    B.bun.init();
    if (B.friends) B.friends.init();
    B.ui.init();
    if (B.focusui) B.focusui.init();
    if (B.worldui) B.worldui.init();
    if (B.walk) B.walk.init();
    if (B.room) B.room.init();
    if (B.audio) B.audio.init();

    B.on('taskDone', (info) => { B.bun.celebrate(info); B.scene.updateJar(); });
    B.on('house', (d) => {
      B.scene.build();
      if (!d.bought && !d.level) return;
      const sp = B.scene.spots(), slot = d.item && d.item.slot;
      if (d.level) B.bun.cheer('newHome');
      else if (B.WEAR_SLOTS.indexOf(slot) >= 0) B.bun.cheer('newWear');
      else B.bun.cheer('newItem', slot === 'bed' ? { x: sp.bed.x - 150, y: sp.bed.y + 30 } : slot === 'rug' ? sp.rug : sp.front);
    });
    B.on('focus', (d) => {
      B.ui.renderFocus(); B.ui.renderActions();
      document.body.classList.toggle('focus-mode', !!(B.S.focus && B.S.focus.kind !== 'break'));
      if (B.ui.state.tab === 'focus') B.ui.renderTabs();
      if (d.type === 'start') {
        if (d.kind === 'break') { B.bun.sayCat('focusEnd', 3500); return; }
        B.bun.focusStart();
        if (B.focusui) B.ui.setTab('focus');
      } else if (d.type === 'cancel') { if (d.kind !== 'break') B.bun.focusEnd(false); }
      else if (d.type === 'breakEnd') {
        const t = d.taskId && B.tasks.get(d.taskId);
        if (t && !t.done) B.ui.confirm('Hết giờ nghỉ', `Làm tiếp "${U.esc(t.title)}" chứ?`, 'Làm tiếp', false).then((ok) => ok && B.planui.startBlock(t, d.stepId));
        else B.ui.toast('Hết giờ nghỉ rồi. Sẵn sàng cho khối việc tiếp theo chưa?', { icon: 'timer', ms: 6000 });
      } else if (d.type === 'done') {
        if (d.silent) return;
        B.bun.focusEnd(true);
        const t = d.taskId && B.tasks.get(d.taskId);
        B.ui.toast(`Xong phiên ${d.minutes} phút${t ? ` cho việc "${U.esc(t.title)}"` : ''}. ${d.coins ? `Thưởng ${d.coins} xu.` : d.minutes < 5 ? '' : 'Hôm nay đã đạt mức thưởng tập trung tối đa.'}`, { icon: 'timer', ms: 7000 });
        if (d.timeUp) setTimeout(() => B.planui.openTimeUp(d.taskId, d.stepId), 600);
      }
    });
    B.on('newDay', () => { B.scene.updateLight(); B.scene.updateJar(); B.ui.state.morningShown = false; B.ui.renderAll(); });

    // Chào đón khi mở ứng dụng
    if (S.bun.away) B.ui.openAway();
    else {
      B.bun.welcome(B.isFirstRun ? 4 * HOUR : away);
      if (!S.seenIntro) B.ui.openIntro();
      else {
        if (away > 30 * 60000) B.ui.notice(`Bạn đi vắng ${U.fmtAway(away)}`, awayText(away, before));
        const h = B.time.hour();
        if (h >= 5 && h < 12 && !S.day.morningDone) setTimeout(B.ui.openMorning, 1800);
        else setTimeout(() => { if (B.planui.shouldOpenNoon()) B.planui.openNoon(); }, 2200);
      }
      if (focusDone) B.ui.toast(`Phiên tập trung ${focusDone.minutes} phút đã hoàn thành trong lúc bạn vắng. ${focusDone.coins ? `Thưởng ${focusDone.coins} xu.` : ''}`, { icon: 'timer', ms: 7000 });
      if (B.restoredFromBackup) B.ui.toast('Dữ liệu chính bị lỗi nên đã khôi phục từ bản sao lưu tự động gần nhất.', { icon: 'download', ms: 9000 });
    }

    setInterval(() => { if (B.S.focus) { B.ui.renderFocus(); B.focus.tick(); } }, 1000);
    setInterval(tick, 20000);
    setInterval(() => { if (!document.hidden && Math.random() < 0.3) B.ui.surprise(); }, 5 * 60000);
    setTimeout(() => { if (!B.isFirstRun && away > 4 * HOUR) B.ui.surprise(); }, 15000);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = B.now(); B.S.lastSeen = hiddenAt; if (!B.skipSave) B.store.saveNow(); return; }
      const gone = hiddenAt ? B.now() - hiddenAt : 0, prev = Object.assign({}, B.S.bun.stats);
      if (gone > 10 * 60000 && !B.S.focus) B.plan.rebuild();
      tick();
      B.ui.renderTabs(); B.ui.renderFocus();
      if (gone > 10 * 60000 && !B.S.bun.away) {
        B.bun.welcome(gone);
        if (gone > 30 * 60000) B.ui.notice(`Bạn đi vắng ${U.fmtAway(gone)}`, awayText(gone, prev));
      }
    });
    window.addEventListener('pagehide', () => { if (!B.skipSave) { B.S.lastSeen = B.now(); B.store.saveNow(); } });
    // Dựng lại cảnh khi khung nhìn đổi kích thước (kể cả khi lúc mở trang khung còn chưa có kích thước)
    let rz = null, lastSize = '';
    const onSize = () => {
      const r = document.getElementById('scene').getBoundingClientRect(), key = Math.round(r.width) + 'x' + Math.round(r.height);
      if (key === lastSize || r.width < 50 || r.height < 50) return;
      lastSize = key;
      clearTimeout(rz); rz = setTimeout(() => B.scene.build(), 160);
    };
    lastSize = (() => { const r = document.getElementById('scene').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); })();
    if (window.ResizeObserver) new ResizeObserver(onSize).observe(document.getElementById('scene'));
    window.addEventListener('resize', onSize);
    if (B.account) B.account.afterBoot();
  }

  // Trước khi dựng nhà: chọn khách hay tài khoản (cổng chào chỉ hiện với người mới hoặc sau khi đăng xuất)
  function start() {
    const go = () => { try { boot(); } catch (e) { console.error(e); } };
    if (!B.account) return go();
    B.account.boot().then(go, (e) => { console.error(e); go(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
