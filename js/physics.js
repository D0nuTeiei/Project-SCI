// จัดรูปร่างโมเลกุลแบบ position-based: สปริงพันธะ + แรงผลักระหว่างกลุ่มอิเล็กตรอน (VSEPR)
// ใช้คณิตศาสตร์ธรรมดากับ pos {x,y,z} จึงไม่พึ่ง three.js

/** รัศมีลูกบอลอะตอม (เมตร) จากรัศมีโคเวเลนต์ */
export function atomRadius(el) {
  return Math.min(0.05, 0.014 + 0.02 * el.covalentRadius);
}

/** ความยาวพันธะที่แสดงผล (เมตร) — พันธะคู่/สามสั้นลงเล็กน้อยเหมือนของจริง */
export function bondLength(bond) {
  const base = atomRadius(bond.a.el) + atomRadius(bond.b.el) + 0.035;
  // พันธะสะพาน B–H–B ยาวกว่าพันธะ B–H ปลาย (133 pm เทียบกับ 119 pm)
  if (bond.bridge) return base * 1.12;
  // พันธะเรโซแนนซ์ (เช่น 1.5) ยาวระหว่างพันธะเดี่ยวกับพันธะคู่
  const o = bond.resonance ?? bond.order;
  const f = o <= 2 ? 1 - 0.08 * (o - 1) : 0.92 - 0.06 * (o - 2);
  return base * f;
}

/**
 * ดึงอะตอมที่เกิดพันธะไฮโดรเจนเข้าหากันเบา ๆ (ให้เห็นว่าโมเลกุลน้ำเกาะกลุ่มกัน)
 * hbonds: [{ h, acceptor }]
 */
