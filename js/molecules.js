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
  { f: 'CO', th: 'คาร์บอนมอนอกไซด์', en: 'Carbon monoxide', dTh: 'แก๊สพิษไม่มีสีไม่มีกลิ่น มีพันธะสาม C≡O (หนึ่งพันธะเป็นพันธะโคออร์ดิเนต) จึงมีประจุฟอร์มอล C⁻ และ O⁺', dEn: 'A toxic, colourless gas. The C≡O triple bond includes a dative bond, giving formal charges C⁻ and O⁺.' },
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
  { f: 'C4H10', id: 'isobutane', th: 'ไอโซบิวเทน', en: 'Isobutane', test: (c) => anyAtom(c, 'C', (a) => countNb(a, 'C') >= 3), dTh: 'ไอโซเมอร์โซ่กิ่งของบิวเทน ใช้เป็นสารทำความเย็น', dEn: 'Branched isomer of butane; used as a refrigerant.' },
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

// ---------- ตัวช่วยเพิ่มเติม ----------
const isTree = (c) => c.bonds.length === c.atoms.length - 1;
const unbranched = (c) => isTree(c) && !anyAtom(c, 'C', (a) => countNb(a, 'C') >= 3);
const hasDouble = (c, s1, s2) => c.bonds.some((b) => b.order === 2
  && ((sym(b.a) === s1 && sym(b.b) === s2) || (sym(b.a) === s2 && sym(b.b) === s1)));
const carbonylC = (c) => c.atoms.filter((a) => sym(a) === 'C' && a.bonds.some((b) => b.order === 2 && sym(b.a === a ? b.b : b.a) === 'O'));
const aldehyde = (c) => carbonylC(c).some((a) => countNb(a, 'H') >= 1);
const ketone = (c) => carbonylC(c).some((a) => countNb(a, 'C') === 2);
const hasOH = (c) => hasBond(c, 'O', 'H');
// รูปสวิตเตอร์ไอออนของกรดแอมิโน: ⁺NH₃ กับ COO⁻ ในโมเลกุลเดียวกัน
const zwitterion = (c) => anyAtom(c, 'N', (n) => n.charge === 1) && anyAtom(c, 'O', (o) => o.charge === -1);
const xWithO = (s, n) => (c) => anyAtom(c, s, (a) => countNb(a, 'O') === n);

