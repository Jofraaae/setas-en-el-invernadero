import { useEffect, useRef, useState } from 'react';
import MiniShroom from '@/components/game/MiniShroom';
import { sfx } from '@/lib/game/sound';

const SECONDS = 5;
const FALLBACK_MS = 5600; // el servidor avisa con 'go'; esto es solo una red de seguridad

export default function RoleScreen({ role, color, name, mates = [], taskCount = 0, shifter = false, viper = false, engineer = false, alerter = false, judge = false, angel = false, scientist = false, spectre = false, detective = false, tracker = false, trackerMs = 40, trackerCd = 30, onDone }) {
  const [left, setLeft] = useState(SECONDS);
  const fired = useRef(false);

  useEffect(() => {
    const end = Date.now() + SECONDS * 1000;
    const iv = setInterval(() => {
      const s = Math.max(0, (end - Date.now()) / 1000);
      setLeft(s);
    }, 100);
    const to = setTimeout(() => {
      if (!fired.current) { fired.current = true; onDone(); }
    }, FALLBACK_MS);
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [onDone]);

  const isImp = role === 'impostor';

  // cada rol tiene su propio acorde de presentación
  useEffect(() => {
    sfx(isImp ? 'roleImp' : 'roleCrew');
  }, [isImp]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_38%,#17392d,#0a1410_72%)] px-6 text-center">
      <div className="text-xs uppercase tracking-[0.35em] text-[#9bb8a6]">Tu rol es</div>
      <MiniShroom color={color || '#4cc9f0'} size={104} />
      <h1 className="text-[clamp(34px,7vw,64px)] font-black leading-none" style={{ color: isImp ? '#ff7b86' : '#80ed99' }}>
        {isImp ? 'IMPOSTOR' : 'TRIPULANTE'}
      </h1>
      {name ? <div className="text-sm font-bold text-[#eaf5ec]">{name}</div> : null}
      <p className="max-w-[520px] text-[15px] leading-relaxed text-[#cfe3d5]">
        {isImp
          ? 'Elimina sin que te descubran y muévete por las rejillas.'
          : `Completa tus ${taskCount} tareas y descubre al impostor.`}
      </p>
      {isImp ? (
        <div className="rounded-xl border border-[#9d4edd] bg-[rgba(60,20,90,.45)] px-4 py-2 text-sm text-[#e7d6ff]">
          {mates.length ? `Tu cómplice: ${mates.join(', ')}` : 'Estás solo: elimina con cuidado.'}
        </div>
      ) : null}
      {shifter ? (
        <div className="rounded-xl border border-[#3a0ca3] bg-[rgba(35,15,90,.5)] px-4 py-2 text-sm text-[#e7d6ff]">
          <b>Cambiaformas:</b> imita a un jugador vivo unos segundos; al volver, quedas congelado.
        </div>
      ) : null}
      {viper ? (
        <div className="rounded-xl border border-[#38d95e] bg-[rgba(15,70,30,.5)] px-4 py-2 text-sm text-[#c9ffd6]">
          <b>Víbora:</b> tus cuerpos echan veneno y se deshacen: nadie puede reportarlos.
        </div>
      ) : null}
      {spectre ? (
        <div className="rounded-xl border border-[#2b0a3a] bg-[rgba(40,10,60,.5)] px-4 py-2 text-sm text-[#d7c4ff]">
          <b>Espectro:</b> invisible 10 s; mientras dura no puedes matar ni usar rejillas.
        </div>
      ) : null}
      {engineer ? (
        <div className="rounded-xl border border-[#9d4edd] bg-[rgba(60,20,90,.4)] px-4 py-2 text-sm text-[#e7d6ff]">
          <b>Ingeniero:</b> rejillas, 15 s como máximo; después, espera para volver a entrar.
        </div>
      ) : null}
      {alerter ? (
        <div className="rounded-xl border border-[#ff3b3b] bg-[rgba(120,20,30,.4)] px-4 py-2 text-sm text-[#ffd9db]">
          <b>Alertador:</b> al caer, todos ven una flecha que señala tu cuerpo.
        </div>
      ) : null}
      {judge ? (
        <div className="rounded-xl border border-[#b8860b] bg-[rgba(90,60,5,.4)] px-4 py-2 text-sm text-[#ffe3a3]">
          <b>Juez:</b> 1 sentencia por partida; si fallas, te expulsan a ti.
        </div>
      ) : null}
      {angel ? (
        <div className="rounded-xl border border-[#3aa0b8] bg-[rgba(20,70,85,.45)] px-4 py-2 text-sm text-[#cdf3ff]">
          <b>Ángel Guardián:</b> ya muerto, escuda con [T] al tripulante de al lado: aguanta una muerte.
        </div>
      ) : null}
      {scientist ? (
        <div className="rounded-xl border border-[#3aa0b8] bg-[rgba(20,70,85,.4)] px-4 py-2 text-sm text-[#cdf3ff]">
          <b>Científico:</b> con [H] ves quién sigue vivo: 25 s de batería y 10 s entre usos.
        </div>
      ) : null}
      {tracker ? (
        <div className="rounded-xl border border-[#4361ee] bg-[rgba(20,40,90,.5)] px-4 py-2 text-sm text-[#cdf3ff]">
          <b>Localizador:</b> con [L] marcas a quien tengas al lado y lo ves en el mapa {trackerMs} s; después, {trackerCd} s de espera.
        </div>
      ) : null}
      {detective ? (
        <div className="rounded-xl border border-[#2a9d8f] bg-[rgba(15,70,65,.45)] px-4 py-2 text-sm text-[#cdf3ff]">
          <b>Detective:</b> con las misiones hechas, interroga a quien tengas al lado: su rol se sabrá en la próxima reunión.
        </div>
      ) : null}
      <div className="mt-3 w-[230px]">
        <div className="mb-2 text-sm font-bold text-[#80ed99]">
          La partida empieza en {Math.ceil(left)}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#0f211a]">
          <div className="h-full bg-[#80ed99] transition-[width] duration-100" style={{ width: `${(left / SECONDS) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}