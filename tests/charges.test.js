import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BY_SYMBOL } from '../js/elements.js';
import { ChemSystem, analyze, suggestCharge, ionClusters } from '../js/chemistry.js';

let offset = 0;
/** สร้างโมเลกุล; charge = ประจุสุทธิที่ผู้ใช้กำหนด (ใส่ไว้ที่อะตอมแรก) */
function build(symbols, edges, charge = 0, at = null) {
  const sys = new ChemSystem();
  const base = at || { x: (offset += 1), y: 0, z: 0 };
  const atoms = symbols.map((s, i) => sys.addAtom(BY_SYMBOL[s], { x: base.x + i * 0.01, y: base.y, z: base.z }));
  for (const [i, j] of edges) assert.ok(sys.addBond(atoms[i], atoms[j]), `bond ${symbols[i]}-${symbols[j]}`);
  for (let k = 0; k < Math.abs(charge); k++) sys.addCharge(atoms[0], Math.sign(charge));
  const comp = sys.componentOf(atoms[0]);
  return { sys, atoms, comp, info: analyze(comp) };
}
const charges = (atoms) => atoms.map((a) => a.charge);

test('โอโซน O3 สมบูรณ์ด้วยประจุฟอร์มอล O=O⁺–O⁻', () => {
  const { info, atoms } = build(['O', 'O', 'O'], [[0, 1], [1, 2]]);
  assert.equal(info.complete, true);
  assert.equal(info.entry.en, 'Ozone');
  assert.equal(atoms[1].charge, 1);
  assert.deepEqual(info.bondCounts, [1, 1, 0]);
  assert.equal(info.charge, 0);
});

test('CO เป็นพันธะสาม C⁻≡O⁺', () => {
  const { info, atoms } = build(['C', 'O'], [[0, 1]]);
  assert.equal(info.complete, true);
  assert.deepEqual(info.bondCounts, [0, 0, 1]);
  assert.deepEqual(charges(atoms), [-1, 1]);
});

test('HNO3 และ N2O ใช้ประจุฟอร์มอล (N⁺)', () => {
  const hno3 = build(['N', 'O', 'O', 'O', 'H'], [[0, 1], [0, 2], [0, 3], [3, 4]]);
  assert.equal(hno3.info.entry.en, 'Nitric acid');
  assert.equal(hno3.atoms[0].charge, 1);
  assert.equal(hno3.info.shape.en, 'Trigonal planar');
  const n2o = build(['N', 'N', 'O'], [[0, 1], [1, 2]]);
  assert.equal(n2o.info.complete, true);
  assert.ok(n2o.info.entry);
});

test('HO ยังไม่สมบูรณ์ แต่ถ้าเป็นประจุ −1 จะเป็น OH⁻', () => {
  const { info, comp, atoms, sys } = build(['O', 'H'], [[0, 1]]);
  assert.equal(info.complete, false);
  assert.equal(suggestCharge(comp), -1);
  assert.equal(analyze(comp).complete, false); // คำใบ้ไม่เปลี่ยนสถานะจริง
  sys.addCharge(atoms[0], -1);
  const after = analyze(sys.componentOf(atoms[0]));
  assert.equal(after.entry.en, 'Hydroxide ion');
  assert.equal(after.pretty, 'OH⁻');
});

test('ไอออนหลายอะตอม: NH4⁺, H3O⁺, SO4²⁻, PO4³⁻, NO3⁻, CO3²⁻, MnO4⁻, BF4⁻', () => {
  const nh4 = build(['N', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4]]);
  assert.equal(nh4.info.complete, false);
  assert.equal(suggestCharge(nh4.comp), 1);
  const nh4p = build(['N', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4]], 1);
  assert.equal(nh4p.info.entry.en, 'Ammonium ion');
  assert.equal(nh4p.info.shape.en, 'Tetrahedral');
  assert.equal(build(['O', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3]], 1).info.shape.en, 'Trigonal pyramidal');
  const so4 = build(['S', 'O', 'O', 'O', 'O'], [[0, 1], [0, 2], [0, 3], [0, 4]], -2);
  assert.equal(so4.info.entry.en, 'Sulfate ion');
  assert.equal(so4.info.pretty, 'SO₄²⁻');
  assert.equal(build(['P', 'O', 'O', 'O', 'O'], [[0, 1], [0, 2], [0, 3], [0, 4]], -3).info.entry.en, 'Phosphate ion');
  const no3 = build(['N', 'O', 'O', 'O'], [[0, 1], [0, 2], [0, 3]], -1);
  assert.equal(no3.info.entry.en, 'Nitrate ion');
  assert.equal(no3.info.shape.en, 'Trigonal planar');
  assert.equal(build(['C', 'O', 'O', 'O'], [[0, 1], [0, 2], [0, 3]], -2).info.entry.en, 'Carbonate ion');
  assert.equal(build(['Mn', 'O', 'O', 'O', 'O'], [[0, 1], [0, 2], [0, 3], [0, 4]], -1).info.entry.en, 'Permanganate ion');
  assert.equal(build(['B', 'F', 'F', 'F', 'F'], [[0, 1], [0, 2], [0, 3], [0, 4]], -1).info.entry.en, 'Tetrafluoroborate ion');
});

