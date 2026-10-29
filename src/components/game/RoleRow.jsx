import SettingRow from './SettingRow';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

const ON = 'rounded-full bg-[#3f7d5f] px-3 py-1 text-[12px] font-bold text-[#eaf5ec] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40';
const OFF = 'rounded-full bg-[#3a4a42] px-3 py-1 text-[12px] font-bold text-[#9bb8a6] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40';
const STEP = 'rounded-md bg-[#2f5a48] px-2 text-base leading-tight text-[#eaf5ec] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-30';

// Un rol: su interruptor Sí/No, al lado cuántos jugadores lo tendrán y, si está activo, sus esperas
// y tiempos propios justo debajo. `count` ya llega recortado al tope de jugadores de la sala.
export default function RoleRow({ role, count, limit, cd, cdStep, cdMin, cdMax, extra, locked, onCount, onCd }) {
  const on = count > 0;
  return (
    <div className="rounded-[10px] bg-[#234036] px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="leading-tight">
          <b>{tr(role.name)}</b>
          <span className="block text-[11px] text-[#7f9c8c]">{tr(role.desc)}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {on ? (
            <div className="flex items-center gap-1" title={tr('Cuántos jugadores tendrán este rol')}>
              <button className={STEP} onClick={() => { sfx('click'); onCount(count - 1); }} disabled={locked}>−</button>
              <b className="min-w-[22px] text-center tabular-nums">{count}</b>
              <button className={STEP} onClick={() => { sfx('click'); onCount(count + 1); }} disabled={locked || count >= limit}>+</button>
            </div>
          ) : null}
          <button
            className={on ? ON : OFF}
            onClick={() => { sfx('click'); onCount(on ? 0 : 1); }}
            disabled={locked}
          >
            {on ? tr('Sí') : tr('No')}
          </button>
        </div>
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
      {/* roles con otro ajuste más (Localizador, Cegador, Farol): va justo debajo */}
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
