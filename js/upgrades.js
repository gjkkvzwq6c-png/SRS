/* ── VORTEX Upgrade System ── */
'use strict';

const Upgrades = (() => {
  const DEFS = [
    { key:'range',    label:'Suction Range',   icon:'🌀', desc:'Pulls objects from farther away.',     max:5, step:0.25 },
    { key:'force',    label:'Wind Force',       icon:'💨', desc:'Increases pull strength on objects.',  max:5, step:0.30 },
    { key:'speed',    label:'Movement Speed',   icon:'⚡', desc:'Move faster across the storm zone.',   max:5, step:0.18 },
    { key:'width',    label:'Tornado Width',    icon:'🔄', desc:'Widen the vortex for larger sweeps.',  max:5, step:0.25 },
    { key:'lightning',label:'Lightning Strike', icon:'⚡', desc:'More frequent lightning ignitions.',   max:4, step:0.35 },
    { key:'combo',    label:'Mass Multiplier',  icon:'✖️',  desc:'Absorb bonus mass per object.',        max:5, step:0.25 },
    { key:'debris',   label:'Debris Capacity',  icon:'🪨', desc:'Orbit more objects around the funnel.',max:4, step:0.30 },
  ];

  // Points and per-key level tracking
  let points = 0;
  const levels = {};
  DEFS.forEach(d => levels[d.key] = 0);

  function addPoints(n) { points += n; }

  function getAvailable() {
    return DEFS.filter(d => levels[d.key] < d.max);
  }

  // Pick 3 random choices for upgrade screen (no duplicates)
  function getChoices() {
    const pool = getAvailable().slice();
    // Shuffle
    for (let i = pool.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]] = [pool[j],pool[i]];
    }
    return pool.slice(0, Math.min(3, pool.length));
  }

  function purchase(key) {
    const def = DEFS.find(d=>d.key===key);
    if (!def || levels[key] >= def.max) return false;
    levels[key]++;
    Tornado.addUpgrade(key, def.step);
    return true;
  }

  function getLevelOf(key) { return levels[key]; }
  function getMaxOf(key)   { return (DEFS.find(d=>d.key===key)||{}).max || 1; }

  function reset() {
    points = 0;
    DEFS.forEach(d => levels[d.key] = 0);
  }

  function save() { return { levels: {...levels}, points }; }
  function load(data) {
    if (!data) return;
    Object.assign(levels, data.levels || {});
    points = data.points || 0;
  }

  return { DEFS, addPoints, getAvailable, getChoices, purchase,
           getLevelOf, getMaxOf, reset, save, load,
           get points() { return points; },
  };
})();
