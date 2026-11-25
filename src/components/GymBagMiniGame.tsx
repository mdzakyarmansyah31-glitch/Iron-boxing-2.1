import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Dumbbell, Flame, X, Zap } from 'lucide-react';
import { soundEngine } from '../engine/audio';
import { BoxerStats } from '../types/game';

export type BagDrillType = 'heavy_bag' | 'speed_bag';

export interface BagDrillResult {
  drillType: BagDrillType;
  score: number;
  maxCombo: number;
  hits: number;
  statGains: Partial<BoxerStats>;
  sharpnessGain: number;
  energyCost: number;
}

interface GymBagMiniGameProps {
  coachMultiplier: number;
  campEnergy: number;
  onComplete: (result: BagDrillResult) => void;
  onCancel: () => void;
}

type CueId = 'jab' | 'hook' | 'cross' | 'uppercut';

interface CueDef {
  id: CueId;
  label: string;
  keyHint: string;
  code: string;
  accent: string;
  heavyImpact: boolean;
}

const CUES: CueDef[] = [
  { id: 'jab', label: 'Jab', keyHint: 'J', code: 'KeyJ', accent: 'border-sky-400 text-sky-300', heavyImpact: false },
  { id: 'hook', label: 'Hook', keyHint: 'U', code: 'KeyU', accent: 'border-amber-400 text-amber-300', heavyImpact: true },
  { id: 'cross', label: 'Cross', keyHint: 'K', code: 'KeyK', accent: 'border-red-400 text-red-300', heavyImpact: true },
  { id: 'uppercut', label: 'Uppercut', keyHint: 'L', code: 'KeyL', accent: 'border-emerald-400 text-emerald-300', heavyImpact: true },
];

const DRILL_DURATION_SEC = 14;
const ENERGY_COST = 18;

function pickNextCue(prev: CueId | null): CueDef {
  const pool = prev ? CUES.filter((c) => c.id !== prev || Math.random() < 0.22) : CUES;
  return pool[Math.floor(Math.random() * pool.length)] ?? CUES[0];
}

function computeRewards(
  drillType: BagDrillType,
  score: number,
  hits: number,
  coachMultiplier: number,
): { statGains: Partial<BoxerStats>; sharpnessGain: number } {
  const tierBonus = score >= 1600 || hits >= 16 ? 2 : score >= 900 || hits >= 10 ? 1 : 0;
  const mult = Math.max(1, coachMultiplier);

  if (drillType === 'heavy_bag') {
    const powerGain = Math.max(1, Math.round((2 + tierBonus) * mult));
    const staminaGain = Math.max(1, Math.round((1 + (tierBonus >= 2 ? 1 : 0)) * mult));
    return {
      statGains: { power: powerGain, stamina: staminaGain },
      sharpnessGain: 10 + tierBonus * 3,
    };
  }

  const speedGain = Math.max(1, Math.round((2 + tierBonus) * mult));
  const footworkGain = Math.max(1, Math.round((1 + (tierBonus >= 2 ? 1 : 0)) * mult));
  return {
    statGains: { speed: speedGain, footwork: footworkGain },
    sharpnessGain: 10 + tierBonus * 3,
  };
}

