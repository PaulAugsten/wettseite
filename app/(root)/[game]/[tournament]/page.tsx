import TournamentTabs from '@/components/TournamentTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { getMatchPredictions, getStandings } from '@/lib/data/predictions';
import { getTournamentWithMatches } from '@/lib/data/tournaments';
import { createClient } from '@/lib/supabase/server';

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

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title={tournament.name}
                subtitle={
                    tournament.start_date && tournament.end_date
                        ? `${new Date(tournament.start_date).toLocaleDateString('en-GB', dateFormat)} - ${new Date(
                              tournament.end_date,
                          ).toLocaleDateString('en-GB', dateFormat)}`
                        : undefined
                }
            />

            <TournamentTabs
                matches={matches}
                standings={standings}
                statsByMatch={Object.fromEntries(predictionStats)}
                userPicks={Object.fromEntries(userPicks)}
                isLoggedIn={!!user}
            />
        </div>
    );
}
