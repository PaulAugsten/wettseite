import { cn } from '@/lib/cn';
import type { MatchStatus, TournamentStatus } from '@/lib/types';

export type BadgeStatus = TournamentStatus | MatchStatus;

const toneClasses: Record<BadgeStatus, string> = {
    live: 'bg-live-muted text-live-fg',
    scheduled: 'bg-accent-muted text-accent-fg',
    planned: 'bg-accent-muted text-accent-fg',
    finished: 'bg-white/5 text-fg-muted',
};

const defaultLabels: Record<BadgeStatus, string> = {
    live: 'Live',
    scheduled: 'Upcoming',
    planned: 'Upcoming',
    finished: 'Finished',
};

export function StatusBadge({
    status,
    label,
    className,
}: {
    status: BadgeStatus;
    /** Overrides the default label, e.g. "Final" or a date. */
    label?: string | undefined;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
                toneClasses[status],
                className,
            )}
        >
            {status === 'live' && (
                <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
                />
            )}
            {label ?? defaultLabels[status]}
        </span>
    );
}
