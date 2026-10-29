/* ================================================================
   Chat de los bots: nombres al azar, frases en español e inglés y lectura
   (sencilla) de lo que escriben los demás. Cada frase es un par [es, en]; el
   motor manda a cada jugador la versión de su idioma.
   ================================================================ */

import fs from 'node:fs';

export const BOT_NAMES = [
  'Boletus', 'Morilla', 'Champi', 'Trufa', 'Níscalo', 'Amanita', 'Rebozuelo', 'Shiitake', 'Portobello', 'Enoki',
  'Micelio', 'Esporita', 'Gírgola', 'Rúsula', 'Cantarela', 'Yesca', 'Colmenilla', 'Parasol', 'Setita', 'Lactario',
  'Cordyceps', 'Hifa', 'Pie Azul', 'Marasmio', 'Oronja', 'Hongo Zen', 'Moho', 'Liquen', 'Musgo', 'Hongui',
  'Reishi', 'Maitake', 'Bejín', 'Barbuda', 'Coprino', 'Lengua', 'Seta Loca', 'Mycelius', 'Spora', 'Fungi',
  'Cremini', 'Puffball', 'Chaga', 'Truffle', 'Morel', 'Porcini', 'Cap', 'Mossy', 'Capu', 'Pilz',
];

export function pickBotName(taken, rnd = Math.random) {
  const used = new Set([...taken].map((n) => String(n).toLowerCase()));
  const pool = BOT_NAMES.filter((n) => !used.has(n.toLowerCase()));
  if (pool.length) return pool[Math.floor(rnd() * pool.length)];
  for (let i = 2; i < 99; i++) {
    const n = `Seta${i}`;
    if (!used.has(n.toLowerCase())) return n;
  }
  return 'Bot';
}

/* Nombres de sala en inglés: el cliente ya tiene el diccionario (las claves son el texto en español). */
let EN = null;
export function roomEn(es) {
  if (EN === null) {
    try {
      EN = JSON.parse(fs.readFileSync(new URL('../src/lib/i18n/locales/en.json', import.meta.url), 'utf8'));
    } catch (e) { EN = {}; }
  }
  return EN[es] || es;
}

const pick = (a, rnd = Math.random) => a[Math.floor(rnd() * a.length)];

