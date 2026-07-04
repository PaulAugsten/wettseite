import { createClient } from '@/lib/supabase/server';
import type { GameWithTournaments } from '@/lib/types';
import { TOURNAMENT_FIELDS, toTournament } from './tournaments';

/**
 * Games that currently have at least one live tournament, for the home page.
 * Returns `null` on query failure (as opposed to an empty result).
 */
export async function getGamesWithLiveTournaments(): Promise<GameWithTournaments[] | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('games')
        .select(`id, name, slug, tournaments (${TOURNAMENT_FIELDS})`)
        .eq('tournaments.status', 'live');

    if (error) {
        console.error('Error fetching games with live tournaments:', error);
        return null;
    }

    return data
        .filter((game) => game.tournaments.length > 0)
        .map((game) => ({
            id: game.id,
            name: game.name,
            slug: game.slug,
            tournaments: game.tournaments.map(toTournament),
        }));
}

/**
 * A single game and all of its tournaments (newest first).
 * Returns `null` when the game doesn't exist or the query fails.
 */
export async function getGameWithTournaments(slug: string): Promise<GameWithTournaments | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('games')
        .select(`id, name, slug, tournaments (${TOURNAMENT_FIELDS})`)
        .eq('slug', slug)
        .order('start_date', { referencedTable: 'tournaments', ascending: false })
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error(`Error fetching game "${slug}":`, error);
        }
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        tournaments: data.tournaments.map(toTournament),
    };
}
