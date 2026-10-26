import SettingRow from './SettingRow';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

const ON = 'rounded-full bg-[#3f7d5f] px-3 py-1 text-[12px] font-bold text-[#eaf5ec] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40';
const OFF = 'rounded-full bg-[#3a4a42] px-3 py-1 text-[12px] font-bold text-[#9bb8a6] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40';

// Un rol especial: su interruptor y, si está activo, su espera propia justo debajo.
export default function RoleRow({ role, on, cd, cdStep, cdMin, cdMax, extra, locked, onToggle, onCd }) {
  return (
    <div className="rounded-[10px] bg-[#234036] px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="leading-tight">
          <b>{tr(role.name)}</b>
          <span className="block text-[11px] text-[#7f9c8c]">{tr(role.desc)}</span>
        </span>
        <button
          className={on ? ON : OFF}
          onClick={() => { sfx('click'); onToggle(on ? 0 : 1); }}
          disabled={locked}
        >
          {on ? tr('Sí') : tr('No')}
        </button>
      </div>
      {on && role.cd ? (
        <div className="mt-1.5">
          <SettingRow
            label={role.cdLabel}
            value={`${cd} s`}
            canDown={cd - cdStep >= cdMin}
            canUp={cd + cdStep <= cdMax}
            locked={locked}
            onChange={(dir) => onCd(cd + dir * cdStep)}
          />
        </div>
      ) : null}
      {/* roles con dos números (el Localizador): el segundo ajuste va justo debajo */}
      {on && extra ? (
        <div className="mt-1.5">
          <SettingRow
            label={extra.label}
            value={extra.value}
            canDown={extra.canDown}
            canUp={extra.canUp}
            locked={locked}
            onChange={extra.onChange}
          />
        </div>
      ) : null}
    </div>
  );
}