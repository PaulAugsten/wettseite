import type { Match } from '@/lib/types';

/**
 * A pause of at least this many hours between consecutive matches starts a
 * new playday. Sessions that run past midnight stay on the previous
 * evening's playday, while a tournament played in another timezone forms
 * its own sessions without any fixed clock cutoff.
 */
const SESSION_GAP_HOURS = 8;

/** Labels use a fixed timezone so server render and client hydration agree. */
const LABEL_TIME_ZONE = 'Europe/Berlin';

const keyFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: LABEL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const labelFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: LABEL_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
});

export type Playday = {
    /** Unique, stable key derived from the session's starting date. */
    key: string;
    /** Human label of the session's starting date, e.g. "Sat 5 Jul". */
    label: string;
    /** Matches of the session in chronological order. */
    matches: Match[];
    hasLive: boolean;
};

/**
 * Groups matches into chronologically ordered playdays. A playday is a
 * session of matches where each starts within `SESSION_GAP_HOURS` of the
 * previous one.
 */
export function groupMatchesByPlayday(matches: Match[]): Playday[] {
    const sorted = matches.toSorted(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const playdays: Playday[] = [];
    const usedKeys = new Set<string>();
    let previousStart = Number.NEGATIVE_INFINITY;

    for (const match of sorted) {
        const start = new Date(match.date).getTime();
        const current = playdays.at(-1);

        if (!current || start - previousStart > SESSION_GAP_HOURS * 60 * 60 * 1000) {
            const date = new Date(match.date);
            const baseKey = keyFormat.format(date);
            let key = baseKey;
            for (let n = 2; usedKeys.has(key); n++) {
                key = `${baseKey}-${n}`;
            }
            usedKeys.add(key);
            playdays.push({
                key,
                label: labelFormat.format(date),
                matches: [match],
                hasLive: false,
            });
        } else {
            current.matches.push(match);
        }

        const day = playdays.at(-1);
        if (day && match.status === 'live') day.hasLive = true;
        previousStart = start;
    }

    return playdays;
}

/**
 * The playday to open with: the first with a live match, else the first
 * with a match still to play, else the last (most recent) one.
 */
export function defaultPlaydayKey(playdays: Playday[]): string | null {
    const live = playdays.find((day) => day.hasLive);
    if (live) return live.key;

    const upcoming = playdays.find((day) => day.matches.some((m) => m.status === 'planned'));
    if (upcoming) return upcoming.key;

    return playdays.at(-1)?.key ?? null;
}
