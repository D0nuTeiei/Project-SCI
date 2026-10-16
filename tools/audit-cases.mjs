// ชุดกรณีทดสอบเทียบกับข้อมูลจริง: ค่าทดลอง (มุมพันธะ, สภาพขั้ว, ความยาวพันธะ) และข้อค้นพบจากงานวิจัยการศึกษา
// expect.angles = มุมพันธะจากการทดลองที่อะตอมกลาง (องศา), expect.polar = มีโมเมนต์ขั้วคู่จริงหรือไม่,
// expect.equalBonds = พันธะรอบอะตอมกลางยาวเท่ากันจริง (จากเรโซแนนซ์), expect.complete = โครงสร้าง Lewis ที่ถูกต้องมีอยู่
// ref = รหัสแหล่งอ้างอิงใน docs/research-gap-analysis.md

export const CASES = [
  // ---------- รูปร่างโมเลกุลพื้นฐาน (VSEPR) ----------
  { group: 'vsepr', th: 'น้ำ', smiles: 'O', expect: { name: 'Water', shape: 'Bent', angles: [104.5], polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'แอมโมเนีย', smiles: 'N', expect: { name: 'Ammonia', shape: 'Trigonal pyramidal', angles: [106.7], polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'มีเทน', smiles: 'C', expect: { name: 'Methane', shape: 'Tetrahedral', angles: [109.5], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'คาร์บอนไดออกไซด์', smiles: 'O=C=O', expect: { name: 'Carbon dioxide', shape: 'Linear', angles: [180], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'โบรอนไตรฟลูออไรด์', smiles: 'FB(F)F', expect: { name: 'Boron trifluoride', shape: 'Trigonal planar', angles: [120], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'เบริลเลียมคลอไรด์ (แก๊ส)', smiles: 'Cl[Be]Cl', expect: { name: 'Beryllium chloride', shape: 'Linear', angles: [180], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ซัลเฟอร์ไดออกไซด์', smiles: 'O=S=O', expect: { name: 'Sulfur dioxide', shape: 'Bent', angles: [119.3], polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ซัลเฟอร์ไตรออกไซด์', smiles: 'O=S(=O)=O', expect: { name: 'Sulfur trioxide', shape: 'Trigonal planar', angles: [120], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ฟอสฟอรัสเพนตะคลอไรด์', smiles: 'ClP(Cl)(Cl)(Cl)Cl', expect: { name: 'Phosphorus pentachloride', shape: 'Trigonal bipyramidal', angles: [90, 120, 180], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ซัลเฟอร์เฮกซะฟลูออไรด์', smiles: 'FS(F)(F)(F)(F)F', expect: { name: 'Sulfur hexafluoride', shape: 'Octahedral', angles: [90, 180], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ซัลเฟอร์เตตระฟลูออไรด์', smiles: 'FS(F)(F)F', expect: { name: 'Sulfur tetrafluoride', shape: 'Seesaw', angles: [173.1, 101.6], polar: true }, ref: 'VSEPRTABLE' },
  { group: 'vsepr', th: 'คลอรีนไตรฟลูออไรด์', smiles: 'FCl(F)F', expect: { name: 'Chlorine trifluoride', shape: 'T-shaped', angles: [87.5, 175], polar: true }, ref: 'VSEPRTABLE' },
  { group: 'vsepr', th: 'ซีนอนเตตระฟลูออไรด์', smiles: 'F[Xe](F)(F)F', expect: { name: 'Xenon tetrafluoride', shape: 'Square planar', angles: [90, 180], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ซีนอนไดฟลูออไรด์', smiles: 'F[Xe]F', expect: { name: 'Xenon difluoride', shape: 'Linear', angles: [180], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'โบรมีนเพนตะฟลูออไรด์', smiles: 'FBr(F)(F)(F)F', expect: { name: 'Bromine pentafluoride', shape: 'Square pyramidal', angles: [84.8], polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ออกซิเจนไดฟลูออไรด์', smiles: 'FOF', expect: { name: 'Oxygen difluoride', shape: 'Bent', angles: [103.1], polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ฟอร์มาลดีไฮด์ (มุม H–C–H)', smiles: 'C=O', center: 0, expect: { name: 'Formaldehyde', shape: 'Trigonal planar', angles: [116.5, 121.8], polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'เอทีน (มุม H–C–H)', smiles: 'C=C', center: 0, expect: { name: 'Ethene (ethylene)', shape: 'Trigonal planar', angles: [117.4, 121.3], polar: false, planar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'เอไทน์', smiles: 'C#C', center: 0, expect: { name: 'Ethyne (acetylene)', shape: 'Linear', angles: [180], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ไฮโดรเจนไซยาไนด์', smiles: 'C#N', center: 0, expect: { name: 'Hydrogen cyanide', shape: 'Linear', angles: [180], polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ไดคลอโรมีเทน', smiles: 'ClCCl', center: 1, expect: { name: 'Dichloromethane', shape: 'Tetrahedral', polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'คาร์บอนเตตระคลอไรด์', smiles: 'ClC(Cl)(Cl)Cl', center: 1, expect: { name: 'Carbon tetrachloride', shape: 'Tetrahedral', angles: [109.5], polar: false }, ref: 'CCCBDB' },
  { group: 'vsepr', th: 'ไนโตรเจนไตรฟลูออไรด์', smiles: 'FN(F)F', center: 1, expect: { name: 'Nitrogen trifluoride', shape: 'Trigonal pyramidal', angles: [102.2], polar: true }, ref: 'CCCBDB' },

  // ---------- ข้อยกเว้นของ VSEPR ที่พบจากการทดลอง ----------
  { group: 'vsepr-limit', th: 'ไฮโดรเจนซัลไฟด์ (มุมแคบกว่าน้ำมาก)', smiles: 'S', expect: { name: 'Hydrogen sulfide', shape: 'Bent', angles: [92.1], polar: true }, ref: 'CCCBDB', note: 'ไฮไดรด์ของธาตุคาบ 3 ขึ้นไปมีมุมใกล้ 90° เพราะออร์บิทัล s และ p ผสมกันน้อย VSEPR อย่างง่ายทำนายได้แค่ว่า "เล็กกว่า 109.5°"' },
  { group: 'vsepr-limit', th: 'ฟอสฟีน', smiles: 'P', expect: { name: 'Phosphine', shape: 'Trigonal pyramidal', angles: [93.3], polar: true }, ref: 'CCCBDB' },
  { group: 'vsepr-limit', th: 'แคลเซียมฟลูออไรด์ (แก๊ส) งอ', smiles: 'F[Ca]F', expect: { shape: 'Bent', angles: [140], polar: true }, ref: 'OHIO1969', note: 'VSEPR ทำนายเส้นตรง แต่การทดลองพบว่า CaF₂, SrF₂, BaF₂ ในสถานะแก๊สงอ (~140°, ~108°, ~100°)' },
  { group: 'vsepr-limit', th: 'แบเรียมฟลูออไรด์ (แก๊ส) งอ', smiles: 'F[Ba]F', expect: { shape: 'Bent', angles: [100], polar: true }, ref: 'OHIO1969' },
  { group: 'vsepr-limit', th: 'NO₂ (อนุมูลอิสระ) มุมกว้างกว่า 120°', smiles: '[O][N][O]', expect: { name: 'Nitrogen dioxide', complete: false, angles: [134], polar: true }, ref: 'GEOM-WEB', note: 'อิเล็กตรอนเดี่ยว 1 ตัวผลักน้อยกว่าคู่อิเล็กตรอน มุมจึงกว้าง (~134°) แต่แบบจำลองนับเป็นคู่โดดเดี่ยวเต็มคู่' },
  { group: 'vsepr-limit', th: 'ไฮโดรเจนเปอร์ออกไซด์ (มุมบิด)', smiles: 'OO', expect: { name: 'Hydrogen peroxide', polar: true, dihedral: 111.5 }, ref: 'CCCBDB' },

  // ---------- ประจุฟอร์มอลและเรโซแนนซ์ ----------
  { group: 'resonance', th: 'โอโซน', smiles: 'O=[O+][O-]', center: 1, expect: { name: 'Ozone', shape: 'Bent', angles: [116.8], polar: true, equalBonds: true }, ref: 'GEOM-WEB', note: 'พันธะ O–O ทั้งสองยาวเท่ากัน (128 pm) และโอโซนมีขั้ว (0.53 D) ทั้งที่เป็นธาตุเดียวกัน' },
  { group: 'resonance', th: 'คาร์บอเนตไอออน', smiles: '[O-]C(=O)[O-]', center: 1, expect: { name: 'Carbonate ion', shape: 'Trigonal planar', angles: [120], equalBonds: true }, ref: 'RES-RSC' },
  { group: 'resonance', th: 'ไนเตรตไอออน', smiles: '[O-][N+](=O)[O-]', center: 1, expect: { name: 'Nitrate ion', shape: 'Trigonal planar', angles: [120], equalBonds: true }, ref: 'RES-RSC' },
  { group: 'resonance', th: 'แอซีเตตไอออน', smiles: 'CC(=O)[O-]', center: 1, expect: { name: 'Acetate ion', equalBonds: true }, ref: 'RES-RSC' },
  { group: 'resonance', th: 'เบนซีน', smiles: 'C1=CC=CC=C1', center: 0, expect: { name: 'Benzene', angles: [120], polar: false, equalBonds: true, planar: true }, ref: 'RES-RSC', note: 'C–C ทุกพันธะยาว 139 pm เท่ากัน นักเรียน 78% มองโครงสร้างเคคูเลสองแบบว่าเป็นคนละโมเลกุล' },
  { group: 'resonance', th: 'ซัลเฟตไอออน', smiles: '[O-]S(=O)(=O)[O-]', center: 1, expect: { name: 'Sulfate ion', shape: 'Tetrahedral', angles: [109.5], equalBonds: true }, ref: 'RES-RSC' },
  { group: 'resonance', th: 'คาร์บอนมอนอกไซด์', smiles: '[C-]#[O+]', center: 0, expect: { name: 'Carbon monoxide', polar: true }, ref: 'CCCBDB', note: 'โมเมนต์ขั้วคู่เล็กมาก (0.11 D) และขั้วลบอยู่ที่ C ไม่ใช่ O ตามที่ EN ทำนาย' },
  { group: 'resonance', th: 'ไนตรัสออกไซด์', smiles: 'N#[N+][O-]', center: 1, expect: { name: 'Nitrous oxide (laughing gas)', shape: 'Linear', angles: [180], polar: true }, ref: 'CCCBDB' },
  { group: 'resonance', th: 'เอไซด์ไอออน', smiles: '[N-]=[N+]=[N-]', center: 1, expect: { shape: 'Linear', angles: [180] }, ref: 'CCCBDB' },
  { group: 'resonance', th: 'ไนโตรมีเทน', smiles: 'C[N+](=O)[O-]', center: 1, expect: { equalBonds: true, polar: true }, ref: 'CCCBDB' },

  // ---------- ไอออนและประจุ ----------
  { group: 'ions', th: 'แอมโมเนียมไอออน', smiles: '[NH4+]', expect: { name: 'Ammonium ion', shape: 'Tetrahedral', angles: [109.5] }, ref: 'CCCBDB' },
  { group: 'ions', th: 'ไฮโดรเนียมไอออน', smiles: '[OH3+]', expect: { name: 'Hydronium ion', shape: 'Trigonal pyramidal', angles: [111] }, ref: 'GEOM-WEB' },
  { group: 'ions', th: 'เมทิลแคตไอออน (คาร์โบแคตไอออน)', smiles: '[CH3+]', expect: { shape: 'Trigonal planar', angles: [120] }, ref: 'CCCBDB' },
  { group: 'ions', th: 'เมทิลแอนไอออน (คาร์แบนไอออน)', smiles: '[CH3-]', expect: { shape: 'Trigonal pyramidal' }, ref: 'CCCBDB' },
  { group: 'ions', th: 'เอไมด์ไอออน NH₂⁻', smiles: '[NH2-]', expect: { shape: 'Bent', angles: [104] }, ref: 'CCCBDB' },
  { group: 'ions', th: 'ไกลซีนแบบสวิตเตอร์ไอออน', smiles: '[NH3+]CC(=O)[O-]', expect: { name: 'Glycine' }, ref: 'BIOCHEM', note: 'ในน้ำและในผลึก กรดแอมิโนอยู่ในรูป ⁺H₃N–CH₂–COO⁻ ไม่ใช่ H₂N–CH₂–COOH' },
  { group: 'ions', th: 'สารประกอบเติม NH₃·BF₃ (พันธะโคออร์ดิเนต)', smiles: '[NH3+][B-](F)(F)F', expect: { complete: true, polar: true }, ref: 'CCCBDB' },
  { group: 'ions', th: 'อนุมูลไฮดรอกซิล', smiles: '[OH]', expect: { complete: false, radicalName: 'Hydroxyl radical' }, ref: 'CCCBDB' },
  { group: 'ions', th: 'อนุมูลเมทิล', smiles: '[CH3]', expect: { complete: false, shape: 'Trigonal planar', radicalName: 'Methyl radical' }, ref: 'CCCBDB' },

  // ---------- พันธะไอออนิก โลหะ และโครงผลึกร่างตาข่าย (ความเข้าใจผิดจากงานวิจัย) ----------
  { group: 'structure', th: 'โซเดียมคลอไรด์', smiles: '[Na]Cl', expect: { lattice: true }, ref: 'TABER2012', note: 'งานวิจัยพบนักเรียนจำนวนมากคิดว่า NaCl เป็น "โมเลกุล" คู่ Na–Cl ที่จับกันเป็นคู่ ๆ ของจริงคือผลึกที่ Na⁺ แต่ละตัวล้อมด้วย Cl⁻ 6 ตัว' },
  { group: 'structure', th: 'แมกนีเซียมออกไซด์', smiles: '[Mg]=O', expect: { lattice: true }, ref: 'TABER2012', note: 'แบบจำลองวาดเป็นพันธะคู่ Mg=O ซึ่งอาจทำให้เข้าใจผิดว่าเป็นการใช้อิเล็กตรอนร่วมกัน' },
  { group: 'structure', th: 'ซิลิคอนไดออกไซด์', smiles: 'O=[Si]=O', expect: { network: true }, ref: 'SCHMIDT2009', note: 'SiO₂ จริงเป็นโครงผลึกร่างตาข่าย Si แต่ละอะตอมต่อกับ O 4 อะตอม ไม่ใช่โมเลกุล O=Si=O' },
  { group: 'structure', th: 'โซเดียม 2 อะตอม (ทดสอบพันธะโลหะ)', smiles: '[Na][Na]', expect: { metallic: true }, ref: 'TABER2023', note: 'โลหะยึดกันด้วยพันธะโลหะ (ทะเลอิเล็กตรอน) ไม่ได้เกิดเป็นโมเลกุล Na₂ ในสถานะของแข็ง' },
  { group: 'structure', th: 'ปรอท(II) คลอไรด์ (เป็นโมเลกุลโคเวเลนต์จริง)', smiles: 'Cl[Hg]Cl', expect: { ionic: false, shape: 'Linear', angles: [180] }, ref: 'FAJANS', note: 'HgCl₂ เป็นโมเลกุลเส้นตรง ระเหิดได้ ละลายน้ำแล้วแตกตัวน้อย กฎ "โลหะ+อโลหะ = ไอออนิก" ใช้ไม่ได้' },
  { group: 'structure', th: 'ไทเทเนียมเตตระคลอไรด์ (ของเหลวโคเวเลนต์)', smiles: 'Cl[Ti](Cl)(Cl)Cl', expect: { ionic: false, shape: 'Tetrahedral' }, ref: 'FAJANS', note: 'TiCl₄ เป็นของเหลวจุดเดือด 136 °C แสดงว่าเป็นโมเลกุลโคเวเลนต์' },
  { group: 'structure', th: 'อะลูมิเนียมคลอไรด์ไดเมอร์ Al₂Cl₆', smiles: 'Cl[Al-]1(Cl)[Cl+][Al-](Cl)(Cl)[Cl+]1', expect: { complete: true, ionic: false }, ref: 'FAJANS', note: 'ในแก๊ส AlCl₃ จับคู่เป็น Al₂Cl₆ ผ่าน Cl สะพาน (พันธะโคออร์ดิเนต)' },
  { group: 'structure', th: 'ไดโบเรน B₂H₆ (พันธะ 3 ศูนย์กลาง)', smiles: '[BH2]1[H][BH2][H]1', expect: { buildable: true }, ref: 'CCCBDB', note: 'H สะพานต่อกับ B สองอะตอม (พันธะ 3 ศูนย์กลาง 2 อิเล็กตรอน)' },

  // ---------- ไอโซเมอร์เชิงพื้นที่ ----------
  { group: 'stereo', th: 'cis/trans-1,2-ไดคลอโรเอทีน', smiles: 'ClC=CCl', center: 1, expect: { stereo: 'cis-trans' }, ref: 'CCCBDB', note: 'สูตรและการต่อเหมือนกันแต่ต่างกันที่การจัดตัวรอบพันธะคู่ ทำให้สภาพขั้วต่างกัน' },
  { group: 'stereo', th: 'อะลานีน (ไครัล L/D)', smiles: 'CC(N)C(=O)O', expect: { name: 'Alanine', stereo: 'chiral' }, ref: 'STEREO-RSC', note: 'มีอะตอมคาร์บอนไครัล ภาพสะท้อนในกระจกซ้อนทับกันไม่ได้ (โปรตีนใช้แบบ L)' },
  { group: 'stereo', th: 'นีโอเพนเทน (ไอโซเมอร์โครงสร้างของเพนเทน)', smiles: 'CC(C)(C)C', expect: { name: 'Neopentane' }, ref: 'CCCBDB' },
  { group: 'stereo', th: 'ไอโซเพนเทน', smiles: 'CC(C)CC', expect: { name: 'Isopentane' }, ref: 'CCCBDB' },

  // ---------- แรงยึดเหนี่ยวระหว่างโมเลกุลและพลังงานพันธะ ----------
  { group: 'imf', th: 'พันธะไฮโดรเจนระหว่างโมเลกุลน้ำ', smiles: 'O', expect: { hbond: true }, ref: 'SCHMIDT2009', note: 'นักเรียนจำนวนมากคิดว่าการเดือดคือการสลายพันธะโคเวเลนต์ O–H จึงควรแสดงพันธะไฮโดรเจนระหว่างโมเลกุลแยกจากพันธะในโมเลกุล' },
  { group: 'imf', th: 'พลังงานพันธะ (สร้าง/สลาย)', smiles: '[H][H]', expect: { bondEnergy: 436 }, ref: 'BOO1998', note: 'นักเรียนเกือบครึ่ง (23/48) คิดว่าการสลายพันธะปล่อยพลังงาน ของจริงต้องใช้พลังงาน 436 kJ/mol เพื่อสลาย H–H' },
];
