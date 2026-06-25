import { revalidatePath } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { predict } from '@/app/(root)/[game]/[tournament]/actions';
import { createClient } from '@/lib/supabase/server';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

type MatchRow = {
    date: string;
    status: string;
    team1_id: number;
    team2_id: number;
};

function mockSupabase({
    userId = 'user-1',
    match,
    upsertError = null,
}: {
    userId?: string | null;
    match: MatchRow | null;
    upsertError?: { message: string } | null;
}) {
    const upsert = vi.fn(async () => ({ error: upsertError }));

    vi.mocked(createClient).mockResolvedValue({
        auth: {
            getUser: vi.fn(async () => ({
                data: { user: userId ? { id: userId } : null },
            })),
        },
        from: vi.fn((table: string) => {
            if (table === 'matches') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: async () => ({ data: match }),
                        }),
                    }),
                };
            }
            if (table === 'predictions') {
                return { upsert };
            }
            throw new Error(`unexpected table: ${table}`);
        }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    return { upsert };
}

const FUTURE_MATCH: MatchRow = {
    date: '2099-01-01T00:00:00.000Z',
    status: 'planned',
    team1_id: 10,
    team2_id: 20,
};

describe('predict', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('rejects when the user is not logged in', async () => {
        mockSupabase({ userId: null, match: FUTURE_MATCH });

        const result = await predict(1, 10, '/some/path');

        expect(result).toEqual({ error: 'You must be logged in to predict' });
    });

    it('rejects predictions on a match that is not planned', async () => {
        mockSupabase({ match: { ...FUTURE_MATCH, status: 'live' } });

        const result = await predict(1, 10, '/some/path');

        expect(result).toEqual({ error: 'Prediction deadline has passed' });
    });

    it('rejects predictions once the match start time has passed', async () => {
        mockSupabase({ match: { ...FUTURE_MATCH, date: '2023-01-01T00:00:00.000Z' } });

        const result = await predict(1, 10, '/some/path');

        expect(result).toEqual({ error: 'Prediction deadline has passed' });
    });

    it('rejects a team id that does not belong to the match', async () => {
        mockSupabase({ match: FUTURE_MATCH });

        const result = await predict(1, 999, '/some/path');

        expect(result).toEqual({ error: 'Invalid team for this match' });
    });

    it('upserts the prediction and revalidates the page on success', async () => {
        const { upsert } = mockSupabase({ match: FUTURE_MATCH });

        const result = await predict(1, 10, '/some/path');

        expect(result).toEqual({ success: true });
        expect(upsert).toHaveBeenCalledWith(
            {
                user_id: 'user-1',
                match_id: 1,
                predicted_winner_id: 10,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id, match_id' },
        );
        expect(revalidatePath).toHaveBeenCalledWith('/some/path');
    });

    it('surfaces a database error from the upsert', async () => {
        mockSupabase({ match: FUTURE_MATCH, upsertError: { message: 'db exploded' } });

        const result = await predict(1, 10, '/some/path');

        expect(result).toEqual({ error: 'db exploded' });
    });
});
