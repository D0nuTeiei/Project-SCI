// เครื่องมือตรวจสอบแบบจำลองเทียบกับข้อมูลจริง: node tools/audit.mjs [--json path]
// สร้างโมเลกุลแต่ละกรณีด้วยระบบเคมี/ฟิสิกส์เดียวกับแอป แล้วเทียบชื่อ ความสมบูรณ์ รูปร่าง มุมพันธะ สภาพขั้ว และพันธะเรโซแนนซ์
import fs from 'node:fs';

// ให้ผลซ้ำได้ทุกครั้ง: แทน Math.random ด้วยตัวสุ่มที่กำหนด seed (mulberry32)
let seed = 20261016;
Math.random = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
import { BY_SYMBOL } from '../js/elements.js';
import { ChemSystem, analyze, shapeOf, dipoleMagnitude } from '../js/chemistry.js';
import { relax } from '../js/physics.js';
import { buildSmiles } from './smiles.mjs';
import { CASES } from './audit-cases.mjs';

const FEATURE = {
  lattice: 'แสดงโครงผลึกไอออนิก (ไม่ใช่โมเลกุล)',
  network: 'แสดงโครงผลึกร่างตาข่าย',
  metallic: 'แสดงพันธะโลหะ',
  hbond: 'แสดงพันธะไฮโดรเจนระหว่างโมเลกุล',
  bondEnergy: 'แสดงพลังงานพันธะ',
  stereo: 'แยกไอโซเมอร์เชิงพื้นที่ (cis/trans, ไครัล)',
};

function angle(c, a, b) {
  const u = [a.pos.x - c.pos.x, a.pos.y - c.pos.y, a.pos.z - c.pos.z];
  const v = [b.pos.x - c.pos.x, b.pos.y - c.pos.y, b.pos.z - c.pos.z];
  const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const cos = d / (Math.hypot(...u) * Math.hypot(...v));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
function dihedral(p0, p1, p2, p3) {
  const sub = (a, b) => [a.x - b.x, a.y - b.y, a.z - b.z];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const b0 = sub(p0, p1); const b1 = sub(p2, p1); const b2 = sub(p3, p2);
  const n1 = cross(b0, b1); const n2 = cross(b1, b2);
  const c = dot(n1, n2) / (Math.hypot(...n1) * Math.hypot(...n2));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}
/** ระยะไกลสุดของอะตอมจากระนาบที่ผ่าน 3 อะตอมแรก (เมตร) */
function planarity(atoms) {
  const [a, b, c] = atoms;
  const u = [b.pos.x - a.pos.x, b.pos.y - a.pos.y, b.pos.z - a.pos.z];
  const v = [c.pos.x - a.pos.x, c.pos.y - a.pos.y, c.pos.z - a.pos.z];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n);
  return Math.max(...atoms.map((p) => Math.abs((p.pos.x - a.pos.x) * n[0] + (p.pos.y - a.pos.y) * n[1] + (p.pos.z - a.pos.z) * n[2]) / l));
}

function runCase(cs, seed) {
  const sys = new ChemSystem();
  const { heavy, all, failed } = buildSmiles(sys, BY_SYMBOL, cs.smiles);
  for (let f = 0; f < 900; f++) relax(sys);
  const center = cs.center !== undefined ? heavy[cs.center] : heavy.reduce((m, a) => (a.bonds.length > m.bonds.length ? a : m), heavy[0]);
  const comp = sys.componentOf(heavy[0]);
  const info = analyze(comp);
  const nb = center.neighbors;
  const angles = [];
  for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) angles.push(angle(center, nb[i], nb[j]));
  const orders = center.bonds.filter((b) => b.other(center).el.symbol !== 'H').map((b) => b.order);
  let dih = null;
  if (cs.expect.dihedral) {
    const [o1, o2] = heavy;
    const h1 = o1.neighbors.find((n) => n.el.symbol === 'H');
    const h2 = o2.neighbors.find((n) => n.el.symbol === 'H');
    dih = dihedral(h1.pos, o1.pos, o2.pos, h2.pos);
  }
  return {
    failed, info, center, angles, orders, dih,
    shape: shapeOf(center)?.en || null,
    dipole: dipoleMagnitude(comp),
    flat: cs.expect.planar ? planarity(comp.atoms) : null,
    formal: comp.atoms.filter((a) => a.charge).map((a) => a.el.symbol + (a.charge > 0 ? '+' : '−').repeat(Math.abs(a.charge))),
    nComponents: sys.components().length,
  };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

