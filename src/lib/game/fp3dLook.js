/* Accesorios del armario en primera persona.
   Los accesorios se dibujan en 2D (cosmetics.js), así que aquí se pintan en lienzos y se pegan
   al seta 3D: sombreros, trajes y adornos van en una lámina que siempre mira a la cámara (con el
   giro hacia donde mira el seta), la espalda en otra lámina por detrás y la cara (gafas, bigote…)
   en una placa pegada al frente del seta, para que se vea cuando te mira de frente. */

import * as THREE from 'three';
import { drawLookLayer, hasLook, LOOK_SLOTS } from './cosmetics';

const W = 256;                 // lienzo de las láminas: 2 px por unidad del dibujo 2D
const S = 2;
const OX = 64, OY = 84;        // unidad 2D que cae en el píxel (0,0): x ∈ [-64,64], y ∈ [-84,44]
const SIZE = W / S;            // 128 unidades
const FW = 128, FH = 96, FS = 4; // lienzo de la cara: x ∈ [-11,21], y ∈ [-2,22]
const SCALE = 1.15;            // escala del grupo del seta
export const LOOK_OFF = 24;    // lo que se adelanta la lámina frontal para no quedar dentro de la cúpula

const keyOf = (look) => LOOK_SLOTS.map((s) => look[s] || '').join('|');

function makeCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const tx = new THREE.CanvasTexture(cv);
  tx.colorSpace = THREE.SRGBColorSpace;
  return { cv, tx, c: cv.getContext('2d') };
}

export function createLook(plane) {
  const mk = (cv) => new THREE.MeshBasicMaterial({ map: cv.tx, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const back = makeCanvas(W, W), front = makeCanvas(W, W), face = makeCanvas(FW, FH);
  const mBack = mk(back), mFront = mk(front);
  const mFace = new THREE.MeshBasicMaterial({ map: face.tx, transparent: true, depthWrite: false, fog: false });
  const mBackM = new THREE.Mesh(plane, mBack), mFrontM = new THREE.Mesh(plane, mFront);
  mBackM.renderOrder = 3; mFrontM.renderOrder = 4;
  // la cara: una placa de 41,6 × 24 pegada al frente (+x) del seta
  const faceM = new THREE.Mesh(plane, mFace);
  faceM.scale.set(41.6, 24, 1);        // ancho (z) × alto; el plano gira 90° para mirar a +x
  faceM.rotation.y = Math.PI / 2;
  faceM.position.set(12.5, 22, 0);
  faceM.renderOrder = 4;
  const pivot = new THREE.Group();
  pivot.add(mBackM, mFrontM);
  const lk = { pivot, backM: mBackM, frontM: mFrontM, faceM, mats: [mBack, mFront, mFace], key: null, last: -9, hasFace: false };

  lk.paint = (look, T) => {
    const k = keyOf(look);
    if (k === lk.key && T - lk.last < 0.16) return;
    lk.key = k; lk.last = T;
    const p = (cv, w, h, sc, ox, oy, layers) => {
      cv.c.clearRect(0, 0, w, h);
      cv.c.save();
      cv.c.setTransform(sc, 0, 0, sc, ox * sc, oy * sc);
      for (const l of layers) drawLookLayer(cv.c, look, l, T);
      cv.c.restore();
      cv.tx.needsUpdate = true;
    };
    p(back, W, W, S, OX, OY, ['back']);
    p(front, W, W, S, OX, OY, ['suit', 'pre', 'top', 'post']);
    p(face, FW, FH, FS, 11, 2, ['face']);
    lk.hasFace = !!look.face;
    faceM.visible = lk.hasFace;
  };

  // lámina frontal por delante del seta y la de espalda por detrás, siempre mirando a la cámara
  lk.place = (px, py, pz, ang, cx, cy, cz) => {
    const dx = cx - px, dz = cz - pz;
    const dist = Math.max(1, Math.hypot(dx, dz));
    const ux = dx / dist, uz = dz / dist;
    const phi = Math.atan2(dx, dz);
    const flip = Math.cos(ang + phi) >= 0 ? 1 : -1;
    const off = Math.min(LOOK_OFF, dist * 0.35);
    const place = (m, o, y) => {
      const k = (dist - o) / dist;      // se acerca/aleja la lámina: se escala igual para que no cambie de tamaño
      m.position.set(px + ux * o, cy + (y - cy) * k, pz + uz * o); // acercar y escalar respecto a la cámara: se ve igual de grande y en el mismo sitio
      m.rotation.y = phi;
      m.scale.set(SIZE * SCALE * k * flip, SIZE * SCALE * k, 1);
    };
    const y = py + 49 * SCALE; // centro de la lámina: y 2D = -20 ↔ 3D 49
    place(mFrontM, off, y);
    place(mBackM, -off, y);
  };

  lk.setOpacity = (op) => { for (const m of lk.mats) m.opacity = op; };
  lk.dispose = () => { for (const m of lk.mats) { if (m.map) m.map.dispose(); m.dispose(); } };
  return lk;
}

export { hasLook };