// ---------- กลุ่มที่ 1: สารที่เป็นกลาง ----------
MOLECULES.push(
  // ไฮโดรคาร์บอน
  { f: 'C5H12', th: 'เพนเทน', en: 'Pentane', test: unbranched, dTh: 'แอลเคนโซ่ตรง 5 คาร์บอน เป็นของเหลวระเหยง่าย', dEn: 'A five-carbon straight-chain alkane; a volatile liquid.' },
  { f: 'CH3CH(CH3)CH2CH3', th: 'ไอโซเพนเทน (2-เมทิลบิวเทน)', en: 'Isopentane', test: (c) => isTree(c) && anyAtom(c, 'C', (a) => countNb(a, 'C') === 3), dTh: 'ไอโซเมอร์โซ่กิ่งของเพนเทน', dEn: 'A branched isomer of pentane.' },
  { f: 'C(CH3)4', th: 'นีโอเพนเทน (2,2-ไดเมทิลโพรเพน)', en: 'Neopentane', test: (c) => anyAtom(c, 'C', (a) => countNb(a, 'C') === 4), dTh: 'ไอโซเมอร์ที่เป็นทรงกลมที่สุดของเพนเทน จุดเดือดต่ำที่สุดในสามไอโซเมอร์', dEn: 'The most compact pentane isomer, with the lowest boiling point of the three.' },
  { f: 'C6H14', th: 'เฮกเซน', en: 'Hexane', test: unbranched, dTh: 'ตัวทำละลายใช้สกัดน้ำมันพืช', dEn: 'A solvent used to extract vegetable oil.' },
  { f: 'C8H18', th: 'ออกเทน', en: 'Octane', test: unbranched, dTh: 'องค์ประกอบของน้ำมันเบนซิน', dEn: 'A component of petrol.' },
  { f: 'C3H6', th: 'โพรพีน', en: 'Propene', test: (c) => hasDouble(c, 'C', 'C'), dTh: 'แอลคีน ใช้ผลิตพลาสติกพอลิโพรพิลีน', dEn: 'An alkene used to make polypropylene.' },
  { f: 'C3H6', id: 'cyclopropane', th: 'ไซโคลโพรเพน', en: 'Cyclopropane', test: (c) => !isTree(c), dTh: 'ไอโซเมอร์แบบวงของโพรพีน มุมพันธะแคบ (60°) จึงไม่เสถียร', dEn: 'A ring isomer of propene with strained 60° angles.' },
  { f: 'ClCH=CHCl', th: '1,2-ไดคลอโรเอทีน', en: '1,2-Dichloroethene', test: (c) => anyAtom(c, 'C', (a) => countNb(a, 'Cl') === 1) && !anyAtom(c, 'C', (a) => countNb(a, 'Cl') === 2), dTh: 'มีไอโซเมอร์ cis (มีขั้ว, จุดเดือด 60 °C) และ trans (ไม่มีขั้ว, จุดเดือด 48 °C) เพราะหมุนรอบพันธะคู่ไม่ได้', dEn: 'Has cis (polar, bp 60 °C) and trans (nonpolar, bp 48 °C) isomers because the C=C bond cannot rotate.' },
  { f: 'CH3CH=CHCH3', th: '2-บิวทีน', en: '2-Butene', test: (c) => c.bonds.some((b) => b.order === 2 && sym(b.a) === 'C' && sym(b.b) === 'C' && countNb(b.a, 'C') === 2 && countNb(b.b, 'C') === 2), dTh: 'มีไอโซเมอร์ cis และ trans', dEn: 'Has cis and trans isomers.' },
  { f: 'CH2=CHCH2CH3', th: '1-บิวทีน', en: '1-Butene', test: (c) => unbranched(c) && c.bonds.some((b) => b.order === 2 && (countNb(b.a, 'H') === 2 || countNb(b.b, 'H') === 2)), dTh: 'พันธะคู่อยู่ปลายโซ่ จึงไม่มีไอโซเมอร์ cis/trans', dEn: 'The double bond is at the chain end, so there is no cis/trans isomer.' },
  { f: 'C6H12', th: 'ไซโคลเฮกเซน', en: 'Cyclohexane', test: (c) => !isTree(c) && !hasDouble(c, 'C', 'C'), dTh: 'ไซโคลแอลเคนวงหกเหลี่ยม (ไม่แบนราบ)', dEn: 'A six-membered cycloalkane (not flat).' },
  { f: 'C6H5CH3', th: 'โทลูอีน', en: 'Toluene', dTh: 'ตัวทำละลายในทินเนอร์และสี', dEn: 'A solvent in paint thinner.' },
  { f: 'C10H8', th: 'แนฟทาลีน', en: 'Naphthalene', dTh: 'วงเบนซีนสองวงเชื่อมกัน ใช้ทำลูกเหม็น', dEn: 'Two fused benzene rings; used in mothballs.' },
  // แอลกอฮอล์ อีเทอร์ คาร์บอนิล
  { f: 'C3H7OH', th: 'โพรพานอล', en: '1-Propanol', test: (c) => anyAtom(c, 'O', (o) => o.neighbors.some((n) => sym(n) === 'C' && countNb(n, 'C') === 1)) && hasOH(c), dTh: 'แอลกอฮอล์ 3 คาร์บอน (หมู่ OH ที่ปลายโซ่)', dEn: 'A three-carbon alcohol with OH at the chain end.' },
  { f: '(CH3)2CHOH', th: 'ไอโซโพรพิลแอลกอฮอล์', en: 'Isopropyl alcohol', test: (c) => anyAtom(c, 'O', (o) => o.neighbors.some((n) => sym(n) === 'C' && countNb(n, 'C') === 2)) && hasOH(c), dTh: 'แอลกอฮอล์เช็ดแผล ไอโซเมอร์ของโพรพานอล', dEn: 'Rubbing alcohol; an isomer of 1-propanol.' },
  { f: 'HOCH2CH2OH', th: 'เอทิลีนไกลคอล', en: 'Ethylene glycol', dTh: 'สารกันน้ำแข็งในหม้อน้ำรถยนต์', dEn: 'Antifreeze in car radiators.' },
  { f: 'C3H5(OH)3', th: 'กลีเซอรอล', en: 'Glycerol', test: (c) => c.atoms.filter((a) => sym(a) === 'O').every((o) => countNb(o, 'H') === 1), dTh: 'มีหมู่ OH สามหมู่ ใช้ในเครื่องสำอางและสบู่', dEn: 'Three OH groups; used in cosmetics and soap.' },
  { f: 'CH3CHO', th: 'เอทานาล (แอซีตัลดีไฮด์)', en: 'Acetaldehyde', test: aldehyde, dTh: 'แอลดีไฮด์ที่เกิดเมื่อร่างกายย่อยแอลกอฮอล์', dEn: 'An aldehyde formed when the body breaks down alcohol.' },
  { f: 'C6H5OH', th: 'ฟีนอล', en: 'Phenol', test: hasOH, dTh: 'หมู่ OH ต่อกับวงเบนซีน ใช้ฆ่าเชื้อ', dEn: 'An OH group on a benzene ring; an antiseptic.' },
  // กรดอินทรีย์และเอสเทอร์
  { f: 'C2H5COOH', th: 'กรดโพรพาโนอิก', en: 'Propanoic acid', test: hasOH, dTh: 'ใช้เป็นสารกันเสียในขนมปัง', dEn: 'Used as a bread preservative.' },
  { f: 'CH3COOCH3', th: 'เมทิลแอซีเตต', en: 'Methyl acetate', test: (c) => !hasOH(c) && carbonylC(c).some((a) => countNb(a, 'C') === 1), dTh: 'เอสเทอร์ ไอโซเมอร์ของกรดโพรพาโนอิก', dEn: 'An ester; an isomer of propanoic acid.' },
  { f: 'HCOOC2H5', th: 'เอทิลฟอร์เมต', en: 'Ethyl formate', test: (c) => !hasOH(c) && aldehyde(c), dTh: 'เอสเทอร์กลิ่นรัม', dEn: 'An ester that smells of rum.' },
  { f: 'CH3COOC2H5', th: 'เอทิลแอซีเตต', en: 'Ethyl acetate', test: (c) => !hasOH(c), dTh: 'เอสเทอร์กลิ่นผลไม้ ใช้ในน้ำยาล้างเล็บ', dEn: 'A fruity-smelling ester in nail-polish remover.' },
  { f: 'CH3CH(OH)COOH', th: 'กรดแลกติก', en: 'Lactic acid', test: hasOH, dTh: 'เกิดในกล้ามเนื้อเมื่อออกกำลังกายหนัก และในนมเปรี้ยว', dEn: 'Made in muscles during hard exercise, and in sour milk.' },
  { f: 'C6H8O7', th: 'กรดซิตริก', en: 'Citric acid', dTh: 'กรดในมะนาวและส้ม', dEn: 'The acid in lemons and oranges.' },
  { f: 'C6H5COOH', th: 'กรดเบนโซอิก', en: 'Benzoic acid', test: hasOH, dTh: 'สารกันบูดในอาหาร', dEn: 'A food preservative.' },
  { f: 'C9H8O4', th: 'แอสไพริน', en: 'Aspirin', dTh: 'ยาแก้ปวดลดไข้', dEn: 'A painkiller and fever reducer.' },
  // สารชีวโมเลกุล
  { f: 'C6H12O6', th: 'กลูโคส', en: 'Glucose', test: aldehyde, dTh: 'น้ำตาลโมเลกุลเดี่ยว แหล่งพลังงานของเซลล์ (โครงสร้างแบบโซ่เปิด มีหมู่แอลดีไฮด์)', dEn: 'A simple sugar and the cell’s energy source (open-chain form, aldehyde group).' },
  { f: 'C6H12O6', id: 'fructose', th: 'ฟรักโทส', en: 'Fructose', test: ketone, dTh: 'น้ำตาลในผลไม้ ไอโซเมอร์ของกลูโคส (มีหมู่คีโตน)', dEn: 'Fruit sugar; an isomer of glucose with a ketone group.' },
  { f: 'NH2CH2COOH', th: 'ไกลซีน', en: 'Glycine', test: (c) => hasOH(c) || zwitterion(c), dTh: 'กรดแอมิโนที่เล็กที่สุด หน่วยย่อยของโปรตีน ในน้ำและในผลึกอยู่ในรูปสวิตเตอร์ไอออน ⁺H₃N–CH₂–COO⁻', dEn: 'The smallest amino acid. In water and in crystals it exists as the zwitterion ⁺H₃N–CH₂–COO⁻.' },
  { f: 'CH3CH(NH2)COOH', aminoAcid: true, th: 'อะลานีน', en: 'Alanine', test: (c) => (hasOH(c) || zwitterion(c)) && hasBond(c, 'N', 'H'), dTh: 'กรดแอมิโนที่พบมากในโปรตีน มีคาร์บอนไครัล (โปรตีนใช้แบบ L)', dEn: 'A common amino acid in proteins with a chiral carbon (proteins use the L form).' },
  { f: 'CH3NH2', th: 'เมทิลแอมีน', en: 'Methylamine', dTh: 'แอมีนอย่างง่าย กลิ่นคาวปลา', dEn: 'A simple amine with a fishy smell.' },
  { f: 'C8H10N4O2', th: 'คาเฟอีน', en: 'Caffeine', dTh: 'สารกระตุ้นในกาแฟและชา', dEn: 'The stimulant in coffee and tea.' },
  // อนินทรีย์ที่เป็นกลาง
  { f: 'H2CO3', th: 'กรดคาร์บอนิก', en: 'Carbonic acid', dTh: 'เกิดเมื่อ CO₂ ละลายในน้ำ ทำให้น้ำอัดลมซ่า', dEn: 'Forms when CO₂ dissolves in water; makes soda fizzy.' },
  { f: 'HNO2', th: 'กรดไนตรัส', en: 'Nitrous acid', dTh: 'กรดอ่อน H–O–N=O', dEn: 'A weak acid, H–O–N=O.' },
  { f: 'H2SO3', th: 'กรดซัลฟิวรัส', en: 'Sulfurous acid', test: xWithO('S', 3), dTh: 'เกิดเมื่อ SO₂ ละลายในน้ำฝน', dEn: 'Forms when SO₂ dissolves in rain.' },
  { f: 'HClO3', th: 'กรดคลอริก', en: 'Chloric acid', test: xWithO('Cl', 3), dTh: 'กรดแก่ที่เป็นตัวออกซิไดซ์', dEn: 'A strong oxidising acid.' },
  { f: 'HClO4', th: 'กรดเปอร์คลอริก', en: 'Perchloric acid', test: xWithO('Cl', 4), dTh: 'หนึ่งในกรดที่แก่ที่สุด', dEn: 'One of the strongest acids.' },
  { f: 'CS2', th: 'คาร์บอนไดซัลไฟด์', en: 'Carbon disulfide', dTh: 'เส้นตรง S=C=S เหมือน CO₂', dEn: 'Linear S=C=S, like CO₂.' },
  { f: 'COCl2', th: 'ฟอสจีน', en: 'Phosgene', dTh: 'แก๊สพิษ สามเหลี่ยมแบนราบ', dEn: 'A toxic gas; trigonal planar.' },
  { f: 'SiH4', th: 'ไซเลน', en: 'Silane', dTh: 'ทรงสี่หน้าเหมือนมีเทน', dEn: 'Tetrahedral, like methane.' },
  { f: 'SiCl4', th: 'ซิลิคอนเตตระคลอไรด์', en: 'Silicon tetrachloride', dTh: 'ใช้ผลิตซิลิคอนบริสุทธิ์สำหรับชิป', dEn: 'Used to make pure silicon for chips.' },
  { f: 'NCl3', th: 'ไนโตรเจนไตรคลอไรด์', en: 'Nitrogen trichloride', dTh: 'พีระมิดฐานสามเหลี่ยม ระเบิดง่าย', dEn: 'Trigonal pyramidal and explosive.' },
  { f: 'NF3', th: 'ไนโตรเจนไตรฟลูออไรด์', en: 'Nitrogen trifluoride', dTh: 'ใช้ทำความสะอาดเครื่องผลิตชิป', dEn: 'Used to clean chip-making equipment.' },
  { f: 'OF2', th: 'ออกซิเจนไดฟลูออไรด์', en: 'Oxygen difluoride', dTh: 'มุมงอเหมือนน้ำ', dEn: 'Bent, like water.' },
  { f: 'Cl2O', th: 'ไดคลอรีนมอนอกไซด์', en: 'Dichlorine monoxide', dTh: 'มุมงอ ใช้ฟอกขาว', dEn: 'Bent; used as a bleach.' },
  { f: 'SF4', th: 'ซัลเฟอร์เตตระฟลูออไรด์', en: 'Sulfur tetrafluoride', dTh: 'รูปไม้กระดก (S มีคู่โดดเดี่ยว 1 คู่)', dEn: 'Seesaw-shaped (S has one lone pair).' },
  { f: 'ClF3', th: 'คลอรีนไตรฟลูออไรด์', en: 'Chlorine trifluoride', dTh: 'รูปตัวที (Cl มีคู่โดดเดี่ยว 2 คู่)', dEn: 'T-shaped (Cl has two lone pairs).' },
  { f: 'BrF5', th: 'โบรมีนเพนตะฟลูออไรด์', en: 'Bromine pentafluoride', dTh: 'พีระมิดฐานสี่เหลี่ยม', dEn: 'Square pyramidal.' },
  { f: 'P4', th: 'ฟอสฟอรัสขาว', en: 'White phosphorus', dTh: 'P สี่อะตอมเรียงเป็นทรงสี่หน้า ติดไฟเองในอากาศ', dEn: 'Four P atoms in a tetrahedron; ignites in air.' },
  { f: 'S8', th: 'กำมะถัน (S₈)', en: 'Sulfur (S₈)', dTh: 'วงแปดเหลี่ยมรูปมงกุฎ', dEn: 'A crown-shaped eight-membered ring.' },
  // สารประกอบไอออนิกเพิ่มเติม
  { f: 'LiCl', th: 'ลิเทียมคลอไรด์', en: 'Lithium chloride', dTh: 'ดูดความชื้นได้ดีมาก', dEn: 'Very good at absorbing moisture.' },
  { f: 'NaBr', th: 'โซเดียมโบรไมด์', en: 'Sodium bromide', dTh: 'ใช้ฆ่าเชื้อในสระน้ำ', dEn: 'Used to disinfect pools.' },
  { f: 'NaI', th: 'โซเดียมไอโอไดด์', en: 'Sodium iodide', dTh: 'แหล่งไอโอดีนในเกลือเสริมไอโอดีน', dEn: 'A source of iodine in iodised salt.' },
  { f: 'KI', th: 'โพแทสเซียมไอโอไดด์', en: 'Potassium iodide', dTh: 'ใช้ทดสอบแป้งร่วมกับไอโอดีน', dEn: 'Used with iodine to test for starch.' },
  { f: 'K2O', th: 'โพแทสเซียมออกไซด์', en: 'Potassium oxide', dTh: 'ใช้บอกปริมาณโพแทสเซียมในปุ๋ย', dEn: 'Used to express potassium content in fertilizer.' },
  { f: 'Li2O', th: 'ลิเทียมออกไซด์', en: 'Lithium oxide', dTh: 'ใช้ในเซรามิกและแก้ว', dEn: 'Used in ceramics and glass.' },
  { f: 'Na2S', th: 'โซเดียมซัลไฟด์', en: 'Sodium sulfide', dTh: 'ใช้ในอุตสาหกรรมฟอกหนัง', dEn: 'Used in leather tanning.' },
  { f: 'CaF2', th: 'แคลเซียมฟลูออไรด์', en: 'Calcium fluoride', dTh: 'แร่ฟลูออไรต์', dEn: 'The mineral fluorite.' },
  { f: 'SrF2', th: 'สตรอนเชียมฟลูออไรด์', en: 'Strontium fluoride', dTh: 'ผลึกไอออนิกแบบฟลูออไรต์ ใช้ทำเลนส์บางชนิด', dEn: 'A fluorite-type ionic crystal used in some optics.' },
  { f: 'BaF2', th: 'แบเรียมฟลูออไรด์', en: 'Barium fluoride', dTh: 'ผลึกไอออนิกแบบฟลูออไรต์ ใช้เป็นตัวตรวจวัดรังสี', dEn: 'A fluorite-type ionic crystal used in radiation detectors.' },
  { f: 'BaCl2', th: 'แบเรียมคลอไรด์', en: 'Barium chloride', dTh: 'ใช้ทดสอบไอออนซัลเฟต (ได้ตะกอนขาว)', dEn: 'Used to test for sulfate ions (white precipitate).' },
  { f: 'BaO', th: 'แบเรียมออกไซด์', en: 'Barium oxide', dTh: 'ออกไซด์ของโลหะแอลคาไลน์เอิร์ท', dEn: 'An alkaline-earth metal oxide.' },
  { f: 'AlCl3', th: 'อะลูมิเนียมคลอไรด์', en: 'Aluminium chloride', dTh: 'ใช้ในยาระงับเหงื่อ', dEn: 'Used in antiperspirants.' },
  { f: 'FeCl2', th: 'เหล็ก(II) คลอไรด์', en: 'Iron(II) chloride', dTh: 'สารละลายสีเขียวอ่อน', dEn: 'Forms a pale green solution.' },
  { f: 'FeCl3', th: 'เหล็ก(III) คลอไรด์', en: 'Iron(III) chloride', dTh: 'ใช้กัดแผ่นวงจรพิมพ์', dEn: 'Used to etch circuit boards.' },
  { f: 'FeO', th: 'เหล็ก(II) ออกไซด์', en: 'Iron(II) oxide', dTh: 'ผงสีดำ', dEn: 'A black powder.' },
  { f: 'CuCl2', th: 'คอปเปอร์(II) คลอไรด์', en: 'Copper(II) chloride', dTh: 'ให้เปลวไฟสีเขียวอมฟ้า', dEn: 'Gives a blue-green flame.' },
  { f: 'Cu2O', th: 'คอปเปอร์(I) ออกไซด์', en: 'Copper(I) oxide', dTh: 'ผงสีแดง ใช้ทดสอบน้ำตาล (เบเนดิกต์)', dEn: 'A red powder seen in Benedict’s sugar test.' },
  { f: 'ZnCl2', th: 'ซิงค์คลอไรด์', en: 'Zinc chloride', dTh: 'ใช้เป็นฟลักซ์ในงานบัดกรี', dEn: 'Used as soldering flux.' },
  { f: 'LiOH', th: 'ลิเทียมไฮดรอกไซด์', en: 'Lithium hydroxide', dTh: 'ใช้ดูด CO₂ ในยานอวกาศ', dEn: 'Absorbs CO₂ in spacecraft.' },
  { f: 'Mg(OH)2', th: 'แมกนีเซียมไฮดรอกไซด์', en: 'Magnesium hydroxide', dTh: 'ยาลดกรด (มิลค์ออฟแมกนีเซีย)', dEn: 'An antacid (milk of magnesia).' },
  { f: 'Al(OH)3', th: 'อะลูมิเนียมไฮดรอกไซด์', en: 'Aluminium hydroxide', dTh: 'ยาลดกรดในกระเพาะ', dEn: 'A stomach antacid.' },
  { f: 'Ba(OH)2', th: 'แบเรียมไฮดรอกไซด์', en: 'Barium hydroxide', dTh: 'เบสแก่', dEn: 'A strong base.' },
  { f: 'Na2CO3', th: 'โซเดียมคาร์บอเนต (โซดาแอช)', en: 'Sodium carbonate (soda ash)', dTh: 'ใช้ผลิตแก้วและผงซักฟอก', dEn: 'Used to make glass and detergent.' },
);

