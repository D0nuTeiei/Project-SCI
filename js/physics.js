// จัดรูปร่างโมเลกุลแบบ position-based: สปริงพันธะ + แรงผลักระหว่างกลุ่มอิเล็กตรอน (VSEPR)
// ใช้คณิตศาสตร์ธรรมดากับ pos {x,y,z} จึงไม่พึ่ง three.js

/** รัศมีลูกบอลอะตอม (เมตร) จากรัศมีโคเวเลนต์ */
export function atomRadius(el) {
  return Math.min(0.05, 0.014 + 0.02 * el.covalentRadius);
}

/** ความยาวพันธะที่แสดงผล (เมตร) — พันธะคู่/สามสั้นลงเล็กน้อยเหมือนของจริง */
export function bondLength(bond) {
  const base = atomRadius(bond.a.el) + atomRadius(bond.b.el) + 0.035;
  return base * (bond.order === 1 ? 1 : bond.order === 2 ? 0.92 : 0.86);
}

const BREAK_RATIO = 1.8;
export function isOverstretched(bond) {
  return dist(bond.a.pos, bond.b.pos) > bondLength(bond) * BREAK_RATIO;
}

function dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z); }

function move(atom, dx, dy, dz) {
  atom.pos.x += dx; atom.pos.y += dy; atom.pos.z += dz;
}

// น้ำหนักแรงผลัก: อิเล็กตรอนคู่โดดเดี่ยวผลักแรงกว่าคู่พันธะ ทำให้มุมในน้ำแคบลง (~104.5°)
const W_BB = 1.0;
const W_LB = 1.25;
const W_LL = 1.6;
const W_LL_EXPANDED = 4; // อะตอมที่มีกลุ่มอิเล็กตรอน ≥ 5 (เช่น XeF4) ให้คู่โดดเดี่ยวอยู่ตรงข้ามกัน

function randomUnit() {
  const u = Math.random() * 2 - 1;
  const th = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return { x: s * Math.cos(th), y: s * Math.sin(th), z: u };
}

function syncLonePairs(atom) {
  const want = atom.bonds.length >= 1 ? atom.lonePairs() : 0;
  while (atom.lpDirs.length < want) {
    // เริ่มให้อยู่ฝั่งตรงข้ามกับพันธะเพื่อลู่เข้าเร็ว
    const r = randomUnit();
    let ax = 0; let ay = 0; let az = 0;
    for (const n of atom.neighbors) {
      const dx = n.pos.x - atom.pos.x; const dy = n.pos.y - atom.pos.y; const dz = n.pos.z - atom.pos.z;
      const l = Math.hypot(dx, dy, dz) || 1;
      ax += dx / l; ay += dy / l; az += dz / l;
    }
    // คู่โดดเดี่ยวที่วางไปแล้วก็นับด้วย จะได้กระจายตัวตั้งแต่ต้น (กันติดค่าต่ำสุดเฉพาะที่)
    for (const d of atom.lpDirs) { ax += d.x; ay += d.y; az += d.z; }
    const l = Math.hypot(ax, ay, az) || 1;
    const v = { x: r.x * 0.6 - ax / l, y: r.y * 0.6 - ay / l, z: r.z * 0.6 - az / l };
    const vl = Math.hypot(v.x, v.y, v.z) || 1;
    atom.lpDirs.push({ x: v.x / vl, y: v.y / vl, z: v.z / vl });
  }
  atom.lpDirs.length = want;
}

