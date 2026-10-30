import { sfx } from '@/lib/game/sound';
import { BTN_ALT } from './minigames/ui';
import Seq from './minigames/Seq';
import Hold from './minigames/Hold';
import Match from './minigames/Match';
import Order from './minigames/Order';
import Code from './minigames/Code';
import Timing from './minigames/Timing';
import Memory from './minigames/Memory';
import Spots from './minigames/Spots';
import Switches from './minigames/Switches';
import Type from './minigames/Type';
import Route from './minigames/Route';
import Slider from './minigames/Slider';
import Harvest from './minigames/Harvest';
import Pipe from './minigames/Pipe';
import Sort from './minigames/Sort';
import Dose from './minigames/Dose';
import Sonar from './minigames/Sonar';
import Valves from './minigames/Valves';
import Catch from './minigames/Catch';
import Brew from './minigames/Brew';
import Sprout from './minigames/Sprout';
import Count from './minigames/Count';
import Scramble from './minigames/Scramble';
import { tr } from '@/lib/i18n';
import { useCompact } from '@/lib/useCompact';

const GAMES = {
  seq: Seq,
  hold: Hold,
  match: Match,
  order: Order,
  code: Code,
  timing: Timing,
  memory: Memory,
  spots: Spots,
  switch: Switches,
  type: Type,
  route: Route,
  slider: Slider,
  harvest: Harvest,
  pipe: Pipe,
  sort: Sort,
  dose: Dose,
  sonar: Sonar,
  valves: Valves,
  catch: Catch,
  // minijuegos propios de la aldea de Micelaria
  brew: Brew,
  sprout: Sprout,
  count: Count,
  scramble: Scramble,
};

export default function MiniGame({ task, onFinish, onCancel }) {
  const Game = GAMES[task.game] || Seq;
  const { compact } = useCompact();
  // en una pantalla baja (móvil apaisado) el recuadro se reduce para que quepa entero
  const zoom = compact && typeof window !== 'undefined' ? Math.max(0.62, Math.min(1, window.innerHeight / 580)) : 1;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-auto bg-black/60 p-2 sm:p-4">
      <div style={zoom < 1 ? { zoom } : undefined} className="flex w-full max-w-[420px] flex-col items-center gap-3.5 rounded-2xl border-2 border-[#2f5a48] bg-[#1a3027] p-5 max-[600px]:gap-2 max-[600px]:p-3">
        <h3 className="text-lg font-extrabold text-[#eaf5ec]">{tr(task.name)}</h3>
        <Game onFinish={() => { sfx('miniDone'); onFinish(); }} />
        <button className={BTN_ALT} onClick={() => { sfx('back'); onCancel(); }}>{tr('Cancelar')}</button>
      </div>
    </div>
  );
}