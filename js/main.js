// ChemXR Lab — แล็บเคมีเสมือนบนเว็บ (WebXR AR/VR + โหมด 3D + โหมดกล้อง)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChemSystem } from './chemistry.js';
import { relax, atomRadius, attractHydrogenBonds } from './physics.js';
import { structureOptions } from './lattice.js';
import { flipDoubleBond, mirrorPositions } from './stereo.js';
import { MoleculeViews } from './views.js';
import { PeriodicPanel, PANEL_WIDTH, PANEL_HEIGHT } from './periodicPanel.js';
import { Interaction, Pointer } from './interaction.js';
import { InfoCard3D, describeElement, describeMolecule, renderInfoHTML } from './info.js';
import { Challenge } from './challenge.js';
import { TextSprite } from './textures.js';
import { sfx } from './audio.js';
import { t, getLang, setLang, onLangChange } from './i18n.js';
import { prettyFormula, chargeSuffix } from './molecules.js';
import { analyze } from './chemistry.js';
import { BY_SYMBOL } from './elements.js';

const $ = (id) => document.getElementById(id);
const WORLD_HOME = new THREE.Vector3(0, 1.0, 0);
// เวอร์ชันฝัง (เช่น Artifact) ไม่มีสิทธิ์ใช้ WebXR/กล้อง จึงเหลือเฉพาะโหมด 3D
const EMBED = !!window.CHEMXR_EMBED;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.xr.enabled = true;
$('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const BG = new THREE.Color(0x0b1220);
scene.background = BG;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(1, 3, 2);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.25;
controls.maxDistance = 4;

// พื้นห้อง/โต๊ะ (ซ่อนใน AR)
const envGroup = new THREE.Group();
const grid = new THREE.GridHelper(12, 48, 0x2a4a7a, 0x16243c);
envGroup.add(grid);
scene.add(envGroup);

// world group = พื้นที่ทำงานทั้งหมด (ย้ายมาอยู่ตรงหน้าผู้ใช้ตอนเข้า XR)
const world = new THREE.Group();
world.position.copy(WORLD_HOME);
scene.add(world);

const table = new THREE.Mesh(
  new THREE.CylinderGeometry(0.36, 0.36, 0.012, 64),
  new THREE.MeshStandardMaterial({ color: 0x1b2d4f, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.75 }),
);
table.position.set(0, -0.09, -0.02);
world.add(table);

// แผงตารางธาตุ + ถังรีไซเคิล + การ์ดข้อมูล 3D
const panelGroup = new THREE.Group();
panelGroup.position.set(0, 0.28, -0.22);
panelGroup.rotation.x = -0.12;
world.add(panelGroup);
const panel = new PeriodicPanel();
panelGroup.add(panel.mesh);

function makeRecycler() {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x2ee88a, toneMapped: false });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.0035, 12, 64), ringMat);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.0018, 8, 64), ringMat);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.016, 24, 16), new THREE.MeshStandardMaterial({ color: 0x1f6f6a, roughness: 0.4 }));
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.002, 8, 48), new THREE.MeshStandardMaterial({ color: 0x2fd1a0 }));
  orbit.rotation.x = 1.25;
  g.add(outer, inner, planet, orbit);
  g.userData = { ringMat, orbit };
  return g;
}
const recycler = makeRecycler();
recycler.position.set(0.4, -PANEL_HEIGHT / 2 + 0.06, 0.07);
panelGroup.add(recycler);
const recyclerLabel = new TextSprite([], { worldHeightPerPx: 0.00028, background: null });
recyclerLabel.position.set(0, 0.05, 0);
recycler.add(recyclerLabel);

const infoCard = new InfoCard3D();
infoCard.mesh.position.set(-0.52, 0.0, 0.08);
infoCard.mesh.rotation.y = 0.45;
infoCard.mesh.visible = false;
panelGroup.add(infoCard.mesh);

const xrToast = new TextSprite([], { worldHeightPerPx: 0.00026 });
xrToast.position.set(0, PANEL_HEIGHT / 2 + 0.03, 0.04);
xrToast.visible = false;
panelGroup.add(xrToast);

// ---------- โมเดลเคมี ----------
const sys = new ChemSystem();
const views = new MoleculeViews(world, sys);
const challenge = new Challenge();
const flyers = new Map(); // atom -> ตำแหน่งปลายทาง

let selection = null; // { kind: 'element', el } | { kind: 'atom', atom }
let recognized = new Set();
let showLonePairs = false;

