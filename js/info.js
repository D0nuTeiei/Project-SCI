// สร้างข้อมูลสำหรับการ์ดข้อมูล (HTML และการ์ด 3D ใน XR)
import * as THREE from 'three';
import { CATEGORIES, elementName } from './elements.js';
import { analyze, dipoleMagnitude, shapeOf, suggestCharge } from './chemistry.js';
import { chargeSuffix } from './molecules.js';
import { FONT, roundRect } from './textures.js';
import { t, getLang } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function describeElement(el) {
  const lang = getLang();
  const cat = CATEGORIES[el.category];
  const rows = [
    [t('atomicNumber'), el.z],
    [t('atomicMass'), el.mass],
    [t('category'), lang === 'th' ? cat.th : cat.en],
  ];
  if (el.row <= 7) rows.push([`${t('period')} / ${t('group')}`, `${el.period} / ${el.group ?? '–'}`]);
  if (el.valenceElectrons != null) rows.push([t('valenceE'), el.valenceElectrons]);
  if (el.shells) rows.push([t('shells'), el.shells.join(', ')]);
  const cap = Math.max(...el.valences);
  if (!el.synthetic) rows.push([t('bondCap'), cap === 0 ? t('stable') : `${el.valences.join(' / ')} ${t('bonds')}`]);
  if (el.en != null) rows.push([t('electroneg'), el.en]);
  return {
    symbol: el.symbol,
    badgeTop: el.z,
    color: cat.color,
    title: elementName(el, lang),
    subtitle: elementName(el, lang === 'th' ? 'en' : 'th'),
    rows,
    desc: el.synthetic ? t('syntheticNote') : '',
  };
}

export function describeMolecule(sys, atom) {
  const lang = getLang();
  const comp = sys.componentOf(atom);
  const info = analyze(comp);
  if (info.single) {
    const d = describeElement(atom.el);
    if (info.charge) {
      d.symbol = info.pretty;
      if (info.entry) {
        d.title = lang === 'th' ? info.entry.th : info.entry.en;
        d.subtitle = `${info.pretty} · ${lang === 'th' ? info.entry.en : info.entry.th}`;
        d.desc = lang === 'th' ? info.entry.dTh : info.entry.dEn;
      }
      d.rows.unshift([t('netCharge'), chargeText(info.charge)]);
      if (!info.complete) d.rows.unshift([t('status'), t('impossibleIon')]);
    } else if (Math.max(...atom.el.valences) > 0 && !atom.isSatisfied()) {
      d.rows.unshift([t('status'), t('needMore', atom.missingBonds())]);
    }
    if (!info.complete) {
      const q = suggestCharge(comp);
      if (q) d.rows.unshift([t('hint'), `${t('hintCharge', q - info.charge)} → ${atom.el.symbol}${chargeSuffix(q)}`]);
    }
    return d;
  }
  const rows = [
    [t('molarMass'), `${info.mass.toFixed(2)} g/mol`],
    [t('atoms'), comp.atoms.length],
  ];
  const [s, d2, tr] = info.bondCounts;
  rows.push([t('bonds'), [s && `${t('single')} ${s}`, d2 && `${t('double')} ${d2}`, tr && `${t('triple')} ${tr}`].filter(Boolean).join(', ')]);
  if (info.central) {
    const shape = shapeOf(info.central);
    if (shape) rows.push([t('shape'), `${lang === 'th' ? shape.th : shape.en} (${shape.angle}) · ${t('around')} ${info.central.el.symbol}`]);
  }
  rows.push([t('bondType'), info.ionic ? t('ionic') : t('covalent')]);
  if (info.charge) rows.unshift([t('netCharge'), chargeText(info.charge)]);
  if (info.ions) rows.push([t('ions'), info.ions]);
  if (info.formal.length) rows.push([t('formalCharges'), info.formal.map((a) => a.el.symbol + chargeSuffix(a.charge)).join(', ')]);
  if (info.radical) rows.unshift([t('status'), t('radicalNote')]);
  if (info.complete && !info.ionic && !info.charge) rows.push([t('polarity'), dipoleMagnitude(comp) > 0.3 ? t('polar') : t('nonpolar')]);
  if (!info.complete) {
    const q = suggestCharge(comp);
    if (q) rows.unshift([t('hint'), t('hintCharge', q - info.charge)]);
  }
  if (!info.complete && !info.radical) {
    const missing = comp.atoms.filter((a) => a.missingBonds() > 0).map((a) => t('missingAt', a.el.symbol, a.missingBonds()));
    const uniq = [...new Set(missing)];
    rows.unshift([t('status'), `${t('incomplete')}: ${uniq.length ? uniq.join(', ') : t('overValence')}`]);
  }
  const e = info.entry;
  return {
    symbol: info.pretty.length <= 4 ? info.pretty : '⚛',
    badgeTop: '',
    color: e ? '#3b9c6e' : info.complete ? '#4a7fd4' : '#c27b2c',
    title: e ? (lang === 'th' ? e.th : e.en) : info.pretty,
    subtitle: e ? `${info.pretty} · ${lang === 'th' ? e.en : e.th}` : info.complete ? t('completeUnknown') : t('incomplete'),
    rows,
    desc: e ? (lang === 'th' ? e.dTh : e.dEn) : '',
  };
}

