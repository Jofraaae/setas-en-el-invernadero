/* Idiomas disponibles. El español es el idioma de origen: sus textos son las claves del
   diccionario (t('Texto en español')), así que no necesita archivo propio.
   Cada otro idioma vive en ./locales/<code>.json. */
export const SOURCE_LANG = 'es';

// name = nombre del idioma en su propio idioma (es lo que ve el jugador en el selector)
export const LANGS = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
];

export const LANG_CODES = LANGS.map((l) => l.code);
