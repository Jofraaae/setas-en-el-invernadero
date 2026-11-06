/* Piezas para montar los modelos 3D de la primera persona: formas básicas con materiales y
   geometrías compartidas. Todo se apoya en el suelo (y = 0) y mira hacia +x. */

import * as THREE from 'three';

const gc = new Map();
const mc = new Map();
const tc = new Map();

export const rnd = (a) => {
  const x = Math.sin(a * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const geo = (key, make) => {
  let g = gc.get(key);
  if (!g) { g = make(); gc.set(key, g); }
  return g;
};

export const mat = (col, o) => {
  const key = col + (o ? JSON.stringify(o) : '');
  let m = mc.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: col, ...(o || {}) }); mc.set(key, m); }
  return m;
};
// sin luz: pantallas, llamas y todo lo que brilla
export const glowMat = (col, op = 1) => {
  const key = `g${col}|${op}`;
  let m = mc.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: col, transparent: op < 1, opacity: op, depthWrite: op >= 1 }); mc.set(key, m); }
  return m;
};
export const glass = (col = '#bfe9ff', op = 0.35) => {
  const key = `gl${col}|${op}`;
  let m = mc.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: op, depthWrite: false }); mc.set(key, m); }
  return m;
};

const col3 = (c) => (c.isColor ? c : new THREE.Color(c));
export const shade = (c, k) => '#' + col3(c).clone().multiplyScalar(k).getHexString();
export const mix = (a, b, t) => '#' + col3(a).clone().lerp(col3(b), t).getHexString();

const mesh = (g, geom, m, x, y, z) => {
  const me = new THREE.Mesh(geom, m);
  me.position.set(x, y, z);
  g.add(me);
  return me;
};

export const bx = (g, w, h, d, col, x = 0, y = 0, z = 0) => {
  const me = mesh(g, geo('box', () => new THREE.BoxGeometry(1, 1, 1)), typeof col === 'string' ? mat(col) : col, x, y + h / 2, z);
  me.scale.set(w, h, d);
  return me;
};
export const cy = (g, rt, rb, h, col, x = 0, y = 0, z = 0, seg = 16) =>
  mesh(g, geo(`cy${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), typeof col === 'string' ? mat(col) : col, x, y + h / 2, z);
export const cone = (g, r, h, col, x = 0, y = 0, z = 0, seg = 12) =>
  mesh(g, geo(`co${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), typeof col === 'string' ? mat(col) : col, x, y + h / 2, z);
export const sp = (g, r, col, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const me = mesh(g, geo('sp', () => new THREE.SphereGeometry(1, 14, 10)), typeof col === 'string' ? mat(col) : col, x, y, z);
  me.scale.set(r * sx, r * sy, r * sz);
  return me;
};
export const ico = (g, r, col, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 1) => {
  const me = mesh(g, geo(`ico${detail}`, () => new THREE.IcosahedronGeometry(1, detail)), typeof col === 'string' ? mat(col, { flatShading: true }) : col, x, y, z);
  me.scale.set(r * sx, r * sy, r * sz);
  return me;
};
export const dome = (g, r, col, x = 0, y = 0, z = 0, sy = 1) => {
  const me = mesh(g, geo('dome', () => new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2)), typeof col === 'string' ? mat(col) : col, x, y, z);
  me.scale.set(r, r * sy, r);
  return me;
};
export const tor = (g, R, r, col, x = 0, y = 0, z = 0, rx = Math.PI / 2, seg = 20) => {
  const me = mesh(g, geo(`tor${R}|${r}|${seg}`, () => new THREE.TorusGeometry(R, r, 8, seg)), typeof col === 'string' ? mat(col) : col, x, y, z);
  me.rotation.x = rx;
  return me;
};
// cuerpo de revolución: perfil [[radio, altura], ...] de abajo arriba
export const lathe = (g, pts, col, x = 0, y = 0, z = 0, seg = 18) => {
  const key = `la${seg}|${pts.map((p) => p.join(',')).join(';')}`;
  const ge = geo(key, () => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg));
  return mesh(g, ge, typeof col === 'string' ? mat(col, { side: THREE.DoubleSide }) : col, x, y, z);
};
// tubo que sigue una curva (cables, tuberías): puntos [[x,y,z],...]
export const tube = (g, pts, r, col, seg = 20) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const ge = new THREE.TubeGeometry(curve, seg, r, 6, false);
  const me = new THREE.Mesh(ge, typeof col === 'string' ? mat(col) : col);
  me.userData.ownGeo = true;
  g.add(me);
  return me;
};

let haloTex = null;
export const halo = (g, col, size, x = 0, y = 0, z = 0, op = 0.8) => {
  if (!haloTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x2 = c.getContext('2d');
    const gr = x2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64);
    haloTex = new THREE.CanvasTexture(c);
  }
  const key = `halo${col}|${op}`;
  let m = mc.get(key);
  if (!m) { m = new THREE.SpriteMaterial({ map: haloTex, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }); mc.set(key, m); }
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  g.add(s);
  return s;
};

// sombra suave bajo cada objeto: lo asienta en el suelo
let shadowTex = null;
export const blob = (w, d, op = 0.45) => {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x2 = c.getContext('2d');
    const gr = x2.createRadialGradient(32, 32, 6, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.65, 'rgba(0,0,0,.55)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x2.fillStyle = gr; x2.fillRect(0, 0, 64, 64);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const key = `blob${op}`;
  let m = mc.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: op, depthWrite: false }); mc.set(key, m); }
  const me = new THREE.Mesh(geo('plane', () => new THREE.PlaneGeometry(1, 1)), m);
  me.rotation.x = -Math.PI / 2;
  me.scale.set(w, d, 1);
  me.position.y = 0.6;
  return me;
};

export function tex(key, w, h, draw, opt = {}) {
  let t = tc.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (opt.repeat) { t.wrapS = THREE.RepeatWrapping; t.wrapT = opt.repeatY ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; }
    t.anisotropy = 4;
    tc.set(key, t);
  }
  return t;
}

export function disposeKit() {
  for (const g of gc.values()) g.dispose();
  for (const m of mc.values()) m.dispose();
  for (const t of tc.values()) t.dispose();
  gc.clear(); mc.clear(); tc.clear();
  haloTex = null; shadowTex = null;
}

// los tubos y demás geometrías propias se liberan al desmontar un grupo
export function freeGroup(grp) {
  grp.traverse((o) => { if (o.userData && o.userData.ownGeo && o.geometry) o.geometry.dispose(); });
}

export const TAU = Math.PI * 2;
