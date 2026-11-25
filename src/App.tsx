import { useCallback, useEffect, useRef, useState } from 'react';
import { CareerCreator } from './components/CareerCreator';
import { CareerHub } from './components/CareerHub';
import { FightHUD } from './components/FightHUD';
import { FreeFightSelect } from './components/FreeFightSelect';
import { BagDrillResult } from './components/GymBagMiniGame';
import { OfflineIndicator } from './components/PWAInstallButton';
import { StartScreen } from './components/StartScreen';
import { TitleScreen } from './components/TitleScreen';
import { TournamentHub } from './components/TournamentHub';
import {
  buildCareerFighterProfile,
  CAREER_LEAGUES,
  createInitialCareerState,
  fighterToOpponent,
  getEffectiveCareerStats,
  getEnergyRecoveryBonus,
  getTrainingBonusMultiplier,
  PLAYABLE_FIGHTERS,
} from './data/fighters';
import {
  advanceTournamentAfterPlayerBout,
  createTournamentBracket,
} from './data/tournament';
import { soundEngine } from './engine/audio';
import { BoxingSceneController, FightConfig } from './engine/BoxingScene';
import {
  AttackType,
  BoxerAppearance,
  BoxerStats,
  CareerState,
  CombatHudSnapshot,
  FighterProfile,
  GameSettings,
  OpponentProfile,
  SongTrackMode,
  TournamentState,
  TrainingDrill,
  UpgradeItem,
} from './types/game';

const CAREER_STORAGE_KEY = 'iron_ring_career_v1';
const SETTINGS_STORAGE_KEY = 'iron_ring_settings_v1';
const TOURNAMENT_STORAGE_KEY = 'iron_ring_tournament_v1';

const DEFAULT_SETTINGS: GameSettings = {
  songVolume: 65,
  sfxVolume: 85,
  muted: false,
  graphicsQuality: 'high',
  songTrack: 'sucker_for_pain',
  cameraMode: 'broadcast',
  announcerVoice: true,
};

const INITIAL_HUD: CombatHudSnapshot = {
  playerHp: 140,
  playerMaxHp: 140,
  playerStamina: 130,
  playerMaxStamina: 130,
  playerGuard: 115,
  playerMaxGuard: 115,
  playerKnockdowns: 0,
  oppHp: 130,
  oppMaxHp: 130,
  oppStamina: 120,
  oppMaxStamina: 120,
  oppGuard: 100,
  oppMaxGuard: 100,
  oppKnockdowns: 0,
  round: 1,
  maxRounds: 3,
  roundTimer: 75,
  phase: 'intro',
  phaseProgress: 0,
  knockdownTarget: null,
  knockdownCount: 0,
  refereeCountdown: 0,
  calloutText: null,
  calloutTone: 'white',
  playerCombo: 0,
  isCounterWindow: false,
  isPlayerGuarding: false,
  isClinching: false,
  bodyShotsMode: 'head',
  roundScores: [],
  cornerAdvice: null,
  cornerFocusUsed: false,
  betweenRoundsTimer: 0,
  highlightPunch: null,
  highlightAttacker: null,
  highlightIsCounter: false,
  highlightProgress: 0,
  winner: null,
  winMethod: null,
  statsSummary: {
    landed: 0,
    thrown: 0,
    counters: 0,
    blocks: 0,
    dodges: 0,
    oppLanded: 0,
    oppThrown: 0,
    bodyShotsLanded: 0,
    parries: 0,
  },
};

function loadSavedCareer(): CareerState | null {
  try {
    const raw = localStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareerState;
    if (!parsed || typeof parsed.week !== 'number' || !parsed.stats) return null;
    return parsed;
  } catch {
    return null;
  }
}

function loadSavedSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      songVolume:
        typeof parsed.songVolume === 'number'
          ? Math.max(0, Math.min(100, parsed.songVolume))
          : DEFAULT_SETTINGS.songVolume,
      sfxVolume:
        typeof parsed.sfxVolume === 'number'
          ? Math.max(0, Math.min(100, parsed.sfxVolume))
          : DEFAULT_SETTINGS.sfxVolume,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_SETTINGS.muted,
      graphicsQuality:
        parsed.graphicsQuality === 'low' ||
        parsed.graphicsQuality === 'medium' ||
        parsed.graphicsQuality === 'high'
          ? parsed.graphicsQuality
          : DEFAULT_SETTINGS.graphicsQuality,
      songTrack:
        parsed.songTrack === 'sucker_for_pain' ||
        parsed.songTrack === 'body_pata_pata' ||
        parsed.songTrack === 'vendetta_rap' ||
        parsed.songTrack === 'auto' ||
        parsed.songTrack === 'track1' ||
        parsed.songTrack === 'track2'
          ? parsed.songTrack
          : DEFAULT_SETTINGS.songTrack,
      cameraMode:
        parsed.cameraMode === 'broadcast' ||
        parsed.cameraMode === 'closeup' ||
        parsed.cameraMode === 'shoulder'
          ? parsed.cameraMode
          : DEFAULT_SETTINGS.cameraMode,
      announcerVoice:
        typeof parsed.announcerVoice === 'boolean'
          ? parsed.announcerVoice
          : DEFAULT_SETTINGS.announcerVoice,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadSavedTournament(): TournamentState | null {
  try {
    const raw = localStorage.getItem(TOURNAMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TournamentState;
    if (!parsed || !Array.isArray(parsed.matches) || parsed.matches.length !== 7) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<BoxingSceneController | null>(null);

  const [screen, setScreen] = useState<
    'splash' | 'title' | 'freefight' | 'career_create' | 'career' | 'tournament' | 'fighting'
  >('splash');
  const [selectedFighter, setSelectedFighter] = useState<FighterProfile>(PLAYABLE_FIGHTERS[0]);
  const [waitingFighter, setWaitingFighter] = useState<FighterProfile>(PLAYABLE_FIGHTERS[0]);
  const [freeRightFighter, setFreeRightFighter] = useState<FighterProfile>(PLAYABLE_FIGHTERS[2]);
  const [freeRounds, setFreeRounds] = useState<number>(3);
  const [previewOpp, setPreviewOpp] = useState<OpponentProfile>(CAREER_LEAGUES[0].opponents[2]);
  const [career, setCareer] = useState<CareerState | null>(() => loadSavedCareer());
  const [tournament, setTournament] = useState<TournamentState | null>(() =>
    loadSavedTournament(),
  );
  const [settings, setSettings] = useState<GameSettings>(() => loadSavedSettings());
  const [hud, setHud] = useState<CombatHudSnapshot>(INITIAL_HUD);
  const [paused, setPaused] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissOrientationPrompt, setDismissOrientationPrompt] = useState(false);

  const [activeFightMeta, setActiveFightMeta] = useState<{
    fightKind: 'free' | 'career' | 'exhibition' | 'tournament';
    playerName: string;
    opponent: OpponentProfile;
    lastConfig: FightConfig;
  } | null>(null);

  // Persist & apply audio/graphics settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore quota issues
    }
    soundEngine.setSongVolume(settings.songVolume / 100);
    soundEngine.setSfxVolume(settings.sfxVolume / 100);
    soundEngine.setMuted(settings.muted);
    sceneRef.current?.setGraphicsQuality(settings.graphicsQuality);
    sceneRef.current?.setCameraMode(settings.cameraMode);
    sceneRef.current?.setAnnouncerVoice(settings.announcerVoice);
  }, [settings]);

  // Play Career fighter's custom entrance song ONLY during Career walkouts; restore global songTrack afterward
  useEffect(() => {
    const useCareerEntrance =
      screen === 'fighting' &&
      activeFightMeta?.fightKind === 'career' &&
      hud.phase === 'walkout' &&
      Boolean(career?.entranceTrack);
    soundEngine.setSongTrack(
      useCareerEntrance && career?.entranceTrack ? career.entranceTrack : settings.songTrack,
    );
  }, [screen, activeFightMeta?.fightKind, hud.phase, career?.entranceTrack, settings.songTrack]);

  // Ensure the song softens automatically when entering battle and never gets louder in fights
  useEffect(() => {
    soundEngine.setInBattle(screen === 'fighting');
  }, [screen]);

  // Persist career state whenever it changes
  useEffect(() => {
    if (career) {
      try {
        localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(career));
      } catch {
        // Ignore quota issues
      }
    }
  }, [career]);

  // Persist tournament state
  useEffect(() => {
    try {
      if (tournament) {
        localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify(tournament));
      } else {
        localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
      }
    } catch {
      // Ignore quota issues
    }
  }, [tournament]);

  // Initialize Three.js Scene once inside isolated ref container
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const controller = new BoxingSceneController(
      container,
      PLAYABLE_FIGHTERS[0],
      CAREER_LEAGUES[0].opponents[2],
      (snapshot) => {
        setHud(snapshot);
      },
      () => {
        setContextLost(true);
      },
    );
    controller.setGraphicsQuality(settings.graphicsQuality);
    controller.setCameraMode(settings.cameraMode);
    controller.setAnnouncerVoice(settings.announcerVoice);
    controller.setOnWaitingFighterChange((fighter) => {
      setWaitingFighter(fighter);
    });
    sceneRef.current = controller;

    return () => {
      controller.setOnWaitingFighterChange(undefined);
      controller.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect portrait mobile viewports to offer Landscape Fullscreen lock
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 680;
      setIsPortraitMobile(portrait);
      if (!portrait) setDismissOrientationPrompt(false);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Esc key to pause/resume during active fight
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && screen === 'fighting' && hud.phase !== 'finished') {
        setPaused((prev) => {
          const next = !prev;
          sceneRef.current?.setPaused(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, hud.phase]);

  const handleUpdateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const enterWaitingRoomTitle = useCallback(() => {
    const lead = PLAYABLE_FIGHTERS[0];
    setWaitingFighter(lead);
    sceneRef.current?.setupWaitingRoom(lead);
    setScreen('title');
  }, []);

  const handleEnterMenu = useCallback(() => {
    enterWaitingRoomTitle();
  }, [enterWaitingRoomTitle]);

  const handleConfirmMenuAction = useCallback((action: () => void) => {
    if (sceneRef.current) {
      sceneRef.current.triggerWaitingRoomConfirmPunch(action);
    } else {
      action();
    }
  }, []);

  const handleSelectFighter = useCallback(
    (fighter: FighterProfile) => {
      setSelectedFighter(fighter);
      if (screen === 'title') {
        sceneRef.current?.setupWaitingRoom(fighter);
      } else {
        sceneRef.current?.setupShowcase(fighter, previewOpp);
      }
    },
    [previewOpp, screen],
  );

  const handlePreviewOpponent = useCallback(
    (opp: OpponentProfile) => {
      setPreviewOpp(opp);
      if (screen !== 'title') {
        sceneRef.current?.setupShowcase(selectedFighter, opp);
      }
    },
    [selectedFighter, screen],
  );

  useEffect(() => {
    if (screen === 'freefight') {
      sceneRef.current?.setupFaceOffShowcase(selectedFighter, freeRightFighter);
    }
  }, [screen, selectedFighter, freeRightFighter]);

  const handleOpenFreeFight = useCallback(() => {
    sceneRef.current?.setupFaceOffShowcase(selectedFighter, freeRightFighter);
    setScreen('freefight');
  }, [selectedFighter, freeRightFighter]);

  const handleSelectFreeLeft = useCallback((fighter: FighterProfile) => {
    setSelectedFighter(fighter);
  }, []);

  const handleSelectFreeRight = useCallback((fighter: FighterProfile) => {
    setFreeRightFighter(fighter);
  }, []);

  const handleSwapFreeCorners = useCallback(() => {
    setSelectedFighter(freeRightFighter);
    setFreeRightFighter(selectedFighter);
  }, [selectedFighter, freeRightFighter]);

  const handleOpenCareerCreator = useCallback(() => {
    setScreen('career_create');
  }, []);

  const handlePreviewCreatorAppearance = useCallback(
    (appearance: BoxerAppearance, stance: 'Orthodox' | 'Southpaw') => {
      sceneRef.current?.setupCreatorShowcase(appearance, stance);
    },
    [],
  );

  const handleCreateCareer = useCallback(
    (data: {
      customName: string;
      customNickname: string;
      stance: 'Orthodox' | 'Southpaw';
      appearance: BoxerAppearance;
      baseStats: BoxerStats;
      entranceTrack: SongTrackMode;
    }) => {
      const fresh = createInitialCareerState({
        fighter: PLAYABLE_FIGHTERS[0],
        customName: data.customName,
        customNickname: data.customNickname,
        customStance: data.stance,
        customAppearance: data.appearance,
        baseStats: data.baseStats,
        entranceTrack: data.entranceTrack,
      });
      setCareer(fresh);
      const customProfile = buildCareerFighterProfile(fresh);
      sceneRef.current?.setupShowcase(customProfile, CAREER_LEAGUES[0].opponents[0]);
      setScreen('career');
    },
    [],
  );

  const handleContinueCareer = useCallback(() => {
    if (career) {
      setScreen('career');
    }
  }, [career]);

  const launchBout = useCallback(
    (
      fightKind: 'free' | 'career' | 'exhibition' | 'tournament',
      playerProfile: FighterProfile,
      playerName: string,
      playerStats: BoxerStats,
      playerSharpness: number,
      playerEnergy: number,
      opponent: OpponentProfile,
      rounds: number,
      roundSeconds: number,
      hasCareerBelt = false,
    ) => {
      const config: FightConfig = {
        playerProfile,
        playerName,
        playerStats,
        playerSharpness,
        playerEnergy,
        opponent,
        rounds,
        roundSeconds,
        hasCareerBelt: fightKind === 'career' && hasCareerBelt,
        announcerVoice: settings.announcerVoice,
      };
      setPaused(false);
      setActiveFightMeta({
        fightKind,
        playerName,
        opponent,
        lastConfig: config,
      });
      sceneRef.current?.startFight(config);
      setScreen('fighting');
    },
    [settings.announcerVoice],
  );

  const handleStartFreeFight = useCallback(() => {
    launchBout(
      'free',
      selectedFighter,
      selectedFighter.name,
      selectedFighter.baseStats,
      68,
      100,
      fighterToOpponent(freeRightFighter),
      freeRounds,
      75,
    );
  }, [selectedFighter, freeRightFighter, freeRounds, launchBout]);

  const handleStartExhibition = useCallback(
    (opponent: OpponentProfile) => {
      const league = CAREER_LEAGUES[opponent.leagueId] ?? CAREER_LEAGUES[0];
      launchBout(
        'exhibition',
        selectedFighter,
        selectedFighter.name,
        selectedFighter.baseStats,
        70,
        100,
        opponent,
        league.rounds,
        league.roundSeconds,
      );
    },
    [selectedFighter, launchBout],
  );

  const handleStartCareerBout = useCallback(
    (opponent: OpponentProfile) => {
      if (!career) return;
      const profile = buildCareerFighterProfile(career);
      const league = CAREER_LEAGUES[career.leagueIndex] ?? CAREER_LEAGUES[0];
      const effectiveStats = getEffectiveCareerStats(career);
      launchBout(
        'career',
        profile,
        career.customName,
        effectiveStats,
        career.sharpness,
        career.energy,
        opponent,
        league.rounds,
        league.roundSeconds,
        career.beltsWon.length > 0,
      );
    },
    [career, launchBout],
  );

  const handleCreateTournament = useCallback(
    (tierId: 'club' | 'continental' | 'world') => {
      const bracket = createTournamentBracket(selectedFighter, tierId);
      setTournament(bracket);
    },
    [selectedFighter],
  );

  const handleStartTournamentBout = useCallback(
    (opponent: OpponentProfile) => {
      if (!tournament) return;
      const fighterIdRaw = tournament.playerFighterId.replace(/^player_/, '');
      const profile =
        PLAYABLE_FIGHTERS.find((f) => f.id === fighterIdRaw) ?? selectedFighter;
      launchBout(
        'tournament',
        profile,
        profile.name,
        profile.baseStats,
        72,
        100,
        opponent,
        tournament.roundsPerBout,
        tournament.roundSeconds,
      );
    },
    [tournament, selectedFighter, launchBout],
  );

  const handleRunTraining = useCallback((drill: TrainingDrill) => {
    setCareer((prev) => {
      if (!prev) return prev;
      const coachMult = getTrainingBonusMultiplier(prev);
      const recoveryBonus = getEnergyRecoveryBonus(prev);
      const nextStats: BoxerStats = { ...prev.stats };

      for (const [key, gain] of Object.entries(drill.statGains)) {
        const k = key as keyof BoxerStats;
        const delta = Math.max(1, Math.round((gain ?? 0) * coachMult));
        nextStats[k] = Math.min(100, nextStats[k] + delta);
      }

      const energyDelta =
        drill.energyCost < 0 ? -(Math.abs(drill.energyCost) + recoveryBonus) : drill.energyCost;
      const nextEnergy = Math.max(0, Math.min(100, prev.energy - energyDelta));
      const nextSharpness = Math.max(25, Math.min(100, prev.sharpness + drill.sharpnessGain));

      return {
        ...prev,
        week: prev.week + 1,
        money: Math.max(0, prev.money - drill.moneyCost),
        energy: nextEnergy,
        sharpness: nextSharpness,
        stats: nextStats,
      };
    });
  }, []);

  const handleCompleteBagDrill = useCallback((result: BagDrillResult) => {
    setCareer((prev) => {
      if (!prev) return prev;
      const nextStats: BoxerStats = { ...prev.stats };
      for (const [key, gain] of Object.entries(result.statGains)) {
        const k = key as keyof BoxerStats;
        nextStats[k] = Math.min(99, nextStats[k] + (gain ?? 0));
      }
      return {
        ...prev,
        week: prev.week + 1,
        energy: Math.max(0, prev.energy - result.energyCost),
        sharpness: Math.min(100, prev.sharpness + result.sharpnessGain),
        stats: nextStats,
      };
    });
  }, []);

  const handleUpdateEntranceTrack = useCallback((track: SongTrackMode) => {
    setCareer((prev) => (prev ? { ...prev, entranceTrack: track } : prev));
  }, []);

  const handleBuyUpgrade = useCallback((item: UpgradeItem) => {
    setCareer((prev) => {
      if (!prev || prev.money < item.cost) return prev;
      return {
        ...prev,
        money: prev.money - item.cost,
        ownedUpgrades: {
          ...prev.ownedUpgrades,
          [item.category]: item.tier,
        },
      };
    });
  }, []);

  const handleExitFight = useCallback(() => {
    setPaused(false);
    sceneRef.current?.setPaused(false);

    if (activeFightMeta?.fightKind === 'career' && career) {
      if (hud.phase === 'finished' && hud.winner) {
        const opp = activeFightMeta.opponent;
        const league = CAREER_LEAGUES[career.leagueIndex] ?? CAREER_LEAGUES[0];
        const won = hud.winner === 'player';
        const isKo = hud.winMethod === 'KO' || hud.winMethod === 'TKO';
        const purseEarned =
          opp.purse + (won ? opp.winBonus : 0) + (won && isKo ? opp.koBonus : 0);

        setCareer((prev) => {
          if (!prev) return prev;
          let nextLeagueIdx = prev.leagueIndex;
          let nextOppIdx = prev.opponentIndexInLeague;
          const nextBelts = [...prev.beltsWon];
          let nextHall = prev.isHallOfFame;

          if (won && !prev.isHallOfFame) {
            if (prev.opponentIndexInLeague < 2) {
              nextOppIdx = prev.opponentIndexInLeague + 1;
            } else {
              if (!nextBelts.includes(league.beltName)) {
                nextBelts.push(league.beltName);
              }
              if (prev.leagueIndex < CAREER_LEAGUES.length - 1) {
                nextLeagueIdx = prev.leagueIndex + 1;
                nextOppIdx = 0;
              } else {
                nextHall = true;
              }
            }
          }

          return {
            ...prev,
            week: prev.week + 1,
            money: prev.money + purseEarned,
            energy: Math.max(15, prev.energy - 18),
            sharpness: Math.min(100, prev.sharpness + 4),
            wins: prev.wins + (won ? 1 : 0),
            losses: prev.losses + (won ? 0 : 1),
            kos: prev.kos + (won && isKo ? 1 : 0),
            leagueIndex: nextLeagueIdx,
            opponentIndexInLeague: nextOppIdx,
            beltsWon: nextBelts,
            isHallOfFame: nextHall,
            history: [
              {
                id: `${prev.week}-${opp.id}-${Date.now()}`,
                week: prev.week,
                opponentName: opp.name,
                opponentNickname: opp.nickname,
                leagueName: league.name,
                result: won ? 'WIN' : 'LOSS',
                method: hud.winMethod ?? 'UD',
                round: hud.round,
                purseEarned,
              },
              ...prev.history,
            ],
          };
        });
      }

      const profile = buildCareerFighterProfile(career);
      sceneRef.current?.setupShowcase(profile, activeFightMeta.opponent);
      setScreen('career');
    } else if (activeFightMeta?.fightKind === 'tournament' && tournament) {
      if (hud.phase === 'finished' && hud.winner) {
        const won = hud.winner === 'player';
        setTournament((prev) =>
          prev
            ? advanceTournamentAfterPlayerBout(prev, won, hud.winMethod ?? 'UD')
            : prev,
        );
      }
      sceneRef.current?.setupShowcase(selectedFighter, activeFightMeta.opponent);
      setScreen('tournament');
    } else if (activeFightMeta?.fightKind === 'free') {
      sceneRef.current?.setupFaceOffShowcase(selectedFighter, freeRightFighter);
      setScreen('freefight');
    } else {
      enterWaitingRoomTitle();
    }
  }, [
    activeFightMeta,
    career,
    tournament,
    hud.phase,
    hud.winner,
    hud.winMethod,
    hud.round,
    selectedFighter,
    freeRightFighter,
    enterWaitingRoomTitle,
  ]);

  const handleRematch = useCallback(() => {
    if (!activeFightMeta) return;
    setPaused(false);
    sceneRef.current?.startFight(activeFightMeta.lastConfig);
  }, [activeFightMeta]);

  const handleTogglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      sceneRef.current?.setPaused(next);
      return next;
    });
  }, []);

  const handleAnalogChange = useCallback((x: number, y: number) => {
    sceneRef.current?.setAnalogInput(x, y);
  }, []);

  const handleAttack = useCallback((type: AttackType) => {
    sceneRef.current?.triggerAttack(type);
  }, []);

  const handleDodge = useCallback(() => {
    sceneRef.current?.triggerDodge();
  }, []);

  const handleGuardChange = useCallback((active: boolean) => {
    sceneRef.current?.setGuarding(active);
  }, []);

  const handleSkipHighlight = useCallback(() => {
    sceneRef.current?.skipHighlight();
  }, []);

  const handleSkipWalkout = useCallback(() => {
    sceneRef.current?.skipWalkout();
  }, []);

  const handleSkipCelebration = useCallback(() => {
    sceneRef.current?.skipCelebration();
  }, []);

  const handleToggleBodyTarget = useCallback(() => {
    sceneRef.current?.toggleBodyShotsMode();
  }, []);

  const handleClinch = useCallback(() => {
    sceneRef.current?.triggerClinch();
  }, []);

  const handleCornerFocus = useCallback((focus: 'stamina' | 'guard' | 'damage') => {
    sceneRef.current?.applyCornerFocus(focus);
  }, []);

  const handleSkipBetweenRounds = useCallback(() => {
    sceneRef.current?.skipBetweenRounds();
  }, []);

  const handleFaceOffParallax = useCallback((nx: number, ny: number) => {
    sceneRef.current?.setFaceOffParallax(nx, ny);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090b10]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {contextLost && (
        <div className="fixed inset-0 z-50 bg-[#090b10] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            3D Graphics Context Suspended
          </h1>
          <p className="text-sm text-slate-400 mb-4 max-w-md">
            Your browser temporarily released WebGL graphics memory. Reload the page to re-enter the ring.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-display font-bold text-base cursor-pointer"
          >
            Reload Arena
          </button>
        </div>
      )}

      {screen === 'splash' && (
        <StartScreen
          muted={settings.muted}
          onToggleMute={handleToggleMute}
          onEnterMenu={handleEnterMenu}
          blockInput={isPortraitMobile && !dismissOrientationPrompt}
        />
      )}

      {screen === 'title' && (
        <TitleScreen
          selectedFighter={selectedFighter}
          waitingFighterName={waitingFighter.name}
          onSelectFighter={handleSelectFighter}
          onPreviewOpponent={handlePreviewOpponent}
          savedCareer={career}
          savedTournament={tournament}
          onConfirmMenuAction={handleConfirmMenuAction}
          onOpenFreeFight={handleOpenFreeFight}
          onOpenCareerCreator={handleOpenCareerCreator}
          onContinueCareer={handleContinueCareer}
          onStartExhibition={handleStartExhibition}
          onOpenTournament={() => setScreen('tournament')}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {screen === 'freefight' && (
        <FreeFightSelect
          leftFighter={selectedFighter}
          rightFighter={freeRightFighter}
          rounds={freeRounds}
          onSelectLeft={handleSelectFreeLeft}
          onSelectRight={handleSelectFreeRight}
          onChangeRounds={setFreeRounds}
          onSwapCorners={handleSwapFreeCorners}
          onParallaxChange={handleFaceOffParallax}
          onStartFight={handleStartFreeFight}
          onBack={enterWaitingRoomTitle}
        />
      )}

      {screen === 'career_create' && (
        <CareerCreator
          onPreviewAppearance={handlePreviewCreatorAppearance}
          onCreateCareer={handleCreateCareer}
          onBack={enterWaitingRoomTitle}
        />
      )}

      {screen === 'career' && career && (
        <CareerHub
          career={career}
          muted={settings.muted}
          onToggleMute={handleToggleMute}
          onRunTraining={handleRunTraining}
          onCompleteBagDrill={handleCompleteBagDrill}
          onUpdateEntranceTrack={handleUpdateEntranceTrack}
          onBuyUpgrade={handleBuyUpgrade}
          onStartNextBout={handleStartCareerBout}
          onExitToTitle={enterWaitingRoomTitle}
        />
      )}

      {screen === 'tournament' && (
        <TournamentHub
          tournament={tournament}
          selectedFighter={selectedFighter}
          onSelectFighter={handleSelectFighter}
          onCreateTournament={handleCreateTournament}
          onResetTournament={() => setTournament(null)}
          onFightMatch={handleStartTournamentBout}
          onBackToMenu={enterWaitingRoomTitle}
        />
      )}

      {screen === 'fighting' && activeFightMeta && (
        <FightHUD
          hud={hud}
          playerName={activeFightMeta.playerName}
          opponentName={activeFightMeta.opponent.name}
          opponentNickname={activeFightMeta.opponent.nickname}
          isCareerFight={activeFightMeta.fightKind === 'career'}
          isTournamentFight={activeFightMeta.fightKind === 'tournament'}
          purseInfo={
            activeFightMeta.fightKind === 'career'
              ? {
                  purse: activeFightMeta.opponent.purse,
                  winBonus: activeFightMeta.opponent.winBonus,
                  koBonus: activeFightMeta.opponent.koBonus,
                }
              : undefined
          }
          paused={paused}
          muted={settings.muted}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onAnalogChange={handleAnalogChange}
          onAttack={handleAttack}
          onToggleBodyTarget={handleToggleBodyTarget}
          onClinch={handleClinch}
          onCornerFocus={handleCornerFocus}
          onSkipBetweenRounds={handleSkipBetweenRounds}
          onDodge={handleDodge}
          onGuardChange={handleGuardChange}
          onSkipHighlight={handleSkipHighlight}
          onSkipWalkout={handleSkipWalkout}
          onSkipCelebration={handleSkipCelebration}
          onFinishExit={handleExitFight}
          onRematch={handleRematch}
        />
      )}

      {isPortraitMobile && !dismissOrientationPrompt && (
        <div className="fixed inset-0 z-40 bg-[#090b10]/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-10 rounded-lg border-2 border-amber-400 flex items-center justify-center mb-4">
            <span className="font-display font-bold text-xs text-amber-300">16:9</span>
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white tracking-wide mb-2">
            Switch to Landscape Mode
          </h2>
          <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
            Iron Ring Boxing is built for wide landscape combat so your analog stick, punch cluster, and broadcast camera have full room.
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  }
                  const orient = window.screen?.orientation as unknown as {
                    lock?: (mode: string) => Promise<void>;
                  };
                  if (orient?.lock) {
                    await orient.lock('landscape');
                  }
                } catch {
                  // Ignore if browser blocks orientation lock outside PWA/fullscreen
                }
                setDismissOrientationPrompt(true);
              }}
              className="w-full py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-lg cursor-pointer"
            >
              Enter Landscape Fullscreen
            </button>
            <button
              type="button"
              onClick={() => setDismissOrientationPrompt(true)}
              className="w-full py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium cursor-pointer"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
