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
    this.partialCharge = 0; // ประจุหลังเฉลี่ยเรโซแนนซ์ (เช่น −⅔ ใน CO₃²⁻)
    this.displayCharge = 0; // ประจุที่แสดงบนอะตอม (รวมประจุไอออนในสารประกอบไอออนิก)
    this.userCharge = 0; // ประจุที่ผู้ใช้เติม/ดึงอิเล็กตรอน (ผลรวมทั้งโมเลกุล = ประจุสุทธิ)
    this.octetMode = false; // แสดงแบบแยกประจุตามกฎออกเตต (แทนเวเลนซ์ขยาย) เช่น S²⁺ กับ O⁻ 4 ตัวในซัลเฟต
    this.coord = null; // ไอออนโลหะกลางของสารเชิงซ้อน: { ox, oxOk, cnOk, virtualLP }
    this.bridgeH = false; // H สะพานในพันธะ 3 ศูนย์กลาง 2 อิเล็กตรอน (B–H–B)
  }
  get valences() {
    // ไอออนโลหะกลาง: พันธะโคออร์ดิเนตไม่นับเป็นเวเลนซ์ ครบเมื่อเลขออกซิเดชันและเลขโคออร์ดิเนชันสมเหตุสมผล
    if (this.coord) return this.coord.oxOk && this.coord.cnOk ? [0] : [];
    return valencesFor(this.el, this.charge, this.octetMode);
  }
  get neighbors() { return this.bonds.map((b) => b.other(this)); }
  get bondOrderSum() { return this.bonds.reduce((s, b) => s + b.valenceOrder, 0); }
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
  missingBonds() { return Math.ceil(Math.max(0, this.targetValence() - this.bondOrderSum)); }
  /** ความคลาดเคลื่อนจากเวเลนซ์ที่อนุญาต (0 = ครบพอดี) */
  valenceError() {
    const vs = this.valences;
    if (!vs.length) return 3;
    const s = this.bondOrderSum;
    return Math.min(...vs.map((v) => Math.abs(v - s)));
  }
  lonePairs() {
    // สี่เหลี่ยมแบนราบของไอออนโลหะ d⁸/d⁹: ใช้ "คู่โดดเดี่ยวเสมือน" 2 คู่บน–ล่าง ให้ฟิสิกส์จัดรูปแบบ AX₄E₂
    if (this.coord) return this.coord.virtualLP;
    const ve = this.el.valenceElectrons;
    if (ve == null) return 0;
    // คู่อิเล็กตรอนที่ให้ไปในพันธะโคออร์ดิเนตไม่ใช่คู่โดดเดี่ยวแล้ว
    const donated = this.bonds.filter((b) => b.coord && b.donor === this).length;
    return Math.max(0, Math.floor((ve - this.charge - this.bondOrderSum) / 2) - donated);
  }
}

export class Bond {
  constructor(a, b) {
    this.a = a;
    this.b = b;
    this.order = 1;
    this.resonance = null; // อันดับพันธะเฉลี่ยจากเรโซแนนซ์ (เช่น 1.5) หรือ null
    this.coord = false; // พันธะโคออร์ดิเนต: ลิแกนด์ (donor) ให้คู่อิเล็กตรอนแก่ไอออนโลหะ
    this.donor = null;
    this.bridge = false; // ครึ่งหนึ่งของพันธะ 3 ศูนย์กลาง 2 อิเล็กตรอน B–H–B
  }
  other(x) { return x === this.a ? this.b : this.a; }
  get effectiveOrder() { return this.resonance ?? this.order; }
  /** ส่วนที่นับเป็นเวเลนซ์: พันธะโคออร์ดิเนตไม่นับ, พันธะสะพาน B–H–B นับครึ่ง (อิเล็กตรอน 2 ตัวใช้ร่วมกัน 3 อะตอม) */
  get valenceOrder() { return this.coord ? 0 : this.bridge ? 0.5 : this.order; }
}

