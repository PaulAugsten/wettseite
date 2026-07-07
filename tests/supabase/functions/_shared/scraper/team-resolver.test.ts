import { describe, expect, it } from 'vitest';
import { TeamResolver } from '@/supabase/functions/_shared/scraper/team-resolver.ts';

// The similarity/Levenshtein implementations are private. We access them via
// this structural type rather than only exercising them indirectly through
// resolveTeamId, so failures point at the exact algorithm that broke.
type AnyResolver = {
    levenshteinDistance(a: string, b: string): number;
    calculateSimilarity(a: string, b: string): number;
};

const EMPIRE = { id: 42, name: 'Team Empire', aliases: ['Empire'] };

describe('TeamResolver.normalize', () => {
    const resolver = new TeamResolver(1, []);

    it('lowercases, trims and collapses whitespace', () => {
        expect(resolver.normalize('  Team   Vitality  ')).toBe('team vitality');
    });

    it('strips punctuation', () => {
        expect(resolver.normalize('Team-Liquid!!')).toBe('teamliquid');
    });
});

describe('TeamResolver levenshtein/similarity', () => {
    const resolver = new TeamResolver(1, []) as unknown as AnyResolver;

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
    it('resolves a known team via its normalized name', () => {
        const resolver = new TeamResolver(1, [EMPIRE]);
        expect(resolver.resolveTeamId('Team Empire', 1)).toBe(42);
    });

    it('resolves a known team via one of its aliases', () => {
        const resolver = new TeamResolver(1, [EMPIRE]);
        expect(resolver.resolveTeamId('empire', 1)).toBe(42);
    });

    it('returns null for an unrecognized team and tracks it as unknown', () => {
        const resolver = new TeamResolver(1, [EMPIRE]);

        expect(resolver.resolveTeamId('Totally Unknown Team', 1)).toBeNull();

        const [unknown] = resolver.getUnknownTeams();
        expect(unknown).toMatchObject({ name: 'Totally Unknown Team', occurrences: 1 });
    });

    it('accumulates occurrences and match ids across repeated lookups', () => {
        const resolver = new TeamResolver(1, [EMPIRE]);
        resolver.resolveTeamId('Totally Unknown Team', 1);
        resolver.resolveTeamId('Totally Unknown Team', 2);

        const [unknown] = resolver.getUnknownTeams();
        expect(unknown?.occurrences).toBe(2);
        expect(unknown?.matchIds).toEqual([1, 2]);
    });

    it('suggests similar known teams for a likely typo', () => {
        const resolver = new TeamResolver(1, [EMPIRE]);
        resolver.resolveTeamId('Teem Empire', 1);

        const [unknown] = resolver.getUnknownTeams();
        expect(unknown?.similarTo[0]).toMatchObject({ teamId: 42, teamName: 'Team Empire' });
    });

    it('does not suggest unrelated teams below the similarity threshold', () => {
        const resolver = new TeamResolver(1, [EMPIRE]);
        resolver.resolveTeamId('Completely Different Org', 1);

        const [unknown] = resolver.getUnknownTeams();
        expect(unknown?.similarTo).toEqual([]);
    });
});

describe('TeamResolver.getStats', () => {
    it('reports known team count, alias count and unknown team count', () => {
        const resolver = new TeamResolver(1, [{ id: 1, name: 'Team A', aliases: [] }]);
        resolver.resolveTeamId('Mystery Team', 1);

        expect(resolver.getStats()).toEqual({
            knownTeams: 1,
            totalAliases: 1,
            unknownTeams: 1,
        });
    });
});
