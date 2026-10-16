// ลำดับ 2: ไอโซเมอร์เชิงพื้นที่, เรขาคณิตจากการทดลอง, ผลึกร่างตาข่ายและโลหะ
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BY_SYMBOL } from '../js/elements.js';
import { ChemSystem, analyze, applyExperimentalGeometry, dipoleMagnitude, bondTypeOf } from '../js/chemistry.js';
import { relax } from '../js/physics.js';
import { findStereocenters, doubleBondStereo, flipDoubleBond, mirrorPositions, rankNeighbors } from '../js/stereo.js';
import { structureOptions, diamondStructure, graphiteStructure, quartzStructure, metalStructure } from '../js/lattice.js';
import { buildSmiles } from '../tools/smiles.mjs';

function mol(smiles, frames = 600, experimental = true) {
  const sys = new ChemSystem();
  const { heavy } = buildSmiles(sys, BY_SYMBOL, smiles);
  const comp = sys.componentOf(heavy[0]);
  applyExperimentalGeometry([{ comp, info: analyze(comp) }], experimental);
  for (let f = 0; f < frames; f++) relax(sys);
  return { sys, heavy, comp, info: analyze(comp) };
}
const angleAt = (c) => {
  const [a, b] = c.neighbors;
  const u = [a.pos.x - c.pos.x, a.pos.y - c.pos.y, a.pos.z - c.pos.z];
  const v = [b.pos.x - c.pos.x, b.pos.y - c.pos.y, b.pos.z - c.pos.z];
  return Math.acos((u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v))) * 180 / Math.PI;
};

test('CIP: ลำดับความสำคัญของอะลานีนและกลีเซอรัลดีไฮด์', () => {
  const ala = mol('CC(N)C(=O)O', 0);
  assert.deepEqual(rankNeighbors(ala.heavy[1]).map((a) => a.el.symbol), ['N', 'C', 'C', 'H']);
  assert.equal(rankNeighbors(ala.heavy[1])[1], ala.heavy[3]); // COOH มาก่อน CH₃
  const gly = mol('OCC(O)C=O', 0);
  const r = rankNeighbors(gly.heavy[2]);
  assert.equal(r[1], gly.heavy[4]); // CHO มาก่อน CH₂OH (นับ O ซ้ำของพันธะคู่)
});

test('คาร์บอนไครัล: อะลานีนมี 1 ตำแหน่ง ภาพในกระจกกลับ R ↔ S, ไกลซีนไม่ไครัล', () => {
  const ala = mol('CC(N)C(=O)O');
  const c1 = findStereocenters(ala.comp);
  assert.equal(c1.length, 1);
  mirrorPositions(ala.comp.atoms);
  assert.notEqual(findStereocenters(ala.comp)[0].label, c1[0].label);
  assert.equal(findStereocenters(mol('NCC(=O)O').comp).length, 0);
});

test('cis/trans: สลับได้ และ cis มีขั้ว trans ไม่มีขั้ว', () => {
  const d = mol('ClC=CCl', 900);
  const s1 = doubleBondStereo(d.comp)[0];
  const p1 = dipoleMagnitude(d.comp) > 0.3;
  flipDoubleBond(d.sys, s1);
  for (let f = 0; f < 900; f++) relax(d.sys);
  const s2 = doubleBondStereo(d.comp)[0];
  const p2 = dipoleMagnitude(d.comp) > 0.3;
  assert.notEqual(s1.cisTrans, s2.cisTrans);
  assert.equal(s1.cisTrans === 'cis' ? p1 : p2, true);
  assert.equal(s1.cisTrans === 'trans' ? p1 : p2, false);
  assert.equal(d.info.entry.en, '1,2-Dichloroethene');
  assert.equal(doubleBondStereo(mol('C=CCC', 0).comp).length, 0); // 1-บิวทีน ไม่มี cis/trans
});

test('เรขาคณิตจากการทดลอง: H₂S 92°, NO₂ 134°, CaF₂ งอ; ปิดแล้วกลับเป็น VSEPR', () => {
  assert.ok(Math.abs(angleAt(mol('S', 900).heavy[0]) - 92.1) < 3);
  assert.ok(Math.abs(angleAt(mol('[O][N][O]', 900).heavy[1]) - 134.1) < 4);
  const caf2 = mol('F[Ca]F', 900);
  assert.ok(Math.abs(angleAt(caf2.heavy[1]) - 140) < 4);
  assert.equal(caf2.info.expShape.en, 'Bent');
  assert.ok(angleAt(mol('S', 900, false).heavy[0]) > 100);
});

test('ผลึกร่างตาข่ายและผลึกโลหะ: เลขโคออร์ดิเนชันถูกต้อง', () => {
  assert.equal(diamondStructure().neighbors.length, 4);
  assert.equal(graphiteStructure().neighbors.length, 3);
  const q = quartzStructure();
  assert.ok(q.neighbors.every((i) => q.sites[i].sym === 'O') && q.neighbors.length === 4);
  assert.equal(metalStructure(BY_SYMBOL.Fe).neighbors.length, 8); // bcc
  assert.equal(metalStructure(BY_SYMBOL.Cu).neighbors.length, 12); // fcc
  assert.equal(metalStructure(BY_SYMBOL.Mg).neighbors.length, 12); // hcp
  assert.deepEqual(structureOptions({ el: BY_SYMBOL.C }).map((o) => o.id), ['diamond', 'graphite']);
  const na2 = mol('[Na][Na]', 0);
  assert.equal(bondTypeOf(na2.comp.bonds[0]), 'metallic');
  assert.deepEqual(structureOptions({ info: na2.info }).map((o) => o.id), ['metal']);
  assert.deepEqual(structureOptions({ info: mol('O=[Si]=O', 0).info }).map((o) => o.id), ['sio2']);
});
