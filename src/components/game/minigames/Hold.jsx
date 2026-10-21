import { useEffect, useRef, useState } from 'react';
import { clamp } from '@/lib/game/grid';
import { sfx } from '@/lib/game/sound';
import { BTN } from './ui';

export default function Hold({ onFinish }) {
  const [v, setV] = useState(0);
  const val = useRef(0);
  const held = useRef(false);
  const done = useRef(false);
  useEffect(() => {
    const iv = setInterval(() => {
      if (done.current) return;
      val.current = clamp(val.current + (held.current ? 0.008 : -0.012), 0, 1);
      setV(val.current);
      if (val.current >= 1) { done.current = true; onFinish(); }
    }, 30);
    return () => clearInterval(iv);
  }, [onFinish]);
  return (
    <>
      <p className="text-sm text-[#9bb8a6]">Mantén pulsado hasta llenar el medidor.</p>
      <div className="h-5 w-full overflow-hidden rounded-[10px] bg-[#0f211a]">
        <div className="h-full bg-[#80ed99]" style={{ width: `${v * 100}%` }} />
      </div>
      <button
        className={`${BTN} w-full select-none py-7 text-xl`}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => { sfx('click'); held.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerUp={() => { held.current = false; }}
        onPointerCancel={() => { held.current = false; }}
      >
        MANTÉN PULSADO
      </button>
    </>
  );
}