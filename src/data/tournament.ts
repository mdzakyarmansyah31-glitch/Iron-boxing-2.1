import {
  BoxerStats,
  FighterProfile,
  OpponentProfile,
  TournamentFighterSlot,
  TournamentMatch,
  TournamentState,
} from '../types/game';
import { CAREER_LEAGUES } from './fighters';

export interface TournamentTierConfig {
  id: 'club' | 'continental' | 'world';
  name: string;
  subtitle: string;
  rounds: number;
  roundSeconds: number;
  leaguePool: number[];
}

export const TOURNAMENT_TIERS: TournamentTierConfig[] = [
  {
    id: 'club',
    name: 'Underground Invitational',
    subtitle: '8-Man Entry Bracket · 3 Rounds',
    rounds: 3,
    roundSeconds: 75,
    leaguePool: [0, 1, 2],
  },
  {
    id: 'continental',
    name: 'Continental Cup',
    subtitle: '8-Man Pro Bracket · 3 Rounds',
    rounds: 3,
    roundSeconds: 80,
    leaguePool: [1, 2, 0],
  },
  {
    id: 'world',
    name: 'World Grand Prix',
    subtitle: '8-Man Championship Bracket · 4 Rounds',
    rounds: 4,
    roundSeconds: 85,
    leaguePool: [3, 2, 1],
  },
];

function computeOverall(stats: BoxerStats): number {
  return Math.round(
    (stats.power + stats.speed + stats.defense + stats.footwork + stats.stamina + stats.chin) / 6,
  );
}

function toOpponentSlot(opp: OpponentProfile): TournamentFighterSlot {
  return {
    id: opp.id,
    name: opp.name,
    nickname: opp.nickname,
    isPlayer: false,
    overall: computeOverall(opp.baseStats),
    opponent: opp,
  };
}

export function createTournamentBracket(
  player: FighterProfile,
  tierId: 'club' | 'continental' | 'world',
): TournamentState {
  const tier = TOURNAMENT_TIERS.find((t) => t.id === tierId) ?? TOURNAMENT_TIERS[0];

  const pool: OpponentProfile[] = [];
  for (const lId of tier.leaguePool) {
    const league = CAREER_LEAGUES[lId];
    if (league) {
      pool.push(...league.opponents);
    }
  }

  // Pick 7 distinct opponents (shuffle lightly inside tier pool so each bracket feels fresh)
  const primary = pool.slice(0, 6);
  for (let i = primary.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [primary[i], primary[j]] = [primary[j], primary[i]];
  }
  const seventh = pool[6] ?? pool[0];
  const chosenOpps = [...primary, seventh].slice(0, 7);

  const playerSlot: TournamentFighterSlot = {
    id: `player_${player.id}`,
    name: player.name,
    nickname: player.nickname,
    isPlayer: true,
    overall: computeOverall(player.baseStats),
    profile: player,
  };

  const oppSlots = chosenOpps.map(toOpponentSlot);

  const matches: TournamentMatch[] = [
    // Quarterfinals (round 0)
    {
      id: 'qf0',
      roundIndex: 0,
      matchIndex: 0,
      fighterA: playerSlot,
      fighterB: oppSlots[0],
      winnerId: null,
      method: null,
    },
    {
      id: 'qf1',
      roundIndex: 0,
      matchIndex: 1,
      fighterA: oppSlots[1],
      fighterB: oppSlots[2],
      winnerId: null,
      method: null,
    },
    {
      id: 'qf2',
      roundIndex: 0,
      matchIndex: 2,
      fighterA: oppSlots[3],
      fighterB: oppSlots[4],
      winnerId: null,
      method: null,
    },
    {
      id: 'qf3',
      roundIndex: 0,
      matchIndex: 3,
      fighterA: oppSlots[5],
      fighterB: oppSlots[6],
      winnerId: null,
      method: null,
    },
    // Semifinals (round 1)
    {
      id: 'sf0',
      roundIndex: 1,
      matchIndex: 0,
      fighterA: null,
      fighterB: null,
      winnerId: null,
      method: null,
    },
    {
      id: 'sf1',
      roundIndex: 1,
      matchIndex: 1,
      fighterA: null,
      fighterB: null,
      winnerId: null,
      method: null,
    },
    // Championship Final (round 2)
    {
      id: 'final',
      roundIndex: 2,
      matchIndex: 0,
      fighterA: null,
      fighterB: null,
      winnerId: null,
      method: null,
    },
  ];

  return {
    tierId: tier.id,
    tierName: tier.name,
    roundsPerBout: tier.rounds,
    roundSeconds: tier.roundSeconds,
    playerFighterId: playerSlot.id,
    currentRoundIndex: 0,
    status: 'active',
    matches,
  };
}

