import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { useLang, tr } from '@/lib/i18n';

/* Botón de idioma, arriba a la derecha y visible en todas las pantallas. */
/* En la partida (compact) se queda abajo a la derecha, junto al sonido, para no tapar los
   botones de acción del HUD; en el resto de pantallas va arriba a la derecha. */
export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, langs } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pick = (code) => {
    setLang(code);
    setOpen(false);
    // que las teclas del juego (WASD, E…) no se queden en el botón
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };

  return (
    <div ref={box} className={`absolute z-[60] ${compact ? 'bottom-2.5 right-14' : 'right-2.5 top-2.5'}`}>
      <button
        type="button"
        aria-label={tr('Idioma')}
        title={tr('Idioma')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => { setOpen((o) => !o); e.currentTarget.blur(); }}
        className={`flex h-10 items-center gap-1.5 rounded-full border-2 border-white/[0.18] bg-[rgba(10,22,16,.78)] text-[13px] font-bold uppercase text-[#eaf5ec] transition hover:brightness-125 ${compact ? 'w-10 justify-center px-0' : 'px-3'}`}
      >
        <Globe size={17} />
        {compact ? null : lang}
      </button>
      {open ? (
        <ul
          role="listbox"
          className={`absolute right-0 ${compact ? 'bottom-full mb-1.5' : 'mt-1.5'} max-h-[min(70vh,420px)] w-[190px] overflow-y-auto rounded-xl border-2 border-white/15 bg-[rgba(10,22,16,.96)] p-1 shadow-[0_8px_24px_rgba(0,0,0,.55)]`}
        >
          {langs.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button
                type="button"
                lang={l.code}
                onClick={() => pick(l.code)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-white/10 ${
                  l.code === lang ? 'font-extrabold text-[#e9c46a]' : 'text-[#eaf5ec]'
                }`}
              >
                <span>{l.name}</span>
                {l.code === lang ? <Check size={15} /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
