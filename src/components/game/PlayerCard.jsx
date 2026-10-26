import MiniShroom from './MiniShroom';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

const KICK = 'rounded-lg bg-[#7b2c2c] px-2 py-0.5 text-[11px] font-bold text-[#ffd9d9] transition hover:brightness-125';
const BAN = 'rounded-lg bg-[#5a1f3a] px-2 py-0.5 text-[11px] font-bold text-[#ffc7e0] transition hover:brightness-125';

// Una plaza de la sala: la seta, su nombre y, si eres el anfitrión, las dos formas de
// echarlo: una vez (puede volver con el código) o de esta sala para siempre.
export default function PlayerCard({ player, me, host, isHost, onKick }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-[#234036] p-2 text-center text-sm">
      <MiniShroom color={player.color} size={44} />
      <b>
        {player.name}
        {me ? '\u00a0' + tr('(tú)') : ''}
        {host ? ' 👑' : ''}
      </b>
      {player.offline ? <span className="text-[11px] text-[#ff8a8a]">{tr('reconectando…')}</span> : null}
      {isHost && !me ? (
        <div className="mt-0.5 flex gap-1">
          <button className={KICK} onClick={() => { sfx('deny'); onKick(player.id, 'kick'); }}>{tr('Expulsar')}</button>
          <button className={BAN} onClick={() => { sfx('deny'); onKick(player.id, 'ban'); }}>{tr('Banear')}</button>
        </div>
      ) : null}
    </div>
  );
}