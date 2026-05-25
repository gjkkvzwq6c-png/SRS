/* ── VORTEX World Objects (absorbable items) ── */
'use strict';

class WorldObject {
  constructor(type, x, y) {
    const def = CFG.OBJ[type];
    this.type    = type;
    this.def     = def;
    this.x       = x;
    this.y       = y;
    this.w       = def.sz;
    this.h       = def.sz * 0.65;
    this.hp      = def.hp;
    this.maxHp   = def.hp;
    this.state   = 'idle'; // idle | damaged | flying | absorbed
    this.vx      = 0;
    this.vy      = 0;
    this.rot     = 0;
    this.rotSpd  = 0;
    this.pullT   = 0; // 0..1 how strongly being pulled
    this.roofOff = false;
    this.alive   = true;
    this.flashT  = 0;
    this._initRot = Utils.rand(0, Math.PI*2);
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.flashT = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'flying';
      this.vx = Utils.rand(-40, 40);
      this.vy = Utils.rand(-80, -20);
      this.rotSpd = Utils.rand(-6, 6);
    } else if (this.hp < this.maxHp * 0.5) {
      this.state = 'damaged';
      if (!this.roofOff && (this.def.shape === 'house' || this.def.shape === 'barn')) {
        this.roofOff = true;
      }
    }
  }

  update(dt, tornadoX, tornadoY, stageRange, stageForce) {
    if (!this.alive) return;

    if (this.flashT > 0) this.flashT -= dt;

    const dx = tornadoX - this.x;
    const dy = tornadoY - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.state === 'flying') {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 200 * dt;
      this.rot += this.rotSpd * dt;
      this.vx *= 0.98;
      // Check if sucked close enough
      if (dist < stageRange * 0.35) {
        this.state = 'absorbed';
        this.alive = false;
      }
      if (this.y > CFG.WORLD_H + 200) { this.alive = false; }
    } else if (this.state !== 'absorbed') {
      if (dist < stageRange) {
        // Pull toward tornado
        const pullStrength = Math.max(0, 1 - dist/stageRange);
        this.pullT = Utils.lerp(this.pullT, pullStrength, 0.05);
        const force = stageForce * pullStrength * dt;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Damage if within damage range
        if (dist < stageRange * 0.55) {
          this.takeDamage(stageForce * 0.003 * dt * 60);
        }

        // Spiral — add tangential velocity
        const tang = stageForce * pullStrength * 0.4 * dt;
        this.vx -= (dy/dist) * tang;
        this.vy += (dx/dist) * tang;
        this.vx *= 0.92; this.vy *= 0.92;

        if (dist < stageRange * 0.2) {
          this.state = 'absorbed'; this.alive = false;
        }
      } else {
        this.pullT = Utils.lerp(this.pullT, 0, 0.1);
        this.vx *= 0.85; this.vy *= 0.85;
        // Drift back toward start position slowly
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }
    }
  }

  render(ctx) {
    if (!this.alive) return;
    const { def } = this;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot + (this.state === 'idle' ? this._initRot * 0.01 : this._initRot * 0.05));

    if (this.flashT > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(this.flashT * 60) * 0.4;
    }

    // Damage darkening
    const dmgFactor = this.hp / this.maxHp;
    const alpha = 0.5 + dmgFactor * 0.5;
    ctx.globalAlpha *= alpha;

    switch(def.shape) {
      case 'tree':    this._drawTree(ctx, def); break;
      case 'house':   this._drawHouse(ctx, def); break;
      case 'car':     this._drawCar(ctx, def); break;
      case 'truck':   this._drawTruck(ctx, def); break;
      case 'barn':    this._drawBarn(ctx, def); break;
      case 'shed':    this._drawShed(ctx, def); break;
      case 'skyscraper': this._drawSkyscraper(ctx, def); break;
      case 'factory': this._drawFactory(ctx, def); break;
      case 'tower':   this._drawTower(ctx, def); break;
      case 'plane':   this._drawPlane(ctx, def); break;
      case 'tank':    this._drawTank(ctx, def); break;
      case 'sign':    this._drawSign(ctx, def); break;
      case 'post':    this._drawPost(ctx, def); break;
      case 'leaf':    this._drawLeaf(ctx, def); break;
      default:        this._drawBox(ctx, def); break;
    }

    // Pull indicator glow
    if (this.pullT > 0.05) {
      ctx.globalAlpha = this.pullT * 0.35;
      ctx.strokeStyle = '#20e8d0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, def.sz*0.7, def.sz*0.45, 0, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawBox(ctx, def) {
    const w = def.sz, h = def.sz*0.55;
    ctx.fillStyle = def.color;
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w/2, -h/2, w, h);
  }

  _drawTree(ctx, def) {
    const s = def.sz;
    // Trunk
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(-s*0.1, 0, s*0.2, s*0.45);
    // Foliage
    if (!this.roofOff) {
      ctx.fillStyle = this.state === 'damaged' ? '#3a5010' : def.color;
      ctx.beginPath();
      ctx.arc(0, -s*0.15, s*0.42, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.arc(s*0.1, -s*0.1, s*0.22, 0, Math.PI*2); ctx.fill();
    } else {
      // Damaged — just stump
      ctx.fillStyle = '#5a3010';
      ctx.fillRect(-s*0.15, -s*0.2, s*0.3, s*0.6);
    }
  }

  _drawHouse(ctx, def) {
    const w = def.sz, h = def.sz*0.55;
    ctx.fillStyle = def.color;
    ctx.fillRect(-w/2, -h*0.2, w, h*0.8);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(-w/2, -h*0.2, w, h*0.8);

    // Windows
    ctx.fillStyle = this.state === 'damaged' ? '#333' : 'rgba(180,200,255,0.6)';
    ctx.fillRect(-w*0.35, 0, w*0.2, h*0.25);
    ctx.fillRect( w*0.15, 0, w*0.2, h*0.25);

    // Door
    ctx.fillStyle = '#7a4820';
    ctx.fillRect(-w*0.08, h*0.25, w*0.16, h*0.35);

    // Roof (only if not damaged off)
    if (!this.roofOff) {
      ctx.fillStyle = '#8a4030';
      ctx.beginPath();
      ctx.moveTo(-w/2-6, -h*0.2);
      ctx.lineTo(0, -h*0.75);
      ctx.lineTo( w/2+6, -h*0.2);
      ctx.closePath(); ctx.fill();
    }
  }

  _drawCar(ctx, def) {
    const w = def.sz, h = def.sz*0.42;
    // Body
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.roundRect(-w/2, -h*0.2, w, h*0.8, 4);
    ctx.fill();
    // Roof
    ctx.fillStyle = this._lighten(def.color, 20);
    ctx.beginPath();
    ctx.roundRect(-w*0.28, -h*0.75, w*0.56, h*0.58, 3);
    ctx.fill();
    // Windows
    ctx.fillStyle = this.state==='damaged' ? '#333' : 'rgba(160,200,240,0.7)';
    ctx.fillRect(-w*0.24, -h*0.68, w*0.2, h*0.4);
    ctx.fillRect( w*0.04, -h*0.68, w*0.2, h*0.4);
    // Wheels
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-w*0.3, h*0.5, h*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w*0.3, h*0.5, h*0.22, 0, Math.PI*2); ctx.fill();
  }

  _drawTruck(ctx, def) {
    const w = def.sz, h = def.sz*0.38;
    // Trailer
    ctx.fillStyle = '#5a6070';
    ctx.fillRect(-w/2, -h*0.3, w*0.62, h*0.9);
    // Cab
    ctx.fillStyle = def.color;
    ctx.fillRect( w*0.15, -h*0.5, w*0.35, h*1.1);
    // Windows
    ctx.fillStyle = this.state==='damaged' ? '#333' : 'rgba(160,200,240,0.7)';
    ctx.fillRect( w*0.22, -h*0.4, w*0.22, h*0.35);
    // Wheels
    ctx.fillStyle = '#222';
    for (const wx of [-w*0.35, -w*0.1, w*0.28]) {
      ctx.beginPath(); ctx.arc(wx, h*0.55, h*0.24, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawBarn(ctx, def) {
    const w = def.sz, h = def.sz*0.65;
    ctx.fillStyle = this.state==='damaged' ? '#7a2010' : def.color;
    ctx.fillRect(-w/2, -h*0.15, w, h*0.85);
    ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1;
    ctx.strokeRect(-w/2, -h*0.15, w, h*0.85);
    // Door
    ctx.fillStyle='#8a4818'; ctx.fillRect(-w*0.12, h*0.35, w*0.24, h*0.35);
    // X cross on door
    ctx.strokeStyle='#5a2008'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-w*0.12, h*0.35); ctx.lineTo(w*0.12, h*0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w*0.12, h*0.35); ctx.lineTo(-w*0.12, h*0.7); ctx.stroke();
    if (!this.roofOff) {
      ctx.fillStyle='#7a2010';
      ctx.beginPath(); ctx.moveTo(-w*0.55, -h*0.15); ctx.lineTo(0, -h*0.8); ctx.lineTo(w*0.55,-h*0.15); ctx.closePath(); ctx.fill();
    }
  }

  _drawShed(ctx, def) {
    const w = def.sz, h = def.sz*0.5;
    ctx.fillStyle = def.color;
    ctx.fillRect(-w/2, -h*0.1, w, h*0.85);
    ctx.fillStyle='#6a6850';
    ctx.beginPath(); ctx.moveTo(-w/2-4,-h*0.1); ctx.lineTo(0,-h*0.65); ctx.lineTo(w/2+4,-h*0.1); ctx.closePath(); ctx.fill();
  }

  _drawSkyscraper(ctx, def) {
    const w = def.sz*0.55, h = def.sz*1.2;
    ctx.fillStyle = def.color;
    ctx.fillRect(-w/2, -h, w, h);
    // Windows grid
    const wc = this.state==='damaged' ? '#222' : 'rgba(200,220,255,0.5)';
    const wcd = 'rgba(80,60,40,0.8)';
    ctx.fillStyle = wc;
    for (let wy = -h+8; wy < 0; wy+=16) {
      for (let wx=-w/2+6; wx<w/2-6; wx+=14) {
        ctx.fillStyle = Math.random()<0.15 ? wcd : wc;
        ctx.fillRect(wx, wy, 8, 9);
      }
    }
    // Antenna
    ctx.strokeStyle='#aaa'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,-h); ctx.lineTo(0,-h-20); ctx.stroke();
  }

  _drawFactory(ctx, def) {
    const w = def.sz, h = def.sz*0.75;
    ctx.fillStyle = def.color;
    ctx.fillRect(-w/2, -h*0.5, w, h*0.9);
    // Smokestacks
    for (const sx of [-w*0.25, w*0.1]) {
      ctx.fillStyle='#444';
      ctx.fillRect(sx, -h*0.9, w*0.1, h*0.5);
      // Smoke puff
      ctx.fillStyle='rgba(120,120,120,0.3)';
      ctx.beginPath(); ctx.arc(sx+w*0.05, -h*0.95, w*0.08, 0, Math.PI*2); ctx.fill();
    }
    // Windows
    ctx.fillStyle=this.state==='damaged'?'#333':'rgba(200,200,100,0.5)';
    for (let i=0; i<4; i++) ctx.fillRect(-w*0.4+i*w*0.2, -h*0.2, w*0.12, h*0.28);
  }

  _drawTower(ctx, def) {
    const s = def.sz;
    // Legs
    ctx.strokeStyle='#5a6070'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-s*0.35, s*0.3); ctx.lineTo(0,-s*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( s*0.35, s*0.3); ctx.lineTo(0,-s*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s*0.2,  s*0.3); ctx.lineTo(0,-s*0.5); ctx.stroke();
    // Tank
    const grad = ctx.createRadialGradient(0,-s*0.5, 5, 0,-s*0.5, s*0.3);
    grad.addColorStop(0,'rgba(120,160,180,0.9)'); grad.addColorStop(1,'rgba(60,80,90,0.9)');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.arc(0,-s*0.5, s*0.3, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1; ctx.stroke();
  }

  _drawPlane(ctx, def) {
    const w = def.sz, h = def.sz*0.22;
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, w*0.5, h*0.5, 0, 0, Math.PI*2);
    ctx.fill();
    // Wings
    ctx.fillStyle = this._darken(def.color, 15);
    ctx.beginPath(); ctx.moveTo(-w*0.05,0); ctx.lineTo(-w*0.12,-h*1.8); ctx.lineTo(-w*0.35,0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w*0.05,0); ctx.lineTo(-w*0.12, h*1.8); ctx.lineTo(-w*0.35,0); ctx.closePath(); ctx.fill();
    // Tail
    ctx.beginPath(); ctx.moveTo(-w*0.42,0); ctx.lineTo(-w*0.5,-h*1.2); ctx.lineTo(-w*0.35,0); ctx.closePath(); ctx.fill();
  }

  _drawTank(ctx, def) {
    const w = def.sz, h = def.sz*0.4;
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.ellipse(0, 0, w*0.5, h*0.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1.5; ctx.stroke();
  }

  _drawSign(ctx, def) {
    const s = def.sz;
    ctx.strokeStyle='#888'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, s*0.5); ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.fillRect(-s*0.45,-s*0.4, s*0.9, s*0.55);
    ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1; ctx.strokeRect(-s*0.45,-s*0.4, s*0.9, s*0.55);
  }

  _drawPost(ctx, def) {
    const s = def.sz;
    ctx.strokeStyle = def.color; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(0, s*0.5); ctx.lineTo(0,-s*0.6); ctx.stroke();
    // Cross-arm
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(-s*0.3,-s*0.4); ctx.lineTo(s*0.3,-s*0.4); ctx.stroke();
    // Wire dots
    ctx.fillStyle='rgba(150,150,180,0.6)';
    for (const wx of [-s*0.28, s*0.28]) {
      ctx.beginPath(); ctx.arc(wx,-s*0.4, 2.5, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawLeaf(ctx, def) {
    const s = def.sz;
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s*0.5, s*0.28, Math.PI*0.25, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=0.5; ctx.stroke();
    ctx.strokeStyle=this._darken(def.color,20); ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(-s*0.3,0); ctx.lineTo(s*0.3,0); ctx.stroke();
  }

  _lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n>>16)+amt);
    const g = Math.min(255, ((n>>8)&0xff)+amt);
    const b = Math.min(255, (n&0xff)+amt);
    return `rgb(${r},${g},${b})`;
  }
  _darken(hex, amt) { return this._lighten(hex, -amt); }
}

