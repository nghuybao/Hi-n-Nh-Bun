/* Hiên Nhà Bun — giao diện đời sống: thực đơn ăn uống, tủ thức ăn, bạn của Bun, sổ sức khỏe, tường ảnh */
(function () {
  'use strict';
  const B = window.B, U = B.util, $ = U.$, $$ = U.$$, esc = U.esc, ic = B.icon;
  const st = { tab: 'body', sel: null, reminded: false, form: false };
  const kg = (w) => (w || 1).toFixed(2).replace('.', ',') + ' kg';
  const need = (n) => `Còn thiếu ${n} xu. Hoàn thành thêm một việc là đủ.`;

  /* ---------- Thực đơn ăn, uống, vận động ---------- */
  function menu(kind) {
    const pop = $('#popover'), S = B.S;
    if (!pop.hidden && pop.dataset.kind === kind) { pop.hidden = true; return; }
    pop.dataset.kind = kind;
    if (kind === 'play') pop.innerHTML = `<h4>Vận động cùng Bun</h4><button class="pop-item" data-do="play"><span><strong>Chơi đùa</strong><small>Ném bóng hoặc chạy vòng quanh phòng</small></span></button><button class="pop-item" data-do="walk"><span><strong>Dắt đi dạo</strong><small>Tốt cho vóc dáng, cách nhau ít nhất 2 giờ</small></span></button>`;
    else pop.innerHTML = `<h4>${kind === 'food' ? 'Hôm nay Bun ăn gì?' : 'Bun uống gì?'}</h4>` + B.FOODS.filter((f) => f.kind === kind).map((f) => {
      const n = B.pantry.count(f.id), free = !n && S.coins < f.price && ((f.id === 'kibble' && !S.day.freeMeal) || (f.id === 'water' && !S.day.freeWater));
      return `<button class="pop-item" data-food="${f.id}"><span><strong>${f.name}</strong><small>${f.desc}</small></span><span class="price">${n ? `còn ${n}` : free ? 'Cứu trợ' : ic('coin') + f.price}</span></button>`;
    }).join('') + `<button class="pop-item" data-do="pantry"><span><small>Mua sẵn gói 5 phần trong Cửa tiệm rẻ hơn 10%</small></span>${ic('chevron')}</button>`;
    pop.hidden = false;
  }
  function feed(id) {
    const r = B.careActions.feed(id);
    if (!r.ok) {
      if (r.reason === 'full') { B.bun.say('Tớ no căng rồi, ăn nữa là tròn quay mất.', 3800); return; }
      if (r.reason === 'notThirsty') return B.bun.sayCat('notThirsty');
      if (r.reason === 'coins') B.ui.toast(need(r.need), { icon: 'coin' });
      return;
    }
    B.scene.updateBowls(); B.bun.feedAnim(r.drink ? 'water' : 'food'); renderChip();
    if (r.free) B.ui.toast(r.drink ? 'Ví đang trống nên bát nước hôm nay được tặng.' : 'Ví đang trống nên suất hạt cứu trợ hôm nay được tặng.', { icon: 'gift' });
    if (r.overfed) B.ui.toast('Bun đã quá no. Cho ăn thêm lúc này dễ làm Bun thừa cân.', { icon: 'scale', ms: 5500 });
    else if (r.treatsOver) B.ui.toast('Hôm nay Bun đã ăn hơn ba cái bánh thưởng. Ăn vặt nhiều sẽ ảnh hưởng vóc dáng.', { icon: 'scale', ms: 5500 });
  }
  function onPopover(e) {
    const d = e.target.closest('[data-do]');
    if (!d) return;
    $('#popover').hidden = true;
    if (d.dataset.do === 'pantry') return B.ui.openShop('pantry');
    if (d.dataset.do === 'play') { const r = B.careActions.play(); return r.ok ? B.bun.playAnim() : B.bun.sayCat('tired'); }
    const r = B.careActions.walk();
    if (r.ok) { B.bun.walk(); B.ui.toast('Bun đang đi dạo một vòng. Vận động đều giúp Bun giữ dáng cân đối.', { icon: 'paw' }); }
    else if (r.reason === 'recent') B.bun.say('Mình vừa đi dạo xong mà. Lát nữa đi tiếp nha.', 3800); else B.bun.sayCat('tired');
  }

  /* ---------- Cửa tiệm: thức ăn và bạn bè ---------- */
  function shopTab(tab) {
    const S = B.S;
    if (tab === 'pantry') return `<p class="hint" style="margin:0 0 10px">Mua sẵn để vào tủ, lúc cho ăn không phải trả thêm. Gói 5 phần rẻ hơn 10%.</p><div class="shop-grid">${B.FOODS.map((f) => `<div class="item"><span class="tag">${f.kind === 'drink' ? 'Đồ uống' : f.treat ? 'Ăn vặt' : 'Thức ăn'}</span><strong>${f.name}</strong><small>${f.desc}</small>
        <small>${f.hunger ? `No +${f.hunger}` : ''}${f.thirst ? `${f.hunger ? ' · ' : ''}Khát +${f.thirst}` : ''}${f.joy ? ` · Vui +${f.joy}` : ''}${f.q ? ` · Dinh dưỡng ${f.q >= 1.1 ? 'cao' : f.q >= 0.9 ? 'đủ' : 'thấp'}` : ''}</small>
        <span class="tags"><span>Trong tủ: ${B.pantry.count(f.id)}</span></span><div class="row"><button class="btn primary sm price-btn" data-buyfood="${f.id}" data-n="1">${ic('coin')}${f.price}</button><button class="btn soft sm" data-buyfood="${f.id}" data-n="5">5 phần · ${B.pantry.price(f.id, 5)}</button></div></div>`).join('')}</div>`;
    return `<p class="hint" style="margin:0 0 10px">Mỗi người bạn có tính cách riêng, sống cùng phòng và tự chơi với Bun.</p><div class="shop-grid">${B.FRIENDS.map((d) => {
      const pet = S.pets.find((p) => p.kind === d.kind);
      return `<div class="item ${pet ? 'using' : ''}"><div class="thumb">${B.friends.thumb(d.kind)}</div><span class="tag">${d.trait}</span>${pet ? `<input type="text" class="f-txt on" maxlength="14" value="${esc(pet.name)}" data-petname="${pet.id}" aria-label="Tên của bạn này">` : `<strong>${d.name}</strong>`}<small>${d.desc}</small>
        ${pet ? `<span class="tags"><span>Với Bun: ${B.pets.bondName(pet.bond || 0)}</span></span>` : `<button class="btn primary sm price-btn" data-adopt="${d.kind}">${ic('coin')}${d.price}</button>`}</div>`;
    }).join('')}</div>`;
  }
  function shopClick(e, draw) {
    const bf = e.target.closest('[data-buyfood]'), ad = e.target.closest('[data-adopt]');
    if (bf) { const r = B.pantry.buy(bf.dataset.buyfood, +bf.dataset.n); if (r.ok) B.ui.toast(`Đã cất ${bf.dataset.n} phần ${B.food(bf.dataset.buyfood).name.toLowerCase()} vào tủ, hết ${r.cost} xu.`, { icon: 'food', ms: 3200 }); else B.ui.toast(need(r.need), { icon: 'coin' }); draw(); return true; }
    if (ad) { const d = B.friendDef(ad.dataset.adopt), r = B.pets.adopt(d.kind); if (r.ok) { B.ui.toast(`<b>${d.name}</b> đã về sống cùng Bun.`, { icon: 'paw', ms: 6000 }); draw(); } else B.ui.toast(need(r.need), { icon: 'coin' }); return true; }
    return false;
  }
  function shopChange(e) { if (e.target.dataset && e.target.dataset.petname) { B.pets.rename(e.target.dataset.petname, e.target.value); return true; } return false; }

  /* ---------- Sổ sức khỏe ---------- */
  function spark() {
    const l = (B.S.bun.wlog || []).slice(-30);
    if (l.length < 2) return '<p class="empty">Biểu đồ cân nặng sẽ hiện sau vài ngày.</p>';
    const pts = l.map((p, i) => `${(i / (l.length - 1) * 280 + 10).toFixed(1)},${(70 - ((p.w - 1) / 2) * 60).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 300 80" class="spark" role="img" aria-label="Cân nặng ${l.length} ngày gần đây"><path d="M10,70 h280 M10,40 h280 M10,10 h280" stroke="#E8DAC1" stroke-width="1"/><polyline points="${pts}" fill="none" stroke="#DC8E43" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="292" y="13" font-size="9" text-anchor="end" fill="#8F7B66">3 kg</text><text x="292" y="68" font-size="9" text-anchor="end" fill="#8F7B66">1 kg</text></svg>`;
  }
  function healthHTML() {
    const S = B.S, b = S.bun, c = B.nutri.condition(), hs = B.nutri.health(), today = B.time.today();
    let h = `<div class="seg">${[['body', 'Thể trạng'], ['care', 'Tiêm phòng và khám'], ['spend', 'Chi tiêu']].map((t) => `<button data-htab="${t[0]}" class="${st.tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>`;
    if (st.tab === 'body') {
      const pos = U.clamp(((b.bcs || 4.5) - 1) / 8 * 100, 2, 98), dq = (b.diet || 1) >= 1.08 ? 'rất tốt' : (b.diet || 1) >= 0.9 ? 'đủ chất' : 'còn nghèo dinh dưỡng';
      h += `<div class="cards" style="grid-template-columns:repeat(3,1fr)"><div class="card"><b>${kg(b.weight)}</b><span>Cân nặng trong trò chơi</span></div><div class="card"><b>${c.label}</b><span>Thể trạng ${(b.bcs || 4.5).toFixed(1).replace('.', ',')}/9</span></div><div class="card"><b>${hs}/100</b><span>Sức khỏe tổng quát</span></div></div>
        <div class="bcs" aria-hidden="true"><i style="left:${pos}%"></i><span>Gầy</span><span>Cân đối</span><span>Thừa cân</span></div>
        <ul class="tips"><li>${ic('scale')}<span>${c.tip}</span></li><li>${ic('food')}<span>Chất lượng bữa ăn gần đây: ${dq}. Thức ăn dinh dưỡng giúp Bun lớn đều hơn, còn số lần cho ăn thì không làm Bun lớn nhanh hơn.</span></li>
          <li>${ic('paw')}<span>Hôm nay Bun đã đi dạo ${S.day.walks} lần và ăn ${S.day.treats} bánh thưởng.</span></li></ul>
        <h3 class="sec-title">Cân nặng theo ngày</h3>${spark()}
        <p class="hint">Cân nặng 1 đến 3 kg là thang đo riêng của trò chơi để thấy Bun lớn dần, không phải cân nặng khỏe mạnh của một chú Corgi thật. Trong trò chơi nước uống tốn xu, còn chó thật luôn cần có nước sạch mọi lúc.</p>`;
    } else if (st.tab === 'care') {
      const all = B.healthcare.list(), plan = all.filter((x) => x.status === 'planned').sort((a, b2) => (a.date < b2.date ? -1 : 1)), done = all.filter((x) => x.status === 'done').sort((a, b2) => b2.doneAt - a.doneAt);
      const row = (x) => `<li class="${x.overdue ? 'overdue' : x.soon ? 'soon' : ''}"><span class="mem-ic">${ic(B.HEALTH_KINDS[x.kind].icon)}</span><div><strong>${esc(x.name)}</strong><small>${B.HEALTH_KINDS[x.kind].label} · ${U.fmtDate(x.date)}${x.overdue ? ' · đã quá ngày' : x.soon ? ' · sắp đến' : ''}${x.repeat ? ` · nhắc lại sau ${x.repeat} tháng` : ''}</small>${x.note ? `<small>${esc(x.note)}</small>` : ''}</div>
        ${x.status === 'planned' ? `<button class="btn primary sm price-btn" data-hdone="${x.id}">${x.cost ? ic('coin') + x.cost : ''} Đã làm</button>` : `<span class="hint" style="margin:0">${x.cost ? x.cost + ' xu' : ''}</span>`}<button class="mini" data-hdel="${x.id}" aria-label="Xóa">${ic('trash')}</button></li>`;
      h += `<h3 class="sec-title" style="margin-top:0">Sắp tới</h3>${plan.length ? `<ul class="hlist">${plan.map(row).join('')}</ul>` : '<p class="empty">Chưa có lịch nào. Hãy thêm theo sổ tiêm và lời dặn của bác sĩ thú y.</p>'}
        ${st.form ? `<form class="f-adv" data-hform style="margin-top:10px"><div class="f-line"><span class="f-lbl">Loại</span><select name="kind">${Object.keys(B.HEALTH_KINDS).map((k) => `<option value="${k}">${B.HEALTH_KINDS[k].label}</option>`).join('')}</select><label class="f-lbl" for="hDate">Ngày</label><input type="date" id="hDate" name="date" value="${today}"></div>
          <input type="text" name="name" class="f-txt on" maxlength="60" placeholder="Tên mũi tiêm hoặc nội dung khám" list="vacNames" aria-label="Tên"><datalist id="vacNames">${B.VACCINE_NAMES.map((n) => `<option value="${n}">`).join('')}</datalist>
          <div class="f-line"><label class="f-lbl" for="hRep">Nhắc lại sau (tháng)</label><input type="number" id="hRep" name="repeat" class="f-num on" min="0" max="36" value="0"><label class="f-lbl" for="hCost">Chi phí (xu)</label><input type="number" id="hCost" name="cost" class="f-num on" min="0" max="999" placeholder="mặc định"></div>
          <input type="text" name="note" class="f-txt on" maxlength="200" placeholder="Ghi chú, ví dụ tên phòng khám" aria-label="Ghi chú"><div class="row end" style="margin-top:0"><button type="button" class="btn ghost sm" data-hcancel>Hủy</button><button type="submit" class="btn primary sm">Lưu lịch</button></div></form>` : `<button class="add-task" data-hadd>${ic('plus')}Thêm lịch tiêm, khám hoặc chải lông</button>`}
        <h3 class="sec-title">Đã thực hiện</h3>${done.length ? `<ul class="hlist">${done.slice(0, 20).map(row).join('')}</ul>` : '<p class="empty">Lịch sử sẽ hiện ở đây.</p>'}
        <div class="note-box"><strong>Lịch tiêm không có một mẫu chung</strong><p>Theo RSPCA Australia, vắc-xin lõi cho chó phòng bệnh care, viêm gan truyền nhiễm và parvo (thường gộp thành mũi C3). Chó con thường tiêm mũi đầu lúc 6 đến 8 tuần tuổi, nhắc lại mỗi 2 đến 4 tuần cho tới ít nhất 16 tuần tuổi; chó trưởng thành tiêm nhắc mỗi 1 đến 3 năm tùy loại vắc-xin. Hiệp hội Thú y Úc (AVA) nêu rằng bác sĩ thú y quyết định lịch nhắc sau khi xét lối sống và nguy cơ của từng con. Vì vậy ứng dụng không tự đặt lịch: bạn nhập ngày theo sổ tiêm và lời dặn của bác sĩ.</p>
          <p><a href="https://kb.rspca.org.au/categories/companion-animals/dogs/caring-for-my-dog/what-vaccinations-should-my-dog-receive" target="_blank" rel="noopener">RSPCA Knowledgebase</a> · <a href="https://www.ava.com.au/policy/vaccination-of-dogs-and-cats" target="_blank" rel="noopener">Chính sách của AVA</a>. Thông tin này không thay cho tư vấn của bác sĩ thú y.</p></div>`;
    } else {
      const L = S.ledger.slice().reverse(), month = B.now() - 30 * 86400000, names = { food: 'Thức ăn', drink: 'Đồ uống', vet: 'Sức khỏe', item: 'Nội thất', wear: 'Trang phục', house: 'Ngôi nhà', friend: 'Bạn bè' }, sum = {};
      L.filter((x) => x.at >= month).forEach((x) => (sum[x.type] = (sum[x.type] || 0) + x.amount));
      const tot = Object.keys(sum).reduce((a, k) => a + sum[k], 0);
      h += `<div class="cards" style="grid-template-columns:repeat(3,1fr)"><div class="card"><b>${tot}</b><span>Xu đã tiêu 30 ngày</span></div><div class="card"><b>${(sum.food || 0) + (sum.drink || 0)}</b><span>Ăn uống</span></div><div class="card"><b>${sum.vet || 0}</b><span>Chăm sóc sức khỏe</span></div></div>
        ${Object.keys(sum).length ? `<div class="tags">${Object.keys(sum).map((k) => `<span>${names[k] || k}: ${sum[k]} xu</span>`).join('')}</div>` : ''}
        <h3 class="sec-title">Giao dịch gần đây</h3>${L.length ? `<ul class="hlist">${L.slice(0, 40).map((x) => `<li><div><strong>${esc(x.label)}</strong><small>${names[x.type] || ''} · ${U.fmtDateTime(x.at)}</small></div><span class="wallet">${ic('coin')}${x.amount}</span></li>`).join('')}</ul>` : '<p class="empty">Chưa có khoản chi nào được ghi lại.</p>'}`;
    }
    return h;
  }
  function openHealth(tab) {
    if (tab) st.tab = tab;
    const m = B.ui.modal({ title: `Sổ sức khỏe của ${esc(B.S.bun.name)}`, cls: 'wide' });
    const draw = () => m.render(healthHTML());
    draw();
    m.body.addEventListener('click', (e) => {
      const t = e.target, ht = t.closest('[data-htab]'), hd = t.closest('[data-hdone]'), hx = t.closest('[data-hdel]');
      if (ht) { st.tab = ht.dataset.htab; st.form = false; return draw(); }
      if (t.closest('[data-hadd]')) { st.form = true; return draw(); }
      if (t.closest('[data-hcancel]')) { st.form = false; return draw(); }
      if (hd) { const r = B.healthcare.done(hd.dataset.hdone); if (!r.ok) B.ui.toast(need(r.need) + ' Bạn cũng có thể sửa chi phí về 0.', { icon: 'coin', ms: 5500 }); else { B.ui.toast(r.next ? `Đã ghi nhận. Lần kế tiếp được hẹn vào ${U.fmtDate(r.next.date)}.` : 'Đã ghi vào sổ sức khỏe.', { icon: 'shield' }); if (!B.S.bun.away) B.bun.say('Tớ ngoan lắm đúng không?', 3600); } badge(); return draw(); }
      if (hx) { B.healthcare.remove(hx.dataset.hdel); badge(); return draw(); }
    });
    m.body.addEventListener('submit', (e) => {
      if (!e.target.matches('[data-hform]')) return;
      e.preventDefault();
      const f = new FormData(e.target);
      if (!String(f.get('name') || '').trim() && f.get('kind') === 'vaccine') { e.target.querySelector('[name=name]').focus(); return; }
      B.healthcare.add({ kind: f.get('kind'), name: f.get('name'), date: f.get('date'), repeat: f.get('repeat'), cost: f.get('cost'), note: f.get('note') });
      st.form = false; badge(); draw();
    });
  }

  /* ---------- Tường ảnh ---------- */
  function openPhotos() {
    const L = B.scene.layout(), W = L.W;
    const m = B.ui.modal({ title: 'Tường ảnh', cls: 'wide', onClose() { B.store.save(); B.scene.build(); } });
    const guide = (x, w, y, h2, label) => `<div class="wall-guide" style="left:${(x / W * 100).toFixed(2)}%;width:${(w / W * 100).toFixed(2)}%;top:${U.clamp((y - 96) / 290 * 100, 0, 100).toFixed(1)}%;height:${(h2 / 290 * 100).toFixed(1)}%">${label}</div>`;
    const draw = () => {
      const S = B.S, sel = S.photos.find((p) => p.id === st.sel);
      m.render(`<div class="row" style="margin-bottom:10px"><button class="btn primary sm" data-padd>${ic('plus')}Thêm ảnh từ máy</button><span class="hint" style="margin:0">${S.photos.length}/${B.photos.MAX} ảnh · Kéo khung ảnh để đổi chỗ. Ảnh chỉ lưu trên máy này.</span></div>
        <div class="wall-ed" style="aspect-ratio:${W}/290">${guide(L.win.x1 - 20, L.win.w + 40, L.win.top - 20, 260, 'Cửa sổ')}${guide(L.door.x - 10, L.door.w + 20, L.door.top, 240, 'Cửa')}${guide(L.shelf.cx - 95, 190, L.shelf.y - 40, 60, 'Kệ')}${guide(L.desk.x, 150, 300, 90, 'Đèn bàn')}
          ${S.photos.map((p) => { const g = B.photos.place(p, W); return `<div class="ph ${p.id === st.sel ? 'sel' : ''}" data-ph="${p.id}" style="left:${(p.x * 100).toFixed(2)}%;top:${(p.y * 100).toFixed(2)}%;width:${(g.w / W * 100).toFixed(2)}%;transform:translate(-50%,-50%) rotate(${p.rot || 0}deg)"><img src="${B.photos.urls[p.id] || ''}" alt="${esc(p.caption || 'Ảnh trên tường')}" style="aspect-ratio:${p.ar}" draggable="false"></div>`; }).join('')}
          ${S.photos.length ? '' : '<p class="empty" style="position:absolute;inset:0;display:grid;place-items:center;margin:0">Bức tường còn trống. Thêm vài tấm ảnh của Bun nhé.</p>'}</div>
        ${sel ? `<div class="f-adv" style="margin-top:12px"><div class="f-line"><span class="f-lbl">Cỡ khung</span>${[['s', 'Nhỏ'], ['m', 'Vừa'], ['l', 'Lớn']].map((z) => `<button class="pill ${sel.size === z[0] ? 'on' : ''}" data-psize="${z[0]}">${z[1]}</button>`).join('')}<span class="grow"></span><button class="btn soft sm" data-prep>Đổi ảnh khác</button><button class="btn ghost sm" data-pdel style="color:#C0483E">${ic('trash')}Gỡ xuống</button></div>
          <div class="f-line"><input type="text" class="f-txt on" id="phCap" maxlength="26" placeholder="Chú thích" value="${esc(sel.caption || '')}" aria-label="Chú thích"><input type="date" id="phDate" value="${esc(sel.date || '')}" aria-label="Ngày chụp"></div></div>` : S.photos.length ? '<p class="hint">Bấm vào một khung ảnh để đổi cỡ, thêm chú thích, đổi hoặc gỡ ảnh.</p>' : ''}
        <input type="file" id="phFile" accept="image/*" multiple hidden>`);
    };
    draw();
    let drag = null, replaceId = null;
    m.body.addEventListener('pointerdown', (e) => {
      const ph = e.target.closest('.ph');
      if (!ph) return;
      const wall = ph.parentElement.getBoundingClientRect();
      drag = { id: ph.dataset.ph, el: ph, wall, moved: false };
      $$('.ph', m.body).forEach((x) => x.classList.toggle('sel', x === ph));
      try { ph.setPointerCapture(e.pointerId); } catch (x) { /* bỏ qua */ }
      e.preventDefault();
    });
    m.body.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const p = B.S.photos.find((x) => x.id === drag.id);
      if (!p) return;
      p.x = +U.clamp((e.clientX - drag.wall.left) / drag.wall.width, 0.03, 0.97).toFixed(4);
      p.y = +U.clamp((e.clientY - drag.wall.top) / drag.wall.height, 0, 1).toFixed(4);
      drag.el.style.left = p.x * 100 + '%'; drag.el.style.top = p.y * 100 + '%'; drag.moved = true;
    });
    const endDrag = () => { if (!drag) return; const id = drag.id, changed = st.sel !== id; st.sel = id; drag = null; B.store.save(); if (changed) draw(); };
    m.body.addEventListener('pointerup', endDrag);
    m.body.addEventListener('pointercancel', endDrag);
    m.body.addEventListener('click', (e) => {
      const t = e.target, p = B.S.photos.find((x) => x.id === st.sel), sz = t.closest('[data-psize]');
      if (t.closest('[data-padd]')) { replaceId = null; $('#phFile', m.body).click(); return; }
      if (!p) return;
      if (sz) { p.size = sz.dataset.psize; B.store.save(); return draw(); }
      if (t.closest('[data-prep]')) { replaceId = p.id; $('#phFile', m.body).click(); return; }
      if (t.closest('[data-pdel]')) { B.photos.remove(p.id); st.sel = null; draw(); }
    });
    m.body.addEventListener('change', (e) => {
      const p = B.S.photos.find((x) => x.id === st.sel);
      if (e.target.id === 'phCap' && p) { p.caption = e.target.value.trim().slice(0, 26); B.store.save(); return; }
      if (e.target.id === 'phDate' && p) { p.date = e.target.value; B.store.save(); return; }
      if (e.target.id !== 'phFile') return;
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (!files.length) return;
      const job = replaceId ? B.photos.replace(replaceId, files[0]) : files.reduce((pr, f) => pr.then(() => B.photos.add(f).then((np) => { st.sel = np.id; })), Promise.resolve());
      job.then(() => { if (!replaceId) B.mem.add({ key: 'first_photo', icon: 'frame', title: 'Tấm ảnh đầu tiên trên tường', text: 'Căn phòng của Bun giờ có thêm một kỷ niệm thật.' }); draw(); }).catch((err) => { B.ui.toast(esc(err.message || 'Không thêm được ảnh.'), { icon: 'x', ms: 6000 }); draw(); });
    });
  }

  /* ---------- Chip cân nặng, nhắc lịch ---------- */
  function renderChip() {
    const c = $('#weightChip');
    if (!c || !B.S.bun) return;
    const cond = B.nutri.condition();
    c.innerHTML = `${ic('scale')}<span>${kg(B.S.bun.weight)} · ${cond.label}</span>`;
    c.classList.toggle('warn', cond.id !== 'ideal');
  }
  function badge() {
    const due = B.healthcare.due(), b = $('#btnHealth');
    if (b) b.classList.toggle('has-badge', due.length > 0);
    return due;
  }
  function tick() {
    B.nutri.logWeight(); renderChip();
    const due = badge();
    if (due.length && !st.reminded && !B.ui.state.modals.length && B.S.seenIntro) {
      st.reminded = true;
      const x = due[0];
      B.ui.toast(`${x.overdue ? 'Đã quá ngày' : 'Sắp đến lịch'}: <b>${esc(x.name)}</b> (${U.fmtDate(x.date)}).${due.length > 1 ? ` Còn ${due.length - 1} lịch khác.` : ''}`, { icon: 'shield', ms: 8000 });
    }
  }
  function init() {
    $('#btnHealth').innerHTML = ic('shield'); $('#btnPhotos').innerHTML = ic('frame');
    $('#btnHealth').addEventListener('click', () => openHealth());
    $('#btnPhotos').addEventListener('click', openPhotos);
    $('#weightChip').addEventListener('click', () => openHealth('body'));
    $('#popover').addEventListener('click', onPopover);
    B.on('change', renderChip);
    B.photos.init();
    setTimeout(tick, 4000);
    renderChip(); badge();
  }

  B.worldui = { init, tick, menu, feed, shopTab, shopClick, shopChange, openHealth, openPhotos, renderChip };
})();
