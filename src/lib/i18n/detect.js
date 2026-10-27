import { LANG_CODES } from './languages';

const SUPPORTED = new Set(LANG_CODES);
const LOWER = new Map(LANG_CODES.map((c) => [c.toLowerCase(), c]));

/* 'es-MX' → 'es', 'en-GB' → 'en'; un idioma que no tenemos (p. ej. 'fr') → null */
export function matchLang(tag) {
  if (!tag || typeof tag !== 'string') return null;
  const t = tag.trim().replace(/_/g, '-').toLowerCase();
  if (!t) return null;
  if (LOWER.has(t)) return LOWER.get(t);
  const parts = t.split('-');
  const base = parts[0];
  return SUPPORTED.has(base) ? base : null;
}

/* Si el dispositivo no declara ningún idioma que tengamos, usamos la zona horaria como
   pista de dónde está (p. ej. Europe/Madrid → español). */
const TZ_LANG = [
  [/^(Europe\/Madrid|Atlantic\/Canary|Africa\/Ceuta)$/, 'es'],
  [/^America\/(Mexico_City|Cancun|Merida|Monterrey|Tijuana|Chihuahua|Hermosillo|Mazatlan|Bogota|Lima|Santiago|Caracas|La_Paz|Guayaquil|Montevideo|Asuncion|Panama|Costa_Rica|El_Salvador|Guatemala|Tegucigalpa|Managua|Havana|Santo_Domingo|Puerto_Rico|Argentina\/.*)$/, 'es'],
  [/^Pacific\/Easter$/, 'es'],
];

export function langFromTimeZone(tz) {
  if (!tz) return null;
  for (const [re, lang] of TZ_LANG) if (re.test(tz) && SUPPORTED.has(lang)) return lang;
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
