/* Hiên Nhà Bun — Bun sống trong phòng: tự đi lại, ngủ, xin ăn, phản ứng với người dùng */
(function () {
  'use strict';
  const B = window.B, U = B.util, A = B.art;
  const HOUR = 3600000;
  let el = null, flipEl = null, innerEl = null, fxG = null, bubble = null, last = 0, started = false;
  const st = { x: 500, y: 700, dir: 1, pose: 'stand', target: null, run: false, then: null, busy: false, until: 0, seq: 0, napping: false, wakeUntil: 0, cool: {}, bubbleUntil: 0, eyes: null, eyesUntil: 0, placedY: -1 };

  const pnow = () => performance.now();
  const reduce = () => document.documentElement.classList.contains('reduce-motion');
  const Lay = () => B.scene.layout();
  const isNight = () => { const h = B.time.hour(); return h >= 22.5 || h < 6 || (B.S.day.eveningDone && h >= 19); };
  // Tốc độ đi theo tâm trạng: đói, buồn, căng thẳng thì chậm hẳn lại
  // Tiếng động gắn đúng với hành động của Bun (kênh tiếng thú cưng hoặc tiếng tương tác)
  const snd = (n) => { if (B.audio) B.audio.play(n); };
  const moodSpeed = () => { const m = B.mood(); return m === 'needy' ? 0.5 : m === 'hungry' || m === 'stressed' ? 0.62 : m === 'sad' ? 0.72 : 1; };
  const cool = (key, ms) => { const t = pnow(); if (st.cool[key] && t < st.cool[key]) return false; st.cool[key] = t + ms; return true; };

  /* ---------- Gắn vào cảnh ---------- */
  function bind() {
    el = document.getElementById('bun');
    if (!el) return;
    flipEl = el.querySelector('.bun-flip'); innerEl = el.querySelector('.bun-inner'); fxG = el.querySelector('.bun-fx');
    fxG.innerHTML = '<g class="fx-zzz"><text class="z z1" x="0" y="0">z</text><text class="z z2" x="14" y="-18">z</text><text class="z z3" x="30" y="-40">Z</text></g>';
    const f = Lay().floor;
    st.x = U.clamp(st.x, f.x1, f.x2); st.y = U.clamp(st.y, f.y1, f.y2);
    if (st.target) { st.target.x = U.clamp(st.target.x, f.x1, f.x2); st.target.y = U.clamp(st.target.y, f.y1, f.y2); }
    st.placedY = -1;
    el.dataset.pose = st.pose;
    el.style.display = B.S.bun.away ? 'none' : '';
    applyTransform(); applyFace();
  }
  function scaleAt(y) {
    const f = Lay().floor;
    return 0.74 + ((y - f.y1) / (f.y2 - f.y1)) * 0.22;
  }
  function applyTransform() {
    if (!el) return;
    // Bun lớn dần theo cân nặng, tròn hoặc gầy theo thể trạng
    const sh = B.nutri ? B.nutri.shape() : { size: 1, wide: 1 }, sc = scaleAt(st.y) * sh.size;
    el.setAttribute('transform', `translate(${st.x.toFixed(1)},${st.y.toFixed(1)}) scale(${(sc * sh.wide).toFixed(3)},${sc.toFixed(3)})`);
    flipEl.style.transform = `scaleX(${st.dir})`;
    const z = fxG.firstElementChild;
    if (z) z.setAttribute('transform', `translate(${st.dir * 78},-74)`);
    if (Math.abs(st.y - st.placedY) > 1.5) { st.placedY = st.y; B.scene.placeBun(st.y); }
  }
  function setPose(p) {
    st.pose = p;
    if (el) el.dataset.pose = p;
    B.S.bun.asleep = p === 'sleep';
    applyFace();
  }
  function applyFace() {
    if (!el) return;
    const mood = B.mood(), t = pnow();
    el.dataset.mood = mood;
    const sleeping = st.pose === 'sleep';
    el.dataset.eyes = sleeping ? 'closed' : st.eyes && t < st.eyesUntil ? st.eyes : 'open';
    const low = mood === 'sad' || mood === 'hungry' || mood === 'stressed' || mood === 'needy';
    el.dataset.mouth = sleeping ? 'calm' : low ? 'sad' : mood === 'sleepy' || st.pose === 'lie' ? 'calm' : 'open';
    if (st.eyes === 'happy' && t < st.eyesUntil && !sleeping) el.dataset.mouth = 'open';
    // Đói, buồn hay căng thẳng: đuôi thôi vẫy, bước chân chậm và nặng nề hơn
    el.classList.toggle('wag', !sleeping && (mood === 'happy' || mood === 'ok'));
    el.classList.toggle('slow', low);
  }

  /* ---------- Di chuyển ---------- */
  function goTo(x, y, opts) {
    opts = opts || {};
    const f = Lay().floor;
    st.target = { x: U.clamp(x, f.x1, f.x2), y: U.clamp(y, f.y1, f.y2) };
    st.run = !!opts.run; st.then = opts.then || null;
    if (st.pose !== 'stand') setPose('stand');
    el.classList.toggle('running', st.run); el.classList.toggle('walking', !st.run);
  }
  function stopMoving() {
    st.target = null; st.then = null;
    if (el) el.classList.remove('walking', 'running');
  }
  function frame(t) {
    const dt = Math.min(0.12, (t - last) / 1000);
    last = t;
    if (el && el.isConnected && !B.S.bun.away) {
      if (st.target) {
        const dx = st.target.x - st.x, dy = st.target.y - st.y, d = Math.hypot(dx, dy), sp = (st.run ? 340 : 100) * moodSpeed() * (reduce() ? 5 : 1);
        if (Math.abs(dx) > 2) st.dir = dx > 0 ? 1 : -1;
        if (d <= sp * dt) {
          st.x = st.target.x; st.y = st.target.y;
          const fn = st.then;
          stopMoving(); applyTransform();
          if (fn) fn();
        } else { st.x += (dx / d) * sp * dt; st.y += (dy / d) * sp * dt; applyTransform(); st.stepAcc = (st.stepAcc || 0) + sp * dt; if (st.stepAcc > (st.run ? 46 : 34)) { st.stepAcc = 0; snd(st.run ? 'run' : 'step'); } }
      } else if (!st.busy && t > st.until) decide();
      if (bubble && t < st.bubbleUntil) placeBubble();
      else if (bubble && bubble.classList.contains('on')) bubble.classList.remove('on');
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Kịch bản có thể ngắt ---------- */
  function script() {
    st.seq++; st.busy = true;
    stopMoving();
    if (innerEl) innerEl.classList.remove('jump');
    return st.seq;
  }
  const later = (tok, ms, fn) => setTimeout(() => { if (tok === st.seq && el) fn(); }, reduce() ? Math.min(ms, 900) : ms);
  function free(tok, idle) {
    if (tok !== st.seq) return;
    st.busy = false; st.until = pnow() + (idle == null ? 1200 : idle);
  }

  /* ---------- Hiệu ứng ---------- */
  function jump(times) {
    if (!innerEl || reduce()) return;
    innerEl.classList.remove('jump');
    void innerEl.getBoundingClientRect();
    innerEl.style.setProperty('--jumps', times || 1);
    innerEl.classList.add('jump');
    setTimeout(() => innerEl && innerEl.classList.remove('jump'), 480 * (times || 1) + 60);
  }
  function happy(ms) {
    st.eyes = 'happy'; st.eyesUntil = pnow() + ms;
    if (el) el.classList.add('wag-fast');
    applyFace();
    setTimeout(() => { if (el) el.classList.remove('wag-fast'); applyFace(); }, ms + 40);
  }
  function fx(html, life) {
    if (!fxG) return;
    fxG.insertAdjacentHTML('beforeend', html);
    const node = fxG.lastElementChild;
    setTimeout(() => node && node.remove(), life || 1400);
  }
  function hearts(n) {
    const top = st.pose === 'sleep' || st.pose === 'lie' ? -110 : -200;
    for (let i = 0; i < (n || 2); i++) fx(`<g transform="translate(${(U.rand(-46, 46) + st.dir * 40).toFixed(0)},${(top + U.rand(-16, 20)).toFixed(0)})"><path class="fx-heart" style="animation-delay:${i * 0.12}s" d="M0,7 C-12,-3 -7,-12 0,-6 C7,-12 12,-3 0,7Z"/></g>`, 1700);
  }
  function sparkles() {
    for (let i = 0; i < 5; i++) fx(`<g transform="translate(${U.rand(-90, 90).toFixed(0)},${U.rand(-220, -90).toFixed(0)})"><polygon class="fx-spark" style="animation-delay:${i * 0.09}s" points="${A.starPts(0, 0, U.rand(6, 10))}"/></g>`, 1500);
  }

  /* ---------- Lời nói ---------- */
  function placeBubble() {
    const s = scaleAt(st.y), topBy = { stand: 222, sit: 232, back: 226, lie: 176, sleep: 112, eat: 140 }[st.pose] || 220;
    const headX = { stand: 70, sit: 26, lie: 70, sleep: 84, eat: 90, back: 0 }[st.pose] || 0;
    const p = B.scene.toScreen(st.x + headX * st.dir * s, st.y - topBy * s), sw = bubble.parentElement.clientWidth, bw = bubble.offsetWidth;
    bubble.style.left = U.clamp(p.x, bw / 2 + 8, sw - bw / 2 - 8) + 'px';
    bubble.style.top = Math.max(bubble.offsetHeight + 8, p.y) + 'px';
  }
  function say(text, ms) {
    if (!bubble || !el || B.S.bun.away) return;
    bubble.textContent = text;
    bubble.classList.add('on');
    st.bubbleUntil = pnow() + (ms || 3800);
    placeBubble();
  }
  const sayCat = (cat, ms) => say(U.pick(B.LINES[cat] || ['Gâu!']), ms);

  /* ---------- Tự quyết định việc tiếp theo ---------- */
  function bedSpot() { return B.scene.spots().bed; }
  function habitHour(h) {
    const hrs = B.S.habit.hours, total = hrs.reduce((a, b) => a + b, 0), cur = hrs[Math.floor(h)] || 0;
    return total >= 6 && cur >= 3 && cur / total >= 0.18;
  }
  function sleepAt(spot) {
    if (st.pose === 'sleep' && Math.hypot(st.x - spot.x, st.y - spot.y) < 8) { st.until = pnow() + 15000; return; }
    goTo(spot.x, spot.y, { then() { st.dir = 1; applyTransform(); setPose('sleep'); st.until = pnow() + 15000; } });
  }
  function companion() {
    const sp = B.scene.spots().desk, pose = isNight() ? 'sleep' : 'lie';
    if (Math.hypot(st.x - sp.x, st.y - sp.y) > 8) goTo(sp.x, sp.y, { then() { st.dir = -1; applyTransform(); setPose(pose); st.until = pnow() + 8000; } });
    else { if (st.pose !== pose) setPose(pose); st.until = pnow() + 8000; }
  }
  function decide() {
    const S = B.S, s = S.bun.stats, h = B.time.hour(), sp = B.scene.spots(), t = pnow(), L = Lay(), f = L.floor;
    if (S.focus) return companion();
    if (isNight() && t > st.wakeUntil) return sleepAt(bedSpot());
    if (s.energy < 22) st.napping = true; else if (s.energy > 62) st.napping = false;
    if (st.napping && t > st.wakeUntil) return sleepAt(bedSpot());
    if (s.hunger < 28 && cool('begFood', 100000)) return beg('food');
    if (s.thirst < 28 && cool('begWater', 100000)) return beg('water');
    if (!S.day.habitSaid && habitHour(h)) {
      S.day.habitSaid = true;
      return goTo(sp.desk.x, sp.desk.y, { then() { setPose('sit'); sayCat('habit', 5000); st.until = pnow() + 14000; } });
    }
    const rainy = B.scene.weather() === 'rain', toys = S.house.owned.filter((id) => id.indexOf('toy_') === 0), c = S.bun.counters;
    const low = ['sad', 'hungry', 'stressed', 'needy'].indexOf(B.mood()) >= 0;
    // Khi đói hay buồn, Bun ít nghịch hơn: nằm một chỗ và ngồi chờ ở cửa nhiều hơn
    const opts = low ? [['wander', 12], ['sit', 16], ['rug', 26], ['window', 14], ['mope', 22], ['door', 10]] : [['wander', 30], ['sit', 13], ['rug', 14], ['window', rainy ? 24 : 10], ['front', c.pet >= 30 ? 20 : 10], ['door', h >= 16 && h < 19 ? 8 : 3], ['trick', 4]];
    if (toys.length && !low) opts.push(['toy', c.play >= 10 ? 18 : 9]);
    const pal = B.friends && B.friends.nearest();
    if (pal) opts.push(['friend', 16]);
    if (L.lvl >= 4 && B.scene.light().fireOn) opts.push(['fire', 16]);
    if (s.joy < 30) opts.push(['mope', 26]);
    let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), act = 'wander';
    for (const o of opts) { if ((r -= o[1]) <= 0) { act = o[0]; break; } }
    const wait = (a, b) => { st.until = pnow() + U.rand(a, b); };
    if (act === 'wander') goTo(U.rand(f.x1, f.x2), U.rand(f.y1 + 10, f.y2), { then: () => wait(1500, 4500) });
    else if (act === 'sit') { setPose('sit'); wait(6000, 12000); }
    else if (act === 'rug') goTo(sp.rug.x, sp.rug.y, { then() { setPose('lie'); wait(12000, 24000); } });
    else if (act === 'window') goTo(sp.window.x, sp.window.y, { then() { setPose('back'); if (cool('winSay', 60000) && Math.random() < 0.7) sayCat(rainy ? 'rain' : 'window'); wait(12000, 22000); } });
    else if (act === 'front') goTo(sp.front.x + U.rand(-120, 120), sp.front.y, { then() { setPose('sit'); wait(8000, 14000); } });
    else if (act === 'door') goTo(sp.door.x, sp.door.y, { then() { setPose('sit'); if (cool('doorSay', 240000)) sayCat('door'); wait(7000, 11000); } });
    else if (act === 'fire') goTo(sp.fire.x, sp.fire.y, { then() { setPose('lie'); wait(16000, 26000); } });
    else if (act === 'mope') goTo(sp.door.x - 40, sp.door.y + 20, { then() { setPose('lie'); if (cool('sadSay', 180000)) sayCat('sad'); wait(12000, 18000); } });
    else if (act === 'toy') {
      const pos = L.toys[U.pick(toys)] || sp.front;
      goTo(pos.x - 60, pos.y - 6, { then() { st.dir = 1; applyTransform(); jump(2); happy(1500); wait(3500, 6000); } });
    } else if (act === 'trick') spin();
    else if (act === 'friend') goTo(pal.x + (st.x < pal.x ? -100 : 100), pal.y + 4, { then() { st.dir = pal.x > st.x ? 1 : -1; applyTransform(); setPose(Math.random() < 0.5 ? 'sit' : 'lie'); hearts(1); happy(1600); B.friends.greeted(pal.id); if (cool('palSay', 90000)) say(`${pal.pet.name} ơi, chơi với tớ đi!`, 3600); wait(9000, 16000); } });
  }
  // Một người bạn vừa chạy tới chào
  function friendHello(pet) {
    if (!el || st.pose === 'sleep' || st.busy) return;
    happy(1800); hearts(1);
    if (cool('palHello', 120000)) say(`Chào ${pet.name}!`, 3000);
  }
  function walk() {
    if (!el) return;
    const tok = script(), d = B.scene.spots().door;
    st.wakeUntil = pnow() + 30000;
    goTo(d.x, d.y, { run: true, then() {
      el.style.visibility = 'hidden'; if (bubble) bubble.classList.remove('on');
      later(tok, 5200, () => { el.style.visibility = ''; setPose('stand'); jump(2); happy(2800); hearts(3); say('Đi dạo vui quá! Tớ ngửi được bao nhiêu là mùi.', 4500); later(tok, 2800, () => free(tok, 2000)); });
    } });
  }
  function beg(kind) {
    const sp = B.scene.spots()[kind];
    goTo(sp.x, sp.y, { then() { st.dir = -1; applyTransform(); setPose('sit'); sayCat(kind === 'food' ? 'hungry' : 'thirsty', 5000); st.until = pnow() + 9000; } });
  }
  function spin() {
    const tok = script();
    setPose('stand');
    let n = 0;
    const turn = () => { if (tok !== st.seq) return; st.dir = -st.dir; applyTransform(); if (++n < 6) setTimeout(turn, 140); else { jump(1); happy(1200); later(tok, 900, () => free(tok, 1500)); } };
    turn();
  }
  function zoomies(tok, laps, done) {
    const f = Lay().floor;
    const lap = (i) => { if (tok !== st.seq) return; if (i >= laps) return done(); goTo(i % 2 ? f.x1 + 60 : f.x2 - 60, U.rand(f.y1 + 30, f.y2 - 10), { run: true, then: () => lap(i + 1) }); };
    lap(0);
  }

  /* ---------- Phản ứng với người dùng ---------- */
  function pet() {
    if (!el || B.S.bun.away) return;
    B.careActions.pet();
    snd(st.pose === 'sleep' ? 'sleep' : B.mood() === 'happy' || B.mood() === 'ok' ? 'happy' : 'whine');
    if (st.pose === 'sleep') {
      const tok = script();
      setPose('lie'); st.eyes = 'closed'; st.eyesUntil = pnow() + 1200; applyFace();
      hearts(1); sayCat('petSleepy');
      st.wakeUntil = pnow() + 9000;
      later(tok, 1300, applyFace);
      later(tok, 5000, () => free(tok, 200));
      return;
    }
    hearts(3); happy(1500);
    if (cool('petSay', 5000)) sayCat('pet', 2600);
    if (!st.busy) {
      stopMoving();
      if (st.pose === 'stand' || st.pose === 'back') setPose('sit');
      st.until = pnow() + 3500;
    }
  }
  function call() {
    if (!el || B.S.bun.away) return;
    const tok = script();
    if (!(st.pose === 'sleep' && isNight())) snd('bark');
    if (st.pose === 'sleep' && isNight()) {
      setPose('lie'); sayCat('night'); st.wakeUntil = pnow() + 8000;
      later(tok, 5000, () => free(tok, 200));
      return;
    }
    const sp = B.scene.spots().front;
    st.wakeUntil = pnow() + 12000;
    goTo(sp.x, sp.y, { run: true, then() { setPose('sit'); happy(2600); sayCat('call'); later(tok, 4500, () => free(tok, 2500)); } });
  }
  function feedAnim(kind) {
    if (!el) return;
    const tok = script(), sp = B.scene.spots()[kind === 'water' ? 'water' : 'food'];
    st.wakeUntil = pnow() + 15000;
    goTo(sp.x, sp.y, {
      run: true,
      then() {
        st.dir = -1; applyTransform(); setPose('eat');
        snd(kind === 'water' ? 'drink' : 'eat');
        later(tok, 3200, () => {
          setPose('stand'); happy(1800); hearts(2); jump(1);
          sayCat(kind === 'water' ? 'drank' : 'fed');
          later(tok, 2200, () => free(tok, 1500));
        });
      },
    });
  }
  function playAnim() {
    if (!el) return;
    const tok = script(), L = Lay(), f = L.floor, sp = B.scene.spots().front;
    st.wakeUntil = pnow() + 20000;
    B.emit('bunPlay');
    snd('bark'); setTimeout(() => snd('bounce'), 700);
    const finish = () => { setPose('stand'); jump(2); happy(2200); hearts(2); sayCat('played'); later(tok, 2400, () => free(tok, 1500)); };
    const ball = document.querySelector('#sorted .toy[data-toy="toy_ball"]');
    if (!ball || reduce()) return zoomies(tok, 3, () => goTo(sp.x, sp.y, { run: true, then: finish }));
    // Ném bóng theo đường vòng cung rồi để Bun nhặt về
    const from = { x: sp.x, y: 800 }, to = { x: U.rand(f.x1 + 80, f.x2 - 80), y: U.rand(f.y1 + 20, f.y2 - 40) }, t0 = pnow();
    ball.style.display = '';
    const fly = (t) => {
      if (tok !== st.seq) return;
      const k = Math.min(1, (t - t0) / 720), x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k - Math.sin(Math.PI * k) * 170;
      B.scene.moveToy('toy_ball', x, y);
      if (k < 1) return requestAnimationFrame(fly);
      B.scene.moveToy('toy_ball', to.x, to.y);
      goTo(to.x - 40, to.y - 4, {
        run: true,
        then() {
          ball.style.display = 'none';
          el.querySelector('.carry').innerHTML = `<g transform="translate(0,36)">${A.toy('toy_ball')}</g>`;
          goTo(sp.x, sp.y, {
            run: true,
            then() {
              el.querySelector('.carry').innerHTML = '';
              ball.style.display = '';
              B.scene.moveToy('toy_ball', sp.x + st.dir * 70, sp.y + 16);
              finish();
            },
          });
        },
      });
    };
    requestAnimationFrame(fly);
  }
  function celebrate(info) {
    if (!el || B.S.bun.away) return;
    info = info || {};
    const tok = script();
    if (st.pose === 'sleep') {
      setPose('lie'); sayCat('taskSleepy'); hearts(1); st.wakeUntil = pnow() + 7000;
      later(tok, 4500, () => free(tok, 100));
      return;
    }
    if (st.pose === 'back' || st.pose === 'eat') setPose('sit');
    happy(2800); jump(2); sparkles(); hearts(2);
    snd('happy');
    say(U.pick(info.allDone ? B.LINES.allDone : info.task && info.task.priority === 'ui' ? B.LINES.taskBig : B.LINES.taskDone), 4200);
    if (info.allDone && !B.S.focus) later(tok, 1100, () => zoomies(tok, 3, () => { setPose('sit'); happy(2000); free(tok, 3000); }));
    else later(tok, 2600, () => free(tok, B.S.focus ? 300 : 1500));
  }
  function welcome(awayMs) {
    if (!el || B.S.bun.away) return 'away';
    const sp = B.scene.spots(), f = Lay().floor;
    if (isNight() && !B.S.focus) {
      st.x = sp.bed.x; st.y = sp.bed.y; st.dir = 1; applyTransform(); setPose('sleep'); st.until = pnow() + 15000;
      return 'asleep';
    }
    if (awayMs < 10 * 60000) {
      st.x = U.rand(f.x1 + 100, f.x2 - 100); st.y = U.rand(f.y1 + 40, f.y2 - 20); applyTransform(); st.until = pnow() + 2000;
      return 'short';
    }
    const far = awayMs > 3 * HOUR, from = far ? sp.door : sp.rug;
    st.x = from.x; st.y = from.y; applyTransform();
    const tok = script();
    const run = () => goTo(sp.front.x, sp.front.y, {
      run: true,
      then() {
        setPose('stand'); jump(2); happy(3200); hearts(far ? 4 : 2);
        snd('bark'); setTimeout(() => snd('happy'), 450);
        sayCat(awayMs > 48 * HOUR ? 'welcomeVeryLong' : awayMs > 12 * HOUR ? 'welcomeLong' : far ? 'welcomeMid' : 'welcomeShort', 5000);
        later(tok, 3200, () => { setPose('sit'); free(tok, 4000); });
      },
    });
    if (awayMs > 12 * HOUR) { setPose('sit'); later(tok, 900, run); } else later(tok, 300, run);
    return 'greet';
  }
  function focusStart() {
    if (!el) return;
    st.seq++; st.busy = false; st.until = 0; st.wakeUntil = 0;
    stopMoving();
    setTimeout(() => sayCat('focusStart', 4500), 900);
  }
  function focusEnd(done) {
    if (!el) return;
    const tok = script();
    if (st.pose === 'sleep' && isNight()) { setPose('lie'); sayCat(done ? 'taskSleepy' : 'night'); later(tok, 4000, () => free(tok, 100)); return; }
    setPose('stand');
    if (done) { jump(2); happy(2600); sparkles(); hearts(3); sayCat('focusEnd', 4500); } else sayCat('focusCancel');
    later(tok, 2600, () => free(tok, 1200));
  }
  function goodnight() {
    if (!el) return;
    sayCat('goodnight', 4500);
    st.seq++; st.busy = false; st.wakeUntil = 0; st.until = pnow() + 2600;
  }
  function morning() {
    if (!el) return;
    const tok = script();
    setPose('lie');
    later(tok, 800, () => { setPose('stand'); jump(1); happy(2600); sayCat('morning', 4500); later(tok, 2800, () => free(tok, 1500)); });
  }
  function gift() {
    if (!el || st.pose === 'sleep') return false;
    const tok = script(), sp = B.scene.spots().front;
    goTo(sp.x, sp.y, { run: true, then() { setPose('sit'); happy(2600); snd('happy'); sparkles(); sayCat('gift', 4500); later(tok, 3600, () => free(tok, 2500)); } });
    return true;
  }
  function cheer(cat, spot) {
    if (!el || st.pose === 'sleep' || B.S.bun.away) return;
    const tok = script(), sp = spot || B.scene.spots().front;
    goTo(sp.x, sp.y, { run: true, then() { setPose('stand'); jump(2); happy(2600); hearts(2); sayCat(cat, 4200); later(tok, 2800, () => free(tok, 2000)); } });
  }
  function nudge() { if (!st.busy) { st.until = 0; } }

  /* ---------- Khởi động ---------- */
  function onSceneClick(e) {
    if (!el || (B.room && B.room.state.on)) return; // đang sắp xếp phòng thì bấm không làm Bun đi lại
    const fr = e.target.closest && e.target.closest('.friend');
    if (fr && B.friends) { B.friends.pet(fr.dataset.id); return B.pets.openMenu(fr.dataset.id); }
    if (e.target.closest && e.target.closest('#bun')) return pet();
    const p = B.scene.fromScreen(e.clientX, e.clientY), L = Lay(), w = L.win, d = L.door;
    if (p.x > w.x1 - 30 && p.x < w.x2 + 30 && p.y > w.top - 30 && p.y < w.bot + 30) {
      B.emit('windowTap');
      if (!st.busy && st.pose !== 'sleep') { const s = B.scene.spots().window; goTo(s.x, s.y, { then() { setPose('back'); st.until = pnow() + 12000; } }); }
    } else if (p.x > d.x && p.x < d.x + d.w && p.y > d.top && p.y < 545) {
      if (!st.busy && st.pose !== 'sleep') { const s = B.scene.spots().door; goTo(s.x, s.y, { then() { setPose('sit'); if (cool('doorSay', 60000)) sayCat('door'); st.until = pnow() + 8000; } }); }
    } else if (p.y >= 560 && !st.busy && st.pose !== 'sleep') {
      goTo(p.x, Math.max(p.y, L.floor.y1), { then() { st.until = pnow() + 2600; } });
    }
  }
  function init() {
    bubble = document.getElementById('bubble');
    bind();
    B.on('sceneBuilt', bind);
    B.on('change', () => { applyFace(); if (el) el.style.display = B.S.bun.away ? 'none' : ''; });
    document.getElementById('svgActors').addEventListener('click', onSceneClick);
    setInterval(() => {
      if (!el || st.pose === 'sleep' || reduce()) return;
      if (Math.random() < 0.75) { el.classList.add('blink'); setTimeout(() => el && el.classList.remove('blink'), 150); }
      if (Math.random() < 0.22) { const ear = el.querySelector(Math.random() < 0.5 ? '.ear-l' : '.ear-r'); ear.classList.add('twitch'); setTimeout(() => ear.classList.remove('twitch'), 420); }
    }, 3300);
    if (!started) { started = true; last = pnow(); requestAnimationFrame(frame); }
  }

  B.bun = { init, pet, call, feedAnim, playAnim, celebrate, welcome, say, sayCat, focusStart, focusEnd, goodnight, morning, gift, cheer, nudge, friendHello, walk, state: st, refresh() { applyFace(); applyTransform(); } };
})();
