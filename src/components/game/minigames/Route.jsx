import { useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

const COLS = 5;
const ROWS = 4;
const IN = [0, ROWS - 1];                        // entrada: abajo a la izquierda
const OUT = [COLS - 1, 0];                       // salida: arriba a la derecha
const CHK = [[0, 0], [2, 1], [COLS - 1, ROWS - 1]]; // puntos de riego, por los que hay que pasar en este orden
const WAY = [IN, ...CHK, OUT];                   // recorrido completo que debe quedar conectado
const k = (c, r) => `${c},${r}`;
const FIXED = new Set([k(...IN), k(...OUT), ...CHK.map((c) => k(...c))]);

function reaches(cells, from, to) {
  const seen = new Set([k(...from)]);
  const q = [from];
  while (q.length) {
    const [c, r] = q.shift();
    if (c === to[0] && r === to[1]) return true;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const key = k(nc, nr);
      if (seen.has(key) || !cells.has(key)) continue;
      seen.add(key);
      q.push([nc, nr]);
    }
  }
  return false;
}

export default function Route({ onFinish }) {
  const [cells, setCells] = useState(FIXED);

  const toggle = (c, r) => {
    const key = k(c, r);
    if (FIXED.has(key)) return;
    sfx('click');
    const n = new Set(cells);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    setCells(n);
    // la ruta tiene que quedar conectada de principio a fin, pasando por cada punto
    if (n.has(key) && WAY.every((p, i) => i === WAY.length - 1 || reaches(n, p, WAY[i + 1]))) onFinish();
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">{tr('Toca las casillas para llevar el riego de la entrada a la salida, pasando por los dos puntos.')}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: COLS * ROWS }, (_, n) => {
          const c = n % COLS, r = Math.floor(n / COLS);
          const key = k(c, r);
          const on = cells.has(key);
          const label = key === k(...IN) ? tr('ENTRA') : key === k(...OUT) ? tr('SALE') : CHK.some((p) => k(...p) === key) ? '💧' : '';
          return (
            <button
              key={key}
              onClick={() => toggle(c, r)}
              className={`flex h-[50px] items-center justify-center rounded-lg text-[10px] font-black tracking-wide transition ${
                on ? 'bg-[#2f5a48] text-[#80ed99] ring-2 ring-[#80ed99]' : 'bg-[#0f211a] text-[#9bb8a6] ring-2 ring-[#2f5a48] hover:brightness-125'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}