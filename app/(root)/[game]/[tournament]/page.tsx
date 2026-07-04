import MatchCard from '@/components/MatchCard';
import PredictionStandings from '@/components/PredictionStandings';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/ui/Section';
import { getMatchPredictions, getStandings } from '@/lib/data/predictions';
import { getTournamentWithMatches } from '@/lib/data/tournaments';
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
    userPicks,
    predictionStats,
    isLoggedIn,
}: {
    title: string;
    matches: Match[];
    userPicks: Map<number, number>;
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
                        userPrediction={userPicks.get(match.id) ?? null}
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
    const [{ game, tournament: tournamentSlug }, supabase] = await Promise.all([
        params,
        createClient(),
    ]);

    const [
        {
            data: { user },
        },
        tournament,
    ] = await Promise.all([
        supabase.auth.getUser(),
        getTournamentWithMatches(game, tournamentSlug),
    ]);

    if (!tournament) {
        return (
            <EmptyState
                title="Tournament not found"
                description="This tournament doesn't exist or isn't available yet."
            />
        );
    }

    const { matches } = tournament;

    const [{ stats: predictionStats, userPicks }, standings] = await Promise.all([
        getMatchPredictions(matches, user?.id),
        getStandings(tournament.id),
    ]);

    const live = matches.filter((m) => m.status === 'live');
    const upcoming = matches.filter((m) => m.status === 'planned');
    const finished = matches.filter((m) => m.status === 'finished').toReversed();

    return (
        <div className="flex flex-col gap-10">
            <PageHeader
                title={tournament.name}
                subtitle={
                    tournament.start_date && tournament.end_date
                        ? `${new Date(tournament.start_date).toLocaleDateString('en-GB', dateFormat)} – ${new Date(
                              tournament.end_date,
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
                        userPicks={userPicks}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                    <MatchSection
                        title="Upcoming"
                        matches={upcoming}
                        userPicks={userPicks}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                    <MatchSection
                        title="Finished"
                        matches={finished}
                        userPicks={userPicks}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                </div>
                <div className="min-w-0">
                    <PredictionStandings standings={standings} />
                </div>
            </div>
        </div>
    );
}
