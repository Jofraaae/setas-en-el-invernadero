import { useCallback, useEffect, useRef, useState } from 'react';
import { connectRoom } from '@/lib/game/net';
import { useToast } from '@/components/ui/use-toast';
import { makeGrid } from '@/lib/game/grid';
import { announceRoom, forgetRoom } from '@/lib/game/rooms';
import { loop, sfx, stopLoop } from '@/lib/game/sound';
import { buildWorld } from '@/lib/game/render';
import { contextOf } from '@/lib/game/context';
import { sendInput } from '@/lib/game/predict';
import MenuScreen from '@/components/game/MenuScreen';
import LobbyScreen from '@/components/game/LobbyScreen';
import MeetingScreen from '@/components/game/MeetingScreen';
import ResultScreen from '@/components/game/ResultScreen';
import EndScreen from '@/components/game/EndScreen';
import RoleScreen from '@/components/game/RoleScreen';
import MiniGame from '@/components/game/MiniGame';
import Hud from '@/components/game/Hud';
import GameCanvas from '@/components/game/GameCanvas';
import DeathOverlay from '@/components/game/DeathOverlay';
import ShiftPicker from '@/components/game/ShiftPicker';
import ScientistPanel from '@/components/game/ScientistPanel';
import MapOverlay from '@/components/game/MapOverlay';
import SoundToggle from '@/components/game/SoundToggle';
import { tr, tServer, useLang } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const DEATH_MS = 2400; // duración de la animación privada de muerte
const CONNECT_MS = 12000; // si la sala no contesta, se avisa en vez de dejar el menú bloqueado
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function randCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return c;
}
function getConnId() {
  let id = null;
  try { id = sessionStorage.getItem('setas_conn'); } catch (e) { id = null; }
  if (!id) {
    id = crypto.randomUUID();
    try { sessionStorage.setItem('setas_conn', id); } catch (e) { /* modo privado */ }
  }
  return id;
}

