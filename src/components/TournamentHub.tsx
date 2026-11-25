import React, { useState } from 'react';
import { ArrowLeft, Award, Crown, RotateCcw, Swords, Trophy } from 'lucide-react';
import { PLAYABLE_FIGHTERS } from '../data/fighters';
import {
  getCurrentPlayerTournamentMatch,
  TOURNAMENT_TIERS,
} from '../data/tournament';
import { soundEngine } from '../engine/audio';
import {
  FighterProfile,
  OpponentProfile,
  TournamentMatch,
  TournamentState,
} from '../types/game';

interface TournamentHubProps {
  tournament: TournamentState | null;
  selectedFighter: FighterProfile;
  onSelectFighter: (fighter: FighterProfile) => void;
  onCreateTournament: (tierId: 'club' | 'continental' | 'world') => void;
  onResetTournament: () => void;
  onFightMatch: (opponent: OpponentProfile) => void;
  onBackToMenu: () => void;
}

const ROUND_LABELS = ['Quarterfinals', 'Semifinals', 'Championship Final'];

const MatchCard: React.FC<{
  match: TournamentMatch;
  playerId: string;
}> = ({ match, playerId }) => {
  const isPlayerMatch =
    match.fighterA?.id === playerId || match.fighterB?.id === playerId;

  const renderSlot = (slot: TournamentMatch['fighterA'], isTop: boolean) => {
    const isPlayer = slot?.id === playerId;
    const isWinner = slot && match.winnerId === slot.id;
    const isLoser = slot && match.winnerId !== null && match.winnerId !== slot.id;

    return (
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs ${
          isTop ? 'border-b border-white/10' : ''
        } ${
          isWinner
            ? 'bg-amber-500/15 text-amber-200 font-bold'
            : isLoser
              ? 'text-slate-500 line-through'
              : isPlayer
                ? 'bg-sky-500/10 text-white font-semibold'
                : 'text-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isPlayer && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          )}
          <span className="truncate">{slot ? slot.name : 'TBD'}</span>
        </div>
        {slot && (
          <span className="font-mono-tabular text-[11px] text-slate-400 shrink-0">
            {isWinner && match.method ? match.method : `OVR ${slot.overall}`}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={`rounded-lg overflow-hidden border bg-[#0d121c]/95 ${
        isPlayerMatch && match.winnerId === null
          ? 'border-amber-400/75 shadow-[0_0_20px_rgba(245,158,11,0.16)]'
          : 'border-white/12'
      }`}
    >
      {renderSlot(match.fighterA, true)}
      {renderSlot(match.fighterB, false)}
    </div>
  );
};

export const TournamentHub: React.FC<TournamentHubProps> = ({
  tournament,
  selectedFighter,
  onSelectFighter,
  onCreateTournament,
  onResetTournament,
  onFightMatch,
  onBackToMenu,
}) => {
  const [selectedTier, setSelectedTier] = useState<'club' | 'continental' | 'world'>('club');

  const activeBout = getCurrentPlayerTournamentMatch(tournament);

  return (
    <div className="fixed inset-0 z-20 bg-[#090b10]/94 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="shrink-0 flex items-center justify-between gap-4 px-4 sm:px-8 py-3 border-b border-white/10 bg-[#0d111a]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onBackToMenu();
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>
          <span className="text-white/15">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-display font-extrabold text-xl tracking-wide text-white truncate">
              {tournament ? tournament.tierName : 'Tournament Mode'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {tournament && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onResetTournament();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/14 border border-white/12 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Bracket</span>
            </button>
          )}

          {activeBout && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onFightMatch(activeBout.opponent);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display font-bold text-base tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <Swords className="w-4 h-4" />
              <span>
                Fight {ROUND_LABELS[tournament!.currentRoundIndex]}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto career-scroll p-4 sm:p-6">
        {!tournament ? (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Step 1: Select Boxer */}
            <div className="bg-[#0e131e] border border-white/12 rounded-xl p-4 sm:p-5">
              <h2 className="font-display text-2xl font-bold text-white mb-1">
                1. Choose Your Fighter
              </h2>
              <p className="text-xs text-slate-400 mb-3.5">
                Pick a contender for the 8-man single-elimination bracket.
              </p>

              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto career-scroll pr-1">
                {PLAYABLE_FIGHTERS.map((f) => {
                  const active = f.id === selectedFighter.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onSelectFighter(f);
                      }}
                      className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500/15 border-amber-400 text-white'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="font-display font-bold text-base leading-tight truncate">
                        {f.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {f.styleLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Tournament Tier */}
            <div className="bg-[#0e131e] border border-white/12 rounded-xl p-4 sm:p-5">
              <h2 className="font-display text-2xl font-bold text-white mb-1">
                2. Select Championship Cup
              </h2>
              <p className="text-xs text-slate-400 mb-3.5">
                Win 3 straight bouts to lift the trophy.
              </p>

              <div className="space-y-2 mb-4">
                {TOURNAMENT_TIERS.map((tier) => {
                  const active = tier.id === selectedTier;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setSelectedTier(tier.id);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-red-600/20 border-red-400 text-white'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="font-display font-bold text-lg leading-tight">
                        {tier.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{tier.subtitle}</div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onCreateTournament(selectedTier);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-lg tracking-wide transition-colors cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>Start 8-Fighter Tournament</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Status Banner */}
            {tournament.status === 'won' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/15 border border-amber-400/50">
                <div className="flex items-center gap-3">
                  <Crown className="w-7 h-7 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-display font-extrabold text-2xl text-white tracking-wide">
                      TOURNAMENT CHAMPION!
                    </div>
                    <p className="text-xs text-amber-200">
                      You swept the {tournament.tierName} bracket and claimed the trophy.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onResetTournament();
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer shrink-0"
                >
                  Play New Tournament
                </button>
              </div>
            )}

            {tournament.status === 'eliminated' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-red-500/15 border border-red-400/45">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-red-400 shrink-0" />
                  <div>
                    <div className="font-display font-extrabold text-xl text-white tracking-wide">
                      ELIMINATED IN {ROUND_LABELS[tournament.currentRoundIndex].toUpperCase()}
                    </div>
                    <p className="text-xs text-slate-300">
                      Step back into a fresh bracket and avenge the loss.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onResetTournament();
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display font-bold text-base cursor-pointer shrink-0"
                >
                  Start New Bracket
                </button>
              </div>
            )}

            {activeBout && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0e1420] border border-amber-400/35">
                <div className="text-xs sm:text-sm text-slate-200">
                  <span className="text-amber-400 font-bold uppercase tracking-wider mr-2">
                    Next Bout · {ROUND_LABELS[tournament.currentRoundIndex]}
                  </span>
                  <span className="font-semibold text-white">
                    vs {activeBout.opponent.name} “{activeBout.opponent.nickname}”
                  </span>
                  <span className="text-slate-400 ml-2">
                    ({tournament.roundsPerBout} Rounds)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onFightMatch(activeBout.opponent);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-display font-bold text-sm tracking-wide cursor-pointer shrink-0"
                >
                  Enter Ring Now
                </button>
              </div>
            )}

            {/* 3-Column Single-Elimination Bracket */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Quarterfinals */}
              <div className="space-y-3">
                <div className="text-xs font-bold tracking-widest text-slate-400 uppercase px-1">
                  Quarterfinals
                </div>
                {tournament.matches
                  .filter((m) => m.roundIndex === 0)
                  .map((m) => (
                    <MatchCard key={m.id} match={m} playerId={tournament.playerFighterId} />
                  ))}
              </div>

              {/* Semifinals */}
              <div className="space-y-6">
                <div className="text-xs font-bold tracking-widest text-slate-400 uppercase px-1">
                  Semifinals
                </div>
                {tournament.matches
                  .filter((m) => m.roundIndex === 1)
                  .map((m) => (
                    <MatchCard key={m.id} match={m} playerId={tournament.playerFighterId} />
                  ))}
              </div>

              {/* Championship Final */}
              <div className="space-y-3">
                <div className="text-xs font-bold tracking-widest text-amber-400 uppercase px-1 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Championship Final</span>
                </div>
                {tournament.matches
                  .filter((m) => m.roundIndex === 2)
                  .map((m) => (
                    <MatchCard key={m.id} match={m} playerId={tournament.playerFighterId} />
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