// ---------- กลุ่มที่ 2: ประจุฟอร์มอล อนุมูลอิสระ ไอออน และเกลือ ----------
MOLECULES.push(
  // โมเลกุลเป็นกลางที่มีประจุฟอร์มอล
  { f: 'O3', th: 'โอโซน', en: 'Ozone', dTh: 'O=O⁺–O⁻ (เรโซแนนซ์) ชั้นโอโซนกรองรังสียูวี', dEn: 'O=O⁺–O⁻ (resonance); the ozone layer blocks UV.' },
  { f: 'N2O', th: 'ไนตรัสออกไซด์ (แก๊สหัวเราะ)', en: 'Nitrous oxide (laughing gas)', test: (c) => hasBond(c, 'N', 'N'), dTh: 'N=N⁺=O⁻ หรือ N≡N⁺–O⁻ ใช้เป็นยาสลบ', dEn: 'N=N⁺=O⁻ or N≡N⁺–O⁻; an anaesthetic.' },
  { f: 'N2O4', th: 'ไดไนโตรเจนเตตรอกไซด์', en: 'Dinitrogen tetroxide', dTh: 'เกิดจาก NO₂ สองโมเลกุลจับคู่อิเล็กตรอนเดี่ยวกัน', dEn: 'Two NO₂ molecules pair their unpaired electrons.' },
  // อนุมูลอิสระ
  { f: 'NO', th: 'ไนโตรเจนมอนอกไซด์', en: 'Nitric oxide', radical: true, dTh: 'อนุมูลอิสระ: มีอิเล็กตรอนรวมเป็นเลขคี่ จึงมีอิเล็กตรอนเดี่ยว 1 ตัวเสมอ', dEn: 'A radical: an odd number of electrons leaves one unpaired.' },
  { f: 'NO2', th: 'ไนโตรเจนไดออกไซด์', en: 'Nitrogen dioxide', radical: true, dTh: 'อนุมูลอิสระสีน้ำตาลแดง ก่อหมอกควันพิษในเมือง', dEn: 'A red-brown radical that causes city smog.' },
  { f: 'OH', th: 'อนุมูลไฮดรอกซิล', en: 'Hydroxyl radical', radical: true, dTh: 'อนุมูลอิสระที่ว่องไวมาก ถ้ารับอิเล็กตรอนเพิ่ม 1 ตัวจะเป็นไฮดรอกไซด์ไอออน OH⁻', dEn: 'A very reactive radical; adding one electron gives the hydroxide ion OH⁻.' },
  { f: 'CH3', th: 'อนุมูลเมทิล', en: 'Methyl radical', radical: true, dTh: 'อนุมูลอิสระรูปสามเหลี่ยมแบนราบ เกิดระหว่างการเผาไหม้มีเทน', dEn: 'A flat radical formed when methane burns.' },
  { f: 'ClO2', th: 'คลอรีนไดออกไซด์', en: 'Chlorine dioxide', radical: true, dTh: 'อนุมูลอิสระที่ใช้ฆ่าเชื้อในน้ำดื่ม', dEn: 'A radical used to disinfect drinking water.' },
  // ไอออนอะตอมเดี่ยว
  { f: 'H', q: 1, th: 'ไฮโดรเจนไอออน (โปรตอน)', en: 'Hydrogen ion (proton)', dTh: 'ตัวกำหนดความเป็นกรด (pH)', dEn: 'Determines acidity (pH).' },
  { f: 'H', q: -1, th: 'ไฮไดรด์ไอออน', en: 'Hydride ion', dTh: 'พบในสารประกอบเช่น NaH', dEn: 'Found in compounds such as NaH.' },
  { f: 'Li', q: 1, th: 'ลิเทียมไอออน', en: 'Lithium ion', dTh: 'ตัวพาประจุในแบตเตอรี่ลิเทียมไอออน', dEn: 'The charge carrier in lithium-ion batteries.' },
  { f: 'Na', q: 1, th: 'โซเดียมไอออน', en: 'Sodium ion', dTh: 'Na เสียอิเล็กตรอน 1 ตัว ได้การจัดเรียงเหมือน Ne', dEn: 'Na loses one electron to match neon.' },
  { f: 'K', q: 1, th: 'โพแทสเซียมไอออน', en: 'Potassium ion', dTh: 'สำคัญต่อการทำงานของเส้นประสาท', dEn: 'Essential for nerve signals.' },
  { f: 'Mg', q: 2, th: 'แมกนีเซียมไอออน', en: 'Magnesium ion', dTh: 'Mg เสียอิเล็กตรอน 2 ตัว', dEn: 'Mg loses two electrons.' },
  { f: 'Ca', q: 2, th: 'แคลเซียมไอออน', en: 'Calcium ion', dTh: 'องค์ประกอบของกระดูกและฟัน', dEn: 'Found in bones and teeth.' },
  { f: 'Ba', q: 2, th: 'แบเรียมไอออน', en: 'Barium ion', dTh: 'ให้เปลวไฟสีเขียว', dEn: 'Gives a green flame.' },
  { f: 'Al', q: 3, th: 'อะลูมิเนียมไอออน', en: 'Aluminium ion', dTh: 'Al เสียอิเล็กตรอน 3 ตัว', dEn: 'Al loses three electrons.' },
  { f: 'Fe', q: 2, th: 'เหล็ก(II) ไอออน', en: 'Iron(II) ion', dTh: 'สารละลายสีเขียวอ่อน', dEn: 'Pale green in solution.' },
  { f: 'Fe', q: 3, th: 'เหล็ก(III) ไอออน', en: 'Iron(III) ion', dTh: 'สารละลายสีเหลืองน้ำตาล', dEn: 'Yellow-brown in solution.' },
  { f: 'Cu', q: 1, th: 'คอปเปอร์(I) ไอออน', en: 'Copper(I) ion', dTh: 'ไอออนของทองแดงที่มีประจุ +1', dEn: 'Copper with a +1 charge.' },
  { f: 'Cu', q: 2, th: 'คอปเปอร์(II) ไอออน', en: 'Copper(II) ion', dTh: 'สารละลายสีฟ้า', dEn: 'Blue in solution.' },
  { f: 'Zn', q: 2, th: 'ซิงค์ไอออน', en: 'Zinc ion', dTh: 'แร่ธาตุจำเป็นต่อภูมิคุ้มกัน', dEn: 'A mineral the immune system needs.' },
  { f: 'Ag', q: 1, th: 'ซิลเวอร์ไอออน', en: 'Silver ion', dTh: 'ฆ่าเชื้อแบคทีเรียได้', dEn: 'Kills bacteria.' },
  { f: 'F', q: -1, th: 'ฟลูออไรด์ไอออน', en: 'Fluoride ion', dTh: 'ช่วยให้เคลือบฟันแข็งแรง', dEn: 'Strengthens tooth enamel.' },
  { f: 'Cl', q: -1, th: 'คลอไรด์ไอออน', en: 'Chloride ion', dTh: 'Cl รับอิเล็กตรอน 1 ตัว ได้การจัดเรียงเหมือน Ar', dEn: 'Cl gains one electron to match argon.' },
  { f: 'Br', q: -1, th: 'โบรไมด์ไอออน', en: 'Bromide ion', dTh: 'ไอออนลบของโบรมีน', dEn: 'The negative ion of bromine.' },
  { f: 'I', q: -1, th: 'ไอโอไดด์ไอออน', en: 'Iodide ion', dTh: 'ไอออนลบของไอโอดีน', dEn: 'The negative ion of iodine.' },
  { f: 'O', q: -2, th: 'ออกไซด์ไอออน', en: 'Oxide ion', dTh: 'O รับอิเล็กตรอน 2 ตัว', dEn: 'O gains two electrons.' },
  { f: 'S', q: -2, th: 'ซัลไฟด์ไอออน', en: 'Sulfide ion', dTh: 'S รับอิเล็กตรอน 2 ตัว', dEn: 'S gains two electrons.' },
  { f: 'N', q: -3, th: 'ไนไตรด์ไอออน', en: 'Nitride ion', dTh: 'N รับอิเล็กตรอน 3 ตัว', dEn: 'N gains three electrons.' },
  // ไอออนหลายอะตอม
  { f: 'OH', q: -1, th: 'ไฮดรอกไซด์ไอออน', en: 'Hydroxide ion', dTh: 'ไอออนที่ทำให้สารละลายเป็นเบส', dEn: 'The ion that makes solutions basic.' },
  { f: 'H3O', q: 1, th: 'ไฮโดรเนียมไอออน', en: 'Hydronium ion', dTh: 'H⁺ จับกับน้ำ พีระมิดฐานสามเหลี่ยม', dEn: 'H⁺ attached to water; trigonal pyramidal.' },
  { f: 'NH4', q: 1, th: 'แอมโมเนียมไอออน', en: 'Ammonium ion', dTh: 'ทรงสี่หน้า N มีพันธะ 4 พันธะจึงมีประจุ +1', dEn: 'Tetrahedral; N has four bonds so it carries +1.' },
  { f: 'CN', q: -1, th: 'ไซยาไนด์ไอออน', en: 'Cyanide ion', dTh: 'C≡N⁻ เป็นพิษร้ายแรง', dEn: 'C≡N⁻; highly toxic.' },
  { f: 'O2', q: -2, th: 'เปอร์ออกไซด์ไอออน', en: 'Peroxide ion', dTh: '⁻O–O⁻ พบใน Na₂O₂', dEn: '⁻O–O⁻, found in Na₂O₂.' },
  { f: 'NO3', q: -1, th: 'ไนเตรตไอออน', en: 'Nitrate ion', dTh: 'สามเหลี่ยมแบนราบ ธาตุอาหารพืช', dEn: 'Trigonal planar; a plant nutrient.' },
  { f: 'NO2', q: -1, th: 'ไนไตรต์ไอออน', en: 'Nitrite ion', dTh: 'มุมงอ ใช้ถนอมเนื้อสัตว์', dEn: 'Bent; used to cure meat.' },
  { f: 'SO4', q: -2, th: 'ซัลเฟตไอออน', en: 'Sulfate ion', dTh: 'ทรงสี่หน้า', dEn: 'Tetrahedral.' },
  { f: 'HSO4', q: -1, th: 'ไฮโดรเจนซัลเฟตไอออน', en: 'Hydrogen sulfate ion', dTh: 'เกิดเมื่อ H₂SO₄ เสีย H⁺ หนึ่งตัว', dEn: 'H₂SO₄ after losing one H⁺.' },
  { f: 'SO3', q: -2, th: 'ซัลไฟต์ไอออน', en: 'Sulfite ion', dTh: 'พีระมิดฐานสามเหลี่ยม ใช้เป็นสารกันเสีย', dEn: 'Trigonal pyramidal; a preservative.' },
  { f: 'S2O3', q: -2, th: 'ไทโอซัลเฟตไอออน', en: 'Thiosulfate ion', dTh: 'ใช้ในน้ำยาล้างฟิล์ม (ไฮโป)', dEn: 'Used as photographic fixer (hypo).' },
  { f: 'CO3', q: -2, th: 'คาร์บอเนตไอออน', en: 'Carbonate ion', dTh: 'สามเหลี่ยมแบนราบ พบในหินปูน', dEn: 'Trigonal planar; found in limestone.' },
  { f: 'HCO3', q: -1, th: 'ไฮโดรเจนคาร์บอเนตไอออน', en: 'Bicarbonate ion', dTh: 'บัฟเฟอร์ในเลือด', dEn: 'A buffer in blood.' },
  { f: 'PO4', q: -3, th: 'ฟอสเฟตไอออน', en: 'Phosphate ion', dTh: 'ทรงสี่หน้า พบใน DNA และกระดูก', dEn: 'Tetrahedral; found in DNA and bone.' },
  { f: 'HPO4', q: -2, th: 'ไฮโดรเจนฟอสเฟตไอออน', en: 'Hydrogen phosphate ion', dTh: 'บัฟเฟอร์ในเซลล์', dEn: 'A buffer in cells.' },
  { f: 'ClO', q: -1, th: 'ไฮโปคลอไรต์ไอออน', en: 'Hypochlorite ion', dTh: 'สารฟอกขาวในน้ำยาซักผ้าขาว', dEn: 'The bleaching agent in laundry bleach.' },
  { f: 'ClO3', q: -1, th: 'คลอเรตไอออน', en: 'Chlorate ion', dTh: 'ตัวออกซิไดซ์ในดอกไม้ไฟ', dEn: 'An oxidiser in fireworks.' },
  { f: 'ClO4', q: -1, th: 'เปอร์คลอเรตไอออน', en: 'Perchlorate ion', dTh: 'ใช้ในเชื้อเพลิงจรวดแข็ง', dEn: 'Used in solid rocket fuel.' },
  { f: 'MnO4', q: -1, th: 'เปอร์แมงกาเนตไอออน', en: 'Permanganate ion', dTh: 'สีม่วงเข้ม ตัวออกซิไดซ์แรง', dEn: 'Deep purple; a strong oxidiser.' },
  { f: 'CrO4', q: -2, th: 'โครเมตไอออน', en: 'Chromate ion', dTh: 'สีเหลือง', dEn: 'Yellow.' },
  { f: 'Cr2O7', q: -2, th: 'ไดโครเมตไอออน', en: 'Dichromate ion', dTh: 'สีส้ม ใช้ตรวจแอลกอฮอล์ในลมหายใจ', dEn: 'Orange; used in breath alcohol tests.' },
  { f: 'CH3COO', q: -1, th: 'แอซีเตตไอออน', en: 'Acetate ion', dTh: 'เกิดเมื่อกรดแอซีติกเสีย H⁺', dEn: 'Acetic acid after losing H⁺.' },
  { f: 'BF4', q: -1, th: 'เตตระฟลูออโรบอเรตไอออน', en: 'Tetrafluoroborate ion', dTh: 'B มีประจุ −1 จึงต่อได้ 4 พันธะ (ทรงสี่หน้า)', dEn: 'B carries −1 so it makes four bonds (tetrahedral).' },
  // เกลือที่มีไอออนหลายอะตอม (วางไอออนบวกและลบไว้ใกล้กัน หรือเชื่อมโลหะกับ O ของไอออนลบ)
  { f: 'NH4Cl', th: 'แอมโมเนียมคลอไรด์', en: 'Ammonium chloride', dTh: 'NH₄⁺ + Cl⁻ ใช้ในถ่านไฟฉาย', dEn: 'NH₄⁺ + Cl⁻; used in dry-cell batteries.' },
  { f: 'NH4NO3', th: 'แอมโมเนียมไนเตรต', en: 'Ammonium nitrate', dTh: 'ปุ๋ยไนโตรเจน ละลายน้ำแล้วเย็น', dEn: 'A nitrogen fertilizer; dissolving it feels cold.' },
  { f: '(NH4)2SO4', th: 'แอมโมเนียมซัลเฟต', en: 'Ammonium sulfate', dTh: 'ปุ๋ยแอมโมเนียม (ปุ๋ยสูตร 21-0-0)', dEn: 'An ammonium fertilizer (21-0-0).' },
  { f: 'KNO3', th: 'โพแทสเซียมไนเตรต (ดินประสิว)', en: 'Potassium nitrate (saltpetre)', dTh: 'ส่วนผสมของดินปืนและปุ๋ย', dEn: 'An ingredient of gunpowder and fertilizer.' },
  { f: 'NaNO3', th: 'โซเดียมไนเตรต', en: 'Sodium nitrate', dTh: 'ปุ๋ยและสารกันเสีย', dEn: 'A fertilizer and preservative.' },
  { f: 'AgNO3', th: 'ซิลเวอร์ไนเตรต', en: 'Silver nitrate', dTh: 'ใช้ทดสอบไอออนคลอไรด์ (ได้ตะกอนขาว AgCl)', dEn: 'Tests for chloride (white AgCl precipitate).' },
  { f: 'CuSO4', th: 'คอปเปอร์(II) ซัลเฟต (จุนสี)', en: 'Copper(II) sulfate', dTh: 'ผลึกสีฟ้า ใช้กำจัดตะไคร่', dEn: 'Blue crystals used to kill algae.' },
  { f: 'FeSO4', th: 'เหล็ก(II) ซัลเฟต', en: 'Iron(II) sulfate', dTh: 'ยาบำรุงเลือด', dEn: 'An iron supplement.' },
  { f: 'MgSO4', th: 'แมกนีเซียมซัลเฟต (ดีเกลือ)', en: 'Magnesium sulfate (Epsom salt)', dTh: 'ใช้เป็นยาระบายและแช่เท้า', dEn: 'A laxative and bath salt.' },
  { f: 'CaSO4', th: 'แคลเซียมซัลเฟต (ยิปซัม)', en: 'Calcium sulfate (gypsum)', dTh: 'ปูนปลาสเตอร์และแผ่นยิปซัม', dEn: 'Plaster and drywall.' },
  { f: 'BaSO4', th: 'แบเรียมซัลเฟต', en: 'Barium sulfate', dTh: 'ดื่มก่อนเอกซเรย์ทางเดินอาหาร', dEn: 'Swallowed before gut X-rays.' },
  { f: 'Na2SO4', th: 'โซเดียมซัลเฟต', en: 'Sodium sulfate', dTh: 'ส่วนผสมในผงซักฟอก', dEn: 'An ingredient of detergent powder.' },
  { f: 'KMnO4', th: 'โพแทสเซียมเปอร์แมงกาเนต (ด่างทับทิม)', en: 'Potassium permanganate', dTh: 'ใช้ฆ่าเชื้อโรคล้างผักผลไม้', dEn: 'Used to disinfect fruit and vegetables.' },
  { f: 'K2Cr2O7', th: 'โพแทสเซียมไดโครเมต', en: 'Potassium dichromate', dTh: 'ผลึกสีส้ม ตัวออกซิไดซ์', dEn: 'Orange crystals; an oxidiser.' },
  { f: 'NaClO', th: 'โซเดียมไฮโปคลอไรต์', en: 'Sodium hypochlorite', dTh: 'น้ำยาฟอกผ้าขาว', dEn: 'Household bleach.' },
  { f: 'KClO3', th: 'โพแทสเซียมคลอเรต', en: 'Potassium chlorate', dTh: 'ใช้ในหัวไม้ขีดไฟ', dEn: 'Used in match heads.' },
  { f: 'Na3PO4', th: 'โซเดียมฟอสเฟต', en: 'Sodium phosphate', dTh: 'สารทำความสะอาด', dEn: 'A cleaning agent.' },
  { f: 'Ca3(PO4)2', th: 'แคลเซียมฟอสเฟต', en: 'Calcium phosphate', dTh: 'องค์ประกอบหลักของกระดูกและฟัน', dEn: 'The main mineral in bones and teeth.' },
  { f: 'CH3COONa', th: 'โซเดียมแอซีเตต', en: 'Sodium acetate', dTh: 'ใช้ในถุงร้อนแบบกดแล้วอุ่น', dEn: 'Used in click-to-heat hand warmers.' },
  { f: 'Na2S2O3', th: 'โซเดียมไทโอซัลเฟต (ไฮโป)', en: 'Sodium thiosulfate', dTh: 'ใช้กำจัดคลอรีนในน้ำเลี้ยงปลา', dEn: 'Removes chlorine from aquarium water.' },
);

