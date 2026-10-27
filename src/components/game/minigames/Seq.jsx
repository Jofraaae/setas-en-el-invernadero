import { useMemo, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';
import { tr } from '@/lib/i18n';

export default function Seq({ onFinish }) {
  const order = useMemo(() => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]), []);
  const [next, setNext] = useState(1);
  const [bad, setBad] = useState(0);
  const click = (n) => {
    sfx('click');
    if (n === next) {
      if (next === 9) onFinish();
      else setNext(next + 1);
    } else {
      setNext(1);
      setBad((b) => b + 1);
      sfx('miss');
    }
  };
  return (
    <>
      <p className="text-sm text-[#9bb8a6]">{tr('Abre las válvulas en orden, del 1 al 9.')}</p>
      <div key={bad} className={`grid w-full grid-cols-3 gap-2.5 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {order.map((n) => (
          <button
            key={n}
            onClick={() => click(n)}
            className={`rounded-xl py-5 text-2xl font-bold transition ${
              n < next ? 'bg-[#80ed99] text-[#12351c]' : 'bg-[#e9c46a] text-[#261c05] hover:brightness-110'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </>
  );
}