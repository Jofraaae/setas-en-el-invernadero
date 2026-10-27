import { useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { randInt, shuffle, BTN_ALT } from './ui';
import { tr } from '@/lib/i18n';

const VIALS = [3, 5, 9, 12, 20];
const ROUNDS = 3;

// El objetivo siempre se puede clavar: sale de sumar entre dos y cuatro frascos.
function makeTarget() {
  const pick = shuffle(VIALS).slice(0, 2 + randInt(3));
  return pick.reduce((a, b) => a + b, 0);
}

export default function Dose({ onFinish }) {
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(makeTarget);
  const [total, setTotal] = useState(0);
  const [used, setUsed] = useState([]);
  const [bad, setBad] = useState(0);
  const done = useRef(false);

  const reset = () => { setTotal(0); setUsed([]); };

  const pour = (v) => {
    if (done.current || used.includes(v)) return;
    const t = total + v;
    if (t > target) { // se pasa de la cantidad: se vacía y vuelve a empezar
      sfx('miss');
      setBad((b) => b + 1);
      reset();
      return;
    }
    sfx('click');
    setTotal(t);
    setUsed((u) => [...u, v]);
    if (t !== target) return;
    if (round === ROUNDS - 1) {
      done.current = true;
      sfx('blip');
      onFinish();
      return;
    }
    sfx('blip');
    setRound(round + 1);
    setTarget(makeTarget());
    reset();
  };

  const empty = () => {
    if (done.current || !total) return;
    sfx('back');
    reset();
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">{tr('Suma frascos hasta clavar la cantidad exacta. Si te pasas, se vacía.')}</p>
      <div className="w-full">
        <div className="flex justify-between text-xs font-bold text-[#eaf5ec]">
          <span>{tr('Objetivo')} <span className="text-[#e9c46a]">{target}</span></span>
          <span>{tr('Vertido')} {total}</span>
        </div>
        <div className="mt-1.5 h-3.5 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-[#e9c46a] transition-all"
            style={{ width: `${Math.round((total / target) * 100)}%` }}
          />
        </div>
      </div>
      <div key={bad} className={`flex gap-2 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {VIALS.map((v) => (
          <button
            key={v}
            onClick={() => pour(v)}
            disabled={used.includes(v)}
            className={`h-[54px] w-[54px] rounded-xl text-lg font-black transition ${
              used.includes(v)
                ? 'bg-black/30 text-[#5d7568]'
                : 'bg-[#0f211a] text-[#80ed99] ring-2 ring-[#2f5a48] hover:brightness-125'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <button className={BTN_ALT} onClick={empty} disabled={!total}>{tr('Vaciar')}</button>
      <p className="text-xs text-[#9bb8a6]">
        {tr('Ronda {a} de {b}', { a: round + 1, b: ROUNDS })}{bad ? ' · ' + tr('fallos: {n}', { n: bad }) : ''}
      </p>
    </>
  );
}