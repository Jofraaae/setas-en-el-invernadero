import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { mapName } from '@/lib/game/maps';
import GameCanvas from './GameCanvas';
import LobbyChat from './LobbyChat';
import LobbySettings from './LobbySettings';
import MapPicker from './MapPicker';
import MiniShroom from './MiniShroom';
import { tr, trMark } from '@/lib/i18n';

/* La sala de espera caminable: el lienzo del juego con la cabaña, y encima un panel a la derecha con
   el código, los jugadores y lo que pasa en la sala. Con el ordenador (ajustes de la partida: todos
   lo abren, solo el anfitrión cambia algo) y el armario (color del seta) se interactúa al acercarse
   y pulsar E (o el botón que sale en pantalla). */

const SIDES = [
  { id: 'random', icon: '🎲', label: trMark('Aleatorio') },
  { id: 'impostor', icon: '🔪', label: trMark('Impostor') },
  { id: 'crew', icon: '🌱', label: trMark('Tripulante') },
];
const STATION_LABEL = {
  computer: trMark('Ordenador de ajustes'),
  wardrobe: trMark('Armario'),
};
const STATION_ICON = { computer: '⚙️', wardrobe: '🎨' };

const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-2.5 font-bold text-[#261c05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-3 py-2 text-sm font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const KICK = 'rounded-md bg-[#7b2c2c] px-1.5 py-0.5 text-[10px] font-bold text-[#ffd9d9] transition hover:brightness-125';
const BAN = 'rounded-md bg-[#5a1f3a] px-1.5 py-0.5 text-[10px] font-bold text-[#ffc7e0] transition hover:brightness-125';
const stop = (e) => e.stopPropagation(); // un toque sobre el panel no mueve al seta (joystick)

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex overflow-auto bg-black/60 p-3"
      onTouchStart={stop}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="m-auto flex w-full max-w-[720px] flex-col gap-3 rounded-2xl border-2 border-[#2f5a48] bg-[#10231b] p-4 shadow-[0_12px_40px_rgba(0,0,0,.6)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[#e9c46a]">{title}</h2>
          <button className={BTN_ALT} onClick={() => { sfx('back'); onClose(); }}>{tr('Cerrar')}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function LobbyRoom({ g, send, lobby, myId, chat, onColor, onSetting, onMap, onStart, onLeave, onCopy, onChat, onKick, onAddBots, onVis, onWant }) {
  const [modal, setModal] = useState(null); // 'computer' | 'wardrobe' | null
  const [near, setNear] = useState(null);   // aparato al alcance
  const [open, setOpen] = useState(() => window.innerWidth >= 640);
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [nBots, setNBots] = useState(1);
  const modalRef = useRef(null);
  // avisos de "X se ha unido": se comparan los jugadores con los de la vez anterior
  const [joined, setJoined] = useState([]);
  const knownRef = useRef(null);
  useEffect(() => {
    const ids = new Set(lobby.players.map((p) => p.id));
    const prev = knownRef.current;
    knownRef.current = ids;
    if (!prev) return; // al entrar, los que ya estaban no cuentan
    const fresh = lobby.players.filter((p) => !prev.has(p.id) && p.id !== myId);
    if (!fresh.length) return;
    const stamp = Date.now();
    const items = fresh.map((p) => ({ k: `${p.id}-${stamp}`, name: p.name }));
    setJoined((cur) => [...cur, ...items].slice(-3));
    // el aviso se quita solo; sin cleanup, porque un mensaje de chat rehace la lista y no debe cortarlo
    setTimeout(() => setJoined((cur) => cur.filter((x) => !items.some((i) => i.k === x.k))), 3200);
  }, [lobby.players, myId]);
  modalRef.current = modal;

  const isHost = myId === lobby.hostId;
  const n = lobby.players.length;
  const free = Math.max(0, lobby.max - n);
  const bots = lobby.players.filter((p) => p.bot);
  const mine = (lobby.players.find((p) => p.id === myId) || {}).color;
  const taken = new Set(lobby.players.map((p) => p.color));
  const maxImp = Math.max(1, Math.floor((n - 1) / 2));
  const want = lobby.settings.imps === 0 ? (n >= 7 ? 2 : 1) : lobby.settings.imps;
  const eff = Math.min(want, maxImp);

  const nearest = useCallback(() => {
    const R = (g.cfg && g.cfg.useRange) || 90;
    let best = null, bd = Infinity;
    for (const [id, st] of Object.entries(g.stations || {})) {
      const d = Math.hypot(g.me.x - st.x, g.me.y - st.y);
      if (d <= (st.range || R) && d < bd) { best = id; bd = d; }
    }
    return best;
  }, [g]);

  const openModal = useCallback((id) => {
    g.inputLock = true; // con una ventana abierta el seta se queda quieto
    sfx('taskOpen');
    setModal(id);
  }, [g]);
  const closeModal = useCallback(() => {
    g.inputLock = false;
    setModal(null);
  }, [g]);

  // E / espacio / botón: usa el aparato que tengas delante
  useEffect(() => {
    g.lobbyUse = () => {
      if (modalRef.current) return;
      const id = nearest();
      if (id) openModal(id);
    };
    return () => { g.lobbyUse = null; g.inputLock = false; };
  }, [g, nearest, openModal]);

  // qué aparato tienes al alcance (para el botón de pantalla)
  useEffect(() => {
    const iv = setInterval(() => setNear(nearest()), 120);
    return () => clearInterval(iv);
  }, [nearest]);

  // el chat abierto marca todo como leído
  useEffect(() => { if (chatOpen) setSeen(chat.length); }, [chatOpen, chat.length]);
  const unread = chatOpen ? 0 : Math.max(0, chat.length - seen);

  return (
    <>
      <GameCanvas g={g} send={send} />
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* panel de la sala, a la derecha */}
        <aside
          className="pointer-events-auto absolute right-2 top-2 flex max-h-[calc(100%-16px)] w-[min(268px,calc(100vw-16px))] flex-col gap-2 overflow-y-auto rounded-2xl border-2 border-[#2f5a48] bg-[rgba(12,26,20,.9)] p-3 text-[#eaf5ec] shadow-[0_8px_28px_rgba(0,0,0,.5)]"
          onTouchStart={stop}
        >
          <button
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => { sfx('click'); setOpen(!open); }}
            aria-expanded={open}
          >
            {lobby.mode === 'bots' ? (
              <span className="text-base font-black text-[#e9c46a]">🤖 {tr('Sala de bots')}</span>
            ) : (
              <span>
                <span className="block text-[10px] uppercase tracking-[2px] text-[#9bb8a6]">{tr('Código de sala')}</span>
                <span className="block text-[28px] font-black leading-none tracking-[6px] text-[#e9c46a]">{lobby.code}</span>
              </span>
            )}
            <span className="flex flex-col items-end text-xs font-bold text-[#bfe3cf]">
              <span>👥 {n}/{lobby.max}</span>
              <span className="opacity-70">{open ? '▴' : '▾'}</span>
            </span>
          </button>

          {open ? (
            <>
              {lobby.mode !== 'bots' ? (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button className={BTN_ALT} onClick={() => { sfx('click'); onCopy(); }}>{tr('Copiar código / enlace')}</button>
                  <span className="rounded-full bg-[#234036] px-2 py-1 font-bold text-[#bfe3cf]">
                    {lobby.vis === 'private' ? tr('🔒 Privada') : tr('🌐 Pública')}
                  </span>
                  {isHost ? (
                    <button className="rounded-lg bg-[#2f5a48] px-2 py-1 font-bold transition hover:brightness-110" onClick={() => { sfx('click'); onVis(lobby.vis === 'private' ? 'public' : 'private'); }}>
                      {lobby.vis === 'private' ? tr('Hacer pública') : tr('Hacer privada')}
                    </button>
                  ) : null}
                </div>
              ) : (
                <span className="w-fit rounded-full bg-[#234036] px-2 py-1 text-[11px] font-bold text-[#bfe3cf]">{tr('🔒 Privada: nadie más puede entrar')}</span>
              )}

              <div className="rounded-xl bg-[#1a3027] p-2 text-[12px] leading-relaxed">
                <p>🗺️ {tr('Escenario')}: <b className="text-[#e9c46a]">{tr(mapName(lobby.map || 'greenhouse'))}</b></p>
                <p>🔪 {n === 1 ? tr('Con 1 jugador habrá 1 impostor') : eff === 1 ? tr('Con {n} jugadores habrá 1 impostor', { n }) : tr('Con {n} jugadores habrá {eff} impostores', { n, eff })}</p>
                <p className="text-[#9bb8a6]">
                  {n < lobby.min
                    ? (lobby.min - n === 1 ? tr('Falta 1 jugador más (mínimo {min}, máximo {max}).', { min: lobby.min, max: lobby.max }) : tr('Faltan {k} jugadores más (mínimo {min}, máximo {max}).', { k: lobby.min - n, min: lobby.min, max: lobby.max }))
                    : isHost ? tr('Todo listo. ¡Empieza cuando quieras!') : tr('Esperando a que el anfitrión empiece la partida…')}
                </p>
              </div>

              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[2px] text-[#e9c46a]">{tr('Jugadores')} · {n}/{lobby.max}</h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {lobby.players.map((p) => (
                    <li key={p.id} className="flex items-center gap-1.5 rounded-lg bg-[#1a3027] px-1.5 py-1 text-[13px]">
                      <MiniShroom color={p.color} size={24} />
                      <span className="min-w-0 flex-1 truncate font-bold">
                        {p.name}{p.id === myId ? ' ' + tr('(tú)') : ''}{p.id === lobby.hostId ? ' 👑' : ''}
                        {p.bot ? <span className="ml-1 text-[10px] text-[#9bb8a6]">🤖</span> : null}
                        {p.offline ? <span className="ml-1 text-[10px] text-[#ff8a8a]">{tr('reconectando…')}</span> : null}
                      </span>
                      {isHost && p.id !== myId ? (
                        <span className="flex gap-1">
                          <button className={KICK} onClick={() => { sfx('deny'); onKick(p.id, 'kick'); }}>{p.bot ? tr('Quitar') : tr('Expulsar')}</button>
                          {p.bot ? null : <button className={BAN} onClick={() => { sfx('deny'); onKick(p.id, 'ban'); }}>{tr('Banear')}</button>}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              {isHost ? (
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#234036] p-2">
                  <span className="text-[12px] font-bold text-[#bfe3cf]">🤖 {tr('Bots')}</span>
                  <button className="h-7 w-7 rounded-lg bg-[#2f5a48] font-black" disabled={nBots <= 1} onClick={() => { sfx('click'); setNBots(Math.max(1, nBots - 1)); }} aria-label="-">−</button>
                  <b className="w-5 text-center">{Math.min(nBots, Math.max(1, free))}</b>
                  <button className="h-7 w-7 rounded-lg bg-[#2f5a48] font-black" disabled={nBots >= free} onClick={() => { sfx('click'); setNBots(Math.min(Math.max(1, free), nBots + 1)); }} aria-label="+">+</button>
                  <button
                    className="rounded-lg bg-[#e9c46a] px-2 py-1 text-[12px] font-bold text-[#261c05] transition hover:brightness-110 disabled:opacity-40"
                    disabled={free <= 0}
                    onClick={() => { sfx('click'); onAddBots(Math.min(nBots, free)); }}
                  >
                    {tr('Añadir bots')}
                  </button>
                  {bots.length ? (
                    <button className="rounded-lg bg-[#7b2c2c] px-2 py-1 text-[11px] font-bold text-[#ffd9d9] transition hover:brightness-125" onClick={() => { sfx('deny'); for (const b of bots) onKick(b.id, 'kick'); }}>
                      {tr('Quitar todos')}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {isHost ? (
                  <button className={`${BTN} flex-1`} onClick={() => { sfx('begin'); onStart(); }} disabled={n < lobby.min}>{tr('Empezar partida')}</button>
                ) : null}
                <button className={BTN_ALT} onClick={() => { sfx('click'); setChatOpen(!chatOpen); }}>
                  💬 {tr('Chat')}{unread ? ` (${unread})` : ''}
                </button>
                <button className={BTN_ALT} onClick={() => { sfx('back'); onLeave(); }}>{tr('Salir')}</button>
              </div>
              <p className="text-[11px] leading-snug text-[#7f9c8c]">
                {tr('Muévete con WASD o las flechas (en el móvil, arrastra). Acércate al ordenador o al armario y pulsa [E].')}
              </p>
            </>
          ) : null}
        </aside>

        {/* chat de la sala */}
        {chatOpen ? (
          <div className="pointer-events-auto absolute bottom-14 left-2 w-[min(360px,calc(100vw-16px))]" onTouchStart={stop}>
            <LobbyChat chat={chat} myId={myId} onSend={onChat} />
          </div>
        ) : null}

        {/* quién acaba de entrar */}
        {joined.length ? (
          <div className="pointer-events-none absolute bottom-[88px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
            {joined.map((j) => (
              <div key={j.k} className="rounded-full border border-[#9ef0b8] bg-[rgba(12,26,20,.92)] px-4 py-1.5 text-sm font-bold text-[#bff5d2] shadow-[0_4px_14px_rgba(0,0,0,.5)]">
                🍄 {tr('{name} se ha unido a la sala', { name: j.name })}
              </div>
            ))}
          </div>
        ) : null}

        {/* aviso de lo que se puede usar aquí */}
        {near && !modal ? (
          <button
            className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#e9c46a] bg-[rgba(12,26,20,.92)] px-5 py-3 text-sm font-extrabold text-[#e9c46a] shadow-[0_6px_20px_rgba(0,0,0,.5)] transition hover:brightness-125"
            onTouchStart={stop}
            onClick={() => { if (g.lobbyUse) g.lobbyUse(); }}
          >
            {STATION_ICON[near]} {tr(STATION_LABEL[near])} · [E]
          </button>
        ) : null}

        {modal === 'computer' ? (
          <Modal title={`💻 ${tr('Ordenador de la partida')}`} onClose={closeModal}>
            <p className={`rounded-xl px-3 py-2 text-sm font-bold ${isHost ? 'bg-[#234036] text-[#bfe3cf]' : 'bg-[#3a2c1a] text-[#f0d9a8]'}`}>
              {isHost ? tr('Eres el anfitrión: lo que cambies aquí vale para toda la partida.') : tr('Todos pueden mirar los ajustes, pero solo el anfitrión puede cambiarlos.')}
            </p>
            {lobby.mode === 'bots' && isHost ? (
              <div className="w-full rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-4">
                <h2 className="text-[12px] font-black uppercase tracking-[2px] text-[#e9c46a]">{tr('Tu rol en la partida')}</h2>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {SIDES.map((o) => {
                    const sel = (lobby.want || 'random') === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={sel}
                        onClick={() => { sfx('click'); onWant(o.id); }}
                        className={`rounded-xl border-[3px] px-2 py-2.5 text-center text-sm font-extrabold transition ${sel ? 'border-[#e9c46a] bg-[#234036] text-[#e9c46a]' : 'border-white/10 text-[#eaf5ec] opacity-80 hover:opacity-100'}`}
                      >
                        {o.icon} {tr(o.label)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-[#7f9c8c]">{tr('Elige si quieres ser impostor, tripulante o dejarlo al azar. Los bots se reparten el resto.')}</p>
              </div>
            ) : null}
            <MapPicker current={lobby.map || 'greenhouse'} isHost={isHost} onPick={onMap} />
            <LobbySettings lobby={lobby} isHost={isHost} onSetting={onSetting} />
          </Modal>
        ) : null}

        {modal === 'wardrobe' ? (
          <Modal title={`🎨 ${tr('Armario')}`} onClose={closeModal}>
            <div className="flex flex-col items-center gap-2">
              <MiniShroom color={mine || '#fff'} size={96} />
              <p className="text-sm text-[#9bb8a6]">{tr('Elige tu color')}</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {lobby.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => { sfx('click'); onColor(c); }}
                    disabled={taken.has(c) && c !== mine}
                    aria-label={c}
                    className="h-10 w-10 rounded-full border-[3px] transition hover:scale-110 disabled:opacity-[0.18] disabled:hover:scale-100"
                    style={{ background: c, borderColor: c === mine ? '#fff' : 'transparent' }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-[#7f9c8c]">{tr('Los colores que ya lleva otro jugador salen apagados.')}</p>
            </div>
          </Modal>
        ) : null}
      </div>
    </>
  );
}
