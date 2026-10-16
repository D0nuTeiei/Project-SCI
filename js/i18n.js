// ข้อความในหน้าจอ (ไทย/อังกฤษ)
const STRINGS = {
  th: {
    appTitle: 'ChemXR Lab',
    appSubtitle: 'แล็บเคมีเสมือน AR/VR',
    periodicTable: 'ตารางธาตุ',
    move: 'ย้าย',
    hint: 'แตะ / จีบนิ้วที่ธาตุเพื่อสร้างอะตอม แล้วลากอะตอมไปชนกันเพื่อสร้างพันธะ',
    clear: 'ล้างทั้งหมด',
    challenge: 'ภารกิจ',
    lonePairs: 'คู่อิเล็กตรอน',
    recycler: 'ถังรีไซเคิล',
    recyclerHint: 'ปล่อยที่นี่เพื่อลบ',
    enterAR: 'เข้าสู่ AR',
    enterVR: 'เข้าสู่ VR',
    camera: 'โหมดกล้อง',
    cameraOff: 'ปิดกล้อง',
    exitXR: 'ออก',
    recenter: 'จัดแผงตรงหน้า',
    help: 'วิธีใช้',
    noXR: 'อุปกรณ์นี้ไม่รองรับ WebXR — ใช้โหมด 3D หรือโหมดกล้องแทนได้',
    arUnsupported: 'อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับ AR (ลองใช้ Chrome บน Android หรือ Meta Quest)',
    vrUnsupported: 'อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับ VR (ลองใช้ Meta Quest Browser)',
    cameraFail: 'เปิดกล้องไม่ได้ — ต้องอนุญาตการใช้กล้องและเปิดผ่าน https',
    incomplete: 'แบบจำลองยังไม่สมบูรณ์',
    needMore: (n) => `ต้องการพันธะอีก ${n}`,
    completeUnknown: 'โมเลกุลสมบูรณ์ (ไม่อยู่ในฐานข้อมูล)',
    stable: 'เสถียร ไม่สร้างพันธะ',
    syntheticNote: 'ธาตุสังเคราะห์ ไม่เสถียร',
    // การ์ดข้อมูล
    atomicNumber: 'เลขอะตอม',
    atomicMass: 'มวลอะตอม',
    category: 'กลุ่ม',
    period: 'คาบ',
    group: 'หมู่',
    valenceE: 'เวเลนซ์อิเล็กตรอน',
    bondCap: 'สร้างพันธะได้',
    shells: 'การจัดอิเล็กตรอน',
    electroneg: 'อิเล็กโทรเนกาติวิตี',
    molarMass: 'มวลโมเลกุล',
    atoms: 'อะตอม',
    bonds: 'พันธะ',
    single: 'เดี่ยว',
    double: 'คู่',
    triple: 'สาม',
    shape: 'รูปร่าง (VSEPR)',
    around: 'รอบอะตอม',
    polarity: 'สภาพขั้ว',
    polar: 'มีขั้ว',
    nonpolar: 'ไม่มีขั้ว',
    bondType: 'ชนิดพันธะ',
    ionic: 'ไอออนิก (โลหะ + อโลหะ)',
    formulaMass: 'มวลสูตร',
    oneLewis: '(หนึ่งในโครงสร้างเรโซแนนซ์)',
    crystalForceRow: 'แรงยึดเหนี่ยว',
    covalent: 'โคเวเลนต์',
    status: 'สถานะ',
    missingAt: (sym, n) => `${sym} ต้องการอีก ${n} พันธะ`,
    tapHint: 'แตะอะตอมหรือธาตุเพื่อดูข้อมูล',
    // ภารกิจ
    challengeBuild: 'สร้าง',
    challengeDone: 'สำเร็จ! ',
    challengeAll: 'ทำภารกิจครบทุกข้อแล้ว 🎉',
    skip: 'ข้าม',
    score: 'คะแนน',
    bonded: 'เกิดพันธะ!',
    broke: 'พันธะขาด',
    recycled: 'ลบแล้ว',
    embedNote: 'หน้านี้เปิดอยู่ในโหมด 3D (เมาส์/ทัช) — โหมด AR, VR และกล้องต้องเปิดจากเว็บไซต์ของโปรเจกต์ที่โฮสต์ผ่าน HTTPS เช่น GitHub Pages',
    chargePlus: 'ประจุ +',
    chargeMinus: 'ประจุ −',
    chargePlusTitle: 'ดึงอิเล็กตรอนออก 1 ตัว (ประจุ +1)',
    chargeMinusTitle: 'เติมอิเล็กตรอน 1 ตัว (ประจุ −1)',
    tryCharge: (q) => `ลองทำเป็นไอออนประจุ ${q > 0 ? '+' : '−'}${Math.abs(q)}`,
    overValence: 'พันธะเกินเวเลนซ์',
    radicalNote: 'อนุมูลอิสระ: มีอิเล็กตรอนเดี่ยว',
    impossibleIon: 'ไอออนนี้ไม่เสถียร',
    ion: 'ไอออน',
    netCharge: 'ประจุสุทธิ',
    ions: 'ไอออน',
    formalCharges: 'ประจุฟอร์มอล',
    hintRow: 'คำใบ้',
    hintCharge: (q) => `ถ้า${q > 0 ? 'ดึงอิเล็กตรอนออก' : 'เติมอิเล็กตรอน'} ${Math.abs(q)} ตัว (ประจุ ${q > 0 ? '+' : '−'}${Math.abs(q)}) จะครบ — กดปุ่ม "ประจุ ${q > 0 ? '+' : '−'}"`,
    lostElectron: (f) => `ดึงอิเล็กตรอนออก 1 ตัว → ${f}`,
    gainedElectron: (f) => `เติมอิเล็กตรอน 1 ตัว → ${f}`,
    chargeLimit: 'ประจุถึงขีดจำกัดแล้ว (±3)',
    selectAtomFirst: 'แตะเลือกอะตอมก่อน แล้วค่อยกดปุ่มประจุ',
    saltFormed: (n) => `🧂 ไอออนรวมกันเป็น ${n}`,
    breakCost: (e) => `ต้องใช้พลังงาน ${e} kJ/mol เพื่อสลายพันธะ`,
    bondFormedE: (pair, e) => `⚡ เกิดพันธะ ${pair} · ปล่อยพลังงาน ${e} kJ/mol`,
    bondBrokenE: (e) => `🔥 สลายพันธะ · ต้องใช้พลังงาน ${e} kJ/mol (ดูดพลังงาน)`,
    energyRow: 'พลังงานพันธะรวม',
    energyNote: (e) => `${e} kJ/mol (ต้องใช้เท่านี้เพื่อแยกเป็นอะตอมทั้งหมด)`,
    formulaUnit: 'หน่วยสูตร (ผลึกไอออนิก)',
    ionicNoteRow: 'โครงสร้างจริง',
    ionicNote: 'ผลึกไอออนิก — ไม่ได้อยู่เป็นโมเลกุล สูตรนี้คืออัตราส่วนไอออนในผลึก (หน่วยสูตร) ไอออนแต่ละตัวถูกไอออนประจุตรงข้ามล้อมรอบหลายตัว',
    lattice: 'โครงผลึก',
    showLattice: '🔷 ดูโครงผลึก',
    hideLattice: 'ซ่อนโครงผลึก',
    noLattice: 'ยังไม่มีแบบจำลองโครงผลึกของสารนี้ (เลือกสารไอออนิก เช่น NaCl, MgO, CaF₂, Na₂O, CsCl, NH₄Cl)',
    latticeCN: (ion, n, cn) => `${ion} แต่ละตัวล้อมด้วยไอออนประจุตรงข้าม ${n} ตัว (เลขโคออร์ดิเนชัน ${cn})`,
    latticeNote: 'ไม่มีคู่ "โมเลกุล" — ทุกไอออนดึงดูดกันทั้งผลึก',
    resonanceRow: 'เรโซแนนซ์',
    resonanceNote: (pair, n, order) => `พันธะ ${pair} ${n} พันธะยาวเท่ากัน (อันดับพันธะเฉลี่ย ${order}) — โมเลกุลไม่ได้สลับไปมาระหว่างโครงสร้าง`,
    imfRow: 'แรงระหว่างโมเลกุล',
    imf: { london: 'แรงลอนดอน', dipole: 'แรงดึงดูดระหว่างขั้ว (ไดโพล–ไดโพล)', hbond: 'พันธะไฮโดรเจน', ionic: 'แรงดึงดูดไฟฟ้าระหว่างไอออน' },
    bpRow: 'จุดเดือด',
    boilNote: 'เมื่อเดือด พันธะไฮโดรเจน/แรงระหว่างโมเลกุลถูกทำลาย — พันธะโคเวเลนต์ภายในโมเลกุลไม่ขาด',
    hbondsInScene: (n) => `พันธะไฮโดรเจนในฉาก ${n} พันธะ (เส้นจุดสีเหลือง)`,
    duplicate: '📋 เพิ่มอีก 1 โมเลกุล',
    metallicNote: 'พันธะโลหะ — ของจริงเป็นผลึกโลหะ ไม่ใช่โมเลกุล',
    pureForm: 'ในสารบริสุทธิ์',
    pureMetal: (p) => `พันธะโลหะ: ไอออนบวกเรียงตัว${p ? ` แบบ ${p}` : ''} ในทะเลอิเล็กตรอน`,
    pureCarbon: 'โครงผลึกร่างตาข่าย (เพชร, แกรไฟต์) หรือโมเลกุล (ฟูลเลอรีน)',
    pureNetwork: 'โครงผลึกร่างตาข่ายแบบเพชร',
    expShapeRow: 'รูปร่างจริง (การทดลอง)',
    expAngleRow: 'มุมพันธะจากการทดลอง',
    expDihedralRow: 'มุมบิดจากการทดลอง',
    useVsepr: '📐 ดูมุมตาม VSEPR',
    useExp: '🔬 ดูมุมจากการทดลอง',
    usingVsepr: 'แสดงมุมตาม VSEPR (แบบจำลองอย่างง่าย)',
    usingExp: 'แสดงมุมจากการทดลอง',
    geoIsomer: 'ไอโซเมอร์เรขาคณิต',
    geoIsomerNote: 'หมุนรอบพันธะคู่ไม่ได้ จึงเปลี่ยนเป็นอีกแบบไม่ได้ถ้าไม่สลายพันธะ',
    chiralRow: 'คาร์บอนไครัล',
    chiralNote: 'ภาพในกระจกซ้อนทับกันไม่ได้',
    flipCisTrans: '🔄 สลับ cis ↔ trans',
    mirror: '🪞 สร้างภาพในกระจก',
    mirrorDone: 'สร้างภาพในกระจกแล้ว — ลองหมุนดู จะซ้อนทับกันไม่ได้ (R ↔ S)',
    flipped: (x) => `สลับเป็น ${x} แล้ว`,
    detachHint: 'กดค้าง (หรือ Shift+ลาก) ที่อะตอมเพื่อดึงออกจากโมเลกุล • แตะสองครั้งเพื่อแยกอะตอม',
    helpBody: `
      <h3>สร้างโมเลกุล</h3>
      <ol>
        <li>แตะ (หรือจีบนิ้วใน VR/AR) ที่ธาตุบนตารางธาตุ เพื่อสร้างอะตอม</li>
        <li>ลากอะตอมไปใกล้อีกอะตอม เมื่อมีวงสีเขียวแสดงว่าจะเกิดพันธะ — ปล่อยเพื่อเชื่อม</li>
        <li>ระบบจะจัดพันธะเดี่ยว/คู่/สามและรูปร่างโมเลกุล (VSEPR) ให้อัตโนมัติ</li>
        <li>ป้ายชื่อจะบอกชื่อโมเลกุล หรือ "แบบจำลองยังไม่สมบูรณ์" ถ้าเวเลนซ์ยังไม่ครบ</li>
      </ol>
      <h3>แยกและลบ</h3>
      <ul>
        <li>ลากอะตอม = ย้ายทั้งโมเลกุล</li>
        <li>กดค้าง/Shift+ลาก (หรือใช้สองมือใน VR จับคนละอะตอม) แล้วดึงจนพันธะเป็นสีส้ม ปล่อยเพื่อตัดพันธะ</li>
        <li>แตะอะตอมสองครั้งติดกัน = แยกอะตอมนั้นออก</li>
        <li>ลากไปปล่อยที่ถังรีไซเคิลเพื่อลบ</li>
      </ul>
      <h3>ประจุ ไอออน และเกลือ</h3>
      <ul>
        <li>แตะเลือกอะตอม แล้วกด <b>ประจุ +</b> (ดึงอิเล็กตรอนออก) หรือ <b>ประจุ −</b> (เติมอิเล็กตรอน) เช่น Na → Na⁺, Cl → Cl⁻</li>
        <li>สร้างไอออนหลายอะตอมได้ เช่น SO₄ แล้วกดประจุ − สองครั้ง ได้ SO₄²⁻ (ระบบจัดประจุฟอร์มอลบนอะตอมให้เอง แสดงเป็นป้ายวงกลม +/− บนอะตอม)</li>
        <li>วางไอออนบวกและไอออนลบไว้ใกล้กัน (เส้นประสีม่วง) ระบบจะบอกชื่อเกลือ เช่น NH₄⁺ + Cl⁻ → NH₄Cl</li>
        <li>โมเลกุลเช่น O₃, CO, HNO₃ ได้ประจุฟอร์มอลอัตโนมัติ ส่วน NO, NO₂ เป็นอนุมูลอิสระ</li>
      </ul>
      <h3>สิ่งที่แอปช่วยแก้ความเข้าใจผิด (จากงานวิจัย)</h3>
      <ul>
        <li><b>สารไอออนิกไม่ใช่โมเลกุล</b>: พันธะไอออนิกวาดเป็นเส้นประสีม่วง (แรงดึงดูดไฟฟ้า) กด "ดูโครงผลึก" เพื่อดูว่าไอออนแต่ละตัวถูกล้อมด้วยไอออนตรงข้ามหลายตัว</li>
        <li><b>พันธะไฮโดรเจน</b>: วางโมเลกุลน้ำหลายโมเลกุลใกล้กัน จะเห็นเส้นจุดสีเหลืองระหว่างโมเลกุล — การเดือดทำลายพันธะนี้ ไม่ได้ทำลายพันธะ O–H</li>
        <li><b>สภาพขั้ว</b>: ขึ้นกับรูปร่างและคู่อิเล็กตรอนโดดเดี่ยว เช่น O₃ เป็นธาตุเดียวกันแต่มีขั้ว</li>
        <li><b>เรโซแนนซ์</b>: พันธะที่มีเส้นทึบ + เส้นประ ยาวเท่ากันทุกพันธะ ประจุกระจายเป็นเศษส่วน (เช่น ⅔−)</li>
        <li><b>พลังงานพันธะ</b>: การเกิดพันธะปล่อยพลังงาน การสลายพันธะต้องใช้พลังงาน (ดูตัวเลขตอนดึงพันธะจนเป็นสีส้ม)</li>
      </ul>
      <h3>โหมดการแสดงผล</h3>
      <ul>
        <li><b>AR</b>: Chrome บน Android (ARCore) หรือ Meta Quest (passthrough)</li>
        <li><b>VR</b>: Meta Quest / แว่น VR ที่รองรับ WebXR รองรับการจับด้วยมือ (hand tracking) และคอนโทรลเลอร์</li>
        <li><b>โหมดกล้อง</b>: สำหรับ iPhone/iPad หรือเครื่องที่ไม่รองรับ WebXR — ซ้อนภาพ 3D บนกล้อง</li>
        <li>คอมพิวเตอร์: ลากพื้นที่ว่างเพื่อหมุนมุมมอง, ล้อเมาส์เพื่อซูม</li>
      </ul>`,
  },
  en: {
    appTitle: 'ChemXR Lab',
    appSubtitle: 'AR/VR virtual chemistry lab',
    periodicTable: 'Periodic table',
    move: 'Move',
    hint: 'Tap / pinch an element to create an atom, then drag atoms together to bond them',
    clear: 'Clear all',
    challenge: 'Missions',
    lonePairs: 'Lone pairs',
    recycler: 'Model recycler',
    recyclerHint: 'Release to recycle',
    enterAR: 'Enter AR',
    enterVR: 'Enter VR',
    camera: 'Camera mode',
    cameraOff: 'Camera off',
    exitXR: 'Exit',
    recenter: 'Recenter',
    help: 'Help',
    noXR: 'WebXR is not available — use 3D mode or camera mode instead',
    arUnsupported: 'AR is not supported here (try Chrome on Android or Meta Quest)',
    vrUnsupported: 'VR is not supported here (try Meta Quest Browser)',
    cameraFail: 'Could not open the camera — allow camera access and use https',
    incomplete: 'Incomplete neutral model',
    needMore: (n) => `needs ${n} more bond${n > 1 ? 's' : ''}`,
    completeUnknown: 'Complete molecule (not in database)',
    stable: 'stable, does not bond',
    syntheticNote: 'synthetic, unstable',
    atomicNumber: 'Atomic number',
    atomicMass: 'Atomic mass',
    category: 'Category',
    period: 'Period',
    group: 'Group',
    valenceE: 'Valence electrons',
    bondCap: 'Can form',
    shells: 'Electron shells',
    electroneg: 'Electronegativity',
    molarMass: 'Molar mass',
    atoms: 'Atoms',
    bonds: 'Bonds',
    single: 'single',
    double: 'double',
    triple: 'triple',
    shape: 'Shape (VSEPR)',
    around: 'around',
    polarity: 'Polarity',
    polar: 'Polar',
    nonpolar: 'Nonpolar',
    bondType: 'Bond type',
    ionic: 'Ionic (metal + nonmetal)',
    formulaMass: 'Formula mass',
    oneLewis: '(one resonance structure)',
    crystalForceRow: 'Attractive forces',
    covalent: 'Covalent',
    status: 'Status',
    missingAt: (sym, n) => `${sym} needs ${n} more bond${n > 1 ? 's' : ''}`,
    tapHint: 'Tap an atom or element to see details',
    challengeBuild: 'Build',
    challengeDone: 'Done! ',
    challengeAll: 'All missions complete 🎉',
    skip: 'Skip',
    score: 'Score',
    bonded: 'Bonded!',
    broke: 'Bond broken',
    recycled: 'Recycled',
    embedNote: 'This page runs in 3D mode (mouse/touch). AR, VR and camera modes need the project hosted over HTTPS, e.g. on GitHub Pages.',
    chargePlus: 'Charge +',
    chargeMinus: 'Charge −',
    chargePlusTitle: 'Remove one electron (charge +1)',
    chargeMinusTitle: 'Add one electron (charge −1)',
    tryCharge: (q) => `try an ion with charge ${q > 0 ? '+' : '−'}${Math.abs(q)}`,
    overValence: 'too many bonds',
    radicalNote: 'Radical: has an unpaired electron',
    impossibleIon: 'this ion is not stable',
    ion: 'ion',
    netCharge: 'Net charge',
    ions: 'Ions',
    formalCharges: 'Formal charges',
    hintRow: 'Hint',
    hintCharge: (q) => `${q > 0 ? 'Remove' : 'Add'} ${Math.abs(q)} electron${Math.abs(q) > 1 ? 's' : ''} (charge ${q > 0 ? '+' : '−'}${Math.abs(q)}) to complete it — press "Charge ${q > 0 ? '+' : '−'}"`,
    lostElectron: (f) => `Removed one electron → ${f}`,
    gainedElectron: (f) => `Added one electron → ${f}`,
    chargeLimit: 'Charge limit reached (±3)',
    selectAtomFirst: 'Tap an atom first, then press a charge button',
    saltFormed: (n) => `🧂 The ions form ${n}`,
    breakCost: (e) => `Breaking this bond needs ${e} kJ/mol`,
    bondFormedE: (pair, e) => `⚡ ${pair} bond formed · ${e} kJ/mol released`,
    bondBrokenE: (e) => `🔥 Bond broken · ${e} kJ/mol absorbed`,
    energyRow: 'Total bond energy',
    energyNote: (e) => `${e} kJ/mol (needed to separate all the atoms)`,
    formulaUnit: 'Formula unit (ionic crystal)',
    ionicNoteRow: 'Real structure',
    ionicNote: 'An ionic crystal, not molecules. The formula gives the ion ratio (formula unit); every ion is surrounded by several oppositely charged ions.',
    lattice: 'Lattice',
    showLattice: '🔷 Show crystal lattice',
    hideLattice: 'Hide lattice',
    noLattice: 'No lattice model for this substance yet (try an ionic compound such as NaCl, MgO, CaF₂, Na₂O, CsCl, NH₄Cl)',
    latticeCN: (ion, n, cn) => `each ${ion} is surrounded by ${n} oppositely charged ions (coordination ${cn})`,
    latticeNote: 'No "molecules": every ion attracts its neighbours throughout the crystal',
    resonanceRow: 'Resonance',
    resonanceNote: (pair, n, order) => `${n} ${pair} bonds are identical (average bond order ${order}); the molecule does not flip between structures`,
    imfRow: 'Intermolecular forces',
    imf: { london: 'London dispersion', dipole: 'dipole–dipole', hbond: 'hydrogen bonding', ionic: 'electrostatic attraction between ions' },
    bpRow: 'Boiling point',
    boilNote: 'Boiling breaks hydrogen bonds / intermolecular forces, not the covalent bonds inside the molecule',
    hbondsInScene: (n) => `${n} hydrogen bond${n > 1 ? 's' : ''} in the scene (yellow dotted lines)`,
    duplicate: '📋 Add another molecule',
    metallicNote: 'Metallic bonding — really a metal crystal, not a molecule',
    pureForm: 'As a pure substance',
    pureMetal: (p) => `metallic bonding: positive ions${p ? ` (${p})` : ''} in a sea of electrons`,
    pureCarbon: 'covalent network (diamond, graphite) or molecules (fullerene)',
    pureNetwork: 'diamond-type covalent network',
    expShapeRow: 'Real shape (experiment)',
    expAngleRow: 'Experimental bond angle',
    expDihedralRow: 'Experimental dihedral',
    useVsepr: '📐 Show VSEPR angle',
    useExp: '🔬 Show experimental angle',
    usingVsepr: 'Showing the VSEPR angle (simple model)',
    usingExp: 'Showing the experimental angle',
    geoIsomer: 'Geometric isomer',
    geoIsomerNote: 'the double bond cannot rotate, so it cannot change without breaking a bond',
    chiralRow: 'Chiral carbon',
    chiralNote: 'its mirror image cannot be superimposed',
    flipCisTrans: '🔄 Switch cis ↔ trans',
    mirror: '🪞 Make mirror image',
    mirrorDone: 'Mirror image created — rotate it: they cannot be superimposed (R ↔ S)',
    flipped: (x) => `Switched to ${x}`,
    detachHint: 'Long-press (or Shift+drag) an atom to pull it out • double-tap to detach it',
    helpBody: `
      <h3>Build molecules</h3>
      <ol>
        <li>Tap (or pinch in VR/AR) an element on the periodic table to create an atom</li>
        <li>Drag an atom close to another one. A green ring means a bond will form — release to connect</li>
        <li>Single/double/triple bonds and the 3D shape (VSEPR) are worked out automatically</li>
        <li>The label shows the molecule name, or "Incomplete neutral model" if valences are not satisfied</li>
      </ol>
      <h3>Break and delete</h3>
      <ul>
        <li>Dragging an atom moves the whole molecule</li>
        <li>Long-press / Shift+drag (or grab two atoms with two hands in VR) and pull until the bond turns orange, then release to break it</li>
        <li>Double-tap an atom to detach it</li>
        <li>Drop on the recycler to delete</li>
      </ul>
      <h3>Charges, ions and salts</h3>
      <ul>
        <li>Tap an atom, then press <b>Charge +</b> (remove an electron) or <b>Charge −</b> (add an electron), e.g. Na → Na⁺, Cl → Cl⁻</li>
        <li>Polyatomic ions work too: build SO₄ and press Charge − twice for SO₄²⁻ (formal charges are placed automatically and shown as +/− badges)</li>
        <li>Place positive and negative ions close together (purple dashed line) and the salt is named, e.g. NH₄⁺ + Cl⁻ → NH₄Cl</li>
        <li>Molecules such as O₃, CO and HNO₃ get formal charges automatically; NO and NO₂ are radicals</li>
      </ul>
      <h3>Research-based misconception fixes</h3>
      <ul>
        <li><b>Ionic compounds are not molecules</b>: ionic bonds are drawn as purple dashes (electrostatic attraction); press "Show crystal lattice" to see each ion surrounded by many opposite ions</li>
        <li><b>Hydrogen bonds</b>: place several water molecules together to see yellow dotted lines between molecules — boiling breaks these, not the O–H bonds</li>
        <li><b>Polarity</b> depends on shape and lone pairs: O₃ is made of one element yet is polar</li>
        <li><b>Resonance</b>: bonds drawn solid + dashed are all identical; charges spread as fractions (e.g. ⅔−)</li>
        <li><b>Bond energy</b>: forming bonds releases energy; breaking bonds needs energy (see the number while stretching a bond orange)</li>
      </ul>
      <h3>Modes</h3>
      <ul>
        <li><b>AR</b>: Chrome on Android (ARCore) or Meta Quest (passthrough)</li>
        <li><b>VR</b>: Meta Quest or any WebXR headset — hand tracking and controllers supported</li>
        <li><b>Camera mode</b>: for iPhone/iPad or devices without WebXR — overlays 3D on the camera feed</li>
        <li>Desktop: drag empty space to orbit, mouse wheel to zoom</li>
      </ul>`,
  },
};

let lang = 'th';
try { lang = localStorage.getItem('chemxr-lang') || 'th'; } catch { /* ไม่มี storage */ }
const listeners = new Set();

export function getLang() { return lang; }
export function setLang(l) {
  lang = l;
  try { localStorage.setItem('chemxr-lang', l); } catch { /* ignore */ }
  listeners.forEach((fn) => fn(l));
}
export function onLangChange(fn) { listeners.add(fn); }
export function t(key, ...args) {
  const v = STRINGS[lang][key] ?? STRINGS.th[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}
