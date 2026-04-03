import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { type Tournament } from './tournaments_scraper';
import { scrapeGroupMatches } from './groupmatches_scraper';
import { scrapePlayoffMatches } from './playoffmatches_scraper';

type Match = {
    match_id: string;
    tournament_id: number;
    stage: string | null;
    group: string | null;
    bracket: string;
    round: string;
    team1_name: string;
    team2_name: string;
    team1_score: number | null;
    team2_score: number | null;
    status: 'planned' | 'live' | 'finished';
    date: string;
};

async function getAllTournamentsFromDB(game_slug: string): Promise<Tournament[]> {
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
        .select(`*, tournaments(*)`)
        .eq('slug', game_slug)
        .single();

    if (error || !data) {
        console.log('Error getting tournaments from DB:', error);
        return [];
    }

    return data.tournaments;
}

export async function scrapeStage(stage: string, url: string) {
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'MatchesBot/0.3 (paulaugsten9@gmail.com)',
        },
    });
    const $ = cheerio.load(data);

    const stage_matches: Match[] = [];

    const code_div = $('.CodeMirror-code [role*="presentation"]');

    //console.log(code_div.text());
    return stage_matches;
}

export async function scrapeAllMatches(game_slug: string) {
    const matches: Match[] = [];

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

    const tournaments = await getAllTournamentsFromDB(game_slug);

    // console.log(tournaments);

    let counter = 0;
    let pages_string = '';
    do {
        const page = tournaments.at(counter)?.url.replace('https://liquipedia.net/rainbowsix/', '');

        if (counter % 50 == 0) {
            pages_string = page || '';
        } else {
            pages_string = pages_string + '|' + page;
        }

        counter++;

        if (counter % 50 === 0 || counter === tournaments.length - 1) {
            const api_url = `https://liquipedia.net/rainbowsix/api.php?action=query&prop=revisions&titles=${pages_string}&rvprop=content&format=json`;
            console.log('Send batch');
            console.log(api_url);
        }
    } while (counter < tournaments.length);

    /*
    tournaments.map(async (tournament) => {
        const { data } = await axios.get(tournament.url);
        const $ = cheerio.load(data);

        if (!tournament.id) {
            console.log(`Tournament has no id: ${JSON.stringify(tournament, null, 2)}`);
            return;
        }

        const results_div = $('.mw-heading.mw-heading2').filter(function () {
            return $(this).find('h2').text().trim() === 'Results';
        });

        let current = results_div.next();

        const api_url = `https://liquipedia.net/rainbowsix/api.php?action=query&prop=revisions&titles=${tournament.url.replace('https://liquipedia.net/rainbowsix/', '')}&rvprop=content&format=json`;

        const wikitext = await axios.get(api_url);

        while (current.find('h2').length < 1) {
            if (current.find('h3').length > 0) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const stage = current.find('h3').text().trim();

                // Array.prototype.unshift.apply(matches, await scrapeStage(stage, api_url));

                console.log(stage);
                console.log(api_url);
            }
            current = current.next();
        }
    });

    /* const { data, error } = await supabase
        .from('tournaments')
        .upsert(tournaments, { onConflict: 'name' })
        .select();

    if (error || !data) {
        console.log('Error inserting tournaments into the DB:', error);
        return 0;
    }*/
}

scrapeAllMatches('rainbow-six-siege');
