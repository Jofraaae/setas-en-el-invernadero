import { sfx } from '@/lib/game/sound';
import LobbyChat from './LobbyChat';
import PlayerCard from './PlayerCard';
import LobbySettings from './LobbySettings';
import MapPicker from './MapPicker';
import { tr } from '@/lib/i18n';

const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-3 font-bold text-[#261c05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';

export default function LobbyScreen({ lobby, myId, onColor, onSetting, onMap, onStart, onLeave, onCopy, chat, onChat, onKick }) {
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
        <p className="text-sm text-[#9bb8a6]">{tr('Código de sala')}</p>
        <div className="text-[clamp(40px,10vw,56px)] font-black leading-none tracking-[10px] text-[#e9c46a]">
          {lobby.code}
        </div>
        <button className={BTN_ALT} onClick={() => { sfx('click'); onCopy(); }}>{tr('Copiar código / enlace')}</button>

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