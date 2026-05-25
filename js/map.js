/* ── VORTEX Map Renderer (world background + zones) ── */
'use strict';

const Map = (() => {
  // Pre-compute road and zone data
  const roads = [];
  const groundDetails = []; // small detail marks

  function _buildRoads() {
    // Major horizontal roads
    roads.push({ x:0, y:2000, w:CFG.WORLD_W, h:36 });
    roads.push({ x:0, y:1500, w:CFG.WORLD_W, h:28 });
    roads.push({ x:0, y:3300, w:CFG.WORLD_W, h:28 });
    // Major vertical roads
    roads.push({ x:1800, y:0, w:36, h:CFG.WORLD_H });
    roads.push({ x:3000, y:0, w:36, h:CFG.WORLD_H });
    roads.push({ x:500,  y:0, w:28, h:CFG.WORLD_H });
    roads.push({ x:4200, y:0, w:28, h:CFG.WORLD_H });
    // Downtown grid extras
    for (let i = 0; i < 5; i++) {
      roads.push({ x:2600+i*220, y:400, w:20, h:1200 });
    }
    for (let i = 0; i < 3; i++) {
      roads.push({ x:2600, y:400+i*350, w:2200, h:18 });
    }
  }

  // Off-screen background canvas for performance
  let bgCanvas = null;
  let bgCtx    = null;
  let drawn    = false;

  function _drawBackground() {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width  = CFG.WORLD_W;
    bgCanvas.height = CFG.WORLD_H;
    bgCtx = bgCanvas.getContext('2d');
    const c = bgCtx;

    // Base ground
    c.fillStyle = '#1e2415';
    c.fillRect(0, 0, CFG.WORLD_W, CFG.WORLD_H);

    // Zone fills
    for (const z of CFG.ZONES) {
      c.fillStyle = z.color;
      c.fillRect(z.x, z.y, z.w, z.h);
    }

    // Farmland field rows
    const farm = CFG.ZONES.find(z=>z.id==='farm');
    c.strokeStyle = 'rgba(0,0,0,0.12)';
    c.lineWidth = 2;
    for (let fy = farm.y+20; fy < farm.y+farm.h; fy+=28) {
      c.beginPath(); c.moveTo(farm.x, fy); c.lineTo(farm.x+farm.w, fy); c.stroke();
    }

    // City sidewalks — lighter grey patches
    const city = CFG.ZONES.find(z=>z.id==='city');
    c.fillStyle = '#24243a';
    for (let cx = city.x+80; cx < city.x+city.w; cx+=220) {
      c.fillRect(cx, city.y, 130, city.h);
    }

    // Roads (dark asphalt)
    c.fillStyle = '#1a1a1a';
    for (const r of roads) c.fillRect(r.x, r.y, r.w, r.h);

    // Road center lines
    c.strokeStyle = 'rgba(220,200,60,0.35)';
    c.lineWidth = 2;
    c.setLineDash([30, 24]);
    // Horizontal center lines
    for (const r of roads) {
      if (r.w > r.h) { // horizontal road
        c.beginPath(); c.moveTo(r.x, r.y+r.h/2); c.lineTo(r.x+r.w, r.y+r.h/2); c.stroke();
      } else { // vertical
        c.beginPath(); c.moveTo(r.x+r.w/2, r.y); c.lineTo(r.x+r.w/2, r.y+r.h); c.stroke();
      }
    }
    c.setLineDash([]);

    // Water body (small lake in farmland)
    const grad = c.createRadialGradient(900, 3400, 30, 900, 3400, 160);
    grad.addColorStop(0, 'rgba(30,60,90,0.9)');
    grad.addColorStop(1, 'rgba(20,40,60,0)');
    c.fillStyle = grad;
    c.beginPath(); c.ellipse(900, 3400, 160, 80, 0.3, 0, Math.PI*2); c.fill();

    drawn = true;
  }

  function init() {
    _buildRoads();
    _drawBackground();
  }

  // Render on the main canvas
  function render(ctx) {
    if (!drawn) return;
    ctx.drawImage(bgCanvas, 0, 0);
  }

  // Draw animated ground effects (grass sway, dust, etc.)
  function renderFX(ctx, time, tornadoX, tornadoY, stageLevel) {
    // Dynamic lightning-lit highlights on the ground
    // (handled by lightning overlay in UI layer)
  }

  // Zone label display (shown when tornado is in that zone)
  function getZoneAt(wx, wy) {
    for (const z of CFG.ZONES) {
      if (wx >= z.x && wx <= z.x+z.w && wy >= z.y && wy <= z.y+z.h) return z;
    }
    return null;
  }

  return { init, render, renderFX, getZoneAt, roads };
})();
