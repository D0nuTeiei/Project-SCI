// แบบจำลองกราฟอะตอม–พันธะ: ตรวจเวเลนซ์ จัดอันดับพันธะ (เดี่ยว/คู่/สาม) และวิเคราะห์โมเลกุล
// ไม่พึ่งพา three.js (pos เป็นออบเจ็กต์ที่มี x,y,z อะไรก็ได้)
import { findMolecule, hillFormula, prettyFormula } from './molecules.js';

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
  }
  get neighbors() { return this.bonds.map((b) => b.other(this)); }
  get bondOrderSum() { return this.bonds.reduce((s, b) => s + b.order, 0); }
  bondTo(other) { return this.bonds.find((b) => b.other(this) === other) || null; }
  hasFreeSlot() { return this.bonds.length < this.el.maxNeighbors; }
  /** ค่าเวเลนซ์เป้าหมายที่ใกล้ที่สุด (ค่าที่อนุญาตที่น้อยที่สุดซึ่ง >= จำนวนพันธะปัจจุบัน) */
  targetValence(min = this.bondOrderSum) {
    const v = this.el.valences.find((x) => x >= min);
    return v === undefined ? Math.max(...this.el.valences) : v;
  }
  isSatisfied() { return this.el.valences.includes(this.bondOrderSum); }
  missingBonds() { return Math.max(0, this.targetValence() - this.bondOrderSum); }
  lonePairs() {
    const ve = this.el.valenceElectrons;
    if (ve == null) return 0;
    return Math.max(0, Math.floor((ve - this.bondOrderSum) / 2));
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
          if (giver.el.valences.some((v) => v > sum)) { best = b; break; }
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

  _reassign(atom) {
    const comp = this.componentOf(atom);
    assignBondOrders(comp.atoms, comp.bonds);
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
  for (const a of comp.atoms) {
    counts[a.el.symbol] = (counts[a.el.symbol] || 0) + 1;
    mass += a.el.mass;
  }
  const hill = hillFormula(counts);
  const complete = comp.atoms.every((a) => a.isSatisfied());
  const missing = comp.atoms.reduce((s, a) => s + a.missingBonds(), 0);
  const entry = comp.atoms.length > 1 ? findMolecule(hill, comp, complete) : null;
  const bondCounts = [0, 0, 0];
  let maxDEN = 0;
  for (const b of comp.bonds) {
    bondCounts[b.order - 1]++;
    if (b.a.el.en != null && b.b.el.en != null) maxDEN = Math.max(maxDEN, Math.abs(b.a.el.en - b.b.el.en));
  }
  let central = null;
  for (const a of comp.atoms) if (a.bonds.length >= 2 && (!central || a.bonds.length > central.bonds.length)) central = a;
  return {
    counts, hill, mass, complete, missing, entry, bondCounts, maxDEN,
    formula: entry ? entry.f : hill,
    pretty: prettyFormula(entry ? entry.f : hill),
    central,
    shape: central ? shapeOf(central) : null,
    ionic: maxDEN >= 1.7,
    single: comp.atoms.length === 1 ? comp.atoms[0] : null,
  };
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
  if (ea == null || eb == null) return 'unknown';
  const d = Math.abs(ea - eb);
  if (d >= 1.7) return 'ionic';
  if (d >= 0.4) return 'polar';
  return 'nonpolar';
}
