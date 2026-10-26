import { LANG_CODES } from './languages';

const SUPPORTED = new Set(LANG_CODES);
const LOWER = new Map(LANG_CODES.map((c) => [c.toLowerCase(), c]));

/* 'es-MX' → 'es', 'zh-Hant-TW' → 'zh-TW', 'nb' → null (no soportado)… */
export function matchLang(tag) {
  if (!tag || typeof tag !== 'string') return null;
  const t = tag.trim().replace(/_/g, '-').toLowerCase();
  if (!t) return null;
  if (LOWER.has(t)) return LOWER.get(t);
  const parts = t.split('-');
  const base = parts[0];
  if (base === 'zh') {
    // chino tradicional: Taiwán, Hong Kong, Macao o escritura Hant
    return parts.includes('hant') || parts.includes('tw') || parts.includes('hk') || parts.includes('mo') ? 'zh-TW' : 'zh';
  }
  if (base === 'no' || base === 'nn') return null; // sin noruego: se cae al siguiente idioma del dispositivo
  if (base === 'fil' || base === 'tl') return null;
  return SUPPORTED.has(base) ? base : null;
}

/* Si el dispositivo no declara ningún idioma que tengamos, usamos la zona horaria como
   pista de dónde está (p. ej. Europe/Madrid → español). */
const TZ_LANG = [
  [/^(Europe\/Madrid|Atlantic\/Canary|Africa\/Ceuta)$/, 'es'],
  [/^America\/(Mexico_City|Cancun|Merida|Monterrey|Tijuana|Chihuahua|Hermosillo|Mazatlan|Bogota|Lima|Santiago|Caracas|La_Paz|Guayaquil|Montevideo|Asuncion|Panama|Costa_Rica|El_Salvador|Guatemala|Tegucigalpa|Managua|Havana|Santo_Domingo|Puerto_Rico|Argentina\/.*)$/, 'es'],
  [/^Pacific\/Easter$/, 'es'],
  [/^(Europe\/Lisbon|Atlantic\/(Azores|Madeira)|America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Manaus|Belem|Cuiaba|Campo_Grande|Porto_Velho|Rio_Branco|Noronha)|Africa\/Luanda|Africa\/Maputo)$/, 'pt'],
  [/^(Europe\/(Paris|Brussels|Luxembourg|Monaco)|America\/(Montreal|Martinique|Guadeloupe|Cayenne)|Africa\/(Dakar|Abidjan|Tunis|Algiers|Casablanca))$/, 'fr'],
  [/^(Europe\/(Berlin|Vienna|Zurich|Vaduz)|Europe\/Busingen)$/, 'de'],
  [/^Europe\/(Rome|Vatican|San_Marino)$/, 'it'],
  [/^Europe\/Amsterdam$/, 'nl'],
  [/^Europe\/Warsaw$/, 'pl'],
  [/^Europe\/(Bucharest|Chisinau)$/, 'ro'],
  [/^Europe\/Prague$/, 'cs'],
  [/^Europe\/Stockholm$/, 'sv'],
  [/^Europe\/Copenhagen$/, 'da'],
  [/^Europe\/Helsinki$/, 'fi'],
  [/^Europe\/Athens$/, 'el'],
  [/^Europe\/Budapest$/, 'hu'],
  [/^Europe\/(Istanbul|Nicosia)$/, 'tr'],
  [/^Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Minsk)$|^Asia\/(Yekaterinburg|Novosibirsk|Omsk|Krasnoyarsk|Irkutsk|Yakutsk|Vladivostok|Magadan|Kamchatka)$/, 'ru'],
  [/^Europe\/(Kyiv|Kiev|Uzhgorod|Zaporozhye)$/, 'uk'],
  [/^Asia\/(Riyadh|Dubai|Baghdad|Kuwait|Qatar|Muscat|Amman|Beirut|Damascus|Bahrain)$|^Africa\/Cairo$/, 'ar'],
  [/^Asia\/(Kolkata|Calcutta)$/, 'hi'],
  [/^Asia\/(Jakarta|Pontianak|Makassar|Jayapura)$/, 'id'],
  [/^Asia\/(Ho_Chi_Minh|Saigon)$/, 'vi'],
  [/^Asia\/Bangkok$/, 'th'],
  [/^Asia\/Tokyo$/, 'ja'],
  [/^Asia\/Seoul$/, 'ko'],
  [/^Asia\/(Shanghai|Chongqing|Harbin|Urumqi)$/, 'zh'],
  [/^Asia\/(Taipei|Hong_Kong|Macau)$/, 'zh-TW'],
];

export function langFromTimeZone(tz) {
  if (!tz) return null;
  for (const [re, lang] of TZ_LANG) if (re.test(tz)) return lang;
  return null;
}

/* Prioridad: ?lang=xx del enlace › idioma elegido antes › idiomas del dispositivo, en su
   orden de preferencia › zona horaria › inglés. */
export function detectLang() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    const fromUrl = matchLang(q);
    if (fromUrl) return fromUrl;
  } catch (e) { /* sin window/URL: seguimos */ }
  try {
    const saved = matchLang(localStorage.getItem('lang'));
    if (saved) return saved;
  } catch (e) { /* localStorage puede no estar disponible */ }
  try {
    const prefs = [...(navigator.languages || []), navigator.language];
    for (const p of prefs) {
      const m = matchLang(p);
      if (m) return m;
    }
  } catch (e) { /* sin navigator */ }
  try {
    const m = langFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (m) return m;
  } catch (e) { /* sin Intl */ }
  return 'en';
}