export function getCurrentPlayerTournamentMatch(
  state: TournamentState | null,
): { match: TournamentMatch; opponent: OpponentProfile } | null {
  if (!state || state.status !== 'active') return null;
  const match = state.matches.find(
    (m) =>
      m.roundIndex === state.currentRoundIndex &&
      m.winnerId === null &&
      (m.fighterA?.id === state.playerFighterId || m.fighterB?.id === state.playerFighterId),
  );
  if (!match) return null;
  const oppSlot =
    match.fighterA?.id === state.playerFighterId ? match.fighterB : match.fighterA;
  if (!oppSlot?.opponent) return null;
  return { match, opponent: oppSlot.opponent };
}

function simulateAiMatch(match: TournamentMatch): {
  winner: TournamentFighterSlot;
  method: 'KO' | 'TKO' | 'UD';
} {
  const a = match.fighterA!;
  const b = match.fighterB!;
  const diff = a.overall - b.overall;
  const probA = Math.min(0.82, Math.max(0.18, 0.5 + diff * 0.015));
  const winner = Math.random() < probA ? a : b;
  const roll = Math.random();
  const method: 'KO' | 'TKO' | 'UD' = roll < 0.34 ? 'KO' : roll < 0.58 ? 'TKO' : 'UD';
  return { winner, method };
}

export function advanceTournamentAfterPlayerBout(
  state: TournamentState,
  playerWon: boolean,
  method: 'KO' | 'TKO' | 'UD',
): TournamentState {
  if (state.status !== 'active') return state;
  const nextMatches = state.matches.map((m) => ({ ...m }));
  const round = state.currentRoundIndex;

  // 1. Resolve all matches in current round
  const winnersByMatchIdx: Record<number, TournamentFighterSlot> = {};
  for (const m of nextMatches) {
    if (m.roundIndex !== round || !m.fighterA || !m.fighterB) continue;
    const isPlayerMatch =
      m.fighterA.id === state.playerFighterId || m.fighterB.id === state.playerFighterId;

    if (isPlayerMatch) {
      const playerSlot =
        m.fighterA.id === state.playerFighterId ? m.fighterA : m.fighterB;
      const oppSlot =
        m.fighterA.id === state.playerFighterId ? m.fighterB : m.fighterA;
      const winnerSlot = playerWon ? playerSlot : oppSlot;
      m.winnerId = winnerSlot.id;
      m.method = method;
      winnersByMatchIdx[m.matchIndex] = winnerSlot;
    } else {
      const sim = simulateAiMatch(m);
      m.winnerId = sim.winner.id;
      m.method = sim.method;
      winnersByMatchIdx[m.matchIndex] = sim.winner;
    }
  }

  // 2. Populate next round slots
  if (round === 0) {
    const sf0 = nextMatches.find((m) => m.id === 'sf0')!;
    const sf1 = nextMatches.find((m) => m.id === 'sf1')!;
    sf0.fighterA = winnersByMatchIdx[0] ?? null;
    sf0.fighterB = winnersByMatchIdx[1] ?? null;
    sf1.fighterA = winnersByMatchIdx[2] ?? null;
    sf1.fighterB = winnersByMatchIdx[3] ?? null;
  } else if (round === 1) {
    const finalMatch = nextMatches.find((m) => m.id === 'final')!;
    finalMatch.fighterA = winnersByMatchIdx[0] ?? null;
    finalMatch.fighterB = winnersByMatchIdx[1] ?? null;
  }

  if (!playerWon) {
    return {
      ...state,
      matches: nextMatches,
      status: 'eliminated',
    };
  }

  if (round >= 2) {
    return {
      ...state,
      matches: nextMatches,
      status: 'won',
    };
  }

  return {
    ...state,
    matches: nextMatches,
    currentRoundIndex: round + 1,
    status: 'active',
  };
}
