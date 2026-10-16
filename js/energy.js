// พลังงานพันธะเฉลี่ย (kJ/mol) — ค่ามาตรฐานในตำราเคมีทั่วไป (เช่น ตารางพลังงานพันธะเฉลี่ยใน Chemistry LibreTexts)
// ใช้สอนว่า "การสลายพันธะต้องใช้พลังงาน ส่วนการเกิดพันธะปล่อยพลังงาน"
const TABLE = {
  'H-H:1': 436, 'C-H:1': 413, 'H-N:1': 391, 'H-O:1': 463, 'F-H:1': 567, 'Cl-H:1': 431, 'Br-H:1': 366, 'H-I:1': 299,
  'H-S:1': 339, 'H-P:1': 322, 'H-Si:1': 323, 'B-H:1': 389,
  'C-C:1': 348, 'C-C:2': 614, 'C-C:3': 839, 'C-N:1': 293, 'C-N:2': 615, 'C-N:3': 891,
  'C-O:1': 358, 'C-O:2': 745, 'C-O:3': 1072, 'C-F:1': 485, 'C-Cl:1': 328, 'Br-C:1': 276, 'C-I:1': 240,
  'C-S:1': 259, 'C-S:2': 577, 'C-Si:1': 301,
  'N-N:1': 163, 'N-N:2': 418, 'N-N:3': 941, 'N-O:1': 201, 'N-O:2': 607, 'F-N:1': 272, 'Cl-N:1': 200,
  'O-O:1': 146, 'O-O:2': 495, 'F-O:1': 190, 'Cl-O:1': 203, 'O-Si:1': 452, 'O-S:1': 265, 'O-S:2': 523,
  'O-P:1': 335, 'O-P:2': 544,
  'F-F:1': 155, 'Cl-Cl:1': 242, 'Br-Br:1': 193, 'I-I:1': 151, 'Cl-F:1': 253, 'S-S:1': 266, 'F-S:1': 327,
  'Cl-S:1': 253, 'Cl-P:1': 326, 'F-P:1': 490, 'B-F:1': 646, 'B-Cl:1': 444, 'F-Si:1': 565, 'Cl-Si:1': 381,
  'Si-Si:1': 226, 'F-Xe:1': 130,
};
// พันธะ C=O ใน CO₂ แข็งแรงกว่าค่าเฉลี่ยของคาร์บอนิล
const CO2_DOUBLE = 799;

/** พลังงานพันธะ (kJ/mol) หรือ null ถ้าไม่มีข้อมูล — พันธะเรโซแนนซ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก */
export function bondEnergy(bond) {
  const [s1, s2] = [bond.a.el.symbol, bond.b.el.symbol].sort();
  const order = bond.resonance ?? bond.order;
  const lo = Math.floor(order);
  const hi = Math.ceil(order);
  const get = (o) => {
    if (o === 2 && s1 === 'C' && s2 === 'O') {
      const c = bond.a.el.symbol === 'C' ? bond.a : bond.b;
      if (c.bonds.length === 2 && c.neighbors.every((n) => n.el.symbol === 'O')) return CO2_DOUBLE;
    }
    return TABLE[`${s1}-${s2}:${o}`] ?? null;
  };
  const a = get(lo);
  const b = get(hi);
  if (a == null || b == null) return null;
  return Math.round(a + (b - a) * (order - lo));
}

/** รวมพลังงานพันธะทั้งโมเลกุล — { total, known, missing } */
export function moleculeBondEnergy(bonds) {
  let total = 0;
  let missing = 0;
  for (const b of bonds) {
    const e = bondEnergy(b);
    if (e == null) missing++;
    else total += e;
  }
  return { total, missing, known: bonds.length - missing };
}
