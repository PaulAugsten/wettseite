import { createClient } from '@/lib/supabase/server';
import type { Match, MatchStatus, Team, Tournament, TournamentStatus } from '@/lib/types';

export const TOURNAMENT_FIELDS =
    'id, name, slug, location, prize_pool, start_date, end_date, status';

const TEAM_FIELDS = 'id, name, short_name, slug';

const MATCH_FIELDS = `id, date, team1_score, team2_score, winner_id, status, round, stage, "group", bracket,
    team1:teams!matches_team1_id_fkey (${TEAM_FIELDS}),
    team2:teams!matches_team2_id_fkey (${TEAM_FIELDS})`;

export type TournamentWithMatches = Tournament & {
    matches: Match[];
};

/**
 * Status columns are plain strings in the database; narrow them here — the
 * single boundary between raw rows and domain types — with a safe fallback.
 */
function toTournamentStatus(status: string): TournamentStatus {
    return status === 'live' || status === 'finished' ? status : 'scheduled';
}

function toMatchStatus(status: string | null): MatchStatus {
    return status === 'live' || status === 'finished' ? status : 'planned';
}

type TournamentRow = {
    id: number;
    name: string;
    slug: string;
    location: string | null;
    prize_pool: string | null;
    start_date: string;
    end_date: string;
    status: string;
};

export function toTournament(row: TournamentRow): Tournament {
    return { ...row, status: toTournamentStatus(row.status) };
}

type MatchRow = Omit<Match, 'date' | 'status' | 'team1' | 'team2'> & {
    date: string | null;
    status: string | null;
    team1: Team | null;
    team2: Team | null;
};

function toMatch(row: MatchRow): Match {
    return {
        ...row,
        date: row.date ?? '',
        status: toMatchStatus(row.status),
    };
}

/**
 * A tournament (scoped to its game slug) with all matches, ordered by date.
 * Returns `null` when it doesn't exist or the query fails.
 */
export async function getTournamentWithMatches(
    gameSlug: string,
    tournamentSlug: string,
): Promise<TournamentWithMatches | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tournaments')
        .select(
            `${TOURNAMENT_FIELDS},
            matches!matches_tournament_id_fkey (${MATCH_FIELDS}),
            games!inner(slug)`,
        )
        .eq('slug', tournamentSlug)
        .eq('games.slug', gameSlug)
        .order('date', { referencedTable: 'matches', ascending: true })
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error(`Error fetching tournament "${gameSlug}/${tournamentSlug}":`, error);
        }
        return null;
    }

    const { matches, games: _games, ...tournament } = data;

    return {
        ...toTournament(tournament),
        matches: matches.map(toMatch),
    };
}