// ---------- เกินหลักสูตร ม.ปลาย: พันธะ 3 ศูนย์กลาง และสารประกอบเชิงซ้อนของโลหะทรานซิชัน ----------
MOLECULES.push(
  { f: 'BH3', th: 'โบเรน (BH₃)', en: 'Borane', dTh: 'B มีอิเล็กตรอนรอบตัวแค่ 6 จึงไม่เสถียร สองโมเลกุลรวมกันเป็นไดโบเรน B₂H₆ — ลองนำ H ของโมเลกุลหนึ่งไปแตะ B ของอีกโมเลกุล', dEn: 'B has only six electrons, so BH₃ is unstable and dimerises to diborane B₂H₆. Try touching an H of one molecule to the B of another.' },
  { f: 'B2H6', th: 'ไดโบเรน', en: 'Diborane', dTh: 'มี H สะพาน 2 อะตอม แต่ละตัวยึด B สองอะตอมด้วยอิเล็กตรอนเพียง 2 ตัว (พันธะ 3 ศูนย์กลาง 2 อิเล็กตรอน) เพราะ B ขาดอิเล็กตรอน และไม่มีพันธะ B–B', dEn: 'Two bridging H atoms each hold two B atoms with only two electrons (three-centre two-electron bonds), because boron is electron-deficient. There is no B–B bond.' },

  { f: '[Cu(NH3)4]', q: 2, th: 'เตตระแอมมีนคอปเปอร์(II) ไอออน', en: 'Tetraamminecopper(II) ion', dTh: 'สีน้ำเงินเข้ม เกิดเมื่อเติมแอมโมเนียลงในสารละลาย Cu²⁺ (ใช้ทดสอบ Cu²⁺) N ของ NH₃ ให้คู่อิเล็กตรอนโดดเดี่ยวแก่ Cu²⁺ รูปร่างสี่เหลี่ยมแบนราบ', dEn: 'Deep blue; forms when ammonia is added to Cu²⁺ solution (a test for Cu²⁺). Each NH₃ donates its lone pair to Cu²⁺. Square planar.' },
  { f: '[Cu(H2O)6]', q: 2, th: 'เฮกซะแอควาคอปเปอร์(II) ไอออน', en: 'Hexaaquacopper(II) ion', dTh: 'สีฟ้าของสารละลายจุนสี เพราะ Cu²⁺ ในน้ำมีโมเลกุลน้ำล้อมรอบ 6 โมเลกุล (ทรงแปดหน้าที่ยืดออกตามแกนหนึ่ง)', dEn: 'The blue of copper sulfate solution: Cu²⁺ in water is surrounded by six water molecules (an elongated octahedron).' },
  { f: '[CuCl4]', q: -2, th: 'เตตระคลอโรคิวเพรต(II) ไอออน', en: 'Tetrachlorocuprate(II) ion', dTh: 'สีเหลืองอมเขียว เกิดเมื่อเติม HCl เข้มข้นลงในสารละลาย Cu²⁺', dEn: 'Yellow-green; forms when concentrated HCl is added to Cu²⁺ solution.' },
  { f: '[Ag(NH3)2]', q: 1, th: 'ไดแอมมีนซิลเวอร์(I) ไอออน', en: 'Diamminesilver(I) ion', dTh: 'อยู่ในรีเอเจนต์ทอลเลนส์ ซึ่งใช้ทดสอบแอลดีไฮด์ (ได้กระจกเงิน) รูปร่างเส้นตรง', dEn: 'The active species in Tollens’ reagent (silver-mirror test for aldehydes). Linear.' },
  { f: '[Zn(NH3)4]', q: 2, th: 'เตตระแอมมีนซิงก์(II) ไอออน', en: 'Tetraamminezinc(II) ion', dTh: 'ไม่มีสี เพราะ Zn²⁺ มีอิเล็กตรอน d ครบ 10 ตัว รูปร่างทรงสี่หน้า', dEn: 'Colourless because Zn²⁺ has a full d¹⁰ shell. Tetrahedral.' },
  { f: '[Ni(CN)4]', q: -2, th: 'เตตระไซยาโนนิกเกเลต(II) ไอออน', en: 'Tetracyanonickelate(II) ion', dTh: 'Ni²⁺ (d⁸) กับลิแกนด์สนามแรง CN⁻ จึงเป็นสี่เหลี่ยมแบนราบ', dEn: 'Ni²⁺ (d⁸) with the strong-field ligand CN⁻ is square planar.' },
  { f: 'Ni(CO)4', th: 'นิกเกิลเตตระคาร์บอนิล', en: 'Nickel tetracarbonyl', dTh: 'ของเหลวพิษร้ายแรง Ni มีเลขออกซิเดชัน 0 ใช้ทำนิกเกิลให้บริสุทธิ์ (กระบวนการมอนด์) รูปร่างทรงสี่หน้า', dEn: 'A highly toxic liquid with Ni in oxidation state 0; used to purify nickel (Mond process). Tetrahedral.' },
  { f: 'Fe(CO)5', th: 'เหล็กเพนตะคาร์บอนิล', en: 'Iron pentacarbonyl', dTh: 'ของเหลวสีเหลือง Fe มีเลขออกซิเดชัน 0 เลขโคออร์ดิเนชัน 5 (พีระมิดคู่ฐานสามเหลี่ยม)', dEn: 'A yellow liquid with Fe(0); coordination number 5 (trigonal bipyramidal).' },
  { f: 'Cr(CO)6', th: 'โครเมียมเฮกซะคาร์บอนิล', en: 'Chromium hexacarbonyl', dTh: 'ผลึกไม่มีสี Cr มีเลขออกซิเดชัน 0 รูปร่างทรงแปดหน้า', dEn: 'Colourless crystals with Cr(0); octahedral.' },
  { f: '[Fe(CN)6]', q: -3, th: 'เฮกซะไซยาโนเฟอร์เรต(III) ไอออน (เฟอร์ริไซยาไนด์)', en: 'Hexacyanoferrate(III) ion (ferricyanide)', dTh: 'ทรงแปดหน้า เกลือโพแทสเซียมเป็นผลึกสีแดง ใช้ทำพิมพ์เขียว — CN⁻ ไม่ปล่อยไซยาไนด์อิสระเพราะยึดกับ Fe แน่นมาก', dEn: 'Octahedral; its potassium salt forms red crystals used for blueprints. The CN⁻ is held tightly, so it is far less toxic than free cyanide.' },
  { f: '[Fe(CN)6]', q: -4, th: 'เฮกซะไซยาโนเฟอร์เรต(II) ไอออน (เฟอร์โรไซยาไนด์)', en: 'Hexacyanoferrate(II) ion (ferrocyanide)', dTh: 'ทำปฏิกิริยากับ Fe³⁺ ได้สีน้ำเงินปรัสเซียน', dEn: 'Gives Prussian blue with Fe³⁺.' },
  { f: '[Fe(H2O)6]', q: 3, th: 'เฮกซะแอควาไอร์ออน(III) ไอออน', en: 'Hexaaquairon(III) ion', dTh: 'Fe³⁺ ในน้ำ เป็นกรดอ่อน (ให้ H⁺ ได้) สารละลายจึงเป็นสีเหลืองน้ำตาล', dEn: 'Fe³⁺ in water; it is weakly acidic, so solutions look yellow-brown.' },
  { f: '[Fe(H2O)6]', q: 2, th: 'เฮกซะแอควาไอร์ออน(II) ไอออน', en: 'Hexaaquairon(II) ion', dTh: 'Fe²⁺ ในน้ำ สีเขียวอ่อน', dEn: 'Fe²⁺ in water; pale green.' },
  { f: '[FeCl4]', q: -1, th: 'เตตระคลอโรเฟอร์เรต(III) ไอออน', en: 'Tetrachloroferrate(III) ion', dTh: 'สีเหลือง รูปร่างทรงสี่หน้า', dEn: 'Yellow and tetrahedral.' },
  { f: '[Co(H2O)6]', q: 2, th: 'เฮกซะแอควาโคบอลต์(II) ไอออน', en: 'Hexaaquacobalt(II) ion', dTh: 'สีชมพู เมื่อมี Cl⁻ มากจะเปลี่ยนเป็น [CoCl₄]²⁻ สีน้ำเงิน (หลักการของซิลิกาเจลบอกความชื้น)', dEn: 'Pink; with excess Cl⁻ it turns into blue [CoCl₄]²⁻ (the principle of humidity-indicator silica gel).' },
  { f: '[CoCl4]', q: -2, th: 'เตตระคลอโรโคบอลเตต(II) ไอออน', en: 'Tetrachlorocobaltate(II) ion', dTh: 'สีน้ำเงิน รูปร่างทรงสี่หน้า', dEn: 'Blue and tetrahedral.' },
  { f: '[Co(NH3)6]', q: 3, th: 'เฮกซะแอมมีนโคบอลต์(III) ไอออน', en: 'Hexaamminecobalt(III) ion', dTh: 'สีเหลืองส้ม เป็นสารที่แวร์เนอร์ใช้วางรากฐานทฤษฎีโคออร์ดิเนชัน (รางวัลโนเบล ค.ศ. 1913)', dEn: 'Yellow-orange; one of the compounds Werner used to found coordination theory (Nobel Prize 1913).' },
  { f: '[CoCl2(NH3)4]', q: 1, th: 'เตตระแอมมีนไดคลอโรโคบอลต์(III) ไอออน', en: 'Tetraamminedichlorocobalt(III) ion', dTh: 'มีไอโซเมอร์ 2 แบบ: cis (สีม่วง) และ trans (สีเขียว) ซึ่งแวร์เนอร์ใช้เป็นหลักฐานว่าสารเชิงซ้อนเป็นทรงแปดหน้า', dEn: 'Exists as cis (violet) and trans (green) isomers, which Werner used as evidence that complexes are octahedral.' },
  { f: '[PtCl2(NH3)2]', th: 'ไดแอมมีนไดคลอโรแพลทินัม(II)', en: 'Diamminedichloroplatinum(II)', dTh: 'สี่เหลี่ยมแบนราบ แบบ cis คือยาเคมีบำบัด "ซิสพลาทิน" ส่วนแบบ trans ไม่มีฤทธิ์ต้านมะเร็ง ลองกดสลับ cis ↔ trans', dEn: 'Square planar. The cis isomer is the anticancer drug cisplatin; the trans isomer is inactive. Try flipping cis ↔ trans.' },
  { f: '[Cr(H2O)6]', q: 3, th: 'เฮกซะแอควาโครเมียม(III) ไอออน', en: 'Hexaaquachromium(III) ion', dTh: 'สีม่วงอมน้ำเงิน รูปร่างทรงแปดหน้า', dEn: 'Blue-violet and octahedral.' },
);

