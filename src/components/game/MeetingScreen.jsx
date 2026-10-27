import { useEffect, useRef, useState } from 'react';
import MiniShroom from './MiniShroom';
import { sfx } from '@/lib/game/sound';
import { tr } from '@/lib/i18n';

const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-2.5 font-bold text-[#261c05] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-2.5 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';

export default function MeetingScreen({ data, myId, alive, role, mates, roster, chat, gone, interro, judge, judgeUsed, onVote, onSkip, onJudge, onChat }) {
  const [sel, setSel] = useState(null);
  const [voted, setVoted] = useState(!!data.voted?.has(myId));
  const [text, setText] = useState('');
  // Sentencia gastada EN ESTA reunión (judgeUsed es de toda la partida: el Juez puede volver
  // a votar normal en las rondas siguientes, lo que ya no puede es volver a sentenciar).
  const [jUsed, setJUsed] = useState(false);
  // Dos fases: deliberación (nadie vota) y votación (los vivos votan una vez).
  const [voting, setVoting] = useState(!!data.voting);
  const endRef = useRef(Date.now() + (data.voting ? data.voteMs : data.discussMs));
  const [left, setLeft] = useState(Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000)));

  useEffect(() => {
    const iv = setInterval(() => setLeft(Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))), 250);
    return () => clearInterval(iv);
  }, []);

  // el servidor avisa cuando termina la deliberación
  useEffect(() => {
    if (!data.voting || voting) return;
    setVoting(true);
    endRef.current = Date.now() + data.voteMs;
    setLeft(Math.max(0, Math.ceil(data.voteMs / 1000)));
  }, [data.voting, data.voteMs, voting]);

  const caller = roster.get(data.callerId) || { name: tr('Alguien') };
  const title = data.reason === 'body'
    ? tr('🚨 {name} ha encontrado a {body}', { name: caller.name, body: data.bodyName })
    : tr('📣 {name} ha pulsado el botón de emergencia', { name: caller.name });
  const players = data.players.filter((p) => !gone.has(p.id));
  const votable = alive && voting && !voted;
  const canVote = votable && !!sel;

  const send = () => {
    if (!canVote) return;
    sfx('vote');
    onVote(sel);
    setVoted(true);
  };
  const skip = () => {
    if (!votable) return;
    sfx('blip');
    onSkip();
    setVoted(true);
  };

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center gap-2.5 overflow-auto p-4"
      style={{ background: 'radial-gradient(circle at 50% 30%, #1d3a2d, #09130e 70%)' }}
    >
      <div className="text-center text-[clamp(18px,3vw,26px)] font-extrabold text-[#eaf5ec]">{title}</div>

      {interro ? (
        <div className="w-full max-w-[980px] rounded-xl border-2 border-[#2a9d8f] bg-[rgba(42,157,143,.2)] px-4 py-2 text-center">
          <div className="text-[11px] font-black uppercase tracking-[2px] text-[#7fd8ca]">
            {tr('Informe del Detective · solo tú lo ves')}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center justify-center gap-2 text-sm text-[#eaf5ec]">
            <i className="inline-block h-3 w-3 rounded-full" style={{ background: interro.color }} />
            <b>{interro.name}</b>
            <span className={interro.impostor ? 'font-bold text-[#ff7b86]' : 'font-bold text-[#80ed99]'}>
              {interro.role}
            </span>
          </div>
        </div>
      ) : null}

      <div
        className={`rounded-full px-4 py-1.5 text-sm font-extrabold ${
          voting ? 'bg-[#e9c46a] text-[#261c05]' : 'bg-[#2f5a48] text-[#eaf5ec]'
        }`}
      >
        {voting ? tr('Votación abierta · {s}s', { s: left }) : tr('Deliberación · la votación empieza en {s}s', { s: left })}
      </div>

      <div className="grid min-h-0 w-full max-w-[980px] flex-1 grid-cols-1 gap-3 md:grid-cols-2">
        <div className="grid content-start gap-2 overflow-auto [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
          {players.map((p) => {
            const isMate = role === 'impostor' && mates.includes(p.id);
            const dead = !p.alive;
            const did = data.voted.has(p.id);
            const clickable = votable && !dead && p.id !== myId;
            return (
              <div
                key={p.id}
                onClick={() => { if (!clickable) return; sfx('click'); setSel(p.id); }}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl border-[3px] bg-[#234036] p-2 text-center text-sm transition ${
                  sel === p.id ? 'border-[#e9c46a]' : 'border-transparent'
                } ${dead ? 'cursor-default opacity-40' : clickable ? 'cursor-pointer hover:brightness-110' : ''}`}
              >
                <span
                  className={`absolute right-1.5 top-1 text-[11px] font-bold ${
                    dead ? 'text-[#7d8f84]' : did ? 'text-[#80ed99]' : 'text-[#9bb8a6]'
                  }`}
                >
                  {dead ? tr('✖ no vota') : did ? tr('✔ votó') : tr('… esperando')}
                </span>
                <MiniShroom color={p.color} size={46} dead={dead} />
                <div className={isMate ? 'font-bold text-[#ff7b86]' : ''}>
                  {p.name}
                  {p.id === myId ? '\u00a0' + tr('(tú)') : ''}
                </div>
                {sel === p.id ? <div className="text-[11px] font-bold text-[#e9c46a]">{tr('tu voto')}</div> : null}
              </div>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-col gap-2 rounded-xl bg-[#1a3027] p-2.5">
          <div className="flex flex-1 select-text flex-col gap-1 overflow-auto text-sm">
            {chat.map((m, i) => (
              <div key={i} className={m.dead ? 'text-[#c9b8ff]' : ''}>
                <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: m.color }} />
                <b>{m.dead ? `👻 ${m.name}` : m.name}:</b> {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="w-full select-text rounded-xl border-2 border-[#2f5a48] bg-[#0f211a] px-3 py-2 text-[#eaf5ec] outline-none focus:border-[#e9c46a] disabled:opacity-50"
              maxLength={140}
              placeholder={alive ? tr('Escribe un mensaje…') : tr('Habla solo con los fantasmas…')}
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && text.trim()) { onChat(text.trim()); setText(''); }
              }}
            />
            <button
              className={`${BTN} shrink-0`}
              onClick={() => { if (text.trim()) { onChat(text.trim()); setText(''); } }}
            >
              {tr('Enviar')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {alive ? (
          <>
            {judge && jUsed ? null : (
              <>
                <button className={BTN} disabled={!canVote} onClick={send}>{tr('Confirmar voto')}</button>
                <button className={BTN_ALT} disabled={!votable} onClick={skip}>{tr('Saltar voto')}</button>
              </>
            )}
            {judge && !judgeUsed && !jUsed && voting && sel && !voted ? (
              <button
                className="rounded-xl bg-[#7b3f00] px-4 py-2.5 font-bold text-[#ffe3a3] transition hover:brightness-110"
                onClick={() => { if (!sel) return; sfx('vote'); onJudge(sel); setJUsed(true); }}
              >
                {tr('⚖ Juzgar (1 uso)')}
              </button>
            ) : null}
          </>
        ) : null}
        <span className="max-w-[440px] text-center text-[#9bb8a6]">
          {!alive
            ? tr('Eres un fantasma: no votas, y tu chat solo lo ven los demás muertos.')
            : judge && jUsed
              ? tr('Has usado tu sentencia en esta ronda. Tu decisión decide la expulsión.')
              : voted
                ? tr('Voto enviado. Esperando al resto…')
                : voting
                  ? judgeUsed
                    ? tr('Tu sentencia ya está gastada: en esta ronda votas como uno más.')
                    : tr('Elige a un jugador o salta el voto.')
                  : tr('En la deliberación nadie puede votar todavía.')}
        </span>
      </div>
    </div>
  );
}