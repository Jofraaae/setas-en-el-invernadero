import { useMemo, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';

const TOL = 3;
const LABELS = ['Humedad', 'pH del sustrato', 'Temperatura'];

export default function Slider({ onFinish }) {
  const targets = useMemo(() => shuffle([14, 27, 38, 49, 61, 72, 83, 91]).slice(0, LABELS.length), []);
  const [vals, setVals] = useState(() => targets.map((t) => (t > 50 ? 2 : 98)));
  const done = useRef(false);

  const set = (i, v) => {
    const next = vals.map((old, j) => (j === i ? v : old));
    // un pitido al entrar en la marca verde de cada medidor
    if (Math.abs(v - targets[i]) <= TOL && Math.abs(vals[i] - targets[i]) > TOL) sfx('blip');
    setVals(next);
    if (!done.current && next.every((n, j) => Math.abs(n - targets[j]) <= TOL)) {
      done.current = true;
      onFinish();
    }
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Desliza cada medidor hasta la marca verde.</p>
      {LABELS.map((label, i) => {
        const ok = Math.abs(vals[i] - targets[i]) <= TOL;
        return (
          <div key={label} className="w-full">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#9bb8a6]">{label}</span>
              <span className={ok ? 'text-[#80ed99]' : 'text-[#e9c46a]'}>
                {vals[i]}% · marca {targets[i]}%
              </span>
            </div>
            <div className="relative mt-1 h-3.5 w-full overflow-hidden rounded-full bg-[#0f211a]">
              <div
                className="absolute inset-y-0 bg-[rgba(128,237,153,.35)] ring-2 ring-[#80ed99]"
                style={{ left: `${targets[i] - TOL}%`, width: `${TOL * 2}%` }}
              />
              <div className="absolute inset-y-0 w-[3px] bg-[#e9c46a]" style={{ left: `${vals[i]}%` }} />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={vals[i]}
              onChange={(e) => set(i, Number(e.target.value))}
              className="w-full accent-[#80ed99]"
            />
          </div>
        );
      })}
    </>
  );
}