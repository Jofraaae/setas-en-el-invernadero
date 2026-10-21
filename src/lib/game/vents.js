// Viajar entre rejillas: cada red tiene sus bocas repartidas por el mapa.

// Dirección pulsada en 8 sectores. Mantener la tecla no encadena viajes sin querer:
// hay que soltar y volver a pulsar para el siguiente salto.
export function dirKey(v) {
  const sx = Math.sign(Math.round(v.dx * 2));
  const sy = Math.sign(Math.round(v.dy * 2));
  return sx || sy ? `${sx}:${sy}` : null;
}

// La rejilla de la red que mejor cae en la dirección pulsada: primero las que apuntan
// casi exactamente y, entre esas, la más cerca. Nada fuera del cono (~60°).
export function ventToward(vent, v) {
  if (!vent || !vent.vents) return null;
  const inAng = Math.atan2(v.dy, v.dx);
  let best = null, bestBand = 3, bestDist = Infinity;
  for (const c of vent.vents) {
    if (c.id === vent.id) continue;
    const dx = c.x - vent.x, dy = c.y - vent.y;
    const d = Math.hypot(dx, dy) || 1;
    let diff = Math.abs(Math.atan2(dy, dx) - inAng) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    const band = diff < 0.2 ? 0 : diff < 0.5 ? 1 : diff < 1.05 ? 2 : 3;
    if (band === 3) continue;
    if (band < bestBand || (band === bestBand && d < bestDist)) { best = c.id; bestBand = band; bestDist = d; }
  }
  return best;
}

// La flecha que lleva a esa rejilla desde la actual (8 sectores, con la pantalla en mente).
export function arrowFor(vent, c) {
  const cur = (vent.vents || []).find((v) => v.id === vent.id);
  if (!cur) return '';
  const a = Math.atan2(c.y - cur.y, c.x - cur.x);
  const k = Math.round(a / (Math.PI / 4) + 8) % 8;
  return ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][k];
}