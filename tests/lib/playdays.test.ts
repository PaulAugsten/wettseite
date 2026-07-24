import { describe, expect, it } from 'vitest';
import { defaultPlaydayKey, groupMatchesByPlayday } from '@/lib/playdays';
import type { Match, MatchStatus } from '@/lib/types';

function match(id: number, date: string, status: MatchStatus = 'planned'): Match {
    return {
        id,
        date,
        team1: null,
        team2: null,
        team1_score: 0,
        team2_score: 0,
        winner_id: 0,
        status,
        round: '',
        stage: '',
        group: '',
        bracket: '',
    };
}

describe('groupMatchesByPlayday', () => {
    it('keeps an evening session that runs past midnight on one playday', () => {
        const playdays = groupMatchesByPlayday([
            match(1, '2026-07-04T16:00:00Z'),
            match(2, '2026-07-04T19:00:00Z'),
            match(3, '2026-07-04T22:00:00Z'),
            match(4, '2026-07-05T01:00:00Z'),
        ]);

        expect(playdays).toHaveLength(1);
        expect(playdays[0]?.matches.map((m) => m.id)).toEqual([1, 2, 3, 4]);
        expect(playdays[0]?.label).toBe('Sat 4 Jul');
    });

    it('starts a new playday after a gap of more than eight hours', () => {
        const playdays = groupMatchesByPlayday([
            match(1, '2026-07-04T16:00:00Z'),
            match(2, '2026-07-05T16:00:00Z'),
            match(3, '2026-07-05T19:00:00Z'),
        ]);

        expect(playdays.map((day) => day.matches.map((m) => m.id))).toEqual([[1], [2, 3]]);
    });

    it('sorts matches chronologically regardless of input order', () => {
        const playdays = groupMatchesByPlayday([
            match(2, '2026-07-04T19:00:00Z'),
            match(1, '2026-07-04T16:00:00Z'),
        ]);

        expect(playdays[0]?.matches.map((m) => m.id)).toEqual([1, 2]);
    });

    it('gives sessions starting on the same date unique keys', () => {
        // A morning and an evening block separated by more than eight hours.
        const playdays = groupMatchesByPlayday([
            match(1, '2026-07-04T04:00:00Z'),
            match(2, '2026-07-04T18:00:00Z'),
        ]);

        expect(playdays).toHaveLength(2);
        expect(new Set(playdays.map((day) => day.key)).size).toBe(2);
    });

    it('flags playdays containing a live match', () => {
        const playdays = groupMatchesByPlayday([
            match(1, '2026-07-04T16:00:00Z', 'finished'),
            match(2, '2026-07-04T19:00:00Z', 'live'),
        ]);

        expect(playdays[0]?.hasLive).toBe(true);
    });
});

describe('defaultPlaydayKey', () => {
    const finishedDay = [match(1, '2026-07-03T16:00:00Z', 'finished')];
    const liveDay = [match(2, '2026-07-04T16:00:00Z', 'live')];
    const plannedDay = [match(3, '2026-07-05T16:00:00Z', 'planned')];

    it('prefers the playday with a live match', () => {
        const playdays = groupMatchesByPlayday([...finishedDay, ...liveDay, ...plannedDay]);
        expect(defaultPlaydayKey(playdays)).toBe(playdays[1]?.key);
    });

    it('falls back to the first playday with a match still to play', () => {
        const playdays = groupMatchesByPlayday([...finishedDay, ...plannedDay]);
        expect(defaultPlaydayKey(playdays)).toBe(playdays[1]?.key);
    });

    it('falls back to the last playday when everything is finished', () => {
        const playdays = groupMatchesByPlayday([
            ...finishedDay,
            match(4, '2026-07-04T16:00:00Z', 'finished'),
        ]);
        expect(defaultPlaydayKey(playdays)).toBe(playdays[1]?.key);
    });

    it('returns null for an empty list', () => {
        expect(defaultPlaydayKey([])).toBeNull();
    });
});
