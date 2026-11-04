import { useMemo, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { CATEGORIES, hasLook } from '@/lib/game/cosmetics';
import LookView, { FOCUS } from './LookView';
import { tr } from '@/lib/i18n';

/* El armario: pestañas por categoría. "Colores" es el selector de siempre; las demás eligen un
   accesorio por categoría (o ninguno) y se pueden combinar. Todo está disponible para todos.
   El aspecto vive en el padre (look + onLook); aquí solo se muestra y se pide cambiarlo. */

const TAB = 'shrink-0 rounded-xl border-2 px-2.5 py-1.5 text-[13px] font-extrabold transition';

export default function Wardrobe({ colors, taken, mine, look, onColor, onLook }) {
  const [tab, setTab] = useState('color');
  const cat = useMemo(() => CATEGORIES.find((c) => c.id === tab) || CATEGORIES[0], [tab]);
  const worn = (id) => (look || {})[id];
  const pick = (slot, id) => {
    sfx('click');
    const next = { ...(look || {}) };
    if (!id || next[slot] === id) delete next[slot]; // volver a pulsar el puesto lo quita
    else next[slot] = id;
    onLook(next);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* vista previa: lo que llevas puesto, en vivo */}
      <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl bg-[#1a3027] p-3 sm:w-[190px]">
        <div className="rounded-xl bg-[radial-gradient(circle_at_50%_40%,#2f5a48,#17302a)] p-1">
          <LookView look={look} color={mine || '#fff'} size={168} animate label={tr('Tu seta')} />
        </div>
        <button
          type="button"
          className="rounded-lg bg-[#7b2c2c] px-3 py-1 text-[12px] font-bold text-[#ffd9d9] transition hover:brightness-125 disabled:opacity-35"
          disabled={!hasLook(look)}
          onClick={() => { sfx('deny'); onLook({}); }}
        >
          {tr('Quitar todo')}
        </button>
        <ul className="w-full text-[11px] leading-tight text-[#9bb8a6]">
          {CATEGORIES.filter((c) => c.items).map((c) => {
            const it = c.items.find((i) => i.id === worn(c.id));
            return (
              <li key={c.id} className="flex justify-between gap-2">
                <span>{tr(c.name)}</span>
                <span className={it ? 'font-bold text-[#e9c46a]' : 'opacity-50'}>{it ? tr(it.name) : '—'}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* pestañas */}
        <div role="tablist" className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => {
            const sel = c.id === tab;
            const has = c.items && worn(c.id);
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={sel}
                data-tab={c.id}
                onClick={() => { sfx('click'); setTab(c.id); }}
                className={`${TAB} ${sel ? 'border-[#e9c46a] bg-[#234036] text-[#e9c46a]' : 'border-white/10 bg-[#1a3027] text-[#eaf5ec] opacity-85 hover:opacity-100'}`}
              >
                {c.icon} {tr(c.name)}{has ? <span className="ml-1 text-[#9ef0b8]">●</span> : null}
              </button>
            );
          })}
        </div>

        {/* contenido de la pestaña */}
        {cat.id === 'color' ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <p className="text-sm text-[#9bb8a6]">{tr('Elige tu color')}</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => { sfx('click'); onColor(c); }}
                  disabled={taken.has(c) && c !== mine}
                  aria-label={c}
                  className="h-10 w-10 rounded-full border-[3px] transition hover:scale-110 disabled:opacity-[0.18] disabled:hover:scale-100"
                  style={{ background: c, borderColor: c === mine ? '#fff' : 'transparent' }}
                />
              ))}
            </div>
            <p className="text-[11px] text-[#7f9c8c]">{tr('Los colores que ya lleva otro jugador salen apagados.')}</p>
          </div>
        ) : (
          <div role="tabpanel" className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-panel={cat.id}>
            <button
              type="button"
              aria-pressed={!worn(cat.id)}
              data-item="none"
              onClick={() => pick(cat.id, null)}
              className={`flex h-[104px] flex-col items-center justify-center gap-1 rounded-xl border-[3px] text-[12px] font-extrabold transition ${!worn(cat.id) ? 'border-[#e9c46a] bg-[#234036] text-[#e9c46a]' : 'border-white/10 bg-[#1a3027] text-[#eaf5ec] opacity-85 hover:opacity-100'}`}
            >
              <span className="text-2xl">🚫</span>
              {tr('Ninguno')}
            </button>
            {cat.items.map((it) => {
              const sel = worn(cat.id) === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  aria-pressed={sel}
                  data-item={it.id}
                  onClick={() => pick(cat.id, it.id)}
                  className={`relative flex h-[104px] flex-col items-center justify-between rounded-xl border-[3px] px-1 pb-1.5 pt-1 text-center text-[11px] font-extrabold leading-tight transition ${sel ? 'border-[#e9c46a] bg-[#234036] text-[#e9c46a] shadow-[0_0_0_2px_rgba(233,196,106,.25)]' : 'border-white/10 bg-[#1a3027] text-[#eaf5ec] opacity-90 hover:opacity-100 hover:brightness-110'}`}
                >
                  <LookView look={{ [cat.id]: it.id }} color={mine || '#b9a98a'} size={62} focus={FOCUS[cat.id === 'hat' || cat.id === 'head' ? 'top' : cat.id]} />
                  <span>{tr(it.name)}</span>
                  {sel ? <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#e9c46a] text-[10px] text-[#261c05]">✓</span> : null}
                </button>
              );
            })}
          </div>
        )}
        {cat.id !== 'color' ? (
          <p className="text-[11px] text-[#7f9c8c]">{tr('Un accesorio por categoría; pulsa otra vez para quitarlo. Todo es gratis y combinable.')}</p>
        ) : null}
      </div>
    </div>
  );
}
