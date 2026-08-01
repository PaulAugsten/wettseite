import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import type { UnknownTeam } from '@/lib/scraper/_shared/team-resolver';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TablesInsert } from '@/lib/supabase/database.types';

const reviewFileFor = (gameId: number) =>
    path.join('scraper-output', `unknown_teams_review_${gameId}.json`);

type ReviewedTeam = {
    name: string;
    occurrences: number;
    affectedMatches: number;
    similarTeams: UnknownTeam['similarTo'];
    action: 'CREATE' | 'ALIAS' | 'IGNORE' | null;
    assignToTeamId: number | null;
    notes: string;
};

function normalize(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
}

/**
 * Writes the unknown team names to a review file
 */
export function writeUnknownTeamsReview(
    unknownTeams: UnknownTeam[],
    gameId: number,
): string | null {
    if (unknownTeams.length === 0) return null;

    const reviewData = {
        summary: {
            totalUnknown: unknownTeams.length,
            totalOccurrences: unknownTeams.reduce((sum, team) => sum + team.occurrences, 0),
        },
        unknownTeams: [...unknownTeams]
            .sort((a, b) => b.occurrences - a.occurrences)
            .map(
                (team): ReviewedTeam => ({
                    name: team.name,
                    occurrences: team.occurrences,
                    affectedMatches: team.matchIds.length,
                    similarTeams: team.similarTo,
                    action: null,
                    assignToTeamId: team.similarTo[0]?.teamId ?? null,
                    notes: '',
                }),
            ),
    };

    const reviewFile = reviewFileFor(gameId);
    fs.mkdirSync(path.dirname(reviewFile), { recursive: true });
    fs.writeFileSync(reviewFile, JSON.stringify(reviewData, null, 2), 'utf-8');

    console.log(`\n${unknownTeams.length} unknown teams saved to: ${reviewFile}`);

    return reviewFile;
}

export async function reviewUnknownTeams(unknownTeams: UnknownTeam[], gameId: number) {
    if (writeUnknownTeamsReview(unknownTeams, gameId) === null) return;

    console.log('\nActions:');
    console.log('  - CREATE: Create new team');
    console.log('  - ALIAS: Add as alias to existing team (set assignToTeamId)');
    console.log('  - IGNORE: Skip this team');

    const readline = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    await new Promise<void>((resolve) => {
        readline.question('\nReview and edit the file, then press Enter to continue...', () => {
            readline.close();
            resolve();
        });
    });

    await processReviewedTeams(gameId);
}

async function processReviewedTeams(gameId: number) {
    const reviewFile = reviewFileFor(gameId);
    if (!fs.existsSync(reviewFile)) {
        console.log('Review file not found');
        return;
    }

    const supabase = createAdminClient();
    const reviewData = JSON.parse(fs.readFileSync(reviewFile, 'utf-8')) as {
        unknownTeams: ReviewedTeam[];
    };
    const unresolved: ReviewedTeam[] = [];

    for (const team of reviewData.unknownTeams) {
        if (team.action === 'CREATE') {
            // The database fills teams.slug via trigger
            const row: Omit<TablesInsert<'teams'>, 'slug'> = {
                name: team.name,
                game_id: gameId,
            };
            const { data, error } = await supabase
                .from('teams')
                .insert(row as TablesInsert<'teams'>)
                .select('id')
                .single();

            if (error) {
                console.error(`Error creating team ${team.name}:`, error);
                unresolved.push(team);
            } else {
                console.log(`Created team: ${team.name} (ID: ${data.id})`);
            }
        } else if (team.action === 'ALIAS' && team.assignToTeamId) {
            const { error } = await supabase.from('team_aliases').insert({
                team_id: team.assignToTeamId,
                alias: team.name,
                alias_normalized: normalize(team.name),
            });

            if (error) {
                console.error(`Error adding alias ${team.name}:`, error);
                unresolved.push(team);
            } else {
                console.log(`Added alias: ${team.name} to Team ID ${team.assignToTeamId}`);
            }
        } else if (team.action === 'IGNORE') {
            console.log(`Ignored: ${team.name}`);
        } else {
            unresolved.push(team);
        }
    }

    if (unresolved.length === 0) {
        fs.rmSync(reviewFile, { force: true });
        console.log(`All unknown teams resolved`);
        return;
    }

    fs.writeFileSync(
        reviewFile,
        JSON.stringify(
            {
                summary: {
                    totalUnknown: unresolved.length,
                    totalOccurrences: unresolved.reduce((s, t) => s + t.occurrences, 0),
                },
                unknownTeams: unresolved,
            },
            null,
            2,
        ),
        'utf-8',
    );
    console.log(`${unresolved.length} team(s) still need review in ${reviewFile}`);
}
