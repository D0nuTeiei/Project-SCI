// โครงผลึกไอออนิกแบบจำลอง: สร้างตำแหน่งไอออนในเซลล์ผลึก (ไม่พึ่งพา three.js)
// งานวิจัย (Taber et al. 2012) พบว่านักเรียนมักมอง NaCl เป็น "โมเลกุล" คู่ Na–Cl จึงให้ดูโครงผลึกจริงประกอบ

// รัศมีไอออน (pm, Shannon) ใช้กำหนดขนาดลูกบอล
const IONIC_RADIUS = {
  'Li+1': 76, 'Na+1': 102, 'K+1': 138, 'Rb+1': 152, 'Cs+1': 167, 'Ag+1': 115, 'Cu+1': 77, 'NH4+1': 148,
  'Mg+2': 72, 'Ca+2': 100, 'Sr+2': 118, 'Ba+2': 135, 'Zn+2': 74, 'Fe+2': 78, 'Cu+2': 73, 'Ni+2': 69, 'Co+2': 75, 'Mn+2': 83,
  'Al+3': 54, 'Fe+3': 65,
  'F-1': 133, 'Cl-1': 181, 'Br-1': 196, 'I-1': 220, 'H-1': 140, 'O-2': 140, 'S-2': 184, 'N-3': 146,
};

export const LATTICES = {
  rocksalt: { th: 'แบบเกลือหิน (NaCl)', en: 'Rock salt (NaCl type)', cn: '6:6' },
  cscl: { th: 'แบบซีเซียมคลอไรด์ (CsCl)', en: 'Caesium chloride type', cn: '8:8' },
  fluorite: { th: 'แบบฟลูออไรต์ (CaF₂)', en: 'Fluorite (CaF₂ type)', cn: '8:4' },
  antifluorite: { th: 'แบบแอนติฟลูออไรต์ (Na₂O)', en: 'Antifluorite (Na₂O type)', cn: '4:8' },
};

/**
 * เลือกโครงผลึกจากรายการไอออน [{ hill, q, n, symbol }] — คืนค่า null ถ้ายังไม่มีแบบจำลอง
 * (สารที่มีไอออนสองชนิดและอัตราส่วน 1:1, 1:2, 2:1)
 */
export function latticeFor(ionGroups) {
  if (!ionGroups || ionGroups.length !== 2) return null;
  const cat = ionGroups.find((g) => g.q > 0);
  const an = ionGroups.find((g) => g.q < 0);
  if (!cat || !an) return null;
  const key = (g) => `${g.symbol || (g.hill === 'H4N' ? 'NH4' : g.hill)}${g.q > 0 ? '+' : ''}${g.q}`;
  const rc = IONIC_RADIUS[key(cat)];
  const ra = IONIC_RADIUS[key(an)];
  if (!rc || !ra) return null;
  const ratio = cat.n / an.n;
  let type = null;
  if (ratio === 1) type = (cat.symbol === 'Cs' || cat.hill === 'H4N') ? 'cscl' : 'rocksalt';
  else if (ratio === 0.5) type = 'fluorite';
  else if (ratio === 2) type = 'antifluorite';
  if (!type) return null;
  return { type, ...LATTICES[type], cation: { ...cat, radius: rc }, anion: { ...an, radius: ra } };
}

/**
 * ตำแหน่งไอออนในหน่วยของความยาวเซลล์ (ระยะไอออนบวก–ลบที่ใกล้ที่สุด = 1 สำหรับเกลือหิน)
 * คืนค่า { sites: [{ role, p: [x,y,z] }], center, neighbors: [index] } — center คือไอออนตัวอย่างที่ใช้แสดงเลขโคออร์ดิเนชัน
 */
