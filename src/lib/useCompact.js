import { useEffect, useState } from 'react';

// Pantalla pequeña (móvil): la interfaz se compacta. `coarse`: se juega con el dedo, sin
// teclado, así que se pueden quitar las teclas de atajo ([E], [Q]...) de los botones.
// `landscape`: pantalla apaisada (poca altura, de ahí que casi todo se haya de encoger).
function read() {
  if (typeof window === 'undefined') return { compact: false, coarse: false, landscape: false };
  let coarse = false;
  try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch { /* sin matchMedia */ }
  const w = window.innerWidth, h = window.innerHeight;
  return { compact: Math.min(w, h) < 600, coarse, landscape: w > h };
}

export function useCompact() {
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV((o) => {
      const n = read();
      return n.compact === o.compact && n.coarse === o.coarse && n.landscape === o.landscape ? o : n;
    });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

// Quita el atajo de teclado de una etiqueta cuando no hay teclado ("ELIMINAR [Q]" -> "ELIMINAR")
export const noKey = (coarse, t) => (coarse ? t.replace(/\s*\[[A-Z]\]/g, '') : t);