/**
 * จัดอันดับพันธะในโมเลกุลให้เวเลนซ์ครบมากที่สุด
 * ขั้นที่ 1: เพิ่มอันดับพันธะระหว่างอะตอมที่ยังขาดทั้งสองฝั่ง (เลือกคู่ที่มีทางเลือกน้อยที่สุดก่อน)
 * ขั้นที่ 2: ให้อะตอมที่ขยายเวเลนซ์ได้ (เช่น S, P, N) รับพันธะเพิ่มเพื่ออะตอมข้างเคียงที่ยังขาด
 */
export function assignBondOrders(atoms, allBonds) {
  const bonds = allBonds.filter((b) => !b.coord && !b.bridge);
  for (const b of allBonds) b.order = 1;
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
  if (a.el.symbol === 'H' || a.el.valenceElectrons == null) return [0];
  // โลหะหมู่ 13 (Al, Ga) รับพันธะโคออร์ดิเนตได้ เช่น Al₂Cl₆, AlCl₄⁻
  if (isMetal(a.el)) return a.el.group === 13 ? [-1, 0] : [0];
  // แบบแยกประจุ (กฎออกเตต): อะตอมกลางคาบ 3 ขึ้นไปมีประจุบวกสูงได้ เช่น S²⁺ ในซัลเฟต, Cl³⁺ ในเปอร์คลอเรต
  if (a.octetMode && a.el.period >= 3) return [-1, 0, 1, 2, 3];
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
  for (let step = 0; step < 14 && !best.done; step++) {
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
  const current = comp.atoms.reduce((s, a) => s + a.userCharge, 0);
  const metal = comp.atoms.find((a) => a.coord);
  // สารเชิงซ้อน: ประจุรวม = เลขออกซิเดชันที่พบบ่อยของโลหะ + ประจุของลิแกนด์
  const tries = metal
    ? oxStates(metal.el).map((ox) => ox + metal.coord.ligandCharge)
    : comp.atoms.length > 14 ? [] : [1, -1, 2, -2, 3, -3];
  let found = null;
  for (const q of tries) {
    if (q === current) continue;
    solveComponent(comp, q);
    if (comp.atoms.every((a) => a.isSatisfied())) { found = q; break; }
  }
  if (tries.length) solveComponent(comp, current);
  return found;
}

// ---------- สารประกอบเชิงซ้อนของโลหะทรานซิชัน และพันธะ 3 ศูนย์กลาง ----------

// เลขออกซิเดชันที่พบในสารเชิงซ้อน (เรียงจากที่พบบ่อยที่สุด) และเลขโคออร์ดิเนชันที่พบบ่อย
const OX_STATES = {
  Sc: [3], Ti: [4, 3], V: [3, 4, 5, 2], Cr: [3, 0, 2, 6], Mn: [2, 3, 4, 7, 0], Fe: [3, 2, 0], Co: [3, 2, 0],
  Ni: [2, 0], Cu: [2, 1], Zn: [2], Y: [3], Zr: [4], Mo: [0, 3, 6], Ru: [2, 3], Rh: [3, 1], Pd: [2, 0, 4],
  Ag: [1], Cd: [2], W: [0, 6], Re: [1, 7], Os: [2, 3, 8], Ir: [3, 1], Pt: [2, 4, 0], Au: [3, 1], Hg: [2],
};
const CN_TYPICAL = { Ag: [2], Au: [4, 2], Hg: [2, 4], Cu: [4, 6, 2], Zn: [4, 6], Cd: [4, 6], Ni: [4, 6], Pd: [4], Pt: [4, 6], Fe: [6, 5, 4], Co: [6, 4] };
export function oxStates(el) { return OX_STATES[el.symbol] || el.valences; }
export function typicalCN(el) { return CN_TYPICAL[el.symbol] || [6, 4]; }
const HALIDE = new Set(['F', 'Cl', 'Br', 'I']);
const BRIDGE_EL = new Set(['B', 'Al', 'Ga']);
export const BRIDGE_ANGLE = 83; // มุม B–H–B ของไดโบเรน (CCCBDB)

/** H ที่ต่อกับ B แล้วต่อกับ B อีกอะตอมได้ (เกิด H สะพาน) */
export function canBridge(h, x) {
  return h.el.symbol === 'H' && h.bonds.length === 1 && BRIDGE_EL.has(x.el.symbol) && BRIDGE_EL.has(h.neighbors[0].el.symbol);
}

/** ส่วนย่อยที่ต่อกับ M (ไม่ผ่าน M) = ลิแกนด์หนึ่งตัว */
function ligandFragments(M) {
  const frags = [];
  const owner = new Map();
  for (const b of M.bonds) {
    const start = b.other(M);
    if (owner.has(start)) { owner.get(start).donors.push(start); continue; }
    const atoms = [];
    const bonds = new Set();
    const stack = [start];
    const frag = { atoms, bonds: [], donors: [start], q: 0, ok: false };
    owner.set(start, frag);
    atoms.push(start);
    while (stack.length) {
      const a = stack.pop();
      for (const bb of a.bonds) {
        const o = bb.other(a);
        if (o === M) continue;
        bonds.add(bb);
        if (!owner.has(o)) { owner.set(o, frag); atoms.push(o); stack.push(o); }
      }
    }
    frag.bonds = [...bonds];
    frags.push(frag);
  }
  return frags;
}

/**
 * สารเชิงซ้อน: ไอออนโลหะทรานซิชันหนึ่งอะตอม + ลิแกนด์ที่ให้คู่อิเล็กตรอน (NH₃, H₂O, CN⁻, Cl⁻, CO)
 * หาประจุของลิแกนด์แต่ละตัวแยกกัน แล้วเลขออกซิเดชันของโลหะ = ประจุรวม − ประจุลิแกนด์
 * คืนค่า false ถ้าไม่ใช่สารเชิงซ้อน (เช่น TiCl₄, MnO₄⁻ ใช้แบบจำลองพันธะปกติ)
 */
function solveComplex(comp, Q) {
  const metals = comp.atoms.filter((a) => a.el.category === 'transition' && a.bonds.length);
  if (metals.length !== 1) return false;
  const M = metals[0];
  if (M.neighbors.some((n) => isMetal(n.el))) return false;
  const frags = ligandFragments(M);
  if (frags.some((f) => f.atoms.some((a) => isMetal(a.el)))) return false;
  for (const b of M.bonds) { b.coord = true; b.donor = b.other(M); b.order = 1; }
  M.charge = 0;
  for (const f of frags) {
    const donated = (a) => f.donors.filter((d) => d === a).length;
    const good = () => f.atoms.every((a) => a.isSatisfied())
      && f.donors.every((d) => d.el.valenceElectrons != null && d.el.valenceElectrons - d.charge - d.bondOrderSum >= 2 * donated(d));
    for (const q of [0, -1, -2, 1, -3]) {
      solveCharges(f.atoms, f.bonds, q);
      if (good()) { f.q = q; f.ok = true; break; }
    }
    if (!f.ok) { solveCharges(f.atoms, f.bonds, 0); f.q = 0; }
  }
  const neutralLigand = frags.some((f) => f.ok && f.q === 0);
  if (!neutralLigand && M.bonds.length <= Math.max(...M.el.valences)) {
    for (const b of M.bonds) { b.coord = false; b.donor = null; }
    return false;
  }
  const ligandCharge = frags.reduce((s, f) => s + f.q, 0);
  const ox = Q - ligandCharge;
  const cn = M.bonds.length;
  const d = M.el.group - ox; // จำนวนอิเล็กตรอน d (หมู่ 3–12)
  // รูปร่างของ CN 4: d⁸ ของคาบ 5–6 (Pd²⁺, Pt²⁺, Au³⁺) หรือ d⁸ ที่ลิแกนด์สนามแรง (CN⁻, CO) และ Cu²⁺ (d⁹) ที่ไม่ใช่ฮาไลด์ → สี่เหลี่ยมแบนราบ
  const donors = M.neighbors;
  const strong = donors.every((x) => x.el.symbol === 'C');
  const halide = donors.some((x) => HALIDE.has(x.el.symbol));
  const square = cn === 4 && ((d === 8 && (M.el.period >= 5 || strong)) || (d === 9 && !halide));
  M.charge = ox;
  M.coord = {
    ox, cn, d, ligandCharge,
    oxOk: oxStates(M.el).includes(ox),
    cnOk: typicalCN(M.el).includes(cn) || cn === 4 || cn === 6,
    virtualLP: square ? 2 : 0,
    geometry: cn === 2 ? 'linear' : cn === 4 ? (square ? 'square' : 'tetra') : cn === 5 ? 'tbp' : cn === 6 ? 'octa' : null,
    ligands: frags,
  };
  return true;
}

/** H สะพาน: H ที่ต่อกับ B (หรือ Al, Ga) สองอะตอม → พันธะ 3 ศูนย์กลาง 2 อิเล็กตรอน */
function markBridges(comp) {
  for (const h of comp.atoms) {
    if (h.el.symbol !== 'H' || h.bonds.length !== 2) continue;
    if (!h.neighbors.every((x) => BRIDGE_EL.has(x.el.symbol))) continue;
    h.bridgeH = true;
    h.bonds.forEach((b) => { b.bridge = true; });
  }
}

/** จัดพันธะและประจุของหนึ่งโมเลกุล (รวมกรณีพิเศษ: สารเชิงซ้อน, พันธะสะพาน, แบบแยกประจุ) */
export function solveComponent(comp, Q) {
  for (const a of comp.atoms) { a.coord = null; a.bridgeH = false; }
  for (const b of comp.bonds) { b.coord = false; b.donor = null; b.bridge = false; }
  markBridges(comp);
  if (solveComplex(comp, Q)) return;
  solveCharges(comp.atoms, comp.bonds, Q);
}

/** ลองดูว่าโมเลกุลนี้เขียนแบบแยกประจุตามกฎออกเตตได้ครบหรือไม่ (ไม่เปลี่ยนสถานะ) */
export function octetFeasible(comp) {
  const Q = comp.atoms.reduce((s, a) => s + a.userCharge, 0);
  const was = comp.atoms.map((a) => a.octetMode);
  comp.atoms.forEach((a) => { a.octetMode = true; });
  solveComponent(comp, Q);
  const ok = comp.atoms.every((a) => a.isSatisfied());
  comp.atoms.forEach((a, i) => { a.octetMode = was[i]; });
  solveComponent(comp, Q);
  detectResonance(comp.atoms, comp.bonds);
  assignDisplayCharges(comp.atoms);
  return ok;
}

/** อะตอมกลางที่มีอิเล็กตรอนรอบตัวเกิน 8 (เวเลนซ์ขยาย) เช่น S ใน SO₄²⁻, P ใน PCl₅ */
export function expandedOctetAtom(comp) {
  return comp.atoms.find((a) => a.el.period >= 3 && a.el.valenceElectrons != null && !isMetal(a.el)
    && 2 * (a.bondOrderSum + a.lonePairs()) > 8) || null;
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
    if (a === b || a.bondTo(b)) return false;
    // H สะพาน (B–H–B) เป็นกรณีเดียวที่ H ต่อได้ 2 อะตอม
    return (a.hasFreeSlot() || canBridge(a, b)) && (b.hasFreeSlot() || canBridge(b, a));
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
    const next = Math.max(-4, Math.min(4, atom.userCharge + delta));
    if (next === atom.userCharge) return false;
    atom.userCharge = next;
    this._reassign(atom);
    this.version++;
    return true;
  }

  /** สลับแบบแยกประจุ (กฎออกเตต) ↔ แบบเวเลนซ์ขยายของโมเลกุลที่มีอะตอมนี้ */
  setOctetMode(atom, on) {
    this.componentOf(atom).atoms.forEach((a) => { a.octetMode = on; });
    this._reassign(atom);
    this.version++;
  }

  _reassign(atom) {
    const comp = this.componentOf(atom);
    const q = comp.atoms.reduce((s, a) => s + a.userCharge, 0);
    solveComponent(comp, q);
    detectResonance(comp.atoms, comp.bonds);
    assignDisplayCharges(comp.atoms);
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
  let coordCount = 0; let bridgeCount = 0;
  let maxDEN = 0;
  for (const b of comp.bonds) {
    if (b.coord) coordCount++;
    else if (b.bridge) bridgeCount++;
    else bondCounts[b.order - 1]++;
    if (b.a.el.en != null && b.b.el.en != null) maxDEN = Math.max(maxDEN, Math.abs(b.a.el.en - b.b.el.en));
  }
  let central = comp.atoms.find((a) => a.coord) || null;
  if (!central) for (const a of comp.atoms) if (a.bonds.length >= 2 && !a.bridgeH && (!central || a.bonds.length > central.bonds.length)) central = a;
  const ionic = comp.bonds.some((b) => bondTypeOf(b) === 'ionic');
  const formula = entry ? entry.f : hill;
  return {
    counts, hill, mass, complete, missing, entry, bondCounts, coordCount, bridgeCount, maxDEN, charge,
    complex: central?.coord ? complexInfo(central) : null,
    formula,
    pretty: prettyFormula(formula) + chargeSuffix(charge),
    central,
    shape: central ? shapeOf(central) : null,
    // รูปร่างจากการทดลองที่ต่างจาก VSEPR (เช่น CaF₂ แก๊สงอ)
    expShape: entry?.exp?.shapeEn ? { th: entry.exp.shapeTh, en: entry.exp.shapeEn } : null,
    ionic,
    ions: ionic ? ionBreakdown(comp) : null,
    ionGroups: ionic ? ionList(comp) : null,
    resonance: comp.bonds.filter((b) => b.resonance != null),
    formal: comp.atoms.filter((a) => a.charge !== 0 && !single),
    radical: !!entry?.radical,
    single,
    // สารที่เป็นโลหะล้วน (เช่น Na–Na) → ของจริงยึดกันด้วยพันธะโลหะในผลึก
    metalOnly: comp.atoms.every((a) => isMetal(a.el)),
    metalEl: comp.atoms[0].el,
  };
}

/** สรุปสารเชิงซ้อน: ไอออนกลาง เลขออกซิเดชัน ลิแกนด์ (จัดกลุ่มตามสูตร) และสิ่งที่ยังขาด */
function complexInfo(M) {
  const c = M.coord;
  const groups = new Map();
  for (const f of c.ligands) {
    const counts = {};
    f.atoms.forEach((a) => { counts[a.el.symbol] = (counts[a.el.symbol] || 0) + 1; });
    const hill = hillFormula(counts);
    const pretty = prettyFormula(LIGAND_FORMULA[hill] || hill) + chargeSuffix(f.q);
    const g = groups.get(pretty) || { pretty, n: 0, q: f.q, ok: f.ok, donor: f.donors[0].el.symbol, dentate: f.donors.length };
    g.n++;
    groups.set(pretty, g);
  }
  const want = typicalCN(M.el).find((n) => n >= c.cn);
  return {
    metal: M, ox: c.ox, cn: c.cn, d: c.d, geometry: c.geometry, oxOk: c.oxOk, cnOk: c.cnOk,
    ion: M.el.symbol + chargeSuffix(c.ox),
    ligands: [...groups.values()],
    needLigands: !c.cnOk && want ? want - c.cn : 0,
    ligandsOk: c.ligands.every((f) => f.ok),
  };
}
// เขียนสูตรลิแกนด์แบบที่ใช้ในตำรา (อะตอมที่ให้อิเล็กตรอนขึ้นก่อน)
const LIGAND_FORMULA = { H3N: 'NH3', H2O: 'H2O', CN: 'CN', CO: 'CO', HO: 'OH', C2H8N2: 'en', C2O4: 'C2O4', CNS: 'SCN' };

/** แยกสารประกอบไอออนิกออกเป็นไอออน — คืนค่า [{ hill, pretty, q, n, symbol }] (symbol = ไอออนอะตอมเดี่ยว) */
export function ionList(comp) {
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
    const hill = hillFormula(counts);
    const key = `${hill}|${q}`;
    if (!groups.has(key)) groups.set(key, { hill, q, n: 0, pretty: prettyFormula(hill) + chargeSuffix(q), symbol: frag.length === 1 ? frag[0].el.symbol : null });
    groups.get(key).n++;
  }
  return [...groups.values()].sort((x, y) => y.q - x.q);
}

