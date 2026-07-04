import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Tournament } from '@/lib/types';

const dateFormat: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
};

export function TournamentCard({ tournament, game }: { tournament: Tournament; game: string }) {
    return (
        <Card href={`/${game}/${tournament.slug}`} interactive className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
                <StatusBadge status={tournament.status} />
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
                <h3 className="font-bold text-[1.05rem] text-fg leading-snug">{tournament.name}</h3>

                <div className="flex flex-col gap-1 text-fg-muted text-sm">
                    {tournament.location && <span>{tournament.location}</span>}
                    {tournament.prize_pool && <span>{tournament.prize_pool}</span>}
                    {tournament.start_date && (
                        <span>
                            {new Date(tournament.start_date).toLocaleDateString(
                                'en-GB',
                                dateFormat,
                            )}
                            {tournament.end_date &&
                                ` – ${new Date(tournament.end_date).toLocaleDateString('en-GB', dateFormat)}`}
                        </span>
                    )}
                </div>
            </div>

            <div className="border-edge border-t pt-3">
                <span className="font-semibold text-accent-fg text-sm">View matches →</span>
            </div>
        </Card>
    );
}