// ---------- แม่แบบ VSEPR สำหรับกลุ่มอิเล็กตรอน 5–6 กลุ่ม ----------
const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const angleOf = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot3(a, b))));
const norm3 = (v) => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const cross3 = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const sub3 = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add3 = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale3 = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const neg3 = (a) => scale3(a, -1);
/** หมุนเวกเตอร์ v รอบแกน k (หน่วย) เป็นมุม t */
function rotate3(v, k, t) {
  const c = Math.cos(t); const s = Math.sin(t);
  return add3(add3(scale3(v, c), scale3(cross3(k, v), s)), scale3(k, dot3(k, v) * (1 - c)));
}
function perpendicular(a) {
  const t = Math.abs(a.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  return norm3(cross3(a, t));
}
function largestPair(d, idx) {
  let best = null; let bestA = -1;
  for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) {
    const a = angleOf(d[idx[i]], d[idx[j]]);
    if (a > bestA) { bestA = a; best = [idx[i], idx[j]]; }
  }
  return best;
}
const DEG = Math.PI / 180;

/**
 * กำหนดมุมเป้าหมายระหว่างพันธะคู่ต่าง ๆ ตามรูปร่าง VSEPR (มุมปรับตามค่าทดลองของสารตัวอย่าง เช่น SF₄, ClF₃, BrF₅)
 * แล้วดึงอะตอมข้างเคียงเข้าหามุมนั้น — คืนค่า false ถ้าไม่รองรับกรณีนี้
 */
function expandedOctet(center, d, lpCount) {
  const n = d.length;
  const all = d.map((_, i) => i);
  const targets = [];
  let lps = [];
  const pair = (i, j, deg) => targets.push([i, j, deg * DEG]);
  if (n === 2 && lpCount === 3) { // เส้นตรง (XeF₂)
    pair(0, 1, 180);
    const axis = norm3(sub3(d[0], d[1]));
    const u = perpendicular(axis);
    lps = [0, 1, 2].map((k) => rotate3(u, axis, (k * 2 * Math.PI) / 3));
  } else if (n === 3 && lpCount === 2) { // รูปตัวที (ClF₃)
    const [i, j] = largestPair(d, all);
    const k = all.find((x) => x !== i && x !== j);
    pair(i, j, 175); pair(i, k, 87.5); pair(j, k, 87.5);
    const axis = norm3(sub3(d[i], d[j]));
    const e = norm3(sub3(d[k], scale3(axis, dot3(d[k], axis))));
    lps = [rotate3(e, axis, (2 * Math.PI) / 3), rotate3(e, axis, (-2 * Math.PI) / 3)];
  } else if (n === 4 && lpCount === 1) { // ไม้กระดก (SF₄)
    const [i, j] = largestPair(d, all);
    const [k, l] = all.filter((x) => x !== i && x !== j);
    pair(i, j, 173); pair(k, l, 102);
    for (const a of [i, j]) for (const b of [k, l]) pair(a, b, 88);
    const axis = norm3(sub3(d[i], d[j]));
    const eq = add3(d[k], d[l]);
    lps = [norm3(neg3(sub3(eq, scale3(axis, dot3(eq, axis)))))];
  } else if (n === 4 && lpCount === 2) { // สี่เหลี่ยมแบนราบ (XeF₄)
    const [i, j] = largestPair(d, all);
    const [k, l] = all.filter((x) => x !== i && x !== j);
    pair(i, j, 180); pair(k, l, 180);
    for (const a of [i, j]) for (const b of [k, l]) pair(a, b, 90);
    const nrm = norm3(cross3(sub3(d[i], d[j]), sub3(d[k], d[l])));
    lps = [nrm, neg3(nrm)];
  } else if (n === 5 && lpCount === 0) { // พีระมิดคู่ฐานสามเหลี่ยม (PCl₅)
    const [i, j] = largestPair(d, all);
    const eq = all.filter((x) => x !== i && x !== j);
    pair(i, j, 180);
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) pair(eq[a], eq[b], 120);
    for (const a of [i, j]) for (const b of eq) pair(a, b, 90);
  } else if (n === 5 && lpCount === 1) { // พีระมิดฐานสี่เหลี่ยม (BrF₅)
    // ยอดพีระมิด = พันธะที่มุมกว้างสุดกับพันธะอื่นแคบที่สุด
    let apex = 0; let bestMax = Infinity;
    for (const a of all) {
      const m = Math.max(...all.filter((b) => b !== a).map((b) => angleOf(d[a], d[b])));
      if (m < bestMax) { bestMax = m; apex = a; }
    }
    const base = all.filter((x) => x !== apex);
    const [i, j] = largestPair(d, base);
    const [k, l] = base.filter((x) => x !== i && x !== j);
    for (const b of base) pair(apex, b, 84.8);
    pair(i, j, 169.6); pair(k, l, 169.6);
    for (const a of [i, j]) for (const b of [k, l]) pair(a, b, 89.5);
    lps = [norm3(neg3(d[apex]))];
  } else if (n === 6 && lpCount === 0) { // ทรงแปดหน้า (SF₆)
    const left = [...all];
    while (left.length) {
      const [i, j] = largestPair(d, left);
      pair(i, j, 180);
      left.splice(left.indexOf(i), 1);
      left.splice(left.indexOf(j), 1);
    }
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
      if (!targets.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) pair(a, b, 90);
    }
  } else return false;

  center.lpDirs.length = 0;
  center.lpDirs.push(...lps);
  // ปรับระยะระหว่างอะตอมข้างเคียงตามกฎของโคไซน์
  for (const [i, j, theta] of targets) {
    const A = d[i].atom; const B = d[j].atom;
    const want = Math.sqrt(d[i].len ** 2 + d[j].len ** 2 - 2 * d[i].len * d[j].len * Math.cos(theta));
    const dx = B.pos.x - A.pos.x; const dy = B.pos.y - A.pos.y; const dz = B.pos.z - A.pos.z;
    const dist = Math.hypot(dx, dy, dz) || 1e-6;
    const err = ((dist - want) / dist) * 0.3;
    const wa = A.kinematic ? 0 : B.kinematic ? 1 : 0.5;
    const wb = B.kinematic ? 0 : A.kinematic ? 1 : 0.5;
    move(A, dx * err * wa, dy * err * wa, dz * err * wa);
    move(B, -dx * err * wb, -dy * err * wb, -dz * err * wb);
  }
  return true;
}

