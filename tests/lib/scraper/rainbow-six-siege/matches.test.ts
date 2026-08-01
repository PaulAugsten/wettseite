import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match, Tournament } from '@/lib/scraper/_shared/types';

vi.mock('@/lib/scraper/db', () => ({
    getGameIdBySlug: vi.fn(),
    getTeamRecords: vi.fn(),
    getTournaments: vi.fn(),
}));

vi.mock('@/lib/scraper/_shared/liquipedia/collect-matches.ts', () => ({
    collectMatches: vi.fn(),
}));

import { collectMatches } from '@/lib/scraper/_shared/liquipedia/collect-matches.ts';
import * as db from '@/lib/scraper/db';
import { scrapeRainbowSixSiegeMatches } from '@/lib/scraper/rainbow-six-siege/matches';

const tournament: Tournament = {
    id: 99,
    name: 'Six Major',
    game_id: 7,
    location: 'Paris, France',
    prize_pool: '$100,000',
    start_date: '2024-01-01T00:00:00.000Z',
    end_date: '2024-01-10T00:00:00.000Z',
    status: 'live',
    url: 'https://liquipedia.net/rainbowsix/Six_Major',
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(db.getGameIdBySlug).mockResolvedValue(7);
    vi.mocked(db.getTeamRecords).mockResolvedValue([{ id: 10, name: 'Team A', aliases: [] }]);
    vi.mocked(db.getTournaments).mockResolvedValue([tournament]);
    vi.mocked(collectMatches).mockResolvedValue({ matches: [], overview: [] });
});

describe('scrapeRainbowSixSiegeMatches', () => {
    it('throws when the game is not registered in the database', async () => {
        vi.mocked(db.getGameIdBySlug).mockResolvedValue(null);

        await expect(scrapeRainbowSixSiegeMatches([1])).rejects.toThrow(
            'Game not found for slug: rainbow-six-siege',
        );
        expect(collectMatches).not.toHaveBeenCalled();
    });

    it('returns an empty result without hitting Liquipedia when nothing is in scope', async () => {
        vi.mocked(db.getTournaments).mockResolvedValue([]);

        const result = await scrapeRainbowSixSiegeMatches([1]);

        expect(result).toEqual({ gameId: 7, matches: [], unknownTeams: [], overview: [] });
        expect(collectMatches).not.toHaveBeenCalled();
    });

    it('scopes the tournament and team lookups to the resolved game', async () => {
        await scrapeRainbowSixSiegeMatches([4, 5]);

        expect(db.getTournaments).toHaveBeenCalledWith(7, [4, 5]);
        expect(db.getTeamRecords).toHaveBeenCalledWith(7);
        expect(vi.mocked(collectMatches).mock.calls[0]?.[0]).toMatchObject({
            wiki: 'rainbowsix',
            tournaments: [tournament],
        });
    });

    it('returns the collected matches alongside the teams the resolver could not map', async () => {
        const matches = [{ external_id: 1 }, { external_id: 2 }] as Match[];
        vi.mocked(collectMatches).mockImplementation(async ({ teamResolver }) => {
            // Unknown teams are gathered as a side effect of parsing, so they
            // can only be read back off the resolver once collection is done.
            teamResolver.resolveTeamId('Nonexistent Squad', 4242);
            return { matches, overview: [] };
        });

        const result = await scrapeRainbowSixSiegeMatches([]);

        expect(result.gameId).toBe(7);
        expect(result.matches).toEqual(matches);
        expect(result.unknownTeams).toHaveLength(1);
        expect(result.unknownTeams[0]).toMatchObject({ name: 'Nonexistent Squad' });
    });
});
