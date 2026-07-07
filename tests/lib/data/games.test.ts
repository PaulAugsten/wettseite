import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGamesWithLiveTournaments, getGameWithTournaments } from '@/lib/data/games';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const liveTournament = {
    id: 11,
    name: 'Six Major',
    slug: 'six-major',
    location: 'Paris, France',
    prize_pool: '$100,000',
    start_date: '2024-01-01',
    end_date: '2024-01-10',
    status: 'live',
};

function mockGamesQuery({
    data,
    error = null,
}: {
    data: unknown;
    error?: { message: string; code?: string } | null;
}) {
    vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(async () => ({ data, error })),
            })),
        })),
    } as unknown as Awaited<ReturnType<typeof createClient>>);
}

function mockSingleGameQuery({
    data,
    error = null,
}: {
    data: unknown;
    error?: { message: string; code?: string } | null;
}) {
    vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                        single: vi.fn(async () => ({ data, error })),
                    })),
                })),
            })),
        })),
    } as unknown as Awaited<ReturnType<typeof createClient>>);
}

describe('getGamesWithLiveTournaments', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns games with their live tournaments and drops games without any', async () => {
        mockGamesQuery({
            data: [
                { id: 1, name: 'Rainbow Six Siege', slug: 'r6', tournaments: [liveTournament] },
                { id: 2, name: 'Football', slug: 'football', tournaments: [] },
            ],
        });

        const result = await getGamesWithLiveTournaments();

        expect(result).toHaveLength(1);
        expect(result?.[0]).toMatchObject({ id: 1, slug: 'r6' });
        expect(result?.[0]?.tournaments[0]).toMatchObject({ id: 11, status: 'live' });
    });

    it('returns null on query failure', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockGamesQuery({ data: null, error: { message: 'connection refused' } });

        expect(await getGamesWithLiveTournaments()).toBeNull();
        errorSpy.mockRestore();
    });
});

describe('getGameWithTournaments', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns the game with tournaments, narrowing unknown statuses to "scheduled"', async () => {
        mockSingleGameQuery({
            data: {
                id: 1,
                name: 'Rainbow Six Siege',
                slug: 'r6',
                tournaments: [{ ...liveTournament, status: 'something-unexpected' }],
            },
        });

        const result = await getGameWithTournaments('r6');

        expect(result?.tournaments[0]?.status).toBe('scheduled');
    });

    it('returns null when the game does not exist', async () => {
        mockSingleGameQuery({ data: null, error: { message: 'not found', code: 'PGRST116' } });

        expect(await getGameWithTournaments('missing')).toBeNull();
    });
});
