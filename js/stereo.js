// ไอโซเมอร์เชิงพื้นที่: ลำดับความสำคัญ CIP, คาร์บอนไครัล (R/S) และไอโซเมอร์เรขาคณิตของพันธะคู่ (cis/trans, E/Z)
// ใช้ตำแหน่งอะตอมจริงในฉาก (ไม่พึ่งพา three.js)

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

/**
 * คีย์ลำดับความสำคัญ CIP ของกิ่งที่เริ่มจาก atom (มาจาก from): รายการเลขอะตอมทีละชั้น (sphere)
 * พันธะคู่/สามนับอะตอมซ้ำ (duplicate) ตามกฎ CIP — แบบย่อที่ใช้ได้ดีกับสารในหลักสูตร
 */
function cipKey(from, atom, depth = 6) {
  const key = [[atom.el.z]];
  let frontier = [{ atom, from }];
  const visited = new Set([from, atom]);
  for (let d = 1; d < depth && frontier.length; d++) {
    const layer = [];
    const next = [];
    for (const { atom: a, from: f } of frontier) {
      if (!a) continue;
      for (const b of a.bonds) {
        const n = b.other(a);
        if (n === f) {
          // พันธะหลายชั้นกลับไปหาอะตอมก่อนหน้า: นับอะตอมซ้ำ
          for (let k = 1; k < b.order; k++) layer.push(n.el.z);
          continue;
        }
        layer.push(n.el.z);
        for (let k = 1; k < b.order; k++) layer.push(n.el.z);
        if (!visited.has(n)) { visited.add(n); next.push({ atom: n, from: a }); }
      }
    }
    layer.sort((x, y) => y - x);
    key.push(layer);
    frontier = next;
  }
  return key;
}

function compareKeys(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] || []; const y = b[i] || [];
    const m = Math.max(x.length, y.length);
    for (let j = 0; j < m; j++) {
      const d = (x[j] ?? -1) - (y[j] ?? -1);
      if (d) return d;
    }
  }
  return 0;
}

/** เรียงอะตอมข้างเคียงตามลำดับความสำคัญ CIP (สูง → ต่ำ) — คืน null ถ้ามีกิ่งที่เท่ากัน */
export function rankNeighbors(center, neighbors = center.neighbors) {
  const items = neighbors.map((n) => ({ atom: n, key: cipKey(center, n) }));
  items.sort((p, q) => -compareKeys(p.key, q.key));
  for (let i = 1; i < items.length; i++) if (compareKeys(items[i - 1].key, items[i].key) === 0) return null;
  return items.map((i) => i.atom);
}

/** คาร์บอน (หรืออะตอม sp³ อื่น) ที่มีหมู่แทนที่ต่างกัน 4 หมู่ → ไครัล พร้อมป้าย R/S จากตำแหน่งจริง */
export function findStereocenters(comp) {
  const out = [];
  for (const c of comp.atoms) {
    if (c.bonds.length !== 4 || c.bonds.some((b) => b.order !== 1)) continue;
    const ranked = rankNeighbors(c);
    if (!ranked) continue;
    const [a, b, d] = ranked.slice(0, 3).map((n) => sub(n.pos, c.pos));
    // มองโดยให้หมู่ลำดับต่ำสุดชี้ออกจากผู้มอง: ผลคูณสามชั้นเป็นบวก = ทวนเข็ม = S
    const t = dot(a, cross(b, d));
    out.push({ atom: c, label: t > 0 ? 'S' : 'R', ranked });
  }
  return out;
}

/** ไอโซเมอร์เรขาคณิตของพันธะคู่ C=C (ไม่อยู่ในวง): E/Z และ cis/trans */
export function doubleBondStereo(comp) {
  const out = [];
  for (const b of comp.bonds) {
    if (b.order !== 2 || b.resonance != null) continue;
    const A = b.a; const B = b.b;
    const xs = A.neighbors.filter((n) => n !== B);
    const ys = B.neighbors.filter((n) => n !== A);
    if (xs.length !== 2 || ys.length !== 2) continue;
    const rx = rankNeighbors(A, xs);
    const ry = rankNeighbors(B, ys);
    if (!rx || !ry) continue;
    // ด้านเดียวกันหรือตรงข้าม: เทียบทิศของหมู่ลำดับสูงสุดทั้งสองฝั่ง เมื่อฉายตั้งฉากกับแกนพันธะ
    const axis = sub(B.pos, A.pos);
    const proj = (v) => { const k = dot(v, axis) / dot(axis, axis); return { x: v.x - axis.x * k, y: v.y - axis.y * k, z: v.z - axis.z * k }; };
    const same = dot(proj(sub(rx[0].pos, A.pos)), proj(sub(ry[0].pos, B.pos))) > 0;
    // cis/trans ใช้กับกรณีหมู่แทนที่ที่ไม่ใช่ H ข้างละหนึ่งหมู่ (เช่น 1,2-ไดคลอโรเอทีน, 2-บิวทีน)
    let cisTrans = null;
    const heavyX = xs.filter((n) => n.el.symbol !== 'H');
    const heavyY = ys.filter((n) => n.el.symbol !== 'H');
    if (heavyX.length === 1 && heavyY.length === 1) {
      cisTrans = dot(proj(sub(heavyX[0].pos, A.pos)), proj(sub(heavyY[0].pos, B.pos))) > 0 ? 'cis' : 'trans';
    }
    out.push({ bond: b, ez: same ? 'Z' : 'E', cisTrans, swap: ys });
  }
  return out;
}

/** สลับ cis ↔ trans: สลับตำแหน่งหมู่แทนที่สองหมู่บนคาร์บอนด้านหนึ่ง (ย้ายทั้งกิ่งไปด้วย) */
export function flipDoubleBond(sys, stereoItem) {
  const [y1, y2] = stereoItem.swap;
  const B = stereoItem.bond.a.neighbors.includes(y1) ? stereoItem.bond.a : stereoItem.bond.b;
  const branch = (start) => {
    const seen = new Set([B, start]);
    const stack = [start];
    while (stack.length) {
      const a = stack.pop();
      for (const n of a.neighbors) if (!seen.has(n)) { seen.add(n); stack.push(n); }
    }
    seen.delete(B);
    return [...seen];
  };
  const d = sub(y2.pos, y1.pos);
  const g1 = branch(y1); const g2 = branch(y2);
  g1.forEach((a) => { a.pos.x += d.x; a.pos.y += d.y; a.pos.z += d.z; });
  g2.forEach((a) => { a.pos.x -= d.x; a.pos.y -= d.y; a.pos.z -= d.z; });
  sys.version++;
}

/** ภาพสะท้อนในกระจก (สะท้อนตำแหน่งในแกน x รอบจุดศูนย์กลาง) */
export function mirrorPositions(atoms) {
  const cx = atoms.reduce((s, a) => s + a.pos.x, 0) / atoms.length;
  atoms.forEach((a) => { a.pos.x = 2 * cx - a.pos.x; });
  atoms.forEach((a) => a.lpDirs?.forEach((d) => { d.x = -d.x; }));
}