export function latticeSites(type) {
  const sites = [];
  if (type === 'rocksalt') {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
      sites.push({ role: (i + j + k) % 2 === 0 ? 'cation' : 'anion', p: [i - 1.5, j - 1.5, k - 1.5] });
    }
  } else if (type === 'cscl') {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) sites.push({ role: 'anion', p: [i - 1, j - 1, k - 1] });
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) sites.push({ role: 'cation', p: [i - 0.5, j - 0.5, k - 0.5] });
  } else {
    // เซลล์ FCC 1 เซลล์ (ด้านยาว 2) + ไอออนในช่องทรงสี่หน้า 8 ตำแหน่ง
    const fcc = [];
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) for (let k = 0; k <= 2; k++) {
      const odd = [i, j, k].filter((v) => v === 1).length;
      if (odd === 0 || odd === 2) fcc.push([i - 1, j - 1, k - 1]);
    }
    const tet = [];
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) tet.push([x, y, z]);
    const [fccRole, tetRole] = type === 'fluorite' ? ['cation', 'anion'] : ['anion', 'cation'];
    fcc.forEach((p) => sites.push({ role: fccRole, p }));
    tet.forEach((p) => sites.push({ role: tetRole, p }));
  }
  // ไอออนตัวอย่าง: ไอออนที่อยู่ใกล้กลางที่สุด แล้วหาเพื่อนบ้านประจุตรงข้ามที่ใกล้ที่สุด
  const r = (p) => Math.hypot(p[0] - 0.1, p[1] - 0.05, p[2] - 0.02);
  let center = 0;
  sites.forEach((s, i) => { if (r(s.p) < r(sites[center].p)) center = i; });
  const c = sites[center];
  const dist = (a, b) => Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
  const opp = sites.map((s, i) => ({ i, d: dist(s, c) })).filter(({ i }) => sites[i].role !== c.role);
  const dmin = Math.min(...opp.map((o) => o.d));
  const neighbors = opp.filter((o) => o.d < dmin + 1e-6).map((o) => o.i);
  return { sites, center, neighbors };
}

// ---------- โครงสร้างแบบทั่วไป (ใช้แสดงผลร่วมกัน): ผลึกไอออนิก, ผลึกร่างตาข่าย, ผลึกโลหะ ----------
// structure = { key, sites: [{ sym, p:[x,y,z] (หน่วย = ระยะเพื่อนบ้านใกล้สุด), r (สัดส่วนของระยะนั้น) }],
//               bonds: [[i, j]], center, neighbors, electronSea, textTh, textEn }

const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const uniq = (pts) => {
  const out = [];
  for (const p of pts) if (!out.some((q) => d3(p, q) < 1e-6)) out.push(p);
  return out;
};
function pickCenter(sites, filter = () => true) {
  let best = -1;
  sites.forEach((s, i) => {
    if (!filter(s)) return;
    if (best < 0 || Math.hypot(...s.p) < Math.hypot(...sites[best].p)) best = i;
  });
  return best;
}
function nearestOf(sites, center, filter = () => true) {
  const c = sites[center];
  const ds = sites.map((s, i) => ({ i, d: i === center || !filter(s) ? Infinity : d3(s.p, c.p) }));
  const m = Math.min(...ds.map((x) => x.d));
  return ds.filter((x) => x.d < m + 1e-6).map((x) => x.i);
}
function scaleTo(sites, nn) {
  sites.forEach((s) => { s.p = s.p.map((v) => v / nn); });
}
function bondsWithin(sites, len, tol = 1e-3) {
  const out = [];
  for (let i = 0; i < sites.length; i++) for (let j = i + 1; j < sites.length; j++) if (Math.abs(d3(sites[i].p, sites[j].p) - len) < tol) out.push([i, j]);
  return out;
}

/** ตำแหน่งแบบเพชร (ด้านเซลล์ = 1) ภายในลูกบาศก์หนึ่งเซลล์ */
function diamondPoints() {
  const fcc = [];
  for (let i = -1; i <= 2; i++) for (let j = -1; j <= 2; j++) for (let k = -1; k <= 2; k++) {
    for (const b of [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]]) fcc.push([i + b[0], j + b[1], k + b[2]]);
  }
  const all = [];
  for (const p of fcc) for (const off of [[0, 0, 0], [0.25, 0.25, 0.25]]) all.push([p[0] + off[0], p[1] + off[1], p[2] + off[2]]);
  return uniq(all.filter((p) => p.every((v) => v > -1e-6 && v < 1 + 1e-6))).map((p) => p.map((v) => v - 0.5));
}

