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