/* Plantillas: [es, en]. Las {llaves} se rellenan con los parámetros de cada frase. */
const T = {
  greet: [
    ['Ey, buenas.', 'Hey there.'],
    ['Holi, ¿quién más viene?', 'Hi, who else is joining?'],
    ['¡Hola a todos!', 'Hi everyone!'], ['Buenas, ¿empezamos ya?', 'Hey, shall we start?'],
    ['Hola :)', 'Hello :)'], ['¡Listo para jugar!', 'Ready to play!'],
  ],
  greetBack: [
    ['¡Hola, {x}!', 'Hi, {x}!'], ['Buenas {x}, ¿qué tal?', 'Hey {x}, how is it going?'],
    ['Holaa {x}', 'Heyyy {x}'], ['Ey {x}, bienvenido.', 'Hey {x}, welcome.'],
  ],
  // ---- quien convoca / reporta
  bodyFound: [
    ['He encontrado a {v} en {room}.', 'I found {v} in {room}.'],
    ['Reporté a {v}, estaba en {room}.', 'I reported {v}, they were in {room}.'],
    ['{v} está muerto en {room}. Lo he reportado yo.', '{v} is dead in {room}. I reported it.'],
  ],
  buttonNone: [
    ['He llamado a la reunión: algo no me cuadra. ¿Alguien vio algo?', 'I called this meeting, something feels off. Did anyone see anything?'],
    ['Reunión de emergencia. ¿Alguien tiene información?', 'Emergency meeting. Does anyone have info?'],
  ],
  // ---- pruebas de primera mano
  witnessKill: [
    ['¡Vi a {x} matar a {v} en {room}! ¡Votad a {x}!', 'I saw {x} kill {v} in {room}! Vote {x}!'],
    ['{x} mató a {v} delante de mí en {room}. Es el impostor.', '{x} killed {v} right in front of me in {room}. {x} is the impostor.'],
    ['Lo vi con mis ojos: {x} acabó con {v} en {room}.', 'I saw it with my own eyes: {x} took out {v} in {room}.'],
  ],
  witnessKill2: [
    ['Os lo juro, fue {x}. Votadle ya.', 'I swear it was {x}. Vote them now.'],
    ['No hay duda: {x} es el impostor.', 'No doubt about it: {x} is the impostor.'],
    ['Confiad en mí, vi a {x} matar. Todos a {x}.', 'Trust me, I saw {x} kill. Everyone vote {x}.'],
  ],
  witnessVent: [
    ['Vi a {x} usar una rejilla en {room}. Eso es sospechoso.', 'I saw {x} use a vent in {room}. That is suspicious.'],
    ['{x} se metió en una rejilla en {room}. O es impostor o es el ingeniero.', '{x} went into a vent in {room}. Either an impostor or the engineer.'],
  ],
  witnessVentSure: [
    ['Soy el ingeniero y vi a {x} usar una rejilla en {room}: es impostor.', 'I am the engineer and I saw {x} use a vent in {room}: impostor.'],
    ['Yo soy el ingeniero. {x} salió de una rejilla en {room}, es impostor seguro.', 'I am the engineer. {x} came out of a vent in {room}, definitely an impostor.'],
  ],
  witnessAttack: [
    ['Vi a {x} atacar a {v} en {room}, ¡pero un escudo lo salvó! {x} es impostor.', 'I saw {x} attack {v} in {room}, but a shield saved them! {x} is the impostor.'],
  ],
  doubleSeen: [
    ['Vi a dos {x} a la vez en {room}. Uno es un cambiaformas.', 'I saw two {x} at the same time in {room}. One is a shapeshifter.'],
  ],
  detImp: [
    ['Soy el detective: he interrogado a {x} y es impostor. ¡Votadle!', 'I am the detective: I questioned {x} and they are an impostor. Vote them!'],
  ],
  detClean: [
    ['Soy el detective: interrogué a {x} y es inocente.', 'I am the detective: I questioned {x} and they are innocent.'],
  ],
  trackInfo: [
    ['Tenía marcado a {x} con el localizador: estuvo en {room}.', 'I had {x} tagged with my tracker: they were in {room}.'],
  ],
  sciInfo: [
    ['Mi panel dice que {x} está muerto y nadie ha reportado su cuerpo.', 'My panel says {x} is dead and nobody reported a body.'],
  ],
  // ---- coartadas y sospechas
  alibi: [
    ['Yo andaba por {room}, tranquilo.', 'I was around {room}, nothing special.'],
    ['Estaba haciendo tareas en {room}, nada raro.', 'I was doing tasks in {room}, nothing weird.'],
    ['Pues yo en {room}, a lo mío.', 'Me, I was in {room}, doing my thing.'],
    ['Yo estaba en {room} haciendo mis tareas.', 'I was in {room} doing my tasks.'],
    ['Estaba por {room}, a lo mío.', 'I was around {room}, minding my own business.'],
  ],
  alibiSeen1: [
    ['Vi a {a} en {room} hace un rato, trabajando.', 'I saw {a} in {room} a while ago, working.'],
    ['Yo estaba en {room} y {a} también.', 'I was in {room} and so was {a}.'],
    ['Estaba en {room} y vi a {a} por allí.', 'I was in {room} and saw {a} there.'],
    ['Pasé por {room}, ahí vi a {a}.', 'I passed through {room}, I saw {a} there.'],
  ],
  alibiSeen2: [
    ['Estaba en {room}, vi a {a} y a {b} por la zona.', 'I was in {room}, I saw {a} and {b} around.'],
  ],
  nearBody: [
    ['Sospecho de {x}: andaba cerca de {room} cuando murió {v}.', 'I suspect {x}: they were near {room} when {v} died.'],
    ['{x} estaba cerca del cuerpo de {v}. Me parece sospechoso.', '{x} was near {v}\'s body. Looks suspicious to me.'],
  ],
  suspect: [
    ['No me fío de {x}.', 'I do not trust {x}.'],
    ['{x} me da mala espina.', '{x} gives me a bad feeling.'],
    ['Para mí, {x}.', 'If you ask me, {x}.'],
    ['{x} me parece sospechoso.', '{x} looks suspicious to me.'],
    ['Yo apuntaría a {x}.', 'I would point at {x}.'],
  ],
  voteCall: [
    ['Yo voy a por {x}.', 'I am going for {x}.'],
    ['Mi sospechoso es {x}.', 'My suspect is {x}.'],
    ['Voto a {x}.', 'I am voting {x}.'], ['Votemos a {x}.', 'Let us vote {x}.'], ['Mi voto es para {x}.', 'My vote goes to {x}.'],
  ],
  skipCall: [
    ['No tengo pruebas: yo voto saltar.', 'I have no proof, I am skipping.'], ['Sin pruebas no voto a nadie, salto.', 'No proof, so I skip.'],
  ],
  noInfo: [
    ['No vi nada raro. ¿Alguien vio algo?', 'I did not see anything weird. Did anyone?'],
    ['Yo no vi nada. ¿Alguien tiene información?', 'I saw nothing. Does anyone have info?'],
  ],
  // ---- defensa y réplicas
  defend: [
    ['Yo no he sido, estaba en {room}.', 'It was not me, I was in {room}.'],
    ['¿Yo? Estaba en {room}, preguntad a quien queráis.', 'Me? I was in {room}, ask anyone.'],
    ['¡No fui yo! Estaba en {room} haciendo tareas.', 'It was not me! I was in {room} doing tasks.'],
    ['No me acuséis sin pruebas, estaba en {room}.', 'Do not accuse me without proof, I was in {room}.'],
    ['Eso es falso, yo estaba en {room}.', 'That is false, I was in {room}.'],
  ],
  defendSeen: [
    ['Puedo demostrarlo: {a} me vio en {room}.', 'I can prove it: {a} saw me in {room}.'],
  ],
  counter: [
    ['¿Por qué yo? ¿Qué viste, {x}?', 'Why me? What did you see, {x}?'],
    ['{x}, sin pruebas es solo ruido.', '{x}, without proof that is just noise.'],
    ['¿Y tú dónde estabas, {x}? Es raro que me acuses.', 'Where were you, {x}? It is odd that you accuse me.'],
    ['{x}, ¿qué viste exactamente? Eso me suena a excusa.', '{x}, what exactly did you see? Sounds like an excuse.'],
  ],
  askWhy: [
    ['{x}, ¿en qué te basas?', '{x}, what are you basing that on?'],
    ['¿Y eso, {x}? ¿Lo viste o lo supones?', 'Really, {x}? Did you see it or are you guessing?'],
    ['{x}, ¿por qué dices eso? ¿Qué viste?', '{x}, why do you say that? What did you see?'],
    ['¿Pruebas, {x}? Cuéntanos qué viste.', 'Proof, {x}? Tell us what you saw.'],
  ],
  agree: [
    ['Sí, a mí también me chirría {x}.', 'Yeah, {x} feels off to me too.'],
    ['Voy con {x}, no lo veo claro.', 'I am with you on {x}, it does not add up.'],
    ['Yo también creo que {x} es sospechoso.', 'I think {x} is suspicious too.'],
    ['Tiene sentido, {x} no me gusta nada.', 'Makes sense, I do not like {x} either.'],
  ],
  disagree: [
    ['No creo que {x} sea impostor: lo vi en {room}.', 'I do not think {x} is the impostor, I saw them in {room}.'],
  ],
  // ---- hacer caso (o no) a lo que dice una persona: "votad a X", "X es impostor", "X es inocente"
  follow: [
    ['Vale, {y}, te hago caso: voto a {x}.', 'Okay {y}, I will trust you: voting {x}.'],
    ['Tiene sentido, {y}. Yo también voy a por {x}.', 'Makes sense, {y}. I am going for {x} too.'],
    ['Ahora que lo dices, {x} me cuadra. Voto a {x}.', 'Now that you say it, {x} adds up. Voting {x}.'],
    ['{y} tiene razón, {x} es sospechoso. Voto a {x}.', '{y} has a point, {x} is suspicious. Voting {x}.'],
    ['Me has convencido, {y}: a por {x}.', 'You convinced me, {y}: going for {x}.'],
  ],
  doubt: [
    ['No lo veo claro, {y}. ¿Por qué {x}?', 'I am not convinced, {y}. Why {x}?'],
    ['Yo no vi nada raro en {x}, {y}. Sin pruebas no voto.', 'I saw nothing weird about {x}, {y}. No proof, no vote.'],
    ['{y}, eso es solo una sospecha. ¿Qué viste de {x}?', '{y}, that is just a hunch. What did you see about {x}?'],
    ['Mmm, no me cuadra lo de {x}, {y}.', 'Hmm, the {x} thing does not add up, {y}.'],
    ['No sé, {y}. Tampoco hay motivos claros para votar a {x}.', 'I do not know, {y}. No clear reason to vote {x}.'],
  ],
  trustClear: [
    ['Vale, {y}, entonces {x} está limpio. Me fío.', 'Okay {y}, so {x} is clean. I trust that.'],
    ['Eso cambia las cosas: {x} parece de fiar.', 'That changes things: {x} seems trustworthy.'],
  ],
  skipFollow: [
    ['Sí, {y}, sin pruebas yo también salto.', 'Yeah {y}, no proof, so I skip too.'],
    ['De acuerdo, mejor saltar y no arriesgar un inocente.', 'Agreed, better to skip than risk an innocent.'],
  ],
  skipRefuse: [
    ['{y}, saltar no nos sirve: hay un impostor entre nosotros.', '{y}, skipping does not help: there is an impostor among us.'],
    ['Yo no saltaría, {y}. Alguien miente.', 'I would not skip, {y}. Someone is lying.'],
  ],
  // ---- comprobar lo que dicen los demás
  confirm: [
    ['Confirmo lo que dice {x}: yo estaba en {room}.', 'I confirm what {x} says: I was in {room}.'],
    ['Sí, {x} me vio en {room}, es verdad.', 'Yes, {x} saw me in {room}, that is true.'],
  ],
  falseSeen: [
    ['{x}, yo no estuve en {room}. ¿A quién viste?', '{x}, I was not in {room}. Who did you see?'],
    ['Eso es mentira, {x}: no pisé {room} en todo el rato.', 'That is a lie, {x}: I did not set foot in {room} all this time.'],
    ['{x} dice que me vio en {room} y no es cierto.', '{x} says they saw me in {room} and that is not true.'],
  ],
  liar: [
    ['Cuidado con {x}: dijo haberme visto en {room} y yo no estuve allí.', 'Careful with {x}: they said they saw me in {room} and I was never there.'],
  ],
  // ---- mentiras del impostor
  lieSaw: [
    ['Vi a {x} rondando {room}, muy sospechoso.', 'I saw {x} hanging around {room}, very suspicious.'],
    ['Vi a {x} cerca de {room}, iba muy rápido.', 'I saw {x} near {room}, moving fast.'],
    ['{x} estaba por {room} y se fue de golpe. Raro.', '{x} was around {room} and left suddenly. Weird.'],
  ],
  defendMate: [
    ['Yo no sospecharía de {x}, lo vi currando.', 'I would not suspect {x}, I saw them working.'],
  ],
};