export function formatIons(list) {
  return list.map((g) => (g.n > 1 ? `${g.n} ${g.pretty}` : g.pretty)).join(' + ');
}

export function ionBreakdown(comp) {
  return formatIons(ionList(comp));
}

/**
 * เรโซแนนซ์: (1) อะตอมปลายชนิดเดียวกันที่ต่อกับอะตอมกลางด้วยอันดับพันธะต่างกัน (CO₃²⁻, NO₃⁻, O₃, SO₄²⁻, COO⁻)
 * (2) วงหกเหลี่ยมที่พันธะเดี่ยวสลับพันธะคู่ (เบนซีน) — กำหนดอันดับพันธะเฉลี่ยและกระจายประจุฟอร์มอล
 */
export function detectResonance(atoms, bonds) {
  for (const b of bonds) b.resonance = null;
  for (const a of atoms) { a.partialCharge = a.charge; a.aromaticRing = null; }
  for (const c of atoms) {
    const groups = new Map();
    for (const b of c.bonds) {
      const t = b.other(c);
      if (t.bonds.length !== 1 || bondTypeOf(b) === 'ionic') continue;
      if (!groups.has(t.el.symbol)) groups.set(t.el.symbol, []);
      groups.get(t.el.symbol).push(b);
    }
    for (const g of groups.values()) {
      if (g.length < 2 || new Set(g.map((b) => b.order)).size < 2) continue;
      const avg = g.reduce((s, b) => s + b.order, 0) / g.length;
      g.forEach((b) => { b.resonance = avg; });
      const ends = g.map((b) => b.other(c));
      const q = ends.reduce((s, t) => s + t.charge, 0) / ends.length;
      ends.forEach((t) => { t.partialCharge = q; });
    }
  }
  // วงหกเหลี่ยมพันธะสลับ
  const ring = new Set(atoms.filter((a) => a.bonds.length >= 2));
  const seenRings = new Set();
  for (const s0 of ring) {
    const path = [s0];
    const dfs = (a) => {
      if (path.length === 6) {
        const back = a.bondTo(s0);
        if (!back) return;
        const key = path.map((x) => x.id).sort((x, y) => x - y).join(',');
        if (seenRings.has(key)) return;
        seenRings.add(key);
        const rb = path.map((x, i) => x.bondTo(path[(i + 1) % 6]));
        const alt = rb.every((b, i) => b.order === (rb[0].order === 1 ? (i % 2 ? 2 : 1) : (i % 2 ? 1 : 2)));
        if (alt) {
          rb.forEach((b) => { b.resonance = 1.5; });
          const members = [...path];
          members.forEach((x) => { x.aromaticRing = members; });
        }
        return;
      }
      for (const n of a.neighbors) {
        if (!ring.has(n) || path.includes(n) || n.id < s0.id) continue;
        path.push(n);
        dfs(n);
        path.pop();
      }
    };
    dfs(s0);
  }
}

