import { sfx } from '@/lib/game/sound';

const STEP = 'rounded-lg bg-[#2f5a48] px-3 py-0.5 text-lg leading-tight text-[#eaf5ec] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-30';

// Una fila de ajuste: el nombre, su valor ya formateado y los botones de bajar y subir.
// El valor viaja como texto para que cada ajuste se muestre a su manera (segundos, %, Auto).
export default function SettingRow({ label, hint, value, canDown, canUp, locked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[10px] bg-[#234036] px-3 py-2 text-sm">
      <span className="leading-tight">
        {label}
        {hint ? <span className="block text-[11px] text-[#7f9c8c]">{hint}</span> : null}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <button className={STEP} onClick={() => { sfx('click'); onChange(-1); }} disabled={locked || !canDown}>−</button>
        <b className="min-w-[58px] text-center">{value}</b>
        <button className={STEP} onClick={() => { sfx('click'); onChange(1); }} disabled={locked || !canUp}>+</button>
      </div>
    </div>
  );
}