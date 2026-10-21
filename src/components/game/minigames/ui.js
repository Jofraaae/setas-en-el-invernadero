export const BTN = 'rounded-xl bg-[#e9c46a] px-4 py-2.5 font-bold text-[#261c05] transition hover:brightness-110 disabled:opacity-40';
export const BTN_ALT = 'rounded-xl bg-[#2f5a48] px-4 py-2.5 font-bold text-[#eaf5ec] transition hover:brightness-110 disabled:opacity-40';

export function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = b[i]; b[i] = b[j]; b[j] = t;
  }
  return b;
}

export function randInt(n) {
  return Math.floor(Math.random() * n);
}