/* Hiên Nhà Bun — đồ dùng riêng và chăm sóc riêng cho từng bạn của Bun (mèo, thỏ, nhím) */
(function () {
  'use strict';
  const B = window.B, U = B.util, esc = U.esc, ic = B.icon;

  /* ---------- Danh mục đồ theo từng loài ---------- */
  // role: bed (chỗ ngủ), food (bát ăn), water (bát nước), toy (đồ chơi)
  const ITEMS = [
    { id: 'cat_bed', kind: 'cat', role: 'bed', name: 'Giường mèo tròn', price: 70, desc: 'Ổ tròn lót nệm, in dấu chân.' },
    { id: 'cat_teepee', kind: 'cat', role: 'bed', name: 'Nhà lều mèo', price: 140, desc: 'Lều vải nhỏ, mèo thích chui vào trốn.' },
    { id: 'cat_food', kind: 'cat', role: 'food', name: 'Bát ăn mèo', price: 25, desc: 'Bát sứ trắng in dấu chân.' },
    { id: 'cat_water', kind: 'cat', role: 'water', name: 'Bát nước mèo', price: 25, desc: 'Bát nước riêng, thấp cho râu không chạm thành.' },
    { id: 'cat_scratch', kind: 'cat', role: 'toy', name: 'Trụ cào móng', price: 90, desc: 'Quấn dây cói, có quả bóng treo.' },
    { id: 'cat_yarn', kind: 'cat', role: 'toy', name: 'Bóng len', price: 20, desc: 'Cuộn len tím để vờn.' },
    { id: 'cat_mouse', kind: 'cat', role: 'toy', name: 'Chuột đồ chơi', price: 25, desc: 'Chuột vải xám, đuôi hồng.' },
    { id: 'cat_tunnel', kind: 'cat', role: 'toy', name: 'Đường hầm mèo', price: 75, desc: 'Ống vải để chui qua chui lại.' },
    { id: 'rab_hutch', kind: 'rabbit', role: 'bed', name: 'Nhà trú thỏ', price: 80, desc: 'Hộp gỗ có cửa vòm.' },
    { id: 'rab_house2', kind: 'rabbit', role: 'bed', name: 'Nhà gỗ hai tầng', price: 170, desc: 'Có cầu thang nhỏ lên tầng trên.' },
    { id: 'rab_food', kind: 'rabbit', role: 'food', name: 'Bát ăn thỏ', price: 25, desc: 'Bát gốm xanh lá, có củ cà rốt nhỏ.' },
    { id: 'rab_water', kind: 'rabbit', role: 'water', name: 'Bát nước thỏ', price: 25, desc: 'Bát nước nặng, khó lật.' },
    { id: 'rab_hay', kind: 'rabbit', role: 'toy', name: 'Giá cỏ khô', price: 55, desc: 'Cho thỏ nhấm cỏ cả ngày.' },
    { id: 'rab_carrot', kind: 'rabbit', role: 'toy', name: 'Đồ chơi cà rốt', price: 20, desc: 'Cà rốt vải để tha đi tha lại.' },
    { id: 'rab_sticks', kind: 'rabbit', role: 'toy', name: 'Que gặm mòn răng', price: 18, desc: 'Răng thỏ mọc suốt đời nên cần gặm.' },
    { id: 'rab_ball', kind: 'rabbit', role: 'toy', name: 'Bóng cỏ gặm', price: 30, desc: 'Bóng đan bằng cỏ, gặm được.' },
    { id: 'hh_igloo', kind: 'hedgehog', role: 'bed', name: 'Nhà trú nhím', price: 75, desc: 'Mái vòm êm để cuộn tròn.' },
    { id: 'hh_bed', kind: 'hedgehog', role: 'bed', name: 'Giường vải mềm', price: 60, desc: 'Viền vải xanh, lót nệm kem.' },
    { id: 'hh_food', kind: 'hedgehog', role: 'food', name: 'Bát ăn nhím', price: 25, desc: 'Bát hồng thấp, dễ với tới.' },
    { id: 'hh_water', kind: 'hedgehog', role: 'water', name: 'Khay nước nhím', price: 22, desc: 'Khay nông cho nhím uống an toàn.' },
    { id: 'hh_wheel', kind: 'hedgehog', role: 'toy', name: 'Bánh xe chạy', price: 95, desc: 'Nhím chạy rất nhiều vào ban đêm.' },
    { id: 'hh_ball', kind: 'hedgehog', role: 'toy', name: 'Bóng đồ chơi', price: 20, desc: 'Bóng nhỏ hai màu để đẩy.' },
    { id: 'hh_tunnel', kind: 'hedgehog', role: 'toy', name: 'Ống chui', price: 45, desc: 'Ống vải xanh để nhím chui.' },
  ];
  const START = { cat: ['cat_bed', 'cat_food', 'cat_water', 'cat_yarn'], rabbit: ['rab_hutch', 'rab_food', 'rab_water', 'rab_carrot'], hedgehog: ['hh_igloo', 'hh_food', 'hh_water', 'hh_ball'] };
  const FOOD = { cat: { name: 'Pate cá', price: 12 }, rabbit: { name: 'Cỏ khô và rau xanh', price: 8 }, hedgehog: { name: 'Hạt côn trùng', price: 10 } };
  const TAG = { cat: '#8FA6B8', rabbit: '#9DB08A', hedgehog: '#E58E84' }; // màu thẻ tên trên bát của từng loài
  const ROLE = { bed: 'Chỗ ngủ', food: 'Bát ăn', water: 'Bát nước', toy: 'Đồ chơi' };
  const item = (id) => ITEMS.find((x) => x.id === id);

  /* ---------- Hình vẽ (gốc toạ độ ở đáy, giữa) ---------- */
  const sh = (rx) => `<ellipse cx="0" cy="0" rx="${rx}" ry="${Math.round(rx / 7)}" fill="#000" opacity=".12"/>`;
  function bowl(body, rim, inside, mark) {
    return `${sh(30)}<path d="M-29,-17 L29,-17 L23,0 C15,3 -15,3 -23,0Z" fill="${body}"/><ellipse cx="0" cy="-17" rx="29" ry="6.5" fill="${rim}"/>${inside}${mark || ''}`;
  }
  const kib = (c) => `<ellipse cx="0" cy="-19" rx="22" ry="5" fill="${c}"/><circle cx="-7" cy="-21" r="2.6" fill="#A06B42"/><circle cx="6" cy="-22" r="2.6" fill="#A06B42"/>`;
  const wat = `<ellipse cx="0" cy="-17.5" rx="23" ry="4.4" fill="#BFE3F0"/><path d="M-10,-18 q5,-2 10,0" stroke="#fff" stroke-width="1.4" fill="none"/>`;
  const empty = `<ellipse cx="0" cy="-17.5" rx="23" ry="4.4" fill="#4A3A30" opacity=".3"/>`;
  const pawMark = (c) => `<g transform="translate(0,-8)" fill="${c}"><ellipse cx="0" cy="1.5" rx="3.2" ry="2.6"/><circle cx="-3.6" cy="-2.2" r="1.3"/><circle cx="0" cy="-3.6" r="1.3"/><circle cx="3.6" cy="-2.2" r="1.3"/></g>`;
  function art(id, level) {
    const lv = level == null ? 2 : level;
    switch (id) {
      case 'cat_bed': return `${sh(58)}<ellipse cx="0" cy="-12" rx="56" ry="20" fill="#B5864C"/><ellipse cx="0" cy="-16" rx="44" ry="13" fill="#F3E8D2"/><path d="M-56,-12 C-56,6 56,6 56,-12 C56,-2 -56,-2 -56,-12Z" fill="#9E7140"/>${pawMark('#D9B38A').replace('translate(0,-8)', 'translate(0,-16) scale(1.4)')}`;
      case 'cat_teepee': return `${sh(56)}<path d="M-52,0 L0,-120 L52,0Z" fill="#F3EADA"/><path d="M-52,0 L0,-120 L-18,0Z" fill="#E6D9C1"/><path d="M-20,0 Q0,-56 20,0Z" fill="#6B4A32"/><path d="M-12,-136 L10,-104 M12,-136 L-10,-104" stroke="#8A6240" stroke-width="4" stroke-linecap="round"/><path d="M-34,-40 h68" stroke="#D99A4E" stroke-width="3" stroke-dasharray="4 5"/>`;
      case 'cat_food': return bowl('#F6F1E7', '#FFFFFF', lv ? kib('#8A5A36') : empty, pawMark(TAG.cat));
      case 'cat_water': return bowl('#F6F1E7', '#FFFFFF', lv ? wat : empty, `<path d="M0,-12 c3,4 4,5 4,7 a4,4 0 0 1 -8,0 c0,-2 1,-3 4,-7z" fill="${TAG.cat}"/>`);
      case 'cat_scratch': return `${sh(40)}<rect x="-36" y="-10" width="72" height="10" rx="3" fill="#C9A06A"/><rect x="-11" y="-112" width="22" height="104" fill="#E3CB98"/><path d="M-11,-100 h22 M-11,-86 h22 M-11,-72 h22 M-11,-58 h22 M-11,-44 h22 M-11,-30 h22 M-11,-16 h22" stroke="#C4A774" stroke-width="2"/><rect x="-32" y="-122" width="64" height="12" rx="3" fill="#C9A06A"/><path d="M26,-112 v34" stroke="#6B4A32" stroke-width="1.6"/><circle cx="26" cy="-74" r="6" fill="#8A6240"/>`;
      case 'cat_yarn': return `${sh(18)}<circle cx="0" cy="-16" r="16" fill="#8E7CC3"/><path d="M-13,-24 q13,10 26,0 M-15,-14 q15,10 30,0 M-8,-30 q8,12 4,28" stroke="#6E5BA8" stroke-width="2" fill="none"/><path d="M14,-8 q10,6 4,10 q-6,4 4,8" stroke="#6E5BA8" stroke-width="2" fill="none"/>`;
      case 'cat_mouse': return `${sh(20)}<ellipse cx="0" cy="-10" rx="18" ry="11" fill="#8E8A86"/><circle cx="14" cy="-16" r="6" fill="#A8A39E"/><circle cx="14" cy="-16" r="3" fill="#E9A8B0"/><circle cx="18" cy="-9" r="1.6" fill="#3B2A22"/><path d="M-18,-8 q-12,2 -10,10 q2,6 -8,6" stroke="#E9A8B0" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
      case 'cat_tunnel': return `${sh(56)}<path d="M-50,-36 L40,-30 L40,0 L-50,-4Z" fill="#E9D6B4"/><ellipse cx="40" cy="-15" rx="12" ry="16" fill="#EFE1C4"/><ellipse cx="40" cy="-15" rx="8" ry="12" fill="#6B4A32"/><ellipse cx="-50" cy="-20" rx="10" ry="17" fill="#E2CBA4"/><g fill="#D9A566">${[[-30, -22], [-8, -18], [14, -24]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="2.6"/>`).join('')}</g>`;
      case 'rab_hutch': return `${sh(56)}<rect x="-52" y="-74" width="104" height="74" rx="4" fill="#B98552"/><path d="M-58,-74 h116 l-10,-16 h-96Z" fill="#96693F"/><path d="M-20,0 V-34 a20,20 0 0 1 40,0 V0Z" fill="#5C3F2A"/><path d="M-52,-50 h104 M-52,-26 h30 M22,-26 h30" stroke="#A8774A" stroke-width="2"/>`;
      case 'rab_house2': return `${sh(62)}<rect x="-56" y="-60" width="112" height="60" fill="#B98552"/><rect x="-56" y="-118" width="112" height="56" fill="#C4915E"/><path d="M-64,-118 L0,-150 L64,-118Z" fill="#96693F"/><path d="M-18,0 V-26 a18,18 0 0 1 36,0 V0Z" fill="#5C3F2A"/><rect x="-14" y="-104" width="28" height="26" rx="13" fill="#5C3F2A"/><path d="M56,0 L86,-58" stroke="#A8774A" stroke-width="7" stroke-linecap="round"/><path d="M62,-12 l10,4 M68,-24 l10,4 M74,-36 l10,4" stroke="#8A6240" stroke-width="3"/>`;
      case 'rab_food': return bowl('#9DB08A', '#B4C2A0', lv ? kib('#A9C27A') + '<path d="M8,-22 l10,-8" stroke="#E8853A" stroke-width="4" stroke-linecap="round"/><path d="M18,-30 l3,-4 M18,-30 l5,-1" stroke="#6FA860" stroke-width="2"/>' : empty, pawMark('#FFF6E6'));
      case 'rab_water': return bowl('#8FB3A0', '#A9C8B6', lv ? wat : empty, `<g transform="translate(0,-8)" fill="#FFF6E6"><ellipse cx="-2.5" cy="-4" rx="1.6" ry="4"/><ellipse cx="2.5" cy="-4" rx="1.6" ry="4"/><circle cx="0" cy="1" r="3.2"/></g>`);
      case 'rab_hay': return `${sh(50)}<rect x="-46" y="-56" width="8" height="56" fill="#A8774A"/><rect x="38" y="-56" width="8" height="56" fill="#A8774A"/><rect x="-46" y="-30" width="92" height="7" fill="#A8774A"/><path d="M-38,-30 C-30,-60 -10,-62 -4,-40 C4,-66 24,-64 30,-40 C34,-58 42,-48 38,-30Z" fill="#D8C27A"/><path d="M-30,-34 l-6,-22 M-16,-36 l2,-24 M0,-36 l6,-22 M16,-34 l-2,-24 M28,-34 l8,-18" stroke="#B5A057" stroke-width="2"/>`;
      case 'rab_carrot': return `${sh(18)}<path d="M-16,-6 L14,-18 C20,-20 22,-12 16,-9Z" fill="#E8853A"/><path d="M-12,-8 l4,2 M-4,-11 l4,2 M4,-14 l4,2" stroke="#C86A22" stroke-width="1.6"/><path d="M16,-15 l8,-8 M17,-13 l10,-3 M15,-17 l2,-10" stroke="#6FA860" stroke-width="3" stroke-linecap="round"/>`;
      case 'rab_sticks': return `${sh(24)}<g stroke-linecap="round"><path d="M-20,-6 L18,-14" stroke="#8A5A36" stroke-width="7"/><path d="M-18,-14 L20,-6" stroke="#A06B42" stroke-width="7"/><path d="M-14,-20 L16,-20" stroke="#96693F" stroke-width="7"/></g>`;
      case 'rab_ball': return `${sh(18)}<circle cx="0" cy="-16" r="16" fill="#9C9A52"/><path d="M-14,-20 q14,8 28,0 M-14,-12 q14,-8 28,0 M-6,-30 q-6,14 0,28 M6,-30 q6,14 0,28" stroke="#7E7C3E" stroke-width="2" fill="none"/>`;
      case 'hh_igloo': return `${sh(52)}<path d="M-50,0 C-50,-70 50,-70 50,0Z" fill="#E3CBA2"/><path d="M-50,0 C-50,-70 50,-70 50,0" fill="none" stroke="#C9AE80" stroke-width="3"/><path d="M-18,0 V-18 a18,18 0 0 1 36,0 V0Z" fill="#5C3F2A"/><g fill="#C9AE80"><circle cx="-26" cy="-40" r="4"/><circle cx="10" cy="-50" r="3.5"/><circle cx="30" cy="-28" r="3"/></g>`;
      case 'hh_bed': return `${sh(50)}<ellipse cx="0" cy="-12" rx="48" ry="17" fill="#8DAA74"/><ellipse cx="0" cy="-15" rx="37" ry="11" fill="#F6EEDD"/><path d="M-48,-12 C-48,4 48,4 48,-12 C48,-3 -48,-3 -48,-12Z" fill="#78955F"/>`;
      case 'hh_food': return bowl('#EFB3B0', '#F6C9C6', lv ? kib('#7A5A3C') : empty, pawMark('#C9746E'));
      case 'hh_water': return `${sh(32)}<path d="M-30,-10 L30,-10 L26,0 L-26,0Z" fill="#B8B4AE"/><ellipse cx="0" cy="-10" rx="30" ry="5" fill="#CFCBC5"/>${lv ? '<ellipse cx="0" cy="-10.5" rx="24" ry="3.4" fill="#BFE3F0"/>' : '<ellipse cx="0" cy="-10.5" rx="24" ry="3.4" fill="#4A3A30" opacity=".25"/>'}`;
      case 'hh_wheel': return `${sh(40)}<path d="M-28,0 L-6,-40 M28,0 L6,-40" stroke="#A8774A" stroke-width="6" stroke-linecap="round"/><circle cx="0" cy="-50" r="38" fill="none" stroke="#C4915E" stroke-width="7"/><circle cx="0" cy="-50" r="31" fill="#F3E6CC" opacity=".6"/><path d="M0,-88 V-12 M-38,-50 H38 M-27,-77 L27,-23 M27,-77 L-27,-23" stroke="#C4915E" stroke-width="2"/><circle cx="0" cy="-50" r="5" fill="#8A6240"/>`;
      case 'hh_ball': return `${sh(16)}<circle cx="0" cy="-14" r="14" fill="#F3B6C2"/><path d="M-14,-14 a14,14 0 0 0 28,0Z" fill="#7FBFC0"/><circle cx="-4" cy="-19" r="3" fill="#fff" opacity=".5"/>`;
      case 'hh_tunnel': return `${sh(50)}<path d="M-44,-32 L36,-28 L36,0 L-44,-2Z" fill="#7FA36B"/><path d="M-30,-31 L-30,-2 M-12,-30 L-12,-1 M6,-29 L6,-1 M22,-29 L22,0" stroke="#6A8F58" stroke-width="2"/><ellipse cx="36" cy="-14" rx="10" ry="14" fill="#6A8F58"/><ellipse cx="36" cy="-14" rx="6" ry="10" fill="#3E5A35"/>`;
    }
    return '';
  }
  const thumb = (id) => `<svg viewBox="-80 -160 160 172" aria-hidden="true">${art(id)}</svg>`;

  /* ---------- Trạng thái của từng bạn ---------- */
  function ensure(p) {
    if (!Array.isArray(p.items)) p.items = [];
    if (p.hunger == null) { p.hunger = 80; p.thirst = 80; p.joy = 70; p.bowlFood = 1; p.bowlWater = 2; }
    // Bộ đồ khởi đầu chỉ tặng một lần khi về nhà; món người dùng đã xóa không tự mọc lại
    if (!p.kit) {
      (START[p.kind] || []).forEach((id) => { const role = item(id).role; if (!p.items.some((x) => item(x.id) && item(x.id).role === role)) p.items.push({ uid: U.uid(), id, placed: true }); });
      p.kit = true;
    }
    return p;
  }
  const pets = () => (B.S.pets || []).map(ensure);
  const owned = (p, role) => p.items.filter((x) => x.placed && item(x.id) && item(x.id).role === role);
  const mine = (pet, id) => pet.items.some((x) => x.id === id);

  /* ---------- Đồ của các bạn trong phòng ---------- */
  // Mỗi bạn có một góc riêng; vị trí người dùng kéo thả được lưu trong house.pos
  function zone(i, L) {
    const W = L.W, z = [{ x: Math.round(W * 0.25), y: 616 }, { x: Math.round(W * 0.86), y: 742 }, { x: Math.round(W * 0.115), y: 640 }][i % 3];
    return z;
  }
  const OFF = { bed: [0, 0], food: [92, 34], water: [150, 46], toy: [-86, 52] };
  function objects(L) {
    const out = [];
    pets().forEach((p, i) => {
      const z = zone(i, L), toyN = { n: 0 };
      p.items.filter((x) => x.placed).forEach((x) => {
        const it = item(x.id);
        if (!it) return;
        let o = OFF[it.role];
        if (it.role === 'toy') { o = [o[0] + toyN.n * 52, o[1] + (toyN.n % 2) * 18]; toyN.n++; }
        const key = 'pi:' + x.uid, pos = (B.S.house.pos || {})[key];
        const lv = it.role === 'food' ? p.bowlFood : it.role === 'water' ? p.bowlWater : null;
        out.push({ key, pet: p, it, x: pos ? pos.x : z.x + o[0], y: pos ? pos.y : z.y + o[1], html: art(x.id, lv) });
      });
    });
    return out;
  }
  function spotOf(pet, role) {
    const o = objects(B.scene.layout()).find((x) => x.pet === pet && x.it.role === role);
    return o ? { x: o.x, y: o.y } : null;
  }

  /* ---------- Chăm sóc ---------- */
  function sim(h, rest) {
    pets().forEach((p) => {
      if (rest) { ['hunger', 'thirst', 'joy'].forEach((k) => (p[k] += (75 - p[k]) * Math.min(1, h * 0.5))); return; }
      p.hunger = U.clamp(p.hunger - 2.2 * h, 0, 100);
      p.thirst = U.clamp(p.thirst - 2.8 * h, 0, 100);
      p.joy = U.clamp(p.joy - (p.hunger < 40 ? 2.4 : 1.4) * h, 0, 100);
    });
  }
  function refill(petId, what) {
    const p = pets().find((x) => x.id === petId);
    if (!p) return { ok: false };
    const isFood = what === 'food', price = isFood ? FOOD[p.kind].price : 3;
    if (!owned(p, what).length) return { ok: false, reason: 'nobowl' };
    if ((isFood ? p.bowlFood : p.bowlWater) >= 2) return { ok: false, reason: 'full' };
    if (!B.spend(price)) return { ok: false, reason: 'coins', need: price - B.S.coins };
    B.ledgerAdd(isFood ? 'food' : 'drink', `${isFood ? FOOD[p.kind].name : 'Nước sạch'} cho ${p.name}`, price);
    if (isFood) p.bowlFood = 2; else p.bowlWater = 2;
    B.store.save(); B.emit('change'); B.scene.build();
    return { ok: true, price };
  }
  // Gọi khi bạn ấy thực sự ăn hoặc uống ở bát của mình
  function consume(p, what) {
    if (what === 'food' && p.bowlFood > 0) { p.bowlFood--; p.hunger = U.clamp(p.hunger + 45, 0, 100); p.joy = U.clamp(p.joy + 5, 0, 100); }
    else if (what === 'water' && p.bowlWater > 0) { p.bowlWater--; p.thirst = U.clamp(p.thirst + 50, 0, 100); }
    else return false;
    B.store.save(); B.scene.build();
    return true;
  }
  function buy(petId, id) {
    const p = pets().find((x) => x.id === petId), it = item(id);
    if (!p || !it || it.kind !== p.kind) return { ok: false };
    if (mine(p, id)) return { ok: false, reason: 'owned' };
    if (!B.spend(it.price)) return { ok: false, reason: 'coins', need: it.price - B.S.coins };
    B.ledgerAdd('friend', `${it.name} cho ${p.name}`, it.price);
    // Món mới cùng loại (giường, bát) thay chỗ món cũ trong phòng; món cũ vào kho
    if (it.role !== 'toy') p.items.forEach((x) => { if (item(x.id).role === it.role) x.placed = false; });
    p.items.push({ uid: U.uid(), id, placed: true });
    p.joy = U.clamp(p.joy + 10, 0, 100);
    B.mem.add({ key: 'pi_' + p.id + id, icon: 'gift', title: `${it.name} cho ${p.name}`, text: it.desc });
    B.store.save(); B.emit('change'); B.scene.build();
    return { ok: true, item: it };
  }
  function place(petId, uid, on) {
    const p = pets().find((x) => x.id === petId), x = p && p.items.find((y) => y.uid === uid);
    if (!x) return;
    const role = item(x.id).role;
    if (on && role !== 'toy') p.items.forEach((y) => { if (y !== x && item(y.id).role === role) y.placed = false; });
    x.placed = !!on;
    B.store.save(); B.scene.build();
  }
  function removeItem(petId, uid) {
    const p = pets().find((x) => x.id === petId);
    if (!p) return;
    p.items = p.items.filter((x) => x.uid !== uid);
    delete (B.S.house.pos || {})['pi:' + uid];
    B.store.save(); B.scene.build();
  }

  /* ---------- Thực đơn khi bấm vào một bạn ---------- */
  function openMenu(petId) {
    const p = pets().find((x) => x.id === petId), pop = document.getElementById('popover');
    if (!p) return;
    const bar = (v, c) => `<div class="meter" style="--v:${Math.round(v)};--c:${c}"><i></i></div>`;
    pop.dataset.kind = 'pet:' + petId;
    pop.innerHTML = `<h4>${esc(p.name)} · ${B.pets.bondName(p.bond || 0)}</h4>
      <div class="pet-bars"><span>No</span>${bar(p.hunger, '#D98B58')}<span>Nước</span>${bar(p.thirst, '#6FA8C4')}<span>Vui</span>${bar(p.joy, '#E07F78')}</div>
      <button class="pop-item" data-pet="pet"><span><strong>Vuốt ve</strong><small>${esc(p.name)} sẽ vui hơn một chút</small></span></button>
      <button class="pop-item" data-pet="food"><span><strong>Đổ ${FOOD[p.kind].name.toLowerCase()}</strong><small>Vào bát ăn riêng của ${esc(p.name)}</small></span><span class="price">${ic('coin')}${FOOD[p.kind].price}</span></button>
      <button class="pop-item" data-pet="water"><span><strong>Thay nước sạch</strong><small>Vào bát nước riêng</small></span><span class="price">${ic('coin')}3</span></button>
      <button class="pop-item" data-pet="play"><span><strong>Chơi với ${esc(p.name)}</strong><small>Dùng đồ chơi riêng của ${esc(p.name)}</small></span></button>
      <button class="pop-item" data-pet="shop"><span><small>Xem và sắm đồ riêng của ${esc(p.name)}</small></span>${ic('chevron')}</button>`;
    pop.hidden = false;
  }
  function onMenu(e) {
    const b = e.target.closest('[data-pet]'), pop = document.getElementById('popover');
    if (!b || !/^pet:/.test(pop.dataset.kind || '')) return;
    const petId = pop.dataset.kind.slice(4), p = pets().find((x) => x.id === petId), a = b.dataset.pet;
    pop.hidden = true;
    if (!p) return;
    if (a === 'pet') { B.friends.pet(petId); p.joy = U.clamp(p.joy + 4, 0, 100); B.store.save(); return; }
    if (a === 'shop') { B.ui.state.shopPet = petId; return B.ui.openShop('friends'); }
    if (a === 'play') {
      if (!owned(p, 'toy').length) return B.ui.toast(`${esc(p.name)} chưa có đồ chơi trong phòng. Mua hoặc lấy từ kho ra nhé.`, { icon: 'gift' });
      p.joy = U.clamp(p.joy + 15, 0, 100); B.pets.bond(petId, 2); B.store.save(); B.friends.playOwn(petId);
      return;
    }
    const r = refill(petId, a);
    if (!r.ok) {
      if (r.reason === 'full') B.ui.toast(`Bát ${a === 'food' ? 'ăn' : 'nước'} của ${esc(p.name)} vẫn còn đầy.`, { ms: 3000 });
      else if (r.reason === 'nobowl') B.ui.toast(`${esc(p.name)} chưa có bát ${a === 'food' ? 'ăn' : 'nước'} riêng trong phòng.`, { icon: 'gift' });
      else B.ui.toast(`Còn thiếu ${r.need} xu.`, { icon: 'coin' });
      return;
    }
    B.friends.goEat(petId, a);
  }

  /* ---------- Thẻ "Bạn của Bun" trong cửa tiệm ---------- */
  function shopHTML() {
    const S = B.S, sel = B.ui.state.shopPet;
    let h = '';
    B.FRIENDS.forEach((d) => {
      const p = pets().find((x) => x.kind === d.kind);
      if (!p) {
        h += `<div class="pet-shop"><div class="pet-head"><div class="thumb">${B.friends.thumb(d.kind)}</div><div><strong>${d.name}</strong> <span class="tag">${d.trait}</span><p>${d.desc}</p>
          <p class="hint" style="margin:0">Về nhà kèm bộ đồ riêng: ${START[d.kind].map((id) => item(id).name.toLowerCase()).join(', ')}.</p></div>
          <button class="btn primary sm price-btn" data-adopt="${d.kind}">${ic('coin')}${d.price}</button></div></div>`;
        return;
      }
      const list = ITEMS.filter((it) => it.kind === d.kind);
      h += `<div class="pet-shop ${sel === p.id ? 'sel' : ''}" id="ps-${p.id}"><div class="pet-head"><div class="thumb">${B.friends.thumb(d.kind)}</div><div>
          <input type="text" class="f-txt on" maxlength="14" value="${esc(p.name)}" data-petname="${p.id}" aria-label="Tên của bạn này"> <span class="tag">${d.trait} · ${B.pets.bondName(p.bond || 0)}</span>
          <p class="hint" style="margin:4px 0 0">Đồ của ${esc(p.name)} chỉ dành cho ${esc(p.name)}, không dùng chung với Bun hay bạn khác.</p></div></div>
        <div class="shop-grid">${list.map((it) => {
          const have = p.items.filter((x) => x.id === it.id), using = have.some((x) => x.placed);
          const btn = !have.length ? `<button class="btn primary sm price-btn" data-pbuy="${p.id}|${it.id}">${ic('coin')}${it.price}</button>`
            : using ? '<button class="btn soft sm" disabled>Đang ở trong phòng</button>' : `<button class="btn soft sm" data-pplace="${p.id}|${have[0].uid}">Đặt vào phòng</button>`;
          return `<div class="item ${using ? 'using' : ''}"><div class="thumb">${thumb(it.id)}</div><span class="tag">${ROLE[it.role]}</span><strong>${it.name}</strong><small>${it.desc}</small>${btn}</div>`;
        }).join('')}</div></div>`;
    });
    return `<p class="hint" style="margin:0 0 10px">Mỗi người bạn có giường, bát ăn, bát nước và đồ chơi riêng. Bấm vào một bạn trong phòng để cho ăn, thay nước hoặc chơi cùng.</p>${h}`;
  }
  function shopClick(e, draw) {
    const t = e.target, ad = t.closest('[data-adopt]'), pb = t.closest('[data-pbuy]'), pp = t.closest('[data-pplace]');
    if (ad) {
      const d = B.friendDef(ad.dataset.adopt), r = B.pets.adopt(d.kind);
      if (r.ok) { ensure(r.pet); B.store.save(); B.scene.build(); B.ui.toast(`<b>${d.name}</b> đã về nhà cùng giường, bát ăn, bát nước và đồ chơi riêng.`, { icon: 'paw', ms: 6500 }); draw(); }
      else B.ui.toast(`Còn thiếu ${r.need} xu.`, { icon: 'coin' });
      return true;
    }
    if (pb) {
      const v = pb.dataset.pbuy.split('|'), r = buy(v[0], v[1]);
      if (r.ok) B.ui.toast(`<b>${r.item.name}</b> đã vào góc riêng của ${esc(pets().find((x) => x.id === v[0]).name)}.`, { icon: 'gift' });
      else if (r.reason === 'coins') B.ui.toast(`Còn thiếu ${r.need} xu.`, { icon: 'coin' });
      draw(); return true;
    }
    if (pp) { const v = pp.dataset.pplace.split('|'); place(v[0], v[1], true); draw(); return true; }
    return false;
  }

  B.PET_ITEMS = ITEMS;
  Object.assign(B.pets, { item, art, thumb, ensure, list: pets, objects, spotOf, owned, sim, refill, consume, buy, place, removeItem, openMenu, onMenu, shopHTML, shopClick, FOOD, ROLE, START });
})();
