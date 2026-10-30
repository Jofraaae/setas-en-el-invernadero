import { Volume2, VolumeX } from 'lucide-react';
import { sfx, toggleMuted, useMuted } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';
import { useCompact } from '@/lib/useCompact';

/* Botón de sonido: está en todas las pantallas para poder silenciar el juego
   en cualquier momento (dentro de la partida o en los menús). */
export default function SoundToggle() {
  const muted = useMuted();
  const { compact } = useCompact();
  return (
    <button
      type="button"
      aria-label={muted ? tr('Activar sonido') : tr('Silenciar sonido')}
      title={muted ? tr('Activar sonido') : tr('Silenciar sonido')}
      onClick={() => { const m = toggleMuted(); if (!m) sfx('click'); }}
      className={`absolute z-40 flex items-center ${compact ? 'bottom-1.5 right-1.5 h-7 w-7' : 'bottom-2.5 right-2.5 h-10 w-10'} justify-center rounded-full border-2 border-white/[0.18] bg-[rgba(10,22,16,.78)] text-[#eaf5ec] transition hover:brightness-125`}
    >
      {muted ? <VolumeX size={compact ? 13 : 18} /> : <Volume2 size={compact ? 13 : 18} />}
    </button>
  );
}