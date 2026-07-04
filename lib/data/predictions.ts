import { createClient } from '@/lib/supabase/server';
import type { Match, PredictionStats, StandingsRow } from '@/lib/types';

export type MatchPredictions = {
    /** Community pick counts per match id. */
    stats: Map<number, PredictionStats>;
    /** The current user's picked team per match id (empty when logged out). */
    userPicks: Map<number, number>;
};

/**
 * Community prediction stats for a set of matches, plus the given user's own
 * picks. Query failures degrade to empty results rather than erroring the
 * page — predictions are auxiliary to the match list.
 */
export async function getMatchPredictions(
    matches: Pick<Match, 'id' | 'team1' | 'team2'>[],
    userId: string | undefined,
): Promise<MatchPredictions> {
    const stats = new Map<number, PredictionStats>();
    const userPicks = new Map<number, number>();

    if (matches.length === 0) {
        return { stats, userPicks };
    }

    const supabase = await createClient();
    const matchIds = matches.map((match) => match.id);

    const [allResult, userResult] = await Promise.all([
        supabase
            .from('predictions')
            .select('match_id, predicted_winner_id')
            .in('match_id', matchIds),
        userId
            ? supabase
                  .from('predictions')
                  .select('match_id, predicted_winner_id')
                  .eq('user_id', userId)
                  .in('match_id', matchIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    if (allResult.error) {
        console.error('Error fetching predictions:', allResult.error);
    }
    if (userResult.error) {
        console.error('Error fetching user predictions:', userResult.error);
    }

    const teamsByMatch = new Map(
        matches.map((match) => [match.id, { team1: match.team1?.id, team2: match.team2?.id }]),
    );

    for (const match of matches) {
        stats.set(match.id, { team1: 0, team2: 0, total: 0 });
    }

    for (const prediction of allResult.data ?? []) {
        const entry = stats.get(prediction.match_id);
        const teams = teamsByMatch.get(prediction.match_id);
        if (!entry || !teams) continue;

        entry.total += 1;
        if (prediction.predicted_winner_id === teams.team1) {
            entry.team1 += 1;
        } else if (prediction.predicted_winner_id === teams.team2) {
            entry.team2 += 1;
        }
    }

    for (const prediction of userResult.data ?? []) {
        if (prediction.predicted_winner_id !== null) {
            userPicks.set(prediction.match_id, prediction.predicted_winner_id);
        }
    }

    return { stats, userPicks };
}

/** Leaderboard for a tournament, backed by the `prediction_standings` view. */
export async function getStandings(tournamentId: number): Promise<StandingsRow[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('prediction_standings')
        .select('user_id, username, points, total_predictions')
        .eq('tournament_id', tournamentId);

    if (error) {
        console.error(`Error fetching standings for tournament ${tournamentId}:`, error);
        return [];
    }

    return data.map((row) => ({
        user_id: row.user_id ?? '',
        username: row.username ?? '',
        points: row.points ?? 0,
        total_predictions: row.total_predictions ?? 0,
    }));
}
