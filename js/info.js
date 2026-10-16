// สร้างข้อมูลสำหรับการ์ดข้อมูล (HTML และการ์ด 3D ใน XR)
import * as THREE from 'three';
import { CATEGORIES, elementName } from './elements.js';
import { analyze, dipoleMagnitude, shapeOf, suggestCharge, intermolecularForces, bondTypeOf } from './chemistry.js';
import { moleculeBondEnergy } from './energy.js';
import { structureOptions, metalPacking } from './lattice.js';
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
  // สารบริสุทธิ์ของธาตุนี้ยึดกันแบบไหน
  if (CATS_METAL.has(el.category)) rows.push([t('pureForm'), t('pureMetal', metalPacking(el.symbol))]);
  else if (el.symbol === 'C') rows.push([t('pureForm'), t('pureCarbon')]);
  else if (el.symbol === 'Si' || el.symbol === 'Ge') rows.push([t('pureForm'), t('pureNetwork')]);
  return {
    actions: structureActions({ el }),
    symbol: el.symbol,
    badgeTop: el.z,
    color: cat.color,
    title: elementName(el, lang),
    subtitle: elementName(el, lang === 'th' ? 'en' : 'th'),
    rows,
    desc: el.synthetic ? t('syntheticNote') : '',
  };
}

const CATS_METAL = new Set(['alkali', 'alkaline', 'transition', 'post-transition', 'lanthanide', 'actinide']);
const FRACTIONS = [[1, '1'], [1.25, '1¼'], [4 / 3, '1⅓'], [1.5, '1½'], [5 / 3, '1⅔'], [1.75, '1¾'], [2, '2']];
const fmtOrder = (o) => (FRACTIONS.find(([v]) => Math.abs(v - o) < 1e-3)?.[1] ?? o.toFixed(2));

/** ปุ่มดูโครงสร้างผลึกที่เกี่ยวข้อง (ไอออนิก / ร่างตาข่าย / โลหะ) */
function structureActions(opts) {
  const lang = getLang();
  return structureOptions(opts).map((o) => ({ id: `struct:${o.id}`, label: `🔷 ${lang === 'th' ? o.th : o.en}` }));
}

/**
 * ctx: { hbondCount: จำนวนพันธะไฮโดรเจนของโมเลกุลนี้ในฉาก, cluster: กลุ่มไอออนที่อะตอมนี้อยู่ (ถ้ามี) }
 */
