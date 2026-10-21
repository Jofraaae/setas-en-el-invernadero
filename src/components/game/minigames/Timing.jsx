import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { BTN } from './ui';

const ZONE = 0.18;
const NEED = 5;

export default function Timing({ onFinish }) {
  const [pos, setPos] = useState(0);
  const [zone, setZone] = useState(0.5);
  const [hits, setHits] = useState(0);
  const [bad, setBad] = useState(0);
  const p = useRef(0);
  const dir = useRef(1);
  const done = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      p.current += dir.current * 0.035;
      if (p.current > 1) { p.current = 1; dir.current = -1; }
      if (p.current < 0) { p.current = 0; dir.current = 1; }
      setPos(p.current);
    }, 30);
    return () => clearInterval(iv);
  }, []);

  const stop = () => {
    if (done.current) return;
    if (Math.abs(p.current - zone) <= ZONE / 2) {
      const n = hits + 1;
      setHits(n);
      sfx('blip');
      setZone(0.18 + Math.random() * 0.64);
      if (n >= NEED) { done.current = true; onFinish(); }
    } else {
      setHits(0);
      setBad((b) => b + 1);
      sfx('miss');
    }
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Detén la aguja 5 veces seguidas dentro de la zona verde.</p>
      <div className="relative h-12 w-full overflow-hidden rounded-xl bg-[#0f211a]">
        <div
          className="absolute inset-y-0 bg-[rgba(128,237,153,.35)] ring-2 ring-[#80ed99]"
          style={{ left: `${(zone - ZONE / 2) * 100}%`, width: `${ZONE * 100}%` }}
        />
        <div className="absolute inset-y-0 w-[3px] bg-[#e9c46a]" style={{ left: `${pos * 100}%` }} />
      </div>
      <div key={bad} className={`flex gap-2 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {Array.from({ length: NEED }, (_, i) => (
          <span key={i} className={`h-3 w-8 rounded-full ${i < hits ? 'bg-[#80ed99]' : 'bg-[#2f5a48]'}`} />
        ))}
      </div>
      <button className={`${BTN} w-full py-6 text-xl select-none`} style={{ touchAction: 'none' }} onClick={stop}>
        DETENER
      </button>
    </>
  );
}