/* ── VORTEX UI Layer ── */
'use strict';

const UI = (() => {
  let _minimapCtx = null;
  let _minimapCanvas = null;

  // DOM refs
  const els = {};
  let _initialized = false;
  let _lastStage = -1;
  let _bannerTimer = 0;
  let _zoneLabel = null;
  let _zoneLabelTimer = 0;
  let _absorbPopups = [];
  let _popupId = 0;

  function init() {
    if (_initialized) return;
    els.hud         = document.getElementById('hud');
    els.stageName   = document.getElementById('hud-stage-name');
    els.efBadge     = document.getElementById('hud-ef-badge');
    els.destBar     = document.getElementById('destruction-bar');
    els.destGlow    = document.getElementById('destruction-bar-glow');
    els.destMass    = document.getElementById('destruction-mass');
    els.energyBar   = document.getElementById('energy-bar');
    els.upgradePts  = document.getElementById('upgrade-pts-val');
    els.comboDisp   = document.getElementById('combo-display');
    els.comboVal    = document.getElementById('combo-value');
    els.modeTimer   = document.getElementById('hud-mode-timer');
    els.modeTimerV  = document.getElementById('mode-timer-val');
    els.pausedMsg   = document.getElementById('hud-paused');
    els.stageBanner = document.getElementById('stage-banner');
    els.bannerEF    = document.getElementById('stage-banner-ef');
    els.bannerName  = document.getElementById('stage-banner-name');
    els.lightning   = document.getElementById('lightning-overlay');
    els.absorbPopup = document.getElementById('absorb-popup');

    _minimapCanvas = document.getElementById('minimap-canvas');
    _minimapCtx    = _minimapCanvas.getContext('2d');

    _initialized = true;
  }

  function showHUD() { els.hud.classList.remove('hidden'); }
  function hideHUD() { els.hud.classList.add('hidden'); }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  }

  function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
  }

  function update(dt, gameState) {
    if (!_initialized) return;
    const ts = Tornado.getState();

    // Stage name + EF badge
    const stg = CFG.STAGES[ts.stage];
    if (ts.stage !== _lastStage) {
      els.stageName.textContent = stg.name.toUpperCase();
      els.efBadge.textContent   = stg.ef;
      _setEFColor(ts.stage);
      _lastStage = ts.stage;
      _showStageBanner(stg);
    }

    // Destruction bar (progress to next stage)
    const nextStg = CFG.STAGES[ts.stage + 1];
    const prevMass = stg.mass;
    const targetMass = nextStg ? nextStg.mass : stg.mass * 1.5;
    const pct = nextStg
      ? ((ts.mass - prevMass) / (targetMass - prevMass)) * 100
      : 100;
    els.destBar.style.width = Utils.clamp(pct, 0, 100) + '%';
    els.destMass.textContent = Utils.fmtMass(ts.mass) + ' absorbed';

    // Energy bar
    els.energyBar.style.width = (ts.energy * 100) + '%';

    // Upgrade points
    els.upgradePts.textContent = Upgrades.points;

    // Combo display
    if (ts.combo > 2 && ts.comboTimer > 0) {
      els.comboDisp.classList.remove('hidden');
      els.comboVal.textContent = 'x' + ts.combo;
    } else {
      els.comboDisp.classList.add('hidden');
    }

    // Stage banner fade
    if (_bannerTimer > 0) {
      _bannerTimer -= dt;
      if (_bannerTimer <= 0) {
        els.stageBanner.classList.add('hidden');
      }
    }

    // Paused
    if (gameState.paused) {
      els.pausedMsg.classList.remove('hidden');
    } else {
      els.pausedMsg.classList.add('hidden');
    }

    // Mode timer
    if (gameState.timeLimit > 0) {
      els.modeTimer.classList.remove('hidden');
      els.modeTimerV.textContent = Utils.fmtTime(gameState.timeRemaining);
    } else {
      els.modeTimer.classList.add('hidden');
    }

    // Minimap
    _renderMinimap(ts);

    // Zone label
    if (_zoneLabelTimer > 0) _zoneLabelTimer -= dt;
  }

  function _setEFColor(stage) {
    const colors = ['#88aa44','#aacc22','#ccdd22','#ffcc00','#ffaa00','#ff6600','#ff3300','#ff0000'];
    els.efBadge.style.background = colors[stage] || '#ff3300';
  }

  function _showStageBanner(stg) {
    els.bannerEF.textContent   = stg.ef;
    els.bannerName.textContent = stg.name.toUpperCase();
    els.stageBanner.classList.remove('hidden');
    // Re-trigger animation
    els.stageBanner.style.animation = 'none';
    void els.stageBanner.offsetWidth;
    els.stageBanner.style.animation = '';
    _bannerTimer = 3.5;
  }

  function showZoneLabel(zone) {
    if (!zone || _zoneLabelTimer > 0) return;
    _zoneLabelTimer = 3;
    // Create floating zone text near HUD
    const div = document.createElement('div');
    div.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      font-family:Impact,sans-serif;font-size:28px;letter-spacing:0.3em;color:rgba(255,255,255,0.6);
      text-shadow:0 0 20px rgba(32,232,208,0.4);pointer-events:none;z-index:25;
      animation:popupFly 3s ease forwards;`;
    div.textContent = zone.label.toUpperCase();
    document.getElementById('game-container').appendChild(div);
    setTimeout(() => div.remove(), 3200);
  }

  function flashAbsorption(label, points, screenX, screenY) {
    const div = document.createElement('div');
    div.style.cssText = `position:absolute;left:${screenX}px;top:${screenY}px;
      transform:translateX(-50%);
      font-family:Impact,sans-serif;font-size:13px;letter-spacing:0.08em;
      color:#ffe030;text-shadow:0 0 8px rgba(255,224,48,0.7);
      pointer-events:none;z-index:30;white-space:nowrap;
      animation:popupFly 1.3s ease forwards;`;
    div.textContent = `+${label} (${Utils.fmtMass(points)})`;
    document.getElementById('game-container').appendChild(div);
    setTimeout(() => div.remove(), 1400);
  }

  function _renderMinimap(ts) {
    if (!_minimapCtx) return;
    const mc = _minimapCtx;
    const mw = _minimapCanvas.width;
    const mh = _minimapCanvas.height;
    const sc = CFG.MINIMAP_SCALE;

    mc.clearRect(0, 0, mw, mh);

    // Background
    mc.fillStyle = 'rgba(5,10,4,0.85)';
    mc.fillRect(0, 0, mw, mh);

    // Zone fills
    for (const z of CFG.ZONES) {
      mc.fillStyle = z.color + 'aa';
      mc.fillRect(z.x*sc, z.y*sc, z.w*sc, z.h*sc);
    }

    // Objects alive (tiny dots)
    mc.fillStyle = 'rgba(120,200,80,0.4)';
    for (const obj of Objects.getAll()) {
      if (obj.alive && Math.random() > 0.85) { // subsample for perf
        mc.fillRect(obj.x*sc-0.5, obj.y*sc-0.5, 1.5, 1.5);
      }
    }

    // Suction range circle
    const stg = CFG.STAGES[ts.stage];
    mc.strokeStyle = 'rgba(32,232,208,0.22)';
    mc.lineWidth = 0.8;
    mc.beginPath();
    mc.arc(ts.x*sc, ts.y*sc, stg.range*sc*ts.rangeMult, 0, Math.PI*2);
    mc.stroke();

    // Tornado position
    mc.fillStyle = '#20e8d0';
    mc.beginPath();
    mc.arc(ts.x*sc, ts.y*sc, 3.5, 0, Math.PI*2);
    mc.fill();
    // Pulse
    mc.strokeStyle = 'rgba(32,232,208,0.5)';
    mc.lineWidth = 0.8;
    mc.beginPath();
    mc.arc(ts.x*sc, ts.y*sc, 5 + Math.sin(Date.now()*0.004)*2, 0, Math.PI*2);
    mc.stroke();
  }

  // ── Lightning flash ────────────────────────────────────────────────────────
  function triggerLightning(intensity = 1) {
    if (!els.lightning) return;
    els.lightning.style.opacity = (0.35 + intensity * 0.45).toString();
    setTimeout(() => {
      els.lightning.style.opacity = '0';
    }, 60 + Math.random() * 80);
    Audio.thunder();
  }

  // ── Upgrade screen ─────────────────────────────────────────────────────────
  function showUpgradeScreen(onChoose) {
    const grid = document.getElementById('upgrade-grid');
    const stageName = document.getElementById('upgrade-stage-name');
    const stg = CFG.STAGES[Tornado.stage];
    stageName.textContent = stg.name.toUpperCase();
    grid.innerHTML = '';

    const choices = Upgrades.getChoices();
    for (const def of choices) {
      const lvl = Upgrades.getLevelOf(def.key);
      const max = Upgrades.getMaxOf(def.key);
      const card = document.createElement('div');
      card.className = 'upgrade-card' + (lvl >= max ? ' maxed' : '');
      card.innerHTML = `
        <div class="upgrade-icon">${def.icon}</div>
        <div class="upgrade-name">${def.label}</div>
        <div class="upgrade-desc">${def.desc}</div>
        <div class="upgrade-level">
          ${Array.from({length:max},(_,i)=>`<div class="upgrade-pip${i<lvl?' filled':''}"></div>`).join('')}
        </div>`;
      if (lvl < max) {
        card.addEventListener('click', () => {
          Upgrades.purchase(def.key);
          showScreen('hud');
          hideAllScreens();
          showHUD();
          if (onChoose) onChoose();
        });
      }
      grid.appendChild(card);
    }

    // Skip button
    document.getElementById('btn-upgrade-skip').onclick = () => {
      hideAllScreens();
      showHUD();
      if (onChoose) onChoose();
    };

    showScreen('screen-upgrade');
  }

  function showGameOver(stats, onRestart, onMenu) {
    document.getElementById('gameover-title').textContent = stats.title || 'STORM ENDS';
    document.getElementById('gameover-stats').innerHTML = stats.html || '';
    document.getElementById('btn-restart').onclick = onRestart;
    document.getElementById('btn-menu').onclick    = onMenu;
    showScreen('screen-gameover');
  }

  function setPaused(p) {
    if (els.pausedMsg) {
      p ? els.pausedMsg.classList.remove('hidden')
        : els.pausedMsg.classList.add('hidden');
    }
  }

  return { init, showHUD, hideHUD, showScreen, hideAllScreens, update,
           showZoneLabel, flashAbsorption, triggerLightning,
           showUpgradeScreen, showGameOver, setPaused };
})();
