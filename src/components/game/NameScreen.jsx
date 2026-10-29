import { useEffect, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { cleanName, nameError, msUntilNameChange, formatWait, NAME_MAX, NAME_MIN } from '@/lib/game/profile';
import { tr, trNodes } from '@/lib/i18n';

const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-3 font-bold text-[#261c05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const INPUT = 'w-full select-text rounded-xl border-2 border-[#2f5a48] bg-[#0f211a] px-3 py-3 text-center text-lg font-bold text-[#eaf5ec] outline-none transition focus:border-[#e9c46a]';

/* Primera pantalla del juego: pide el nombre (y lo recuerda en este dispositivo). También sirve para
   cambiarlo: solo se puede una vez cada 5 días, y antes de guardar se pide confirmación. */
export default function NameScreen({ current, onSave, onCancel }) {
  const [value, setValue] = useState(current || '');
  const [confirming, setConfirming] = useState(false);
  const [wait, setWait] = useState(() => (current ? msUntilNameChange() : 0));

  // la cuenta atrás se actualiza sola si se deja la pantalla abierta
  useEffect(() => {
    if (!current) return undefined;
    const h = setInterval(() => setWait(msUntilNameChange()), 30000);
    return () => clearInterval(h);
  }, [current]);

  const name = cleanName(value);
  const bad = nameError(value);
  const locked = !!current && wait > 0;
  const same = !!current && name === current;

  const next = () => {
    if (bad || locked) return;
    if (same) { sfx('back'); onCancel(); return; }
    sfx('click');
    setConfirming(true);
  };

  return (
    <div
      className="absolute inset-0 z-40 flex overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="m-auto flex w-full max-w-[420px] flex-col items-center gap-4">
        <h1 className="flex items-center justify-center gap-3 text-center text-[clamp(26px,5vw,42px)] font-black tracking-tight text-[#eaf5ec]">
          <img src="/logo-seta.png" alt="" className="h-[1.6em] w-[1.6em] rounded-xl" style={{ imageRendering: 'pixelated' }} draggable={false} />
          {tr('Among Shrooms')}
        </h1>

        <div className="flex w-full flex-col gap-3 rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-5">
          {confirming ? (
            <>
              <h2 className="text-center text-lg font-extrabold text-[#eaf5ec]">{tr('¿Te llamas así?')}</h2>
              <div className="rounded-xl bg-[#0f211a] py-3 text-center text-2xl font-black text-[#e9c46a]">{name}</div>
              <p className="text-center text-sm text-[#9bb8a6]">
                {tr('No podrás cambiarlo hasta dentro de 5 días.')}
              </p>
              <button className={BTN} onClick={() => { sfx('click'); onSave(name); }}>{tr('Sí, guardar nombre')}</button>
              <button className={BTN_ALT} onClick={() => { sfx('back'); setConfirming(false); }}>{tr('Cambiarlo')}</button>
            </>
          ) : (
            <>
              <h2 className="text-center text-lg font-extrabold text-[#eaf5ec]">
                {current ? tr('Cambiar nombre') : tr('¿Cómo te llamas?')}
              </h2>
              <input
                className={INPUT}
                maxLength={NAME_MAX}
                placeholder={tr('Tu nombre')}
                autoComplete="off"
                autoFocus
                disabled={locked}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') next(); }}
              />
              {locked ? (
                <p className="text-center text-sm text-[#ffb36b]">
                  {trNodes('Podrás cambiar tu nombre dentro de {t}.', { t: <b>{formatWait(wait)}</b> })}
                </p>
              ) : (
                <p className="text-center text-[13px] text-[#9bb8a6]">
                  {tr('Entre {min} y {max} letras. Se guarda en este dispositivo y podrás cambiarlo cada 5 días.', { min: NAME_MIN, max: NAME_MAX })}
                </p>
              )}
              <button className={BTN} onClick={next} disabled={!!bad || locked}>{tr('Continuar')}</button>
              {current ? <button className={BTN_ALT} onClick={() => { sfx('back'); onCancel(); }}>{tr('Volver')}</button> : null}
            </>
          )}
        </div>
        <p className="text-center text-[12px] font-semibold tracking-wide text-[#6f8c7c]">{tr('Made By: Jofre Morros Borràs')}</p>
      </div>
    </div>
  );
}
