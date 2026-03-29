import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { scrapeAllMatches } from './matches_scraper';

const siegegg_tournaments_url = 'https://siege.gg/competitions?page=1&tier=1&type=Major';
const liquipedia_tournaments_url = 'https://liquipedia.net/rainbowsix/S-Tier_Tournaments';
const game_slug = 'rainbow-six-siege';

export type Tournament = {
    id?: number;
    name: string;
    game_id: number;
    location: string;
    start_date: string;
    end_date: string;
    status: 'scheduled' | 'live' | 'finished';
    liquipedia_url: string;
    siegegg_url: string;
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

async function scrapeSiegeggTournamentPage(url: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const game_id = await getGameId();

    const siegegg_tournaments: Tournament[] = [];

    const next_button = $('.btn.btn-outline-secondary').filter(function () {
        return $(this).text().trim() === 'Next';
    });

    let has_next_page = true;
    if (next_button.attr('disabled')) has_next_page = false;

    $('.card.card--link.w-100').each((i, tournamentEl) => {
        const name = $(tournamentEl).find('.ml-1 > h2').text().trim();

        const location = $(tournamentEl).find('.meta__item.text-muted').first().text().trim();

        const tournament_duration = $(tournamentEl)
            .find('.meta__item.text-muted')
            .last()
            .text()
            .trim();

        const yearStr = name.split(' ').at(-1);
        if (!yearStr) return;
        const year = yearStr.trim();

        const { start_date, end_date } = parseDateRange(tournament_duration, parseInt(year));

        let status = 'live' as 'live' | 'scheduled' | 'finished';
        if (new Date() < start_date) {
            status = 'scheduled';
        } else if (new Date() > end_date) {
            status = 'finished';
        }

        const start_date_string = start_date.toISOString();
        const end_date_string = end_date.toISOString();

        const href = $(tournamentEl).attr('href');
        const url_parts = url.split('/');
        url_parts.pop();
        const tournament_url = url_parts.join('/') + href;

        siegegg_tournaments.push({
            name,
            game_id,
            location,
            start_date: start_date_string,
            end_date: end_date_string,
            status,
            liquipedia_url: '',
            siegegg_url: tournament_url,
        });
    });

    return { siegegg_tournaments, has_next_page };
}

async function scrapeSiegeggTournaments(url: string) {
    const siegegg_tournaments: Tournament[] = [];

    let current_url = url;
    let has_next_page = true;
    let page_index = 1;

    do {
        const { siegegg_tournaments: tournaments_on_page, has_next_page: hasNext } =
            await scrapeSiegeggTournamentPage(current_url);
        siegegg_tournaments.push(...tournaments_on_page);
        has_next_page = hasNext;
        current_url = current_url.replace(`page=${page_index}`, `page=${page_index + 1}`);
        page_index++;
    } while (has_next_page);

    return siegegg_tournaments;
}

async function scrapeLiquipediaTournaments(url: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const game_id = await getGameId();

    const liquipedia_tournaments: Tournament[] = [];

    $('.table2__row--body').each((i, tournamentEl) => {
        const name = $(tournamentEl).find('td > a').text().trim();

        const href = $(tournamentEl).find('td > a').attr('href');
        const url_parts = url.split('/');
        url_parts.pop();
        url_parts.pop();
        const tournament_url = url_parts.join('/') + href;

        liquipedia_tournaments.push({
            name,
            game_id,
            location: '',
            start_date: '',
            end_date: '',
            status: 'scheduled',
            liquipedia_url: tournament_url,
            siegegg_url: '',
        });
    });

    return liquipedia_tournaments;
}

async function scrapeTournaments(liquipedia_url: string, siegegg_url: string) {
    const liquipedia_tournaments = scrapeLiquipediaTournaments(liquipedia_url);
    const siegegg_tournaments = scrapeSiegeggTournaments(siegegg_url);

    const liquipedia_map = new Map(
        (await liquipedia_tournaments).map((t) => [
            t.name.replace('R6 ', '').split(' -')[0].split(' ').sort().join(' '),
            t,
        ]),
    );

    const tournaments = (await siegegg_tournaments).map((sg_tournament) => {
        const sorted_name = sg_tournament.name.split(' ').sort().join(' ');
        const lp_tournament = liquipedia_map.get(sorted_name);

        if (
            lp_tournament &&
            lp_tournament.liquipedia_url &&
            sg_tournament.name &&
            sg_tournament.game_id &&
            sg_tournament.location &&
            sg_tournament.start_date &&
            sg_tournament.end_date &&
            sg_tournament.status &&
            sg_tournament.siegegg_url
        ) {
            return {
                name: sg_tournament.name,
                game_id: sg_tournament.game_id,
                location: sg_tournament.location,
                start_date: sg_tournament.start_date,
                end_date: sg_tournament.end_date,
                status: sg_tournament.status,
                liquipedia_url: lp_tournament.liquipedia_url,
                siegegg_url: sg_tournament.siegegg_url,
            };
        }

        return null;
    });

    console.log(`Found ${tournaments.length} Tournaments.`);

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
        .from('tournaments')
        .upsert(tournaments, { onConflict: 'name' })
        .select();

    if (error || !data) {
        console.log('Error inserting tournaments into the DB:', error);
        return 0;
    }

    scrapeAllMatches(game_slug);
}

// scrapeSiegeggTournaments(siegegg_tournaments_url).catch(console.error);
scrapeTournaments(liquipedia_tournaments_url, siegegg_tournaments_url).catch(console.error);
