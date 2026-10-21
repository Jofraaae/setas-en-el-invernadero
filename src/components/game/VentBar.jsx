import { arrowFor } from '@/lib/game/vents';

export default function VentBar({ vent, left = 0, onTravel, onOut }) {
  const others = (vent.vents || []).filter((v) => v.id !== vent.id);
  const urgent = left > 0 && left <= 5000;
  return (
    <div className="pointer-events-auto w-[min(240px,74vw)] rounded-xl border-2 border-[#9d4edd] bg-[rgba(28,12,42,.94)] p-3 shadow-[0_4px_14px_rgba(0,0,0,.5)]">
      <div className="mb-1 text-center text-xs font-bold tracking-wide text-[#c77dff]">
        ESTÁS EN UNA REJILLA
      </div>
      {/* el ingeniero tiene un tope de tiempo dentro: aquí ve cuánto le queda */}
      {left > 0 ? (
        <div className={`mb-2 rounded-lg px-2 py-1 text-center text-[11px] font-bold ${urgent ? 'bg-[#7b2c2c] text-[#ffd9db]' : 'bg-[rgba(0,0,0,.3)] text-[#e7d6ff]'}`}>
          Te quedan {Math.ceil(left / 1000)} s dentro
        </div>
      ) : null}
      <div className="mb-2 text-center text-[11px] text-[#9b7bb8]">
        Con las flechas del teclado saltas de una rejilla a otra
      </div>
      <div className="flex flex-col gap-2">
        {others.map((v) => (
          <button
            key={v.id}
            className="rounded-lg bg-[#5a2a86] px-3 py-2.5 text-sm font-bold text-white transition hover:brightness-125"
            onClick={() => onTravel(v.id)}
          >
            <b className="mr-1.5 text-[#c77dff]">{arrowFor(vent, v)}</b>
            {v.name}
          </button>
        ))}
        <button
          className="rounded-lg bg-[#e9c46a] px-3 py-2.5 text-sm font-bold text-[#261c05] transition hover:brightness-110"
          onClick={onOut}
        >
          SALIR [V]
        </button>
      </div>
    </div>
  );
}