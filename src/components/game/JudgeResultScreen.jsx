import { useEffect, useState } from 'react';
import MiniShroom from './MiniShroom';
import { tr } from '@/lib/i18n';

const S1_MS = 3200; // "El Juez ha hablado"
const S2_MS = 5200; // sobre la pantalla del veredicto: sale volando quien paga la sentencia

// Resultado de una reunión en la que el Juez gastó su sentencia. Primero habla el Juez y
// después se anuncia el veredicto, sin decir a quién ha señalado. Dos segundos más tarde, en
// esa misma pantalla, sale volando quien paga la sentencia (el elegido si era impostor; el
// propio Juez si se equivocó) y mientras se va se lee si era impostor o no.
export default function JudgeResultScreen({ result }) {
  const { judge, ejected } = result;
  const [stage, setStage] = useState(1);
  const [fly, setFly] = useState(false);
  useEffect(() => {
    const t2 = setTimeout(() => setStage(2), S1_MS);
    const t3 = setTimeout(() => setFly(true), S2_MS);
    return () => { clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      className="end-fade absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      {stage === 1 ? (
        <div className="end-title flex flex-col items-center gap-4 text-center">
          <div className="text-xs uppercase tracking-[0.35em] text-[#9bb8a6]">{tr('Sentencia del Juez')}</div>
          <MiniShroom color={judge.judgeColor} size={92} />
          <h1 className="text-[clamp(28px,6vw,54px)] font-black text-[#e9c46a]">{tr('El Juez ha hablado')}</h1>
          <p className="max-w-[460px] text-[#cfe3d5]">{tr('La decisión del Juez pesa más que todos los demás votos.')}</p>
        </div>
      ) : null}

      {stage === 2 ? (
        <div className="end-title flex flex-col items-center gap-4 text-center">
          <h1 className="text-[clamp(28px,6vw,54px)] font-black text-[#e9c46a]">{tr('El veredicto es…')}</h1>

          {fly ? (
            <>
              <div className="flex h-[140px] w-full items-center justify-center overflow-hidden">
                <div style={{ animation: 'eject 3.4s ease-in forwards' }}>
                  <MiniShroom color={ejected.color} size={90} />
                </div>
              </div>
              <div className="end-row flex flex-col items-center gap-2">
                <h2 className="text-2xl font-extrabold text-[#eaf5ec] md:text-3xl">{tr('Han expulsado a {name}', { name: ejected.name })}</h2>
                <p className={`text-xl font-extrabold ${ejected.wasImpostor ? 'text-[#ff7b86]' : 'text-[#80ed99]'}`}>
                  {ejected.wasImpostor ? tr('{name} era el IMPOSTOR', { name: ejected.name }) : tr('{name} NO era un impostor', { name: ejected.name })}
                </p>
                {!judge.success ? (
                  <p className="max-w-[520px] font-bold text-[#ff7b86]">
                    {tr('El Juez se equivocó: la sentencia cae sobre quien la dictó y se va él.')}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}