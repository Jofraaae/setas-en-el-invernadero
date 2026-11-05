import { useEffect, useRef } from 'react';
import { drawShroom } from '@/lib/game/render';

/* Un seta dibujado con el mismo código que el del juego (drawShroom), así que lo que se ve en el
   armario es exactamente lo que verán los demás en la sala y en la partida.
   - look: accesorios que lleva; color: el del sombrero.
   - animate: se mueve (alas que aletean, luces…); sin animar sirve de miniatura.
   - focus: encuadre {cx, cy, z} en unidades del juego, relativo a los pies del seta. */

const VIEW = 76; // unidades del juego que caben en el lienzo con zoom 1
export const FOCUS = {
  full: { cx: 0, cy: -4, z: 1 },
  suit: { cx: 0, cy: 8, z: 1.9 },
  top: { cx: 0, cy: -19, z: 1.5 },
  face: { cx: 3, cy: 5, z: 2.4 },
  back: { cx: -7, cy: 2, z: 1.5 },
  other: { cx: 7, cy: -3, z: 1.25 },
};

export default function LookView({ look, color = '#d64545', size = 120, animate = false, focus = FOCUS.full, face = 1, className, label }) {
  const ref = useRef(null);
  const st = useRef({});
  st.current = { look, color, focus, face };
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);
    const c = cv.getContext('2d');
    let raf = 0, alive = true;
    const paint = (t) => {
      const { look: lk, color: col, focus: f, face: fc } = st.current;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.scale(dpr, dpr);
      c.translate(size / 2, size / 2);
      const k = (size / VIEW) * f.z;
      c.scale(k, k);
      c.translate(-f.cx, -f.cy);
      drawShroom(c, 0, 0, col, { alive: true, t, face: fc, moving: false, look: lk });
    };
    if (animate) {
      const t0 = performance.now();
      const loop = () => { if (!alive) return; paint((performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); };
      loop();
    } else {
      paint(0.6);
    }
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [size, animate, look, color, focus, face]);
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} role="img" aria-label={label || ''} />;
}