const app = {
  sys, views, panel, panelGroup, world, recycler,
  spawnAtom(el, pos) {
    sfx.spawn();
    return sys.addAtom(el, pos.clone());
  },
  flyToWorkspace(atom) {
    // หาตำแหน่งว่างบนโต๊ะ
    const spots = [];
    for (let z = -0.02; z <= 0.1; z += 0.06) for (let x = -0.24; x <= 0.24; x += 0.06) spots.push(new THREE.Vector3(x, 0.0, z));
    spots.sort((a, b) => Math.abs(a.x) + Math.abs(a.z) - (Math.abs(b.x) + Math.abs(b.z)));
    const free = spots.find((s) => sys.atoms.every((a) => a === atom || a.pos.distanceTo(s) > 0.07)) || spots[0];
    flyers.set(atom, free);
  },
  onButton(id) {
    sfx.click();
    if (id === 'clear') clearAll();
    else if (id === 'challenge') toggleChallenge();
    else if (id === 'lonepairs') toggleLonePairs();
    else if (id === 'lang') setLang(getLang() === 'th' ? 'en' : 'th');
    else if (id === 'chargePlus') changeCharge(1);
    else if (id === 'chargeMinus') changeCharge(-1);
    else if (id === 'lattice') toggleLattice();
  },
  onBond(a, b, energy) {
    sfx.bond();
    selection = { kind: 'atom', atom: a };
    if (Number.isFinite(energy) && energy > 0) {
      // การเกิดพันธะปล่อยพลังงาน (Boo 1998: นักเรียนเกือบครึ่งเข้าใจกลับกัน)
      const pair = `${a.el.symbol}–${b.el.symbol}`;
      lastEnergy = { text: `⚡ ${energy} kJ/mol`, time: performance.now() };
      toast(t('bondFormedE', pair, energy));
      views.burst(a.pos.clone().add(b.pos).multiplyScalar(0.5), 0xffd54f);
    }
  },
  onBreak(atom, energy) {
    sfx.break();
    toast(Number.isFinite(energy) && energy > 0 ? t('bondBrokenE', energy) : t('broke'));
  },
  onDetach(atom, energy) {
    sfx.break();
    if (Number.isFinite(energy) && energy > 0) toast(t('bondBrokenE', energy));
  },
  onRecycle() { sfx.recycle(); toast(t('recycled')); selection = null; },
  onSelectAtom(atom) { selection = { kind: 'atom', atom }; panel.selected = null; infoDirty = true; },
  onSelectElement(el, atom = null) {
    // อะตอมที่เพิ่งสร้างถูกเลือกทันที จะได้กดปุ่มประจุต่อได้เลย
    selection = atom ? { kind: 'atom', atom } : { kind: 'element', el };
    panel.selected = el;
  },
  onLongPress() {
    navigator.vibrate?.(25);
    toast(t('detachHint'));
  },
};
const interaction = new Interaction(app);

function clearAll() {
  interaction.clear();
  views.hideLattice();
  flyers.clear();
  sys.clear();
  selection = null;
  panel.selected = null;
}

function toggleChallenge() {
  challenge.active = !challenge.active;
  if (challenge.active && challenge.done) challenge.reset();
  panel.toggles.challenge = challenge.active;
  updateChallengeUI();
}

function toggleLonePairs() {
  showLonePairs = !showLonePairs;
  panel.toggles.lonePairs = showLonePairs;
  $('btn-lp').classList.toggle('on', showLonePairs);
}

// ---------- UI (HTML) ----------
let toastTimer = 0;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  xrToast.setLines([{ text: msg, size: 40 }]);
  xrToast.userData.until = performance.now() + 2200;
}

function updateChallengeUI() {
  const bar = $('challenge-bar');
  bar.hidden = !challenge.active;
  $('btn-challenge').classList.toggle('on', challenge.active);
  const text = challenge.active ? challenge.text(t) : '';
  $('challenge-text').textContent = text;
  panel.footerText = text;
}

function applyLang() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('help-body').innerHTML = t('helpBody') + (EMBED ? `<p class="note">${t('embedNote')}</p>` : '');
  $('btn-lang').textContent = getLang() === 'th' ? 'EN' : 'TH';
  $('btn-plus').title = t('chargePlusTitle');
  $('btn-minus').title = t('chargeMinusTitle');
  recyclerLabel.setLines([{ text: t('recycler'), size: 30 }, { text: t('recyclerHint'), size: 24, color: '#9fe8b0' }]);
  if (camStream) $('btn-camera').querySelector('span').textContent = t('cameraOff');
  updateChallengeUI();
  infoDirty = true;
}
onLangChange(applyLang);

