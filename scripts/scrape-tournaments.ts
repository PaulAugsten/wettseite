/**
 * Scrapes S-Tier tournaments from Liquipedia.
 * Dry run by default; pass --persist to write to the database.
 *
 * Usage: pnpm scrape:tournaments [--persist]
 */
import 'dotenv/config';
import { scrapeTournaments } from '../lib/scraper/tournament';

const persist = process.argv.includes('--persist');
const recent = process.argv.includes('--recent');
const gameSlug = process.argv.find((arg) => arg.startsWith('--game='))?.split('=')[1] ?? '';

scrapeTournaments({ persist, recent, gameSlug })
    .then((result) => {
        console.log(
            `Scraped ${result.scraped} tournaments${persist ? `, persisted ${result.persisted}` : ' (dry run)'}`,
        );
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
