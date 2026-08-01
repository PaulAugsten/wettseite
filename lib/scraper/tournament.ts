import type { Tournament } from '@/lib/scraper/_shared/types';
import { upsertTournaments } from './db';
import { getScraper, getScraperSlugs } from './registry';
import type { ScrapeTournamentsResult } from './types';

export async function scrapeTournaments(
    options: { persist?: boolean; recent?: boolean; gameSlug?: string } = {},
): Promise<ScrapeTournamentsResult> {
    const { persist = false, recent = false, gameSlug = '' } = options;

    const slugs = gameSlug ? [gameSlug] : getScraperSlugs();
    const tournaments: Tournament[] = [];

    for (const slug of slugs) {
        tournaments.push(...(await getScraper(slug).scrapeTournaments(recent)));
    }

    if (persist) {
        const persisted = await upsertTournaments(tournaments);
        return { scraped: tournaments.length, persisted };
    }

    console.log(tournaments);
    return { scraped: tournaments.length, persisted: 0 };
}
