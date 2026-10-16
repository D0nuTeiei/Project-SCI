// ฐานข้อมูลโมเลกุลที่ระบบจดจำได้ (ไม่พึ่งพา three.js)
// f = สูตรที่ใช้แสดง, test = เงื่อนไขโครงสร้างเพิ่มเติม (ใช้แยกไอโซเมอร์)

// ---------- ตัวช่วยตรวจโครงสร้าง ----------
const nb = (atom) => atom.bonds.map((b) => (b.a === atom ? b.b : b.a));
const sym = (atom) => atom.el.symbol;
const countNb = (atom, s) => nb(atom).filter((n) => sym(n) === s).length;
const anyAtom = (comp, s, pred) => comp.atoms.some((a) => sym(a) === s && pred(a));
const hasBond = (comp, s1, s2) => comp.bonds.some(
  (b) => (sym(b.a) === s1 && sym(b.b) === s2) || (sym(b.a) === s2 && sym(b.b) === s1));

const MOLECULES = [
  // แก๊ส/ธาตุโมเลกุลคู่
  { f: 'H2', th: 'แก๊สไฮโดรเจน', en: 'Hydrogen', dTh: 'แก๊สที่เบาที่สุด ใช้เป็นเชื้อเพลิงสะอาด เผาไหม้แล้วได้น้ำ', dEn: 'The lightest gas; a clean fuel that burns to water.' },
  { f: 'O2', th: 'แก๊สออกซิเจน', en: 'Oxygen', dTh: 'มีพันธะคู่ O=O จำเป็นต่อการหายใจและการเผาไหม้', dEn: 'Has an O=O double bond; needed for respiration and combustion.' },
  { f: 'N2', th: 'แก๊สไนโตรเจน', en: 'Nitrogen', dTh: 'พันธะสาม N≡N แข็งแรงมาก พบในอากาศประมาณ 78%', dEn: 'A very strong N≡N triple bond; ~78% of air.' },
  { f: 'F2', th: 'แก๊สฟลูออรีน', en: 'Fluorine', dTh: 'อโลหะที่ว่องไวต่อปฏิกิริยามากที่สุด', dEn: 'The most reactive nonmetal.' },
  { f: 'Cl2', th: 'แก๊สคลอรีน', en: 'Chlorine', dTh: 'แก๊สสีเขียวอมเหลือง ใช้ฆ่าเชื้อโรคในน้ำประปา', dEn: 'Yellow-green gas used to disinfect tap water.' },
  { f: 'Br2', th: 'โบรมีน', en: 'Bromine', dTh: 'อโลหะชนิดเดียวที่เป็นของเหลวที่อุณหภูมิห้อง', dEn: 'The only nonmetal that is liquid at room temperature.' },
  { f: 'I2', th: 'ไอโอดีน', en: 'Iodine', dTh: 'ของแข็งสีม่วงเข้ม ระเหิดได้ ใช้ทดสอบแป้ง', dEn: 'Dark violet solid that sublimes; used to test for starch.' },

  // สารประกอบไฮโดรเจน
  { f: 'H2O', th: 'น้ำ', en: 'Water', dTh: 'รูปร่างมุมงอ (~104.5°) เพราะ O มีอิเล็กตรอนคู่โดดเดี่ยว 2 คู่ จึงเป็นโมเลกุลมีขั้ว', dEn: 'Bent (~104.5°) because O has two lone pairs, so it is polar.' },
  { f: 'H2O2', th: 'ไฮโดรเจนเปอร์ออกไซด์', en: 'Hydrogen peroxide', dTh: 'มีพันธะ O–O ใช้ฆ่าเชื้อและฟอกสี', dEn: 'Contains an O–O bond; used as disinfectant and bleach.' },
  { f: 'NH3', th: 'แอมโมเนีย', en: 'Ammonia', dTh: 'พีระมิดฐานสามเหลี่ยม (~107°) ใช้ผลิตปุ๋ย', dEn: 'Trigonal pyramidal (~107°); used to make fertilizers.' },
  { f: 'CH4', th: 'มีเทน', en: 'Methane', dTh: 'ทรงสี่หน้า (109.5°) องค์ประกอบหลักของแก๊สธรรมชาติและแก๊สชีวภาพ', dEn: 'Tetrahedral (109.5°); main component of natural gas and biogas.' },
  { f: 'HF', th: 'ไฮโดรเจนฟลูออไรด์', en: 'Hydrogen fluoride', dTh: 'พันธะมีขั้วสูงมาก ใช้กัดแก้ว', dEn: 'A very polar bond; used to etch glass.' },
  { f: 'HCl', th: 'ไฮโดรเจนคลอไรด์', en: 'Hydrogen chloride', dTh: 'ละลายน้ำได้กรดไฮโดรคลอริก ซึ่งพบในกระเพาะอาหาร', dEn: 'Dissolves in water to form hydrochloric acid, found in the stomach.' },
  { f: 'HBr', th: 'ไฮโดรเจนโบรไมด์', en: 'Hydrogen bromide', dTh: 'แก๊สที่ละลายน้ำได้กรดแก่', dEn: 'A gas that forms a strong acid in water.' },
  { f: 'HI', th: 'ไฮโดรเจนไอโอไดด์', en: 'Hydrogen iodide', dTh: 'ละลายน้ำได้กรดไฮโดรไอโอดิก ซึ่งเป็นกรดแก่', dEn: 'Forms hydroiodic acid, a strong acid.' },
  { f: 'H2S', th: 'ไฮโดรเจนซัลไฟด์', en: 'Hydrogen sulfide', dTh: 'แก๊สพิษกลิ่นไข่เน่า รูปร่างมุมงอเหมือนน้ำ', dEn: 'Toxic gas that smells like rotten eggs; bent like water.' },
  { f: 'PH3', th: 'ฟอสฟีน', en: 'Phosphine', dTh: 'แก๊สพิษ รูปร่างพีระมิดฐานสามเหลี่ยม', dEn: 'A toxic gas with a trigonal pyramidal shape.' },
  { f: 'N2H4', th: 'ไฮดราซีน', en: 'Hydrazine', dTh: 'ใช้เป็นเชื้อเพลิงจรวด', dEn: 'Used as a rocket fuel.' },

  // ออกไซด์ของอโลหะ
  { f: 'CO2', th: 'คาร์บอนไดออกไซด์', en: 'Carbon dioxide', dTh: 'โมเลกุลเส้นตรง O=C=O ไม่มีขั้ว เป็นแก๊สเรือนกระจก', dEn: 'Linear O=C=O, nonpolar; a greenhouse gas.' },
  { f: 'CO', th: 'คาร์บอนมอนอกไซด์', en: 'Carbon monoxide', allowIncomplete: true, dTh: 'แก๊สพิษไม่มีสีไม่มีกลิ่น ของจริงมีพันธะสาม (มีพันธะโคออร์ดิเนต) ซึ่งแบบจำลองนี้แสดงไม่ได้', dEn: 'Toxic, colourless gas. Really a triple bond (with a dative bond) that this simple model cannot show.' },
  { f: 'SO2', th: 'ซัลเฟอร์ไดออกไซด์', en: 'Sulfur dioxide', dTh: 'รูปร่างมุมงอ เป็นสาเหตุของฝนกรด', dEn: 'Bent; a cause of acid rain.' },
  { f: 'SO3', th: 'ซัลเฟอร์ไตรออกไซด์', en: 'Sulfur trioxide', dTh: 'สามเหลี่ยมแบนราบ ใช้ผลิตกรดซัลฟิวริก', dEn: 'Trigonal planar; used to make sulfuric acid.' },
  { f: 'SiO2', th: 'ซิลิคอนไดออกไซด์', en: 'Silicon dioxide', dTh: 'องค์ประกอบของทรายและแก้ว (ของจริงเป็นโครงผลึกร่างตาข่าย)', dEn: 'Sand and glass (really a giant covalent network).' },

  // กรด
  { f: 'H2SO4', th: 'กรดซัลฟิวริก', en: 'Sulfuric acid', test: (c) => anyAtom(c, 'S', (s) => countNb(s, 'O') === 4), dTh: 'กรดแก่ ใช้ในแบตเตอรี่รถยนต์', dEn: 'A strong acid used in car batteries.' },
  { f: 'HNO3', th: 'กรดไนตริก', en: 'Nitric acid', test: (c) => anyAtom(c, 'N', (n) => countNb(n, 'O') === 3), dTh: 'กรดแก่ ใช้ผลิตปุ๋ยและวัตถุระเบิด', dEn: 'A strong acid used for fertilizers and explosives.' },
  { f: 'H3PO4', th: 'กรดฟอสฟอริก', en: 'Phosphoric acid', test: (c) => anyAtom(c, 'P', (p) => countNb(p, 'O') === 4), dTh: 'พบในน้ำอัดลมประเภทโคลา', dEn: 'Found in cola drinks.' },
  { f: 'HOCl', th: 'กรดไฮโปคลอรัส', en: 'Hypochlorous acid', test: (c) => hasBond(c, 'O', 'Cl') && hasBond(c, 'O', 'H'), dTh: 'สารฆ่าเชื้อในน้ำยาฟอกขาว', dEn: 'The disinfectant in bleach solutions.' },
  { f: 'HCN', th: 'ไฮโดรเจนไซยาไนด์', en: 'Hydrogen cyanide', dTh: 'มีพันธะสาม C≡N เป็นสารพิษร้ายแรง', dEn: 'Contains a C≡N triple bond; highly toxic.' },

  // ฮาไลด์/อื่น ๆ
  { f: 'BF3', th: 'โบรอนไตรฟลูออไรด์', en: 'Boron trifluoride', dTh: 'สามเหลี่ยมแบนราบ 120° (B มีอิเล็กตรอนวงนอกไม่ครบ 8)', dEn: 'Trigonal planar 120° (B has an incomplete octet).' },
  { f: 'BeCl2', th: 'เบริลเลียมคลอไรด์', en: 'Beryllium chloride', dTh: 'โมเลกุลเส้นตรง 180°', dEn: 'Linear, 180°.' },
  { f: 'PCl3', th: 'ฟอสฟอรัสไตรคลอไรด์', en: 'Phosphorus trichloride', dTh: 'พีระมิดฐานสามเหลี่ยม', dEn: 'Trigonal pyramidal.' },
  { f: 'PCl5', th: 'ฟอสฟอรัสเพนตะคลอไรด์', en: 'Phosphorus pentachloride', dTh: 'พีระมิดคู่ฐานสามเหลี่ยม (P มีอิเล็กตรอนเกิน 8)', dEn: 'Trigonal bipyramidal (expanded octet).' },
  { f: 'SF6', th: 'ซัลเฟอร์เฮกซะฟลูออไรด์', en: 'Sulfur hexafluoride', dTh: 'ทรงแปดหน้า ใช้เป็นฉนวนไฟฟ้าแรงสูง', dEn: 'Octahedral; used as a high-voltage insulator.' },
  { f: 'XeF2', th: 'ซีนอนไดฟลูออไรด์', en: 'Xenon difluoride', dTh: 'แก๊สมีตระกูลก็เกิดสารประกอบได้! รูปร่างเส้นตรง', dEn: 'Even noble gases can react! Linear shape.' },
  { f: 'XeF4', th: 'ซีนอนเตตระฟลูออไรด์', en: 'Xenon tetrafluoride', dTh: 'สี่เหลี่ยมแบนราบ (Xe มีอิเล็กตรอนคู่โดดเดี่ยว 2 คู่)', dEn: 'Square planar (Xe has two lone pairs).' },
  { f: 'CCl4', th: 'คาร์บอนเตตระคลอไรด์', en: 'Carbon tetrachloride', dTh: 'ทรงสี่หน้า ไม่มีขั้วแม้พันธะมีขั้ว', dEn: 'Tetrahedral and nonpolar although its bonds are polar.' },
  { f: 'CHCl3', th: 'คลอโรฟอร์ม', en: 'Chloroform', dTh: 'ตัวทำละลาย เคยใช้เป็นยาสลบ', dEn: 'A solvent once used as an anaesthetic.' },
  { f: 'CH2Cl2', th: 'ไดคลอโรมีเทน', en: 'Dichloromethane', dTh: 'ตัวทำละลายที่ใช้มากในห้องปฏิบัติการ', dEn: 'A common laboratory solvent.' },
  { f: 'CH3Cl', th: 'คลอโรมีเทน', en: 'Chloromethane', dTh: 'แก๊สที่เกิดตามธรรมชาติจากมหาสมุทร', dEn: 'A gas produced naturally by oceans.' },

  // สารอินทรีย์
  { f: 'C2H6', th: 'อีเทน', en: 'Ethane', dTh: 'แอลเคน มีพันธะเดี่ยวทั้งหมด', dEn: 'An alkane with only single bonds.' },
  { f: 'C2H4', th: 'เอทีน (เอทิลีน)', en: 'Ethene (ethylene)', dTh: 'มีพันธะคู่ C=C เป็นฮอร์โมนพืชที่ช่วยเร่งให้ผลไม้สุก', dEn: 'Has a C=C double bond; a plant hormone that ripens fruit.' },
  { f: 'C2H2', th: 'เอไทน์ (อะเซทิลีน)', en: 'Ethyne (acetylene)', dTh: 'มีพันธะสาม C≡C เส้นตรง ใช้ในงานเชื่อมโลหะ', dEn: 'A linear C≡C triple bond; used in welding torches.' },
  { f: 'C3H8', th: 'โพรเพน', en: 'Propane', dTh: 'แก๊สหุงต้ม (LPG)', dEn: 'Cooking gas (LPG).' },
  { f: 'C4H10', th: 'บิวเทน', en: 'Butane', test: (c) => !anyAtom(c, 'C', (a) => countNb(a, 'C') >= 3), dTh: 'แก๊สในไฟแช็ก', dEn: 'The gas in lighters.' },
  { f: 'C4H10', th: 'ไอโซบิวเทน', en: 'Isobutane', test: (c) => anyAtom(c, 'C', (a) => countNb(a, 'C') >= 3), dTh: 'ไอโซเมอร์โซ่กิ่งของบิวเทน ใช้เป็นสารทำความเย็น', dEn: 'Branched isomer of butane; used as a refrigerant.' },
  { f: 'C6H6', th: 'เบนซีน', en: 'Benzene', test: (c) => c.atoms.filter((a) => sym(a) === 'C').every((a) => countNb(a, 'C') === 2 && countNb(a, 'H') === 1), dTh: 'วงหกเหลี่ยมแบนราบ พันธะเดี่ยวสลับพันธะคู่ (เรโซแนนซ์)', dEn: 'A flat six-membered ring with alternating bonds (resonance).' },
  { f: 'CH3OH', th: 'เมทานอล', en: 'Methanol', dTh: 'แอลกอฮอล์ที่เป็นพิษ ทำให้ตาบอดได้', dEn: 'A toxic alcohol that can cause blindness.' },
  { f: 'C2H5OH', th: 'เอทานอล', en: 'Ethanol', test: (c) => hasBond(c, 'O', 'H'), dTh: 'แอลกอฮอล์ในเครื่องดื่มและเจลล้างมือ', dEn: 'The alcohol in drinks and hand sanitiser.' },
  { f: 'CH3OCH3', th: 'ไดเมทิลอีเทอร์', en: 'Dimethyl ether', test: (c) => anyAtom(c, 'O', (o) => countNb(o, 'C') === 2), dTh: 'ไอโซเมอร์ของเอทานอล (สูตรเดียวกันแต่โครงสร้างต่างกัน)', dEn: 'An isomer of ethanol: same formula, different structure.' },
  { f: 'CH2O', th: 'เมทานาล (ฟอร์มาลดีไฮด์)', en: 'Formaldehyde', dTh: 'สารละลายในน้ำเรียกว่าฟอร์มาลิน ใช้ดองศพ', dEn: 'Its solution (formalin) preserves specimens.' },
  { f: 'HCOOH', th: 'กรดเมทาโนอิก (กรดฟอร์มิก)', en: 'Formic acid', test: (c) => hasBond(c, 'O', 'H'), dTh: 'พบในพิษของมด', dEn: 'Found in ant stings.' },
  { f: 'CH3COOH', th: 'กรดเอทาโนอิก (กรดแอซีติก)', en: 'Acetic acid', test: (c) => hasBond(c, 'C', 'C') && hasBond(c, 'O', 'H'), dTh: 'กรดในน้ำส้มสายชู', dEn: 'The acid in vinegar.' },
  { f: 'CH3COCH3', th: 'โพรพาโนน (แอซีโตน)', en: 'Acetone', test: (c) => anyAtom(c, 'C', (a) => countNb(a, 'C') === 2 && countNb(a, 'O') === 1) && !hasBond(c, 'O', 'H'), dTh: 'ตัวทำละลายในน้ำยาล้างเล็บ', dEn: 'The solvent in nail-polish remover.' },
  { f: 'CO(NH2)2', th: 'ยูเรีย', en: 'Urea', test: (c) => anyAtom(c, 'C', (a) => countNb(a, 'N') === 2 && countNb(a, 'O') === 1), dTh: 'สารประกอบอินทรีย์ตัวแรกที่สังเคราะห์ได้ ใช้เป็นปุ๋ย', dEn: 'The first organic compound made in a lab; a fertilizer.' },

  // สารประกอบไอออนิก (แบบจำลองแสดงเป็นคู่ไอออนที่เชื่อมกัน)
  { f: 'NaCl', th: 'โซเดียมคลอไรด์ (เกลือแกง)', en: 'Sodium chloride (table salt)', dTh: 'สารประกอบไอออนิก Na⁺ กับ Cl⁻ ของจริงเรียงตัวเป็นผลึก', dEn: 'Ionic Na⁺Cl⁻; really a crystal lattice.' },
  { f: 'KCl', th: 'โพแทสเซียมคลอไรด์', en: 'Potassium chloride', dTh: 'ใช้เป็นปุ๋ยโพแทช และเกลือโซเดียมต่ำ', dEn: 'Used as potash fertilizer and low-sodium salt.' },
  { f: 'LiF', th: 'ลิเทียมฟลูออไรด์', en: 'Lithium fluoride', dTh: 'สารประกอบไอออนิกที่มีผลต่างอิเล็กโทรเนกาติวิตีสูงมาก', dEn: 'Ionic, with a very large electronegativity difference.' },
  { f: 'NaF', th: 'โซเดียมฟลูออไรด์', en: 'Sodium fluoride', dTh: 'ใส่ในยาสีฟันเพื่อป้องกันฟันผุ', dEn: 'Added to toothpaste to prevent tooth decay.' },
  { f: 'KBr', th: 'โพแทสเซียมโบรไมด์', en: 'Potassium bromide', dTh: 'ใช้ทำเลนส์ในเครื่องวัดสเปกตรัมอินฟราเรด', dEn: 'Used in infrared spectroscopy.' },
  { f: 'MgO', th: 'แมกนีเซียมออกไซด์', en: 'Magnesium oxide', dTh: 'ได้จากการเผาแมกนีเซียม ให้แสงจ้า', dEn: 'Formed when magnesium burns with a bright flame.' },
  { f: 'CaO', th: 'แคลเซียมออกไซด์ (ปูนดิบ)', en: 'Calcium oxide (quicklime)', dTh: 'ทำปฏิกิริยากับน้ำแล้วร้อนมาก', dEn: 'Gets very hot when it reacts with water.' },
  { f: 'Na2O', th: 'โซเดียมออกไซด์', en: 'Sodium oxide', dTh: 'ออกไซด์ของโลหะ ละลายน้ำได้เบส', dEn: 'A metal oxide that forms a base in water.' },
  { f: 'MgCl2', th: 'แมกนีเซียมคลอไรด์', en: 'Magnesium chloride', dTh: 'พบในน้ำทะเล', dEn: 'Found in seawater.' },
  { f: 'CaCl2', th: 'แคลเซียมคลอไรด์', en: 'Calcium chloride', dTh: 'ใช้เป็นสารดูดความชื้น', dEn: 'Used as a drying agent.' },
  { f: 'NaOH', th: 'โซเดียมไฮดรอกไซด์', en: 'Sodium hydroxide', dTh: 'เบสแก่ (โซดาไฟ) ใช้ทำสบู่', dEn: 'A strong base (caustic soda) used to make soap.' },
  { f: 'KOH', th: 'โพแทสเซียมไฮดรอกไซด์', en: 'Potassium hydroxide', dTh: 'เบสแก่ ใช้ทำสบู่เหลว', dEn: 'A strong base used in liquid soap.' },
  { f: 'Ca(OH)2', th: 'แคลเซียมไฮดรอกไซด์ (ปูนขาว)', en: 'Calcium hydroxide (slaked lime)', dTh: 'ใช้ปรับสภาพดินเปรี้ยว', dEn: 'Used to treat acidic soil.' },
  { f: 'Al2O3', th: 'อะลูมิเนียมออกไซด์', en: 'Aluminium oxide', dTh: 'ชั้นเคลือบที่ป้องกันอะลูมิเนียมไม่ให้ผุกร่อน', dEn: 'The protective layer on aluminium.' },
  { f: 'NaHCO3', th: 'โซเดียมไฮโดรเจนคาร์บอเนต (เบกกิ้งโซดา)', en: 'Sodium bicarbonate (baking soda)', dTh: 'ใช้ทำขนมให้ฟู', dEn: 'Makes cakes rise.' },
  { f: 'CaCO3', th: 'แคลเซียมคาร์บอเนต (หินปูน)', en: 'Calcium carbonate (limestone)', dTh: 'พบในหินปูน เปลือกหอย และชอล์ก', dEn: 'Found in limestone, seashells and chalk.' },
  { f: 'Fe2O3', th: 'เหล็ก(III) ออกไซด์ (สนิมเหล็ก)', en: 'Iron(III) oxide (rust)', dTh: 'เกิดเมื่อเหล็กทำปฏิกิริยากับออกซิเจนและน้ำ', dEn: 'Forms when iron reacts with oxygen and water.' },
  { f: 'CuO', th: 'คอปเปอร์(II) ออกไซด์', en: 'Copper(II) oxide', dTh: 'ผงสีดำ เกิดเมื่อเผาทองแดง', dEn: 'A black powder formed by heating copper.' },
  { f: 'ZnO', th: 'ซิงค์ออกไซด์', en: 'Zinc oxide', dTh: 'ใช้ในครีมกันแดด', dEn: 'Used in sunscreen.' },
  { f: 'AgCl', th: 'ซิลเวอร์คลอไรด์', en: 'Silver chloride', dTh: 'ตะกอนสีขาว ไวต่อแสง', dEn: 'A white, light-sensitive precipitate.' },
];

