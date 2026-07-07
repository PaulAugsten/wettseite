/**
 * Types shared between the Next.js scraper code (`lib/scraper/`) and the
 * Supabase edge functions. Files in this directory are imported by both the
 * Node and Deno runtimes: keep them dependency-free and use explicit `.ts`
 * extensions in relative imports.
 */

export type TournamentStatus = 'scheduled' | 'live' | 'finished';
export type MatchStatus = 'planned' | 'live' | 'finished';

/** A tournament row as the scraper reads/writes it. */
export type Tournament = {
    id?: number;
    name: string;
    game_id: number;
    location: string;
    prize_pool: string;
    start_date: string;
    end_date: string;
    status: TournamentStatus;
    url: string;
};

/** A match insert payload as produced by the parsers. */
export type Match = {
    external_id: number;
    game_id: number;
    tournament_id: number;
    stage: string;
    group: string;
    bracket: string;
    round: string;
    team1_id: number;
    team2_id: number;
    team1_score: number | null;
    team2_score: number | null;
    winner_id: number | null;
    status: MatchStatus;
    date: string;
};
