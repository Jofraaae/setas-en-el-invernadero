import SettingRow from './SettingRow';
import RoleRow from './RoleRow';
import { tr, trMark } from '@/lib/i18n';

// Los ajustes de la partida, agrupados por lo que tocan: quién es impostor, qué roles se
// reparten, cómo van las reuniones y a qué ritmo se juega. Cada sección se lleva su bloque.
const SECTIONS = [
  {
    id: 'imps',
    title: trMark('Impostores'),
    hint: trMark('Cuántos hay y cada cuánto pueden actuar'),
    rows: [
      ['imps', trMark('Número de impostores'), trMark('Auto reparte 1, y 2 a partir de 7 jugadores')],
      ['killCd', trMark('Espera para eliminar')],
      ['sabCd', trMark('Apagón: espera del equipo')],
      ['reactorCd', trMark('Reactor: espera del equipo')],
    ],
  },
  {
    id: 'roles',
    title: trMark('Roles especiales'),
    hint: trMark('Se reparten al empezar: un rol por jugador'),
    roles: [
      { key: 'shifter', cd: 'shiftCd', name: trMark('Cambiaformas'), desc: trMark('Impostor que se hace pasar por otro'), cdLabel: trMark('Espera para cambiar de forma') },
      { key: 'viper', cd: 'rotSec', name: trMark('Víbora'), desc: trMark('Impostor: sus cuerpos se deshacen solos'), cdLabel: trMark('Tarda en desaparecer el cuerpo') },
      { key: 'spectre', cd: 'spectreCd', name: trMark('Espectro'), desc: trMark('Impostor que se vuelve invisible'), cdLabel: trMark('Espera de la invisibilidad') },
      { key: 'engineer', cd: 'engCd', name: trMark('Ingeniero'), desc: trMark('Tripulante que se mueve por las rejillas (15 s seguidas como máximo)'), cdLabel: trMark('Espera de rejilla') },
      { key: 'alerter', name: trMark('Alertador'), desc: trMark('Al caer, todos ven dónde está su cuerpo') },
      { key: 'judge', name: trMark('Juez'), desc: trMark('Su sentencia decide quién sale de la sala') },
      { key: 'angel', cd: 'angelCd', name: trMark('Ángel Guardián'), desc: trMark('Ya muerto, escuda a un tripulante'), cdLabel: trMark('Espera del escudo') },
      { key: 'scientist', cd: 'scientistCd', name: trMark('Científico'), desc: trMark('Tripulante: ve quién sigue vivo (25 s de batería por partida)'), cdLabel: trMark('Espera entre usos') },
      { key: 'detective', name: trMark('Detective'), desc: trMark('Tripulante: una consulta al terminar sus misiones') },
      { key: 'tracker', cd: 'trackerCd', name: trMark('Localizador'), desc: trMark('Tripulante: marca a alguien y lo ve en el mapa'), cdLabel: trMark('Espera tras acabarse'), extra: { key: 'trackerMs', label: trMark('Duración del localizador') } },
    ],
  },
  {
    id: 'meet',
    title: trMark('Reuniones'),
    hint: trMark('Cuánto duran y cuándo se puede convocar'),
    rows: [
      ['btnCd', trMark('Espera del botón de reunión')],
      ['meetSec', trMark('Tiempo de debate')],
      ['voteSec', trMark('Tiempo de votación')],
    ],
  },
  {
    id: 'game',
    title: trMark('Partida'),
    hint: trMark('Ritmo y tamaño del invernadero'),
    rows: [
      ['tasks', trMark('Tareas por jugador')],
      ['speed', trMark('Velocidad')],
      ['vision', trMark('Visión')],
    ],
  },
];

function fmt(k, v) {
  if (k === 'imps') return v === 0 ? tr('Auto') : String(v);
  if (k === 'tasks') return String(v);
  if (k === 'speed' || k === 'vision') return `${v}%`;
  return `${v} s`;
}

export default function LobbySettings({ lobby, isHost, onSetting }) {
  const S = lobby.settings;
  const R = lobby.ranges;

  return (
    <div className="w-full rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-4">
      <p className="text-center text-[13px] text-[#9bb8a6]">
        {tr('Ajustes de la partida')}
        <span className="ml-2 rounded-full bg-[#234036] px-2 py-0.5 text-[11px] font-bold text-[#e9c46a]">
          {isHost ? tr('Los controlas tú') : tr('Solo el anfitrión los cambia')}
        </span>
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {SECTIONS.map((sec) => (
          <section key={sec.id} className="rounded-xl border border-[#2f5a48] bg-[rgba(9,19,14,.35)] p-3">
            <h3 className="text-[12px] font-black uppercase tracking-[2px] text-[#e9c46a]">{tr(sec.title)}</h3>
            <p className="mb-2 text-[11px] text-[#7f9c8c]">{tr(sec.hint)}</p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] items-start gap-2">
              {sec.rows
                ? sec.rows.map(([k, label, hint]) => (
                  <SettingRow
                    key={k}
                    label={label}
                    hint={hint}
                    value={fmt(k, S[k])}
                    canDown={S[k] - R[k][2] >= R[k][0]}
                    canUp={S[k] + R[k][2] <= R[k][1]}
                    locked={!isHost}
                    onChange={(dir) => onSetting(k, S[k] + dir * R[k][2])}
                  />
                ))
                : sec.roles.map((r) => (
                  <RoleRow
                    key={r.key}
                    role={r}
                    on={!!S[r.key]}
                    cd={r.cd ? S[r.cd] : null}
                    cdStep={r.cd ? R[r.cd][2] : 0}
                    cdMin={r.cd ? R[r.cd][0] : 0}
                    cdMax={r.cd ? R[r.cd][1] : 0}
                    extra={r.extra ? {
                      label: r.extra.label,
                      value: `${S[r.extra.key]} s`,
                      canDown: S[r.extra.key] - R[r.extra.key][2] >= R[r.extra.key][0],
                      canUp: S[r.extra.key] + R[r.extra.key][2] <= R[r.extra.key][1],
                      onChange: (dir) => onSetting(r.extra.key, S[r.extra.key] + dir * R[r.extra.key][2]),
                    } : null}
                    locked={!isHost}
                    onToggle={(v) => onSetting(r.key, v)}
                    onCd={(v) => onSetting(r.cd, v)}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}