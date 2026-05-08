import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

type GamePageParameters = {
    params: {
        game: string;
    };
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

function TournamentCard({ tournament, game }: { tournament: Tournament; game: string }) {
    return (
        <Link href={`/${game}/${tournament.slug}`} className="tournamentCard">
            <div className="tournamentCardHeader">
                <span
                    className={`tournamentStatus ${tournament.status === 'live' ? 'statusLive' : tournament.status === 'scheduled' ? 'statusUpcoming' : 'statusFinished'}`}
                >
                    {tournament.status === 'live'
                        ? 'Live'
                        : tournament.status === 'scheduled'
                          ? 'Upcoming'
                          : 'Finished'}
                </span>
            </div>

            <div className="tournamentCardBody">
                <h3 className="tournamentName">{tournament.name}</h3>

                <div className="tournamentMeta">
                    {tournament.location && (
                        <span className="tournamentMetaItem">{tournament.location}</span>
                    )}
                    {tournament.prize_pool && (
                        <span className="tournamentMetaItem">{tournament.prize_pool}</span>
                    )}
                    {tournament.start_date && (
                        <span className="tournamentMetaItem">
                            {' '}
                            {new Date(tournament.start_date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                            {tournament.end_date &&
                                ` - ${new Date(tournament.end_date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}`}
                        </span>
                    )}
                </div>

                <div className="tournamentCardFooter">
                    <span className="tournamentViewMore"> View matches →</span>
                </div>
            </div>
        </Link>
    );
}

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
                    <TournamentCard key={tournament.id} tournament={tournament} game={game} />
                ))}
            </div>
        </div>
    );
}

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
        return <div>Site is under construction</div>;
    }

    // Group by status
    const live = data.tournaments.filter((t: { status: string }) => t.status === 'live');
    const upcoming = data.tournaments.filter((t: { status: string }) => t.status === 'scheduled');
    const finished = data.tournaments.filter((t: { status: string }) => t.status === 'finished');

    return (
        <div className="gamePage">
            <div className="gamePageHeader">
                <h1 className="gamePageTitle">{data.name}</h1>
                <p className="gamePageSubtitle">
                    {data.tournaments.length} tournament{data.tournaments.length !== 1 ? 's' : ''}
                </p>
            </div>

            <Section title="Live" tournaments={live} game={game} />
            <Section title="Upcoming" tournaments={upcoming} game={game} />
            <Section title="Finished" tournaments={finished} game={game} />
        </div>
    );

    /*
    return (
        <div>
            <h1>{data.name}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols">
                {data?.tournaments.map(
                    (tournament: {
                        id: number;
                        name: string;
                        location: string;
                        prize_pool: string;
                        status: string;
                        slug: string;
                    }) => (
                        <Link
                            key={tournament.id}
                            className="bg-white shadow-md rounded-lg p-4 transition t..."
                            href={`/${game}/${tournament.slug}`}
                        >
                            <h3 className="text-lg font-bold mb-2">{tournament.name}</h3>
                            <p className="text-gray-600">Location: {tournament.location}</p>
                            <p className="text-gray-600">Prize Pool: {tournament.prize_pool}</p>
                            <p className="text-gray-500 text-sm">Status: {tournament.status}</p>
                        </Link>
                    ),
                )}
            </div>
        </div>
    );

    */
}