export function describeMolecule(sys, atom, ctx = {}) {
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
      if (q) d.rows.unshift([t('hintRow'), `${t('hintCharge', q - info.charge)} → ${atom.el.symbol}${chargeSuffix(q)}`]);
    }
    d.actions = d.actions || [];
    if (info.charge) d.actions = [];
    if (ctx.cluster) clusterRows(d, ctx.cluster, lang);
    return d;
  }
  // สารไอออนิก: ใช้ "มวลสูตร" และไม่นับ "พันธะ" แบบโมเลกุล (กันความเข้าใจผิดว่าเป็นโมเลกุล)
  const ionicOnly = info.ionic && comp.bonds.every((b) => bondTypeOf(b) === 'ionic');
  const e = info.entry;
  const rows = [
    [ionicOnly ? t('formulaMass') : t('molarMass'), `${info.mass.toFixed(2)} g/mol`],
    [t('atoms'), comp.atoms.length],
  ];
  const [s, d2, tr] = info.bondCounts;
  if (!ionicOnly) {
    const list = [s && `${t('single')} ${s}`, d2 && `${t('double')} ${d2}`, tr && `${t('triple')} ${tr}`].filter(Boolean).join(', ');
    rows.push([t('bonds'), info.resonance.length ? `${list} ${t('oneLewis')}` : list]);
  }
  if (info.central) {
    const shape = shapeOf(info.central);
    if (shape) rows.push([t('shape'), `${lang === 'th' ? shape.th : shape.en} (${shape.angle}) · ${t('around')} ${info.central.el.symbol}`]);
  }
  // เรขาคณิตจากการทดลอง เทียบกับที่ VSEPR ทำนาย
  const exp = info.entry?.exp;
  if (exp?.shapeEn) rows.push([t('expShapeRow'), lang === 'th' ? exp.shapeTh : exp.shapeEn]);
  if (exp?.angle) rows.push([t('expAngleRow'), `${exp.angle}°`]);
  if (exp?.dihedral) rows.push([t('expDihedralRow'), `${exp.dihedral}°`]);
  if (exp?.noteTh) rows.push(['', lang === 'th' ? exp.noteTh : exp.noteEn]);
  // ไอโซเมอร์เชิงพื้นที่
  const stereo = ctx.stereo;
  for (const db of stereo?.dbs || []) {
    rows.push([t('geoIsomer'), `${db.cisTrans ? `${db.cisTrans} (${db.ez})` : db.ez} — ${t('geoIsomerNote')}`]);
  }
  if (stereo?.centers.length) {
    const list = stereo.centers.map((c) => `${c.atom.el.symbol}(${c.label})`).join(', ');
    const ld = e?.aminoAcid && stereo.centers.length === 1 ? ` = ${stereo.centers[0].label === 'S' ? 'L' : 'D'}-${lang === 'th' ? e.th : e.en}` : '';
    rows.push([t('chiralRow'), `${list}${ld} — ${t('chiralNote')}`]);
  }
  rows.push([t('bondType'), ionicOnly ? t('ionic') : info.ionic ? `${t('ionic')} + ${t('covalent')}` : t('covalent')]);
  if (info.charge) rows.unshift([t('netCharge'), chargeText(info.charge)]);
  if (info.ions) rows.push([t('ions'), info.ions]);
  // ประจุฟอร์มอลหลังเฉลี่ยเรโซแนนซ์ (เช่น O₃: O⁺ กลาง, O ปลายละ −½)
  const charged = comp.atoms.filter((a) => Math.abs(a.partialCharge) > 1e-6);
  if (charged.length && !info.single) rows.push([t('formalCharges'), charged.map((a) => `${a.el.symbol}(${fracCharge(a.partialCharge)})`).join(', ')]);
  if (info.radical) rows.unshift([t('status'), t('radicalNote')]);
  if (info.complete && !info.ionic && !info.charge) rows.push([t('polarity'), dipoleMagnitude(comp) > 0.3 ? t('polar') : t('nonpolar')]);
  // เรโซแนนซ์: รวมพันธะที่อันดับพันธะเฉลี่ยเท่ากัน
  const resGroups = new Map();
  for (const b of info.resonance) {
    const pair = [b.a.el.symbol, b.b.el.symbol].sort().join('–');
    const k = `${pair}|${b.resonance.toFixed(3)}`;
    resGroups.set(k, { pair, order: b.resonance, n: (resGroups.get(k)?.n || 0) + 1 });
  }
  for (const g of resGroups.values()) rows.push([t('resonanceRow'), t('resonanceNote', g.pair, g.n, fmtOrder(g.order))]);
  if (info.ionic && info.complete) rows.push([t('ionicNoteRow'), t('ionicNote')]);
  if (info.complete) {
    const forces = intermolecularForces(comp, info);
    const names = t('imf');
    rows.push([forces[0] === 'ionic' ? t('crystalForceRow') : t('imfRow'), forces.map((f) => names[f]).join(', ')]);
    if (forces.includes('hbond')) rows.push(['', t('boilNote')]);
  }
  if (info.entry?.bp !== undefined) {
    const bp = String(info.entry.bp);
    rows.push([t('bpRow'), `${bp.replace('*', '').replace('-', '−')} °C${bp.endsWith('*') ? ' (ระเหิด)' : ''}`]);
  }
  if (ctx.hbondCount) rows.push(['', t('hbondsInScene', ctx.hbondCount)]);
  if (!info.ionic) {
    const en = moleculeBondEnergy(comp.bonds);
    if (en.missing === 0 && en.total > 0) rows.push([t('energyRow'), t('energyNote', en.total)]);
  }
  if (!info.complete) {
    const q = suggestCharge(comp);
    if (q) rows.unshift([t('hintRow'), t('hintCharge', q - info.charge)]);
  }
  if (!info.complete && !info.radical) {
    const missing = comp.atoms.filter((a) => a.missingBonds() > 0).map((a) => t('missingAt', a.el.symbol, a.missingBonds()));
    const uniq = [...new Set(missing)];
    rows.unshift([t('status'), `${t('incomplete')}: ${uniq.length ? uniq.join(', ') : t('overValence')}`]);
  }
  return {
    symbol: info.pretty.length <= 4 ? info.pretty : '⚛',
    badgeTop: '',
    color: e ? '#3b9c6e' : info.complete ? '#4a7fd4' : '#c27b2c',
    title: e ? (lang === 'th' ? e.th : e.en) : info.pretty,
    subtitle: e ? `${info.pretty} · ${lang === 'th' ? e.en : e.th}` : info.complete ? t('completeUnknown') : t('incomplete'),
    rows,
    desc: e ? (lang === 'th' ? e.dTh : e.dEn) : '',
    actions: [
      ...structureActions({ info }),
      ...(exp?.angle || exp?.dihedral ? [{ id: 'expToggle', label: ctx.useExperimental === false ? t('useExp') : t('useVsepr') }] : []),
      ...(stereo?.dbs.some((d) => d.cisTrans || d.ez) ? [{ id: 'flip', label: t('flipCisTrans') }] : []),
      ...(stereo?.centers.length ? [{ id: 'mirror', label: t('mirror') }] : []),
      { id: 'duplicate', label: t('duplicate') },
    ],
  };
}

/** แถวข้อมูลเมื่อไอออนวางอยู่ในกลุ่มเกลือ */
function clusterRows(d, cluster, lang) {
  const name = cluster.entry ? `${lang === 'th' ? cluster.entry.th : cluster.entry.en} · ${cluster.pretty}` : cluster.pretty;
  d.rows.unshift([t('ions'), `${cluster.ions} → ${name}`]);
  d.rows.push([t('ionicNoteRow'), t('ionicNote')]);
  d.actions.push(...structureActions({ ionGroups: cluster.ionGroups }));
}

function fracCharge(q) {
  const sign = q > 0 ? '+' : '−';
  const a = Math.abs(q);
  const FR = [[1 / 3, '⅓'], [2 / 3, '⅔'], [0.5, '½'], [0.25, '¼'], [0.75, '¾']];
  const f = FR.find(([v]) => Math.abs(v - a) < 1e-3);
  return sign + (f ? f[1] : Number.isInteger(+a.toFixed(6)) ? String(Math.round(a)) : a.toFixed(2));
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
    ${d.desc ? `<p class="desc">${esc(d.desc)}</p>` : ''}
    ${d.actions?.length ? `<div class="info-actions">${d.actions.map((a) => `<button data-action="${a.id}">${esc(a.label)}</button>`).join('')}</div>` : ''}`;
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
