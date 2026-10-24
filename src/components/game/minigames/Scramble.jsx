import { useMemo, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { BTN_ALT, shuffle } from './ui';

const WORDS = ['MICELIO', 'ESPORAS', 'SOMBRERO', 'LAMINAS', 'HONGO', 'BOSQUE', 'LUCIERNAGA', 'RAICES', 'CASCADA', 'MOLINO', 'ALDEA', 'CALDERO'];
const NEED = 2;

function scramble(w) {
  let a = shuffle(w.split(''));
  for (let k = 0; k < 6 && a.join('') === w; k++) a = shuffle(a);
  return a;
}

export default function Scramble({ onFinish }) {
  const words = useMemo(() => shuffle(WORDS).slice(0, NEED), []);
  const [i, setI] = useState(0);
  const word = words[i];
  const letters = useMemo(() => scramble(word), [word]);
  const [used, setUsed] = useState([]); // índices de letras ya puestas
  const [bad, setBad] = useState(0);

  const press = (k) => {
    if (used.includes(k)) return;
    sfx('click');
    const n = [...used, k];
    if (n.length < word.length) { setUsed(n); return; }
    if (n.map((x) => letters[x]).join('') === word) {
      sfx('blip');
      if (i === NEED - 1) { onFinish(); return; }
      setI(i + 1);
      setUsed([]);
    } else {
      sfx('miss');
      setBad((b) => b + 1);
      setUsed([]);
    }
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Ordena las letras para formar la palabra ({i + 1}/{NEED}).</p>
      <div key={bad} className={`flex min-h-[48px] flex-wrap justify-center gap-1.5 rounded-xl bg-[#0f211a] px-3 py-2 ring-2 ring-[#2f5a48] ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {word.split('').map((_, k) => (
          <span key={k} className="flex h-9 w-8 items-center justify-center rounded-lg bg-[#1a3027] text-lg font-black text-[#80ed99]">
            {used[k] !== undefined ? letters[used[k]] : ''}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {letters.map((l, k) => (
          <button
            key={k}
            onClick={() => press(k)}
            disabled={used.includes(k)}
            className="h-11 w-10 rounded-xl bg-[#e9c46a] text-lg font-black text-[#261c05] transition hover:brightness-110 disabled:opacity-25"
          >
            {l}
          </button>
        ))}
      </div>
      <button className={BTN_ALT} onClick={() => setUsed([])}>Borrar</button>
    </>
  );
}
