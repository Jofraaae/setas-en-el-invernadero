import MiniShroom from './MiniShroom';
import { tr } from '@/lib/i18n';
import { useCompact } from '@/lib/useCompact';

/* Animación privada de muerte: solo la ve el jugador eliminado.
   Muestra el personaje de quien le ha matado y su nombre. */
export default function DeathOverlay({ killer }) {
  const { compact } = useCompact();
  return (
    <div
      className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2"
      style={{
        background: 'radial-gradient(circle at 50% 44%, rgba(96,10,22,.72), rgba(8,3,5,.95) 68%)',
        animation: 'deathIn .3s ease-out',
      }}
    >
      <div style={{ animation: 'deathStrike 1s ease-out' }}>
        <MiniShroom color={killer.color} size={compact ? 64 : 104} />
      </div>
      <div
        className="px-4 text-center text-[clamp(20px,4.4vw,36px)] font-black text-[#ff8a95]"
        style={{ textShadow: '0 3px 14px rgba(0,0,0,.8)', animation: 'deathText .5s ease-out .18s both' }}
      >
        {tr('{name} te ha matado', { name: killer.name })}
      </div>
      <div
        className="text-sm font-bold tracking-wide text-[#c9a7ab]"
        style={{ animation: 'deathText .5s ease-out .5s both' }}
      >
        {tr('Ahora eres un fantasma: sigue con tus misiones')}
      </div>
    </div>
  );
}