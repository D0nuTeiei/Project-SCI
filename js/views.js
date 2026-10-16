// การแสดงผลอะตอม พันธะ ป้ายชื่อโมเลกุล และเอฟเฟกต์
import * as THREE from 'three';
import { atomRadius, isOverstretched } from './physics.js';
import { analyze, bondTypeOf, suggestCharge, ionClusters, findHydrogenBonds, applyExperimentalGeometry } from './chemistry.js';
import { findStereocenters, doubleBondStereo, complexStereo } from './stereo.js';
import { bondEnergy } from './energy.js';
import { BY_SYMBOL } from './elements.js';
import { chargeSuffix } from './molecules.js';
import { elementName } from './elements.js';
import { TextSprite } from './textures.js';
import { t, getLang } from './i18n.js';

const SPHERE = new THREE.SphereGeometry(1, 32, 20);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14, 1);
const RING = new THREE.TorusGeometry(1.4, 0.08, 8, 48);
const LP_GEO = new THREE.SphereGeometry(1, 12, 8);
const CONE = new THREE.ConeGeometry(1, 1, 14);

const RING_COLORS = { hover: 0xffffff, grab: 0x4dff9a, target: 0x4dff9a, break: 0xff8a2a, recycle: 0xff4d4d };
const ringMats = Object.fromEntries(Object.entries(RING_COLORS).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthTest: false })]));
const bondMats = {
  normal: new THREE.MeshStandardMaterial({ color: 0x3ea6ff, roughness: 0.35, metalness: 0.1 }),
  ionic: new THREE.MeshStandardMaterial({ color: 0xb28dff, roughness: 0.35, metalness: 0.1 }),
  stretch: new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.35, emissive: 0x552200 }),
  metallic: new THREE.MeshStandardMaterial({ color: 0x9fd4ff, roughness: 0.2, metalness: 0.7 }),
  // พันธะโคออร์ดิเนต (ลิแกนด์ → โลหะ) และพันธะสะพาน 3 ศูนย์กลาง (B–H–B)
  coord: new THREE.MeshStandardMaterial({ color: 0x3fd6c0, roughness: 0.35, metalness: 0.1 }),
  bridge: new THREE.MeshStandardMaterial({ color: 0xff9ad8, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.85 }),
  preview: new THREE.MeshBasicMaterial({ color: 0x4dff9a, transparent: true, opacity: 0.55 }),
};
const hbMat = new THREE.MeshBasicMaterial({ color: 0xffe066, toneMapped: false });
const lpMat = new THREE.MeshBasicMaterial({ color: 0xffd84d, toneMapped: false });

const METALLIC = new Set(['alkali', 'alkaline', 'transition', 'post-transition', 'lanthanide', 'actinide']);
const atomMats = new Map();
function atomMaterial(el) {
  if (!atomMats.has(el.z)) {
    const metal = METALLIC.has(el.category);
    atomMats.set(el.z, new THREE.MeshStandardMaterial({
      color: new THREE.Color(el.color),
      roughness: metal ? 0.3 : 0.22,
      metalness: metal ? 0.45 : 0.05,
      transparent: el.symbol === 'H',
      opacity: el.symbol === 'H' ? 0.92 : 1,
    }));
  }
  return atomMats.get(el.z);
}

class AtomView {
  constructor(atom, parent) {
    this.atom = atom;
    const r = atomRadius(atom.el);
    this.group = new THREE.Group();
    this.sphere = new THREE.Mesh(SPHERE, atomMaterial(atom.el));
    this.sphere.scale.setScalar(r);
    this.sphere.userData.atom = atom;
    this.ring = new THREE.Mesh(RING, ringMats.hover);
    this.ring.scale.setScalar(r);
    this.ring.renderOrder = 5;
    this.ring.visible = false;
    this.lp = new THREE.Group();
    this.group.add(this.sphere, this.ring, this.lp);
    parent.add(this.group);
    this.radius = r;
    this.spawnT = 0;
    this.badge = null; // ป้ายประจุฟอร์มอล (สร้างเมื่อมีประจุ)
  }
  setCharge(q, parent) {
    if (Math.abs(q) < 1e-6) {
      if (this.badge) this.badge.visible = false;
      return;
    }
    if (!this.badge) {
      this.badge = new TextSprite([], { worldHeightPerPx: 0.00024 });
      this.badge.renderOrder = 12;
      parent.add(this.badge);
    }
    this.badge.visible = true;
    // ประจุบวกสีน้ำเงิน ประจุลบสีแดง (ตามแผนที่ศักย์ไฟฟ้า)
    this.badge.background = q > 0 ? 'rgba(40, 110, 230, 0.92)' : 'rgba(220, 50, 60, 0.92)';
    this.badge.setLines([{ text: chargeLabel(q), size: 40, weight: 700 }]);
  }
  /** ป้าย R/S ของคาร์บอนไครัล */
  setStereo(label, parent) {
    if (!label) { if (this.stereoBadge) this.stereoBadge.visible = false; return; }
    if (!this.stereoBadge) {
      this.stereoBadge = new TextSprite([], { worldHeightPerPx: 0.00024, background: 'rgba(30, 150, 90, 0.92)' });
      this.stereoBadge.renderOrder = 12;
      parent.add(this.stereoBadge);
    }
    this.stereoBadge.visible = true;
    this.stereoBadge.setLines([{ text: label, size: 40, weight: 700 }]);
  }
  dispose() {
    this.group.removeFromParent();
    if (this.badge) { this.badge.removeFromParent(); this.badge.dispose(); }
    if (this.stereoBadge) { this.stereoBadge.removeFromParent(); this.stereoBadge.dispose(); }
  }
}

