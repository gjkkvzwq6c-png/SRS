/* ── VORTEX Utilities ── */
'use strict';

const Utils = {
  lerp: (a, b, t) => a + (b - a) * t,
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  dist2: (ax, ay, bx, by) => (ax-bx)**2 + (ay-by)**2,
  dist:  (ax, ay, bx, by) => Math.hypot(ax-bx, ay-by),
  rand:  (lo, hi) => lo + Math.random() * (hi - lo),
  randInt: (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1)),
  randChoice: arr => arr[Math.floor(Math.random() * arr.length)],

  angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),

  // Hex color to rgba string
  hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  // Format large numbers
  fmtMass(n) {
    if (n >= 1e9) return (n/1e9).toFixed(1)+'B kg';
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M kg';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K kg';
    return n.toFixed(0)+' kg';
  },

  fmtTime(s) {
    const m = Math.floor(s/60);
    const sec = Math.floor(s%60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  },

  // Ease functions
  easeOutCubic: t => 1 - (1-t)**3,
  easeInOutQuad: t => t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2,

  // Pool helper — reuse dead items
  getFromPool(pool, createFn) {
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].alive) return pool[i];
    }
    const item = createFn();
    pool.push(item);
    return item;
  },

  // Save / Load
  save(data) {
    try { localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(data)); } catch(e){}
  },
  load() {
    try {
      const d = localStorage.getItem(CFG.SAVE_KEY);
      return d ? JSON.parse(d) : null;
    } catch(e) { return null; }
  },
};
