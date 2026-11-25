export type AttackType = 'jab' | 'hook' | 'heavy' | 'uppercut';
export type AttackTarget = 'head' | 'body';
export type CameraMode = 'broadcast' | 'closeup' | 'shoulder';

export type HairStyle =
  | 'buzz'
  | 'bald'
  | 'fade'
  | 'slick'
  | 'mohawk'
  | 'high_top'
  | 'dreadlocks'
  | 'cornrows'
  | 'afro'
  | 'pompadour'
  | 'curly_top'
  | 'spiky'
  | 'side_part'
  | 'undercut'
  | 'mullet'
  | 'man_bun'
  | 'long_wavy'
  | 'faux_hawk'
  | 'flattop'
  | 'shaggy'
  | 'wolf_cut';

export type BeardStyle = 'none' | 'stubble' | 'goatee' | 'full';

export type FaceShapeId =
  | 'chiseled'
  | 'square_jaw'
  | 'oval_lean'
  | 'broad_power'
  | 'angular_hawk'
  | 'rugged'
  | 'athletic_round'
  | 'classic_sculpted';

export interface BoxerStats {
  power: number;
  speed: number;
  defense: number;
  footwork: number;
  stamina: number;
  chin: number;
}

export interface BoxerAppearance {
  skinColor: string;
  trunksColor: string;
  trunksTrimColor: string;
  gloveColor: string;
  gloveTrimColor: string;
  bootColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  beardStyle: BeardStyle;
  faceShape?: FaceShapeId;
  eyeColor?: string;
  heightScale: number;
  bulkScale: number;
}

export interface FighterProfile {
  id: string;
  name: string;
  nickname: string;
  origin: string;
  styleLabel: string;
  stance: 'Orthodox' | 'Southpaw';
  heightDisplay: string;
  weightDisplay: string;
  reachDisplay: string;
  bio: string;
  baseStats: BoxerStats;
  appearance: BoxerAppearance;
  aiTendency?: AiTendency;
}

export interface AiTendency {
  aggression: number; // 0.3 - 0.95
  guardRate: number; // 0.2 - 0.85
  dodgeRate: number; // 0.1 - 0.75
  comboRate: number; // 0.2 - 0.85
  heavyBias: number; // 0.15 - 0.65
}

export interface OpponentProfile extends FighterProfile {
  leagueId: number;
  rankInLeague: number; // 3, 2, 1 (1 = Champ)
  purse: number;
  winBonus: number;
  koBonus: number;
  aiTendency: AiTendency;
}

export interface LeagueInfo {
  id: number;
  name: string;
  tierLabel: string;
  rounds: number;
  roundSeconds: number;
  beltName: string;
  accentHex: string;
  opponents: OpponentProfile[];
}

export type UpgradeCategory = 'gloves' | 'boots' | 'coach' | 'conditioning';

export interface UpgradeItem {
  id: string;
  category: UpgradeCategory;
  tier: number;
  name: string;
  description: string;
  cost: number;
  statBonuses: Partial<BoxerStats>;
  trainingBonusPct?: number;
  energyRecoveryBonus?: number;
}

export interface TrainingDrill {
  id: string;
  name: string;
  subtitle: string;
  energyCost: number; // negative = restores energy
  moneyCost: number;
  statGains: Partial<BoxerStats>;
  sharpnessGain: number;
}

export interface FightRecordEntry {
  id: string;
  week: number;
  opponentName: string;
  opponentNickname: string;
  leagueName: string;
  result: 'WIN' | 'LOSS';
  method: 'KO' | 'TKO' | 'UD';
  round: number;
  purseEarned: number;
}

export interface CareerState {
  fighterId: string;
  customName: string;
  customNickname?: string;
  customStance?: 'Orthodox' | 'Southpaw';
  customAppearance?: BoxerAppearance;
  week: number;
  money: number;
  energy: number;
  sharpness: number;
  leagueIndex: number;
  opponentIndexInLeague: number; // 0 = #3, 1 = #2, 2 = #1 Champ
  beltsWon: string[];
  wins: number;
  losses: number;
  kos: number;
  stats: BoxerStats;
  ownedUpgrades: Record<UpgradeCategory, number>;
  history: FightRecordEntry[];
  isHallOfFame: boolean;
  entranceTrack?: SongTrackMode;
}

export type FightPhase =
  | 'walkout'
  | 'intro'
  | 'fighting'
  | 'highlight'
  | 'knockdown'
  | 'between_rounds'
  | 'celebration'
  | 'finished';

export type WalkoutStyleId =
  | 'champ_swagger'
  | 'shadow_combo'
  | 'brawler_march'
  | 'slick_groove'
  | 'stoic_warrior'
  | 'explosive_sprint'
  | 'crowd_conductor'
  | 'tight_focus'
  | 'showboat_strut'
  | 'royal_salute';

