import { createAdminClient } from '@/lib/supabase/admin';
import type { TablesInsert } from '@/lib/supabase/database.types';
import type { TeamRecord } from '@/supabase/functions/_shared/scraper/team-resolver.ts';
import type { Match, Tournament } from '@/supabase/functions/_shared/scraper/types.ts';

/**
 * Database access for the scraper. Uses the service-role client — this code
 * only runs in trusted contexts (cron route, local CLI), never in the app.
 */

export async function getGameIdBySlug(slug: string): Promise<number | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.from('games').select('id').eq('slug', slug).single();

    if (error) {
        console.error(`Error resolving game id for slug "${slug}":`, error);
        return null;
    }

    return data.id;
}

export async function getTournaments(
    gameId: number,
    tournamentIds: number[] = [],
): Promise<Tournament[]> {
    const supabase = createAdminClient();

    let query = supabase.from('tournaments').select('*').eq('game_id', gameId);
    if (tournamentIds.length > 0) {
        query = query.in('id', tournamentIds);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Error fetching tournaments: ${error.message}`);
    }

    return data.map((row) => ({
        id: row.id,
        name: row.name,
        game_id: row.game_id,
        location: row.location ?? '',
        prize_pool: row.prize_pool ?? '',
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status as Tournament['status'],
        url: row.url ?? '',
    }));
}

export async function getTeamRecords(gameId: number): Promise<TeamRecord[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('teams')
        .select('id, name, team_aliases (alias)')
        .eq('game_id', gameId);

    if (error) {
        throw new Error(`Error fetching teams: ${error.message}`);
    }

    return data.map((team) => ({
        id: team.id,
        name: team.name,
        aliases: team.team_aliases.map((alias) => alias.alias),
    }));
}

// `tournaments.slug` and `matches.id` are filled in by database triggers, so
// the scraper payloads legitimately omit them even though the generated
// Insert types require them; hence the casts below.

export async function upsertTournaments(tournaments: Tournament[]): Promise<number> {
    const supabase = createAdminClient();

    const rows: Omit<TablesInsert<'tournaments'>, 'slug'>[] = tournaments;
    const { error } = await supabase
        .from('tournaments')
        .upsert(rows as TablesInsert<'tournaments'>[], { onConflict: 'name' });

    if (error) {
        throw new Error(`Error upserting tournaments: ${error.message}`);
    }

    return tournaments.length;
}

export async function insertMatches(matches: Match[]): Promise<number> {
    if (matches.length === 0) return 0;

    const supabase = createAdminClient();

    // use insert here instead of upsert, as conflicts are handled in the db by a before insert trigger
    const rows: Omit<TablesInsert<'matches'>, 'id'>[] = matches;
    const { error } = await supabase.from('matches').insert(rows as TablesInsert<'matches'>[]);

    if (error) {
        throw new Error(`Error inserting matches: ${error.message}`);
    }

    return matches.length;
}
