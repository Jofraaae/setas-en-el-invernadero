import MiniShroom from './MiniShroom';
import { tr } from '@/lib/i18n';

/* Elección de forma del shapeshifter: solo jugadores vivos, y solo cuando su espera ha
   terminado. El servidor valida igualmente a quién se puede imitar. */
export default function ShiftPicker({ players, loaded, onPick, onCancel }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-3.5 rounded-2xl border-2 border-[#3a0ca3] bg-[#1a3027] p-5">
        <h3 className="text-lg font-extrabold text-[#eaf5ec]">{tr('¿En quién te transformas?')}</h3>
        {!loaded ? (
          <p className="text-sm text-[#9bb8a6]">{tr('Buscando jugadores…')}</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-[#9bb8a6]">{tr('No hay nadie a quien imitar.')}</p>
        ) : (
          <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                className="flex flex-col items-center gap-0.5 rounded-xl bg-[#234036] p-2 text-center text-sm text-[#eaf5ec] transition hover:brightness-125"
                onClick={() => onPick(p.id)}
              >
                <MiniShroom color={p.color} size={40} />
                <b>{p.name}</b>
              </button>
            ))}
          </div>
        )}
        <button
          className="rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110"
          onClick={onCancel}
        >
          {tr('Cancelar')}
        </button>
      </div>
    </div>
  );
}