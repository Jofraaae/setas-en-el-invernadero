import { useState } from 'react';
import { sfx } from '@/lib/game/sound';
import LobbyChat from './LobbyChat';
import PlayerCard from './PlayerCard';
import LobbySettings from './LobbySettings';
import MapPicker from './MapPicker';
import { tr, trMark } from '@/lib/i18n';

const SIDES = [
  { id: 'random', icon: '🎲', label: trMark('Aleatorio') },
  { id: 'impostor', icon: '🔪', label: trMark('Impostor') },
  { id: 'crew', icon: '🌱', label: trMark('Tripulante') },
];

const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-3 font-bold text-[#261c05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';

export default function LobbyScreen({ lobby, myId, onColor, onSetting, onMap, onStart, onLeave, onCopy, chat, onChat, onKick, onAddBots, onVis, onWant }) {
  const [nBots, setNBots] = useState(1);
  const bots = lobby.players.filter((p) => p.bot);
  const free = Math.max(0, lobby.max - lobby.players.length);
  const isHost = myId === lobby.hostId;
  const n = lobby.players.length;
  const mine = (lobby.players.find((p) => p.id === myId) || {}).color;
  const taken = new Set(lobby.players.map((p) => p.color));
  const maxImp = Math.max(1, Math.floor((n - 1) / 2));
  const want = lobby.settings.imps === 0 ? (n >= 7 ? 2 : 1) : lobby.settings.imps;
  const eff = Math.min(want, maxImp);

  return (
    <div
      className="absolute inset-0 z-20 flex overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="m-auto flex w-full max-w-[700px] flex-col items-center gap-3">
        {lobby.mode === 'bots' ? (
          <>
            <p className="text-[clamp(26px,6vw,36px)] font-black text-[#e9c46a]">🤖 {tr('Sala de bots')}</p>
            <span className="rounded-full bg-[#234036] px-3 py-1 text-[12px] font-bold text-[#bfe3cf]">
              {tr('🔒 Privada: nadie más puede entrar')}
            </span>
          </>
        ) : (
          <>
            <p className="text-sm text-[#9bb8a6]">{tr('Código de sala')}</p>
            <div className="text-[clamp(40px,10vw,56px)] font-black leading-none tracking-[10px] text-[#e9c46a]">
              {lobby.code}
            </div>
            <button className={BTN_ALT} onClick={() => { sfx('click'); onCopy(); }}>{tr('Copiar código / enlace')}</button>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[12px]">
              <span className="rounded-full bg-[#234036] px-3 py-1 font-bold text-[#bfe3cf]">
                {lobby.vis === 'private' ? tr('🔒 Privada: solo entra quien tenga el código') : tr('🌐 Pública: sale en Salas activas')}
              </span>
              {isHost ? (
                <button
                  className="rounded-lg bg-[#2f5a48] px-3 py-1 font-bold text-[#eaf5ec] transition hover:brightness-110"
                  onClick={() => { sfx('click'); onVis(lobby.vis === 'private' ? 'public' : 'private'); }}
                >
                  {lobby.vis === 'private' ? tr('Hacer pública') : tr('Hacer privada')}
                </button>
              ) : null}
            </div>

          </>
        )}

        {lobby.mode === 'bots' && isHost ? (
          <div className="w-full rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-4">
            <h2 className="text-[12px] font-black uppercase tracking-[2px] text-[#e9c46a]">{tr('Tu rol en la partida')}</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SIDES.map((o) => {
                const sel = (lobby.want || 'random') === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => { sfx('click'); onWant(o.id); }}
                    className={`rounded-xl border-[3px] px-2 py-2.5 text-center text-sm font-extrabold transition ${sel ? 'border-[#e9c46a] bg-[#234036] text-[#e9c46a]' : 'border-white/10 text-[#eaf5ec] opacity-80 hover:opacity-100'}`}
                  >
                    {o.icon} {tr(o.label)}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-[#7f9c8c]">{tr('Elige si quieres ser impostor, tripulante o dejarlo al azar. Los bots se reparten el resto.')}</p>
          </div>
        ) : null}

        <div className="w-full rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[12px] font-black uppercase tracking-[2px] text-[#e9c46a]">
              {tr('Jugadores')} · {n}/{lobby.max}
            </h2>
            <span className="text-[11px] text-[#7f9c8c]">{tr('Mínimo {min} para empezar', { min: lobby.min })}</span>
          </div>
          <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
            {lobby.players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                me={p.id === myId}
                host={p.id === lobby.hostId}
                isHost={isHost}
                onKick={onKick}
              />
            ))}
          </div>
          {isHost ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#234036] p-2">
              <span className="text-[12px] font-bold text-[#bfe3cf]">🤖 {tr('Bots')}</span>
              <button className="h-8 w-8 rounded-lg bg-[#2f5a48] font-black" disabled={nBots <= 1} onClick={() => { sfx('click'); setNBots(Math.max(1, nBots - 1)); }} aria-label="-">−</button>
              <b className="w-6 text-center">{Math.min(nBots, Math.max(1, free))}</b>
              <button className="h-8 w-8 rounded-lg bg-[#2f5a48] font-black" disabled={nBots >= free} onClick={() => { sfx('click'); setNBots(Math.min(Math.max(1, free), nBots + 1)); }} aria-label="+">+</button>
              <button
                className="rounded-lg bg-[#e9c46a] px-3 py-1.5 text-[13px] font-bold text-[#261c05] transition hover:brightness-110 disabled:opacity-40"
                disabled={free <= 0}
                onClick={() => { sfx('click'); onAddBots(Math.min(nBots, free)); }}
              >
                {tr('Añadir bots')}
              </button>
              {bots.length ? (
                <button
                  className="rounded-lg bg-[#7b2c2c] px-3 py-1.5 text-[12px] font-bold text-[#ffd9d9] transition hover:brightness-125"
                  onClick={() => { sfx('deny'); for (const b of bots) onKick(b.id, 'kick'); }}
                >
                  {tr('Quitar todos')}
                </button>
              ) : null}
            </div>
          ) : null}
          {isHost ? (
            <p className="mt-2 text-[11px] leading-relaxed text-[#7f9c8c]">
              <b className="text-[#ffb3b3]">{tr('Expulsar')}</b> {tr(': sale de la sala, pero puede volver con el código.')}
              {' '}<b className="text-[#ffc7e0]">{tr('Banear')}</b> {tr(': no puede volver a esta sala.')}
            </p>
          ) : null}

          <p className="mt-3 text-center text-[13px] text-[#9bb8a6]">{tr('Elige tu color')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {lobby.colors.map((c) => (
              <button
                key={c}
                onClick={() => { sfx('click'); onColor(c); }}
                disabled={taken.has(c) && c !== mine}
                className="h-[34px] w-[34px] rounded-full border-[3px] disabled:opacity-[0.18]"
                style={{ background: c, borderColor: c === mine ? '#fff' : 'transparent' }}
              />
            ))}
          </div>
        </div>

        <LobbyChat chat={chat} myId={myId} onSend={onChat} />

        <MapPicker current={lobby.map || 'greenhouse'} isHost={isHost} onPick={onMap} />

        <LobbySettings lobby={lobby} isHost={isHost} onSetting={onSetting} />

        <p className="text-center text-[13px] text-[#9bb8a6]">
          {n === 1 ? tr('Con 1 jugador habrá 1 impostor') : eff === 1 ? tr('Con {n} jugadores habrá 1 impostor', { n }) : tr('Con {n} jugadores habrá {eff} impostores', { n, eff })}
          {want > eff ? ' ' + tr('(el máximo con {n} jugadores)', { n }) : ''}
        </p>

        {isHost ? (
          <button className={BTN} onClick={() => { sfx('begin'); onStart(); }} disabled={n < lobby.min}>
            {tr('Empezar partida')}
          </button>
        ) : null}
        <p className="text-sm text-[#9bb8a6]">
          {n < lobby.min
            ? (lobby.min - n === 1 ? tr('Falta 1 jugador más (mínimo {min}, máximo {max}).', { min: lobby.min, max: lobby.max }) : tr('Faltan {k} jugadores más (mínimo {min}, máximo {max}).', { k: lobby.min - n, min: lobby.min, max: lobby.max }))
            : isHost ? tr('Todo listo. ¡Empieza cuando quieras!') : tr('Esperando a que el anfitrión empiece la partida…')}
        </p>
        <button className={BTN_ALT} onClick={() => { sfx('back'); onLeave(); }}>{tr('Salir')}</button>
        <p className="text-[12px] font-semibold tracking-wide text-[#6f8c7c]">{tr('Made By: Jofre Morros Borràs')}</p>
      </div>
    </div>
  );
}