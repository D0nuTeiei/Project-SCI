// ระบบจับ–ลาก–สร้างพันธะ ที่ใช้ร่วมกันทุกอุปกรณ์ (เมาส์, ทัช, คอนโทรลเลอร์ XR, มือ XR, จอมือถือใน AR)
import * as THREE from 'three';
import { atomRadius, isOverstretched } from './physics.js';

const SNAP = 0.03; // ระยะห่างระหว่างผิวอะตอมที่จะเกิดพันธะ (เมตร)
const RECYCLE_RADIUS = 0.075;
const DOUBLE_TAP_MS = 380;
const LONG_PRESS_MS = 450;

/** ตัวชี้หนึ่งตัว — พิกัดเป็นพิกัดฉาก (scene/world space) */
export class Pointer {
  constructor(id, kind) {
    this.id = id;
    this.kind = kind; // 'mouse' | 'touch' | 'controller' | 'hand' | 'screen'
    this.origin = new THREE.Vector3();
    this.dir = new THREE.Vector3(0, 0, -1);
    this.quat = null; // ทิศของมือ/คอนโทรลเลอร์ (ใช้หมุนโมเลกุล)
    this.near = null; // จุดจับใกล้ (ปลายนิ้วที่จีบ / ตำแหน่งคอนโทรลเลอร์)
    this.rotate = false;
    this.shift = false;
    this.allowLongPress = false;
    this.haptic = null;
    this.hitDistance = null; // ระยะถึงสิ่งที่ชี้อยู่ (ใช้วาดเส้นเลเซอร์)
  }
}

const _inv = new THREE.Matrix4();
const _wq = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _id = new THREE.Quaternion();

export class Interaction {
  /**
   * @param app ต้องมี sys, views, panel, panelGroup, world, recycler และ callback ต่าง ๆ
   */
  constructor(app) {
    this.app = app;
    this.grabs = new Map();
    this.lastTap = { atom: null, time: 0 };
    this.raycaster = new THREE.Raycaster();
    this.preview = null;
    this.rings = new Map();
    this.recyclerHot = false;
  }

  /** แปลงตัวชี้เป็นพิกัดท้องถิ่นของ world group */
  local(p) {
    const world = this.app.world;
    _inv.copy(world.matrixWorld).invert();
    world.getWorldQuaternion(_wq).invert();
    return {
      origin: p.origin.clone().applyMatrix4(_inv),
      dir: p.dir.clone().transformDirection(_inv),
      near: p.near ? p.near.clone().applyMatrix4(_inv) : null,
      quat: p.quat ? _wq.clone().multiply(p.quat) : null,
    };
  }

  pickPanel(p) {
    const { panel } = this.app;
    if (!panel.mesh.visible) return null;
    this.raycaster.set(p.origin, p.dir);
    const hit = this.raycaster.intersectObject(panel.mesh, false)[0];
    if (!hit) return null;
    return { type: 'panel', hit, distance: hit.distance, info: panel.hitTest(hit.uv) };
  }

  pick(p, L) {
    const { views } = this.app;
    if (L.near) {
      const atom = views.nearestAtom(L.near);
      if (atom) return { type: 'atom', atom, near: true, distance: 0 };
    }
    const ra = views.raycastAtoms(L.origin, L.dir);
    const rp = this.pickPanel(p);
    // อะตอมที่อยู่ชิดแผงให้ชนะแผงเล็กน้อย จะได้จับง่าย
    if (ra && (!rp || ra.distance <= rp.distance + 0.03)) return { type: 'atom', atom: ra.atom, near: false, distance: ra.distance };
    return rp;
  }

  /** เริ่มกด — คืนค่า true ถ้าตัวชี้ถูกใช้งาน (เช่นไม่ต้องหมุนกล้อง) */
  pointerDown(p) {
    if (this.grabs.has(p.id)) return true;
    const { app } = this;
    const L = this.local(p);
    const hit = this.pick(p, L);
    if (!hit) return false;

    if (hit.type === 'atom') {
      const now = performance.now();
      const atom = hit.atom;
      if (this.lastTap.atom === atom && now - this.lastTap.time < DOUBLE_TAP_MS) {
        this.lastTap.atom = null;
        if (app.sys.detach(atom)) app.onDetach(atom);
      } else this.lastTap = { atom, time: now };
      app.onSelectAtom(atom);
      this.startAtomGrab(p, L, atom, hit.near, p.shift);
      return true;
    }

    const info = hit.info;
    if (info.type === 'element') {
      const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(app.panelGroup.quaternion);
      const point = app.world.worldToLocal(hit.hit.point.clone()).addScaledVector(normal, 0.045);
      const atom = app.spawnAtom(info.el, point);
      app.onSelectElement(info.el, atom);
      const g = this.startAtomGrab(p, L, atom, false, false);
      g.spawned = true;
      return true;
    }
    if (info.type === 'button') {
      app.onButton(info.id);
      p.haptic?.(0.3, 20);
      return true;
    }
    if (info.type === 'move') {
      this.startPanelGrab(p, L, hit);
      return true;
    }
    return false;
  }