/* Cada bot escribe a su manera: unos con mayúscula y punto, otros en minúsculas, sin signos de apertura
   o sin el punto final. Solo cambia la forma, nunca el contenido. */
export function pickStyle(rnd = Math.random) {
  return { lower: rnd() < 0.35, nodot: rnd() < 0.5, noOpen: rnd() < 0.6, dbl: rnd() < 0.12 };
}

export function stylize(text, st) {
  if (!st || !text) return text;
  let t = text;
  if (st.noOpen) t = t.replace(/[¡¿]/g, '');
  if (st.nodot) t = t.replace(/\.$/, '');
  if (st.lower) t = t.charAt(0).toLowerCase() + t.slice(1);
  if (st.dbl && /[?!]$/.test(t)) t += t.slice(-1); // "??" / "!!" de quien escribe con prisa
  return t;
}

export function fill(tpl, params, lang) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    if (v && typeof v === 'object') return v[lang] ?? v.es ?? '';
    return v == null ? '' : String(v);
  });
}

// Una frase de la categoría `kind` en los dos idiomas. Devuelve { es, en } (≤140 caracteres).
const RECENT = new Map(); // kind -> índices usados hace poco: se evitan para no repetir la misma frase

export function say(kind, params = {}, rnd = Math.random) {
  const list = T[kind];
  if (!list) return null;
  const used = RECENT.get(kind) || [];
  let idx = list.map((_, i) => i).filter((i) => !used.includes(i));
  if (!idx.length) idx = list.map((_, i) => i);
  const k = idx[Math.floor(rnd() * idx.length)];
  RECENT.set(kind, [...used, k].slice(-Math.max(1, list.length - 1)));
  const v = list[k];
  return { es: fill(v[0], params, 'es').slice(0, 140), en: fill(v[1], params, 'en').slice(0, 140) };
}

