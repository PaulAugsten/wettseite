import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    calculateMatchScore,
    parseMatch,
    parseMatchesFromStage,
} from '@/lib/supabase/api/scraper/rainbow-six-siege/match_parser';
import type TeamResolver from '@/lib/supabase/api/scraper/rainbow-six-siege/teamnames_resolver';
import type { Tournament } from '@/lib/supabase/api/scraper/rainbow-six-siege/types';

function fakeResolver(knownTeams: Record<string, number>) {
    return {
        getGameId: () => 1,
        resolveTeamId: (name: string) => knownTeams[name] ?? null,
    } as unknown as TeamResolver;
}

const baseTournament: Tournament = {
    id: 99,
    name: 'Test Major',
    game_id: 1,
    location: 'Test City',
    prize_pool: '$100,000',
    start_date: '2024-01-01T00:00:00.000Z',
    end_date: '2024-01-10T00:00:00.000Z',
    status: 'finished',
    url: 'https://liquipedia.net/rainbowsix/Test_Major',
};

describe('calculateMatchScore', () => {
    it('reads explicit numeric scores from the opponent templates', () => {
        const text = `
            |opponent1={{TeamOpponent|template=teamA|score=2}}
            |opponent2={{TeamOpponent|template=teamB|score=1}}
        `;
        expect(calculateMatchScore(text)).toEqual({ team1Score: 2, team2Score: 1 });
    });

    it('treats a "W" opponent score as a 1-0 win', () => {
        const text = `
            |opponent1={{TeamOpponent|template=teamA|score=W}}
            |opponent2={{TeamOpponent|template=teamB|score=FF}}
        `;
        expect(calculateMatchScore(text)).toEqual({ team1Score: 1, team2Score: 0 });
    });

    it('treats a forfeit ("FF") against team1 as a win for team2', () => {
        const text = `
            |opponent1={{TeamOpponent|template=teamA|score=FF}}
            |opponent2={{TeamOpponent|template=teamB|score=W}}
        `;
        expect(calculateMatchScore(text)).toEqual({ team1Score: 0, team2Score: 1 });
    });

    it('counts map wins using old-format score1/score2 fields', () => {
        const text = `
            |map1={{Map|map=Coastline|score1=7|score2=4|finished=true}}
            |map2={{Map|map=Border|score1=3|score2=6|finished=true}}
            |map3={{Map|map=Skyscraper|score1=7|score2=2|finished=true}}
        `;
        expect(calculateMatchScore(text)).toEqual({ team1Score: 2, team2Score: 1 });
    });

    it('counts map wins using atk/def round totals when score1/score2 are absent', () => {
        const text = `
            |map1={{Map|map=Coastline|t1atk=3|t1def=4|t2atk=2|t2def=1|finished=true}}
        `;
        expect(calculateMatchScore(text)).toEqual({ team1Score: 1, team2Score: 0 });
    });

    it('skips maps marked finished=skip', () => {
        const text = `
            |map1={{Map|map=Coastline|score1=1|score2=0|finished=skip}}
            |map2={{Map|map=Border|score1=0|score2=1|finished=true}}
        `;
        expect(calculateMatchScore(text)).toEqual({ team1Score: 0, team2Score: 1 });
    });

    it('returns 0-0 when there are no scores or maps', () => {
        const text = `|opponent1={{TeamOpponent|template=teamA}}|opponent2={{TeamOpponent|template=teamB}}`;
        expect(calculateMatchScore(text)).toEqual({ team1Score: 0, team2Score: 0 });
    });
});

describe('parseMatch', () => {
    const resolver = fakeResolver({ TeamA: 10, TeamB: 20 });

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    function matchText(extra = '') {
        return `{{Match
|r6esports=12345
|opponent1={{TeamOpponent|template=TeamA|score=2}}
|opponent2={{TeamOpponent|template=TeamB|score=0}}
|date=January 1, 2024 - 18:00 {{Abbr/UTC}}
${extra}
}}`;
    }

    it('parses a finished match and determines the winner', () => {
        const match = parseMatch(matchText('|finished=true'), resolver);
        expect(match).toMatchObject({
            external_id: 12345,
            team1_id: 10,
            team2_id: 20,
            team1_score: 2,
            team2_score: 0,
            winner_id: 10,
            status: 'finished',
        });
    });

    it('returns null when the match id is missing', () => {
        const text = matchText('|finished=true').replace('|r6esports=12345\n', '');
        expect(parseMatch(text, resolver)).toBeNull();
    });

    it('returns null when a team cannot be resolved', () => {
        const text = matchText('|finished=true').replace('TeamB', 'TeamC');
        expect(parseMatch(text, resolver)).toBeNull();
    });

    it('returns null when the date is missing', () => {
        const text = matchText('|finished=true').replace(
            '|date=January 1, 2024 - 18:00 {{Abbr/UTC}}\n',
            '',
        );
        expect(parseMatch(text, resolver)).toBeNull();
    });

    it('marks an unfinished match in the past as live', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-01T00:00:00.000Z'));
        const match = parseMatch(matchText(), resolver);
        expect(match?.status).toBe('live');
        expect(match?.winner_id).toBeNull();
    });

    it('marks an unfinished match in the future as planned', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
        const match = parseMatch(matchText(), resolver);
        expect(match?.status).toBe('planned');
    });
});

describe('parseMatchesFromStage', () => {
    const resolver = fakeResolver({ TeamA: 10, TeamB: 20 });

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-01T00:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('assigns the group letter for group-stage matches', () => {
        const text = `===Group A===
{{Match
|r6esports=1
|opponent1={{TeamOpponent|template=TeamA}}
|opponent2={{TeamOpponent|template=TeamB}}
|finished=true
|date=January 1, 2024 - 12:00 {{Abbr/UTC}}
}}`;
        const matches = parseMatchesFromStage(text, baseTournament, 'Group Stage', resolver);
        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({ group: 'A', stage: 'Group Stage', tournament_id: 99 });
    });

    it('assigns the Upper bracket for playoff matches under an Upper Bracket header', () => {
        const text = `|header=Upper Bracket Match 1
{{Match
|r6esports=2
|opponent1={{TeamOpponent|template=TeamA}}
|opponent2={{TeamOpponent|template=TeamB}}
|finished=true
|date=January 2, 2024 - 12:00 {{Abbr/UTC}}
}}`;
        const matches = parseMatchesFromStage(text, baseTournament, 'Playoffs', resolver);
        expect(matches).toHaveLength(1);
        expect(matches[0]).toMatchObject({ bracket: 'Upper', round: 'Upper Bracket Match 1' });
    });

    it('defaults playoff matches without an upper/lower header to a Single bracket', () => {
        const text = `{{Match
|r6esports=3
|opponent1={{TeamOpponent|template=TeamA}}
|opponent2={{TeamOpponent|template=TeamB}}
|finished=true
|date=January 3, 2024 - 12:00 {{Abbr/UTC}}
}}`;
        const matches = parseMatchesFromStage(text, baseTournament, 'Playoffs', resolver);
        expect(matches[0]).toMatchObject({ bracket: 'Single' });
    });

    it('skips matches that fail to parse', () => {
        const text = `{{Match
|opponent1={{TeamOpponent|template=TeamA}}
|opponent2={{TeamOpponent|template=TeamB}}
|finished=true
|date=January 1, 2024 - 12:00 {{Abbr/UTC}}
}}`;
        const matches = parseMatchesFromStage(text, baseTournament, 'Playoffs', resolver);
        expect(matches).toHaveLength(0);
    });
});
