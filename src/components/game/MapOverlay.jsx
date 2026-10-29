import { useEffect, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { mapName } from '@/lib/game/maps';
import { tr } from '@/lib/i18n';

/* Mapa del escenario: se abre en el centro de la pantalla con la M y se cierra igual.
   Es translúcido: mientras lo miras sigues viendo el juego y puedes seguir andando.
   Lleva el nombre de cada sala y, si eres impostor, un candado por sala para cerrar sus
   puertas (se abren solas a los 10 s). Durante un sabotaje no se pueden cerrar. */
// color del suelo con transparencia: las salas se ven, pero dejan ver el juego por debajo
function fade(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export default function MapOverlay({ g, onClose, onDoors, onUnlock }) {
  const [, force] = useState(0);
  // mientras está abierto se refresca solo: los segundos de las puertas van bajando
  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(iv);
  }, []);

  const world = g.world || { w: 4200, h: 2700 };
  const floors = g.floors || [];
  const doors = g.doors || [];
  const isImp = g.role === 'impostor';
  // el Guardallaves (tripulante ya caído) también ve las puertas cerradas y puede abrirlas
  const isKey = g.ghost === 'keymaster' && !g.me.alive && g.role === 'crew';
  const sab = !!(g.st.dark || g.st.rx);
  // el impostor puede cerrar puertas también estando muerto
  const canClose = isImp && !sab && !(g.vent && g.vent.in) && !(g.st.fz > 0);

  const sc = Math.min(
    Math.min(window.innerWidth * 0.9, 1180) / world.w,
    Math.max(220, window.innerHeight * 0.6) / world.h,
  );
  const W = Math.round(world.w * sc);
  const H = Math.round(world.h * sc);

  // Las puertas cerradas solo las ven en el mapa los impostores (vivos o muertos) y el
  // Guardallaves: para el resto de la tripulación, viva o fantasma, el mapa no dice nada de ellas.
  const closed = new Map(isImp || isKey ? (g.st.drs || []).map(([id, left]) => [id, left]) : []);
  const salas = floors.map((f, i) => ({ i, f })).filter((r) => r.f[5] && doors.some((d) => (d.rooms || []).includes(r.i)));
  const leftOf = (room) => {
    let best = 0;
    for (const d of doors) if ((d.rooms || []).includes(room)) best = Math.max(best, closed.get(d.id) || 0);
    return best;
  };
  // salas que acaban de abrir sus puertas: aún no se pueden volver a cerrar
  const cd = new Map((g.st.dcd || []).map(([room, left]) => [room, left]));
  const mine = g.roster.get(g.myId) || {};
  // jugador que llevas marcado con el localizador: se ve aquí aunque esté al otro lado del mapa
  const trk = g.st.trk || null;
  const trkWho = trk ? (g.roster.get(trk.id) || {}) : {};

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/20 p-3">
      <div className="pointer-events-auto flex max-h-full w-full flex-col items-center gap-2 overflow-auto">
        <div className="flex w-full max-w-[1180px] items-center justify-between gap-3">
          <div className="text-[15px] font-extrabold text-[#eaf5ec]">{tr('Mapa de {name}', { name: tr(mapName(g.map)) })}</div>
          <button
            className="rounded-xl bg-[#2f5a48] px-4 py-2 text-sm font-bold text-[#eaf5ec] transition hover:brightness-110"
            onClick={onClose}
          >
            {tr('Cerrar [M]')}
          </button>
        </div>

        <div className="relative overflow-hidden rounded-xl border-2 border-white/15 bg-[rgba(7,14,10,.35)]" style={{ width: W, height: H }}>
          {floors.map((f, i) => {
            const [x, y, w, h, col, name] = f;
            const o = f[7] || {};
            if (o.carve && !o.water) return null; // solo cierra celdas: no se dibuja
            const shut = name ? leftOf(i) > 0 : false;
            // contorno libre (Micelaria): la caja se recorta con el propio polígono
            const clip = o.poly
              ? `polygon(${o.poly.map((q) => `${((q[0] - x) / w) * 100}% ${((q[1] - y) / h) * 100}%`).join(',')})`
              : undefined;
            const lx = o.label ? o.label[0] : x + w / 2;
            const ly = o.label ? o.label[1] - 40 : y + 4;
            return (
              <div key={i}>
                <div
                  className="absolute"
                  style={{
                    left: x * sc,
                    top: y * sc,
                    width: w * sc,
                    height: h * sc,
                    clipPath: clip,
                    background: shut ? 'rgba(230,57,70,.55)' : fade(col, o.poly ? 0.62 : 0.5),
                    boxShadow: !o.poly ? (shut ? 'inset 0 0 0 5px rgba(230,57,70,.85)' : name ? 'inset 0 0 0 1px rgba(255,255,255,.18)' : 'none') : 'none',
                  }}
                />
                {name ? (
                  <span
                    className="absolute -translate-x-1/2 whitespace-nowrap px-1 text-center text-[13px] font-bold leading-tight text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,.85)]"
                    style={{ left: lx * sc, top: ly * sc }}
                  >
                    {tr(name)}
                  </span>
                ) : null}
              </div>
            );
          })}

          {doors.filter((d) => closed.has(d.id)).map((d) => (
            <div
              key={d.id}
              className="absolute bg-[#ff4d5e]"
              style={{ left: d.x * sc, top: d.y * sc, width: Math.max(4, d.w * sc * 1.5), height: Math.max(4, d.h * sc * 1.5) }}
            />
          ))}

          {isImp || isKey ? salas.map(({ i, f }) => {
            const left = leftOf(i);
            const wait = cd.get(i) || 0;
            // En la sala del botón de emergencia el candado se baja: puesto en el centro
            // caía justo encima del punto rojo y costaba acertarle.
            const onBtn = g.btn.x >= f[0] && g.btn.x <= f[0] + f[2] && g.btn.y >= f[1] && g.btn.y <= f[1] + f[3];
            const lock = f[7] && f[7].lock ? f[7].lock : [f[0] + f[2] / 2, f[1] + f[3] / 2];
            if (isKey) {
              // candado ABIERTO: solo se puede tocar si esa sala tiene una puerta cerrada y la llave está lista
              const keyWait = g.st.kycd || 0;
              const can = left > 0 && keyWait <= 0;
              return (
                <button
                  key={i}
                  title={tr('Puertas de {name}', { name: tr(f[5]) })}
                  className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-2 py-1 text-[13px] font-bold leading-none shadow-[0_2px_6px_rgba(0,0,0,.5)] transition disabled:cursor-not-allowed ${can ? 'border-[#9fe3ff] bg-[#1c5f86] text-white hover:bg-[#2a7fa8]' : 'border-white/25 bg-[rgba(10,22,16,.85)] text-[#eaf5ec] opacity-45'}`}
                  style={{ left: onBtn ? g.btn.x * sc : lock[0] * sc, top: onBtn ? g.btn.y * sc + 26 : lock[1] * sc }}
                  disabled={!can}
                  onClick={() => { sfx('switch'); onUnlock(i); }}
                >
                  {left > 0 ? (keyWait > 0 ? `⏳${Math.ceil(keyWait / 1000)}` : `🔓 ${Math.ceil(left / 1000)}s`) : '🔓'}
                </button>
              );
            }
            return (
              <button
                key={i}
                title={tr('Puertas de {name}', { name: tr(f[5]) })}
                className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 bg-[rgba(10,22,16,.92)] px-2 py-1 text-[13px] font-bold leading-none text-[#eaf5ec] shadow-[0_2px_6px_rgba(0,0,0,.5)] transition hover:bg-[#7b2cbf] disabled:cursor-not-allowed disabled:opacity-55 ${wait > 0 && left <= 0 ? 'text-[#ffd60a]' : ''}`}
                style={{ left: onBtn ? g.btn.x * sc : lock[0] * sc, top: onBtn ? g.btn.y * sc + 26 : lock[1] * sc }}
                disabled={!canClose || left > 0 || wait > 0}
                onClick={() => { sfx('switch'); onDoors(i); }}
              >
                {left > 0 ? `${Math.ceil(left / 1000)}s` : wait > 0 ? `⏳${Math.ceil(wait / 1000)}` : '🔒'}
              </button>
            );
          }) : null}

          {/* lo mismo que daba el plano pequeño: tus misiones pendientes y el botón de
              emergencia. Son solo marcas: no reciben toques, así no tapan los candados. */}
          {(g.tasks || []).filter((t) => !g.done.has(t.id)).map((t) => (
            <div
              key={t.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black/50 bg-[#ffd60a] shadow-[0_0_8px_rgba(0,0,0,.85)]"
              style={{ left: t.x * sc, top: t.y * sc, width: 12, height: 12 }}
            />
          ))}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-[#e63946] shadow-[0_0_10px_rgba(0,0,0,.85)]"
            style={{ left: g.btn.x * sc, top: g.btn.y * sc, width: 16, height: 16 }}
          />

          {trk ? (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 border-white/85 px-2 py-0.5 text-[12px] font-bold text-white shadow-[0_0_10px_rgba(0,0,0,.9)]"
              style={{ left: trk.x * sc, top: trk.y * sc, background: trkWho.color || '#4361ee' }}
            >
              📍 {trkWho.name || '???'} · {Math.ceil(trk.left / 1000)}s
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_12px_rgba(0,0,0,.8)]"
            style={{ left: g.me.x * sc, top: g.me.y * sc, width: 20, height: 20, background: mine.color || '#fff' }}
          />
        </div>

        <div className="max-w-[1180px] text-center text-[12px] text-[#9bb8a6]">
          {isImp
            ? sab
              ? tr('Con un sabotaje en marcha no se pueden cerrar puertas.')
              : tr('Toca el candado de una sala para cerrar sus puertas 10 s: nadie puede abrirlas antes y tardan 20 s en poder cerrarse otra vez.')
            : isKey
              ? (g.st.kycd > 0
                ? tr('La llave se está recargando: {s} s.', { s: Math.ceil(g.st.kycd / 1000) })
                : tr('Toca el candado abierto 🔓 de una sala con las puertas cerradas para abrirlas. Después la llave tarda en recargarse.'))
              : tr('Ves el mapa entero, con el nombre de cada zona.')}
          <div className="text-[11px]">{tr('Punto de tu color: tú · amarillos: misiones pendientes · rojo: botón de emergencia')}</div>
          {trk ? (
            <div className="text-[11px] font-bold text-[#cdf3ff]">
              {tr('📍 {name}: el jugador que llevas localizado', { name: trkWho.name || '???' })}
            </div>
          ) : null}
          <div className="text-[11px] font-bold text-[#80ed99]">{tr('Puedes seguir andando con el mapa abierto · se cierra con la M')}</div>
        </div>
      </div>
    </div>
  );
}