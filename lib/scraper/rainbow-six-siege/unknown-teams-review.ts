import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TablesInsert } from '@/lib/supabase/database.types';
import type { UnknownTeam } from '@/supabase/functions/_shared/scraper/team-resolver.ts';

const REVIEW_FILE = path.join('scraper-output', 'unknown_teams_review.json');

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
 * Interactive CLI flow: writes the unknown team names to a review file, waits
 * for the user to fill in actions, then applies them (create team / add
 * alias / ignore). Resolved names take effect on the next scraper run.
 */
export async function reviewUnknownTeams(unknownTeams: UnknownTeam[], gameId: number) {
    if (unknownTeams.length === 0) return;

    console.log(`Found ${unknownTeams.length} unknown teams`);

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

    fs.mkdirSync(path.dirname(REVIEW_FILE), { recursive: true });
    fs.writeFileSync(REVIEW_FILE, JSON.stringify(reviewData, null, 2), 'utf-8');

    console.log(`\n📄 Unknown teams saved to: ${REVIEW_FILE}`);
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
    if (!fs.existsSync(REVIEW_FILE)) {
        console.log('Review file not found');
        return;
    }

    const reviewData = JSON.parse(fs.readFileSync(REVIEW_FILE, 'utf-8')) as {
        unknownTeams: ReviewedTeam[];
    };
    const supabase = createAdminClient();

    for (const team of reviewData.unknownTeams) {
        if (team.action === 'CREATE') {
            // The database fills `teams.slug` via trigger, so the payload
            // legitimately omits it even though the Insert type requires it.
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
            } else {
                console.log(`Added alias: ${team.name} to Team ID ${team.assignToTeamId}`);
            }
        } else if (team.action === 'IGNORE') {
            console.log(`Ignored: ${team.name}`);
        }
    }
}
