import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { BTN_ALT, randInt } from './ui';

const VALS = [7, 13, 23, 41];
const BAND = 4;    // media anchura de la banda verde
const HOLD = 3000; // hay que aguantar la presión ahí dentro
const DRIP = 2.4;  // la presión se escapa sola: % por segundo
const TICK = 100;

export default function Valves({ onFinish }) {
  const target = useRef(24 + randInt(52)).current; // 24 % – 75 %
  const st = useRef({ p: 0, hold: 0, done: false });
  const finish = useRef(onFinish);
  finish.current = onFinish;
  const [p, setP] = useState(0);
  const [hold, setHold] = useState(0);
  const [trips, setTrips] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      const s = st.current;
      if (s.done) return;
      s.p = Math.max(0, s.p - (DRIP * TICK) / 1000); // se escapa mientras no la subes
      s.hold = Math.abs(s.p - target) <= BAND ? s.hold + TICK : 0;
      setP(s.p);
      setHold(s.hold);
      if (s.hold >= HOLD) {
        s.done = true;
        sfx('blip');
        finish.current();
      }
    }, TICK);
    return () => clearInterval(iv);
  }, [target]);

  const add = (v) => {
    const s = st.current;
    if (s.done) return;
    const next = s.p + v;
    if (next > 100) { // salta la válvula de seguridad y el circuito se vacía
      sfx('deny');
      setTrips((n) => n + 1);
      s.p = 0;
      s.hold = 0;
      setP(0);
      setHold(0);
      return;
    }
    const was = Math.abs(s.p - target) <= BAND;
    s.p = next;
    if (!was && Math.abs(next - target) <= BAND) sfx('blip'); else sfx('click');
    setP(next);
  };

  const purge = () => {
    const s = st.current;
    if (s.done || !s.p) return;
    sfx('back');
    s.p = 0;
    s.hold = 0;
    setP(0);
    setHold(0);
  };

  const inBand = Math.abs(p - target) <= BAND;
  return (
    <>
      <p className="text-center text-sm text-[#9bb8a6]">
        Sube la presión a la banda verde y aguanta 3 s dentro: se escapa sola, así que hay que ir corrigiéndola.
      </p>
      <div className="w-full">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-[#9bb8a6]">Presión</span>
          <span className={inBand ? 'text-[#80ed99]' : 'text-[#e9c46a]'}>
            {Math.round(p)}% · banda {target - BAND}–{target + BAND}%
          </span>
        </div>
        <div className="relative mt-1 h-6 w-full overflow-hidden rounded-lg bg-[#0f211a]">
          <div
            className="absolute inset-y-0 bg-[rgba(128,237,153,.32)] ring-2 ring-[#80ed99]"
            style={{ left: `${target - BAND}%`, width: `${BAND * 2}%` }}
          />
          <div className="absolute inset-y-0 w-[4px] bg-[#e9c46a]" style={{ left: `${Math.min(99, p)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs font-bold">
          <span className="text-[#9bb8a6]">Estabilizando</span>
          <span className={inBand ? 'text-[#80ed99]' : 'text-[#5d7568]'}>{Math.round((hold / HOLD) * 100)}%</span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-[#80ed99]" style={{ width: `${Math.round((hold / HOLD) * 100)}%` }} />
        </div>
      </div>
      <div className="grid w-full grid-cols-4 gap-2">
        {VALS.map((v) => (
          <button
            key={v}
            onClick={() => add(v)}
            className="rounded-xl bg-[#0f211a] py-3 text-lg font-black text-[#80ed99] ring-2 ring-[#2f5a48] transition hover:brightness-125"
          >
            +{v}
          </button>
        ))}
      </div>
      <button className={BTN_ALT} onClick={purge} disabled={!p}>
        Purgar
      </button>
      <p className="text-xs text-[#9bb8a6]">
        Pasando de 100% salta la válvula de seguridad y se vacía el circuito.{trips ? ` Saltos: ${trips}.` : ''}
      </p>
    </>
  );
}