/* Hiên Nhà Bun — dinh dưỡng, cân nặng, tủ thức ăn, sổ chi tiêu, chăm sóc sức khỏe, bạn đồng hành
   Lưu ý: cân nặng 1–3 kg là thang đo riêng của trò chơi, không phải cân nặng khỏe mạnh của một chú Corgi thật. */
(function () {
  'use strict';
  const B = window.B, U = B.util, DAY = 86400000;

  B.ledgerAdd = (type, label, amount) => {
    const L = B.S.ledger;
    L.push({ at: B.now(), type, label, amount });
    if (L.length > 300) L.splice(0, L.length - 300);
  };

  /* ---------- Tăng trưởng và thể trạng ---------- */
  B.nutri = {
    // h: số giờ trôi qua. Tăng trưởng diễn ra từ từ, chỉ khi Bun được ăn đủ; không phụ thuộc số lần cho ăn.
    simStep(h, rest) {
      const b = B.S.bun, st = b.stats;
      if (b.frame == null) { b.frame = 1; b.bcs = 4.5; b.diet = 1; b.wlog = []; }
      if (rest || st.hunger > 30) b.frame = Math.min(3, b.frame + (3 - b.frame) * (h / (24 * 45)) * U.clamp(b.diet, 0.5, 1.25) * (0.6 + 0.4 * B.nutri.health() / 100));
      if (!rest) {
        if (st.hunger < 12) b.bcs -= 0.008 * h; // đói kéo dài: gầy đi dần
        else if (st.hunger > 104) b.bcs += 0.012 * h; // ăn quá no: tích mỡ dần
        else b.bcs += (4.5 - b.bcs) * 0.004 * h;
      }
      b.bcs = U.clamp(b.bcs, 1.5, 8.5);
      b.weight = U.clamp(b.frame * (1 + (b.bcs - 4.5) * 0.06), 1, 3);
    },
    logWeight() {
      const b = B.S.bun, k = B.time.today(), l = b.wlog || (b.wlog = []), w = +(b.weight || 1).toFixed(3);
      if (l.length && l[l.length - 1].d === k) l[l.length - 1].w = w; else l.push({ d: k, w });
      if (l.length > 120) l.shift();
    },
    // Thang điểm thể trạng 9 mức quen dùng trong thú y: 4–5 là cân đối
    condition() {
      const c = B.S.bun.bcs || 4.5;
      if (c < 3.2) return { id: 'thin', label: 'Hơi gầy', tip: 'Cho Bun ăn đủ bữa và chọn thức ăn giàu dinh dưỡng hơn.' };
      if (c > 6.2) return { id: 'chubby', label: 'Thừa cân', tip: 'Bớt bánh thưởng, đừng cho ăn khi Bun đã no, và dắt Bun đi dạo thường xuyên.' };
      if (c > 5.4) return { id: 'round', label: 'Hơi tròn', tip: 'Thêm một buổi chơi hoặc đi dạo mỗi ngày.' };
      return { id: 'ideal', label: 'Cân đối', tip: 'Giữ nhịp ăn uống và vận động hiện tại.' };
    },
    health() {
      const S = B.S, b = S.bun, st = b.stats, today = B.time.today();
      let h = 100 - Math.abs((b.bcs || 4.5) - 4.5) * 14;
      if ((b.diet || 1) < 0.85) h -= 8;
      if (st.hunger < 15 || st.thirst < 15) h -= 10;
      h -= Math.min(24, (S.health.items || []).filter((x) => x.status === 'planned' && x.date < today).length * 8);
      return Math.round(U.clamp(h, 5, 100));
    },
    // Hệ số hình dáng để vẽ: lớn dần theo cân nặng, tròn hoặc gầy theo thể trạng
    shape() {
      const b = B.S.bun, w = U.clamp(b.weight || 1, 1, 3), c = b.bcs || 4.5;
      return { size: 0.76 + 0.24 * ((w - 1) / 2), wide: 1 + U.clamp((c - 4.5) * 0.035, -0.07, 0.12) };
    },
  };

  /* ---------- Cho ăn, cho uống, vận động ---------- */
  const basePlay = B.careActions.play;
  Object.assign(B.careActions, {
    feed(id) {
      const S = B.S, st = S.bun.stats, f = B.food(id);
      if (!f) return { ok: false };
      const drink = f.kind === 'drink';
      if (drink && st.thirst > 92) return { ok: false, reason: 'notThirsty' };
      if (!drink && st.hunger >= 118) return { ok: false, reason: 'full' };
      let free = false, fromStock = false;
      if ((S.pantry[id] || 0) > 0) { S.pantry[id]--; fromStock = true; }
      else if (S.coins >= f.price) { B.spend(f.price); B.ledgerAdd(drink ? 'drink' : 'food', f.name, f.price); }
      // Cứu trợ: mỗi ngày một suất hạt thường và một bát nước miễn phí khi ví trống, để trò chơi không bao giờ kẹt
      else if (id === 'kibble' && !S.day.freeMeal) { S.day.freeMeal = true; free = true; }
      else if (id === 'water' && !S.day.freeWater) { S.day.freeWater = true; free = true; }
      else return { ok: false, reason: 'coins', need: f.price - S.coins };
      if (f.hunger) st.hunger = U.clamp(st.hunger + f.hunger, 0, 125);
      if (f.thirst) st.thirst = U.clamp(st.thirst + f.thirst, 0, 100);
      st.joy = U.clamp(st.joy + (f.joy || 0), 0, 100);
      if (drink) S.bun.counters.water++;
      else {
        S.bun.counters.feed++;
        S.bun.diet = (S.bun.diet || 1) * 0.85 + f.q * 0.15;
        if (f.treat) { S.bun.counters.treat++; S.day.treats++; if (S.day.treats > 3) S.bun.bcs = U.clamp(S.bun.bcs + 0.06, 1.5, 8.5); }
        B.mem.add({ key: 'first_feed', icon: 'food', title: 'Bữa ăn đầu tiên', text: `Bạn đổ ${f.name.toLowerCase()} vào bát, Bun ăn không ngẩng đầu lên.` });
      }
      B.addBond(drink ? 1 : 2, true); B.care();
      B.store.save(); B.emit('change');
      return { ok: true, food: f, free, fromStock, drink, overfed: !drink && st.hunger > 104, treatsOver: !!f.treat && S.day.treats > 3 };
    },
    water() { return B.careActions.feed('water'); },
    play() {
      const r = basePlay();
      if (r.ok) { const b = B.S.bun; b.bcs += (4.5 - b.bcs) * 0.05; B.store.save(); }
      return r;
    },
    walk() {
      const S = B.S, st = S.bun.stats, now = B.now();
      if (st.energy < 20) return { ok: false, reason: 'tired' };
      if (S.lastWalk && now - S.lastWalk < 2 * 3600000) return { ok: false, reason: 'recent' };
      S.lastWalk = now; S.day.walks++;
      st.joy = U.clamp(st.joy + 16, 0, 100); st.energy = U.clamp(st.energy - 14, 0, 100); st.hunger = U.clamp(st.hunger - 6, 0, 125); st.thirst = U.clamp(st.thirst - 9, 0, 100);
      S.bun.bcs += (4.5 - S.bun.bcs) * 0.12;
      S.bun.counters.play++;
      B.addBond(2, true); B.care();
      B.mem.add({ key: 'first_walk', icon: 'paw', title: 'Lần đầu đi dạo', text: 'Bun kéo bạn đi một vòng quanh xóm, ngửi từng gốc cây.' });
      B.store.save(); B.emit('change');
      return { ok: true };
    },
  });

  B.pantry = {
    count: (id) => B.S.pantry[id] || 0,
    price: (id, n) => Math.round(B.food(id).price * n * (n >= 5 ? 0.9 : 1)),
    buy(id, n) {
      const S = B.S, f = B.food(id), cost = B.pantry.price(id, n);
      if (!f) return { ok: false };
      if (!B.spend(cost)) return { ok: false, need: cost - S.coins };
      S.pantry[id] = (S.pantry[id] || 0) + n;
      B.ledgerAdd(f.kind === 'drink' ? 'drink' : 'food', `${f.name} × ${n}`, cost);
      B.store.save(); B.emit('change');
      return { ok: true, cost };
    },
  };

  /* ---------- Sổ sức khỏe: tiêm phòng, khám, chải lông ---------- */
  B.healthcare = {
    list() {
      const today = B.time.today();
      return (B.S.health.items || []).map((x) => Object.assign({ overdue: x.status === 'planned' && x.date < today, soon: x.status === 'planned' && x.date >= today && x.date <= U.addDays(today, 3) }, x));
    },
    add(d) {
      const kind = B.HEALTH_KINDS[d.kind] ? d.kind : 'vaccine';
      const it = { id: U.uid(), kind, name: String(d.name || B.HEALTH_KINDS[kind].label).trim().slice(0, 60), date: d.date || B.time.today(), status: 'planned', cost: U.clamp(Math.round(d.cost != null && d.cost !== '' ? +d.cost : B.HEALTH_KINDS[kind].cost), 0, 999), note: String(d.note || '').trim().slice(0, 200), repeat: U.clamp(Math.round(+d.repeat || 0), 0, 36), doneAt: null };
      B.S.health.items.push(it);
      B.store.save(); B.emit('change');
      return it;
    },
    update(id, d) {
      const it = B.S.health.items.find((x) => x.id === id);
      if (!it) return;
      Object.assign(it, d);
      B.store.save(); B.emit('change');
    },
    done(id) {
      const S = B.S, it = S.health.items.find((x) => x.id === id);
      if (!it || it.status === 'done') return { ok: false };
      if (it.cost > 0 && !B.spend(it.cost)) return { ok: false, need: it.cost - S.coins };
      if (it.cost > 0) B.ledgerAdd('vet', it.name, it.cost);
      it.status = 'done'; it.doneAt = B.now();
      if (it.kind === 'groom') S.bun.stats.joy = U.clamp(S.bun.stats.joy + 10, 0, 100);
      B.care();
      B.mem.add({ key: 'health_' + it.kind, icon: 'heart', title: `${B.HEALTH_KINDS[it.kind].label}: ${it.name}`, text: it.kind === 'vaccine' ? 'Bun hơi run một chút, rồi được thưởng một cái xoa đầu.' : 'Bun được chăm sóc cẩn thận và ra về với cái đuôi vẫy.' });
      let next = null;
      if (it.repeat > 0) {
        const d = U.parseKey(it.date < B.time.today() ? B.time.today() : it.date);
        d.setMonth(d.getMonth() + it.repeat);
        next = B.healthcare.add({ kind: it.kind, name: it.name, date: U.dateKey(d), cost: it.cost, note: it.note, repeat: it.repeat });
      }
      B.store.save(); B.emit('change');
      return { ok: true, next };
    },
    remove(id) {
      B.S.health.items = B.S.health.items.filter((x) => x.id !== id);
      B.store.save(); B.emit('change');
    },
    due: () => B.healthcare.list().filter((x) => x.overdue || x.soon).sort((a, b) => (a.date < b.date ? -1 : 1)),
  };

  /* ---------- Nhận nuôi bạn cho Bun ---------- */
  B.pets = {
    has: (kind) => B.S.pets.some((p) => p.kind === kind),
    adopt(kind) {
      const S = B.S, def = B.friendDef(kind);
      if (!def || B.pets.has(kind)) return { ok: false };
      if (!B.spend(def.price)) return { ok: false, need: def.price - S.coins };
      const pet = { id: U.uid(), kind, name: def.name, adoptedAt: B.now(), bond: 0 };
      S.pets.push(pet);
      B.ledgerAdd('friend', `Đón ${def.name} về nhà`, def.price);
      B.mem.add({ key: 'friend_' + kind, icon: 'paw', title: `${def.name} về sống cùng Bun`, text: def.desc });
      B.store.save(); B.emit('change'); B.emit('pets', pet);
      return { ok: true, pet };
    },
    rename(id, name) {
      const p = B.S.pets.find((x) => x.id === id), v = String(name || '').trim().slice(0, 14);
      if (p && v) { p.name = v; B.store.save(); B.emit('change'); }
    },
    // Tình bạn với Bun lớn dần qua mỗi lần chơi cùng, có giới hạn mỗi ngày
    bond(id, n) {
      const S = B.S, p = S.pets.find((x) => x.id === id);
      if (!p || S.day.friendBond >= 12) return;
      S.day.friendBond += n; p.bond = Math.min(100, (p.bond || 0) + n);
      if (p.bond >= 20 && !p.close) { p.close = true; B.mem.add({ icon: 'heart', title: `Bun và ${p.name} đã thân nhau`, text: 'Giờ hai đứa hay nằm cạnh nhau mỗi khi bạn làm việc.' }); }
    },
    bondName: (v) => (v >= 60 ? 'Bạn thân' : v >= 20 ? 'Thân quen' : v >= 5 ? 'Đang làm quen' : 'Mới gặp'),
  };
  void DAY;
})();
