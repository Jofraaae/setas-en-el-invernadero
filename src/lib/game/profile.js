/* Nombre del jugador, guardado en este dispositivo (localStorage): no se usa la IP ni ninguna cuenta.
   Tras elegirlo, solo se puede cambiar una vez cada NAME_LOCK_MS. El bloqueo vive en el mismo
   dispositivo: borrar los datos del navegador lo reinicia, y no hay forma de evitarlo sin cuentas. */

import { tr } from '@/lib/i18n';

const NAME_KEY = 'setas_name';
const AT_KEY = 'setas_name_at';

export const NAME_LOCK_MS = 5 * 24 * 60 * 60 * 1000; // 5 días
export const NAME_MIN = 2;
export const NAME_MAX = 12;

function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function write(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin permisos: el nombre vale solo esta sesión */ } }

// espacios sueltos fuera y sin caracteres de control
export function cleanName(s) {
  return String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export function nameError(s) {
  const n = cleanName(s);
  if (n.length < NAME_MIN) return 'short';
  return '';
}

export function storedName() { return cleanName(read(NAME_KEY)); }

// Cuánto falta para poder cambiar el nombre (0 = ya se puede). Un nombre guardado antes de existir
// el bloqueo no tiene fecha: se puede cambiar una vez y ahí empieza la cuenta.
export function msUntilNameChange(now = Date.now()) {
  const at = Number(read(AT_KEY)) || 0;
  if (!at) return 0;
  return Math.max(0, at + NAME_LOCK_MS - now);
}

export function saveName(name) {
  const n = cleanName(name);
  write(NAME_KEY, n);
  write(AT_KEY, String(Date.now()));
  return n;
}

// "4 d 3 h", "5 h 10 min" o "12 min"
export function formatWait(ms) {
  const min = Math.max(1, Math.ceil(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return tr('{d} d {h} h', { d, h });
  if (h > 0) return tr('{h} h {m} min', { h, m });
  return tr('{m} min', { m });
}
