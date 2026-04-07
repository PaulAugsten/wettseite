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
    bracket: string | null;
    round: string | null;
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

function cleanWikitext(text: string) {
    return text
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
        .replace(/<!--[\s\S]*?-->/g, (match) => `__COMMENT__${match}__END__`);
}

function parseMatch(text: string): Match | null {
    const match_id = getParam(text, 'r6esports');
    const team1_name = getParam(text, 'opponent1');
    const team2_name = getParam(text, 'opponent2');
    const status = getParam(text, 'finished');
    const date = getParam(text, 'date');

    console.log('id:' + match_id);
    console.log(team1_name);
    console.log(team2_name);
    console.log(status);
    console.log(date);

    if (!(match_id && team1_name && team2_name && status && date)) return null;

    return {
        match_id,
        tournament_id: 0,
        stage: null,
        group: null,
        bracket: null,
        round: null,
        team1_name,
        team2_name,
        team1_score: null,
        team2_score: null,
        status: 'finished',
        date,
    };
}

function getParam(text: string, key: string) {
    let regex = new RegExp(`\\|${key}=([^\\n|}]*)`);

    if (key === 'opponent1' || key === 'opponent2') {
        regex = new RegExp(`\\|${key}={{TeamOpponent\\|([^}]+)}}`);
    }

    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

function wikitextSplitStages(text: string) {
    const results: string[] = [];
    const lines = text.split('\n');

    let currentStage: string[] = [];
    let insideStage = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim().includes(`{{Stage`)) {
            if (insideStage && currentStage.length > 0) {
                results.push(currentStage.join('\n'));
            }

            currentStage = [line];
            insideStage = true;
            continue;
        }

        if (insideStage) {
            if (/^==([^=].*?)==$/.test(line.trim())) {
                results.push(currentStage.join('\n'));
                currentStage = [];
                insideStage = false;
                continue;
            }

            currentStage.push(line);
        }
    }

    if (results.length === 0) {
        console.log('No stages found');
        let insideResults = false;
        currentStage = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim().includes(`==Results==`)) {
                insideResults = true;
                currentStage = [line];

                continue;
            }

            if (insideResults) {
                if (/^==([^=].*?)==$/.test(line.trim())) {
                    if (currentStage.length > 0) {
                        results.push(currentStage.join('\n'));
                    }
                    break;
                }

                currentStage.push(line);
            }
        }

        if (insideStage && currentStage.length > 0) {
            results.push(currentStage.join('\n'));
        }
    }

    return results;
}

function getWikitextMatchesFromStage(text: string) {
    const matches: string[] = [];
    const lines = text.split('\n');

    let currentMatch: string[] = [];
    let insideMatch = false;
    let depth = 0;
    let openBraces = 0;
    let closedBraces = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/{{Match\b/.test(line.trim())) {
            if (insideMatch && currentMatch.length > 0) {
                matches.push(currentMatch.join('\n'));
            }

            currentMatch = [line];
            insideMatch = true;

            openBraces = (line.match(/\{/g) || []).length;
            closedBraces = (line.match(/\}/g) || []).length;
            depth = openBraces - closedBraces;

            if (depth === 0) {
                matches.push(currentMatch.join('\n'));
                currentMatch = [];
                insideMatch = false;
            }
            continue;
        }

        if (insideMatch) {
            currentMatch.push(line);

            openBraces = (line.match(/\{/g) || []).length;
            closedBraces = (line.match(/\}/g) || []).length;
            depth += openBraces - closedBraces;

            if (depth === 0) {
                matches.push(currentMatch.join('\n'));
                currentMatch = [];
                insideMatch = false;
            }
        }
    }

    if (insideMatch && currentMatch.length > 0) {
        matches.push(currentMatch.join('\n'));
    }

    return matches;
}

function extractTemplates(text: string, name: string) {
    const results = [];
    let i = 0;

    while (i < text.length) {
        if (text.startsWith(`{{${name}`, i)) {
            let depth = 0;
            const start = i;

            while (i < text.length) {
                if (text.startsWith('{{', i)) {
                    depth++;
                    i += 2;
                } else if (text.startsWith('}}', i)) {
                    depth--;
                    i += 2;
                    if (depth === 0) break;
                } else {
                    i++;
                }
            }

            results.push(text.slice(start, i));
        } else {
            i++;
        }
    }

    return results;
}

export async function getTournamentStages(wikitext: string) {
    //console.log(data);
    console.log(wikitext.search(`Stage`));
    /*
    const $ = cheerio.load(data);

    const results_div = $('.mw-heading.mw-heading2').filter(function () {
        return $(this).find('h2').text().trim() === 'Results';
    });

    let current = results_div.next();

    
    while (current.find('h2').length < 1) {
        if (current.find('h3').length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const stage = current.find('h3').text().trim();

            console.log(stage);
        }
        current = current.next();
    } */
}

export async function getAllTournamentPages(game_slug: string) {
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

    let counter = 0;
    let pages_string = '';
    do {
        const page = tournaments
            .at(counter)
            ?.url.replace('https://liquipedia.net/rainbowsix/', '')
            .replaceAll('/', '%2F');

        if (counter % 50 == 0) {
            pages_string = page || '';
        } else {
            pages_string = pages_string + '|' + page;
        }

        counter++;

        if (counter % 50 === 0 || counter === tournaments.length) {
            const wikitext_api_url = `https://liquipedia.net/rainbowsix/api.php?action=query&prop=revisions&titles=${pages_string}&rvprop=content&format=json`;

            console.log('Send batch');
            console.log(wikitext_api_url);

            const { data } = await axios.get(wikitext_api_url, {
                headers: {
                    'User-Agent': 'MatchesBot/0.3 (paulaugsten9@gmail.com)',
                },
            });

            const pages = data.query.pages;

            for (const pageId in data.query.pages) {
                const page = pages[pageId];
                const wikitext = page.revisions[0]['*'];
                console.log(`Page: ${page.title}`);

                const stages = wikitextSplitStages(wikitext);

                console.log('stages:', stages.length);

                for (const stage in stages) {
                    const matches = getWikitextMatchesFromStage(stages[stage]);

                    for (const match in matches) {
                        console.log(parseMatch(matches[match]));
                    }
                    console.log(matches.length);
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    } while (counter < tournaments.length);

    /* const { data, error } = await supabase
        .from('tournaments')
        .upsert(tournaments, { onConflict: 'name' })
        .select();

    if (error || !data) {
        console.log('Error inserting tournaments into the DB:', error);
        return 0;
    }*/
}

getAllTournamentPages('rainbow-six-siege');
