/* Anuncio de la sala en el listado del menú.

   Antes lo escribía el cliente del anfitrión en la entidad Room de Base44.
   Ahora el propio motor del servidor (server/engine.mjs -> syncRoom) mantiene
   el anuncio al día en cada cambio, así que estas funciones son compatibilidad:
   announceRoom ya no escribe nada y forgetRoom deja que la fila caducue sola. */

export async function announceRoom() { /* ahora lo hace el servidor */ }

export async function forgetRoom(code) {
  // sin escritura directa: la fila desaparece cuando la sala se vacía o caduca
  void code;
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
