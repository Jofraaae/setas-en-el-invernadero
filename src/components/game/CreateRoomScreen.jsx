import { useState } from 'react';
import MapPicker from './MapPicker';
import { sfx } from '@/lib/game/sound';
import { tr, trMark } from '@/lib/i18n';

const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-3 font-bold text-[#261c05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const STEP = 'h-9 w-9 rounded-lg bg-[#2f5a48] text-lg font-black text-[#eaf5ec] transition hover:brightness-110 disabled:opacity-30';

const MIN = 4;
const MAX = 15;

const MODES = [
  { id: 'online', icon: '🌐', title: trMark('Sala online'), hint: trMark('Sale en el listado y entra quien tenga el código. También puedes añadir bots.') },
  { id: 'bots', icon: '🤖', title: trMark('Sala de bots'), hint: trMark('Privada: no sale en el listado y empieza con 5 bots (puedes quitarlos o añadir más).') },
];

/* Pantalla previa a crear la sala: aforo máximo, escenario y tipo de sala. */
export default function CreateRoomScreen({ busy, error, onCreate, onBack }) {
  const [cap, setCap] = useState(10);
  const [map, setMap] = useState('greenhouse');
  const [mode, setMode] = useState('online');

  return (
    <div
      className="absolute inset-0 z-30 flex overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="m-auto flex w-full max-w-[700px] flex-col items-center gap-3">
        <h1 className="text-center text-[clamp(22px,4.5vw,32px)] font-black text-[#eaf5ec]">{tr('Crear sala')}</h1>

        <div className="w-full rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-4">
          <h2 className="text-[12px] font-black uppercase tracking-[2px] text-[#e9c46a]">{tr('Máximo de jugadores')}</h2>
          <div className="mt-2 flex items-center gap-3">
            <button className={STEP} disabled={cap <= MIN} onClick={() => { sfx('click'); setCap((c) => Math.max(MIN, c - 1)); }} aria-label="-">−</button>
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={1}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
              className="flex-1 accent-[#e9c46a]"
            />
            <button className={STEP} disabled={cap >= MAX} onClick={() => { sfx('click'); setCap((c) => Math.min(MAX, c + 1)); }} aria-label="+">+</button>
            <b className="w-8 text-center text-xl text-[#e9c46a]">{cap}</b>
          </div>
          <p className="mt-1 text-[11px] text-[#7f9c8c]">{tr('Cuentan personas y bots. Mínimo {min} para empezar.', { min: MIN })}</p>
        </div>

        <MapPicker current={map} isHost onPick={setMap} />

        <div className="w-full rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-4">
          <h2 className="text-[12px] font-black uppercase tracking-[2px] text-[#e9c46a]">{tr('Tipo de sala')}</h2>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MODES.map((m) => {
              const sel = m.id === mode;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => { sfx('click'); setMode(m.id); }}
                  className={`rounded-xl border-[3px] p-3 text-left transition ${sel ? 'border-[#e9c46a] bg-[#234036]' : 'border-white/10 opacity-80 hover:opacity-100'}`}
                >
                  <div className={`text-[15px] font-extrabold ${sel ? 'text-[#e9c46a]' : 'text-[#eaf5ec]'}`}>{m.icon} {tr(m.title)}</div>
                  <div className="mt-1 text-[12px] leading-snug text-[#9bb8a6]">{tr(m.hint)}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[1.2em] text-sm text-[#ff8a8a]">{error}</div>
        <div className="flex gap-3">
          <button className={BTN_ALT} onClick={() => { sfx('back'); onBack(); }} disabled={busy}>{tr('Volver')}</button>
          <button className={BTN} onClick={() => { sfx('click'); onCreate({ cap, map, mode }); }} disabled={busy}>
            {busy ? tr('Conectando…') : tr('Crear sala')}
          </button>
        </div>
      </div>
    </div>
  );
}
