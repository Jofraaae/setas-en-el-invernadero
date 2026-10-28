import { useState } from 'react';
import RoomList from './RoomList';
import CreateRoomScreen from './CreateRoomScreen';
import NameScreen from './NameScreen';
import { msUntilNameChange, formatWait } from '@/lib/game/profile';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-3 font-bold text-[#261c05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const INPUT = 'w-full select-text rounded-xl border-2 border-[#2f5a48] bg-[#0f211a] px-3 py-3 text-[#eaf5ec] outline-none transition focus:border-[#e9c46a]';

export default function MenuScreen({ name, onSaveName, code, onCode, onCreate, onJoin, onJoinRoom, error, busy }) {
  const [rooms, setRooms] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const named = !!name.trim();
  const wait = named ? msUntilNameChange() : 0;

  return (
    <div
      className="absolute inset-0 z-20 flex overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="m-auto flex w-full flex-col items-center gap-4">
        <h1 className="text-center text-[clamp(26px,5vw,42px)] font-black tracking-tight text-[#eaf5ec]">
          {tr('🍄 Among Shrooms')}
        </h1>
        <p className="text-center text-[12px] font-semibold tracking-wide text-[#6f8c7c]">{tr('Made By: Jofre Morros Borràs')}</p>
        <p className="max-w-md text-center text-sm text-[#9bb8a6]">
          {tr('Deducción social multijugador · 4 a 15 jugadores · sala en línea')}
        </p>
        <div className="flex w-full max-w-[460px] flex-col gap-3 rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-5">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0f211a] px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[2px] text-[#7f9c8c]">{tr('Jugando como')}</div>
              <div className="truncate text-lg font-black text-[#e9c46a]">{name}</div>
            </div>
            <button
              className="shrink-0 rounded-lg bg-[#2f5a48] px-3 py-1.5 text-[12px] font-bold text-[#eaf5ec] transition hover:brightness-110"
              onClick={() => { sfx('click'); setRenaming(true); }}
              title={wait > 0 ? tr('Podrás cambiar tu nombre dentro de {t}.', { t: formatWait(wait) }) : ''}
            >
              {wait > 0 ? '🔒 ' : '✏️ '}{tr('Cambiar nombre')}
            </button>
          </div>
          <button className={BTN} onClick={() => { sfx('click'); setCreating(true); }} disabled={busy}>
            {tr('Crear sala')}
          </button>
          <button className={BTN_ALT} onClick={() => { sfx('click'); setRooms(true); }}>
            {tr('Ver salas activas')}
          </button>
          <div className="flex gap-3">
            <input
              className={`${INPUT} text-center tracking-[4px]`}
              style={{ textTransform: 'uppercase' }}
              maxLength={4}
              placeholder={tr('CÓDIGO')}
              autoComplete="off"
              value={code}
              onChange={(e) => onCode(e.target.value.toUpperCase())}
            />
            <button className={`${BTN_ALT} shrink-0`} onClick={() => { sfx('click'); onJoin(); }} disabled={busy}>
              {tr('Unirse')}
            </button>
          </div>
          <div className="min-h-[1.2em] text-sm text-[#ff8a8a]">{error}</div>
        </div>
        <p className="max-w-[460px] text-center text-[13px] text-[#9bb8a6]">
          {tr('Mueve con WASD / flechas (o el joystick táctil). E = usar, Q = eliminar, R = reportar, X = apagón, V = rejilla (impostor), I = interrogar (detective). Si se te cae la conexión, vuelve a entrar con el mismo código: recuperas tu sitio y tu rol.')}
        </p>
      </div>

      {!named || renaming ? (
        <NameScreen
          current={named ? name : ''}
          onSave={(n) => { onSaveName(n); setRenaming(false); }}
          onCancel={() => setRenaming(false)}
        />
      ) : null}

      {creating ? (
        <CreateRoomScreen
          busy={busy}
          error={error}
          onBack={() => setCreating(false)}
          onCreate={onCreate}
        />
      ) : null}

      {rooms ? (
        <RoomList
          onJoin={(c) => { setRooms(false); onJoinRoom(c); }}
          onClose={() => setRooms(false)}
        />
      ) : null}
    </div>
  );
}