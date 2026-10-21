/* Catálogo de escenarios. El motor de la sala manda el mapa de la partida por su id
   ('greenhouse' o 'micelaria'); aquí solo vive lo que enseña la interfaz: nombre,
   descripción y miniatura. El Invernadero es el de siempre y el que viene por defecto. */

export const MAPS = [
  {
    id: 'greenhouse',
    name: 'El Invernadero',
    blurb: 'Naves de cultivo, cámaras frías y maquinaria de laboratorio.',
    thumb: 'https://media.base44.com/images/public/6ac5fbbda2ea6a18a74039f6/6b8b95d21_generated_image.png',
  },
  {
    id: 'micelaria',
    name: 'Micelaria',
    blurb: 'Dentro de la seta madre, entre arroyos, cascadas y luciérnagas.',
    thumb: 'https://media.base44.com/images/public/6ac5fbbda2ea6a18a74039f6/00487c454_generated_image.png',
  },
];

export const DEFAULT_MAP = 'greenhouse';

export function mapName(id) {
  const m = MAPS.find((x) => x.id === id);
  return m ? m.name : MAPS[0].name;
}