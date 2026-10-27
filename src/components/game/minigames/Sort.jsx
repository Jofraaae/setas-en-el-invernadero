import { useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';
import { tr, trMark } from '@/lib/i18n';

const KINDS = [
  { name: trMark('rojiza'), color: '#e63946' },
  { name: trMark('verdosa'), color: '#80ed99' },
  { name: trMark('azulada'), color: '#4cc9f0' },
];
const TOTAL = 12;

function makeQueue() {
  const q = [];
  for (let i = 0; i < TOTAL; i++) q.push(i % KINDS.length);
  return shuffle(q);
}

export default function Sort({ onFinish }) {
  const [queue, setQueue] = useState(makeQueue);
  const [bad, setBad] = useState(0);
  const done = useRef(false);
  const cur = queue[0];

  const give = (k) => {
    if (done.current || cur === undefined) return;
    if (k !== cur) {
      sfx('miss');
      setBad((b) => b + 1);
      return;
    }
    sfx('blip');
    const rest = queue.slice(1);
    if (!rest.length) {
      done.current = true;
      onFinish();
      return;
    }
    setQueue(rest);
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">{tr('Cada seta va a su cesta. Acertar saca la siguiente de la caja.')}</p>
      <div key={bad} className={`flex w-full items-center justify-center gap-4 rounded-xl bg-black/20 px-4 py-3 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        <span className="text-xs font-bold text-[#9bb8a6]">{tr('SETAS')}<br />{tr('EN CAJA')}</span>
        <span className="text-3xl font-black text-[#eaf5ec]">{queue.length}</span>
        <span className="flex h-[64px] w-[64px] items-center justify-center rounded-2xl bg-[#0f211a] ring-2 ring-[#2f5a48]" style={{ boxShadow: 'inset 0 -6px 12px rgba(0,0,0,.35)' }}>
          <span
            className="block h-[38px] w-[38px] rounded-full"
            style={{ background: KINDS[cur].color, boxShadow: 'inset 0 -5px 9px rgba(0,0,0,.35)' }}
          />
        </span>
      </div>
      <div className="flex gap-2.5">
        {KINDS.map((k, i) => (
          <button
            key={k.name}
            onClick={() => give(i)}
            className="flex w-[94px] flex-col items-center gap-1.5 rounded-xl bg-[#0f211a] px-2 py-3 ring-2 ring-[#2f5a48] transition hover:brightness-125"
          >
            <span className="h-7 w-7 rounded-full" style={{ background: k.color }} />
            <span className="text-xs font-bold text-[#eaf5ec]">{tr(k.name)}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-[#9bb8a6]">
        {tr('{a} de {b} clasificadas', { a: TOTAL - queue.length, b: TOTAL })}{bad ? ' · ' + tr('fallos: {n}', { n: bad }) : ''}
      </p>
    </>
  );
}