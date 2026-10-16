// แบบจำลองกราฟอะตอม–พันธะ: ตรวจเวเลนซ์ จัดอันดับพันธะ (เดี่ยว/คู่/สาม) และวิเคราะห์โมเลกุล
// ไม่พึ่งพา three.js (pos เป็นออบเจ็กต์ที่มี x,y,z อะไรก็ได้)
import { findMolecule, hillFormula, prettyFormula, chargeSuffix } from './molecules.js';
import { valencesFor, isMetal } from './elements.js';

let nextId = 1;

export class Atom {
  constructor(el, pos) {
    this.id = nextId++;
    this.el = el;
    this.pos = pos;
    this.bonds = [];
    this.kinematic = false; // ถูกจับ/ถูกตรึงอยู่ ฟิสิกส์จะไม่ขยับ
    this.removed = false;
    this.lpDirs = []; // ทิศของอิเล็กตรอนคู่โดดเดี่ยว (ใช้ในฟิสิกส์ VSEPR)
    this.charge = 0; // ประจุฟอร์มอลที่ระบบคำนวณให้
    this.userCharge = 0; // ประจุที่ผู้ใช้เติม/ดึงอิเล็กตรอน (ผลรวมทั้งโมเลกุล = ประจุสุทธิ)
  }
  get valences() { return valencesFor(this.el, this.charge); }
  get neighbors() { return this.bonds.map((b) => b.other(this)); }
  get bondOrderSum() { return this.bonds.reduce((s, b) => s + b.order, 0); }
  bondTo(other) { return this.bonds.find((b) => b.other(this) === other) || null; }
  hasFreeSlot() { return this.bonds.length < this.el.maxNeighbors; }
  /** ค่าเวเลนซ์เป้าหมายที่ใกล้ที่สุด (ค่าที่อนุญาตที่น้อยที่สุดซึ่ง >= จำนวนพันธะปัจจุบัน) */
  targetValence(min = this.bondOrderSum) {
    const vs = this.valences;
    if (!vs.length) return 0;
    const v = vs.find((x) => x >= min);
    return v === undefined ? Math.max(...vs) : v;
  }
  isSatisfied() { return this.valences.includes(this.bondOrderSum); }
  missingBonds() { return Math.max(0, this.targetValence() - this.bondOrderSum); }
  /** ความคลาดเคลื่อนจากเวเลนซ์ที่อนุญาต (0 = ครบพอดี) */
  valenceError() {
    const vs = this.valences;
    if (!vs.length) return 3;
    const s = this.bondOrderSum;
    return Math.min(...vs.map((v) => Math.abs(v - s)));
  }
  lonePairs() {
    const ve = this.el.valenceElectrons;
    if (ve == null) return 0;
    return Math.max(0, Math.floor((ve - this.charge - this.bondOrderSum) / 2));
  }
}

export class Bond {
  constructor(a, b) {
    this.a = a;
    this.b = b;
    this.order = 1;
  }
  other(x) { return x === this.a ? this.b : this.a; }
}

/**
 * จัดอันดับพันธะในโมเลกุลให้เวเลนซ์ครบมากที่สุด
 * ขั้นที่ 1: เพิ่มอันดับพันธะระหว่างอะตอมที่ยังขาดทั้งสองฝั่ง (เลือกคู่ที่มีทางเลือกน้อยที่สุดก่อน)
 * ขั้นที่ 2: ให้อะตอมที่ขยายเวเลนซ์ได้ (เช่น S, P, N) รับพันธะเพิ่มเพื่ออะตอมข้างเคียงที่ยังขาด
 */
export function assignBondOrders(atoms, bonds) {
  for (const b of bonds) b.order = 1;
  const target = new Map(atoms.map((a) => [a, a.targetValence(a.bonds.length)]));
  const deficient = (a) => a.bondOrderSum < target.get(a);
  const options = (a) => a.bonds.filter((b) => b.order < 3 && deficient(b.other(a))).length;

  for (let guard = 0; guard < bonds.length * 3 + 5; guard++) {
    let best = null;
    let bestScore = Infinity;
    for (const b of bonds) {
      if (b.order >= 3 || !deficient(b.a) || !deficient(b.b)) continue;
      const score = Math.min(options(b.a), options(b.b));
      if (score < bestScore) { bestScore = score; best = b; }
    }
    if (!best) {
      // ขั้นที่ 2: ขยายเวเลนซ์
      for (const b of bonds) {
        if (b.order >= 3) continue;
        for (const [needy, giver] of [[b.a, b.b], [b.b, b.a]]) {
          if (!deficient(needy) || deficient(giver)) continue;
          const sum = giver.bondOrderSum;
          if (giver.valences.some((v) => v > sum)) { best = b; break; }
        }
        if (best) break;
      }
      if (!best) break;
      best.order++;
      for (const x of [best.a, best.b]) target.set(x, Math.max(target.get(x), x.targetValence()));
      continue;
    }
    best.order++;
  }
}

