import SettingRow from './SettingRow';
import RoleRow from './RoleRow';
import { tr, trMark } from '@/lib/i18n';

// Los ajustes de la partida, ordenados por lo que tocan: impostores, roles de tripulante, roles de
// impostor, roles de fantasma, reuniones y ritmo. Cada rol lleva su cantidad (Sí/No y cuántos).
const CREW_ROLES = [
  { key: 'engineer', cd: 'engCd', name: trMark('Ingeniero'), desc: trMark('Se mueve por las rejillas (15 s seguidas como máximo)'), cdLabel: trMark('Espera de rejilla') },
  { key: 'alerter', name: trMark('Alertador'), desc: trMark('Al caer, todos ven dónde está su cuerpo') },
  { key: 'judge', name: trMark('Juez'), desc: trMark('Su sentencia decide quién sale de la sala') },
  { key: 'scientist', cd: 'scientistCd', name: trMark('Científico'), desc: trMark('Ve quién sigue vivo (25 s de batería por partida)'), cdLabel: trMark('Espera entre usos') },
  { key: 'detective', name: trMark('Detective'), desc: trMark('Una consulta al terminar sus misiones') },
  { key: 'tracker', cd: 'trackerCd', name: trMark('Localizador'), desc: trMark('Marca a alguien y lo ve en el mapa'), cdLabel: trMark('Espera tras acabarse'), extra: { key: 'trackerMs', label: trMark('Duración del localizador') } },
];
const IMP_ROLES = [
  { key: 'shifter', cd: 'shiftCd', name: trMark('Cambiaformas'), desc: trMark('Se hace pasar por otro jugador'), cdLabel: trMark('Espera para cambiar de forma') },
  { key: 'viper', cd: 'rotSec', name: trMark('Víbora'), desc: trMark('Sus cuerpos se deshacen solos'), cdLabel: trMark('Tarda en desaparecer el cuerpo') },
  { key: 'spectre', cd: 'spectreCd', name: trMark('Espectro'), desc: trMark('Se vuelve invisible'), cdLabel: trMark('Espera de la invisibilidad') },
];
const GHOST_CREW = [
  { key: 'angel', cd: 'angelCd', name: trMark('Ángel Guardián'), desc: trMark('Escuda a un tripulante vivo que tenga al lado'), cdLabel: trMark('Espera del escudo') },
  { key: 'lantern', name: trMark('Farol'), desc: trMark('Con un apagón ilumina a su alrededor'), extra: { key: 'lanternR', label: trMark('Radio de luz'), unit: '%' } },
  { key: 'keymaster', cd: 'keyCd', name: trMark('Guardallaves'), desc: trMark('Abre las puertas que cierra el impostor'), cdLabel: trMark('Espera para abrir otra puerta') },
];
const GHOST_IMP = [
  { key: 'blinder', cd: 'blindCd', name: trMark('Cegador'), desc: trMark('Ciega a un tripulante vivo que tenga al lado'), cdLabel: trMark('Espera para cegar'), extra: { key: 'blindSec', label: trMark('Duración de la ceguera') } },
];

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
    title: trMark('Roles en vida'),
    hint: trMark('Se reparten al empezar. Pon cuántos jugadores quieres de cada rol: nadie tiene dos'),
    groups: [
      { id: 'crew', tone: 'crew', title: trMark('Roles de tripulante'), roles: CREW_ROLES, limit: 'crew' },
      { id: 'imp', tone: 'imp', title: trMark('Roles de impostor'), roles: IMP_ROLES, limit: 'imp' },
    ],
  },
  {
    id: 'ghosts',
    title: trMark('Roles de fantasma'),
    hint: trMark('Cada jugador puede recibir uno en secreto, sea cual sea su rol en vida. Solo lo descubre al morir'),
    groups: [
      { id: 'gcrew', tone: 'crew', title: trMark('Fantasmas de tripulante'), roles: GHOST_CREW, limit: 'crew' },
      { id: 'gimp', tone: 'imp', title: trMark('Fantasmas de impostor'), roles: GHOST_IMP, limit: 'imp', note: trMark('Un impostor fantasma normal sigue pudiendo sabotear luces, reactor y puertas') },
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

const TONE = {
  crew: { bar: 'border-[#3f7d5f]', text: 'text-[#80ed99]', dot: 'bg-[#80ed99]' },
  imp: { bar: 'border-[#a8323d]', text: 'text-[#ff7b86]', dot: 'bg-[#ff7b86]' },
};

function fmt(k, v) {
  if (k === 'imps') return v === 0 ? tr('Auto') : String(v);
  if (k === 'tasks') return String(v);
  if (k === 'speed' || k === 'vision') return `${v}%`;
  return `${v} s`;
}

export default function LobbySettings({ lobby, isHost, onSetting }) {
  const S = lobby.settings;
  const R = lobby.ranges;
  // topes que fija la sala según sus jugadores de ahora (los roles de tripulante, tantos como
  // tripulantes; los de impostor, tantos como impostores); un servidor viejo no los manda
  const L = lobby.limits || { imps: 3, crew: 14, imp: 3, nImp: 1 };
  const limitOf = (kind) => Math.max(1, L[kind] ?? 1);

  const renderRow = ([k, label, hint]) => {
    const max = k === 'imps' ? Math.min(R[k][1], L.imps) : R[k][1];
    const v = k === 'imps' ? Math.min(S[k], max) : S[k];
    return (
      <SettingRow
        key={k}
        label={label}
        hint={hint}
        value={fmt(k, v)}
        canDown={v - R[k][2] >= R[k][0]}
        canUp={v + R[k][2] <= max}
        locked={!isHost}
        onChange={(dir) => onSetting(k, v + dir * R[k][2])}
      />
    );
  };

  const renderRole = (r, limit) => (
    <RoleRow
      key={r.key}
      role={r}
      count={Math.min(S[r.key], limit)}
      limit={limit}
      cd={r.cd ? S[r.cd] : null}
      cdStep={r.cd ? R[r.cd][2] : 0}
      cdMin={r.cd ? R[r.cd][0] : 0}
      cdMax={r.cd ? R[r.cd][1] : 0}
      extra={r.extra ? {
        label: r.extra.label,
        value: `${S[r.extra.key]}${r.extra.unit || ' s'}`,
        canDown: S[r.extra.key] - R[r.extra.key][2] >= R[r.extra.key][0],
        canUp: S[r.extra.key] + R[r.extra.key][2] <= R[r.extra.key][1],
        onChange: (dir) => onSetting(r.extra.key, S[r.extra.key] + dir * R[r.extra.key][2]),
      } : null}
      locked={!isHost}
      onCount={(n) => onSetting(r.key, Math.max(0, Math.min(n, limit)))}
      onCd={(v) => onSetting(r.cd, v)}
    />
  );

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
            {sec.rows ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] items-start gap-2">
                {sec.rows.map(renderRow)}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sec.groups.map((grp) => {
                  const tone = TONE[grp.tone];
                  const limit = limitOf(grp.limit);
                  return (
                    <div key={grp.id} className={`rounded-lg border-l-4 ${tone.bar} bg-[rgba(9,19,14,.3)] p-2.5`}>
                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                        <h4 className={`text-[12px] font-extrabold uppercase tracking-[1.5px] ${tone.text}`}>{tr(grp.title)}</h4>
                        <span className="text-[11px] text-[#7f9c8c]">
                          {tr('Hasta {n} de cada rol con los jugadores de ahora', { n: limit })}
                        </span>
                      </div>
                      {grp.note ? <p className="mb-1.5 text-[11px] text-[#9bb8a6]">{tr(grp.note)}</p> : null}
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] items-start gap-2">
                        {grp.roles.map((r) => renderRole(r, limit))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
