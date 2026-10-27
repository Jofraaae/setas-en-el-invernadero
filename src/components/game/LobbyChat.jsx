import { useEffect, useRef, useState } from 'react';
import { tr } from '@/lib/i18n';

const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-3 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const INPUT = 'w-full select-text rounded-xl border-2 border-[#2f5a48] bg-[#0f211a] px-3 py-3 text-[#eaf5ec] outline-none transition focus:border-[#e9c46a]';

export default function LobbyChat({ chat, myId, onSend }) {
  const [text, setText] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  return (
    <div className="w-full max-w-[640px] rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-4">
      <p className="text-center text-[13px] text-[#9bb8a6]">{tr('Chat de la sala')}</p>
      <div ref={boxRef} className="mt-2 h-[150px] overflow-y-auto rounded-xl bg-[#0f211a] p-2.5 text-sm">
        {chat.length === 0 ? (
          <p className="text-[#6f8a7b]">{tr('Aún no hay mensajes. Saluda a los demás setas.')}</p>
        ) : (
          chat.map((m, i) => (
            <div key={i} className="mb-1 leading-snug">
              <b style={{ color: m.color }}>{m.name}{m.id === myId ? '\u00a0' + tr('(tú)') : ''}:</b>{' '}
              <span className="text-[#eaf5ec]">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className={INPUT}
          maxLength={140}
          placeholder={tr('Escribe un mensaje…')}
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
        />
        <button className={`${BTN_ALT} shrink-0`} onClick={send} disabled={!text.trim()}>{tr('Enviar')}</button>
      </div>
    </div>
  );
}