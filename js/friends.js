/* Hiên Nhà Bun — bạn của Bun: mỗi bạn có hình dáng, tính cách và thói quen riêng, cùng sống trong căn phòng */
(function () {
  'use strict';
  const B = window.B, U = B.util;
  const actors = {}; // id -> trạng thái đang chạy
  let started = false, last = 0;
  const pnow = () => performance.now();
  const reduce = () => document.documentElement.classList.contains('reduce-motion');
  const SPEED = { cat: 84, rabbit: 116, hedgehog: 36 };

  /* ---------- Hình vẽ (mặt hướng sang phải, gốc toạ độ ở chân) ---------- */
  const ART = {
    cat: `<g class="f-up">
        <g class="f-tail"><path d="M-32,-22 C-58,-20 -62,-50 -46,-62" stroke="#8F877E" stroke-width="9" fill="none" stroke-linecap="round"/></g>
        <rect x="-26" y="-14" width="10" height="15" rx="5" fill="#8F877E"/><rect x="10" y="-14" width="10" height="15" rx="5" fill="#8F877E"/>
        <ellipse cx="-4" cy="-25" rx="34" ry="20" fill="#A9A29A"/><path d="M-22,-42 l4,11 M-8,-45 l3,12 M6,-43 l2,11" stroke="#7D766F" stroke-width="4" stroke-linecap="round"/>
        <rect x="-18" y="-13" width="10" height="14" rx="5" fill="#A9A29A"/><rect x="16" y="-13" width="10" height="14" rx="5" fill="#EDE8E0"/>
        <g transform="translate(28,-46)"><path d="M-16,-8 L-13,-27 L-3,-13Z M16,-8 L13,-27 L3,-13Z" fill="#A9A29A"/><path d="M-13,-11 L-12,-21 L-6,-13Z M13,-11 L12,-21 L6,-13Z" fill="#EBB0A6"/>
          <ellipse cx="0" cy="0" rx="19" ry="16" fill="#A9A29A"/><ellipse cx="0" cy="6" rx="10" ry="7" fill="#EDE8E0"/><path d="M-4,-15 v6 M0,-16 v7 M4,-15 v6" stroke="#7D766F" stroke-width="2.4" stroke-linecap="round"/>
          <ellipse cx="-8" cy="-1" rx="2.6" ry="3.4" fill="#3B2A22"/><ellipse cx="8" cy="-1" rx="2.6" ry="3.4" fill="#3B2A22"/><path d="M-2,4 h4 l-2,2.6Z" fill="#E58E84"/><path d="M0,6.6 q-3,3 -5,1 M0,6.6 q3,3 5,1" stroke="#3B2A22" stroke-width="1.2" fill="none"/></g></g>
      <g class="f-sleep"><path d="M-30,-8 C-48,-6 -50,10 -20,6" stroke="#8F877E" stroke-width="9" fill="none" stroke-linecap="round" transform="translate(0,-8)"/>
        <ellipse cx="-2" cy="-15" rx="36" ry="16" fill="#A9A29A"/><path d="M-18,-29 l3,9 M-4,-31 l2,10 M10,-29 l1,9" stroke="#7D766F" stroke-width="4" stroke-linecap="round"/>
        <g transform="translate(24,-13)"><path d="M-14,-6 L-12,-22 L-3,-11Z M14,-6 L12,-22 L3,-11Z" fill="#A9A29A"/><ellipse cx="0" cy="0" rx="17" ry="13" fill="#A9A29A"/><ellipse cx="0" cy="5" rx="9" ry="6" fill="#EDE8E0"/>
          <path d="M-11,0 q3,3 6,0 M5,0 q3,3 6,0" stroke="#3B2A22" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M-2,4 h4 l-2,2.4Z" fill="#E58E84"/></g></g>`,
    rabbit: `<g class="f-up">
        <circle cx="-30" cy="-22" r="9" fill="#FFFFFF"/><rect x="-18" y="-10" width="16" height="11" rx="5.5" fill="#EFE8DC"/><rect x="12" y="-12" width="9" height="13" rx="4.5" fill="#EFE8DC"/>
        <ellipse cx="-4" cy="-24" rx="30" ry="21" fill="#FBF7EF"/><rect x="18" y="-12" width="9" height="13" rx="4.5" fill="#FBF7EF"/>
        <g transform="translate(24,-48)"><g class="f-ears"><ellipse cx="-7" cy="-26" rx="6.5" ry="20" fill="#FBF7EF" transform="rotate(-10 -7 -26)"/><ellipse cx="-7" cy="-26" rx="3" ry="14" fill="#F3C1C4" transform="rotate(-10 -7 -26)"/>
            <ellipse cx="8" cy="-26" rx="6.5" ry="20" fill="#FBF7EF" transform="rotate(12 8 -26)"/><ellipse cx="8" cy="-26" rx="3" ry="14" fill="#F3C1C4" transform="rotate(12 8 -26)"/></g>
          <ellipse cx="0" cy="0" rx="18" ry="16" fill="#FBF7EF"/><circle cx="-7" cy="-2" r="2.8" fill="#3B2A22"/><circle cx="8" cy="-2" r="2.8" fill="#3B2A22"/><ellipse cx="1" cy="5" rx="2.6" ry="2" fill="#E58E84"/>
          <path d="M1,7 q-3,3 -5,1 M1,7 q3,3 5,1" stroke="#B9A79A" stroke-width="1.2" fill="none"/><ellipse cx="-11" cy="5" rx="4" ry="2.4" fill="#F3C1C4" opacity=".6"/><ellipse cx="13" cy="5" rx="4" ry="2.4" fill="#F3C1C4" opacity=".6"/></g></g>
      <g class="f-sleep"><circle cx="-28" cy="-14" r="8" fill="#FFFFFF"/><ellipse cx="0" cy="-14" rx="32" ry="15" fill="#FBF7EF"/>
        <g transform="translate(22,-14)"><ellipse cx="-18" cy="-7" rx="17" ry="5.5" fill="#FBF7EF" transform="rotate(8 -18 -7)"/><ellipse cx="-18" cy="-7" rx="11" ry="2.4" fill="#F3C1C4" transform="rotate(8 -18 -7)"/>
          <ellipse cx="0" cy="0" rx="16" ry="13" fill="#FBF7EF"/><path d="M-10,0 q3,3 6,0 M4,0 q3,3 6,0" stroke="#3B2A22" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="5" rx="2.4" ry="1.8" fill="#E58E84"/></g></g>`,
    hedgehog: `<g class="f-up">
        <rect x="-16" y="-6" width="9" height="7" rx="3.5" fill="#D9B88E"/><rect x="8" y="-6" width="9" height="7" rx="3.5" fill="#D9B88E"/>
        <path d="M-34,-6 L-38,-18 L-31,-18 L-33,-30 L-25,-27 L-24,-39 L-16,-34 L-11,-45 L-5,-37 L2,-46 L6,-37 L14,-42 L15,-32 L22,-34 L21,-6Z" fill="#7A5535"/>
        <path d="M-26,-16 l-3,-8 M-16,-22 l-2,-9 M-6,-25 l0,-10 M4,-25 l2,-9 M12,-21 l3,-8" stroke="#A8804F" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M14,-30 C30,-30 38,-18 40,-10 C36,-4 22,-4 12,-6Z" fill="#F3E1C6"/><circle cx="40" cy="-10" r="3.4" fill="#2C2422"/><circle cx="24" cy="-18" r="2.6" fill="#3B2A22"/><ellipse cx="17" cy="-27" rx="4" ry="5" fill="#D9B88E"/></g>
      <g class="f-sleep"><path d="M-26,-2 L-32,-14 L-25,-15 L-27,-27 L-19,-24 L-17,-36 L-9,-30 L-4,-40 L2,-31 L9,-38 L12,-28 L20,-30 L20,-19 L27,-17 L22,-2Z" fill="#7A5535"/>
        <path d="M-18,-12 l-3,-8 M-8,-17 l-2,-9 M2,-18 l1,-9 M11,-14 l3,-8" stroke="#A8804F" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="18" cy="-6" rx="9" ry="6" fill="#F3E1C6"/><circle cx="26" cy="-5" r="2.6" fill="#2C2422"/><path d="M13,-8 q3,2.5 6,0" stroke="#3B2A22" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>`,
  };
  function one(p) {
    return `<g class="friend ${p.kind}" id="fr-${p.id}" data-id="${p.id}" data-y="700" data-pose="up"><ellipse class="bun-shadow" cx="0" cy="0" rx="${p.kind === 'hedgehog' ? 30 : 36}" ry="6"/><g class="f-flip"><g class="f-in">${ART[p.kind] || ''}</g></g><g class="f-fx"></g></g>`;
  }
  const thumb = (kind) => `<svg viewBox="-70 -100 140 110" aria-hidden="true"><g class="friend ${kind} static" data-pose="up">${ART[kind]}</g></svg>`;

  /* ---------- Diễn viên ---------- */
  const Lay = () => B.scene.layout();
  function scaleAt(y) { const f = Lay().floor; return (0.74 + ((U.clamp(y, f.y1, f.y2) - f.y1) / (f.y2 - f.y1)) * 0.22) * 0.94; }
  function apply(a) {
    if (!a.el) return;
    const s = a.sill ? 0.62 : scaleAt(a.y);
    a.el.setAttribute('transform', `translate(${a.x.toFixed(1)},${a.y.toFixed(1)}) scale(${s.toFixed(3)})`);
    a.flip.style.transform = `scaleX(${a.dir})`;
    if (Math.abs(a.y - a.placedY) > 2) { a.placedY = a.y; a.el.dataset.y = Math.round(a.y); B.scene.sortAll(); }
  }
  function setPose(a, p) { a.pose = p; if (a.el) a.el.dataset.pose = p; }
  function goTo(a, x, y, then, fast) {
    const f = Lay().floor;
    a.sill = false;
    a.target = { x: U.clamp(x, f.x1 - 20, f.x2 + 20), y: U.clamp(y, f.y1, f.y2) };
    a.then = then || null; a.fast = !!fast;
    setPose(a, 'up');
    a.el.classList.add('moving');
  }
  function fx(a, text) {
    if (!a.el) return;
    const g = a.el.querySelector('.f-fx');
    g.insertAdjacentHTML('beforeend', text ? `<g transform="translate(0,-92)"><text class="fx-say" text-anchor="middle">${U.esc(text)}</text></g>` : `<g transform="translate(${U.rand(-14, 14).toFixed(0)},-80)"><path class="fx-heart" d="M0,7 C-12,-3 -7,-12 0,-6 C7,-12 12,-3 0,7Z"/></g>`);
    const n = g.lastElementChild;
    setTimeout(() => n && n.remove(), 1700);
  }
  function restSpot(a, i) {
    const sp = B.scene.spots(), L = Lay();
    if (a.kind === 'cat' && Math.random() < 0.6) return { sill: true, x: L.win.cx - L.win.w * 0.2, y: L.win.bot + 14 };
    if (a.kind === 'hedgehog') return L.lvl >= 4 && B.scene.light().fireOn ? { x: sp.fire.x + 90, y: sp.fire.y + 8 } : { x: sp.bed.x - 170, y: sp.bed.y + 40 };
    return { x: sp.rug.x + (i % 2 ? 90 : -90), y: sp.rug.y + 10 };
  }
  function settle(a, spot, sleep) {
    const land = () => { if (spot.sill) { a.sill = true; a.x = spot.x; a.y = spot.y; a.dir = 1; apply(a); } setPose(a, sleep ? 'sleep' : 'up'); a.until = pnow() + U.rand(14000, 30000); };
    if (spot.sill) goTo(a, spot.x, Lay().floor.y1, land); else goTo(a, spot.x, spot.y, land);
  }
  function meet(a) {
    const bs = B.bun.state;
    goTo(a, bs.x + (a.x < bs.x ? -96 : 96), bs.y + 6, () => {
      a.dir = bs.x > a.x ? 1 : -1; apply(a);
      fx(a); B.pets.bond(a.id, 1);
      if (B.bun.friendHello) B.bun.friendHello(a.pet);
      B.mem.add({ key: 'meet_' + a.kind, icon: 'heart', title: `Bun làm quen với ${a.pet.name}`, text: 'Hai đứa ngửi nhau một lúc rồi cùng nằm xuống thảm.' });
      a.until = pnow() + U.rand(5000, 9000);
    });
  }
  function decide(a, i) {
    const f = Lay().floor, bs = B.bun.state, S = B.S;
    if (S.bun.away) { a.until = pnow() + 8000; return; }
    const h = B.time.hour(), night = h >= 22.5 || h < 6 || bs.pose === 'sleep';
    if (night) { if (a.pose === 'sleep') { a.until = pnow() + 20000; return; } return settle(a, a.kind === 'cat' && Math.random() < 0.4 ? restSpot(a, i) : { x: B.scene.spots().bed.x - 160 - i * 62, y: B.scene.spots().bed.y + 36 }, true); }
    const r = Math.random();
    if (r < 0.28 && !S.focus) return meet(a);
    if (r < 0.58) return goTo(a, U.rand(f.x1, f.x2), U.rand(f.y1 + 10, f.y2), () => { a.until = pnow() + U.rand(2000, 6000); });
    if (r < 0.8) return settle(a, restSpot(a, i), Math.random() < 0.5);
    setPose(a, 'up'); a.until = pnow() + U.rand(5000, 11000);
  }
  function frame(t) {
    const dt = Math.min(0.12, (t - last) / 1000);
    last = t;
    Object.keys(actors).forEach((id, i) => {
      const a = actors[id];
      if (!a.el || !a.el.isConnected) return;
      if (a.target) {
        const dx = a.target.x - a.x, dy = a.target.y - a.y, d = Math.hypot(dx, dy), sp = SPEED[a.kind] * (a.fast ? 2.6 : 1) * (reduce() ? 5 : 1);
        if (Math.abs(dx) > 2) a.dir = dx > 0 ? 1 : -1;
        if (d <= sp * dt) { a.x = a.target.x; a.y = a.target.y; a.target = null; a.el.classList.remove('moving'); const fn = a.then; a.then = null; apply(a); if (fn) fn(); }
        else { a.x += (dx / d) * sp * dt; a.y += (dy / d) * sp * dt; apply(a); }
      } else if (t > a.until) decide(a, i);
    });
    requestAnimationFrame(frame);
  }
  function bind() {
    const f = Lay().floor;
    (B.S.pets || []).forEach((p, i) => {
      const a = actors[p.id] || (actors[p.id] = { id: p.id, kind: p.kind, x: f.x1 + 120 + i * 130, y: f.y2 - 30 - i * 30, dir: 1, pose: 'up', target: null, until: pnow() + 1500 + i * 900, placedY: -1 });
      a.pet = p;
      a.el = document.getElementById('fr-' + p.id);
      if (!a.el) return;
      a.flip = a.el.querySelector('.f-flip');
      if (!a.sill) { a.x = U.clamp(a.x, f.x1, f.x2); a.y = U.clamp(a.y, f.y1, f.y2); }
      a.placedY = -1; a.el.dataset.pose = a.pose;
      apply(a);
    });
    Object.keys(actors).forEach((id) => { if (!B.S.pets.some((p) => p.id === id)) delete actors[id]; });
  }

  B.friends = {
    thumb,
    svg: () => (B.S.pets || []).map(one).join(''),
    list: () => Object.keys(actors).map((id) => actors[id]).filter((a) => a.el),
    init() {
      bind();
      B.on('sceneBuilt', bind);
      B.on('pets', () => { B.scene.build(); const a = actors[B.S.pets[B.S.pets.length - 1].id]; if (a) { const d = B.scene.spots().door; a.x = d.x; a.y = d.y; apply(a); meet(a); } });
      // Khi Bun chơi đùa, các bạn cũng chạy theo
      B.on('bunPlay', () => B.friends.list().forEach((a) => { if (a.kind === 'hedgehog' || a.pose === 'sleep') return; const f = Lay().floor; let n = 0; const run = () => { if (n++ >= 3) { a.until = pnow() + 3000; return; } goTo(a, U.rand(f.x1 + 40, f.x2 - 40), U.rand(f.y1 + 20, f.y2 - 10), run, true); }; run(); }));
      if (!started) { started = true; last = pnow(); requestAnimationFrame(frame); }
    },
    pet(id) {
      const a = actors[id];
      if (!a) return;
      fx(a); fx(a, B.friendDef(a.kind).sound);
      if (a.pose === 'sleep') { setPose(a, 'up'); a.until = pnow() + 6000; }
      B.pets.bond(id, 1); B.care(); B.store.save();
    },
    // Bun chủ động lại gần một bạn
    nearest() { const l = B.friends.list().filter((a) => !a.sill); return l.length ? U.pick(l) : null; },
    greeted(id) { const a = actors[id]; if (a) { fx(a); B.pets.bond(id, 1); if (a.pose !== 'sleep') a.until = pnow() + 6000; } },
  };
})();
