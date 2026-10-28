import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { randInt } from './ui';
import { tr } from '@/lib/i18n';

const CELLS = 9;
const GOAL = 6;     // esporas que hay que atrapar
const LIFE = 2000;  // cuánto dura cada espora en pantalla (ms)
const SPAWN = 850;  // cada cuánto aparece una nueva (ms)

/* Esporas que aparecen y se desvanecen: se tocan antes de que desaparezcan. Sin castigo por
   fallar, solo hay que atrapar GOAL. */
export default function Catch({ onFinish }) {
  const live = useRef({});   // casilla -> id de la espora que hay ahora
  const nextId = useRef(0);
  const done = useRef(false);
  const count = useRef(0);
  const [view, setView] = useState({});
  const [got, setGot] = useState(0);

  useEffect(() => {
    const timers = new Set();
    const push = () => setView({ ...live.current });
    const spawn = () => {
      if (done.current) return;
      const free = [];
      for (let i = 0; i < CELLS; i++) if (!(i in live.current)) free.push(i);
      if (!free.length) return;
      const cell = free[randInt(free.length)];
      const id = ++nextId.current;
      live.current[cell] = id;
      push();
      const t = setTimeout(() => {
        timers.delete(t);
        if (live.current[cell] === id) { delete live.current[cell]; push(); }
      }, LIFE);
      timers.add(t);
    };
    spawn();
    const iv = setInterval(spawn, SPAWN);
    return () => { clearInterval(iv); timers.forEach(clearTimeout); };
  }, []);

  const hit = (i) => {
    if (done.current || !(i in live.current)) return;
    delete live.current[i];
    setView({ ...live.current });
    const n = ++count.current;
    setGot(n);
    if (n >= GOAL) {
      done.current = true;
      sfx('blip');
      onFinish();
    } else sfx('click');
  };

  return (
    <>
      <p className="text-center text-sm text-[#9bb8a6]">{tr('Toca las esporas antes de que se desvanezcan.')}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: CELLS }, (_, i) => (
          <button
            key={i}
            onPointerDown={() => hit(i)}
            className="flex h-[64px] w-[78px] items-center justify-center rounded-xl bg-[#0f211a] ring-2 ring-[#2f5a48]"
          >
            {i in view && (
              <span
                key={view[i]}
                className="block h-9 w-9 rounded-full bg-[#b8f0a0] shadow-[0_0_14px_4px_rgba(128,237,153,.75)] animate-pulse"
              />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#9bb8a6]">{tr('Esporas atrapadas: {n}/{total}', { n: got, total: GOAL })}</p>
    </>
  );
}