const SUPER = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** ประจุแบบตัวยก เช่น 2- → ²⁻ */
export function chargeSuffix(q) {
  if (!q) return '';
  const n = Math.abs(q);
  return (n > 1 ? String(n).replace(/\d/g, (d) => SUPER[d]) : '') + (q > 0 ? '⁺' : '⁻');
}

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

// จุดเดือด (°C ที่ 1 atm) จากคู่มือข้อมูลเคมีทั่วไป — ใช้เชื่อมชนิดแรงระหว่างโมเลกุลกับสมบัติจริง (* = ระเหิด)
const BOILING = {
  H2: -253, O2: -183, N2: -196, F2: -188, Cl2: -34, Br2: 59, I2: 184, H2O: 100, H2O2: 150, NH3: -33, CH4: -162,
  HF: 20, HCl: -85, HBr: -67, HI: -35, H2S: -60, PH3: -88, CO2: '-78*', CO: -191, SO2: -10, O3: -112,
  'N2O': -88, NO: -152, NO2: 21, CS2: 46, SiH4: -112, BF3: -100, SF6: '-64*', PCl3: 76, NF3: -129, OF2: -145,
  COCl2: 8, SiCl4: 58, HNO3: 83, H2SO4: 337, HCN: 26, CCl4: 77, CHCl3: 61, CH2Cl2: 40, CH3Cl: -24,
  CH3OH: 65, C2H5OH: 78, CH3OCH3: -24, CH2O: -19, HCOOH: 101, CH3COOH: 118, CH3COCH3: 56, CH3CHO: 20,
  C2H6: -89, C2H4: -104, C2H2: '-84*', C3H8: -42, C4H10: -1, isobutane: -12, C5H12: 36, 'CH3CH(CH3)CH2CH3': 28,
  'C(CH3)4': 10, C6H14: 69, C8H18: 126, C3H6: -48, C6H12: 81, C6H6: 80, C6H5CH3: 111, C3H7OH: 97,
  '(CH3)2CHOH': 82, HOCH2CH2OH: 197, 'C3H5(OH)3': 290, C6H5OH: 182, CH3COOC2H5: 77, CH3COOCH3: 57, CH3NH2: -6,
  B2H6: -93, 'Ni(CO)4': 43, 'Fe(CO)5': 103,
  NaCl: 1465, KCl: 1420, MgO: 3600, CaO: 2850, LiF: 1676, NaF: 1704,
};