function chargeOptions(a) {
  if (a.el.symbol === 'H' || isMetal(a.el) || a.el.valenceElectrons == null) return [0];
  return [-1, 0, 1];
}

/**
 * หาประจุฟอร์มอลของแต่ละอะตอมให้โมเลกุลครบเวเลนซ์ โดยประจุรวม = Q
 * ลองแบบไม่มีประจุก่อน แล้วค้นหาแบบ local search ทีละขั้น (เปลี่ยนประจุ 1 อะตอม หรือย้ายประจุระหว่าง 2 อะตอม)
 * ให้คะแนนต่ำสุด: เวเลนซ์ไม่ครบ > ประจุรวมไม่ตรง > จำนวนประจุ > ประจุลบควรอยู่บนอะตอมที่ EN สูง
 */
export function solveCharges(atoms, bonds, Q) {
  if (atoms.length === 1) {
    atoms[0].charge = Q;
    assignBondOrders(atoms, bonds);
    return;
  }
  for (const a of atoms) a.charge = 0;
  const evaluate = () => {
    assignBondOrders(atoms, bonds);
    let err = 0; let sum = 0; let abs = 0; let en = 0;
    for (const a of atoms) {
      err += a.valenceError();
      sum += a.charge;
      abs += Math.abs(a.charge);
      const e = a.el.en ?? 2;
      if (a.charge < 0) en += 4 - e;
      else if (a.charge > 0) en += e;
    }
    return { score: err * 10 + Math.abs(sum - Q) * 25 + abs + en * 0.05, done: err === 0 && sum === Q, valid: sum === Q };
  };
  let best = evaluate();
  if (best.done && best.score === 0) return;
  // เก็บสถานะที่ดีที่สุดซึ่งประจุรวมตรงกับ Q (ใช้เป็นคำตอบสุดท้าย)
  let valid = best.valid ? { score: best.score, charges: atoms.map((a) => a.charge) } : null;
  let evals = 0;
  for (let step = 0; step < 10 && !best.done; step++) {
    const cand = new Set();
    for (const a of atoms) {
      if (a.valenceError() > 0) { cand.add(a); a.neighbors.forEach((n) => cand.add(n)); }
    }
    let sum = 0;
    for (const a of atoms) sum += a.charge;
    if (sum !== Q) atoms.forEach((a) => cand.add(a));
    const list = [...cand].filter((a) => chargeOptions(a).length > 1).slice(0, 14);
    const moves = [];
    for (const a of list) for (const d of [-1, 1]) moves.push([[a, d]]);
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) if (i !== j) moves.push([[list[i], 1], [list[j], -1]]);
    }
    let bestMove = null;
    let bestRes = best;
    for (const m of moves) {
      if (!m.every(([a, d]) => chargeOptions(a).includes(a.charge + d))) continue;
      for (const [a, d] of m) a.charge += d;
      const r = evaluate();
      for (const [a, d] of m) a.charge -= d;
      if (r.score < bestRes.score - 1e-9) { bestRes = r; bestMove = m; }
      if (++evals > 3000) break;
    }
    if (!bestMove) break;
    for (const [a, d] of bestMove) a.charge += d;
    best = bestRes;
    if (best.valid && (!valid || best.score < valid.score)) valid = { score: best.score, charges: atoms.map((a) => a.charge) };
  }
  atoms.forEach((a, i) => { a.charge = valid ? valid.charges[i] : 0; });
  evaluate();
}