let infoDirty = true;
let infoTimer = 0;
function updateInfo(force = false) {
  if (!force && !infoDirty) return;
  infoDirty = false;
  let d = null;
  if (selection?.kind === 'element') d = describeElement(selection.el);
  else if (selection?.kind === 'atom' && !selection.atom.removed) {
    const comp = new Set(sys.componentOf(selection.atom).atoms);
    const hbondCount = views.hbonds.filter((hb) => comp.has(hb.h) || comp.has(hb.acceptor)).length;
    d = describeMolecule(sys, selection.atom, {
      hbondCount, cluster: clusterOf(selection.atom), stereo: views.stereoOf(selection.atom), useExperimental: views.useExperimental,
    });
  }
  $('info-body').innerHTML = renderInfoHTML(d);
  if (infoCard.mesh.visible) infoCard.draw(d, challenge.active ? challenge.text(t) : '');
}

/** เติม/ดึงอิเล็กตรอนของอะตอมที่เลือก */
function changeCharge(delta) {
  const atom = selection?.kind === 'atom' && !selection.atom.removed ? selection.atom : null;
  if (!atom) { toast(t('selectAtomFirst')); return; }
  if (!sys.addCharge(atom, delta)) { toast(t('chargeLimit')); return; }
  const pretty = analyze(sys.componentOf(atom)).pretty;
  // ถ้าได้ไอออนที่รู้จัก ป้ายแจ้งชื่อจะขึ้นแทน
  if (!(views.sync() && onStructureChanged())) toast(t(delta > 0 ? 'lostElectron' : 'gainedElectron', pretty));
  infoDirty = true;
}

let lastEnergy = null;
function celebrate(center, entry, pretty) {
  views.burst(center);
  const name = getLang() === 'th' ? entry.th : entry.en;
  // ถ้าเพิ่งเกิดพันธะ แสดงพลังงานที่ปล่อยออกมาด้วย
  const energy = lastEnergy && performance.now() - lastEnergy.time < 1500 ? `  ${lastEnergy.text}` : '';
  toast(`✨ ${name} · ${pretty}${energy}`);
}

/** กลุ่มไอออน (เกลือ) ที่อะตอมนี้อยู่ */
function clusterOf(atom) {
  for (const c of views.clusters.values()) {
    if (c.data.members.some((m) => m.comp.atoms.includes(atom))) return c.data;
  }
  return null;
}

/** ตัวเลือกโครงสร้างผลึกของสิ่งที่เลือกอยู่ (ไอออนิก / ร่างตาข่าย / โลหะ) */
function currentStructureOptions() {
  if (selection?.kind === 'element') return { options: structureOptions({ el: selection.el }), formula: selection.el.symbol };
  const atom = selection?.kind === 'atom' && !selection.atom.removed ? selection.atom : null;
  if (!atom) return { options: [], formula: '' };
  const cl = clusterOf(atom);
  if (cl) return { options: structureOptions({ ionGroups: cl.ionGroups }), formula: cl.pretty };
  const info = analyze(sys.componentOf(atom));
  const el = info.single && !info.charge ? atom.el : null;
  return { options: structureOptions({ info, el }), formula: info.pretty };
}

/** เปิด/ปิดโครงสร้างผลึก (id = ตัวเลือกที่ต้องการ หรือว่าง = ตัวแรก) */
function toggleLattice(id = null) {
  const { options, formula } = currentStructureOptions();
  const opt = id ? options.find((o) => o.id === id) : options[0];
  if (!opt) {
    if (views.lattice) views.hideLattice(); else toast(t('noLattice'));
    return;
  }
  const st = opt.build();
  st.formula = formula;
  if (views.lattice?.key === st.key) { views.hideLattice(); return; }
  views.showLattice(st, new THREE.Vector3(-0.2, 0.07, 0.08));
  infoDirty = true;
}

/** สลับ cis ↔ trans ของพันธะคู่ในโมเลกุลที่เลือก */
function flipSelection() {
  const atom = selection?.kind === 'atom' && !selection.atom.removed ? selection.atom : null;
  const st = atom && views.stereoOf(atom);
  if (!st?.dbs.length) return;
  flipDoubleBond(sys, st.dbs[0]);
  setTimeout(() => {
    const now = views.stereoOf(atom)?.dbs[0];
    if (now) toast(t('flipped', now.cisTrans || now.ez));
  }, 700);
}

/** สร้างภาพในกระจกของโมเลกุลที่เลือก วางไว้ข้าง ๆ */
function mirrorSelection() {
  const made = duplicateSelection();
  if (!made) return;
  mirrorPositions(made);
  toast(t('mirrorDone'));
}

