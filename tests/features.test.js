// ทดสอบ 5 ฟีเจอร์ที่แก้ความเข้าใจผิดจากงานวิจัย: เรโซแนนซ์, พลังงานพันธะ, โครงผลึก, พันธะไฮโดรเจน, สภาพขั้ว
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BY_SYMBOL } from '../js/elements.js';
import { ChemSystem, analyze, dipoleMagnitude, findHydrogenBonds, intermolecularForces } from '../js/chemistry.js';
import { relax } from '../js/physics.js';
import { bondEnergy, moleculeBondEnergy } from '../js/energy.js';
import { latticeFor, latticeSites } from '../js/lattice.js';
import { buildSmiles } from '../tools/smiles.mjs';

const near = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;
function mol(smiles, frames = 0) {
  const sys = new ChemSystem();
  const { heavy } = buildSmiles(sys, BY_SYMBOL, smiles);
  for (let f = 0; f < frames; f++) relax(sys);
  const comp = sys.componentOf(heavy[0]);
  return { sys, heavy, comp, info: analyze(comp) };
}

test('เรโซแนนซ์: CO₃²⁻ พันธะ 1⅓ เท่ากัน ประจุ −⅔ ทุก O', () => {
  const { heavy } = mol('[O-]C(=O)[O-]');
  const c = heavy[1];
  for (const b of c.bonds) assert.ok(near(b.effectiveOrder, 4 / 3));
  for (const o of c.neighbors) assert.ok(near(o.partialCharge, -2 / 3));
});

test('เรโซแนนซ์: โอโซน 1½ / เบนซีน 1½ / กรดแอซีติกไม่มีเรโซแนนซ์', () => {
  const o3 = mol('O=[O+][O-]').heavy[1];
  o3.bonds.forEach((b) => assert.ok(near(b.effectiveOrder, 1.5)));
  assert.ok(near(o3.partialCharge, 1));
  o3.neighbors.forEach((o) => assert.ok(near(o.partialCharge, -0.5)));
  const bz = mol('C1=CC=CC=C1');
  bz.comp.bonds.filter((b) => b.a.el.symbol === 'C' && b.b.el.symbol === 'C').forEach((b) => assert.equal(b.resonance, 1.5));
  assert.equal(mol('CC(=O)O').info.resonance.length, 0);
});

test('พลังงานพันธะ: H–H 436, น้ำ 926, CO₂ ใช้ค่า C=O 799', () => {
  const h2 = mol('[H][H]');
  assert.equal(bondEnergy(h2.comp.bonds[0]), 436);
  assert.equal(moleculeBondEnergy(mol('O').comp.bonds).total, 926);
  assert.equal(moleculeBondEnergy(mol('O=C=O').comp.bonds).total, 1598);
  assert.equal(moleculeBondEnergy(mol('[Na]Cl').comp.bonds).missing, 1); // พันธะไอออนิกไม่ใช้ค่าพลังงานพันธะโคเวเลนต์
});

test('สารไอออนิก: แสดงประจุไอออนและเลือกโครงผลึกถูกแบบ', () => {
  const nacl = mol('[Na]Cl');
  assert.deepEqual(nacl.heavy.map((a) => a.displayCharge), [1, -1]);
  const lat = latticeFor(nacl.info.ionGroups);
  assert.equal(lat.type, 'rocksalt');
  assert.equal(lat.cn, '6:6');
  assert.equal(latticeFor(mol('F[Ca]F').info.ionGroups).type, 'fluorite');
  assert.equal(latticeFor(mol('[Na]O[Na]').info.ionGroups).type, 'antifluorite');
  assert.equal(latticeFor(mol('[Cs]Cl').info.ionGroups).type, 'cscl');
  assert.equal(latticeFor(mol('[Al]1O[Al](=O)O1').info.ionGroups), null); // Al₂O₃ ยังไม่มีแบบจำลอง
  const cn = (type) => { const s = latticeSites(type); return s.neighbors.length; };
  assert.equal(cn('rocksalt'), 6);
  assert.equal(cn('cscl'), 8);
});

test('พันธะไฮโดรเจน: น้ำ 2 โมเลกุลเกิด, มีเทนกับน้ำไม่เกิดจาก C–H', () => {
  const sys = new ChemSystem();
  const o1 = buildSmiles(sys, BY_SYMBOL, 'O').heavy[0];
  const o2 = buildSmiles(sys, BY_SYMBOL, 'O').heavy[0];
  const c = buildSmiles(sys, BY_SYMBOL, 'C').heavy[0];
  for (let f = 0; f < 300; f++) relax(sys);
  const place = (atom, target) => {
    const d = { x: target.x - atom.pos.x, y: target.y - atom.pos.y, z: target.z - atom.pos.z };
    sys.componentOf(atom).atoms.forEach((a) => { a.pos.x += d.x; a.pos.y += d.y; a.pos.z += d.z; });
  };
  const h = o1.neighbors[0];
  const u = { x: h.pos.x - o1.pos.x, y: h.pos.y - o1.pos.y, z: h.pos.z - o1.pos.z };
  const l = Math.hypot(u.x, u.y, u.z);
  place(o2, { x: h.pos.x + (u.x / l) * 0.12, y: h.pos.y + (u.y / l) * 0.12, z: h.pos.z + (u.z / l) * 0.12 });
  place(c, { x: 5, y: 5, z: 5 });
  const compOf = new Map();
  sys.components().forEach((cp, i) => cp.atoms.forEach((a) => compOf.set(a, i)));
  const hb = findHydrogenBonds(sys.atoms, compOf);
  assert.ok(hb.length >= 1);
  assert.ok(hb.every((x) => x.donor.el.symbol === 'O' && x.acceptor.el.symbol === 'O'));
});

test('แรงระหว่างโมเลกุลและสภาพขั้ว (คิดคู่โดดเดี่ยวของอะตอมกลาง)', () => {
  const w = mol('O', 600);
  assert.deepEqual(intermolecularForces(w.comp, w.info), ['london', 'dipole', 'hbond']);
  const m = mol('C', 600);
  assert.deepEqual(intermolecularForces(m.comp, m.info), ['london']);
  assert.deepEqual(intermolecularForces(mol('[Na]Cl').comp, mol('[Na]Cl').info), ['ionic']);
  for (const [smi, polar] of [['P', true], ['FOF', true], ['O=[O+][O-]', true], ['O=C=O', false], ['FB(F)F', false], ['F[Xe](F)(F)F', false], ['C1=CC=CC=C1', false]]) {
    const r = mol(smi, 900);
    assert.equal(dipoleMagnitude(r.comp) > 0.3, polar, smi);
  }
});