export function attractHydrogenBonds(hbonds, target = 0.115, k = 0.04) {
  for (const { h, acceptor } of hbonds) {
    const dx = acceptor.pos.x - h.pos.x; const dy = acceptor.pos.y - h.pos.y; const dz = acceptor.pos.z - h.pos.z;
    const d = Math.hypot(dx, dy, dz) || 1e-6;
    const err = ((d - target) / d) * k;
    const wh = h.kinematic ? 0 : acceptor.kinematic ? 1 : 0.5;
    const wa = acceptor.kinematic ? 0 : h.kinematic ? 1 : 0.5;
    move(h, dx * err * wh, dy * err * wh, dz * err * wh);
    move(acceptor, -dx * err * wa, -dy * err * wa, -dz * err * wa);
  }
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
  if (lpCount === 0 && n <= 4 && center.coord) {
    // ไอออนโลหะกลางของสารเชิงซ้อน: เส้นตรง / สามเหลี่ยม / ทรงสี่หน้า (แรงผลักแบบจุดอ่อนเกินเมื่อลิแกนด์มีหลายอะตอม)
    const deg = n === 2 ? 180 : n === 3 ? 120 : 109.47;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pair(a, b, deg);
  } else if (n === 2 && lpCount === 3) { // เส้นตรง (XeF₂)
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
      if (n >= 2 && (n + lps.length >= 5 || center.coord) && expandedOctet(center, dirs, lps.length)) continue;
      // มุมจากการทดลอง (เช่น H₂S 92.1°): ตรึงมุมระหว่างพันธะ ให้แรงผลักขยับเฉพาะคู่โดดเดี่ยว
      const fixed = center.targetAngle != null && n >= 2;
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
        } else if (!d.atom.kinematic && n >= 2 && !fixed) {
          move(d.atom, tx * step * d.len, ty * step * d.len, tz * step * d.len);
        }
      }
      if (fixed) {
        const theta = (center.targetAngle * Math.PI) / 180;
        const bonds = dirs.filter((d) => !d.lp);
        for (let i = 0; i < bonds.length; i++) {
          for (let j = i + 1; j < bonds.length; j++) {
            const A = bonds[i].atom; const B = bonds[j].atom;
            const want = Math.sqrt(bonds[i].len ** 2 + bonds[j].len ** 2 - 2 * bonds[i].len * bonds[j].len * Math.cos(theta));
            const dx = B.pos.x - A.pos.x; const dy = B.pos.y - A.pos.y; const dz = B.pos.z - A.pos.z;
            const dist = Math.hypot(dx, dy, dz) || 1e-6;
            const err = ((dist - want) / dist) * 0.3;
            const wa = A.kinematic ? 0 : B.kinematic ? 1 : 0.5;
            const wb = B.kinematic ? 0 : A.kinematic ? 1 : 0.5;
            move(A, dx * err * wa, dy * err * wa, dz * err * wa);
            move(B, -dx * err * wb, -dy * err * wb, -dz * err * wb);
          }
        }
      }
    }

    // มุมบิดจากการทดลอง (เช่น H–O–O–H ของ H₂O₂ ~111.5°)
    for (const b of sys.bonds) {
      if (b.targetDihedral == null) continue;
      const A = b.a; const B = b.b;
      const X = A.neighbors.find((x) => x !== B); const Y = B.neighbors.find((y) => y !== A);
      if (!X || !Y || Y.kinematic) continue;
      let ax = B.pos.x - A.pos.x; let ay = B.pos.y - A.pos.y; let az = B.pos.z - A.pos.z;
      const al = Math.hypot(ax, ay, az) || 1e-6;
      ax /= al; ay /= al; az /= al;
      const proj = (p, o) => {
        const vx = p.pos.x - o.pos.x; const vy = p.pos.y - o.pos.y; const vz = p.pos.z - o.pos.z;
        const k = vx * ax + vy * ay + vz * az;
        return { x: vx - ax * k, y: vy - ay * k, z: vz - az * k };
      };
      const v = proj(X, A); const w = proj(Y, B);
      const cx = ay * v.z - az * v.y; const cy = az * v.x - ax * v.z; const cz = ax * v.y - ay * v.x;
      const phi = Math.atan2(cx * w.x + cy * w.y + cz * w.z, v.x * w.x + v.y * w.y + v.z * w.z);
      const target = ((phi >= 0 ? 1 : -1) * b.targetDihedral * Math.PI) / 180;
      const t = (target - phi) * 0.2;
      // หมุน Y รอบแกน A→B ที่ผ่าน B (สูตรของโรดริเกส)
      const c = Math.cos(t); const sn = Math.sin(t);
      const px = Y.pos.x - B.pos.x; const py = Y.pos.y - B.pos.y; const pz = Y.pos.z - B.pos.z;
      const dotp = ax * px + ay * py + az * pz;
      const rx = px * c + (ay * pz - az * py) * sn + ax * dotp * (1 - c);
      const ry = py * c + (az * px - ax * pz) * sn + ay * dotp * (1 - c);
      const rz = pz * c + (ax * py - ay * px) * sn + az * dotp * (1 - c);
      Y.pos.x = B.pos.x + rx; Y.pos.y = B.pos.y + ry; Y.pos.z = B.pos.z + rz;
    }

    // 3) พันธะคู่/เรโซแนนซ์หมุนไม่ได้: อะตอมที่ต่อกับสองปลายของพันธะต้องอยู่ในระนาบเดียวกัน
    //    (เอทีนแบนราบ, วงเบนซีนแบน, ไอโซเมอร์ cis/trans คงรูป)
    for (const b of sys.bonds) {
      const o = b.resonance ?? b.order;
      if (o < 1.5 || o >= 3) continue;
      const A = b.a; const B = b.b;
      const xs = A.neighbors.filter((n) => n !== B);
      const ys = B.neighbors.filter((n) => n !== A);
      if (!xs.length || !ys.length) continue;
      const X = xs[0];
      const ux = B.pos.x - A.pos.x; const uy = B.pos.y - A.pos.y; const uz = B.pos.z - A.pos.z;
      const vx = X.pos.x - A.pos.x; const vy = X.pos.y - A.pos.y; const vz = X.pos.z - A.pos.z;
      let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-9) continue;
      nx /= nl; ny /= nl; nz /= nl;
      for (const Y of [...xs.slice(1), ...ys]) {
        if (Y.kinematic) continue;
        const d = (Y.pos.x - A.pos.x) * nx + (Y.pos.y - A.pos.y) * ny + (Y.pos.z - A.pos.z) * nz;
        move(Y, -nx * d * 0.3, -ny * d * 0.3, -nz * d * 0.3);
      }
    }

    // วงอะโรมาติก: ทั้งวงและอะตอมที่ต่อกับวงอยู่ในระนาบเดียว
    const rings = new Set();
    for (const a of atoms) if (a.aromaticRing) rings.add(a.aromaticRing);
    for (const ring of rings) {
      const c = { x: 0, y: 0, z: 0 };
      ring.forEach((a) => { c.x += a.pos.x / ring.length; c.y += a.pos.y / ring.length; c.z += a.pos.z / ring.length; });
      let nx = 0; let ny = 0; let nz = 0;
      ring.forEach((a, i) => {
        const b2 = ring[(i + 1) % ring.length];
        const ux = a.pos.x - c.x; const uy = a.pos.y - c.y; const uz = a.pos.z - c.z;
        const vx = b2.pos.x - c.x; const vy = b2.pos.y - c.y; const vz = b2.pos.z - c.z;
        nx += uy * vz - uz * vy; ny += uz * vx - ux * vz; nz += ux * vy - uy * vx;
      });
      const nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-9) continue;
      nx /= nl; ny /= nl; nz /= nl;
      // หกเหลี่ยมด้านเท่า: กำหนดระยะ 1-2, 1-3, 1-4 ในวง (L, √3L, 2L) กันวงพับเว้า
      const ringBonds = ring.map((a, i) => a.bondTo(ring[(i + 1) % ring.length])).filter(Boolean);
      const L = ringBonds.reduce((sum, b2) => sum + bondLength(b2), 0) / (ringBonds.length || 1);
      for (let i = 0; i < 6; i++) {
        for (let j = i + 2; j < 6; j++) {
          const k = Math.min(j - i, 6 - (j - i));
          if (k < 2) continue;
          const want = k === 2 ? Math.sqrt(3) * L : 2 * L;
          const A = ring[i]; const B = ring[j];
          const dx = B.pos.x - A.pos.x; const dy = B.pos.y - A.pos.y; const dz = B.pos.z - A.pos.z;
          const dist = Math.hypot(dx, dy, dz) || 1e-6;
          const err = ((dist - want) / dist) * 0.2;
          const wa = A.kinematic ? 0 : B.kinematic ? 1 : 0.5;
          const wb = B.kinematic ? 0 : A.kinematic ? 1 : 0.5;
          move(A, dx * err * wa, dy * err * wa, dz * err * wa);
          move(B, -dx * err * wb, -dy * err * wb, -dz * err * wb);
        }
      }
      // อะตอมที่ต่อกับวงชี้ออกนอกวงตามแนวรัศมี
      for (const a of ring) {
        const rx = a.pos.x - c.x; const ry = a.pos.y - c.y; const rz = a.pos.z - c.z;
        const rl = Math.hypot(rx, ry, rz) || 1e-6;
        for (const b2 of a.bonds) {
          const n = b2.other(a);
          if (ring.includes(n) || n.kinematic) continue;
          const len = bondLength(b2);
          const tx = a.pos.x + (rx / rl) * len; const ty = a.pos.y + (ry / rl) * len; const tz = a.pos.z + (rz / rl) * len;
          move(n, (tx - n.pos.x) * 0.3, (ty - n.pos.y) * 0.3, (tz - n.pos.z) * 0.3);
        }
      }
      const flat = new Set(ring);
      ring.forEach((a) => a.neighbors.forEach((n) => flat.add(n)));
      for (const p of flat) {
        if (p.kinematic) continue;
        const d = (p.pos.x - c.x) * nx + (p.pos.y - c.y) * ny + (p.pos.z - c.z) * nz;
        move(p, -nx * d * 0.5, -ny * d * 0.5, -nz * d * 0.5);
      }
    }

    // 4) กันอะตอมซ้อนกัน
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
