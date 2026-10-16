// ตัวช่วยวาดข้อความ/ป้ายลง canvas แล้วใช้เป็น texture ใน three.js
import * as THREE from 'three';

export const FONT = '"Sarabun", "Noto Sans Thai", "Leelawadee UI", "Thonburi", system-ui, sans-serif';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * ป้ายข้อความลอยที่หันหน้าหากล้องเสมอ (Sprite)
 * lines: [{ text, size, color, weight }]
 */
export class TextSprite extends THREE.Sprite {
  constructor(lines = [], { worldHeightPerPx = 0.00028, background = 'rgba(10,16,28,0.55)' } = {}) {
    const canvas = document.createElement('canvas');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    super(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    this.canvas = canvas;
    this.texture = texture;
    this.worldHeightPerPx = worldHeightPerPx;
    this.background = background;
    this.renderOrder = 10;
    this.key = '';
    this.setLines(lines);
  }

  setLines(lines) {
    const key = JSON.stringify(lines);
    if (key === this.key) return;
    this.key = key;
    const ctx = this.canvas.getContext('2d');
    const pad = 22;
    const gap = 6;
    let w = 0;
    let h = pad * 2 - gap;
    for (const l of lines) {
      ctx.font = `${l.weight || 600} ${l.size || 44}px ${FONT}`;
      w = Math.max(w, ctx.measureText(l.text).width);
      h += (l.size || 44) * 1.25 + gap;
    }
    w = Math.ceil(w + pad * 2);
    h = Math.ceil(h);
    this.canvas.width = Math.max(4, w);
    this.canvas.height = Math.max(4, h);
    ctx.clearRect(0, 0, w, h);
    if (this.background && lines.length) {
      ctx.fillStyle = this.background;
      roundRect(ctx, 0, 0, w, h, Math.min(28, h / 2));
      ctx.fill();
    }
    let y = pad;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const l of lines) {
      const size = l.size || 44;
      ctx.font = `${l.weight || 600} ${size}px ${FONT}`;
      ctx.fillStyle = l.color || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(l.text, w / 2, y + size * 0.1);
      y += size * 1.25 + gap;
    }
    // สร้าง texture ใหม่เมื่อขนาด canvas เปลี่ยน (บางเบราว์เซอร์ไม่อัปเดตขนาดเดิม)
    this.texture.dispose();
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.material.map = this.texture;
    this.material.needsUpdate = true;
    this.scale.set(w * this.worldHeightPerPx, h * this.worldHeightPerPx, 1);
    this.center.set(0.5, 0);
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
  }
}
