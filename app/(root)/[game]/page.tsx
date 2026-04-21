import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

type GamePageParameters = {
    params: {
        game: string;
    };
};

export default async function Game({ params }: GamePageParameters) {
    const { game } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('games')
        .select(
            `*,
            tournaments (*)`,
        )
        .eq('slug', game)
        .order('start_date', { referencedTable: 'tournaments', ascending: false })
        .single();

    if (error || !data) {
        return <div>Game not found</div>;
    }

    console.log(data.tournaments);

    return (
        <div>
            <h1>{data.name}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols">
                {data?.tournaments.map(
                    (event: {
                        id: number;
                        name: string;
                        location: string;
                        prize_pool: string;
                        status: string;
                        slug: string;
                    }) => (
                        <Link
                            key={event.id}
                            className="bg-white shadow-md rounded-lg p-4 transition t..."
                            href={`/${game}/${event.slug}`}
                        >
                            <h3 className="text-lg font-bold mb-2">{event.name}</h3>
                            <p className="text-gray-600">Location: {event.location}</p>
                            <p className="text-gray-600">Prize Pool: {event.prize_pool}</p>
                            <p className="text-gray-500 text-sm">Status: {event.status}</p>
                        </Link>
                    ),
                )}
            </div>
        </div>
    );
}
