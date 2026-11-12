/* Modo de primera persona: dibuja la partida en 3D con Three.js.
   No cambia nada del juego: la sala sigue siendo la misma (mismas posiciones, mismas colisiones, mismas
   órdenes). Esto solo lee el estado `g` que ya mantiene el cliente y lo pinta desde los ojos del seta.
   Ejes: x del mundo = x de Three, y del mundo (hacia abajo en el mapa) = z de Three, y de Three = altura.
   El ángulo `yaw` es el del mundo: mirar hacia (cos yaw, sin yaw).
   El suelo es el dibujo del mapa SIN objetos (buildWorld con `flat`); todo lo demás (muros, objetos,
   tareas, rejillas, reactor, botón, puertas) son modelos 3D de fp3dModels.js y fp3dWalls.js. */

import * as THREE from 'three';
import { makeGrid, polyHas } from './grid';
import { buildWorld as bakeFlat, wallStyleFor, VENT_ANIM_MS } from './render';
import { createLook, hasLook } from './fp3dLook';
import { buildObstacle, buildProp, buildConsole, buildVent, buildButton, FRONTAL } from './fp3dModels';
import { disposeKit, glowMat, mat, rnd, tex } from './fp3dKit';
import { wallMaterial, roofMaterial, skyTexture, disposeWalls, styleH } from './fp3dWalls';

const CELL = 20;
export const EYE = 46;
const FOV = 76;

