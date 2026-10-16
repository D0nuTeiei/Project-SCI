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
    for (const n of atom.neighbors) { ax += n.pos.x - atom.pos.x; ay += n.pos.y - atom.pos.y; az += n.pos.z - atom.pos.z; }
    const l = Math.hypot(ax, ay, az) || 1;
    const v = { x: r.x * 0.6 - ax / l, y: r.y * 0.6 - ay / l, z: r.z * 0.6 - az / l };
    const vl = Math.hypot(v.x, v.y, v.z) || 1;
    atom.lpDirs.push({ x: v.x / vl, y: v.y / vl, z: v.z / vl });
  }
  atom.lpDirs.length = want;
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
