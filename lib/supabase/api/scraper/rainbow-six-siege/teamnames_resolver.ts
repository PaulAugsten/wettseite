import Fuse from 'fuse.js';
import { createClient } from '@supabase/supabase-js';
import { type Match } from './matches_scraper';
import fs from 'fs';
import { resolve } from 'path';

type TeamCandidate = {
    rawName: string;
    occurences: number;
    matchIds: number[];
};

type TeamCluster = {
    canonical: string;
    aliases: string[];
    confidence: 'high' | 'medium' | 'low';
    needsReview: boolean;
};

function levenshteinDistance(str1: string, str2: string): number {
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

function calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

function normalizeTeamName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .replace(/\besports?\b/gi, '')
        .replace(/\bgaming\b/gi, '');
}

function extractTeamNames(matches: Match[]): Map<string, TeamCandidate> {
    const teamMap = new Map<string, TeamCandidate>();

    for (const match of matches) {
        for (const teamName of [match.team1_name, match.team2_name]) {
            if (!teamName) continue;

            const existing = teamMap.get(teamName);
            if (existing) {
                existing.occurences++;
                existing.matchIds.push(match.match_id);
            } else {
                teamMap.set(teamName, {
                    rawName: teamName,
                    occurences: 1,
                    matchIds: [match.match_id],
                });
            }
        }
    }

    return teamMap;
}

function clusterTeamNames(candidates: TeamCandidate[]): TeamCluster[] {
    const clusters: TeamCluster[] = [];
    const processed = new Set<string>();

    const sorted = [...candidates].sort((a, b) => b.occurences - a.occurences);

    for (const candidate of sorted) {
        if (processed.has(candidate.rawName)) continue;

        const normalized = normalizeTeamName(candidate.rawName);
        const cluster: TeamCluster = {
            canonical: candidate.rawName,
            aliases: [candidate.rawName],
            confidence: 'high',
            needsReview: false,
        };

        for (const other of candidates) {
            if (other.rawName === candidate.rawName) continue;
            if (processed.has(other.rawName)) continue;

            const otherNormalized = normalizeTeamName(other.rawName);
            const similarity = calculateSimilarity(normalized, otherNormalized);

            if (similarity > 0.85) {
                cluster.aliases.push(other.rawName);
                processed.add(other.rawName);
                cluster.confidence = 'high';
            } else if (similarity > 0.7) {
                cluster.aliases.push(other.rawName);
                processed.add(other.rawName);
                cluster.confidence = 'medium';
                cluster.needsReview = true;
            }
        }

        processed.add(candidate.rawName);
        clusters.push(cluster);
    }

    return clusters;
}

function generateReviewFile(clusters: TeamCluster[]): void {
    const reviewNeeded = clusters.filter((c) => c.needsReview);
    const autoApproved = clusters.filter((c) => !c.needsReview);

    const reviewData = {
        summary: {
            totalClusters: clusters.length,
            autoApproved: autoApproved.length,
            needsReview: reviewNeeded.length,
        },
        autoApproved: autoApproved.map((c) => ({
            canonical: c.canonical,
            aliases: c.aliases,
            confidence: c.confidence,
        })),
        needsReview: reviewNeeded.map((c) => ({
            canonical: c.canonical,
            aliases: c.aliases,
            confidence: c.confidence,
            action: 'KEEP' as 'KEEP' | 'MERGE' | 'SPLIT' | 'DELETE',
            mergeWith: null as string | null,
            notes: '',
        })),
    };

    fs.writeFileSync('team_review.json', JSON.stringify(reviewData, null, 2), 'utf-8');
}

const KNOWN_DIFFERENT_TEAMS = [['wolves', 'dire wolves']];

const KNOWN_SAME_TEAMS = [
    ['team liquid', 'liquid'],
    ['g2 esports', 'g2'],
    ['faze clan', 'faze'],
    ['ninjas in pyjamas', 'nip'],
    ['Darkzero', 'dz'],
    ['Spacestation Gaming', 'SSG'],
];

function applyKnownRules(clusters: TeamCluster[]): TeamCluster[] {
    for (const [canonical, alias] of KNOWN_SAME_TEAMS) {
        const canonicalCluster = clusters.find(
            (c) => normalizeTeamName(c.canonical) === normalizeTeamName(canonical),
        );
        const aliasCluster = clusters.find(
            (c) => normalizeTeamName(c.canonical) === normalizeTeamName(alias),
        );

        if (canonicalCluster && aliasCluster) {
            canonicalCluster.aliases.push(...aliasCluster.aliases);
            clusters = clusters.filter((c) => c !== aliasCluster);
        }
    }

    for (const [team1, team2] of KNOWN_DIFFERENT_TEAMS) {
        const cluster = clusters.find((c) =>
            c.aliases.some(
                (a) =>
                    normalizeTeamName(a) === normalizeTeamName(team1) ||
                    normalizeTeamName(a) === normalizeTeamName(team2),
            ),
        );

        if (cluster && cluster.aliases.length > 1) {
            cluster.needsReview = true;
            cluster.confidence = 'low';
        }
    }

    return clusters;
}

async function importTeamsToDatabase(reviewedClusters: TeamCluster[]) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    for (const cluster of reviewedClusters) {
        const { data: existingTeam } = await supabase
            .from('teams')
            .select('id, name')
            .ilike('name', cluster.canonical)
            .single();

        let teamId: number;

        if (existingTeam) {
            teamId = existingTeam.id;
            console.log(`Team exists: ${cluster.canonical}`);
        } else {
            const { data: newTeam, error } = await supabase
                .from('teams')
                .insert({
                    name: cluster.canonical,
                    game_slug: '',
                })
                .select('id')
                .single();

            if (error) {
                console.error(`Error creating team ${cluster.canonical}:`, error);
                continue;
            }

            teamId = newTeam.id;
            console.log(`Created team: ${cluster.canonical}`);
        }

        for (const alias of cluster.aliases) {
            if (alias === cluster.canonical) continue;

            const { error } = await supabase.from('team_aliases').upsert(
                {
                    team_id: teamId,
                    alias: alias,
                },
                {
                    onConflict: 'alias',
                },
            );

            if (error) {
                console.error(`Error adding alias ${alias}:`, error);
            } else {
                console.log(`Added alias: ${alias}`);
            }
        }
    }
}

export async function resolveTeams(matches: Match[]) {
    const teamCandidates = extractTeamNames(matches);
    const candidates = Array.from(teamCandidates.values());

    console.log(`Found ${candidates.length} unique team names`);

    let clusters = clusterTeamNames(candidates);

    clusters = applyKnownRules(clusters);

    generateReviewFile(clusters);

    console.log('\n⏸️  Please review team_review.json and edit the "needsReview" section');
    console.log('   Set "action" to:');
    console.log('   - KEEP: Keep this cluster as-is');
    console.log('   - MERGE: Merge with another team (set "mergeWith")');
    console.log('   - SPLIT: Split aliases into separate teams');
    console.log('   - DELETE: Remove this cluster\n');

    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise<void>((resolve) => {
        readline.question('Continue with import? (y/n): ', async (answer: string) => {
            readline.close();

            if (answer.toLowerCase() === 'y') {
                console.log('\n Reading reviewed file...');
                const reviewed = JSON.parse(fs.readFileSync('team_review.json', 'utf-8'));

                const finalClusters = [
                    ...reviewed.autoApproved,
                    ...reviewed.needsReview.filter((r: any) => r.action === 'KEEP'),
                ];

                await importTeamsToDatabase(finalClusters);

                console.log('\nDone!');
            } else {
                console.log('Cancelled');
            }

            resolve();
        });
    });
}