// Aire de cada escenario: cielo, niebla, techo (si es un recinto cerrado) y luz de ambiente.
const ENV = {
  greenhouse: { sky: '#0a1812', top: '#0a1812', roof: 'glass', amb: 1.05, sun: 0.5 },
  lobby: { sky: '#1a120a', top: '#1a120a', roof: 'wood', amb: 1.1, sun: 0.45 },
  micelaria: { sky: '#1d3a2a', top: '#0a1424', roof: null, amb: 1.0, sun: 0.75 },
  pantano: { sky: '#26382f', top: '#0e1a22', roof: null, amb: 0.95, sun: 0.6 },
};

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
  const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x3a3026, 0.55);
  const sun = new THREE.DirectionalLight(0xfff1d6, 0.6);
  sun.position.set(-300, 900, 400);
  const lamp = new THREE.PointLight(0xffe2b0, 0, 520, 1.4);
  scene.add(amb, hemi, sun, lamp);

  const world = new THREE.Group(); // lo que cambia con el mapa
  const dyn = new THREE.Group();   // tareas
  scene.add(world, dyn);

  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const geoIco = new THREE.IcosahedronGeometry(1, 1);
  const geoPillar = new THREE.CylinderGeometry(9, 9, 80, 14, 1, true);
  const geoGem = new THREE.OctahedronGeometry(10);
  const geoDisc = new THREE.CircleGeometry(26, 22);
  const geoCap = new THREE.SphereGeometry(26, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const geoStem = new THREE.CylinderGeometry(11, 13, 30, 16);
  const geoSpot = new THREE.SphereGeometry(4.2, 8, 6);
  const geoEye = new THREE.SphereGeometry(3.2, 10, 8);
  const geoFoot = new THREE.SphereGeometry(7, 10, 8);
  const geoShadow = new THREE.CircleGeometry(20, 20);
  const geo = { capDome: geoCap, stem: geoStem, disc: geoDisc, spot: geoSpot, eye: geoEye, foot: geoFoot, shadow: geoShadow };
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });

  let built = null;
  let doorKey = null;
  let taskKey = null;
  let tex2 = null;
  let detailTex = null; // grano fino que se repite sobre el suelo: el dibujo del mapa es de baja resolución y de cerca se veía borroso
  let waterTex = null;  // textura animada del agua (más baja que el suelo)
  let waterMats = [];
  let tex3 = null;      // copia del suelo para el tablero de los muelles
  let dockMats = [];
  let docks = [];       // polígonos de muelle: se elevan sobre el agua
  let camLift = 0;
  const DOCK_H = 9;
  const inPolyP = (poly, x, y) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  // altura del suelo en un punto: los muelles son un tablero elevado, el resto va a ras
  const liftAt = (x, z) => { for (const p of docks) if (inPolyP(p, x, z)) return DOCK_H; return 0; };
  let ticks = [];
  const ctl = { core: null, consoles: [], vents: [], gems: [] };

  const disposeGroup = (grp) => {
    while (grp.children.length) {
      const ch = grp.children[0];
      grp.remove(ch);
      ch.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
        else if (o.userData && o.userData.ownGeo && o.geometry) o.geometry.dispose();
        else if (o.userData && o.userData.own) { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }
      });
    }
  };
  const collectTicks = (grp) => grp.traverse((o) => { if (o.userData && typeof o.userData.tick === 'function') ticks.push(o.userData.tick); });

  // Lo que de verdad define el mundo 3D (suelo, muros, objetos, rejillas, botón). Al volver de una reunión la
  // partida se vuelve a montar y el dibujo 2D (g.mapC) es un lienzo NUEVO, pero idéntico: reconstruir todo
  // el 3D por eso congelaba la pantalla un buen rato. Si la firma no ha cambiado, no se toca nada.
  function worldSig(g) {
    return JSON.stringify([g.map, g.world.w, g.world.h, !!g.lobby, g.floors, g.obst, g.vents, g.btn]);
  }
  function worldChanged(g) {
    if (!built || built.map !== g.map || built.w !== g.world.w || built.h !== g.world.h || built.n !== (g.obst || []).length) return true;
    if (built.mapC === g.mapC) return false;
    if (built.sig !== worldSig(g)) return true;
    built.mapC = g.mapC; // mismo mundo, lienzo nuevo: basta con apuntar al nuevo
    return false;
  }

  function makeDetail() {
    const N = 256, c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d');
    let seed = 7;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 90; i++) { // manchas suaves
      const px = r() * N, py = r() * N, rad = 10 + r() * 26, dark = r() < 0.55;
      const grd = x.createRadialGradient(px, py, 0, px, py, rad);
      grd.addColorStop(0, dark ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.08)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = grd;
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { x.save(); x.translate(ox, oy); x.beginPath(); x.arc(px, py, rad, 0, 6.3); x.fill(); x.restore(); }
    }
    for (let i = 0; i < 1400; i++) { // granos
      x.fillStyle = r() < 0.6 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.12)';
      const w = 1 + r() * 2.4;
      x.fillRect(r() * N, r() * N, w, w * (0.6 + r()));
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  // agua de verdad: un hueco en el suelo con un plano más bajo, textura propia que se mueve y orilla con
  // profundidad; los muelles pasan por encima. Antes era solo el dibujo del agua pintado en el suelo.
  function makeWaterTex(col) {
    const N = 256, c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d');
    const lg = x.createLinearGradient(0, 0, N, N); // base algo más clara que el dibujo plano, con vetas de luz
    lg.addColorStop(0, col); lg.addColorStop(0.5, col); lg.addColorStop(1, col);
    x.fillStyle = lg;
    x.fillRect(0, 0, N, N);
    x.fillStyle = 'rgba(160,255,220,.16)';
    x.fillRect(0, 0, N, N);
    let seed = 11;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 46; i++) { // ondas largas que cierran en los bordes (la textura se repite)
      const y0 = r() * N, amp = 2 + r() * 5, ph = r() * 6.3, k = 1 + Math.floor(r() * 2);
      x.strokeStyle = r() < 0.5 ? 'rgba(220,255,240,.34)' : 'rgba(0,16,20,.34)';
      x.lineWidth = 1.5 + r() * 2.6;
      x.beginPath();
      for (let px = 0; px <= N; px += 4) { const py = y0 + Math.sin((px / N) * 6.2832 * k + ph) * amp; px ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke();
    }
    for (let i = 0; i < 40; i++) { // destellos
      x.fillStyle = 'rgba(255,255,255,.4)';
      x.fillRect(r() * N, r() * N, 3 + r() * 5, 1.5);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  const WATER_Y = -16;
  function buildWater(g, W, H, polys) {
    if (waterTex) { waterTex.dispose(); waterTex = null; }
    for (const m of waterMats) m.dispose();
    waterMats = [];
    if (!polys.length) return;
    const col = polys[0].color || '#2c6b57';
    waterTex = makeWaterTex(col);
    waterTex.repeat.set(1 / 150, 1 / 150);
    const surf = new THREE.MeshBasicMaterial({ map: waterTex });
    const mud = new THREE.MeshLambertMaterial({ color: 0x232a1c, side: THREE.DoubleSide });
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    waterMats = [surf, mud, hidden];
    for (const { poly } of polys) {
      const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
      const sg = new THREE.ShapeGeometry(shape);
      sg.rotateX(-Math.PI / 2);
      sg.translate(0, WATER_Y, 0);
      const sm = new THREE.Mesh(sg, surf);
      sm.userData.ownGeo = true;
      world.add(sm);
      const wg = new THREE.ExtrudeGeometry(shape, { depth: -WATER_Y + 0.5, bevelEnabled: false }); // la orilla: pared de barro
      wg.rotateX(-Math.PI / 2);
      wg.translate(0, WATER_Y, 0);
      const wm = new THREE.Mesh(wg, [hidden, mud]);
      wm.userData.ownGeo = true;
      world.add(wm);
    }
  }

  // muelles y puentes: antes eran solo el dibujo pegado al suelo. Ahora un tablero con grosor (con la misma
  // textura del mapa en la cara de arriba), postes y cuerda por el borde exterior, y todo lo que pisa encima
  // (jugadores, botón, tareas, cámara) sube con él
  function buildDocks(g, W, H) {
    if (tex3) { tex3.dispose(); tex3 = null; }
    for (const m of dockMats) m.dispose();
    dockMats = [];
    docks = (g.floors || [])
      .filter((f) => f[7] && f[7].bridge)
      .map((f) => f[7].poly || [[f[0], f[1]], [f[0] + f[2], f[1]], [f[0] + f[2], f[1] + f[3]], [f[0], f[1] + f[3]]]);
    if (!docks.length) return;
    tex3 = tex2.clone();
    tex3.repeat.set(1 / W, 1 / H);
    tex3.offset.set(0, 1);
    tex3.needsUpdate = true;
    const topMat = new THREE.MeshBasicMaterial({ map: tex3, alphaTest: 0.5 });
    const sideMat = new THREE.MeshLambertMaterial({ color: 0x3f2c1a });
    dockMats = [topMat, sideMat];
    for (const poly of docks) {
      const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: DOCK_H + 20, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, -20, 0);
      const m = new THREE.Mesh(geo, [topMat, sideMat]);
      m.userData.ownGeo = true;
      world.add(m);
    }
    // postes cada ~110 px del perímetro, nunca dentro de otro tramo, unidos por una cuerda
    const posts = [], ropes = [];
    docks.forEach((poly, di) => {
      const n = poly.length;
      let next = 0, prev = null, first = null;
      for (let i = 0; i < n; i++) {
        const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n];
        const len = Math.hypot(x1 - x0, y1 - y0) || 1;
        for (; next <= len; next += 110) {
          const px = x0 + ((x1 - x0) * next) / len, py = y0 + ((y1 - y0) * next) / len;
          if (docks.some((o, oi) => oi !== di && inPolyP(o, px, py))) { prev = null; continue; }
          posts.push(px, py);
          if (prev) ropes.push(prev[0], prev[1], px, py);
          else if (!first) first = [px, py];
          prev = [px, py];
        }
        next -= len;
      }
      if (prev && first && Math.hypot(prev[0] - first[0], prev[1] - first[1]) < 140) ropes.push(prev[0], prev[1], first[0], first[1]);
    });
    const dd = new THREE.Object3D();
    if (posts.length) {
      const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(3.2, 4.2, 38, 8), new THREE.MeshLambertMaterial({ color: 0x5b4127 }), posts.length / 2);
      for (let k = 0; k < posts.length / 2; k++) { dd.position.set(posts[k * 2], DOCK_H + 19, posts[k * 2 + 1]); dd.rotation.set(0, 0, 0); dd.scale.set(1, 1, 1); dd.updateMatrix(); pm.setMatrixAt(k, dd.matrix); }
      pm.instanceMatrix.needsUpdate = true;
      pm.userData.own = true;
      world.add(pm);
    }
    if (ropes.length) {
      const rm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xb59a68 }), ropes.length / 4);
      for (let k = 0; k < ropes.length / 4; k++) {
        const [ax, ay, bx, by] = [ropes[k * 4], ropes[k * 4 + 1], ropes[k * 4 + 2], ropes[k * 4 + 3]];
        dd.position.set((ax + bx) / 2, DOCK_H + 30, (ay + by) / 2);
        dd.rotation.set(0, -Math.atan2(by - ay, bx - ax), 0);
        dd.scale.set(Math.hypot(bx - ax, by - ay), 2.4, 2.4);
        dd.updateMatrix();
        rm.setMatrixAt(k, dd.matrix);
      }
      rm.instanceMatrix.needsUpdate = true;
      rm.userData.own = true;
      world.add(rm);
    }
  }

  function buildWorld(g) {
    disposeGroup(world);
    ticks = []; ctl.core = null; ctl.consoles = []; ctl.vents = [];
    const W = g.world.w, H = g.world.h;
    const env = ENV[g.map] || ENV.greenhouse;
    scene.background = env.roof ? new THREE.Color(env.sky) : skyTexture(env.top, env.sky);
    scene.fog = new THREE.Fog(env.sky, 500, 1800);
    amb.intensity = env.amb;
    sun.intensity = env.sun;

    // suelo: el dibujo del mapa pero vacío (sin objetos ni aparatos pintados), tendido en el suelo
    if (tex2) tex2.dispose();
    const flat = bakeFlat(g.world, g.floors, [], g.btn || { x: -9999, y: -9999 }, [], { map: g.map, flat: true }).mapC;
    let src = flat;
    const maxT = Math.min(4096, renderer.capabilities.maxTextureSize || 4096);
    if (Math.max(src.width, src.height) > maxT) {
      const k = maxT / Math.max(src.width, src.height);
      const c2 = document.createElement('canvas');
      c2.width = Math.round(src.width * k); c2.height = Math.round(src.height * k);
      c2.getContext('2d').drawImage(src, 0, 0, c2.width, c2.height);
      src = c2;
    }
    // huecos del agua: se borran del suelo (en una copia, el lienzo del mapa 2D no se toca) y se devuelve el dibujo
    // original solo bajo los muelles, que son el tablero que pasa por encima
    const waterPolys = (g.floors || []).filter((f) => f[7] && f[7].water && f[7].poly).map((f) => ({ poly: f[7].poly, color: f[4] }));
    const dockPolys = (g.floors || []).filter((f) => f[7] && f[7].bridge).map((f) => f[7].poly || [[f[0], f[1]], [f[0] + f[2], f[1]], [f[0] + f[2], f[1] + f[3]], [f[0], f[1] + f[3]]]);
    if (waterPolys.length) {
      const k = src.width / W;
      const c3 = document.createElement('canvas');
      c3.width = src.width; c3.height = src.height;
      const x3 = c3.getContext('2d');
      x3.drawImage(src, 0, 0);
      const path = (poly) => { x3.beginPath(); poly.forEach(([px, py], i) => (i ? x3.lineTo(px * k, py * k) : x3.moveTo(px * k, py * k))); x3.closePath(); };
      x3.globalCompositeOperation = 'destination-out';
      for (const wp of waterPolys) { path(wp.poly); x3.fill(); }
      x3.globalCompositeOperation = 'source-over';
      for (const dp of dockPolys) { x3.save(); path(dp); x3.clip(); x3.drawImage(src, 0, 0); x3.restore(); }
      src = c3;
    }
    tex2 = new THREE.CanvasTexture(src);
    tex2.colorSpace = THREE.SRGBColorSpace;
    tex2.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex2.minFilter = THREE.LinearMipmapLinearFilter;
    // grano de detalle mezclado en el propio suelo (da textura al verlo de cerca)
    if (!detailTex) detailTex = makeDetail();
    const groundMat = new THREE.MeshBasicMaterial({ map: tex2, alphaTest: waterPolys.length ? 0.5 : 0 });
    const dRep = new THREE.Vector2(W / 200, H / 200), dAmt = { value: env.roof ? 0.55 : 0.8 };
    groundMat.onBeforeCompile = (sh) => {
      sh.uniforms.detailMap = { value: detailTex };
      sh.uniforms.detailRep = { value: dRep };
      sh.uniforms.detailAmt = dAmt;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D detailMap; uniform vec2 detailRep; uniform float detailAmt;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n  vec4 dt = texture2D(detailMap, vMapUv * detailRep); diffuseColor.rgb = mix(diffuseColor.rgb, dt.rgb, dt.a * detailAmt);');
    };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, H), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(W / 2, 0, H / 2);
    ground.userData.own = true;
    world.add(ground);
    buildWater(g, W, H, waterPolys);
    buildDocks(g, W, H);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, H * 4), new THREE.MeshBasicMaterial({ color: env.sky }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(W / 2, -1, H / 2);
    if (waterPolys.length) outer.position.y = WATER_Y - 30; // que no tape el hueco del agua
    outer.userData.own = true;
    world.add(outer);
    if (env.roof) {
      const rt = roofMaterial(env.roof).clone();
      rt.repeat.set((W + 400) / 160, (H + 400) / 160);
      rt.needsUpdate = true;
      const roof = new THREE.Mesh(new THREE.PlaneGeometry(W + 400, H + 400), new THREE.MeshBasicMaterial({ map: rt, side: THREE.DoubleSide }));
      roof.rotation.x = Math.PI / 2;
      roof.position.set(W / 2, 134, H / 2);
      roof.userData.own = true;
      world.add(roof);
    }

    // muros: celdas que cierran el paso junto a suelo transitable; cada una con el estilo de su edificio
    const full = makeGrid(g.world, g.floors, []);
    const { gw, gh, cells } = full;
    const byStyle = new Map();
    const wallDone = new Set();
    for (let ty = 0; ty < gh; ty++) for (let tx = 0; tx < gw; tx++) {
      if (cells[ty * gw + tx]) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = tx + dx, ny = ty + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        if (cells[ny * gw + nx]) { near = true; break; }
      }
      if (!near) continue;
      const style = wallStyleFor(g.map, g.floors, tx * CELL + CELL / 2, ty * CELL + CELL / 2);
      if (style === 'water') continue; // el agua no tiene muro
      if (!byStyle.has(style)) byStyle.set(style, []);
      byStyle.get(style).push(tx, ty);
      wallDone.add(ty * gw + tx);
    }
    // mapas al aire libre: una pared de árboles por todo el borde del mundo, para que ni el agua ni un claro
    // lleguen nunca a un corte con el vacío (se veía el final del mapa al mirar al otro lado de la laguna)
    if (!env.roof) {
      for (let ty = 0; ty < gh; ty++) for (let tx = 0; tx < gw; tx++) {
        if (tx > 3 && ty > 3 && tx < gw - 4 && ty < gh - 4) continue;
        const i = ty * gw + tx;
        if (cells[i] || wallDone.has(i)) continue;
        if (!byStyle.has('forest')) byStyle.set('forest', []);
        byStyle.get('forest').push(tx, ty);
      }
    }
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const blobs = [];
    for (const [style, wc] of byStyle) {
      const n = wc.length / 2, hs = styleH(style);
      const wm = new THREE.InstancedMesh(geoBox, wallMaterial(style), n);
      for (let k = 0; k < n; k++) {
        const tx = wc[k * 2], ty = wc[k * 2 + 1];
        const hgt = hs * (style === 'forest' ? 0.94 + rnd(tx * 7 + ty * 13) * 0.12 : 1);
        d.position.set(tx * CELL + CELL / 2, hgt / 2, ty * CELL + CELL / 2);
        d.scale.set(CELL, hgt, CELL);
        d.updateMatrix();
        wm.setMatrixAt(k, d.matrix);
        wm.setColorAt(k, col.setScalar(0.9 + rnd(tx * 3 + ty * 5) * 0.2));
        if (style === 'forest' && rnd(tx * 11 + ty * 17) > 0.42) blobs.push(tx * CELL + CELL / 2 + (rnd(tx + 9 * ty) - 0.5) * 18, hgt, ty * CELL + CELL / 2 + (rnd(ty + 3 * tx) - 0.5) * 18, 20 + rnd(tx * 5 + ty) * 16, rnd(tx * 2 + ty * 7));
      }
      wm.instanceMatrix.needsUpdate = true;
      if (wm.instanceColor) wm.instanceColor.needsUpdate = true;
      world.add(wm);
    }
    // copas de árbol sobre la arboleda: rompen la silueta recta del muro
    if (blobs.length) {
      const nb = blobs.length / 5;
      const bm = new THREE.InstancedMesh(geoIco, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), nb);
      for (let k = 0; k < nb; k++) {
        const r = blobs[k * 5 + 3];
        d.position.set(blobs[k * 5], blobs[k * 5 + 1] + r * 0.2, blobs[k * 5 + 2]);
        d.scale.set(r, r * 0.8, r);
        d.updateMatrix();
        bm.setMatrixAt(k, d.matrix);
        bm.setColorAt(k, col.setHSL(0.27 + blobs[k * 5 + 4] * 0.1, 0.45, 0.14 + blobs[k * 5 + 4] * 0.12));
      }
      bm.instanceMatrix.needsUpdate = true;
      if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
      world.add(bm);
    }

    // objetos del mapa
    // el frente de cada objeto mira hacia donde hay suelo por el que llegar
    const open = (px, py) => { const tx = Math.floor(px / CELL), ty = Math.floor(py / CELL); return tx >= 0 && ty >= 0 && tx < gw && ty < gh && cells[ty * gw + tx] ? 1 : 0; };
    const facing = (o) => {
      const cx = o[0] + o[2] / 2, cy2 = o[1] + o[3] / 2, hx = o[2] / 2 + 14, hy = o[3] / 2 + 14;
      const side = [
        [[-0.6, 1], [0, 1], [0.6, 1]], [[1, -0.6], [1, 0], [1, 0.6]], [[-0.6, -1], [0, -1], [0.6, -1]], [[-1, -0.6], [-1, 0], [-1, 0.6]],
      ].map((pts) => pts.reduce((n, [ux, uy]) => n + open(cx + ux * hx * (ux === 1 || ux === -1 ? 1 : 1), cy2 + uy * hy * (uy === 1 || uy === -1 ? 1 : 1)), 0));
      let best = 0;
      for (let i = 1; i < 4; i++) if (side[i] > side[best]) best = i;
      return best;
    };
    (g.obst || []).forEach((o, i) => {
      const m = buildObstacle(o[4], o[0], o[1], o[2], o[3], i + 1, FRONTAL.has(o[4]) ? facing(o) : 0);
      m.userData.type = o[4];
      m.position.y += liftAt(o[0] + o[2] / 2, o[1] + o[3] / 2);
      world.add(m);
      if (o[4] === 'core' && !ctl.core) ctl.core = m;
    });
    // consolas del reactor
    for (const pt of (g.rmeta && g.rmeta.pts) || []) { const c = buildConsole(pt.x, pt.y, pt.side); world.add(c); ctl.consoles.push(c); }
    // rejillas de ventilación
    for (const v of g.vents || []) { const m = buildVent(v.x, v.y); m.userData.id = v.id; world.add(m); ctl.vents.push(m); }
    // botón de emergencia
    if (!g.lobby && g.btn) {
      const bb = buildButton(g.btn.x, g.btn.y);
      bb.position.y += liftAt(g.btn.x, g.btn.y);
      // si el botón está sobre un objeto (una máquina, una mesa), se apoya encima
      const under = (g.obst || []).find((o) => g.btn.x >= o[0] && g.btn.x <= o[0] + o[2] && g.btn.y >= o[1] && g.btn.y <= o[1] + o[3]);
      if (under) { bb.position.y = under[4] === 'machine' ? 66 : under[4] === 'table' ? 36 : 48; bb.scale.setScalar(0.6); }
      world.add(bb);
    }
    collectTicks(world);
    built = { map: g.map, w: W, h: H, mapC: g.mapC, n: (g.obst || []).length, sig: worldSig(g) };
    doorKey = null; taskKey = null;
  }

  // ---- tareas: su objeto y, encima, la columna de luz que dice dónde están ----
  function buildDyn(g) {
    disposeGroup(dyn);
    ctl.gems = [];
    (g.tasks || []).forEach((t, i) => {
      const done = g.done && g.done.has(t.id);
      const b = t.box || [t.x - 28, t.y - 22, 56, 44];
      const prop = buildProp(t.kind, t.x, t.y, b[2], b[3], i + 1);
      dyn.add(prop);
      const grp = new THREE.Group();
      grp.position.set(t.x, liftAt(t.x, t.y), t.y);
      const pm = new THREE.Mesh(geoPillar, glowMat(done ? '#4ade80' : '#ffd60a', done ? 0.1 : 0.16));
      pm.position.y = 124;
      pm.scale.y = 1.6;
      const gem = new THREE.Mesh(geoGem, glowMat(done ? '#4ade80' : '#ffd60a'));
      gem.position.y = 150;
      grp.add(pm, gem);
      dyn.add(grp);
      ctl.gems.push(gem);
    });
    collectTicks(dyn);
    taskKey = keyOfTasks(g);
  }
  const keyOfTasks = (g) => `${g.tasks ? g.tasks.length : 0}|${g.done ? g.done.size : 0}|${g.lobby ? 1 : 0}`;

  const hazard = () => tex('hazard', 64, 64, (c, w, h) => {
    c.fillStyle = '#3b434c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e9b82a';
    for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(i * 20, h); c.lineTo(i * 20 + 12, h); c.lineTo(i * 20 + 12 + h, 0); c.lineTo(i * 20 + h, 0); c.fill(); }
  }, { repeat: true, repeatY: true });
  const doorGrp = new THREE.Group();
  scene.add(doorGrp);
  function buildDoors(g) {
    disposeGroup(doorGrp);
    const drs = (g.st && g.st.drs) || [];
    const closed = new Set(drs.map((d) => d[0]));
    for (const d of g.doors || []) {
      if (!closed.has(d.id)) continue;
      const hh = 120;
      const m = new THREE.Mesh(geoBox, mat('#59616d', { map: hazard() }));
      m.scale.set(d.w, hh, d.h);
      m.position.set(d.x + d.w / 2, hh / 2, d.y + d.h / 2);
      const bar = new THREE.Mesh(geoBox, glowMat('#e63946', 0.9));
      bar.scale.set(d.w + 1.5, 7, d.h + 1.5);
      bar.position.set(d.x + d.w / 2, hh * 0.55, d.y + d.h / 2);
      doorGrp.add(m, bar);
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
      if (a.lk) a.lk.setOpacity(op);
    }
    const nm = name || '';
    if (a.name !== nm) {
      a.name = nm;
      if (a.tag) { a.grp.remove(a.tag); a.tag.material.dispose(); a.tag = null; }
      if (nm) { a.tag = nameSprite(nm, color); a.grp.add(a.tag); }
    }
    a.grp.position.y = liftAt(a.grp.position.x, a.grp.position.z) + (alive ? 0 : 14 + Math.sin(T * 3) * 4);
  }

  const geoPlane = new THREE.PlaneGeometry(1, 1);
  function dropLook(a) {
    if (!a.lk) return;
    actorGrp.remove(a.lk.pivot);
    a.body.remove(a.lk.faceM);
    a.lk.dispose();
    a.lk = null;
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
    if (worldChanged(g)) buildWorld(g);
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
    camLift += (liftAt(g.me.x, g.me.y) - camLift) * Math.min(1, dt * 10); // sube al tablero sin dar un salto
    camera.position.set(g.me.x, eye + camLift, g.me.y);
    camera.rotation.y = -fp.yaw - Math.PI / 2;
    camera.rotation.x = fp.pitch;
    lamp.position.set(g.me.x, eye + camLift + 30, g.me.y);

    // tareas: las gemas giran
    if (waterTex) waterTex.offset.set(T * 0.012, T * 0.007);
    ctl.gems.forEach((gm, i) => { gm.rotation.y = T * 2 + i; gm.position.y = 150 + Math.sin(T * 3 + i) * 4; });
    for (const t of ticks) t(T);

    // reactor en alarma: el núcleo se pone rojo y las consolas parpadean; con una mano puesta, en verde
    const rx = st.rx;
    if (ctl.core) {
      const u = ctl.core.userData;
      const cm = u.core, hl = u.halo;
      u.alarm = !!rx;
      if (rx && cm && hl) {
        const k = 0.5 + 0.5 * Math.sin(T * 7);
        cm.material = glowMat(k > 0.5 ? '#ff4d5e' : '#a8202e');
        hl.material.color.set('#ff4d5e'); hl.material.opacity = 0.45 + 0.4 * k;
      }
    }
    for (const c of ctl.consoles) {
      const u = c.userData;
      const held = !!(rx && rx[u.side]);
      const k = rx ? (0.5 + 0.5 * Math.sin(T * 8)) : 0;
      const fm = glowMat(held ? '#4ade80' : rx ? (k > 0.5 ? '#ff4d5e' : '#7a1d28') : '#2a6a8a');
      u.face.material = fm; u.face2.material = fm;
      u.lamp.material = glowMat(held ? '#4ade80' : rx && k > 0.5 ? '#ff4d5e' : '#3a1418');
      u.halo.visible = !!rx;
    }
    // rejillas: las ven todos; el impostor y el ingeniero las ven marcadas y se abren al entrar o salir
    const vmark = g.role === 'impostor' || g.engineer;
    const nowMs = performance.now();
    for (const v of ctl.vents) {
      v.userData.ring.visible = !!vmark;
      const t0 = g.ventFx && g.ventFx.get(v.userData.id);
      const k = t0 ? Math.min(1, (nowMs - t0) / VENT_ANIM_MS) : 1;
      v.userData.lid.rotation.x = k < 1 ? -Math.sin(Math.PI * k) * 1.2 : 0;
    }

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
      // accesorios del armario
      if (hasLook(r.look)) {
        if (!a.lk) {
          a.lk = createLook(geoPlane);
          a.lk.setOpacity(a.op);
          a.body.add(a.lk.faceM);
          actorGrp.add(a.lk.pivot);
        }
        a.lk.paint(r.look, T);
        a.lk.pivot.visible = true;
        a.lk.place(a.grp.position.x, a.grp.position.y + a.body.position.y, a.grp.position.z, a.ang, camera.position.x, camera.position.y, camera.position.z);
      } else if (a.lk) dropLook(a);
    }
    for (const [id, a] of actors) if (!seen.has(id)) { dropLook(a); actorGrp.remove(a.grp); a.all.forEach((m) => m.dispose()); if (a.tag) a.tag.material.dispose(); actors.delete(id); }

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
      a.grp.position.set(x, liftAt(x, y), y);
    }
    for (const [id, a] of bodies) if (!bs.has(id)) { actorGrp.remove(a.grp); a.all.forEach((m) => m.dispose()); bodies.delete(id); }

    renderer.render(scene, camera);
  }

  function dispose() {
    disposeGroup(world); disposeGroup(dyn); disposeGroup(doorGrp);
    disposeWalls(); disposeKit();
    if (tex3) tex3.dispose();
    if (detailTex) detailTex.dispose();
    if (waterTex) waterTex.dispose();
    for (const m of dockMats) m.dispose();
    for (const m of waterMats) m.dispose();
    for (const a of actors.values()) { dropLook(a); a.all.forEach((m) => m.dispose()); }
    geoPlane.dispose();
    for (const a of bodies.values()) a.all.forEach((m) => m.dispose());
    actors.clear(); bodies.clear();
    for (const t of tagTex.values()) t.dispose();
    for (const k of Object.keys(geo)) geo[k].dispose();
    [geoBox, geoIco, geoPillar, geoGem].forEach((x) => x.dispose());
    shadowMat.dispose();
    if (tex2) tex2.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { render, dispose, renderer, scene, camera };
}