/** ประจุที่แสดงบนอะตอม: ประจุฟอร์มอล (เฉลี่ยเรโซแนนซ์) + ประจุไอออนจากพันธะไอออนิก */
export function assignDisplayCharges(atoms) {
  for (const a of atoms) {
    let q = a.partialCharge;
    for (const b of a.bonds) {
      if (bondTypeOf(b) !== 'ionic') continue;
      const o = b.other(a);
      q += (a.el.en ?? 0) < (o.el.en ?? 0) ? b.order : -b.order;
    }
    a.displayCharge = q;
  }
}

const HB_ATOMS = new Set(['N', 'O', 'F']);
/**
 * พันธะไฮโดรเจนระหว่างโมเลกุล: H ที่ต่อกับ N/O/F อยู่ใกล้ N/O/F ที่มีคู่โดดเดี่ยวของอีกโมเลกุล
 * และมุม D–H···A กว้างกว่า minAngle — compOf: Map(atom → รหัสโมเลกุล)
 */
export function findHydrogenBonds(atoms, compOf, { maxDist = 0.17, minAngle = 120 } = {}) {
  const acceptors = atoms.filter((a) => HB_ATOMS.has(a.el.symbol) && a.lonePairs() > 0);
  const out = [];
  for (const h of atoms) {
    if (h.el.symbol !== 'H' || h.bonds.length !== 1) continue;
    const d = h.bonds[0].other(h);
    if (!HB_ATOMS.has(d.el.symbol)) continue;
    let best = null;
    let bestD = maxDist;
    for (const acc of acceptors) {
      if (compOf.get(acc) === compOf.get(h)) continue;
      const dist = Math.hypot(acc.pos.x - h.pos.x, acc.pos.y - h.pos.y, acc.pos.z - h.pos.z);
      if (dist >= bestD) continue;
      // มุม D–H···A
      const u = { x: d.pos.x - h.pos.x, y: d.pos.y - h.pos.y, z: d.pos.z - h.pos.z };
      const v = { x: acc.pos.x - h.pos.x, y: acc.pos.y - h.pos.y, z: acc.pos.z - h.pos.z };
      const cos = (u.x * v.x + u.y * v.y + u.z * v.z) / (Math.hypot(u.x, u.y, u.z) * dist || 1);
      if ((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI < minAngle) continue;
      best = acc;
      bestD = dist;
    }
    if (best) out.push({ h, donor: d, acceptor: best, dist: bestD });
  }
  return out;
}

/** ชนิดแรงยึดเหนี่ยวระหว่างโมเลกุลของสารนี้ */
export function intermolecularForces(comp, info) {
  if (info.ionic || info.charge) return ['ionic'];
  const forces = ['london'];
  if (info.complete && dipoleMagnitude(comp) > 0.3) forces.push('dipole');
  const donor = comp.atoms.some((h) => h.el.symbol === 'H' && h.bonds.length === 1 && HB_ATOMS.has(h.neighbors[0].el.symbol));
  if (donor) forces.push('hbond');
  return forces;
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
    for (const m of members) {
      const k = m.info.pretty;
      if (!tally.has(k)) tally.set(k, { hill: m.info.hill, q: m.info.charge, n: 0, pretty: k, symbol: m.info.single?.el.symbol ?? null });
      tally.get(k).n++;
    }
    const ionGroups = [...tally.values()].sort((x, y) => y.q - x.q);
    const ions = formatIons(ionGroups);
    out.push({
      key: members.map((m) => m.key).sort().join('/'),
      members, hill, entry, ions, ionGroups,
      pretty: prettyFormula(entry ? entry.f : hill),
    });
  }
  return out;
}

