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
import { ChemSystem, analyze, shapeOf, dipoleMagnitude, findHydrogenBonds, applyExperimentalGeometry, bondTypeOf } from '../js/chemistry.js';
import { findStereocenters, doubleBondStereo, flipDoubleBond, mirrorPositions } from '../js/stereo.js';
import { structureOptions } from '../js/lattice.js';
import { bondEnergy } from '../js/energy.js';
import { latticeFor } from '../js/lattice.js';
import { relax } from '../js/physics.js';
import { buildSmiles } from './smiles.mjs';
import { CASES } from './audit-cases.mjs';

const FEATURE = {};

/** วางโมเลกุลน้ำโมเลกุลที่สองให้ O อยู่ต่อจากแนว O–H ของโมเลกุลแรก แล้วตรวจหาพันธะไฮโดรเจน */
function waterDimerHBonds() {
  const sys = new ChemSystem();
  const w1 = buildSmiles(sys, BY_SYMBOL, 'O').heavy[0];
  const w2 = buildSmiles(sys, BY_SYMBOL, 'O').heavy[0];
  for (let f = 0; f < 400; f++) relax(sys);
  const h = w1.neighbors[0];
  const ux = h.pos.x - w1.pos.x; const uy = h.pos.y - w1.pos.y; const uz = h.pos.z - w1.pos.z;
  const l = Math.hypot(ux, uy, uz);
  const target = { x: h.pos.x + (ux / l) * 0.12, y: h.pos.y + (uy / l) * 0.12, z: h.pos.z + (uz / l) * 0.12 };
  const shift = { x: target.x - w2.pos.x, y: target.y - w2.pos.y, z: target.z - w2.pos.z };
  for (const a of sys.componentOf(w2).atoms) { a.pos.x += shift.x; a.pos.y += shift.y; a.pos.z += shift.z; }
  const compOf = new Map();
  sys.components().forEach((c, i) => c.atoms.forEach((a) => compOf.set(a, i)));
  return findHydrogenBonds(sys.atoms, compOf).length;
}

function angle(c, a, b) {
  const u = [a.pos.x - c.pos.x, a.pos.y - c.pos.y, a.pos.z - c.pos.z];
  const v = [b.pos.x - c.pos.x, b.pos.y - c.pos.y, b.pos.z - c.pos.z];
  const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const cos = d / (Math.hypot(...u) * Math.hypot(...v));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
/** มุมบิด X–A–B–Y: มุมระหว่างภาพฉายของ A→X และ B→Y บนระนาบตั้งฉากกับแกน A–B (0° = ด้านเดียวกัน) */
function dihedral(p0, p1, p2, p3) {
  const sub = (a, b) => [a.x - b.x, a.y - b.y, a.z - b.z];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const axis = sub(p2, p1);
  const al = Math.hypot(...axis);
  const u = axis.map((v) => v / al);
  const proj = (v) => { const k = dot(v, u); return v.map((x, i) => x - u[i] * k); };
  const v = proj(sub(p0, p1)); const w = proj(sub(p3, p2));
  const c = dot(v, w) / (Math.hypot(...v) * Math.hypot(...w));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/** ระยะไกลสุดของอะตอมจากระนาบที่เข้ากับทุกอะตอมดีที่สุด (least squares, เมตร) */
function planarity(atoms) {
  const n = atoms.length;
  const c = atoms.reduce((s, a) => [s[0] + a.pos.x / n, s[1] + a.pos.y / n, s[2] + a.pos.z / n], [0, 0, 0]);
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const a of atoms) {
    const d = [a.pos.x - c[0], a.pos.y - c[1], a.pos.z - c[2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] += d[i] * d[j];
  }
  // เวกเตอร์ลักษณะเฉพาะที่ค่าน้อยสุด ด้วยวิธี Jacobi
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(m[p][q]) < 1e-14) continue;
      const th = 0.5 * Math.atan2(2 * m[p][q], m[q][q] - m[p][p]);
      const cs = Math.cos(th); const sn = Math.sin(th);
      for (let k = 0; k < 3; k++) {
        const mkp = m[k][p]; const mkq = m[k][q];
        m[k][p] = cs * mkp - sn * mkq; m[k][q] = sn * mkp + cs * mkq;
      }
      for (let k = 0; k < 3; k++) {
        const mpk = m[p][k]; const mqk = m[q][k];
        m[p][k] = cs * mpk - sn * mqk; m[q][k] = sn * mpk + cs * mqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p]; const vkq = v[k][q];
        v[k][p] = cs * vkp - sn * vkq; v[k][q] = sn * vkp + cs * vkq;
      }
    }
  }
  const idx = [0, 1, 2].reduce((b, i) => (m[i][i] < m[b][b] ? i : b), 0);
  const nrm = [v[0][idx], v[1][idx], v[2][idx]];
  return Math.max(...atoms.map((a) => Math.abs((a.pos.x - c[0]) * nrm[0] + (a.pos.y - c[1]) * nrm[1] + (a.pos.z - c[2]) * nrm[2])));
}