export function diamondStructure(sym = 'C') {
  const sites = diamondPoints().map((p) => ({ sym, p }));
  scaleTo(sites, Math.sqrt(3) / 4);
  const center = pickCenter(sites);
  return {
    key: `diamond-${sym}`, sites: sites.map((s) => ({ ...s, r: 0.22 })), bonds: bondsWithin(sites, 1),
    center, neighbors: nearestOf(sites, center), electronSea: false,
    titleTh: sym === 'C' ? 'เพชร (C)' : `${sym} โครงสร้างแบบเพชร`, titleEn: sym === 'C' ? 'Diamond (C)' : `${sym} (diamond structure)`,
    textTh: [`${sym} แต่ละอะตอมต่อกับ ${sym} 4 อะตอมแบบทรงสี่หน้า เป็นโครงผลึกร่างตาข่าย`, sym === 'C' ? 'แข็งมาก จุดหลอมเหลวสูง ไม่นำไฟฟ้า (ไม่มีอิเล็กตรอนอิสระ)' : 'ซิลิคอนเป็นสารกึ่งตัวนำ ใช้ทำชิปคอมพิวเตอร์'],
    textEn: [`each ${sym} bonds to 4 others in a tetrahedral covalent network`, sym === 'C' ? 'very hard, very high melting point, does not conduct electricity' : 'silicon is a semiconductor used in computer chips'],
  };
}

export function graphiteStructure() {
  const sites = [];
  const layers = [-1, 0, 1];
  for (const L of layers) {
    const shift = L === 0 ? [0, 1] : [0, 0]; // การซ้อนชั้นแบบ ABA
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
      for (const b of [[0, 0], [0, 1]]) {
        const x = i * Math.sqrt(3) + j * (Math.sqrt(3) / 2) + b[0] + shift[0];
        const y = j * 1.5 + b[1] + shift[1];
        if (Math.hypot(x, y) <= 2.7) sites.push({ sym: 'C', p: [x, L * 2.36, y] });
      }
    }
  }
  const center = pickCenter(sites, (s) => Math.abs(s.p[1]) < 1e-6);
  return {
    key: 'graphite', sites: sites.map((s) => ({ ...s, r: 0.22 })), bonds: bondsWithin(sites, 1),
    center, neighbors: nearestOf(sites, center), electronSea: false, layered: true,
    titleTh: 'แกรไฟต์ (C)', titleEn: 'Graphite (C)',
    textTh: ['C แต่ละอะตอมต่อกับ 3 อะตอมเป็นชั้นหกเหลี่ยม มีอิเล็กตรอนอิสระ → นำไฟฟ้าได้', 'ชั้นยึดกันด้วยแรงลอนดอนอ่อน ๆ → เลื่อนไถลได้ (ไส้ดินสอ, สารหล่อลื่น)'],
    textEn: ['each C bonds to 3 others in hexagonal sheets with delocalised electrons → conducts electricity', 'sheets are held by weak London forces → they slide (pencil lead, lubricant)'],
  };
}

export function quartzStructure() {
  // β-คริสโตบาไลต์อย่างง่าย: Si อยู่ตำแหน่งแบบเพชร O อยู่กึ่งกลางระหว่าง Si ที่ต่อกัน
  const si = diamondPoints();
  const nnSi = Math.sqrt(3) / 4;
  const sites = si.map((p) => ({ sym: 'Si', p }));
  for (let i = 0; i < si.length; i++) for (let j = i + 1; j < si.length; j++) {
    if (Math.abs(d3(si[i], si[j]) - nnSi) < 1e-6) sites.push({ sym: 'O', p: si[i].map((v, k) => (v + si[j][k]) / 2) });
  }
  scaleTo(sites, nnSi / 2);
  const center = pickCenter(sites, (s) => s.sym === 'Si');
  return {
    key: 'sio2', sites: sites.map((s) => ({ ...s, r: s.sym === 'Si' ? 0.3 : 0.26 })), bonds: bondsWithin(sites, 1),
    center, neighbors: nearestOf(sites, center), electronSea: false,
    titleTh: 'ซิลิคอนไดออกไซด์ (SiO₂)', titleEn: 'Silicon dioxide (SiO₂)',
    textTh: ['Si แต่ละอะตอมต่อกับ O 4 อะตอม และ O ต่อกับ Si 2 อะตอม เป็นโครงผลึกร่างตาข่าย', 'ไม่มีโมเลกุล O=Si=O — สูตร SiO₂ คืออัตราส่วน Si:O = 1:2 (ทราย, ควอตซ์, แก้ว)'],
    textEn: ['each Si bonds to 4 O and each O to 2 Si in a covalent network', 'there are no O=Si=O molecules — SiO₂ is the 1:2 ratio (sand, quartz, glass)'],
  };
}