  startAtomGrab(p, L, atom, near, forceSingle) {
    const { sys } = this.app;
    const comp = sys.componentOf(atom);
    // อีกมือหนึ่งจับโมเลกุลนี้อยู่แล้ว → มือนี้ดึงอะตอมเดี่ยว (ใช้สองมือดึงพันธะให้ขาด)
    const other = [...this.grabs.values()].find((g) => g.kind === 'atom' && comp.atoms.some((a) => g.held.has(a)));
    let mode = forceSingle && atom.bonds.length ? 'single' : 'rigid';
    if (other) {
      mode = 'single';
      other.held.delete(atom);
    }
    const dist = Math.max(0.05, _v.subVectors(atom.pos, L.origin).dot(L.dir));
    const anchor = near && L.near ? L.near.clone() : L.origin.clone().addScaledVector(L.dir, dist);
    const held = new Map();
    if (mode === 'rigid') for (const a of comp.atoms) held.set(a, a.pos.clone().sub(anchor));
    else held.set(atom, atom.pos.clone().sub(anchor));
    const g = {
      kind: 'atom',
      atom,
      mode,
      near: !!(near && L.near),
      dist,
      held,
      frozen: mode === 'single' && !other ? comp.atoms.filter((a) => a !== atom) : [],
      qStart: L.quat ? L.quat.clone() : null,
      rotate: p.rotate,
      // ลากด้วยรังสี: ปรับความลึกตามอะตอมที่ชี้ทับ (จอ 2D และเลเซอร์ XR)
      depthAssist: true,
      allowLongPress: p.allowLongPress && mode === 'rigid',
      startTime: performance.now(),
      startAnchor: anchor.clone(),
      anchor: anchor.clone(),
      moved: 0,
      candidate: null,
      overRecycler: false,
      spawned: false,
    };
    this.grabs.set(p.id, g);
    p.haptic?.(0.35, 25);
    return g;
  }

  startPanelGrab(p, L, hit) {
    const { panelGroup, world } = this.app;
    const point = world.worldToLocal(hit.hit.point.clone());
    const dist = _v.subVectors(point, L.origin).dot(L.dir);
    this.grabs.set(p.id, {
      kind: 'panel',
      dist,
      offset: panelGroup.position.clone().sub(point),
      qStart: L.quat ? L.quat.clone() : null,
      panelQ: panelGroup.quaternion.clone(),
      rotate: p.rotate,
    });
  }

  pointerUp(p) {
    const g = this.grabs.get(p.id);
    if (!g) return;
    this.grabs.delete(p.id);
    if (g.kind !== 'atom') return;
    const { app } = this;
    const { sys } = app;
    if (g.atom.removed) return;

    if (g.overRecycler) {
      const doomed = g.mode === 'rigid' ? [...g.held.keys()] : [g.atom];
      for (const a of doomed) if (!a.removed) sys.removeAtom(a);
      app.onRecycle();
      p.haptic?.(0.6, 60);
      return;
    }

    if (g.mode === 'single') {
      let broke = false;
      for (const b of [...g.atom.bonds]) {
        if (isOverstretched(b)) { sys.removeBond(b); broke = true; }
      }
      if (broke) { app.onBreak(g.atom); p.haptic?.(0.7, 50); }
    }

    const c = g.candidate;
    if (c && !c.a.removed && !c.b.removed && sys.canBond(c.a, c.b)) {
      sys.addBond(c.a, c.b);
      app.onBond(c.a, c.b);
      p.haptic?.(0.8, 40);
    } else if (g.spawned && g.moved < 0.01) {
      // แตะธาตุเฉย ๆ (ไม่ได้ลาก) → ส่งอะตอมไปวางบนโต๊ะทำงาน
      app.flyToWorkspace(g.atom);
    }
  }

  cancel(id) {
    this.grabs.delete(id);
  }

  clear() {
    this.grabs.clear();
  }