function runCase(cs, seed) {
  const sys = new ChemSystem();
  const { heavy, all, failed } = buildSmiles(sys, BY_SYMBOL, cs.smiles);
  // ใช้เรขาคณิตจากการทดลองแบบเดียวกับแอป (ถ้าโมเลกุลมีข้อมูล)
  const comp0 = sys.componentOf(heavy[0]);
  applyExperimentalGeometry([{ comp: comp0, info: analyze(comp0) }]);
  for (let f = 0; f < 900; f++) relax(sys);
  const center = cs.center !== undefined ? heavy[cs.center] : heavy.reduce((m, a) => (a.bonds.length > m.bonds.length ? a : m), heavy[0]);
  const comp = sys.componentOf(heavy[0]);
  const info = analyze(comp);
  const nb = center.neighbors;
  const angles = [];
  for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) angles.push(angle(center, nb[i], nb[j]));
  // พันธะเรโซแนนซ์: เทียบเฉพาะพันธะไปยังอะตอมปลายชนิดเดียวกัน (เช่น O ทั้งสามใน CO₃²⁻) หรือพันธะในวง
  const terminal = center.bonds.filter((b) => b.other(center).bonds.length === 1 && b.other(center).el.symbol !== 'H');
  const bySym = new Map();
  terminal.forEach((b) => { const k = b.other(center).el.symbol; bySym.set(k, [...(bySym.get(k) || []), b]); });
  const group = [...bySym.values()].sort((x, y) => y.length - x.length)[0];
  const ringBonds = center.bonds.filter((b) => b.other(center).bonds.length > 1);
  const orders = (group && group.length >= 2 ? group : ringBonds).map((b) => +b.effectiveOrder.toFixed(2));
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
    sys, heavy,
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
  const shownShape = r.info.expShape?.en || r.shape;
  if (e.shape) add('รูปร่าง', shownShape === e.shape, shownShape || '–', e.shape);
  if (e.angles) {
    for (const want of e.angles) {
      const got = median(runs.map((x) => x.angles.reduce((best, a) => (Math.abs(a - want) < Math.abs(best - want) ? a : best), Infinity)));
      add(`มุม ~${want}°`, Math.abs(got - want) <= 6, Number.isFinite(got) ? `${got.toFixed(1)}°` : '–', `${want}°`);
    }
  }
  if (typeof e.polar === 'boolean') {
    const d = median(runs.map((x) => x.dipole));
    add('สภาพขั้ว', (d > 0.3) === e.polar, d > 0.3 ? 'มีขั้ว' : 'ไม่มีขั้ว', e.polar ? 'มีขั้ว' : 'ไม่มีขั้ว');
  }
  if (e.equalBonds) add('พันธะยาวเท่ากัน (เรโซแนนซ์)', new Set(r.orders).size <= 1, `อันดับพันธะ ${r.orders.join('/')}`, 'เท่ากันทุกพันธะ');
  if (e.planar) add('แบนราบ', median(runs.map((x) => x.flat)) < 0.004, `เบี่ยง ${(median(runs.map((x) => x.flat)) * 1000).toFixed(1)} มม.`, 'อยู่ในระนาบเดียว');
  if (e.dihedral) add(`มุมบิด ~${e.dihedral}°`, Math.abs(median(runs.map((x) => x.dih)) - e.dihedral) <= 15, `${median(runs.map((x) => x.dih)).toFixed(0)}°`, `${e.dihedral}°`);
  if (typeof e.ionic === 'boolean') add('ชนิดพันธะ', r.info.ionic === e.ionic, r.info.ionic ? 'ไอออนิก' : 'โคเวเลนต์', e.ionic ? 'ไอออนิก' : 'โคเวเลนต์');
  for (const k of Object.keys(FEATURE)) if (e[k]) add(FEATURE[k], false, 'ยังไม่มี', 'ควรมี');
  if (e.stereo === 'cis-trans') {
    const comp = r.sys.componentOf(r.heavy[0]);
    const s1 = doubleBondStereo(comp)[0];
    const p1 = dipoleMagnitude(comp) > 0.3;
    flipDoubleBond(r.sys, s1);
    for (let f = 0; f < 900; f++) relax(r.sys);
    const s2 = doubleBondStereo(comp)[0];
    const p2 = dipoleMagnitude(comp) > 0.3;
    const cisPolar = s1.cisTrans === 'cis' ? p1 : p2;
    const transPolar = s1.cisTrans === 'trans' ? p1 : p2;
    add('แยก cis/trans และสลับได้', s1.cisTrans && s2.cisTrans && s1.cisTrans !== s2.cisTrans, `${s1.cisTrans} → ${s2.cisTrans}`, 'cis ↔ trans');
    add('cis มีขั้ว / trans ไม่มีขั้ว', cisPolar && !transPolar, `cis ${cisPolar ? 'มีขั้ว' : 'ไม่มีขั้ว'}, trans ${transPolar ? 'มีขั้ว' : 'ไม่มีขั้ว'}`, 'cis มีขั้ว, trans ไม่มีขั้ว');
  }
  if (e.stereo === 'chiral') {
    const comp = r.sys.componentOf(r.heavy[0]);
    const c1 = findStereocenters(comp);
    const l1 = c1.map((c) => c.label).join(',');
    mirrorPositions(comp.atoms);
    const l2 = findStereocenters(comp).map((c) => c.label).join(',');
    add('หาคาร์บอนไครัล + ภาพในกระจกกลับ R/S', c1.length === 1 && l1 !== l2, `${c1.length} ตำแหน่ง ${l1} → กระจก ${l2}`, '1 ตำแหน่ง, R ↔ S');
  }
  if (e.network) {
    const opt = structureOptions({ info: r.info }).find((o) => o.id === 'sio2');
    const st = opt?.build();
    const ok = st && st.neighbors.length === 4 && st.neighbors.every((i) => st.sites[i].sym === 'O');
    add('แสดงโครงผลึกร่างตาข่าย', !!ok, ok ? 'Si ต่อกับ O 4 อะตอม' : 'ไม่มี', 'Si ต่อ O 4 อะตอม');
  }
  if (e.metallic) {
    const metal = r.info.metalOnly && r.sys.bonds.every((b) => bondTypeOf(b) === 'metallic');
    const st = structureOptions({ info: r.info }).find((o) => o.id === 'metal')?.build();
    add('แสดงพันธะโลหะ / ผลึกโลหะ', metal && st?.electronSea && st.neighbors.length === 8, st ? `ผลึก bcc เพื่อนบ้าน ${st.neighbors.length}, ทะเลอิเล็กตรอน` : 'ไม่มี', 'bcc 8 + ทะเลอิเล็กตรอน');
  }
  if (e.lattice) {
    const lat = latticeFor(r.info.ionGroups);
    add('แสดงโครงผลึกไอออนิก', !!lat, lat ? `${lat.th} (เลขโคออร์ดิเนชัน ${lat.cn})` : 'ไม่มีแบบจำลอง', 'โครงผลึก');
  }
  if (e.hbond) {
    const n = waterDimerHBonds();
    add('พบพันธะไฮโดรเจนระหว่างน้ำ 2 โมเลกุล', n >= 1, `${n} พันธะ`, 'อย่างน้อย 1');
  }
  if (e.bondEnergy) {
    const got = bondEnergy(r.center.bonds[0]);
    add('พลังงานพันธะ', got === e.bondEnergy, `${got} kJ/mol`, `${e.bondEnergy} kJ/mol`);
  }
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
