import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Dumbbell,
  Flame,
  History,
  Music,
  ShoppingBag,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  buildCareerFighterProfile,
  CAREER_LEAGUES,
  getEffectiveCareerStats,
  getEnergyRecoveryBonus,
  getTrainingBonusMultiplier,
  TRAINING_DRILLS,
  UPGRADE_ITEMS,
} from '../data/fighters';
import {
  BoxerStats,
  CareerState,
  OpponentProfile,
  SongTrackMode,
  TrainingDrill,
  UpgradeCategory,
  UpgradeItem,
} from '../types/game';
import { soundEngine } from '../engine/audio';
import { BagDrillResult, GymBagMiniGame } from './GymBagMiniGame';

interface CareerHubProps {
  career: CareerState;
  muted: boolean;
  onToggleMute: () => void;
  onRunTraining: (drill: TrainingDrill) => void;
  onCompleteBagDrill: (result: BagDrillResult) => void;
  onUpdateEntranceTrack: (track: SongTrackMode) => void;
  onBuyUpgrade: (item: UpgradeItem) => void;
  onStartNextBout: (opponent: OpponentProfile) => void;
  onExitToTitle: () => void;
}

const ENTRANCE_TRACK_OPTIONS: { id: SongTrackMode; label: string }[] = [
  { id: 'sucker_for_pain', label: 'Sucker for Pain' },
  { id: 'body_pata_pata', label: 'Body Pata Pata' },
  { id: 'vendetta_rap', label: 'Vendetta Rap' },
  { id: 'auto', label: 'Auto Mix' },
  { id: 'track1', label: 'Rap 1 · Cypher' },
  { id: 'track2', label: 'Rap 2 · Trap' },
];

type CareerTab = 'training' | 'shop' | 'history';

const STAT_KEYS: { key: keyof BoxerStats; label: string }[] = [
  { key: 'power', label: 'Power' },
  { key: 'speed', label: 'Speed' },
  { key: 'defense', label: 'Defense' },
  { key: 'footwork', label: 'Footwork' },
  { key: 'stamina', label: 'Stamina' },
  { key: 'chin', label: 'Chin' },
];

const UPGRADE_CATEGORIES: { key: UpgradeCategory; label: string }[] = [
  { key: 'gloves', label: 'Fight Gloves' },
  { key: 'boots', label: 'Ring Footwear' },
  { key: 'coach', label: 'Corner Team' },
  { key: 'conditioning', label: 'Conditioning Lab' },
];