/** ทำสำเนาโมเลกุลที่เลือก วางข้าง ๆ (ใช้ดูพันธะไฮโดรเจนระหว่างโมเลกุล) */
function duplicateSelection() {
  const atom = selection?.kind === 'atom' && !selection.atom.removed ? selection.atom : null;
  if (!atom) { toast(t('selectAtomFirst')); return null; }
  const comp = sys.componentOf(atom);
  const box = new THREE.Box3();
  comp.atoms.forEach((a) => box.expandByPoint(a.pos));
  const shift = new THREE.Vector3(box.max.x - box.min.x + 0.07, 0, 0.02);
  const map = new Map();
  for (const a of comp.atoms) map.set(a, sys.addAtom(a.el, a.pos.clone().add(shift)));
  for (const b of comp.bonds) sys.addBond(map.get(b.a), map.get(b.b));
  for (const a of comp.atoms) {
    for (let k = 0; k < Math.abs(a.userCharge); k++) sys.addCharge(map.get(a), Math.sign(a.userCharge));
  }
  sfx.spawn();
  return [...map.values()];
}

function checkChallenge(entries) {
  const done = challenge.check(entries);
  if (!done) return false;
  sfx.success();
  toast(`${t('challengeDone')}${prettyFormula(done.f)}${chargeSuffix(done.q)} ✓  (+10)`);
  updateChallengeUI();
  return true;
}

/** คืนค่า true ถ้ามีการแจ้งโมเลกุลใหม่ */
function onStructureChanged() {
  const now = new Set();
  for (const e of views.analyses) {
    // อนุมูลอิสระเกิดบ่อยระหว่างต่อโมเลกุล จึงไม่ฉลอง
    if (!e.info.entry || e.info.radical) continue;
    const id = e.key + '|' + e.info.entry.id;
    now.add(id);
    if (!recognized.has(id)) {
      const c = new THREE.Vector3();
      e.comp.atoms.forEach((a) => c.add(a.pos));
      c.divideScalar(e.comp.atoms.length);
      celebrate(c, e.info.entry, e.info.pretty);
    }
  }
  const fresh = [...now].some((id) => !recognized.has(id));
  recognized = now;
  if (!checkChallenge(views.analyses.map((e) => e.info.entry)) && fresh) sfx.success();
  infoDirty = true;
  return fresh;
}

/** ไอออนที่วางใกล้กันจนเกิดเป็นเกลือ */
function onNewClusters() {
  for (const c of views.takeNewClusters()) {
    const center = new THREE.Vector3();
    let n = 0;
    c.members.forEach((m) => m.comp.atoms.forEach((a) => { center.add(a.pos); n++; }));
    celebrate(center.divideScalar(n), c.entry, c.pretty);
    toast(t('saltFormed', `${getLang() === 'th' ? c.entry.th : c.entry.en} · ${c.pretty}`));
    if (!checkChallenge([c.entry])) sfx.success();
  }
}

// ปุ่ม HTML
$('btn-clear').onclick = () => app.onButton('clear');
$('btn-challenge').onclick = () => app.onButton('challenge');
$('btn-lp').onclick = () => app.onButton('lonepairs');
$('btn-plus').onclick = () => app.onButton('chargePlus');
// ปุ่มในการ์ดข้อมูล (ดูโครงผลึก / ทำสำเนา)
$('info-body').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  sfx.click();
  const act = btn.dataset.action;
  if (act.startsWith('struct:')) toggleLattice(act.slice(7));
  else if (act === 'duplicate') duplicateSelection();
  else if (act === 'flip') flipSelection();
  else if (act === 'mirror') mirrorSelection();
  else if (act === 'expToggle') {
    views.setExperimental(!views.useExperimental);
    toast(t(views.useExperimental ? 'usingExp' : 'usingVsepr'));
  }
  infoDirty = true;
});
$('btn-minus').onclick = () => app.onButton('chargeMinus');
$('btn-lang').onclick = () => app.onButton('lang');
$('btn-skip').onclick = () => { challenge.skip(); updateChallengeUI(); };
$('btn-help').onclick = () => $('help-dialog').showModal();
$('btn-help-close').onclick = () => $('help-dialog').close();
$('btn-info-toggle').onclick = () => $('info-card').classList.toggle('collapsed');
$('btn-ar').onclick = () => startXR('ar');
$('btn-vr').onclick = () => startXR('vr');
$('btn-camera').onclick = () => toggleCamera();
$('btn-exit').onclick = () => renderer.xr.getSession()?.end();
$('btn-recenter').onclick = () => { needsPlacement = 2; };
// ปุ่มบน DOM overlay ไม่ให้กลายเป็นการแตะในฉาก AR
document.querySelectorAll('#overlay button, #info-card, #challenge-bar').forEach((el) => {
  el.addEventListener('beforexrselect', (e) => e.preventDefault());
});

