import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UnknownTeam } from '@/lib/scraper/_shared/team-resolver';
import type { Match } from '@/lib/scraper/_shared/types';
import type { GameScraper } from '@/lib/scraper/types';

vi.mock('@/lib/scraper/db', () => ({
    getActiveTournamentIds: vi.fn(),
    getUniqueGameSlugsFromTournamentIds: vi.fn(),
    insertMatches: vi.fn(),
    refreshTournamentStatus: vi.fn(),
}));

vi.mock('@/lib/scraper/registry', () => ({
    getScraper: vi.fn(),
    getScraperSlugs: vi.fn(),
}));

import * as db from '@/lib/scraper/db';
import { scrapeMatches } from '@/lib/scraper/matches';
import * as registry from '@/lib/scraper/registry';

/** Builds a scraper whose match/unknown-team payloads are only counted, never inspected. */
function fakeScraper(gameId: number, matchCount: number, unknownCount = 0): GameScraper {
    return {
        scrapeTournaments: vi.fn(),
        scrapeMatches: vi.fn(async () => ({
            gameId,
            matches: Array.from(
                { length: matchCount },
                (_, i) => ({ external_id: gameId * 100 + i }) as Match,
            ),
            unknownTeams: Array.from(
                { length: unknownCount },
                (_, i) => ({ name: `unknown-${gameId}-${i}` }) as UnknownTeam,
            ),
            overview: [],
        })),
    };
}

/** The ids the registered scraper for `slug` was invoked with. */
function idsPassedTo(scraper: GameScraper): number[] {
    return vi.mocked(scraper.scrapeMatches).mock.calls[0]?.[0] ?? [];
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(db.insertMatches).mockResolvedValue(0);
    vi.mocked(db.refreshTournamentStatus).mockResolvedValue(0);
});

describe('scrapeMatches — active filtering', () => {
    it('intersects explicit ids with active ones rather than replacing them', async () => {
        vi.mocked(db.getActiveTournamentIds).mockResolvedValue([2, 3, 4]);
        vi.mocked(db.getUniqueGameSlugsFromTournamentIds).mockResolvedValue(['rainbow-six-siege']);
        const scraper = fakeScraper(1, 2);
        vi.mocked(registry.getScraper).mockReturnValue(scraper);

        await scrapeMatches({ active: true, tournamentIds: [1, 2, 3] });

        expect(idsPassedTo(scraper)).toEqual([2, 3]);
    });

    it('removes every inactive id, including consecutive ones', async () => {
        // Regression guard: a splice-while-iterating filter skips the element
        // that shifts into the vacated slot and leaks inactive ids through.
        vi.mocked(db.getActiveTournamentIds).mockResolvedValue([4]);
        vi.mocked(db.getUniqueGameSlugsFromTournamentIds).mockResolvedValue(['rainbow-six-siege']);
        const scraper = fakeScraper(1, 1);
        vi.mocked(registry.getScraper).mockReturnValue(scraper);

        await scrapeMatches({ active: true, tournamentIds: [1, 2, 3, 4] });

        expect(idsPassedTo(scraper)).toEqual([4]);
    });

    it('scrapes every active tournament when no ids are given', async () => {
        vi.mocked(db.getActiveTournamentIds).mockResolvedValue([7, 8]);
        vi.mocked(db.getUniqueGameSlugsFromTournamentIds).mockResolvedValue(['rainbow-six-siege']);
        const scraper = fakeScraper(1, 1);
        vi.mocked(registry.getScraper).mockReturnValue(scraper);

        await scrapeMatches({ active: true });

        expect(idsPassedTo(scraper)).toEqual([7, 8]);
    });

    it('scrapes nothing when nothing is active', async () => {
        vi.mocked(db.getActiveTournamentIds).mockResolvedValue([]);

        const result = await scrapeMatches({ active: true });

        expect(result).toEqual({
            scraped: 0,
            persisted: 0,
            unknownTeams: 0,
            perGame: [],
            tournamentsFinished: 0,
        });
        expect(registry.getScraperSlugs).not.toHaveBeenCalled();
        expect(registry.getScraper).not.toHaveBeenCalled();
    });

    it('scrapes nothing when none of the requested ids are active', async () => {
        // Must not fall through to the all-games path: --active scoped to ids
        // that are all finished means "no work", not "scrape everything".
        vi.mocked(db.getActiveTournamentIds).mockResolvedValue([9]);

        const result = await scrapeMatches({
            active: true,
            tournamentIds: [1, 2],
        });

        expect(result.scraped).toBe(0);
        expect(registry.getScraperSlugs).not.toHaveBeenCalled();
        expect(registry.getScraper).not.toHaveBeenCalled();
    });
});

