/* Hiên Nhà Bun — sắp xếp phòng: chọn, kéo thả, lật, đổi cỡ, đổi món, cất vào kho, xóa hẳn (có xác nhận) */
(function () {
  'use strict';
  const B = window.B, U = B.util, $ = U.$, $$ = U.$$, esc = U.esc, ic = B.icon;
  const st = { on: false, sel: null, drag: null };
  const SLOTS = ['bed', 'rug', 'plant', 'lamp'];

  /* ---------- Thông tin về từng món trong phòng ---------- */
  function info(key) {
    const S = B.S, p = S.house.placed;
    if (SLOTS.indexOf(key) >= 0) { const it = B.item(p[key]); return it ? { key, name: it.name, owner: 'Bun', type: 'slot', slot: key, id: it.id, store: true, del: true } : null; }
    if (key === 'bowlFood' || key === 'bowlWater') return { key, name: key === 'bowlFood' ? 'Bát ăn của Bun' : 'Bát nước của Bun', owner: 'Bun', type: 'bowl', store: false, del: false };
    if (/^toy_/.test(key)) { const it = B.item(key); return it ? { key, name: it.name, owner: 'Bun', type: 'toy', id: key, store: true, del: true } : null; }
    if (/^pi:/.test(key)) {
      const uid = key.slice(3);
      for (const pet of B.pets.list()) {
        const x = pet.items.find((y) => y.uid === uid);
        if (x) { const it = B.pets.item(x.id), bowl = it.role === 'food' || it.role === 'water'; return { key, name: it.name, owner: pet.name, type: 'pet', petId: pet.id, uid, role: it.role, store: !bowl, del: !bowl }; }
      }
    }
    return null;
  }
  const els = (key) => $$(`#svgActors [data-obj="${key}"]`);
  const posOf = (key) => { const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec((els(key)[0] || { getAttribute: () => '' }).getAttribute('transform') || ''); return m ? { x: +m[1], y: +m[2] } : null; };
  const cur = (key) => Object.assign({ s: 1, f: 0 }, (B.S.house.pos || {})[key] || {});
  function savePos(key, patch) {
    const S = B.S, pos = (S.house.pos = S.house.pos || {}), p = posOf(key) || { x: 0, y: 0 };
    pos[key] = Object.assign({ x: p.x, y: p.y }, pos[key] || {}, patch);
    B.store.save();
  }

  /* ---------- Giao diện chỉnh sửa ---------- */
  function enter() {
    if (st.on) return;
    if (B.walk && B.walk.state.on) return;
    st.on = true; st.sel = null;
    document.body.classList.add('room-edit');
    B.ui.closePopover();
    $('#roomEdit').hidden = false;
    renderBar();
    B.ui.toast('Kéo một món để đổi chỗ. Chọn món đó để lật, đổi cỡ, cất vào kho hoặc xóa.', { icon: 'move', ms: 5000 });
  }
  function exit() {
    if (!st.on) return;
    st.on = false; st.sel = null; st.drag = null;
    document.body.classList.remove('room-edit');
    $('#roomEdit').hidden = true;
    $('#reSel').hidden = true; $('#reTools').hidden = true;
    B.scene.build();
    B.bun.nudge();
  }
  function stored() {
    const S = B.S, out = [];
    B.ITEMS.filter((it) => SLOTS.indexOf(it.slot) >= 0 && B.shop.owns(it.id) && S.house.placed[it.slot] !== it.id).forEach((it) => out.push({ owner: 'Bun', name: it.name, ref: 'slot:' + it.id, thumb: B.art.thumb(it, S.bun.outfit) }));
    (S.house.stored || []).forEach((id) => { const it = B.item(id); if (it) out.push({ owner: 'Bun', name: it.name, ref: 'toy:' + id, thumb: B.art.thumb(it, S.bun.outfit) }); });
    B.pets.list().forEach((p) => p.items.filter((x) => !x.placed).forEach((x) => { const it = B.pets.item(x.id); if (it) out.push({ owner: p.name, name: it.name, ref: `pet:${p.id}:${x.uid}`, thumb: B.pets.thumb(x.id) }); }));
    return out;
  }
  function renderBar() {
    const n = stored().length;
    $('#roomEdit').innerHTML = `<div class="re-bar"><div class="re-text"><strong>Sắp xếp phòng</strong><span>Kéo để đổi chỗ · chọn một món để xem tùy chọn</span></div>
      <button class="btn soft sm" data-re="inv">${ic('shop')}Kho đồ${n ? ` (${n})` : ''}</button><button class="btn primary sm" data-re="done">${ic('check')}Xong</button></div>`;
  }
  function select(key) {
    st.sel = key;
    const i = key && info(key), sel = $('#reSel'), tools = $('#reTools');
    if (!i) { sel.hidden = true; tools.hidden = true; return; }
    const o = cur(key);
    tools.innerHTML = `<div class="re-name"><strong>${esc(i.name)}</strong><small>của ${esc(i.owner)}</small></div>
      <div class="re-btns"><button class="mini" data-re="flip" title="Lật ngang">${ic('arrow')}Lật</button><button class="mini" data-re="smaller" ${o.s <= 0.71 ? 'disabled' : ''} aria-label="Nhỏ hơn">−</button><span class="re-scale">${Math.round(o.s * 100)}%</span><button class="mini" data-re="bigger" ${o.s >= 1.29 ? 'disabled' : ''} aria-label="To hơn">+</button>
        <button class="mini" data-re="reset">Về chỗ cũ</button>${i.type !== 'bowl' ? '<button class="mini" data-re="swap">Đổi món</button>' : ''}
        ${i.store ? `<button class="mini" data-re="store">${ic('shop')}Cất vào kho</button>` : ''}${i.del ? `<button class="mini danger" data-re="del">${ic('trash')}Xóa hẳn</button>` : ''}</div>
      ${!i.store ? `<p class="re-note">${i.type === 'bowl' || i.role === 'food' || i.role === 'water' ? 'Bát ăn và bát nước là đồ thiết yếu nên chỉ đổi chỗ được, không cất hay xóa.' : ''}</p>` : ''}`;
    sel.hidden = false; tools.hidden = false;
    frame();
  }
  // Khung chọn và thanh công cụ bám theo món đồ
  function frame() {
    if (!st.sel) return;
    const list = els(st.sel), wr = $('#world').getBoundingClientRect();
    if (!list.length) { select(null); return; }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    list.forEach((e) => { const r = e.getBoundingClientRect(); x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom); });
    const sel = $('#reSel'), tools = $('#reTools');
    Object.assign(sel.style, { left: x1 - wr.left - 6 + 'px', top: y1 - wr.top - 6 + 'px', width: x2 - x1 + 12 + 'px', height: y2 - y1 + 12 + 'px' });
    const tw = tools.offsetWidth, th = tools.offsetHeight;
    let tx = U.clamp((x1 + x2) / 2 - wr.left - tw / 2, 8, wr.width - tw - 8), ty = y1 - wr.top - th - 14;
    if (ty < 70) ty = y2 - wr.top + 14;
    Object.assign(tools.style, { left: tx + 'px', top: ty + 'px' });
  }

  /* ---------- Kéo thả 1:1, giữ đúng điểm đã cầm ---------- */
  function onDown(e) {
    if (!st.on || e.button > 0) return;
    const g = e.target.closest('[data-obj]');
    if (!g) { if (!e.target.closest('#reTools')) select(null); return; }
    e.preventDefault();
    const key = g.dataset.obj, p = B.scene.fromScreen(e.clientX, e.clientY), at = posOf(key);
    if (!at) return;
    st.drag = { key, id: e.pointerId, dx: p.x - at.x, dy: p.y - at.y, sx: e.clientX, sy: e.clientY, moved: false, x: at.x, y: at.y };
    try { $('#svgActors').setPointerCapture(e.pointerId); } catch (x) { /* bỏ qua */ }
    select(key);
    els(key).forEach((el) => el.classList.add('re-grab'));
  }
  function onMove(e) {
    const d = st.drag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return; // ngưỡng nhỏ để bấm chọn không bị tính là kéo
    d.moved = true;
    const L = B.scene.layout(), p = B.scene.fromScreen(e.clientX, e.clientY), o = cur(d.key);
    d.x = U.clamp(p.x - d.dx, 40, L.W - 40);
    d.y = U.clamp(p.y - d.dy, d.key === 'rug' ? 600 : 572, d.key === 'rug' ? 770 : 790);
    els(d.key).forEach((el) => el.setAttribute('transform', `translate(${d.x.toFixed(1)},${d.y.toFixed(1)}) scale(${((o.f ? -1 : 1) * o.s).toFixed(2)},${o.s.toFixed(2)})`));
    frame();
  }
  function onUp(e) {
    const d = st.drag;
    if (!d || e.pointerId !== d.id) return;
    st.drag = null;
    els(d.key).forEach((el) => el.classList.remove('re-grab'));
    if (d.moved) { savePos(d.key, { x: Math.round(d.x), y: Math.round(d.y) }); B.scene.build(); select(d.key); }
  }

  /* ---------- Thao tác trên món đang chọn ---------- */
  function act(a) {
    const key = st.sel, i = key && info(key), S = B.S;
    if (a === 'done') return exit();
    if (a === 'inv') return openInventory();
    if (!i) return;
    const o = cur(key);
    if (a === 'flip') { savePos(key, { f: o.f ? 0 : 1 }); B.scene.build(); return select(key); }
    if (a === 'smaller' || a === 'bigger') { savePos(key, { s: +U.clamp(o.s + (a === 'bigger' ? 0.1 : -0.1), 0.7, 1.3).toFixed(2) }); B.scene.build(); return select(key); }
    if (a === 'reset') { delete (S.house.pos || {})[key]; B.store.save(); B.scene.build(); return select(key); }
    if (a === 'swap') { if (i.type === 'pet') B.ui.state.shopPet = i.petId; exit(); return B.ui.openShop(i.type === 'pet' ? 'friends' : i.type === 'toy' ? 'toy' : 'furn'); }
    if (a === 'store') { storeIt(i); B.ui.toast(`Đã cất ${esc(i.name.toLowerCase())} vào kho. Mở Kho đồ để đặt lại vào phòng.`, { icon: 'shop', ms: 4500 }); return; }
    if (a === 'del') {
      B.ui.confirm(`Xóa vĩnh viễn ${esc(i.name.toLowerCase())}?`, `Món này của ${esc(i.owner)} sẽ biến mất khỏi phòng và khỏi kho, không được hoàn lại xu và không thể hoàn tác. Nếu chỉ muốn dọn khỏi phòng, hãy chọn "Cất vào kho".`, 'Xóa vĩnh viễn', true)
        .then((ok) => { if (ok) { deleteIt(i); B.ui.toast(`Đã xóa ${esc(i.name.toLowerCase())}.`, { icon: 'trash', ms: 3500 }); } });
    }
  }
  function storeIt(i) {
    const S = B.S;
    if (i.type === 'slot') S.house.placed[i.slot] = null;
    else if (i.type === 'toy') { S.house.stored = S.house.stored || []; if (S.house.stored.indexOf(i.id) < 0) S.house.stored.push(i.id); }
    else if (i.type === 'pet') B.pets.place(i.petId, i.uid, false);
    B.store.save(); B.scene.build(); select(null); renderBar();
  }
  function deleteIt(i) {
    const S = B.S;
    if (i.type === 'slot') { S.house.owned = S.house.owned.filter((x) => x !== i.id); if (S.house.placed[i.slot] === i.id) S.house.placed[i.slot] = null; }
    else if (i.type === 'toy') { S.house.owned = S.house.owned.filter((x) => x !== i.id); S.house.stored = (S.house.stored || []).filter((x) => x !== i.id); }
    else if (i.type === 'pet') B.pets.removeItem(i.petId, i.uid);
    delete (S.house.pos || {})[i.key];
    B.store.save(); B.scene.build(); select(null); renderBar();
  }

  /* ---------- Kho đồ ---------- */
  function openInventory() {
    const m = B.ui.modal({ title: 'Kho đồ', cls: 'wide' });
    const draw = () => {
      const list = stored();
      m.render(list.length ? `<p class="hint" style="margin:0 0 10px">Đồ đã cất khỏi phòng. Đồ của ai vẫn thuộc về người đó.</p><div class="shop-grid">${list.map((x) => `<div class="item"><div class="thumb">${x.thumb}</div><span class="tag">Của ${esc(x.owner)}</span><strong>${esc(x.name)}</strong>
          <button class="btn primary sm" data-inv="put" data-ref="${x.ref}">Đặt vào phòng</button><button class="btn ghost sm" data-inv="del" data-ref="${x.ref}" style="color:#C0483E">${ic('trash')}Xóa hẳn</button></div>`).join('')}</div>`
        : '<p class="empty">Kho đang trống. Món nào được cất khỏi phòng sẽ nằm ở đây.</p>');
    };
    draw();
    m.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-inv]');
      if (!b) return;
      const ref = b.dataset.ref.split(':'), S = B.S;
      const name = ref[0] === 'pet' ? B.pets.item(B.pets.list().find((p) => p.id === ref[1]).items.find((x) => x.uid === ref[2]).id).name : B.item(ref[1]).name;
      if (b.dataset.inv === 'put') {
        if (ref[0] === 'slot') { const it = B.item(ref[1]); S.house.placed[it.slot] = it.id; }
        else if (ref[0] === 'toy') S.house.stored = (S.house.stored || []).filter((x) => x !== ref[1]);
        else B.pets.place(ref[1], ref[2], true);
        B.store.save(); B.scene.build(); renderBar(); draw();
        return B.ui.toast(`Đã đặt ${esc(name.toLowerCase())} vào phòng.`, { icon: 'home', ms: 3000 });
      }
      B.ui.confirm(`Xóa vĩnh viễn ${esc(name.toLowerCase())}?`, 'Món này sẽ biến mất khỏi kho, không được hoàn lại xu và không thể hoàn tác.', 'Xóa vĩnh viễn', true).then((ok) => {
        if (!ok) return;
        if (ref[0] === 'slot') S.house.owned = S.house.owned.filter((x) => x !== ref[1]);
        else if (ref[0] === 'toy') { S.house.owned = S.house.owned.filter((x) => x !== ref[1]); S.house.stored = (S.house.stored || []).filter((x) => x !== ref[1]); }
        else B.pets.removeItem(ref[1], ref[2]);
        B.store.save(); renderBar(); draw();
      });
    });
  }

  function init() {
    const box = document.createElement('div');
    box.id = 'roomEdit'; box.className = 'room-edit-ui'; box.hidden = true;
    $('#world').appendChild(box);
    const sel = document.createElement('div');
    sel.id = 'reSel'; sel.className = 're-sel'; sel.hidden = true;
    const tools = document.createElement('div');
    tools.id = 'reTools'; tools.className = 're-tools'; tools.hidden = true;
    $('#world').appendChild(sel); $('#world').appendChild(tools);
    const svg = $('#svgActors');
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    $('#world').addEventListener('click', (e) => { const b = e.target.closest('[data-re]'); if (b && st.on) act(b.dataset.re); });
    $('#btnRoom').innerHTML = ic('move');
    $('#btnRoom').addEventListener('click', () => (st.on ? exit() : enter()));
    B.on('sceneBuilt', () => { if (st.on && st.sel) setTimeout(frame, 0); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.on && !B.ui.state.modals.length) exit(); });
  }

  B.room = { init, enter, exit, state: st, info, stored, select };
})();
