/* Armario: qué accesorios existen. Aquí solo van los ids (para validar lo que manda el cliente);
   el dibujo y los nombres viven en src/lib/game/cosmetics.js. Si se añade un accesorio hay que
   añadirlo en los dos sitios (scripts/checkCosmetics.mjs comprueba que coinciden).
   Todos los accesorios están disponibles para todos los jugadores: no hay desbloqueos. */

export const LOOK_SLOTS = {
  suit: ['overalls', 'knight', 'robe', 'leaves', 'stripes', 'tuxedo', 'chef', 'bee'],
  hat: ['witch', 'crown', 'tophat', 'gnome', 'straw', 'acorn', 'wizard', 'beret'],
  head: ['flower', 'sprout', 'minishroom', 'antennae', 'antlers', 'wreath', 'firefly', 'halo'],
  face: ['glasses', 'shades', 'mustache', 'mask', 'monocle', 'beard', 'eyepatch', 'fangs'],
  back: ['backpack', 'fairy', 'butterfly', 'snail', 'cape', 'fern', 'bat', 'sack'],
  other: ['scarf', 'lantern', 'staff', 'snailpet', 'butterflypet', 'medal', 'bouquet', 'sword'],
};

// Deja solo lo válido: cada categoría o lleva un accesorio que existe o queda vacía (se omite).
export function cleanLook(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [slot, ids] of Object.entries(LOOK_SLOTS)) {
    const v = raw[slot];
    if (typeof v === 'string' && ids.includes(v)) out[slot] = v;
  }
  return out;
}

export const hasLook = (look) => !!look && Object.keys(look).length > 0;
