import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { lastRooms, rememberRooms } from '@/lib/game/rooms';
import { sfx } from '@/lib/game/sound';

// Una sala que lleva más de este tiempo sin anunciarse ya no está abierta. El anfitrión
// late cada 12 s, pero su pestaña puede pasar a segundo plano (los navegadores espacian
// los temporizadores) o quedarse un momento sin responder: por eso el margen es amplio.
const FRESH_MS = 180000;

const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';

export default function RoomList({ onJoin, onClose }) {
  // Arranca con el listado que ya se vio: al volver atrás no se reinicia la lista.
  const [rooms, setRooms] = useState(() => lastRooms());
  const [failed, setFailed] = useState(false);
  const pending = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // Las fechas guardadas vienen en UTC sin sufijo de zona horaria. No deben
        // interpretarse en el navegador: en Madrid eso envejecía una sala nueva 2 horas.
        const { items } = await base44.entities.Room.filter(
          { updated_date: { $gte: new Date(Date.now() - FRESH_MS).toISOString() } },
          { sort: '-updated_date', limit: 30 }
        );
        if (!alive) return;
        const seen = new Map();
        for (const r of items) {
          if (!r.code || seen.has(r.code)) continue;
          seen.set(r.code, r);
        }
        const list = [...seen.values()];
        rememberRooms(list);
        setRooms(list);
        setFailed(false);
      } catch (e) {
        // un fallo de red no borra lo que ya había: se avisa y se deja la última lista
        if (alive) { setRooms((cur) => cur || []); setFailed(true); }
      }
    };
    load();
    let unsub = null;
    try {
      unsub = base44.entities.Room.subscribe(() => {
        if (pending.current) return;
        pending.current = setTimeout(() => { pending.current = null; load(); }, 400);
      });
    } catch (e) {
      unsub = null; // avisos en vivo no disponibles: basta con el refresco periódico
    }
    // La lista se refresca sola de todas formas: los avisos en vivo pueden no llegar, y
    // el listado no debe quedarse congelado con lo que hubiera al abrirlo.
    const poll = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(poll);
      if (pending.current) clearTimeout(pending.current);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="m-auto flex w-full max-w-[460px] flex-col items-center gap-3">
        <h2 className="text-[clamp(22px,4vw,32px)] font-black text-[#eaf5ec]">Salas activas</h2>
        <p className="text-center text-sm text-[#9bb8a6]">
          La lista se actualiza sola. Entra en una sala abierta con un clic.
        </p>

        <div className="flex w-full flex-col gap-2">
          {rooms === null ? (
            <p className="py-4 text-center text-sm text-[#9bb8a6]">Cargando salas…</p>
          ) : null}

          {failed ? (
            <p className="py-4 text-center text-sm text-[#ff8a8a]">
              No se ha podido cargar la lista. Puedes entrar con el código de sala.
            </p>
          ) : null}

          {rooms && rooms.length === 0 && !failed ? (
            <p className="py-4 text-center text-sm text-[#9bb8a6]">
              No hay salas abiertas ahora mismo. ¡Crea una!
            </p>
          ) : null}

          {rooms
            ? rooms.map((r) => {
                const waiting = r.status === 'lobby';
                const full = (r.player_count || 0) >= (r.max_players || 15);
                const canJoin = waiting && !full;
                const label = !waiting ? 'Partida en curso' : full ? 'Sala llena' : 'Esperando jugadores';
                return (
                  <button
                    key={r.id}
                    onClick={() => { if (!canJoin) return; sfx('click'); onJoin(r.code); }}
                    disabled={!canJoin}
                    className={`flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                      canJoin
                        ? 'border-[#2f5a48] bg-[#1a3027] hover:border-[#e9c46a]'
                        : 'border-[#25382f] bg-[#152a22] opacity-70'
                    }`}
                  >
                    <span className="text-xl font-black tracking-[4px] text-[#e9c46a]">{r.code}</span>
                    <span className="flex flex-col items-end text-xs">
                      <b className="text-[#eaf5ec]">
                        {r.player_count || 0}/{r.max_players || 15} jugadores
                      </b>
                      <span className={canJoin ? 'text-[#80ed99]' : 'text-[#ff9f1c]'}>{label}</span>
                    </span>
                  </button>
                );
              })
            : null}
        </div>

        <button className={BTN_ALT} onClick={() => { sfx('back'); onClose(); }}>Volver</button>
        <p className="text-center text-[12px] text-[#6f8a7b]">
          Si una sala ya tiene la partida empezada no podrás entrar: espera a que termine o crea la tuya.
        </p>
      </div>
    </div>
  );
}