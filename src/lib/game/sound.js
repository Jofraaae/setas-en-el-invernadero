import { useEffect, useState } from 'react';

/* ================================================================
   Sonido de "Setas en el invernadero".
   Todo se sintetiza en el navegador con la Web Audio API: no hay
   ficheros que descargar y cada efecto está pensado para lo que se
   ve en pantalla (pasos, tareas, muerte, sabotajes, reuniones...).
   ================================================================ */

const LS_KEY = 'setas_sonido';
const subs = new Set();
const loops = new Map();
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;

try { muted = localStorage.getItem(LS_KEY) === 'off'; } catch (e) { muted = false; }

/* ---------- contexto ---------- */

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);
    // El navegador no deja sonar hasta que el jugador toca o teclea algo: al primer gesto se
    // despierta el audio y la música que ya estaba pidiendo sonar arranca sola.
    const wake = () => { if (!muted && ctx.state === 'suspended') ctx.resume(); };
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    window.addEventListener('touchstart', wake);
    // en segundo plano el juego no debe seguir sonando
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else if (!muted) ctx.resume();
    });
  }
  if (!muted && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noise(c) {
  if (!noiseBuf) {
    const n = Math.floor(c.sampleRate * 0.5);
    noiseBuf = c.createBuffer(1, n, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  return src;
}

/* ---------- voces básicas ---------- */

function tone(freq, o = {}) {
  const c = ctx;
  if (!c) return;
  const t = c.currentTime + (o.at || 0);
  const d = o.d || 0.15;
  const vol = Math.max(0.0002, o.gain == null ? 0.14 : o.gain);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, d / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osc.connect(g);
  g.connect(o.out || master);
  osc.start(t);
  osc.stop(t + d + 0.05);
}

function hiss(o = {}) {
  const c = ctx;
  if (!c) return;
  const t = c.currentTime + (o.at || 0);
  const d = o.d || 0.2;
  const src = noise(c);
  const f = c.createBiquadFilter();
  f.type = o.filter || 'lowpass';
  f.frequency.setValueAtTime(o.freq || 1200, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.to), t + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain == null ? 0.1 : o.gain), t + Math.min(0.03, d / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(f);
  f.connect(g);
  g.connect(o.out || master);
  src.start(t);
  src.stop(t + d + 0.05);
}

function notes(list, step, o = {}) {
  list.forEach((f, i) => tone(f, { ...o, at: (o.at || 0) + i * step }));
}

/* Melodía en bucle: va tocando las notas de la lista, una cada `step` ms, sobre la salida de
   su música. Devuelve el temporizador disfrazado de fuente para que stopLoop lo pare junto
   al resto de las voces. */
function melody(out, seq, step) {
  let i = 0;
  const play = () => {
    if (document.hidden) return; // en segundo plano el audio duerme: no se acumulan notas
    const n = seq[i % seq.length];
    i++;
    if (!n) return;
    const type = n.t || 'triangle';
    const gain = n.g == null ? 0.09 : n.g;
    const d = n.d || 0.5;
    tone(n.f, { d, type, gain, out });
    if (n.h) tone(n.h, { d: d * 0.9, type: 'sine', gain: gain * 0.6, out });          // segunda voz
    if (n.b) tone(n.b, { d: d * 2, type: 'sine', gain: gain * 0.8, out });            // bajo del compás
    if (n.e) tone(n.f * 2, { d: d * 0.9, type, gain: gain * 0.35, out, at: 0.32 });   // eco lejano
  };
  play();
  const iv = setInterval(play, step);
  return { stop: () => clearInterval(iv) };
}

/* ---------- efectos ---------- */
/* Cada nombre describe lo que se oye: así se elige de un vistazo dónde encaja. */

const SFX = {
  click: () => tone(680, { d: 0.06, type: 'triangle', gain: 0.12 }),
  back: () => notes([440, 320], 0.055, { d: 0.09, type: 'triangle', gain: 0.12 }),
  blip: () => tone(900, { d: 0.06, type: 'square', gain: 0.08 }),
  chat: () => tone(1050, { d: 0.05, type: 'sine', gain: 0.09 }),
  miss: () => notes([200, 150], 0.08, { d: 0.14, type: 'square', gain: 0.1 }),
  deny: () => notes([180, 130], 0.07, { d: 0.13, type: 'square', gain: 0.1 }),
  step: () => hiss({ d: 0.06, gain: 0.045, freq: 600 + Math.random() * 500, filter: 'bandpass' }),
  switch: () => { tone(140, { d: 0.08, type: 'square', gain: 0.14 }); hiss({ d: 0.05, gain: 0.08, freq: 2600, filter: 'highpass' }); },
  taskOpen: () => notes([520, 780], 0.06, { d: 0.1, type: 'sine', gain: 0.13 }),
  miniDone: () => notes([700, 900, 1250], 0.07, { d: 0.16, type: 'triangle', gain: 0.14 }),
  button: () => { tone(110, { d: 0.2, type: 'square', gain: 0.18 }); hiss({ d: 0.12, gain: 0.12, freq: 2200, filter: 'highpass' }); },
  // abalanzarse: subida tensa, doble latido acelerado y golpe seco (pura adrenalina)
  kill: () => {
    tone(160, { to: 700, d: 0.2, type: 'sawtooth', gain: 0.2 });
    tone(96, { to: 40, d: 0.3, type: 'sine', gain: 0.32 });
    tone(84, { d: 0.11, type: 'sine', gain: 0.26 });
    tone(70, { d: 0.13, type: 'sine', gain: 0.24, at: 0.17 });
    tone(1450, { to: 260, d: 0.28, type: 'square', gain: 0.07, at: 0.02 });
    hiss({ d: 0.22, gain: 0.2, freq: 2600, to: 450, filter: 'highpass' });
  },
  death: () => {
    tone(300, { to: 55, d: 1.1, type: 'sawtooth', gain: 0.2 });
    tone(70, { d: 1.3, type: 'sine', gain: 0.26 });
    notes([520, 415, 330, 220], 0.15, { d: 0.28, type: 'triangle', gain: 0.1, at: 0.1 });
  },
  sabotage: () => { tone(430, { to: 48, d: 0.9, type: 'sawtooth', gain: 0.18 }); hiss({ d: 0.8, gain: 0.1, freq: 900, to: 200 }); },
  alert: () => notes([740, 990], 0.12, { d: 0.16, type: 'square', gain: 0.12 }),
  // veneno de la Víbora: un siseo que sube, como algo que se deshace
  venom: () => { hiss({ d: 0.7, gain: 0.14, freq: 300, to: 1800, filter: 'bandpass' }); tone(190, { to: 90, d: 0.5, type: 'triangle', gain: 0.1 }); },
  fixed: () => notes([392, 523, 784], 0.07, { d: 0.16, type: 'triangle', gain: 0.13 }),
  meeting: () => notes([760, 560, 760, 560], 0.17, { d: 0.18, type: 'square', gain: 0.11 }),
  voteOpen: () => notes([880, 1170], 0.09, { d: 0.16, type: 'sine', gain: 0.12 }),
  vote: () => { tone(760, { d: 0.1, type: 'square', gain: 0.12 }); tone(1140, { d: 0.09, type: 'sine', gain: 0.07, at: 0.05 }); },
  eject: () => { hiss({ d: 0.9, gain: 0.15, freq: 600, to: 2600, filter: 'bandpass' }); tone(300, { to: 80, d: 0.85, type: 'sawtooth', gain: 0.1 }); },
  tie: () => notes([330, 294, 262], 0.11, { d: 0.18, type: 'triangle', gain: 0.11 }),
  begin: () => notes([392, 523, 659], 0.08, { d: 0.18, type: 'triangle', gain: 0.13 }),
  roleCrew: () => notes([523, 784], 0.11, { d: 0.28, type: 'sine', gain: 0.13 }),
  roleImp: () => { tone(170, { to: 55, d: 1.3, type: 'sawtooth', gain: 0.16 }); notes([185, 220], 0.45, { d: 0.7, type: 'sawtooth', gain: 0.07 }); },
  win: () => notes([523, 659, 784, 1046], 0.12, { d: 0.32, type: 'triangle', gain: 0.15 }),
  lose: () => notes([392, 330, 262, 196], 0.15, { d: 0.38, type: 'sawtooth', gain: 0.1 }),
  ventIn: () => { hiss({ d: 0.4, gain: 0.14, freq: 400, to: 1800, filter: 'bandpass' }); tone(200, { to: 620, d: 0.35, type: 'sine', gain: 0.08 }); },
  ventOut: () => { hiss({ d: 0.35, gain: 0.14, freq: 1800, to: 320, filter: 'bandpass' }); tone(620, { to: 200, d: 0.3, type: 'sine', gain: 0.08 }); },
  ventMove: () => hiss({ d: 0.28, gain: 0.12, freq: 700, to: 1500, filter: 'bandpass' }),
  leave: () => notes([520, 330], 0.09, { d: 0.14, type: 'sine', gain: 0.1 }),
  // cambiar de forma: un barrido que sube (y baja al recuperar el cuerpo) con aire eléctrico
  shiftIn: () => {
    tone(420, { to: 1350, d: 0.34, type: 'triangle', gain: 0.16 });
    tone(200, { to: 880, d: 0.3, type: 'sine', gain: 0.1, at: 0.05 });
    hiss({ d: 0.36, gain: 0.14, freq: 500, to: 3200, filter: 'bandpass' });
  },
  shiftOut: () => {
    tone(1250, { to: 320, d: 0.34, type: 'triangle', gain: 0.14 });
    hiss({ d: 0.3, gain: 0.13, freq: 2900, to: 420, filter: 'bandpass' });
  },
  freeze: () => { tone(92, { to: 58, d: 0.5, type: 'square', gain: 0.13 }); hiss({ d: 0.4, gain: 0.09, freq: 320, filter: 'lowpass' }); },
  // puertas de sala: el golpe de la compuerta al caer y el chirrido al volver a subir
  doorClose: () => {
    hiss({ d: 0.5, gain: 0.16, freq: 2600, to: 300, filter: 'highpass' });
    tone(128, { to: 60, d: 0.42, type: 'square', gain: 0.17 });
    tone(330, { to: 130, d: 0.34, type: 'triangle', gain: 0.08, at: 0.04 });
  },
  doorOpen: () => {
    hiss({ d: 0.45, gain: 0.12, freq: 320, to: 2200, filter: 'highpass' });
    tone(72, { to: 150, d: 0.34, type: 'square', gain: 0.11 });
  },
};

/* ---------- ambiente y alarmas (en bucle mientras dure la situación) ---------- */

const LOOPS = {
  // zumbido suave del invernadero: bombas, aire y un murmullo grave
  ambience: (c, out) => {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.connect(out);
    const o1 = c.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 58;
    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 87.5;
    const hum = c.createGain();
    hum.gain.value = 0.035;
    o1.connect(hum);
    o2.connect(hum);
    hum.connect(lp);
    const trem = c.createOscillator();
    trem.type = 'sine';
    trem.frequency.value = 0.13;
    const tg = c.createGain();
    tg.gain.value = 0.012;
    trem.connect(tg);
    tg.connect(hum.gain);
    const airF = c.createBiquadFilter();
    airF.type = 'lowpass';
    airF.frequency.value = 900;
    const air = noise(c);
    const airG = c.createGain();
    airG.gain.value = 0.012;
    air.connect(airF);
    airF.connect(airG);
    airG.connect(out);
    o1.start(); o2.start(); trem.start(); air.start();
    return [o1, o2, trem, air];
  },
  // alarma del reactor: sirena que sube y baja
  reactor: (c, out) => {
    const g = c.createGain();
    g.gain.value = 0.06;
    g.connect(out);
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 520;
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.5;
    const lg = c.createGain();
    lg.gain.value = 190;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    o.connect(lp);
    lp.connect(g);
    o.start(); lfo.start();
    return [o, lfo];
  },
  // apagón: zumbido grave con chisporroteo eléctrico
  blackout: (c, out) => {
    const g = c.createGain();
    g.gain.value = 0.05;
    g.connect(out);
    const o1 = c.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 46;
    const o2 = c.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = 69;
    o1.connect(g);
    o2.connect(g);
    const trem = c.createOscillator();
    trem.type = 'sine';
    trem.frequency.value = 0.7;
    const tg = c.createGain();
    tg.gain.value = 0.025;
    trem.connect(tg);
    tg.connect(g.gain);
    const nf = c.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 240;
    const n = noise(c);
    const ng = c.createGain();
    ng.gain.value = 0.02;
    n.connect(nf);
    nf.connect(ng);
    ng.connect(out);
    o1.start(); o2.start(); trem.start(); n.start();
    return [o1, o2, trem, n];
  },
  // victoria de los tripulantes: acorde mayor luminoso que respira, con brillo por encima
  winCrew: (c, out) => {
    const g = c.createGain();
    g.gain.value = 0.05;
    g.connect(out);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.connect(g);
    const oscs = [130.81, 261.63, 329.63, 392, 523.25].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = i === 0 ? 0.9 : 0.5 - i * 0.06;
      o.connect(og);
      og.connect(lp);
      return o;
    });
    const trem = c.createOscillator();
    trem.type = 'sine';
    trem.frequency.value = 0.85;
    const tg = c.createGain();
    tg.gain.value = 0.026;
    trem.connect(tg);
    tg.connect(g.gain);
    const shine = c.createOscillator();
    shine.type = 'sine';
    shine.frequency.value = 1568;
    const sg = c.createGain();
    sg.gain.value = 0.01;
    shine.connect(sg);
    sg.connect(g);
    oscs.forEach((o) => o.start());
    trem.start(); shine.start();
    return [...oscs, trem, shine];
  },
  // victoria de los impostores: drone grave con tritono, pulso de latido y aire metálico
  winImpostor: (c, out) => {
    const g = c.createGain();
    g.gain.value = 0.05;
    g.connect(out);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    lp.connect(g);
    const oscs = [55, 58.27, 77.78].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = i === 2 ? 0.5 : 0.85 - i * 0.2;
      o.connect(og);
      og.connect(lp);
      return o;
    });
    const trem = c.createOscillator();
    trem.type = 'sine';
    trem.frequency.value = 0.55;
    const tg = c.createGain();
    tg.gain.value = 0.032;
    trem.connect(tg);
    tg.connect(g.gain);
    const nf = c.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 2200;
    nf.Q.value = 2;
    const n = noise(c);
    const ng = c.createGain();
    ng.gain.value = 0.007;
    n.connect(nf);
    nf.connect(ng);
    ng.connect(out);
    oscs.forEach((o) => o.start());
    trem.start(); n.start();
    return [...oscs, trem, n];
  },
  // Menú (la pantalla de cambiar nombre): música tranquila en la menor, con un colchón de
  // fondo que respira despacio y un arpegio que va subiendo y bajando.
  menuMusic: (c, out) => {
    const pad = c.createGain();
    pad.gain.value = 0.03;
    pad.connect(out);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    lp.connect(pad);
    const voices = [110, 164.81, 220].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = i === 0 ? 0.9 : 0.4;
      o.connect(g);
      g.connect(lp);
      return o;
    });
    const breath = c.createOscillator();
    breath.type = 'sine';
    breath.frequency.value = 0.14;
    const bg = c.createGain();
    bg.gain.value = 0.014;
    breath.connect(bg);
    bg.connect(pad.gain);
    const arp = melody(out, [
      { f: 440, d: 0.5 },
      { f: 659.26, d: 0.45 },
      { f: 880, d: 0.7 },
      { f: 783.99, d: 0.5 },
      { f: 587.33, d: 0.5 },
      { f: 659.26, d: 0.8, g: 0.07 },
      { f: 493.88, d: 0.55 },
      { f: 587.33, d: 0.5 },
    ], 900);
    voices.forEach((o) => o.start());
    breath.start();
    return [...voices, breath, arp];
  },
  // Sala de espera: música misteriosa — un drone oscuro con tritono y, por encima, un tema en
  // Re menor con segunda voz, bajo en los tiempos fuertes y eco: la frase se pregunta y se
  // responde, como algo que aguarda en la penumbra del invernadero.
  lobbyMusic: (c, out) => {
    const pad = c.createGain();
    pad.gain.value = 0.028;
    pad.connect(out);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 620;
    lp.connect(pad);
    const voices = [58.27, 82.41, 116.54].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = i === 2 ? 0.22 : 0.5;
      o.connect(g);
      g.connect(lp);
      return o;
    });
    const wave = c.createOscillator();
    wave.type = 'sine';
    wave.frequency.value = 0.09;
    const wg = c.createGain();
    wg.gain.value = 0.018;
    wave.connect(wg);
    wg.connect(pad.gain);
    // El tema: dos frases de ocho pasos. La primera pregunta (Re–Fa–Mi–tritono) y la segunda
    // responde bajando (Sol–Fa–Re), con Sib de por medio para dejar el aire frío. Las notas
    // fuertes llevan segunda voz y bajo, y las largas se repiten lejos como un eco.
    const bells = melody(out, [
      { f: 587.33, d: 1.1, g: 0.05, t: 'sine', b: 146.83 }, // D5 · bajo en Re
      null,
      { f: 698.46, d: 0.7, g: 0.045 },
      { f: 659.26, d: 0.6, g: 0.04, h: 523.25 },
      { f: 415.3, d: 1.3, g: 0.045, e: 1 },                // el tritono: lo que inquieta
      null,
      { f: 392, d: 0.9, g: 0.045 },
      { f: 349.23, d: 1.0, g: 0.045, h: 293.66, b: 116.54 },
      { f: 293.66, d: 1.4, g: 0.05, t: 'sine' },
      { f: 349.23, d: 0.5, g: 0.035 },
      { f: 440, d: 0.9, g: 0.045, h: 523.25 },
      null,
      { f: 466.16, d: 1.1, g: 0.045, e: 1 },                // Sib: la sexta, aún más fría
      { f: 415.3, d: 1.0, g: 0.042 },
      { f: 293.66, d: 1.6, g: 0.05, t: 'sine', b: 146.83 },
      null,
    ], 640);
    voices.forEach((o) => o.start());
    wave.start();
    return [...voices, wave, bells];
  },
};