// ---------- อินพุตหน้าจอ (เมาส์/ทัช) ----------
const screenPointers = new Map();
const ndc = new THREE.Vector2();
const screenRay = new THREE.Raycaster();

function screenPointer(e) {
  let p = screenPointers.get(e.pointerId);
  if (!p) {
    p = new Pointer('s' + e.pointerId, e.pointerType === 'mouse' ? 'mouse' : 'touch');
    p.allowLongPress = true;
    p.haptic = () => navigator.vibrate?.(10);
    p.ndc = new THREE.Vector2();
    screenPointers.set(e.pointerId, p);
  }
  const rect = renderer.domElement.getBoundingClientRect();
  p.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  p.shift = e.shiftKey;
  return p;
}

function updateScreenRay(p) {
  ndc.copy(p.ndc);
  screenRay.setFromCamera(ndc, camera);
  p.origin.copy(screenRay.ray.origin);
  p.dir.copy(screenRay.ray.direction);
}

window.addEventListener('pointerdown', (e) => {
  if (renderer.xr.isPresenting || e.target !== renderer.domElement) return;
  sfx.unlock();
  const p = screenPointer(e);
  p.pressed = true;
  updateScreenRay(p);
  if (interaction.pointerDown(p)) {
    controls.enabled = false;
    infoDirty = true;
  }
}, { capture: true });

window.addEventListener('pointermove', (e) => {
  if (renderer.xr.isPresenting) return;
  if (e.target !== renderer.domElement && !screenPointers.has(e.pointerId)) return;
  if (e.pointerType !== 'mouse' && !screenPointers.has(e.pointerId)) return;
  screenPointer(e);
});

function endScreenPointer(e) {
  const p = screenPointers.get(e.pointerId);
  if (!p) return;
  updateScreenRay(p);
  interaction.pointerUp(p);
  p.pressed = false;
  if (p.kind !== 'mouse' || e.type === 'pointercancel') screenPointers.delete(e.pointerId);
  if (![...screenPointers.values()].some((q) => q.pressed && interaction.grabs.has(q.id))) controls.enabled = true;
  infoDirty = true;
}
window.addEventListener('pointerup', endScreenPointer);
window.addEventListener('pointercancel', endScreenPointer);
renderer.domElement.addEventListener('pointerleave', (e) => {
  const p = screenPointers.get(e.pointerId);
  if (p && p.kind === 'mouse' && !p.pressed) screenPointers.delete(e.pointerId);
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selection?.kind === 'atom' && !selection.atom.removed && document.activeElement === document.body) {
      sys.removeAtom(selection.atom);
      app.onRecycle();
    }
  }
});

// ---------- WebXR ----------
const xrPointers = [];
const xrQueue = [];
let xrMode = null; // 'ar' | 'vr' | null
let needsPlacement = 0;
let domOverlay = false;
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
const rayMat = new THREE.LineBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.7 });
const cursorGeo = new THREE.SphereGeometry(0.004, 12, 8);
const cursorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const jointGeo = new THREE.SphereGeometry(1, 10, 8);
const jointMat = new THREE.MeshStandardMaterial({ color: 0xd8e6ff, roughness: 0.5, transparent: true, opacity: 0.8 });
const padGeo = new THREE.CylinderGeometry(0.016, 0.02, 0.11, 16).rotateX(Math.PI / 2);
const padMat = new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.5 });

for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  const grip = renderer.xr.getControllerGrip(i);
  const hand = renderer.xr.getHand(i);
  scene.add(controller, grip, hand);

  const ray = new THREE.Line(rayGeo, rayMat);
  const cursor = new THREE.Mesh(cursorGeo, cursorMat);
  controller.add(ray, cursor);
  ray.visible = cursor.visible = false;
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.visible = false;
  grip.add(pad);

  const p = new Pointer('xr' + i, 'controller');
  p.connected = false;
  Object.assign(p, { controller, grip, hand, ray, cursor, pad });
  xrPointers.push(p);

  controller.addEventListener('connected', (e) => {
    const src = e.data;
    p.connected = true;
    p.inputSource = src;
    p.kind = src.hand ? 'hand' : src.targetRayMode === 'screen' ? 'screen' : 'controller';
    p.rotate = p.kind !== 'screen';
    p.haptic = (v, ms) => src.gamepad?.hapticActuators?.[0]?.pulse?.(v, ms);
    pad.visible = p.kind === 'controller';
  });
  controller.addEventListener('disconnected', () => {
    p.connected = false;
    pad.visible = false;
    xrQueue.push(['cancel', p]);
  });
  controller.addEventListener('selectstart', () => { sfx.unlock(); xrQueue.push(['down', p]); });
  controller.addEventListener('selectend', () => xrQueue.push(['up', p]));
}

