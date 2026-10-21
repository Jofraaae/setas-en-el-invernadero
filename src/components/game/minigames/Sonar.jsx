import { useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { randInt } from './ui';

const COLS = 6;
const ROWS = 6;
const CELLS = COLS * ROWS;
const NEED = 3;    // colonias escondidas: hay que dar con todas
const PROBES = 15; // sondas de un intento

// El color y los puntos dicen a qué distancia está la colonia más cercana.
const HEAT = [
  { bg: '#12303f', ring: '#2f6f8f', dots: 0, label: 'frío' },
  { bg: '#1b4a5c', ring: '#4cc9f0', dots: 1, label: 'tibio' },
  { bg: '#6d6022', ring: '#e9c46a', dots: 2, label: 'caliente' },
  { bg: '#8a4520', ring: '#f4a261', dots: 3, label: 'muy caliente' },
  { bg: '#6f2830', ring: '#e63946', dots: 3, label: '¡colonia!' },
];

function hideColony() {
  const set = new Set();
  while (set.size < NEED) set.add(randInt(CELLS));
  return [...set];
}

// Distancia de damero hasta la colonia más cercana: 0 encima, 1 muy cerca, 3 tibio, 4 o más frío.
function heatOf(colony, i) {
  const c = i % COLS;
  const r = Math.floor(i / COLS);
  let d = 9;
  for (const k of colony) d = Math.min(d, Math.max(Math.abs((k % COLS) - c), Math.abs(Math.floor(k / COLS) - r)));
  return d === 0 ? 4 : d === 1 ? 3 : d === 2 ? 2 : d === 3 ? 1 : 0;
}

export default function Sonar({ onFinish }) {
  const [colony, setColony] = useState(hideColony);
  const [probed, setProbed] = useState({});
  const [left, setLeft] = useState(PROBES);
  const [escapes, setEscapes] = useState(0);
  const found = colony.filter((k) => probed[k] === 4).length;

  const probe = (i) => {
    if (probed[i] !== undefined) return;
    const level = heatOf(colony, i);
    const next = { ...probed, [i]: level };
    const rest = left - 1;
    setProbed(next);
    setLeft(rest);
    if (colony.filter((k) => next[k] === 4).length === NEED) { sfx('blip'); onFinish(); return; }
    if (level === 4) sfx('taskOpen'); else sfx('click');
    // sin sondas la colonia se muda: la búsqueda vuelve a empezar desde cero
    if (rest <= 0) {
      sfx('miss');
      setEscapes((n) => n + 1);
      setColony(hideColony());
      setProbed({});
      setLeft(PROBES);
    }
  };

  return (
    <>
      <p className="text-center text-sm text-[#9bb8a6]">
        Suelta sondas hasta dar con las 3 colonias. El color y los puntos dicen lo cerca que estás.
      </p>
      <div className="flex w-full justify-between text-xs font-bold text-[#eaf5ec]">
        <span>
          Sondas <span className={left <= 4 ? 'text-[#e63946]' : 'text-[#e9c46a]'}>{left}</span>/{PROBES}
        </span>
        <span>
          Colonias <span className="text-[#80ed99]">{found}</span>/{NEED}
        </span>
      </div>
      <div key={escapes} className={`grid w-full grid-cols-6 gap-1.5 ${escapes ? 'animate-[shake_.25s]' : ''}`}>
        {Array.from({ length: CELLS }, (_, i) => {
          const lv = probed[i];
          const h = lv === undefined ? null : HEAT[lv];
          return (
            <button
              key={i}
              onClick={() => probe(i)}
              disabled={lv === 4}
              className="flex aspect-square items-center justify-center rounded-lg text-[13px] font-black leading-none tracking-widest transition hover:brightness-125"
              style={
                h
                  ? { background: h.bg, boxShadow: `inset 0 0 0 2px ${h.ring}`, color: h.ring }
                  : { background: '#0f211a', boxShadow: 'inset 0 0 0 2px #2f5a48' }
              }
            >
              {lv === 4 ? '🍄' : h ? '•'.repeat(h.dots) : ''}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-[#9bb8a6]">
        {HEAT.slice(0, 4).map((h) => (
          <span key={h.label} className="flex items-center gap-1">
            <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: h.ring }} />
            {h.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-[#9bb8a6]">
        {escapes
          ? `Se te han escapado ${escapes} ${escapes === 1 ? 'vez' : 'veces'}: la colonia se muda y hay que volver a buscarla.`
          : 'Si te quedas sin sondas, la colonia se muda y empiezas de nuevo.'}
      </p>
    </>
  );
}