/* ---------- lectura de lo que escriben los demás ---------- */

export function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ACCUSE = /\b(sus|sospech\w*|impost\w*|mato|mataron|matado|matar|vent\w*|rejilla\w*|culpable|acus\w*|miente|mientes|mintiendo|liar|lying|lies|kill\w*|suspicious|suspect\w*|vote|votad|votemos|sabotaj\w*|fake|falso)\b/;
const STRONG = /\b(mato|mataron|matar|vi a|visto|killed|saw|vent|rejilla|impostor)\b/;
const QUESTION = /(\?|donde|where|que hacias|what were you)/;
// pedir o anunciar un voto: "votad a X", "voto a X", "vote X", "echemos a X"
const VOTE = /\b(vota\w*|votad|votemos|votamos|voto|votar|vote|voting|expuls\w*|echad\w*|echemos|echar|eject\w*|kick\w*)\b/;
const SKIP = /\b(skip\w*|saltar\w*|saltemos|salto|abstenc\w*|abstain|no votemos|no votes|no voten|vote nobody|nobody|nadie)\b/;
// defender a alguien: "X es inocente", "X no fue", "confío en X"
const CLEAR = /\b(inocente\w*|limpi[oa]\w*|no fue|no ha sido|no es (el )?impostor|no es sospechoso|confio|confiad|innocent|clean|safe|trust\w*|not (the )?impostor|wasn.?t)\b/;
// defenderse a uno mismo: "yo no fui", "no soy el impostor"
const SELF = /\b(yo no fui|no fui yo|no he sido yo|no he sido|no soy (el )?impostor|soy inocente|it wasn.?t me|i am innocent|i.?m innocent|i.?m not (the )?impostor|i did not|i didn.?t)\b/;