const _m = new THREE.Vector3();
const _n = new THREE.Vector3();
function updateXRPointer(p) {
  p.controller.updateMatrixWorld(true);
  p.origin.setFromMatrixPosition(p.controller.matrixWorld);
  p.quat = p.controller.getWorldQuaternion(p.quat || new THREE.Quaternion());
  p.dir.set(0, 0, -1).applyQuaternion(p.quat);
  p.near = null;
  if (p.kind === 'hand') {
    const tip = p.hand.joints?.['index-finger-tip'];
    const thumb = p.hand.joints?.['thumb-tip'];
    if (tip && thumb && tip.visible && thumb.visible) {
      tip.getWorldPosition(_m);
      thumb.getWorldPosition(_n);
      p.near = _m.add(_n).multiplyScalar(0.5).clone();
    }
  } else if (p.kind === 'controller' && p.grip.visible) {
    p.near = p.grip.getWorldPosition(new THREE.Vector3());
  }
  // มือใน VR: แสดงข้อต่อนิ้วเป็นลูกบอลเล็ก ๆ
  if (p.kind === 'hand' && p.hand.joints) {
    for (const joint of Object.values(p.hand.joints)) {
      if (!joint.userData.mesh) {
        const m = new THREE.Mesh(jointGeo, jointMat);
        m.scale.setScalar(Math.max(0.004, (joint.jointRadius || 0.008) * 0.9));
        joint.add(m);
        joint.userData.mesh = m;
      }
      joint.userData.mesh.visible = xrMode === 'vr';
    }
  }
}

async function startXR(mode) {
  sfx.unlock();
  if (!navigator.xr) { toast(t('noXR')); return; }
  const type = 'immersive-' + mode;
  let supported = false;
  try { supported = await navigator.xr.isSessionSupported(type); } catch { /* ignore */ }
  if (!supported) { toast(t(mode === 'ar' ? 'arUnsupported' : 'vrUnsupported')); return; }
  if (camStream) stopCamera();
  const init = mode === 'ar'
    ? { optionalFeatures: ['local-floor', 'hand-tracking', 'dom-overlay'], domOverlay: { root: $('overlay') } }
    : { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] };
  let session;
  try {
    session = await navigator.xr.requestSession(type, init);
  } catch (err) {
    toast(String(err.message || err));
    return;
  }
  let refType = 'local-floor';
  try { await session.requestReferenceSpace('local-floor'); } catch { refType = 'local'; }
  renderer.xr.setReferenceSpaceType(refType);
  await renderer.xr.setSession(session);
  xrMode = mode;
  domOverlay = !!session.domOverlayState;
  recycler.position.set(0.4, -PANEL_HEIGHT / 2 + 0.06, 0.07);
  needsPlacement = 3;
  screenPointers.clear();
  interaction.clear();
  scene.background = mode === 'ar' ? null : BG;
  envGroup.visible = mode === 'vr';
  table.visible = mode === 'vr';
  infoCard.mesh.visible = !domOverlay;
  infoDirty = true;
  document.body.classList.add('in-xr', 'xr-' + mode);
  document.body.classList.toggle('dom-overlay', domOverlay);
  session.addEventListener('end', onXREnd);
}

function onXREnd() {
  xrMode = null;
  domOverlay = false;
  interaction.clear();
  xrQueue.length = 0;
  for (const p of xrPointers) { p.connected = false; p.pad.visible = false; }
  world.position.copy(WORLD_HOME);
  world.rotation.set(0, 0, 0);
  scene.background = camStream ? null : BG;
  envGroup.visible = !camStream;
  table.visible = true;
  infoCard.mesh.visible = false;
  xrToast.visible = false;
  document.body.classList.remove('in-xr', 'xr-ar', 'xr-vr', 'dom-overlay');
  frameCamera();
}

/** วางพื้นที่ทำงานไว้ตรงหน้าผู้ใช้ */
function placeWorldInFront() {
  const xrCam = renderer.xr.getCamera();
  const pos = new THREE.Vector3().setFromMatrixPosition(xrCam.matrixWorld);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(xrCam.matrixWorld));
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
  fwd.normalize();
  const phoneAR = xrMode === 'ar' && isMobile && !xrPointers.some((p) => p.connected && p.kind !== 'screen');
  const dist = phoneAR ? 0.85 : 0.5;
  world.position.copy(pos).addScaledVector(fwd, dist);
  world.position.y = pos.y - (phoneAR ? 0.25 : 0.38);
  world.rotation.set(0, Math.atan2(-fwd.x, -fwd.z), 0);
  world.updateMatrixWorld(true);
}

