import SettingRow from './SettingRow';
import RoleRow from './RoleRow';

// Los ajustes de la partida, agrupados por lo que tocan: quién es impostor, qué roles se
// reparten, cómo van las reuniones y a qué ritmo se juega. Cada sección se lleva su bloque.
const SECTIONS = [
  {
    id: 'imps',
    title: 'Impostores',
    hint: 'Cuántos hay y cada cuánto pueden actuar',
    rows: [
      ['imps', 'Número de impostores', 'Auto reparte 1, y 2 a partir de 7 jugadores'],
      ['killCd', 'Espera para eliminar'],
      ['sabCd', 'Apagón: espera del equipo'],
      ['reactorCd', 'Reactor: espera del equipo'],
    ],
  },
  {
    id: 'roles',
    title: 'Roles especiales',
    hint: 'Se reparten al empezar: un rol por jugador',
    roles: [
      { key: 'shifter', cd: 'shiftCd', name: 'Cambiaformas', desc: 'Impostor que se hace pasar por otro', cdLabel: 'Espera para cambiar de forma' },
      { key: 'viper', cd: 'rotSec', name: 'Víbora', desc: 'Impostor: sus cuerpos se deshacen solos', cdLabel: 'Tarda en desaparecer el cuerpo' },
      { key: 'spectre', cd: 'spectreCd', name: 'Espectro', desc: 'Impostor que se vuelve invisible', cdLabel: 'Espera de la invisibilidad' },
      { key: 'engineer', cd: 'engCd', name: 'Ingeniero', desc: 'Tripulante que se mueve por las rejillas (15 s seguidas como máximo)', cdLabel: 'Espera de rejilla' },
      { key: 'alerter', name: 'Alertador', desc: 'Al caer, todos ven dónde está su cuerpo' },
      { key: 'judge', name: 'Juez', desc: 'Su sentencia decide quién sale de la sala' },
      { key: 'angel', cd: 'angelCd', name: 'Ángel Guardián', desc: 'Ya muerto, escuda a un tripulante', cdLabel: 'Espera del escudo' },
      { key: 'scientist', cd: 'scientistCd', name: 'Científico', desc: 'Tripulante: ve quién sigue vivo (25 s de batería por partida)', cdLabel: 'Espera entre usos' },
      { key: 'detective', name: 'Detective', desc: 'Tripulante: una consulta al terminar sus misiones' },
      { key: 'tracker', cd: 'trackerCd', name: 'Localizador', desc: 'Tripulante: marca a alguien y lo ve en el mapa', cdLabel: 'Espera tras acabarse', extra: { key: 'trackerMs', label: 'Duración del localizador' } },
    ],
  },
  {
    id: 'meet',
    title: 'Reuniones',
    hint: 'Cuánto duran y cuándo se puede convocar',
    rows: [
      ['btnCd', 'Espera del botón de reunión'],
      ['meetSec', 'Tiempo de debate'],
      ['voteSec', 'Tiempo de votación'],
    ],
  },
  {
    id: 'game',
    title: 'Partida',
    hint: 'Ritmo y tamaño del invernadero',
    rows: [
      ['tasks', 'Tareas por jugador'],
      ['speed', 'Velocidad'],
      ['vision', 'Visión'],
    ],
  },
];

function fmt(k, v) {
  if (k === 'imps') return v === 0 ? 'Auto' : String(v);
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
        Ajustes de la partida
        <span className="ml-2 rounded-full bg-[#234036] px-2 py-0.5 text-[11px] font-bold text-[#e9c46a]">
          {isHost ? 'Los controlas tú' : 'Solo el anfitrión los cambia'}
        </span>
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {SECTIONS.map((sec) => (
          <section key={sec.id} className="rounded-xl border border-[#2f5a48] bg-[rgba(9,19,14,.35)] p-3">
            <h3 className="text-[12px] font-black uppercase tracking-[2px] text-[#e9c46a]">{sec.title}</h3>
            <p className="mb-2 text-[11px] text-[#7f9c8c]">{sec.hint}</p>
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