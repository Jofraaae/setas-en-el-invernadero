import { useEffect, useState } from 'react';
import { BatteryFull, BatteryLow } from 'lucide-react';
import MiniShroom from './MiniShroom';
import { tr } from '@/lib/i18n';

const BATTERY_MS = 25000; // la carga del panel dura esto en total, entre todas las veces que lo abras

/* Panel de constantes vitales del Científico: quién sigue vivo y quién ha caído. Se lee
   de un vistazo, con la batería que se va gastando mientras lo tienes delante. */
export default function ScientistPanel({ g, onClose }) {
  const [, force] = useState(0);

  // el estado de la partida llega cada 50 ms: con este latido el panel va al día
  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 140);
    return () => clearInterval(iv);
  }, []);

  const vt = g.st.vt;
  const left = Math.max(0, g.st.sciL || 0);
  const low = left <= 6000;
  const rows = vt
    ? vt.map(([id, alive]) => ({ id, alive: !!alive, ...(g.roster.get(id) || {}) })).sort((a, b) => Number(b.alive) - Number(a.alive))
    : [];

  return (
    // Translúcido y abajo: se ve el juego por debajo y el seta (que va en el centro de la
    // cámara) no queda tapado. El fondo no recibe toques: se sigue andando con él abierto.
    <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center p-3">
      <div className="pointer-events-auto w-full max-w-[400px] rounded-2xl border border-[rgba(127,216,240,.45)] bg-[rgba(14,36,48,.55)] p-3 backdrop-blur-[3px] shadow-[0_8px_24px_rgba(0,0,0,.35)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-black uppercase tracking-[2px] text-[#7fd8f0]">{tr('Constantes vitales')}</h2>
          <span className={`flex items-center gap-1 text-[11px] font-bold ${low ? 'text-[#ff7b86]' : 'text-[#7fd8f0]'}`}>
            {low ? <BatteryLow size={15} /> : <BatteryFull size={15} />}
            {Math.ceil(left / 1000)} s
          </span>
        </div>

        {/* la carga del panel: se gasta mientras lo miras */}
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[rgba(6,22,29,.55)]">
          <div
            className={`h-full transition-[width] duration-200 ${low ? 'bg-[#e63946]' : 'bg-[#4cc9f0]'}`}
            style={{ width: `${(left / BATTERY_MS) * 100}%` }}
          />
        </div>

        <div className="mt-3 flex max-h-[46vh] flex-col gap-1.5 overflow-auto">
          {vt ? rows.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${r.alive ? 'bg-[rgba(76,201,240,.08)]' : 'bg-[rgba(230,57,70,.14)]'}`}
            >
              <MiniShroom color={r.color || '#8d99ae'} size={30} dead={!r.alive} />
              <b className="flex-1 truncate text-sm text-[#eaf5ec]">{r.name || '???'}</b>
              <span className={`text-[11px] font-black uppercase tracking-wide ${r.alive ? 'text-[#80ed99]' : 'text-[#ff7b86]'}`}>
                {r.alive ? tr('Vivo') : tr('Eliminado')}
              </span>
            </div>
          )) : (
            <p className="py-3 text-center text-[12px] text-[#7f9c8c]">{tr('Leyendo constantes vitales…')}</p>
          )}
        </div>

        <button
          className="mt-3 w-full rounded-xl bg-[#e9c46a] px-3 py-2.5 text-sm font-bold text-[#261c05] transition hover:brightness-110"
          onClick={onClose}
        >
          {tr('Cerrar [H]')}
        </button>
        <p className="mt-2 text-center text-[11px] text-[#9fc2d6]">
          {tr('Se gasta mientras lo tienes abierto: 25 s por partida · puedes seguir andando con él delante')}
        </p>
      </div>
    </div>
  );
}