/**
 * หนึ่งเฟรมของการจัดรูปร่าง
 * @param {import('./chemistry.js').ChemSystem} sys
 */
export function relax(sys, iterations = 6) {
  const atoms = sys.atoms;
  for (const a of atoms) syncLonePairs(a);

  for (let it = 0; it < iterations; it++) {
    // 1) สปริงพันธะ
    for (const b of sys.bonds) {
      const { a, b: c } = b;
      if (a.kinematic && c.kinematic) continue;
      const dx = c.pos.x - a.pos.x; const dy = c.pos.y - a.pos.y; const dz = c.pos.z - a.pos.z;
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      const err = (d - bondLength(b)) / d;
      const k = 0.45;
      const wa = a.kinematic ? 0 : c.kinematic ? 1 : 0.5;
      const wc = c.kinematic ? 0 : a.kinematic ? 1 : 0.5;
      move(a, dx * err * k * wa, dy * err * k * wa, dz * err * k * wa);
      move(c, -dx * err * k * wc, -dy * err * k * wc, -dz * err * k * wc);
    }

    // 2) VSEPR: กลุ่มอิเล็กตรอนรอบอะตอมกลางผลักกันบนทรงกลม
    for (const center of atoms) {
      const nbs = center.neighbors;
      const lps = center.lpDirs;
      const n = nbs.length;
      if (n === 0 || n + lps.length < 2) continue;
      const dirs = [];
      for (const nb of nbs) {
        const dx = nb.pos.x - center.pos.x; const dy = nb.pos.y - center.pos.y; const dz = nb.pos.z - center.pos.z;
        const l = Math.hypot(dx, dy, dz) || 1e-6;
        dirs.push({ x: dx / l, y: dy / l, z: dz / l, len: l, lp: false, atom: nb });
      }
      // กลุ่มอิเล็กตรอน ≥ 5 (เวเลนซ์ขยาย): แรงผลักแบบจุดบนทรงกลมมีค่าต่ำสุดเฉพาะที่หลายแบบ
      // จึงใช้แม่แบบ VSEPR โดยตรง (คู่โดดเดี่ยวอยู่ตำแหน่งแนวราบ / ตรงข้ามกัน)
      if (n >= 2 && n + lps.length >= 5 && expandedOctet(center, dirs, lps.length)) continue;
      for (const lp of lps) dirs.push({ x: lp.x, y: lp.y, z: lp.z, lp: true, ref: lp });
      const forces = dirs.map(() => ({ x: 0, y: 0, z: 0 }));
      for (let i = 0; i < dirs.length; i++) {
        for (let j = i + 1; j < dirs.length; j++) {
          const p = dirs[i]; const q = dirs[j];
          const w = p.lp && q.lp ? (dirs.length >= 5 ? W_LL_EXPANDED : W_LL) : (p.lp || q.lp ? W_LB : W_BB);
          let dx = p.x - q.x; let dy = p.y - q.y; let dz = p.z - q.z;
          let d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 1e-6) { const r = randomUnit(); dx = r.x * 1e-2; dy = r.y * 1e-2; dz = r.z * 1e-2; d2 = 1e-4; }
          const f = w / (d2 * Math.sqrt(d2));
          forces[i].x += dx * f; forces[i].y += dy * f; forces[i].z += dz * f;
          forces[j].x -= dx * f; forces[j].y -= dy * f; forces[j].z -= dz * f;
        }
      }
      for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i]; const f = forces[i];
        // เอาเฉพาะส่วนที่สัมผัสทรงกลม (เปลี่ยนมุม ไม่เปลี่ยนความยาวพันธะ)
        const dot = f.x * d.x + f.y * d.y + f.z * d.z;
        let tx = f.x - d.x * dot; let ty = f.y - d.y * dot; let tz = f.z - d.z * dot;
        const tl = Math.hypot(tx, ty, tz);
        const maxStep = 0.25;
        if (tl > maxStep) { tx *= maxStep / tl; ty *= maxStep / tl; tz *= maxStep / tl; }
        const step = 0.06;
        if (d.lp) {
          const v = d.ref;
          // อะตอมปลาย (มีพันธะเดียว) ให้คู่โดดเดี่ยวหมุนหนีพันธะเท่านั้น ไม่ดันอะตอมข้างเคียง
          v.x += tx * step * 2; v.y += ty * step * 2; v.z += tz * step * 2;
          const l = Math.hypot(v.x, v.y, v.z) || 1;
          v.x /= l; v.y /= l; v.z /= l;
        } else if (!d.atom.kinematic && n >= 2) {
          move(d.atom, tx * step * d.len, ty * step * d.len, tz * step * d.len);
        }
      }
    }

    // 3) กันอะตอมซ้อนกัน
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      for (let j = i + 1; j < atoms.length; j++) {
        const c = atoms[j];
        if (a.kinematic && c.kinematic) continue;
        const minD = (atomRadius(a.el) + atomRadius(c.el)) * (a.bondTo(c) ? 0.6 : 1.05) + 0.004;
        const dx = c.pos.x - a.pos.x; const dy = c.pos.y - a.pos.y; const dz = c.pos.z - a.pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= minD * minD) continue;
        let d = Math.sqrt(d2);
        let nx; let ny; let nz;
        if (d < 1e-5) { const r = randomUnit(); nx = r.x; ny = r.y; nz = r.z; d = 0; } else { nx = dx / d; ny = dy / d; nz = dz / d; }
        const push = (minD - d) * 0.5;
        const wa = a.kinematic ? 0 : c.kinematic ? 1 : 0.5;
        const wc = c.kinematic ? 0 : a.kinematic ? 1 : 0.5;
        move(a, -nx * push * wa, -ny * push * wa, -nz * push * wa);
        move(c, nx * push * wc, ny * push * wc, nz * push * wc);
      }
    }
  }
}
