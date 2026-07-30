/**
 * Scrapes matches for a game's tournaments from Liquipedia.
 * Dry run by default; pass --persist to write to the database.
 *
 * Usage: pnpm scrape:matches [--persist] [--active] [--tournaments=1,2,3]
 */
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { scrapeMatches } from '../lib/scraper/matches';
import { reviewUnknownTeams, writeUnknownTeamsReview } from '../lib/scraper/unknown-teams-review';

const SCRAPER_OUTPUT_DIR = 'scraper-output';

const persist = process.argv.includes('--persist');
const active = process.argv.includes('--active');
const tournamentIds =
    process.argv
        .find((arg) => arg.startsWith('--tournaments='))
        ?.split('=')[1]
        ?.split(',')
        .map(Number)
        .filter(Number.isInteger) ?? [];

async function main() {
    const result = await scrapeMatches({ persist, active, tournamentIds });

    console.log(
        `Scraped ${result.scraped} matches${persist ? `, persisted ${result.persisted}` : ' (dry run)'}` +
            (result.unknownTeams > 0 ? `, ${result.unknownTeams} unknown teams` : '') +
            (result.tournamentsFinished > 0
                ? `, ${result.tournamentsFinished} tournaments finished`
                : ''),
    );

    const overviews = result.perGame.filter((game) => game.overview !== undefined);
    if (overviews.length > 0) {
        fs.mkdirSync(SCRAPER_OUTPUT_DIR, { recursive: true });
        for (const game of overviews) {
            fs.writeFileSync(
                path.join(SCRAPER_OUTPUT_DIR, `tournaments_overview_${game.gameSlug}.json`),
                JSON.stringify(game.overview, null, 2),
                'utf-8',
            );
        }
    }

    for (const game of result.perGame) {
        if (process.stdin.isTTY) {
            await reviewUnknownTeams(game.unknownTeams, game.gameId);
        } else {
            writeUnknownTeamsReview(game.unknownTeams, game.gameId);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
