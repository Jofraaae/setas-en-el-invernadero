/* Movimiento del jugador local: envío de órdenes y reconciliación con la sala.

   La sala manda. El cliente se mueve al instante (predicción) y la sala confirma. Para que
   las dos posiciones coincidan sin tirones, cada orden lleva la DURACIÓN que el cliente la
   ha tenido aplicada (`ms`): la sala mueve exactamente ese tiempo, en vez del que tarde en
   llegar el mensaje. Así, al soltar una tecla el personaje se queda donde se soltó y no
   resbala hacia donde la sala lo había llevado durante el retardo de red.

   Este módulo no toca React: lo usan el lienzo y también las pruebas de movimiento. */

import { stepMove, clamp } from './grid.js';

const RESEND_MS = 150; // se reenvía la orden aunque no cambie: la sala no te frena por silencio
const MIN_GAP_MS = 40; // entre dos órdenes distintas (salvo una parada, que sale al instante)

export function resetInput(g) {
  g.lastIn = { dx: 9, dy: 9 }; // valor imposible: la primera orden siempre se manda
  g.lastSend = 0;
  g.inMoving = false;
  g.lastEff = 0;
}

/* Manda una orden. `eff` es el instante (reloj del cliente) desde el que esa orden mueve al
   personaje: el del fotograma anterior, porque el avance de este fotograma ya la usa. */
export function sendInput(g, send, dx, dy, eff) {
  g.inSeq += 1;
  const msg = { t: 'input', dx, dy, seq: g.inSeq };
  // duración de la orden ANTERIOR (la que esta sustituye); si estaba parado no hay nada que contar
  if (g.inMoving) msg.ms = Math.max(0, Math.min(400, Math.round(eff - g.lastEff)));
  send(msg);
  g.pend.push({ seq: g.inSeq, dx, dy, ms: eff });
  if (g.pend.length > 40) g.pend.shift();
  g.lastIn = { dx, dy };
  g.inMoving = !!(dx || dy);
  g.lastEff = eff;
}

/* Decide si toca mandar la orden de este fotograma. */
export function pushInput(g, send, iv, now, eff) {
  const q = (n) => Math.round(n * 20) / 20;
  const cur = { dx: q(iv.dx), dy: q(iv.dy) };
  const li = g.lastIn;
  const changed = cur.dx !== li.dx || cur.dy !== li.dy;
  const stopping = changed && !cur.dx && !cur.dy;
  const starting = changed && !g.inMoving && !!(cur.dx || cur.dy);
  const flipping = changed && (cur.dx * li.dx < 0 || cur.dy * li.dy < 0); // dar la vuelta
  const since = now - g.lastSend;
  // Parar, arrancar y dar la vuelta salen siempre al momento: el personaje reacciona en
  // local sin esperar, así que cada milisegundo de retraso es una diferencia con la sala.
  // Solo las variaciones suaves del joystick respetan el espacio mínimo entre órdenes.
  if ((changed || since > RESEND_MS) && (since >= MIN_GAP_MS || stopping || starting || flipping)) {
    sendInput(g, send, cur.dx, cur.dy, eff);
    g.lastSend = now;
  }
}

/* Junta lo que dice la sala con las órdenes que aún no ha confirmado y acerca al personaje
   al resultado. Si la sala manda el punto donde empezó su orden en vigor (g.srvB), se
   reconstruye desde ahí con la duración de cada orden: coincide con lo que la sala acabará
   calculando. Con salas antiguas se usa la posición actual de la sala, como antes. */
export function reconcile(g, now, dt) {
  const ack = g.st.sq;
  const useB = !!g.srvB;
  let tx = useB ? g.srvB.x : g.srv.x;
  let ty = useB ? g.srvB.y : g.srv.y;
  if (ack >= 0) {
    // con srvB la orden confirmada sigue en vigor (aún no ha llegado la siguiente): se conserva
    if (useB) { if (g.pend.length && g.pend[0].seq < ack) g.pend = g.pend.filter((p) => p.seq >= ack); }
    else if (g.pend.length && g.pend[0].seq <= ack) g.pend = g.pend.filter((p) => p.seq > ack);
    // Las órdenes pendientes se re-simulan igual que en la sala: los vivos con colisiones y los
    // fantasmas atravesando muros.
    for (let i = 0; i < g.pend.length; i++) {
      const p = g.pend[i];
      const pl = Math.hypot(p.dx, p.dy);
      if (!pl) continue;
      const ms = Math.min(400, (i + 1 < g.pend.length ? g.pend[i + 1].ms : now) - p.ms);
      const d = g.cfg.speed * (Math.max(0, ms) / 1000);
      if (g.me.alive) {
        const m = stepMove(g.grid, tx, ty, (p.dx / pl) * d, (p.dy / pl) * d, g.cfg.radius);
        tx = m.x;
        ty = m.y;
      } else {
        tx = clamp(tx + (p.dx / pl) * d, g.cfg.radius, g.world.w - g.cfg.radius);
        ty = clamp(ty + (p.dy / pl) * d, g.cfg.radius, g.world.h - g.cfg.radius);
      }
    }
  }
  const ex = tx - g.me.x, ey = ty - g.me.y;
  const ed = Math.hypot(ex, ey);
  // Parado, quieto y sin nada en marcha: la vista se queda clavada donde estás (si no, el
  // suelo se deslizaría un poco al soltar la tecla).
  const idle = g.pend.every((p) => !p.dx && !p.dy);
  const settled = !g.me.moving && idle && ed < 40;
  const dead = g.me.moving ? 10 : 3;
  if (ed > dead && !settled) {
    // Un desfase pequeño se corrige arrastrando suave; uno grande (recarga, teletransporte) de golpe.
    const rate = ack >= 0 ? (ed > 80 ? 6 : 1.4) : (ed > 200 ? 9 : ed > 60 ? 2 : 0.35);
    const kc = 1 - Math.exp(-dt * rate);
    if (g.me.alive && !(g.vent && g.vent.in)) {
      const m = stepMove(g.grid, g.me.x, g.me.y, ex * kc, ey * kc, g.cfg.radius);
      g.me.x = m.x;
      g.me.y = m.y;
    } else {
      g.me.x += ex * kc;
      g.me.y += ey * kc;
    }
  }
  return ed;
}
