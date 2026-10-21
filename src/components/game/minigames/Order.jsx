import { useMemo, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';

const SIZES = [10, 17, 25, 34, 43, 52];

export default function Order({ onFinish }) {
  const order = useMemo(() => shuffle(SIZES), []);
  const [next, setNext] = useState(0);
  const [bad, setBad] = useState(0);
  const click = (s) => {
    sfx('click');
    if (s === SIZES[next]) {
      if (next === SIZES.length - 1) onFinish();
      else setNext(next + 1);
    } else {
      setNext(0);
      setBad((b) => b + 1);
      sfx('miss');
    }
  };
  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Toca de la más pequeña a la más grande.</p>
      <div key={bad} className={`flex items-end justify-center gap-2 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {order.map((s) => (
          <button
            key={s}
            onClick={() => click(s)}
            className="flex h-[64px] w-[54px] items-end justify-center rounded-xl bg-[#0f211a] ring-2 ring-[#2f5a48] transition hover:brightness-125"
          >
            <span className="mb-2 block rounded-full bg-[#e9c46a]" style={{ width: s, height: s }} />
          </button>
        ))}
      </div>
    </>
  );
}