/** ประจุแบบอ่านง่าย รองรับเศษส่วนจากเรโซแนนซ์ เช่น ⅔− */
export function chargeLabel(q) {
  const sign = q > 0 ? '+' : '−';
  const a = Math.abs(q);
  if (Math.abs(a - Math.round(a)) < 1e-6) return (Math.round(a) > 1 ? Math.round(a) : '') + sign;
  const FR = [[1 / 3, '⅓'], [2 / 3, '⅔'], [0.5, '½'], [0.25, '¼'], [0.75, '¾'], [1.5, '1½'], [4 / 3, '1⅓']];
  const f = FR.find(([v]) => Math.abs(v - a) < 1e-3);
  return (f ? f[1] : a.toFixed(2)) + sign;
}

const DASHES = 6;
class BondView {
  constructor(bond, parent) {
    this.bond = bond;
    this.group = new THREE.Group();
    this.rods = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(CYL, bondMats.normal);
      this.group.add(m);
      return m;
    });
    this.dashes = null; // ชิ้นส่วนเส้นประ (พันธะไอออนิก / เรโซแนนซ์)
    parent.add(this.group);
  }
  /** วาดเส้นประจาก p ไป q */
  placeDashes(p, q, radius, mat) {
    if (!this.dashes) {
      this.dashes = Array.from({ length: DASHES }, () => {
        const m = new THREE.Mesh(CYL, mat);
        this.group.add(m);
        return m;
      });
    }
    for (let i = 0; i < DASHES; i++) {
      const m = this.dashes[i];
      m.material = mat;
      const t0 = (i + 0.2) / DASHES;
      const t1 = (i + 0.75) / DASHES;
      placeRod(m, p.clone().lerp(q, t0), p.clone().lerp(q, t1), radius);
    }
  }
  hideDashes() { this.dashes?.forEach((m) => { m.visible = false; }); }
  dispose() { this.group.removeFromParent(); }
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _view = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** วางทรงกระบอกจาก p ไป q */
function placeRod(mesh, p, q, radius) {
  _dir.subVectors(q, p);
  const len = _dir.length();
  if (len < 1e-6) { mesh.visible = false; return; }
  mesh.visible = true;
  mesh.position.addVectors(p, q).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(_up, _dir.divideScalar(len));
  mesh.scale.set(radius, len, radius);
}

/** คำนำหน้าชื่อตามไอโซเมอร์เชิงพื้นที่ เช่น cis-, trans-, L-, (S)- */
export function stereoPrefix(info, stereo) {
  if (!stereo) return '';
  const ct = stereo.dbs.filter((d) => d.cisTrans);
  if (ct.length === 1 && stereo.dbs.length === 1) return `${ct[0].cisTrans}-`;
  if (stereo.dbs.length === 1 && !ct.length) return `(${stereo.dbs[0].ez})-`;
  if (stereo.centers.length === 1) {
    const c = stereo.centers[0].label;
    if (info.entry?.aminoAcid) return c === 'S' ? 'L-' : 'D-';
    return `(${c})-`;
  }
  return '';
}

