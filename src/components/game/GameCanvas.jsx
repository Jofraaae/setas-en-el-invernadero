import { useEffect, useRef } from 'react';
import { drawFrame } from '@/lib/game/render';
import { clamp, stepMove } from '@/lib/game/grid';
import { dirKey, ventToward } from '@/lib/game/vents';
import { sfx } from '@/lib/game/sound';
import { pushInput, reconcile, resetInput, sendInput } from '@/lib/game/predict';

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
    resetInput(g); // lastIn / lastSend / duración de la orden en vigor: viven en g (también los usa Home)
    let lastPing = 0;
    let T = 0;
    let stepAcc = 0; // metros andados: un paso cada 62 px, como los pies del seta
    let last = performance.now();
    let raf = 0;

    const onKeyDown = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === ' ') e.preventDefault();
      if (!e.repeat) {
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
        const onButton = t.target && t.target.closest && t.target.closest('button');
        if (!joy && !onButton && t.clientX < window.innerWidth * 0.55) {
          joy = { id: t.identifier, x: t.clientX, y: t.clientY, dx: 0, dy: 0 };
          placeStick();
          showStick(true);
        }
      }
    };
    const onTouchMove = (e) => {
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
      if (!joy) return;
      for (const t of e.changedTouches) {
        if (t.identifier === joy.id) { joy = null; joyV = null; showStick(false); }
      }
    };

    const keyVec = () => {
      let dx = 0, dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx--;
      if (keys.has('d') || keys.has('arrowright')) dx++;
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
      const iv = locked ? { dx: 0, dy: 0 } : raw;
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
        o.moving = Math.hypot(ddx, ddy) > 1.5;
        if (Math.abs(ddx) > 0.6) o.face = Math.sign(ddx);
      }

      drawFrame({ ctx, fctx, fogC, g, mapC: g.mapC, W: v.W, H: v.H, dpr: v.dpr, zoom: v.zoom, T });
    };
    raf = requestAnimationFrame(frame);

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