import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Settings,
  Trophy,
  UserPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CAREER_LEAGUES, PLAYABLE_FIGHTERS } from '../data/fighters';
import { soundEngine } from '../engine/audio';
import {
  CareerState,
  FighterProfile,
  GameSettings,
  OpponentProfile,
  TournamentState,
} from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';
import { SettingsPanel } from './SettingsPanel';

type MenuView = 'root' | 'career' | 'exhibition' | 'settings';

interface TitleScreenProps {
  selectedFighter: FighterProfile;
  waitingFighterName?: string;
  onSelectFighter: (fighter: FighterProfile) => void;
  onPreviewOpponent?: (opponent: OpponentProfile) => void;
  savedCareer: CareerState | null;
  savedTournament: TournamentState | null;
  onConfirmMenuAction: (action: () => void) => void;
  onOpenFreeFight: () => void;
  onOpenCareerCreator: () => void;
  onContinueCareer: () => void;
  onStartExhibition: (opponent: OpponentProfile) => void;
  onOpenTournament: () => void;
  settings: GameSettings;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
}

const ALL_OPPONENTS: OpponentProfile[] = CAREER_LEAGUES.flatMap((l) => l.opponents);

interface RootMenuItem {
  id: string;
  label: string;
  description: string;
  tier: 'featured' | 'primary' | 'secondary';
  action: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedFighter,
  waitingFighterName,
  onSelectFighter,
  onPreviewOpponent,
  savedCareer,
  savedTournament,
  onConfirmMenuAction,
  onOpenFreeFight,
  onOpenCareerCreator,
  onContinueCareer,
  onStartExhibition,
  onOpenTournament,
  settings,
  onUpdateSettings,
}) => {
  const [view, setView] = useState<MenuView>('root');
  const [selectedOpp, setSelectedOpp] = useState<OpponentProfile>(ALL_OPPONENTS[2]);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const rootItems = useMemo<RootMenuItem[]>(
    () => [
      {
        id: 'freefight',
        label: 'FREE FIGHT',
        description:
          'Choose from 20 fighters, set custom rounds, and enter the ring.',
        tier: 'featured',
        action: () => {
          onOpenFreeFight();
        },
      },
      {
        id: 'career',
        label: 'CAREER',
        description: savedCareer
          ? `Continue ${savedCareer.customName} · Week ${savedCareer.week} (${savedCareer.wins}-${savedCareer.losses})`
          : 'Create your boxer, train weekly, and win the world title.',
        tier: 'primary',
        action: () => {
          if (savedCareer) {
            setView('career');
          } else {
            onOpenCareerCreator();
          }
        },
      },
      {
        id: 'exhibition',
        label: 'EXHIBITION',
        description: 'Tale of the Tape championship bouts against top contenders.',
        tier: 'primary',
        action: () => {
          setView('exhibition');
        },
      },
      {
        id: 'tournament',
        label: 'TOURNAMENT',
        description:
          savedTournament && savedTournament.status === 'active'
            ? `Resume ${savedTournament.tierName} elimination bracket`
            : 'Compete in an 8-fighter knockout cup bracket.',
        tier: 'primary',
        action: () => {
          onOpenTournament();
        },
      },
      {
        id: 'create_fighter',
        label: 'CREATE FIGHTER',
        description: 'Customize stance, build, appearance, and starting stats.',
        tier: 'secondary',
        action: () => {
          onOpenCareerCreator();
        },
      },
      {
        id: 'settings',
        label: 'SETTINGS',
        description: `Graphics: ${settings.graphicsQuality} · Soundtrack: ${settings.songVolume}%`,
        tier: 'secondary',
        action: () => {
          setView('settings');
        },
      },
    ],
    [
      onOpenFreeFight,
      onOpenCareerCreator,
      onOpenTournament,
      savedCareer,
      savedTournament,
      settings.graphicsQuality,
      settings.songVolume,
    ],
  );

  const triggerConfirmedItem = (item: RootMenuItem) => {
    if (isConfirming) return;
    soundEngine.unlock();
    soundEngine.playUiClick();
    setIsConfirming(true);
    onConfirmMenuAction(() => {
      setIsConfirming(false);
      setArmedIndex(null);
      item.action();
    });
  };

  const handleMenuButtonClick = (idx: number, item: RootMenuItem) => {
    if (isConfirming) return;
    soundEngine.unlock();
    if (armedIndex !== idx) {
      soundEngine.playUiClick();
      setArmedIndex(idx);
      return;
    }
    triggerConfirmedItem(item);
  };

  useEffect(() => {
    if (view !== 'root') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isConfirming) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        soundEngine.playUiClick();
        setArmedIndex((prev) => (prev === null ? 0 : (prev + 1) % rootItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        soundEngine.playUiClick();
        setArmedIndex((prev) =>
          prev === null
            ? rootItems.length - 1
            : (prev - 1 + rootItems.length) % rootItems.length,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (armedIndex === null) {
          soundEngine.unlock();
          soundEngine.playUiClick();
          setArmedIndex(0);
        } else {
          const item = rootItems[armedIndex];
          if (item) {
            triggerConfirmedItem(item);
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleOppSelect = (opp: OpponentProfile) => {
    soundEngine.playUiClick();
    setSelectedOpp(opp);
    onPreviewOpponent?.(opp);
  };

  const featuredItem = rootItems[0];
  const primaryItems = rootItems.slice(1, 4);
  const secondaryItems = rootItems.slice(4);
  const activeItem = armedIndex !== null ? rootItems[armedIndex] : null;
  const oppRounds = CAREER_LEAGUES[selectedOpp.leagueId]?.rounds ?? 3;
  const displayFighterName = waitingFighterName ?? selectedFighter.name;

  return (
    <div
      className={`fixed inset-0 z-20 flex flex-col justify-between px-4 py-2.5 sm:px-8 sm:py-5 lg:px-14 lg:py-7 pointer-events-none overflow-hidden transition-opacity duration-200 ${
        isConfirming ? 'opacity-25' : 'opacity-100'
      }`}
      style={{
        background:
          'linear-gradient(90deg, rgba(6,8,13,0.92) 0%, rgba(6,8,13,0.68) 32%, rgba(6,8,13,0.10) 60%, rgba(6,8,13,0.22) 100%)',
      }}
    >
      {/* Top-Right Compact Utility Controls Only (No Title in Menu) */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        <div className="pointer-events-auto flex items-center gap-2">
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              onUpdateSettings({ muted: !settings.muted });
            }}
            aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded bg-[#0c1018]/90 border border-white/15 text-slate-200 hover:text-white hover:border-white/30 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {settings.muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
            <span>{settings.muted ? 'Muted' : `${settings.songVolume}%`}</span>
          </button>
        </div>
      </div>

      {/* Left-Aligned Broadcast Menu (Right side open for Waiting Room Boxer) */}
      <div className="my-auto flex items-center min-h-0">
        {view === 'root' ? (
          <nav
            aria-label="Main Menu"
            className="pointer-events-auto w-full max-w-[290px] sm:max-w-[350px] lg:max-w-[385px] flex flex-col"
          >
            {/* Featured Primary Item (Fixed crimson brush banner, zero layout shift) */}
            <div className="mb-1.5 sm:mb-3">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => handleMenuButtonClick(0, featuredItem)}
                className="group relative w-full text-left cursor-pointer focus:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={`absolute -left-3 sm:-left-4 inset-y-0 w-[calc(100%+12px)] pointer-events-none transition-opacity duration-150 ${
                    armedIndex === 0 ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
                  }`}
                  style={{
                    background:
                      'linear-gradient(90deg, #e11d48 0%, #be123c 72%, rgba(190,18,60,0) 100%)',
                    clipPath:
                      'polygon(0 6%, 95% 0%, 98% 28%, 92% 52%, 99% 78%, 91% 100%, 0 94%)',
                  }}
                />
                <div className="relative z-10 px-2 py-1 sm:py-1.5 lg:py-2 flex items-center justify-between gap-2">
                  <span
                    className={`block font-display italic font-black text-xl sm:text-3xl lg:text-[34px] uppercase leading-none tracking-wide text-white transition-transform duration-150 ${
                      armedIndex === 0 ? 'translate-x-1' : 'group-hover:translate-x-1'
                    }`}
                  >
                    {featuredItem.label}
                  </span>
                  {armedIndex === 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-black/55 border border-amber-300/60 text-amber-200 text-[9px] font-bold tracking-widest uppercase">
                      Tap Again
                    </span>
                  )}
                </div>
              </button>
              <p className="hidden sm:block mt-1 pl-1 text-[11px] sm:text-xs text-slate-300 leading-snug">
                {featuredItem.description}
              </p>
            </div>

            {/* Primary Modes (Clean uniform stack, fits mobile landscape cleanly) */}
            <div className="flex flex-col space-y-0.5 sm:space-y-1">
              {primaryItems.map((item, offsetIdx) => {
                const idx = offsetIdx + 1;
                const isArmed = idx === armedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isConfirming}
                    onClick={() => handleMenuButtonClick(idx, item)}
                    className="group relative w-full text-left px-2 py-1 sm:py-1.5 cursor-pointer focus:outline-none flex items-center justify-between gap-2"
                  >
                    {isArmed && (
                      <span
                        aria-hidden="true"
                        className="absolute -left-3 inset-y-0 w-[calc(100%+8px)] pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(225,29,72,0.65) 0%, rgba(225,29,72,0.22) 68%, transparent 100%)',
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 block font-display italic font-extrabold text-lg sm:text-2xl lg:text-[28px] uppercase leading-none tracking-wide transition-all duration-150 ${
                        isArmed
                          ? 'text-white translate-x-1.5'
                          : 'text-slate-100/90 group-hover:text-white group-hover:translate-x-1.5'
                      }`}
                    >
                      {item.label}
                    </span>
                    {isArmed && (
                      <span className="relative z-10 shrink-0 px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/55 text-amber-300 text-[9px] font-bold tracking-widest uppercase">
                        Tap Again
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Secondary Utilities (Clean compact stack) */}
            <div className="mt-1.5 pt-1.5 sm:mt-2.5 sm:pt-2.5 border-t border-white/10 flex flex-col space-y-0.5 sm:space-y-1">
              {secondaryItems.map((item, offsetIdx) => {
                const idx = offsetIdx + 4;
                const isArmed = idx === armedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isConfirming}
                    onClick={() => handleMenuButtonClick(idx, item)}
                    className="group relative w-full text-left px-2 py-0.5 sm:py-1 cursor-pointer focus:outline-none flex items-center justify-between gap-2"
                  >
                    {isArmed && (
                      <span
                        aria-hidden="true"
                        className="absolute -left-3 inset-y-0 w-[calc(100%+8px)] pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(225,29,72,0.52) 0%, rgba(225,29,72,0.16) 68%, transparent 100%)',
                        }}
                      />
                    )}
                    <span
                      className={`relative z-10 block font-display font-bold text-sm sm:text-base lg:text-lg uppercase leading-none tracking-wider transition-all duration-150 ${
                        isArmed
                          ? 'text-white translate-x-1.5'
                          : 'text-slate-300 group-hover:text-white group-hover:translate-x-1.5'
                      }`}
                    >
                      {item.label}
                    </span>
                    {isArmed && (
                      <span className="relative z-10 shrink-0 px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/55 text-amber-300 text-[9px] font-bold tracking-widest uppercase">
                        Tap Again
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Fixed-Height Contextual Caption */}
            <div className="mt-1.5 sm:mt-2.5 min-h-[1.5rem] sm:min-h-[2rem] pl-1 flex items-start text-[10px] sm:text-xs text-slate-300/95 leading-snug">
              <span className="text-rose-400 mr-1.5 font-bold shrink-0">▸</span>
              <span>
                {activeItem
                  ? `${activeItem.description} (Tap again to enter)`
                  : 'Select an option once, then tap again to confirm.'}
              </span>
            </div>
          </nav>
        ) : (
          <div className="pointer-events-auto w-full max-w-sm sm:max-w-md max-h-[calc(100vh-115px)] overflow-y-auto career-scroll bg-[#0a0d15]/94 border border-white/15 rounded-lg p-3.5 sm:p-5 shadow-2xl">
            {/* CAREER MODE SUB-PANEL */}
            {view === 'career' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setArmedIndex(null);
                      setView('root');
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="font-display italic text-xl font-extrabold text-white tracking-wide uppercase">
                    Career Mode
                  </h2>
                </div>

                {savedCareer && (
                  <div className="p-3.5 rounded bg-black/45 border border-amber-400/35 space-y-2.5">
                    <div>
                      <div className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider">
                        Active Career Save
                      </div>
                      <div className="font-display font-extrabold text-xl text-white">
                        {savedCareer.customName}
                        {savedCareer.customNickname
                          ? ` “${savedCareer.customNickname}”`
                          : ''}
                      </div>
                      <div className="text-xs text-slate-400 tabular-nums">
                        Week {savedCareer.week} · Record {savedCareer.wins}-
                        {savedCareer.losses} ({savedCareer.kos} KO) · $
                        {savedCareer.money.toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onContinueCareer();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-lg tracking-wide cursor-pointer"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Continue Career</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onOpenCareerCreator();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-white/10 hover:bg-white/16 text-white border border-white/15 font-display font-bold text-base tracking-wide cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>Create New Boxer (Fresh Career)</span>
                </button>
              </div>
            )}

            {/* EXHIBITION MODE SUB-PANEL */}
            {view === 'exhibition' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setArmedIndex(null);
                      setView('root');
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="font-display italic text-xl font-extrabold text-white tracking-wide uppercase">
                    Exhibition
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto career-scroll pr-1">
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
                        className={`text-left px-2.5 py-1.5 rounded border text-xs cursor-pointer ${
                          active
                            ? 'bg-rose-600/25 border-rose-400 text-white font-semibold'
                            : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'
                        }`}
                      >
                        <div className="truncate">{f.name}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="max-h-28 overflow-y-auto career-scroll space-y-1 pr-1">
                  {ALL_OPPONENTS.map((opp) => {
                    const active = opp.id === selectedOpp.id;
                    const league = CAREER_LEAGUES[opp.leagueId];
                    return (
                      <button
                        key={opp.id}
                        type="button"
                        onClick={() => handleOppSelect(opp)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs border cursor-pointer ${
                          active
                            ? 'bg-sky-600/25 border-sky-400 text-white font-semibold'
                            : 'bg-white/[0.03] border-white/8 text-slate-300 hover:bg-white/[0.07]'
                        }`}
                      >
                        <span className="truncate">
                          {opp.name} “{opp.nickname}”
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2 tabular-nums">
                          {league.rounds}R · Div {4 - opp.leagueId}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tale of the Tape Comparison */}
                <div className="bg-black/45 border border-white/10 rounded p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-200 border-b border-white/10 pb-1">
                    <span className="text-amber-300 truncate max-w-[42%]">
                      {selectedFighter.name}
                    </span>
                    <span className="text-[10px] text-slate-500">VS</span>
                    <span className="text-sky-300 truncate max-w-[42%] text-right">
                      {selectedOpp.name}
                    </span>
                  </div>
                  {(
                    [
                      ['PWR', selectedFighter.baseStats.power, selectedOpp.baseStats.power],
                      ['SPD', selectedFighter.baseStats.speed, selectedOpp.baseStats.speed],
                      ['DEF', selectedFighter.baseStats.defense, selectedOpp.baseStats.defense],
                      ['STM', selectedFighter.baseStats.stamina, selectedOpp.baseStats.stamina],
                    ] as const
                  ).map(([label, pVal, oVal]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between font-mono-tabular text-[11px]"
                    >
                      <span
                        className={pVal >= oVal ? 'text-white font-bold' : 'text-slate-400'}
                      >
                        {pVal}
                      </span>
                      <span className="text-slate-500 font-sans font-semibold">{label}</span>
                      <span
                        className={oVal >= pVal ? 'text-white font-bold' : 'text-slate-400'}
                      >
                        {oVal}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onStartExhibition(selectedOpp);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-rose-600 hover:bg-rose-500 text-white font-display font-extrabold text-lg tracking-wide cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Start Exhibition Bout</span>
                </button>
              </div>
            )}

            {/* SETTINGS SUB-PANEL */}
            {view === 'settings' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setArmedIndex(null);
                      setView('root');
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="font-display italic text-xl font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-300" />
                    <span>Settings</span>
                  </h2>
                </div>

                <SettingsPanel
                  settings={settings}
                  onUpdateSettings={onUpdateSettings}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Desktop Controls (hidden on mobile landscape) + Bottom-Right Main Event */}
      <div className="flex items-end justify-between gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-300/90 font-medium">
          <span>
            <strong className="text-white">Enter</strong> Select / Confirm
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            Ring: WASD Move · J/U/K/L Punch · Space Dodge · H Guard
          </span>
        </div>

        {/* Bottom-Right Main Event Matchup Card */}
        <div className="ml-auto bg-[#0a0d15]/90 border border-white/15 rounded px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-xl text-right">
          <div className="text-[9px] sm:text-[10px] font-semibold tracking-[0.2em] text-amber-400 uppercase leading-none">
            Main Event · {oppRounds} Rounds
          </div>
          <div className="font-display italic font-extrabold text-sm sm:text-lg tracking-wide text-white uppercase leading-tight mt-0.5 whitespace-nowrap">
            {displayFighterName}{' '}
            <span className="text-rose-500 not-italic text-xs sm:text-sm mx-0.5">vs</span>{' '}
            {selectedOpp.name}
          </div>
        </div>
      </div>
    </div>
  );
};
