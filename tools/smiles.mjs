// ตัวแปลง SMILES แบบย่อ สำหรับเครื่องมือตรวจสอบ (รองรับ: อะตอมกลุ่ม organic, [วงเล็บเหลี่ยม] พร้อม H/ประจุ,
// พันธะ - = #, กิ่ง ( ), เลขปิดวงหนึ่งหลัก) — ไม่รองรับอะโรมาติกตัวพิมพ์เล็ก ให้เขียนแบบเคคูเล
const ORGANIC = ['Cl', 'Br', 'B', 'C', 'N', 'O', 'P', 'S', 'F', 'I'];
const DEFAULT_VALENCE = { B: [3], C: [4], N: [3, 5], O: [2], P: [3, 5], S: [2, 4, 6], F: [1], Cl: [1, 3, 5, 7], Br: [1, 3, 5], I: [1, 3, 5, 7] };

/** คืนค่า { atoms: [{ sym, charge, h }], bonds: [[i, j, order]] } โดยเติม H แฝงให้อะตอมกลุ่ม organic */
export function parseSmiles(smi) {
  const atoms = [];
  const bonds = [];
  const stack = [];
  const rings = {};
  let prev = null;
  let order = 1;
  let i = 0;
  const addAtom = (a) => {
    atoms.push(a);
    const idx = atoms.length - 1;
    if (prev !== null) bonds.push([prev, idx, order]);
    prev = idx;
    order = 1;
  };
  while (i < smi.length) {
    const ch = smi[i];
    if (ch === '[') {
      const end = smi.indexOf(']', i);
      const body = smi.slice(i + 1, end);
      const m = body.match(/^([A-Z][a-z]?)(H(\d*))?([+-]+\d*|[+-]\d+)?$/);
      if (!m) throw new Error('bad bracket ' + body);
      let charge = 0;
      if (m[4]) {
        const sign = m[4][0] === '+' ? 1 : -1;
        const digits = m[4].replace(/[+-]/g, '');
        charge = sign * (digits ? Number(digits) : m[4].length);
      }
      addAtom({ sym: m[1], charge, h: m[2] ? Number(m[3] || 1) : 0, bracket: true });
      i = end + 1;
    } else if (ch === '(') { stack.push(prev); i++; } else if (ch === ')') { prev = stack.pop(); i++; } else if (ch === '-') { order = 1; i++; } else if (ch === '=') { order = 2; i++; } else if (ch === '#') { order = 3; i++; } else if (/\d/.test(ch)) {
      if (rings[ch] !== undefined) { bonds.push([rings[ch].atom, prev, Math.max(order, rings[ch].order)]); delete rings[ch]; order = 1; } else { rings[ch] = { atom: prev, order }; order = 1; }
      i++;
    } else {
      const sym = ORGANIC.find((s) => smi.startsWith(s, i));
      if (!sym) throw new Error('unknown token at ' + smi.slice(i));
      addAtom({ sym, charge: 0, h: null });
      i += sym.length;
    }
  }
  // H แฝง
  atoms.forEach((a, idx) => {
    if (a.h !== null) return;
    const used = bonds.reduce((s, [x, y, o]) => s + (x === idx || y === idx ? o : 0), 0);
    const v = DEFAULT_VALENCE[a.sym].find((x) => x >= used) ?? used;
    a.h = v - used;
  });
  return { atoms, bonds };
}

/** สร้างโมเลกุลในระบบเคมีของแอปจาก SMILES — คืนค่าอะตอมหลัก (ไม่รวม H) และอะตอมทั้งหมด */
export function buildSmiles(sys, BY_SYMBOL, smi, place = () => ({ x: Math.random() * 0.2, y: Math.random() * 0.2, z: Math.random() * 0.2 })) {
  const { atoms, bonds } = parseSmiles(smi);
  const made = atoms.map((a) => sys.addAtom(BY_SYMBOL[a.sym], place()));
  const all = [...made];
  const failed = [];
  atoms.forEach((a, idx) => {
    for (let k = 0; k < a.h; k++) {
      const h = sys.addAtom(BY_SYMBOL.H, place());
      all.push(h);
      if (!sys.addBond(made[idx], h)) failed.push(`${a.sym}-H`);
    }
  });
  for (const [x, y] of bonds) if (!sys.addBond(made[x], made[y])) failed.push(`${atoms[x].sym}-${atoms[y].sym}`);
  atoms.forEach((a, idx) => {
    for (let k = 0; k < Math.abs(a.charge); k++) sys.addCharge(made[idx], Math.sign(a.charge));
  });
  return { heavy: made, all, failed };
}