export type CelebrationStyleId =
  | 'double_fist_jump'
  | 'belt_waist_flex'
  | 'shadow_flurry_roar'
  | 'kneel_prayer_rise'
  | 'crowd_ear_cup'
  | 'chest_beat_roar'
  | 'spin_fist_pump'
  | 'corner_salute_bow'
  | 'gloves_high_march'
  | 'coach_arm_raise';

export type BoxingPostureId =
  | 'classic_euro'
  | 'philly_shell'
  | 'peekaboo'
  | 'long_guard'
  | 'high_fortress'
  | 'low_sling'
  | 'mummy_cross'
  | 'crouch_brawler';

export type FaceOffSwitchStyleId =
  | 'step_in_jab_cross'
  | 'glove_bang_roar'
  | 'shoulder_roll_snap'
  | 'uppercut_taunt'
  | 'spin_pivot_lock'
  | 'hook_whip_glare'
  | 'bow_and_guard'
  | 'bounce_flurry'
  | 'neck_crack_flex'
  | 'raised_fist_salute';

export interface FightSummaryStats {
  landed: number;
  thrown: number;
  counters: number;
  blocks: number;
  dodges: number;
  oppLanded: number;
  oppThrown: number;
  bodyShotsLanded: number;
  parries: number;
}

export interface RoundScoreEntry {
  round: number;
  judges: [number, number][];
  playerLanded: number;
  oppLanded: number;
  playerKnockdowns: number;
  oppKnockdowns: number;
}

export interface TapeFighterInfo {
  name: string;
  nickname: string;
  origin: string;
  styleLabel: string;
  stance: 'Orthodox' | 'Southpaw';
  heightDisplay: string;
  weightDisplay: string;
  reachDisplay: string;
  power: number;
  speed: number;
  defense: number;
}

export interface CombatHudSnapshot {
  playerHp: number;
  playerMaxHp: number;
  playerStamina: number;
  playerMaxStamina: number;
  playerGuard: number;
  playerMaxGuard: number;
  playerKnockdowns: number;
  oppHp: number;
  oppMaxHp: number;
  oppStamina: number;
  oppMaxStamina: number;
  oppGuard: number;
  oppMaxGuard: number;
  oppKnockdowns: number;
  round: number;
  maxRounds: number;
  roundTimer: number;
  phase: FightPhase;
  phaseProgress: number;
  knockdownTarget: 'player' | 'opponent' | null;
  knockdownCount: number;
  refereeCountdown: number;
  calloutText: string | null;
  calloutTone: 'gold' | 'red' | 'cyan' | 'white';
  playerCombo: number;
  isCounterWindow: boolean;
  isPlayerGuarding: boolean;
  isClinching: boolean;
  bodyShotsMode: AttackTarget;
  roundScores: RoundScoreEntry[];
  cornerAdvice: string | null;
  cornerFocusUsed: boolean;
  betweenRoundsTimer: number;
  highlightPunch: AttackType | null;
  highlightAttacker: 'player' | 'opponent' | null;
  highlightIsCounter: boolean;
  highlightProgress: number;
  winner: 'player' | 'opponent' | null;
  winMethod: 'KO' | 'TKO' | 'UD' | null;
  statsSummary: FightSummaryStats;
}

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type SongTrackMode =
  | 'auto'
  | 'sucker_for_pain'
  | 'body_pata_pata'
  | 'vendetta_rap'
  | 'track1'
  | 'track2';

export interface GameSettings {
  songVolume: number; // 0..100
  sfxVolume: number; // 0..100
  muted: boolean;
  graphicsQuality: GraphicsQuality;
  songTrack: SongTrackMode;
  cameraMode: CameraMode;
  announcerVoice: boolean;
}

export interface TournamentFighterSlot {
  id: string;
  name: string;
  nickname: string;
  isPlayer: boolean;
  overall: number;
  profile?: FighterProfile;
  opponent?: OpponentProfile;
}

export interface TournamentMatch {
  id: string;
  roundIndex: number; // 0 = QF, 1 = SF, 2 = Final
  matchIndex: number;
  fighterA: TournamentFighterSlot | null;
  fighterB: TournamentFighterSlot | null;
  winnerId: string | null;
  method: 'KO' | 'TKO' | 'UD' | null;
}

export interface TournamentState {
  tierId: 'club' | 'continental' | 'world';
  tierName: string;
  roundsPerBout: number;
  roundSeconds: number;
  playerFighterId: string;
  currentRoundIndex: number; // 0, 1, 2
  status: 'active' | 'won' | 'eliminated';
  matches: TournamentMatch[]; // 7 matches: [0..3]=QF, [4..5]=SF, [6]=Final
}

