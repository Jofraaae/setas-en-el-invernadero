import MiniShroom from './MiniShroom';
import { tr } from '@/lib/i18n';

export default function EndScreen({ end, isHost, onAgain }) {
  const crewWin = end.winner === 'crew';
  return (
    <div
      className="end-fade absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <h1 className="end-title text-center text-[clamp(22px,5vw,38px)] font-black tracking-tight">
        {crewWin
          ? <span className="text-[#80ed99]">{tr('¡Ganan los TRIPULANTES!')}</span>
          : <span className="text-[#ff7b86]">{tr('¡Ganan los IMPOSTORES!')}</span>}
      </h1>
      <div className="flex max-w-[640px] flex-wrap justify-center gap-2">
        {end.roles.map((r, i) => (
          <div
            key={r.id}
            className={`end-row flex flex-col items-center gap-0.5 rounded-xl bg-[#234036] p-2 text-center text-sm ${
              r.role === 'impostor' ? 'outline outline-2 outline-[#e63946]' : ''
            }`}
            style={{ animationDelay: `${0.65 + i * 0.08}s` }}
          >
            <MiniShroom color={r.color} size={44} dead={!r.alive} />
            <b>{r.name}</b>
            <span className={r.role === 'impostor' ? 'font-bold text-[#ff7b86]' : 'text-[#9bb8a6]'}>
              {r.role === 'impostor'
                ? (r.spectre ? tr('Impostor · Espectro') : r.viper ? tr('Impostor · Víbora') : r.shifter ? tr('Impostor · Cambiaformas') : tr('Impostor'))
                : (r.engineer ? tr('Tripulante · Ingeniero') : r.alerter ? tr('Tripulante · Alertador') : r.judge ? tr('Tripulante · Juez') : r.angel ? tr('Tripulante · Ángel Guardián') : r.scientist ? tr('Tripulante · Científico') : r.detective ? tr('Tripulante · Detective') : r.tracker ? tr('Tripulante · Localizador') : tr('Tripulante'))}
            </span>
          </div>
        ))}
      </div>
      {isHost ? (
        <button
          className="rounded-xl bg-[#e9c46a] px-4 py-3 font-bold text-[#261c05] transition hover:brightness-110"
          onClick={onAgain}
        >
          {tr('Volver a la sala')}
        </button>
      ) : null}
      <p className="text-[#9bb8a6]">{isHost ? '' : tr('Esperando a que el anfitrión vuelva a la sala…')}</p>
    </div>
  );
}