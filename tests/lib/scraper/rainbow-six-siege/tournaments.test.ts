import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as db from '@/lib/scraper/db';
import {
    filterByTournamentName,
    getTournamentMetaData,
    scrapeRainbowSixSiegeTournaments,
} from '@/lib/scraper/rainbow-six-siege/tournaments';

const { fetchParsedHtml } = vi.hoisted(() => ({ fetchParsedHtml: vi.fn() }));

// Page HTML comes from the Liquipedia API; stub it so no rate limiting applies.
vi.mock('@/lib/scraper/_shared/liquipedia/liquipedia.ts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/scraper/_shared/liquipedia/liquipedia.ts')>()),
    fetchParsedHtml,
}));

vi.mock('@/lib/scraper/db', () => ({
    getGameIdBySlug: vi.fn(),
    getTeamRecords: vi.fn(),
    getTournaments: vi.fn(),
}));

function tournamentHtml({
    name = 'R6 Test Major - Finals',
    city = 'Paris',
    countryTitle = 'France',
    prizePool = '$100,000',
    startDate = 'January 1, 2024',
    endDate = 'January 10, 2024',
} = {}) {
    return `
        <html><body>
        <div class="infobox-header wiki-backgroundcolor-light">${name}</div>
        <div class="infobox-cell-2 infobox-description">Location:</div>
        <div>${city}&nbsp;<a title="${countryTitle}">${countryTitle}</a><br></div>
        <div class="infobox-cell-2 infobox-description">Prize Pool:</div>
        <div>${prizePool}</div>
        <div class="infobox-cell-2 infobox-description">Start Date:</div>
        <div>${startDate}</div>
        <div class="infobox-cell-2 infobox-description">End Date:</div>
        <div>${endDate}</div>
        </body></html>
    `;
}

function mockFetchHtml(html: string) {
    fetchParsedHtml.mockResolvedValue(html);
}

describe('shouldIncludeTournament', () => {
    it.each(['Six Invitational 2024', 'Six Major Spring', 'World Cup 2024', 'RE:L0:AD 2024'])(
        'includes recognized top-tier tournament names: %s',
        (name) => {
            expect(filterByTournamentName(name)).toBe(true);
        },
    );

    it('excludes tournaments that do not match a known tier keyword', () => {
        expect(filterByTournamentName('Random Weekly Cup')).toBe(false);
    });

    it('excludes "One" branded events even if otherwise matching', () => {
        expect(filterByTournamentName('Six Major One')).toBe(false);
    });
});

describe('getTournamentMetaData', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('extracts name, location and prize pool from the infobox', async () => {
        vi.setSystemTime(new Date('2024-01-05T00:00:00Z'));
        mockFetchHtml(tournamentHtml());

        const tournament = await getTournamentMetaData(
            'https://liquipedia.net/rainbowsix/Test_Major',
            7,
        );

        expect(tournament?.name).toBe('Test Major');
        expect(tournament?.location).toContain('France');
        expect(tournament?.prize_pool).toBe('$100,000');
        expect(tournament?.game_id).toBe(7);
        expect(tournament?.url).toBe('https://liquipedia.net/rainbowsix/Test_Major');
    });

    it.each([
        ['both dates missing', { startDate: '', endDate: '' }],
        ['a TBA start date', { startDate: 'TBA', endDate: 'January 10, 2024' }],
        ['a TBA end date', { startDate: 'January 1, 2024', endDate: 'TBA' }],
    ])('returns null instead of throwing for %s', async (_label, dates) => {
        vi.setSystemTime(new Date('2024-01-05T00:00:00Z'));
        mockFetchHtml(tournamentHtml(dates));

        await expect(
            getTournamentMetaData('https://liquipedia.net/rainbowsix/Test_Major', 7),
        ).resolves.toBeNull();
    });

    it('marks a tournament as scheduled when "now" is before the start date', async () => {
        vi.setSystemTime(new Date('2023-12-01T00:00:00Z'));
        mockFetchHtml(tournamentHtml());

        const tournament = await getTournamentMetaData(
            'https://liquipedia.net/rainbowsix/Test_Major',
            7,
        );
        expect(tournament?.status).toBe('scheduled');
    });

    it('marks a tournament as live while within its date range', async () => {
        vi.setSystemTime(new Date('2024-01-05T00:00:00Z'));
        mockFetchHtml(tournamentHtml());

        const tournament = await getTournamentMetaData(
            'https://liquipedia.net/rainbowsix/Test_Major',
            7,
        );
        expect(tournament?.status).toBe('live');
    });

    it('marks a tournament as finished once well past the end date', async () => {
        vi.setSystemTime(new Date('2024-02-20T00:00:00Z'));
        mockFetchHtml(tournamentHtml());

        const tournament = await getTournamentMetaData(
            'https://liquipedia.net/rainbowsix/Test_Major',
            7,
        );
        expect(tournament?.status).toBe('finished');
    });
});

