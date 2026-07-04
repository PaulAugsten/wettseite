import fs from 'node:fs';
import path from 'node:path';
import { collectMatches } from '@/supabase/functions/_shared/scraper/collect-matches.ts';
import { TeamResolver } from '@/supabase/functions/_shared/scraper/team-resolver.ts';
import { getGameIdBySlug, getTeamRecords, getTournaments, insertMatches } from './db';
import { reviewUnknownTeams } from './unknown-teams-review';

const WIKI = 'rainbowsix';

/** Local dry-run artifacts land here (gitignored). */
const SCRAPER_OUTPUT_DIR = 'scraper-output';

export type ScrapeMatchesResult = {
    scraped: number;
    persisted: number;
    unknownTeams: number;
};

/**
 * Scrapes matches for a game's tournaments from Liquipedia. Writes a debug
 * overview to `scraper-output/`, interactively reviews unknown team names,
 * and — with `persist` — inserts the matches. Throws on failure.
 */
export async function scrapeMatches(
    gameSlug: string,
    options: { persist?: boolean; tournamentIds?: number[] } = {},
): Promise<ScrapeMatchesResult> {
    const { persist = false, tournamentIds = [] } = options;

    const gameId = await getGameIdBySlug(gameSlug);
    if (!gameId) {
        throw new Error(`Game not found for slug: ${gameSlug}`);
    }

    const [tournaments, teams] = await Promise.all([
        getTournaments(gameId, tournamentIds),
        getTeamRecords(gameId),
    ]);

    if (tournaments.length === 0) {
        console.log(`No tournaments found for "${gameSlug}"`);
        return { scraped: 0, persisted: 0, unknownTeams: 0 };
    }

    const teamResolver = new TeamResolver(gameId, teams);

    const { matches, overview } = await collectMatches({
        wiki: WIKI,
        tournaments,
        teamResolver,
    });

    fs.mkdirSync(SCRAPER_OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(
        path.join(SCRAPER_OUTPUT_DIR, 'tournament_overview.json'),
        JSON.stringify(overview, null, 2),
        'utf-8',
    );

    const unknownTeams = teamResolver.getUnknownTeams();
    if (unknownTeams.length > 0) {
        await reviewUnknownTeams(unknownTeams, gameId);
    }

    if (persist) {
        const persisted = await insertMatches(matches);
        return { scraped: matches.length, persisted, unknownTeams: unknownTeams.length };
    }

    console.log(matches);
    return { scraped: matches.length, persisted: 0, unknownTeams: unknownTeams.length };
}
