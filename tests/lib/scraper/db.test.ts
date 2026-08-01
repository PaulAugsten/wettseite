import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}));

import {
    getActiveTournamentIds,
    getUniqueGameSlugsFromTournamentIds,
    refreshTournamentStatus,
} from '@/lib/scraper/db';
import { createAdminClient } from '@/lib/supabase/admin';

type QueryResult = { data: unknown; error: { message: string } | null };

type StubQuery = {
    select: (...args: unknown[]) => StubQuery;
    eq: (...args: unknown[]) => StubQuery;
    in: (...args: unknown[]) => StubQuery;
    neq: (...args: unknown[]) => StubQuery;
    then: <T>(onFulfilled: (value: QueryResult) => T) => Promise<T>;
};

/**
 * Stand-in for the PostgREST builder: every filter returns the builder itself
 * and awaiting it at any point in the chain yields the canned result. Filter
 * calls are recorded so tests can assert on the query that was built.
 */
function stubClient(result: QueryResult) {
    const calls: [string, unknown[]][] = [];

    const record =
        (name: string) =>
        (...args: unknown[]) => {
            calls.push([name, args]);
            return query;
        };

    const query: StubQuery = {
        select: record('select'),
        eq: record('eq'),
        in: record('in'),
        neq: record('neq'),
        // biome-ignore lint/suspicious/noThenProperty: the PostgREST builder is itself a thenable, so the stub has to be one for `await query` to resolve
        then: (onFulfilled) => Promise.resolve(result).then(onFulfilled),
    };

    const from = vi.fn(() => query);
    const rpc = vi.fn(async () => result);

    vi.mocked(createAdminClient).mockReturnValue({ from, rpc } as unknown as ReturnType<
        typeof createAdminClient
    >);

    return { calls, from, rpc };
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getUniqueGameSlugsFromTournamentIds', () => {
    it('short-circuits on an empty id list without opening a connection', async () => {
        stubClient({ data: [], error: null });

        await expect(getUniqueGameSlugsFromTournamentIds([])).resolves.toEqual([]);
        expect(createAdminClient).not.toHaveBeenCalled();
    });

    it('collapses the joined rows to one slug per game', async () => {
        // Several tournaments of the same game must not scrape that game twice.
        stubClient({
            data: [
                { games: { slug: 'rainbow-six-siege' } },
                { games: { slug: 'rainbow-six-siege' } },
                { games: { slug: 'valorant' } },
            ],
            error: null,
        });

        const slugs = await getUniqueGameSlugsFromTournamentIds([1, 2, 3]);

        expect(slugs).toEqual(['rainbow-six-siege', 'valorant']);
    });

    it('filters on the requested ids', async () => {
        const { calls, from } = stubClient({ data: [], error: null });

        await getUniqueGameSlugsFromTournamentIds([4, 5]);

        expect(from).toHaveBeenCalledWith('tournaments');
        expect(calls).toContainEqual(['in', ['id', [4, 5]]]);
    });

    it('throws with the offending ids when the join fails', async () => {
        stubClient({ data: null, error: { message: 'relation missing' } });

        await expect(getUniqueGameSlugsFromTournamentIds([7, 8])).rejects.toThrow(
            'Error resolving game ids for tournaments [7,8]: relation missing',
        );
    });
});

describe('getActiveTournamentIds', () => {
    it('returns the ids of everything not yet finished', async () => {
        const { calls, from } = stubClient({ data: [{ id: 3 }, { id: 9 }], error: null });

        await expect(getActiveTournamentIds()).resolves.toEqual([3, 9]);
        expect(from).toHaveBeenCalledWith('tournaments');
        // Live *and* planned tournaments are in scope, so this must exclude
        // 'finished' rather than select 'live'.
        expect(calls).toContainEqual(['neq', ['status', 'finished']]);
    });

    it('throws when the lookup fails', async () => {
        stubClient({ data: null, error: { message: 'connection reset' } });

        await expect(getActiveTournamentIds()).rejects.toThrow(
            'Error getting ids for active tournaments: connection reset',
        );
    });
});

describe('refreshTournamentStatus', () => {
    it('returns the number of tournaments the sweep closed out', async () => {
        const { rpc } = stubClient({ data: 4, error: null });

        await expect(refreshTournamentStatus()).resolves.toBe(4);
        expect(rpc).toHaveBeenCalledWith('refresh_tournament_status');
    });

    it('reports zero when the function returns no count', async () => {
        stubClient({ data: null, error: null });

        await expect(refreshTournamentStatus()).resolves.toBe(0);
    });

    it('throws when the sweep fails', async () => {
        stubClient({ data: null, error: { message: 'permission denied' } });

        await expect(refreshTournamentStatus()).rejects.toThrow(
            'Error refreshing tournament status: permission denied',
        );
    });
});
