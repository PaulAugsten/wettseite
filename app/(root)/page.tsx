import { TournamentCard } from '@/components/TournamentCard';
import { createClient } from '@/lib/supabase/server';

type Games = {
    id: number;
    name: string;
    slug: string;
    tournaments: Tournament[];
};

type Tournament = {
    id: number;
    name: string;
    location: string;
    prize_pool: string;
    status: 'scheduled' | 'live' | 'finished';
    slug: string;
    start_date: string;
    end_date: string;
};

function Section({
    title,
    tournaments,
    game,
}: {
    title: string;
    tournaments: Tournament[];
    game: string;
}) {
    if (tournaments.length === 0) return null;
    return (
        <div className="tournamentSection">
            <h2 className="tournamentSectionTitle">{title}</h2>
            <div className="tournamentGrid">
                {tournaments.map((tournament) => (
                    <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                        game={game}
                    />
                ))}
            </div>
        </div>
    );
}

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
        return (
            <div>
                Error fetching games. Check your internet connection and try
                again.
            </div>
        );
    }

    const liveGames = games as Games[];

    return (
        <main>
            <div className="text-6xl">Welcome!</div>

            {liveGames.map((game) => (
                <Section
                    key={game.id}
                    title="Ongoing Tournament"
                    tournaments={game.tournaments}
                    game={game.slug}
                />
            ))}
        </main>
    );
};

/*
<Hello />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols">
                {data.map((game: { id: number; name: string; slug: string }) => (
                    <Link
                        key={game.id}
                        className="bg-white shadow-md rounded-lg p-4 transition t..."
                        href={`/${game.slug}`}
                    >
                        <h3 className="text-lg font-bold mb-2">{game.name}</h3>
                        <p className="text-gray-600">Game ID: {game.id}</p>
                    </Link>
                ))}
            </div>
            */

export default Home;
