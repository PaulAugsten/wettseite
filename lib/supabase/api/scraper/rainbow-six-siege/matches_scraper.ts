import 'dotenv/config';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { type Tournament } from './tournaments_scraper';
import fs from 'fs';
import { resolveTeams, buildTeamLookupMap, resolveTeamId } from './teamnames_resolver';
import { get } from 'http';

export type Match = {
    match_id: number;
    tournament_id: number | undefined;
    stage: string | null;
    group: string | null;
    bracket: string | null;
    round: string | null;
    team1_id: number;
    team2_id: number;
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

async function getGameId(gameSlug: string): Promise<number> {
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

    const { data, error } = await supabase.from('games').select(`id`).eq('slug', gameSlug).single();

    if (error || !data) {
        console.log('Error getting game_id from DB:', error);
        return -1;
    }

    return data.id;
}

async function getAllTournamentsFromDB(gameId: number): Promise<Tournament[]> {
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
        .eq('id', gameId)
        .single();

    if (error || !data) {
        console.log('Error getting tournaments from DB:', error);
        return [];
    }

    return data.tournaments;
}

function getRound(text: string, key: string) {
    const regex = new RegExp(`\\${key}=([^\\n|}]*)`);
    const match = text.match(regex);
    return match ? match[1].trim() : null;
}

function getGroup(text: string) {
    const regex = new RegExp(`\\=Group([^\\n|}]*)`);
    const match = text.match(regex);
    return match ? match[1].trim().at(0) : null;
}

function getParam(text: string, key: string) {
    let regex = new RegExp(`\\|${key}=([^\\n|}]*)`);

    if (key === 'opponent1' || key === 'opponent2') {
        const templateRegex = new RegExp(`\\|${key}={{TeamOpponent\\|([^}]+)}}`);
        const templateMatch = text.match(templateRegex);

        if (!templateMatch) return null;

        const templateContent = templateMatch[1];

        const templateParam = templateContent.match(/template=([^|}]+)/);
        if (templateParam) {
            return templateParam[1].trim();
        }

        const parts = templateContent.split('|');
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed.includes('=') && trimmed.length > 0) {
                return trimmed;
            }
        }

        const nameParam = templateContent.match(/name=([^|}\s]+)/);
        if (nameParam) {
            return nameParam[1].trim();
        }

        return null;
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

function calculateMatchScore(text: string): { team1Score: number; team2Score: number } {
    let team1Score = 0;
    let team2Score = 0;
    let mapIndex = 1;

    while (true) {
        const mapPattern = new RegExp(`\\|map${mapIndex}={{Map\\|map=([^|]+)\\|([^}]+)}}`, 's');

        const mapMatch = text.match(mapPattern);

        if (!mapMatch) {
            break;
        }

        const mapContent = mapMatch[2];

        const finishedMatch = mapContent.match(/finished=([^|}\n]+)/);
        const finished = finishedMatch ? finishedMatch[1].trim() : 'false';

        if (finished === 'skip') {
            mapIndex++;
            continue;
        }

        let t1Total = 0;
        let t2Total = 0;

        const score1Match = mapContent.match(/score1=(\d+)/);
        const score2Match = mapContent.match(/score2=(\d+)/);

        // old format
        if (score1Match && score2Match) {
            t1Total = parseInt(score1Match[1]);
            t2Total = parseInt(score2Match[1]);
        } else {
            const t1atk = parseInt(mapContent.match(/t1atk=(\d+)/)?.[1] || '0');
            const t1def = parseInt(mapContent.match(/t1def=(\d+)/)?.[1] || '0');
            const t2atk = parseInt(mapContent.match(/t2atk=(\d+)/)?.[1] || '0');
            const t2def = parseInt(mapContent.match(/t2def=(\d+)/)?.[1] || '0');
            const t1otatk = parseInt(mapContent.match(/t1otatk=(\d+)/)?.[1] || '0');
            const t1otdef = parseInt(mapContent.match(/t1otdef=(\d+)/)?.[1] || '0');
            const t2otatk = parseInt(mapContent.match(/t2otatk=(\d+)/)?.[1] || '0');
            const t2otdef = parseInt(mapContent.match(/t2otdef=(\d+)/)?.[1] || '0');

            t1Total = t1atk + t1def + t1otatk + t1otdef;
            t2Total = t2atk + t2def + t2otatk + t2otdef;
        }

        if (t1Total > t2Total) {
            team1Score++;
        } else if (t2Total > t1Total) {
            team2Score++;
        }

        mapIndex++;
    }

    return { team1Score, team2Score };
}