function chargeText(q) {
  return `${q > 0 ? '+' : '−'}${Math.abs(q)}`;
}

export function renderInfoHTML(d) {
  if (!d) return `<p class="muted">${esc(t('tapHint'))}</p>`;
  return `
    <div class="info-head">
      <div class="badge" style="--c:${d.color}"><small>${esc(d.badgeTop)}</small><span>${esc(d.symbol)}</span></div>
      <div><h2>${esc(d.title)}</h2><p>${esc(d.subtitle)}</p></div>
    </div>
    <dl>${d.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    ${d.desc ? `<p class="desc">${esc(d.desc)}</p>` : ''}`;
}

/** การ์ดข้อมูลแบบ 3D สำหรับแว่น VR/AR ที่ไม่มี DOM overlay */
export class InfoCard3D {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 720;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.34 * 720 / 1024),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false, side: THREE.DoubleSide }),
    );
    this.key = '';
    this.draw(null, '');
  }

  draw(d, header) {
    const key = JSON.stringify([d, header, getLang()]);
    if (key === this.key) return;
    this.key = key;
    const ctx = this.canvas.getContext('2d');
    const W = 1024; const H = 720;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(14,20,34,0.9)';
    roundRect(ctx, 0, 0, W, H, 40);
    ctx.fill();
    let y = 30;
    if (header) {
      ctx.fillStyle = 'rgba(255, 213, 79, 0.18)';
      roundRect(ctx, 24, y, W - 48, 70, 30);
      ctx.fill();
      ctx.fillStyle = '#ffe082';
      ctx.font = `600 36px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(header, 48, y + 37, W - 96);
      y += 90;
    }
    if (!d) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `500 38px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('tapHint'), W / 2, (y + H) / 2);
      this.texture.needsUpdate = true;
      return;
    }
    ctx.fillStyle = d.color;
    roundRect(ctx, 30, y, 150, 150, 22);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${d.symbol.length > 3 ? 44 : 66}px ${FONT}`;
    ctx.fillText(d.symbol, 105, y + 82);
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(String(d.badgeTop), 105, y + 26);
    ctx.textAlign = 'left';
    ctx.font = `700 52px ${FONT}`;
    ctx.fillText(d.title, 205, y + 48, W - 230);
    ctx.font = `500 32px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(d.subtitle, 205, y + 108, W - 230);
    y += 180;
    ctx.font = `500 30px ${FONT}`;
    for (const [k, v] of d.rows.slice(0, 8)) {
      if (y > H - 60) break;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(k, 36, y, 300);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(v), 350, y, W - 380);
      y += 46;
    }
    if (d.desc && y < H - 50) {
      ctx.fillStyle = '#9fe8b0';
      ctx.font = `500 28px ${FONT}`;
      ctx.fillText(d.desc, 36, y + 10, W - 72);
    }
    this.texture.needsUpdate = true;
  }
}
