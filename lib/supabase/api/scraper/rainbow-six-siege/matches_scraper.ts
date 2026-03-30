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
    const { data } = await axios.get(url);
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

        while (current.find('h2').length < 1) {
            if (current.find('h3').length > 0) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                const stage = current.find('h3').text().trim();
                const edit_url = 'https://liquipedia.net' + current.find('a').attr('href');

                Array.prototype.unshift.apply(matches, await scrapeStage(stage, edit_url));

                console.log(stage);
                console.log(edit_url);
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