/** ประจุสุทธิที่จะทำให้โมเลกุลครบ (ใช้เป็นคำใบ้) — ไม่เปลี่ยนสถานะจริง */
export function suggestCharge(comp) {
  if (comp.atoms.length > 14) return null;
  const charges = comp.atoms.map((a) => a.charge);
  const orders = comp.bonds.map((b) => b.order);
  const current = comp.atoms.reduce((s, a) => s + a.userCharge, 0);
  let found = null;
  for (const q of [1, -1, 2, -2, 3, -3]) {
    if (q === current) continue;
    solveCharges(comp.atoms, comp.bonds, q);
    if (comp.atoms.every((a) => a.isSatisfied())) { found = q; break; }
  }
  comp.atoms.forEach((a, i) => { a.charge = charges[i]; });
  comp.bonds.forEach((b, i) => { b.order = orders[i]; });
  return found;
}

export class ChemSystem {
  constructor() {
    this.atoms = [];
    this.bonds = [];
    this.version = 0; // เพิ่มทุกครั้งที่โครงสร้างเปลี่ยน
  }

  addAtom(el, pos) {
    const atom = new Atom(el, pos);
    this.atoms.push(atom);
    this.version++;
    return atom;
  }

  removeAtom(atom) {
    const neighbors = atom.neighbors;
    for (const b of [...atom.bonds]) this._unlink(b);
    this.atoms = this.atoms.filter((a) => a !== atom);
    atom.removed = true;
    for (const n of neighbors) this._reassign(n);
    this.version++;
  }

  clear() {
    for (const a of this.atoms) a.removed = true;
    this.atoms = [];
    this.bonds = [];
    this.version++;
  }

  canBond(a, b) {
    return a !== b && !a.bondTo(b) && a.hasFreeSlot() && b.hasFreeSlot();
  }

  addBond(a, b) {
    if (!this.canBond(a, b)) return null;
    const bond = new Bond(a, b);
    a.bonds.push(bond);
    b.bonds.push(bond);
    this.bonds.push(bond);
    this._reassign(a);
    this.version++;
    return bond;
  }

  removeBond(bond) {
    this._unlink(bond);
    this._reassign(bond.a);
    this._reassign(bond.b);
    this.version++;
  }

  /** ตัดพันธะทั้งหมดของอะตอม */
  detach(atom) {
    if (!atom.bonds.length) return false;
    const neighbors = atom.neighbors;
    for (const b of [...atom.bonds]) this._unlink(b);
    for (const n of neighbors) this._reassign(n);
    this.version++;
    return true;
  }

  _unlink(bond) {
    bond.a.bonds = bond.a.bonds.filter((x) => x !== bond);
    bond.b.bonds = bond.b.bonds.filter((x) => x !== bond);
    this.bonds = this.bonds.filter((x) => x !== bond);
  }

  /** เติมอิเล็กตรอน (delta = -1) หรือดึงอิเล็กตรอนออก (delta = +1) */
  addCharge(atom, delta) {
    const next = Math.max(-3, Math.min(3, atom.userCharge + delta));
    if (next === atom.userCharge) return false;
    atom.userCharge = next;
    this._reassign(atom);
    this.version++;
    return true;
  }

  _reassign(atom) {
    const comp = this.componentOf(atom);
    const q = comp.atoms.reduce((s, a) => s + a.userCharge, 0);
    solveCharges(comp.atoms, comp.bonds, q);
  }

  componentOf(atom) {
    const seen = new Set([atom]);
    const stack = [atom];
    const bonds = new Set();
    while (stack.length) {
      const a = stack.pop();
      for (const b of a.bonds) {
        bonds.add(b);
        const o = b.other(a);
        if (!seen.has(o)) { seen.add(o); stack.push(o); }
      }
    }
    return { atoms: [...seen], bonds: [...bonds] };
  }

  components() {
    const seen = new Set();
    const out = [];
    for (const a of this.atoms) {
      if (seen.has(a)) continue;
      const c = this.componentOf(a);
      c.atoms.forEach((x) => seen.add(x));
      out.push(c);
    }
    return out;
  }
}

// ---------- การวิเคราะห์โมเลกุล ----------

