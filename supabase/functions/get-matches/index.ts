import { createClient } from 'npm:@supabase/supabase-js@2';

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

type Match = {
    external_id: number;
    game_id: number;
    tournament_id: number | undefined;
    stage: string;
    group: string;
    bracket: string;
    round: string;
    team1_id: number;
    team2_id: number;
    team1_score: number | null;
    team2_score: number | null;
    status: 'planned' | 'live' | 'finished';
    date: string;
};

type UnknownTeam = {
    name: string;
    occurrences: number;
    matchIds: number[];
};

const GAME_SLUG = 'rainbow-six-siege';

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

function getSupabase() {
    return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

class TeamResolver {
    private gameId = 0;
    private teamLookup = new Map<string, number>();
    private unknownTeams = new Map<string, UnknownTeam>();
    private allTeams: { id: number; name: string; aliases: string[] }[] = [];

    async initialize(gameId: number) {
        this.gameId = gameId;
        const supabase = getSupabase();

        const { data: teams, error } = await supabase
            .from('teams')
            .select(`id, name, team_aliases (alias)`)
            .eq('game_id', gameId);

        if (error) {
            console.error('Error fetching teams: ', error);
            return;
        }

        for (const team of teams || []) {
            this.allTeams.push({
                id: team.id,
                name: team.name,
                aliases: team.team_aliases.map((a: { alias: string }) => a.alias),
            });

            this.teamLookup.set(this.normalize(team.name), team.id);

            for (const aliasObj of team.team_aliases || []) {
                this.teamLookup.set(this.normalize(aliasObj.alias), team.id);
            }
        }
    }

    getGameId() {
        return this.gameId;
    }

    resolveTeamId(teamName: string, matchId: number): number | null {
        const teamId = this.teamLookup.get(this.normalize(teamName));

        if (teamId) {
            return teamId;
        }

        const existing = this.unknownTeams.get(teamName);
        if (existing) {
            existing.occurrences++;
            existing.matchIds.push(matchId);
        } else {
            this.unknownTeams.set(teamName, {
                name: teamName,
                occurrences: 1,
                matchIds: [matchId],
            });
        }

        return null;
    }

    normalize(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '');
    }

    getStats() {
        return {
            knownTeams: this.allTeams.length,
            totalAliases: this.teamLookup.size,
            unknownTeams: this.unknownTeams.size,
        };
    }
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

function getSubpageStage(text: string) {
    const regex = /^===([^=]+)===$/m;
    const match = text.match(regex);
    return match ? match[1].trim() : null;
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
    const team1ScoreMatch = text.match(/\|opponent1={{TeamOpponent\|[^|]+\|score=([A-Z0-9]+)/);
    const team2ScoreMatch = text.match(/\|opponent2={{TeamOpponent\|[^|]+\|score=([A-Z0-9]+)/);

    if (team1ScoreMatch && team2ScoreMatch) {
        const team1Score = team1ScoreMatch[1];
        const team2Score = team2ScoreMatch[1];

        if (team1Score === 'W' || team2Score === 'FF') {
            return { team1Score: 1, team2Score: 0 };
        } else if (team2Score === 'W' || team1Score === 'FF') {
            return { team1Score: 0, team2Score: 1 };
        }

        if (!isNaN(parseInt(team1Score)) && !isNaN(parseInt(team2Score))) {
            return {
                team1Score: parseInt(team1Score),
                team2Score: parseInt(team2Score),
            };
        }
    }

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

function parseMatch(text: string, teamResolver: TeamResolver): Match | null {
    const match_id = getParam(text, 'r6esports');
    const team1_name = getParam(text, 'opponent1');
    const team2_name = getParam(text, 'opponent2');
    const finished = getParam(text, 'finished');
    const dateText = getParam(text, 'date');
    const scores = calculateMatchScore(text);
    const team1_score = scores?.team1Score;
    const team2_score = scores?.team2Score;

    if (!(match_id && team1_name && team2_name)) {
        console.error(
            `missing Matchid: ${match_id}, team1 name: ${team1_name} or team2 name: ${team2_name}`,
        );
        return null;
    }

    const team1_id = teamResolver.resolveTeamId(team1_name, parseInt(match_id));
    const team2_id = teamResolver.resolveTeamId(team2_name, parseInt(match_id));

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
        external_id: parseInt(match_id),
        game_id: teamResolver.getGameId(),
        tournament_id: 0,
        stage: '',
        group: '',
        bracket: '',
        round: '',
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
    teamResolver: TeamResolver,
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
        } else if (!insideMatch) {
            const hiddenSortMatch = line.trim().match(/^===={{HiddenSort\|(.+?)}}====$/);
            if (hiddenSortMatch) {
                currentRound = hiddenSortMatch[1].trim();
            }
        }

        if (!insideMatch && line.includes('Group')) {
            const group = getGroup(line);
            if (group) {
                currentGroup = group;
            }
        }

        if (/{{Match\b/.test(line.trim())) {
            if (insideMatch && currentMatchText.length > 0) {
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamResolver);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id;
                    parsedMatch.stage = stage ?? '';
                    parsedMatch.round = currentRound ?? '';
                    parsedMatch.group = '';
                    parsedMatch.bracket = '';

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup ?? '';
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
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamResolver);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id;
                    parsedMatch.stage = stage ?? '';
                    parsedMatch.round = currentRound ?? '';
                    parsedMatch.group = '';
                    parsedMatch.bracket = '';

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup ?? '';
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
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamResolver);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id;
                    parsedMatch.stage = stage ?? '';
                    parsedMatch.round = currentRound ?? '';
                    parsedMatch.group = '';
                    parsedMatch.bracket = '';

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup ?? '';
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

async function fetchWikitext(
    batch: string,
    retries = 3,
): Promise<Record<string, { title: string; revisions?: [{ '*': string }] }>> {
    const url = `https://liquipedia.net/rainbowsix/api.php?action=query&prop=revisions&titles=${batch}&rvprop=content&format=json`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'MatchesBot/0.3 (paulaugsten9@gmail.com)',
            Accept: 'application/json',
        },
    });

    if (res.status === 429 && retries > 0) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '10') * 1000;
        console.warn(`Rate limited, retrying after ${retryAfter}ms...`);
        await new Promise((r) => setTimeout(r, retryAfter));
        return fetchWikitext(batch, retries - 1);
    }

    if (!res.ok) {
        throw new Error(`Liquipedia API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data.query.pages;
}

async function scrapeMatches() {
    const supabase = getSupabase();

    const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id')
        .eq('slug', GAME_SLUG)
        .single();
    if (gameError || !gameData) throw new Error('Could not find game id');
    const gameId = gameData.id;

    const { data: tournaments, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('game_id', gameId)
        .in('status', ['live', 'scheduled']);
    if (tournamentError || !tournaments) throw new Error('Could not fetch tournaments');

    if (tournaments.length === 0) {
        console.log('No active tournaments');
        return { scraped: 0 };
    }

    const teamResolver = new TeamResolver();
    await teamResolver.initialize(gameId);

    const tournamentPages = tournaments.map((t: Tournament) => {
        return t.url.replace('https://liquipedia.net/rainbowsix/', '').replaceAll('/', '%2F');
    });

    const allMatches: Match[] = [];
    const subpagesToFetch: { tournament: Tournament; subPage: string }[] = [];

    for (const batch of generateBatchRequests(tournamentPages)) {
        await new Promise((r) => setTimeout(r, 5000));

        const pages = await fetchWikitext(batch);
        for (const pageId in pages) {
            const page = pages[pageId];
            const pageTitle = page.title.trim().replaceAll(' ', '_');

            if (!page.revisions) {
                console.error("Page doesn't exist yet: ", pageTitle);
                continue;
            }

            const wikitext = page.revisions[0]['*'];
            const tournament = tournaments.find((t: Tournament) => t.url.includes(pageTitle));
            if (!tournament) continue;
            const stages = wikitextSplitStages(wikitext);
            for (const stageText of stages) {
                const stage = getParam(stageText, 'Stage') ?? 'Playoffs';
                const matches = parseMatchesFromStage(stageText, tournament, stage, teamResolver);
                if (matches.length === 0) {
                    const spMatches = [
                        ...stageText.matchAll(/{{#(?:lst|section):([^|]+)\|[^}]*}}/g),
                        ...stageText.matchAll(/{{ShowStandings\|page=([^|}]+)/g),
                    ];
                    for (const sp of spMatches) {
                        subpagesToFetch.push({
                            tournament,
                            subPage: sp[1].trim().replaceAll(' ', '_'),
                        });
                    }
                }
                allMatches.push(...matches);
            }
        }
    }

    for (const batch of generateBatchRequests(subpagesToFetch.map((s) => s.subPage))) {
        await new Promise((r) => setTimeout(r, 5000));

        const pages = await fetchWikitext(batch);
        for (const pageId in pages) {
            const page = pages[pageId];
            const pageTitle: string = page.title.trim().replaceAll(' ', '_');
            if (!page.revisions) continue;
            const wikitext = page.revisions[0]['*'];
            const tournamentTitle = pageTitle.substring(0, pageTitle.lastIndexOf('/'));
            const tournament = tournaments.find((t: Tournament) => t.url.includes(tournamentTitle));
            if (!tournament) continue;
            const stage = getSubpageStage(wikitext) ?? 'Swiss Stage';
            allMatches.push(...parseMatchesFromStage(wikitext, tournament, stage, teamResolver));
        }
    }

    if (allMatches.length > 0) {
        const { error } = await supabase
            .from('matches')
            .upsert(allMatches, {
                onConflict: 'tournament_id, team1_id, team2_id, stage, group, round, bracket',
            });
        if (error) throw new Error(`DB upsert failed: ${error.message}`);
    }

    const teamStats = teamResolver.getStats();
    if (teamStats.unknownTeams > 0) {
        console.warn(`Unknown teams: (${teamStats.unknownTeams}): check function logs`);
    }

    return { scraped: allMatches.length, unknownTeams: teamStats.unknownTeams };
}

Deno.serve(async () => {
    try {
        const result = await scrapeMatches();
        return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
