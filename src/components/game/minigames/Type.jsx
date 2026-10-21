import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { BTN, shuffle } from './ui';

const WORDS = ['SHIITAKE', 'PORTABELLO', 'MAITAKE', 'SHIMEJI', 'REISHI', 'BOLETUS', 'ENOKI', 'TRUFA NEGRA', 'PIE AZUL', 'NÍSCALO'];
const NEED = 3;

export default function Type({ onFinish }) {
  const words = useMemo(() => shuffle(WORDS).slice(0, NEED), []);
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [bad, setBad] = useState(0);
  const done = useRef(false);
  const inp = useRef(null);

  useEffect(() => { if (inp.current) inp.current.focus(); }, [i]);

  const check = () => {
    if (done.current) return;
    if (text.trim().toUpperCase() === words[i]) {
      sfx('blip');
      if (i === NEED - 1) { done.current = true; onFinish(); return; }
      setText('');
      setI(i + 1);
      return;
    }
    setText('');
    setBad((b) => b + 1);
    sfx('miss');
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Copia el nombre de cada variedad en su etiqueta.</p>
      <div className="rounded-xl bg-[#0f211a] px-4 py-3 text-xl font-black tracking-[2px] text-[#80ed99]">
        {words[i]}
      </div>
      <div className="flex w-full gap-2">
        <input
          ref={inp}
          value={text}
          placeholder={`Etiqueta ${i + 1} de ${NEED}`}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
          className={`w-full select-text rounded-xl border-2 bg-[#0f211a] px-3 py-3 text-[#eaf5ec] outline-none transition focus:border-[#e9c46a] ${bad ? 'border-[#e63946]' : 'border-[#2f5a48]'}`}
        />
        <button className={BTN} onClick={check}>OK</button>
      </div>
      {bad ? (
        <p key={bad} className="animate-[shake_.25s] text-xs font-bold text-[#ff8a8a]">No coincide, inténtalo otra vez.</p>
      ) : (
        <p className="text-xs text-[#9bb8a6]">Escribe el nombre y pulsa OK (o Enter).</p>
      )}
    </>
  );
}