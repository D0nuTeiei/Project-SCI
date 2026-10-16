// โหมดภารกิจ: ให้นักเรียนสร้างโมเลกุลตามโจทย์ทีละข้อ
import { moleculeById, prettyFormula } from './molecules.js';
import { getLang } from './i18n.js';

const LIST = ['H2', 'H2O', 'O2', 'CO2', 'NH3', 'CH4', 'HCl', 'N2', 'C2H4', 'CH3OH', 'HCN', 'C2H5OH', 'NaCl', 'H2O2', 'CH3COOH', 'C6H6'];

export class Challenge {
  constructor() {
    this.active = false;
    this.index = 0;
    this.score = 0;
    try {
      const saved = JSON.parse(localStorage.getItem('chemxr-challenge') || '{}');
      this.index = Math.min(saved.index || 0, LIST.length);
      this.score = saved.score || 0;
    } catch { /* ignore */ }
  }

  save() {
    try { localStorage.setItem('chemxr-challenge', JSON.stringify({ index: this.index, score: this.score })); } catch { /* ignore */ }
  }

  get total() { return LIST.length; }
  get done() { return this.index >= LIST.length; }
  current() { return this.done ? null : moleculeById(LIST[this.index]); }

  /** ข้อความโจทย์ปัจจุบัน */
  text(tFn) {
    if (this.done) return tFn('challengeAll');
    const m = this.current();
    const name = getLang() === 'th' ? m.th : m.en;
    return `🎯 ${this.index + 1}/${LIST.length} · ${tFn('challengeBuild')} ${prettyFormula(m.f)} (${name})`;
  }

  /** ตรวจว่ามีโมเลกุลที่ตรงกับโจทย์หรือยัง คืนค่า entry ถ้าสำเร็จ */
  check(entries) {
    if (!this.active || this.done) return null;
    const m = this.current();
    if (entries.some((e) => e && e.id === m.id)) {
      this.index++;
      this.score += 10;
      this.save();
      return m;
    }
    return null;
  }

  skip() {
    if (!this.done) this.index++;
    this.save();
  }

  reset() {
    this.index = 0;
    this.score = 0;
    this.save();
  }
}
