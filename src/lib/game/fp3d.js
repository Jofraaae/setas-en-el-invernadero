/* Modo de primera persona: dibuja la partida en 3D con Three.js.
   No cambia nada del juego: la sala sigue siendo la misma (mismas posiciones, mismas colisiones, mismas
   órdenes). Esto solo lee el estado `g` que ya mantiene el cliente y lo pinta desde los ojos del seta.
   Ejes: x del mundo = x de Three, y del mundo (hacia abajo en el mapa) = z de Three, y de Three = altura.
   El ángulo `yaw` es el del mundo: mirar hacia (cos yaw, sin yaw). */

import * as THREE from 'three';
import { makeGrid, polyHas } from './grid';

const CELL = 20;
const WALL_H = 130;
export const EYE = 46;
const FOV = 76;

// Aire de cada escenario: color del cielo/niebla, de las paredes, si hay techo y la luz de ambiente.
const ENV = {
  greenhouse: { sky: '#08140e', wall: '#35584a', roof: '#0c1a13', amb: 0.95, sun: 0.55 },
  lobby: { sky: '#120d08', wall: '#6b4a30', roof: '#2a1c12', amb: 1.0, sun: 0.5 },
  micelaria: { sky: '#17301f', wall: '#2b4a2a', roof: null, amb: 0.9, sun: 0.7 },
  pantano: { sky: '#1b2a24', wall: '#3a4a35', roof: null, amb: 0.85, sun: 0.55 },
};

// Objetos del mapa: [forma, altura, color, adorno]. Todo se monta con formas básicas.
const OBJ = {
  shelf: ['box', 74, '#7a5a3a'], planter: ['planter', 30, '#6b4a2f'], bench: ['box', 26, '#8a6a45'],
  lantern: ['post', 52, '#e9c46a', 'glow'], stall: ['box', 70, '#a0522d'], bonfire: ['cone', 34, '#ff8a1f', 'glow'],
  table: ['table', 32, '#8a6a45'], stump: ['cyl', 22, '#7a5a3a'], bed: ['box', 24, '#c9b79c'],
  baskets: ['cyl', 24, '#b8894f'], millwheel: ['cyl', 90, '#6b4a2f'], sacks: ['dome', 28, '#c9b79c'],
  panel: ['box', 84, '#4a5a66', 'screen'], haystack: ['dome', 46, '#d9b84a'], barrel: ['cyl', 34, '#7a4a2a'],
  telescope: ['post', 70, '#8a8f95'], core: ['cyl', 100, '#4ade80', 'glow'], totem: ['box', 110, '#8a6a45'],
  glowshroom: ['shroom', 44, '#8ab4ff', 'glow'], boulder: ['dome', 42, '#6b7078'], cropbed: ['box', 14, '#5a3a22'],
  cart: ['box', 38, '#8a6a45'], mushring: ['ring', 8, '#e9c46a'], signpost: ['post', 64, '#8a6a45'],
  fern: ['dome', 24, '#3f8f4a'], tallgrass: ['dome', 32, '#5aa05a'], well: ['cyl', 36, '#8a8f95'],
  tree: ['tree', 150, '#2f6b3a'], stove: ['box', 52, '#555a60'], chest: ['box', 26, '#8a5a2a'],
  rowboat: ['box', 20, '#8a5a2a'], fishrack: ['box', 62, '#8a6a45'], crystal: ['cone', 72, '#8ae0ff', 'glow'],
  stalag: ['cone', 100, '#8a8f95'], log: ['box', 20, '#6b4a2f'], lanternpost: ['post', 96, '#444', 'glow'],
  shroomA: ['shroom', 70, '#c04a4a'], shroomB: ['shroom', 80, '#d9a441'], shroomC: ['shroom', 74, '#9a6ad0'],
  shroomE: ['shroom', 86, '#4aa0c0'], deadtree: ['tree', 140, '#4a3a2a', 'dead'], swamptree: ['tree', 150, '#3a4a2a', 'dead'],
  computer: ['box', 64, '#35506a', 'screen'], wardrobe: ['box', 104, '#7a5a3a'],
};

