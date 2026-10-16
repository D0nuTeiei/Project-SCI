// แผงตารางธาตุ 3D (วาดลง canvas) — ใช้ได้ทั้งเมาส์ ทัชสกรีน คอนโทรลเลอร์ และมือใน XR
import * as THREE from 'three';
import { ELEMENTS, CATEGORIES, elementName } from './elements.js';
import { FONT, roundRect } from './textures.js';
import { t, getLang } from './i18n.js';

const W = 2048;
const H = 1300;
const GX = 34; // ขอบซ้ายของตาราง
const GY = 150; // ขอบบนของตาราง
const CW = 110; // ความกว้างช่อง
const CH = 100; // ความสูงช่อง
const FGAP = 24; // ช่องว่างก่อนแถว f-block
const FOOT_Y = 1095;

export const PANEL_WIDTH = 0.64;
export const PANEL_HEIGHT = (PANEL_WIDTH * H) / W;

function cellRect(el) {
  const x = GX + (el.col - 1) * CW;
  const y = el.row <= 7 ? GY + (el.row - 1) * CH : GY + 7 * CH + FGAP + (el.row - 9) * CH;
  return { x, y, w: CW - 6, h: CH - 6 };
}

const BUTTONS = [
  { id: 'clear', x: 34, w: 300, label: () => '🗑 ' + t('clear') },
  { id: 'challenge', x: 350, w: 300, label: () => '🎯 ' + t('challenge'), toggle: 'challenge' },
  { id: 'lonepairs', x: 666, w: 330, label: () => '•• ' + t('lonePairs'), toggle: 'lonePairs' },
  { id: 'lang', x: 1012, w: 200, label: () => (getLang() === 'th' ? 'TH → EN' : 'EN → TH') },
];
const BTN_Y = FOOT_Y;
const BTN_H = 84;
const MOVE = { x: 1660, y: 26, w: 354, h: 84 };

