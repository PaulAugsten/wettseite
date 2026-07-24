'use client';

import { useRef, useState } from 'react';
import MatchCard from '@/components/MatchCard';
import PlaydayPicker from '@/components/PlaydayPicker';
import PredictionStandings from '@/components/PredictionStandings';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';
import { defaultPlaydayKey, groupMatchesByPlayday } from '@/lib/playdays';
import {
    emptyPredictionStats,
    type Match,
    type PredictionStats,
    type StandingsRow,
} from '@/lib/types';

const views = [
    { id: 'matches', label: 'Matches' },
    { id: 'standings', label: 'Standings' },
] as const;

type View = (typeof views)[number]['id'];

type Props = {
    matches: Match[];
    standings: StandingsRow[];
    statsByMatch: Record<number, PredictionStats>;
    userPicks: Record<number, number>;
    isLoggedIn: boolean;
};

export default function TournamentTabs({
    matches,
    standings,
    statsByMatch,
    userPicks,
    isLoggedIn,
}: Props) {
    const playdays = groupMatchesByPlayday(matches);
    const [view, setView] = useState<View>('matches');
    const [dayKey, setDayKey] = useState(() => defaultPlaydayKey(playdays));
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const selectedDay = playdays.find((day) => day.key === dayKey) ?? playdays.at(-1);

    function handleTouchStart(event: React.TouchEvent) {
        if (event.target instanceof Element && event.target.closest('[data-swipe-ignore]')) {
            touchStart.current = null;
            return;
        }
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }

    function handleTouchEnd(event: React.TouchEvent) {
        const start = touchStart.current;
        touchStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch) return;

        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;

        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

        const index = views.findIndex(({ id }) => id === view);
        const next = views[index + (dx < 0 ? 1 : -1)];
        if (next) setView(next.id);
    }

    return (
        <div
            className="flex flex-col gap-6"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div
                role="tablist"
                aria-label="Tournament view"
                className="grid grid-cols-2 gap-1 rounded-lg border border-edge bg-surface p-1 sm:inline-grid sm:w-fit sm:auto-cols-fr sm:grid-flow-col"
            >
                {views.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`tab-${id}`}
                        aria-selected={view === id}
                        aria-controls={`panel-${id}`}
                        onClick={() => setView(id)}
                        className={cn(
                            'cursor-pointer rounded-md px-5 py-1.5 font-semibold text-sm transition-colors',
                            view === id
                                ? 'bg-white/10 text-fg'
                                : 'text-fg-muted hover:bg-white/5 hover:text-fg',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div
                role="tabpanel"
                id="panel-matches"
                aria-labelledby="tab-matches"
                className={cn('flex-col gap-4', view === 'matches' ? 'flex' : 'hidden')}
            >
                {playdays.length === 0 ? (
                    <EmptyState
                        title="No matches yet"
                        description="Matches will show up here once the schedule is published."
                    />
                ) : (
                    <>
                        <PlaydayPicker
                            playdays={playdays}
                            selectedKey={selectedDay?.key}
                            onSelect={setDayKey}
                        />

                        <div className="flex flex-col gap-2">
                            {selectedDay?.matches.map((match) => (
                                <MatchCard
                                    key={match.id}
                                    match={match}
                                    userPrediction={userPicks[match.id] ?? null}
                                    stats={statsByMatch[match.id] ?? emptyPredictionStats}
                                    isLoggedIn={isLoggedIn}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div
                role="tabpanel"
                id="panel-standings"
                aria-labelledby="tab-standings"
                className={view === 'standings' ? 'block' : 'hidden'}
            >
                {standings.length === 0 ? (
                    <EmptyState
                        title="No predictions yet"
                        description="The leaderboard appears once the first picks are in."
                    />
                ) : (
                    <PredictionStandings standings={standings} />
                )}
            </div>
        </div>
    );
}