// ---------- โหมดกล้อง (สำหรับอุปกรณ์ที่ไม่มี WebXR เช่น iPhone) ----------
let camStream = null;
async function toggleCamera() {
  if (camStream) { stopCamera(); return; }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  } catch {
    toast(t('cameraFail'));
    return;
  }
  const video = $('camera-feed');
  video.srcObject = camStream;
  await video.play().catch(() => {});
  scene.background = null;
  envGroup.visible = false;
  document.body.classList.add('camera-on');
  $('btn-camera').querySelector('span').textContent = t('cameraOff');
}
function stopCamera() {
  camStream?.getTracks().forEach((tr) => tr.stop());
  camStream = null;
  $('camera-feed').srcObject = null;
  scene.background = BG;
  envGroup.visible = true;
  document.body.classList.remove('camera-on');
  $('btn-camera').querySelector('span').textContent = t('camera');
}

// ---------- กล้องโหมด 3D ----------
function frameCamera() {
  // จอกว้าง: เลื่อนฉากไปทางซ้ายเพื่อเว้นที่ให้การ์ดข้อมูลด้านขวา
  const w = window.innerWidth;
  const h = window.innerHeight;
  const wide = camera.aspect > 1.2 && w > 720;
  const shift = wide ? 340 : 0; // ความกว้างของการ์ดข้อมูล
  if (shift) camera.setViewOffset(w + shift, h, shift, 0, w, h);
  else camera.clearViewOffset();
  // จอแนวตั้ง: ย้ายถังรีไซเคิลลงไปใต้แผง แล้วซูมให้แผงเต็มความกว้างจอ
  const portrait = camera.aspect < 0.9;
  if (portrait) recycler.position.set(0.25, -PANEL_HEIGHT / 2 - 0.07, 0.08);
  else recycler.position.set(0.4, -PANEL_HEIGHT / 2 + 0.06, 0.07);
  const target = new THREE.Vector3(portrait ? 0 : 0.04, WORLD_HOME.y + (portrait ? 0.15 : 0.17), -0.1);
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (w - shift) / h);
  const dist = Math.max((portrait ? 0.34 : 0.48) / Math.tan(hfov / 2), 0.4 / Math.tan(vfov / 2)) * 1.02;
  camera.position.set(0, target.y + dist * 0.18, target.z + dist);
  controls.target.copy(target);
  camera.updateProjectionMatrix();
  controls.update();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  if (!renderer.xr.isPresenting) renderer.setSize(window.innerWidth, window.innerHeight);
  frameCamera();
}
window.addEventListener('resize', onResize);

/** กันอะตอมจมเข้าไปในแผงตารางธาตุ (จะได้ชี้/จับได้เสมอ) */
const _pl = new THREE.Vector3();
const _plInv = new THREE.Matrix4();
function keepInFrontOfPanel() {
  panelGroup.updateMatrix();
  _plInv.copy(panelGroup.matrix).invert();
  for (const atom of sys.atoms) {
    const r = atomRadius(atom.el);
    _pl.copy(atom.pos).applyMatrix4(_plInv);
    if (Math.abs(_pl.x) > PANEL_WIDTH / 2 + r || Math.abs(_pl.y) > PANEL_HEIGHT / 2 + r) continue;
    if (_pl.z > r + 0.006 || _pl.z < -0.08) continue;
    _pl.z = r + 0.006;
    atom.pos.copy(_pl.applyMatrix4(panelGroup.matrix));
  }
}