export class PeriodicPanel {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT), mat);
    this.mesh.name = 'periodic-panel';
    this.mesh.renderOrder = 1;
    this.hover = new Set(); // คีย์ของสิ่งที่ถูกชี้อยู่ เช่น 'el:8', 'btn:clear', 'move'
    this.selected = null; // ธาตุที่เลือกล่าสุด
    this.toggles = { challenge: false, lonePairs: false };
    this.footerText = '';
    this.stateKey = '';
    this.redraw();
  }

  /** แปลง uv บนแผงเป็นสิ่งที่ถูกชี้ */
  hitTest(uv) {
    const px = uv.x * W;
    const py = (1 - uv.y) * H;
    if (px >= MOVE.x && px <= MOVE.x + MOVE.w && py >= MOVE.y && py <= MOVE.y + MOVE.h) return { type: 'move', key: 'move' };
    for (const b of BUTTONS) {
      if (px >= b.x && px <= b.x + b.w && py >= BTN_Y && py <= BTN_Y + BTN_H) return { type: 'button', id: b.id, key: 'btn:' + b.id };
    }
    for (const el of ELEMENTS) {
      const r = cellRect(el);
      if (px >= r.x - 3 && px <= r.x + r.w + 3 && py >= r.y - 3 && py <= r.y + r.h + 3) return { type: 'element', el, key: 'el:' + el.z };
    }
    return { type: 'panel', key: 'panel' };
  }

  /** จุดกึ่งกลางของช่องธาตุในพิกัด uv (ใช้ทดสอบอัตโนมัติ) */
  uvOf(el) {
    const r = cellRect(el);
    return { x: (r.x + r.w / 2) / W, y: 1 - (r.y + r.h / 2) / H };
  }

  setHover(keys) {
    this.hover = keys;
  }

  /** วาดใหม่เฉพาะเมื่อสถานะเปลี่ยน */
  update() {
    const key = [...this.hover].sort().join('|') + '#' + (this.selected?.z || 0) + '#' + JSON.stringify(this.toggles) + getLang() + this.footerText;
    if (key !== this.stateKey) {
      this.stateKey = key;
      this.redraw();
    }
  }

  redraw() {
    const ctx = this.canvas.getContext('2d');
    const lang = getLang();
    ctx.clearRect(0, 0, W, H);

    // พื้นหลัง
    ctx.fillStyle = 'rgba(14, 20, 34, 0.9)';
    roundRect(ctx, 0, 0, W, H, 48);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 170, 255, 0.35)';
    ctx.lineWidth = 4;
    roundRect(ctx, 2, 2, W - 4, H - 4, 46);
    ctx.stroke();

    // หัวแผง
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 64px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(t('periodicTable'), 48, 70);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `500 36px ${FONT}`;
    ctx.fillText('ChemXR Lab', 48 + ctx.measureText(t('periodicTable')).width * 64 / 36 + 30, 74);

    const moveHover = this.hover.has('move');
    ctx.fillStyle = moveHover ? 'rgba(120,170,255,0.45)' : 'rgba(255,255,255,0.10)';
    roundRect(ctx, MOVE.x, MOVE.y, MOVE.w, MOVE.h, 42);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 40px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('⠿ ' + t('move'), MOVE.x + MOVE.w / 2, MOVE.y + MOVE.h / 2 + 2);

    // ช่องธาตุ
    for (const el of ELEMENTS) {
      const r = cellRect(el);
      const cat = CATEGORIES[el.category];
      const hovered = this.hover.has('el:' + el.z);
      const selected = this.selected === el;
      ctx.globalAlpha = el.synthetic ? 0.55 : 1;
      ctx.fillStyle = cat.color;
      roundRect(ctx, r.x, r.y, r.w, r.h, 14);
      ctx.fill();
      if (hovered || selected) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
        ctx.strokeStyle = selected ? '#7dffb0' : '#ffffff';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      // จุดสีอะตอม (CPK)
      ctx.fillStyle = el.color;
      ctx.beginPath();
      ctx.arc(r.x + r.w - 15, r.y + 15, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `500 22px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(String(el.z), r.x + 8, r.y + 6);
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 44px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.symbol, r.x + r.w / 2, r.y + r.h / 2 + 2);
      ctx.font = `500 16px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const nm = elementName(el, lang);
      ctx.fillText(nm.length > 11 ? nm.slice(0, 10) + '…' : nm, r.x + r.w / 2, r.y + r.h - 13);
      ctx.globalAlpha = 1;
    }

    // ช่องอ้างอิง f-block
    ctx.font = `500 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [row, txt] of [[6, '57–71'], [7, '89–103']]) {
      const x = GX + 2 * CW;
      const y = GY + (row - 1) * CH;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      roundRect(ctx, x, y, CW - 6, CH - 6, 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(txt, x + (CW - 6) / 2, y + (CH - 6) / 2);
    }

    this.drawPreview(ctx, lang);

    // ปุ่มด้านล่าง
    for (const b of BUTTONS) {
      const on = b.toggle && this.toggles[b.toggle];
      const hovered = this.hover.has('btn:' + b.id);
      ctx.fillStyle = on ? 'rgba(80, 200, 140, 0.55)' : hovered ? 'rgba(120,170,255,0.45)' : 'rgba(255,255,255,0.12)';
      roundRect(ctx, b.x, BTN_Y, b.w, BTN_H, 42);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 38px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label(), b.x + b.w / 2, BTN_Y + BTN_H / 2 + 2);
    }

    // ข้อความแนะนำ / ภารกิจ
    ctx.fillStyle = this.footerText ? '#ffe082' : 'rgba(255,255,255,0.7)';
    ctx.font = `${this.footerText ? 600 : 500} 36px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.footerText || t('hint'), 40, 1236, W - 80);

    this.texture.needsUpdate = true;
  }

  /** กล่องแสดงธาตุที่ชี้/เลือก ในช่องว่างบนตาราง (หมู่ 3–12 คาบ 1–3) */
  drawPreview(ctx, lang) {
    let el = this.selected;
    for (const k of this.hover) if (k.startsWith('el:')) el = ELEMENTS[Number(k.slice(3)) - 1];
    const x = GX + 2 * CW + 10;
    const y = GY;
    const w = 10 * CW - 20;
    const h = 3 * CH - 10;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
    if (!el) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `500 34px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('tapHint'), x + w / 2, y + h / 2);
      return;
    }
    const cat = CATEGORIES[el.category];
    ctx.fillStyle = cat.color;
    roundRect(ctx, x + 20, y + 20, 250, 250, 24);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 120px ${FONT}`;
    ctx.fillText(el.symbol, x + 145, y + 150);
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText(String(el.z), x + 145, y + 56);
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(el.mass.toFixed(el.mass < 100 ? 3 : 2), x + 145, y + 240);

    ctx.textAlign = 'left';
    ctx.font = `700 54px ${FONT}`;
    ctx.fillText(elementName(el, lang), x + 300, y + 60);
    ctx.font = `500 34px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`${elementName(el, lang === 'th' ? 'en' : 'th')} · ${lang === 'th' ? cat.th : cat.en}`, x + 300, y + 116);
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 32px ${FONT}`;
    const lines = [];
    if (el.shells) lines.push(`${t('shells')}: ${el.shells.join(', ')}`);
    const cap = Math.max(...el.valences);
    if (el.synthetic) lines.push(t('syntheticNote'));
    else lines.push(`${t('bondCap')}: ${cap === 0 ? t('stable') : el.valences.join(' / ') + ' ' + t('bonds')}` + (el.en != null ? `   ·   EN ${el.en}` : ''));
    lines.forEach((l, i) => ctx.fillText(l, x + 300, y + 172 + i * 46, w - 320));
  }
}
