'use client';

import { usePathname } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { submitPrediction } from '@/app/(root)/[game]/[tournament]/actions';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/cn';
import type { Match, PredictionStats, Team } from '@/lib/types';

type Props = {
    match: Match;
    userPrediction: number | null;
    stats: PredictionStats;
    isLoggedIn: boolean;
};

function PickBadge({ matchStatus, correct }: { matchStatus: Match['status']; correct: boolean }) {
    if (matchStatus !== 'finished') {
        return <span className="mt-1 block font-semibold text-accent-fg text-xs">Your pick</span>;
    }
    return correct ? (
        <span className="mt-1 block font-semibold text-success-fg text-xs">✓ Correct pick</span>
    ) : (
        <span className="mt-1 block font-semibold text-danger-fg text-xs">✕ Wrong pick</span>
    );
}

type PickOutcome = 'won' | 'lost' | 'open';

function pickOutcome(match: Match, team: Team | null): PickOutcome {
    if (match.status !== 'finished' || team === null) return 'open';
    const decided = match.winner_id === match.team1?.id || match.winner_id === match.team2?.id;
    if (!decided) return 'open';
    return match.winner_id === team.id ? 'won' : 'lost';
}

function TeamPicks({
    team,
    count,
    voters,
    outcome,
    align,
}: {
    team: Team | null;
    count: number;
    voters: string[];
    outcome: PickOutcome;
    /** Which side of the card this team sits on, mirroring the team buttons above. */
    align: 'left' | 'right';
}) {
    return (
        <div
            className={cn(
                'flex min-w-0 flex-col gap-1.5 px-2 sm:px-3',
                align === 'left' ? 'items-end text-right' : 'items-start text-left',
            )}
        >
            <p
                className={cn(
                    'font-semibold text-xs',
                    outcome === 'won' ? 'text-success-fg' : 'text-fg-muted',
                )}
            >
                {team?.short_name ?? team?.name ?? 'TBD'}
                <span className="ml-1.5 font-mono tabular-nums">{count}</span>
            </p>
            {voters.length > 0 ? (
                <ul className={cn('flex flex-wrap gap-1', align === 'left' && 'justify-end')}>
                    {voters.map((name) => (
                        <li
                            key={name}
                            className="rounded-sm bg-white/5 px-2 py-0.5 text-fg-muted text-xs"
                        >
                            {outcome !== 'open' && (
                                <span
                                    aria-hidden
                                    className={cn(
                                        'mr-1 font-semibold',
                                        outcome === 'won' ? 'text-success-fg' : 'text-danger-fg',
                                    )}
                                >
                                    {outcome === 'won' ? '✓' : '✕'}
                                </span>
                            )}
                            {name}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-fg-subtle text-xs">No picks</p>
            )}
        </div>
    );
}

export default function MatchCard({ match, userPrediction, stats, isLoggedIn }: Props) {
    const [localPrediction, setLocalPrediction] = useOptimistic(userPrediction);
    const [loading, startTransition] = useTransition();
    const [showPicks, setShowPicks] = useState(false);
    const pathname = usePathname();

    const canPredict =
        isLoggedIn && match.status === 'planned' && new Date() < new Date(match.date);

    const picksRevealed = match.status !== 'planned';

    function handlePredict(teamId: number) {
        if (!canPredict || loading) return;
        startTransition(async () => {
            setLocalPrediction(teamId);
            await submitPrediction({ kind: 'winner', matchId: match.id, teamId }, pathname);
        });
    }

    function teamButton(team: Team | null, align: 'left' | 'right') {
        const predicted = team !== null && localPrediction === team.id;
        return (
            <button
                type="button"
                aria-pressed={predicted}
                className={cn(
                    'flex min-w-0 flex-col gap-0.5 rounded-md border-2 px-2 py-2 transition-colors sm:px-3',
                    align === 'left' ? 'text-right' : 'text-left',
                    canPredict && 'cursor-pointer hover:bg-white/5',
                    !predicted
                        ? 'border-transparent bg-transparent'
                        : match.status !== 'finished'
                          ? 'border-accent bg-accent-muted'
                          : localPrediction === match.winner_id
                            ? 'border-success bg-success/10'
                            : 'border-danger bg-danger/10',
                )}
                onClick={() => team && handlePredict(team.id)}
                disabled={!canPredict || loading}
            >
                <p className="wrap-break-word font-bold text-fg text-sm sm:text-base">
                    {team?.name ?? 'TBD'}
                </p>
                <p className="text-fg-muted text-xs">{team?.short_name ?? ''}</p>
                {predicted && (
                    <PickBadge
                        matchStatus={match.status}
                        correct={localPrediction === match.winner_id}
                    />
                )}
            </button>
        );
    }

    const pickedTeamName =
        localPrediction === match.team1?.id
            ? match.team1?.name
            : localPrediction === match.team2?.id
              ? match.team2?.name
              : null;

    return (
        <Card className="flex flex-col gap-3 px-3 py-4 transition-colors hover:border-edge-strong sm:px-5">
            <span role="status" aria-live="polite" className="sr-only">
                {pickedTeamName ? `You picked ${pickedTeamName}` : ''}
            </span>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                {teamButton(match.team1, 'left')}

                <div className="flex min-w-14 items-center justify-center sm:min-w-20">
                    {match.status === 'finished' ? (
                        <span className="font-extrabold font-mono text-fg text-xl tabular-nums">
                            {match.team1_score} - {match.team2_score}
                        </span>
                    ) : match.status === 'live' ? (
                        <span className="font-extrabold text-live-fg text-xs motion-safe:animate-pulse">
                            LIVE
                        </span>
                    ) : (
                        <span className="font-mono text-fg-muted text-sm tabular-nums">
                            {new Date(match.date).toLocaleDateString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </span>
                    )}
                </div>

                {teamButton(match.team2, 'right')}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-edge border-t pt-2.5">
                {match.round && (
                    <span className="rounded-sm bg-white/5 px-2 py-0.5 text-fg-muted text-xs">
                        {match.round}
                    </span>
                )}
                {match.stage && (
                    <span className="rounded-sm bg-white/5 px-2 py-0.5 text-fg-muted text-xs">
                        {match.stage}
                    </span>
                )}
                {!isLoggedIn && match.status === 'planned' && (
                    <span className="text-fg-muted text-xs italic">Log in to predict</span>
                )}
                <StatusBadge
                    className="ml-auto"
                    status={match.status}
                    label={
                        match.status === 'finished'
                            ? 'Final'
                            : match.status === 'planned'
                              ? new Date(match.date).toLocaleDateString('en-GB', {
                                    month: 'short',
                                    day: 'numeric',
                                })
                              : undefined
                    }
                />
            </div>

            {stats.total > 0 && (
                <div className="border-edge border-t pt-2.5">
                    <button
                        type="button"
                        aria-expanded={showPicks}
                        onClick={() => setShowPicks((open) => !open)}
                        className="flex cursor-pointer items-center gap-1.5 font-semibold text-fg-muted text-xs transition-colors hover:text-fg"
                    >
                        <span
                            aria-hidden
                            className={cn('transition-transform', showPicks && 'rotate-90')}
                        >
                            ▸
                        </span>
                        {stats.total} {stats.total === 1 ? 'pick' : 'picks'}
                    </button>

                    {showPicks &&
                        (picksRevealed ? (
                            <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4">
                                <TeamPicks
                                    team={match.team1}
                                    count={stats.team1}
                                    voters={stats.team1Voters}
                                    outcome={pickOutcome(match, match.team1)}
                                    align="left"
                                />
                                <div aria-hidden className="min-w-14 sm:min-w-20" />
                                <TeamPicks
                                    team={match.team2}
                                    count={stats.team2}
                                    voters={stats.team2Voters}
                                    outcome={pickOutcome(match, match.team2)}
                                    align="right"
                                />
                            </div>
                        ) : (
                            <p className="mt-2 text-fg-subtle text-xs">
                                Who picked what is revealed once the match starts.
                            </p>
                        ))}
                </div>
            )}
        </Card>
    );
}
