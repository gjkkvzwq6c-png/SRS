/* ── VORTEX Tornado (Player Entity) ── */
'use strict';

const Tornado = (() => {
  let x = CFG.WORLD_W / 2;
  let y = CFG.WORLD_H / 2;
  let stage = 0;
  let mass  = 0;
  let energy = 1.0;     // 0..1 for energy bar
  let combo  = 1;
  let comboTimer = 0;
  let rot   = 0;        // rotation angle for swirl
  let rotSpeed = 3.2;
  let spinnerPhase = 0; // secondary spin
  let visualW = CFG.STAGES[0].w;
  let visualH = CFG.STAGES[0].h;
  let rangeMult  = 1.0;
  let forceMult  = 1.0;
  let speedMult  = 1.0;
  let widthMult  = 1.0;
  let lightMult  = 1.0;
  let comboMult  = 1.0;
  let debrisMult = 1.0;
  let skinMode   = 'normal'; // normal | fire | electric
  let absorptionFlash = 0;   // brief glow on absorb
  let groundSwirl = 0;       // ground dust effect radius

  // Input state
  const keys = {};
  document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ') e.preventDefault();
  });
  document.addEventListener('keyup',   e => { keys[e.key] = false; });

  // Touch / mouse input
  let touchDX = 0, touchDY = 0;
  document.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      touchDX = (t.clientX - window.innerWidth/2)  / (window.innerWidth/2);
      touchDY = (t.clientY - window.innerHeight/2) / (window.innerHeight/2);
    }
  }, { passive: false });
  document.addEventListener('touchend', () => { touchDX = 0; touchDY = 0; });

  function _getInput() {
    let dx = 0, dy = 0;
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
    if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += 1;
    if (Math.abs(touchDX) > 0.1) dx += touchDX;
    if (Math.abs(touchDY) > 0.1) dy += touchDY;
    // Normalize diagonal
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    return { dx, dy };
  }

  function update(dt) {
    const stg = CFG.STAGES[stage];
    const spd = stg.speed * speedMult;

    const { dx, dy } = _getInput();
    x += dx * spd * dt;
    y += dy * spd * dt;

    // Clamp to world
    x = Utils.clamp(x, 60, CFG.WORLD_W - 60);
    y = Utils.clamp(y, 60, CFG.WORLD_H - 60);

    // Spin
    rotSpeed = Utils.lerp(rotSpeed, 3.0 + stage * 1.4 + (Math.abs(dx)+Math.abs(dy))*1.5, 0.05);
    rot += rotSpeed * dt;
    spinnerPhase += (rotSpeed * 0.4 + 1.8) * dt;

    // Visual grow/shrink (lerp toward target)
    const targetW = stg.w * widthMult;
    const targetH = stg.h;
    visualW = Utils.lerp(visualW, targetW, dt * 2.5);
    visualH = Utils.lerp(visualH, targetH, dt * 2.5);

    // Energy drain/regen
    const moving = Math.abs(dx)+Math.abs(dy) > 0.1;
    if (moving) energy = Utils.clamp(energy - 0.012*dt, 0, 1);
    else         energy = Utils.clamp(energy + 0.035*dt, 0, 1);

    // Combo decay
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 1;
    }

    if (absorptionFlash > 0) absorptionFlash -= dt * 3;

    groundSwirl = visualW * 0.6;

    // Camera zoom: smaller tornado → closer view, bigger → zoom out
    const targetZoom = Utils.lerp(1.35, 0.45, stage / 7);
    Camera.setZoom(targetZoom);
    Camera.follow(x, y, dt);
  }

  function absorbObject(obj) {
    const mass_gain = obj.def.mass * comboMult;
    mass += mass_gain;
    combo = Math.min(combo + 1, 20);
    comboTimer = 3.5;
    absorptionFlash = 1;

    // Spawn orbiting debris
    Particles.emitOrbit(obj.x, obj.y, obj.def.color, obj.def.sz, obj.def.label);

    // Debris particles
    Particles.emitDebris(obj.x, obj.y,
      Math.min(12, 4 + Math.floor(obj.def.sz / 8)),
      obj.def.color, obj.def.sz * 0.3
    );

    // Sparks for transformer/explosive objects
    if (obj.type === 'POLE' || obj.type === 'PROPANE') {
      Particles.emitSparks(obj.x, obj.y, 20);
      Audio.transformerPop();
    }

    // Camera shake proportional to object size
    const shakeMag = Math.sqrt(obj.def.mass) * 0.35;
    Camera.shake(shakeMag);

    Audio.impact(obj.def.sz / 15);

    return mass_gain;
  }

  function tryStageUp() {
    const nextStage = stage + 1;
    if (nextStage >= CFG.STAGES.length) return false;
    if (mass >= CFG.STAGES[nextStage].mass) {
      stage = nextStage;
      Audio.levelUpSwell();
      Camera.shake(18 + stage * 5);
      Audio.siren();
      return true;
    }
    return false;
  }

  function addUpgrade(key, amount) {
    switch(key) {
      case 'range':   rangeMult  += amount; break;
      case 'force':   forceMult  += amount; break;
      case 'speed':   speedMult  += amount; break;
      case 'width':   widthMult  += amount; break;
      case 'lightning': lightMult += amount; break;
      case 'combo':   comboMult  += amount; break;
      case 'debris':  debrisMult += amount; break;
    }
  }

  function setSkin(s) { skinMode = s; }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function render(ctx) {
    _drawGroundEffect(ctx);
    _drawTornadoFunnel(ctx);
    _drawGroundSwirl(ctx);

    // Absorption flash ring
    if (absorptionFlash > 0.05) {
      const a = absorptionFlash * 0.45;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = skinMode === 'fire' ? '#ff7a10' : skinMode === 'electric' ? '#40d8ff' : '#20e8d0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y - visualH * 0.3, visualW * 0.9 * (1 - absorptionFlash * 0.3), 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function _drawGroundEffect(ctx) {
    // Ground dust/dirt spray
    const gRad = groundSwirl * 1.8;
    const gGrad = ctx.createRadialGradient(x, y, gRad*0.1, x, y, gRad);
    gGrad.addColorStop(0, `rgba(120,90,50,${0.15 + stage*0.03})`);
    gGrad.addColorStop(0.5, `rgba(80,60,30,${0.08 + stage*0.02})`);
    gGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.fillStyle = gGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, gRad, gRad * 0.35, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function _drawGroundSwirl(ctx) {
    // Rotating ground rings
    const numRings = 5 + stage * 2;
    ctx.save();
    for (let i = 0; i < numRings; i++) {
      const t = i / numRings;
      const r = groundSwirl * (0.2 + t * 0.8);
      const a = 0.04 + t * 0.12;
      ctx.globalAlpha = a;
      ctx.strokeStyle = skinMode === 'fire' ? `rgba(200,80,20,${a*2})` :
                        skinMode === 'electric' ? `rgba(80,180,255,${a*2})` :
                        `rgba(140,110,70,${a*2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.28, rot + t * Math.PI, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function _drawTornadoFunnel(ctx) {
    const stg = CFG.STAGES[stage];
    const cx = x, cy = y;
    const fw = visualW, fh = visualH;

    // Number of slice layers
    const slices = 32 + stage * 4;

    ctx.save();

    // Outer glow / haze
    const outerGrad = ctx.createRadialGradient(cx, cy - fh*0.4, fw*0.1, cx, cy - fh*0.4, fw*2.2);
    outerGrad.addColorStop(0, 'rgba(60,50,30,0.0)');
    outerGrad.addColorStop(0.4, `rgba(30,25,15,${0.08 + stage*0.025})`);
    outerGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - fh*0.4, fw*2.2, fh*0.8, 0, 0, Math.PI*2);
    ctx.fill();

    // Draw tornado body as stacked ellipse slices
    for (let s = 0; s < slices; s++) {
      const t = s / slices;            // 0=top/cloud, 1=bottom/ground
      const sliceY = cy - fh + t * fh;
      const sliceW = _funnelWidth(t, fw) * 0.5;
      const sliceH = sliceW * 0.22;

      const spinOffset = rot * (1 + t * 2.5) + s * 0.18 + spinnerPhase * (1-t);
      const alpha = 0.08 + t * 0.32;

      let fillColor;
      if (skinMode === 'fire') {
        const r = Math.round(Utils.lerp(200, 60, t));
        const g = Math.round(Utils.lerp(60,  10, t));
        fillColor = `rgba(${r},${g},10,${alpha})`;
      } else if (skinMode === 'electric') {
        const b = Math.round(Utils.lerp(255, 100, t));
        fillColor = `rgba(40,${Math.round(Utils.lerp(160,60,t))},${b},${alpha})`;
      } else {
        const bright = Math.round(Utils.lerp(110, 35, t));
        const g = Math.round(bright * 0.9);
        const b = Math.round(bright * 0.7);
        fillColor = `rgba(${bright},${g},${b},${alpha})`;
      }

      ctx.fillStyle = fillColor;
      ctx.save();
      ctx.translate(cx, sliceY);
      ctx.rotate(spinOffset);
      ctx.beginPath();
      ctx.ellipse(0, 0, sliceW, sliceH, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Dark inner core
    const coreGrad = ctx.createLinearGradient(cx - fw*0.12, cy - fh, cx + fw*0.12, cy);
    coreGrad.addColorStop(0, 'rgba(5,5,5,0.6)');
    coreGrad.addColorStop(0.5, 'rgba(8,6,3,0.85)');
    coreGrad.addColorStop(1, 'rgba(15,10,5,0.5)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.moveTo(cx - fw*0.12, cy - fh);
    ctx.quadraticCurveTo(cx - fw*0.04, cy - fh*0.5, cx - 5, cy);
    ctx.lineTo(cx + 5, cy);
    ctx.quadraticCurveTo(cx + fw*0.04, cy - fh*0.5, cx + fw*0.12, cy - fh);
    ctx.closePath();
    ctx.fill();

    // Electric skin lightning tendrils
    if (skinMode === 'electric') {
      _drawElectricTendrils(ctx, cx, cy, fw, fh);
    }

    // Fire skin embers
    if (skinMode === 'fire') {
      _drawFireEmbers(ctx, cx, cy, fw, fh);
    }

    // Top cloud merge (connection to storm cloud)
    const cloudMerge = ctx.createRadialGradient(cx, cy - fh, fw*0.1, cx, cy - fh, fw*1.5);
    cloudMerge.addColorStop(0, `rgba(20,20,15,${0.4 + stage*0.04})`);
    cloudMerge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cloudMerge;
    ctx.beginPath();
    ctx.ellipse(cx, cy - fh, fw * 1.5, fw * 0.5, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }

  function _funnelWidth(t, maxW) {
    // Wider at top (cloud base), narrows then slightly widens at base
    if (t < 0.15) return maxW * (0.8 + t * 0.7);
    return maxW * (1 - t * 0.88 + t*t*0.3);
  }

  function _drawElectricTendrils(ctx, cx, cy, fw, fh) {
    ctx.save();
    ctx.strokeStyle = 'rgba(80,200,255,0.7)';
    ctx.lineWidth = 1.2;
    const numBolts = 3 + stage;
    for (let i = 0; i < numBolts; i++) {
      const startT = Math.random() * 0.7;
      const startY = cy - fh + startT * fh;
      const startX = cx + (Math.random()-0.5) * _funnelWidth(startT, fw) * 0.8;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      let bx = startX, by = startY;
      for (let s = 0; s < 6; s++) {
        bx += (Math.random()-0.5) * 30;
        by += Math.random() * 20;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function _drawFireEmbers(ctx, cx, cy, fw, fh) {
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const ex = cx + (Math.random()-0.5)*fw*0.8;
      const ey = cy - Math.random()*fh;
      const size = Utils.rand(2, 5);
      ctx.fillStyle = Utils.randChoice(['#ff6010','#ffa020','#ffdd40','#ff2000']);
      ctx.globalAlpha = Math.random() * 0.7;
      ctx.beginPath(); ctx.arc(ex, ey, size, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function reset(startX, startY) {
    x = startX ?? CFG.WORLD_W/2;
    y = startY ?? CFG.WORLD_H/2 + 400;
    stage = 0; mass = 0; energy = 1; combo = 1; comboTimer = 0;
    rot = 0; rotSpeed = 3.2; spinnerPhase = 0;
    visualW = CFG.STAGES[0].w; visualH = CFG.STAGES[0].h;
    rangeMult = 1; forceMult = 1; speedMult = 1; widthMult = 1;
    lightMult = 1; comboMult = 1; debrisMult = 1; skinMode = 'normal';
    absorptionFlash = 0;
    Particles.clearOrbits();
  }

  function getState() {
    return { x, y, stage, mass, energy, combo, comboTimer,
             visualW, visualH, rangeMult, forceMult, speedMult,
             widthMult, lightMult, comboMult, debrisMult, skinMode };
  }

  return { update, render, absorbObject, tryStageUp, addUpgrade, setSkin,
           reset, getState,
           get x() { return x; },
           get y() { return y; },
           get stage() { return stage; },
           get mass() { return mass; },
           get energy() { return energy; },
           get combo() { return combo; },
           get rangeMult() { return rangeMult; },
           get forceMult() { return forceMult; },
  };
})();
