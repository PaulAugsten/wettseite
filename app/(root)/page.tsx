import Link from 'next/link';
import Hello from '../../components/hello';
import { createClient } from '@/lib/supabase/server';

const Home = async () => {
    const supabase = await createClient();

    const { data, error } = await supabase.from('games').select('*');

    if (error) {
        console.log('Error fetching games: ', error);
        return (
            <main>
                <div className="text-red-500">Error loading games: {error.message}</div>
            </main>
        );
    }

    return (
        <main>
            <div className="text-5xl underline">Welcome, Paul!</div>
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
        </main>
    );
};

export default Home;
