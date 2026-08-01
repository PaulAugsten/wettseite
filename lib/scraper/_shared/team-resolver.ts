export type TeamRecord = {
    id: number;
    name: string;
    aliases: string[];
};

export type UnknownTeam = {
    name: string;
    occurrences: number;
    matchIds: number[];
    similarTo: { teamId: number; teamName: string; similarity: number }[];
};

/**
 * Maps scraped team names to database team ids via normalized names and
 * aliases, and records the names it couldn't resolve (with fuzzy-match
 * suggestions) for later review. Pure: callers fetch the team records.
 */
export class TeamResolver {
    private readonly teamLookup = new Map<string, number>();
    private readonly unknownTeams = new Map<string, UnknownTeam>();

    constructor(
        private readonly gameId: number,
        private readonly teams: TeamRecord[],
    ) {
        for (const team of teams) {
            this.teamLookup.set(this.normalize(team.name), team.id);
            for (const alias of team.aliases) {
                this.teamLookup.set(this.normalize(alias), team.id);
            }
        }
    }

    getGameId(): number {
        return this.gameId;
    }

    resolveTeamId(teamName: string, matchId: number): number | null {
        const teamId = this.teamLookup.get(this.normalize(teamName));

        if (teamId) {
            return teamId;
        }

        const existing = this.unknownTeams.get(teamName);
        if (existing) {
            existing.occurrences++;
            existing.matchIds.push(matchId);
        } else {
            this.unknownTeams.set(teamName, {
                name: teamName,
                occurrences: 1,
                matchIds: [matchId],
                similarTo: this.findSimilarTeams(teamName),
            });
        }

        return null;
    }

    normalize(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '');
    }

    getUnknownTeams(): UnknownTeam[] {
        return [...this.unknownTeams.values()];
    }

    getStats() {
        return {
            knownTeams: this.teams.length,
            totalAliases: this.teamLookup.size,
            unknownTeams: this.unknownTeams.size,
        };
    }

    private findSimilarTeams(teamName: string, threshold = 0.7): UnknownTeam['similarTo'] {
        const normalized = this.normalize(teamName);
        const similar: UnknownTeam['similarTo'] = [];

        for (const team of this.teams) {
            const candidates = [team.name, ...team.aliases];

            for (const candidate of candidates) {
                const similarity = this.calculateSimilarity(normalized, this.normalize(candidate));

                if (similarity >= threshold) {
                    similar.push({
                        teamId: team.id,
                        teamName: team.name,
                        similarity,
                    });
                    break;
                }
            }
        }

        return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
    }

    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0]![j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i]![j] = matrix[i - 1]![j - 1]!;
                } else {
                    matrix[i]![j] = Math.min(
                        matrix[i - 1]![j - 1]! + 1,
                        matrix[i]![j - 1]! + 1,
                        matrix[i - 1]![j]! + 1,
                    );
                }
            }
        }

        return matrix[str2.length]![str1.length]!;
    }
}