/**
 * ใช้เรขาคณิตจากการทดลองกับโมเลกุลที่รู้จัก (เช่น H₂S 92.1°, NO₂ 134°, มุมบิดของ H₂O₂)
 * entries: [{ comp, info }] — enabled=false ใช้ VSEPR อย่างเดียว
 */
export function applyExperimentalGeometry(entries, enabled = true) {
  for (const { comp, info } of entries) {
    // H สะพานของไดโบเรนใช้มุม B–H–B จริงเสมอ (VSEPR ใช้ไม่ได้กับพันธะ 3 ศูนย์กลาง)
    comp.atoms.forEach((a) => { a.targetAngle = a.bridgeH ? BRIDGE_ANGLE : null; });
    comp.bonds.forEach((b) => { b.targetDihedral = null; });
    const exp = enabled ? info.entry?.exp : null;
    if (!exp) continue;
    if (exp.angle && info.central) info.central.targetAngle = exp.angle;
    if (exp.dihedral) {
      const core = comp.bonds.find((b) => b.a.el.symbol !== 'H' && b.b.el.symbol !== 'H');
      if (core) core.targetDihedral = exp.dihedral;
    }
  }
}

/**
 * โมเมนต์ขั้วคู่โดยประมาณจากตำแหน่งจริง: ผลรวมเวกเตอร์ ΔEN ตามแนวพันธะ + คู่โดดเดี่ยวของอะตอมกลาง
 * (หลักในหนังสือเรียน: โมเลกุลที่อะตอมกลางมีคู่โดดเดี่ยวจัดตัวไม่สมมาตร เช่น O₃, PH₃ มีขั้ว)
 */
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
  // คู่โดดเดี่ยวของอะตอมกลางที่จัดตัวไม่สมมาตร (คิดแยกจากขั้วพันธะ เพื่อไม่ให้หักล้างกันเชิงตัวเลข เช่น OF₂, NF₃ ซึ่งมีขั้วจริง)
  let lx = 0; let ly = 0; let lz = 0;
  for (const a of comp.atoms) {
    if (a.bonds.length < 2 || !a.lpDirs) continue;
    for (const lp of a.lpDirs) { lx += lp.x; ly += lp.y; lz += lp.z; }
  }
  return Math.max(Math.hypot(x, y, z), 0.5 * Math.hypot(lx, ly, lz));
}