// ---------- สูตรเคมี ----------
export function parseFormula(f) {
  // รองรับวงเล็บหนึ่งชั้น เช่น Ca(OH)2, CO(NH2)2
  const counts = {};
  const add = (s, n) => { counts[s] = (counts[s] || 0) + n; };
  const re = /\(([^)]+)\)(\d*)|([A-Z][a-z]?)(\d*)/g;
  let m;
  while ((m = re.exec(f))) {
    if (m[1]) {
      const inner = parseFormula(m[1]);
      const k = Number(m[2] || 1);
      for (const s in inner) add(s, inner[s] * k);
    } else add(m[3], Number(m[4] || 1));
  }
  return counts;
}

// สูตรแบบ Hill: C ก่อน, H ตามมา, ที่เหลือเรียงตามตัวอักษร (ถ้าไม่มี C เรียงตามตัวอักษรทั้งหมด)
export function hillFormula(counts) {
  const syms = Object.keys(counts);
  let order;
  if (counts.C) {
    order = ['C', ...(counts.H ? ['H'] : []), ...syms.filter((s) => s !== 'C' && s !== 'H').sort()];
  } else order = syms.sort();
  return order.map((s) => s + (counts[s] > 1 ? counts[s] : '')).join('');
}

const SUB = '₀₁₂₃₄₅₆₇₈₉';
export function prettyFormula(f) {
  return f.replace(/\d/g, (d) => SUB[Number(d)]);
}

const INDEX = new Map();
for (const m of MOLECULES) {
  m.key = hillFormula(parseFormula(m.f));
  m.id = m.f;
  if (!INDEX.has(m.key)) INDEX.set(m.key, []);
  INDEX.get(m.key).push(m);
}

export function findMolecule(hill, comp, complete) {
  const list = INDEX.get(hill);
  if (!list) return null;
  for (const m of list) {
    if (!complete && !m.allowIncomplete) continue;
    if (m.test && !m.test(comp)) continue;
    return m;
  }
  return null;
}

export function moleculeById(id) {
  return MOLECULES.find((m) => m.id === id) || null;
}

export { MOLECULES };
