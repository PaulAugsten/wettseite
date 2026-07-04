import type { Tables } from '@/lib/supabase/database.types';

/**
 * Domain types consumed by pages and components. They are derived from the
 * generated database schema (`lib/supabase/database.types.ts`) so they can't
 * silently drift from it. Status columns are stored as plain strings in the
 * database; the data layer (`lib/data/`) is the single place that narrows
 * them to the unions below.
 */

/** Uniform return shape for server actions. */
export type ActionResult = { success: true } | { success: false; error: string };

type Game = Pick<Tables<'games'>, 'id' | 'name' | 'slug'>;

export type TournamentStatus = 'scheduled' | 'live' | 'finished';

export type Tournament = Omit<
    Pick<
        Tables<'tournaments'>,
        'id' | 'name' | 'slug' | 'location' | 'prize_pool' | 'start_date' | 'end_date' | 'status'
    >,
    'status'
> & {
    status: TournamentStatus;
};

export type GameWithTournaments = Game & {
    tournaments: Tournament[];
};

export type Team = Pick<Tables<'teams'>, 'id' | 'name' | 'short_name' | 'slug'>;

export type MatchStatus = 'planned' | 'live' | 'finished';

export type Match = Omit<
    Pick<
        Tables<'matches'>,
        | 'id'
        | 'date'
        | 'team1_score'
        | 'team2_score'
        | 'winner_id'
        | 'status'
        | 'round'
        | 'stage'
        | 'group'
        | 'bracket'
    >,
    'date' | 'status'
> & {
    date: string;
    status: MatchStatus;
    team1: Team | null;
    team2: Team | null;
};

export type PredictionStats = {
    team1: number;
    team2: number;
    total: number;
};

export type StandingsRow = {
    user_id: string;
    username: string;
    points: number;
    total_predictions: number;
};
