import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { scrapeAllMatches } from './matches_scraper';
import { text } from 'stream/consumers';

const liquipedia_tournaments_url = 'https://liquipedia.net/rainbowsix/S-Tier_Tournaments';
const game_slug = 'rainbow-six-siege';

export type Tournament = {
    id?: number;
    name: string;
    game_id: number;
    location: string;
    prize_pool: string;
    start_date: string;
    end_date: string;
    status: 'scheduled' | 'live' | 'finished';
    url: string;
};

async function getGameId() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );

    const { data, error } = await supabase
        .from('games')
        .select('id')
        .eq('slug', game_slug)
        .single();

    if (error || !data) {
        console.log('Could not find game id');
        return 0;
    }
    return data.id;
}

function parseDateRange(input: string, year: number) {
    // input has format: "Feb 2 - 15" or "Jul 31 – Aug 4"
    const month_map: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
    };

    const normalized = input.replace(/[–—]/g, '-');
    const parts = normalized.split(' - ').map((p) => p.trim());

    if (parts.length !== 2) {
        throw new Error(`Invalid date range format: ${input}`);
    }

    const start_parts = parts[0].split(' ');
    const start_month = start_parts[0].replace('.', '');
    const start_day = parseInt(start_parts[1]);

    const end_parts = parts[1].split(' ');
    let end_month: string;
    let end_day: number;

    if (end_parts.length === 1) {
        end_month = start_month;
        end_day = parseInt(end_parts[0]);
    } else {
        end_month = end_parts[0].replace('.', '');
        end_day = parseInt(end_parts[1]);
    }

    const start_month_index = month_map[start_month];
    const end_month_index = month_map[end_month];

    if (start_month_index === undefined) {
        throw new Error(`Invalid start month: ${start_month} from input: ${input}`);
    }
    if (end_month_index === undefined) {
        throw new Error(`Invalid end month: ${end_month} from input: ${input}`);
    }

    const start_date = new Date(Date.UTC(year, start_month_index, start_day, 0, 0, 0));
    const end_date = new Date(Date.UTC(year, end_month_index, end_day, 23, 59, 59));

    return { start_date, end_date };
}

async function getTournamentMetaData(url: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const name = $('.infobox-header.wiki-backgroundcolor-light')
        .not('.infobox-header-2')
        .contents()
        .filter(function () {
            return this.type === 'text';
        })
        .first()
        .text()
        .trim()
        .replace('R6 ', '')
        .split(' -')[0];

    const game_id = await getGameId();

    const location =
        $('.infobox-cell-2.infobox-description')
            .filter(function () {
                return $(this).text().trim() === 'Location:';
            })
            .next()
            .html()
            ?.trim()
            .split('&nbsp;')[1]
            .split('<br>')[0] +
        ', ' +
        $('.infobox-cell-2.infobox-description')
            .filter(function () {
                return $(this).text().trim() === 'Location:';
            })
            .next()
            .find('a')
            .attr('title');

    const prize_pool = $('.infobox-cell-2.infobox-description')
        .filter(function () {
            return $(this).text().trim() === 'Prize Pool:';
        })
        .next()
        .text()
        .trim();

    //console.log(prize_pool.replace('$', '').replace('USD', '').replaceAll(',', ''));

    // TODO: implement dynamic changing of start and end based on the first and last game (timewise)
    const start_date = new Date(
        $('.infobox-cell-2.infobox-description')
            .filter(function () {
                return $(this).text().trim() === 'Start Date:';
            })
            .next()
            .text()
            .trim(),
    );
    const end_date = new Date(
        $('.infobox-cell-2.infobox-description')
            .filter(function () {
                return $(this).text().trim() === 'End Date:';
            })
            .next()
            .text()
            .trim(),
    );
    end_date.setHours(23, 59, 59);

    let status = 'live' as 'live' | 'scheduled' | 'finished';
    if (new Date() < start_date) {
        status = 'scheduled';
    } else if (new Date() > end_date) {
        status = 'finished';
    }

    const start_date_string = start_date.toISOString();
    const end_date_string = end_date.toISOString();

    const tournament: Tournament = {
        name,
        game_id,
        location,
        prize_pool,
        start_date: start_date_string,
        end_date: end_date_string,
        status,
        url,
    };

    return tournament;
}

async function scrapeTournaments(url: string, insert_into_db: boolean) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const tournaments: Tournament[] = [];

    const tournamentElements = $('.table2__row--body').toArray().toReversed();

    for (const tournamentEl of tournamentElements) {
        const tournamentCancelled =
            $(tournamentEl).find('[style*="text-decoration:line-through"]').length > 0;

        if (tournamentCancelled) {
            continue;
        }

        const name = $(tournamentEl).find('td > a').text().trim();

        if (
            !(
                name.includes('Major') ||
                name.includes('Invitational') ||
                name.includes('World Cup') ||
                name.includes('Gamers8') ||
                name.includes('RE:L0:AD')
            ) ||
            name.includes('One')
        ) {
            continue;
        }
        const href = $(tournamentEl).find('td > a').attr('href');
        const url_parts = url.split('/');
        url_parts.pop();
        url_parts.pop();
        const tournament_url = url_parts.join('/') + href;

        const metadata = await getTournamentMetaData(tournament_url);

        if (metadata) {
            {
                tournaments.push(metadata);
            }
        }
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );

    if (insert_into_db) {
        const { error } = await supabase
            .from('tournaments')
            .upsert(tournaments, { onConflict: 'name' })
            .select();

        if (error) {
            console.log('Error inserting tournaments into the DB:', error);
            return 0;
        }
    } else {
        console.log(tournaments);
    }

    // scrapeAllMatches(game_slug);
}

scrapeTournaments(liquipedia_tournaments_url, false).catch(console.error);