// โครงสร้างผลึกของโลหะที่อุณหภูมิห้อง
const METAL_PACKING = {
  bcc: ['Li', 'Na', 'K', 'Rb', 'Cs', 'Ba', 'V', 'Cr', 'Fe', 'Nb', 'Mo', 'Ta', 'W', 'Eu'],
  fcc: ['Al', 'Ca', 'Sr', 'Ni', 'Cu', 'Rh', 'Pd', 'Ag', 'Ir', 'Pt', 'Au', 'Pb', 'Yb', 'Th', 'Ce'],
  hcp: ['Be', 'Mg', 'Sc', 'Ti', 'Co', 'Zn', 'Y', 'Zr', 'Tc', 'Ru', 'Cd', 'Hf', 'Re', 'Os', 'Tl', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Lu'],
};
const PACKING_TEXT = {
  bcc: { th: 'แบบลูกบาศก์กลางตัว (bcc) — แต่ละอะตอมมีเพื่อนบ้าน 8 อะตอม', en: 'body-centred cubic (bcc) — 8 nearest neighbours' },
  fcc: { th: 'แบบลูกบาศก์กลางหน้า (fcc) — แต่ละอะตอมมีเพื่อนบ้าน 12 อะตอม', en: 'face-centred cubic (fcc) — 12 nearest neighbours' },
  hcp: { th: 'แบบหกเหลี่ยมชิดที่สุด (hcp) — แต่ละอะตอมมีเพื่อนบ้าน 12 อะตอม', en: 'hexagonal close-packed (hcp) — 12 nearest neighbours' },
};

export function metalPacking(sym) {
  return Object.keys(METAL_PACKING).find((k) => METAL_PACKING[k].includes(sym)) || null;
}

export function metalStructure(el) {
  const packing = metalPacking(el.symbol) || 'fcc';
  let pts = [];
  if (packing === 'bcc') {
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) for (let k = 0; k <= 2; k++) pts.push([i - 1, j - 1, k - 1]);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) pts.push([i - 0.5, j - 0.5, k - 0.5]);
  } else if (packing === 'fcc') {
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) for (let k = 0; k <= 2; k++) pts.push([i - 1, j - 1, k - 1]);
    for (let i = 0; i <= 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
      pts.push([i - 1, j - 0.5, k - 0.5], [j - 0.5, i - 1, k - 0.5], [j - 0.5, k - 0.5, i - 1]);
    }
  } else {
    for (const [L, sh] of [[-1, [0, 0]], [0, [0.5, Math.sqrt(3) / 6]], [1, [0, 0]]]) {
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        const x = i + j * 0.5 + sh[0]; const y = j * (Math.sqrt(3) / 2) + sh[1];
        if (Math.hypot(x, y) <= 1.8) pts.push([x, L * Math.sqrt(2 / 3), y]);
      }
    }
  }
  pts = uniq(pts);
  const sites = pts.map((p) => ({ sym: el.symbol, p }));
  const center = pickCenter(sites);
  const nb = nearestOf(sites, center);
  scaleTo(sites, d3(sites[center].p, sites[nb[0]].p));
  return {
    key: `metal-${el.symbol}`, sites: sites.map((s) => ({ ...s, r: 0.42 })), bonds: [],
    center, neighbors: nb, electronSea: true,
    titleTh: `ผลึกโลหะ ${el.nameTh} (${el.symbol})`, titleEn: `Metallic crystal: ${el.nameEn} (${el.symbol})`,
    textTh: [`ไอออนบวกเรียงตัว${PACKING_TEXT[packing].th}`, 'อิเล็กตรอนเวเลนซ์เคลื่อนที่อิสระทั่วผลึก (ทะเลอิเล็กตรอน) → นำไฟฟ้า นำความร้อน ตีแผ่และดึงเป็นเส้นได้'],
    textEn: [`positive ions packed ${PACKING_TEXT[packing].en}`, 'valence electrons move freely through the crystal (electron sea) → conducts, malleable and ductile'],
  };
}

