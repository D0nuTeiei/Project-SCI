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
    ionic: 'ไอออนิก (ΔEN ≥ 1.7)',
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
    ionic: 'Ionic (ΔEN ≥ 1.7)',
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
