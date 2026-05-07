import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

type TournamentPageParameters = {
    params: {
        game: string;
        tournament: string;
    };
};

type Match = {
    id: number;
    date: string;
    team1: { name: string; short_name: string; slug: string } | null;
    team2: { name: string; short_name: string; slug: string } | null;
    team1_score: number;
    team2_score: number;
    status: string;
    round: string | null;
    stage: string | null;
    group: string | null;
    bracket: string | null;
};

export default async function Tournament({ params }: TournamentPageParameters) {
    const { tournament } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tournaments')
        .select(
            `*,
            matches!matches_tournament_id_fkey (
                *,
                team1:teams!matches_team1_id_fkey (name, short_name, slug),
                team2:teams!matches_team2_id_fkey (name, short_name, slug)
            )`,
        )
        .eq('slug', tournament)
        .single();

    if (error || !data) {
        console.log(error);
        return <div>No Events found</div>;
    }

    console.log(data);
    console.log(data.matches);

    return (
        <div>
            <h1 className="text-6xl font-bold">{data.name}</h1>
            <h2 className="text-4xl font-semibold">Upcoming Matches:</h2>

            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols">
                {(data?.matches as Match[]).map((match) => (
                    <div
                        key={match.id}
                        className="bg-white shadow-md rounded-lg p-4 transition t..."
                    >
                        <h3 className="text-lg font-bold mb-2">{match.team1?.name}</h3>
                        <h3 className="text-lg font-bold mb-2">{match.team2?.name}</h3>
                        <p className="text-gray-600">Match ID: {match.id}</p>
                        <p className="text-gray-500 text-sm">Date: {match.date}</p>
                        <p className="text-gray-500 text-sm">Status: {match.status}</p>
                        <Link target="_blank" href={`https://siege.gg/matches/${match.id}`}>
                            Link
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