export function labelLines(info, stereo = null) {
  const lang = getLang();
  const pre = stereoPrefix(info, stereo);
  if (info.single && info.charge) {
    const el = info.single.el;
    const name = info.entry ? (lang === 'th' ? info.entry.th : info.entry.en) : `${t('ion')} ${elementName(el, lang)}`;
    const lines = [{ text: `${info.pretty} · ${name}`, size: 44 }];
    if (!info.complete) lines.push({ text: t('impossibleIon'), size: 28, color: '#ffcf8a' });
    return lines;
  }
  if (info.single) {
    const el = info.single.el;
    const lines = [{ text: `${el.symbol} · ${elementName(el, lang)}`, size: 44 }];
    if (el.synthetic) lines.push({ text: t('syntheticNote'), size: 28, color: '#ffb3b3' });
    else if (Math.max(...el.valences) === 0) lines.push({ text: t('stable'), size: 28, color: '#c9b6ff' });
    return lines;
  }
  if (info.entry) {
    const name = pre + (lang === 'th' ? info.entry.th : info.entry.en);
    const lines = [{ text: `${name} · ${info.pretty}`, size: 46, color: '#ffffff' }];
    if (info.metalOnly) lines.push({ text: t('metallicNote'), size: 28, color: '#9fd4ff' });
    if (info.ionic && info.complete) lines.push({ text: `${t('formulaUnit')} · ${info.ions}`, size: 28, color: '#d9c4ff' });
    if (info.radical) lines.push({ text: `${t('incomplete')} · ${t('radicalNote')}`, size: 28, color: '#ffcf8a' });
    return lines;
  }
  if (info.metalOnly) return [{ text: info.pretty, size: 46 }, { text: t('metallicNote'), size: 28, color: '#9fd4ff' }];
  if (info.complete) return [{ text: pre + info.pretty, size: 46 }, { text: t('completeUnknown'), size: 28, color: '#9fe8b0' }];
  const cx = info.complex;
  const why = cx?.needLigands ? t('needLigands', cx.needLigands) : info.bridgeCount ? t('bridgeHint') : info.hint ? t('tryCharge', info.hint)
    : cx && !cx.oxOk ? t('badOx', cx.ion) : info.missing > 0 ? t('needMore', info.missing) : t('overValence');
  return [{ text: info.pretty, size: 46 }, { text: `${t('incomplete')} · ${why}`, size: 28, color: '#ffcf8a' }];
}

/** ประจุแบบอ่านง่าย เช่น +1, −2 */
export function chargeText(q) {
  return `${q > 0 ? '+' : '−'}${Math.abs(q)}`;
}
export { chargeSuffix };

