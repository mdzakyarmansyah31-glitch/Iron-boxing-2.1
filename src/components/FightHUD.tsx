import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Crosshair,
  Grip,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shield,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AttackType,
  CameraMode,
  CombatHudSnapshot,
  GameSettings,
} from '../types/game';
import { soundEngine } from '../engine/audio';
import { SettingsPanel } from './SettingsPanel';

interface FightHUDProps {
  hud: CombatHudSnapshot;
  playerName: string;
  opponentName: string;
  opponentNickname: string;
  isCareerFight: boolean;
  isTournamentFight?: boolean;
  purseInfo?: { purse: number; winBonus: number; koBonus: number };
  paused: boolean;
  muted: boolean;
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onAnalogChange: (x: number, y: number) => void;
  onAttack: (type: AttackType) => void;
  onToggleBodyTarget: () => void;
  onClinch: () => void;
  onCornerFocus: (focus: 'stamina' | 'guard' | 'damage') => void;
  onSkipBetweenRounds: () => void;
  onDodge: () => void;
  onGuardChange: (active: boolean) => void;
  onSkipHighlight: () => void;
  onSkipWalkout?: () => void;
  onSkipCelebration?: () => void;
  onFinishExit: () => void;
  onRematch?: () => void;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

export const FightHUD: React.FC<FightHUDProps> = ({
  hud,
  playerName,
  opponentName,
  opponentNickname,
  isCareerFight,
  isTournamentFight = false,
  purseInfo,
  paused,
  muted,
  settings,
  onUpdateSettings,
  onToggleMute,
  onTogglePause,
  onAnalogChange,
  onAttack,
  onToggleBodyTarget,
  onClinch,
  onCornerFocus,
  onSkipBetweenRounds,
  onDodge,
  onGuardChange,
  onSkipHighlight,
  onSkipWalkout,
  onSkipCelebration,
  onFinishExit,
  onRematch,
}) => {
  // Virtual Analog Stick State
  const stickRef = useRef<HTMLDivElement | null>(null);
  const stickPointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [guardActive, setGuardActive] = useState(false);
  const [pauseSettingsOpen, setPauseSettingsOpen] = useState(false);

  const MAX_STICK_RADIUS = 44;

  const updateStickFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = stickRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_STICK_RADIUS) {
        dx = (dx / dist) * MAX_STICK_RADIUS;
        dy = (dy / dist) * MAX_STICK_RADIUS;
      }
      setKnobOffset({ x: dx, y: dy });
      // Screen Y is inverted relative to forward (+1 = push up into ring)
      onAnalogChange(dx / MAX_STICK_RADIUS, -dy / MAX_STICK_RADIUS);
    },
    [onAnalogChange],
  );

  const resetStick = useCallback(() => {
    stickPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onAnalogChange(0, 0);
  }, [onAnalogChange]);

  useEffect(() => {
    const onBlur = () => {
      resetStick();
      setGuardActive(false);
      onGuardChange(false);
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [resetStick, onGuardChange]);

  useEffect(() => {
    if (hud.phase === 'highlight' || hud.phase === 'walkout' || hud.phase === 'celebration') {
      resetStick();
      setGuardActive(false);
      onGuardChange(false);
    }
  }, [hud.phase, resetStick, onGuardChange]);

  useEffect(() => {
    if (!paused) {
      setPauseSettingsOpen(false);
    }
  }, [paused]);

  const playerHpPct = Math.max(0, Math.min(100, (hud.playerHp / Math.max(1, hud.playerMaxHp)) * 100));
  const playerStamPct = Math.max(0, Math.min(100, (hud.playerStamina / Math.max(1, hud.playerMaxStamina)) * 100));
  const playerGuardPct = Math.max(0, Math.min(100, (hud.playerGuard / Math.max(1, hud.playerMaxGuard)) * 100));

  const oppHpPct = Math.max(0, Math.min(100, (hud.oppHp / Math.max(1, hud.oppMaxHp)) * 100));
  const oppStamPct = Math.max(0, Math.min(100, (hud.oppStamina / Math.max(1, hud.oppMaxStamina)) * 100));
  const oppGuardPct = Math.max(0, Math.min(100, (hud.oppGuard / Math.max(1, hud.oppMaxGuard)) * 100));

  const calloutColor =
    hud.calloutTone === 'gold'
      ? 'text-amber-400'
      : hud.calloutTone === 'cyan'
        ? 'text-sky-400'
        : hud.calloutTone === 'red'
          ? 'text-red-400'
          : 'text-white';

  const earnedPreview =
    purseInfo && hud.winner
      ? purseInfo.purse +
        (hud.winner === 'player' ? purseInfo.winBonus : 0) +
        (hud.winner === 'player' && (hud.winMethod === 'KO' || hud.winMethod === 'TKO')
          ? purseInfo.koBonus
          : 0)
      : 0;

  const isHighlight = hud.phase === 'highlight';
  const isWalkout = hud.phase === 'walkout';
  const isCelebration = hud.phase === 'celebration';
  const isCinematicBarPhase = isHighlight || isWalkout || isCelebration;
  const celebrationWinnerName = hud.winner === 'player' ? playerName : opponentName;
  const highlightAttackerName =
    hud.highlightAttacker === 'player' ? playerName : opponentName;
  const highlightPunchLabel =
    hud.highlightPunch === 'uppercut'
      ? 'Uppercut'
      : hud.highlightPunch === 'hook'
        ? 'Lead Hook'
        : hud.highlightPunch === 'heavy'
          ? 'Heavy Cross'
          : 'Lead Jab';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-3">
      {/* PRE-FIGHT WALKOUT BROADCAST STRIP */}
      {isWalkout && (
        <>
          <div className="fixed top-0 inset-x-0 h-10 sm:h-12 bg-black flex items-center justify-between px-4 sm:px-6 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-display font-extrabold tracking-wider text-red-400">
                RING WALKOUT
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-300 font-medium">Red Corner & Coach</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 sm:w-28 h-1 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-[width] duration-75"
                  style={{ width: `${Math.round(hud.phaseProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 inset-x-0 h-11 sm:h-14 bg-black flex items-center justify-between px-4 sm:px-6 border-t border-white/10 pointer-events-auto">
            <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
              <span className="font-display font-bold tracking-wide text-white truncate">
                {playerName}
              </span>
              <span className="text-slate-500">vs</span>
              <span className="text-slate-300 font-medium truncate">
                {opponentName}
              </span>
            </div>

            {onSkipWalkout && (
              <button
                type="button"
                onClick={onSkipWalkout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/18 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
              >
                <span>Skip Entrance</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </>
      )}

      {/* POST-WIN VICTORY CELEBRATION BROADCAST STRIP */}
      {isCelebration && (
        <>
          <div className="fixed top-0 inset-x-0 h-10 sm:h-12 bg-black flex items-center justify-between px-4 sm:px-6 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-display font-extrabold tracking-wider text-amber-400">
                VICTORY CELEBRATION
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-300 font-medium">
                {hud.winMethod === 'KO'
                  ? 'Knockout'
                  : hud.winMethod === 'TKO'
                    ? 'Technical Knockout'
                    : 'Unanimous Decision'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 sm:w-28 h-1 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-75"
                  style={{ width: `${Math.round(hud.phaseProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 inset-x-0 h-11 sm:h-14 bg-black flex items-center justify-between px-4 sm:px-6 border-t border-white/10 pointer-events-auto">
            <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
              <span className="font-display font-bold tracking-wide text-white truncate">
                {celebrationWinnerName}
              </span>
              <span className="text-slate-400">—</span>
              <span className="text-amber-300 font-semibold whitespace-nowrap">
                Corner Celebration
              </span>
            </div>

            {onSkipCelebration && (
              <button
                type="button"
                onClick={onSkipCelebration}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <span>Official Results</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </>
      )}

      {/* CINEMATIC SLOW-MOTION KNOCKDOWN HIGHLIGHT OVERLAY */}
      {isHighlight && (
        <>
          <div className="fixed top-0 inset-x-0 h-10 sm:h-12 bg-black flex items-center justify-between px-4 sm:px-6 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="font-display font-extrabold tracking-wider text-amber-400">
                INSTANT REPLAY
              </span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="text-slate-300 font-medium">Slow Motion</span>
              {hud.highlightIsCounter && (
                <>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <span className="text-sky-400 font-semibold">Counter</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 sm:w-28 h-1 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-75"
                  style={{ width: `${Math.round(hud.highlightProgress * 100)}%` }}
                />
              </div>
              <span className="font-mono-tabular text-[11px] text-slate-400">0.2x</span>
            </div>
          </div>

          <div className="fixed bottom-0 inset-x-0 h-11 sm:h-14 bg-black flex items-center justify-between px-4 sm:px-6 border-t border-white/10 pointer-events-auto">
            <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
              <span className="font-display font-bold tracking-wide text-white truncate">
                {highlightAttackerName}
              </span>
              <span className="text-slate-400">—</span>
              <span className="text-amber-300 font-semibold whitespace-nowrap">
                {hud.highlightIsCounter ? `Counter ${highlightPunchLabel}` : highlightPunchLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={onSkipHighlight}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/18 text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              <span>Skip Replay</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {/* ULTRA-SLIM TOP BROADCAST STRIP (Non-occluding blood/health & time HUD) */}
      {!isCinematicBarPhase && (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-full flex items-center justify-between gap-2 sm:gap-3 landscape-compact-topbar">
          {/* Player Slim Health & Hairline Stamina/Guard */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1.5 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-xs bg-red-500 shrink-0" />
                <span className="font-display font-bold text-xs sm:text-sm text-white/95 truncate tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                  {playerName}
                </span>
              </div>
              <span className="font-mono-tabular text-[10px] sm:text-[11px] text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {hud.playerHp}
              </span>
            </div>

            <div className="h-1.5 sm:h-2 w-full bg-black/45 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-[width] duration-100"
                style={{ width: `${playerHpPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-1 mt-0.5">
              <div className="h-[3px] bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400/90 transition-[width] duration-75"
                  style={{ width: `${playerStamPct}%` }}
                />
              </div>
              <div className="h-[3px] bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400/90 transition-[width] duration-75"
                  style={{ width: `${playerGuardPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Slim Inline Round & Clock Strip */}
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 bg-black/45 border border-white/12 rounded-md px-2 sm:px-2.5 py-1">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-amber-400">
              R{hud.round}/{hud.maxRounds}
            </span>
            <span className="font-mono-tabular font-bold text-sm sm:text-base text-white leading-none">
              {formatClock(hud.roundTimer)}
            </span>
            <div className="flex items-center gap-0.5 pl-1 border-l border-white/12 pointer-events-auto">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className="p-0.5 text-slate-300/80 hover:text-white transition-colors cursor-pointer"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onTogglePause}
                aria-label="Pause fight"
                className="p-0.5 text-slate-300/80 hover:text-white transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Opponent Slim Health & Hairline Guard/Stamina */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1.5 mb-0.5">
              <span className="font-mono-tabular text-[10px] sm:text-[11px] text-white/80 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                {hud.oppHp}
              </span>
              <div className="flex items-center gap-1.5 min-w-0 justify-end">
                <span className="font-display font-bold text-xs sm:text-sm text-white/95 truncate tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                  {opponentName}
                </span>
                <span className="w-1.5 h-1.5 rounded-xs bg-sky-400 shrink-0" />
              </div>
            </div>

            <div className="h-1.5 sm:h-2 w-full bg-black/45 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-l from-sky-500 to-indigo-400 transition-[width] duration-100 ml-auto"
                style={{ width: `${oppHpPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-1 mt-0.5">
              <div className="h-[3px] bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400/90 transition-[width] duration-75 ml-auto"
                  style={{ width: `${oppGuardPct}%` }}
                />
              </div>
              <div className="h-[3px] bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400/90 transition-[width] duration-75 ml-auto"
                  style={{ width: `${oppStamPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Non-occluding upper-band referee 3-second countdown */}
        {hud.phase === 'intro' && hud.refereeCountdown > 0 && (
          <div className="mt-2 flex flex-col items-center">
            <div className="bg-[#090b10]/85 border border-sky-400/45 rounded-xl px-5 py-2 text-center shadow-xl">
              <div className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-sky-300 uppercase">
                REFEREE COUNTDOWN
              </div>
              <div className="font-display font-extrabold text-4xl sm:text-5xl text-amber-400 tabular-nums leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                {hud.refereeCountdown}
              </div>
            </div>
          </div>
        )}

        {/* Non-occluding upper-band callouts (never covers fighters in ring center) */}
        {hud.phase !== 'knockdown' && hud.calloutText && !(hud.phase === 'intro' && hud.refereeCountdown > 0) && (
          <div
            className={`mt-1.5 font-display font-extrabold text-lg sm:text-2xl tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] ${calloutColor}`}
          >
            {hud.calloutText}
          </div>
        )}

        {hud.isCounterWindow && hud.phase === 'fighting' && !hud.calloutText && (
          <div className="mt-1.5 font-display font-bold text-sm sm:text-base tracking-wider text-sky-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            COUNTER WINDOW
          </div>
        )}
      </div>
      )}

      {/* CENTER KNOCKDOWN COUNT ONLY (Zero occlusion during active fighting) */}
      {hud.phase === 'knockdown' && (
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="bg-[#090b10]/88 border border-red-500/50 rounded-xl px-6 py-3.5 text-center shadow-2xl">
            <div className="text-xs font-semibold tracking-widest text-red-400 mb-0.5">
              {hud.knockdownTarget === 'player' ? 'YOU ARE DOWN' : `${opponentName.toUpperCase()} IS DOWN`}
            </div>
            <div className="font-display font-extrabold text-5xl sm:text-6xl text-white tabular-nums leading-none">
              {hud.knockdownCount}
            </div>
            {hud.knockdownTarget === 'player' && (
              <div className="text-xs text-amber-300 mt-1.5 font-medium">
                Tap any punch or Dodge button to get back up
              </div>
            )}
          </div>
        </div>
      )}

      {/* BETWEEN ROUNDS CORNER STOOL / CUTMAN ADVICE */}
      {hud.phase === 'between_rounds' && !paused && (
        <div className="my-auto mx-auto w-full max-w-md pointer-events-auto">
          <div className="bg-[#0b0f17]/94 border border-amber-400/35 rounded-xl p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-display font-extrabold text-base tracking-wider text-amber-400">
                CORNER STOOL · ROUND {hud.round} COMPLETE
              </span>
              <span className="font-mono-tabular text-xs font-bold text-slate-300">
                {Math.max(1, Math.ceil(hud.betweenRoundsTimer))}s
              </span>
            </div>
            {hud.cornerAdvice && (
              <p className="text-xs text-slate-200 bg-black/40 border border-white/10 rounded-lg px-3 py-2 mb-3">
                {hud.cornerAdvice}
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                type="button"
                disabled={hud.cornerFocusUsed}
                onClick={() => onCornerFocus('stamina')}
                className="py-2 px-2 rounded-lg border border-sky-400/40 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 text-sky-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Recover Wind
              </button>
              <button
                type="button"
                disabled={hud.cornerFocusUsed}
                onClick={() => onCornerFocus('guard')}
                className="py-2 px-2 rounded-lg border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 text-amber-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Restore Guard
              </button>
              <button
                type="button"
                disabled={hud.cornerFocusUsed}
                onClick={() => onCornerFocus('damage')}
                className="py-2 px-2 rounded-lg border border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Cutman Ice
              </button>
            </div>
            <button
              type="button"
              onClick={onSkipBetweenRounds}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/10 hover:bg-white/18 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <span>Ready for Round {hud.round + 1}</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM VIRTUAL CONTROLS: ANALOG STICK (LEFT) + PUNCH / DODGE / GUARD (RIGHT) */}
      {hud.phase !== 'finished' && hud.phase !== 'between_rounds' && !isCinematicBarPhase && !paused && (
        <div className="flex items-end justify-between gap-4 w-full max-w-6xl mx-auto pb-1">
          {/* LEFT: VIRTUAL ANALOG STICK */}
          <div className="pointer-events-auto flex flex-col items-center gap-1.5 landscape-compact-hud">
            <div
              ref={stickRef}
              onPointerDown={(e) => {
                e.preventDefault();
                soundEngine.unlock();
                stickPointerId.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                updateStickFromClient(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (stickPointerId.current === e.pointerId) {
                  updateStickFromClient(e.clientX, e.clientY);
                }
              }}
              onPointerUp={(e) => {
                if (stickPointerId.current === e.pointerId) {
                  resetStick();
                }
              }}
              onPointerCancel={(e) => {
                if (stickPointerId.current === e.pointerId) {
                  resetStick();
                }
              }}
              className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#0c1018]/80 border-2 border-white/20 shadow-xl touch-none flex items-center justify-center cursor-grab active:cursor-grabbing"
              aria-label="Movement analog stick"
            >
              {/* Crosshair rings */}
              <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute w-px h-full bg-white/10 pointer-events-none" />
              <div className="absolute h-px w-full bg-white/10 pointer-events-none" />
              <span className="absolute top-1.5 text-[9px] font-semibold text-slate-400 pointer-events-none">
                IN
              </span>
              <span className="absolute bottom-1.5 text-[9px] font-semibold text-slate-400 pointer-events-none">
                OUT
              </span>

              {/* Draggable Thumb Knob */}
              <div
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-b from-slate-200 to-slate-400 border-2 border-white shadow-lg pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
                }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-300 bg-[#0b0e16]/85 px-2.5 py-0.5 rounded border border-white/10">
              Move · WASD
            </span>
          </div>

          {/* RIGHT: VIRTUAL ACTION BUTTONS (JAB, HEAVY, UPPERCUT, DODGE, GUARD) */}
          <div className="pointer-events-auto flex items-end gap-3 sm:gap-4 touch-none landscape-compact-hud-right">
            {/* Clinch + Body Aim + Guard + Dodge Tactical Stack */}
            <div className="flex items-end gap-2">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    soundEngine.unlock();
                    onClinch();
                  }}
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 shadow-lg flex flex-col items-center justify-center transition-transform cursor-pointer touch-none ${
                    hud.isClinching
                      ? 'bg-sky-600/95 border-white text-white scale-95'
                      : 'bg-[#101827]/92 border-slate-400/60 hover:border-sky-300 text-slate-100 active:scale-95'
                  }`}
                >
                  <Grip className="w-3.5 h-3.5 mb-0.5" />
                  <span className="font-display font-bold text-[10px] leading-none">CLINCH</span>
                  <span className="text-[9px] text-slate-400 font-mono-tabular">R</span>
                </button>

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    soundEngine.unlock();
                    onToggleBodyTarget();
                  }}
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 shadow-lg flex flex-col items-center justify-center transition-transform cursor-pointer touch-none ${
                    hud.bodyShotsMode === 'body'
                      ? 'bg-amber-500 border-amber-200 text-slate-950 scale-95'
                      : 'bg-[#101827]/92 border-slate-400/60 hover:border-amber-300 text-slate-100 active:scale-95'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5 mb-0.5" />
                  <span className="font-display font-bold text-[10px] leading-none">
                    {hud.bodyShotsMode === 'body' ? 'BODY' : 'HEAD'}
                  </span>
                  <span
                    className={`text-[9px] font-mono-tabular ${
                      hud.bodyShotsMode === 'body' ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    B
                  </span>
                </button>
              </div>

              {/* Guard + Dodge Defensive Pair */}
              <div className="flex flex-col items-center gap-2.5">
                {/* DODGE BUTTON */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    soundEngine.unlock();
                    onDodge();
                  }}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#0e2238]/92 active:scale-95 border-2 border-sky-400/75 hover:border-sky-300 text-sky-100 shadow-lg flex flex-col items-center justify-center transition-transform cursor-pointer touch-none"
                >
                  <span className="font-display font-extrabold text-sm sm:text-base leading-none tracking-wide">
                    DODGE
                  </span>
                  <span className="text-[10px] text-sky-300 mt-0.5 font-mono-tabular">SPC</span>
                </button>

                {/* GUARD (HOLD) BUTTON */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    soundEngine.unlock();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setGuardActive(true);
                    onGuardChange(true);
                  }}
                  onPointerUp={() => {
                    setGuardActive(false);
                    onGuardChange(false);
                  }}
                  onPointerCancel={() => {
                    setGuardActive(false);
                    onGuardChange(false);
                  }}
                  className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 shadow-lg flex flex-col items-center justify-center transition-transform cursor-pointer touch-none ${
                    guardActive || hud.isPlayerGuarding
                      ? 'bg-sky-600/95 border-white text-white scale-95'
                      : 'bg-[#111827]/92 border-slate-400/70 hover:border-white text-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4 mb-0.5" />
                  <span className="font-display font-extrabold text-sm sm:text-base leading-none tracking-wide">
                    GUARD
                  </span>
                  <span className="text-[10px] text-slate-300 mt-0.5 font-mono-tabular">HOLD · H</span>
                </button>
              </div>
            </div>

            {/* Attack Cluster: 2x2 Grid (Jab, Hook, Uppercut, Heavy) */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 items-center justify-items-center">
              {/* JAB */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  soundEngine.unlock();
                  onAttack('jab');
                }}
                className="w-15 h-15 sm:w-18 sm:h-18 rounded-full bg-[#241c0d]/92 active:scale-95 border-2 border-amber-400/80 hover:border-amber-300 text-amber-100 shadow-lg flex flex-col items-center justify-center transition-transform cursor-pointer touch-none"
              >
                <span className="font-display font-extrabold text-sm sm:text-base leading-none tracking-wide">
                  JAB
                </span>
                <span className="text-[10px] text-amber-300 mt-0.5 font-mono-tabular">J</span>
              </button>

              {/* HOOK */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  soundEngine.unlock();
                  onAttack('hook');
                }}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#0b231b]/92 active:scale-95 border-2 border-emerald-400/85 hover:border-emerald-300 text-emerald-100 shadow-lg flex flex-col items-center justify-center transition-transform cursor-pointer touch-none"
              >
                <span className="font-display font-extrabold text-sm sm:text-base leading-none tracking-wide">
                  HOOK
                </span>
                <span className="text-[10px] text-emerald-300 mt-0.5 font-mono-tabular">U</span>
              </button>

              {/* UPPERCUT */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  soundEngine.unlock();
                  onAttack('uppercut');
                }}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#2b150c]/92 active:scale-95 border-2 border-orange-500/85 hover:border-orange-300 text-orange-100 shadow-lg flex flex-col items-center justify-center transition-transform cursor-pointer touch-none"
              >
                <span className="font-display font-extrabold text-xs sm:text-sm leading-none tracking-wide">
                  UPPERCUT
                </span>
                <span className="text-[10px] text-orange-300 mt-0.5 font-mono-tabular">L</span>
              </button>

              {/* HEAVY */}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  soundEngine.unlock();
                  onAttack('heavy');
                }}
                className="w-17 h-17 sm:w-20 sm:h-20 rounded-full bg-[#330d12]/94 active:scale-95 border-2 border-red-500 hover:border-red-300 text-red-50 shadow-xl flex flex-col items-center justify-center transition-transform cursor-pointer touch-none"
              >
                <span className="font-display font-extrabold text-base sm:text-lg leading-none tracking-wide">
                  HEAVY
                </span>
                <span className="text-[10px] text-red-300 mt-0.5 font-mono-tabular">K</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {paused && hud.phase !== 'finished' && (
        <div className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto career-scroll bg-[#0f141f] border border-white/15 rounded-xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-3xl font-extrabold text-white tracking-wide">
                {pauseSettingsOpen ? 'Settings' : 'Bout Paused'}
              </h2>
              {pauseSettingsOpen && (
                <button
                  type="button"
                  onClick={() => setPauseSettingsOpen(false)}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {playerName} vs {opponentName} “{opponentNickname}”
            </p>

            {pauseSettingsOpen ? (
              <SettingsPanel
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                compact
              />
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-lg cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Fight</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    const order: CameraMode[] = ['broadcast', 'closeup', 'shoulder'];
                    const next = order[(order.indexOf(settings.cameraMode) + 1) % order.length];
                    onUpdateSettings({ cameraMode: next });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    Camera:{' '}
                    {settings.cameraMode === 'broadcast'
                      ? 'Broadcast'
                      : settings.cameraMode === 'closeup'
                        ? 'Close-Up'
                        : 'Over Shoulder'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setPauseSettingsOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>Audio & Graphics Settings</span>
                </button>
                <button
                  type="button"
                  onClick={onFinishExit}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/8 hover:bg-white/14 text-slate-200 text-sm font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>
                    {isCareerFight
                      ? 'Forfeit & Return to Gym'
                      : isTournamentFight
                        ? 'Forfeit & Return to Bracket'
                        : 'Exit to Title Screen'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POST-FIGHT RESULT MODAL */}
      {hud.phase === 'finished' && (
        <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-3 sm:p-4 pointer-events-auto">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto career-scroll bg-[#0f141f] border border-white/15 rounded-xl p-5 sm:p-6 shadow-2xl">
            <div className="text-xs font-semibold tracking-widest text-amber-400 mb-1">
              OFFICIAL DECISION · ROUND {hud.round}
            </div>
            <h2 className="font-display text-4xl font-extrabold text-white tracking-wide mb-1">
              {hud.winner === 'player' ? 'VICTORY' : 'DEFEAT'}
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              {hud.winner === 'player' ? playerName : opponentName} wins by{' '}
              {hud.winMethod === 'KO'
                ? 'Knockout (KO)'
                : hud.winMethod === 'TKO'
                  ? 'Technical Knockout (TKO)'
                  : 'Unanimous Decision'}
            </p>

            {/* CompuBox Fight Stats */}
            <div className="grid grid-cols-2 gap-2.5 bg-black/40 border border-white/10 rounded-lg p-3.5 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Landed / Thrown</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {hud.statsSummary.landed} / {hud.statsSummary.thrown}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Accuracy</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {hud.statsSummary.thrown > 0
                    ? Math.round((hud.statsSummary.landed / hud.statsSummary.thrown) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Counters / Parries</span>
                <span className="font-mono-tabular text-sky-400 font-semibold">
                  {hud.statsSummary.counters} / {hud.statsSummary.parries}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Body Shots</span>
                <span className="font-mono-tabular text-amber-300 font-semibold">
                  {hud.statsSummary.bodyShotsLanded}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dodges / Blocks</span>
                <span className="font-mono-tabular text-amber-400 font-semibold">
                  {hud.statsSummary.dodges} / {hud.statsSummary.blocks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Knockdowns</span>
                <span className="font-mono-tabular text-white font-semibold">
                  {hud.oppKnockdowns} - {hud.playerKnockdowns}
                </span>
              </div>
            </div>

            {/* 3-Judge 10-Point Must Scorecard */}
            {hud.roundScores.length > 0 && (
              <div className="bg-black/40 border border-white/10 rounded-lg p-3 mb-4">
                <div className="text-[11px] font-bold tracking-wider text-slate-300 uppercase mb-2">
                  Official Judges&apos; Scorecard
                </div>
                <div className="grid grid-cols-4 gap-1 text-[11px] font-mono-tabular text-center">
                  <div className="text-left text-slate-400">Round</div>
                  <div className="text-slate-400">Judge 1</div>
                  <div className="text-slate-400">Judge 2</div>
                  <div className="text-slate-400">Judge 3</div>
                  {hud.roundScores.map((rs) => (
                    <React.Fragment key={rs.round}>
                      <div className="text-left text-slate-300">R{rs.round}</div>
                      {rs.judges.map(([pj, oj], ji) => (
                        <div
                          key={ji}
                          className={
                            pj > oj
                              ? 'text-amber-300 font-bold'
                              : pj < oj
                                ? 'text-sky-300 font-bold'
                                : 'text-slate-200'
                          }
                        >
                          {pj}-{oj}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                  <div className="text-left text-white font-bold border-t border-white/10 pt-1 mt-1">
                    Total
                  </div>
                  {[0, 1, 2].map((ji) => {
                    const pSum = hud.roundScores.reduce((acc, r) => acc + r.judges[ji][0], 0);
                    const oSum = hud.roundScores.reduce((acc, r) => acc + r.judges[ji][1], 0);
                    return (
                      <div
                        key={ji}
                        className="text-white font-bold border-t border-white/10 pt-1 mt-1"
                      >
                        {pSum}-{oSum}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Career Purse Breakdown */}
            {isCareerFight && purseInfo && (
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3.5 mb-5">
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span>Show Purse</span>
                  <span className="font-mono-tabular">${purseInfo.purse.toLocaleString()}</span>
                </div>
                {hud.winner === 'player' && (
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>Win Bonus</span>
                    <span className="font-mono-tabular">+${purseInfo.winBonus.toLocaleString()}</span>
                  </div>
                )}
                {hud.winner === 'player' && (hud.winMethod === 'KO' || hud.winMethod === 'TKO') && (
                  <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
                    <span>Knockout Bonus</span>
                    <span className="font-mono-tabular">+${purseInfo.koBonus.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm font-bold text-amber-400 border-t border-amber-400/20 pt-2 mt-2">
                  <span>Total Fight Earnings</span>
                  <span className="font-mono-tabular text-base">
                    +${earnedPreview.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2.5">
              {!isCareerFight && !isTournamentFight && onRematch && (
                <button
                  type="button"
                  onClick={onRematch}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white font-display font-bold text-base cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rematch</span>
                </button>
              )}
              <button
                type="button"
                onClick={onFinishExit}
                className="flex-1 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-lg cursor-pointer"
              >
                {isCareerFight
                  ? 'Return to Career Hub'
                  : isTournamentFight
                    ? 'Return to Bracket'
                    : 'Back to Title'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
