import { TournamentSection } from '@/components/TournamentSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorPanel } from '@/components/ui/ErrorPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { getGamesWithLiveTournaments } from '@/lib/data/games';

const Home = async () => {
    const liveGames = await getGamesWithLiveTournaments();

    if (!liveGames) {
        return (
            <ErrorPanel
                title="Couldn't load games"
                description="Check your internet connection and try again."
            />
        );
    }

    return (
        <div className="flex flex-col gap-10">
            <PageHeader
                title="Welcome!"
                subtitle="Predict match winners and compete with your friends."
            />

            {liveGames.length === 0 ? (
                <EmptyState
                    title="No live tournaments right now"
                    description="Check back when the next event kicks off."
                />
            ) : (
                liveGames.map((game) => (
                    <TournamentSection
                        key={game.id}
                        title={`Live now — ${game.name}`}
                        tournaments={game.tournaments}
                        game={game.slug}
                    />
                ))
            )}
        </div>
    );
};

export default Home;