const rnd = (a) => { // número pseudoaleatorio estable (para variar colores sin parpadeos)
  const x = Math.sin(a * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

function angDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

export function createFp(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 2, 4200);
  camera.rotation.order = 'YXZ';
  const amb = new THREE.AmbientLight(0xffffff, 1);
  const sun = new THREE.DirectionalLight(0xfff1d6, 0.6);
  sun.position.set(-300, 900, 400);
  const lamp = new THREE.PointLight(0xffe2b0, 0, 520, 1.4);
  scene.add(amb, sun, lamp);

  const world = new THREE.Group(); // lo que cambia con el mapa
  const dyn = new THREE.Group();   // lo que cambia cada partida: tareas, puertas, rejillas
  scene.add(world, dyn);

  // ---- materiales y formas compartidas ----
  const geo = {
    capDome: new THREE.SphereGeometry(26, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    stem: new THREE.CylinderGeometry(11, 13, 30, 16),
    disc: new THREE.CircleGeometry(26, 22),
    spot: new THREE.SphereGeometry(4.2, 8, 6),
    eye: new THREE.SphereGeometry(3.2, 10, 8),
    foot: new THREE.SphereGeometry(7, 10, 8),
    shadow: new THREE.CircleGeometry(20, 20),
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
    cone: new THREE.ConeGeometry(1, 1, 16),
    dome: new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    sph: new THREE.SphereGeometry(1, 14, 10),
    ring: new THREE.TorusGeometry(1, 0.08, 6, 28),
    pillar: new THREE.CylinderGeometry(9, 9, 80, 14, 1, true),
    gem: new THREE.OctahedronGeometry(10),
  };
  const mats = new Map();
  const mat = (hex, o = {}) => {
    const key = hex + JSON.stringify(o);
    let m = mats.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: hex, ...o });
      mats.set(key, m);
    }
    return m;
  };
  const gmats = new Map();
  const glowMat = (hex, op = 1) => {
    const key = `${hex}|${op}`;
    let m = gmats.get(key);
    if (!m) { m = new THREE.MeshBasicMaterial({ color: hex, transparent: op < 1, opacity: op, depthWrite: op >= 1 }); gmats.set(key, m); }
    return m;
  };
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });

  // ---- construcción del mapa ----
  let built = null; // { key, w, h }
  let doorKey = null;
  let taskKey = null;
  let tex = null;

  const disposeGroup = (grp) => {
    while (grp.children.length) {
      const ch = grp.children[0];
      grp.remove(ch);
      ch.traverse((o) => {
        if (o.isInstancedMesh) { o.material.dispose(); o.dispose(); }
        else if (o.userData && o.userData.own && o.material) o.material.dispose();
      });
    }
  };

  function buildObstacle(o, i) {
    const [x, y, w, h, type] = o;
    const def = OBJ[type] || ['box', 40, '#6b6b6b'];
    const [shape, hh, col, extra] = def;
    const grp = new THREE.Group();
    const cx = x + w / 2, cz = y + h / 2;
    grp.position.set(cx, 0, cz);
    const add = (mesh, px, py, pz) => { mesh.position.set(px, py, pz); grp.add(mesh); return mesh; };
    const r = Math.max(8, Math.min(w, h) / 2);
    const tone = 0.85 + rnd(i) * 0.3;
    const base = shade(col, tone);
    const m = mat(base.getStyle());
    const bm = (g2, mm, sx, sy, sz) => { const me = new THREE.Mesh(g2, mm); me.scale.set(sx, sy, sz); return me; };
    if (shape === 'box') {
      add(bm(geo.box, m, w, hh, h), 0, hh / 2, 0);
      if (extra === 'screen') {
        const sm = glowMat(type === 'panel' ? '#ffd60a' : '#7ee0ff');
        const s = bm(geo.box, sm, w * 0.7, hh * 0.35, 2);
        add(s, 0, hh * 0.62, h / 2 + 1.2);
      }
    } else if (shape === 'table') {
      add(bm(geo.box, m, w, 6, h), 0, hh, 0);
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(bm(geo.box, m, 6, hh, 6), lx * (w / 2 - 6), hh / 2, lz * (h / 2 - 6));
    } else if (shape === 'planter') {
      add(bm(geo.box, m, w, hh * 0.6, h), 0, hh * 0.3, 0);
      add(bm(geo.dome, mat('#3f8f4a'), w * 0.5, hh * 1.4, h * 0.5), 0, hh * 0.6, 0);
    } else if (shape === 'cyl') {
      add(bm(geo.cyl, m, Math.max(w, h) / 2, hh, Math.max(w, h) / 2), 0, hh / 2, 0);
      if (extra === 'glow') add(bm(geo.sph, glowMat(col, 0.55), r * 1.2, r * 1.2, r * 1.2), 0, hh + 6, 0);
    } else if (shape === 'dome') {
      add(bm(geo.dome, m, Math.max(w, h) / 2, hh, Math.max(w, h) / 2), 0, 0, 0);
    } else if (shape === 'cone') {
      add(bm(geo.cone, m, Math.max(w, h) / 2, hh, Math.max(w, h) / 2), 0, hh / 2, 0);
      if (extra === 'glow') add(bm(geo.sph, glowMat(col, 0.35), r * 1.6, r * 1.6, r * 1.6), 0, hh * 0.5, 0);
    } else if (shape === 'ring') {
      const me = bm(geo.ring, glowMat(col, 0.8), Math.max(w, h) / 2, 1, Math.max(w, h) / 2);
      me.rotation.x = Math.PI / 2; me.scale.z = 90; me.scale.x = Math.max(w, h) / 2; me.scale.y = Math.max(w, h) / 2;
      add(me, 0, 4, 0);
    } else if (shape === 'post') {
      add(bm(geo.cyl, m, 4, hh, 4), 0, hh / 2, 0);
      if (extra === 'glow') {
        add(bm(geo.sph, glowMat('#ffd98a'), 9, 9, 9), 0, hh + 4, 0);
        const l = new THREE.PointLight(0xffd98a, 0.9, 260, 1.5);
        add(l, 0, hh + 6, 0);
      } else add(bm(geo.box, m, Math.max(w, 14), 16, 4), 0, hh - 8, 0);
    } else if (shape === 'tree') {
      const dead = extra === 'dead';
      const tr = Math.max(7, Math.min(w, h) / 2);
      add(bm(geo.cyl, mat(dead ? '#3a2d22' : '#6b4a2f'), tr, hh * 0.55, tr), 0, hh * 0.275, 0);
      if (dead) {
        for (let k = 0; k < 4; k++) {
          const b = bm(geo.cyl, mat('#3a2d22'), 3, hh * 0.45, 3);
          b.rotation.z = (k % 2 ? 1 : -1) * 0.8; b.rotation.y = k * 1.6;
          add(b, Math.cos(k * 1.6) * 8, hh * 0.65, Math.sin(k * 1.6) * 8);
        }
      } else {
        const cr = Math.max(34, Math.max(w, h) * 0.95);
        add(bm(geo.sph, m, cr, hh * 0.32, cr), 0, hh * 0.72, 0);
        add(bm(geo.sph, mat(shade(col, tone * 0.8).getStyle()), cr * 0.7, hh * 0.22, cr * 0.7), cr * 0.2, hh * 0.92, cr * 0.1);
      }
    } else if (shape === 'shroom') {
      const sr = Math.max(7, r * 0.45);
      add(bm(geo.cyl, mat('#efe3c4'), sr, hh * 0.6, sr), 0, hh * 0.3, 0);
      add(bm(geo.dome, extra === 'glow' ? glowMat(col) : m, r * 1.5, hh * 0.5, r * 1.5), 0, hh * 0.55, 0);
      if (extra === 'glow') add(new THREE.PointLight(new THREE.Color(col).getHex(), 0.5, 180, 1.6), 0, hh * 0.8, 0);
    }
    if (extra === 'glow' && shape === 'cyl') add(new THREE.PointLight(new THREE.Color(col).getHex(), 0.7, 240, 1.5), 0, hh + 8, 0);
    return grp;
  }

  function buildWorld(g) {
    disposeGroup(world);
    const W = g.world.w, H = g.world.h;
    const env = ENV[g.map] || ENV.greenhouse;
    scene.background = new THREE.Color(env.sky);
    scene.fog = new THREE.Fog(env.sky, 500, 1800);
    amb.intensity = env.amb;
    sun.intensity = env.sun;

    // suelo: el mismo dibujo del mapa en 2D, tendido en el suelo
    if (tex) tex.dispose();
    let src = g.mapC;
    const maxT = Math.min(4096, renderer.capabilities.maxTextureSize || 4096);
    if (src && Math.max(src.width, src.height) > maxT) {
      const k = maxT / Math.max(src.width, src.height);
      const c2 = document.createElement('canvas');
      c2.width = Math.round(src.width * k); c2.height = Math.round(src.height * k);
      c2.getContext('2d').drawImage(src, 0, 0, c2.width, c2.height);
      src = c2;
    }
    tex = src ? new THREE.CanvasTexture(src) : null;
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
    }
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0x223322 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(W / 2, 0, H / 2);
    ground.userData.own = true;
    world.add(ground);
    // fuera del mapa: suelo oscuro para que no se vea el vacío
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, H * 4), new THREE.MeshBasicMaterial({ color: env.sky }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(W / 2, -1, H / 2);
    world.add(outer);
    if (env.roof) {
      const roof = new THREE.Mesh(new THREE.PlaneGeometry(W + 400, H + 400), new THREE.MeshBasicMaterial({ color: env.roof, side: THREE.DoubleSide }));
      roof.rotation.x = Math.PI / 2;
      roof.position.set(W / 2, WALL_H + 2, H / 2);
      world.add(roof);
    }

    // muros: las celdas que cierran el paso y están junto a suelo transitable
    const full = makeGrid(g.world, g.floors, []);
    const { gw, gh, cells } = full;
    const water = new Uint8Array(gw * gh);
    for (const f of g.floors) {
      const o = f[7];
      if (!(o && o.carve && o.water)) continue;
      const x0 = Math.max(0, Math.floor(f[0] / CELL)), x1 = Math.min(gw, Math.ceil((f[0] + f[2]) / CELL));
      const y0 = Math.max(0, Math.floor(f[1] / CELL)), y1 = Math.min(gh, Math.ceil((f[1] + f[3]) / CELL));
      for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
        if (!o.poly || polyHas(o.poly, tx * CELL + 10, ty * CELL + 10)) water[ty * gw + tx] = 1;
      }
    }
    const wc = [];
    for (let ty = 0; ty < gh; ty++) for (let tx = 0; tx < gw; tx++) {
      const i = ty * gw + tx;
      if (cells[i] || water[i]) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = tx + dx, ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        if (cells[ny * gw + nx]) { near = true; break; }
      }
      if (near) wc.push(tx, ty);
    }
    const n = wc.length / 2;
    const wm = new THREE.InstancedMesh(geo.box, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, n));
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const tx = wc[k * 2], ty = wc[k * 2 + 1];
      const hgt = WALL_H * (0.92 + rnd(tx * 7 + ty * 13) * 0.16);
      d.position.set(tx * CELL + CELL / 2, hgt / 2, ty * CELL + CELL / 2);
      d.scale.set(CELL, hgt, CELL);
      d.updateMatrix();
      wm.setMatrixAt(k, d.matrix);
      col.set(env.wall).multiplyScalar(0.82 + rnd(tx * 3 + ty * 5) * 0.36);
      wm.setColorAt(k, col);
    }
    wm.count = n;
    wm.instanceMatrix.needsUpdate = true;
    if (wm.instanceColor) wm.instanceColor.needsUpdate = true;
    world.add(wm);

    (g.obst || []).forEach((o, i) => world.add(buildObstacle(o, i)));
    built = { map: g.map, w: W, h: H, mapC: g.mapC, n: (g.obst || []).length };
    doorKey = null; taskKey = null;
  }

  // ---- tareas, puertas, botón, rejillas y aparatos de la sala de espera ----
  const marks = { tasks: [], gems: [] };
  function buildDyn(g) {
    disposeGroup(dyn);
    marks.tasks = []; marks.gems = [];
    for (const t of g.tasks || []) {
      const done = g.done && g.done.has(t.id);
      const grp = new THREE.Group();
      grp.position.set(t.x, 0, t.y);
      const pm = new THREE.Mesh(geo.pillar, glowMat(done ? '#4ade80' : '#ffd60a', done ? 0.14 : 0.2));
      pm.position.y = 40;
      const gem = new THREE.Mesh(geo.gem, glowMat(done ? '#4ade80' : '#ffd60a'));
      gem.position.y = 98;
      grp.add(pm, gem);
      dyn.add(grp);
      marks.gems.push(gem);
    }
    if (!g.lobby && g.btn) {
      const b = new THREE.Group();
      b.position.set(g.btn.x, 0, g.btn.y);
      const base = new THREE.Mesh(geo.cyl, mat('#3a3f46')); base.scale.set(34, 14, 34); base.position.y = 7;
      const top = new THREE.Mesh(geo.dome, glowMat('#e63946')); top.scale.set(22, 16, 22); top.position.y = 14;
      b.add(base, top);
      dyn.add(b);
    }
    if (g.role === 'impostor' || g.engineer) {
      for (const v of g.vents || []) {
        const vm = new THREE.Mesh(geo.box, mat('#1b1f24')); vm.scale.set(46, 4, 34); vm.position.set(v.x, 2, v.y);
        const bars = new THREE.Mesh(geo.box, glowMat('#59606a')); bars.scale.set(38, 1, 3); bars.position.set(v.x, 4.4, v.y);
        dyn.add(vm, bars);
      }
    }
    taskKey = keyOfTasks(g);
  }
  const keyOfTasks = (g) => `${g.tasks ? g.tasks.length : 0}|${g.done ? g.done.size : 0}|${g.lobby ? 1 : 0}|${g.role}|${g.engineer ? 1 : 0}|${g.vents ? g.vents.length : 0}`;

  const doorGrp = new THREE.Group();
  scene.add(doorGrp);
  function buildDoors(g) {
    disposeGroup(doorGrp);
    const drs = (g.st && g.st.drs) || [];
    const closed = new Set(drs.map((d) => d[0]));
    for (const d of g.doors || []) {
      if (!closed.has(d.id)) continue;
      const m = new THREE.Mesh(geo.box, mat('#414b55'));
      m.scale.set(d.w, WALL_H * 0.85, d.h);
      m.position.set(d.x + d.w / 2, (WALL_H * 0.85) / 2, d.y + d.h / 2);
      const stripe = new THREE.Mesh(geo.box, glowMat('#e63946', 0.8));
      stripe.scale.set(d.w + 1, 6, d.h + 1);
      stripe.position.set(d.x + d.w / 2, WALL_H * 0.5, d.y + d.h / 2);
      doorGrp.add(m, stripe);
    }
    doorKey = g.doorKey;
  }

  // ---- los setas ----
    const mkShroom = () => {
    const grp = new THREE.Group();
    const body = new THREE.Group(); // lo que se inclina o se tumba
    grp.add(body);
    const cap = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const rim = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const stem = new THREE.MeshLambertMaterial({ color: 0xf3e9d2 });
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const dark = new THREE.MeshBasicMaterial({ color: 0x1b1410 });
    const feetM = new THREE.MeshLambertMaterial({ color: 0xd8caa6 });
    const all = [cap, rim, stem, white, dark, feetM];
    const place = (m, x, y, z, sx = 1, sy = 1, sz = 1) => { m.position.set(x, y, z); m.scale.set(sx, sy, sz); body.add(m); return m; };
    place(new THREE.Mesh(geo.stem, stem), 0, 17, 0);
    const dome = place(new THREE.Mesh(geo.capDome, cap), 0, 30, 0, 1, 0.78, 1);
    const under = place(new THREE.Mesh(geo.disc, rim), 0, 30, 0);
    under.rotation.x = Math.PI / 2;
    // manchas del sombrero (sobre la cúpula)
    const SP = [[0.0, 0.95], [0.9, 0.62], [2.3, 0.7], [3.6, 0.6], [5.0, 0.68], [1.6, 0.25], [4.2, 0.3]];
    SP.forEach(([a, e], i) => {
      const r0 = 26 * 1.02;
      const px = Math.cos(a) * Math.sqrt(1 - e * e) * r0, pz = Math.sin(a) * Math.sqrt(1 - e * e) * r0, py = 30 + e * r0 * 0.78;
      place(new THREE.Mesh(geo.spot, white), px, py, pz, 1, i % 2 ? 0.45 : 0.55, 1);
    });
    // ojos: miran hacia +x (el frente del seta)
    place(new THREE.Mesh(geo.eye, dark), 10.5, 24, -5.2, 0.8, 1.15, 0.8);
    place(new THREE.Mesh(geo.eye, dark), 10.5, 24, 5.2, 0.8, 1.15, 0.8);
    const f1 = place(new THREE.Mesh(geo.foot, feetM), 2, 3, -7, 1.25, 0.6, 0.9);
    const f2 = place(new THREE.Mesh(geo.foot, feetM), 2, 3, 7, 1.25, 0.6, 0.9);
    const sh = new THREE.Mesh(geo.shadow, shadowMat);
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.6;
    grp.add(sh);
    grp.scale.setScalar(1.15);
    return { grp, body, cap, rim, all, f1, f2, shadow: sh, tag: null, color: '', op: 1, ang: 0, px: null, pz: null, mv: false, name: '', dome };
  };

  const tagTex = new Map();
  function nameSprite(name, color) {
    const key = `${name}|${color}`;
    let t = tagTex.get(key);
    if (!t) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const x = c.getContext('2d');
      x.font = '800 34px system-ui, Segoe UI, Roboto, sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineJoin = 'round';
      x.strokeText(name, 128, 34);
      x.fillStyle = '#ffffff';
      x.fillText(name, 128, 34);
      x.fillStyle = color;
      x.fillRect(96, 54, 64, 5);
      t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      tagTex.set(key, t);
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    s.scale.set(54, 13.5, 1);
    s.position.y = 76;
    s.userData.own = true;
    return s;
  }

  const actors = new Map();  // id → seta vivo o fantasma
  const bodies = new Map();  // id → cuerpo caído
  const actorGrp = new THREE.Group();
  scene.add(actorGrp);

  function paint(a, color, name, alive, inv, T) {
    if (a.color !== color) {
      a.color = color;
      a.cap.color.set(color);
      a.rim.color.set(color).multiplyScalar(0.55);
    }
    const op = !alive ? 0.45 : inv ? 0.3 : 1;
    if (a.op !== op) {
      a.op = op;
      for (const m of a.all) { m.transparent = op < 1; m.opacity = op; m.depthWrite = op >= 1; m.needsUpdate = true; }
      a.shadow.visible = alive;
    }
    const nm = name || '';
    if (a.name !== nm) {
      a.name = nm;
      if (a.tag) { a.grp.remove(a.tag); a.tag.material.dispose(); a.tag = null; }
      if (nm) { a.tag = nameSprite(nm, color); a.grp.add(a.tag); }
    }
    a.grp.position.y = alive ? 0 : 14 + Math.sin(T * 3) * 4;
  }

  function placeActor(a, x, y, moving, T, dt) {
    if (a.px !== null && (Math.abs(x - a.px) > 0.4 || Math.abs(y - a.pz) > 0.4)) {
      const h = Math.atan2(y - a.pz, x - a.px);
      a.ang = a.ang + angDiff(a.ang, h) * Math.min(1, dt * 10);
    }
    a.px = x; a.pz = y;
    a.grp.position.x = x; a.grp.position.z = y;
    a.grp.rotation.y = -a.ang;
    const ph = T * 12;
    a.body.position.y = moving ? Math.abs(Math.sin(ph)) * 3 : 0;
    a.f1.position.x = 2 + (moving ? Math.sin(ph) * 6 : 0);
    a.f2.position.x = 2 - (moving ? Math.sin(ph) * 6 : 0);
    a.body.rotation.z = moving ? -0.07 : 0;
  }

  // ---- bucle de dibujo ----
  const sizeNow = { w: 0, h: 0 };
  function resize(w, h) {
    if (sizeNow.w === w && sizeNow.h === h) return;
    sizeNow.w = w; sizeNow.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(g, T, dt, w, h) {
    resize(w, h);
    if (!g.world) return;
    if (!built || built.map !== g.map || built.mapC !== g.mapC || built.w !== g.world.w || built.h !== g.world.h || built.n !== (g.obst || []).length) buildWorld(g);
    if (taskKey !== keyOfTasks(g)) buildDyn(g);
    if (doorKey !== g.doorKey) buildDoors(g);
    const fp = g.fp;
    const st = g.st || {};

    // niebla = visión del jugador (la misma que el círculo de visión en 2D)
    const env = ENV[g.map] || ENV.greenhouse;
    const vr = st.vr > 0 && g.me.alive ? st.vr : 0;
    const blind = st.bl > 0;
    const blackout = st.dark && g.role !== 'impostor' && g.me.alive;
    let near = 500, far = 1800;
    if (vr) { near = Math.max(30, vr * 0.7); far = Math.max(vr * 2.1, 260); }
    if (blackout) { near = 20; far = 240; }
    if (blind) { near = 5; far = 70; }
    const f = scene.fog;
    f.near += (near - f.near) * Math.min(1, dt * 6);
    f.far += (far - f.far) * Math.min(1, dt * 6);
    amb.intensity = (blackout ? 0.35 : env.amb);
    lamp.intensity = blackout || vr ? 0.9 : 0.55;

    // cámara
    const moving = !!g.me.moving;
    const eye = (g.me.alive ? EYE : EYE + 20 + Math.sin(T * 2) * 3) + (moving && g.me.alive ? Math.sin(T * 12) * 1.6 : 0);
    camera.position.set(g.me.x, eye, g.me.y);
    camera.rotation.y = -fp.yaw - Math.PI / 2;
    camera.rotation.x = fp.pitch;
    lamp.position.set(g.me.x, eye + 30, g.me.y);

    // tareas: las gemas giran
    marks.gems.forEach((gm, i) => { gm.rotation.y = T * 2 + i; gm.position.y = 98 + Math.sin(T * 3 + i) * 4; });

    // los demás setas
    const seen = new Set();
    const ident = (id) => {
      const own = g.roster.get(id) || {};
      const fake = (st.sh && st.sh[id]) || (st.mo && st.mo[id]);
      return fake ? (g.roster.get(fake) || own) : own;
    };
    for (const [id, op] of g.others) {
      if (vr) {
        if (Math.hypot(op.x - g.me.x, op.y - g.me.y) > vr * 1.15) continue;
      }
      if (op.inv && !(g.role === 'impostor' && g.mates && g.mates.includes(id))) continue; // invisible: no se ve
      seen.add(id);
      let a = actors.get(id);
      if (!a) { a = mkShroom(); actors.set(id, a); actorGrp.add(a.grp); }
      const r = ident(id);
      paint(a, r.color || '#ffffff', r.name, op.alive !== false, !!op.inv, T);
      placeActor(a, op.x, op.y, !!op.moving, T, dt);
      a.grp.visible = true;
    }
    for (const [id, a] of actors) if (!seen.has(id)) { actorGrp.remove(a.grp); a.all.forEach((m) => m.dispose()); if (a.tag) a.tag.material.dispose(); actors.delete(id); }

    // cuerpos
    const bs = new Set();
    for (const b of g.bodies || []) {
      const [id, x, y, color, ph] = b;
      if (ph) continue; // la Víbora los deshace
      if (vr && Math.hypot(x - g.me.x, y - g.me.y) > vr * 1.15) continue;
      bs.add(id);
      let a = bodies.get(id);
      if (!a) {
        a = mkShroom();
        a.grp.remove(a.shadow);
        const pool = new THREE.Mesh(geo.shadow, new THREE.MeshBasicMaterial({ color: 0x8a1020, transparent: true, opacity: 0.8, depthWrite: false }));
        pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.9, 0); pool.scale.set(1.5, 1.5, 1.5);
        a.grp.add(pool);
        let hsh = 0; for (let i = 0; i < String(id).length; i++) hsh = (hsh * 31 + String(id).charCodeAt(i)) | 0;
        a.body.rotation.z = Math.PI / 2;
        a.body.position.y = 27;
        a.grp.rotation.y = (Math.abs(hsh) % 628) / 100;
        a.f1.position.set(2, 3, -7); a.f2.position.set(2, 3, 7);
        const r = g.roster.get(id) || {};
        a.cap.color.set(color || r.color || '#ffffff');
        a.rim.color.set(color || r.color || '#ffffff').multiplyScalar(0.55);
        a.color = color;
        bodies.set(id, a);
        actorGrp.add(a.grp);
      }
      a.grp.position.set(x, 0, y);
    }
    for (const [id, a] of bodies) if (!bs.has(id)) { actorGrp.remove(a.grp); a.all.forEach((m) => m.dispose()); bodies.delete(id); }

    renderer.render(scene, camera);
  }

  function dispose() {
    disposeGroup(world); disposeGroup(dyn); disposeGroup(doorGrp);
    for (const a of actors.values()) a.all.forEach((m) => m.dispose());
    for (const a of bodies.values()) a.all.forEach((m) => m.dispose());
    actors.clear(); bodies.clear();
    for (const m of mats.values()) m.dispose();
    for (const m of gmats.values()) m.dispose();
    for (const t of tagTex.values()) t.dispose();
    for (const k of Object.keys(geo)) geo[k].dispose();
    if (tex) tex.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { render, dispose, renderer, scene, camera };
}
