import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

type UnknownTeam = {
    name: string;
    occurrences: number;
    matchIds: number[];
    similarTo?: { teamId: number; teamName: string; similarity: number }[];
};

class TeamResolver {
    private gameId: number;
    private teamLookup: Map<string, number>;
    private unknownTeams: Map<string, UnknownTeam>;
    private allTeams: { id: number; name: string; aliases: string[] }[];

    constructor() {
        this.gameId = 0;
        this.teamLookup = new Map();
        this.unknownTeams = new Map();
        this.allTeams = [];
    }

    async initialize(gameId: number) {
        this.gameId = gameId;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            },
        );

        const { data: teams, error } = await supabase
            .from('teams')
            .select(`id, name, team_aliases (alias)`)
            .eq('game_id', gameId);

        if (error) {
            console.error('Error fetching teams: ', error);
            return new Map();
        }

        for (const team of teams || []) {
            this.allTeams.push({
                id: team.id,
                name: team.name,
                aliases: team.team_aliases.map((a: any) => a.alias),
            });

            const normalizedName = this.normalize(team.name);
            this.teamLookup.set(normalizedName, team.id);

            for (const aliasObj of team.team_aliases || []) {
                const normalizedAlias = this.normalize(aliasObj.alias);
                this.teamLookup.set(normalizedAlias, team.id);
            }
        }
    }

    resolveTeamId(teamName: string, matchId: number): number | null {
        const normalized = this.normalize(teamName);
        const teamId = this.teamLookup.get(normalized);

        if (teamId) {
            return teamId;
        }

        const existing = this.unknownTeams.get(teamName);
        if (existing) {
            existing.occurrences++;
            existing.matchIds.push(matchId);
        } else {
            const similarTeams = this.findSimilarTeams(teamName);

            this.unknownTeams.set(teamName, {
                name: teamName,
                occurrences: 1,
                matchIds: [matchId],
                similarTo: similarTeams,
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

    private findSimilarTeams(teamName: string, threshold = 0.7): UnknownTeam['similarTo'] {
        const normalized = this.normalize(teamName);
        const similar: UnknownTeam['similarTo'] = [];

        for (const team of this.allTeams) {
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
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1,
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    async reviewUnknownTeams() {
        if (this.unknownTeams.size === 0) {
            return;
        }

        console.log(`Found ${this.unknownTeams.size} unknown teams`);

        const reviewData = {
            summary: {
                totalUnknown: this.unknownTeams.size,
                totalOccurrences: Array.from(this.unknownTeams.values()).reduce(
                    (sum, t) => sum + t.occurrences,
                    0,
                ),
            },
            unknownTeams: Array.from(this.unknownTeams.values())
                .sort((a, b) => b.occurrences - a.occurrences)
                .map((team) => ({
                    name: team.name,
                    occurrences: team.occurrences,
                    affectedMatches: team.matchIds.length,
                    similarTeams: team.similarTo,
                    action: null as 'CREATE' | 'ALIAS' | 'IGNORE' | null,
                    assignToTeamId: team.similarTo?.[0]?.teamId || null,
                    notes: '',
                })),
        };

        fs.writeFileSync('unknown_teams_review.json', JSON.stringify(reviewData, null, 2), 'utf-8');

        console.log('\n📄 Unknown teams saved to: unknown_teams_review.json');
        console.log('\nActions:');
        console.log('  - CREATE: Create new team');
        console.log('  - ALIAS: Add as alias to existing team (set assignToTeamId)');
        console.log('  - IGNORE: Skip this team');

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise<void>((resolve) => {
            readline.question('\nReview and edit the file, then press Enter to continue...', () => {
                readline.close();
                this.processReviewedTeams();
                resolve();
            });
        });
    }

    private async processReviewedTeams() {
        const reviewFile = 'unknown_teams_review.json';

        if (!fs.existsSync(reviewFile)) {
            console.log('Review file not found');
            return;
        }

        const reviewData = JSON.parse(fs.readFileSync(reviewFile, 'utf-8'));
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            },
        );

        for (const team of reviewData.unknownTeams) {
            if (team.action === 'CREATE') {
                const { data, error } = await supabase
                    .from('teams')
                    .insert({
                        name: team.name,
                        game_id: this.gameId,
                    })
                    .select('id')
                    .single();

                if (error) {
                    console.error(`Error creating team ${team.name}:`, error);
                } else {
                    console.log(`Created team: ${team.name} (ID: ${data.id})`);
                    this.teamLookup.set(this.normalize(team.name), data.id);
                }
            } else if (team.action === 'ALIAS' && team.assignToTeamId) {
                const { error } = await supabase.from('team_aliases').insert({
                    team_id: team.assignToTeamId,
                    alias: team.name,
                    alias_normalized: this.normalize(team.name),
                });

                if (error) {
                    console.error(`Error adding alias ${team.name}:`, error);
                } else {
                    console.log(`Added alias: ${team.name} to Team ID ${team.assignToTeamId}`);
                    this.teamLookup.set(this.normalize(team.name), team.assignToTeamId);
                }
            } else if (team.action === 'IGNORE') {
                console.log(`Ignored: ${team.name}`);
            }
        }
    }

    getStats() {
        return {
            knownTeams: this.allTeams.length,
            totalAliases: this.teamLookup.size,
            unknownTeams: this.unknownTeams.size,
        };
    }
}

export default TeamResolver;
