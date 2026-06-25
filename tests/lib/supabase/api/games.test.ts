import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGames } from '@/lib/supabase/api/games';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

describe('getGames', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns the games on success', async () => {
        const games = [
            { id: 1, name: 'Rainbow Six Siege', type: 'esports', slug: 'r6', created_at: '' },
        ];
        vi.mocked(createClient).mockResolvedValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({ data: games, error: null })),
            })),
        } as unknown as Awaited<ReturnType<typeof createClient>>);

        const result = await getGames();

        expect(result).toEqual({ data: games, error: null });
    });

    it('returns the error and null data on failure', async () => {
        const error = new Error('connection refused');
        vi.mocked(createClient).mockResolvedValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({ data: null, error })),
            })),
        } as unknown as Awaited<ReturnType<typeof createClient>>);

        const result = await getGames();

        expect(result).toEqual({ data: null, error });
    });
});
