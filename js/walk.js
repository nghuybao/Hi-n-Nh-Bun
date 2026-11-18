/* Hiên Nhà Bun — dắt Bun đi dạo: một công viên ngoài trời riêng, Bun đi theo lối mòn, dừng lại khám phá, rồi về nhà */
(function () {
  'use strict';
  const B = window.B, U = B.util, A = B.art, $ = U.$, esc = U.esc, ic = B.icon;
  const L = 5200, START = 300, END = L - 420, M_PER_UNIT = 0.15;
  const st = { on: false, raf: 0, last: 0, x: START, dir: 1, mode: 'walk', until: 0, target: null, camX: 0, visited: {}, spots: [], dist: 0, stepAcc: 0, startAt: 0, paused: false, pets: [], VW: 1200, bubbleUntil: 0, ending: false };
  const pnow = () => performance.now();
  const reduce = () => document.documentElement.classList.contains('reduce-motion');
  const pathY = (x) => 694 + 20 * Math.sin(x / 390) + 8 * Math.sin(x / 140 + 1.3);
  const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- Điểm dừng chân trên đường ---------- */
  const POIS = [
    { x: 560, kind: 'flowers', act: 'sniff', ms: 2600, say: 'Hoa thơm ghê!', name: 'Khóm hoa ven đường' },
    { x: 980, kind: 'bush', act: 'sniff', ms: 2400, say: 'Trong bụi cây có mùi gì lạ lắm…', name: 'Bụi cây rậm' },
    { x: 1380, kind: 'butterfly', act: 'chase', ms: 2200, say: 'Bướm kìa! Đuổi theo thôi!', name: 'Đuổi bướm' },
    { x: 1820, kind: 'bench', act: 'rest', ms: 3000, say: 'Nghỉ chân một chút nha.', name: 'Ghế đá' },
    { x: 2350, kind: 'pond', act: 'look', ms: 3200, say: 'Có vịt kìa! Cạc cạc!', name: 'Hồ vịt' },
    { x: 2980, kind: 'tree', act: 'sniff', ms: 2400, say: 'Gốc cây này nhiều mùi ghê.', name: 'Cây hoa sữa' },
    { x: 3480, kind: 'flowers', act: 'sniff', ms: 2400, say: 'Lại thêm hoa nữa!', name: 'Bồn hoa' },
    { x: 3940, kind: 'ball', act: 'play', ms: 2600, say: 'Có quả bóng ai bỏ quên!', name: 'Quả bóng lăn' },
    { x: 4450, kind: 'bench', act: 'rest', ms: 2600, say: 'Mỏi chân rồi, ngồi xíu.', name: 'Ghế gỗ' },
    { x: END, kind: 'fountain', act: 'look', ms: 3000, say: 'Tới đài phun nước rồi! Mình về nhà nha?', name: 'Đài phun nước' },
  ];

  /* ---------- Hình vẽ công viên ---------- */
  let C = {}; // bảng màu theo giờ và mùa
  function palette() {
    const h = B.time.visualHour(), k = B.scene.sky(h), wx = B.scene.weather(), se = B.scene.season(), mix = B.scene.mix;
    const dim = (c) => mix(c, '#0C1430', k.dark * 0.85);
    let top = k.top, bot = k.bot;
    if (wx === 'rain') { top = mix(top, '#6F7C8C', 0.6); bot = mix(bot, '#A9B4BE', 0.6); }
    const leaf = { spring: ['#8DBE78', '#A9D08F', '#F3B6C2'], summer: ['#5E9C55', '#77B06A', '#F2C14E'], autumn: ['#D98F3F', '#C96F2E', '#E8B04A'], winter: ['#8FA58A', '#A9B79B', '#E9EEF2'] }[se];
    C = { top, bot, dark: k.dark, night: k.dark > 0.45, rain: wx === 'rain', season: se, dim,
      hillFar: dim('#B7CFA6'), hillNear: dim('#9CBF88'), grass: dim('#A7C784'), grass2: dim('#93B972'), path: dim('#E2C99A'), pathEdge: dim('#C9AA74'),
      trunk: dim('#7A5A3C'), leaf1: dim(leaf[0]), leaf2: dim(leaf[1]), bloom: dim(leaf[2]), wood: dim('#A8774A'), wood2: dim('#8A6240'), stone: dim('#C9C2B4'), water: dim('#8CC3D8') };
  }
  function tree(x, y, s, i) {
    const c = i % 2 ? C.leaf1 : C.leaf2;
    return `<g transform="translate(${x},${y}) scale(${s})"><rect x="-9" y="-120" width="18" height="120" rx="6" fill="${C.trunk}"/>
      <circle cx="0" cy="-150" r="62" fill="${c}"/><circle cx="-46" cy="-118" r="44" fill="${c}"/><circle cx="48" cy="-122" r="46" fill="${c}"/><circle cx="-12" cy="-186" r="40" fill="${C.leaf1}"/>
      ${C.season === 'spring' ? `<circle cx="-30" cy="-160" r="6" fill="${C.bloom}"/><circle cx="22" cy="-140" r="6" fill="${C.bloom}"/><circle cx="40" cy="-176" r="5" fill="${C.bloom}"/>` : ''}</g>`;
  }
  function flowers(x, y, seed) {
    const cols = ['#F3B6C2', '#F6D36B', '#FFFFFF', '#E58E84', '#B8A6E0'];
    let s = '';
    for (let i = 0; i < 9; i++) {
      const fx = x + (rnd(seed + i) - 0.5) * 120, fy = y + (rnd(seed + i + 9) - 0.5) * 26, c = C.dim(cols[(seed + i) % cols.length]);
      s += `<path d="M${fx},${fy} q-3,-12 0,-24" stroke="${C.grass2}" stroke-width="2.5" fill="none"/><circle cx="${fx}" cy="${fy - 26}" r="6.5" fill="${c}"/><circle cx="${fx}" cy="${fy - 26}" r="2.4" fill="${C.dim('#F2C14E')}"/>`;
    }
    return s;
  }
  function bush(x, y) {
    return `<g transform="translate(${x},${y})"><ellipse cx="0" cy="0" rx="74" ry="10" fill="#000" opacity=".1"/><circle cx="-38" cy="-30" r="34" fill="${C.leaf2}"/><circle cx="12" cy="-44" r="42" fill="${C.leaf1}"/><circle cx="50" cy="-26" r="30" fill="${C.leaf2}"/>
      <circle cx="-20" cy="-50" r="4" fill="${C.dim('#D5503F')}"/><circle cx="26" cy="-30" r="4" fill="${C.dim('#D5503F')}"/><circle cx="4" cy="-62" r="4" fill="${C.dim('#D5503F')}"/></g>`;
  }
  function bench(x, y) {
    return `<g transform="translate(${x},${y})"><ellipse cx="0" cy="2" rx="80" ry="8" fill="#000" opacity=".1"/><rect x="-66" y="-46" width="8" height="46" fill="${C.wood2}"/><rect x="58" y="-46" width="8" height="46" fill="${C.wood2}"/>
      <rect x="-76" y="-52" width="152" height="12" rx="4" fill="${C.wood}"/><rect x="-72" y="-92" width="144" height="10" rx="4" fill="${C.wood}"/><rect x="-72" y="-74" width="144" height="10" rx="4" fill="${C.wood}"/><rect x="-62" y="-92" width="6" height="42" fill="${C.wood2}"/><rect x="56" y="-92" width="6" height="42" fill="${C.wood2}"/></g>`;
  }
  function lamp(x, y) {
    const lit = C.dark > 0.3;
    return `<g transform="translate(${x},${y})"><rect x="-4" y="-200" width="8" height="200" fill="${C.dim('#4A4A52')}"/><path d="M-18,-200 h36 l-8,-26 h-20Z" fill="${C.dim('#3E3E46')}"/>
      <circle cx="0" cy="-208" r="9" fill="${lit ? '#FFE7A8' : C.dim('#EDE6D2')}"/>${lit ? '<circle class="wk-glow" cx="0" cy="-208" r="70" fill="url(#wkHalo)"/>' : ''}</g>`;
  }
  function pond(x, y) {
    return `<g transform="translate(${x},${y})"><ellipse cx="0" cy="0" rx="190" ry="40" fill="${C.stone}"/><ellipse cx="0" cy="-2" rx="176" ry="32" fill="${C.water}"/>
      <path d="M-120,-6 q20,-6 40,0 M30,6 q24,-6 48,0" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>
      <g class="wk-duck"><ellipse cx="-40" cy="-10" rx="16" ry="9" fill="${C.dim('#FFFFFF')}"/><circle cx="-28" cy="-20" r="7" fill="${C.dim('#FFFFFF')}"/><path d="M-22,-20 l8,2 l-8,2Z" fill="#E8853A"/></g>
      <g class="wk-duck d2"><ellipse cx="60" cy="4" rx="14" ry="8" fill="${C.dim('#F4C542')}"/><circle cx="70" cy="-5" r="6" fill="${C.dim('#F4C542')}"/><path d="M75,-5 l7,2 l-7,2Z" fill="#E8853A"/></g></g>`;
  }
  function gate(x, y) {
    return `<g transform="translate(${x},${y})"><rect x="-120" y="-230" width="16" height="230" fill="${C.wood2}"/><rect x="104" y="-230" width="16" height="230" fill="${C.wood2}"/>
      <path d="M-134,-226 Q0,-290 134,-226 L134,-206 Q0,-266 -134,-206Z" fill="${C.wood}"/><rect x="-86" y="-276" width="172" height="40" rx="8" fill="${C.dim('#FFF6E4')}" stroke="${C.wood2}" stroke-width="4"/>
      <text x="0" y="-249" text-anchor="middle" font-size="19" font-weight="700" font-family="Quicksand, sans-serif" fill="${C.dim('#6B4A32')}">Công viên Hoa Sữa</text></g>`;
  }
  function fountain(x, y) {
    return `<g transform="translate(${x},${y})"><ellipse cx="0" cy="0" rx="150" ry="34" fill="${C.stone}"/><ellipse cx="0" cy="-4" rx="134" ry="26" fill="${C.water}"/><rect x="-14" y="-90" width="28" height="86" fill="${C.stone}"/>
      <ellipse cx="0" cy="-90" rx="54" ry="12" fill="${C.stone}"/><g class="wk-spray"><path d="M0,-96 q-30,-60 -50,-10 M0,-96 q30,-60 50,-10 M0,-96 v-60" stroke="#DCEFF7" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/></g></g>`;
  }
  function butterfly(x, y) {
    return `<g transform="translate(${x},${y})"><g class="wk-bfly"><g class="wing l"><ellipse cx="-8" cy="-4" rx="9" ry="12" fill="${C.dim('#F2C14E')}"/></g><g class="wing r"><ellipse cx="8" cy="-4" rx="9" ry="12" fill="${C.dim('#F2C14E')}"/></g><rect x="-1.5" y="-12" width="3" height="16" rx="1.5" fill="#3B2A22"/></g></g>`;
  }
  function ballArt(x, y) { return `<g id="wkBall" transform="translate(${x},${y})"><ellipse cx="0" cy="0" rx="14" ry="4" fill="#000" opacity=".15"/><circle cx="0" cy="-15" r="15" fill="${C.dim('#E06A52')}"/><path d="M-13,-20 q13,5 26,0" stroke="#fff" stroke-width="3" fill="none"/></g>`; }

  function build() {
    palette();
    const r = $('#world').getBoundingClientRect(), VW = (st.VW = Math.round(U.clamp((800 * r.width) / Math.max(200, r.height), 700, 1800)));
    const svg = $('#wkSvg');
    svg.setAttribute('viewBox', `0 0 ${VW} 800`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
    let stars = '';
    if (C.night) for (let i = 0; i < 40; i++) stars += `<circle cx="${(rnd(i) * VW).toFixed(0)}" cy="${(rnd(i + 50) * 320).toFixed(0)}" r="${(0.8 + rnd(i + 99) * 1.4).toFixed(1)}" fill="#fff" class="star" style="animation-delay:${(rnd(i) * 4).toFixed(1)}s"/>`;
    const h = B.time.visualHour(), dp = (h - 5.6) / 13;
    $('#wkSky').innerHTML = `<rect width="${VW}" height="800" fill="url(#wkSkyG)"/>${stars}
      ${dp > 0 && dp < 1 && !C.rain ? `<circle cx="${(VW * (0.15 + dp * 0.7)).toFixed(0)}" cy="${(320 - Math.sin(Math.PI * dp) * 220).toFixed(0)}" r="34" fill="#FFEFB0"/>` : C.night && !C.rain ? `<circle cx="${(VW * 0.78).toFixed(0)}" cy="120" r="24" fill="#F6F1DC"/>` : ''}
      <g class="cloud c1" opacity="${C.rain ? 0.9 : 0.75}"><ellipse cx="${VW * 0.2}" cy="130" rx="80" ry="22" fill="${C.dim('#FFFFFF')}"/><ellipse cx="${VW * 0.2 + 50}" cy="116" rx="50" ry="22" fill="${C.dim('#FFFFFF')}"/></g>
      <g class="cloud c2" opacity="${C.rain ? 0.9 : 0.6}"><ellipse cx="${VW * 0.66}" cy="190" rx="70" ry="18" fill="${C.dim('#FFFFFF')}"/></g>`;
    $('#wkSkyG').innerHTML = `<stop offset="0" stop-color="${C.top}"/><stop offset=".75" stop-color="${C.bot}"/>`;
    // Đồi xa và hàng cây giữa (trôi chậm hơn để có chiều sâu)
    const farW = (L - VW) * 0.18 + VW + 400;
    let hills = `<path d="M0,520 ${Array.from({ length: Math.ceil(farW / 160) + 1 }, (_, i) => `L${i * 160},${(470 - 40 * Math.sin(i * 0.9) - 30 * rnd(i)).toFixed(0)}`).join(' ')} L${farW},800 L0,800Z" fill="${C.hillFar}"/>`;
    hills += `<path d="M0,560 ${Array.from({ length: Math.ceil(farW / 120) + 1 }, (_, i) => `L${i * 120},${(530 - 26 * Math.sin(i * 1.3 + 2) - 20 * rnd(i + 7)).toFixed(0)}`).join(' ')} L${farW},800 L0,800Z" fill="${C.hillNear}"/>`;
    $('#wkFar').innerHTML = hills;
    const midW = (L - VW) * 0.55 + VW + 300;
    let mid = '';
    for (let x = 60, i = 0; x < midW; x += 190 + rnd(i) * 160, i++) mid += tree(x, 568 + rnd(i + 3) * 10, 0.55 + rnd(i + 5) * 0.25, i);
    $('#wkMid').innerHTML = mid;
    // Mặt đất: cỏ, hàng rào, lối đi, các điểm dừng chân
    let g = `<rect x="0" y="560" width="${L}" height="240" fill="${C.grass}"/>`;
    for (let x = 0, i = 0; x < L; x += 70, i++) g += `<path d="M${x + rnd(i) * 40},${600 + rnd(i + 3) * 160} q4,-12 8,0 q4,-10 8,0" stroke="${C.grass2}" stroke-width="2" fill="none"/>`;
    let fence = '';
    for (let x = 0; x < L; x += 64) fence += `<rect x="${x}" y="582" width="7" height="40" rx="2" fill="${C.dim('#E9DCC3')}"/>`;
    g += fence + `<rect x="0" y="592" width="${L}" height="5" fill="${C.dim('#E9DCC3')}"/><rect x="0" y="608" width="${L}" height="5" fill="${C.dim('#E9DCC3')}"/>`;
    // Đồ vật phía sau lối đi
    for (let x = 700; x < L; x += 700) g += lamp(x, 640);
    POIS.forEach((p, i) => {
      const y = pathY(p.x);
      if (p.kind === 'tree') g += tree(p.x + 60, y - 40, 1.25, i);
      if (p.kind === 'bush') g += bush(p.x + 40, y - 34);
      if (p.kind === 'bench') g += bench(p.x + 30, y - 36);
      if (p.kind === 'pond') g += pond(p.x + 40, y - 70);
      if (p.kind === 'fountain') g += fountain(p.x + 140, y - 60);
    });
    g += gate(START - 60, pathY(START - 60) - 30);
    // Lối mòn
    let top = '', bot = '';
    for (let x = 0; x <= L; x += 40) { top += `${x},${(pathY(x) - 32).toFixed(1)} `; bot = `${x},${(pathY(x) + 30).toFixed(1)} ` + bot; }
    g += `<polygon points="${top}${bot}" fill="${C.path}"/><polyline points="${top}" fill="none" stroke="${C.pathEdge}" stroke-width="3"/>`;
    for (let i = 0; i < L / 60; i++) { const x = i * 60 + rnd(i) * 50; g += `<ellipse cx="${x.toFixed(0)}" cy="${(pathY(x) + (rnd(i + 2) - 0.5) * 40).toFixed(0)}" rx="${(2 + rnd(i + 4) * 3).toFixed(1)}" ry="2" fill="${C.pathEdge}" opacity=".7"/>`; }
    if (C.rain) for (let i = 0; i < 8; i++) { const x = 400 + i * 600 + rnd(i) * 200; g += `<ellipse cx="${x.toFixed(0)}" cy="${(pathY(x) + 6).toFixed(0)}" rx="40" ry="8" fill="${C.water}" opacity=".7"/>`; }
    // Đồ vật phía trước lối đi
    POIS.forEach((p, i) => {
      const y = pathY(p.x);
      if (p.kind === 'flowers') g += flowers(p.x + 20, y + 70, i * 13);
      if (p.kind === 'butterfly') g += flowers(p.x + 80, y + 64, 77) + `<g id="wkBfly">${butterfly(p.x + 60, y - 60)}</g>`;
      if (p.kind === 'ball') g += ballArt(p.x + 50, y + 4);
    });
    g += '<g id="wkActors"></g>';
    $('#wkGround').innerHTML = g;
    let fg = '';
    for (let x = 0, i = 0; x < L * 1.3; x += 110, i++) fg += `<path d="M${x},800 q6,-${30 + rnd(i) * 30} 12,0 q6,-${20 + rnd(i + 1) * 30} 12,0" fill="${C.grass2}"/>`;
    $('#wkFg').innerHTML = fg;
    let rain = '';
    if (C.rain) for (let i = 0; i < 70; i++) rain += `<path class="drop" d="M${(rnd(i) * (VW + 100)).toFixed(0)},-20 l-7,26" style="animation-delay:${(-rnd(i + 5) * 1.2).toFixed(2)}s;animation-duration:${(0.5 + rnd(i + 9) * 0.4).toFixed(2)}s"/>`;
    $('#wkRain').innerHTML = rain;
    // Diễn viên: các bạn đi theo sau, rồi đến Bun ở trước
    const pets = (B.S.pets || []).filter((p) => p.kind !== 'cat');
    st.pets = pets.map((p, i) => ({ pet: p, x: st.x - 120 * (i + 1), dir: 1 }));
    $('#wkActors').innerHTML = st.pets.map((a) => `<g class="friend ${a.pet.kind} moving wk-pet" data-id="${a.pet.id}" data-pose="up"><ellipse class="bun-shadow" cx="0" cy="0" rx="32" ry="6"/><g class="f-flip"><g class="f-in">${B.friends.art(a.pet.kind)}</g></g></g>`).join('')
      + A.bun({ id: 'wkBun', outfit: B.S.bun.outfit, cls: 'walking' });
    const bun = $('#wkBun');
    bun.dataset.mood = B.mood ? B.mood() : 'happy';
    bun.classList.toggle('wag', true);
    place();
  }

  /* ---------- Di chuyển ---------- */
  function speed() {
    const s = B.S.bun.stats, base = st.mode === 'run' ? 210 : 78;
    return base * (s.hunger < 50 ? 0.72 : 1) * (s.energy < 30 ? 0.8 : 1) * (reduce() ? 1.6 : 1);
  }
  function setPose(p) { const b = $('#wkBun'); if (b) b.dataset.pose = p; }
  function setMove(kind) {
    const b = $('#wkBun');
    if (!b) return;
    b.classList.toggle('walking', kind === 'walk');
    b.classList.toggle('running', kind === 'run');
    $$wkPets().forEach((el) => el.classList.toggle('moving', kind !== 'stop'));
  }
  const $$wkPets = () => Array.from(document.querySelectorAll('#wkActors .wk-pet'));
  function place() {
    const b = $('#wkBun');
    if (!b) return;
    const sh = B.nutri ? B.nutri.shape() : { size: 1, wide: 1 }, s = 0.92 * sh.size;
    b.setAttribute('transform', `translate(${st.x.toFixed(1)},${pathY(st.x).toFixed(1)}) scale(${(s * sh.wide).toFixed(3)},${s.toFixed(3)})`);
    b.querySelector('.bun-flip').style.transform = `scaleX(${st.dir})`;
    $$wkPets().forEach((el, i) => {
      const a = st.pets[i];
      if (!a) return;
      el.setAttribute('transform', `translate(${a.x.toFixed(1)},${(pathY(a.x) + 14).toFixed(1)}) scale(.8)`);
      el.querySelector('.f-flip').style.transform = `scaleX(${a.dir})`;
    });
    const VW = st.VW, want = U.clamp(st.x - VW * 0.38, 0, L - VW);
    st.camX = reduce() ? want : st.camX + (want - st.camX) * 0.08;
    $('#wkGround').setAttribute('transform', `translate(${(-st.camX).toFixed(1)},0)`);
    $('#wkMid').setAttribute('transform', `translate(${(-st.camX * 0.55).toFixed(1)},0)`);
    $('#wkFar').setAttribute('transform', `translate(${(-st.camX * 0.18).toFixed(1)},0)`);
    $('#wkFg').setAttribute('transform', `translate(${(-st.camX * 1.25).toFixed(1)},0)`);
    const meters = Math.round(st.dist * M_PER_UNIT);
    $('#wkInfo').textContent = `${meters} m · ${st.spots.length} chỗ đã khám phá`;
    $('#wkProg').style.width = `${U.clamp(((st.x - START) / (END - START)) * 100, 0, 100).toFixed(1)}%`;
    if (pnow() < st.bubbleUntil) placeBubble(); else $('#wkBubble').classList.remove('on');
  }
  function say(text, ms) {
    const bb = $('#wkBubble');
    bb.textContent = text;
    bb.classList.add('on');
    st.bubbleUntil = pnow() + (ms || 3000);
    placeBubble();
  }
  function placeBubble() {
    const svg = $('#wkSvg'), m = svg.getScreenCTM(), bb = $('#wkBubble'), wr = $('#world').getBoundingClientRect();
    if (!m) return;
    const pt = svg.createSVGPoint();
    pt.x = st.x - st.camX + 60 * st.dir; pt.y = pathY(st.x) - 230;
    const p = pt.matrixTransform(m);
    bb.style.left = U.clamp(p.x - wr.left, bb.offsetWidth / 2 + 8, wr.width - bb.offsetWidth / 2 - 8) + 'px';
    bb.style.top = Math.max(bb.offsetHeight + 70, p.y - wr.top) + 'px';
  }
  function act(p) {
    st.visited[p.x] = 1;
    st.spots.push(p.name);
    say(p.say, p.ms + 400);
    snd(p.act === 'look' && p.kind === 'pond' ? 'duck' : p.act === 'sniff' ? 'sniff' : p.act === 'chase' ? 'bark' : 'happy');
    if (p.act === 'chase') { st.mode = 'run'; st.until = pnow() + p.ms; setMove('run'); const bf = $('#wkBfly'); if (bf) bf.classList.add('fly'); return; }
    st.mode = 'stop'; st.until = pnow() + (reduce() ? 900 : p.ms); setMove('stop');
    setPose(p.act === 'sniff' ? 'eat' : p.act === 'rest' || p.act === 'look' ? 'sit' : 'stand');
    if (p.act === 'play') { const bun = $('#wkBun .bun-inner'); if (bun && !reduce()) { bun.classList.remove('jump'); void bun.getBoundingClientRect(); bun.style.setProperty('--jumps', 3); bun.classList.add('jump'); } snd('squeak'); }
    if (p.kind === 'fountain') st.ending = true;
  }
  function snd(name) { if (B.audio) B.audio.play(name, { src: 'walk' }); }
  function frame(t) {
    if (!st.on) return;
    const dt = Math.min(0.1, (t - st.last) / 1000);
    st.last = t;
    if (!st.paused) {
      if (st.mode === 'stop') {
        if (t > st.until) {
          if (st.ending) { finish('end'); return; }
          st.mode = 'walk'; setPose('stand'); setMove('walk');
        }
      } else {
        if (st.mode === 'run' && t > st.until) { st.mode = 'walk'; setMove('walk'); }
        let goal = st.target != null ? st.target : END;
        const dx = goal - st.x, v = speed() * dt;
        if (Math.abs(dx) <= v) {
          st.x = goal;
          if (st.target != null) { st.target = null; st.mode = 'stop'; st.until = t + 1600; setMove('stop'); setPose('sit'); }
        } else { st.dir = dx > 0 ? 1 : -1; st.x += st.dir * v; st.dist += v; st.stepAcc += v; }
        const stepLen = st.mode === 'run' ? 44 : 30;
        if (st.stepAcc >= stepLen) { st.stepAcc = 0; snd(st.mode === 'run' ? 'run' : 'step'); }
        const p = POIS.find((q) => !st.visited[q.x] && st.dir > 0 && st.x >= q.x - 4 && st.x <= q.x + 40);
        if (p && st.mode !== 'run') act(p);
      }
      // Các bạn đi theo sau với khoảng cách vừa phải
      st.pets.forEach((a, i) => {
        const want = st.x - st.dir * 110 * (i + 1), d = want - a.x;
        if (Math.abs(d) > 4) { a.dir = d > 0 ? 1 : -1; a.x += Math.sign(d) * Math.min(Math.abs(d), (Math.abs(d) > 160 ? 230 : 90) * dt); }
      });
    }
    place();
    st.raf = requestAnimationFrame(frame);
  }

  /* ---------- Bắt đầu và kết thúc ---------- */
  function start() {
    const c = B.careActions.canWalk();
    if (!c.ok) {
      if (c.reason === 'tired') B.bun.say('Tớ mệt quá, cho tớ nằm nghỉ chút đã nha.', 3800);
      return;
    }
    if (st.on) return;
    const h = B.time.hour();
    if ((h >= 22.5 || h < 5.5) && B.bun.state.pose === 'sleep') { B.bun.say('Khuya rồi, mai mình đi dạo nha.', 3600); return; }
    B.ui.closePopover();
    Object.assign(st, { on: true, x: START, dir: 1, mode: 'walk', target: null, camX: 0, visited: {}, spots: [], dist: 0, stepAcc: 0, startAt: B.now(), paused: false, ending: false });
    const ov = $('#walkScene');
    ov.hidden = false;
    build();
    $('#wkPause').innerHTML = `${ic('pause')}Dừng ngắm cảnh`;
    requestAnimationFrame(() => ov.classList.add('on'));
    document.body.classList.add('is-walking');
    const s = B.S.bun.stats;
    setTimeout(() => say(s.hunger < 50 ? 'Tớ hơi đói, mình đi chậm thôi nha.' : c.recent ? 'Lại được đi dạo nữa! Vui quá!' : 'Đi dạo thôi! Gâu!', 3200), 500);
    snd('bark');
    if (B.audio) B.audio.setScene('outdoor');
    st.last = pnow();
    st.raf = requestAnimationFrame(frame);
  }
  function finish(why) {
    if (!st.on) return;
    st.on = false;
    cancelAnimationFrame(st.raf);
    const frac = U.clamp((st.x - START) / (END - START), 0, 1), secs = Math.max(1, Math.round((B.now() - st.startAt) / 1000));
    const r = B.careActions.walk({ frac, spots: st.spots.length });
    const ov = $('#walkScene');
    ov.classList.remove('on');
    setTimeout(() => { ov.hidden = true; $('#wkGround').innerHTML = ''; }, 450);
    document.body.classList.remove('is-walking');
    if (B.audio) B.audio.setScene('home');
    B.bun.welcome(4 * 3600000);
    const meters = Math.round(st.dist * M_PER_UNIT), d = r.delta, sign = (n) => (n > 0 ? '+' + n : String(n));
    const time = secs >= 60 ? `${Math.floor(secs / 60)} phút ${secs % 60} giây` : `${secs} giây`;
    B.ui.modal({ title: why === 'end' ? 'Đi hết một vòng công viên!' : 'Về nhà rồi!', cls: 'small', html: `<div class="hello">${A.avatar(B.S.bun.outfit)}<div><p>Bun đi được khoảng <b>${meters} m</b> trong ${time}${st.spots.length ? ` và ghé ${st.spots.length} chỗ` : ''}.</p>${st.spots.length ? `<p class="hint" style="margin:0">${st.spots.map(esc).join(' · ')}</p>` : ''}</div></div>
      <div class="sum-grid"><div class="card"><b>${sign(d.joy)}</b><span>Niềm vui</span></div><div class="card"><b>${sign(d.energy)}</b><span>Năng lượng</span></div><div class="card"><b>${sign(d.stress)}</b><span>Căng thẳng</span></div></div>
      ${r.recent ? '<p class="hint">Bun vừa đi dạo trong 2 giờ qua nên lần này lợi ích chỉ còn một nửa. Nghỉ một lúc rồi đi tiếp sẽ tốt hơn.</p>' : ''}
      ${d.thirst <= -6 ? '<p class="hint">Bun hơi khát sau buổi đi dạo, nhớ cho Bun uống nước nhé.</p>' : ''}
      <div class="row end"><button class="btn primary" data-close data-autofocus>Vào nhà thôi</button></div>` });
  }
  function init() {
    const w = document.createElement('div');
    w.id = 'walkScene'; w.className = 'walk-scene'; w.hidden = true;
    w.innerHTML = `<svg id="wkSvg" aria-label="Công viên Hoa Sữa, Bun đang đi dạo"><defs><linearGradient id="wkSkyG" x1="0" y1="0" x2="0" y2="1"></linearGradient><radialGradient id="wkHalo"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".6"/><stop offset="1" stop-color="#FFE7A8" stop-opacity="0"/></radialGradient></defs>
        <g id="wkSky"></g><g id="wkFar"></g><g id="wkMid"></g><g id="wkGround"></g><g id="wkFg"></g><g id="wkRain"></g></svg>
      <div class="wk-top"><div class="wk-title"><strong>Công viên Hoa Sữa</strong><span id="wkInfo">0 m</span></div><div class="wk-progress" aria-hidden="true"><i id="wkProg"></i></div></div>
      <div class="wk-bubble" id="wkBubble" role="status" aria-live="polite"></div>
      <div class="wk-actions"><button class="act" data-wk="run">${ic('bolt')}Chạy một đoạn</button><button class="act" id="wkPause" data-wk="pause"></button><button class="act home" data-wk="home">${ic('home')}Về nhà</button></div>`;
    $('#world').appendChild(w);
    w.addEventListener('click', (e) => {
      const b = e.target.closest('[data-wk]');
      if (b) {
        const a = b.dataset.wk;
        if (a === 'home') return finish('home');
        if (a === 'pause') { st.paused = !st.paused; setMove(st.paused ? 'stop' : st.mode === 'stop' ? 'stop' : st.mode); setPose(st.paused ? 'sit' : 'stand'); b.innerHTML = st.paused ? `${ic('play')}Đi tiếp` : `${ic('pause')}Dừng ngắm cảnh`; if (st.paused) say('Ngắm cảnh một chút nha.', 2400); return; }
        if (a === 'run') {
          if (B.S.bun.stats.energy < 25) return say('Tớ hơi mệt, đi bộ thôi nha.', 2600);
          if (B.S.bun.stats.hunger < 50) return say('Bụng đói nên tớ không chạy nổi…', 2600);
          st.paused = false; st.mode = 'run'; st.until = pnow() + 2600; st.target = null; setPose('stand'); setMove('run'); snd('bark'); say('Gâu! Chạy nè!', 1600); return;
        }
        return;
      }
      // Bấm xuống lối đi: Bun đi tới chỗ đó
      if (e.target.closest('#wkSvg')) {
        const svg = $('#wkSvg'), m = svg.getScreenCTM();
        if (!m) return;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(m.inverse());
        if (p.y < 560) return;
        st.target = U.clamp(p.x + st.camX, START - 100, END); st.paused = false; st.mode = 'walk'; setPose('stand'); setMove('walk');
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.on && !B.ui.state.modals.length) finish('home'); });
  }

  B.walk = { init, start, finish, state: st, pathY };
})();
