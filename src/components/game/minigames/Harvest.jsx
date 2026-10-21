import { useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';

const ROUNDS = 3;
const CELLS = 25;
const KINDS = [
  { name: 'rojas', color: '#e63946' },
  { name: 'verdes', color: '#80ed99' },
  { name: 'azules', color: '#4cc9f0' },
];

/* Tablero de una ronda: las tres variedades mezcladas y unos huecos vacíos.
   Cada ronda pide una variedad distinta y más setas que la anterior. */
function makeBoard(round) {
  const target = round % KINDS.length;
  const others = KINDS.map((_, i) => i).filter((i) => i !== target);
  const nTarget = 6 + round;
  const nOther = 4 + round;
  const kinds = [
    ...Array.from({ length: nTarget }, () => target),
    ...Array.from({ length: nOther }, () => others[Math.floor(Math.random() * others.length)]),
  ];
  const board = new Array(CELLS).fill(null);
  const where = shuffle(Array.from({ length: CELLS }, (_, i) => i)).slice(0, kinds.length);
  kinds.forEach((k, i) => { board[where[i]] = k; });
  return { target, board, nTarget };
}

export default function Harvest({ onFinish }) {
  const [round, setRound] = useState(0);
  const [data, setData] = useState(() => makeBoard(0));
  const [found, setFound] = useState(() => new Set());
  const [bad, setBad] = useState(0);
  const done = useRef(false);

  const pick = (i) => {
    if (done.current || data.board[i] === null || found.has(i)) return;
    if (data.board[i] !== data.target) { sfx('miss'); setBad((b) => b + 1); return; }
    sfx('blip');
    const n = new Set(found);
    n.add(i);
    setFound(n);
    if (n.size < data.nTarget) return;
    if (round === ROUNDS - 1) { done.current = true; onFinish(); return; }
    const r = round + 1;
    setRound(r);
    setData(makeBoard(r));
    setFound(new Set());
  };

  const kind = KINDS[data.target];

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">
        Recoge solo las setas <b style={{ color: kind.color }}>{kind.name}</b> ({found.size}/{data.nTarget}).
      </p>
      <div key={round} className={`grid grid-cols-5 gap-1.5 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {data.board.map((k, i) => (
          <button
            key={i}
            onClick={() => pick(i)}
            disabled={k === null}
            className={`flex h-[46px] w-[52px] items-center justify-center rounded-lg ring-2 transition ${
              k === null
                ? 'bg-black/25 ring-transparent'
                : found.has(i)
                  ? 'bg-[#0f211a] ring-[#80ed99]'
                  : 'bg-[#0f211a] ring-[#2f5a48] hover:brightness-125'
            }`}
          >
            {k === null ? null : found.has(i) ? (
              <span className="text-lg text-[#80ed99]">✔</span>
            ) : (
              <span
                className="block h-6 w-6 rounded-full"
                style={{ background: KINDS[k].color, boxShadow: 'inset 0 -3px 6px rgba(0,0,0,.35)' }}
              />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#9bb8a6]">
        Ronda {round + 1} de {ROUNDS}{bad ? ` · fallos: ${bad}` : ''}
      </p>
    </>
  );
}