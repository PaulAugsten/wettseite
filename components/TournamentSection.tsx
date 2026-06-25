import { type Tournament, TournamentCard } from './TournamentCard';

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
