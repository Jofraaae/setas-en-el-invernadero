/* Nombre del jugador, guardado en este dispositivo (localStorage): no se usa la IP ni ninguna cuenta.
   Tras elegirlo, solo se puede cambiar una vez cada NAME_LOCK_MS. El bloqueo vive en el mismo
   dispositivo: borrar los datos del navegador lo reinicia, y no hay forma de evitarlo sin cuentas. */

import { tr } from '@/lib/i18n';
import { cleanLook } from './cosmetics';

const NAME_KEY = 'setas_name';
const AT_KEY = 'setas_name_at';
const LOOK_KEY = 'setas_look';

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

// El aspecto del armario (accesorios), guardado en este dispositivo igual que el nombre. Al entrar
// en una sala se vuelve a mandar. Lo que ya no exista en el catálogo se descarta al leerlo.
export function storedLook() {
  try { return cleanLook(JSON.parse(read(LOOK_KEY) || '{}')); } catch (e) { return {}; }
}
export function saveLook(look) {
  const l = cleanLook(look);
  write(LOOK_KEY, JSON.stringify(l));
  return l;
}

// Vista elegida: 'normal' (desde arriba) o 'fp' (primera persona, en 3D). Solo cambia cómo se dibuja la
// partida en este dispositivo: la sala y los demás jugadores no se enteran.
const VIEW_KEY = 'setas_view';
export const VIEW_EVENT = 'setas-view';
export function storedView() { return read(VIEW_KEY) === 'fp' ? 'fp' : 'normal'; }
export function saveView(v) {
  const view = v === 'fp' ? 'fp' : 'normal';
  write(VIEW_KEY, view);
  try { window.dispatchEvent(new CustomEvent(VIEW_EVENT, { detail: view })); } catch (e) { /* sin eventos: se aplica al recargar */ }
  return view;
}
