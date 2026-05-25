/* ── VORTEX Camera System ── */
'use strict';

const Camera = (() => {
  let x = CFG.WORLD_W / 2;
  let y = CFG.WORLD_H / 2;
  let zoom = 1.0;
  let targetZoom = 1.0;
  let shakeX = 0, shakeY = 0;
  let shakeMag = 0;
  let shakeDamp = 0.88;
  let vw = 1280, vh = 720;

  function resize(w, h) { vw = w; vh = h; }

  function follow(tx, ty, dt) {
    const t = 1 - Math.pow(1 - CFG.CAMERA_LERP, dt * 60);
    x = Utils.lerp(x, tx - vw/(2*zoom), t);
    y = Utils.lerp(y, ty - vh/(2*zoom), t);

    // Clamp to world bounds
    x = Utils.clamp(x, 0, CFG.WORLD_W - vw/zoom);
    y = Utils.clamp(y, 0, CFG.WORLD_H - vh/zoom);
  }

  function setZoom(z) { targetZoom = z; }

  function shake(magnitude) {
    shakeMag = Math.max(shakeMag, magnitude);
  }

  function update(dt) {
    zoom = Utils.lerp(zoom, targetZoom, dt * 2.5);
    if (shakeMag > 0.5) {
      shakeX = (Math.random()*2-1) * shakeMag;
      shakeY = (Math.random()*2-1) * shakeMag;
      shakeMag *= shakeDamp;
    } else {
      shakeX = 0; shakeY = 0; shakeMag = 0;
    }
  }

  function begin(ctx) {
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.scale(zoom, zoom);
    ctx.translate(-x, -y);
  }

  function end(ctx) {
    ctx.restore();
  }

  // Convert screen coords → world coords
  function screenToWorld(sx, sy) {
    return { x: sx/zoom + x, y: sy/zoom + y };
  }

  // Convert world coords → screen coords
  function worldToScreen(wx, wy) {
    return { x: (wx - x) * zoom, y: (wy - y) * zoom };
  }

  // Is a world rect visible?
  function isVisible(wx, wy, w, h) {
    const margin = 120;
    const sx = (wx - x) * zoom, sy = (wy - y) * zoom;
    return sx + w*zoom > -margin && sx < vw + margin &&
           sy + h*zoom > -margin && sy < vh + margin;
  }

  function getPos()  { return { x, y }; }
  function getZoom() { return zoom; }
  function getView() { return { vw, vh }; }

  return { resize, follow, setZoom, shake, update, begin, end,
           screenToWorld, worldToScreen, isVisible, getPos, getZoom, getView };
})();
