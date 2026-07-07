import * as cheerio from 'cheerio';
import type { Tournament, TournamentStatus } from '@/supabase/functions/_shared/scraper/types.ts';
import { getGameIdBySlug, upsertTournaments } from './db';

const GAME_SLUG = 'rainbow-six-siege';
const TOURNAMENTS_URL = 'https://liquipedia.net/rainbowsix/S-Tier_Tournaments';

async function fetchHtml(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.text();
}

export async function getTournamentMetaData(url: string, gameId: number): Promise<Tournament> {
    const $ = cheerio.load(await fetchHtml(url));

    const name =
        $('.infobox-header.wiki-backgroundcolor-light')
            .not('.infobox-header-2')
            .contents()
            .filter(function () {
                return this.type === 'text';
            })
            .first()
            .text()
            .trim()
            .replace('R6 ', '')
            .split(' -')[0] ?? '';

    const infoboxValue = (label: string) =>
        $('.infobox-cell-2.infobox-description')
            .filter(function () {
                return $(this).text().trim() === label;
            })
            .next();

    const locationCell = infoboxValue('Location:');
    const locationCity = locationCell.html()?.trim().split('&nbsp;')[1]?.split('<br>')[0] ?? '';
    const locationCountry = locationCell.find('a').attr('title') ?? '';
    const location = `${locationCity}, ${locationCountry}`;

    const prize_pool = infoboxValue('Prize Pool:').text().trim();

    // TODO: derive start/end from the first and last match once available
    const start_date = new Date(infoboxValue('Start Date:').text().trim());
    const end_date = new Date(infoboxValue('End Date:').text().trim());
    end_date.setHours(23, 59, 59);

    let status: TournamentStatus = 'live';
    if (new Date() < start_date) {
        status = 'scheduled';
    } else if (new Date().getDate() > end_date.getDate() + 1) {
        // TODO: make "live" dependent on the status of the last game
        status = 'finished';
    }

    return {
        name,
        game_id: gameId,
        location,
        prize_pool,
        start_date: start_date.toISOString(),
        end_date: end_date.toISOString(),
        status,
        url,
    };
}

export function shouldIncludeTournament(name: string): boolean {
    const isTargetTier =
        name.includes('Major') ||
        name.includes('Invitational') ||
        name.includes('World Cup') ||
        name.includes('RE:L0:AD');

    return isTargetTier && !name.includes('One');
}

export type ScrapeTournamentsResult = {
    scraped: number;
    persisted: number;
};

/**
 * Scrapes S-Tier tournament metadata from Liquipedia. With `persist`, upserts
 * the result into the `tournaments` table (matched on name); otherwise it's a
 * dry run that only logs what it found. Throws on scrape or database failure.
 */
export async function scrapeTournaments(
    options: { persist?: boolean } = {},
): Promise<ScrapeTournamentsResult> {
    const { persist = false } = options;

    const gameId = await getGameIdBySlug(GAME_SLUG);
    if (!gameId) {
        throw new Error(`Game not found for slug: ${GAME_SLUG}`);
    }

    const $ = cheerio.load(await fetchHtml(TOURNAMENTS_URL));

    const tournaments: Tournament[] = [];
    const tournamentElements = $('.table2__row--body').toArray().toReversed();

    for (const tournamentEl of tournamentElements) {
        const cancelled =
            $(tournamentEl).find('[style*="text-decoration:line-through"]').length > 0;
        if (cancelled) continue;

        const name = $(tournamentEl).find('td > a').text().trim();
        if (!shouldIncludeTournament(name)) continue;

        const href = $(tournamentEl).find('td > a').attr('href');
        if (!href) continue;

        tournaments.push(await getTournamentMetaData(`https://liquipedia.net${href}`, gameId));
    }

    if (persist) {
        const persisted = await upsertTournaments(tournaments);
        return { scraped: tournaments.length, persisted };
    }

    console.log(tournaments);
    return { scraped: tournaments.length, persisted: 0 };
}