describe('scrapeMatches — game selection', () => {
    it('falls back to every registered game when no ids and not active', async () => {
        vi.mocked(registry.getScraperSlugs).mockReturnValue(['rainbow-six-siege']);
        const scraper = fakeScraper(1, 3);
        vi.mocked(registry.getScraper).mockReturnValue(scraper);

        await scrapeMatches({});

        expect(registry.getScraper).toHaveBeenCalledWith('rainbow-six-siege');
        expect(idsPassedTo(scraper)).toEqual([]);
        expect(db.getActiveTournamentIds).not.toHaveBeenCalled();
    });

    it('derives the games from the requested tournament ids', async () => {
        vi.mocked(db.getUniqueGameSlugsFromTournamentIds).mockResolvedValue(['rainbow-six-siege']);
        vi.mocked(registry.getScraper).mockReturnValue(fakeScraper(1, 1));

        await scrapeMatches({ tournamentIds: [5, 6] });

        expect(db.getUniqueGameSlugsFromTournamentIds).toHaveBeenCalledWith([5, 6]);
        expect(registry.getScraperSlugs).not.toHaveBeenCalled();
    });

    it('accumulates matches and unknown teams across games', async () => {
        vi.mocked(registry.getScraperSlugs).mockReturnValue(['r6', 'valorant']);
        const r6 = fakeScraper(1, 2, 1);
        const valorant = fakeScraper(2, 3, 2);
        vi.mocked(registry.getScraper).mockImplementation((slug) =>
            slug === 'r6' ? r6 : valorant,
        );

        const result = await scrapeMatches({});

        expect(result.scraped).toBe(5);
        expect(result.unknownTeams).toBe(3);
    });

    it('reports each game separately so the CLI can attribute unknown teams', async () => {
        vi.mocked(registry.getScraperSlugs).mockReturnValue(['r6', 'valorant']);
        const r6 = fakeScraper(1, 2, 1);
        const valorant = fakeScraper(2, 3, 2);
        vi.mocked(registry.getScraper).mockImplementation((slug) =>
            slug === 'r6' ? r6 : valorant,
        );

        const result = await scrapeMatches({});

        expect(result.perGame).toEqual([
            {
                gameSlug: 'r6',
                gameId: 1,
                unknownTeams: [{ name: 'unknown-1-0' }],
                overview: [],
            },
            {
                gameSlug: 'valorant',
                gameId: 2,
                unknownTeams: [{ name: 'unknown-2-0' }, { name: 'unknown-2-1' }],
                overview: [],
            },
        ]);
    });
});

describe('scrapeMatches — persistence', () => {
    it('writes every collected match and reports the persisted count', async () => {
        vi.mocked(registry.getScraperSlugs).mockReturnValue(['r6', 'valorant']);
        vi.mocked(registry.getScraper).mockImplementation((slug) =>
            slug === 'r6' ? fakeScraper(1, 2) : fakeScraper(2, 3),
        );
        vi.mocked(db.insertMatches).mockResolvedValue(5);

        const result = await scrapeMatches({ persist: true });

        expect(vi.mocked(db.insertMatches).mock.calls[0]?.[0]).toHaveLength(5);
        expect(result).toMatchObject({
            scraped: 5,
            persisted: 5,
            unknownTeams: 0,
        });
    });

    it('sweeps tournament status only after the matches are inserted', async () => {
        // The sweep reads `matches` to decide what is finished, so running it
        // first would judge tournaments on the previous run's data.
        const order: string[] = [];
        vi.mocked(registry.getScraperSlugs).mockReturnValue(['r6']);
        vi.mocked(registry.getScraper).mockReturnValue(fakeScraper(1, 2));
        vi.mocked(db.insertMatches).mockImplementation(async () => {
            order.push('insert');
            return 2;
        });
        vi.mocked(db.refreshTournamentStatus).mockImplementation(async () => {
            order.push('sweep');
            return 3;
        });

        const result = await scrapeMatches({ persist: true });

        expect(order).toEqual(['insert', 'sweep']);
        expect(result.tournamentsFinished).toBe(3);
    });

    it('does not sweep tournament status on a dry run', async () => {
        vi.mocked(registry.getScraperSlugs).mockReturnValue(['r6']);
        vi.mocked(registry.getScraper).mockReturnValue(fakeScraper(1, 2));

        const result = await scrapeMatches({});

        expect(db.refreshTournamentStatus).not.toHaveBeenCalled();
        expect(result.tournamentsFinished).toBe(0);
    });

    it('does not touch the database on a dry run', async () => {
        vi.mocked(registry.getScraperSlugs).mockReturnValue(['r6']);
        vi.mocked(registry.getScraper).mockReturnValue(fakeScraper(1, 4));

        const result = await scrapeMatches({});

        expect(db.insertMatches).not.toHaveBeenCalled();
        expect(result.persisted).toBe(0);
        expect(result.scraped).toBe(4);
    });
});
