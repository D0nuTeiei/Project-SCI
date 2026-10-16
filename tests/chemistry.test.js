import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, BY_SYMBOL } from '../js/elements.js';
import { ChemSystem, analyze } from '../js/chemistry.js';
import { MOLECULES, hillFormula, parseFormula } from '../js/molecules.js';

const p = () => ({ x: 0, y: 0, z: 0 });

/** สร้างโมเลกุลจากรายการอะตอมและคู่พันธะ เช่น build(['O','H','H'], [[0,1],[0,2]]) */
function build(symbols, edges) {
  const sys = new ChemSystem();
  const atoms = symbols.map((s) => sys.addAtom(BY_SYMBOL[s], p()));
  for (const [i, j] of edges) assert.ok(sys.addBond(atoms[i], atoms[j]), `bond ${symbols[i]}-${symbols[j]}`);
  return { sys, atoms, info: analyze(sys.componentOf(atoms[0])) };
}

test('ตารางธาตุครบ 118 ธาตุและตำแหน่งถูกต้อง', () => {
  assert.equal(ELEMENTS.length, 118);
  const pos = (s) => [BY_SYMBOL[s].row, BY_SYMBOL[s].col];
  assert.deepEqual(pos('H'), [1, 1]);
  assert.deepEqual(pos('He'), [1, 18]);
  assert.deepEqual(pos('B'), [2, 13]);
  assert.deepEqual(pos('Ne'), [2, 18]);
  assert.deepEqual(pos('Al'), [3, 13]);
  assert.deepEqual(pos('Fe'), [4, 8]);
  assert.deepEqual(pos('Hf'), [6, 4]);
  assert.deepEqual(pos('Rn'), [6, 18]);
  assert.deepEqual(pos('La'), [9, 3]);
  assert.deepEqual(pos('Lu'), [9, 17]);
  assert.deepEqual(pos('Lr'), [10, 17]);
  assert.deepEqual(pos('Og'), [7, 18]);
  // ไม่มีสองธาตุอยู่ช่องเดียวกัน
  const cells = new Set(ELEMENTS.map((e) => `${e.row},${e.col}`));
  assert.equal(cells.size, 118);
  assert.deepEqual(BY_SYMBOL.Fe.shells, [2, 8, 14, 2]);
  assert.deepEqual(BY_SYMBOL.Cu.shells, [2, 8, 18, 1]);
  assert.deepEqual(BY_SYMBOL.Pb.shells, [2, 8, 18, 32, 18, 4]);
});

test('น้ำ H2O', () => {
  const { info } = build(['O', 'H', 'H'], [[0, 1], [0, 2]]);
  assert.equal(info.complete, true);
  assert.equal(info.entry.en, 'Water');
  assert.equal(info.shape.en, 'Bent');
});

test('HO ยังไม่สมบูรณ์', () => {
  const { info } = build(['H', 'O'], [[0, 1]]);
  assert.equal(info.complete, false);
  assert.equal(info.hill, 'HO');
  assert.equal(info.missing, 1);
  // ระบบรู้จักในฐานะอนุมูลอิสระ แต่ยังถือว่าไม่สมบูรณ์ (ป้ายยังขึ้น "แบบจำลองยังไม่สมบูรณ์")
  assert.equal(info.entry.en, 'Hydroxyl radical');
  assert.equal(info.radical, true);
});

test('O2 พันธะคู่, N2 พันธะสาม, CO2, HCN', () => {
  assert.deepEqual(build(['O', 'O'], [[0, 1]]).info.bondCounts, [0, 1, 0]);
  assert.deepEqual(build(['N', 'N'], [[0, 1]]).info.bondCounts, [0, 0, 1]);
  const co2 = build(['C', 'O', 'O'], [[0, 1], [0, 2]]).info;
  assert.equal(co2.entry.en, 'Carbon dioxide');
  assert.deepEqual(co2.bondCounts, [0, 2, 0]);
  assert.equal(co2.shape.en, 'Linear');
  const hcn = build(['H', 'C', 'N'], [[0, 1], [1, 2]]).info;
  assert.equal(hcn.entry.en, 'Hydrogen cyanide');
  assert.deepEqual(hcn.bondCounts, [1, 0, 1]);
});

test('พันธะคู่ลดลงเมื่อมีอะตอมมาต่อเพิ่ม (O=O → H–O–O)', () => {
  const sys = new ChemSystem();
  const [o1, o2, h] = ['O', 'O', 'H'].map((s) => sys.addAtom(BY_SYMBOL[s], p()));
  const b = sys.addBond(o1, o2);
  assert.equal(b.order, 2);
  sys.addBond(o1, h);
  assert.equal(b.order, 1);
  sys.removeAtom(h);
  assert.equal(b.order, 2);
});