  /** เรียกทุกเฟรมพร้อมรายการตัวชี้ที่ใช้งานอยู่ */
  update(pointers) {
    const { app } = this;
    const { sys, panel } = app;
    for (const a of sys.atoms) a.kinematic = false;
    const hoverKeys = new Set();
    const rings = new Map();

    for (const p of pointers) {
      const L = this.local(p);
      const g = this.grabs.get(p.id);
      if (g) {
        this.updateGrab(g, L);
        p.hitDistance = g.kind === 'atom' && !g.near ? g.dist : null;
        continue;
      }
      const hit = this.pick(p, L);
      p.hitDistance = hit ? hit.distance : null;
      if (!hit) continue;
      if (hit.type === 'atom') rings.set(hit.atom, 'hover');
      else if (hit.info.type !== 'panel') hoverKeys.add(hit.info.key);
    }

    // ตรึงอะตอมที่ถูกจับ
    for (const g of this.grabs.values()) {
      if (g.kind !== 'atom') continue;
      for (const a of g.held.keys()) a.kinematic = true;
      for (const a of g.frozen) a.kinematic = true;
    }

    // หาคู่ที่จะเกิดพันธะ, ถังรีไซเคิล, พันธะที่ถูกดึงจนจะขาด
    const recyclerPos = app.world.worldToLocal(app.recycler.getWorldPosition(new THREE.Vector3()));
    this.preview = null;
    this.recyclerHot = false;
    for (const g of this.grabs.values()) {
      if (g.kind !== 'atom' || g.atom.removed) continue;
      g.overRecycler = g.atom.pos.distanceTo(recyclerPos) < RECYCLE_RADIUS;
      g.candidate = g.overRecycler ? null : this.findCandidate(g);
      if (g.overRecycler) {
        this.recyclerHot = true;
        for (const a of g.held.keys()) rings.set(a, 'recycle');
        continue;
      }
      rings.set(g.atom, 'grab');
      if (g.mode === 'single' && g.atom.bonds.some(isOverstretched)) rings.set(g.atom, 'break');
      if (g.candidate) {
        rings.set(g.candidate.a, 'target');
        rings.set(g.candidate.b, 'target');
        this.preview = g.candidate;
      }
    }

    panel.setHover(hoverKeys);
    this.rings = rings;
  }

  updateGrab(g, L) {
    const qDelta = g.rotate && L.quat && g.qStart ? L.quat.clone().multiply(g.qStart.clone().invert()) : _id;
    if (g.kind === 'panel') {
      const anchor = L.origin.clone().addScaledVector(L.dir, g.dist);
      const { panelGroup } = this.app;
      panelGroup.position.copy(anchor).add(g.offset.clone().applyQuaternion(qDelta));
      panelGroup.quaternion.copy(qDelta).multiply(g.panelQ);
      return;
    }
    if (g.atom.removed) return;
    if (g.depthAssist && !g.near) {
      // ลากด้วยรังสีควบคุมความลึกได้ยาก: ถ้าชี้ทับอะตอมอื่นให้เลื่อนความลึกไปหาอะตอมนั้นเพื่อให้ต่อพันธะได้
      const under = this.app.views.raycastAtoms(L.origin, L.dir, 10, new Set(g.held.keys()));
      if (under) {
        const want = _v.subVectors(under.atom.pos, L.origin).dot(L.dir) - atomRadius(under.atom.el);
        g.dist += (want - g.dist) * 0.25;
      }
    }
    if (g.near) {
      if (L.near) g.anchor.copy(L.near);
    } else g.anchor.copy(L.origin).addScaledVector(L.dir, g.dist);
    for (const [a, off] of g.held) {
      if (a.removed) continue;
      a.pos.copy(g.anchor).add(_v.copy(off).applyQuaternion(qDelta));
    }
    g.moved = Math.max(g.moved, g.anchor.distanceTo(g.startAnchor));

    // กดค้างโดยไม่ขยับ → เปลี่ยนเป็นโหมดดึงอะตอมเดี่ยวออกจากโมเลกุล
    if (g.allowLongPress && g.mode === 'rigid' && g.atom.bonds.length && g.moved < 0.006
      && performance.now() - g.startTime > LONG_PRESS_MS) {
      const off = g.held.get(g.atom);
      g.frozen = [...g.held.keys()].filter((a) => a !== g.atom);
      g.held = new Map([[g.atom, off]]);
      g.mode = 'single';
      this.app.onLongPress?.(g.atom);
    }
  }

  findCandidate(g) {
    const { sys } = this.app;
    const heldSet = new Set(g.held.keys());
    let best = null;
    let bestD = SNAP;
    for (const a of heldSet) {
      if (a.removed || !a.hasFreeSlot()) continue;
      // ห้ามต่อกับเพื่อนบ้านลำดับที่ 1–2 (กันวงสามเหลี่ยมโดยไม่ตั้งใจตอนดึงอะตอม)
      const close = new Set([a]);
      for (const n of a.neighbors) { close.add(n); n.neighbors.forEach((m) => close.add(m)); }
      for (const b of sys.atoms) {
        if (heldSet.has(b) || close.has(b) || !b.hasFreeSlot()) continue;
        const d = a.pos.distanceTo(b.pos) - atomRadius(a.el) - atomRadius(b.el);
        if (d < bestD) { bestD = d; best = { a, b }; }
      }
    }
    return best;
  }
}
