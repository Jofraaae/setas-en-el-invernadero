import { useEffect, useState } from 'react';
import { sfx } from '@/lib/game/sound';

const N = 5;

/* Cuadro eléctrico: hay que dejar todos los interruptores en ON. Cada uno arrastra
   también a los de al lado, así que el cuadro se desordena desde la posición correcta:
   siempre tiene solución y no basta con tocar solo los que están en OFF. */
function scrambled() {
  const a = Array.from({ length: N }, () => true);
  const moves = 3 + Math.floor(Math.random() * 4);
  for (let m = 0; m < moves; m++) {
    const i = Math.floor(Math.random() * N);
    for (let j = i - 1; j <= i + 1; j++) if (j >= 0 && j < N) a[j] = !a[j];
  }
  return a;
}

export default function Switches({ onFinish }) {
  const [on, setOn] = useState(scrambled);
  const ready = on.every(Boolean);

  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(onFinish, 600);
    return () => clearTimeout(t);
  }, [ready, onFinish]);

  const flip = (i) => {
    sfx('switch');
    setOn((a) => a.map((v, j) => (Math.abs(j - i) <= 1 ? !v : v)));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-[13px] text-[#b7cfc2]">
        Pon todos los interruptores en ON para devolver la luz. Cada uno cambia también a los de al lado.
      </p>
      <div className="flex items-end gap-3 rounded-xl border-2 border-[#2f5a48] bg-[#12241c] px-4 py-3.5">
        {on.map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <span className={`text-[11px] font-extrabold ${v ? 'text-[#80ed99]' : 'text-[#8fa79c]'}`}>
              {v ? 'ON' : 'OFF'}
            </span>
            <button
              className={`h-16 w-11 rounded-lg border-2 transition ${v ? 'border-[#80ed99] bg-[#1f4a35]' : 'border-[#5c6f66] bg-[#243430]'}`}
              onClick={() => flip(i)}
              aria-label={`Interruptor ${i + 1}`}
            >
              <span className={`mx-auto block h-6 w-7 rounded transition-all ${v ? 'mt-1.5 bg-[#80ed99]' : 'mt-7 bg-[#8fa79c]'}`} />
            </button>
            <span className="text-[11px] font-bold text-[#8fa79c]">L{i + 1}</span>
          </div>
        ))}
      </div>
      {ready ? <div className="text-sm font-bold text-[#80ed99]">¡Cuadro reiniciado!</div> : null}
    </div>
  );
}