const results = [];
for (const cs of CASES) {
  const runs = [0, 1, 2].map((k) => runCase(cs, k));
  const r = runs[0];
  const e = cs.expect;
  const checks = [];
  const add = (what, ok, got, want) => checks.push({ what, ok, got, want });
  add('สร้างได้', r.failed.length === 0 && r.nComponents === 1, r.failed.length ? `ต่อไม่ได้: ${r.failed.join(', ')}` : 'ได้', 'ได้');
  if (e.name) add('ชื่อ', r.info.entry?.en === e.name, r.info.entry?.en || '(ไม่มีชื่อ)', e.name);
  if (e.radicalName) add('ชื่ออนุมูลอิสระ', r.info.entry?.en === e.radicalName, r.info.entry?.en || '(ไม่มีชื่อ)', e.radicalName);
  const wantComplete = e.complete ?? true;
  add('ครบเวเลนซ์', r.info.complete === wantComplete, r.info.complete ? 'ครบ' : 'ไม่ครบ', wantComplete ? 'ครบ' : 'ไม่ครบ (อนุมูลอิสระ)');
  if (e.shape) add('รูปร่าง', r.shape === e.shape, r.shape || '–', e.shape);
  if (e.angles) {
    for (const want of e.angles) {
      const got = median(runs.map((x) => x.angles.reduce((best, a) => (Math.abs(a - want) < Math.abs(best - want) ? a : best), Infinity)));
      add(`มุม ~${want}°`, Math.abs(got - want) <= 6, Number.isFinite(got) ? `${got.toFixed(1)}°` : '–', `${want}°`);
    }
  }
  if (typeof e.polar === 'boolean') {
    const d = median(runs.map((x) => x.dipole));
    add('สภาพขั้ว', (d > 0.3) === e.polar, d > 0.3 ? 'มีขั้ว' : 'ไม่มีขั้ว', e.polar ? 'มีขั้ว' : 'ไม่มีขั้ว');
  } else if (typeof e.polar === 'string') add('สภาพขั้ว', false, 'คำนวณจากโครงเดียว', e.polar);
  if (e.equalBonds) add('พันธะยาวเท่ากัน (เรโซแนนซ์)', new Set(r.orders).size <= 1, `อันดับพันธะ ${r.orders.join('/')}`, 'เท่ากันทุกพันธะ');
  if (e.planar) add('แบนราบ', median(runs.map((x) => x.flat)) < 0.004, `เบี่ยง ${(median(runs.map((x) => x.flat)) * 1000).toFixed(1)} มม.`, 'อยู่ในระนาบเดียว');
  if (e.dihedral) add(`มุมบิด ~${e.dihedral}°`, Math.abs(median(runs.map((x) => x.dih)) - e.dihedral) <= 15, `${median(runs.map((x) => x.dih)).toFixed(0)}°`, `${e.dihedral}°`);
  if (typeof e.ionic === 'boolean') add('ชนิดพันธะ', r.info.ionic === e.ionic, r.info.ionic ? 'ไอออนิก' : 'โคเวเลนต์', e.ionic ? 'ไอออนิก' : 'โคเวเลนต์');
  for (const k of Object.keys(FEATURE)) if (e[k]) add(FEATURE[k], false, 'ยังไม่มี', 'ควรมี');
  results.push({
    group: cs.group, th: cs.th, smiles: cs.smiles, ref: cs.ref, note: cs.note || '',
    label: r.info.entry ? r.info.entry.en : r.info.pretty, formal: r.formal, checks,
    pass: checks.every((c) => c.ok),
  });
}

const json = process.argv.indexOf('--json');
if (json > 0) fs.writeFileSync(process.argv[json + 1], JSON.stringify(results, null, 2));
const md = process.argv.indexOf('--md');
if (md > 0) {
  const GROUP = {
    vsepr: 'รูปร่างโมเลกุล (VSEPR)', 'vsepr-limit': 'ข้อยกเว้นของ VSEPR จากการทดลอง', resonance: 'ประจุฟอร์มอลและเรโซแนนซ์',
    ions: 'ไอออนและอนุมูลอิสระ', structure: 'พันธะไอออนิก โลหะ โครงผลึก', stereo: 'ไอโซเมอร์', imf: 'แรงระหว่างโมเลกุลและพลังงานพันธะ',
  };
  const esc = (x) => String(x).replace(/\|/g, '\\|');
  let out = '';
  for (const g of Object.keys(GROUP)) {
    const rows = results.filter((r) => r.group === g);
    out += `\n#### ${GROUP[g]} — ผ่าน ${rows.filter((r) => r.pass).length}/${rows.length}\n\n`;
    out += '| ผล | สาร | สิ่งที่แอปแสดง | ที่ไม่ตรงกับข้อมูลจริง (ได้ → ควรเป็น) | อ้างอิง |\n|---|---|---|---|---|\n';
    for (const r of rows) {
      const bad = r.checks.filter((c) => !c.ok).map((c) => `${c.what}: ${c.got} → ${c.want}`).join('<br>');
      const shown = [r.label, ...r.checks.filter((c) => c.ok && /รูปร่าง|มุม/.test(c.what)).map((c) => c.got)].join(', ');
      out += `| ${r.pass ? '✅' : '❌'} | ${esc(r.th)} \`${esc(r.smiles)}\` | ${esc(shown)}${r.formal.length ? ' (ประจุฟอร์มอล ' + r.formal.join(', ') + ')' : ''} | ${bad ? esc(bad) : '–'} | ${r.ref} |\n`;
    }
  }
  fs.writeFileSync(process.argv[md + 1], out);
}
let fails = 0;
for (const r of results) {
  const bad = r.checks.filter((c) => !c.ok);
  if (bad.length) fails++;
  console.log(`${bad.length ? '✗' : '✓'} [${r.group}] ${r.th} (${r.smiles})${r.formal.length ? ' ประจุฟอร์มอล ' + r.formal.join(',') : ''}`);
  for (const c of bad) console.log(`     - ${c.what}: ได้ ${c.got} | ควรเป็น ${c.want}`);
}
console.log(`\nผ่าน ${results.length - fails}/${results.length} กรณี`);