export default function Home() {
  useLang(); // al cambiar de idioma se vuelve a pintar toda la pantalla
  const { toast } = useToast();
  const [screen, setScreen] = useState('menu');
  const [name, setName] = useState(() => { try { return localStorage.getItem('setas_name') || ''; } catch (e) { return ''; } });
  const [code, setCode] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('sala');
    return q ? q.toUpperCase().slice(0, 4) : '';
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lobby, setLobby] = useState(null);
  const [hostId, setHostId] = useState(null); // quién mantiene el anuncio de la sala
  // datos del anuncio de la sala (se usan en el efecto y al salir)
  const lobbyCount = lobby && lobby.players ? lobby.players.length : 0;
  const lobbyMin = (lobby && lobby.min) || 4;
  const lobbyMax = (lobby && lobby.max) || 15;
  const [tasks, setTasks] = useState([]);
  const [doneIds, setDoneIds] = useState([]);
  const [meeting, setMeeting] = useState(null);
  const [chat, setChat] = useState([]);
  const [lchat, setLChat] = useState([]);
  const [result, setResult] = useState(null);
  const [end, setEnd] = useState(null);
  const [mini, setMini] = useState(null);
  const [death, setDeath] = useState(null);
  const [shiftPick, setShiftPick] = useState(null);
  const [sci, setSci] = useState(false); // panel de constantes vitales del científico
  const [reveal, setReveal] = useState(null);
  const [interro, setInterro] = useState(null); // informe del Detective, solo para él
  const [mapOpen, setMapOpen] = useState(false);

  const gRef = useRef(null);
  if (!gRef.current) {
    gRef.current = {
      me: { x: 0, y: 0, alive: true, face: 1, moving: false },
      srv: { x: 0, y: 0 }, srvB: null,
      lastIn: { dx: 0, dy: 0 }, lastSend: 0, inMoving: false, lastEff: 0, frameT: 0,
      pend: [], inSeq: 0,
      others: new Map(), bodies: [],
      st: { prog: 0, dark: false, vr: 420, sr: 420, kcd: 0, scd: 0, rcd: 0, sq: 0, rx: null, sh: null, mo: null, form: null, fz: 0, vcd: 0, shcd: 0, inv: 0, icd: 0, gcd: 0, vleft: 0, sciOn: 0, sciL: 0, sciCd: 0, vt: null, drs: null, trk: null, trkcd: 0 },
      world: { w: 4200, h: 2700 }, floors: [], obst: [], grid: null, sightGrid: null, map: 'greenhouse',
      btn: { x: 1300, y: 900 }, pnl: { x: 220, y: 790 }, rmeta: null, rpts: [],
      cfg: { speed: 230, radius: 16, killRange: 80, useRange: 90, reportRange: 120, trackRange: 120 },
      roster: new Map(), gone: new Set(), tasks: [], done: new Set(),
      vents: [], vent: { in: false, id: null, net: null, vents: [] },
      doors: [], doorKey: null,
      role: 'crew', mates: [], myId: null, hostId: null, shifter: false, viper: false, engineer: false, alerter: false, judge: false, judgeUsed: false, angel: false, scientist: false, spectre: false, detective: false, detectiveUsed: false, tracker: false, interroName: '', alert: null,
      meetUsed: false, snap: true, miniOpen: false, inputLock: false, mini: null,
      mapC: null, miniC: null, act: {}, fx: new Map(), ventFx: new Map(), saves: [], puffs: [],
      off: null, ackDir: null,
    };
  }
  const g = gRef.current;

  const screenRef = useRef('menu');
  const connRef = useRef(null);
  const subRef = useRef(null);
  const attemptRef = useRef(null);
  const handlerRef = useRef(() => {});
  const connectTimer = useRef(null);
  const aliveAt = useRef(0); // última vez que la sala ha dicho algo: sirve para ver si la conexión sigue viva

  const go = useCallback((s) => { screenRef.current = s; setScreen(s); }, []);
  const send = useCallback((o) => { if (connRef.current) connRef.current.send(o); }, []);

  const closeConn = useCallback(() => {
    if (connectTimer.current) { clearTimeout(connectTimer.current); connectTimer.current = null; }
    if (subRef.current) { try { subRef.current.unsubscribe(); } catch (e) { /* ya cerrada */ } subRef.current = null; }
    if (connRef.current) { try { connRef.current.close(); } catch (e) { /* ya cerrada */ } connRef.current = null; }
  }, []);

  const startGame = useCallback((m) => {
    // Recuperar la conexión no debe cerrar una misión ni reiniciar el lienzo.
    if (m.resync && m.phase === 'playing' && screenRef.current === 'playing') {
      g.inSeq = Math.max(g.inSeq, m.seq || 0);
      g.pend = [];
      g.srv.x = m.you[0];
      g.srv.y = m.you[1];
      g.st.sq = m.seq || 0;
      g.st.dark = !!m.dark;
      g.me.alive = m.alive !== false;
      g.judge = !!m.judge;
      g.judgeUsed = !!m.judgeUsed;
      g.angel = !!m.angel;
      g.scientist = !!m.scientist;
      g.viper = !!m.viper;
      g.spectre = !!m.spectre;
      g.detective = !!m.detective;
      g.detectiveUsed = !!m.du;
      g.tracker = !!m.tracker;
      g.done = new Set(m.done || []);
      setDoneIds([...g.done]);
      if (g.mini?.lights && !m.dark) {
        g.mini = null;
        g.miniOpen = false;
        g.inputLock = false;
        setMini(null);
      }
      return;
    }
    g.role = m.role;
    g.mates = m.mates || [];
    g.shifter = !!m.shifter;
    g.engineer = !!m.engineer;
    g.alerter = !!m.alerter;
    g.judge = !!m.judge;
    g.judgeUsed = !!m.judgeUsed;
    g.angel = !!m.angel;
    g.scientist = !!m.scientist;
    g.viper = !!m.viper;
    g.spectre = !!m.spectre;
    g.detective = !!m.detective;
    g.detectiveUsed = !!m.du;
    g.tracker = !!m.tracker;
    g.interroName = '';
    g.alert = null;
    g.tasks = m.tasks || [];
    g.done = new Set(m.done || []);
    g.roster = new Map((m.roster || []).map((r) => [r.id, r]));
    g.gone = new Set();
    g.world = m.world;
    g.floors = m.floors;
    g.obst = m.obst;
    g.sol = m.sol || m.obst; // cajas de choque (más pequeñas que el dibujo en algunos mapas): igual que la sala
    g.map = m.map || 'greenhouse'; // escenario elegido en la sala: decide cómo se pinta el lienzo
    g.grid = makeGrid(m.world, m.floors, g.sol);
    // La vista solo la cortan los muros de las salas: las cajas, barriles y máquinas no
    // dan sombra, así que no tapan a quien pasa por detrás.
    g.sightGrid = makeGrid(m.world, m.floors, []);
    g.btn = m.button;
    g.pnl = m.panel;
    g.rmeta = m.rmeta || null;
    g.rpts = (m.rmeta && m.rmeta.pts) || [];
    g.vents = m.vents || [];
    g.vent = { in: false, id: null, net: null, vents: [] };
    g.doors = m.doors || []; // puertas de cada sala: dónde están y a qué salas pertenecen
    g.doorKey = null;
    g.cfg = { speed: m.speed, radius: m.radius, killRange: m.killRange, useRange: m.useRange, reportRange: m.reportRange, trackRange: m.trackRange || m.reportRange };
    g.meetUsed = !!m.bu; // 1 = esta sala ya te tiene apuntada la reunión gastada
    g.others.clear();
    g.bodies = [];
    g.fx.clear();
    g.ventFx.clear();
    g.saves = [];
    g.puffs = [];
    g.off = null;
    g.ackDir = null;
    g.snap = true;
    g.me.alive = m.alive !== false;
    g.pend = [];
    g.srvB = null;
    g.inMoving = false;
    g.inSeq = m.seq || 0; // al recargar se continúa la secuencia de la sala
    g.mini = null;
    g.miniOpen = false;
    g.inputLock = false;
    setMini(null);
    setMapOpen(false);
    setShiftPick(null);
    g.st = { prog: 0, dark: false, vr: 420, sr: 420, kcd: 0, scd: 0, rcd: 0, sq: 0, rx: null, sh: null, mo: null, form: null, fz: 0, vcd: 0, shcd: 0, inv: 0, icd: 0, gcd: 0, vleft: 0, sciOn: 0, sciL: 0, sciCd: 0, vt: null, drs: null, trk: null, trkcd: 0 };
    const built = buildWorld(m.world, m.floors, m.obst, m.button, m.vents || [], {
      map: g.map, panel: m.panel, rcore: g.rmeta && g.rmeta.core, rpts: g.rpts, tasks: g.tasks,
    });
    g.mapC = built.mapC;
    g.miniC = built.miniC;
    setTasks(g.tasks);
    setDoneIds([...g.done]);
    setChat([]);
    setMeeting(null);
    setResult(null);
    setEnd(null);
    setDeath(null);
    const mates = (m.mates || []).filter((id) => id !== g.myId).map((id) => (g.roster.get(id) || {}).name).filter(Boolean);
    const mine = g.roster.get(g.myId) || {};
    // El punto de salida llega con la partida: el botón está dentro de una máquina, así que
    // arrancar ahí daría un salto al empezar y la primera predicción saldría desde un muro.
    const yo = m.you || [m.button.x, m.button.y];
    g.srv.x = yo[0];
    g.srv.y = yo[1];
    g.me.x = yo[0];
    g.me.y = yo[1];
    if (m.phase === 'roles') {
      setReveal({ role: m.role, color: mine.color, name: mine.name, mates, taskCount: g.tasks.length, shifter: !!m.shifter, viper: !!m.viper, engineer: !!m.engineer, alerter: !!m.alerter, judge: !!m.judge, angel: !!m.angel, scientist: !!m.scientist, spectre: !!m.spectre, detective: !!m.detective, tracker: !!m.tracker, trackerMs: m.tms || 40, trackerCd: m.tcd || 30 });
      go('roles');
    } else {
      setReveal(null);
      go('playing');
    }
  }, [g, go]);

  const onState = useCallback((m) => {
    // La posición del servidor se guarda tal cual: la reconciliación con las órdenes
    // que van en camino la hace el lienzo, y nunca reemplaza una posición más nueva.
    g.srv.x = m.x;
    g.srv.y = m.y;
    // punto donde empezó la orden en vigor: base de la reconciliación (ver predict.js)
    g.srvB = Number.isFinite(m.bx) && Number.isFinite(m.by) ? { x: m.bx, y: m.by } : null;
    // Desfase con el reloj de la sala: el mínimo de (mi reloj − su marca) dice cuánto tarda
    // un estado en llegar. Con eso el lienzo sabe desde cuándo está vieja esa posición.
    if (m.tm) {
      const d = performance.now() - m.tm;
      g.off = g.off === null ? d : Math.min(g.off, d);
    }
    if (g.snap) { g.me.x = m.x; g.me.y = m.y; g.snap = false; g.pend = []; }
    g.me.alive = !!m.a;
    // Puertas: cuando cambian se rearma la rejilla de paso, para que el cliente prediga igual
    // que la sala (si no, se vería el tirón de empujar contra una puerta que aún no conoce).
    const drs = m.drs || [];
    const doorKey = drs.map((d) => d[0]).join(',');
    if (doorKey !== g.doorKey) {
      g.doorKey = doorKey;
      const boxes = drs.map(([id]) => (g.doors || []).find((d) => d.id === id)).filter(Boolean).map((d) => [d.x, d.y, d.w, d.h]);
      g.grid = makeGrid(g.world, g.floors, g.sol || g.obst || []);
      g.grid.boxes = boxes.map((b) => ({ x: b[0], y: b[1], w: b[2], h: b[3] })); // puertas cerradas: rectángulos exactos, como en la sala
      g.sightGrid = makeGrid(g.world, g.floors, boxes);
    }
    const prevRx = g.st.rx;
    const prevDark = g.st.dark;
    const prevForm = g.st.form;
    const prevFz = g.st.fz > 0;
    const prevSh = g.st.sh || {};
    // sq = -1 significa que el servidor de la sala aún no confirma órdenes: se usa el
    // ajuste suave de siempre en lugar de la reconciliación por órdenes.
    g.st = {
      prog: m.prog, dark: m.dark, vr: m.vr, sr: m.sr || 0, kcd: m.kcd, scd: m.scd, rcd: m.rcd,
      sq: Number.isInteger(m.sq) ? m.sq : -1, rx: m.rx || null,
      sh: m.sh || null, mo: m.mo || null, form: m.form || null, fz: m.fz || 0, vcd: m.vcd || 0, shcd: m.shcd || 0,
      vleft: m.vleft || 0, // al ingeniero le queda esto dentro de la rejilla: luego se le saca solo
      sciOn: m.sciOn || 0, sciL: m.sciL || 0, sciCd: m.sciCd || 0, vt: m.vt || null,
      drs: m.drs || null, // puertas cerradas ahora mismo: [id, ms que les quedan]
      dcd: m.dcd || null, // salas que acaban de abrir: [sala, ms que faltan para poder cerrarlas]
      inv: m.inv || 0, icd: m.icd || 0,
      bcd: m.bcd || 0,
      gcd: m.gcd || 0,
      tm: m.tm || 0,
      trk: m.trk || null,      // jugador marcado con el localizador: dónde está y cuánto le queda
      trkcd: m.trkcd || 0,    // y la espera del Localizador para poner otro
    };
    // transformación: suena al empezar, al cambiar la skin y al recuperar el cuerpo
    if (!prevForm && g.st.form) sfx('shiftIn');
    else if (prevForm && !g.st.form) sfx('shiftOut');
    else if (prevForm && prevForm.morph && !g.st.form.morph) sfx('switch');
    if (!prevFz && g.st.fz > 0) sfx('freeze');
    // efectos: quién empieza a transformarse (con su objetivo) y quién acaba de volver
    const fxNow = performance.now();
    const shNow = g.st.sh || {};
    const moNow = g.st.mo || {};
    for (const id of Object.keys(moNow)) {
      const cur = g.fx.get(id);
      if (!cur || cur.kind !== 'in' || cur.target !== moNow[id]) g.fx.set(id, { kind: 'in', target: moNow[id], at: fxNow });
    }
    for (const id of Object.keys(prevSh)) {
      if (!shNow[id]) g.fx.set(id, { kind: 'out', target: prevSh[id], at: fxNow });
    }
    if (!prevRx && g.st.rx) {
      loop('reactor');
      sfx('alert');
      toast({ description: tr('¡Reactor inestable! Dos jugadores deben mantener las consolas A y B.'), duration: 5000 });
    } else if (prevRx && !g.st.rx) {
      stopLoop('reactor');
      sfx('fixed');
      toast({ description: tr('Reactor estabilizado.') });
    }
    // apagón: zumbido grave mientras dura, y chispa al volver la luz
    if (!prevDark && m.dark) loop('blackout');
    else if (prevDark && !m.dark) { stopLoop('blackout'); sfx('fixed'); }
    // si las luces vuelven mientras estás en el cuadro, se cierra solo
    if (!m.dark && g.mini && g.mini.lights) { g.mini = null; g.miniOpen = false; g.inputLock = false; setMini(null); }
    g.vent.in = !!m.vi;
    if (m.bu) g.meetUsed = true; // tu reunión ya gastada: lo confirma la sala (una por jugador)
    g.bodies = m.b || [];
    const seen = new Set();
    const nowMs = performance.now();
    for (const [id, x, y, a, iv] of m.ps || []) {
      seen.add(id);
      let o = g.others.get(id);
      if (!o) {
        o = { x, y, ax: x, ay: y, bx: x, by: y, t0: nowMs, t1: nowMs, face: 1, moving: false, alive: true, inv: false };
        g.others.set(id, o);
      } else {
        // el aviso anterior pasa a ser el principio del tramo que el lienzo interpola
        o.ax = o.bx; o.ay = o.by; o.t0 = o.t1;
        o.bx = x; o.by = y; o.t1 = nowMs;
      }
      o.tx = x; // última posición que ha dado la sala: se usa para los alcances (matar, escudar)
      o.ty = y;
      o.alive = !!a;
      o.inv = !!iv;
    }
    for (const id of [...g.others.keys()]) if (!seen.has(id)) g.others.delete(id);
  }, [g]);

  const dial = useCallback((kind, roomCode, tries = 0) => {
    setError('');
    setBusy(true);
    attemptRef.current = { kind, tries };
    try { localStorage.setItem('setas_name', name); } catch (e) { /* sin permisos */ }
    closeConn();
    // Si la sala no responde, el menú se libera en vez de quedarse en "Conectando…".
    connectTimer.current = window.setTimeout(() => {
      if (screenRef.current !== 'menu') return;
      closeConn();
      setBusy(false);
      setError(tr('No se ha podido conectar con la sala. Inténtalo otra vez.'));
    }, CONNECT_MS);
    try {
      const conn = connectRoom(roomCode, { id: getConnId() });
      connRef.current = conn;
      subRef.current = conn.subscribe((m) => handlerRef.current(m));
      conn.send({ t: kind, name: name || tr('Seta'), code: roomCode });
    } catch (e) {
      closeConn();
      setBusy(false);
      setError(tr('No se ha podido conectar con la sala.'));
    }
  }, [closeConn, name]);

  // Al volver a la pestaña el socket se rehace solo con el mismo id, así que la sala te
  // reconoce. Si ya te había soltado por estar tanto tiempo fuera, este aviso te devuelve
  // tu sitio en la sala sin tener que recargar la página.
  const resumedAt = useRef(0);
  const resumeRoom = useCallback(() => {
    if (screenRef.current === 'menu' || !connRef.current || !code) return;
    if (Date.now() - resumedAt.current < 3000) return;
    resumedAt.current = Date.now();
    connRef.current.send({ t: 'ping' });
    connRef.current.send({ t: 'join', name: name || tr('Seta'), code });
  }, [code, name]);

  const revealDone = useCallback(() => {
    if (screenRef.current === 'roles') go('playing');
  }, [go]);

  const leave = useCallback(() => {
    // Si el anfitrión se va y no queda nadie, la sala desaparece del listado.
    const left = (screenRef.current === 'lobby'
      ? Math.max(1, lobbyCount)
      : Math.max(1, g.roster.size - [...g.gone].filter((id) => g.roster.has(id)).length)) - 1;
    if (code && g.myId && g.myId === g.hostId && left <= 0) {
      forgetRoom(code).catch(() => { /* la fila caduca sola */ });
    }
    if (connRef.current) { try { connRef.current.send({ t: 'quit' }); } catch (e) { /* ya cerrada */ } }
    closeConn();
    stopLoop('reactor');
    stopLoop('blackout');
    stopLoop('ambience');
    g.myId = null;
    g.hostId = null;
    g.miniOpen = false;
    g.inputLock = false;
    g.mini = null;
    g.pend = [];
    g.st = { ...g.st, sq: 0, rx: null };
    g.others.clear();
    g.fx.clear();
    setMini(null);
    setShiftPick(null);
    setSci(false);
    setDeath(null);
    setReveal(null);
    setInterro(null);
    setMapOpen(false);
    setLobby(null);
    setMeeting(null);
    setResult(null);
    setEnd(null);
    setChat([]);
    setLChat([]);
    setBusy(false);
    setError('');
    go('menu');
  }, [closeConn, code, g, go, lobbyCount]);

  handlerRef.current = (m) => {
    if (!m || typeof m.t !== 'string') return;
    aliveAt.current = performance.now(); // la sala ha contestado: la conexión está viva
    switch (m.t) {
      case 'error': {
        if (attemptRef.current && attemptRef.current.kind === 'create' && attemptRef.current.tries < 6 && /ocupado/i.test(m.msg)) {
          dial('create', randCode(), attemptRef.current.tries + 1);
          return;
        }
        if (connectTimer.current) { clearTimeout(connectTimer.current); connectTimer.current = null; }
        sfx('deny');
        if (screenRef.current === 'menu') {
          toast({ description: tServer(m.msg) });
          setBusy(false);
          setError(tServer(m.msg));
          closeConn();
          break;
        }
        // La sala ya no te tiene (te soltó mientras la pestaña estaba parada): se vuelve al
        // menú con el código puesto y se entra otra vez sin recargar la página.
        if (m.out) {
          toast({ description: tr('Te has quedado fuera de la sala: vuelve a entrar con el código.') });
          leave();
          break;
        }
        toast({ description: tServer(m.msg) });
        break;
      }
      case 'joined':
        g.myId = m.id;
        if (connectTimer.current) { clearTimeout(connectTimer.current); connectTimer.current = null; }
        break;
      case 'lobby':
        g.hostId = m.hostId;
        setHostId(m.hostId);
        setCode(m.code || code);
        setLobby(m);
        setLChat(Array.isArray(m.chat) ? m.chat : []);
        if (m.phase === 'lobby') { setBusy(false); setError(''); go('lobby'); }
        break;
      case 'start':
        startGame(m);
        break;
      case 'go':
        sfx('begin');
        if (screenRef.current === 'roles') go('playing');
        break;
      case 's':
        onState(m);
        break;
      case 'ventFx':
        // la rejilla se abre y se cierra en el instante en que alguien entra o sale
        for (const id of m.ids || []) g.ventFx.set(id, performance.now());
        break;
      case 'vent': {
        // entrar, salir y viajar entre rejillas suenan distinto
        const moved = g.vent.in && m.in && g.vent.id !== m.id;
        sfx(m.in ? (moved ? 'ventMove' : 'ventIn') : 'ventOut');
        g.vent.in = !!m.in;
        if (m.in) {
          g.vent.id = m.id;
          g.vent.net = m.net;
          g.vent.vents = m.vents || [];
          g.snap = true; // la sala te ha llevado a la rejilla: manda su posición y no se repiten órdenes viejas
        }
        break;
      }
      case 'vitals': {
        // el panel del científico: la sala manda cuándo se abre y cuándo se cierra (batería
        // agotada, reunión o muerte). Es translúcido y no bloquea: con él delante se anda igual.
        sfx(m.on ? 'taskOpen' : m.empty ? 'miss' : 'back');
        setSci(!!m.on);
        g.inputLock = g.miniOpen;
        if (m.empty) toast({ description: tr('Batería del panel agotada: ya no puedes volver a abrirlo.'), duration: 7000 });
        break;
      }
      case 'taskAck':
        g.done.add(m.id);
        setDoneIds([...g.done]);
        toast({ description: tr('Tarea completada') });
        break;
      case 'died': {
        // la muerte manda: se corta el minijuego, la interacción y el movimiento al instante
        sfx('death');
        g.inputLock = true;
        g.miniOpen = false;
        g.mini = null;
        setMapOpen(false);
        g.me.moving = false;
        g.pend = [];
        sendInput(g, send, 0, 0, g.frameT || performance.now());
        setMini(null);
        setShiftPick(null);
        setSci(false);
        setDeath({ name: m.name || tr('Alguien'), color: m.color || '#e63946' });
        // el rol de Ángel Guardián no se conoce en vida: se descubre aquí, al morir
        if (m.angel) {
          g.angel = true;
          toast({ description: tr('¡Eras el Ángel Guardián! Con [T] puedes escudar al tripulante que tengas al lado.'), duration: 9000 });
        }
        window.setTimeout(() => {
          setDeath(null);
          g.inputLock = false;
        }, DEATH_MS);
        break;
      }
      case 'angelOn':
        // expulsado en una votación: también ahora descubre que es el Ángel Guardián
        g.angel = true;
        toast({ description: tr('¡Eras el Ángel Guardián! Con [T] puedes escudar al tripulante que tengas al lado.'), duration: 9000 });
        break;
      case 'alertDeath': {
        // el Alertador ha caído: todos ven una flecha que señala su cuerpo
        sfx('alert');
        g.alert = { x: m.x, y: m.y, color: m.color, expire: performance.now() + (m.ms || 10000) };
        toast({ description: tr('¡El Alertador ha caído! Sigue la flecha hasta su cuerpo.'), duration: 6000 });
        break;
      }
      case 'doorFx':
        // el impostor ha cerrado las puertas de una sala: se oyen las compuertas caer
        sfx('doorClose');
        break;
      case 'doorsOpen':
        // y se oyen subir cuando se cumplen los 10 s
        sfx('doorOpen');
        break;
      case 'venom':
        // la Víbora ha matado: el veneno borbotea sobre el cuerpo, lo ve todo el mundo
        sfx('venom');
        g.puffs = [...(g.puffs || []).filter((pf) => performance.now() - pf.at < 1600), { x: m.x, y: m.y, at: performance.now() }];
        break;
      case 'saved': {
        // el Ángel Guardián ha escudado a alguien: el escudo asoma un instante donde estaba
        sfx('fixed');
        g.saves = [...(g.saves || []).filter((sv) => performance.now() - sv.at < 2200), { x: m.x, y: m.y, at: performance.now() }];
        if (m.by === g.myId) toast({ description: tr('Estaba protegido: la muerte no entra. Tardas 10 s en volver a eliminar.'), duration: 6000 });
        break;
      }
      case 'guardAck':
        // solo lo sabe el Ángel: el protegido no recibe ningún aviso
        sfx('miniDone');
        toast({ description: tr('Escudo listo: aguanta un intento de muerte durante {s} s.', { s: Math.round((m.ms || 0) / 1000) }), duration: 5000 });
        break;
      case 'interroAck':
        // la sala confirma la consulta: el informe llega en la próxima reunión
        g.detectiveUsed = true;
        g.interroName = m.name || '';
        sfx('miniDone');
        toast({ description: tr('Has interrogado a {name}. En la próxima reunión sabrás si es tripulante o impostor.', { name: m.name }), duration: 8000 });
        break;
      case 'trackAck':
        // la sala confirma el localizador: su posición se ve en el mapa mientras dure
        sfx('switch');
        toast({ description: tr('Localizador puesto en {name}: lo verás en el mapa {s} s.', { name: m.name, s: Math.round((m.ms || 0) / 1000) }), duration: 6000 });
        break;
      case 'trkOff':
        // el jugador que llevabas localizado ha caído: el localizador se apaga al instante
        g.st = { ...g.st, trk: null };
        break;
      case 'interroReveal':
        // informe privado del Detective: el rol de quien interrogó, solo en esta reunión
        sfx('voteOpen');
        setInterro(m);
        break;
      case 'kicked': {
        // el anfitrión te ha echado de la sala de espera: se vuelve al menú limpio
        sfx('deny');
        toast({ description: m.ban ? tr('El anfitrión te ha baneado: no puedes volver a esta sala.') : tr('El anfitrión te ha expulsado. Puedes volver a entrar con el código.') });
        leave();
        break;
      }
      case 'left': {
        const gone = (g.roster.get(m.id) || {}).name || tr('Alguien');
        g.gone.add(m.id);
        g.hostId = m.hostId;
        setHostId(m.hostId);
        g.others.delete(m.id);
        sfx('leave');
        setMeeting((mt) => (mt ? { ...mt, players: mt.players.filter((p) => p.id !== m.id) } : mt));
        toast({ description: m.ban ? tr('{name} ha sido baneado de esta sala', { name: gone }) : m.kicked ? tr('{name} ha sido expulsado', { name: gone }) : tr('{name} se ha desconectado', { name: gone }) });
        break;
      }
      case 'meeting':
        // una reunión cierra lo que hubiera abierto: un minijuego taparía la votación
        sfx('meeting');
        stopLoop('blackout'); // el zumbido del apagón calla en la votación; si sigue, vuelve al reanudar
        g.miniOpen = false;
        g.inputLock = false;
        g.mini = null;
        setMapOpen(false);
        setMini(null);
        setShiftPick(null);
        setSci(false);
        g.others.clear();
        // al entrar en reunión el cambiaformas vuelve a su forma sin animación: los
        // tripulantes no deben ver la transformación de vuelta al acabar la reunión
        g.st = { ...g.st, sh: null, mo: null, form: null, fz: 0 };
        g.fx.clear();
        g.vent.in = false;
        g.alert = null;
        setChat([]);        setMeeting({
          seq: Date.now(), callerId: m.caller, reason: m.reason, bodyName: m.bodyName,
          players: m.players, voted: new Set(),
          voting: !!m.voting, discussMs: m.discussMs || 0, voteMs: m.voteMs || 0,
        });
        setInterro(null); // el informe es de esta reunión: la siguiente empieza limpia
        go('meeting');
        break;
      case 'voteOpen':
        // la sala abre la votación para todos a la vez
        sfx('voteOpen');
        setMeeting((mt) => (mt ? { ...mt, voting: true, voteMs: m.ms } : mt));
        break;
      case 'chat':
        sfx('chat');
        setChat((c) => [...c, m].slice(-80)); // el chat de la reunión no crece sin límite
        break;
      case 'lchat':
        sfx('chat');
        setLChat((c) => [...c, m]);
        break;
      case 'voted':
        if (m.id !== g.myId) sfx('blip'); // el tuyo ya suena al confirmarlo
        setMeeting((mt) => (mt ? { ...mt, voted: new Set([...mt.voted, m.id]) } : mt));
        break;
      case 'judgeAck':
        // el servidor confirma que el Juez ha gastado su única sentencia
        g.judgeUsed = true;
        sfx('vote');
        toast({ description: tr('Has usado tu sentencia del Juez. Tu decisión decide la expulsión.') });
        break;
      case 'shiftTargets':
        // la sala responde con quiénes se pueden imitar ahora mismo
        setShiftPick((cur) => (cur ? { players: m.players || [], loaded: true } : cur));
        break;
      case 'result':
        sfx(m.ejected ? 'eject' : 'tie');
        setResult(m);
        go('result');
        break;
      case 'resume':
        sfx('begin');
        if (g.st.dark) loop('blackout'); // las luces siguen apagadas tras la reunión
        g.snap = true;
        g.miniOpen = false;
        g.inputLock = false;
        g.mini = null;
        setMini(null);
        setMapOpen(false);
        g.others.clear();
        g.bodies = [];
        g.vent.in = false;
        g.alert = null;
        setShiftPick(null);
        setSci(false);
        setMeeting(null);
        setInterro(null);
        setResult(null);
        go('playing');        break;
      case 'end': {
        g.miniOpen = false;
        g.inputLock = false;
        g.mini = null;
        setMini(null);
        setMapOpen(false);
        setSci(false);
        g.alert = null;
        stopLoop('reactor');
        stopLoop('blackout');
        sfx(m.winner === (g.role === 'impostor' ? 'impostors' : 'crew') ? 'win' : 'lose');
        setEnd(m);
        setInterro(null);
        go('end');
        break;
      }
      default:
        break;
    }
  };

  const openMini = useCallback((ui) => {
    g.miniOpen = true;
    g.inputLock = true;
    g.mini = ui;
    sendInput(g, send, 0, 0, g.frameT || performance.now());
    setMini(ui);
  }, [g, send]);

  const closeMini = useCallback(() => {
    g.miniOpen = false;
    g.inputLock = false;
    g.mini = null;
    setMini(null);
  }, [g]);

  const finishMini = useCallback((ui) => {
    setTimeout(() => {
      if (g.mini !== ui || screenRef.current !== 'playing') return;
      closeMini();
      if (ui.lights) send({ t: 'fix' });
      else send({ t: 'task', id: ui.id });
    }, 350);
  }, [closeMini, send, g]);

  const useAction = useCallback(() => {
    if (screenRef.current !== 'playing' || g.miniOpen) return;
    const c = contextOf(g);
    if (c.hold) { sfx('switch'); send({ t: 'hold', side: c.hold.side }); }
    else if (c.panel) { sfx('taskOpen'); openMini({ id: -1, name: tr('Reiniciar el cuadro eléctrico'), game: 'switch', lights: true }); }
    else if (c.task) { sfx('taskOpen'); openMini(c.task); }
    else if (c.btn) { sfx('button'); send({ t: 'button' }); } // la sala confirma si tu reunión quedó gastada
  }, [g, openMini, send]);

  const killAction = useCallback(() => {
    if (screenRef.current === 'playing' && contextOf(g).target && g.st.kcd <= 0) send({ t: 'kill' });
  }, [g, send]);

  const reportAction = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    const c = contextOf(g);
    if (c.body) send({ t: 'report' }); // reportar cuerpos es ilimitado y vale aunque haya sabotaje
  }, [g, send]);

  // mapa: se abre y se cierra con la M (o con el botón), sin espera y para todo el mundo.
  // Se puede seguir andando con él abierto: no bloquea el movimiento ni detiene al seta.
  // El impostor puede cerrar desde él las puertas de una sala; el cierre lo confirma la
  // sala, que es la que manda.
  const closeMap = useCallback(() => setMapOpen(false), []);

  const mapAction = useCallback(() => {
    if (screenRef.current !== 'playing' || g.miniOpen || g.vent.in) return;
    sfx('click');
    setMapOpen((v) => !v);
  }, [g]);

  const sabAction = useCallback(() => {
    // un impostor muerto sigue saboteando (apagón, reactor y puertas)
    if (screenRef.current === 'playing' && g.role === 'impostor' && g.st.scd <= 0 && !g.st.dark && !g.st.rx) send({ t: 'sabotage' });
  }, [g, send]);

  const ventAction = useCallback(() => {
    if (screenRef.current !== 'playing' || !(g.role === 'impostor' || g.engineer) || !g.me.alive) return;
    if (g.st.fz > 0) return;
    if (g.vent.in) send({ t: 'ventOut' });
    else if (g.st.vcd <= 0 && contextOf(g).vent) send({ t: 'vent' });
  }, [g, send]);

  // viajar a otra rejilla de la misma red (las flechas dentro de la rejilla)
  const ventToAction = useCallback((id) => {
    if (screenRef.current === 'playing' && g.vent.in) send({ t: 'ventTo', id });
  }, [g, send]);

  const reactorAction = useCallback(() => {
    if (screenRef.current !== 'playing' || g.role !== 'impostor') return;
    if (g.st.rcd <= 0 && !g.st.rx && !g.st.dark) send({ t: 'reactor' });
  }, [g, send]);

  // el Espectro se vuelve invisible 10 s: no mata ni entra en rejillas mientras dura
  const invisAction = useCallback(() => {
    if (screenRef.current !== 'playing' || !g.spectre || g.role !== 'impostor' || !g.me.alive) return;
    if (g.st.fz > 0 || g.vent.in || g.st.inv > 0 || g.st.icd > 0) return;
    send({ t: 'invis' });
  }, [g, send]);

  // el Ángel Guardián ya muerto escuda al tripulante que tenga al lado; el protegido no
  // se entera de nada, solo se ve el escudo si el impostor intenta matarlo
  const guardAction = useCallback(() => {
    if (screenRef.current !== 'playing' || !g.angel || g.me.alive || g.miniOpen) return;
    if (g.st.gcd > 0) return;
    send({ t: 'guard' });
  }, [g, send]);

  // shapeshifter: elegir a quién imitar; la sala confirma con la lista de vivos
  const openShift = useCallback(() => {
    if (screenRef.current !== 'playing' || !g.shifter || !g.me.alive) return;
    if (g.inputLock || g.vent.in || g.st.fz > 0 || g.st.form || g.st.shcd > 0) return;
    g.inputLock = true; // eligiendo forma no se anda
    setShiftPick({ players: [], loaded: false });
    send({ t: 'shiftPick' });
  }, [g, send]);

  const closeShift = useCallback(() => {
    g.inputLock = false;
    setShiftPick(null);
  }, [g]);

  const pickShift = useCallback((id) => {
    send({ t: 'shift', id });
    closeShift();
  }, [closeShift, send]);

  // científico: el mismo botón abre y cierra el panel de constantes vitales
  const closeSci = useCallback(() => {
    setSci(false);
    g.inputLock = g.miniOpen; // solo bloquea lo que esté abierto de verdad (un minijuego)
    send({ t: 'vitalsOff' });
  }, [g, send]);

  // científico: el panel es translúcido y no bloquea nada, así que con él delante se sigue
  // andando y haciendo lo de siempre: solo se abre y se cierra.
  const sciAction = useCallback(() => {
    if (screenRef.current !== 'playing' || !g.scientist || !g.me.alive) return;
    if (g.st.sciOn) return closeSci();
    if (g.miniOpen || g.st.sciCd > 0 || g.st.sciL <= 0 || g.vent.in || g.st.fz > 0) return;
    setSci(true);
    send({ t: 'vitals' });
  }, [closeSci, g, send]);

  // detective: una sola consulta por partida, con las misiones hechas y alguien al lado
  const interroAction = useCallback(() => {
    if (screenRef.current !== 'playing' || !g.detective || !g.me.alive) return;
    if (g.detectiveUsed || g.miniOpen || g.vent.in || g.st.fz > 0) return;
    send({ t: 'interrogate' });
  }, [g, send]);

  // localizador: marca al jugador que tenga al lado; mientras dure, el mapa dice dónde está
  const trackAction = useCallback(() => {
    if (screenRef.current !== 'playing' || !g.tracker || !g.me.alive) return;
    if (g.miniOpen || g.vent.in || g.st.fz > 0 || g.st.trk || g.st.trkcd > 0) return;
    send({ t: 'track' });
  }, [g, send]);

  useEffect(() => {
    g.act = { use: useAction, kill: killAction, report: reportAction, sab: sabAction, vent: ventAction, ventTo: ventToAction, rtor: reactorAction, shift: openShift, invis: invisAction, guard: guardAction, sci: sciAction, interro: interroAction, track: trackAction, map: mapAction, mapOff: closeMap };
  });

  // El anuncio de la sala en el listado lo lleva la propia sala (un solo escritor, la
  // autoridad). Antes también lo escribía el cliente con datos viejos y podía dejar
  // salas fantasma o recuentos equivocados en el menú.

  useEffect(() => {
    const iv = setInterval(() => {
      if (!connRef.current || screenRef.current === 'menu') return;
      send({ t: 'ping' });
      // Si la sala lleva un buen rato sin contestar, la conexión se ha quedado muerta
      // (pestaña suspendida): se rehace con el mismo id, así la sala te reconoce y sigues
      // donde estabas en vez de obligarte a recargar la página.
      if (performance.now() - aliveAt.current > 20000) {
        aliveAt.current = performance.now();
        dial('join', code);
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [code, dial, send]);

  // La pestaña vuelve a primer plano: se recupera la conexión al momento, sin esperar al latido.
  useEffect(() => {
    const onShow = () => { if (!document.hidden) resumeRoom(); };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
    };
  }, [resumeRoom]);

  // ambiente del invernadero: suena durante la partida y se apaga en los menús
  useEffect(() => {
    if (screen === 'roles' || screen === 'playing' || screen === 'meeting' || screen === 'result') loop('ambience');
    else stopLoop('ambience');
  }, [screen]);

  // música de fondo: tranquila en el menú (donde se cambia el nombre) y misteriosa mientras
  // se espera en una sala. En partida suena el ambiente, no la música.
  useEffect(() => {
    if (screen === 'menu') loop('menuMusic');
    else stopLoop('menuMusic');
    if (screen === 'lobby') loop('lobbyMusic');
    else stopLoop('lobbyMusic');
  }, [screen]);

  // música del resultado: cada bando tiene la suya y suena mientras se ve la pantalla final
  useEffect(() => {
    if (screen === 'end' && end) loop(end.winner === 'crew' ? 'winCrew' : 'winImpostor');
    else { stopLoop('winCrew'); stopLoop('winImpostor'); }
  }, [screen, end]);

  // Anuncio de la sala en el listado: lo lleva el anfitrión, así que hay un solo escritor
  // por sala. Se escribe al momento de crearla y se refresca mientras quede gente, para
  // que cualquiera pueda verla y entrar.
  useEffect(() => {
    const inRoom = screen === 'lobby' || screen === 'roles' || screen === 'playing' || screen === 'meeting' || screen === 'result';
    if (!inRoom || !code || !g.myId || g.myId !== hostId) return;
    const total = screen === 'lobby'
      ? Math.max(1, lobbyCount)
      : Math.max(1, g.roster.size - [...g.gone].filter((id) => g.roster.has(id)).length);
    const write = () => {
      announceRoom({
        code,
        players: total,
        status: screen === 'lobby' ? 'lobby' : 'playing',
        min: lobbyMin,
        max: lobbyMax,
      }).catch(() => { /* el listado es informativo: nunca corta la partida */ });
    };
    write();
    const iv = setInterval(write, 12000);
    // Al volver a la pestaña se anuncia al momento: si el navegador espació el latido
    // mientras estaba en segundo plano, la sala no se queda fuera del listado.
    const onFocus = () => write();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(iv);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [screen, code, hostId, g, lobbyCount, lobbyMin, lobbyMax]);

  useEffect(() => () => closeConn(), [closeConn]);

  const copyInvite = async () => {
    const c = (lobby && lobby.code) || code;
    const base = window.location.href.split(/[?#]/)[0];
    const link = /^https?:$/.test(window.location.protocol) ? `${base}?sala=${c}` : c;
    try {
      await navigator.clipboard.writeText(link);
      toast({ description: tr('Enlace copiado') });
    } catch (e) {
      toast({ description: tr('Código: {c}', { c }) });
    }
  };

  return (
    <div
      className="game-shell fixed inset-0 overflow-hidden bg-[#0d1a14] text-[#eaf5ec]"
      style={{ fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif' }}
    >
      {screen === 'playing' ? (
        <>
          <GameCanvas g={g} send={send} />
          <Hud
            g={g}
            tasks={tasks}
            doneIds={doneIds}
            onMap={mapAction}
            onUse={useAction}
            onKill={killAction}
            onRep={reportAction}
            onSab={sabAction}
            onReactor={reactorAction}
            onVent={ventAction}
            onVentTo={ventToAction}
            onShift={openShift}
            onInvis={invisAction}
            onGuard={guardAction}
            onSci={sciAction}
            onInterro={interroAction}
            onTrack={trackAction}
          />
          {mapOpen ? <MapOverlay g={g} onClose={closeMap} onDoors={(room) => send({ t: 'doors', room })} /> : null}
          {shiftPick ? <ShiftPicker players={shiftPick.players} loaded={shiftPick.loaded} onPick={pickShift} onCancel={closeShift} /> : null}
          {sci ? <ScientistPanel g={g} onClose={closeSci} /> : null}
        </>
      ) : null}

      {screen === 'roles' && reveal ? <RoleScreen {...reveal} onDone={revealDone} /> : null}

      {screen === 'menu' ? (
        <MenuScreen
          name={name}
          onName={setName}
          code={code}
          onCode={setCode}
          busy={busy}
          error={error}
          onCreate={() => dial('create', randCode())}
          onJoinRoom={(c) => dial('join', c)}
          onJoin={() => {
            const c = code.toUpperCase().trim();
            if (c.length !== 4) { setError(tr('Escribe el código de 4 letras.')); return; }
            dial('join', c);
          }}
        />
      ) : null}

      {screen === 'lobby' && lobby ? (
        <LobbyScreen
          lobby={lobby}
          myId={g.myId}
          onColor={(color) => send({ t: 'color', color })}
          onSetting={(k, v) => send({ t: 'settings', k, v })}
          onMap={(id) => send({ t: 'map', map: id })}
          onStart={() => send({ t: 'start' })}
          onLeave={leave}
          onCopy={copyInvite}
          chat={lchat}
          onChat={(text) => send({ t: 'lchat', text })}
          onKick={(id, mode) => send({ t: 'kick', id, mode })}
        />
      ) : null}

      {screen === 'meeting' && meeting ? (
        <MeetingScreen
          key={meeting.seq}
          data={meeting}
          myId={g.myId}
          alive={g.me.alive}
          role={g.role}
          mates={g.mates}
          roster={g.roster}
          chat={chat}
          gone={g.gone}
          interro={interro}
          judge={g.judge}
          judgeUsed={g.judgeUsed}
          onVote={(target) => send({ t: 'vote', target })}
          onSkip={() => send({ t: 'vote', target: 'skip' })}
          onJudge={(target) => send({ t: 'judge', target })}
          onChat={(text) => send({ t: 'chat', text })}
        />
      ) : null}

      {screen === 'result' && result ? <ResultScreen result={result} roster={g.roster} /> : null}

      {screen === 'end' && end ? (
        <EndScreen end={end} isHost={g.myId === g.hostId} onAgain={() => send({ t: 'lobby' })} />
      ) : null}

      {mini ? <MiniGame task={mini} onFinish={() => finishMini(mini)} onCancel={closeMini} /> : null}
      {death ? <DeathOverlay killer={death} /> : null}
      <LanguageSwitcher compact={screen === 'playing'} />
      <SoundToggle />
    </div>
  );
}