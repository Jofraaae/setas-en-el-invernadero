import { useMemo, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { BTN } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✔'];

export default function Code({ onFinish }) {
  const target = useMemo(() => Array.from({ length: 6 }, () => 1 + Math.floor(Math.random() * 9)), []);
  const [entered, setEntered] = useState([]);
  const [bad, setBad] = useState(0);

  const press = (k) => {
    sfx('click');
    if (k === 'C') { setEntered([]); return; }
    if (k === '✔') {
      if (entered.length < target.length) return;
      if (entered.join('') === target.join('')) onFinish();
      else { setEntered([]); setBad((b) => b + 1); sfx('miss'); }
      return;
    }
    if (entered.length >= target.length) return;
    setEntered([...entered, k]);
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Marca en el teclado el código del panel.</p>
      <div className="flex gap-2">
        {target.map((d, i) => (
          <span key={i} className="rounded-lg bg-[#0f211a] px-3 py-2 text-xl font-bold text-[#80ed99]">{d}</span>
        ))}
      </div>
      <div key={bad} className={`flex gap-2 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {target.map((_, i) => (
          <span
            key={i}
            className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#2f5a48] bg-[#0f211a] text-lg font-bold"
          >
            {entered[i] || ''}
          </span>
        ))}
      </div>
      <div className="grid w-full grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button key={k} className={`${BTN} py-2.5`} onClick={() => press(k)}>{k}</button>
        ))}
      </div>
    </>
  );
}