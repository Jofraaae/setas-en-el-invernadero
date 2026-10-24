import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';

// Ingredientes de la aldea: se enseña la receta un momento y hay que recrearla de memoria.
const ING = [
  { id: 'seta', e: '🍄', n: 'Seta' },
  { id: 'hierba', e: '🌿', n: 'Hierba' },
  { id: 'miel', e: '🍯', n: 'Miel' },
  { id: 'rocio', e: '💧', n: 'Rocío' },
  { id: 'flor', e: '🌸', n: 'Flor' },
  { id: 'brasa', e: '🔥', n: 'Brasa' },
  { id: 'baya', e: '🫐', n: 'Baya' },
  { id: 'nuez', e: '🌰', n: 'Nuez' },
];
const SHOW_MS = 3600;

export default function Brew({ onFinish }) {
  const recipe = useMemo(() => shuffle(ING).slice(0, 3).map((i) => i.id), []);
  const board = useMemo(() => shuffle(ING), []);
  const [phase, setPhase] = useState('show'); // show | pick
  const [pot, setPot] = useState([]);
  const [bad, setBad] = useState(0);
  const done = useRef(false);
  const timer = useRef(0);

  const show = () => {
    setPhase('show');
    setPot([]);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase('pick'), SHOW_MS);
  };
  useEffect(() => { show(); return () => clearTimeout(timer.current); }, []);

  const add = (id) => {
    if (phase !== 'pick' || done.current || pot.includes(id)) return;
    sfx('click');
    const n = [...pot, id];
    setPot(n);
    if (n.length < 3) return;
    if (recipe.every((r) => n.includes(r))) { done.current = true; sfx('blip'); onFinish(); return; }
    sfx('miss');
    setBad((b) => b + 1);
    show(); // vuelve a enseñarte la receta
  };

  const by = (id) => ING.find((i) => i.id === id);
  return (
    <>
      <p className="text-sm text-[#9bb8a6]">
        {phase === 'show' ? 'Memoriza la receta…' : 'Echa al caldero los tres ingredientes.'}
      </p>
      <div key={bad} className={`flex h-[72px] items-center justify-center gap-3 rounded-xl bg-[#0f211a] px-4 ring-2 ring-[#2f5a48] ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {phase === 'show'
          ? recipe.map((id) => <span key={id} className="text-4xl">{by(id).e}</span>)
          : [0, 1, 2].map((i) => (
            <span key={i} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a3027] text-3xl ring-1 ring-[#2f5a48]">
              {pot[i] ? by(pot[i]).e : ''}
            </span>
          ))}
      </div>
      {phase === 'show' && (
        <div className="h-1.5 w-[220px] overflow-hidden rounded-full bg-[#2f5a48]">
          <div className="h-full rounded-full bg-[#e9c46a]" style={{ animation: `brewbar ${SHOW_MS}ms linear forwards` }} />
          <style>{'@keyframes brewbar{from{width:100%}to{width:0}}'}</style>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {board.map((i) => (
          <button
            key={i.id}
            onClick={() => add(i.id)}
            disabled={phase !== 'pick'}
            className={`flex h-[58px] w-[62px] flex-col items-center justify-center rounded-xl bg-[#0f211a] ring-2 transition hover:brightness-125 ${pot.includes(i.id) ? 'opacity-40 ring-[#e9c46a]' : 'ring-[#2f5a48]'}`}
          >
            <span className="text-2xl">{phase === 'pick' ? i.e : '❔'}</span>
            <span className="text-[10px] text-[#9bb8a6]">{phase === 'pick' ? i.n : ''}</span>
          </button>
        ))}
      </div>
    </>
  );
}
