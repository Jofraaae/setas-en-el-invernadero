import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

const COLS = ['#e63946', '#4cc9f0', '#80ed99', '#e9c46a'];

export default function Memory({ onFinish }) {
  const seq = useRef(Array.from({ length: 6 }, () => Math.floor(Math.random() * 4)));
  const [lit, setLit] = useState(-1);
  const [step, setStep] = useState(0);
  const [watch, setWatch] = useState(true);
  const [bad, setBad] = useState(0);
  const done = useRef(false);
  const timers = useRef([]);

  const play = () => {
    setWatch(true);
    setStep(0);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    seq.current.forEach((c, i) => {
      timers.current.push(setTimeout(() => setLit(c), 500 + i * 640));
      timers.current.push(setTimeout(() => setLit(-1), 500 + i * 640 + 380));
    });
    timers.current.push(setTimeout(() => setWatch(false), 560 + seq.current.length * 640));
  };

  useEffect(() => {
    play();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const tap = (i) => {
    if (watch || done.current) return;
    if (seq.current[step] === i) {
      const n = step + 1;
      setStep(n);
      sfx('blip');
      if (n === seq.current.length) { done.current = true; onFinish(); }
    } else {
      setBad((b) => b + 1);
      sfx('miss');
      play();
    }
  };

  return (
    <>
      <p className="text-sm text-[#9bb8a6]">
        {watch ? tr('Memoriza la secuencia de luces…') : tr('Repite la secuencia.')}
      </p>
      <div key={bad} className={`grid grid-cols-2 gap-3 ${bad ? 'animate-[shake_.25s]' : ''}`}>
        {COLS.map((c, i) => (
          <button
            key={c}
            onClick={() => tap(i)}
            className="h-[64px] w-[84px] rounded-xl transition"
            style={{ background: c, opacity: lit === i ? 1 : 0.35, boxShadow: lit === i ? '0 0 18px rgba(255,255,255,.6)' : 'none' }}
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        {seq.current.map((_, i) => (
          <span key={i} className={`h-2 w-6 rounded-full ${i < step ? 'bg-[#80ed99]' : 'bg-[#2f5a48]'}`} />
        ))}
      </div>
    </>
  );
}