/** แปลงผลึกไอออนิก (จาก latticeFor) เป็นโครงสร้างแบบทั่วไป */
export function ionicStructure(lat) {
  const { sites, center, neighbors } = latticeSites(lat.type);
  const nn = d3(sites[center].p, sites[neighbors[0]].p);
  const sum = lat.cation.radius + lat.anion.radius;
  const symOf = (ion) => ion.symbol || (ion.hill === 'H4N' ? 'N' : 'C');
  const out = sites.map((s) => {
    const ion = s.role === 'cation' ? lat.cation : lat.anion;
    return { sym: symOf(ion), p: s.p.map((v) => v / nn), r: (ion.radius / sum) * 0.62 };
  });
  const c = sites[center].role === 'cation' ? lat.cation : lat.anion;
  return {
    key: `ionic-${lat.type}-${lat.cation.pretty}-${lat.anion.pretty}`, sites: out, bonds: [], center, neighbors, electronSea: false,
    titleTh: lat.th, titleEn: lat.en, cn: lat.cn, centerIon: c.pretty, ionic: true,
  };
}

/**
 * โครงสร้างผลึกที่เปิดดูได้สำหรับสิ่งที่เลือก — คืนค่า [{ id, th, en, build }]
 * info: ผลวิเคราะห์โมเลกุล (ถ้ามี), el: ธาตุ (เลือกจากตารางธาตุหรืออะตอมเดี่ยว), ionGroups: กลุ่มไอออนที่วางชิดกัน
 */
export function structureOptions({ info = null, el = null, ionGroups = null } = {}) {
  const out = [];
  const groups = ionGroups || (info?.ionic && info.complete ? info.ionGroups : null);
  const lat = latticeFor(groups);
  if (lat) out.push({ id: 'ionic', th: 'โครงผลึกไอออนิก', en: 'Ionic lattice', build: () => ionicStructure(lat) });
  if (info?.entry?.id === 'SiO2') out.push({ id: 'sio2', th: 'โครงผลึกร่างตาข่าย SiO₂', en: 'SiO₂ network', build: quartzStructure });
  // โลหะล้วน (อะตอมเดี่ยวหรือโลหะต่อกัน) → ผลึกโลหะ
  const metalEl = el && METALLIC_CATS.has(el.category) ? el
    : info && info.counts && Object.keys(info.counts).length === 1 && !info.charge && info.single == null && info.metalOnly ? info.metalEl : null;
  if (metalEl) out.push({ id: 'metal', th: 'ผลึกโลหะ', en: 'Metallic crystal', build: () => metalStructure(metalEl) });
  if (el?.symbol === 'C') {
    out.push({ id: 'diamond', th: 'เพชร', en: 'Diamond', build: () => diamondStructure('C') });
    out.push({ id: 'graphite', th: 'แกรไฟต์', en: 'Graphite', build: graphiteStructure });
  }
  if (el && (el.symbol === 'Si' || el.symbol === 'Ge')) out.push({ id: 'diamond', th: 'โครงผลึกร่างตาข่าย', en: 'Covalent network', build: () => diamondStructure(el.symbol) });
  return out;
}
const METALLIC_CATS = new Set(['alkali', 'alkaline', 'transition', 'post-transition', 'lanthanide', 'actinide']);