test('ไอออนอะตอมเดี่ยว Na⁺, Cl⁻, O²⁻, Fe³⁺ และคำใบ้', () => {
  const na = build(['Na'], []);
  assert.equal(na.info.complete, false);
  assert.equal(suggestCharge(na.comp), 1);
  assert.equal(build(['Na'], [], 1).info.entry.en, 'Sodium ion');
  assert.equal(build(['Cl'], [], -1).info.pretty, 'Cl⁻');
  assert.equal(build(['O'], [], -2).info.entry.en, 'Oxide ion');
  assert.equal(build(['Fe'], [], 3).info.entry.en, 'Iron(III) ion');
  assert.equal(build(['Fe'], [], 3).info.pretty, 'Fe³⁺');
});

test('อนุมูลอิสระ NO และ NO2 (ไม่ครบเวเลนซ์แต่บอกชื่อได้)', () => {
  const no = build(['N', 'O'], [[0, 1]]).info;
  assert.equal(no.complete, false);
  assert.equal(no.radical, true);
  assert.equal(no.entry.en, 'Nitric oxide');
  const no2 = build(['N', 'O', 'O'], [[0, 1], [0, 2]]).info;
  assert.equal(no2.radical, true);
  // NO2⁻ ครบ
  assert.equal(build(['N', 'O', 'O'], [[0, 1], [0, 2]], -1).info.entry.en, 'Nitrite ion');
});

test('ไอออนรวมกันเป็นเกลือ: NH4⁺ + Cl⁻ → NH4Cl, 2Na⁺ + SO4²⁻ → Na2SO4', () => {
  const entry = (b) => ({ comp: b.comp, info: b.info, key: String(b.atoms[0].id) });
  const nh4 = build(['N', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4]], 1, { x: 0, y: 0, z: 0 });
  const cl = build(['Cl'], [], -1, { x: 0.08, y: 0, z: 0 });
  const far = build(['Cl'], [], -1, { x: 5, y: 0, z: 0 });
  const cl1 = ionClusters([entry(nh4), entry(cl), entry(far)]);
  assert.equal(cl1.length, 1);
  assert.equal(cl1[0].entry.en, 'Ammonium chloride');
  assert.equal(cl1[0].ions, 'NH₄⁺ + Cl⁻');
  const so4 = build(['S', 'O', 'O', 'O', 'O'], [[0, 1], [0, 2], [0, 3], [0, 4]], -2, { x: 10, y: 0, z: 0 });
  const na1 = build(['Na'], [], 1, { x: 10.09, y: 0, z: 0 });
  const na2 = build(['Na'], [], 1, { x: 9.95, y: 0, z: 0 });
  const c2 = ionClusters([entry(so4), entry(na1), entry(na2)]);
  assert.equal(c2[0].entry.en, 'Sodium sulfate');
  assert.equal(c2[0].ions, '2 Na⁺ + SO₄²⁻');
  // ประจุรวมไม่เป็นศูนย์ → ยังไม่ใช่สารประกอบ
  assert.equal(ionClusters([entry(so4), entry(na1)]).length, 0);
});

test('เกลือแบบเชื่อมพันธะ: KNO3, CaCO3 แยกไอออนได้', () => {
  const kno3 = build(['K', 'O', 'N', 'O', 'O'], [[0, 1], [1, 2], [2, 3], [2, 4]]).info;
  assert.equal(kno3.complete, true);
  assert.ok(kno3.entry);
  assert.equal(kno3.ions, 'K⁺ + NO₃⁻');
  const caco3 = build(['Ca', 'O', 'O', 'C', 'O'], [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]).info;
  assert.equal(caco3.ions, 'Ca²⁺ + CO₃²⁻');
  assert.equal(build(['Mg', 'Cl', 'Cl'], [[0, 1], [0, 2]]).info.ions, 'Mg²⁺ + 2 Cl⁻');
  assert.equal(build(['Be', 'Cl', 'Cl'], [[0, 1], [0, 2]]).info.ionic, false);
});

test('สารกลุ่มใหม่: กลูโคส/ฟรักโทส, ไอโซโพรพิลแอลกอฮอล์, SF4, ClF3', () => {
  // กลูโคสโซ่เปิด: OHC–(CHOH)4–CH2OH
  const sym = ['C', 'C', 'C', 'C', 'C', 'C', 'O', 'O', 'O', 'O', 'O', 'O'];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  const H = [];
  const addH = (i) => { H.push(i); };
  addH(0); for (const i of [1, 2, 3, 4]) addH(i); addH(5); addH(5);
  for (const o of [7, 8, 9, 10, 11]) addH(o);
  const all = [...sym, ...H.map(() => 'H')];
  const allEdges = [...edges, ...H.map((i, k) => [i, sym.length + k])];
  const glu = build(all, allEdges).info;
  assert.equal(glu.complete, true);
  assert.equal(glu.entry.en, 'Glucose');
  const ipa = build(['C', 'C', 'C', 'O', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
    [[0, 1], [1, 2], [1, 3], [3, 4], [0, 5], [0, 6], [0, 7], [1, 8], [2, 9], [2, 10], [2, 11]]).info;
  assert.equal(ipa.entry.en, 'Isopropyl alcohol');
  assert.equal(build(['S', 'F', 'F', 'F', 'F'], [[0, 1], [0, 2], [0, 3], [0, 4]]).info.shape.en, 'Seesaw');
  assert.equal(build(['Cl', 'F', 'F', 'F'], [[0, 1], [0, 2], [0, 3]]).info.shape.en, 'T-shaped');
});
