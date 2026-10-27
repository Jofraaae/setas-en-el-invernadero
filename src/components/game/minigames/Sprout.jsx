import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

const GOAL = 6;
const CELLS = 9;
const SPAWN_MS = 650;
const LIFE_MS = 1250;

export default function Sprout({ onFinish }) {
  const [active, setActive] = useState({}); // celda -> 'brote' | 'piedra'
  const [score, setScore] = useState(0);
  const [bad, setBad] = useState(0);
  const done = useRef(false);
  const timers = useRef([]);
  const live = useRef({});

  useEffect(() => {
    const spawn = setInterval(() => {
      if (done.current) return;
      const free = [];
      for (let i = 0; i < CELLS; i++) if (!live.current[i]) free.push(i);
      if (!free.length) return;
      const cell = free[Math.floor(Math.random() * free.length)];
      live.current = { ...live.current, [cell]: Math.random() < 0.25 ? 'piedra' : 'brote' };
      setActive(live.current);
      timers.current.push(setTimeout(() => {
        if (!live.current[cell]) return;
        const rest = { ...live.current };
        delete rest[cell];
        live.current = rest;
        setActive(rest);
      }, LIFE_MS));
    }, SPAWN_MS);
    return () => { clearInterval(spawn); timers.current.forEach(clearTimeout); };
  }, []);

  const tap = (i) => {
    const kind = live.current[i];
    if (!kind || done.current) return;
    const rest = { ...live.current };
    delete rest[i];
    live.current = rest;
    setActive(rest);
    if (kind === 'brote') {
      sfx('blip');
      const n = score + 1;
      setScore(n);
      if (n >= GOAL) { done.current = true; onFinish(); }
    } else { // una piedra: pierdes un brote
      sfx('miss');
      setBad((b) => b + 1);
      setScore((s) => Math.max(0, s - 1));
    }
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">{tr('Toca los brotes 🌱 antes de que se escondan. ¡Con las piedras no!')}</p>
      <div key={bad} className={`grid grid-cols-3 gap-2.5 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {Array.from({ length: CELLS }, (_, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            className="flex h-[62px] w-[74px] items-center justify-center rounded-xl bg-[#3a2a18] text-3xl ring-2 ring-[#5a4026] transition hover:brightness-125"
          >
            {active[i] === 'brote' ? '🌱' : active[i] === 'piedra' ? '🪨' : ''}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: GOAL }, (_, i) => (
          <span key={i} className={`h-2 w-6 rounded-full ${i < score ? 'bg-[#80ed99]' : 'bg-[#2f5a48]'}`} />
        ))}
      </div>
    </>
  );
}
