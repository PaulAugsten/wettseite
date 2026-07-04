import { TournamentSection } from '@/components/TournamentSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { getGameWithTournaments } from '@/lib/data/games';

type GamePageParameters = {
    params: Promise<{
        game: string;
    }>;
};

export default async function Game({ params }: GamePageParameters) {
    const { game: gameSlug } = await params;

    const game = await getGameWithTournaments(gameSlug);

    if (!game) {
        return (
            <EmptyState
                title="Nothing here yet"
                description="This game is under construction — check back soon."
            />
        );
    }

    const { tournaments } = game;
    const live = tournaments.filter((t) => t.status === 'live');
    const upcoming = tournaments.filter((t) => t.status === 'scheduled');
    const finished = tournaments.filter((t) => t.status === 'finished');

    return (
        <div className="flex flex-col gap-10">
            <PageHeader
                title={game.name}
                subtitle={`${tournaments.length} tournament${tournaments.length !== 1 ? 's' : ''}`}
            />

            {tournaments.length === 0 && (
                <EmptyState
                    title="No tournaments yet"
                    description="Tournaments will show up here once they are announced."
                />
            )}

            <TournamentSection title="Live" tournaments={live} game={gameSlug} />
            <TournamentSection title="Upcoming" tournaments={upcoming} game={gameSlug} />
            <TournamentSection title="Finished" tournaments={finished} game={gameSlug} />
        </div>
    );
}
