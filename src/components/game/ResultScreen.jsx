import MiniShroom from './MiniShroom';
import JudgeResultScreen from './JudgeResultScreen';
import { tr } from '@/lib/i18n';

export default function ResultScreen({ result, roster }) {
  if (result.judge) return <JudgeResultScreen result={result} roster={roster} />;
  const e = result.ejected;
  const groups = {};
  for (const v of result.votes) {
    const key = v.to;
    groups[key] = groups[key] || [];
    groups[key].push((roster.get(v.from) || {}).name || '?');
  }
  const sub = e
    ? e.wasImpostor ? tr('{name} era un IMPOSTOR', { name: e.name }) : tr('{name} NO era un impostor', { name: e.name })
    : result.tie ? tr('Hubo un empate.') : tr('La mayoría saltó la votación.');

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="flex h-[90px] w-full items-center justify-center overflow-hidden">
        {e ? (
          <div style={{ animation: 'eject 3.4s ease-in forwards' }}>
            <MiniShroom color={e.color} size={80} />
          </div>
        ) : null}
      </div>
      <h2 className="text-center text-2xl font-extrabold text-[#eaf5ec]">
        {e ? tr('Han expulsado a {name}', { name: e.name }) : tr('Nadie ha sido expulsado')}
      </h2>
      <p className="text-center text-lg text-[#9bb8a6]">{sub}</p>
      <div className="text-center text-sm leading-relaxed text-[#9bb8a6]">
        {Object.entries(groups).map(([to, from]) => (
          <div key={to}>
            <b>{to === 'skip' ? tr('Saltar') : (roster.get(to) || {}).name || '?'}</b> ← {from.join(', ')}
          </div>
        ))}
      </div>
    </div>
  );
}