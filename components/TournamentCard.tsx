'use client';

import Link from 'next/link';

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

export function TournamentCard({
    tournament,
    game,
}: {
    tournament: Tournament;
    game: string;
}) {
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
                        <span className="tournamentMetaItem">
                            {tournament.location}
                        </span>
                    )}
                    {tournament.prize_pool && (
                        <span className="tournamentMetaItem">
                            {tournament.prize_pool}
                        </span>
                    )}
                    {tournament.start_date && (
                        <span className="tournamentMetaItem">
                            {' '}
                            {new Date(tournament.start_date).toLocaleDateString(
                                'en-GB',
                                {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                },
                            )}
                            {tournament.end_date &&
                                ` - ${new Date(
                                    tournament.end_date,
                                ).toLocaleDateString('en-GB', {
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
