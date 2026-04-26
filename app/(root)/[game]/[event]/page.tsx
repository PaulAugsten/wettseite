import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

type TournamentPageParameters = {
    params: {
        tournament: string;
    };
};

export default async function Game({ params }: TournamentPageParameters) {
    const { tournament } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tournaments')
        .select(
            `*,
            matches (*)`,
        )
        .eq('slug', tournament)
        .order('date', { referencedTable: 'matches', ascending: false })
        .single();

    if (error || !data) {
        console.log(error);
        return <div>Event not found</div>;
    }

    console.log(data.matches);

    return (
        <div>
            <h1>{data.name}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols">
                {data?.matches.map(
                    (match: { id: number; name: string; status: string; slug: string }) => (
                        <Link
                            key={match.id}
                            className="bg-white shadow-md rounded-lg p-4 transition t..."
                            href={`/${match}/${match.slug}`}
                        >
                            <h3 className="text-lg font-bold mb-2">{match.name}</h3>
                            <p className="text-gray-600">Tournament ID: {match.id}</p>
                            <p className="text-gray-500 text-sm">Status: {match.status}</p>
                        </Link>
                    ),
                )}
            </div>
        </div>
    );
}
