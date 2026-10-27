import { useMemo, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';
import { tr, trMark, trNodes } from '@/lib/i18n';

const COLORS = [
  { id: 'roja', n: trMark('rojas'), c: '#d9473f' },
  { id: 'violeta', n: trMark('violetas'), c: '#8a62c4' },
  { id: 'dorada', n: trMark('doradas'), c: '#e0a53a' },
];
const ROUNDS = 3;
const CELLS = 15;

function makeRound() {
  const target = COLORS[Math.floor(Math.random() * COLORS.length)];
  const n = 3 + Math.floor(Math.random() * 5); // entre 3 y 7 del color pedido
  const cells = shuffle([
    ...Array(n).fill(target.id),
    ...Array.from({ length: CELLS - n }, () => {
      const others = COLORS.filter((c) => c.id !== target.id);
      return others[Math.floor(Math.random() * others.length)].id;
    }),
  ]);
  const opts = new Set([n]);
  while (opts.size < 4) {
    const v = n + Math.floor(Math.random() * 7) - 3;
    if (v >= 1 && v <= 10) opts.add(v);
  }
  return { target, n, cells, opts: shuffle([...opts]) };
}

export default function Count({ onFinish }) {
  const [round, setRound] = useState(0);
  const [bump, setBump] = useState(0); // nueva cuadrícula tras fallar
  const [bad, setBad] = useState(0);
  const r = useMemo(makeRound, [round, bump]);
  const col = (id) => COLORS.find((c) => c.id === id).c;

  const pick = (v) => {
    if (v === r.n) {
      sfx('blip');
      if (round === ROUNDS - 1) { onFinish(); return; }
      setRound(round + 1);
    } else {
      sfx('miss');
      setBad((b) => b + 1);
      setBump((b) => b + 1);
    }
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">{trNodes('Cuenta las setas {color} ({a}/{b}).', { color: <b style={{ color: r.target.c }}>{tr(r.target.n)}</b>, a: round + 1, b: ROUNDS })}</p>
      <div key={bad} className={`grid grid-cols-5 gap-2 rounded-xl bg-[#0f211a] p-3 ring-2 ring-[#2f5a48] ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {r.cells.map((id, i) => (
          <span key={i} className="flex h-9 w-11 flex-col items-center justify-end">
            <span className="block h-5 w-9 rounded-t-full" style={{ background: col(id), boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.2)' }} />
            <span className="block h-3 w-3 rounded-b bg-[#e8dcbf]" />
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        {r.opts.map((v) => (
          <button key={v} onClick={() => pick(v)} className="h-11 w-12 rounded-xl bg-[#e9c46a] text-lg font-black text-[#261c05] transition hover:brightness-110">
            {v}
          </button>
        ))}
      </div>
    </>
  );
}