/* ---------- API ---------- */

export function sfx(name) {
  if (muted || !ac()) return;
  const f = SFX[name];
  if (f) { try { f(); } catch (e) { /* un sonido nunca debe romper la partida */ } }
}

export function loop(name) {
  const c = ac();
  if (!c || loops.has(name)) return;
  const build = LOOPS[name];
  if (!build) return;
  try {
    const out = c.createGain();
    out.gain.value = 0;
    out.connect(master);
    const srcs = build(c, out) || [];
    out.gain.linearRampToValueAtTime(1, c.currentTime + 1.2);
    loops.set(name, { out, srcs });
  } catch (e) {
    // sin bucle: el resto del sonido sigue funcionando
  }
}

export function stopLoop(name, fade = 0.5) {
  const l = loops.get(name);
  if (!l || !ctx) return;
  loops.delete(name);
  const t = ctx.currentTime;
  try {
    l.out.gain.cancelScheduledValues(t);
    l.out.gain.setValueAtTime(l.out.gain.value, t);
    l.out.gain.linearRampToValueAtTime(0, t + fade);
  } catch (e) { /* ya estaba en silencio */ }
  window.setTimeout(() => {
    for (const s of l.srcs) { try { s.stop(); } catch (e) { /* ya parado */ } }
    try { l.out.disconnect(); } catch (e) { /* ya suelto */ }
  }, (fade + 0.1) * 1000);
}

export function isMuted() { return muted; }

export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem(LS_KEY, muted ? 'off' : 'on'); } catch (e) { /* sin permisos */ }
  if (master) master.gain.value = muted ? 0 : 0.85;
  subs.forEach((f) => f(muted));
}

export function toggleMuted() { setMuted(!muted); return muted; }

export function useMuted() {
  const [v, setV] = useState(isMuted());
  useEffect(() => {
    const f = (m) => setV(m);
    subs.add(f);
    return () => subs.delete(f);
  }, []);
  return v;
}