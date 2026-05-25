/* ── VORTEX Particle System + Weather Effects ── */
'use strict';

// ── Rain particles ──────────────────────────────────────────────────────────
class RainSystem {
  constructor() {
    this.drops = [];
    this.windX = 1.5;
    for (let i = 0; i < CFG.MAX_RAIN; i++) {
      this.drops.push(this._make(true));
    }
  }

  _make(scatter = false) {
    return {
      x: Utils.rand(0, 1280),
      y: scatter ? Utils.rand(-100, 768) : -Utils.rand(0, 200),
      speed: Utils.rand(900, 1400),
      length: Utils.rand(12, 26),
      alpha: Utils.rand(0.25, 0.55),
    };
  }

  update(dt, windX, alpha) {
    this.windX = Utils.lerp(this.windX, windX * 1.8, 0.02);
    for (const d of this.drops) {
      d.x += this.windX * dt;
      d.y += d.speed * dt;
      if (d.y > 800 || d.x > 1300 || d.x < -50) {
        d.x = Utils.rand(-50, 1300); d.y = -d.length;
      }
    }
    this._alpha = alpha;
  }

  render(ctx) {
    const a = this._alpha || 0;
    if (a < 0.01) return;
    ctx.save();
    ctx.strokeStyle = `rgba(180,210,230,${a * 0.7})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const d of this.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + this.windX * 0.05 * d.length, d.y + d.length);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Cloud system ────────────────────────────────────────────────────────────
class CloudSystem {
  constructor() {
    this.clouds = [];
    for (let i = 0; i < 18; i++) {
      this.clouds.push(this._make(true));
    }
  }

  _make(scatter = false) {
    return {
      x: Utils.rand(-300, 1600),
      y: scatter ? Utils.rand(-80, 320) : Utils.rand(-80, 50),
      w: Utils.rand(200, 520),
      h: Utils.rand(60, 140),
      speed: Utils.rand(18, 55),
      alpha: Utils.rand(0.5, 0.9),
      layer: Utils.randInt(0, 2),
    };
  }

  update(dt, density, windX) {
    this._density = density;
    for (const c of this.clouds) {
      c.x += (c.speed + windX * 20) * dt * (c.layer === 0 ? 1 : c.layer === 1 ? 1.4 : 1.8);
      if (c.x > 1700) { c.x = -c.w - 50; c.y = Utils.rand(-80, 300); }
    }
  }

  render(ctx, skyDark) {
    const d = this._density || 0.3;
    ctx.save();
    for (const c of this.clouds) {
      const darkness = Utils.lerp(0.12, 0.04, skyDark);
      const baseColor = `rgba(${Math.round(darkness*255)},${Math.round(darkness*255*1.05)},${Math.round(darkness*255*0.9)},`;
      const grad = ctx.createRadialGradient(c.x + c.w/2, c.y + c.h/2, 10, c.x + c.w/2, c.y + c.h/2, c.w*0.6);
      grad.addColorStop(0, baseColor + (c.alpha * d * 0.95) + ')');
      grad.addColorStop(1, baseColor + '0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(c.x + c.w/2, c.y + c.h/2, c.w/2, c.h/2, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ── Debris particle ─────────────────────────────────────────────────────────
class DebrisParticle {
  constructor() { this.alive = false; }

  init(x, y, vx, vy, color, size, life) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.rot = Utils.rand(0, Math.PI*2);
    this.rotSpeed = Utils.rand(-8, 8);
    this.alive = true;
  }

  update(dt) {
    if (!this.alive) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 180 * dt; // gravity
    this.vx *= 0.995;
    this.rot += this.rotSpeed * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx) {
    if (!this.alive) return;
    const alpha = Math.min(1, this.life / 0.4);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size * 0.55);
    ctx.restore();
  }
}

// ── Orbit debris — object trapped in tornado swirl ──────────────────────────
class OrbitDebris {
  constructor() { this.alive = false; }

  init(x, y, color, size, label) {
    this.x = x; this.y = y;
    this.color = color;
    this.size  = Utils.clamp(size * 0.5, 5, 28);
    this.label = label;
    this.angle = Utils.rand(0, Math.PI*2);
    this.radius = Utils.rand(10, 60);
    this.angleSpeed = Utils.rand(1.5, 4.5) * (Math.random() < 0.5 ? 1 : -1);
    this.radiusTarget = Utils.rand(20, 80);
    this.life = Utils.rand(3.5, 8);
    this.maxLife = this.life;
    this.rotSelf = Utils.rand(0, Math.PI*2);
    this.rotSelfSpeed = Utils.rand(-6, 6);
    this.alive = true;
  }

  update(dt, tx, ty) {
    if (!this.alive) return;
    this.angle += this.angleSpeed * dt;
    this.radius = Utils.lerp(this.radius, this.radiusTarget, 0.02);
    this.x = tx + Math.cos(this.angle) * this.radius;
    this.y = ty + Math.sin(this.angle) * this.radius * 0.45;
    this.rotSelf += this.rotSelfSpeed * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx) {
    if (!this.alive) return;
    const alpha = Math.min(1, this.life / 0.8);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotSelf);
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size/2, -this.size/3, this.size, this.size*0.6);
    ctx.restore();
  }
}

// ── Spark/flash particles ────────────────────────────────────────────────────
class SparkParticle {
  constructor() { this.alive = false; }

  init(x, y) {
    this.x = x; this.y = y;
    const spd = Utils.rand(80, 400);
    const angle = Utils.rand(0, Math.PI*2);
    this.vx = Math.cos(angle) * spd;
    this.vy = Math.sin(angle) * spd;
    this.life = Utils.rand(0.3, 0.8);
    this.maxLife = this.life;
    this.color = Utils.randChoice(['#ffe060','#ffaa20','#ffffff','#20d0ff']);
    this.size = Utils.rand(1.5, 4);
    this.alive = true;
  }

  update(dt) {
    if (!this.alive) return;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= 0.94; this.vy *= 0.94;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx) {
    if (!this.alive) return;
    const a = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * a, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Master particle manager ──────────────────────────────────────────────────
const Particles = (() => {
  const debrisPool = [];
  const orbitPool  = [];
  const sparkPool  = [];
  const rainSystem = new RainSystem();
  const cloudSystem = new CloudSystem();

  let _windX = 0;

  function update(dt, windX, rainAlpha, cloudDensity) {
    _windX = windX;
    rainSystem.update(dt, windX, rainAlpha);
    cloudSystem.update(dt, cloudDensity, windX);
    for (const p of debrisPool) if (p.alive) p.update(dt);
    for (const p of sparkPool)  if (p.alive) p.update(dt);
    for (const p of orbitPool)  if (p.alive) p.update(dt, 0, 0);
  }

  function updateOrbits(dt, tx, ty) {
    for (const p of orbitPool) if (p.alive) p.update(dt, tx, ty);
  }

  function renderClouds(ctx, skyDark) { cloudSystem.render(ctx, skyDark); }
  function renderRain(ctx) { rainSystem.render(ctx); }

  function renderDebris(ctx) {
    for (const p of debrisPool) p.render(ctx);
    for (const p of sparkPool)  p.render(ctx);
  }

  function renderOrbits(ctx) {
    for (const p of orbitPool)  p.render(ctx);
  }

  function emitDebris(x, y, count, color, size) {
    for (let i = 0; i < count; i++) {
      if (debrisPool.filter(p=>p.alive).length >= CFG.MAX_PARTICLES) break;
      const p = Utils.getFromPool(debrisPool, ()=>new DebrisParticle());
      const angle = Utils.rand(0, Math.PI*2);
      const spd = Utils.rand(60, 320);
      p.init(x, y, Math.cos(angle)*spd, Math.sin(angle)*spd - Utils.rand(50,150),
             color, Utils.rand(size*0.3, size*0.9), Utils.rand(0.8, 2.5));
    }
  }

  function emitOrbit(x, y, color, size, label) {
    if (orbitPool.filter(p=>p.alive).length >= CFG.MAX_DEBRIS) return;
    const p = Utils.getFromPool(orbitPool, ()=>new OrbitDebris());
    p.init(x, y, color, size, label);
  }

  function emitSparks(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = Utils.getFromPool(sparkPool, ()=>new SparkParticle());
      p.init(x, y);
    }
  }

  function clearOrbits() { orbitPool.forEach(p=>p.alive=false); }

  return { update, updateOrbits, renderClouds, renderRain, renderDebris,
           renderOrbits, emitDebris, emitOrbit, emitSparks, clearOrbits };
})();
