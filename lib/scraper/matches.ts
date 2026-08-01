import type { Match } from '@/lib/scraper/_shared/types';
import {
    getActiveTournamentIds,
    getUniqueGameSlugsFromTournamentIds,
    insertMatches,
    refreshTournamentStatus,
} from './db';
import { getScraper, getScraperSlugs } from './registry';
import type { GameMatchResult, GameScraper, ScrapeMatchesResult } from './types';

export async function scrapeMatches(
    options: { persist?: boolean; active?: boolean; tournamentIds?: number[] } = {},
): Promise<ScrapeMatchesResult> {
    const { persist = false, active = false } = options;

    const matches: Match[] = [];
    const perGame: GameMatchResult[] = [];
    let tournamentIds = options.tournamentIds ?? [];

    if (active) {
        const activeIds = await getActiveTournamentIds();
        tournamentIds =
            tournamentIds.length > 0
                ? tournamentIds.filter((id) => activeIds.includes(id))
                : activeIds;
    }

    // TODO: add --all tag so it is possible to scrape matches from all tournaments
    if (active && tournamentIds.length === 0) {
        console.log('No active tournaments found');
        return {
            scraped: 0,
            persisted: 0,
            unknownTeams: 0,
            perGame: [],
            tournamentsFinished: 0,
        };
    }

    const gameSlugs =
        tournamentIds.length > 0
            ? await getUniqueGameSlugsFromTournamentIds(tournamentIds)
            : getScraperSlugs();

    for (const gameSlug of gameSlugs) {
        const scraper: GameScraper = getScraper(gameSlug);

        const result = await scraper.scrapeMatches(tournamentIds);

        matches.push(...result.matches);
        perGame.push({
            gameSlug,
            gameId: result.gameId,
            unknownTeams: result.unknownTeams,
            overview: result.overview,
        });
    }

    const unknownTeams = perGame.reduce((sum, game) => sum + game.unknownTeams.length, 0);

    if (persist) {
        // duplications are handled from supabase via unique hashkeys based on teams, tournament, stage and round
        const persisted = await insertMatches(matches);
        const tournamentsFinished = await refreshTournamentStatus();
        return { scraped: matches.length, persisted, unknownTeams, perGame, tournamentsFinished };
    }

    console.log(matches);
    return {
        scraped: matches.length,
        persisted: 0,
        unknownTeams,
        perGame,
        tournamentsFinished: 0,
    };
}