export const CareerHub: React.FC<CareerHubProps> = ({
  career,
  muted,
  onToggleMute,
  onRunTraining,
  onCompleteBagDrill,
  onUpdateEntranceTrack,
  onBuyUpgrade,
  onStartNextBout,
  onExitToTitle,
}) => {
  const [activeTab, setActiveTab] = useState<CareerTab>('training');
  const [campMessage, setCampMessage] = useState<string | null>(null);
  const [bagCampOpen, setBagCampOpen] = useState(false);

  const baseProfile = buildCareerFighterProfile(career);
  const currentLeague = CAREER_LEAGUES[career.leagueIndex] ?? CAREER_LEAGUES[0];
  const nextOpponent =
    currentLeague.opponents[career.opponentIndexInLeague] ?? currentLeague.opponents[0];
  const effectiveStats = getEffectiveCareerStats(career);
  const overallRating = Math.round(
    (effectiveStats.power +
      effectiveStats.speed +
      effectiveStats.defense +
      effectiveStats.footwork +
      effectiveStats.stamina +
      effectiveStats.chin) /
      6,
  );
  const oppOverall = Math.round(
    (nextOpponent.baseStats.power +
      nextOpponent.baseStats.speed +
      nextOpponent.baseStats.defense +
      nextOpponent.baseStats.footwork +
      nextOpponent.baseStats.stamina +
      nextOpponent.baseStats.chin) /
      6,
  );

  const coachMult = getTrainingBonusMultiplier(career);
  const recoveryBonus = getEnergyRecoveryBonus(career);

  const handleDrillClick = (drill: TrainingDrill) => {
    if (drill.energyCost > 0 && career.energy < drill.energyCost) {
      setCampMessage('Not enough camp energy. Run Active Rest & Recovery first.');
      return;
    }
    if (drill.moneyCost > career.money) {
      setCampMessage(`Insufficient funds ($${drill.moneyCost} needed for camp session).`);
      return;
    }
    soundEngine.playUiClick();
    onRunTraining(drill);
    if (drill.id === 'rest') {
      setCampMessage(`Week ${career.week + 1}: Rested and restored camp energy.`);
    } else {
      setCampMessage(`Week ${career.week + 1}: Completed ${drill.name}.`);
    }
  };

  const handleBuyClick = (item: UpgradeItem) => {
    if (career.money < item.cost) {
      setCampMessage(`Need $${(item.cost - career.money).toLocaleString()} more for ${item.name}.`);
      return;
    }
    soundEngine.playUiClick();
    onBuyUpgrade(item);
    setCampMessage(`Equipped ${item.name}. Stats permanently upgraded.`);
  };

  return (
    <div className="fixed inset-0 z-20 bg-[#090b10]/94 flex flex-col overflow-hidden">
      {/* TOP BAR (Clean 3-Zone Contract) */}
      <header className="shrink-0 flex items-center justify-between gap-6 px-5 sm:px-8 py-3.5 border-b border-white/10 bg-[#0d111a]">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onExitToTitle();
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Title</span>
          </button>
          <span className="text-white/15">|</span>
          <span className="font-display font-extrabold text-xl tracking-wide text-white whitespace-nowrap truncate">
            {career.customName}
          </span>
        </div>

        {/* Clean Unboxed Career Metadata */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-300 font-medium whitespace-nowrap">
          <span>Week {career.week}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono-tabular">
            Record {career.wins}-{career.losses} ({career.kos} KO)
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-amber-400 font-mono-tabular font-bold">
            ${career.money.toLocaleString()}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{currentLeague.name}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="p-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onStartNextBout(nextOpponent);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display font-bold text-base tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            <span>Fight Night</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 overflow-y-auto career-scroll p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN (5 cols): League Ladder + Next Bout Tale of the Tape */}
          <div className="lg:col-span-5 space-y-5">
            {/* Hall of Fame Banner if World Crown Won */}
            {career.isHallOfFame && (
              <div className="bg-amber-500/15 border border-amber-400/45 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-300 font-display font-bold text-lg tracking-wide">
                  <Award className="w-5 h-5" />
                  <span>Undisputed World Champion</span>
                </div>
                <p className="text-xs text-slate-200 mt-1">
                  You conquered every division and claimed the Undisputed World Crown. Continue defending your title or refining your legacy.
                </p>
              </div>
            )}

            {/* Championship Belt Trophy Shelf (Career Only) */}
            <section className="bg-[#101521] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <h2 className="font-display text-lg font-bold text-white tracking-wide">
                    Championship Trophy Shelf
                  </h2>
                </div>
                <span className="font-mono-tabular text-[11px] text-amber-300 font-semibold">
                  {career.beltsWon.length}/{CAREER_LEAGUES.length} Claimed
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CAREER_LEAGUES.map((lg) => {
                  const won = career.beltsWon.includes(lg.beltName);
                  return (
                    <div
                      key={lg.id}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
                        won
                          ? 'bg-amber-500/14 border-amber-400/50 text-amber-100'
                          : 'bg-black/30 border-white/8 text-slate-500'
                      }`}
                    >
                      <Award
                        className={`w-4 h-4 shrink-0 ${
                          won ? 'text-amber-400' : 'text-slate-600'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold truncate">{lg.beltName}</div>
                        <div className="text-[10px] opacity-80 truncate">
                          {won ? 'Unlocked · 3D Belt Active' : lg.tierLabel.split('·')[0].trim()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* League Division Ladder */}
            <section className="bg-[#101521] border border-white/10 rounded-xl p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                  League Progression
                </h2>
                <span className="text-xs text-slate-400 font-mono-tabular">
                  {career.beltsWon.length} / {CAREER_LEAGUES.length} Belts
                </span>
              </div>

              <div className="space-y-2.5">
                {CAREER_LEAGUES.map((lg, idx) => {
                  const isCurrent = idx === career.leagueIndex;
                  const isWon = career.beltsWon.includes(lg.beltName);
                  const isLocked = idx > career.leagueIndex && !career.isHallOfFame;

                  return (
                    <div
                      key={lg.id}
                      className={`p-3 rounded-lg border ${
                        isCurrent
                          ? 'bg-white/[0.06] border-amber-400/50'
                          : isWon
                            ? 'bg-emerald-500/[0.07] border-emerald-500/25'
                            : 'bg-black/25 border-white/8 opacity-65'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-display font-bold text-base text-white truncate">
                            {lg.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {lg.tierLabel} · {lg.rounds} Rounds · Belt: {lg.beltName}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold shrink-0 ${
                            isWon
                              ? 'text-emerald-400'
                              : isCurrent
                                ? 'text-amber-400'
                                : isLocked
                                  ? 'text-slate-500'
                                  : 'text-slate-300'
                          }`}
                        >
                          {isWon ? 'Belt Won' : isCurrent ? 'Active' : 'Locked'}
                        </span>
                      </div>

                      {isCurrent && (
                        <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2.5 border-t border-white/10">
                          {lg.opponents.map((opp, oIdx) => {
                            const defeated =
                              career.isHallOfFame || oIdx < career.opponentIndexInLeague;
                            const isNext =
                              !career.isHallOfFame && oIdx === career.opponentIndexInLeague;
                            return (
                              <div
                                key={opp.id}
                                className={`px-2 py-1.5 rounded text-[11px] border ${
                                  isNext
                                    ? 'bg-red-600/20 border-red-400/60 text-white font-semibold'
                                    : defeated
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                      : 'bg-black/30 border-white/8 text-slate-400'
                                }`}
                              >
                                <div className="truncate">
                                  #{opp.rankInLeague} {opp.name.split(' ')[1] ?? opp.name}
                                </div>
                                <div className="text-[10px] opacity-80">
                                  {defeated ? 'Cleared' : isNext ? 'Next Bout' : 'Queued'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Next Scheduled Bout Card */}
            <section className="bg-[#101521] border border-white/10 rounded-xl p-5">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-xs font-semibold text-red-400">
                    {nextOpponent.rankInLeague === 1
                      ? `Championship Bout · ${currentLeague.beltName}`
                      : `Ranked Contender #${nextOpponent.rankInLeague}`}
                  </div>
                  <h2 className="font-display text-2xl font-extrabold text-white tracking-wide">
                    {nextOpponent.name} “{nextOpponent.nickname}”
                  </h2>
                </div>
                <span className="font-mono-tabular text-sm font-bold text-slate-200">
                  OVR {oppOverall}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {nextOpponent.origin} · {nextOpponent.styleLabel} · {nextOpponent.stance} —{' '}
                {nextOpponent.bio}
              </p>

              {/* Tale of the Tape Purse */}
              <div className="grid grid-cols-3 gap-2 mb-4 py-2.5 px-3 rounded-lg bg-black/35 border border-white/8 text-xs">
                <div>
                  <div className="text-slate-400">Show Purse</div>
                  <div className="font-mono-tabular font-bold text-white mt-0.5">
                    ${nextOpponent.purse.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Win Bonus</div>
                  <div className="font-mono-tabular font-bold text-emerald-400 mt-0.5">
                    +${nextOpponent.winBonus.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">KO Bonus</div>
                  <div className="font-mono-tabular font-bold text-amber-400 mt-0.5">
                    +${nextOpponent.koBonus.toLocaleString()}
                  </div>
                </div>
              </div>

              {career.energy < 35 && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/35 text-xs text-red-200">
                  Camp Energy is low ({career.energy}%). Your starting stamina in the ring will be reduced unless you rest first.
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onStartNextBout(nextOpponent);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display font-extrabold text-xl tracking-wide transition-colors cursor-pointer"
              >
                <Swords className="w-5 h-5" />
                <span>Step Into Ring ({currentLeague.rounds} Rounds)</span>
              </button>
            </section>
          </div>

          {/* RIGHT COLUMN (7 cols): Boxer Stats + Camp Management Tabs */}
          <div className="lg:col-span-7 space-y-5">
            {/* Boxer Condition & 6 Core Stats */}
            <section className="bg-[#101521] border border-white/10 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                <div>
                  <div className="text-xs text-slate-400">
                    {baseProfile.styleLabel} · {baseProfile.stance} · {baseProfile.heightDisplay}
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white tracking-wide">
                    Boxer Attributes &amp; Camp Condition
                  </h2>
                </div>
                <div className="flex items-center gap-5 text-xs">
                  <div>
                    <span className="text-slate-400 block">Overall</span>
                    <span className="font-mono-tabular text-lg font-bold text-amber-400">
                      {overallRating}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Bankroll</span>
                    <span className="font-mono-tabular text-lg font-bold text-emerald-400">
                      ${career.money.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Energy</span>
                    <span
                      className={`font-mono-tabular text-lg font-bold ${
                        career.energy < 35 ? 'text-red-400' : 'text-sky-400'
                      }`}
                    >
                      {career.energy}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sharpness</span>
                    <span className="font-mono-tabular text-lg font-bold text-white">
                      {career.sharpness}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 6 Stat Bars comparing You vs Next Opponent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {STAT_KEYS.map(({ key, label }) => {
                  const mine = effectiveStats[key];
                  const theirs = nextOpponent.baseStats[key];
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-200">{label}</span>
                        <span className="font-mono-tabular">
                          <span className="font-bold text-white">{mine}</span>
                          <span className="text-slate-500"> vs {theirs}</span>
                        </span>
                      </div>
                      <div className="relative h-2 bg-black/55 rounded-sm overflow-hidden border border-white/8">
                        <div
                          className="h-full bg-amber-400 transition-[width] duration-200"
                          style={{ width: `${mine}%` }}
                        />
                        {/* Opponent benchmark tick */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-sky-400"
                          style={{ left: `${theirs}%` }}
                          title={`Opponent ${label}: ${theirs}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Career Custom Walkout Entrance Track */}
              <div className="mt-4 pt-3.5 border-t border-white/10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <span>Walkout Entrance Music (Career Bouts)</span>
                  </div>
                  <span className="text-[11px] text-amber-300 font-medium">
                    {ENTRANCE_TRACK_OPTIONS.find(
                      (t) => t.id === (career.entranceTrack ?? 'sucker_for_pain'),
                    )?.label ?? 'Sucker for Pain'}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {ENTRANCE_TRACK_OPTIONS.map((t) => {
                    const active = (career.entranceTrack ?? 'sucker_for_pain') === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onUpdateEntranceTrack(t.id);
                          setCampMessage(`Entrance walkout song set to ${t.label}.`);
                        }}
                        className={`py-1.5 px-2 rounded-md border text-[11px] font-semibold truncate cursor-pointer transition-colors ${
                          active
                            ? 'bg-amber-500 border-amber-300 text-slate-950 font-bold'
                            : 'bg-black/35 border-white/10 text-slate-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Tab Navigation */}
            <div className="bg-[#101521] border border-white/10 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1 p-1 bg-black/45 rounded-lg border border-white/8">
                  <button
                    type="button"
                    onClick={() => setActiveTab('training')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'training'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>Training Camp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('shop')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'shop'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Gear &amp; Upgrades</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Fight Log ({career.history.length})</span>
                  </button>
                </div>

                {campMessage && (
                  <span className="text-xs text-amber-300 font-medium">{campMessage}</span>
                )}
              </div>

              {/* TAB 1: WEEKLY TRAINING DRILLS */}
              {activeTab === 'training' && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>
                      Each session advances 1 career week. Coach Bonus:{' '}
                      <span className="text-amber-300 font-mono-tabular font-semibold">
                        +{Math.round((coachMult - 1) * 100)}%
                      </span>
                    </span>
                    <span>
                      Rest Bonus:{' '}
                      <span className="text-sky-300 font-mono-tabular font-semibold">
                        +{recoveryBonus}%
                      </span>
                    </span>
                  </div>

                  {/* Interactive Bag Camp Mini-Game (Career Only) */}
                  <div className="mb-3 p-3.5 rounded-lg bg-amber-500/10 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 font-display font-bold text-base text-amber-200">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span>Interactive Bag Camp · 14s Rhythm Drill</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Hit live Heavy Bag or Speed Bag combo cues to earn scaled Power, Speed, Footwork &amp; Sharpness gains (-18% Energy).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setBagCampOpen(true);
                      }}
                      className="shrink-0 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-sm tracking-wide transition-colors cursor-pointer"
                    >
                      OPEN BAG DRILL
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TRAINING_DRILLS.map((drill) => {
                      const isRest = drill.energyCost < 0;
                      const gains = Object.entries(drill.statGains)
                        .map(([k, v]) => `+${Math.round((v ?? 0) * coachMult)} ${k}`)
                        .join(' · ');

                      return (
                        <button
                          key={drill.id}
                          type="button"
                          onClick={() => handleDrillClick(drill)}
                          className="text-left p-4 rounded-lg bg-black/35 border border-white/10 hover:border-amber-400/55 hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="font-display font-bold text-lg text-white">
                              {drill.name}
                            </span>
                            <span className="font-mono-tabular text-xs font-semibold text-slate-300">
                              {drill.moneyCost > 0 ? `$${drill.moneyCost}` : 'Free'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-2.5">{drill.subtitle}</p>
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-white/8">
                            <span className={isRest ? 'text-sky-400 font-semibold' : 'text-amber-300 font-medium'}>
                              {isRest
                                ? `+${Math.abs(drill.energyCost) + recoveryBonus}% Energy`
                                : gains}
                            </span>
                            <span className="font-mono-tabular text-slate-400">
                              {isRest
                                ? '1 Week'
                                : `-${drill.energyCost}% Energy · +${drill.sharpnessGain}% Sharp`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: GEAR & CORNER UPGRADES */}
              {activeTab === 'shop' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {UPGRADE_CATEGORIES.map((cat) => {
                    const currentTier = career.ownedUpgrades[cat.key];
                    const nextItem = UPGRADE_ITEMS.find(
                      (u) => u.category === cat.key && u.tier === currentTier + 1,
                    );
                    const ownedItem = UPGRADE_ITEMS.find(
                      (u) => u.category === cat.key && u.tier === currentTier,
                    );

                    const bonusText = nextItem
                      ? Object.entries(nextItem.statBonuses)
                          .map(([k, v]) => `+${v} ${k}`)
                          .join(' · ')
                      : '';

                    return (
                      <div
                        key={cat.key}
                        className="p-4 rounded-lg bg-black/35 border border-white/10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span>{cat.label}</span>
                            <span className="font-mono-tabular">Tier {currentTier}/3</span>
                          </div>
                          {nextItem ? (
                            <>
                              <h3 className="font-display font-bold text-lg text-white">
                                {nextItem.name}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1 mb-2">
                                {nextItem.description}
                              </p>
                              <div className="text-xs text-amber-300 font-medium mb-3">
                                {bonusText}
                              </div>
                            </>
                          ) : (
                            <>
                              <h3 className="font-display font-bold text-lg text-emerald-400">
                                {ownedItem?.name ?? 'Maxed Out'}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1 mb-3">
                                Maximum tier equipped for this category.
                              </p>
                            </>
                          )}
                        </div>

                        {nextItem ? (
                          <button
                            type="button"
                            onClick={() => handleBuyClick(nextItem)}
                            disabled={career.money < nextItem.cost}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold font-mono-tabular transition-colors cursor-pointer ${
                              career.money >= nextItem.cost
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                            }`}
                          >
                            Upgrade · ${nextItem.cost.toLocaleString()}
                          </button>
                        ) : (
                          <div className="w-full py-2 px-3 rounded-lg text-center text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            Max Tier Equipped
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: FIGHT HISTORY LOG */}
              {activeTab === 'history' && (
                <div className="max-h-72 overflow-y-auto career-scroll">
                  {career.history.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No official bouts recorded yet. Step into the ring to begin your climb.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="py-2 pr-2 font-medium">Wk</th>
                          <th className="py-2 pr-2 font-medium">Opponent</th>
                          <th className="py-2 pr-2 font-medium">League</th>
                          <th className="py-2 pr-2 font-medium">Result</th>
                          <th className="py-2 text-right font-medium">Purse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {career.history.map((entry) => (
                          <tr key={entry.id}>
                            <td className="py-2 pr-2 font-mono-tabular text-slate-400">
                              {entry.week}
                            </td>
                            <td className="py-2 pr-2 text-white font-medium">
                              {entry.opponentName}
                            </td>
                            <td className="py-2 pr-2 text-slate-400">{entry.leagueName}</td>
                            <td className="py-2 pr-2 font-mono-tabular">
                              <span
                                className={
                                  entry.result === 'WIN'
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-red-400 font-bold'
                                }
                              >
                                {entry.result}
                              </span>{' '}
                              <span className="text-slate-400">
                                ({entry.method} R{entry.round})
                              </span>
                            </td>
                            <td className="py-2 text-right font-mono-tabular text-amber-300">
                              +${entry.purseEarned.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {bagCampOpen && (
        <GymBagMiniGame
          coachMultiplier={coachMult}
          campEnergy={career.energy}
          onCancel={() => setBagCampOpen(false)}
          onComplete={(result) => {
            setBagCampOpen(false);
            onCompleteBagDrill(result);
            setCampMessage(
              `Week ${career.week + 1}: Bag Camp (${result.hits} hits, ${result.maxCombo}x combo) complete!`,
            );
          }}
        />
      )}
    </div>
  );
};