const SHAPES = {
  '2,0': { th: 'เส้นตรง', en: 'Linear', angle: '180°' },
  '2,1': { th: 'มุมงอ', en: 'Bent', angle: '~119°' },
  '2,2': { th: 'มุมงอ', en: 'Bent', angle: '~104.5°' },
  '2,3': { th: 'เส้นตรง', en: 'Linear', angle: '180°' },
  '3,0': { th: 'สามเหลี่ยมแบนราบ', en: 'Trigonal planar', angle: '120°' },
  '3,1': { th: 'พีระมิดฐานสามเหลี่ยม', en: 'Trigonal pyramidal', angle: '~107°' },
  '3,2': { th: 'รูปตัวที', en: 'T-shaped', angle: '~90°' },
  '4,0': { th: 'ทรงสี่หน้า', en: 'Tetrahedral', angle: '109.5°' },
  '4,1': { th: 'ไม้กระดก', en: 'Seesaw', angle: '~90°, ~120°' },
  '4,2': { th: 'สี่เหลี่ยมแบนราบ', en: 'Square planar', angle: '90°' },
  '5,0': { th: 'พีระมิดคู่ฐานสามเหลี่ยม', en: 'Trigonal bipyramidal', angle: '90°, 120°' },
  '5,1': { th: 'พีระมิดฐานสี่เหลี่ยม', en: 'Square pyramidal', angle: '~90°' },
  '6,0': { th: 'ทรงแปดหน้า', en: 'Octahedral', angle: '90°' },
};

export function shapeOf(atom) {
  const n = atom.bonds.length;
  if (n < 2) return null;
  const key = `${n},${Math.min(atom.lonePairs(), 3)}`;
  return SHAPES[key] || null;
}

export function analyze(comp) {
  const counts = {};
  let mass = 0;
  let charge = 0;
  for (const a of comp.atoms) {
    counts[a.el.symbol] = (counts[a.el.symbol] || 0) + 1;
    mass += a.el.mass;
    charge += a.userCharge;
  }
  const hill = hillFormula(counts);
  const complete = comp.atoms.every((a) => a.isSatisfied());
  const missing = comp.atoms.reduce((s, a) => s + a.missingBonds(), 0);
  const single = comp.atoms.length === 1 ? comp.atoms[0] : null;
  const entry = !single || charge ? findMolecule(hill, comp, complete, charge) : null;
  const bondCounts = [0, 0, 0];
  let maxDEN = 0;
  for (const b of comp.bonds) {
    bondCounts[b.order - 1]++;
    if (b.a.el.en != null && b.b.el.en != null) maxDEN = Math.max(maxDEN, Math.abs(b.a.el.en - b.b.el.en));
  }
  let central = null;
  for (const a of comp.atoms) if (a.bonds.length >= 2 && (!central || a.bonds.length > central.bonds.length)) central = a;
  const ionic = comp.bonds.some((b) => bondTypeOf(b) === 'ionic');
  const formula = entry ? entry.f : hill;
  return {
    counts, hill, mass, complete, missing, entry, bondCounts, maxDEN, charge,
    formula,
    pretty: prettyFormula(formula) + chargeSuffix(charge),
    central,
    shape: central ? shapeOf(central) : null,
    ionic,
    ions: ionic ? ionBreakdown(comp) : null,
    formal: comp.atoms.filter((a) => a.charge !== 0 && !single),
    radical: !!entry?.radical,
    single,
  };
}

/** แยกสารประกอบไอออนิกออกเป็นไอออน เช่น CaCO₃ → Ca²⁺ + CO₃²⁻ */
export function ionBreakdown(comp) {
  const ionicBonds = new Set(comp.bonds.filter((b) => bondTypeOf(b) === 'ionic'));
  const seen = new Set();
  const groups = new Map();
  for (const start of comp.atoms) {
    if (seen.has(start)) continue;
    const frag = [];
    const stack = [start];
    seen.add(start);
    let q = 0;
    while (stack.length) {
      const a = stack.pop();
      frag.push(a);
      q += a.charge;
      for (const b of a.bonds) {
        const o = b.other(a);
        if (ionicBonds.has(b)) {
          // อะตอมที่ EN ต่ำกว่าเสียอิเล็กตรอน (เป็นไอออนบวก)
          q += (a.el.en ?? 0) < (o.el.en ?? 0) ? b.order : -b.order;
          continue;
        }
        if (!seen.has(o)) { seen.add(o); stack.push(o); }
      }
    }
    const counts = {};
    frag.forEach((a) => { counts[a.el.symbol] = (counts[a.el.symbol] || 0) + 1; });
    const name = prettyFormula(hillFormula(counts)) + chargeSuffix(q);
    groups.set(name, (groups.get(name) || 0) + 1);
  }
  return [...groups].sort((x, y) => (x[0].includes('⁺') ? -1 : 1) - (y[0].includes('⁺') ? -1 : 1))
    .map(([name, n]) => (n > 1 ? `${n} ${name}` : name)).join(' + ');
}

