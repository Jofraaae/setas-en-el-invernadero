/* Desarrollo: levanta el servidor de juego (:8787) y Vite (:5173) a la vez.
   Funciona igual en Windows, Mac y Linux, y al cerrar (Ctrl+C) para los dos procesos:
   el antiguo `npm run server & vite` dejaba el servidor huérfano ocupando el puerto. */

import { spawn } from 'node:child_process';

const children = [];
let closing = false;

function run(name, cmd, args) {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  children.push(child);
  child.on('exit', (code) => {
    if (closing) return;
    console.error(`\n[${name}] terminó (código ${code}). Parando todo.`);
    stop(code || 1);
  });
  child.on('error', (e) => {
    console.error(`[${name}] no se pudo arrancar:`, e.message);
    stop(1);
  });
}

function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const c of children) { try { c.kill(); } catch (e) { /* ya cerrado */ } }
  setTimeout(() => process.exit(code), 200);
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

run('servidor', process.execPath, ['server/index.js']);
run('vite', 'npx', ['vite']);
