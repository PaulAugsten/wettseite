import type { Tournament } from '@/components/TournamentCard';
import { TournamentSection } from '@/components/TournamentSection';
import { createClient } from '@/lib/supabase/server';

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
        .order('start_date', {
            referencedTable: 'tournaments',
            ascending: false,
        })
        .single();

    if (error || !data) {
        return <div>Site is under construction</div>;
    }

    // Group by status
    const live = data.tournaments.filter((t: Tournament) => t.status === 'live');
    const upcoming = data.tournaments.filter((t: Tournament) => t.status === 'scheduled');
    const finished = data.tournaments.filter((t: Tournament) => t.status === 'finished');

    return (
        <div className="gamePage">
            <div className="gamePageHeader">
                <h1 className="gamePageTitle">{data.name}</h1>
                <p className="gamePageSubtitle">
                    {data.tournaments.length} tournament
                    {data.tournaments.length !== 1 ? 's' : ''}
                </p>
            </div>

            <TournamentSection title="Live" tournaments={live} game={game} />
            <TournamentSection title="Upcoming" tournaments={upcoming} game={game} />
            <TournamentSection title="Finished" tournaments={finished} game={game} />
        </div>
    );
}
