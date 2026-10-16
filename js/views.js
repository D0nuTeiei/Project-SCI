// การแสดงผลอะตอม พันธะ ป้ายชื่อโมเลกุล และเอฟเฟกต์
import * as THREE from 'three';
import { atomRadius, isOverstretched } from './physics.js';
import { analyze, bondTypeOf } from './chemistry.js';
import { elementName } from './elements.js';
import { TextSprite } from './textures.js';
import { t, getLang } from './i18n.js';

const SPHERE = new THREE.SphereGeometry(1, 32, 20);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14, 1);
const RING = new THREE.TorusGeometry(1.4, 0.08, 8, 48);
const LP_GEO = new THREE.SphereGeometry(1, 12, 8);

const RING_COLORS = { hover: 0xffffff, grab: 0x4dff9a, target: 0x4dff9a, break: 0xff8a2a, recycle: 0xff4d4d };
const ringMats = Object.fromEntries(Object.entries(RING_COLORS).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthTest: false })]));
const bondMats = {
  normal: new THREE.MeshStandardMaterial({ color: 0x3ea6ff, roughness: 0.35, metalness: 0.1 }),
  ionic: new THREE.MeshStandardMaterial({ color: 0xb28dff, roughness: 0.35, metalness: 0.1 }),
  stretch: new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.35, emissive: 0x552200 }),
  preview: new THREE.MeshBasicMaterial({ color: 0x4dff9a, transparent: true, opacity: 0.55 }),
};
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
  }
  dispose() { this.group.removeFromParent(); }
}

class BondView {
  constructor(bond, parent) {
    this.bond = bond;
    this.group = new THREE.Group();
    this.rods = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(CYL, bondMats.normal);
      this.group.add(m);
      return m;
    });
    parent.add(this.group);
  }
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

export function labelLines(info) {
  const lang = getLang();
  if (info.single) {
    const el = info.single.el;
    const lines = [{ text: `${el.symbol} · ${elementName(el, lang)}`, size: 44 }];
    if (el.synthetic) lines.push({ text: t('syntheticNote'), size: 28, color: '#ffb3b3' });
    else if (Math.max(...el.valences) === 0) lines.push({ text: t('stable'), size: 28, color: '#c9b6ff' });
    return lines;
  }
  if (info.entry) {
    const name = lang === 'th' ? info.entry.th : info.entry.en;
    return [{ text: `${name} · ${info.pretty}`, size: 46, color: '#ffffff' }];
  }
  if (info.complete) return [{ text: info.pretty, size: 46 }, { text: t('completeUnknown'), size: 28, color: '#9fe8b0' }];
  return [{ text: info.pretty, size: 46 }, { text: `${t('incomplete')} · ${t('needMore', info.missing)}`, size: 28, color: '#ffcf8a' }];
}

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
    this.version = -1;
    this.langKey = '';
    this.bursts = [];
    this.preview = new THREE.Mesh(CYL, bondMats.preview);
    this.preview.visible = false;
    this.root.add(this.preview);
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
      let entry = this.labels.get(key);
      if (!entry) entry = { sprite: new TextSprite(), key };
      entry.comp = comp;
      entry.info = info;
      entry.sprite.setLines(labelLines(info));
      if (!entry.sprite.parent) this.root.add(entry.sprite);
      next.set(key, entry);
      this.analyses.push(entry);
    }
    for (const [key, e] of this.labels) if (!next.has(key)) { e.sprite.removeFromParent(); e.sprite.dispose(); }
    this.labels = next;
    return structural;
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
      // อิเล็กตรอนคู่โดดเดี่ยว
      const showLP = state.showLonePairs && atom.lpDirs.length > 0;
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

    for (const [bond, v] of this.bondViews) {
      _a.copy(bond.a.pos);
      _b.copy(bond.b.pos);
      const stretched = isOverstretched(bond);
      const mat = stretched ? bondMats.stretch : bondTypeOf(bond) === 'ionic' ? bondMats.ionic : bondMats.normal;
      // ทิศตั้งฉากกับแนวพันธะและทิศมองของกล้อง เพื่อให้เห็นพันธะคู่/สามชัดเจน
      _dir.subVectors(_b, _a).normalize();
      _view.subVectors(state.cameraLocal, _mid.addVectors(_a, _b).multiplyScalar(0.5)).normalize();
      _perp.crossVectors(_dir, _view);
      if (_perp.lengthSq() < 1e-6) _perp.set(1, 0, 0);
      _perp.normalize();
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

    // เส้นพรีวิวพันธะที่กำลังจะเกิด
    if (state.preview) {
      placeRod(this.preview, state.preview.a.pos, state.preview.b.pos, 0.003);
    } else this.preview.visible = false;

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

