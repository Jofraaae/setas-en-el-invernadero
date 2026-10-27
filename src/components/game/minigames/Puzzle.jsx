import { useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { randInt } from './ui';
import { tr } from '@/lib/i18n';

const N = 3;
const SOLVED = ['1', '2', '3', '4', '5', '6', '7', '8', '.'];
const GOAL = SOLVED.join('');

// Casillas que tocan a la del hueco: solo esas se pueden deslizar.
function near(i) {
  const r = Math.floor(i / N);
  const c = i % N;
  const out = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
}

// Se baraja moviendo el hueco al azar: el puzle siempre tiene solución.
function scramble() {
  let b;
  do {
    b = SOLVED.slice();
    let hole = 8;
    for (let i = 0; i < 44; i++) {
      const moves = near(hole);
      const to = moves[randInt(moves.length)];
      b[hole] = b[to];
      b[to] = '.';
      hole = to;
    }
  } while (b.join('') === GOAL);
  return b;
}

export default function Puzzle({ onFinish }) {
  const [board, setBoard] = useState(scramble);
  const [moves, setMoves] = useState(0);
  const done = useRef(false);

  const slide = (i) => {
    if (done.current || board[i] === '.') return;
    const hole = board.indexOf('.');
    if (!near(hole).includes(i)) {
      sfx('deny');
      return;
    }
    const next = board.slice();
    next[hole] = next[i];
    next[i] = '.';
    sfx('click');
    setBoard(next);
    setMoves((m) => m + 1);
    if (next.join('') === GOAL) {
      done.current = true;
      sfx('blip');
      onFinish();
    }
  };

  return (
    <>
      <p className="text-center text-sm text-[#9bb8a6]">
        {tr('Desliza los frascos al hueco vacío hasta dejarlos ordenados del 1 al 8.')}
      </p>
      <div className="grid w-full grid-cols-3 gap-2">
        {board.map((v, i) => {
          const hole = v === '.';
          const ok = v === String(i + 1);
          return (
            <button
              key={i}
              onClick={() => slide(i)}
              className={`flex aspect-square items-center justify-center rounded-xl text-3xl font-black transition hover:brightness-125 ${
                hole
                  ? 'border-2 border-dashed border-[#2f5a48] bg-black/40'
                  : ok
                    ? 'bg-[#2f5a48] text-[#80ed99] ring-2 ring-[#80ed99]'
                    : 'bg-[#1f4237] text-[#eaf5ec] ring-2 ring-[#2f5a48]'
              }`}
            >
              {hole ? '' : v}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[#9bb8a6]">
        {tr('Movimientos: {n} · los frascos ya colocados se marcan en verde', { n: moves })}
      </p>
    </>
  );
}