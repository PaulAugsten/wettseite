import 'dotenv/config';
import fs from 'node:fs';
import axios from 'axios';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseMatchesFromStage } from './match_parser';
import { getGameId } from './shared';
import TeamResolver from './teamnames_resolver';
import type { Match, Tournament } from './types';
import { getParam, getSubpageStage, wikitextSplitStages } from './wikitext_parser';

export type { Match, Tournament };

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

async function getTournamentsFromDB(
    gameId: number,
    tournamentIds: number[] = [],
): Promise<Tournament[]> {
    const supabase = createAdminClient();

    if (tournamentIds.length > 0) {
        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .eq('game_id', gameId)
            .in('id', tournamentIds);

        if (error || !data) {
            console.log('Error getting tournaments from DB:', error);
            return [];
        }

        return data;
    }

    const { data, error } = await supabase.from('tournaments').select('*').eq('game_id', gameId);

    if (error || !data) {
        console.log('Error getting tournaments from DB:', error);
        return [];
    }

    return data;
}

export function generateBatchRequests(tournamentPages: string[]) {
    const batchRequests: string[] = [];
    tournamentPages.forEach((page, pageIndex) => {
        const batchIndex = Math.floor(pageIndex / 50);
        if (pageIndex % 50 === 0) {
            batchRequests[batchIndex] = page;
        } else {
            batchRequests[batchIndex] = `${batchRequests[batchIndex] ?? ''}|${page}`;
        }
    });

    return batchRequests;
}

async function fetchTournamentWikitext(
    tournaments: Tournament[],
    batch: string,
    overview: TournamentOverview[],
    teamResolver: TeamResolver,
) {
    const subPagesArray: { tournament: Tournament; subPage: string }[] = [];

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

        for (const [stageIdx, wikitext] of stages.entries()) {
            const stage = getParam(wikitext, 'Stage') ?? 'Playoffs';

            const matches = parseMatchesFromStage(wikitext, tournament, stage, teamResolver);

            if (matches.length === 0) {
                const sectionPattern = /{{#(?:lst|section):([^|]+)\|[^}]*}}/g;
                const showStandingsPattern = /{{ShowStandings\|page=([^|}]+)/g;
                const subPages = [
                    ...wikitext.matchAll(sectionPattern),
                    ...wikitext.matchAll(showStandingsPattern),
                ];

                for (const subPage of subPages) {
                    const subPageMatch = subPage[1];
                    if (!subPageMatch) continue;
                    const subPageString = subPageMatch.trim().replaceAll(' ', '_');
                    if (
                        subPageString &&
                        !subPagesArray.includes({
                            tournament,
                            subPage: subPageString,
                        })
                    ) {
                        subPagesArray.push({
                            tournament,
                            subPage: subPageString,
                        });
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

    return { overview, subPagesArray };
}

async function fetchSubpages(
    tournaments: Tournament[],
    batch: string,
    overview: TournamentOverview[],
    teamResolver: TeamResolver,
) {
    const wikitext_api_url = `https://liquipedia.net/rainbowsix/api.php?action=query&prop=revisions&titles=${batch}&rvprop=content&format=json`;

    const { data } = await axios.get(wikitext_api_url, {
        headers: {
            'User-Agent': 'MatchesBot/0.3 (paulaugsten9@gmail.com)',
        },
    });

    const pages = data.query.pages;

    for (const pageId in data.query.pages) {
        const page = pages[pageId];
        const pageTitle: string = page.title.trim().replaceAll(' ', '_');
        const tournamentTitle = pageTitle.substring(0, pageTitle.lastIndexOf('/'));
        if (!page.revisions) {
            console.error("Page doesn't exist (yet): ", pageTitle);
            continue;
        }
        const wikitext = page.revisions[0]['*'];
        console.log(`Page: ${pageTitle}`);

        const tournament = tournaments.find((tournament) =>
            tournament.url.includes(tournamentTitle),
        );

        if (!tournament) continue;

        const tournamentData: TournamentOverview = {
            pageId,
            title: pageTitle,
            totalStages: 7,
            totalMatches: 0,
            stages: [],
        };

        const stage = getSubpageStage(wikitext) ?? 'Swiss Stage?';

        console.log('stage:', stage);

        const matches = parseMatchesFromStage(wikitext, tournament, stage, teamResolver);

        tournamentData.stages.push({
            stageIndex: 5,
            matchCount: matches.length,
            matches: matches,
        });

        tournamentData.totalMatches += matches.length;

        overview.push(tournamentData);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    return overview;
}

export async function getMatchesOfTournament(
    gameSlug: string,
    insert_into_db: boolean,
    tournamentIds: number[] = [],
) {
    const supabase = createAdminClient();

    const gameId = await getGameId(gameSlug);

    if (!gameId) {
        console.log(`Game not found for slug: ${gameSlug}`);
        return 0;
    }

    const tournaments = await getTournamentsFromDB(gameId, tournamentIds);
    if (!tournaments) {
        console.log(`No tournaments found for slug: ${gameSlug} (Id: ${gameId})`);
        return 0;
    }
    const tournamentPages = tournaments.map((tournament) => {
        return tournament.url
            .replace('https://liquipedia.net/rainbowsix/', '')
            .replaceAll('/', '%2F');
    });

    const teamResolver = new TeamResolver();
    await teamResolver.initialize(gameId);

    const batchRequests = generateBatchRequests(tournamentPages);

    const overview: TournamentOverview[] = [];
    const allMatches: Match[] = [];
    const subpagesToFetch: { tournament: Tournament; subPage: string }[] = [];

    for (const batch of batchRequests) {
        const { subPagesArray } = await fetchTournamentWikitext(
            tournaments,
            batch,
            overview,
            teamResolver,
        );

        if (subPagesArray && subPagesArray.length > 0) {
            subpagesToFetch.push(...subPagesArray);
        }
    }

    const subPagesBatchRequest = generateBatchRequests(
        subpagesToFetch.map((subPage) => subPage.subPage),
    );

    for (const batch of subPagesBatchRequest) {
        await fetchSubpages(tournaments, batch, overview, teamResolver);
    }

    for (const page of overview) {
        for (const stage of page.stages) {
            allMatches.push(...stage.matches);
        }
    }

    const teamStats = teamResolver.getStats();
    if (teamStats.unknownTeams > 0) {
        await teamResolver.reviewUnknownTeams();
    }

    overview.sort((a, b) => parseInt(a.pageId, 10) - parseInt(b.pageId, 10));

    allMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    fs.writeFileSync('tournament_overview.json', JSON.stringify(overview, null, 2), 'utf-8');

    if (insert_into_db) {
        const { data, error } = await supabase.from('matches').insert(allMatches).select();

        if (error || !data) {
            console.log('Error inserting matches into the DB:', error);
            return 0;
        }
    } else {
        console.log(allMatches);
    }
}

// TODO: implement automatic choosing of matches to scrape
if (import.meta.url === `file://${process.argv[1]}`) {
    getMatchesOfTournament('rainbow-six-siege', false);
}
