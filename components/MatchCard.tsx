'use client';

import { usePathname } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { predict } from '@/app/(root)/[game]/[tournament]/actions';
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

export default function MatchCard({ match, userPrediction, stats, isLoggedIn }: Props) {
    const [localPrediction, setLocalPrediction] = useOptimistic(userPrediction);
    const [loading, startTransition] = useTransition();
    const pathname = usePathname();

    const canPredict =
        isLoggedIn && match.status === 'planned' && new Date() < new Date(match.date);

    const team1PredictionPercentage =
        stats.total > 0 ? Math.round((stats.team1 / stats.total) * 100) : 50;
    const team2PredictionPercentage =
        stats.total > 0 ? Math.round((stats.team2 / stats.total) * 100) : 50;

    function handlePredict(teamId: number) {
        if (!canPredict || loading) return;
        startTransition(async () => {
            setLocalPrediction(teamId);
            await predict(match.id, teamId, pathname);
        });
    }

    function teamButton(team: Team | null, align: 'left' | 'right') {
        const predicted = team !== null && localPrediction === team.id;
        return (
            <button
                type="button"
                aria-pressed={predicted}
                className={cn(
                    'flex flex-col gap-0.5 rounded-md border-2 border-transparent bg-transparent px-3 py-2 transition-colors',
                    align === 'left' ? 'text-right' : 'text-left',
                    canPredict && 'cursor-pointer hover:bg-white/5',
                    predicted && 'border-accent bg-accent-muted',
                )}
                onClick={() => team && handlePredict(team.id)}
                disabled={!canPredict || loading}
            >
                <p className="font-bold text-base text-fg">{team?.name ?? 'TBD'}</p>
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
        <Card className="flex flex-col gap-3 px-5 py-4 transition-colors hover:border-edge-strong">
            <span role="status" aria-live="polite" className="sr-only">
                {pickedTeamName ? `You picked ${pickedTeamName}` : ''}
            </span>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                {teamButton(match.team1, 'left')}

                <div className="flex min-w-20 items-center justify-center">
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

            {stats.total > 0 && match.status !== 'planned' && (
                <div className="flex items-center gap-2">
                    <span className="min-w-8 text-right font-mono font-semibold text-fg-muted text-xs tabular-nums">
                        {team1PredictionPercentage}%
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-linear-to-r from-accent to-accent-hover transition-[width] duration-700"
                            style={{ width: `${team1PredictionPercentage}%` }}
                        />
                    </div>
                    <span className="min-w-8 text-left font-mono font-semibold text-fg-muted text-xs tabular-nums">
                        {team2PredictionPercentage}%
                    </span>
                </div>
            )}

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
        </Card>
    );
}