test('เบนซีน (วงพันธะคู่สลับ)', () => {
  const sym = ['C', 'C', 'C', 'C', 'C', 'C', 'H', 'H', 'H', 'H', 'H', 'H'];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  const { info } = build(sym, edges);
  assert.equal(info.complete, true);
  assert.equal(info.entry.en, 'Benzene');
  assert.deepEqual(info.bondCounts, [9, 3, 0]);
});

test('เอทานอล vs ไดเมทิลอีเทอร์', () => {
  // C0-C1-O2-H, H บน C
  const eth = build(['C', 'C', 'O', 'H', 'H', 'H', 'H', 'H', 'H'],
    [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]]).info;
  assert.equal(eth.entry.en, 'Ethanol');
  const ether = build(['C', 'O', 'C', 'H', 'H', 'H', 'H', 'H', 'H'],
    [[0, 1], [1, 2], [0, 3], [0, 4], [0, 5], [2, 6], [2, 7], [2, 8]]).info;
  assert.equal(ether.entry.en, 'Dimethyl ether');
});

test('เวเลนซ์ขยาย: SO2, H2SO4, HNO3, SF6, XeF4', () => {
  const so2 = build(['S', 'O', 'O'], [[0, 1], [0, 2]]).info;
  assert.equal(so2.complete, true);
  assert.equal(so2.shape.en, 'Bent');
  const h2so4 = build(['S', 'O', 'O', 'O', 'O', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4], [3, 5], [4, 6]]).info;
  assert.equal(h2so4.entry.en, 'Sulfuric acid');
  assert.equal(h2so4.shape.en, 'Tetrahedral');
  const hno3 = build(['N', 'O', 'O', 'O', 'H'], [[0, 1], [0, 2], [0, 3], [3, 4]]).info;
  assert.equal(hno3.entry.en, 'Nitric acid');
  assert.equal(hno3.shape.en, 'Trigonal planar');
  const sf6 = build(['S', 'F', 'F', 'F', 'F', 'F', 'F'], [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]]).info;
  assert.equal(sf6.shape.en, 'Octahedral');
  const xef4 = build(['Xe', 'F', 'F', 'F', 'F'], [[0, 1], [0, 2], [0, 3], [0, 4]]).info;
  assert.equal(xef4.shape.en, 'Square planar');
});

test('ข้อจำกัดเวเลนซ์: H ต่อได้พันธะเดียว, He ต่อไม่ได้', () => {
  const sys = new ChemSystem();
  const [h1, h2, h3, he] = ['H', 'H', 'H', 'He'].map((s) => sys.addAtom(BY_SYMBOL[s], p()));
  assert.ok(sys.addBond(h1, h2));
  assert.equal(sys.addBond(h1, h3), null);
  assert.equal(sys.addBond(he, h3), null);
  assert.equal(analyze(sys.componentOf(he)).complete, true);
});

test('NO2 เป็นอนุมูลอิสระ (ไม่สมบูรณ์)', () => {
  assert.equal(build(['N', 'O', 'O'], [[0, 1], [0, 2]]).info.complete, false);
});

test('ทุกโมเลกุลในฐานข้อมูลมีสูตร Hill ที่ถูกต้อง', () => {
  assert.equal(hillFormula(parseFormula('NH3')), 'H3N');
  assert.equal(hillFormula(parseFormula('Ca(OH)2')), 'CaH2O2');
  assert.equal(hillFormula(parseFormula('CO(NH2)2')), 'CH4N2O');
  for (const m of MOLECULES) {
    for (const s of Object.keys(parseFormula(m.f))) assert.ok(BY_SYMBOL[s], `${m.f}: ${s}`);
  }
});

test('สารไอออนิก NaCl, CaCO3, Fe2O3', () => {
  const nacl = build(['Na', 'Cl'], [[0, 1]]).info;
  assert.equal(nacl.ionic, true);
  assert.ok(nacl.entry);
  const caco3 = build(['Ca', 'O', 'O', 'C', 'O'], [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]).info;
  assert.equal(caco3.complete, true);
  assert.ok(caco3.entry);
  const fe2o3 = build(['Fe', 'O', 'Fe', 'O', 'O'], [[0, 1], [1, 2], [0, 3], [2, 4]]).info;
  assert.equal(fe2o3.complete, true);
  assert.ok(fe2o3.entry);
});
