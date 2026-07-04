import { TournamentSection } from '@/components/TournamentSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/server';
import type { Tournament } from '@/lib/types';

type GamePageParameters = {
    params: Promise<{
        game: string;
    }>;
};

export default async function Game({ params }: GamePageParameters) {
    const [{ game }, supabase] = await Promise.all([params, createClient()]);

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
        return (
            <EmptyState
                title="Nothing here yet"
                description="This game is under construction — check back soon."
            />
        );
    }

    const tournaments = data.tournaments as Tournament[];
    const live = tournaments.filter((t) => t.status === 'live');
    const upcoming = tournaments.filter((t) => t.status === 'scheduled');
    const finished = tournaments.filter((t) => t.status === 'finished');

    return (
        <div className="flex flex-col gap-10">
            <PageHeader
                title={data.name}
                subtitle={`${tournaments.length} tournament${tournaments.length !== 1 ? 's' : ''}`}
            />

            {tournaments.length === 0 && (
                <EmptyState
                    title="No tournaments yet"
                    description="Tournaments will show up here once they are announced."
                />
            )}

            <TournamentSection title="Live" tournaments={live} game={game} />
            <TournamentSection title="Upcoming" tournaments={upcoming} game={game} />
            <TournamentSection title="Finished" tournaments={finished} game={game} />
        </div>
    );
}