export const GymBagMiniGame: React.FC<GymBagMiniGameProps> = ({
  coachMultiplier,
  campEnergy,
  onComplete,
  onCancel,
}) => {
  const [drillType, setDrillType] = useState<BagDrillType>('heavy_bag');
  const [stage, setStage] = useState<'ready' | 'active' | 'done'>('ready');
  const [timeLeft, setTimeLeft] = useState<number>(DRILL_DURATION_SEC);
  const [activeCue, setActiveCue] = useState<CueDef>(CUES[0]);
  const [cueWindowProgress, setCueWindowProgress] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [bagSwingDeg, setBagSwingDeg] = useState(0);
  const [bagFlash, setBagFlash] = useState<'none' | 'perfect' | 'good' | 'miss'>('none');
  const [feedbackText, setFeedbackText] = useState<string>('Match the cue before the ring closes');

  const cueStartRef = useRef<number>(0);
  const cueDurationRef = useRef<number>(1350);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const hitsRef = useRef(0);
  const activeCueRef = useRef<CueDef>(CUES[0]);
  const flashTimeoutRef = useRef<number | null>(null);

  const canAffordEnergy = campEnergy >= ENERGY_COST;

  const triggerFlash = useCallback((kind: 'perfect' | 'good' | 'miss', label: string) => {
    setBagFlash(kind);
    setFeedbackText(label);
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = window.setTimeout(() => {
      setBagFlash('none');
      setBagSwingDeg(0);
    }, 180);
  }, []);

  const advanceCue = useCallback((type: BagDrillType, currentCombo: number) => {
    const next = pickNextCue(activeCueRef.current.id);
    activeCueRef.current = next;
    setActiveCue(next);
    cueStartRef.current = performance.now();
    const baseMs = type === 'speed_bag' ? 1150 : 1400;
    const speedUp = Math.min(380, currentCombo * 24);
    cueDurationRef.current = Math.max(720, baseMs - speedUp);
    setCueWindowProgress(0);
  }, []);

  const startDrill = () => {
    if (!canAffordEnergy) return;
    soundEngine.unlock();
    soundEngine.playBell(1);
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    hitsRef.current = 0;
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHits(0);
    setTimeLeft(DRILL_DURATION_SEC);
    setBagFlash('none');
    setBagSwingDeg(0);
    setFeedbackText('Strike the matching punch!');
    advanceCue(drillType, 0);
    setStage('active');
  };

  const handlePunchInput = useCallback(
    (punchId: CueId) => {
      if (stage !== 'active') return;
      const now = performance.now();
      const elapsed = now - cueStartRef.current;
      const progress = Math.min(1, elapsed / Math.max(1, cueDurationRef.current));
      const target = activeCueRef.current;

      if (punchId === target.id) {
        const isPerfect = progress >= 0.35 && progress <= 0.88;
        const nextCombo = comboRef.current + 1;
        comboRef.current = nextCombo;
        if (nextCombo > maxComboRef.current) {
          maxComboRef.current = nextCombo;
          setMaxCombo(nextCombo);
        }
        setCombo(nextCombo);

        const basePts = isPerfect ? 130 : 80;
        const mult = 1 + Math.min(2.0, (nextCombo - 1) * 0.15);
        const gained = Math.round(basePts * mult);
        scoreRef.current += gained;
        setScore(scoreRef.current);

        hitsRef.current += 1;
        setHits(hitsRef.current);

        soundEngine.playBagImpact(drillType === 'heavy_bag' || target.heavyImpact);
        const dir = punchId === 'hook' || punchId === 'jab' ? 1 : -1;
        setBagSwingDeg(dir * (drillType === 'heavy_bag' ? 14 : 22));
        triggerFlash(isPerfect ? 'perfect' : 'good', isPerfect ? `CRISP! +${gained}` : `GOOD +${gained}`);
        advanceCue(drillType, nextCombo);
      } else {
        comboRef.current = 0;
        setCombo(0);
        setBagSwingDeg(0);
        triggerFlash('miss', `WRONG PUNCH — TARGET ${target.label.toUpperCase()}`);
      }
    },
    [stage, drillType, advanceCue, triggerFlash],
  );

  // Main drill timer + cue timing ring animation
  useEffect(() => {
    if (stage !== 'active') return;
    const drillStart = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const totalElapsedSec = (now - drillStart) / 1000;
      const remaining = Math.max(0, DRILL_DURATION_SEC - totalElapsedSec);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        soundEngine.playBell(2);
        setStage('done');
        return;
      }

      const cueElapsed = now - cueStartRef.current;
      const prog = Math.min(1, cueElapsed / Math.max(1, cueDurationRef.current));
      setCueWindowProgress(prog);

      if (cueElapsed >= cueDurationRef.current) {
        comboRef.current = 0;
        setCombo(0);
        triggerFlash('miss', 'TOO SLOW — NEW CUE');
        advanceCue(drillType, 0);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [stage, drillType, advanceCue, triggerFlash]);

  // Keyboard bindings (J / U / K / L)
  useEffect(() => {
    if (stage !== 'active') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const matched = CUES.find((c) => c.code === e.code);
      if (matched) {
        e.preventDefault();
        handlePunchInput(matched.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stage, handlePunchInput]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  const rewards = computeRewards(drillType, score, hits, coachMultiplier);
  const ringScale = 1.45 - cueWindowProgress * 0.55;

  return (
    <div className="fixed inset-0 z-40 bg-[#090b10]/94 flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-xl bg-[#0e131e] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 bg-[#121826]">
          <div className="flex items-center gap-2.5">
            <Dumbbell className="w-4 h-4 text-amber-400" />
            <div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-white tracking-wide">
                CAREER BAG CAMP
              </h2>
              <p className="text-[11px] text-slate-400">
                Interactive 14s drill · -{ENERGY_COST}% Camp Energy · +1 Career Week
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onCancel();
            }}
            aria-label="Close bag camp"
            className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto career-scroll p-4 sm:p-5 space-y-4">
          {stage === 'ready' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setDrillType('heavy_bag');
                  }}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    drillType === 'heavy_bag'
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : 'bg-black/35 border-white/10 text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-base">Heavy Bag Power</span>
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Explosive combinations on the leather heavy bag.
                  </p>
                  <div className="text-[11px] font-semibold text-amber-300">
                    Gains Power + Stamina + Sharpness
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setDrillType('speed_bag');
                  }}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    drillType === 'speed_bag'
                      ? 'bg-sky-500/15 border-sky-400 text-white'
                      : 'bg-black/35 border-white/10 text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-base">Speed Bag Rhythm</span>
                    <Zap className="w-4 h-4 text-sky-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Rapid-fire reflex cues for blazing hand speed.
                  </p>
                  <div className="text-[11px] font-semibold text-sky-300">
                    Gains Speed + Footwork + Sharpness
                  </div>
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-white">How to Play</div>
                <p className="text-slate-400">
                  Press <span className="text-white font-mono-tabular font-bold">J</span> (Jab),{' '}
                  <span className="text-white font-mono-tabular font-bold">U</span> (Hook),{' '}
                  <span className="text-white font-mono-tabular font-bold">K</span> (Cross), or{' '}
                  <span className="text-white font-mono-tabular font-bold">L</span> (Uppercut)—or tap
                  the punch buttons below—when the target cue lights up. Higher combos earn bonus
                  Career attribute points!
                </p>
              </div>

              {!canAffordEnergy && (
                <div className="px-3.5 py-2.5 rounded-lg bg-red-500/15 border border-red-400/40 text-xs text-red-200">
                  Not enough Camp Energy ({campEnergy}% available, {ENERGY_COST}% required). Run
                  Active Rest &amp; Recovery first.
                </div>
              )}

              <button
                type="button"
                disabled={!canAffordEnergy}
                onClick={startDrill}
                className={`w-full py-3 px-4 rounded-lg font-display font-extrabold text-lg tracking-wide transition-colors cursor-pointer ${
                  canAffordEnergy
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                }`}
              >
                START 14s {drillType === 'heavy_bag' ? 'HEAVY BAG' : 'SPEED BAG'} DRILL
              </button>
            </>
          )}

          {stage === 'active' && (
            <>
              {/* Live Scoreboard Strip */}
              <div className="grid grid-cols-3 gap-2 text-center bg-black/45 border border-white/10 rounded-lg p-2.5">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Time</div>
                  <div className="font-mono-tabular text-lg font-extrabold text-white">
                    {timeLeft.toFixed(1)}s
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Combo</div>
                  <div className="font-mono-tabular text-lg font-extrabold text-amber-400">
                    {combo}x
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Score</div>
                  <div className="font-mono-tabular text-lg font-extrabold text-emerald-400">
                    {score.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Bag Visual + Timing Cue */}
              <div className="relative h-48 sm:h-52 rounded-xl bg-[#090c14] border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                {/* Bag SVG */}
                <div
                  className="transition-transform duration-100 origin-top flex flex-col items-center"
                  style={{ transform: `rotate(${bagSwingDeg}deg)` }}
                >
                  <div className="w-0.5 h-5 bg-slate-500" />
                  {drillType === 'heavy_bag' ? (
                    <div
                      className={`w-16 h-28 rounded-2xl border-2 flex flex-col items-center justify-center transition-colors ${
                        bagFlash === 'perfect'
                          ? 'bg-amber-500/35 border-amber-300'
                          : bagFlash === 'good'
                            ? 'bg-emerald-500/30 border-emerald-400'
                            : bagFlash === 'miss'
                              ? 'bg-red-600/30 border-red-400'
                              : 'bg-zinc-900 border-zinc-600'
                      }`}
                    >
                      <div className="w-full h-3 bg-amber-500/70 mb-4" />
                      <div className="w-full h-2 bg-white/15" />
                    </div>
                  ) : (
                    <div
                      className={`w-12 h-16 rounded-full border-2 flex items-center justify-center transition-colors ${
                        bagFlash === 'perfect'
                          ? 'bg-sky-500/35 border-sky-300'
                          : bagFlash === 'good'
                            ? 'bg-emerald-500/30 border-emerald-400'
                            : bagFlash === 'miss'
                              ? 'bg-red-600/30 border-red-400'
                              : 'bg-red-950 border-red-700'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white/15" />
                    </div>
                  )}
                </div>

                {/* Shrinking Cue Target Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`w-24 h-24 rounded-full border-2 ${activeCue.accent} opacity-75`}
                    style={{ transform: `scale(${ringScale.toFixed(3)})` }}
                  />
                </div>

                <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-xs">
                  <span className="font-display font-extrabold text-sm tracking-wide text-white bg-black/75 px-2.5 py-1 rounded border border-white/15">
                    HIT: {activeCue.label.toUpperCase()} [{activeCue.keyHint}]
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded bg-black/75 ${
                      bagFlash === 'perfect'
                        ? 'text-amber-300'
                        : bagFlash === 'good'
                          ? 'text-emerald-300'
                          : bagFlash === 'miss'
                            ? 'text-red-300'
                            : 'text-slate-300'
                    }`}
                  >
                    {feedbackText}
                  </span>
                </div>
              </div>

              {/* 4 Interactive Punch Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {CUES.map((cue) => {
                  const isTarget = cue.id === activeCue.id;
                  return (
                    <button
                      key={cue.id}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        handlePunchInput(cue.id);
                      }}
                      className={`py-3 px-2 rounded-lg border text-center transition-transform active:scale-95 cursor-pointer select-none ${
                        isTarget
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-white/[0.04] border-white/12 text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="font-mono-tabular text-[11px] text-slate-400">
                        [{cue.keyHint}]
                      </div>
                      <div className="font-display font-extrabold text-sm sm:text-base">
                        {cue.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {stage === 'done' && (
            <div className="space-y-4">
              <div className="text-center p-4 rounded-xl bg-black/45 border border-amber-400/35">
                <Award className="w-8 h-8 text-amber-400 mx-auto mb-1.5" />
                <div className="font-display font-extrabold text-2xl text-white">
                  SESSION COMPLETE
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {drillType === 'heavy_bag' ? 'Heavy Bag Power Drill' : 'Speed Bag Rhythm Drill'}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
                  <div>
                    <div className="text-[10px] text-slate-400">Final Score</div>
                    <div className="font-mono-tabular text-lg font-bold text-amber-300">
                      {score.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Hits Landed</div>
                    <div className="font-mono-tabular text-lg font-bold text-white">{hits}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Max Combo</div>
                    <div className="font-mono-tabular text-lg font-bold text-emerald-400">
                      {maxCombo}x
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
                <div className="text-xs font-semibold text-emerald-300 mb-1.5">
                  Earned Career Progression
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-mono-tabular text-white">
                  {Object.entries(rewards.statGains).map(([k, v]) => (
                    <span key={k} className="uppercase">
                      +{v} {k}
                    </span>
                  ))}
                  <span className="text-sky-300">+{rewards.sharpnessGain}% Sharpness</span>
                  <span className="text-slate-400">-{ENERGY_COST}% Energy</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onCancel();
                  }}
                  className="py-2.5 px-3 rounded-lg bg-white/8 hover:bg-white/14 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onComplete({
                      drillType,
                      score,
                      maxCombo,
                      hits,
                      statGains: rewards.statGains,
                      sharpnessGain: rewards.sharpnessGain,
                      energyCost: ENERGY_COST,
                    });
                  }}
                  className="py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-base tracking-wide cursor-pointer"
                >
                  CLAIM GAINS (+1 WK)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
