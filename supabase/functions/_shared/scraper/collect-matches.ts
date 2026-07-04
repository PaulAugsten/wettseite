import { fetchWikitextPages, generateBatchRequests, pageTitleFromUrl } from './liquipedia.ts';
import { parseMatchesFromStage } from './match-parser.ts';
import type { TeamResolver } from './team-resolver.ts';
import type { Match, Tournament } from './types.ts';
import { getParam, getSubpageStage, wikitextSplitStages } from './wikitext-parser.ts';

/** Wikitext templates that pull match data from a tournament subpage. */
const SUBPAGE_PATTERNS = [
    /{{#(?:lst|section):([^|]+)\|[^}]*}}/g,
    /{{ShowStandings\|page=([^|}]+)/g,
];

export type StageOverview = {
    stage: string;
    matchCount: number;
    matches: Match[];
};

export type PageOverview = {
    pageId: string;
    title: string;
    totalMatches: number;
    stages: StageOverview[];
};

export type CollectMatchesResult = {
    matches: Match[];
    overview: PageOverview[];
};

type SubpageRef = {
    tournament: Tournament;
    subPage: string;
};

function normalizePageTitle(title: string): string {
    return title.trim().replaceAll(' ', '_');
}

function findSubpageRefs(wikitext: string, tournament: Tournament): SubpageRef[] {
    const refs: SubpageRef[] = [];
    for (const pattern of SUBPAGE_PATTERNS) {
        for (const match of wikitext.matchAll(pattern)) {
            const subPage = match[1]?.trim().replaceAll(' ', '_');
            if (subPage) {
                refs.push({ tournament, subPage });
            }
        }
    }
    return refs;
}

/**
 * Scrapes all matches for the given tournaments from Liquipedia: fetches each
 * tournament page's wikitext in batches, parses every stage, and follows
 * subpage references for stages whose matches live on separate pages.
 * Shared by the `get-matches` edge function and the local scraper CLI.
 */
export async function collectMatches(options: {
    /** Liquipedia wiki segment, e.g. `rainbowsix`. */
    wiki: string;
    tournaments: Tournament[];
    teamResolver: TeamResolver;
    /** Pause between API requests, to stay well below rate limits. */
    requestDelayMs?: number;
}): Promise<CollectMatchesResult> {
    const { wiki, tournaments, teamResolver, requestDelayMs = 5000 } = options;

    const overview: PageOverview[] = [];
    const subpageRefs: SubpageRef[] = [];
    const seenSubpages = new Set<string>();

    const tournamentPages = tournaments.map((tournament) => pageTitleFromUrl(tournament.url, wiki));

    let firstRequest = true;
    const throttled = async (batch: string) => {
        if (!firstRequest) {
            await new Promise((resolve) => setTimeout(resolve, requestDelayMs));
        }
        firstRequest = false;
        return fetchWikitextPages(wiki, batch);
    };

    for (const batch of generateBatchRequests(tournamentPages)) {
        const pages = await throttled(batch);

        for (const pageId in pages) {
            const page = pages[pageId];
            if (!page) continue;
            const pageTitle = normalizePageTitle(page.title);

            const wikitext = page.revisions?.[0]?.['*'];
            if (!wikitext) {
                console.error("Page doesn't exist (yet): ", pageTitle);
                continue;
            }

            const tournament = tournaments.find((t) => t.url.includes(pageTitle));
            if (!tournament) continue;

            const pageOverview: PageOverview = {
                pageId,
                title: pageTitle,
                totalMatches: 0,
                stages: [],
            };

            for (const stageText of wikitextSplitStages(wikitext)) {
                const stage = getParam(stageText, 'Stage') ?? 'Playoffs';
                const matches = parseMatchesFromStage(stageText, tournament, stage, teamResolver);

                if (matches.length === 0) {
                    for (const ref of findSubpageRefs(stageText, tournament)) {
                        const key = `${ref.tournament.url}|${ref.subPage}`;
                        if (!seenSubpages.has(key)) {
                            seenSubpages.add(key);
                            subpageRefs.push(ref);
                        }
                    }
                }

                pageOverview.stages.push({ stage, matchCount: matches.length, matches });
                pageOverview.totalMatches += matches.length;
            }

            overview.push(pageOverview);
        }
    }

    for (const batch of generateBatchRequests(subpageRefs.map((ref) => ref.subPage))) {
        const pages = await throttled(batch);

        for (const pageId in pages) {
            const page = pages[pageId];
            if (!page) continue;
            const pageTitle = normalizePageTitle(page.title);

            const wikitext = page.revisions?.[0]?.['*'];
            if (!wikitext) {
                console.error("Page doesn't exist (yet): ", pageTitle);
                continue;
            }

            const tournamentTitle = pageTitle.substring(0, pageTitle.lastIndexOf('/'));
            const tournament = tournaments.find((t) => t.url.includes(tournamentTitle));
            if (!tournament) continue;

            const stage = getSubpageStage(wikitext) ?? 'Swiss Stage';
            const matches = parseMatchesFromStage(wikitext, tournament, stage, teamResolver);

            overview.push({
                pageId,
                title: pageTitle,
                totalMatches: matches.length,
                stages: [{ stage, matchCount: matches.length, matches }],
            });
        }
    }

    overview.sort((a, b) => parseInt(a.pageId, 10) - parseInt(b.pageId, 10));

    const matches = overview
        .flatMap((page) => page.stages.flatMap((stage) => stage.matches))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { matches, overview };
}