/* Qué dice un mensaje: a quién nombra y qué pide. names = [{id, name}] de los jugadores vivos.
   Un nombre se reconoce completo o por su comienzo (4 letras o más), en minúsculas y sin tildes. */
export function parseChat(text, names) {
  const t = norm(text);
  const found = [];
  for (const n of names) {
    const nn = norm(n.name);
    if (!nn) continue;
    let m = new RegExp(`(^|[^a-z0-9])${esc(nn)}([^a-z0-9]|$)`).exec(t);
    let at = m ? m.index + m[1].length : -1;
    if (at < 0 && nn.length >= 4) {
      // un comienzo del nombre ("colmen" por Colmenilla), solo si es largo y no ambiguo
      const re = /[a-z0-9]{4,}/g;
      let w;
      while ((w = re.exec(t))) { if (nn.startsWith(w[0]) && w[0].length >= Math.min(5, nn.length)) { at = w.index; break; } }
    }
    if (at >= 0) found.push({ id: n.id, at });
  }
  found.sort((a, b) => a.at - b.at);
  const vm = VOTE.exec(t);
  const clear = CLEAR.test(t);
  // quien viene después del verbo de votar es a quien se vota ("Ana, vota a Leo": Leo)
  const voteTargets = vm ? found.filter((f) => f.at > vm.index).map((f) => f.id) : [];
  return {
    mentioned: found.map((f) => f.id),
    accuse: ACCUSE.test(t) && !clear,
    strong: STRONG.test(t) && !clear,
    question: QUESTION.test(t),
    vote: !!vm && !clear,
    voteTargets: clear ? [] : voteTargets,
    skip: SKIP.test(t) && !found.length,
    clear,
    self: SELF.test(t),
  };
}
