// เสียงประกอบสังเคราะห์ด้วย Web Audio (ไม่ต้องใช้ไฟล์เสียง)
let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.12, slide = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  unlock() { ac(); },
  spawn() { tone(660, 0, 0.09, { type: 'triangle', gain: 0.08 }); },
  bond() { tone(523, 0, 0.12, { gain: 0.1 }); tone(784, 0.07, 0.18, { gain: 0.1 }); },
  break() { tone(420, 0, 0.18, { type: 'triangle', slide: -220, gain: 0.1 }); },
  recycle() { tone(300, 0, 0.25, { type: 'sawtooth', slide: -240, gain: 0.05 }); },
  success() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.22, { gain: 0.09 })); },
  click() { tone(880, 0, 0.05, { type: 'square', gain: 0.03 }); },
};
