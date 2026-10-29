import { useEffect, useState } from 'react';
import { contextOf } from '@/lib/game/context';
import VentBar from '@/components/game/VentBar';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

// Los botones actúan al TOCARLOS, no al soltar. Con el joystick pulsado con un dedo, el navegador
// no genera el "click" del segundo dedo (lo toma por parte de un gesto de varios dedos), así que
// antes no se podía matar, reportar ni usar nada mientras andabas. El click solo se acepta cuando
// viene del teclado (detail 0), para no disparar dos veces.
const tap = (fn) => ({
  onPointerDown: (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.currentTarget.disabled) return;
    e.preventDefault();
    fn();
  },
  onClick: (e) => { if (e.detail === 0) fn(); },
});

export default function Hud({ g, tasks, doneIds, onMap, onUse, onKill, onRep, onSab, onReactor, onVent, onVentTo, onShift, onInvis, onGuard, onBlind, onSci, onInterro, onTrack }) {
  const [, force] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => force((n) => n + 1), 140);
    return () => clearInterval(iv);
  }, []);

  const c = contextOf(g);
  const st = g.st;
  const isImp = g.role === 'impostor';
  const dead = !g.me.alive;
  const morph = !!(st.form && st.form.morph); // transformación en curso: quieto, pero sin contar como congelado
  const frz = st.fz > 0 || morph;
  const engineer = !!g.engineer;
  const scientist = !!g.scientist;
  const detective = !!g.detective;
  const tracker = !!g.tracker;
  const trk = st.trk; // jugador que llevas marcado con el localizador (si hay uno activo)
  const trkName = trk ? ((g.roster.get(trk.id) || {}).name || '???') : '';
  // el Detective solo puede interrogar con todas sus misiones terminadas
  const allTasks = tasks.length > 0 && tasks.every((t) => doneIds.includes(t.id));
  const useLabel = c.hold
    ? tr(c.hold.mine ? 'SOLTAR {name} [E]' : 'MANTENER {name} [E]', { name: tr(c.hold.name).toUpperCase() })
    : c.panel ? tr('ARREGLAR LUCES [E]')
      : c.task ? tr('TAREA [E]')
        : c.btn ? tr('REUNIÓN [E]')
          : c.atBtn && c.btnCd > 0 ? tr('REUNIÓN ({s})', { s: Math.ceil(c.btnCd / 1000) })
            : c.atBtn ? (c.meetUsed ? tr('YA USASTE TU REUNIÓN') : tr('REUNIÓN BLOQUEADA'))
              : tr('USAR [E]');
  const canUse = !frz && !(st.bl > 0 && !dead) && !!(c.hold || c.panel || c.task || c.btn);
  const meetBlocked = c.meetBlocked;
  const ghost = g.ghost || ''; // rol de fantasma: solo se conoce una vez muerto
  const angel = ghost === 'angel';
  const blinder = ghost === 'blinder';
  const keymaster = ghost === 'keymaster';
  const lantern = ghost === 'lantern';
  const GHOST_NAME = { angel: tr('ÁNGEL GUARDIÁN'), lantern: tr('FAROL'), keymaster: tr('GUARDALLAVES'), blinder: tr('CEGADOR') };
  // El Ángel solo puede escudar a quien tenga al lado; el servidor comprueba además que
  // sea un tripulante vivo, así que aquí basta con mirar quién anda cerca.
  const nearCrew = angel && [...g.others].some(([, o]) => o.alive && Math.hypot(o.tx - g.me.x, o.ty - g.me.y) <= g.cfg.useRange);
  // el Cegador necesita un tripulante vivo cerca (el servidor comprueba además que no sea un impostor)
  const nearBlind = blinder && [...g.others].some(([id, o]) => o.alive && !o.bl && !g.mates.includes(id) && Math.hypot(o.tx - g.me.x, o.ty - g.me.y) <= (g.cfg.blindRange || 130));

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute left-2.5 top-2.5 flex min-w-[190px] flex-col items-start gap-2">
        <div className="w-full rounded-xl bg-[rgba(10,22,16,.78)] px-3 py-2.5 text-sm leading-relaxed text-[#eaf5ec]">
          <b>{isImp ? tr('Tareas (falsas)') : tr('Tareas')}</b>
          {tasks.map((t) => {
            const ok = doneIds.includes(t.id);
            return (
              <div key={t.id} className={ok ? 'text-[#80ed99] line-through opacity-80' : ''}>
                {ok ? '✔' : '•'} {tr(t.name)}
              </div>
            );
          })}
          <div className="mt-2 h-4 w-full overflow-hidden rounded-[10px] bg-[rgba(10,22,16,.78)]">
            <div
              className="h-full transition-[width] duration-300"
              style={{ width: `${st.prog * 100}%`, background: 'linear-gradient(90deg,#4cc9f0,#80ed99)' }}
            />
          </div>
        </div>

        <div className="rounded-full bg-[rgba(10,22,16,.78)] px-3 py-1.5 font-extrabold">
          <span style={{ color: dead ? '#9bb8a6' : isImp ? '#ff7b86' : '#80ed99' }}>
            {dead
              ? (GHOST_NAME[ghost] ? `${tr('FANTASMA')} · ${GHOST_NAME[ghost]}` : isImp ? tr('FANTASMA · IMPOSTOR') : tr('FANTASMA'))
              : isImp
                ? (g.spectre ? tr('IMPOSTOR · ESPECTRO') : g.viper ? tr('IMPOSTOR · VÍBORA') : g.shifter ? tr('IMPOSTOR · CAMBIAFORMAS') : tr('IMPOSTOR'))
                : (engineer ? tr('TRIPULANTE · INGENIERO') : g.alerter ? tr('TRIPULANTE · ALERTADOR') : g.judge ? tr('TRIPULANTE · JUEZ') : scientist ? tr('TRIPULANTE · CIENTÍFICO') : detective ? tr('TRIPULANTE · DETECTIVE') : tracker ? tr('TRIPULANTE · LOCALIZADOR') : tr('TRIPULANTE'))}
          </span>
        </div>
        {/* segundos que quedan de la transformación y de la congelación, justo debajo del rol */}
        {st.form ? (
          <div className="rounded-full bg-[rgba(58,12,163,.85)] px-3 py-1.5 text-[12px] font-bold text-[#e7d6ff]">
            {morph
              ? tr('Transformándose…')
              : tr('Forma de {name} · {s}s', { name: (g.roster.get(st.form.id) || {}).name || '???', s: Math.ceil(st.form.left / 1000) })}
          </div>
        ) : null}
        {st.fz > 0 ? (
          <div className="rounded-full bg-[rgba(10,22,16,.9)] px-3 py-1.5 text-[12px] font-bold text-[#ffd60a]">
            {tr('Congelado · {s}s', { s: Math.ceil(st.fz / 1000) })}
          </div>
        ) : null}
        {st.inv > 0 ? (
          <div className="rounded-full bg-[rgba(40,10,60,.85)] px-3 py-1.5 text-[12px] font-bold text-[#d7c4ff]">
            {tr('Invisible · {s}s', { s: Math.ceil(st.inv / 1000) })}
          </div>
        ) : null}
        {st.bl > 0 && !dead ? (
          <div className="rounded-full bg-[rgba(60,40,100,.92)] px-3 py-1.5 text-[12px] font-bold text-[#e4dcff]">
            {tr('Cegado · {s}s', { s: Math.ceil(st.bl / 1000) })}
          </div>
        ) : null}
        {g.meetUsed ? (
          <div className="rounded-full bg-[rgba(10,22,16,.78)] px-3 py-1 text-[12px] font-bold text-[#c98b95]">
            {tr('Tu reunión: usada')}
          </div>
        ) : meetBlocked ? (
          <div className="rounded-full bg-[rgba(10,22,16,.78)] px-3 py-1 text-[12px] font-bold text-[#ff8a8a]">
            {tr('Tu reunión: bloqueada por el sabotaje')}
          </div>
        ) : (
          <div className="rounded-full bg-[rgba(10,22,16,.78)] px-3 py-1 text-[12px] font-bold text-[#80ed99]">
            {tr('Tu reunión: disponible')}
          </div>
        )}
        {trk ? (
          <div className="rounded-full bg-[rgba(20,40,90,.9)] px-3 py-1.5 text-[12px] font-bold text-[#cdf3ff]">
            {tr('Localizador en {name} · {s}s · míralo en el mapa [M]', { name: trkName, s: Math.ceil(trk.left / 1000) })}
          </div>
        ) : null}
        {detective && g.detectiveUsed ? (
          <div className="rounded-full bg-[rgba(10,22,16,.78)] px-3 py-1 text-[12px] font-bold text-[#7fd8ca]">
            {tr('Interrogaste a {name}: lo sabrás en la próxima reunión', { name: g.interroName || tr('alguien') })}
          </div>
        ) : null}
      </div>

      <button
        className="pointer-events-auto absolute bottom-2.5 left-2.5 rounded-xl border-2 border-white/15 bg-[rgba(10,22,16,.78)] px-3.5 py-2.5 text-[13px] font-bold text-[#eaf5ec] shadow-[0_4px_14px_rgba(0,0,0,.45)] transition hover:brightness-110"
        {...tap(() => { sfx('click'); onMap(); })}
      >
        {tr('🗺 MAPA [M]')}
      </button>

      {st.dark ? (
        <div className="absolute left-1/2 top-3 max-w-[70vw] -translate-x-1/2 rounded-full bg-[rgba(230,57,70,.85)] px-3.5 py-1.5 text-center text-sm font-bold text-white">
          {g.role === 'crew' && !dead
            ? tr('¡Apagón! Arregla las luces en la Sala de máquinas')
            : tr('Apagón activo')}
          <div className="text-[11px] font-semibold opacity-90">{tr('No vuelve la luz hasta repararlo · sin reuniones mientras tanto')}</div>
        </div>
      ) : null}

      {st.rx ? (
        <div className="absolute left-1/2 top-3 w-[min(430px,88vw)] -translate-x-1/2 rounded-2xl bg-[rgba(186,32,48,.92)] px-3.5 py-2 text-center text-sm font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,.45)]">
          {g.role === 'crew' ? tr('¡REACTOR INESTABLE!') : tr('Reactor inestable')} · {Math.ceil(st.rx.left / 1000)}s
          <div className="mt-1 flex items-center justify-center gap-3 text-[12px] font-extrabold tracking-wide">
            <span className={st.rx.a ? 'text-[#80ed99]' : 'opacity-80'}>{tr('CONSOLA A')} {st.rx.a ? '✔' : '✖'}</span>
            <span className={st.rx.b ? 'text-[#80ed99]' : 'opacity-80'}>{tr('CONSOLA B')} {st.rx.b ? '✔' : '✖'}</span>
          </div>
          <div className="mx-auto mt-1.5 h-2 w-[85%] overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full bg-[#80ed99]"
              style={{ width: `${Math.min(100, (st.rx.hold / ((g.rmeta && g.rmeta.hold) || 5000)) * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] font-semibold opacity-90">
            {g.role === 'crew' && !dead
              ? tr('Dos jugadores distintos deben mantener las consolas A y B sin moverse')
              : tr('No se puede convocar una reunión hasta estabilizarlo')}
          </div>
        </div>
      ) : null}

      <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-2.5">
        {g.vent.in ? (
          <VentBar vent={g.vent} left={st.vleft} onTravel={onVentTo} onOut={onVent} />
        ) : dead ? (
          <>
            <div className="rounded-xl bg-[rgba(10,22,16,.78)] px-4 py-3 text-center text-sm font-bold text-[#9bb8a6]">
              {tr('Eres un fantasma')}
              <div className="text-[12px] font-semibold">{tr('Sigue con tus misiones pendientes')}</div>
              {lantern ? <div className="mt-1 text-[12px] font-semibold text-[#ffd98a]">{tr('Con un apagón, iluminas a tu alrededor')}</div> : null}
              {keymaster ? <div className="mt-1 text-[12px] font-semibold text-[#9fe3ff]">{tr('Abre las puertas cerradas desde el mapa [M]')}</div> : null}
            </div>
            <button
              className="pointer-events-auto min-w-[140px] rounded-xl bg-[#e9c46a] px-4 py-3.5 text-[15px] font-bold text-[#261c05] shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
              {...tap(() => { sfx('taskOpen'); onUse(); })}
              disabled={!canUse}
            >
              {useLabel}
            </button>
            {isImp ? (
              <>
                <button
                  className="pointer-events-auto min-w-[140px] rounded-xl bg-[#7b2cbf] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                  {...tap(() => { sfx('sabotage'); onSab(); })}
                  disabled={frz || st.scd > 0 || !!st.dark || !!st.rx}
                >
                  {st.dark ? tr('APAGÓN ACTIVO') : st.scd > 0 ? tr('APAGÓN ({s})', { s: Math.ceil(st.scd / 1000) }) : tr('APAGÓN [X]')}
                </button>
                {g.rmeta ? (
                  <button
                    className="pointer-events-auto min-w-[140px] rounded-xl bg-[#c9184a] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                    {...tap(() => { sfx('switch'); onReactor(); })}
                    disabled={frz || st.rcd > 0 || !!st.rx || st.dark}
                  >
                    {st.rcd > 0 ? tr('REACTOR ({s})', { s: Math.ceil(st.rcd / 1000) }) : tr('REACTOR [C]')}
                  </button>
                ) : null}
                <div className="rounded-xl bg-[rgba(10,22,16,.78)] px-3 py-2 text-center text-[12px] font-semibold text-[#c9b3ff]">
                  {tr('Las puertas se cierran desde el mapa [M]')}
                </div>
              </>
            ) : null}
            {blinder ? (
              <button
                className="pointer-events-auto min-w-[140px] rounded-xl bg-[#5c2a86] px-4 py-3.5 text-[15px] font-bold text-[#f0e0ff] shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                {...tap(() => { sfx('switch'); onBlind(); })}
                disabled={st.blcd > 0 || !nearBlind}
              >
                {st.blcd > 0 ? tr('CEGAR ({s})', { s: Math.ceil(st.blcd / 1000) }) : nearBlind ? tr('CEGAR [B]') : tr('ACÉRCATE PARA CEGAR')}
              </button>
            ) : null}
            {keymaster ? (
              <button
                className="pointer-events-auto min-w-[140px] rounded-xl bg-[#2a7fa8] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110"
                {...tap(() => { sfx('click'); onMap(); })}
              >
                {st.kycd > 0 ? tr('LLAVE ({s})', { s: Math.ceil(st.kycd / 1000) }) : st.drs && st.drs.length ? tr('🔓 ABRIR PUERTAS [M]') : tr('LLAVE LISTA')}
              </button>
            ) : null}
            {angel ? (
              <button
                className="pointer-events-auto min-w-[140px] rounded-xl bg-[#3aa0b8] px-4 py-3.5 text-[15px] font-bold text-[#04222a] shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                {...tap(() => { sfx('switch'); onGuard(); })}
                disabled={st.gcd > 0 || !nearCrew}
              >
                {st.gcd > 0 ? tr('ESCUDO ({s})', { s: Math.ceil(st.gcd / 1000) }) : tr('PROTEGER [T]')}
              </button>
            ) : null}
          </>
        ) : (
          <>
            {isImp ? (
              <>
                {g.shifter ? (
                  <button
                    className="pointer-events-auto min-w-[140px] rounded-xl bg-[#3a0ca3] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                    {...tap(() => { sfx('switch'); onShift(); })}
                    disabled={frz || !!st.form || st.shcd > 0 || !g.me.alive}
                  >
                    {st.shcd > 0 ? tr('CAMBIAR FORMA ({s})', { s: Math.ceil(st.shcd / 1000) }) : tr('CAMBIAR FORMA [F]')}
                  </button>
                ) : null}
                {g.spectre ? (
                  <button
                    className="pointer-events-auto min-w-[140px] rounded-xl bg-[#2b0a3a] px-4 py-3.5 text-[15px] font-bold text-[#d7c4ff] shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                    {...tap(() => { sfx('switch'); onInvis(); })}
                    disabled={frz || st.inv > 0 || st.icd > 0 || g.vent.in || !g.me.alive}
                  >
                    {st.inv > 0 ? tr('INVISIBLE ({s})', { s: Math.ceil(st.inv / 1000) }) : st.icd > 0 ? tr('INVISIBLE ({s})', { s: Math.ceil(st.icd / 1000) }) : tr('INVISIBLE [G]')}
                  </button>
                ) : null}
                <button
                  className="pointer-events-auto min-w-[140px] rounded-xl bg-[#7b2cbf] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                  {...tap(() => { sfx('sabotage'); onSab(); })}
                  disabled={frz || st.scd > 0 || !!st.dark || !!st.rx || !g.me.alive}
                >
                  {st.dark ? tr('APAGÓN ACTIVO') : st.scd > 0 ? tr('APAGÓN ({s})', { s: Math.ceil(st.scd / 1000) }) : tr('APAGÓN [X]')}
                </button>
                {g.rmeta ? (
                  <button
                    className="pointer-events-auto min-w-[140px] rounded-xl bg-[#c9184a] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                    {...tap(() => { sfx('switch'); onReactor(); })}
                    disabled={frz || st.rcd > 0 || !!st.rx || st.dark || !g.me.alive}
                  >
                    {st.rcd > 0 ? tr('REACTOR ({s})', { s: Math.ceil(st.rcd / 1000) }) : tr('REACTOR [C]')}
                  </button>
                ) : null}
                <button
                  className="pointer-events-auto min-w-[140px] rounded-xl bg-[#e63946] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                  {...tap(() => { sfx('kill'); onKill(); })}
                  disabled={frz || !c.target || st.kcd > 0 || !g.me.alive}
                >
                  {st.kcd > 0 ? tr('ELIMINAR ({s})', { s: Math.ceil(st.kcd / 1000) }) : tr('ELIMINAR [Q]')}
                </button>
                <button
                  className="pointer-events-auto min-w-[140px] rounded-xl bg-[#9d4edd] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                  {...tap(onVent)}
                  disabled={frz || !c.vent}
                >
                  {tr('REJILLA [V]')}
                </button>
              </>
            ) : null}
            <button
              className="pointer-events-auto min-w-[140px] rounded-xl bg-[#ff9f1c] px-4 py-3.5 text-[15px] font-bold text-[#2b1a03] shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
              {...tap(() => { sfx('button'); onRep(); })}
              disabled={frz || !c.body}
            >
              {tr('REPORTAR [R]')}
            </button>
            <button
              className="pointer-events-auto min-w-[140px] rounded-xl bg-[#e9c46a] px-4 py-3.5 text-[15px] font-bold text-[#261c05] shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
              {...tap(() => { sfx('taskOpen'); onUse(); })}
              disabled={!canUse}
            >
              {useLabel}
            </button>
            {engineer ? (
              <button
                className="pointer-events-auto min-w-[140px] rounded-xl bg-[#9d4edd] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                {...tap(onVent)}
                disabled={frz || !c.vent || st.vcd > 0}
              >
                {st.vcd > 0 ? tr('REJILLA ({s})', { s: Math.ceil(st.vcd / 1000) }) : tr('REJILLA [V]')}
              </button>
            ) : null}
            {scientist ? (
              <button
                className="pointer-events-auto min-w-[140px] rounded-xl bg-[#3aa0b8] px-4 py-3.5 text-[15px] font-bold text-[#04222a] shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                {...tap(() => { sfx('switch'); onSci(); })}
                disabled={frz || st.sciCd > 0 || st.sciL <= 0 || g.vent.in}
              >
                {st.sciL <= 0
                  ? tr('PANEL AGOTADO')
                  : st.sciOn
                    ? tr('CERRAR PANEL [H]')
                    : st.sciCd > 0
                      ? tr('PANEL VITAL ({s})', { s: Math.ceil(st.sciCd / 1000) })
                      : tr('PANEL VITAL · {s} s [H]', { s: Math.ceil(st.sciL / 1000) })}
              </button>
            ) : null}
            {tracker ? (
              <button
                className="pointer-events-auto min-w-[140px] rounded-xl bg-[#4361ee] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                {...tap(() => { sfx('switch'); onTrack(); })}
                disabled={frz || !!trk || st.trkcd > 0 || !c.track}
              >
                {trk
                  ? tr('LOCALIZANDO ({s})', { s: Math.ceil(trk.left / 1000) })
                  : st.trkcd > 0
                    ? tr('LOCALIZAR ({s})', { s: Math.ceil(st.trkcd / 1000) })
                    : c.track
                      ? tr('LOCALIZAR [L]')
                      : tr('ACÉRCATE A ALGUIEN')}
              </button>
            ) : null}
            {detective ? (
              <button
                className="pointer-events-auto min-w-[140px] rounded-xl bg-[#2a9d8f] px-4 py-3.5 text-[15px] font-bold text-[#04211d] shadow-[0_4px_14px_rgba(0,0,0,.5)] transition hover:brightness-110 disabled:opacity-35"
                {...tap(() => { sfx('vote'); onInterro(); })}
                disabled={frz || g.detectiveUsed || !allTasks || !c.interro}
              >
                {g.detectiveUsed
                  ? tr('INTERROGAR (usado)')
                  : !allTasks
                    ? tr('INTERROGAR (faltan misiones)')
                    : c.interro
                      ? tr('INTERROGAR [I]')
                      : tr('ACÉRCATE PARA INTERROGAR')}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}