import { useEffect, useRef, useState } from 'react';
import { drawFrame } from '@/lib/game/render';
import { clamp, stepMove } from '@/lib/game/grid';
import { dirKey, ventToward } from '@/lib/game/vents';
import { sfx } from '@/lib/game/sound';
import { pushInput, reconcile, resetInput, sendInput } from '@/lib/game/predict';
import { storedView, saveView, VIEW_EVENT } from '@/lib/game/profile';
import { tr } from '@/lib/i18n';

// Los demás jugadores se dibujan con este pequeño retraso: da margen para interpolar entre
// los dos últimos avisos de la sala sin quedarse corto cuando alguno llega con retraso. Es
// algo más de un tick (50 ms): así la interpolación nunca se queda sin margen y no hay
// tramos en los que el jugador se pare y arranque de golpe entre aviso y aviso.
const OTHERS_LAG = 60;

export default function GameCanvas({ g, send }) {
  const cvRef = useRef(null);
  const stickRef = useRef(null);
  const knobRef = useRef(null);
  const view = useRef({ W: 0, H: 0, dpr: 1, zoom: 1 });
  const fpRef = useRef(null);   // caja donde va el lienzo WebGL de la primera persona
  const hintRef = useRef(null);
  const [fpOn, setFpOn] = useState(() => storedView() === 'fp');
  const [fpMsg, setFpMsg] = useState('');
  const fpInst = useRef(null);  // el motor 3D, cargado solo cuando hace falta

  // La vista se elige en la sala de espera (o con P): se guarda y llega por un evento
  useEffect(() => {
    const on = (e) => setFpOn(e.detail === 'fp');
    window.addEventListener(VIEW_EVENT, on);
    return () => window.removeEventListener(VIEW_EVENT, on);
  }, []);

  if (!g.fp) g.fp = { on: false, yaw: 0, pitch: 0 };

  // El motor 3D se descarga y arranca solo si eliges la primera persona (Three.js pesa bastante)
  useEffect(() => {
    if (!fpOn) { g.fp.on = false; return undefined; }
    let dead = false;
    let inst = null;
    let cvs = null;
    setFpMsg(tr('Cargando la primera persona…'));
    import('@/lib/game/fp3d').then((m) => {
      if (dead) return;
      if (!m.webglOk()) throw new Error('webgl');
      cvs = document.createElement('canvas');
      cvs.className = 'block h-full w-full';
      cvs.style.touchAction = 'none';
      fpRef.current.appendChild(cvs);
      inst = m.createFp(cvs);
      fpInst.current = inst;
      g.fp.yaw = g.me && g.me.face < 0 ? Math.PI : 0;
      g.fp.pitch = 0;
      g.fp.on = true;
      setFpMsg('');
    }).catch(() => {
      if (dead) return;
      // sin WebGL o sin poder cargar el motor: se vuelve a la vista de siempre
      g.fp.on = false;
      saveView('normal');
      setFpOn(false);
      setFpMsg(tr('Este dispositivo no puede mostrar la primera persona. Se ha vuelto a la vista normal.'));
      setTimeout(() => setFpMsg(''), 5000);
    });
    return () => {
      dead = true;
      g.fp.on = false;
      fpInst.current = null;
      if (document.pointerLockElement) document.exitPointerLock();
      if (inst) inst.dispose();
      if (cvs && cvs.parentNode) cvs.parentNode.removeChild(cvs);
    };
  }, [fpOn, g]);

  useEffect(() => {
    const cv = cvRef.current;
    const ctx = cv.getContext('2d');
    const fogC = document.createElement('canvas');
    const fctx = fogC.getContext('2d');
    const v = view.current;

    const resize = () => {
      v.dpr = Math.min(2, window.devicePixelRatio || 1);
      v.W = window.innerWidth;
      v.H = window.innerHeight;
      cv.width = fogC.width = Math.round(v.W * v.dpr);
      cv.height = fogC.height = Math.round(v.H * v.dpr);
      // Encuadre cerrado sobre el jugador: el seta se ve grande y con su entorno a la vista,
      // tanto en pantallas grandes como en el móvil (donde el encuadre topa con el mínimo).
      v.zoom = clamp(Math.min(v.W / 800, v.H / 520), 0.55, 1.4);
    };
    resize();

    const keys = new Set();
    let joy = null;
    let joyV = null;
    let look = null; // dedo que mira a su alrededor (mitad derecha de la pantalla, solo en primera persona)
    resetInput(g); // lastIn / lastSend / duración de la orden en vigor: viven en g (también los usa Home)
    let lastPing = 0;
    let T = 0;
    let stepAcc = 0; // metros andados: un paso cada 62 px, como los pies del seta
    let last = performance.now();
    let raf = 0;

    const onKeyDown = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Ctrl/Cmd/Alt + tecla es un atajo del navegador (recargar, copiar, cambiar de pestaña…), no del juego:
      // sin esto, Ctrl+R reportaba, Ctrl+X sabotaba y, en Mac, Cmd+A dejaba la tecla 'a' atascada (no llega su keyup)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === ' ') e.preventDefault();
      if (k === 'p' && !e.repeat && !g.inputLock) { saveView(g.fp && g.fp.on ? 'normal' : 'fp'); return; }
      if (!e.repeat && g.lobby) {
        // sala de espera: solo se usa el aparato que tengas delante (ordenador o armario)
        if (k === 'e' || k === ' ') g.act.use();
      } else if (!e.repeat) {
        if (k === 'e' || k === ' ') g.act.use();
        else if (k === 'q') g.act.kill();
        else if (k === 'r') g.act.report();
        else if (k === 'x') g.act.sab();
        else if (k === 'c') g.act.rtor();
        else if (k === 'v') g.act.vent();
        else if (k === 'f') g.act.shift();
        else if (k === 'g') g.act.invis();
        else if (k === 't') g.act.guard();
        else if (k === 'b') g.act.blind();
        else if (k === 'h') g.act.sci();
        else if (k === 'i') g.act.interro();
        else if (k === 'l') g.act.track();
        else if (k === 'm') g.act.map();
        else if (k === 'escape') g.act.mapOff();
      }
      keys.add(k);
    };
    const onKeyUp = (e) => keys.delete(e.key.toLowerCase());
    const stopInput = () => {
      keys.clear();
      joy = null;
      joyV = null;
      showStick(false);
      if (g.lastIn.dx || g.lastIn.dy) {
        sendInput(g, send, 0, 0, g.frameT || performance.now());
        g.lastSend = performance.now();
      }
    };
    const onBlur = () => stopInput();
    const onVis = () => { if (document.hidden) stopInput(); };

    const showStick = (on) => { if (stickRef.current) stickRef.current.style.display = on ? 'block' : 'none'; };
    const placeStick = () => {
      if (!stickRef.current || !joy) return;
      stickRef.current.style.left = `${joy.x - 55}px`;
      stickRef.current.style.top = `${joy.y - 55}px`;
      if (knobRef.current) {
        knobRef.current.style.left = `${35 + joy.dx * 35}px`;
        knobRef.current.style.top = `${35 + joy.dy * 35}px`;
      }
    };
    const onTouchStart = (e) => {
      if (g.inputLock || (g.vent && g.vent.in)) return;
      for (const t of e.changedTouches) {
        const onButton = t.target && t.target.closest && t.target.closest('button, aside, [role=dialog]');
        if (!joy && !onButton && t.clientX < window.innerWidth * 0.55) {
          joy = { id: t.identifier, x: t.clientX, y: t.clientY, dx: 0, dy: 0 };
          placeStick();
          showStick(true);
        } else if (!look && !onButton && g.fp.on && t.clientX >= window.innerWidth * 0.45) {
          look = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
    };
    const onTouchMove = (e) => {
      if (look) {
        for (const t of e.changedTouches) {
          if (t.identifier !== look.id) continue;
          g.fp.yaw += (t.clientX - look.x) * 0.006;
          g.fp.pitch = clamp(g.fp.pitch - (t.clientY - look.y) * 0.0045, -1.1, 1.1);
          look.x = t.clientX; look.y = t.clientY;
        }
      }
      if (!joy) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== joy.id) continue;
        let dx = (t.clientX - joy.x) / 45, dy = (t.clientY - joy.y) / 45;
        const l = Math.hypot(dx, dy);
        if (l > 1) { dx /= l; dy /= l; }
        joy.dx = dx; joy.dy = dy;
        joyV = l < 0.2 ? { dx: 0, dy: 0 } : { dx, dy };
        placeStick();
      }
    };
    const onTouchEnd = (e) => {
      if (look) for (const t of e.changedTouches) if (t.identifier === look.id) look = null;
      if (!joy) return;
      for (const t of e.changedTouches) {
        if (t.identifier === joy.id) { joy = null; joyV = null; showStick(false); }
      }
    };

    const keyVec = () => {
      let dx = 0, dy = 0;
      const fp = g.fp.on; // en primera persona las flechas izquierda/derecha giran la cámara
      if (keys.has('a') || (!fp && keys.has('arrowleft'))) dx--;
      if (keys.has('d') || (!fp && keys.has('arrowright'))) dx++;
      if (keys.has('w') || keys.has('arrowup')) dy--;
      if (keys.has('s') || keys.has('arrowdown')) dy++;
      return { dx, dy };
    };
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      // El avance va con el tiempo real del fotograma, igual que el de la sala (que mueve a
      // cada jugador con su propio reloj). Antes se recortaba a 40 ms: con un fotograma lento
      // el personaje se quedaba atrás y la reconciliación lo empujaba hacia delante, y eso se
      // veía como una aceleración. El tope alto solo evita el salto de una pestaña dormida.
      const dt = Math.min(0.25, (now - last) / 1000);
      // El avance de este fotograma ya usa la orden de ahora, así que esa orden "empieza" en
      // el fotograma anterior: es el instante que se manda a la sala (ver predict.js).
      const prevT = last;
      last = now;
      g.frameT = now;
      T += dt;

      const raw = joyV || keyVec();
      // Dentro de una rejilla no se anda: las flechas (o el joystick) te llevan a otra
      // rejilla de la misma red. Ya no te sacan de ella: para salir hay que pulsar V,
      // el mismo botón con el que se entra.
      if (g.vent && g.vent.in) {
        const dir = dirKey(raw);
        if (!dir) g.navDir = null;
        else if (dir !== g.navDir) {
          const id = ventToward(g.vent, raw);
          if (id !== null && now - (g.vent.navAt || 0) > 200) { g.vent.navAt = now; g.act.ventTo(id); }
          g.navDir = dir;
        }
      } else if (g.navDir) g.navDir = null;
      // congelado o transformándose: no se anda
      const locked = g.inputLock || (g.vent && g.vent.in) || g.st.fz > 0 || !!(g.st.form && g.st.form.morph);
      let wv = raw;
      if (g.fp.on) {
        // primera persona: arriba = hacia donde miras, izquierda/derecha = de lado. La sala sigue
        // recibiendo una dirección del mapa, igual que siempre.
        const turn = (keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0);
        if (turn && !g.inputLock) g.fp.yaw += turn * 2.3 * dt;
        const vv = -raw.dy, ss = raw.dx, c = Math.cos(g.fp.yaw), sn = Math.sin(g.fp.yaw);
        wv = { dx: vv * c - ss * sn, dy: vv * sn + ss * c };
        if (g.inputLock && document.pointerLockElement) document.exitPointerLock();
      }
      const iv = locked ? { dx: 0, dy: 0 } : wv;
      // Se reenvía cada 150 ms aunque no cambie (la sala no te frena por silencio) y una
      // parada sale al instante. Cada orden lleva su duración: ver predict.js.
      pushInput(g, send, iv, now, prevT);
      if (now - lastPing > 4000) { lastPing = now; send({ t: 'ping' }); }

      const l = Math.hypot(iv.dx, iv.dy);
      g.me.moving = l > 0;
      if (l > 0) {
        if (iv.dx) g.me.face = Math.sign(iv.dx);
        const d = g.cfg.speed * dt;
        if (!g.me.alive) {
          g.me.x = clamp(g.me.x + (iv.dx / l) * d, 16, g.world.w - 16);
          g.me.y = clamp(g.me.y + (iv.dy / l) * d, 16, g.world.h - 16);
        } else {
          // mismo avance que el servidor: pasos cortos y parada justo al contacto
          const m = stepMove(g.grid, g.me.x, g.me.y, (iv.dx / l) * d, (iv.dy / l) * d, g.cfg.radius);
          g.me.x = m.x;
          g.me.y = m.y;
        }
        stepAcc += d;
        if (stepAcc > 62) { stepAcc = 0; sfx('step'); }
      } else stepAcc = 0;
      // Reconciliación con la sala (ver predict.js): se parte de lo que ella dice y se vuelven
      // a aplicar las órdenes que aún no ha confirmado. Una posición vieja nunca pisa a la
      // nueva, así que hacer una tarea (o ver subir su barra) no mueve al jugador hacia atrás.
      reconcile(g, now, dt);
      // Salto del impostor sobre su víctima: manda sobre la reconciliación y dura unos 90 ms
      if (g.dash) {
        const k = (now - g.dash.at) / g.dash.ms;
        if (k >= 1) { g.me.x = g.dash.tx; g.me.y = g.dash.ty; g.dash = null; }
        else {
          const e = 1 - (1 - Math.max(0, k)) ** 3; // sale disparado y frena al llegar
          g.me.x = g.dash.fx + (g.dash.tx - g.dash.fx) * e;
          g.me.y = g.dash.fy + (g.dash.ty - g.dash.fy) * e;
        }
      }

      // Los demás se dibujan interpolando entre los dos últimos avisos de su posición. Antes
      // se les perseguía con un suavizado exponencial y, como los avisos llegan cada 50 ms y
      // los fotogramas cada 16, la persecución se aceleraba y se frenaba en cada aviso: ese
      // era el tirón de velocidad. Interpolando, la velocidad entre avisos es constante.
      const nowMs = performance.now();
      for (const o of g.others.values()) {
        const span = Math.max(20, o.t1 - o.t0);
        // El aviso más nuevo manda: andar más allá de la última posición conocida (antes se
        // pasaba un 30 %) hacía que el jugador se resbalara de su sitio y volviera de golpe al
        // llegar el aviso siguiente.
        const k = Math.max(0, Math.min(1, (nowMs - OTHERS_LAG - o.t0) / span));
        o.x = o.ax + (o.bx - o.ax) * k;
        o.y = o.ay + (o.by - o.ay) * k;
        const ddx = o.bx - o.ax, ddy = o.by - o.ay;
        // en la sala de espera los avisos de quien se para dejan de llegar: pasado su tramo, está quieto
        o.moving = (!g.lobby || k < 1) && Math.hypot(ddx, ddy) > 1.5;
        if (Math.abs(ddx) > 0.6) o.face = Math.sign(ddx);
      }

      if (g.fp.on && fpInst.current) {
        if (cv.style.visibility !== 'hidden') cv.style.visibility = 'hidden';
        fpInst.current.render(g, T, dt, v.W, v.H);
        return;
      }
      if (cv.style.visibility === 'hidden') cv.style.visibility = '';
      drawFrame({ ctx, fctx, fogC, g, mapC: g.mapC, W: v.W, H: v.H, dpr: v.dpr, zoom: v.zoom, T });
    };
    raf = requestAnimationFrame(frame);

    // ratón: con el puntero capturado (clic en la pantalla) o arrastrando
    let drag = false;
    const hint = () => {
      if (!hintRef.current) return;
      hintRef.current.style.display = g.fp.on && !document.pointerLockElement ? 'block' : 'none';
    };
    const onDown = (e) => {
      if (!g.fp.on || e.pointerType === 'touch' || e.button !== 0) return;
      if (e.target !== cv && !(e.target.parentNode && e.target.parentNode === fpRef.current)) return;
      drag = true;
      try { if (!g.inputLock) fpRef.current.firstChild.requestPointerLock(); } catch (er) { /* sin captura: vale arrastrar */ }
    };
    const onUp = () => { drag = false; };
    const onMove = (e) => {
      if (!g.fp.on || e.pointerType === 'touch') return;
      if (!document.pointerLockElement && !drag) return;
      g.fp.yaw += e.movementX * 0.0026;
      g.fp.pitch = clamp(g.fp.pitch - e.movementY * 0.0022, -1.1, 1.1);
    };
    const hintIv = setInterval(hint, 250);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(hintIv);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVis);
      g.pend = [];
      sendInput(g, send, 0, 0, g.frameT || performance.now());
      g.pend = [];
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [g, send]);

  return (
    <>
      <canvas ref={cvRef} className="fixed inset-0 block h-full w-full" />
      <div ref={fpRef} className="fixed inset-0" style={{ display: fpOn ? 'block' : 'none' }} />
      {fpOn ? (
        <div className="pointer-events-none fixed inset-0 z-[5]" aria-hidden>
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 shadow-[0_0_0_1px_rgba(0,0,0,.5)]" />
          <div ref={hintRef} style={{ display: 'none' }} className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-xl bg-black/55 px-3 py-1.5 text-center text-xs font-bold text-white/90">
            {tr('Haz clic para mirar con el ratón (Esc lo suelta) · flechas ◀ ▶ también giran · P cambia de vista')}
          </div>
        </div>
      ) : null}
      {fpMsg ? <div className="pointer-events-none fixed left-1/2 top-14 z-[40] -translate-x-1/2 rounded-xl bg-black/70 px-3 py-2 text-center text-sm font-bold text-white">{fpMsg}</div> : null}
      <div
        ref={stickRef}
        style={{ display: 'none' }}
        className="pointer-events-none fixed z-[35] h-[110px] w-[110px] rounded-full border-2 border-white/25 bg-white/10"
      >
        <div ref={knobRef} className="absolute h-10 w-10 rounded-full bg-white/50" style={{ left: 35, top: 35 }} />
      </div>
    </>
  );
}