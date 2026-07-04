import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTournamentWithMatches } from '@/lib/data/tournaments';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const team1 = { id: 10, name: 'Team Liquid', short_name: 'TL', slug: 'team-liquid' };
const team2 = { id: 20, name: 'Team Vitality', short_name: 'VIT', slug: 'team-vitality' };

function matchRow(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        date: '2024-01-02T18:00:00.000Z',
        team1_score: 0,
        team2_score: 0,
        winner_id: null,
        status: 'planned',
        round: '',
        stage: '',
        group: '',
        bracket: '',
        team1,
        team2,
        ...overrides,
    };
}

function tournamentRow(matches: unknown[]) {
    return {
        id: 5,
        name: 'Six Major',
        slug: 'six-major',
        location: 'Paris, France',
        prize_pool: '$100,000',
        start_date: '2024-01-01',
        end_date: '2024-01-10',
        status: 'live',
        matches,
        games: { slug: 'r6' },
    };
}

function mockTournamentQuery({
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
                    eq: vi.fn(() => ({
                        order: vi.fn(() => ({
                            single: vi.fn(async () => ({ data, error })),
                        })),
                    })),
                })),
            })),
        })),
    } as unknown as Awaited<ReturnType<typeof createClient>>);
}

describe('getTournamentWithMatches', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns the tournament with its matches mapped to domain types', async () => {
        mockTournamentQuery({
            data: tournamentRow([
                matchRow(),
                matchRow({ id: 2, status: 'finished', winner_id: 10 }),
            ]),
        });

        const result = await getTournamentWithMatches('r6', 'six-major');

        expect(result).toMatchObject({ id: 5, name: 'Six Major', status: 'live' });
        expect(result?.matches).toHaveLength(2);
        expect(result?.matches[0]).toMatchObject({ id: 1, status: 'planned', team1, team2 });
        expect(result?.matches[1]).toMatchObject({ id: 2, status: 'finished', winner_id: 10 });
        // The internal `games` join used for slug scoping must not leak out.
        expect(result).not.toHaveProperty('games');
    });

    it('narrows unknown match statuses to "planned" and null dates to an empty string', async () => {
        mockTournamentQuery({
            data: tournamentRow([matchRow({ status: null, date: null })]),
        });

        const result = await getTournamentWithMatches('r6', 'six-major');

        expect(result?.matches[0]).toMatchObject({ status: 'planned', date: '' });
    });

    it('returns null when the tournament does not exist', async () => {
        mockTournamentQuery({ data: null, error: { message: 'not found', code: 'PGRST116' } });

        expect(await getTournamentWithMatches('r6', 'missing')).toBeNull();
    });

    it('returns null and logs on other query failures', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockTournamentQuery({ data: null, error: { message: 'connection refused' } });

        expect(await getTournamentWithMatches('r6', 'six-major')).toBeNull();
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });
});