describe('scrapeRainbowSixSiegeTournaments', () => {
    /** One row of the S-Tier tournament table. */
    function listRow(name: string, { cancelled = false } = {}) {
        const style = cancelled ? ' style="text-decoration:line-through"' : '';
        const href = `/rainbowsix/${name.replaceAll(' ', '_')}`;
        return `<tr class="table2__row--body"><td${style}><a href="${href}">${name}</a></td></tr>`;
    }

    /**
     * Serves the S-Tier index page, then a generated detail page per tournament
     * so the scraper walks the same two-step path it does against Liquipedia.
     */
    function mockTournamentTable(rows: string[], detailPages: Record<string, string> = {}) {
        const listHtml = `<table><tbody>${rows.join('')}</tbody></table>`;
        fetchParsedHtml.mockImplementation(async (_wiki: string, pageTitle: string) => {
            if (pageTitle === 'S-Tier_Tournaments') return listHtml;
            return (
                detailPages[pageTitle] ??
                tournamentHtml({ name: `R6 ${pageTitle.replaceAll('_', ' ')}` })
            );
        });
    }

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-05T00:00:00Z'));
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.mocked(db.getGameIdBySlug).mockResolvedValue(7);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('throws when the game is not registered in the database', async () => {
        vi.mocked(db.getGameIdBySlug).mockResolvedValue(null);

        await expect(scrapeRainbowSixSiegeTournaments(true)).rejects.toThrow(
            'Game not found for slug: rainbow-six-siege',
        );
    });

    it('skips cancelled rows and names that miss the tier filter', async () => {
        mockTournamentTable([
            listRow('Six Major Alpha', { cancelled: true }),
            listRow('Random Weekly Cup'),
            listRow('Six Major Bravo'),
        ]);

        const tournaments = await scrapeRainbowSixSiegeTournaments(true);

        expect(tournaments.map((t) => t.name)).toEqual(['Six Major Bravo']);
        // Detail pages cost a rate-limited request each, so the filtering has to
        // happen before the fetch, not after.
        expect(fetchParsedHtml).toHaveBeenCalledTimes(2);
    });

    it('stops after five tournaments when only recent ones are wanted', async () => {
        mockTournamentTable(Array.from({ length: 7 }, (_, i) => listRow(`Six Major ${i}`)));

        const tournaments = await scrapeRainbowSixSiegeTournaments(true);

        expect(tournaments).toHaveLength(5);
        expect(tournaments[0]?.name).toBe('Six Major 0');
    });

    it('walks the table oldest-first and takes everything on a full scrape', async () => {
        // Liquipedia lists newest first; a backfill has to insert in
        // chronological order so later rows win on conflict.
        mockTournamentTable(Array.from({ length: 6 }, (_, i) => listRow(`Six Major ${i}`)));

        const tournaments = await scrapeRainbowSixSiegeTournaments(false);

        expect(tournaments).toHaveLength(6);
        expect(tournaments.map((t) => t.name)).toEqual([
            'Six Major 5',
            'Six Major 4',
            'Six Major 3',
            'Six Major 2',
            'Six Major 1',
            'Six Major 0',
        ]);
    });

    it('skips rows whose detail page has no usable dates', async () => {
        mockTournamentTable([listRow('Six Major Alpha'), listRow('Six Major Bravo')], {
            Six_Major_Alpha: tournamentHtml({ name: 'R6 Six Major Alpha', startDate: 'TBA' }),
        });

        const tournaments = await scrapeRainbowSixSiegeTournaments(true);

        expect(tournaments.map((t) => t.name)).toEqual(['Six Major Bravo']);
    });

    it('builds the detail URL from the row href', async () => {
        mockTournamentTable([listRow('Six Major Alpha')]);

        const tournaments = await scrapeRainbowSixSiegeTournaments(true);

        expect(tournaments[0]?.url).toBe('https://liquipedia.net/rainbowsix/Six_Major_Alpha');
        expect(tournaments[0]?.game_id).toBe(7);
    });
});
