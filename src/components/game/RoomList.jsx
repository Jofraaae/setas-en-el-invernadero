import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchRooms, subscribeRooms } from '@/lib/game/net';
import { lastRooms, rememberRooms } from '@/lib/game/rooms';
import { MAPS, mapName } from '@/lib/game/maps';
import { flagOf, countryName } from '@/lib/game/country';
import { sfx } from '@/lib/game/sound';
import { tr, useLang } from '@/lib/i18n';

// Una sala que lleva más de este tiempo sin anunciarse ya no está abierta. El anfitrión
// late cada 12 s, pero su pestaña puede pasar a segundo plano (los navegadores espacian
// los temporizadores) o quedarse un momento sin responder: por eso el margen es amplio.
const FRESH_MS = 180000;

const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const FIELD = 'w-full rounded-lg border-2 border-[#2f5a48] bg-[#0f211a] px-2.5 py-2 text-[13px] text-[#eaf5ec] outline-none transition focus:border-[#e9c46a]';
const LABEL = 'mb-1 block text-[10px] font-black uppercase tracking-[1.5px] text-[#7f9c8c]';

const SIZES = [[1, 3], [4, 7], [8, 11], [12, 15]];
const LANG_NAME = { es: 'Español', en: 'English' };
const NO_COUNTRY = '??';

const noFilters = { q: '', country: 'all', map: 'all', size: 'all', lang: 'all', open: true, sort: 'new' };

function ago(iso) {
  const min = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
  if (!Number.isFinite(min)) return '';
  if (min < 1) return tr('ahora mismo');
  if (min < 60) return tr('hace {m} min', { m: min });
  return tr('hace {h} h', { h: Math.floor(min / 60) });
}

