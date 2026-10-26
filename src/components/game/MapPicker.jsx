import { Image } from '@/components/ui/image';
import { MAPS } from '@/lib/game/maps';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

/* Elección de escenario: la hace el anfitrión antes de empezar, y todos la ven.
   El Invernadero viene marcado por defecto (lo decide la sala). */
export default function MapPicker({ current, isHost, onPick }) {
  return (
    <div className="w-full rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[12px] font-black uppercase tracking-[2px] text-[#e9c46a]">{tr('Escenario')}</h2>
        <span className="text-[11px] text-[#7f9c8c]">
          {isHost ? tr('Elige dónde se juega') : tr('Lo elige el anfitrión')}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        {MAPS.map((m) => {
          const sel = m.id === current;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={sel}
              onClick={() => {
                if (!isHost || sel) return;
                sfx('click');
                onPick(m.id);
              }}
              className={`overflow-hidden rounded-xl border-[3px] text-left transition ${
                sel ? 'border-[#e9c46a]' : 'border-white/10 opacity-75 hover:opacity-100'
              } ${isHost && !sel ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="relative h-[74px] w-full sm:h-[104px]">
                <Image src={m.thumb} alt={tr(m.name)} className="h-full w-full object-cover" fittingType="fill" />
                {sel ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-[#e9c46a] px-2 py-0.5 text-[10px] font-black tracking-wide text-[#261c05]">
                    {tr('ELEGIDO')}
                  </span>
                ) : null}
              </div>
              <div className="px-2.5 py-2">
                <div className={`text-[13px] font-extrabold ${sel ? 'text-[#e9c46a]' : 'text-[#eaf5ec]'}`}>
                  {tr(m.name)}
                </div>
                <div className="text-[11px] leading-snug text-[#9bb8a6]">{tr(m.blurb)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}