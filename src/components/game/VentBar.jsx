import { arrowFor } from '@/lib/game/vents';
import { tr } from '@/lib/i18n';

export default function VentBar({ vent, left = 0, onTravel, onOut, compact = false, coarse = false }) {
  const others = (vent.vents || []).filter((v) => v.id !== vent.id);
  const urgent = left > 0 && left <= 5000;
  return (
    <div className={`pointer-events-auto rounded-xl border-2 border-[#9d4edd] bg-[rgba(28,12,42,.94)] shadow-[0_4px_14px_rgba(0,0,0,.5)] ${compact ? 'w-[min(150px,40vw)] p-1.5' : 'w-[min(240px,74vw)] p-3'}`}>
      <div className={`mb-1 text-center font-bold tracking-wide text-[#c77dff] ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {tr('ESTÁS EN UNA REJILLA')}
      </div>
      {/* el ingeniero tiene un tope de tiempo dentro: aquí ve cuánto le queda */}
      {left > 0 ? (
        <div className={`${compact ? 'mb-1' : 'mb-2'} rounded-lg px-2 py-1 text-center text-[11px] font-bold ${urgent ? 'bg-[#7b2c2c] text-[#ffd9db]' : 'bg-[rgba(0,0,0,.3)] text-[#e7d6ff]'}`}>
          {tr('Te quedan {s} s dentro', { s: Math.ceil(left / 1000) })}
        </div>
      ) : null}
      {coarse ? null : (
        <div className="mb-2 text-center text-[11px] text-[#9b7bb8]">
          {tr('Con las flechas del teclado saltas de una rejilla a otra')}
        </div>
      )}
      <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
        {others.map((v) => (
          <button
            key={v.id}
            className={`rounded-lg bg-[#5a2a86] font-bold text-white transition hover:brightness-125 ${compact ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2.5 text-sm'}`}
            onClick={() => onTravel(v.id)}
          >
            <b className="mr-1.5 text-[#c77dff]">{arrowFor(vent, v)}</b>
            {v.name}
          </button>
        ))}
        <button
          className={`rounded-lg bg-[#e9c46a] font-bold text-[#261c05] transition hover:brightness-110 ${compact ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2.5 text-sm'}`}
          onClick={onOut}
        >
          {coarse ? tr('SALIR [V]').replace(/\s*\[V\]/, '') : tr('SALIR [V]')}
        </button>
      </div>
    </div>
  );
}