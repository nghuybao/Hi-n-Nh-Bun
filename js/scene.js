/* Hiên Nhà Bun — dựng căn phòng, ánh sáng theo giờ thật, thời tiết, mùa */
(function () {
  'use strict';
  const B = window.B, U = B.util, A = B.art;
  let L = null;

  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
  const el = (id) => document.getElementById(id);

  function weather() {
    if (B.time.weatherPreview) return B.time.weatherPreview;
    const d = new Date(B.now()), r = hash(U.dateKey(d) + ':' + Math.floor(d.getHours() / 6));
    return r < 0.16 ? 'rain' : r < 0.4 ? 'cloudy' : 'clear';
  }
  function season() {
    const m = new Date(B.now()).getMonth() + 1;
    return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  }

  /* ---------- Bố cục co giãn theo tỉ lệ khung nhìn ---------- */
  function computeLayout() {
    // Chừa chỗ cho thanh hành động ở đáy: sàn nhà kéo dài xuống dưới để Bun không bị che
    const r = el('scene').getBoundingClientRect(), rw = Math.max(240, r.width), rh = Math.max(240, r.height);
    const barPx = window.matchMedia('(max-width: 860px)').matches ? 72 : 92;
    const W = Math.round(U.clamp((730 * rw) / Math.max(140, rh - barPx), 940, 1800));
    const scale = rw / W, H = Math.round(rh / scale), bottom = Math.round(800 + barPx / scale);
    const lvl = B.S.house.level;
    const win = { cx: Math.round(W * 0.43), w: lvl >= 3 ? 300 : 220, top: 150, bot: 372 };
    win.x1 = win.cx - win.w / 2; win.x2 = win.cx + win.w / 2;
    const desk = { x: 26, w: 226, top: 412 };
    return {
      W, H, top: bottom - H, bottom, lvl, win, desk,
      deskLamp: { x: desk.x + 82, y: desk.top - 60 },
      jar: { x: desk.x + desk.w - 16, y: desk.top - 18 },
      shelf: { cx: Math.round(W * 0.705), w: 184, y: lvl >= 4 ? 372 : 352 },
      door: { x: W - 172, w: 130, top: 192 },
      rug: { cx: Math.round(W * 0.43), cy: 692, rx: Math.min(250, Math.round(W * 0.2)), ry: 58 },
      bed: { cx: Math.round(W * 0.72), cy: 652 },
      bowls: { fx: 96, fy: 744, wx: 172, wy: 756 },
      plant: { x: W - 54, y: 668 },
      lamp: { x: Math.round(win.x2 + 52), y: 556 },
      toys: { toy_ball: { x: Math.round(W * 0.57), y: 776 }, toy_rope: { x: Math.round(W * 0.86), y: 760 }, toy_duck: { x: Math.round(W * 0.3), y: 612 } },
      floor: { x1: 80, x2: W - 80, y1: 592, y2: 768 },
    };
  }

  /* ---------- Từng phần của căn phòng ---------- */
  function defs() {
    const up = L.lvl >= 2, fb = up ? '#CE9C62' : '#D9BD93', fl = up ? '#B6844D' : '#C3A57B', fa = up ? '#D4A46A' : '#DDC49C', w = L.win;
    return `<defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop id="skyTop" offset="0" stop-color="#8EC3EA"/><stop id="skyBot" offset="1" stop-color="#DDF0F7"/></linearGradient>
      <pattern id="floorPat" width="280" height="92" patternUnits="userSpaceOnUse" y="540">
        <rect width="280" height="92" fill="${fb}"/><rect y="46" width="280" height="46" fill="${fa}"/>
        <path d="M0,0.8 h280 M0,46 h280 M96,0 v46 M226,46 v46" stroke="${fl}" stroke-width="1.6"/>
        <path d="M12,14 q40,-5 70,2 M130,30 q50,-6 110,0 M30,66 q60,6 120,-2 M240,74 q16,-4 30,0" stroke="${fl}" stroke-width="1" fill="none" opacity=".55"/>
      </pattern>
      <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2616" stop-opacity=".26"/><stop offset=".22" stop-color="#3A2616" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".07"/></linearGradient>
      <linearGradient id="wallShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6B4A32" stop-opacity=".12"/><stop offset=".55" stop-color="#6B4A32" stop-opacity="0"/></linearGradient>
      <clipPath id="winClip"><rect x="${w.x1}" y="${w.top}" width="${w.w}" height="${w.bot - w.top}" rx="3"/></clipPath>
    </defs>`;
  }

  function wallSVG() {
    const W = L.W, up = L.lvl >= 2;
    let s = `<rect x="0" y="-1400" width="${W}" height="1940" fill="${up ? '#F5EAD6' : '#EFE3CC'}"/><rect x="0" y="${L.top}" width="${W}" height="${540 - L.top}" fill="url(#wallShade)"/>`;
    if (up) {
      let g = '';
      for (let x = 23; x < W; x += 46) g += `M${x},414 v108 `;
      s += `<rect x="0" y="404" width="${W}" height="136" fill="#C7D0B3"/><path d="${g}" stroke="#B4BF9E" stroke-width="2"/><rect x="0" y="396" width="${W}" height="10" fill="#EFE5CF"/><rect x="0" y="406" width="${W}" height="2" fill="#000" opacity=".06"/>`;
    } else {
      s += `<path d="M${W * 0.62},40 l8,26 l-6,18 l10,22" stroke="#DCCDB1" stroke-width="2" fill="none"/><ellipse cx="${W * 0.2}" cy="230" rx="64" ry="26" fill="#E6D8BC" opacity=".6"/><ellipse cx="${W * 0.86}" cy="120" rx="40" ry="18" fill="#E6D8BC" opacity=".5"/>`;
    }
    if (L.lvl >= 4) {
      s += `<rect x="0" y="${L.top}" width="${W}" height="30" fill="#8A6240"/><rect x="0" y="${L.top + 30}" width="${W}" height="5" fill="#000" opacity=".12"/>`;
      [0.08, 0.5, 0.92].forEach((f) => (s += `<rect x="${W * f - 12}" y="${L.top + 30}" width="24" height="16" rx="3" fill="#7A5535"/>`));
    }
    s += `<rect x="0" y="540" width="${W}" height="${L.bottom - 536}" fill="url(#floorPat)"/><rect x="0" y="540" width="${W}" height="262" fill="url(#floorShade)"/>
      <rect x="0" y="526" width="${W}" height="16" fill="${up ? '#EFE5CF' : '#DFCFB3'}"/><rect x="0" y="540" width="${W}" height="3" fill="#000" opacity=".1"/>`;
    return s;
  }

  function windowSVG() {
    const w = L.win, x1 = w.x1, x2 = w.x2, top = w.top, bot = w.bot, cx = w.cx, h = bot - top, se = season();
    const foliage = { spring: '#9CC58A', summer: '#6FA860', autumn: '#D98F3F', winter: '#A9B79B' }[se];
    const hill = { spring: '#B5D3A0', summer: '#9CC48C', autumn: '#C9C08A', winter: '#C4CFBE' }[se];
    const dim = (c) => `class="dim" data-c="${c}" fill="${c}"`;
    let stars = '', rain = '', fall = '';
    for (let i = 0; i < 16; i++) stars += `<circle class="star" cx="${(x1 + hash('sx' + i) * w.w).toFixed(1)}" cy="${(top + hash('sy' + i) * h * 0.62).toFixed(1)}" r="${(0.8 + hash('sr' + i) * 1.2).toFixed(1)}" fill="#fff" style="animation-delay:${(hash('sd' + i) * 4).toFixed(1)}s"/>`;
    for (let i = 0; i < 30; i++) rain += `<path class="drop" d="M${(x1 - 6 + hash('rx' + i) * (w.w + 30)).toFixed(1)},${top - 30} l-7,26" style="animation-delay:${(-hash('rd' + i) * 1.2).toFixed(2)}s;animation-duration:${(0.55 + hash('rs' + i) * 0.4).toFixed(2)}s"/>`;
    if (se === 'autumn' || se === 'spring') {
      const col = se === 'autumn' ? ['#D98F3F', '#C96F2E', '#E2B04A'] : ['#F6C9D2', '#F3B6C2', '#FBE3E8'];
      for (let i = 0; i < 6; i++) fall += `<ellipse class="leaf" cx="${(x1 + 20 + hash('fx' + i) * (w.w - 40)).toFixed(1)}" cy="${top - 12}" rx="${se === 'autumn' ? 6 : 4}" ry="${se === 'autumn' ? 3.5 : 3}" fill="${col[i % 3]}" style="animation-delay:${(-hash('fd' + i) * 14).toFixed(1)}s;animation-duration:${(10 + hash('fs' + i) * 8).toFixed(1)}s"/>`;
    }
    const tx = x2 - 58, cid = B.S.house.placed.curtain || 'cur0', cur = A.CURTAIN[cid] || A.CURTAIN.cur0;
    const pw = Math.round(w.w * 0.22) + 34, cs = ((w.w / 2 + 38) / pw).toFixed(3);
    const panel = (side) => {
      const px = side < 0 ? x1 - 34 : x2 + 34 - pw;
      let folds = '';
      for (let i = 1; i < 4; i++) folds += `M${px + (pw * i) / 4},${top - 24} v${h + 56} `;
      const check = cid === 'cur2' ? `<path d="M${px},${top + 30} h${pw} M${px},${top + 104} h${pw} M${px},${top + 178} h${pw}" stroke="${cur.b}" stroke-width="10" opacity=".5"/>` : '';
      return `<g class="curtain ${side < 0 ? 'cl' : 'cr'}" style="--cs:${cs}"><path d="M${px},${top - 28} h${pw} v${h + 58} q${-pw / 8},10 ${-pw / 4},0 t${-pw / 4},0 t${-pw / 4},0 t${-pw / 4},0Z" fill="${cur.a}"/>${check}<path d="${folds}" stroke="${cur.b}" stroke-width="2.5" opacity=".7"/></g>`;
    };
    const pot = (x) => `<g transform="translate(${x},${bot + 13})"><path d="M-10,0 L-12,-16 L12,-16 L10,0Z" fill="#C97B4A"/><circle cx="-6" cy="-24" r="8" fill="#7FA36B"/><circle cx="6" cy="-27" r="9" fill="#8DB37A"/><circle cx="1" cy="-34" r="4" fill="#F0A6A0"/></g>`;
    return `<g id="window">
      <rect x="${x1 - 15}" y="${top - 15}" width="${w.w + 30}" height="${h + 30}" rx="9" fill="#000" opacity=".07" transform="translate(4,7)"/>
      <rect x="${x1 - 15}" y="${top - 15}" width="${w.w + 30}" height="${h + 30}" rx="9" fill="#FBF3E2"/>
      <g clip-path="url(#winClip)">
        <rect x="${x1}" y="${top}" width="${w.w}" height="${h}" fill="url(#skyGrad)"/>
        <g id="stars">${stars}</g>
        <circle id="sun" r="22" fill="#FFEFB0"/>
        <g id="moon"><circle r="15" fill="#F6F1DC"/><circle cx="-4" cy="-3" r="3" fill="#E4DEC4"/><circle cx="5" cy="4" r="2" fill="#E4DEC4"/></g>
        <g id="clouds"><g class="cloud c1"><ellipse cx="${x1 + 50}" cy="${top + 50}" rx="38" ry="13" ${dim('#FFFFFF')}/><ellipse cx="${x1 + 76}" cy="${top + 42}" rx="24" ry="12" ${dim('#FFFFFF')}/></g>
          <g class="cloud c2"><ellipse cx="${x1 + w.w * 0.7}" cy="${top + 86}" rx="32" ry="11" ${dim('#FFFFFF')}/><ellipse cx="${x1 + w.w * 0.7 - 22}" cy="${top + 80}" rx="20" ry="10" ${dim('#FFFFFF')}/></g></g>
        <path d="M${x1},${bot - 52} Q${cx - 50},${bot - 104} ${cx + 10},${bot - 62} T${x2},${bot - 76} L${x2},${bot} L${x1},${bot}Z" ${dim(hill)}/>
        <path d="M${x1},${bot - 26} Q${cx},${bot - 56} ${x2},${bot - 30} L${x2},${bot} L${x1},${bot}Z" ${dim(mix(hill, '#6F8762', 0.35))}/>
        <rect x="${tx - 4}" y="${bot - 96}" width="8" height="96" ${dim('#7A5A3C')}/>
        <g class="foliage"><circle cx="${tx}" cy="${bot - 112}" r="34" ${dim(foliage)}/><circle cx="${tx - 26}" cy="${bot - 96}" r="24" ${dim(mix(foliage, '#ffffff', 0.12))}/><circle cx="${tx + 24}" cy="${bot - 94}" r="22" ${dim(mix(foliage, '#000000', 0.08))}/></g>
        <g id="fall">${fall}</g>
        <rect id="overcast" x="${x1}" y="${top}" width="${w.w}" height="${h}" fill="#93A0AE" opacity="0"/>
        <g id="rain" style="display:none">${rain}</g>
      </g>
      <path d="M${cx},${top} v${h} M${x1},${top + h * 0.42} h${w.w}" stroke="#FBF3E2" stroke-width="7"/>
      <path d="M${x1 + 14},${top + h * 0.42 - 12} L${x1 + 60},${top + 12} L${x1 + 84},${top + 12} L${x1 + 26},${top + h * 0.42 - 12}Z" fill="#fff" opacity=".1"/>
      <rect x="${x1 - 26}" y="${bot + 13}" width="${w.w + 52}" height="15" rx="6" fill="#C89B66"/><rect x="${x1 - 22}" y="${bot + 26}" width="${w.w + 44}" height="3" fill="#000" opacity=".1"/>
      ${L.lvl >= 3 ? pot(cx - w.w * 0.2) + pot(cx + w.w * 0.2) : ''}
      <path d="M${x1 - 44},${top - 32} h${w.w + 88}" stroke="#8A6240" stroke-width="7" stroke-linecap="round"/>
      <g id="curtains">${panel(-1)}${panel(1)}</g>
    </g>`;
  }

  function deskSVG() {
    const x = L.desk.x, w = L.desk.w, top = L.desk.top, lx = x + 44;
    return `<g id="desk">
      <rect x="${x + 12}" y="${top + 12}" width="13" height="${536 - top}" rx="4" fill="#9A6E45"/><rect x="${x + w - 25}" y="${top + 12}" width="13" height="${536 - top}" rx="4" fill="#9A6E45"/>
      <rect x="${x + 25}" y="${top + 12}" width="${w - 50}" height="8" fill="#A8774A"/>
      <rect x="${x + w - 118}" y="${top + 14}" width="88" height="36" rx="4" fill="#C4915E"/><circle cx="${x + w - 74}" cy="${top + 32}" r="4" fill="#8A6240"/>
      <rect x="${x}" y="${top}" width="${w}" height="15" rx="5" fill="#B98552"/><rect x="${x + 4}" y="${top + 2}" width="${w - 8}" height="3" rx="1.5" fill="#fff" opacity=".18"/>
      <ellipse cx="${lx}" cy="${top - 2}" rx="22" ry="5" fill="#6B4A32"/>
      <path d="M${lx},${top - 4} C${lx - 6},${top - 50} ${lx + 2},${top - 70} ${lx + 26},${top - 86}" stroke="#6B4A32" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse class="desk-bulb" cx="${lx + 38}" cy="${top - 64}" rx="17" ry="7" fill="#F1E2C0"/>
      <path class="desk-shade" d="M${lx + 2},${top - 74} L${lx + 22},${top - 112} L${lx + 62},${top - 98} L${lx + 72},${top - 56}Z" fill="#E4A94B"/>
      <rect x="${x + 100}" y="${top - 12}" width="62" height="12" rx="2" fill="#9DB08A"/><rect x="${x + 104}" y="${top - 23}" width="54" height="11" rx="2" fill="#E58E84"/><rect x="${x + 98}" y="${top - 33}" width="58" height="10" rx="2" fill="#F2E3C2"/>
      <g transform="translate(${x + 180},${top})"><path d="M10,-18 c12,-2 12,14 0,12" stroke="#FFF6E6" stroke-width="4" fill="none"/><rect x="-12" y="-24" width="24" height="24" rx="5" fill="#FFF6E6"/><ellipse cx="0" cy="-21.5" rx="10" ry="3" fill="#7A4A2E"/>
        <path class="steam s1" d="M-4,-30 c-5,-7 5,-10 0,-18"/><path class="steam s2" d="M5,-31 c-5,-7 5,-10 0,-18"/></g>
      <g transform="translate(${x + w - 16},${top})"><rect x="-13" y="-38" width="26" height="38" rx="8" fill="#EAF2EE" opacity=".75" stroke="#B8C7BF" stroke-width="1.5"/><rect x="-10" y="-43" width="20" height="7" rx="3" fill="#C89B66"/><g id="jarStars"></g></g>
    </g>`;
  }

  function shelfSVG() {
    const cx = L.shelf.cx, w = L.shelf.w, y = L.shelf.y, S = B.S;
    let s = '';
    if (L.lvl >= 4) {
      s += `<rect x="${cx - 98}" y="${y + 12}" width="196" height="${528 - y}" fill="#DCC8AA"/>
        <path d="M${cx - 98},${y + 52} h196 M${cx - 98},${y + 92} h40 M${cx + 58},${y + 92} h40 M${cx - 98},${y + 132} h40 M${cx + 58},${y + 132} h40 M${cx - 50},${y + 12} v40 M${cx + 40},${y + 12} v40 M${cx - 78},${y + 52} v40 M${cx + 78},${y + 52} v40 M${cx - 70},${y + 92} v40 M${cx + 70},${y + 92} v40" stroke="#C9B492" stroke-width="2" fill="none"/>
        <path d="M${cx - 56},540 V${y + 112} a56,50 0 0 1 112,0 V540Z" fill="#3A2A22"/>
        <rect x="${cx - 36}" y="524" width="72" height="12" rx="6" fill="#7A5535"/><rect x="${cx - 26}" y="514" width="52" height="11" rx="5.5" fill="#8A6240" transform="rotate(-8 ${cx} 519)"/>
        <g id="fire" transform="translate(${cx},524)"><path class="flame f1" d="M-22,0 C-30,-26 -8,-34 -6,-62 C8,-44 30,-30 22,0Z" fill="#F2A03E"/><path class="flame f2" d="M-12,0 C-16,-18 -2,-22 0,-40 C8,-26 18,-18 12,0Z" fill="#FFD56B"/></g>
        <rect x="${cx - 112}" y="${y}" width="224" height="15" rx="5" fill="#96693F"/>`;
    } else {
      s += `<path d="M${cx - w / 2 + 22},${y + 9} v18 M${cx + w / 2 - 22},${y + 9} v18" stroke="#96693F" stroke-width="6" stroke-linecap="round"/><rect x="${cx - w / 2}" y="${y}" width="${w}" height="11" rx="4" fill="#B98552"/>`;
    }
    s += `<rect x="${cx + w / 2 - 44}" y="${y - 30}" width="9" height="30" fill="#9DB08A"/><rect x="${cx + w / 2 - 34}" y="${y - 26}" width="8" height="26" fill="#D99A4E"/><rect x="${cx + w / 2 - 25}" y="${y - 32}" width="10" height="32" fill="#E9DCC3" transform="rotate(7 ${cx + w / 2 - 20} ${y})"/>`;
    S.house.trophies.forEach((id, i) => (s += `<g transform="translate(${cx - w / 2 + 22 + i * 30},${y})">${A.trophy(id)}</g>`));
    const wid = S.house.placed.wall;
    if (wid) s += `<g transform="translate(${cx},${y - 128})"><g id="wallArt">${A.wall(wid, S.bun.outfit)}</g></g>`;
    return s;
  }

  function doorSVG() {
    const x = L.door.x, w = L.door.w, top = L.door.top, h = 540 - top, glass = L.lvl >= 5;
    let s = `<rect x="${x - 12}" y="${top - 12}" width="${w + 24}" height="${h + 12}" rx="6" fill="#EADDC4"/>`;
    if (glass) {
      const gh = h - 74;
      s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="#F7EEDC"/>
        <clipPath id="doorClip"><rect x="${x + 12}" y="${top + 12}" width="${w - 24}" height="${gh}" rx="4"/></clipPath>
        <g clip-path="url(#doorClip)"><rect x="${x}" y="${top}" width="${w}" height="${h}" fill="url(#skyGrad)"/>
          <path class="dim" data-c="#9CC48C" fill="#9CC48C" d="M${x},${top + gh * 0.62} q${w / 2},-40 ${w},-10 V540 H${x}Z"/>
          <circle class="dim" data-c="#6FA860" fill="#6FA860" cx="${x + 30}" cy="${top + gh * 0.66}" r="26"/><circle class="dim" data-c="#7FB26E" fill="#7FB26E" cx="${x + 96}" cy="${top + gh * 0.74}" r="20"/>
          <circle class="dim" data-c="#F0A6A0" fill="#F0A6A0" cx="${x + 62}" cy="${top + gh * 0.86}" r="5"/><circle class="dim" data-c="#F6D36B" fill="#F6D36B" cx="${x + 80}" cy="${top + gh * 0.92}" r="4"/><circle class="dim" data-c="#F0A6A0" fill="#F0A6A0" cx="${x + 40}" cy="${top + gh * 0.94}" r="4"/></g>
        <path d="M${x + w / 2},${top + 12} v${gh} M${x + 12},${top + 12 + gh / 2} h${w - 24}" stroke="#F7EEDC" stroke-width="6"/>`;
    } else {
      s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${L.lvl >= 2 ? '#C99A63' : '#BF9E76'}"/>
        <rect x="${x + 16}" y="${top + 18}" width="${w - 32}" height="${h * 0.42}" rx="5" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="3"/>
        <rect x="${x + 16}" y="${top + h * 0.42 + 36}" width="${w - 32}" height="${h * 0.58 - 56}" rx="5" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="3"/>`;
    }
    s += `<circle cx="${x + 18}" cy="${top + h * 0.56}" r="7" fill="#E4B54C"/><circle cx="${x + 18}" cy="${top + h * 0.56}" r="3" fill="#C9962B"/>
      <rect x="${x - 14}" y="548" width="${w + 28}" height="22" rx="7" fill="#B88A5A"/><path d="M${x},559 h${w}" stroke="#D9B383" stroke-width="3" stroke-dasharray="10 8"/>`;
    if (B.rest.activeAt(B.now()))
      s += `<g transform="translate(${x + w / 2 + 6},${top + h * 0.3}) rotate(-4)" font-family="Quicksand, sans-serif" font-weight="700" font-size="11" fill="#6B4A32" text-anchor="middle"><rect x="-38" y="-24" width="76" height="48" rx="3" fill="#FFF8E6"/><circle cx="0" cy="-18" r="3" fill="#D5503F"/><text x="0" y="0">Bà đang</text><text x="0" y="14">trông Bun</text></g>`;
    B.S.generations.slice(-3).forEach((g, i) => {
      s += `<g transform="translate(${x - 46},${top + 44 + i * 62})"><circle r="25" fill="#96693F"/><circle r="20" fill="#F3E6CC"/><g transform="translate(0,5) scale(.3)" class="bun static" data-eyes="open" data-mouth="calm">${A.head(g.outfit)}</g></g>`;
    });
    return s;
  }

  function actorsSVG() {
    const S = B.S, p = S.house.placed, bed = A.bed(p.bed || 'bed0');
    let s = `<g id="rugG" transform="translate(${L.rug.cx},${L.rug.cy})">${A.rug(p.rug || 'rug0', L.rug.rx, L.rug.ry)}</g><g id="sorted">`;
    s += `<g data-y="${L.bed.cy - 3}" transform="translate(${L.bed.cx},${L.bed.cy})"><ellipse cx="0" cy="16" rx="142" ry="14" fill="#000" opacity=".1"/>${bed.back}</g>`;
    s += `<g data-y="${L.bed.cy + 3}" transform="translate(${L.bed.cx},${L.bed.cy})">${bed.front}</g>`;
    if (p.lamp) s += `<g data-y="${L.lamp.y}" id="floorLamp" transform="translate(${L.lamp.x},${L.lamp.y})">${A.lamp(p.lamp)}</g>`;
    s += `<g data-y="${L.bowls.fy}" id="bowlFood" transform="translate(${L.bowls.fx},${L.bowls.fy})"></g><g data-y="${L.bowls.wy}" id="bowlWater" transform="translate(${L.bowls.wx},${L.bowls.wy})"></g>`;
    S.house.owned.filter((id) => id.indexOf('toy_') === 0).forEach((id) => {
      const pos = L.toys[id];
      if (pos) s += `<g class="toy" data-toy="${id}" data-y="${pos.y}" transform="translate(${pos.x},${pos.y})">${A.toy(id)}</g>`;
    });
    if (p.plant) s += `<g data-y="${L.plant.y}" transform="translate(${L.plant.x},${L.plant.y})">${A.plant(p.plant)}</g>`;
    s += (B.friends ? B.friends.svg() : '') + A.bun({ id: 'bun', outfit: S.bun.outfit }) + '</g>';
    return s;
  }

  /* ---------- Dựng cảnh ---------- */
  function build() {
    L = computeLayout();
    const vb = `0 ${L.top} ${L.W} ${L.H}`;
    ['svgBg', 'svgActors', 'svgMul', 'svgGlow'].forEach((id) => { el(id).setAttribute('viewBox', vb); el(id).setAttribute('preserveAspectRatio', 'xMidYMax slice'); });
    el('svgBg').innerHTML = defs() + wallSVG() + (B.photos ? B.photos.svg(L) : '') + (B.S.house.placed.lights ? `<g id="stringLights">${A.lights(L.W, 78)}</g>` : '') + windowSVG() + shelfSVG() + doorSVG() + deskSVG();
    el('svgActors').innerHTML = actorsSVG();
    el('svgMul').innerHTML = `<defs><radialGradient id="cut"><stop offset="0" stop-color="#FFF6E0" stop-opacity="1"/><stop offset=".42" stop-color="#FFF0CF" stop-opacity=".72"/><stop offset="1" stop-color="#FFF0CF" stop-opacity="0"/></radialGradient></defs>
      <rect id="amb" x="0" y="-1400" width="${L.W}" height="3400" fill="#ffffff"/><g id="cuts"></g>`;
    el('svgGlow').innerHTML = `<defs><radialGradient id="halo"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".75"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
      <linearGradient id="beamG" x1="0" y1="0" x2="0" y2="1"><stop id="beamC1" offset="0" stop-color="#FFF3D0" stop-opacity=".9"/><stop id="beamC2" offset="1" stop-color="#FFF3D0" stop-opacity=".1"/></linearGradient>
      <filter id="soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="8"/></filter></defs>
      <polygon id="beam" fill="url(#beamG)" opacity="0"/><polygon id="patch" filter="url(#soft)" opacity="0"/><g id="halos"></g>`;
    sortAll();
    updateBowls(); updateJar(); updateLight();
    B.emit('sceneBuilt', L);
  }

  /* ---------- Ánh sáng theo giờ ---------- */
  const KEYS = [
    { h: 0, top: '#0E1730', bot: '#222C4C', amb: '#5A5F8E', beam: 0, bc: '#FFF3D0', star: 1, dark: 0.74 },
    { h: 4.6, top: '#0E1730', bot: '#222C4C', amb: '#5A5F8E', beam: 0, bc: '#FFF3D0', star: 1, dark: 0.74 },
    { h: 5.6, top: '#2C3760', bot: '#B98FA0', amb: '#9A8FB0', beam: 0, bc: '#FFE7C2', star: 0.4, dark: 0.5 },
    { h: 6.5, top: '#8FB2DC', bot: '#FBD2B0', amb: '#F3D3BE', beam: 0.4, bc: '#FFE7C2', star: 0, dark: 0.12 },
    { h: 8, top: '#8EC3EA', bot: '#DDF0F7', amb: '#FFF4E3', beam: 0.55, bc: '#FFF3D0', star: 0, dark: 0 },
    { h: 12, top: '#7DBAEA', bot: '#D6EEFA', amb: '#FFFFFF', beam: 0.3, bc: '#FFFBEA', star: 0, dark: 0 },
    { h: 15.5, top: '#86BDE6', bot: '#E6EEDD', amb: '#FFF2DA', beam: 0.55, bc: '#FFE6AE', star: 0, dark: 0 },
    { h: 17, top: '#8CAFD8', bot: '#FBD79C', amb: '#FFDDAE', beam: 0.85, bc: '#FFC978', star: 0, dark: 0.04 },
    { h: 18, top: '#6F7FB5', bot: '#F6A77A', amb: '#EDB093', beam: 0.5, bc: '#FFA766', star: 0, dark: 0.18 },
    { h: 18.9, top: '#3B4578', bot: '#B9788A', amb: '#9C88AA', beam: 0, bc: '#FFA766', star: 0.3, dark: 0.46 },
    { h: 20, top: '#141D3A', bot: '#2A3355', amb: '#666896', beam: 0, bc: '#FFF3D0', star: 1, dark: 0.7 },
    { h: 24, top: '#0E1730', bot: '#222C4C', amb: '#5A5F8E', beam: 0, bc: '#FFF3D0', star: 1, dark: 0.74 },
  ];
  function sample(h) {
    h = ((h % 24) + 24) % 24;
    let i = 0;
    while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = U.clamp((h - a.h) / (b.h - a.h), 0, 1), n = (k) => a[k] + (b[k] - a[k]) * t;
    return { top: mix(a.top, b.top, t), bot: mix(a.bot, b.bot, t), amb: mix(a.amb, b.amb, t), bc: mix(a.bc, b.bc, t), beam: n('beam'), star: n('star'), dark: n('dark') };
  }
  function curtainsClosed(h) {
    const S = B.S;
    if (B.time.preview != null) return h >= 22.5 || h < 5.5;
    return h >= 22.5 || h < 5 || (S.day.eveningDone && h >= 19) || (!S.day.morningDone && h < 12);
  }
  let lightState = {};
  function updateLight() {
    if (!L) return;
    const S = B.S, h = B.time.visualHour(), wx = weather(), k = sample(h), w = L.win, scene = el('scene');
    let top = k.top, bot = k.bot;
    if (wx === 'rain') { top = mix(top, '#6F7C8C', 0.6); bot = mix(bot, '#A9B4BE', 0.6); } else if (wx === 'cloudy') { top = mix(top, '#9AA9B8', 0.35); bot = mix(bot, '#D5DCE0', 0.35); }
    el('skyTop').setAttribute('stop-color', top); el('skyBot').setAttribute('stop-color', bot);

    const sun = el('sun'), moon = el('moon'), dp = (h - 5.6) / 13, np = (((h - 18.6) % 24) + 24) % 24 / 11;
    if (dp > 0 && dp < 1 && wx !== 'rain') {
      sun.style.display = '';
      sun.setAttribute('cx', (w.x1 + dp * w.w).toFixed(1)); sun.setAttribute('cy', (w.bot - 40 - Math.sin(Math.PI * dp) * (w.bot - w.top) * 0.95).toFixed(1));
      sun.setAttribute('opacity', wx === 'cloudy' ? 0.45 : 1); sun.setAttribute('fill', mix('#FFEFB0', '#FFB36B', Math.pow(Math.abs(dp - 0.5) * 2, 3)));
    } else sun.style.display = 'none';
    if (np > 0 && np < 1 && wx === 'clear') {
      moon.style.display = '';
      moon.setAttribute('transform', `translate(${(w.x1 + 20 + np * (w.w - 40)).toFixed(1)},${(w.bot - 70 - Math.sin(Math.PI * np) * (w.bot - w.top) * 0.55).toFixed(1)})`);
    } else moon.style.display = 'none';
    el('stars').setAttribute('opacity', (k.star * (wx === 'clear' ? 1 : 0.15)).toFixed(2));
    U.$$('#svgBg .dim').forEach((e) => e.setAttribute('fill', mix(e.dataset.c, '#0C1430', k.dark)));
    el('overcast').setAttribute('opacity', wx === 'rain' ? 0.5 : wx === 'cloudy' ? 0.22 : 0);
    el('rain').style.display = wx === 'rain' ? '' : 'none';
    el('clouds').setAttribute('opacity', wx === 'clear' ? 0.9 : 0.5);

    const dark = h >= 17.7 || h < 6.6;
    const lightsOff = (S.day.eveningDone && B.time.preview == null && (h >= 19 || h < 5)) || h >= 23.5 || h < 5;
    const lampOn = (dark || (wx === 'rain' && h >= 15.5)) && !lightsOff;
    const fireOn = L.lvl >= 4 && (dark || season() === 'winter' || wx === 'rain');
    let amb = k.amb;
    if (wx === 'rain') amb = mix(amb, '#8E97AB', 0.3); else if (wx === 'cloudy') amb = mix(amb, '#C9CCD3', 0.15);
    if (lampOn) amb = mix(amb, '#DDBB96', 0.36);
    el('amb').setAttribute('fill', amb);

    const src = [];
    if (lampOn) {
      src.push({ x: L.deskLamp.x, y: L.deskLamp.y + 30, r: 440, a: 1, halo: 64, hy: L.deskLamp.y });
      const lp = S.house.placed.lamp;
      if (lp) { const ly = L.lamp.y - (lp === 'lamp1' ? 250 : 170); src.push({ x: L.lamp.x, y: ly + 40, r: 420, a: 1, halo: lp === 'lamp1' ? 70 : 84, hy: ly }); }
      if (S.house.placed.lights) for (let x = 85; x < L.W; x += 190) src.push({ x, y: 100, r: 170, a: 0.75, halo: 0 });
    }
    if (fireOn) src.push({ x: L.shelf.cx, y: 500, r: lampOn ? 340 : 280, a: 1, halo: 78, hy: 500, cls: 'flick' });
    if (!lampOn && dark) src.push({ x: L.jar.x, y: L.jar.y, r: 110, a: 0.55, halo: 26, hy: L.jar.y });
    el('cuts').innerHTML = src.map((s) => `<circle class="${s.cls || ''}" cx="${s.x}" cy="${s.y}" r="${s.r}" fill="url(#cut)" opacity="${s.a}"/>`).join('');
    el('halos').innerHTML = src.filter((s) => s.halo).map((s) => `<circle class="${s.cls || ''}" cx="${s.x}" cy="${s.hy}" r="${s.halo * 1.7}" fill="url(#halo)" opacity=".55"/>`).join('');

    const closed = curtainsClosed(h);
    let ba = k.beam * (wx === 'rain' ? 0.08 : wx === 'cloudy' ? 0.45 : 1), bc = k.bc, dx = -150 + 300 * U.clamp((h - 6) / 12, 0, 1);
    if (ba < 0.02 && (h >= 20 || h < 4.6) && wx === 'clear' && !lampOn) { ba = 0.3; bc = '#C9D6FF'; dx = 70; }
    if (closed) ba *= 0.12;
    const beam = el('beam'), patch = el('patch');
    if (ba > 0.015) {
      const p1 = w.x1 + dx, p2 = w.x2 + dx, q1 = p1 + dx * 0.45 - 12, q2 = p2 + dx * 0.45 + 12;
      beam.setAttribute('points', `${w.x1},${w.top} ${w.x2},${w.top} ${q2},736 ${q1},736`);
      patch.setAttribute('points', `${p1},604 ${p2},604 ${q2},736 ${q1},736`);
      patch.setAttribute('fill', bc); el('beamC1').setAttribute('stop-color', bc); el('beamC2').setAttribute('stop-color', bc);
      beam.setAttribute('opacity', (ba * 0.42).toFixed(3)); patch.setAttribute('opacity', (ba * 0.62).toFixed(3));
    } else { beam.setAttribute('opacity', 0); patch.setAttribute('opacity', 0); }

    scene.classList.toggle('lamp-on', lampOn);
    scene.classList.toggle('fire-on', fireOn);
    scene.classList.toggle('is-dark', dark);
    scene.classList.toggle('curtains-closed', closed);
    const hand = U.$('#wallArt .clock-h');
    if (hand) {
      const d = new Date(B.now()), hh = B.time.preview != null ? h : d.getHours() + d.getMinutes() / 60, mm = B.time.preview != null ? (h % 1) * 60 : d.getMinutes();
      hand.setAttribute('transform', `rotate(${(hh % 12) * 30})`);
      U.$('#wallArt .clock-m').setAttribute('transform', `rotate(${mm * 6})`);
    }
    lightState = { lampOn, fireOn, dark, lightsOff, closed, wx, h };
    return lightState;
  }

  function updateBowls() {
    if (!L) return;
    const st = B.S.bun.stats, lv = (v) => (v > 60 ? 2 : v > 28 ? 1 : 0);
    if (el('bowlFood')) el('bowlFood').innerHTML = A.bowl('food', lv(st.hunger));
    if (el('bowlWater')) el('bowlWater').innerHTML = A.bowl('water', lv(st.thirst));
  }
  function updateJar() {
    const g = el('jarStars');
    if (!g) return;
    const n = Math.min(12, B.tasks.stats(B.time.today()).done);
    let s = '';
    for (let i = 0; i < n; i++) s += `<polygon class="jar-star" points="${A.starPts(-7 + (i % 3) * 7, -6 - Math.floor(i / 3) * 8, 3.8)}" fill="#F2C14E"/>`;
    g.innerHTML = s;
  }

  /* ---------- Thứ tự trước sau ---------- */
  function sortAll() {
    const g = el('sorted'), bun = el('bun');
    Array.from(g.children).filter((c) => c !== bun).sort((a, b) => +a.dataset.y - +b.dataset.y).forEach((c) => g.appendChild(c));
    placeBun(bun && bun._y != null ? bun._y : 700);
  }
  function placeBun(y) {
    const g = el('sorted'), bun = el('bun');
    if (!g || !bun) return;
    bun._y = y;
    let before = null;
    for (const c of g.children) { if (c !== bun && +c.dataset.y > y) { before = c; break; } }
    if (bun.nextElementSibling !== before) g.insertBefore(bun, before);
  }
  function moveToy(id, x, y) {
    const t = U.$(`#sorted .toy[data-toy="${id}"]`);
    if (!t) return;
    t.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    if (Math.abs(+t.dataset.y - y) > 4) { t.dataset.y = Math.round(y); sortAll(); }
  }

  /* ---------- Chuyển đổi toạ độ ---------- */
  function toScreen(x, y) {
    const svg = el('svgActors'), pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m), r = el('scene').getBoundingClientRect();
    return { x: p.x - r.left, y: p.y - r.top };
  }
  function fromScreen(cx, cy) {
    const svg = el('svgActors'), pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  function spots() {
    return {
      door: { x: L.door.x + L.door.w / 2 - 14, y: 604 },
      window: { x: L.win.cx, y: 598 },
      desk: { x: L.desk.x + L.desk.w / 2 + 34, y: 606 },
      rug: { x: L.rug.cx, y: L.rug.cy + 8 },
      bed: { x: L.bed.cx, y: L.bed.cy },
      food: { x: L.bowls.fx + 96, y: L.bowls.fy - 6 },
      water: { x: L.bowls.wx + 96, y: L.bowls.wy - 6 },
      front: { x: Math.round(L.W * 0.5), y: 744 },
      fire: { x: L.shelf.cx - 20, y: 604 },
    };
  }

  B.scene = { build, updateLight, updateBowls, updateJar, sortAll, placeBun, moveToy, toScreen, fromScreen, spots, weather, season, layout: () => L, light: () => lightState, mix };
})();
