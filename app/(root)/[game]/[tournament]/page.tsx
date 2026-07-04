import MatchCard from '@/components/MatchCard';
import PredictionStandings from '@/components/PredictionStandings';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Section';
import { createClient } from '@/lib/supabase/server';
import type { Match, PredictionStats } from '@/lib/types';

type TournamentPageParameters = {
    params: Promise<{
        game: string;
        tournament: string;
    }>;
};

const dateFormat: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
};

function MatchSection({
    title,
    matches,
    userPredictionMap,
    predictionStats,
    isLoggedIn,
}: {
    title: string;
    matches: Match[];
    userPredictionMap: Map<number, number>;
    predictionStats: Map<number, PredictionStats>;
    isLoggedIn: boolean;
}) {
    if (matches.length === 0) return null;
    return (
        <Section title={title}>
            <div className="flex flex-col gap-2">
                {matches.map((match) => (
                    <MatchCard
                        key={match.id}
                        match={match}
                        userPrediction={userPredictionMap.get(match.id) ?? null}
                        stats={
                            predictionStats.get(match.id) ?? {
                                team1: 0,
                                team2: 0,
                                total: 0,
                            }
                        }
                        isLoggedIn={isLoggedIn}
                    />
                ))}
            </div>
        </Section>
    );
}

export default async function Tournament({ params }: TournamentPageParameters) {
    const [{ game, tournament }, supabase] = await Promise.all([params, createClient()]);

    const [
        {
            data: { user },
        },
        { data, error },
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
            .from('tournaments')
            .select(
                `*,
                matches!matches_tournament_id_fkey (
                    *,
                    team1:teams!matches_team1_id_fkey (id, name, short_name, slug),
                    team2:teams!matches_team2_id_fkey (id, name, short_name, slug)
                ),
                games!inner(id, name, slug)`,
            )
            .eq('slug', tournament)
            .eq('games.slug', game)
            .order('date', { referencedTable: 'matches', ascending: true })
            .single(),
    ]);

    if (error || !data) {
        return (
            <EmptyState
                title="Tournament not found"
                description="This tournament doesn't exist or isn't available yet."
            />
        );
    }

    const matches = data.matches as Match[];
    const matchIds = matches.map((m) => m.id);

    const { data: allPredictions } = await supabase
        .from('predictions')
        .select('match_id, predicted_winner_id')
        .in('match_id', matchIds);

    const { data: userPredictions } = user
        ? await supabase
              .from('predictions')
              .select('match_id, predicted_winner_id')
              .eq('user_id', user.id)
              .in('match_id', matchIds)
        : { data: [] };

    const { data: prediction_standings } = await supabase
        .from('prediction_standings')
        .select('*')
        .eq('tournament_id', data.id);

    const userPredictionMap = new Map(
        (userPredictions ?? []).map((p) => [p.match_id, p.predicted_winner_id]),
    );

    const predictionStats = new Map<number, PredictionStats>();
    for (const match of matches) {
        const matchPredictions = (allPredictions ?? []).filter((p) => p.match_id === match.id);
        const team1Count = matchPredictions.filter(
            (p) => p.predicted_winner_id === match.team1?.id,
        ).length;
        const team2Count = matchPredictions.filter(
            (p) => p.predicted_winner_id === match.team2?.id,
        ).length;
        predictionStats.set(match.id, {
            team1: team1Count,
            team2: team2Count,
            total: matchPredictions.length,
        });
    }

    const live = matches.filter((m) => m.status === 'live');
    const upcoming = matches.filter((m) => m.status === 'planned');
    const finished = matches.filter((m) => m.status === 'finished').toReversed();

    return (
        <div className="flex flex-col gap-10">
            <PageHeader
                title={data.name}
                subtitle={
                    data.start_date && data.end_date
                        ? `${new Date(data.start_date).toLocaleDateString('en-GB', dateFormat)} – ${new Date(
                              data.end_date,
                          ).toLocaleDateString('en-GB', dateFormat)}`
                        : undefined
                }
            />

            <div className="grid items-start gap-8 lg:grid-cols-[2fr_1fr]">
                <div className="flex min-w-0 flex-col gap-8">
                    {matches.length === 0 && (
                        <EmptyState
                            title="No matches yet"
                            description="Matches will show up here once the schedule is published."
                        />
                    )}
                    <MatchSection
                        title="Live"
                        matches={live}
                        userPredictionMap={userPredictionMap}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                    <MatchSection
                        title="Upcoming"
                        matches={upcoming}
                        userPredictionMap={userPredictionMap}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                    <MatchSection
                        title="Finished"
                        matches={finished}
                        userPredictionMap={userPredictionMap}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                </div>
                <div className="min-w-0">
                    <PredictionStandings standings={prediction_standings ?? []} />
                </div>
            </div>
        </div>
    );
}