export default function RoomList({ onJoin, onClose }) {
  const { lang } = useLang();
  // Arranca con el listado que ya se vio: al volver atrás no se reinicia la lista.
  const [rooms, setRooms] = useState(() => lastRooms());
  const [failed, setFailed] = useState(false);
  const [f, setF] = useState(noFilters);
  const [, setTick] = useState(0);
  const pending = useRef(null);
  const set = (k, v) => setF((cur) => ({ ...cur, [k]: v }));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // El servidor solo devuelve salas públicas y vivas (anuncio con caducidad).
        const raw = await fetchRooms();
        const fresh = raw.filter((r) => !r.updated_date && !r.updated_at ? true : Date.parse(r.updated_at || r.updated_date) >= Date.now() - FRESH_MS);
        if (!alive) return;
        const seen = new Map();
        for (const r of fresh) {
          if (!r.code || seen.has(r.code)) continue;
          seen.set(r.code, r);
        }
        const list = [...seen.values()];
        rememberRooms(list);
        setRooms(list);
        setFailed(false);
      } catch (e) {
        // un fallo de red no borra lo que ya había: se avisa y se deja la última lista
        if (alive) { setRooms((cur) => cur || []); setFailed(true); }
      }
    };
    load();
    const unsub = subscribeRooms(() => load());
    // La lista se refresca sola de todas formas: los avisos en vivo pueden no llegar, y
    // el listado no debe quedarse congelado con lo que hubiera al abrirlo.
    const poll = setInterval(load, 5000);
    const clock = setInterval(() => setTick((n) => n + 1), 30000); // "hace X min"
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(clock);
      if (pending.current) clearTimeout(pending.current);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const countries = useMemo(() => {
    const set = new Set((rooms || []).map((r) => r.country || NO_COUNTRY));
    return [...set].map((c) => ({ id: c, label: c === NO_COUNTRY ? tr('🌍 Sin país') : `${flagOf(c)} ${countryName(c, lang)}` }))
      .sort((a, b) => a.label.localeCompare(b.label, lang));
  }, [rooms, lang]);

  const statusOf = (r) => {
    const waiting = r.status === 'lobby';
    const full = (r.player_count || 0) >= (r.max_players || 15);
    return { canJoin: waiting && !full, label: !waiting ? tr('Partida en curso') : full ? tr('Sala llena') : tr('Esperando jugadores') };
  };

  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const out = (rooms || []).filter((r) => {
      if (q && !String(r.owner || '').toLowerCase().includes(q)) return false;
      if (f.country !== 'all' && (r.country || NO_COUNTRY) !== f.country) return false;
      if (f.map !== 'all' && r.map !== f.map) return false;
      if (f.lang !== 'all' && r.lang !== f.lang) return false;
      if (f.size !== 'all') {
        const [a, b] = f.size.split('-').map(Number);
        const n = r.player_count || 0;
        if (n < a || n > b) return false;
      }
      if (f.open && !statusOf(r).canJoin) return false;
      return true;
    });
    const n = (r) => r.player_count || 0;
    const free = (r) => (r.max_players || 15) - n(r);
    const sorters = {
      new: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')),
      players: (a, b) => n(b) - n(a),
      free: (a, b) => free(b) - free(a),
      owner: (a, b) => String(a.owner || '').localeCompare(String(b.owner || ''), lang),
    };
    return out.sort(sorters[f.sort] || sorters.new);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, f, lang]);

  const total = rooms ? rooms.length : 0;
  const dirty = JSON.stringify(f) !== JSON.stringify(noFilters);

  return (
    <div
      className="absolute inset-0 z-30 flex overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="m-auto flex w-full max-w-[760px] flex-col items-center gap-3">
        <h2 className="text-[clamp(22px,4vw,32px)] font-black text-[#eaf5ec]">{tr('Salas activas')}</h2>
        <p className="text-center text-sm text-[#9bb8a6]">
          {tr('Salas públicas abiertas ahora. Se actualiza sola: entra con un clic.')}
        </p>

        <div className="grid w-full grid-cols-2 gap-2.5 rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-3">
            <label className={LABEL} htmlFor="rl-q">{tr('Buscar por dueño')}</label>
            <input id="rl-q" className={FIELD} placeholder={tr('Nombre del dueño…')} autoComplete="off" value={f.q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <div>
            <label className={LABEL} htmlFor="rl-country">{tr('País')}</label>
            <select id="rl-country" className={FIELD} value={f.country} onChange={(e) => set('country', e.target.value)}>
              <option value="all">{tr('Todos los países')}</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="rl-size">{tr('Jugadores en la sala')}</label>
            <select id="rl-size" className={FIELD} value={f.size} onChange={(e) => set('size', e.target.value)}>
              <option value="all">{tr('Cualquier número')}</option>
              {SIZES.map(([a, b]) => <option key={a} value={`${a}-${b}`}>{tr('{a} a {b} jugadores', { a, b })}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="rl-map">{tr('Escenario')}</label>
            <select id="rl-map" className={FIELD} value={f.map} onChange={(e) => set('map', e.target.value)}>
              <option value="all">{tr('Todos')}</option>
              {MAPS.map((m) => <option key={m.id} value={m.id}>{tr(m.name)}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="rl-lang">{tr('Idioma de la sala')}</label>
            <select id="rl-lang" className={FIELD} value={f.lang} onChange={(e) => set('lang', e.target.value)}>
              <option value="all">{tr('Todos')}</option>
              {Object.entries(LANG_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="rl-sort">{tr('Ordenar por')}</label>
            <select id="rl-sort" className={FIELD} value={f.sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="new">{tr('Más recientes')}</option>
              <option value="players">{tr('Más jugadores')}</option>
              <option value="free">{tr('Más huecos libres')}</option>
              <option value="owner">{tr('Dueño (A–Z)')}</option>
            </select>
          </div>
          <label className="flex cursor-pointer items-end gap-2 pb-2 text-[13px] text-[#cfe6d9]">
            <input type="checkbox" className="h-4 w-4 accent-[#e9c46a]" checked={f.open} onChange={(e) => set('open', e.target.checked)} />
            {tr('Solo salas con sitio')}
          </label>
        </div>

        <div className="flex w-full items-center justify-between text-[12px] text-[#9bb8a6]">
          <span>{tr('{n} de {total} salas', { n: shown.length, total })}</span>
          {dirty ? (
            <button className="font-bold text-[#e9c46a] underline-offset-2 hover:underline" onClick={() => { sfx('click'); setF(noFilters); }}>
              {tr('Quitar filtros')}
            </button>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2">
          {rooms === null ? (
            <p className="py-4 text-center text-sm text-[#9bb8a6]">{tr('Cargando salas…')}</p>
          ) : null}

          {failed ? (
            <p className="py-4 text-center text-sm text-[#ff8a8a]">
              {tr('No se ha podido cargar la lista. Puedes entrar con el código de sala.')}
            </p>
          ) : null}

          {rooms && total === 0 && !failed ? (
            <p className="py-4 text-center text-sm text-[#9bb8a6]">
              {tr('No hay salas abiertas ahora mismo. ¡Crea una!')}
            </p>
          ) : null}

          {rooms && total > 0 && shown.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#9bb8a6]">
              {tr('Ninguna sala encaja con esos filtros.')}
            </p>
          ) : null}

          {shown.map((r) => {
            const { canJoin, label } = statusOf(r);
            const n = r.player_count || 0;
            const max = r.max_players || 15;
            const country = r.country ? countryName(r.country, lang) : tr('Sin país');
            return (
              <button
                key={r.id}
                onClick={() => { if (!canJoin) return; sfx('click'); onJoin(r.code); }}
                disabled={!canJoin}
                className={`grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition ${
                  canJoin
                    ? 'border-[#2f5a48] bg-[#1a3027] hover:border-[#e9c46a]'
                    : 'border-[#25382f] bg-[#152a22] opacity-70'
                }`}
              >
                <span className="flex flex-col items-center">
                  <span className="text-3xl leading-none">{flagOf(r.country)}</span>
                  <span className="mt-1 line-clamp-2 text-center text-[10px] leading-tight text-[#9bb8a6]">{country}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-black text-[#eaf5ec]">👑 {r.owner || tr('Anfitrión')}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#9bb8a6]">
                    {r.map ? <span>🗺️ {tr(mapName(r.map))}</span> : null}
                    {r.lang ? <span>🗣️ {LANG_NAME[r.lang] || r.lang}</span> : null}
                    {r.bots > 0 ? <span>🤖 {r.bots}</span> : null}
                    <span>{ago(r.created_at)}</span>
                  </span>
                </span>
                <span className="flex min-w-[96px] flex-col items-end gap-1 text-xs">
                  <b className="text-[#eaf5ec]">{n}/{max} {tr('jugadores')}</b>
                  <span className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                    <span className="block h-full rounded-full bg-[#80ed99]" style={{ width: `${Math.min(100, (n / max) * 100)}%` }} />
                  </span>
                  <span className={canJoin ? 'text-[#80ed99]' : 'text-[#ff9f1c]'}>{label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button className={BTN_ALT} onClick={() => { sfx('back'); onClose(); }}>{tr('Volver')}</button>
        <p className="text-center text-[12px] text-[#6f8a7b]">
          {tr('Si una sala ya tiene la partida empezada no podrás entrar: espera a que termine o crea la tuya. Las salas privadas no salen aquí: se entra con su código.')}
        </p>
      </div>
    </div>
  );
}
