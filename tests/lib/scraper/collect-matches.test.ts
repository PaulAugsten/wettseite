import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectMatches } from '@/lib/scraper/_shared/liquipedia/collect-matches.ts';
import type { WikiPage } from '@/lib/scraper/_shared/liquipedia/liquipedia.ts';
import { TeamResolver } from '@/lib/scraper/_shared/team-resolver';
import type { Tournament } from '@/lib/scraper/_shared/types';

const { fetchWikitextPages } = vi.hoisted(() => ({ fetchWikitextPages: vi.fn() }));

// Only the network call is stubbed; batching and title mapping stay real so the
// page titles the test asserts on are the ones the scraper would request.
vi.mock('@/lib/scraper/_shared/liquipedia/liquipedia.ts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/scraper/_shared/liquipedia/liquipedia.ts')>()),
    fetchWikitextPages,
}));

const tournament: Tournament = {
    id: 99,
    name: 'Six Major',
    game_id: 1,
    location: 'Paris, France',
    prize_pool: '$100,000',
    start_date: '2024-01-01T00:00:00.000Z',
    end_date: '2024-01-10T00:00:00.000Z',
    status: 'finished',
    url: 'https://liquipedia.net/rainbowsix/Six_Major',
};

function match(id: number, date: string) {
    return `{{Match
|r6esports=${id}
|opponent1={{TeamOpponent|template=TeamA|score=2}}
|opponent2={{TeamOpponent|template=TeamB|score=0}}
|finished=true
|date=${date} {{Abbr/UTC}}
}}`;
}

function stage(name: string, body: string) {
    return `==={{Stage|${name}}}===\n${body}\n==Next Section==`;
}

/** Serves `action=query` responses keyed by the page titles being requested. */
function servePages(responses: Record<string, WikiPage>[]) {
    for (const response of responses) {
        fetchWikitextPages.mockResolvedValueOnce(response);
    }
    fetchWikitextPages.mockResolvedValue({});
}

function page(title: string, wikitext: string): WikiPage {
    return { title, revisions: [{ '*': wikitext }] };
}

function collect(tournaments: Tournament[] = [tournament]) {
    return collectMatches({
        wiki: 'rainbowsix',
        tournaments,
        teamResolver: new TeamResolver(1, [
            { id: 10, name: 'TeamA', aliases: [] },
            { id: 20, name: 'TeamB', aliases: [] },
        ]),
        requestDelayMs: 0,
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('collectMatches', () => {
    it('requests each tournament page by its wiki title', async () => {
        servePages([{}]);

        await collect();

        expect(fetchWikitextPages).toHaveBeenCalledWith('rainbowsix', 'Six_Major');
    });

    it('reports every stage of a page in the overview', async () => {
        servePages([
            {
                '1': page(
                    'Six Major',
                    [
                        stage('Group Stage', match(1, 'January 2, 2024 - 12:00')),
                        stage('Playoffs', match(2, 'January 3, 2024 - 12:00')),
                    ].join('\n'),
                ),
            },
        ]);

        const { matches, overview } = await collect();

        expect(matches).toHaveLength(2);
        expect(overview).toHaveLength(1);
        expect(overview[0]).toMatchObject({ pageId: '1', title: 'Six_Major', totalMatches: 2 });
        expect(overview[0]?.stages.map((s) => [s.stage, s.matchCount])).toEqual([
            ['Group Stage', 1],
            ['Playoffs', 1],
        ]);
    });

    it('follows subpage references for stages whose matches live elsewhere', async () => {
        servePages([
            { '1': page('Six Major', stage('Swiss', '{{#lst:Six Major/Swiss|matches}}')) },
            {
                '2': page(
                    'Six Major/Swiss',
                    `{{Stage|Swiss Stage}}\n${match(7, 'January 4, 2024 - 12:00')}`,
                ),
            },
        ]);

        const { matches, overview } = await collect();

        expect(fetchWikitextPages).toHaveBeenNthCalledWith(2, 'rainbowsix', 'Six_Major/Swiss');
        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({ external_id: 7, tournament_id: 99 });
        expect(overview.at(-1)).toMatchObject({
            title: 'Six_Major/Swiss',
            stages: [expect.objectContaining({ stage: 'Swiss Stage' })],
        });
    });

    it('requests a repeated subpage reference only once', async () => {
        // Two stages transcluding the same subpage would otherwise cost two
        // rate-limited requests and duplicate every match on it.
        servePages([
            {
                '1': page(
                    'Six Major',
                    [
                        stage('Swiss A', '{{#lst:Six Major/Swiss|matches}}'),
                        stage('Swiss B', '{{#lst:Six Major/Swiss|standings}}'),
                    ].join('\n'),
                ),
            },
            {
                '2': page(
                    'Six Major/Swiss',
                    `{{Stage|Swiss Stage}}\n${match(7, 'January 4, 2024 - 12:00')}`,
                ),
            },
        ]);

        const { matches } = await collect();

        expect(fetchWikitextPages).toHaveBeenCalledTimes(2);
        expect(matches).toHaveLength(1);
    });

    it('skips a page that has no revision yet instead of failing the run', async () => {
        servePages([
            {
                '1': { title: 'Six Major' },
                '2': page('Six Major', stage('Playoffs', match(3, 'January 5, 2024 - 12:00'))),
            },
        ]);

        const { matches, overview } = await collect();

        expect(matches).toHaveLength(1);
        expect(overview).toHaveLength(1);
    });

    it('ignores pages that match no requested tournament', async () => {
        servePages([
            {
                '1': page(
                    'Some Other Event',
                    stage('Playoffs', match(4, 'January 6, 2024 - 12:00')),
                ),
            },
        ]);

        const { matches, overview } = await collect();

        expect(matches).toEqual([]);
        expect(overview).toEqual([]);
    });

    it('returns matches in chronological order regardless of page order', async () => {
        servePages([
            {
                '1': page(
                    'Six Major',
                    stage(
                        'Playoffs',
                        [
                            match(2, 'January 8, 2024 - 12:00'),
                            match(1, 'January 6, 2024 - 12:00'),
                        ].join('\n'),
                    ),
                ),
            },
        ]);

        const { matches } = await collect();

        expect(matches.map((m) => m.external_id)).toEqual([1, 2]);
    });
});
