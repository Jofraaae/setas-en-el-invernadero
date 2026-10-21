import { useMemo, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { shuffle } from './ui';

const W = 4;
const H = 3;
const ROW = 1;                     // el agua entra y sale por la fila del medio
const SRC = ROW * W;               // celda de la entrada, a la izquierda
const SNK = ROW * W + (W - 1);     // celda de la salida, a la derecha
const BASE = { straight: [1, 0, 1, 0], elbow: [0, 1, 1, 0], tee: [1, 1, 1, 0] };
const DECOYS = ['straight', 'elbow', 'tee'];

// [N, E, S, W]: girar la pieza cuarto de vuelta mueve cada boca a la siguiente
const spin = (m) => [m[3], m[0], m[1], m[2]];
function maskOf(t) {
  let m = [...BASE[t.shape]];
  for (let i = 0; i < t.rot; i++) m = spin(m);
  return m;
}

// Camino simple desde la entrada hasta la salida: define la conducción a reparar.
function buildPath() {
  const goal = SNK;
  const path = [SRC];
  const seen = new Set(path);
  const walk = () => {
    const cur = path[path.length - 1];
    if (cur === goal) return path.length >= 4;
    const x = cur % W;
    const y = (cur - x) / W;
    const opts = shuffle([[0, -1], [1, 0], [0, 1], [-1, 0]])
      .map(([dx, dy]) => [x + dx, y + dy])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < W && ny < H && !seen.has(ny * W + nx));
    for (const [nx, ny] of opts) {
      const n = ny * W + nx;
      path.push(n);
      seen.add(n);
      if (walk()) return true;
      path.pop();
      seen.delete(n);
    }
    return false;
  };
  return walk() ? path : null;
}

// Boca que hay que abrir en la pieza que mira de `a` hacia `b`.
function sideTo(a, b) {
  const ax = a % W, ay = (a - ax) / W, bx = b % W, by = (b - bx) / W;
  if (bx > ax) return 1;
  if (bx < ax) return 3;
  return by < ay ? 0 : 2;
}

function solvedRot(shape, want) {
  for (let r = 0; r < 4; r++) {
    const m = maskOf({ shape, rot: r });
    if (m.every((v, i) => v === want[i])) return r;
  }
  return 0;
}

// El agua recorre solo las piezas cuyas bocas encajan entre sí.
function flow(board) {
  const open = board.map(maskOf);
  const seen = new Set();
  const src = SRC;
  if (!open[src][3]) return seen; // la entrada está cerrada: no entra nada
  const q = [src];
  seen.add(src);
  while (q.length) {
    const cur = q.pop();
    const x = cur % W;
    const y = (cur - x) / W;
    for (const [dx, dy, mine, yours] of [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]]) {
      if (!open[cur][mine]) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (seen.has(n) || !open[n][yours]) continue;
      seen.add(n);
      q.push(n);
    }
  }
  return seen;
}

const reached = (board) => {
  const snk = SNK;
  return flow(board).has(snk) && maskOf(board[snk])[1];
};

function makeBoard() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const path = buildPath();
    if (!path) continue;
    const want = Array.from({ length: W * H }, () => [0, 0, 0, 0]);
    path.forEach((cell, i) => {
      if (i > 0) want[cell][sideTo(cell, path[i - 1])] = 1;
      if (i < path.length - 1) want[cell][sideTo(cell, path[i + 1])] = 1;
    });
    // entrada y salida: el agua llega por la izquierda y se va por la derecha
    want[path[0]][3] = 1;
    want[path[path.length - 1]][1] = 1;
    const board = [];
    for (let i = 0; i < W * H; i++) {
      const w = want[i];
      const on = w[0] + w[1] + w[2] + w[3] > 0;
      if (!on) {
        board.push({ shape: DECOYS[Math.floor(Math.random() * DECOYS.length)], rot: Math.floor(Math.random() * 4) });
        continue;
      }
      const shape = w[0] === w[2] && w[1] === w[3] ? 'straight' : 'elbow';
      // se desordena siempre: ninguna pieza empieza en su sitio
      board.push({ shape, rot: (solvedRot(shape, w) + 1 + Math.floor(Math.random() * 3)) % 4 });
    }
    if (!reached(board)) return board;
  }
  return null;
}

export default function Pipe({ onFinish }) {
  const [board, setBoard] = useState(makeBoard);
  const [turns, setTurns] = useState(0);
  const done = useRef(false);
  const wet = useMemo(() => (board ? flow(board) : new Set()), [board]);
  if (!board) return <p className="text-sm text-[#9bb8a6]">Vuelve a abrir la misión.</p>;

  const turn = (i) => {
    if (done.current) return;
    const next = board.map((t, j) => (j === i ? { ...t, rot: (t.rot + 1) % 4 } : t));
    sfx('click');
    setTurns((n) => n + 1);
    if (reached(next)) { done.current = true; setBoard(next); onFinish(); return; }
    setBoard(next);
  };

  const arm = (i, j) => {
    if (!maskOf(board[i])[j]) return null;
    const col = wet.has(i) ? '#4cc9f0' : '#6f7a89';
    const box = [
      'left-1/2 top-0 h-1/2 w-[9px] -translate-x-1/2',
      'right-0 top-1/2 h-[9px] w-1/2 -translate-y-1/2',
      'left-1/2 bottom-0 h-1/2 w-[9px] -translate-x-1/2',
      'left-0 top-1/2 h-[9px] w-1/2 -translate-y-1/2',
    ][j];
    return <span className={`absolute ${box}`} style={{ background: col }} />;
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Gira las piezas hasta llevar el agua de la entrada a la salida.</p>
      <div className="flex items-center gap-2">
        <span className="h-[9px] w-4 rounded-full bg-[#6f7a89]" />
        <div className="grid grid-cols-4 gap-1.5">
          {board.map((t, i) => (
            <button
              key={i}
              onClick={() => turn(i)}
              className="relative h-[58px] w-[58px] rounded-md bg-[#0f211a] ring-2 ring-[#2f5a48] transition hover:brightness-125"
            >
              {[0, 1, 2, 3].map((j) => arm(i, j))}
              <span
                className="absolute left-1/2 top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: wet.has(i) ? '#4cc9f0' : '#6f7a89' }}
              />
            </button>
          ))}
        </div>
        <span className="h-[9px] w-4 rounded-full bg-[#80ed99]" />
      </div>
      <p className="text-xs text-[#9bb8a6]">
        Agua en {wet.size} de {W * H} piezas · giros: {turns}
      </p>
    </>
  );
}