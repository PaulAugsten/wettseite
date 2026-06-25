import type { Tournament } from '@/components/TournamentCard';
import { TournamentSection } from '@/components/TournamentSection';
import { createClient } from '@/lib/supabase/server';

type Games = {
    id: number;
    name: string;
    slug: string;
    tournaments: Tournament[];
};

const Home = async () => {
    const supabase = await createClient();

    const { data: games, error: gamesError } = await supabase
        .from('games')
        .select(
            `*,
            tournaments(*)`,
        )
        .eq('tournaments.status', 'live');

    if (gamesError || !games) {
        console.log('Error fetching games: ', gamesError);
        return <div>Error fetching games. Check your internet connection and try again.</div>;
    }

    const liveGames = games as Games[];

    return (
        <main>
            <div className="text-6xl">Welcome!</div>

            {liveGames.map((game) => (
                <TournamentSection
                    key={game.id}
                    title="Ongoing Tournament"
                    tournaments={game.tournaments}
                    game={game.slug}
                />
            ))}
        </main>
    );
};

export default Home;
