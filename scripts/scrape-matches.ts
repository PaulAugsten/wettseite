/**
 * Scrapes matches for a game's tournaments from Liquipedia.
 * Dry run by default; pass --persist to write to the database.
 *
 * Usage: pnpm scrape:matches [--persist] [--tournaments=1,2,3]
 */
import 'dotenv/config';
import { scrapeMatches } from '../lib/scraper/rainbow-six-siege/matches';

const persist = process.argv.includes('--persist');
const tournamentIds =
    process.argv
        .find((arg) => arg.startsWith('--tournaments='))
        ?.split('=')[1]
        ?.split(',')
        .map(Number)
        .filter(Number.isInteger) ?? [];

scrapeMatches('rainbow-six-siege', { persist, tournamentIds })
    .then((result) => {
        console.log(
            `Scraped ${result.scraped} matches${persist ? `, persisted ${result.persisted}` : ' (dry run)'}` +
                (result.unknownTeams > 0 ? `, ${result.unknownTeams} unknown teams` : ''),
        );
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
