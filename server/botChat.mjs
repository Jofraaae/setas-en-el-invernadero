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
    ['¡Hola a todos!', 'Hi everyone!'], ['Buenas, ¿empezamos ya?', 'Hey, shall we start?'],
    ['Hola :)', 'Hello :)'], ['¡Listo para jugar!', 'Ready to play!'],
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
    ['Yo estaba en {room} haciendo mis tareas.', 'I was in {room} doing my tasks.'],
    ['Estaba por {room}, a lo mío.', 'I was around {room}, minding my own business.'],
  ],
  alibiSeen1: [
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
    ['{x} me parece sospechoso.', '{x} looks suspicious to me.'],
    ['Yo apuntaría a {x}.', 'I would point at {x}.'],
  ],
  voteCall: [
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
    ['¡No fui yo! Estaba en {room} haciendo tareas.', 'It was not me! I was in {room} doing tasks.'],
    ['No me acuséis sin pruebas, estaba en {room}.', 'Do not accuse me without proof, I was in {room}.'],
    ['Eso es falso, yo estaba en {room}.', 'That is false, I was in {room}.'],
  ],
  defendSeen: [
    ['Puedo demostrarlo: {a} me vio en {room}.', 'I can prove it: {a} saw me in {room}.'],
  ],
  counter: [
    ['¿Y tú dónde estabas, {x}? Es raro que me acuses.', 'Where were you, {x}? It is odd that you accuse me.'],
    ['{x}, ¿qué viste exactamente? Eso me suena a excusa.', '{x}, what exactly did you see? Sounds like an excuse.'],
  ],
  askWhy: [
    ['{x}, ¿por qué dices eso? ¿Qué viste?', '{x}, why do you say that? What did you see?'],
    ['¿Pruebas, {x}? Cuéntanos qué viste.', 'Proof, {x}? Tell us what you saw.'],
  ],
  agree: [
    ['Yo también creo que {x} es sospechoso.', 'I think {x} is suspicious too.'],
    ['Tiene sentido, {x} no me gusta nada.', 'Makes sense, I do not like {x} either.'],
  ],
  disagree: [
    ['No creo que {x} sea impostor: lo vi en {room}.', 'I do not think {x} is the impostor, I saw them in {room}.'],
  ],
  // ---- mentiras del impostor
  lieSaw: [
    ['Vi a {x} cerca de {room}, iba muy rápido.', 'I saw {x} near {room}, moving fast.'],
    ['{x} estaba por {room} y se fue de golpe. Raro.', '{x} was around {room} and left suddenly. Weird.'],
  ],
  defendMate: [
    ['Yo no sospecharía de {x}, lo vi currando.', 'I would not suspect {x}, I saw them working.'],
  ],
};

export function fill(tpl, params, lang) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    if (v && typeof v === 'object') return v[lang] ?? v.es ?? '';
    return v == null ? '' : String(v);
  });
}

// Una frase de la categoría `kind` en los dos idiomas. Devuelve { es, en } (≤140 caracteres).
export function say(kind, params = {}, rnd = Math.random) {
  const list = T[kind];
  if (!list) return null;
  const v = pick(list, rnd);
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

/* Qué dice un mensaje: a quién nombra y si acusa. names = [{id, name}] de los jugadores vivos. */
export function parseChat(text, names) {
  const t = norm(text);
  const mentioned = [];
  for (const n of names) {
    const nn = norm(n.name);
    if (!nn) continue;
    if (new RegExp(`(^|[^a-z0-9])${esc(nn)}([^a-z0-9]|$)`).test(t)) mentioned.push(n.id);
  }
  return { mentioned, accuse: ACCUSE.test(t), strong: STRONG.test(t), question: QUESTION.test(t) };
}
