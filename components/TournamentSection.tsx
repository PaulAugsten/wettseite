import { TournamentCard } from '@/components/TournamentCard';
import { Section } from '@/components/ui/Section';
import type { Tournament } from '@/lib/types';

export function TournamentSection({
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
        <Section title={title}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {tournaments.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} game={game} />
                ))}
            </div>
        </Section>
    );
}
