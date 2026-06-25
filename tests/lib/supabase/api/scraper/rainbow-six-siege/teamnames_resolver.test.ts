import { beforeEach, describe, expect, it } from 'vitest';
import TeamResolver from '@/lib/supabase/api/scraper/rainbow-six-siege/teamnames_resolver';

type UnknownTeamEntry = {
    occurrences: number;
    matchIds: number[];
    similarTo?: { teamId: number; teamName: string; similarity: number }[];
};

// Some logic (similarity matching, the Levenshtein implementation) is only
// reachable through private methods/fields. We access them directly via this
// structural type rather than only exercising them indirectly through
// resolveTeamId, so failures point at the exact algorithm that broke.
type AnyResolver = {
    teamLookup: Map<string, number>;
    allTeams: { id: number; name: string; aliases: string[] }[];
    unknownTeams: Map<string, UnknownTeamEntry>;
    resolveTeamId(name: string, matchId: number): number | null;
    getStats(): { knownTeams: number; totalAliases: number; unknownTeams: number };
    levenshteinDistance(a: string, b: string): number;
    calculateSimilarity(a: string, b: string): number;
};

describe('TeamResolver.normalize', () => {
    const resolver = new TeamResolver();

    it('lowercases, trims and collapses whitespace', () => {
        expect(resolver.normalize('  Team   Vitality  ')).toBe('team vitality');
    });

    it('strips punctuation', () => {
        expect(resolver.normalize('Team-Liquid!!')).toBe('teamliquid');
    });
});

describe('TeamResolver levenshtein/similarity', () => {
    const resolver = new TeamResolver() as unknown as AnyResolver;

    it('computes the Levenshtein edit distance', () => {
        expect(resolver.levenshteinDistance('kitten', 'sitting')).toBe(3);
        expect(resolver.levenshteinDistance('team', 'team')).toBe(0);
    });

    it('computes similarity as 1.0 for identical strings', () => {
        expect(resolver.calculateSimilarity('teamliquid', 'teamliquid')).toBe(1);
    });

    it('computes a lower similarity for very different strings', () => {
        const similarity = resolver.calculateSimilarity('teamliquid', 'fnatic');
        expect(similarity).toBeLessThan(0.5);
    });
});

describe('TeamResolver.resolveTeamId', () => {
    let resolver: AnyResolver;

    beforeEach(() => {
        resolver = new TeamResolver() as unknown as AnyResolver;
        resolver.teamLookup.set('team empire', 42);
        resolver.allTeams = [{ id: 42, name: 'Team Empire', aliases: ['Empire'] }];
    });

    it('resolves a known team via its normalized name', () => {
        expect(resolver.resolveTeamId('Team Empire', 1)).toBe(42);
    });

    it('returns null for an unrecognized team and tracks it as unknown', () => {
        const result = resolver.resolveTeamId('Totally Unknown Team', 1);
        expect(result).toBeNull();
        expect(resolver.unknownTeams.has('Totally Unknown Team')).toBe(true);
        expect(resolver.unknownTeams.get('Totally Unknown Team')?.occurrences).toBe(1);
    });

    it('accumulates occurrences and match ids across repeated lookups', () => {
        resolver.resolveTeamId('Totally Unknown Team', 1);
        resolver.resolveTeamId('Totally Unknown Team', 2);

        const entry = resolver.unknownTeams.get('Totally Unknown Team')!;
        expect(entry.occurrences).toBe(2);
        expect(entry.matchIds).toEqual([1, 2]);
    });

    it('suggests similar known teams for a likely typo', () => {
        resolver.resolveTeamId('Teem Empire', 1);

        const entry = resolver.unknownTeams.get('Teem Empire')!;
        expect(entry.similarTo?.[0]).toMatchObject({ teamId: 42, teamName: 'Team Empire' });
    });

    it('does not suggest unrelated teams below the similarity threshold', () => {
        resolver.resolveTeamId('Completely Different Org', 1);

        const entry = resolver.unknownTeams.get('Completely Different Org')!;
        expect(entry.similarTo).toEqual([]);
    });
});

describe('TeamResolver.getStats', () => {
    it('reports known team count, alias count and unknown team count', () => {
        const resolver = new TeamResolver() as unknown as AnyResolver;
        resolver.allTeams = [{ id: 1, name: 'Team A', aliases: [] }];
        resolver.teamLookup.set('team a', 1);
        resolver.resolveTeamId('Mystery Team', 1);

        expect(resolver.getStats()).toEqual({
            knownTeams: 1,
            totalAliases: 1,
            unknownTeams: 1,
        });
    });
});
