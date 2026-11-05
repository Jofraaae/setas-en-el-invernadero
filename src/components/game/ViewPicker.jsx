import { useEffect, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { storedView, saveView, VIEW_EVENT } from '@/lib/game/profile';
import { tr, trMark } from '@/lib/i18n';

/* Cómo ves la partida: desde arriba (normal) o en primera persona (3D). Es solo cosa tuya: se guarda en
   este dispositivo y los demás jugadores no notan nada. */

const VIEWS = [
  { id: 'normal', icon: '🗺️', label: trMark('Normal') },
  { id: 'fp', icon: '👁️', label: trMark('Primera persona') },
];

export default function ViewPicker() {
  const [view, setView] = useState(storedView);
  useEffect(() => {
    const on = (e) => setView(e.detail === 'fp' ? 'fp' : 'normal');
    window.addEventListener(VIEW_EVENT, on);
    return () => window.removeEventListener(VIEW_EVENT, on);
  }, []);
  return (
    <div data-view-picker>
      <h3 className="text-[11px] font-black uppercase tracking-[2px] text-[#e9c46a]">{tr('Vista')}</h3>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {VIEWS.map((o) => {
          const sel = view === o.id;
          return (
            <button
              key={o.id}
              type="button"
              data-view={o.id}
              aria-pressed={sel}
              onClick={() => { sfx('click'); setView(saveView(o.id)); }}
              className={`rounded-xl border-[3px] px-1.5 py-1.5 text-center text-[12px] font-extrabold leading-tight transition ${sel ? 'border-[#e9c46a] bg-[#234036] text-[#e9c46a]' : 'border-white/10 text-[#eaf5ec] opacity-80 hover:opacity-100'}`}
            >
              {o.icon} {tr(o.label)}
            </button>
          );
        })}
      </div>
      {view === 'fp' ? <p className="mt-1 text-[10px] leading-snug text-[#7f9c8c]">{tr('Primera persona (demo): ratón o dedo para mirar, WASD o joystick para moverte.')}</p> : null}
    </div>
  );
}
