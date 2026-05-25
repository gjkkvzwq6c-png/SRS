/* ── VORTEX — Main Game Loop & State Machine ── */
'use strict';

const Game = (() => {
  // ── Canvas setup ────────────────────────────────────────────────────────
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  let vw = 0, vh = 0;

  function _resize() {
    vw = canvas.width  = window.innerWidth;
    vh = canvas.height = window.innerHeight;
    Camera.resize(vw, vh);
  }

  // ── Game state ───────────────────────────────────────────────────────────
  const STATE = { MENU:'MENU', PLAYING:'PLAYING', PAUSED:'PAUSED', UPGRADING:'UPGRADING', GAMEOVER:'GAMEOVER' };
  let state       = STATE.MENU;
  let gameMode    = 'free';     // free | timed | survival | endless
  let paused      = false;
  let totalMass   = 0;
  let totalPoints = 0;
  let timeLimit   = 0;
  let timeRemaining = 0;
  let score       = 0;
  let lastTime    = 0;

  // Weather / atmosphere state
  let skyDark     = 0;
  let rainAlpha   = 0;
  let cloudDensity = 0.3;
  let windX       = 1.2;
  let lightningTimer = 0;

  // Storm chaser vehicles
  const chasers = [];

  // AI traffic (vehicles that flee the tornado)
  const traffic = [];

  let _needUpgrade = false; // flag set when stage-up occurs

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    _resize();
    window.addEventListener('resize', _resize);

    UI.init();
    Map.init();

    // Wire up menu buttons
    document.getElementById('btn-freplay') .addEventListener('click', () => startGame('free'));
    document.getElementById('btn-timed')   .addEventListener('click', () => startGame('timed'));
    document.getElementById('btn-survival').addEventListener('click', () => startGame('survival'));
    document.getElementById('btn-endless') .addEventListener('click', () => startGame('endless'));

    // Pause
    document.addEventListener('keydown', e => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (state === STATE.PLAYING)  { paused = true;  state = STATE.PAUSED;  UI.setPaused(true); }
        else if (state === STATE.PAUSED) { paused = false; state = STATE.PLAYING; UI.setPaused(false); }
      }
      // Skin shortcuts (hidden easter eggs)
      if (e.key === 'f') Tornado.setSkin('fire');
      if (e.key === 'e') Tornado.setSkin('electric');
      if (e.key === 'n') Tornado.setSkin('normal');
    });

    // Show menu
    UI.showScreen('screen-menu');

    // Draw animated menu background
    requestAnimationFrame(_menuLoop);
  }

  // ── Menu animation loop ───────────────────────────────────────────────────
  let _menuRot = 0;
  let _menuTime = 0;
  function _menuLoop(ts) {
    if (state !== STATE.MENU) return;
    const dt = Math.min((ts - (lastTime||ts)) / 1000, 0.05);
    lastTime = ts;
    _menuTime += dt;
    _menuRot  += dt * 0.8;

    // Draw atmospheric background
    _drawSky(ctx, 0.65, _menuTime);
    Particles.renderClouds(ctx, 0.7);

    // Phantom tornado
    ctx.save();
    ctx.translate(vw/2, vh*0.62);
    _drawMenuTornado(ctx, _menuRot);
    ctx.restore();

    Particles.renderRain(ctx);
    Particles.update(dt, 1.5, 0.5, 0.7);

    // Random lightning
    if (Math.random() < 0.005) {
      const lov = document.getElementById('lightning-overlay');
      if (lov) { lov.style.opacity='0.4'; setTimeout(()=>lov.style.opacity='0', 80); }
    }

    requestAnimationFrame(_menuLoop);
  }

  function _drawMenuTornado(ctx, rot) {
    const w = 60 + Math.sin(_menuTime*0.7)*8;
    const h = 340;
    for (let s = 0; s < 28; s++) {
      const t = s/28;
      const sw = w*(0.85+Math.sin(t*Math.PI)*0.5) * (1-t*0.82+t*t*0.3);
      const sy = -h + t*h;
      const a  = 0.06 + t*0.28;
      ctx.fillStyle = `rgba(80,65,40,${a})`;
      ctx.save();
      ctx.translate(0, sy);
      ctx.rotate(rot*(1+t*2));
      ctx.beginPath(); ctx.ellipse(0,0,sw*0.5,sw*0.18,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Dark core
    const cg = ctx.createLinearGradient(-w*0.1,-h,w*0.1,0);
    cg.addColorStop(0,'rgba(5,4,2,0.6)'); cg.addColorStop(1,'rgba(10,8,4,0.4)');
    ctx.fillStyle=cg;
    ctx.beginPath();
    ctx.moveTo(-w*0.1,-h); ctx.quadraticCurveTo(-w*0.03,-h*0.5,-4,0);
    ctx.lineTo(4,0); ctx.quadraticCurveTo(w*0.03,-h*0.5,w*0.1,-h);
    ctx.closePath(); ctx.fill();
  }

  // ── Start game ────────────────────────────────────────────────────────────
  function startGame(mode) {
    gameMode = mode;
    paused   = false;
    score    = 0;
    totalMass = 0;
    totalPoints = 0;
    _needUpgrade = false;

    // Mode-specific timers
    if (mode === 'timed') { timeLimit = 180; timeRemaining = 180; }
    else if (mode === 'survival') { timeLimit = 300; timeRemaining = 300; }
    else { timeLimit = 0; }

    // Atmosphere reset
    skyDark = 0; rainAlpha = 0.1; cloudDensity = 0.35; windX = 1.2;
    lightningTimer = Utils.rand(4, 10);

    // Reset systems
    Tornado.reset();
    Upgrades.reset();
    Objects.populate();
    Particles.clearOrbits();

    // Spawn storm chasers
    _spawnChasers();
    _spawnTraffic();

    // Audio
    Audio.init();
    Audio.resume();
    Audio.startTornado();
    Audio.startRain();
    Audio.setTornadoLevel(0);
    Audio.setRainLevel(0.15);

    state = STATE.PLAYING;
    UI.showScreen(''); // hides screens but not HUD
    UI.hideAllScreens();
    UI.showHUD();
    lastTime = 0;
    requestAnimationFrame(_gameLoop);
  }

  // ── Storm chasers ─────────────────────────────────────────────────────────
  function _spawnChasers() {
    chasers.length = 0;
    for (let i = 0; i < 4; i++) {
      const angle = (i/4) * Math.PI*2;
      const r = 600 + Math.random()*400;
      chasers.push({
        x: Tornado.x + Math.cos(angle)*r,
        y: Tornado.y + Math.sin(angle)*r,
        vx: 0, vy: 0,
        speed: Utils.rand(55, 90),
        angle: 0,
        color: Utils.randChoice(['#e03010','#f06020','#d08010','#c0c020']),
        fleeing: false,
        fleeTimer: 0,
      });
    }
  }

  function _spawnTraffic() {
    traffic.length = 0;
    for (let i = 0; i < 18; i++) {
      traffic.push({
        x: Utils.rand(200, CFG.WORLD_W-200),
        y: Utils.rand(200, CFG.WORLD_H-200),
        vx: Utils.rand(-40,40), vy: Utils.rand(-40,40),
        speed: Utils.rand(60, 140),
        color: Utils.randChoice(['#4060a0','#a04020','#a0a020','#208040','#804060']),
        alive: true,
      });
    }
  }

  function _updateChasers(dt) {
    for (const c of chasers) {
      const dx = Tornado.x - c.x;
      const dy = Tornado.y - c.y;
      const dist = Math.hypot(dx, dy);

      c.fleeTimer -= dt;

      if (dist < 300 || c.fleeing) {
        // Flee
        c.fleeing = true;
        c.fleeTimer = 5;
        const angle = Math.atan2(dy, dx);
        c.vx -= Math.cos(angle) * c.speed * dt * 2;
        c.vy -= Math.sin(angle) * c.speed * dt * 2;
      } else {
        // Track from a safe distance
        const targetDist = 500;
        const moveIn = dist > targetDist + 100;
        const angle = Math.atan2(dy, dx);
        if (moveIn) {
          c.vx += Math.cos(angle) * c.speed * dt * 0.5;
          c.vy += Math.sin(angle) * c.speed * dt * 0.5;
        }
      }
      if (c.fleeTimer <= 0) c.fleeing = false;

      c.vx *= 0.92; c.vy *= 0.92;
      c.x = Utils.clamp(c.x + c.vx*dt, 50, CFG.WORLD_W-50);
      c.y = Utils.clamp(c.y + c.vy*dt, 50, CFG.WORLD_H-50);
      c.angle = Math.atan2(c.vy, c.vx);
    }
  }

  function _updateTraffic(dt) {
    for (const v of traffic) {
      if (!v.alive) continue;
      const dx = Tornado.x - v.x;
      const dy = Tornado.y - v.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 600) {
        // Flee
        const angle = Math.atan2(dy, dx);
        v.vx -= Math.cos(angle) * v.speed * dt * 1.5;
        v.vy -= Math.sin(angle) * v.speed * dt * 1.5;
      }

      // Absorbed if too close
      if (dist < CFG.STAGES[Tornado.stage].range * 0.4 * Tornado.rangeMult) {
        v.alive = false;
        Particles.emitDebris(v.x, v.y, 6, v.color, 14);
        Camera.shake(4);
      }

      v.vx *= 0.94; v.vy *= 0.94;
      v.x = Utils.clamp(v.x + v.vx*dt, 50, CFG.WORLD_W-50);
      v.y = Utils.clamp(v.y + v.vy*dt, 50, CFG.WORLD_H-50);
    }
  }

  // ── Main game loop ────────────────────────────────────────────────────────
  function _gameLoop(ts) {
    if (state !== STATE.PLAYING && state !== STATE.PAUSED) return;

    const dt = Math.min((ts - (lastTime||ts)) / 1000, 0.05);
    lastTime = ts;

    if (!paused) _update(dt);
    _render();

    requestAnimationFrame(_gameLoop);
  }

  function _update(dt) {
    // Mode-specific logic
    if (timeLimit > 0) {
      timeRemaining -= dt;
      if (timeRemaining <= 0 && state === STATE.PLAYING) {
        timeRemaining = 0;
        _endGame(gameMode === 'survival' ? 'SURVIVED' : 'TIME\'S UP');
        return;
      }
    }

    // Tornado update
    Tornado.update(dt);

    // Atmosphere update — follows tornado stage
    const stg = CFG.STAGES[Tornado.stage];
    skyDark      = Utils.lerp(skyDark,      stg.skyDark,      dt * 0.4);
    rainAlpha    = Utils.lerp(rainAlpha,    stg.rainAlpha,    dt * 0.3);
    cloudDensity = Utils.lerp(cloudDensity, stg.windSpeed*0.2+0.25, dt*0.3);
    windX        = Utils.lerp(windX,        stg.windSpeed*1.4, dt * 0.2);
    lightningTimer -= dt;
    if (lightningTimer <= 0) {
      const freq = stg.lightFreq * Tornado.getState().lightMult;
      if (Math.random() < freq * 60) {
        UI.triggerLightning(0.4 + Tornado.stage * 0.08);
        lightningTimer = Utils.rand(1.5, 6) / (1 + Tornado.stage * 0.4);
        // Also emit sparks near tornado in world
        Particles.emitSparks(
          Tornado.x + Utils.rand(-200, 200),
          Tornado.y + Utils.rand(-300, 100),
          10
        );
      } else {
        lightningTimer = 0.5;
      }
    }

    // Objects update
    Objects.update(dt, Tornado);

    // Check absorbed objects
    const absorbed = Objects.getAbsorbed(Tornado);
    for (const obj of absorbed) {
      if (Tornado.stage >= obj.def.stage) {
        const gained = Tornado.absorbObject(obj);
        score += obj.def.points;
        totalMass += gained;
        Upgrades.addPoints(Math.ceil(obj.def.points / 80));

        // Screen-space popup
        const sp = Camera.worldToScreen(obj.x, obj.y);
        UI.flashAbsorption(obj.def.label, gained, sp.x, sp.y);

        // Small siren chance for house+
        if (obj.def.stage >= 3 && Math.random() < 0.15) Audio.siren();
      }
    }

    // Particles
    Particles.update(dt, windX, rainAlpha, cloudDensity);
    Particles.updateOrbits(dt, Tornado.x, Tornado.y);

    // AI
    _updateChasers(dt);
    _updateTraffic(dt);

    // Audio dynamics
    Audio.setTornadoLevel(Tornado.stage);
    Audio.setRainLevel(rainAlpha);

    // Camera
    Camera.update(dt);

    // Zone label hint
    const zone = Map.getZoneAt(Tornado.x, Tornado.y);
    if (zone) UI.showZoneLabel(zone);

    // Stage-up check
    if (Tornado.tryStageUp()) {
      _needUpgrade = true;
      Upgrades.addPoints(3);
    }

    // Trigger upgrade screen (deferred one frame)
    if (_needUpgrade) {
      _needUpgrade = false;
      if (Tornado.stage < CFG.STAGES.length) {
        state = STATE.UPGRADING;
        setTimeout(() => {
          UI.showUpgradeScreen(() => {
            state = STATE.PLAYING;
            requestAnimationFrame(_gameLoop);
          });
        }, 800);
        return;
      }
    }

    // Win condition — EF5 achieved (endless just keeps going)
    if (Tornado.stage === 7 && gameMode !== 'endless') {
      _checkWin();
    }

    // UI update
    UI.update(dt, { paused, timeLimit, timeRemaining });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function _render() {
    ctx.clearRect(0, 0, vw, vh);

    // 1. Sky
    _drawSky(ctx, skyDark, lastTime / 1000);

    Camera.begin(ctx);

    // 2. Map background
    Map.render(ctx);

    // 3. Objects (behind tornado)
    Objects.render(ctx);

    // 4. AI vehicles
    _renderChasers(ctx);
    _renderTraffic(ctx);

    // 5. Orbital debris (world-space)
    // (rendered in screen-space below)

    // 6. Debris particles (world-space)
    Particles.renderDebris(ctx);

    // 7. Tornado
    Tornado.render(ctx);

    Camera.end(ctx);

    // ── Screen-space effects ──
    // 8. Orbit debris (camera follows tornado so these render in world-space above,
    //    but we keep orbits on screen-center for visual clarity)
    _renderOrbitsScreenSpace(ctx);

    // 9. Rain (always screen-space)
    Particles.renderRain(ctx);

    // 10. Storm cloud overlay (screen-space)
    Particles.renderClouds(ctx, skyDark);

    // 11. Green atmospheric fog overlay
    _drawAtmosphere(ctx, skyDark);
  }

  function _renderOrbitsScreenSpace(ctx) {
    // Orbit debris is already world-space (updated with tornado world pos)
    // We re-enter camera transform just for debris
    Camera.begin(ctx);
    Particles.renderOrbits(ctx);
    Camera.end(ctx);
  }

  function _drawSky(ctx, dark, time) {
    const greenT = Math.min(1, dark * 1.4);
    const r1 = Math.round(Utils.lerp(25, 5, dark));
    const g1 = Math.round(Utils.lerp(38, 12, dark));
    const b1 = Math.round(Utils.lerp(28, 6, dark));
    const r2 = Math.round(Utils.lerp(8, 2, dark));
    const g2 = Math.round(Utils.lerp(12, 4, dark));
    const b2 = Math.round(Utils.lerp(8, 2, dark));

    const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
    skyGrad.addColorStop(0, `rgb(${r2},${g2},${b2})`);
    skyGrad.addColorStop(0.5, `rgb(${r1},${g1},${b1})`);
    // Sickly green tint near horizon
    const gr = Math.round(Utils.lerp(20, 8, 1-greenT));
    const gg = Math.round(Utils.lerp(35, 18, 1-greenT));
    const gb = Math.round(Utils.lerp(14, 6, 1-greenT));
    skyGrad.addColorStop(1, `rgb(${gr},${gg},${gb})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, vw, vh);
  }

  function _drawAtmosphere(ctx, dark) {
    if (dark < 0.05) return;
    // Vignette + green fog
    const vig = ctx.createRadialGradient(vw/2, vh/2, vh*0.2, vw/2, vh/2, vh*0.85);
    const ga = dark * 0.22;
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.6, `rgba(5,18,3,${ga*0.4})`);
    vig.addColorStop(1, `rgba(0,8,0,${ga})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, vw, vh);

    // Screen-edge dark vignette
    const vig2 = ctx.createRadialGradient(vw/2, vh/2, vh*0.3, vw/2, vh/2, vh*1.0);
    vig2.addColorStop(0, 'rgba(0,0,0,0)');
    vig2.addColorStop(1, `rgba(0,0,0,${dark*0.5})`);
    ctx.fillStyle = vig2;
    ctx.fillRect(0, 0, vw, vh);
  }

  function _renderChasers(ctx) {
    for (const c of chasers) {
      if (!Camera.isVisible(c.x-20, c.y-12, 40, 24)) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      // Vehicle body
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.roundRect(-16, -7, 32, 14, 3); ctx.fill();
      // Roof
      ctx.fillStyle = Utils.hexToRgba(c.color, 0.7);
      ctx.beginPath(); ctx.roundRect(-8, -12, 16, 7, 2); ctx.fill();
      // Headlights
      ctx.fillStyle = '#ffffa0';
      ctx.fillRect(14, -4, 3, 3); ctx.fillRect(14, 2, 3, 3);
      // Siren flicker
      if (Math.random() > 0.5) {
        ctx.fillStyle = Math.random()>0.5 ? '#ff2020' : '#2080ff';
        ctx.fillRect(-4,-14,4,4);
      }
      ctx.restore();
    }
  }

  function _renderTraffic(ctx) {
    for (const v of traffic) {
      if (!v.alive) continue;
      if (!Camera.isVisible(v.x-18, v.y-10, 36, 20)) continue;
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(Math.atan2(v.vy, v.vx));
      ctx.fillStyle = v.color;
      ctx.beginPath(); ctx.roundRect(-14, -6, 28, 12, 2); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(-14,-6,28,12);
      ctx.restore();
    }
  }

  // ── End game ──────────────────────────────────────────────────────────────
  function _endGame(title) {
    state = STATE.GAMEOVER;
    const stg = CFG.STAGES[Tornado.stage];
    const stats = {
      title,
      html: `
        <div>Final Stage: <b>${stg.name}</b> (${stg.ef})</div>
        <div>Total Mass Absorbed: <b>${Utils.fmtMass(Tornado.mass)}</b></div>
        <div>Destruction Score: <b>${score.toLocaleString()}</b></div>
        <div>Upgrade Points Earned: <b>${Upgrades.points}</b></div>
        ${gameMode === 'timed' ? `<div>Time: <b>${Utils.fmtTime(timeLimit - timeRemaining)}</b></div>` : ''}
      `,
    };
    UI.showGameOver(stats,
      () => startGame(gameMode),
      () => { state = STATE.MENU; UI.showScreen('screen-menu'); requestAnimationFrame(_menuLoop); }
    );
  }

  function _checkWin() {
    // Just celebrate — don't end the game automatically
    if (score > 500000 && !_winCelebrated) {
      _winCelebrated = true;
      Camera.shake(30);
      for (let i = 0; i < 5; i++) {
        setTimeout(()=>UI.triggerLightning(0.9), i*200);
      }
    }
  }
  let _winCelebrated = false;

  // ── Public ────────────────────────────────────────────────────────────────
  return { init };
})();

// ── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