// เรขาคณิตจากการทดลอง (โมเลกุลเดี่ยวในสถานะแก๊ส) — มุมพันธะที่อะตอมกลาง (องศา) และมุมบิด
// แหล่ง: NIST CCCBDB / ตารางโครงสร้างโมเลกุลในตำรา; CaF₂, SrF₂, BaF₂ จากสเปกโทรสโกปีอินฟราเรด (ดู docs/research-gap-analysis.md)
const EXPERIMENTAL = {
  H2O: { angle: 104.5 },
  NH3: { angle: 106.7 },
  CH4: { angle: 109.5 },
  NF3: { angle: 102.2 },
  OF2: { angle: 103.1 },
  SO2: { angle: 119.3 },
  O3: { angle: 116.8 },
  H2S: { angle: 92.1, noteTh: 'มุมแคบกว่าน้ำมาก (92° vs 104.5°) — ธาตุคาบ 3 ขึ้นไปใช้ออร์บิทัล p เกือบล้วนในการสร้างพันธะ (ออร์บิทัล s และ p ผสมกันน้อย) VSEPR อย่างง่ายบอกได้แค่ว่า "น้อยกว่า 109.5°"', noteEn: 'Much narrower than water (92° vs 104.5°): heavier atoms bond with almost pure p orbitals (little s–p mixing); simple VSEPR only predicts "less than 109.5°".' },
  PH3: { angle: 93.3, noteTh: 'มุมเกือบ 90° ต่างจาก NH₃ (106.7°) ด้วยเหตุผลเดียวกับ H₂S', noteEn: 'Close to 90°, unlike NH₃ (106.7°), for the same reason as H₂S.' },
  NO2: { angle: 134.1, noteTh: 'มุมกว้างกว่า 120° เพราะอะตอมกลางมีอิเล็กตรอนเดี่ยวเพียง 1 ตัว ซึ่งผลักน้อยกว่าคู่โดดเดี่ยว', noteEn: 'Wider than 120°: the single unpaired electron repels less than a lone pair.' },
  ClO2: { angle: 117.4 },
  CaF2: { angle: 140, shapeTh: 'มุมงอ', shapeEn: 'Bent', noteTh: 'ในสถานะแก๊ส CaF₂ เป็นโมเลกุลงอ (~140°) ทั้งที่ VSEPR ทำนายเส้นตรง — เกิดจากไอออน Ca²⁺ ถูกโพลาไรซ์ (ออร์บิทัล d ร่วมด้วย) ส่วนในของแข็งเป็นผลึกไอออนิก', noteEn: 'Gaseous CaF₂ is bent (~140°) although VSEPR predicts linear, due to core polarisation of Ca²⁺ (d-orbital participation). The solid is an ionic crystal.' },
  SrF2: { angle: 108, shapeTh: 'มุมงอ', shapeEn: 'Bent', noteTh: 'แก๊ส SrF₂ งอ ~108° (VSEPR ทำนายเส้นตรง)', noteEn: 'Gaseous SrF₂ is bent (~108°); VSEPR predicts linear.' },
  BaF2: { angle: 100, shapeTh: 'มุมงอ', shapeEn: 'Bent', noteTh: 'แก๊ส BaF₂ งอมาก ~100° (VSEPR ทำนายเส้นตรง)', noteEn: 'Gaseous BaF₂ is strongly bent (~100°); VSEPR predicts linear.' },
  H2O2: { dihedral: 111.5, noteTh: 'ไม่แบนราบ: พันธะ O–H สองพันธะบิดทำมุมกัน ~111° เพราะคู่โดดเดี่ยวบน O ทั้งสองผลักกัน', noteEn: 'Not planar: the two O–H bonds twist ~111° apart because lone pairs on the two O atoms repel.' },
  N2H4: { dihedral: 91 },
};

