import { Volume2, VolumeX } from 'lucide-react';
import { sfx, toggleMuted, useMuted } from '@/lib/game/sound';

/* Botón de sonido: está en todas las pantallas para poder silenciar el juego
   en cualquier momento (dentro de la partida o en los menús). */
export default function SoundToggle() {
  const muted = useMuted();
  return (
    <button
      type="button"
      aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
      title={muted ? 'Activar sonido' : 'Silenciar sonido'}
      onClick={() => { const m = toggleMuted(); if (!m) sfx('click'); }}
      className="absolute bottom-2.5 right-2.5 z-40 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/[0.18] bg-[rgba(10,22,16,.78)] text-[#eaf5ec] transition hover:brightness-125"
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}