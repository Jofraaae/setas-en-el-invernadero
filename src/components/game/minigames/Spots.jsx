import { useMemo, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';

const N = 9;
const DIRTY = 7;

export default function Spots({ onFinish }) {
  const dirty = useMemo(() => new Set(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, DIRTY)), []);
  const [left, setLeft] = useState(dirty);

  const clean = (i) => {
    if (!left.has(i)) return;
    sfx('click');
    const n = new Set(left);
    n.delete(i);
    setLeft(n);
    if (n.size === 0) onFinish();
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Limpia todas las manchas.</p>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: N }, (_, i) => (
          <button
            key={i}
            onClick={() => clean(i)}
            className="flex h-[60px] w-[72px] items-center justify-center rounded-xl bg-[#0f211a] ring-2 ring-[#2f5a48] transition hover:brightness-125"
          >
            {left.has(i)
              ? <span className="block h-8 w-8 rounded-full bg-[#7d6b4f] shadow-[inset_0_0_8px_rgba(0,0,0,.6)]" />
              : <span className="text-lg text-[#80ed99]">✔</span>}
          </button>
        ))}
      </div>
    </>
  );
}