function parseMatch(text: string, teamLookup: Map<string, number>): Match | null {
    const match_id = getParam(text, 'siegegg');
    const team1_name = getParam(text, 'opponent1');
    const team2_name = getParam(text, 'opponent2');
    const finished = getParam(text, 'finished');
    const dateText = getParam(text, 'date');
    const scores = calculateMatchScore(text);
    const team1_score = scores?.team1Score;
    const team2_score = scores?.team2Score;

    if (!(match_id && team1_name && team2_name)) {
        console.error(
            `missing Matchid${match_id}, team1 name${team1_name} or team2 name ${team2_name}`,
        );
        return null;
    }

    const team1_id = resolveTeamId(team1_name, teamLookup);
    const team2_id = resolveTeamId(team2_name, teamLookup);

    if (!team1_id) {
        console.warn(`Unknown team: ${team1_name}`);
        return null;
    }
    if (!team2_id) {
        console.warn(`Unknown team: ${team2_name}`);
        return null;
    }

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

    return {
        match_id: parseInt(match_id),
        tournament_id: 0,
        stage: null,
        group: null,
        bracket: null,
        round: null,
        team1_id,
        team2_id,
        team1_score,
        team2_score,
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

function parseMatchesFromStage(
    text: string,
    tournament: Tournament,
    stage: string | null,
    teamLookup: Map<string, number>,
) {
    const matches: Match[] = [];
    const lines = text.split('\n');

    let currentMatchText: string[] = [];
    let insideMatch = false;
    let currentRound: string | null = null;
    let currentGroup: string | null = null;
    let depth = 0;

    for (const line of lines) {
        if (!insideMatch && line.trim().startsWith('<!--') && line.includes('-->')) {
            currentRound = extractCommentContent(line);
        } else if (
            !insideMatch &&
            line.includes('header=') &&
            line.includes('Match') &&
            !line.includes('dateheader')
        ) {
            currentRound = getRound(line, 'header');
        }
        if (!insideMatch && line.includes('Group')) {
            const group = getGroup(line);
            if (group) {
                currentGroup = group;
            }
        }
        if (/{{Match\b/.test(line.trim())) {
            if (insideMatch && currentMatchText.length > 0) {
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamLookup);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id;
                    parsedMatch.stage = stage;
                    parsedMatch.round = currentRound;

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup;
                    } else if (stage === 'Playoffs') {
                        if (currentRound?.includes('Upper')) {
                            parsedMatch.bracket = 'Upper';
                        } else if (currentRound?.includes('Lower')) {
                            parsedMatch.bracket = 'Lower';
                        } else {
                            parsedMatch.bracket = 'Single';
                        }
                    }
                    matches.push(parsedMatch);
                }
            }

            currentMatchText = [line];
            insideMatch = true;
            depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

            if (depth === 0) {
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamLookup);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id;
                    parsedMatch.stage = stage;
                    parsedMatch.round = currentRound;

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup;
                    } else if (stage === 'Playoffs') {
                        if (currentRound?.includes('Upper')) {
                            parsedMatch.bracket = 'Upper';
                        } else if (currentRound?.includes('Lower')) {
                            parsedMatch.bracket = 'Lower';
                        } else {
                            parsedMatch.bracket = 'Single';
                        }
                    }
                    matches.push(parsedMatch);
                }
                currentMatchText = [];
                insideMatch = false;
            }
            continue;
        }

        if (insideMatch) {
            currentMatchText.push(line);
            depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

            if (depth === 0) {
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamLookup);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id;
                    parsedMatch.stage = stage;
                    parsedMatch.round = currentRound;

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup;
                    } else if (stage === 'Playoffs') {
                        if (currentRound?.includes('Upper')) {
                            parsedMatch.bracket = 'Upper';
                        } else if (currentRound?.includes('Lower')) {
                            parsedMatch.bracket = 'Lower';
                        } else {
                            parsedMatch.bracket = 'Single';
                        }
                    }
                    matches.push(parsedMatch);
                }
                currentMatchText = [];
                insideMatch = false;
            }
        }
    }

    return matches;
}

function generateBatchRequests(tournamentPages: string[]) {
    const batchRequests: string[] = [];
    for (let pageIndex = 0; pageIndex < tournamentPages.length; pageIndex++) {
        const batchIndex = Math.floor(pageIndex / 50);
        if (pageIndex % 50 === 0) {
            batchRequests[batchIndex] = tournamentPages[pageIndex];
        } else {
            batchRequests[batchIndex] += '|' + tournamentPages[pageIndex];
        }
    }

    return batchRequests;
}

async function fetchTournamentWikitext(
    tournaments: Tournament[],
    batchRequests: string[],
    overview: TournamentOverview[],
    teamLookup: Map<string, number>,
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
            if (!page.revisions) {
                console.error("Page doesn't exist (yet): ", pageTitle);
                continue;
            }
            const wikitext = page.revisions[0]['*'];
            console.log(`Page: ${pageTitle}`);

            const tournament = tournaments.find((tournament) => tournament.url.includes(pageTitle));
            const stages = wikitextSplitStages(wikitext);

            if (!tournament) continue;

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
                const stage = getParam(wikitext, 'Stage')
                    ? getParam(wikitext, 'Stage')
                    : 'Playoffs';

                const matches = parseMatchesFromStage(wikitext, tournament, stage, teamLookup);

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

                tournamentData.stages.push({
                    stageIndex: stageIdx,
                    matchCount: matches.length,
                    matches: matches,
                });

                tournamentData.totalMatches += matches.length;
            }

            overview.push(tournamentData);
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (subPagesArray.length > 0) {
        const subPagesBatch = generateBatchRequests(subPagesArray);
        overview = overview.concat(
            await fetchTournamentWikitext(tournaments, subPagesBatch, overview, teamLookup),
        );
    }

    return overview;
}

export async function getAllTournamentPages(gameSlug: string) {
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

    const gameId = await getGameId(gameSlug);
    const tournaments = await getAllTournamentsFromDB(gameId);
    const teamLookup = await buildTeamLookupMap(gameId);

    const tournamentPages = tournaments.map((tournament) => {
        return tournament.url
            .replace('https://liquipedia.net/rainbowsix/', '')
            .replaceAll('/', '%2F');
    });

    const batchRequests = generateBatchRequests(tournamentPages);

    const overview: TournamentOverview[] = [];
    let allMatches: Match[] = [];
    let processedPages = 0;

    const allTournaments = await fetchTournamentWikitext(
        tournaments,
        batchRequests,
        overview,
        teamLookup,
    );

    for (const tournament of allTournaments) {
        const stages = tournament.stages;
        for (const stage of stages) {
            const stageMatches = stage.matches;
            for (const match of stageMatches) {
                allMatches.push(match);
            }
        }
    }

    //resolveTeams(matches, gameId);

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