// ---------- ลูปหลัก ----------
const clock = new THREE.Clock();
const camLocal = new THREE.Vector3();
const ringQuat = new THREE.Quaternion();
const _wq = new THREE.Quaternion();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const presenting = renderer.xr.isPresenting;

  if (presenting && needsPlacement > 0) {
    needsPlacement--;
    if (needsPlacement === 0) placeWorldInFront();
  }

  // ตัวชี้ที่ใช้งาน
  const active = [];
  if (presenting) {
    for (const p of xrPointers) if (p.connected) updateXRPointer(p);
    while (xrQueue.length) {
      const [type, p] = xrQueue.shift();
      if (type === 'down') { if (interaction.pointerDown(p)) infoDirty = true; } else if (type === 'up') { interaction.pointerUp(p); infoDirty = true; } else interaction.cancel(p.id);
    }
    for (const p of xrPointers) if (p.connected && (p.kind !== 'screen' || interaction.grabs.has(p.id))) active.push(p);
  } else {
    controls.update();
    for (const p of screenPointers.values()) {
      if (p.kind === 'touch' && !p.pressed) continue;
      updateScreenRay(p);
      active.push(p);
    }
  }
  interaction.update(active);

  // อะตอมที่บินไปวางบนโต๊ะ
  for (const [atom, target] of flyers) {
    if (atom.removed || atom.kinematic || atom.bonds.length) { flyers.delete(atom); continue; }
    atom.pos.lerp(target, 1 - Math.exp(-dt * 9));
    if (atom.pos.distanceTo(target) < 0.002) flyers.delete(atom);
  }

  relax(sys);
  attractHydrogenBonds(views.hbonds);
  keepInFrontOfPanel();
  if (views.sync()) onStructureChanged();

  const cam = presenting ? renderer.xr.getCamera() : camera;
  camLocal.setFromMatrixPosition(cam.matrixWorld);
  world.worldToLocal(camLocal);
  world.getWorldQuaternion(_wq).invert();
  ringQuat.copy(_wq).multiply(cam.getWorldQuaternion(new THREE.Quaternion()));
  views.update(dt, { rings: interaction.rings, preview: interaction.preview, showLonePairs, cameraLocal: camLocal, ringQuat });
  onNewClusters();

  // เส้นเลเซอร์ของคอนโทรลเลอร์/มือ
  for (const p of xrPointers) {
    const show = presenting && p.connected && p.kind !== 'screen';
    p.ray.visible = show;
    p.cursor.visible = show && p.hitDistance != null;
    if (show) {
      const len = p.hitDistance ?? 0.35;
      p.ray.scale.z = Math.max(0.01, len);
      p.cursor.position.set(0, 0, -len);
    }
  }

  // ถังรีไซเคิล
  recycler.userData.orbit.rotation.z += dt * 1.2;
  recycler.userData.ringMat.color.set(interaction.recyclerHot ? 0xff4d4d : 0x2ee88a);
  recycler.scale.setScalar(interaction.recyclerHot ? 1.15 : 1);

  xrToast.visible = presenting && !domOverlay && performance.now() < (xrToast.userData.until || 0);

  panel.update();
  infoTimer += dt;
  if (infoTimer > 0.4) { infoTimer = 0; infoDirty = true; }
  updateInfo();

  renderer.render(scene, camera);
}

// ---------- เริ่มต้น ----------
async function checkSupport() {
  if (EMBED) {
    for (const id of ['btn-ar', 'btn-vr', 'btn-camera']) $(id).hidden = true;
    return;
  }
  for (const mode of ['ar', 'vr']) {
    let ok = false;
    try { ok = !!navigator.xr && await navigator.xr.isSessionSupported('immersive-' + mode); } catch { /* ignore */ }
    $('btn-' + mode).classList.toggle('unsupported', !ok);
  }
}

/** เริ่มด้วยโมเลกุลน้ำหนึ่งโมเลกุล ให้เห็นทันทีว่าเครื่องมือทำอะไรได้ */
function seedExample() {
  const o = sys.addAtom(BY_SYMBOL.O, new THREE.Vector3(0, 0.03, 0));
  const h1 = sys.addAtom(BY_SYMBOL.H, new THREE.Vector3(-0.06, -0.01, 0.01));
  const h2 = sys.addAtom(BY_SYMBOL.H, new THREE.Vector3(0.06, -0.01, 0.01));
  sys.addBond(o, h1);
  sys.addBond(o, h2);
  views.sync();
  recognized = new Set(views.analyses.filter((e) => e.info.entry).map((e) => e.key + '|' + e.info.entry.id));
  selection = { kind: 'atom', atom: o };
}

seedExample();
applyLang();
onResize();
if (window.innerWidth <= 720) $('info-card').classList.add('collapsed');
checkSupport();
// วาดข้อความใหม่เมื่อฟอนต์ภาษาไทยโหลดเสร็จ
document.fonts?.ready.then(() => {
  panel.stateKey = '';
  views.langKey = '';
  for (const e of views.labels.values()) e.sprite.key = '';
  recyclerLabel.key = '';
  infoCard.key = '';
  applyLang();
});
renderer.setAnimationLoop(animate);

// เปิดให้ทดสอบ/ดีบักจากคอนโซลได้
window.chemxr = { THREE, sys, app, interaction, views, camera, renderer, scene, panel, world };