class Burst {
  constructor(parent, center, color) {
    const n = 48;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    this.vel = [];
    for (let i = 0; i < n; i++) {
      this.pos.set([center.x, center.y, center.z], i * 3);
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.12 + Math.random() * 0.18);
      this.vel.push(v);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.008, transparent: true, depthWrite: false }));
    parent.add(this.points);
    this.age = 0;
  }
  update(dt) {
    this.age += dt;
    for (let i = 0; i < this.vel.length; i++) {
      const v = this.vel[i];
      v.multiplyScalar(0.94);
      this.pos[i * 3] += v.x * dt;
      this.pos[i * 3 + 1] += v.y * dt;
      this.pos[i * 3 + 2] += v.z * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = Math.max(0, 1 - this.age / 1.2);
    return this.age < 1.2;
  }
  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

export class MoleculeViews {
  constructor(parent, sys) {
    this.root = new THREE.Group();
    this.root.name = 'molecules';
    parent.add(this.root);
    this.sys = sys;
    this.atomViews = new Map();
    this.bondViews = new Map();
    this.labels = new Map(); // key -> { sprite, comp, info }
    this.analyses = [];
    this.clusters = new Map(); // ไอออนที่อยู่ใกล้กันเป็นเกลือ key -> { sprite, data }
    this.newClusters = [];
    this.clusterTimer = 0;
    this.ionLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0xc9a6ff, dashSize: 0.006, gapSize: 0.005, transparent: true, opacity: 0.9 }),
    );
    this.ionLines.frustumCulled = false;
    parent.add(this.ionLines);
    this.version = -1;
    this.langKey = '';
    this.bursts = [];
    this.preview = new THREE.Mesh(CYL, bondMats.preview);
    this.preview.visible = false;
    this.root.add(this.preview);
    this.energyLabel = new TextSprite([], { worldHeightPerPx: 0.00024 });
    this.energyLabel.visible = false;
    this.root.add(this.energyLabel);
    this.hbonds = [];
    this.hbTimer = 1;
    this.hbDashes = [];
    this.lattice = null;
    this.useExperimental = true; // ใช้มุมพันธะจากการทดลองกับโมเลกุลที่รู้จัก
    this.stereoTimer = 1;
  }

  /** ซิงก์ mesh กับโมเดล — คืนค่า true ถ้าโครงสร้างเปลี่ยน */
  sync() {
    const lang = getLang();
    if (this.sys.version === this.version && lang === this.langKey) return false;
    const structural = this.sys.version !== this.version;
    this.version = this.sys.version;
    this.langKey = lang;

    const atoms = new Set(this.sys.atoms);
    for (const [atom, v] of this.atomViews) if (!atoms.has(atom)) { v.dispose(); this.atomViews.delete(atom); }
    for (const atom of atoms) if (!this.atomViews.has(atom)) this.atomViews.set(atom, new AtomView(atom, this.root));
    const bonds = new Set(this.sys.bonds);
    for (const [bond, v] of this.bondViews) if (!bonds.has(bond)) { v.dispose(); this.bondViews.delete(bond); }
    for (const bond of bonds) if (!this.bondViews.has(bond)) this.bondViews.set(bond, new BondView(bond, this.root));

    // ป้ายชื่อ: หนึ่งป้ายต่อหนึ่งโมเลกุล
    const next = new Map();
    this.analyses = [];
    for (const comp of this.sys.components()) {
      const key = comp.atoms.map((a) => a.id).sort((x, y) => x - y).join(',');
      const info = analyze(comp);
      if (!info.complete && !info.entry) info.hint = suggestCharge(comp);
      let entry = this.labels.get(key);
      if (!entry) entry = { sprite: new TextSprite(), key };
      entry.comp = comp;
      entry.info = info;
      entry.sprite.setLines(labelLines(info, entry.stereo));
      entry.stereoKey = null; // ให้ updateStereo คำนวณและติดคำนำหน้า (cis-, L-) ใหม่
      if (!entry.sprite.parent) this.root.add(entry.sprite);
      next.set(key, entry);
      this.analyses.push(entry);
    }
    for (const [key, e] of this.labels) if (!next.has(key)) { e.sprite.removeFromParent(); e.sprite.dispose(); }
    this.labels = next;
    for (const [atom, v] of this.atomViews) v.setCharge(atom.displayCharge, this.root);
    applyExperimentalGeometry(this.analyses, this.useExperimental);
    this.stereoTimer = 1;
    this.clusterTimer = 1; // คำนวณกลุ่มไอออนใหม่ในเฟรมถัดไป
    for (const c of this.clusters.values()) c.sprite.key = '';
    return structural;
  }

  /** หา cis/trans และคาร์บอนไครัลของทุกโมเลกุล แล้วอัปเดตป้ายชื่อ/ป้าย R/S */
  updateStereo() {
    const labels = new Map();
    for (const e of this.analyses) {
      const stereo = e.comp.atoms.length >= 4 ? { centers: findStereocenters(e.comp), dbs: [...doubleBondStereo(e.comp), ...complexStereo(e.comp)] } : null;
      const key = stereo ? stereo.centers.map((c) => c.atom.id + c.label).join() + '|' + stereo.dbs.map((d) => d.ez + d.cisTrans).join() : '';
      if (key !== e.stereoKey) {
        e.stereoKey = key;
        e.stereo = stereo;
        e.sprite.setLines(labelLines(e.info, stereo));
      }
      stereo?.centers.forEach((c) => labels.set(c.atom, c.label));
    }
    for (const [atom, v] of this.atomViews) v.setStereo(labels.get(atom) || null, this.root);
  }

  /** สลับระหว่างมุมจากการทดลองกับมุมตาม VSEPR */
  setExperimental(on) {
    this.useExperimental = on;
    applyExperimentalGeometry(this.analyses, on);
  }

  /** ข้อมูลไอโซเมอร์ของโมเลกุลที่มีอะตอมนี้ */
  stereoOf(atom) {
    return this.analyses.find((e) => e.comp.atoms.includes(atom))?.stereo || null;
  }

  /** รวมไอออนที่อยู่ใกล้กันเป็นเกลือ (เรียกเป็นระยะ เพราะไอออนเคลื่อนที่ได้โดยไม่เปลี่ยนโครงสร้าง) */
  updateClusters() {
    const lang = getLang();
    const found = ionClusters(this.analyses);
    const next = new Map();
    for (const c of found) {
      let view = this.clusters.get(c.key);
      if (!view) {
        view = { sprite: new TextSprite([], { background: 'rgba(60, 30, 100, 0.7)' }) };
        this.root.add(view.sprite);
        if (c.entry) this.newClusters.push(c);
      }
      view.data = c;
      const name = c.entry ? `${lang === 'th' ? c.entry.th : c.entry.en} · ${c.pretty}` : c.pretty;
      view.sprite.setLines([
        { text: name, size: 46 },
        { text: c.entry ? c.ions : `${c.ions} · ${t('completeUnknown')}`, size: 28, color: '#d9c4ff' },
      ]);
      next.set(c.key, view);
    }
    for (const [key, v] of this.clusters) if (!next.has(key)) { v.sprite.removeFromParent(); v.sprite.dispose(); }
    this.clusters = next;
  }

  /** กลุ่มเกลือที่เพิ่งเกิด (สำหรับแจ้งเตือน/ภารกิจ) */
  takeNewClusters() {
    const out = this.newClusters;
    this.newClusters = [];
    return out;
  }

  burst(center, color = 0x7dffcf) {
    this.bursts.push(new Burst(this.root, center, color));
  }

  /**
   * อัปเดตตำแหน่งและสถานะไฮไลต์ทุกเฟรม
   * state: { rings: Map(atom -> 'hover'|'grab'|...), preview: {a,b}|null, showLonePairs, cameraLocal: Vector3, ringQuat: Quaternion }
   */
  update(dt, state) {
    for (const [atom, v] of this.atomViews) {
      v.group.position.copy(atom.pos);
      // เอฟเฟกต์ตอนเกิดอะตอม
      if (v.spawnT < 1) {
        v.spawnT = Math.min(1, v.spawnT + dt * 5);
        const s = 0.3 + 0.7 * (1 - (1 - v.spawnT) ** 3);
        v.sphere.scale.setScalar(v.radius * s);
      }
      const ring = state.rings.get(atom);
      v.ring.visible = !!ring;
      if (ring) {
        v.ring.material = ringMats[ring];
        v.ring.quaternion.copy(state.ringQuat);
      }
      // อิเล็กตรอนคู่โดดเดี่ยว (ไม่แสดงคู่เสมือนที่ใช้จัดรูปสี่เหลี่ยมแบนราบของไอออนโลหะ)
      const showLP = state.showLonePairs && atom.lpDirs.length > 0 && !atom.coord;
      v.lp.visible = showLP;
      if (showLP) {
        while (v.lp.children.length < atom.lpDirs.length * 2) {
          const m = new THREE.Mesh(LP_GEO, lpMat);
          m.scale.setScalar(0.0048);
          v.lp.add(m);
        }
        v.lp.children.forEach((c, i) => { c.visible = i < atom.lpDirs.length * 2; });
        atom.lpDirs.forEach((d, i) => {
          _dir.set(d.x, d.y, d.z);
          _perp.set(0, 1, 0).cross(_dir);
          if (_perp.lengthSq() < 1e-4) _perp.set(1, 0, 0).cross(_dir);
          _perp.normalize().multiplyScalar(0.0055);
          const base = _dir.multiplyScalar(v.radius + 0.012);
          v.lp.children[i * 2].position.copy(base).add(_perp);
          v.lp.children[i * 2 + 1].position.copy(base).sub(_perp);
        });
      }
    }

    let stretchShown = false;
    for (const [bond, v] of this.bondViews) {
      _a.copy(bond.a.pos);
      _b.copy(bond.b.pos);
      const stretched = isOverstretched(bond);
      const ionic = bondTypeOf(bond) === 'ionic';
      const mat = stretched ? bondMats.stretch : ionic ? bondMats.ionic : bondMats.normal;
      if (stretched && !stretchShown) {
        // บอกพลังงานที่ต้องใช้สลายพันธะ (การสลายพันธะดูดพลังงาน ไม่ได้ปล่อยพลังงาน)
        const e = bondEnergy(bond);
        if (e != null) {
          stretchShown = true;
          this.energyLabel.setLines([{ text: t('breakCost', e), size: 34, color: '#ffd59a' }]);
          this.energyLabel.position.addVectors(_a, _b).multiplyScalar(0.5);
          this.energyLabel.position.y += 0.02;
        }
      }
      // ทิศตั้งฉากกับแนวพันธะและทิศมองของกล้อง เพื่อให้เห็นพันธะคู่/สามชัดเจน
      _dir.subVectors(_b, _a).normalize();
      _view.subVectors(state.cameraLocal, _mid.addVectors(_a, _b).multiplyScalar(0.5)).normalize();
      _perp.crossVectors(_dir, _view);
      if (_perp.lengthSq() < 1e-6) _perp.set(1, 0, 0);
      _perp.normalize();
      if (!stretched && bondTypeOf(bond) === 'metallic') {
        // พันธะโลหะ: ไม่ใช่การใช้อิเล็กตรอนคู่ร่วมกันแบบโคเวเลนต์
        v.rods.forEach((r) => { r.visible = false; });
        v.placeDashes(_a, _b, 0.004, bondMats.metallic);
        continue;
      }
      if (ionic && !stretched) {
        // พันธะไอออนิก = แรงดึงดูดไฟฟ้าระหว่างไอออน (เส้นประ) ไม่ใช่แท่งพันธะแบบใช้อิเล็กตรอนร่วมกัน
        v.rods.forEach((r) => { r.visible = false; });
        v.placeDashes(_a, _b, 0.003, bondMats.ionic);
        continue;
      }
      if (v.arrow) v.arrow.visible = false;
      if ((bond.coord || bond.bridge) && !stretched) {
        // พันธะโคออร์ดิเนต: แท่งสีเขียวน้ำทะเล + หัวลูกศรชี้จากลิแกนด์ (ผู้ให้คู่อิเล็กตรอน) ไปยังไอออนโลหะ
        // พันธะสะพาน B–H–B: แท่งบางสีชมพู (อิเล็กตรอน 2 ตัวใช้ร่วมกัน 3 อะตอม)
        v.hideDashes();
        v.rods[1].visible = false;
        v.rods[2].visible = false;
        placeRod(v.rods[0], _a, _b, bond.bridge ? 0.0028 : 0.0036);
        v.rods[0].material = bond.bridge ? bondMats.bridge : bondMats.coord;
        if (bond.coord) {
          if (!v.arrow) { v.arrow = new THREE.Mesh(CONE, bondMats.coord); v.group.add(v.arrow); }
          const metal = bond.other(bond.donor);
          const tip = metal.pos.clone().lerp(bond.donor.pos, (atomRadius(metal.el) + 0.002) / (bond.donor.pos.distanceTo(metal.pos) || 1));
          _dir.subVectors(metal.pos, bond.donor.pos).normalize();
          v.arrow.visible = true;
          v.arrow.position.copy(tip).addScaledVector(_dir, -0.006);
          v.arrow.quaternion.setFromUnitVectors(_up, _dir);
          v.arrow.scale.set(0.0072, 0.012, 0.0072);
        }
        continue;
      }
      if (bond.resonance != null && !stretched) {
        // เรโซแนนซ์: เส้นทึบหนึ่งเส้น + เส้นประ (อิเล็กตรอนกระจายตัว) ทุกพันธะเหมือนกัน
        const off = 0.0034;
        placeRod(v.rods[0], _a.clone().addScaledVector(_perp, -off), _b.clone().addScaledVector(_perp, -off), 0.0036);
        v.rods[0].material = bondMats.normal;
        v.rods[1].visible = false;
        v.rods[2].visible = false;
        v.placeDashes(_a.clone().addScaledVector(_perp, off), _b.clone().addScaledVector(_perp, off), 0.0026, bondMats.normal);
        continue;
      }
      v.hideDashes();
      const n = bond.order;
      const radius = n === 1 ? 0.0045 : n === 2 ? 0.0034 : 0.0028;
      const spacing = n === 2 ? 0.0068 : 0.0085;
      for (let i = 0; i < 3; i++) {
        const rod = v.rods[i];
        if (i >= n) { rod.visible = false; continue; }
        rod.material = mat;
        const off = (i - (n - 1) / 2) * spacing;
        const p = _a.clone().addScaledVector(_perp, off);
        const q = _b.clone().addScaledVector(_perp, off);
        placeRod(rod, p, q, radius);
      }
    }

    this.energyLabel.visible = stretchShown;

    // พันธะไฮโดรเจนระหว่างโมเลกุล (เส้นจุดสีเหลือง)
    this.hbTimer += dt;
    if (this.hbTimer > 0.2) {
      this.hbTimer = 0;
      const compOf = new Map();
      this.analyses.forEach((e, i) => e.comp.atoms.forEach((a) => compOf.set(a, i)));
      this.hbonds = findHydrogenBonds(this.sys.atoms.filter((a) => !a.removed), compOf);
    }
    this.hbonds = this.hbonds.filter((hb) => !hb.h.removed && !hb.acceptor.removed);
    // วาดเป็นขีดสั้น ๆ สีเหลือง (เส้น WebGL หนาแค่ 1 พิกเซล มองเห็นยากในแว่น)
    const need = this.hbonds.length * 4;
    while (this.hbDashes.length < need) {
      const m = new THREE.Mesh(CYL, hbMat);
      this.root.add(m);
      this.hbDashes.push(m);
    }
    this.hbDashes.forEach((m, i) => { m.visible = i < need; });
    this.hbonds.forEach((hb, k) => {
      // เว้นช่วงที่ถูกลูกบอลอะตอมบังไว้
      const p = hb.h.pos; const q = hb.acceptor.pos;
      const len = p.distanceTo(q) || 1;
      const t0 = Math.min(0.45, atomRadius(hb.h.el) / len);
      const t1 = Math.max(0.55, 1 - atomRadius(hb.acceptor.el) / len);
      for (let i = 0; i < 4; i++) {
        const a0 = t0 + ((t1 - t0) * (i + 0.15)) / 4;
        const a1 = t0 + ((t1 - t0) * (i + 0.7)) / 4;
        placeRod(this.hbDashes[k * 4 + i], p.clone().lerp(q, a0), p.clone().lerp(q, a1), 0.0022);
      }
    });

    // โครงผลึกที่เปิดดูอยู่
    if (this.lattice) {
      this.lattice.group.rotation.y += dt * 0.35;
      this.updateLattice(dt);
    }

    // เส้นพรีวิวพันธะที่กำลังจะเกิด
    if (state.preview) {
      placeRod(this.preview, state.preview.a.pos, state.preview.b.pos, 0.003);
    } else this.preview.visible = false;

    // ไอโซเมอร์เชิงพื้นที่ขึ้นกับตำแหน่ง จึงคำนวณใหม่เป็นระยะ
    this.stereoTimer += dt;
    if (this.stereoTimer > 0.3) {
      this.stereoTimer = 0;
      this.updateStereo();
    }
    // ป้ายประจุติดมุมขวาบน ป้าย R/S มุมซ้ายบนของอะตอม (หันตามกล้อง)
    _perp.set(1, 0.8, 0).applyQuaternion(state.ringQuat);
    _view.set(-1, 0.8, 0).applyQuaternion(state.ringQuat);
    for (const v of this.atomViews.values()) {
      if (v.badge?.visible) v.badge.position.copy(v.atom.pos).addScaledVector(_perp, v.radius * 0.75);
      if (v.stereoBadge?.visible) v.stereoBadge.position.copy(v.atom.pos).addScaledVector(_view, v.radius * 0.75);
    }

    // กลุ่มไอออน (เกลือ): ป้ายรวม + เส้นประเชื่อมไอออน
    this.clusterTimer += dt;
    if (this.clusterTimer > 0.25) { this.clusterTimer = 0; this.updateClusters(); }
    const pts = [];
    for (const c of this.clusters.values()) {
      const ms = c.data.members;
      let x = 0; let z = 0; let top = -Infinity; let n = 0;
      const centers = ms.map((m) => {
        const p = new THREE.Vector3();
        for (const a of m.comp.atoms) { p.add(a.pos); top = Math.max(top, a.pos.y + atomRadius(a.el)); }
        p.divideScalar(m.comp.atoms.length);
        x += p.x; z += p.z; n++;
        return p;
      });
      c.sprite.position.set(x / n, top + 0.06, z / n);
      // เชื่อมไอออนแต่ละตัวกับไอออนประจุตรงข้ามที่ใกล้ที่สุด (ไม่วาดซ้ำ)
      const drawn = new Set();
      ms.forEach((m, i) => {
        let best = -1; let bd = Infinity;
        ms.forEach((o, j) => {
          if (i === j || Math.sign(o.info.charge) === Math.sign(m.info.charge)) return;
          const d = centers[i].distanceTo(centers[j]);
          if (d < bd) { bd = d; best = j; }
        });
        const k = `${Math.min(i, best)}-${Math.max(i, best)}`;
        if (best >= 0 && !drawn.has(k)) { drawn.add(k); pts.push(centers[i], centers[best]); }
      });
    }
    this.ionLines.geometry.setFromPoints(pts);
    this.ionLines.computeLineDistances();
    this.ionLines.visible = pts.length > 0;

    // ป้ายชื่อเหนือโมเลกุล
    for (const e of this.labels.values()) {
      let x = 0; let z = 0; let top = -Infinity;
      for (const a of e.comp.atoms) {
        x += a.pos.x; z += a.pos.z;
        top = Math.max(top, a.pos.y + atomRadius(a.el));
      }
      const n = e.comp.atoms.length;
      e.sprite.position.set(x / n, top + 0.018, z / n);
    }

    this.bursts = this.bursts.filter((b) => {
      const alive = b.update(dt);
      if (!alive) b.dispose();
      return alive;
    });
  }

  /**
   * เปิดโครงสร้างผลึก (structure จาก lattice.js) ที่ตำแหน่งท้องถิ่น pos
   * ผลึกไอออนิก / ผลึกร่างตาข่าย (มีแท่งพันธะ) / ผลึกโลหะ (มีทะเลอิเล็กตรอน)
   */
  showLattice(st, pos) {
    this.hideLattice();
    const group = new THREE.Group();
    group.position.copy(pos);
    const unit = st.ionic ? 0.034 : st.electronSea ? 0.03 : 0.028; // ระยะเพื่อนบ้านใกล้สุด (เมตร)
    const mats = new Map();
    const matOf = (sym) => {
      if (!mats.has(sym)) {
        const el = BY_SYMBOL[sym];
        const metal = st.electronSea;
        mats.set(sym, new THREE.MeshStandardMaterial({ color: new THREE.Color(el?.color || '#cccccc'), roughness: 0.3, metalness: metal ? 0.6 : 0.1 }));
      }
      return mats.get(sym);
    };
    const P = (site) => new THREE.Vector3(site.p[0] * unit, site.p[1] * unit, site.p[2] * unit);
    st.sites.forEach((site, i) => {
      const m = new THREE.Mesh(SPHERE, matOf(site.sym));
      m.scale.setScalar(site.r * unit * (i === st.center ? 1.15 : 1));
      m.position.copy(P(site));
      group.add(m);
    });
    // แท่งพันธะโคเวเลนต์ในผลึกร่างตาข่าย
    for (const [i, j] of st.bonds) {
      const rod = new THREE.Mesh(CYL, bondMats.normal);
      placeRod(rod, P(st.sites[i]), P(st.sites[j]), unit * 0.07);
      group.add(rod);
    }
    // เส้นแสดงเลขโคออร์ดิเนชันของอะตอม/ไอออนตัวอย่าง
    const pts = [];
    for (const j of st.neighbors) pts.push(P(st.sites[st.center]), P(st.sites[j]));
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffe066, depthTest: false })));
    // ทะเลอิเล็กตรอนของโลหะ: จุดเล็ก ๆ เคลื่อนที่อิสระทั่วผลึก
    let sea = null;
    if (st.electronSea) {
      const box = new THREE.Box3();
      st.sites.forEach((site) => box.expandByPoint(P(site)));
      const n = 220;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random());
        arr[i * 3 + 1] = THREE.MathUtils.lerp(box.min.y, box.max.y, Math.random());
        arr[i * 3 + 2] = THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random());
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      sea = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x7fd8ff, size: 0.0035, transparent: true, opacity: 0.9, depthWrite: false }));
      sea.userData = { box, vel: Array.from({ length: n }, () => new THREE.Vector3().randomDirection().multiplyScalar(0.04)) };
      group.add(sea);
    }
    const lang = getLang();
    const lines = [{ text: lang === 'th' ? (st.titleTh) : st.titleEn, size: 42 }];
    if (st.ionic) {
      lines[0].text = `${st.formula} · ${lang === 'th' ? st.titleTh : st.titleEn}`;
      lines.push({ text: t('latticeCN', st.centerIon, st.neighbors.length, st.cn), size: 28, color: '#ffe082' });
      lines.push({ text: t('latticeNote'), size: 26, color: '#d9c4ff' });
    } else {
      (lang === 'th' ? st.textTh : st.textEn).forEach((tx, i) => lines.push({ text: tx, size: 26, color: i ? '#d9c4ff' : '#ffe082' }));
    }
    const label = new TextSprite(lines, { worldHeightPerPx: 0.0002 });
    const top = Math.max(...st.sites.map((site) => site.p[1])) * unit + 0.03;
    label.position.set(pos.x, pos.y + top, pos.z);
    this.root.add(group, label);
    this.lattice = { group, label, mats: [...mats.values()], key: st.key, sea };
  }

  /** ขยับทะเลอิเล็กตรอน */
  updateLattice(dt) {
    const sea = this.lattice?.sea;
    if (!sea) return;
    const pos = sea.geometry.attributes.position;
    const { box, vel } = sea.userData;
    for (let i = 0; i < vel.length; i++) {
      const v = vel[i];
      v.add(new THREE.Vector3().randomDirection().multiplyScalar(0.02)).clampLength(0.02, 0.06);
      for (const [k, ax] of [[0, 'x'], [1, 'y'], [2, 'z']]) {
        let x = pos.array[i * 3 + k] + v[ax] * dt;
        if (x < box.min[ax] || x > box.max[ax]) { v[ax] = -v[ax]; x = Math.max(box.min[ax], Math.min(box.max[ax], x)); }
        pos.array[i * 3 + k] = x;
      }
    }
    pos.needsUpdate = true;
  }

  hideLattice() {
    if (!this.lattice) return;
    this.lattice.group.removeFromParent();
    this.lattice.label.removeFromParent();
    this.lattice.label.dispose();
    this.lattice.mats.forEach((m) => m.dispose());
    this.lattice = null;
    this.useExperimental = true; // ใช้มุมพันธะจากการทดลองกับโมเลกุลที่รู้จัก
    this.stereoTimer = 1;
  }

  /** หาอะตอมที่รังสีชนใกล้ที่สุด (พิกัดท้องถิ่น) */
  raycastAtoms(origin, dir, maxDist = 10, exclude = null) {
    let best = null;
    let bestT = maxDist;
    for (const atom of this.sys.atoms) {
      if (exclude?.has(atom)) continue;
      const r = atomRadius(atom.el) * 1.25; // ขยายเป้าให้กดง่ายขึ้น
      _a.subVectors(atom.pos, origin);
      const tca = _a.dot(dir);
      if (tca < 0) continue;
      const d2 = _a.lengthSq() - tca * tca;
      if (d2 > r * r) continue;
      const tHit = tca - Math.sqrt(r * r - d2);
      if (tHit < bestT) { bestT = tHit; best = atom; }
    }
    return best ? { atom: best, distance: bestT } : null;
  }

  /** หาอะตอมที่อยู่ใกล้จุด (สำหรับจับด้วยมือ) */
  nearestAtom(point, extra = 0.025) {
    let best = null;
    let bestD = Infinity;
    for (const atom of this.sys.atoms) {
      const d = atom.pos.distanceTo(point) - atomRadius(atom.el);
      if (d < extra && d < bestD) { bestD = d; best = atom; }
    }
    return best;
  }
}