/**
 * โลหะ + อโลหะ: ใช้กฎของฟายานส์อย่างง่าย — ไอออนบวกประจุสูง/ขนาดเล็กดึงกลุ่มอิเล็กตรอนของไอออนลบ
 * จนเกิดลักษณะโคเวเลนต์ เช่น BeCl₂, AlCl₃, FeCl₃, TiCl₄, HgCl₂ เป็นโมเลกุลโคเวเลนต์
 */
function metalNonmetalIonic(metal, other) {
  if (metal.el.symbol === 'Be') return false;
  if (metal.el.group === 1 || metal.el.group === 2) return true;
  const ox = metal.bondOrderSum; // ใช้แทนเลขออกซิเดชันโดยประมาณ
  if (other.el.symbol === 'O' || other.el.symbol === 'F') return ox <= 4;
  if (ox >= 3) return false;
  const d = Math.abs((metal.el.en ?? 0) - (other.el.en ?? 0));
  return d >= 1.2;
}

export function bondTypeOf(bond) {
  if (bond.coord) return 'coordinate';
  const ea = bond.a.el.en; const eb = bond.b.el.en;
  const ma = isMetal(bond.a.el); const mb = isMetal(bond.b.el);
  if (ma && mb) return 'metallic';
  if (ma !== mb) {
    const [metal, other] = ma ? [bond.a, bond.b] : [bond.b, bond.a];
    if (metalNonmetalIonic(metal, other)) return 'ionic';
  }
  if (ea == null || eb == null) return 'unknown';
  const d = Math.abs(ea - eb);
  if (d >= 1.7 && !ma && !mb) return 'ionic';
  if (d >= 0.4) return 'polar';
  return 'nonpolar';
}
