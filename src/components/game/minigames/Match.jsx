import { useMemo, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';
import { tr } from '@/lib/i18n';

export default function Match({ onFinish }) {
  const cols = useMemo(() => shuffle(['#e63946', '#4cc9f0', '#80ed99', '#e9c46a', '#9d4edd', '#f4a261']).slice(0, 6), []);
  const [right] = useState(() => shuffle(cols));
  const [sel, setSel] = useState(null); // { c, side }: la pareja se forma entre columnas
  const [fin, setFin] = useState([]);
  const [bad, setBad] = useState(0);
  // Dos toques en la misma columna no forman pareja: cada etiqueta se une con su
  // pareja de la otra columna (antes se podía completar tocando dos veces la misma).
  const pick = (c, side) => {
    sfx('click');
    if (!sel || sel.side === side) { setSel({ c, side }); return; }
    if (sel.c === c) {
      const next = [...fin, c];
      setFin(next);
      setSel(null);
      if (next.length === cols.length) onFinish();
    } else {
      setSel(null);
      setBad((b) => b + 1);
      sfx('miss');
    }
  };
  const square = (c, side, key) => (
    <button
      key={key}
      disabled={fin.includes(c)}
      onClick={() => pick(c, side)}
      className={`h-[46px] w-[62px] rounded-xl border-[3px] transition ${
        fin.includes(c) ? 'opacity-25' : sel && sel.c === c && sel.side === side ? 'border-white' : 'border-transparent hover:brightness-110'
      }`}
      style={{ background: c }}
    />
  );
  return (
    <>
      <p className="text-sm text-[#9bb8a6]">{tr('Une cada etiqueta de la izquierda con su pareja.')}</p>
      <div key={bad} className={`flex justify-center gap-10 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        <div className="flex flex-col gap-2.5">{cols.map((c) => square(c, 'l', `l${c}`))}</div>
        <div className="flex flex-col gap-2.5">{right.map((c) => square(c, 'r', `r${c}`))}</div>
      </div>
    </>
  );
}