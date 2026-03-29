import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { type Tournament } from './tournaments_scraper';

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

    //{data?.tournaments.map((match: { id: number; name: string; status: string; slug: string }) => (

    return data.tournaments;
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
        const { data } = await axios.get(tournament.liquipedia_url);
        const $ = cheerio.load(data);

        $('.mw-heading.mw-heading2 > h2')
            .filter(function () {
                return $(this).text().trim() === 'Results';
            })
            .each((i, matchEl) => {
                console.log($(matchEl).text());
            });

        if (tournament.id) {
            // const group_matches = scrapeGroupMatches(tournament.id, tournament.lp_url);
            // const playoff_matches = scrapePlayoffMatches(tournament.id, tournament.sg_url);

            matches.push();
        } else {
            console.log(`Tournament has no id: ${JSON.stringify(tournament, null, 2)}`);
        }
    });

    const { data, error } = await supabase
        .from('tournaments')
        .upsert(tournaments, { onConflict: 'name' })
        .select();

    if (error || !data) {
        console.log('Error inserting tournaments into the DB:', error);
        return 0;
    }
}

scrapeAllMatches('rainbow-six-siege');