/**
 * รวมไอออนที่อยู่ใกล้กันเป็นสารประกอบไอออนิก (เช่น NH₄⁺ วางชิด Cl⁻ → NH₄Cl)
 * entries: [{ comp, info }] — คืนค่ากลุ่มที่ประจุรวมเป็นศูนย์
 */
export function ionClusters(entries, maxGap = 0.12) {
  const ions = entries.filter((e) => e.info.charge !== 0 && e.info.complete);
  if (ions.length < 2) return [];
  const centers = ions.map((e) => {
    const c = { x: 0, y: 0, z: 0 };
    e.comp.atoms.forEach((a) => { c.x += a.pos.x; c.y += a.pos.y; c.z += a.pos.z; });
    const n = e.comp.atoms.length;
    return { x: c.x / n, y: c.y / n, z: c.z / n };
  });
  const parent = ions.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < ions.length; i++) {
    for (let j = i + 1; j < ions.length; j++) {
      // ระยะใกล้สุดระหว่างอะตอมของสองไอออน
      let d = Infinity;
      for (const a of ions[i].comp.atoms) for (const b of ions[j].comp.atoms) d = Math.min(d, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z));
      if (d < maxGap) parent[find(i)] = find(j);
    }
  }
  const groups = new Map();
  ions.forEach((e, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push({ ...e, center: centers[i] });
  });
  const out = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    if (members.reduce((s, m) => s + m.info.charge, 0) !== 0) continue;
    const counts = {};
    const atoms = [];
    const bonds = [];
    for (const m of members) {
      m.comp.atoms.forEach((a) => { counts[a.el.symbol] = (counts[a.el.symbol] || 0) + 1; atoms.push(a); });
      bonds.push(...m.comp.bonds);
    }
    const hill = hillFormula(counts);
    const entry = findMolecule(hill, { atoms, bonds }, true, 0);
    const tally = new Map();
    members.forEach((m) => tally.set(m.info.pretty, (tally.get(m.info.pretty) || 0) + 1));
    const ions = [...tally].sort((x, y) => (x[0].includes('⁺') ? -1 : 1) - (y[0].includes('⁺') ? -1 : 1))
      .map(([name, n]) => (n > 1 ? `${n} ${name}` : name)).join(' + ');
    out.push({
      key: members.map((m) => m.key).sort().join('/'),
      members, hill, entry, ions,
      pretty: prettyFormula(entry ? entry.f : hill),
    });
  }
  return out;
}

/** โมเมนต์ขั้วคู่โดยประมาณจากตำแหน่งจริง (ผลรวมเวกเตอร์ ΔEN ตามแนวพันธะ) */
export function dipoleMagnitude(comp) {
  let x = 0; let y = 0; let z = 0;
  for (const b of comp.bonds) {
    const ea = b.a.el.en; const eb = b.b.el.en;
    if (ea == null || eb == null) continue;
    const dx = b.b.pos.x - b.a.pos.x; const dy = b.b.pos.y - b.a.pos.y; const dz = b.b.pos.z - b.a.pos.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const d = (eb - ea) / len; // ชี้ไปทางอะตอมที่ดึงอิเล็กตรอนมากกว่า
    x += dx * d; y += dy * d; z += dz * d;
  }
  return Math.hypot(x, y, z);
}

export function bondTypeOf(bond) {
  const ea = bond.a.el.en; const eb = bond.b.el.en;
  // โลหะ + อโลหะ → พันธะไอออนิก (ตามหลักสูตร ยกเว้น Be ซึ่งเกิดพันธะโคเวเลนต์)
  const ma = isMetal(bond.a.el); const mb = isMetal(bond.b.el);
  if (ma !== mb && bond.a.el.symbol !== 'Be' && bond.b.el.symbol !== 'Be') return 'ionic';
  if (ea == null || eb == null) return 'unknown';
  const d = Math.abs(ea - eb);
  if (d >= 1.7) return 'ionic';
  if (d >= 0.4) return 'polar';
  return 'nonpolar';
}
