import * as cheerio from 'cheerio';
import { fetchParsedHtml, pageTitleFromUrl } from '@/lib/scraper/_shared/liquipedia/liquipedia.ts';
import type { Tournament, TournamentStatus } from '@/lib/scraper/_shared/types';
import { getGameIdBySlug } from '../db';
import { GAME_SLUG, TOURNAMENTS_URL, WIKI } from './index.ts';

/** Reads a Liquipedia page's HTML through the API, which is not bot-gated. */
function fetchHtml(url: string): Promise<string> {
    return fetchParsedHtml(WIKI, pageTitleFromUrl(url, WIKI));
}

// TODO: migrate from html to wikitext scraping

export async function getTournamentMetaData(
    url: string,
    gameId: number,
): Promise<Tournament | null> {
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

    if (Number.isNaN(start_date.getTime()) || Number.isNaN(end_date.getTime())) {
        console.warn(`Skipping "${name || url}": missing or unparseable start/end date`);
        return null;
    }

    end_date.setHours(23, 59, 59);

    let status: TournamentStatus = 'live';
    if (new Date() < start_date) {
        status = 'scheduled';
    } else if (new Date(Date.now() - 86400000) > end_date) {
        // give 1 day buffer to let matches handle the automatic setting of "finished"
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

export function filterByTournamentName(name: string): boolean {
    const isTargetTier =
        name.includes('Major') ||
        name.includes('Invitational') ||
        name.includes('World Cup') ||
        name.includes('RE:L0:AD');

    return isTargetTier && !name.includes('One');
}

/**
 * Scrapes S-Tier tournament metadata from Liquipedia.
 */
export async function scrapeRainbowSixSiegeTournaments(recent: boolean): Promise<Tournament[]> {
    const gameId = await getGameIdBySlug(GAME_SLUG);
    if (!gameId) {
        throw new Error(`Game not found for slug: ${GAME_SLUG}`);
    }

    const $ = cheerio.load(await fetchHtml(TOURNAMENTS_URL));

    const tournaments: Tournament[] = [];
    let tournamentElements = $('.table2__row--body').toArray();
    if (!recent) {
        tournamentElements = tournamentElements.toReversed();
    }

    for (const tournamentEl of tournamentElements) {
        const cancelled =
            $(tournamentEl).find('[style*="text-decoration:line-through"]').length > 0;
        if (cancelled) continue;

        const name = $(tournamentEl).find('td > a').text().trim();
        if (!filterByTournamentName(name)) continue;

        const href = $(tournamentEl).find('td > a').attr('href');
        if (!href) continue;

        // `action=parse` is capped at one request per 30s, so say what we wait on.
        console.log(`Fetching ${name}...`);
        const tournament = await getTournamentMetaData(`https://liquipedia.net${href}`, gameId);
        if (!tournament) continue;

        tournaments.push(tournament);

        // only save 5 most recent tournaments
        if (recent && tournaments.length >= 5) {
            break;
        }
    }

    return tournaments;
}
