import { useState } from 'react';
import RoomList from './RoomList';
import { sfx } from '@/lib/game/sound';

const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-3 font-bold text-[#261c05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const INPUT = 'w-full select-text rounded-xl border-2 border-[#2f5a48] bg-[#0f211a] px-3 py-3 text-[#eaf5ec] outline-none transition focus:border-[#e9c46a]';

export default function MenuScreen({ name, onName, code, onCode, onCreate, onJoin, onJoinRoom, error, busy }) {
  const [rooms, setRooms] = useState(false);

  return (
    <div
      className="absolute inset-0 z-20 flex overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="m-auto flex w-full flex-col items-center gap-4">
        <h1 className="text-center text-[clamp(26px,5vw,42px)] font-black tracking-tight text-[#eaf5ec]">
          🍄 Setas en el invernadero
        </h1>
        <p className="text-center text-[12px] font-semibold tracking-wide text-[#6f8c7c]">Made By: Jofre Morros Borràs</p>
        <p className="max-w-md text-center text-sm text-[#9bb8a6]">
          Deducción social multijugador · 4 a 15 jugadores · sala en línea
        </p>
        <div className="flex w-full max-w-[460px] flex-col gap-3 rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-5">
          <input
            className={INPUT}
            maxLength={12}
            placeholder="Tu nombre"
            autoComplete="off"
            value={name}
            onChange={(e) => onName(e.target.value)}
          />
          <button className={BTN} onClick={() => { sfx('click'); onCreate(); }} disabled={busy}>
            {busy ? 'Conectando…' : 'Crear sala'}
          </button>
          <button className={BTN_ALT} onClick={() => { sfx('click'); setRooms(true); }}>
            Ver salas activas
          </button>
          <div className="flex gap-3">
            <input
              className={`${INPUT} text-center tracking-[4px]`}
              style={{ textTransform: 'uppercase' }}
              maxLength={4}
              placeholder="CÓDIGO"
              autoComplete="off"
              value={code}
              onChange={(e) => onCode(e.target.value.toUpperCase())}
            />
            <button className={`${BTN_ALT} shrink-0`} onClick={() => { sfx('click'); onJoin(); }} disabled={busy}>
              Unirse
            </button>
          </div>
          <div className="min-h-[1.2em] text-sm text-[#ff8a8a]">{error}</div>
        </div>
        <p className="max-w-[460px] text-center text-[13px] text-[#9bb8a6]">
          Mueve con WASD / flechas (o el joystick táctil). E = usar, Q = eliminar, R = reportar, X = apagón, V = rejilla (impostor), I = interrogar (detective).
          Si se te cae la conexión, vuelve a entrar con el mismo código: recuperas tu sitio y tu rol.
        </p>
      </div>

      {rooms ? (
        <RoomList
          onJoin={(c) => { setRooms(false); onJoinRoom(c); }}
          onClose={() => setRooms(false)}
        />
      ) : null}
    </div>
  );
}