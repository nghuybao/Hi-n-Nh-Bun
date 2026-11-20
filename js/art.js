/* Hiên Nhà Bun — hình vẽ: biểu tượng, Bun, nội thất, vật phẩm (toàn bộ là SVG vẽ tay bằng mã) */
(function () {
  'use strict';
  const B = window.B;

  /* ---------- Biểu tượng ---------- */
  const ICONS = {
    coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/>',
    food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7.5c0-1.2 1-1.3 1-2.5M14 7.5c0-1.2 1-1.3 1-2.5"/>',
    drop: '<path d="M12 3.5c3 3.8 5.5 6.6 5.5 9.8a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6 5.5-9.8z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z"/>',
    paw: '<path d="M12 13c-2.5 0-4.5 2-4.5 4 0 1.5 1.2 2.5 2.7 2.2.6-.1 1.2-.3 1.8-.3s1.2.2 1.8.3c1.5.3 2.7-.7 2.7-2.2 0-2-2-4-4.5-4z"/><circle cx="6.5" cy="10.5" r="1.6"/><circle cx="10" cy="6.5" r="1.6"/><circle cx="14" cy="6.5" r="1.6"/><circle cx="17.5" cy="10.5" r="1.6"/>',
    flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.5 1 2.2 1.8 2.2C11.8 9 11 6 12 3z"/>',
    shop: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9.5 20v-5.5h5V20"/>',
    book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
    sliders: '<path d="M4 7h9M18 7h2M4 17h2M11 17h9"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="8.5" cy="17" r="2.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    pencil: '<path d="M4 20l1-4L16.5 4.5l3 3L8 19l-4 1z"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.3 1.8M9.5 3.5h5"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="M5.2 7.5c4 1 6 5 5 11M18.8 16.5c-4-1-6-5-5-11"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z"/>',
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4v-9z"/>',
    gift: '<path d="M4 10.5h16V20H4zM3 7h18v3.5H3zM12 7v13"/><path d="M12 7c-1.5-3.2-5-3-5-.8C7 7 12 7 12 7zm0 0c1.5-3.2 5-3 5-.8C17 7 12 7 12 7z"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14"/>',
    ticket: '<path d="M4 8h16v3a1.5 1.5 0 0 0 0 3v3H4v-3a1.5 1.5 0 0 0 0-3V8z"/><path d="M14 8.5v8"/>',
    cloud: '<path d="M7 18.5a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9.2a4.6 4.6 0 0 1 .5 9.3H7z"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    logout: '<path d="M14 4.5H7.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14"/><path d="M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5"/>',
    rain: '<path d="M7 15a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 5.7a4.6 4.6 0 0 1 .5 9.3H7z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    list: '<path d="M8.5 7H20M8.5 12H20M8.5 17H20"/><circle cx="4.5" cy="7" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="17" r="1"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    shield: '<path d="M12 3.5l7 2.6v5.4c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6.1l7-2.6z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
    steth: '<path d="M6 4v5a4 4 0 0 0 8 0V4M10 13v2.5a4.5 4.5 0 0 0 9 0V13"/><circle cx="19" cy="11" r="2"/>',
    frame: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 17"/><circle cx="9" cy="9.5" r="1.4"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5L8 5.5z"/>',
    pause: '<path d="M8 5.5v13M16 5.5v13"/>',
    volume: '<path d="M4 10v4h3.5L12 18V6L7.5 10H4z"/><path d="M15.5 9.5a3.6 3.6 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>',
    mute: '<path d="M4 10v4h3.5L12 18V6L7.5 10H4z"/><path d="M16 10l4 4M20 10l-4 4"/>',
    scale: '<path d="M5 20h14M7 20l1.5-12h7L17 20"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0M12 12.5v2.5"/>',
    move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
    speaker: '<path d="M4 10v4h3.5L12 18V6L7.5 10H4z"/><path d="M15.5 9.5a3.6 3.6 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>',
    users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17 14.6c1.8.6 3 2 3.5 4.4"/>',
  };
  B.icon = (name, cls) =>
    `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  /* ---------- Màu lông của Bun ---------- */
  const FUR = '#DC8E43', FUR_D = '#BF7430', FUR_L = '#F2CE9C', CREAM = '#FFF9EE', CREAM_D = '#EFE3CF';
  const EAR = '#EBB0A6', NOSE = '#2C2422', EYE = '#3B2A22', TONGUE = '#F090A0', PAD = '#C9B3AC';

  function headwear(id) {
    if (id === 'cap')
      return `<path d="M-31,-33 C-30,-60 30,-60 31,-33 C16,-41 -16,-41 -31,-33Z" fill="#2F6FD0"/>
        <path d="M20,-42 C40,-50 58,-42 62,-30 C48,-36 34,-36 24,-33Z" fill="#2459AD"/>
        <path d="M-22,-44 C-10,-50 10,-50 22,-44" stroke="#5E93E6" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
        <circle cx="0" cy="-54" r="3" fill="#2459AD"/>`;
    if (id === 'beanie')
      return `<path d="M-33,-30 C-34,-66 34,-66 33,-30Z" fill="#E58A3A"/>
        <path d="M-18,-58 L-14,-36 M0,-62 L0,-36 M18,-58 L14,-36" stroke="#C97227" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="-35" y="-38" width="70" height="12" rx="6" fill="#FFF2DC"/>
        <circle cx="0" cy="-65" r="9" fill="#FFF2DC"/>`;
    if (id === 'straw')
      return `<path d="M-60,-30 L0,-78 L60,-30 C30,-22 -30,-22 -60,-30Z" fill="#E8CF94"/><path d="M-40,-45 L40,-45 M-22,-60 L22,-60 M0,-78 L-30,-27 M0,-78 L30,-27 M0,-78 L0,-25" stroke="#C9AC69" stroke-width="1.6" fill="none"/>
        <path d="M-60,-30 C-30,-22 30,-22 60,-30" stroke="#B9975A" stroke-width="2.5" fill="none"/>`;
    if (id === 'santa')
      return `<path d="M-32,-32 C-30,-64 6,-76 34,-56 C46,-48 52,-36 50,-26 C40,-40 26,-44 30,-32Z" fill="#C8362E"/><rect x="-36" y="-40" width="72" height="13" rx="6.5" fill="#FFFDF8"/><circle cx="50" cy="-22" r="8" fill="#FFFDF8"/>`;
    if (id === 'party')
      return `<path d="M-18,-36 L4,-92 L24,-38Z" fill="#E58E84"/><path d="M-11,-54 L15,-62 M-5,-70 L10,-76" stroke="#FFF2DC" stroke-width="5"/><circle cx="4" cy="-93" r="6" fill="#F2C14E"/><path d="M-20,-36 C-6,-30 12,-30 26,-38" stroke="#F2C14E" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    return '';
  }
  function facewear(id) {
    if (id === 'shades')
      return `<rect x="-37" y="-21" width="31" height="25" rx="10" fill="#1E1E24" stroke="#FFFDF8" stroke-width="4.5"/>
        <rect x="6" y="-21" width="31" height="25" rx="10" fill="#1E1E24" stroke="#FFFDF8" stroke-width="4.5"/>
        <path d="M-6,-11 Q0,-16 6,-11" stroke="#FFFDF8" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <path d="M-30,-13 L-22,-16 M13,-13 L21,-16" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".35"/>`;
    return '';
  }
  function neckwear(id) {
    if (id === 'bandana_blue')
      return `<path d="M-37,18 C-14,34 14,34 37,18 L4,64 C2,67 -2,67 -4,64Z" fill="#3B6FC4"/><path d="M-26,26 C-10,36 10,36 26,26" stroke="#8FB2EA" stroke-width="2" fill="none"/>
        <path d="M-8,44 l4,-4 l4,4 l-4,4Z M6,36 l3,-3 l3,3 l-3,3Z M-2,56 l3,-3 l3,3 l-3,3Z" fill="#DCE8FA"/>`;
    if (id === 'scarf')
      return `<path d="M-36,18 C-14,36 14,36 36,18 L34,32 C14,48 -14,48 -34,32Z" fill="#D99A4E"/><path d="M-20,30 l-3,12 M-6,34 l-1,12 M8,34 l1,12 M22,30 l3,12" stroke="#FFF2DC" stroke-width="3"/>
        <path d="M14,40 L30,42 L26,74 L12,72Z" fill="#D99A4E"/><path d="M13,52 l15,2 M12,62 l15,2" stroke="#FFF2DC" stroke-width="3"/><path d="M13,72 v6 M19,73 v6 M25,74 v6" stroke="#B97A36" stroke-width="2"/>`;
    if (id === 'bandana')
      return `<path d="M-37,18 C-14,34 14,34 37,18 L4,64 C2,67 -2,67 -4,64Z" fill="#D5503F"/>
        <circle cx="-12" cy="42" r="2.2" fill="#fff"/><circle cx="10" cy="40" r="2.2" fill="#fff"/><circle cx="0" cy="54" r="2.2" fill="#fff"/><circle cx="-2" cy="38" r="1.6" fill="#fff"/>`;
    if (id === 'bow')
      return `<path d="M0,46 L-24,33 L-24,59Z" fill="#4E86C7"/><path d="M0,46 L24,33 L24,59Z" fill="#4E86C7"/><circle cx="0" cy="46" r="6.5" fill="#3B6FAE"/>`;
    if (id === 'bell')
      return `<path d="M-33,26 C-14,42 14,42 33,26" stroke="#8A5A36" stroke-width="7" fill="none" stroke-linecap="round"/>
        <circle cx="0" cy="46" r="8.5" fill="#F2C14E"/><path d="M-5,47h10" stroke="#B98A2E" stroke-width="1.6"/><circle cx="0" cy="50" r="1.8" fill="#8A5A36"/>`;
    return '';
  }

  function head(outfit) {
    const o = outfit || {};
    return `<g class="bun-head">
      <g class="neckwear">${neckwear(o.neck)}</g>
      <g class="ear ear-l"><path d="M-36,-14 C-51,-40 -51,-70 -41,-86 C-26,-79 -10,-57 -6,-34Z" fill="${FUR}"/><path class="ear-in" d="M-34,-25 C-43,-45 -43,-63 -38,-74 C-28,-67 -17,-51 -14,-37Z" fill="${EAR}"/></g>
      <g class="ear ear-r"><path d="M36,-14 C51,-40 51,-70 41,-86 C26,-79 10,-57 6,-34Z" fill="${FUR}"/><path class="ear-in" d="M34,-25 C43,-45 43,-63 38,-74 C28,-67 17,-51 14,-37Z" fill="${EAR}"/></g>
      <path class="head-base" d="M-46,-4 C-46,-34 -24,-44 0,-44 C24,-44 46,-34 46,-4 C46,18 30,36 0,36 C-30,36 -46,18 -46,-4Z" fill="${FUR}"/>
      <g class="face">
        <path d="M-5,-43.5 C-6,-26 -9,-14 -20,-2 C-32,10 -28,30 0,36 C28,30 32,10 20,-2 C9,-14 6,-26 5,-43.5Z" fill="${CREAM}"/>
        <ellipse cx="-21" cy="-9" rx="9.5" ry="7.5" fill="${FUR_D}" opacity=".35"/><ellipse cx="21" cy="-9" rx="9.5" ry="7.5" fill="${FUR_D}" opacity=".35"/>
        <g class="brows"><path d="M-30,-17 Q-22,-19 -12,-25" stroke="${FUR_D}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M12,-25 Q22,-19 30,-17" stroke="${FUR_D}" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>
        <g class="eyes eyes-open"><circle cx="-20" cy="-8" r="5.6" fill="${EYE}"/><circle cx="-18.3" cy="-10" r="1.9" fill="#fff"/><circle cx="20" cy="-8" r="5.6" fill="${EYE}"/><circle cx="21.7" cy="-10" r="1.9" fill="#fff"/></g>
        <g class="eyes eyes-closed"><path d="M-26,-8 Q-20,-3 -14,-8 M14,-8 Q20,-3 26,-8" stroke="${EYE}" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
        <g class="eyes eyes-happy"><path d="M-26,-6 Q-20,-13 -14,-6 M14,-6 Q20,-13 26,-6" stroke="${EYE}" stroke-width="2.8" fill="none" stroke-linecap="round"/></g>
        <ellipse cx="-27" cy="6" rx="6" ry="3.6" fill="#F3A089" opacity=".35"/><ellipse cx="27" cy="6" rx="6" ry="3.6" fill="#F3A089" opacity=".35"/>
        <g class="mouth mouth-open"><path d="M-13,17 Q-7,23 0,17 Q7,23 13,17 Q11,31 0,32 Q-11,31 -13,17Z" fill="#5A2A2A"/><path class="tongue" d="M-6,23 Q0,20 6,23 L6,30 Q0,39 -6,30Z" fill="${TONGUE}"/></g>
        <g class="mouth mouth-calm"><path d="M-10,17 Q-5,23 0,17 Q5,23 10,17" stroke="${NOSE}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
        <g class="mouth mouth-sad"><path d="M-8,22 Q0,16 8,22" stroke="${NOSE}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
        <path class="nose" d="M-8,5 C-8,0.5 8,0.5 8,5 C8,10 3,14 0,14 C-3,14 -8,10 -8,5Z" fill="${NOSE}"/>
        <ellipse cx="-2.5" cy="4" rx="2.4" ry="1.2" fill="#fff" opacity=".28"/>
      </g>
      <g class="headwear">${headwear(o.head)}</g>
      <g class="facewear">${facewear(o.face)}</g>
      <g class="carry"></g>
    </g>`;
  }

  /* ---------- Áo: vẽ theo từng tư thế, cắt đúng theo thân Bun ---------- */
  let gid = 0;
  const GARMENTS = {
    sweater_cream: { base: '#F3E6CC', trim: '#D99A4E', pat: 'knit', pc: '#DCC9A4' },
    sweater_xmas: { base: '#C8443A', trim: '#3F7D4E', pat: 'zig', pc: '#FFF6E6' },
    shirt_stripe: { base: '#FDFBF5', trim: '#2F4F8F', pat: 'stripes', pc: '#2F4F8F' },
    shirt_hawaii: { base: '#3E9C98', trim: '#2F7F7B', pat: 'flowers', pc: '#FBE08A' },
    jacket_denim: { base: '#5E7FA8', trim: '#3F5F86', pat: 'pocket', pc: '#8FABCD' },
    raincoat: { base: '#F2C230', trim: '#D9A51C', pat: 'plain', pc: '#fff' },
    aodai: { base: '#C8362E', trim: '#F2C14E', pat: 'flowers', pc: '#F6D25C' },
    bee: { base: '#F4C542', trim: '#2C2422', pat: 'bands', pc: '#2C2422', wings: true },
  };
  const TORSO = {
    stand: { d: 'M-58,-107 C-40,-107 0,-104 30,-106 L44,-103 C50,-80 50,-56 44,-33 C20,-31 -30,-31 -58,-32 C-64,-56 -64,-84 -58,-107Z', box: [-66, -110, 120, 82], trim: [[-66, -110, 13, 82], [37, -110, 15, 82]], wing: [-12, -104], along: 'x' },
    sit: { d: 'M-56,-46 C-52,-66 -40,-90 -6,-104 C24,-110 46,-94 47,-62 L46,-46Z', box: [-60, -112, 112, 70], trim: [[-60, -57, 112, 11]], wing: [-14, -98], along: 'y' },
    lie: { d: 'M-56,-70 C-30,-72 10,-69 44,-67 C50,-50 50,-20 44,-2 L-56,-2 C-62,-24 -62,-50 -56,-70Z', box: [-64, -74, 116, 74], trim: [[-64, -74, 13, 74], [37, -74, 15, 74]], wing: [-8, -68], along: 'x' },
    back: { d: 'M-28,-91 C-10,-100 10,-100 28,-91 C44,-78 54,-50 51,-22 L-51,-22 C-54,-50 -44,-78 -28,-91Z', box: [-56, -102, 112, 82], trim: [[-56, -33, 112, 11]], wing: [0, -84], along: 'y' },
  };
  function garment(id, pose) {
    const g = GARMENTS[id], T = TORSO[pose];
    if (!g || !T) return '';
    const cid = 'gc' + ++gid, x = T.box[0], y = T.box[1], w = T.box[2], h = T.box[3];
    let pat = '';
    if (g.pat === 'stripes' || g.pat === 'bands') {
      const step = g.pat === 'bands' ? 26 : 14, th = g.pat === 'bands' ? 12 : 5;
      if (T.along === 'x') for (let xx = x + 16; xx < x + w - 12; xx += step) pat += `<rect x="${xx}" y="${y}" width="${th}" height="${h}" fill="${g.pc}"/>`;
      else for (let yy = y + 12; yy < y + h - 12; yy += step) pat += `<rect x="${x}" y="${yy}" width="${w}" height="${th}" fill="${g.pc}"/>`;
    } else if (g.pat === 'knit') {
      for (let yy = y + 10; yy < y + h; yy += 13) { let d = `M${x},${yy}`; for (let xx = x; xx < x + w; xx += 12) d += ' l6,5 l6,-5'; pat += `<path d="${d}" stroke="${g.pc}" stroke-width="1.8" fill="none"/>`; }
    } else if (g.pat === 'zig') {
      const my = y + h * 0.5;
      let d = `M${x},${my}`;
      for (let xx = x; xx < x + w; xx += 16) d += ' l8,-9 l8,9';
      pat += `<path d="${d}" stroke="${g.pc}" stroke-width="4" fill="none" stroke-linejoin="round"/>`;
      for (let xx = x + 12; xx < x + w; xx += 20) pat += `<circle cx="${xx}" cy="${my - 22}" r="2.6" fill="${g.pc}"/><circle cx="${xx + 10}" cy="${my + 18}" r="2.6" fill="${g.pc}"/>`;
    } else if (g.pat === 'flowers') {
      let n = 0;
      for (let yy = y + 14; yy < y + h - 6; yy += 22) for (let xx = x + 18 + (n++ % 2) * 12; xx < x + w - 10; xx += 28) pat += `<circle cx="${xx - 3.4}" cy="${yy}" r="3" fill="${g.pc}"/><circle cx="${xx + 3.4}" cy="${yy}" r="3" fill="${g.pc}"/><circle cx="${xx}" cy="${yy - 3.4}" r="3" fill="${g.pc}"/><circle cx="${xx}" cy="${yy + 3.4}" r="3" fill="${g.pc}"/><circle cx="${xx}" cy="${yy}" r="1.8" fill="#fff"/>`;
    } else if (g.pat === 'pocket') {
      const px = x + w * 0.42, py = y + h * 0.5;
      pat += `<rect x="${px}" y="${py}" width="24" height="18" rx="3" fill="${g.pc}"/><path d="M${px + 2},${py + 5} h20" stroke="${g.trim}" stroke-width="1.5" stroke-dasharray="3 2"/><path d="M${x + w * 0.5},${y} v${h}" stroke="${g.trim}" stroke-width="1.4" stroke-dasharray="4 3" opacity=".6"/>`;
    }
    const trim = T.trim.map((r) => `<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${g.trim}"/>`).join('');
    const wings = g.wings ? `<ellipse cx="${T.wing[0] - 12}" cy="${T.wing[1] - 12}" rx="20" ry="12" fill="#fff" opacity=".85" transform="rotate(-24 ${T.wing[0] - 12} ${T.wing[1] - 12})"/><ellipse cx="${T.wing[0] + 14}" cy="${T.wing[1] - 12}" rx="20" ry="12" fill="#fff" opacity=".85" transform="rotate(24 ${T.wing[0] + 14} ${T.wing[1] - 12})"/>` : '';
    return `${wings}<clipPath id="${cid}"><path d="${T.d}"/></clipPath><g clip-path="url(#${cid})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${g.base}"/>${pat}${trim}</g><path d="${T.d}" fill="none" stroke="#3A2616" stroke-opacity=".12" stroke-width="2"/>`;
  }

  const poses = (bodyId) => { const G = (p) => garment(bodyId, p); return `
  <g class="pose pose-stand"><g class="bobber">
    <g class="leg leg-fb"><rect x="-64" y="-46" width="20" height="46" rx="9" fill="${FUR_D}"/><rect x="-64" y="-17" width="20" height="17" rx="8" fill="${CREAM_D}"/></g>
    <g class="leg leg-ff"><rect x="36" y="-48" width="19" height="48" rx="9" fill="${CREAM_D}"/></g>
    <g class="tail"><ellipse cx="-92" cy="-86" rx="12" ry="8" transform="rotate(-30 -92 -86)" fill="${FUR}"/></g>
    <g class="breath">
      <path d="M-90,-70 C-92,-100 -62,-108 -30,-106 C0,-104 30,-106 54,-100 C72,-94 76,-70 70,-52 C64,-36 42,-32 10,-32 C-30,-32 -62,-30 -78,-40 C-88,-48 -90,-58 -90,-70Z" fill="${FUR}"/>
      <path d="M-62,-38 C-30,-29 22,-29 52,-36 C30,-45 -30,-47 -62,-38Z" fill="${CREAM}"/>${G('stand')}
      <path d="M-90,-74 C-95,-58 -88,-43 -74,-38 C-79,-52 -78,-62 -82,-76Z" fill="${FUR_L}"/>
      <path d="M40,-102 C64,-106 82,-92 80,-66 C78,-46 62,-34 44,-33 C54,-50 52,-80 40,-102Z" fill="${CREAM}"/>
    </g>
    <g class="leg leg-nb"><rect x="-76" y="-48" width="22" height="48" rx="10" fill="${FUR}"/><rect x="-76" y="-19" width="22" height="19" rx="9" fill="${CREAM}"/></g>
    <g class="leg leg-nf"><rect x="46" y="-50" width="21" height="50" rx="10" fill="${CREAM}"/></g>
  </g></g>
  <g class="pose pose-sit">
    <g class="tail"><ellipse cx="-54" cy="-16" rx="11" ry="8" fill="${FUR}"/></g>
    <rect x="30" y="-54" width="17" height="54" rx="8" fill="${CREAM_D}"/>
    <g class="breath">
      <path d="M-52,-10 C-64,-42 -42,-98 0,-106 C30,-110 48,-92 46,-60 C45,-30 42,-10 32,0 L-38,0 C-46,0 -50,-4 -52,-10Z" fill="${FUR}"/>
      <path d="M8,-104 C36,-106 50,-88 48,-58 C46,-30 42,-12 34,0 L6,0 C12,-30 12,-70 8,-104Z" fill="${CREAM}"/>${G('sit')}
    </g>
    <ellipse cx="-22" cy="-25" rx="31" ry="27" fill="${FUR}"/>
    <path d="M-50,-22 C-48,-44 -20,-54 2,-42" fill="none" stroke="${FUR_D}" stroke-width="2" opacity=".45" stroke-linecap="round"/>
    <ellipse cx="-2" cy="-6" rx="19" ry="8" fill="${CREAM}"/>
    <rect x="14" y="-54" width="17" height="54" rx="8" fill="${CREAM}"/>
  </g>
  <g class="pose pose-lie">
    <ellipse cx="-98" cy="-18" rx="22" ry="9" fill="${CREAM_D}"/>
    <g class="tail"><ellipse cx="-94" cy="-54" rx="11" ry="8" transform="rotate(-25 -94 -54)" fill="${FUR}"/></g>
    <ellipse cx="72" cy="-13" rx="20" ry="8" fill="${CREAM_D}"/>
    <g class="breath">
      <path d="M-94,-30 C-98,-62 -62,-72 -20,-70 C20,-68 58,-68 72,-50 C82,-36 78,-10 62,-2 L-72,-2 C-88,-4 -92,-16 -94,-30Z" fill="${FUR}"/>${G('lie')}
      <path d="M-94,-34 C-99,-20 -92,-6 -76,-3 C-82,-14 -82,-26 -86,-38Z" fill="${FUR_L}"/>
      <path d="M46,-66 C68,-66 82,-48 80,-28 C78,-12 70,-4 60,-2 L38,-2 C50,-20 52,-46 46,-66Z" fill="${CREAM}"/>
    </g>
    <ellipse cx="-106" cy="-8" rx="24" ry="9" fill="${CREAM}"/><ellipse cx="-122" cy="-8" rx="5" ry="4" fill="${PAD}"/><circle cx="-114" cy="-13" r="2.2" fill="${PAD}"/><circle cx="-114" cy="-3" r="2.2" fill="${PAD}"/>
    <ellipse cx="86" cy="-7" rx="23" ry="8" fill="${CREAM}"/>
  </g>
  <g class="pose pose-back">
    <ellipse cx="-30" cy="-4" rx="16" ry="7" fill="${CREAM}"/><ellipse cx="30" cy="-4" rx="16" ry="7" fill="${CREAM}"/>
    <g class="breath">
      <path d="M-46,0 C-60,-32 -46,-94 0,-100 C46,-94 60,-32 46,0Z" fill="${FUR}"/>${G('back')}
      <path d="M-36,-84 C-20,-99 20,-99 36,-84 C20,-71 -20,-71 -36,-84Z" fill="${CREAM}"/>
      <path d="M-36,-2 C-34,-30 34,-30 36,-2Z" fill="${FUR_L}"/>
    </g>
    <g class="tail"><ellipse cx="0" cy="-24" rx="9" ry="10" fill="${FUR}"/></g>
  </g>`; };

  // Bun đầy đủ (dùng cho cả diễn viên trong phòng lẫn chân dung tĩnh)
  function bun(opts) {
    const o = opts || {};
    return `<g class="bun ${o.cls || ''}" ${o.id ? `id="${o.id}"` : ''} data-pose="${o.pose || 'stand'}" data-eyes="${o.eyes || 'open'}" data-mouth="${o.mouth || 'open'}" data-mood="${o.mood || 'happy'}">
      <ellipse class="bun-shadow" cx="0" cy="0" rx="84" ry="11"/>
      <g class="bun-flip"><g class="bun-inner">${poses(o.outfit && o.outfit.body)}<g class="head-anchor">${head(o.outfit)}</g></g></g>
      <g class="bun-fx"></g>
    </g>`;
  }
  function portrait(outfit, pose, mood) {
    return `<svg class="bun-portrait" viewBox="-110 -235 220 250" aria-hidden="true">${bun({ pose: pose || 'sit', outfit, mood: mood || 'happy', mouth: mood === 'sad' ? 'sad' : 'open', cls: 'static' })}</svg>`;
  }
  function avatar(outfit) {
    return `<svg class="bun-avatar" viewBox="-58 -92 116 140" aria-hidden="true"><g class="bun static" data-eyes="open" data-mouth="open">${head(outfit)}</g></svg>`;
  }

  /* ---------- Nội thất ---------- */
  function bed(id) {
    if (id === 'bed1')
      return {
        back: `<ellipse cx="0" cy="-8" rx="130" ry="34" fill="#A7B892"/><ellipse cx="0" cy="-10" rx="106" ry="22" fill="#E3E9D6"/>`,
        front: `<path d="M-130,-8 C-130,20 -60,30 0,30 C60,30 130,20 130,-8 C130,6 60,12 0,12 C-60,12 -130,6 -130,-8Z" fill="#93A680"/><path d="M-118,6 C-70,22 70,22 118,6" stroke="#C5D1B4" stroke-width="2" stroke-dasharray="5 7" fill="none"/>`,
      };
    if (id === 'bed2')
      return {
        back: `<ellipse cx="0" cy="-14" rx="130" ry="38" fill="#B5864C"/><ellipse cx="0" cy="-12" rx="110" ry="25" fill="#F3E8D2"/>`,
        front: `<path d="M-130,-14 C-130,24 -60,36 0,36 C60,36 130,24 130,-14 C130,2 60,10 0,10 C-60,10 -130,2 -130,-14Z" fill="#C4955A"/>
          <path d="M-122,2 C-70,22 70,22 122,2 M-112,14 C-60,30 60,30 112,14" stroke="#A67840" stroke-width="2.5" fill="none"/>
          <path d="M-90,8 l6,20 M-60,13 l5,20 M-30,15 l3,20 M0,16 l0,20 M30,15 l-3,20 M60,13 l-5,20 M90,8 l-6,20" stroke="#A67840" stroke-width="2.5"/>`,
      };
    if (id === 'bed3')
      return {
        back: `<rect x="124" y="-96" width="20" height="110" rx="8" fill="#A8774A"/><rect x="-142" y="-52" width="16" height="66" rx="7" fill="#A8774A"/>
          <rect x="-128" y="-28" width="256" height="32" rx="10" fill="#F6EEDD"/><ellipse cx="96" cy="-30" rx="30" ry="12" fill="#FFFBF2"/>`,
        front: `<path d="M-128,-6 C-90,-12 40,-12 128,-4 L128,16 L-128,16Z" fill="#DFA868"/>
          <path d="M-128,4 C-60,-2 40,-2 128,6 M-80,-9 L-84,16 M-30,-11 L-32,16 M20,-11 L20,16 M70,-9 L72,16" stroke="#C68A4A" stroke-width="2" fill="none"/>
          <rect x="-132" y="12" width="264" height="12" rx="5" fill="#96693F"/>`,
      };
    return {
      back: `<path d="M-124,-52 L124,-52 L116,6 L-116,6Z" fill="#B58B5A"/><path d="M-124,-52 L-144,-70 L-112,-74 L-98,-54Z" fill="#D9B787"/><path d="M124,-52 L146,-66 L116,-74 L100,-54Z" fill="#D9B787"/>
        <ellipse cx="0" cy="-2" rx="104" ry="12" fill="#EADDC6"/>`,
      front: `<path d="M-120,-18 L120,-18 L116,12 L-116,12Z" fill="#CFA774"/><rect x="-15" y="-18" width="30" height="30" fill="#E6CCA1" opacity=".75"/>
        <text x="62" y="5" font-size="14" font-weight="700" fill="#9A7448" font-family="Quicksand, sans-serif" transform="rotate(-4 62 5)">BUN</text>`,
    };
  }

  function rug(id, rx, ry) {
    if (id === 'rug1') {
      return `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="#EFE4D0"/><ellipse cx="0" cy="0" rx="${rx * 0.8}" ry="${ry * 0.78}" fill="none" stroke="#D9A566" stroke-width="5" stroke-dasharray="3 9" stroke-linecap="round"/>
        <ellipse cx="0" cy="0" rx="${rx * 0.52}" ry="${ry * 0.5}" fill="#F7EFE0" stroke="#D8C7AC" stroke-width="2"/>`;
    }
    if (id === 'rug2') {
      const w = rx * 1.86, h = ry * 1.7;
      let zig = '';
      for (let x = -w / 2 + 14; x < w / 2 - 14; x += 22) zig += `${x},-4 ${x + 11},4 `;
      return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="8" fill="#B5533F"/>
        <rect x="${-w / 2}" y="${-h / 2 + 10}" width="${w}" height="12" fill="#E0A84E"/><rect x="${-w / 2}" y="${h / 2 - 22}" width="${w}" height="12" fill="#E0A84E"/>
        <rect x="${-w / 2}" y="${-h / 2 + 26}" width="${w}" height="7" fill="#5F8F86"/><rect x="${-w / 2}" y="${h / 2 - 33}" width="${w}" height="7" fill="#5F8F86"/>
        <polyline points="${zig}" fill="none" stroke="#F6E7C8" stroke-width="3" stroke-linejoin="round"/>
        <path d="M${-w / 2 - 7},${-h / 2 + 6} v${h - 12} M${w / 2 + 7},${-h / 2 + 6} v${h - 12}" stroke="#E9D7B5" stroke-width="5" stroke-dasharray="2 5"/>`;
    }
    if (id === 'rug3') {
      let tufts = '';
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        tufts += `<circle cx="${(Math.cos(a) * rx * 0.95).toFixed(1)}" cy="${(Math.sin(a) * ry * 0.92).toFixed(1)}" r="${ry * 0.3}" fill="#F7F0E3"/>`;
      }
      return `${tufts}<ellipse cx="0" cy="0" rx="${rx * 0.95}" ry="${ry * 0.92}" fill="#FAF4E8"/>
        <path d="M${-rx * 0.5},-8 q8,-8 16,0 M${rx * 0.2},10 q8,-8 16,0 M${-rx * 0.1},-18 q8,-8 16,0 M${rx * 0.5},-6 q8,-8 16,0 M${-rx * 0.6},14 q8,-8 16,0" stroke="#E5DAC6" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    }
    const w = rx * 1.7, h = ry * 1.5;
    let lines = '';
    for (let y = -h / 2 + 9; y < h / 2 - 4; y += 10) lines += `<path d="M${-w / 2 + 6},${y} h${w - 12}" stroke="#C4AB74" stroke-width="1.6" opacity=".7"/>`;
    return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" fill="#DAC490"/>${lines}
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" fill="none" stroke="#B89A5E" stroke-width="3"/>`;
  }

  const leafP = (x, y, rot, s, fill) =>
    `<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})"><path d="M0,0 C-30,-10 -34,-50 0,-72 C34,-50 30,-10 0,0Z" fill="${fill}"/><path d="M0,-4 L0,-62" stroke="#3F6B45" stroke-width="2" opacity=".5"/></g>`;

  function plant(id) {
    if (id === 'plant1')
      return `<ellipse cx="0" cy="0" rx="30" ry="6" fill="#000" opacity=".12"/>
        <rect x="-11" y="-98" width="22" height="62" rx="11" fill="#7FA36B"/><path d="M-11,-64 h-12 a8,8 0 0 1 -8,-8 v-10" stroke="#7FA36B" stroke-width="12" fill="none" stroke-linecap="round"/>
        <path d="M0,-92 v48 M-5,-90 v44 M5,-90 v44" stroke="#6A8F58" stroke-width="1.4"/><circle cx="3" cy="-100" r="6" fill="#F0A6A0"/>
        <path d="M-22,0 L-26,-34 L26,-34 L22,0Z" fill="#C97B4A"/><rect x="-29" y="-40" width="58" height="9" rx="4" fill="#D98B58"/>`;
    if (id === 'plant2')
      return `<ellipse cx="0" cy="0" rx="44" ry="8" fill="#000" opacity=".12"/>
        <path d="M0,-50 C-20,-90 -40,-110 -52,-120 M0,-50 C16,-100 36,-120 52,-132 M0,-50 C-4,-110 -6,-150 -4,-170 M0,-50 C28,-80 54,-84 66,-86 M0,-50 C-30,-74 -56,-74 -70,-72" stroke="#5B7F4E" stroke-width="4" fill="none" stroke-linecap="round"/>
        ${leafP(-52, -118, -38, 0.9, '#5F8F5A')}${leafP(52, -130, 32, 0.95, '#6A9A62')}${leafP(-4, -168, -4, 1.05, '#5F8F5A')}${leafP(66, -86, 72, 0.75, '#74A56B')}${leafP(-70, -72, -78, 0.75, '#6A9A62')}
        <path d="M-32,0 L-38,-52 L38,-52 L32,0Z" fill="#EFE3CE"/><rect x="-38" y="-52" width="76" height="10" rx="4" fill="#E2D2B6"/><path d="M-35,-24 h70" stroke="#D99A4E" stroke-width="5"/>`;
    if (id === 'plant3') {
      const lv = [[-34, -120, -62, 0.8], [30, -138, 54, 0.85], [-38, -176, -50, 0.9], [34, -196, 46, 0.9], [-30, -236, -34, 0.95], [28, -254, 30, 0.95], [-4, -286, -4, 1.05], [-52, -210, -76, 0.7], [50, -166, 78, 0.7]];
      return `<ellipse cx="0" cy="0" rx="50" ry="9" fill="#000" opacity=".12"/>
        <path d="M0,-50 C6,-120 -8,-200 -2,-268" stroke="#7A5A3C" stroke-width="8" fill="none" stroke-linecap="round"/>
        ${lv.map((l, i) => leafP(l[0], l[1], l[2], l[3], i % 2 ? '#62966A' : '#4F8052')).join('')}
        <path d="M-36,0 L-42,-58 L42,-58 L36,0Z" fill="#C49A66"/><path d="M-41,-44 h82 M-40,-30 h80 M-38,-16 h76" stroke="#A67B48" stroke-width="2.5"/><rect x="-44" y="-62" width="88" height="9" rx="4" fill="#B48A57"/>`;
    }
    return '';
  }

  function lamp(id) {
    if (id === 'lamp2')
      return `<ellipse cx="0" cy="0" rx="40" ry="7" fill="#000" opacity=".12"/>
        <path d="M0,-124 L-34,0 M0,-124 L34,0 M0,-124 L0,-6" stroke="#9A6E45" stroke-width="6" stroke-linecap="round"/>
        <circle class="shade" cx="0" cy="-170" r="54" fill="#FBF1DA"/><path d="M-50,-190 C-20,-198 20,-198 50,-190 M-54,-170 C-20,-178 20,-178 54,-170 M-50,-150 C-20,-158 20,-158 50,-150" stroke="#E6D6B4" stroke-width="2" fill="none"/>`;
    if (id === 'lamp1')
      return `<ellipse cx="0" cy="-2" rx="34" ry="7" fill="#000" opacity=".12"/><ellipse cx="0" cy="-4" rx="30" ry="7" fill="#6B4A32"/>
        <rect x="-3" y="-236" width="6" height="232" fill="#8A6240"/>
        <path class="shade" d="M-46,-216 L-31,-284 L31,-284 L46,-216Z" fill="#F3E3C3"/><path d="M-44,-224 h88" stroke="#E0CCA4" stroke-width="3"/>`;
    return '';
  }

  function wall(id, outfit) {
    if (id === 'wall1')
      return `<rect x="-60" y="-46" width="120" height="92" rx="5" fill="#A8774A"/><rect x="-52" y="-38" width="104" height="76" fill="#F6E9CF"/>
        <circle cx="26" cy="-14" r="11" fill="#F2C14E"/><path d="M-52,22 Q-28,-16 -4,12 Q14,-8 52,18 L52,38 L-52,38Z" fill="#9DB08A"/><path d="M-52,30 Q-10,8 52,28 L52,38 L-52,38Z" fill="#7F9A72"/>`;
    if (id === 'wall2')
      return `<rect x="-48" y="-58" width="96" height="116" rx="5" fill="#96693F"/><rect x="-40" y="-50" width="80" height="100" fill="#F3E6CC"/>
        <g transform="translate(0,14) scale(.6)" class="bun static" data-eyes="open" data-mouth="open">${head(outfit)}</g>`;
    if (id === 'wall3') {
      let ticks = '';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ticks += `<circle cx="${(Math.sin(a) * 31).toFixed(1)}" cy="${(-Math.cos(a) * 31).toFixed(1)}" r="${i % 3 ? 1.4 : 2.4}" fill="#8A6240"/>`;
      }
      return `<circle r="46" fill="#B98552"/><circle r="38" fill="#FFF8EA"/>${ticks}
        <path class="clock-h" d="M0,3 L0,-18" stroke="#4A3323" stroke-width="4.5" stroke-linecap="round"/><path class="clock-m" d="M0,3 L0,-28" stroke="#4A3323" stroke-width="3" stroke-linecap="round"/><circle r="3.4" fill="#D5503F"/>`;
    }
    return '';
  }

  function lights(W, y0) {
    const seg = 190;
    let d = `M-10,${y0}`, bulbs = '';
    const cols = ['#FFE3A0', '#FFD0A0', '#FFF0C4'];
    let n = 0;
    for (let x = -10; x < W + 10; x += seg) {
      d += ` q${seg / 2},32 ${seg},0`;
      [0.2, 0.4, 0.6, 0.8].forEach((f) => {
        const bx = x + seg * f, by = y0 + 64 * f * (1 - f);
        bulbs += `<circle class="bulb" cx="${bx.toFixed(1)}" cy="${(by + 7).toFixed(1)}" r="5.5" fill="${cols[n++ % 3]}"/>`;
      });
    }
    return `<path d="${d}" stroke="#7A6652" stroke-width="2" fill="none"/>${bulbs}`;
  }

  function toy(id) {
    if (id === 'toy_ball') return `<ellipse cx="0" cy="0" rx="13" ry="3.5" fill="#000" opacity=".14"/><circle cx="0" cy="-13" r="13" fill="#C9DB5A"/><path d="M-12,-17 C-4,-14 0,-6 -2,0 M12,-9 C4,-12 0,-20 2,-26" stroke="#F6F9E0" stroke-width="2.4" fill="none"/>`;
    if (id === 'toy_rope')
      return `<ellipse cx="0" cy="0" rx="32" ry="4" fill="#000" opacity=".12"/><path d="M-22,-9 C-8,-22 8,4 22,-9" stroke="#5F8FBF" stroke-width="10" fill="none" stroke-linecap="round"/>
        <path d="M-14,-14 l4,8 M-2,-12 l4,8 M10,-8 l4,-7" stroke="#EDE4D3" stroke-width="3" stroke-linecap="round"/><circle cx="-27" cy="-9" r="9" fill="#EDE4D3"/><circle cx="27" cy="-9" r="9" fill="#EDE4D3"/>`;
    if (id === 'toy_duck')
      return `<ellipse cx="0" cy="0" rx="20" ry="4" fill="#000" opacity=".12"/><ellipse cx="-2" cy="-13" rx="19" ry="13" fill="#F4C542"/><circle cx="12" cy="-28" r="11" fill="#F4C542"/>
        <path d="M21,-29 l11,3 l-11,4Z" fill="#E8853A"/><circle cx="15" cy="-31" r="1.8" fill="#3B2A22"/><path d="M-16,-14 C-10,-8 0,-8 6,-14" stroke="#E0AE2C" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    return '';
  }

  // level: 0 trống, 1 vơi, 2 đầy
  function bowl(kind, level) {
    const body = kind === 'food' ? '#D98B58' : '#8FB7C9', rim = kind === 'food' ? '#E7A374' : '#A9CAD8';
    let fill = `<ellipse cx="0" cy="-19" rx="25" ry="5" fill="#4A3A30" opacity=".35"/>`;
    if (level > 0) {
      if (kind === 'food') fill = `<ellipse cx="0" cy="${level > 1 ? -21 : -19}" rx="${level > 1 ? 25 : 20}" ry="${level > 1 ? 8 : 4.5}" fill="#8A5A36"/><circle cx="-8" cy="-23" r="3" fill="#A06B42"/><circle cx="6" cy="-24" r="3" fill="#A06B42"/><circle cx="14" cy="-20" r="2.6" fill="#A06B42"/>`;
      else fill = `<ellipse cx="0" cy="-19" rx="${level > 1 ? 25 : 19}" ry="${level > 1 ? 5 : 3.5}" fill="#D4ECF5"/><path d="M-12,-20 q6,-3 12,0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".8"/>`;
    }
    const mark = kind === 'food' ? `<path d="M-7,-9 h14 M-9,-11 v4 M9,-11 v4" stroke="#FFF2DC" stroke-width="3" stroke-linecap="round"/>` : `<path d="M0,-14 c3,4 4,5 4,7 a4,4 0 0 1 -8,0 c0,-2 1,-3 4,-7z" fill="#EAF6FA"/>`;
    return `<ellipse cx="0" cy="0" rx="30" ry="5" fill="#000" opacity=".13"/><path d="M-31,-19 L31,-19 L24,0 C16,3 -16,3 -24,0Z" fill="${body}"/><ellipse cx="0" cy="-19" rx="31" ry="7" fill="${rim}"/>${fill}${mark}`;
  }

  const starPts = (cx, cy, r) => {
    let p = '';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      p += `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)} `;
    }
    return p;
  };
  function trophy(id) {
    const G = '#F2C14E', GD = '#C9962B';
    if (id === 'star') return `<rect x="-2" y="-16" width="4" height="12" fill="#B98552"/><rect x="-9" y="-5" width="18" height="5" rx="2" fill="#96693F"/><polygon points="${starPts(0, -26, 13)}" fill="${G}"/>`;
    if (id === 'paw') return `<rect x="-10" y="-4" width="20" height="4" rx="2" fill="#96693F"/><circle cx="0" cy="-17" r="13" fill="${G}"/><ellipse cx="0" cy="-13" rx="5" ry="4" fill="${GD}"/><circle cx="-6" cy="-19" r="2" fill="${GD}"/><circle cx="-2" cy="-23" r="2" fill="${GD}"/><circle cx="3" cy="-23" r="2" fill="${GD}"/><circle cx="7" cy="-19" r="2" fill="${GD}"/>`;
    if (id === 'cup') return `<rect x="-9" y="-5" width="18" height="5" rx="2" fill="#96693F"/><rect x="-2" y="-14" width="4" height="10" fill="${GD}"/><path d="M-11,-34 L11,-34 L9,-20 C8,-12 -8,-12 -9,-20Z" fill="${G}"/><path d="M-11,-31 c-8,0 -8,10 1,11 M11,-31 c8,0 8,10 -1,11" stroke="${GD}" stroke-width="2.5" fill="none"/>`;
    if (id === 'glass') return `<rect x="-10" y="-4" width="20" height="4" rx="2" fill="#96693F"/><rect x="-10" y="-34" width="20" height="4" rx="2" fill="#96693F"/><path d="M-8,-30 L8,-30 L1,-17 L8,-4 L-8,-4 L-1,-17Z" fill="#EAF2EE" stroke="#B8C7BF" stroke-width="1.5"/><path d="M-5,-5 L5,-5 L0,-13Z" fill="${G}"/>`;
    if (id === 'medal') return `<path d="M-8,-36 L0,-20 L8,-36 L3,-36 L0,-30 L-3,-36Z" fill="#D5503F"/><circle cx="0" cy="-13" r="12" fill="${G}"/><circle cx="0" cy="-13" r="7.5" fill="none" stroke="${GD}" stroke-width="2"/>`;
    return '';
  }

  const TREASURE_ART = {
    leaf: `<path d="M-12,10 C-14,-6 0,-16 14,-12 C14,4 2,14 -12,10Z" fill="#E29A3E"/><path d="M-12,10 L10,-9" stroke="#B9722A" stroke-width="1.6"/>`,
    sock: `<path d="M-6,-14 h10 v14 l8,6 a5,5 0 0 1 -5,8 h-8 a5,5 0 0 1 -5,-5Z" fill="#F3EADA" stroke="#D8C7AC" stroke-width="1.2"/><path d="M-6,-9 h10" stroke="#D5503F" stroke-width="3"/>`,
    button: `<circle r="12" fill="#D5503F"/><circle r="8" fill="none" stroke="#B23E30" stroke-width="1.5"/><circle cx="-3" cy="-3" r="1.6" fill="#7A2A20"/><circle cx="3" cy="-3" r="1.6" fill="#7A2A20"/><circle cx="-3" cy="3" r="1.6" fill="#7A2A20"/><circle cx="3" cy="3" r="1.6" fill="#7A2A20"/>`,
    acorn: `<ellipse cx="0" cy="3" rx="9" ry="11" fill="#B98552"/><path d="M-11,-3 C-10,-13 10,-13 11,-3Z" fill="#7A5A3C"/><path d="M0,-11 v-5" stroke="#7A5A3C" stroke-width="2.4" stroke-linecap="round"/>`,
    pebble: `<ellipse cx="0" cy="2" rx="13" ry="9" fill="#B9B4AA"/><ellipse cx="-4" cy="-1" rx="5" ry="2.5" fill="#D3CFC6"/>`,
    key: `<circle cx="-7" cy="-5" r="6" fill="none" stroke="#B98A2E" stroke-width="3.2"/><path d="M-3,-1 L11,12 M6,7 l4,-4 M10,11 l3,-3" stroke="#B98A2E" stroke-width="3.2" stroke-linecap="round"/>`,
    feather: `<path d="M-10,13 C-12,-4 0,-16 12,-14 C12,0 2,12 -10,13Z" fill="#DDE6EC"/><path d="M-11,14 L8,-10 M-4,6 l-5,-2 M1,0 l-6,-2 M5,-5 l-5,-2" stroke="#9FB1BD" stroke-width="1.4" stroke-linecap="round"/>`,
    cap: `<circle r="12" fill="#5F8FBF" stroke="#4B769F" stroke-width="2.5" stroke-dasharray="3 2.3"/><circle r="6.5" fill="#7FA8D0"/>`,
    shell: `<path d="M-12,8 C-14,-8 2,-16 12,-6 C16,2 10,12 -2,12Z" fill="#F4DCC6"/><path d="M-2,12 C4,6 6,-2 2,-8 M-8,10 C-2,4 -2,-4 -6,-9" stroke="#D9B79A" stroke-width="1.6" fill="none"/>`,
    flower: `<circle cx="0" cy="-8" r="5.5" fill="#F3B6C2"/><circle cx="7.6" cy="-2.5" r="5.5" fill="#F3B6C2"/><circle cx="4.7" cy="6.5" r="5.5" fill="#F3B6C2"/><circle cx="-4.7" cy="6.5" r="5.5" fill="#F3B6C2"/><circle cx="-7.6" cy="-2.5" r="5.5" fill="#F3B6C2"/><circle r="4" fill="#F2C14E"/>`,
    pencil: `<g transform="rotate(-40)"><rect x="-13" y="-4" width="20" height="8" fill="#F2C14E"/><path d="M7,-4 L15,0 L7,4Z" fill="#EAD2A8"/><path d="M12,-1.6 L15,0 L12,1.6Z" fill="#3B2A22"/><rect x="-16" y="-4" width="4" height="8" fill="#E58E84"/></g>`,
    ribbon: `<path d="M-13,-8 C-4,-14 4,-2 13,-8 L13,2 C4,8 -4,-4 -13,2Z" fill="#E58E84"/><path d="M-13,2 l-2,10 l6,-5Z M13,2 l2,10 l-6,-5Z" fill="#CF746A"/>`,
  };
  const treasure = (id, found) =>
    `<svg viewBox="-20 -20 40 40" class="treasure-art ${found ? '' : 'unknown'}" aria-hidden="true">${found ? TREASURE_ART[id] || '' : '<circle r="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 4"/><path d="M-3.5,-4 a3.6,3.6 0 1 1 5,3.3 c-1.2,.6 -1.5,1.2 -1.5,2.6 M0,6.4 v.4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'}</svg>`;

  /* ---------- Ảnh thu nhỏ cho cửa tiệm ---------- */
  function houseThumb(lv) {
    const wallC = lv >= 2 ? '#F4E9D4' : '#EFE3CC', floorC = lv >= 2 ? '#CE9C62' : '#D8BC92';
    const ww = lv >= 3 ? 44 : 28;
    return `<svg viewBox="0 0 120 84" aria-hidden="true"><rect width="120" height="84" rx="8" fill="${wallC}"/>
      ${lv >= 2 ? '<rect y="40" width="120" height="22" fill="#C9D1B6"/><rect y="38" width="120" height="3" fill="#E9DFC8"/>' : ''}
      <rect y="60" width="120" height="24" fill="${floorC}"/><path d="M0,72 h120 M30,60 v12 M80,72 v12" stroke="#000" opacity=".12"/>
      <rect x="${22}" y="14" width="${ww}" height="28" rx="2" fill="#BFE0F2" stroke="#FBF3E2" stroke-width="3"/>
      ${lv >= 3 ? '<circle cx="34" cy="38" r="3" fill="#7FA36B"/><circle cx="56" cy="38" r="3" fill="#7FA36B"/>' : ''}
      ${lv >= 4 ? '<rect y="0" width="120" height="6" fill="#8A6240"/><rect x="72" y="36" width="24" height="24" fill="#D9C4A6"/><path d="M77,60 v-12 a7,7 0 0 1 14,0 v12Z" fill="#3A2A22"/><path d="M84,58 c-3,-4 0,-6 0,-9 c3,3 4,6 0,9z" fill="#F2A03E"/>' : '<rect x="72" y="34" width="24" height="3" fill="#B98552"/>'}
      <rect x="100" y="22" width="14" height="38" fill="${lv >= 5 ? '#BFE0F2' : '#C99A63'}" stroke="#E9DCC3" stroke-width="2"/>${lv >= 5 ? '<path d="M100,46 q7,-8 14,0 v14 h-14Z" fill="#9DB08A"/>' : ''}
    </svg>`;
  }
  function thumb(item, outfit) {
    const s = item.slot;
    const wrap = (vb, inner) => `<svg viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
    if (s === 'bed') { const b = bed(item.id); return wrap('-150 -112 300 160', b.back + b.front); }
    if (s === 'rug') return wrap('-130 -62 260 124', rug(item.id, 112, 44));
    if (s === 'plant') return wrap(item.id === 'plant1' ? '-70 -120 140 132' : item.id === 'plant2' ? '-110 -196 220 210' : '-120 -310 240 324', plant(item.id));
    if (s === 'lamp') return wrap('-110 -292 220 304', lamp(item.id));
    if (s === 'wall') return wrap('-70 -64 140 128', wall(item.id, outfit));
    if (s === 'toy') return wrap('-40 -46 80 54', toy(item.id));
    if (s === 'lights') return wrap('0 60 190 60', lights(180, 70));
    if (s === 'curtain') {
      const c = B.art.CURTAIN[item.id];
      return wrap('0 0 120 100', `<rect x="24" y="16" width="72" height="68" rx="3" fill="#BFE0F2" stroke="#FBF3E2" stroke-width="5"/><path d="M12,10 h96" stroke="#8A6240" stroke-width="4" stroke-linecap="round"/>
        <path d="M14,12 h28 q-4,40 2,78 h-30Z" fill="${c.a}"/><path d="M106,12 h-28 q4,40 -2,78 h30Z" fill="${c.a}"/><path d="M24,14 v74 M34,14 v74 M96,14 v74 M86,14 v74" stroke="${c.b}" stroke-width="2" opacity=".7"/>`);
    }
    if (s === 'body') return `<svg viewBox="-120 -215 240 232" aria-hidden="true">${bun({ pose: 'stand', outfit: { body: item.id }, cls: 'static' })}</svg>`;
    if (s === 'head' || s === 'face' || s === 'neck') {
      const o = { [s]: item.id };
      return `<svg viewBox="-66 -96 132 170" aria-hidden="true"><g class="bun static" data-eyes="open" data-mouth="open">${head(o)}</g></svg>`;
    }
    return '';
  }

  B.art = {
    head, bun, portrait, avatar, bed, rug, plant, lamp, wall, lights, toy, bowl, trophy, treasure, thumb, houseThumb, starPts,
    CURTAIN: {
      cur0: { a: '#FBF6EA', b: '#E9DFCB' },
      cur1: { a: '#B4C2A0', b: '#9BAC86' },
      cur2: { a: '#D9685A', b: '#F6E3D6' },
    },
  };
})();
