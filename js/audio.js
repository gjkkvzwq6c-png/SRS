/* ── VORTEX Audio System (Web Audio API procedural synthesis) ── */
'use strict';

const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let tornadoNodes = null;
  let rainNodes = null;
  let started = false;

  function init() {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = CFG.AUDIO?.MASTER_VOLUME ?? 0.65;
      masterGain.connect(ctx.destination);
      started = true;
    } catch(e) {
      console.warn('Web Audio not available');
    }
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  // ── White/Brown noise buffer ──
  function makeNoiseBuffer(type = 'white', dur = 2) {
    if (!ctx) return null;
    const frames = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    if (type === 'white') {
      for (let i = 0; i < frames; i++) data[i] = Math.random()*2-1;
    } else { // brown
      let last = 0;
      for (let i = 0; i < frames; i++) {
        const white = Math.random()*2-1;
        data[i] = last = (last + 0.02*white) / 1.02;
        data[i] *= 3.5;
      }
    }
    return buf;
  }

  // ── Start looping tornado roar ──
  function startTornado() {
    if (!ctx || tornadoNodes) return;

    const buf = makeNoiseBuffer('brown', 3);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;

    // Bandpass — low rumble
    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass'; bp1.frequency.value = 90; bp1.Q.value = 0.6;

    // Bandpass — wind hiss
    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass'; bp2.frequency.value = 320; bp2.Q.value = 0.8;

    const blend = ctx.createGain(); blend.gain.value = 0.5;
    const gain  = ctx.createGain(); gain.gain.value = 0;

    src.connect(bp1); src.connect(bp2);
    bp1.connect(gain); bp2.connect(blend); blend.connect(gain);
    gain.connect(masterGain);
    src.start();

    // Whoosh LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.3; lfoGain.gain.value = 15;
    lfo.connect(lfoGain); lfoGain.connect(bp1.frequency);
    lfo.start();

    tornadoNodes = { src, gain, bp1, bp2, lfo };
  }

  function setTornadoLevel(level) {
    if (!tornadoNodes) return;
    const t = level / 7;
    const vol = Utils.lerp(0.18, 0.85, t);
    tornadoNodes.gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.8);
    tornadoNodes.bp1.frequency.setTargetAtTime(Utils.lerp(80, 40, t), ctx.currentTime, 1);
    tornadoNodes.lfo.frequency.value = Utils.lerp(0.3, 1.5, t);
  }

  // ── Rain ──
  function startRain() {
    if (!ctx || rainNodes) return;
    const buf = makeNoiseBuffer('white', 2);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 3000;

    const gain = ctx.createGain(); gain.gain.value = 0.08;
    src.connect(hp); hp.connect(gain); gain.connect(masterGain);
    src.start();
    rainNodes = { src, gain };
  }

  function setRainLevel(alpha) {
    if (!rainNodes) return;
    rainNodes.gain.gain.setTargetAtTime(alpha * 0.18, ctx.currentTime, 0.5);
  }

  // ── Thunder ──
  function thunder() {
    if (!ctx) return;
    const buf = makeNoiseBuffer('brown', 2.5);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

    src.connect(lp); lp.connect(gain); gain.connect(masterGain);
    src.start();
    src.stop(ctx.currentTime + 2.8);
  }

  // ── Impact (object absorbed) ──
  function impact(size = 1) {
    if (!ctx) return;
    const buf = makeNoiseBuffer('white', 0.3);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 600 - size * 30;
    bp.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(Math.min(0.5, 0.15 + size * 0.04), ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    src.connect(bp); bp.connect(gain); gain.connect(masterGain);
    src.start();
    src.stop(ctx.currentTime + 0.5);
  }

  // ── Level up swell ──
  function levelUpSwell() {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 1.2);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.connect(gain); gain.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + 1.6);
  }

  // ── Siren ──
  function siren() {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 1.2; lfoG.gain.value = 220;
    osc.frequency.value = 740; osc.type = 'square';
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
    osc.connect(gain); gain.connect(masterGain);
    lfo.start(); osc.start();
    osc.stop(ctx.currentTime + 3.2); lfo.stop(ctx.currentTime + 3.2);
  }

  // ── Transformer explosion ──
  function transformerPop() {
    if (!ctx) return;
    const buf = makeNoiseBuffer('white', 0.15);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    src.connect(gain); gain.connect(masterGain);
    src.start(); src.stop(ctx.currentTime + 0.2);
  }

  return { init, resume, startTornado, setTornadoLevel, startRain, setRainLevel,
           thunder, impact, levelUpSwell, siren, transformerPop };
})();
