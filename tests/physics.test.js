import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BY_SYMBOL } from '../js/elements.js';
import { ChemSystem } from '../js/chemistry.js';
import { relax, bondLength } from '../js/physics.js';

const rnd = () => ({ x: Math.random() * 0.2, y: Math.random() * 0.2, z: Math.random() * 0.2 });

function relaxed(symbols, edges, frames = 600) {
  const sys = new ChemSystem();
  const atoms = symbols.map((s) => sys.addAtom(BY_SYMBOL[s], rnd()));
  for (const [i, j] of edges) sys.addBond(atoms[i], atoms[j]);
  for (let f = 0; f < frames; f++) relax(sys);
  return { sys, atoms };
}

function angle(c, a, b) {
  const u = { x: a.pos.x - c.pos.x, y: a.pos.y - c.pos.y, z: a.pos.z - c.pos.z };
  const v = { x: b.pos.x - c.pos.x, y: b.pos.y - c.pos.y, z: b.pos.z - c.pos.z };
  const dot = u.x * v.x + u.y * v.y + u.z * v.z;
  const cos = Math.max(-1, Math.min(1, dot / (Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z))));
  return (Math.acos(cos) * 180) / Math.PI;
}

test('น้ำงอประมาณ 100–110°', () => {
  const { atoms: [o, h1, h2], sys } = relaxed(['O', 'H', 'H'], [[0, 1], [0, 2]]);
  const ang = angle(o, h1, h2);
  assert.ok(ang > 98 && ang < 112, `angle ${ang}`);
  for (const b of sys.bonds) {
    const d = Math.hypot(b.a.pos.x - b.b.pos.x, b.a.pos.y - b.b.pos.y, b.a.pos.z - b.b.pos.z);
    assert.ok(Math.abs(d - bondLength(b)) < 0.005);
  }
});

test('CO2 เส้นตรง, CH4 ทรงสี่หน้า, NH3 พีระมิด', () => {
  const co2 = relaxed(['C', 'O', 'O'], [[0, 1], [0, 2]]).atoms;
  assert.ok(angle(co2[0], co2[1], co2[2]) > 170);
  const ch4 = relaxed(['C', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4]]).atoms;
  const a = angle(ch4[0], ch4[1], ch4[2]);
  assert.ok(Math.abs(a - 109.5) < 4, `CH4 ${a}`);
  const nh3 = relaxed(['N', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3]]).atoms;
  const b = angle(nh3[0], nh3[1], nh3[2]);
  assert.ok(b > 100 && b < 112, `NH3 ${b}`);
});

test('XeF4 สี่เหลี่ยมแบนราบ (มีมุม ~180°)', () => {
  const at = relaxed(['Xe', 'F', 'F', 'F', 'F'], [[0, 1], [0, 2], [0, 3], [0, 4]]).atoms;
  const angles = [];
  for (let i = 1; i < 5; i++) for (let j = i + 1; j < 5; j++) angles.push(angle(at[0], at[i], at[j]));
  assert.equal(angles.filter((x) => x > 165).length, 2, angles.join(','));
  assert.equal(angles.filter((x) => Math.abs(x - 90) < 10).length, 4, angles.join(','));
});

test('เวเลนซ์ขยาย 5 กลุ่ม: ClF3 ตัวที, XeF2 เส้นตรง, SF4 ไม้กระดก (คู่โดดเดี่ยวอยู่แนวราบ)', () => {
  const all = (at) => {
    const out = [];
    for (let i = 1; i < at.length; i++) for (let j = i + 1; j < at.length; j++) out.push(angle(at[0], at[i], at[j]));
    return out.sort((a, b) => a - b);
  };
  const clf3 = all(relaxed(['Cl', 'F', 'F', 'F'], [[0, 1], [0, 2], [0, 3]]).atoms);
  assert.ok(clf3[0] < 95 && clf3[1] < 95 && clf3[2] > 165, clf3.join(','));
  const xef2 = all(relaxed(['Xe', 'F', 'F'], [[0, 1], [0, 2]]).atoms);
  assert.ok(xef2[0] > 170, xef2.join(','));
  const sf4 = all(relaxed(['S', 'F', 'F', 'F', 'F'], [[0, 1], [0, 2], [0, 3], [0, 4]]).atoms);
  assert.ok(sf4[5] > 165 && sf4[4] > 95 && sf4[4] < 125, sf4.join(','));
  const pcl5 = all(relaxed(['P', 'Cl', 'Cl', 'Cl', 'Cl', 'Cl'], [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]]).atoms);
  assert.equal(pcl5.filter((a) => Math.abs(a - 120) < 8).length, 3, pcl5.join(','));
});
