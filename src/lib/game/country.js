/* País de origen de una sala. El servidor lo toma de la cabecera del proxy si la hay; si no,
   usa la pista que manda quien la crea: aquí se saca de la zona horaria del dispositivo (sin
   pedir permisos ni mirar la IP) y, si no sirve, de la región del idioma del navegador. */

const TZ = {
  // España y vecinos
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES', 'Europe/Andorra': 'AD',
  'Europe/Lisbon': 'PT', 'Atlantic/Madeira': 'PT', 'Atlantic/Azores': 'PT', 'Europe/Paris': 'FR',
  'Europe/Monaco': 'MC', 'Europe/Gibraltar': 'GI',
  // Europa
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Berlin': 'DE', 'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Luxembourg': 'LU', 'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Bratislava': 'SK',
  'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG', 'Europe/Athens': 'GR',
  'Europe/Istanbul': 'TR', 'Europe/Kiev': 'UA', 'Europe/Kyiv': 'UA', 'Europe/Moscow': 'RU',
  'Europe/Belgrade': 'RS', 'Europe/Zagreb': 'HR', 'Europe/Ljubljana': 'SI', 'Europe/Sarajevo': 'BA',
  'Europe/Skopje': 'MK', 'Europe/Tirane': 'AL', 'Europe/Vilnius': 'LT', 'Europe/Riga': 'LV',
  'Europe/Tallinn': 'EE', 'Europe/Minsk': 'BY', 'Europe/Chisinau': 'MD', 'Europe/Malta': 'MT',
  'Atlantic/Reykjavik': 'IS', 'Asia/Nicosia': 'CY',
  // América
  'America/Mexico_City': 'MX', 'America/Monterrey': 'MX', 'America/Merida': 'MX', 'America/Tijuana': 'MX',
  'America/Cancun': 'MX', 'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Santiago': 'CL',
  'America/Montevideo': 'UY', 'America/Caracas': 'VE', 'America/La_Paz': 'BO', 'America/Guayaquil': 'EC',
  'America/Asuncion': 'PY', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA', 'America/Guatemala': 'GT',
  'America/Tegucigalpa': 'HN', 'America/El_Salvador': 'SV', 'America/Managua': 'NI', 'America/Havana': 'CU',
  'America/Santo_Domingo': 'DO', 'America/Puerto_Rico': 'PR', 'America/Jamaica': 'JM',
  'America/Sao_Paulo': 'BR', 'America/Fortaleza': 'BR', 'America/Manaus': 'BR', 'America/Bahia': 'BR',
  'America/Recife': 'BR', 'America/Belem': 'BR', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Edmonton': 'CA', 'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/Montreal': 'CA',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
  'America/Phoenix': 'US', 'America/Anchorage': 'US', 'America/Detroit': 'US', 'Pacific/Honolulu': 'US',
  // Asia
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW',
  'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH', 'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Tehran': 'IR', 'Asia/Jerusalem': 'IL',
  'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN',
  'Asia/Kuala_Lumpur': 'MY', 'Asia/Baghdad': 'IQ', 'Asia/Beirut': 'LB', 'Asia/Amman': 'JO', 'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW', 'Asia/Tashkent': 'UZ', 'Asia/Almaty': 'KZ', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP',
  // África y Oceanía
  'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN',
  'Africa/Lagos': 'NG', 'Africa/Johannesburg': 'ZA', 'Africa/Nairobi': 'KE', 'Africa/Accra': 'GH',
  'Africa/Addis_Ababa': 'ET', 'Africa/Dakar': 'SN', 'Pacific/Auckland': 'NZ',
};

const PREFIX = [
  ['Australia/', 'AU'], ['America/Argentina/', 'AR'], ['America/Indiana/', 'US'],
  ['America/Kentucky/', 'US'], ['America/North_Dakota/', 'US'],
];

function fromTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return '';
    if (TZ[tz]) return TZ[tz];
    if (tz === 'America/Buenos_Aires') return 'AR';
    for (const [p, c] of PREFIX) if (tz.startsWith(p)) return c;
  } catch (e) { /* sin Intl */ }
  return '';
}

function fromLocale() {
  try {
    const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const l of list) {
      const m = /^[a-z]{2,3}[-_]([A-Za-z]{2})\b/.exec(String(l || ''));
      if (m) return m[1].toUpperCase();
    }
  } catch (e) { /* sin navigator */ }
  return '';
}

/* Mejor estimación del país de este dispositivo ('' si no se sabe). */
export function guessCountry() {
  return fromTimeZone() || fromLocale();
}

/* Bandera como emoji (dos letras regionales). En sistemas que no las pintan se ven las dos letras. */
export function flagOf(code) {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '🌍';
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/* Nombre del país en el idioma indicado. */
export function countryName(code, lang) {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  try {
    return new Intl.DisplayNames([lang || 'es'], { type: 'region' }).of(c) || c;
  } catch (e) {
    return c;
  }
}
