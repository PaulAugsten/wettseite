/**
 * Scrapes S-Tier tournaments from Liquipedia.
 * Dry run by default; pass --persist to write to the database.
 *
 * Usage: pnpm scrape:tournaments [--persist]
 */
import 'dotenv/config';
import { scrapeTournaments } from '../lib/scraper/rainbow-six-siege/tournaments';

const persist = process.argv.includes('--persist');

scrapeTournaments({ persist })
    .then((result) => {
        console.log(
            `Scraped ${result.scraped} tournaments${persist ? `, persisted ${result.persisted}` : ' (dry run)'}`,
        );
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
