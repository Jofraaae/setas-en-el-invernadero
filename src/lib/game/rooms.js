import { base44 } from '@/api/base44Client';

/* Anuncio de la sala en el listado del menú.
   El cliente del anfitrión mantiene una única fila por sala; la sala de juego sigue
   siendo la autoridad y decide la admisión. */

export async function announceRoom({ code, players, status, min = 4, max = 15 }) {
  if (!code) return;
  const found = await base44.entities.Room.filter({ code }, { limit: 10 });
  const row = { code, player_count: players, min_players: min, max_players: max, status };
  const [first, ...extra] = found.items;
  if (first) await base44.entities.Room.update(first.id, row);
  else await base44.entities.Room.create(row);
  // filas antiguas del mismo código: se retiran para que el listado no las duplique
  for (const r of extra) await base44.entities.Room.delete(r.id);
}

/* El listado que se vio la última vez se guarda en memoria: al volver atrás, la lista
   aparece con lo que ya había en vez de reiniciarse en "Cargando salas…". */
let lastList = null;

export function lastRooms() {
  return lastList;
}

export function rememberRooms(list) {
  lastList = list;
}

export async function forgetRoom(code) {
  if (!code) return;
  const found = await base44.entities.Room.filter({ code }, { limit: 10 });
  for (const r of found.items) await base44.entities.Room.delete(r.id);
}