// ── Object Spawner ─────────────────────────────────────────────────────────
const Objects = (() => {
  let items = [];

  function _spawn(type, x, y) {
    items.push(new WorldObject(type, x, y));
  }

  function _scatter(type, cx, cy, count, radius) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI*2;
      const r = Math.random() * radius;
      _spawn(type, cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
    }
  }

  function populate() {
    items = [];

    // ── FARMLAND ──────────────────────────────────────────────────────────
    // Trees along fence lines
    for (let tx = 300; tx < 1700; tx += Utils.rand(60,140)) {
      _spawn('TREE', tx, Utils.rand(2300, 3750));
    }
    // Fence posts
    for (let fx = 250; fx < 1700; fx += 45) {
      _spawn('FENCE', fx, 2350); _spawn('FENCE', fx, 3800);
    }
    // Tractors, barns, haystacks
    _spawn('TRACTOR', 620,  2700); _spawn('TRACTOR', 980, 3100);
    _spawn('BARN',    450,  2500); _spawn('BARN',   1400, 3200);
    // Leaves, chairs scattered
    _scatter('LEAF',  900, 3000, 30, 600);
    _scatter('TRASH', 700, 2800, 15, 400);

    // ── TRAILER PARK ──────────────────────────────────────────────────────
    const TRX = 1900, TRY = 2600;
    for (let ti = 0; ti < 18; ti++) {
      const tx = TRX + (ti%6)*145 + Utils.rand(-15,15);
      const ty = TRY + Math.floor(ti/6)*250 + Utils.rand(-20,20);
      _spawn('SHED', tx, ty);
      _spawn('CAR',  tx+60, ty+30);
    }
    _scatter('CHAIR', TRX+500, TRY+500, 20, 350);
    _scatter('SIGN',  TRX+200, TRY+200, 8,  300);
    _scatter('TRASH', TRX+400, TRY+600, 25, 350);
    _scatter('LEAF',  TRX+300, TRY+300, 40, 400);
    _scatter('FENCE', TRX+500, TRY+500, 18, 420);
    // Power poles along road
    for (let pi = 0; pi < 8; pi++) { _spawn('POLE', TRX+pi*110, TRY-30); }

    // ── SUBURBS ───────────────────────────────────────────────────────────
    const SBX = 3100, SBY = 2200;
    const houseRows = [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2]];
    for (const [hi, hj] of houseRows) {
      const hx = SBX + 60 + hi*390 + Utils.rand(-20,20);
      const hy = SBY + 80 + hj*450 + Utils.rand(-20,20);
      _spawn('HOUSE', hx, hy);
      _spawn('CAR', hx+100, hy+120);
      _spawn('TREE', hx-80, hy+60);
      _spawn('TREE', hx+160, hy+70);
    }
    _scatter('LEAF',  SBX+800, SBY+800, 45, 700);
    _scatter('CHAIR', SBX+500, SBY+600, 15, 500);
    _scatter('SIGN',  SBX+200, SBY+100, 6,  400);
    for (let pi = 0; pi < 12; pi++) { _spawn('POLE', SBX+pi*130, SBY-20); }
    _scatter('TRASH', SBX+900, SBY+900, 20, 600);

    // ── GAS STATION ───────────────────────────────────────────────────────
    _spawn('SHED',   2100, 1780);
    _spawn('SIGN',   2050, 1720); _spawn('SIGN',   2180, 1720);
    for (let gi = 0; gi < 5; gi++) _spawn('CAR', 2050+gi*80, 1880);
    _spawn('PROPANE',2020,1820); _spawn('PROPANE',2260,1820);
    _scatter('TRASH', 2150, 1800, 12, 150);

    // ── FACTORY / INDUSTRIAL ──────────────────────────────────────────────
    const FCX = 600, FCY = 600;
    for (let fi = 0; fi < 4; fi++) {
      _spawn('FACTORY', FCX + fi*360, FCY + Utils.rand(-40,40));
      _spawn('TRACTOR', FCX+fi*360+150, FCY+200);
    }
    for (let fi = 0; fi < 6; fi++) _spawn('TRUCK', FCX+fi*290, FCY+380);
    _scatter('PROPANE',FCX+800, FCY+400, 10, 300);
    _scatter('POLE',   FCX+100, FCY+100, 12, 600);
    _spawn('TOWER', FCX+900, FCY+150);
    _scatter('TRASH', FCX+500, FCY+500, 20, 400);

    // ── DOWNTOWN CITY ──────────────────────────────────────────────────────
    const CTX = 2600, CTY = 400;
    // Skyscrapers
    const skyPos = [[0,0],[220,0],[440,0],[660,0],[880,0],[1100,0],[1320,0],
                    [0,350],[440,350],[880,350],[1320,350],
                    [220,700],[660,700],[1100,700],[0,700],[880,700]];
    for (const [sx,sy] of skyPos) {
      _spawn('SKYSCRAPER', CTX+sx+Utils.rand(-10,10), CTY+sy+Utils.rand(-10,10));
    }
    // Vehicles on streets
    for (let vi = 0; vi < 20; vi++) {
      _spawn('CAR',   CTX+Utils.rand(0,2200), CTY+Utils.rand(0,1400));
      _spawn('TRUCK', CTX+Utils.rand(0,2200), CTY+Utils.rand(0,1400));
    }
    _scatter('SIGN',  CTX+600, CTY+400, 18, 600);
    _scatter('POLE',  CTX+100, CTY+100, 20, 1000);
    // Airplane (parked on rooftop / airfield)
    _spawn('AIRPLANE', CTX+1800, CTY+200);
    _spawn('STADIUM', CTX+1900, CTY+900);

    // Global scattered leaves / trash
    _scatter('LEAF',  CFG.WORLD_W*0.5, CFG.WORLD_H*0.5, 80, 1500);
    _scatter('TRASH', CFG.WORLD_W*0.5, CFG.WORLD_H*0.5, 50, 1200);

    console.log(`Objects spawned: ${items.length}`);
  }

  function update(dt, tornado) {
    const stg = CFG.STAGES[tornado.stage];
    for (const obj of items) {
      if (obj.alive) {
        obj.update(dt, tornado.x, tornado.y, stg.range * tornado.rangeMult, stg.force * tornado.forceMult);
      }
    }
  }

  function getAbsorbed(tornado) {
    const absorbed = [];
    const toRemove = [];
    for (const obj of items) {
      if (!obj.alive) {
        if (obj.state === 'absorbed' && tornado.stage >= obj.def.stage) {
          absorbed.push(obj);
        }
        toRemove.push(obj);
      }
    }
    // Batch remove dead items
    for (const obj of toRemove) {
      const i = items.indexOf(obj);
      if (i !== -1) items.splice(i, 1);
    }
    return absorbed;
  }

  function getAll() { return items; }

  function render(ctx) {
    for (const obj of items) {
      if (obj.alive && Camera.isVisible(obj.x - obj.w, obj.y - obj.h, obj.w*2, obj.h*2)) {
        obj.render(ctx);
      }
    }
  }

  return { populate, update, getAbsorbed, getAll, render };
})();
