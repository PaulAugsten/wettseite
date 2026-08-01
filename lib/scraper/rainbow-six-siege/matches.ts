import { collectMatches } from '@/lib/scraper/_shared/liquipedia/collect-matches.ts';
import { TeamResolver, type UnknownTeam } from '@/lib/scraper/_shared/team-resolver';
import type { Match } from '../_shared/types';
import { getGameIdBySlug, getTeamRecords, getTournaments } from '../db';
import { GAME_SLUG, WIKI } from './index.ts';

/**
 * Scrapes matches for a game's tournaments from Liquipedia.
 */
export async function scrapeRainbowSixSiegeMatches(tournamentIds: number[]): Promise<{
    gameId: number;
    matches: Match[];
    unknownTeams: UnknownTeam[];
    overview: unknown;
}> {
    const gameId = await getGameIdBySlug(GAME_SLUG);
    if (!gameId) {
        throw new Error(`Game not found for slug: ${GAME_SLUG}`);
    }

    const [tournaments, teams] = await Promise.all([
        getTournaments(gameId, tournamentIds),
        getTeamRecords(gameId),
    ]);

    if (tournaments.length === 0) {
        console.log(`No tournaments found for "${GAME_SLUG}"`);
        return { gameId, matches: [], unknownTeams: [], overview: [] };
    }

    const teamResolver = new TeamResolver(gameId, teams);

    const { matches, overview } = await collectMatches({
        wiki: WIKI,
        tournaments,
        teamResolver,
    });

    return {
        gameId,
        matches,
        unknownTeams: teamResolver.getUnknownTeams(),
        overview,
    };
}
