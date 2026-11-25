import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  Shuffle,
  Swords,
  X,
} from 'lucide-react';
import { PLAYABLE_FIGHTERS } from '../data/fighters';
import { soundEngine } from '../engine/audio';
import { FighterProfile } from '../types/game';
import { FighterPortrait } from './FighterPortrait';

interface FreeFightSelectProps {
  leftFighter: FighterProfile;
  rightFighter: FighterProfile;
  rounds: number;
  onSelectLeft: (fighter: FighterProfile) => void;
  onSelectRight: (fighter: FighterProfile) => void;
  onChangeRounds: (rounds: number) => void;
  onSwapCorners: () => void;
  onParallaxChange?: (nx: number, ny: number) => void;
  onStartFight: () => void;
  onBack: () => void;
}


export const FreeFightSelect: React.FC<FreeFightSelectProps> = ({
  leftFighter,
  rightFighter,
  rounds,
  onSelectLeft,
  onSelectRight,
  onChangeRounds,
  onSwapCorners,
  onParallaxChange,
  onStartFight,
  onBack,
}) => {
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [parallax, setParallax] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return () => {
      onParallaxChange?.(0, 0);
    };
  }, [onParallaxChange]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotionRef.current || showStatsModal) return;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const nx = Math.max(-1, Math.min(1, (e.clientX / w - 0.5) * 2));
    const ny = Math.max(-1, Math.min(1, (e.clientY / h - 0.5) * 2));
    setParallax({ x: nx, y: ny });
    onParallaxChange?.(nx, ny);
  };

  const handlePointerLeave = () => {
    setParallax({ x: 0, y: 0 });
    onParallaxChange?.(0, 0);
  };


  const handleRandomize = () => {
    soundEngine.playUiClick();
    const a = PLAYABLE_FIGHTERS[Math.floor(Math.random() * PLAYABLE_FIGHTERS.length)];
    let b = PLAYABLE_FIGHTERS[Math.floor(Math.random() * PLAYABLE_FIGHTERS.length)];
    if (PLAYABLE_FIGHTERS.length > 1 && b.id === a.id) {
      b =
        PLAYABLE_FIGHTERS[
          (PLAYABLE_FIGHTERS.findIndex((f) => f.id === a.id) + 1) % PLAYABLE_FIGHTERS.length
        ];
    }
    onSelectLeft(a);
    onSelectRight(b);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-auto select-none overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 76% 66% at 50% 42%, transparent 38%, rgba(5, 7, 13, 0.28) 78%, rgba(4, 6, 11, 0.78) 100%)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Compact Top-Left FREE FIGHT Mark */}
      <div className="flex items-center px-3 sm:px-6 pt-2 sm:pt-3 pointer-events-none shrink-0">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070a12]/72 backdrop-blur-xs border border-white/12">
          <div className="w-1 h-3 sm:h-3.5 bg-red-600 rounded-xs" />
          <span className="font-display font-black text-xs sm:text-sm tracking-widest text-white leading-none">
            FREE FIGHT
          </span>
        </div>
      </div>

      {/* Unobstructed 3D Walkout Tunnel Stage — 3D boxers stand directly in front of their 3D info boards */}
      <div className="flex-1 min-h-0 pointer-events-none" />

      {/* Bottom Dual 20-Fighter Portrait Grids + VS Crest + Footer Bar */}
      <div className="pointer-events-auto max-h-[60vh] sm:max-h-none overflow-y-auto bg-[#060911]/86 backdrop-blur-md border-t border-white/14 shadow-[0_-22px_50px_rgba(0,0,0,0.82)] px-3 sm:px-6 pt-2 pb-2.5 sm:pb-3 shrink-0">
        <div className="max-w-7xl mx-auto">
          {/* Controls Bar Above Fighter Roster: Menu + Rounds */}
          <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onBack();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-[11px] sm:text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Menu</span>
            </button>

            <span className="hidden md:inline text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
              Heavyweight · {rounds} Rounds
            </span>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0d111a]/95 border border-white/15">
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                Rounds
              </span>
              {[1, 3, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onChangeRounds(r);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] sm:text-xs font-display font-bold tracking-wider transition-colors cursor-pointer ${
                    rounds === r
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {r}R
                </button>
              ))}
            </div>
          </div>

          {/* Labels Row */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 mb-1.5">
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-slate-400">
              <span className="text-red-400">ALL FIGHTERS (20)</span>
              <span className="hidden sm:inline">SELECT YOUR BOXER</span>
            </div>
            <div className="w-8 sm:w-12" />
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-slate-400">
              <span className="hidden sm:inline">SELECT CPU OPPONENT</span>
              <span className="text-sky-400 ml-auto">ALL FIGHTERS (20)</span>
            </div>
          </div>

          {/* Dual 10x2 Portrait Grids flanking VS Crest in 3D Perspective */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-5">
            {/* LEFT 20-FIGHTER GRID */}
            <div
              className="grid grid-cols-10 gap-0.5 sm:gap-1.5 transition-transform duration-150 ease-out"
              style={{
                transform: `perspective(950px) rotateY(${(4.5 - parallax.x * 2.5).toFixed(2)}deg) rotateX(${(2 - parallax.y * 1.5).toFixed(2)}deg)`,
              }}
            >
              {PLAYABLE_FIGHTERS.map((f) => {
                const selected = f.id === leftFighter.id;
                return (
                  <button
                    key={`L-${f.id}`}
                    type="button"
                    title={`${f.name} — ${f.styleLabel}`}
                    onClick={() => {
                      soundEngine.playUiClick();
                      onSelectLeft(f);
                    }}
                    className={`relative group h-8 sm:h-auto sm:aspect-square rounded-xs sm:rounded-sm overflow-hidden border transition-all duration-150 cursor-pointer ${
                      selected
                        ? 'border-2 border-red-400 ring-2 ring-red-500/55 scale-110 -translate-y-1 z-20 shadow-[0_12px_26px_rgba(239,68,68,0.5)] opacity-100'
                        : 'border-white/15 hover:border-white/60 opacity-80 hover:opacity-100 hover:-translate-y-0.5 hover:scale-105 hover:z-10 shadow-inner hover:shadow-[0_8px_18px_rgba(0,0,0,0.85)]'
                    }`}
                  >
                    <FighterPortrait
                      skinColor={f.appearance.skinColor}
                      hairStyle={f.appearance.hairStyle}
                      hairColor={f.appearance.hairColor}
                      beardStyle={f.appearance.beardStyle}
                      trunksColor={f.appearance.trunksColor}
                      className="w-full h-full block"
                    />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/45 via-transparent to-white/10" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 px-0.5 py-[1px] text-[7px] sm:text-[8px] leading-none font-bold text-white truncate text-center">
                      {f.name.split(' ')[1] ?? f.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CENTER VS CREST */}
            <div
              className="flex flex-col items-center justify-center px-0.5 sm:px-1 transition-transform duration-150 ease-out"
              style={{
                transform: `perspective(700px) translate3d(${(-parallax.x * 6).toFixed(1)}px, ${(-parallax.y * 4).toFixed(1)}px, 24px)`,
              }}
            >
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-red-600 via-amber-500 to-sky-600 p-[2px] shadow-[0_10px_28px_rgba(239,68,68,0.5)]">
                <div className="w-full h-full rounded-full bg-[#090d16] flex items-center justify-center shadow-inner">
                  <span className="font-display font-black italic text-xs sm:text-xl text-white tracking-tighter">
                    VS
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT 20-FIGHTER GRID */}
            <div
              className="grid grid-cols-10 gap-0.5 sm:gap-1.5 transition-transform duration-150 ease-out"
              style={{
                transform: `perspective(950px) rotateY(${(-4.5 - parallax.x * 2.5).toFixed(2)}deg) rotateX(${(2 - parallax.y * 1.5).toFixed(2)}deg)`,
              }}
            >
              {PLAYABLE_FIGHTERS.map((f) => {
                const selected = f.id === rightFighter.id;
                return (
                  <button
                    key={`R-${f.id}`}
                    type="button"
                    title={`${f.name} — ${f.styleLabel}`}
                    onClick={() => {
                      soundEngine.playUiClick();
                      onSelectRight(f);
                    }}
                    className={`relative group h-8 sm:h-auto sm:aspect-square rounded-xs sm:rounded-sm overflow-hidden border transition-all duration-150 cursor-pointer ${
                      selected
                        ? 'border-2 border-sky-400 ring-2 ring-sky-400/55 scale-110 -translate-y-1 z-20 shadow-[0_12px_26px_rgba(56,189,248,0.5)] opacity-100'
                        : 'border-white/15 hover:border-white/60 opacity-80 hover:opacity-100 hover:-translate-y-0.5 hover:scale-105 hover:z-10 shadow-inner hover:shadow-[0_8px_18px_rgba(0,0,0,0.85)]'
                    }`}
                  >
                    <FighterPortrait
                      skinColor={f.appearance.skinColor}
                      hairStyle={f.appearance.hairStyle}
                      hairColor={f.appearance.hairColor}
                      beardStyle={f.appearance.beardStyle}
                      trunksColor={f.appearance.trunksColor}
                      className="w-full h-full block"
                    />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/45 via-transparent to-white/10" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 px-0.5 py-[1px] text-[7px] sm:text-[8px] leading-none font-bold text-white truncate text-center">
                      {f.name.split(' ')[1] ?? f.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/10">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onSwapCorners();
                }}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-[11px] sm:text-xs font-semibold text-slate-200 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Change Corner</span>
                <span className="sm:hidden">Swap</span>
              </button>

              <button
                type="button"
                onClick={handleRandomize}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-[11px] sm:text-xs font-semibold text-slate-200 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 text-sky-400" />
                <span>Random</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setShowStatsModal(true);
                }}
                className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/12 text-[11px] sm:text-xs font-semibold text-slate-200 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stats</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onStartFight();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 sm:px-6 sm:py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display font-black text-sm sm:text-xl tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.45)] transition-colors cursor-pointer shrink-0"
            >
              <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>FIGHT NOW</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tale of the Tape Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-lg bg-[#0d121c] border border-white/15 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-display font-extrabold text-2xl text-white tracking-wide">
                TALE OF THE TAPE
              </h3>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 text-center text-xs font-bold pb-2 border-b border-white/10 mb-3">
              <div className="text-red-400 truncate">{leftFighter.name}</div>
              <div className="text-slate-500">ATTRIBUTE</div>
              <div className="text-sky-400 truncate">{rightFighter.name}</div>
            </div>

            <div className="space-y-2 text-xs">
              {(
                [
                  ['Height', leftFighter.heightDisplay, rightFighter.heightDisplay],
                  ['Weight', leftFighter.weightDisplay, rightFighter.weightDisplay],
                  ['Reach', leftFighter.reachDisplay, rightFighter.reachDisplay],
                  ['Stance', leftFighter.stance, rightFighter.stance],
                ] as const
              ).map(([label, lv, rv]) => (
                <div key={label} className="grid grid-cols-3 text-center py-1 bg-white/[0.02] rounded">
                  <span className="text-white font-semibold">{lv}</span>
                  <span className="text-slate-400">{label}</span>
                  <span className="text-white font-semibold">{rv}</span>
                </div>
              ))}

              {(
                [
                  ['Power', leftFighter.baseStats.power, rightFighter.baseStats.power],
                  ['Speed', leftFighter.baseStats.speed, rightFighter.baseStats.speed],
                  ['Defense', leftFighter.baseStats.defense, rightFighter.baseStats.defense],
                  ['Footwork', leftFighter.baseStats.footwork, rightFighter.baseStats.footwork],
                  ['Stamina', leftFighter.baseStats.stamina, rightFighter.baseStats.stamina],
                  ['Chin', leftFighter.baseStats.chin, rightFighter.baseStats.chin],
                ] as const
              ).map(([label, lv, rv]) => (
                <div key={label} className="grid grid-cols-3 items-center text-center py-0.5 font-mono-tabular">
                  <span className={lv >= rv ? 'text-red-300 font-bold' : 'text-slate-400'}>{lv}</span>
                  <span className="font-sans text-slate-400">{label}</span>
                  <span className={rv >= lv ? 'text-sky-300 font-bold' : 'text-slate-400'}>{rv}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
                                     
