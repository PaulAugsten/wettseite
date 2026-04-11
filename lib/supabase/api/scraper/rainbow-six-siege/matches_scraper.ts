import 'dotenv/config';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { type Tournament } from './tournaments_scraper';
import fs from 'fs';

type Match = {
    match_id: number;
    tournament_id: number | undefined;
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

type TournamentOverview = {
    pageId: string;
    title: string;
    totalStages: number;
    totalMatches: number;
    stages: {
        stageIndex: number;
        matchCount: number;
        matches: Match[];
    }[];
};

const TIMEZONE_OFFSETS: Record<string, string> = {
    // America
    PST: '-08:00', // Pacific Standard Time
    PDT: '-07:00', // Pacific Daylight Time
    MST: '-07:00', // Mountain Standard Time
    MDT: '-06:00', // Mountain Daylight Time
    CST: '-06:00', // Central Standard Time
    CDT: '-05:00', // Central Daylight Time
    EST: '-05:00', // Eastern Standard Time
    EDT: '-04:00', // Eastern Daylight Time
    BRT: '-03:00', // Brasilia Time
    ART: '-03:00', // Argentina Time

    // Europe
    GMT: '+00:00', // Greenwich Mean Time
    UTC: '+00:00', // Coordinated Universal Time
    WET: '+00:00', // Western European Time
    CET: '+01:00', // Central European Time
    CEST: '+02:00', // Central European Summer Time
    EET: '+02:00', // Eastern European Time
    EEST: '+03:00', // Eastern European Summer Time

    // Asia
    JST: '+09:00', // Japan Standard Time
    KST: '+09:00', // Korea Standard Time
    SGT: '+08:00', // Singapore Time
    HKT: '+08:00', // Hong Kong Time
    CST_CHINA: '+08:00', // China Standard Time

    // Australia
    AEST: '+10:00', // Australian Eastern Standard Time
    AEDT: '+11:00', // Australian Eastern Daylight Time
    AWST: '+08:00', // Australian Western Standard Time
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

function getParam(text: string, key: string) {
    let regex = new RegExp(`\\|${key}=([^\\n|}]*)`);

    if (key === 'opponent1' || key === 'opponent2') {
        regex = new RegExp(`\\|${key}={{TeamOpponent\\|([^}]+)}}`);
    } else if (key === 'date') {
        regex = new RegExp(`\\|${key}=([^\\n|]*)`);
    } else if (key === 'Stage') {
        regex = /===\{\{Stage\|(.+?)\}\}===/;
    }

    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

function parseWikitextDate(dateText: string): string | null {
    const timezoneMatch = dateText.match(/{{Abbr\/([A-Z]+)}}/);
    const timezoneCode = timezoneMatch ? timezoneMatch[1] : 'UTC';

    const cleanedDateText = dateText
        .replace(/\s*{{Abbr\/[A-Z]+}}/, '')
        .trim()
        .replace(' - ', ' ')
        .replace('st', '')
        .replace('nd', '')
        .replace('rd', '')
        .replace('th', '');

    const parsedDate = new Date(cleanedDateText);

    if (isNaN(parsedDate.getTime())) {
        console.error('Could not parse date:', cleanedDateText);
        return null;
    }

    const offset = TIMEZONE_OFFSETS[timezoneCode] || '+00:00';

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');

    const isoWithOffset = `${year}-${month}-${day}T${hours}:${minutes}:00${offset}`;

    return new Date(isoWithOffset).toISOString();
}

function parseMatch(text: string): Match | null {
    const match_id = getParam(text, 'siegegg');
    const team1_name = getParam(text, 'opponent1');
    const team2_name = getParam(text, 'opponent2');
    const finished = getParam(text, 'finished');
    const dateText = getParam(text, 'date');

    if (!dateText) {
        console.error(`missing date text${dateText}`);
        return null;
    }

    const date = parseWikitextDate(dateText);
    if (!date) {
        console.error(`missing date${date}`);
        return null;
    }

    let status: 'planned' | 'live' | 'finished' = 'planned';
    if (finished === 'true') status = 'finished';
    else if (new Date() > new Date(date)) status = 'live';

    if (!(match_id && team1_name && team2_name)) {
        console.error(
            `missing Matchid${match_id}, team1 name${team1_name} or team2 name ${team2_name}`,
        );
        return null;
    }

    return {
        match_id: parseInt(match_id),
        tournament_id: 0,
        stage: null,
        group: null,
        bracket: null,
        round: null,
        team1_name,
        team2_name,
        team1_score: null,
        team2_score: null,
        status,
        date,
    };
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

function extractCommentContent(line: string): string | null {
    const regex = /<!--\s*(.+?)\s*-->/;
    const match = line.match(regex);
    return match ? match[1].trim() : null;
}

function parseMatchesFromStage(text: string) {
    const matches: string[] = [];
    const lines = text.split('\n');

    let currentMatch: string[] = [];
    let insideMatch = false;
    let currentRound = null;
    let depth = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!insideMatch && line.startsWith('<!--') && line.includes('-->')) {
            const comment = extractCommentContent(line);
            if (comment) {
                currentRound = comment;
            }
        }

        if (/{{Match\b/.test(line.trim())) {
            if (insideMatch && currentMatch.length > 0) {
                matches.push(currentMatch.join('\n'));
            }

            currentMatch = [line];
            insideMatch = true;

            const openBraces = (line.match(/\{/g) || []).length;
            const closedBraces = (line.match(/\}/g) || []).length;
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

            const openBraces = (line.match(/\{/g) || []).length;
            const closedBraces = (line.match(/\}/g) || []).length;
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

function generateBatchRequestStrings(tournamentPages: string[]) {
    const pagesStrings: string[] = [];
    let pagesString = '';

    for (let pageIndex = 0; pageIndex < tournamentPages.length; pageIndex++) {
        const page = tournamentPages.at(pageIndex)?.replaceAll('/', '%2F');

        if (pagesString === '') {
            pagesString = page || '';
        } else {
            pagesString = pagesString + '|' + page;
        }

        if (pageIndex % 50 === 49 || pageIndex === tournamentPages.length - 1) {
            pagesStrings.push(pagesString);
            pagesString = '';
        }
    }

    return pagesStrings;
}

async function fetchTournamentWikitext(
    tournaments: Tournament[],
    batchRequests: string[],
    overview: TournamentOverview[],
) {
    const subPagesArray: string[] = [];

    for (const batch of batchRequests) {
        const wikitext_api_url = `https://liquipedia.net/rainbowsix/api.php?action=query&prop=revisions&titles=${batch}&rvprop=content&format=json`;

        const { data } = await axios.get(wikitext_api_url, {
            headers: {
                'User-Agent': 'MatchesBot/0.3 (paulaugsten9@gmail.com)',
            },
        });

        const pages = data.query.pages;

        for (const pageId in data.query.pages) {
            const page = pages[pageId];
            const pageTitle = page.title.trim().replaceAll(' ', '_');
            const wikitext = page.revisions[0]['*'];
            console.log(`Page: ${pageTitle}`);

            const stages = wikitextSplitStages(wikitext);

            const tournamentData: TournamentOverview = {
                pageId,
                title: pageTitle,
                totalStages: stages.length,
                totalMatches: 0,
                stages: [],
            };

            console.log('stages:', stages.length);

            for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
                const wikitext = stages[stageIdx];
                const stage = getParam(wikitext, 'Stage');

                const matches = parseMatchesFromStage(wikitext);

                if (matches.length === 0) {
                    const sectionPattern = /{{#(?:lst|section):([^|]+)\|[^}]*}}/g;

                    const subPages = [...wikitext.matchAll(sectionPattern)];

                    for (const subPage of subPages) {
                        const subPageString = subPage[1].trim().replaceAll(' ', '_');
                        if (subPageString && !subPagesArray.includes(subPageString)) {
                            subPagesArray.push(subPageString);
                        }
                    }
                }

                const parsedMatches: Match[] = [];

                for (const match in matches) {
                    const parsedMatch = parseMatch(matches[match]);
                    if (parsedMatch) {
                        parsedMatch.tournament_id = tournaments.find((tournament) =>
                            tournament.url.includes(pageTitle),
                        )?.id;

                        if (stage) {
                            parsedMatch.stage = stage;
                        } else {
                            console.log(
                                'No stagename found in at least one stage of tournament: ',
                                pageTitle,
                            );
                            parsedMatch.stage = 'Playoffs';
                        }

                        if (stage?.includes('Playoffs') || stage?.includes('Finals')) {
                            parsedMatch.bracket = '';
                        }

                        if (parsedMatch.tournament_id) {
                            parsedMatches.push(parsedMatch);
                        } else {
                            console.log(
                                "Couldn't find tournamentId for game: ",
                                parsedMatch.match_id,
                            );
                        }
                    }
                }

                tournamentData.stages.push({
                    stageIndex: stageIdx,
                    matchCount: parsedMatches.length,
                    matches: parsedMatches,
                });

                tournamentData.totalMatches += parsedMatches.length;
            }

            overview.push(tournamentData);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(subPagesArray);
    console.log(generateBatchRequestStrings(subPagesArray));
}

export async function getAllTournamentPages(game_slug: string) {
    const overview: TournamentOverview[] = [];

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
    const tournamentPages = tournaments.map((tournament) => {
        return tournament.url.replace('https://liquipedia.net/rainbowsix/', '');
    });

    const batchRequests = generateBatchRequestStrings(tournamentPages);

    await fetchTournamentWikitext(tournaments, batchRequests, overview);

    overview.sort((a, b) => parseInt(a.pageId) - parseInt(b.pageId));

    fs.writeFileSync('tournament_overview.json', JSON.stringify(overview, null, 2), 'utf-8');

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
