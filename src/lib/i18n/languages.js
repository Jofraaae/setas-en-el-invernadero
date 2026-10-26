/* Idiomas disponibles. El español es el idioma de origen: sus textos son las claves del
   diccionario (t('Texto en español')), así que no necesita archivo propio.
   Cada otro idioma vive en ./locales/<code>.json. */
export const SOURCE_LANG = 'es';

// name = nombre del idioma en su propio idioma (es lo que ve el jugador en el selector)
export const LANGS = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'ca', name: 'Català' },
  { code: 'gl', name: 'Galego' },
  { code: 'eu', name: 'Euskara' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'ro', name: 'Română' },
  { code: 'cs', name: 'Čeština' },
  { code: 'sv', name: 'Svenska' },
  { code: 'da', name: 'Dansk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'hu', name: 'Magyar' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
];

export const LANG_CODES = LANGS.map((l) => l.code);
