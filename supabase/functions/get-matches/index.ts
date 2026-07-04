import { createClient } from 'npm:@supabase/supabase-js@2';
import { collectMatches } from '../_shared/scraper/collect-matches.ts';
import { type TeamRecord, TeamResolver } from '../_shared/scraper/team-resolver.ts';
import type { Tournament } from '../_shared/scraper/types.ts';

const GAME_SLUG = 'rainbow-six-siege';
const WIKI = 'rainbowsix';

function getSupabase() {
    return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

async function scrapeMatches() {
    const supabase = getSupabase();

    const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id')
        .eq('slug', GAME_SLUG)
        .single();
    if (gameError || !gameData) throw new Error('Could not find game id');
    const gameId: number = gameData.id;

    const { data: tournaments, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('game_id', gameId)
        .in('status', ['live', 'scheduled']);
    if (tournamentError || !tournaments) throw new Error('Could not fetch tournaments');

    if (tournaments.length === 0) {
        console.log('No active tournaments');
        return { scraped: 0 };
    }

    const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, team_aliases (alias)')
        .eq('game_id', gameId);
    if (teamsError || !teams) throw new Error('Could not fetch teams');

    const teamRecords: TeamRecord[] = teams.map(
        (team: { id: number; name: string; team_aliases: { alias: string }[] }) => ({
            id: team.id,
            name: team.name,
            aliases: team.team_aliases.map((alias) => alias.alias),
        }),
    );

    const teamResolver = new TeamResolver(gameId, teamRecords);

    const { matches } = await collectMatches({
        wiki: WIKI,
        tournaments: tournaments as Tournament[],
        teamResolver,
    });

    if (matches.length > 0) {
        const { error } = await supabase.from('matches').insert(matches);
        if (error) throw new Error(`DB insert failed: ${error.message}`);
    }

    const stats = teamResolver.getStats();
    if (stats.unknownTeams > 0) {
        console.warn(`Unknown teams (${stats.unknownTeams}): check function logs`);
        for (const team of teamResolver.getUnknownTeams()) {
            console.warn(`  - ${team.name} (${team.occurrences}x)`);
        }
    }

    return { scraped: matches.length, unknownTeams: stats.unknownTeams };
}

Deno.serve(async () => {
    try {
        const result = await scrapeMatches();
        return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ ok: false, error: String(err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
