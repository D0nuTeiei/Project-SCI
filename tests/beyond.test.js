// ลำดับ 3: พันธะ 3 ศูนย์กลาง (B₂H₆), สารประกอบเชิงซ้อน, เวเลนซ์ขยายแบบแยกประจุ
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BY_SYMBOL } from '../js/elements.js';
import { ChemSystem, analyze, applyExperimentalGeometry, suggestCharge, bondTypeOf, octetFeasible, expandedOctetAtom } from '../js/chemistry.js';
import { relax } from '../js/physics.js';
import { complexStereo, flipDoubleBond } from '../js/stereo.js';
import { buildSmiles } from '../tools/smiles.mjs';

const R = () => ({ x: Math.random() * 0.2, y: Math.random() * 0.2, z: Math.random() * 0.2 });
function angle(c, a, b) {
  const u = [a.pos.x - c.pos.x, a.pos.y - c.pos.y, a.pos.z - c.pos.z];
  const v = [b.pos.x - c.pos.x, b.pos.y - c.pos.y, b.pos.z - c.pos.z];
  const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
function mol(smiles, frames = 900) {
  const sys = new ChemSystem();
  const { heavy } = buildSmiles(sys, BY_SYMBOL, smiles);
  const comp = sys.componentOf(heavy[0]);
  applyExperimentalGeometry([{ comp, info: analyze(comp) }]);
  for (let f = 0; f < frames; f++) relax(sys);
  return { sys, heavy, comp, info: analyze(comp) };
}

test('BH₃ สองโมเลกุลรวมเป็นไดโบเรนผ่าน H สะพาน 2 ตำแหน่ง (ไม่มีพันธะ B–B)', () => {
  const sys = new ChemSystem();
  const [b1, b2] = [sys.addAtom(BY_SYMBOL.B, R()), sys.addAtom(BY_SYMBOL.B, R())];
  for (const b of [b1, b2]) for (let i = 0; i < 3; i++) sys.addBond(b, sys.addAtom(BY_SYMBOL.H, R()));
  assert.equal(analyze(sys.componentOf(b1)).entry.en, 'Borane');
  assert.ok(sys.addBond(b1.neighbors[0], b2), 'H สะพานแรก');
  assert.equal(analyze(sys.componentOf(b1)).complete, false, 'สะพานเดียวยังไม่ครบ');
  assert.ok(sys.addBond(b2.neighbors[0], b1), 'H สะพานที่สอง');
  const comp = sys.componentOf(b1);
  applyExperimentalGeometry([{ comp, info: analyze(comp) }]);
  for (let f = 0; f < 900; f++) relax(sys);
  const info = analyze(comp);
  assert.equal(info.entry.en, 'Diborane');
  assert.ok(info.complete);
  assert.equal(comp.atoms.filter((a) => a.bridgeH).length, 2);
  for (const h of comp.atoms.filter((a) => a.bridgeH)) {
    const a = angle(h, h.neighbors[0], h.neighbors[1]);
    assert.ok(Math.abs(a - 83) < 6, `B–H–B ${a}`);
  }
  // H ที่ไม่ได้เป็นสะพาน (ต่อกับ B) ต่อกับ C ไม่ได้
  const c = sys.addAtom(BY_SYMBOL.C, R());
  assert.equal(sys.addBond(b1.neighbors.find((n) => !n.bridgeH), c), null);
});

test('สารเชิงซ้อน: เลขออกซิเดชัน เลขโคออร์ดิเนชัน รูปร่าง และพันธะโคออร์ดิเนต', () => {
  const cases = [
    ['[Cu+2]([NH3])([NH3])([NH3])[NH3]', 'Tetraamminecopper(II) ion', 2, 'Square planar'],
    ['[Zn+2]([NH3])([NH3])([NH3])[NH3]', 'Tetraamminezinc(II) ion', 2, 'Tetrahedral'],
    ['[Ag+]([NH3])[NH3]', 'Diamminesilver(I) ion', 1, 'Linear'],
    ['[Fe-3](C#N)(C#N)(C#N)(C#N)(C#N)C#N', 'Hexacyanoferrate(III) ion (ferricyanide)', 3, 'Octahedral'],
    ['[Ni](C#O)(C#O)(C#O)C#O', 'Nickel tetracarbonyl', 0, 'Tetrahedral'],
  ];
  for (const [smi, name, ox, shape] of cases) {
    const { info, heavy } = mol(smi);
    assert.equal(info.entry?.en, name, smi);
    assert.ok(info.complete, smi);
    assert.equal(info.complex.ox, ox, smi);
    assert.equal(info.shape.en, shape, smi);
    assert.ok(heavy[0].bonds.every((b) => b.coord && bondTypeOf(b) === 'coordinate' && b.donor !== heavy[0]), smi);
  }
});

test('สารเชิงซ้อนที่ประจุไม่ถูก: บอกประจุที่ควรเป็น และบอกให้เติมลิแกนด์', () => {
  const { comp, info } = mol('[Cu]([NH3])([NH3])([NH3])[NH3]', 10);
  assert.equal(info.complete, false);
  assert.equal(suggestCharge(comp), 2);
  assert.equal(analyze(comp).complete, false, 'suggestCharge ไม่เปลี่ยนสถานะจริง');
  const three = mol('[Cu+2]([NH3])([NH3])[NH3]', 10).info;
  assert.equal(three.complex.needLigands, 1);
});

test('TiCl₄, CuCl₂, MnO₄⁻ ยังใช้แบบจำลองพันธะปกติ (ไม่ใช่สารเชิงซ้อน)', () => {
  for (const smi of ['Cl[Ti](Cl)(Cl)Cl', 'Cl[Cu]Cl', '[O-][Mn](=O)(=O)=O']) {
    const { info } = mol(smi, 10);
    assert.equal(info.complex, null, smi);
    assert.ok(info.complete, smi);
  }
});

test('ซิสพลาทิน: แยก cis/trans และสลับได้ (cis มีขั้ว)', () => {
  const { sys, comp } = mol('Cl[Pt](Cl)([NH3])[NH3]');
  const s1 = complexStereo(comp)[0];
  assert.ok(s1 && ['cis', 'trans'].includes(s1.cisTrans));
  flipDoubleBond(sys, s1);
  for (let f = 0; f < 900; f++) relax(sys);
  const s2 = complexStereo(comp)[0];
  assert.notEqual(s2.cisTrans, s1.cisTrans);
});

test('เวเลนซ์ขยาย: SO₄²⁻ เขียนแบบแยกประจุ S²⁺(O⁻)₄ ได้ ส่วน SF₆ ไม่ได้', () => {
  const so4 = mol('[O-]S(=O)(=O)[O-]', 10);
  assert.equal(expandedOctetAtom(so4.comp)?.el.symbol, 'S');
  assert.ok(octetFeasible(so4.comp));
  assert.ok(so4.comp.bonds.some((b) => b.order === 2), 'octetFeasible ไม่เปลี่ยนสถานะ');
  so4.sys.setOctetMode(so4.heavy[1], true);
  const s = so4.heavy[1];
  assert.equal(s.charge, 2);
  assert.ok(s.bonds.every((b) => b.order === 1));
  assert.equal(analyze(so4.comp).entry.en, 'Sulfate ion');
  so4.sys.setOctetMode(s, false);
  assert.equal(s.charge, 0);
  const sf6 = mol('FS(F)(F)(F)(F)F', 10);
  assert.equal(octetFeasible(sf6.comp), false);
});