const keyOf = (hill, q) => (q ? `${hill}[${q}]` : hill);
const INDEX = new Map();
for (const m of MOLECULES) {
  m.q = m.q || 0;
  m.key = keyOf(hillFormula(parseFormula(m.f)), m.q);
  m.id = m.id || (m.q ? `${m.f}${m.q > 0 ? '+' : ''}${m.q}` : m.f);
  if (BOILING[m.id] !== undefined) m.bp = BOILING[m.id];
  if (EXPERIMENTAL[m.id]) m.exp = EXPERIMENTAL[m.id];
  if (!INDEX.has(m.key)) INDEX.set(m.key, []);
  INDEX.get(m.key).push(m);
}

export function findMolecule(hill, comp, complete, q = 0) {
  const list = INDEX.get(keyOf(hill, q));
  if (!list) return null;
  for (const m of list) {
    // อนุมูลอิสระจับคู่เฉพาะตอนที่ยังมีอิเล็กตรอนเดี่ยว (ไม่ครบเวเลนซ์)
    if (complete ? m.radical : !(m.allowIncomplete || m.radical)) continue;
    if (m.test && !m.test(comp)) continue;
    return m;
  }
  return null;
}

export function moleculeById(id) {
  return MOLECULES.find((m) => m.id === id) || null;
}

export { MOLECULES };
