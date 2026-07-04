import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMatchPredictions } from '@/lib/data/predictions';
import { createClient } from '@/lib/supabase/server';
import type { Match } from '@/lib/types';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

type PredictionRow = { match_id: number; predicted_winner_id: number | null };

function mockPredictionsQuery({ all, mine }: { all: PredictionRow[]; mine: PredictionRow[] }) {
    // The community query ends in `.in(...)`; the user query adds `.eq(user_id)` first.
    vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                in: vi.fn(async () => ({ data: all, error: null })),
                eq: vi.fn(() => ({
                    in: vi.fn(async () => ({ data: mine, error: null })),
                })),
            })),
        })),
    } as unknown as Awaited<ReturnType<typeof createClient>>);
}

function match(
    id: number,
    team1Id: number,
    team2Id: number,
): Pick<Match, 'id' | 'team1' | 'team2'> {
    const team = (teamId: number) => ({
        id: teamId,
        name: `Team ${teamId}`,
        short_name: null,
        slug: `team-${teamId}`,
    });
    return { id, team1: team(team1Id), team2: team(team2Id) };
}

describe('getMatchPredictions', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty maps without querying when there are no matches', async () => {
        const result = await getMatchPredictions([], 'user-1');

        expect(result.stats.size).toBe(0);
        expect(result.userPicks.size).toBe(0);
        expect(createClient).not.toHaveBeenCalled();
    });

    it('counts community picks per team and collects the user picks', async () => {
        mockPredictionsQuery({
            all: [
                { match_id: 1, predicted_winner_id: 10 },
                { match_id: 1, predicted_winner_id: 10 },
                { match_id: 1, predicted_winner_id: 20 },
                { match_id: 2, predicted_winner_id: 30 },
            ],
            mine: [{ match_id: 1, predicted_winner_id: 10 }],
        });

        const { stats, userPicks } = await getMatchPredictions(
            [match(1, 10, 20), match(2, 30, 40)],
            'user-1',
        );

        expect(stats.get(1)).toEqual({ team1: 2, team2: 1, total: 3 });
        expect(stats.get(2)).toEqual({ team1: 1, team2: 0, total: 1 });
        expect(userPicks.get(1)).toBe(10);
        expect(userPicks.has(2)).toBe(false);
    });

    it('returns zeroed stats for matches without predictions', async () => {
        mockPredictionsQuery({ all: [], mine: [] });

        const { stats } = await getMatchPredictions([match(1, 10, 20)], undefined);

        expect(stats.get(1)).toEqual({ team1: 0, team2: 0, total: 0 });
    });
});
