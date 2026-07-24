'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { Playday } from '@/lib/playdays';

type Props = {
    playdays: Playday[];
    selectedKey: string | undefined;
    onSelect: (key: string) => void;
};

function Chevron({ direction }: { direction: 'left' | 'right' }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
        >
            {direction === 'left' ? <path d="M10 3 5 8l5 5" /> : <path d="m6 3 5 5-5 5" />}
        </svg>
    );
}

export default function PlaydayPicker({ playdays, selectedKey, onSelect }: Props) {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState({ left: false, right: false });

    const updateScrollState = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const left = el.scrollLeft > 1;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
        setCanScroll((prev) =>
            prev.left === left && prev.right === right ? prev : { left, right },
        );
    }, []);

    useEffect(() => {
        updateScrollState();
        document.fonts?.ready.then(updateScrollState);
        window.addEventListener('resize', updateScrollState);
        return () => window.removeEventListener('resize', updateScrollState);
    }, [updateScrollState]);

    useEffect(() => {
        if (selectedKey === undefined) return;
        const scrollToSelected = () => {
            scrollerRef.current
                ?.querySelector(`[data-key="${CSS.escape(selectedKey)}"]`)
                ?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
        };
        scrollToSelected();

        let cancelled = false;
        document.fonts?.ready.then(() => {
            if (!cancelled) scrollToSelected();
        });
        return () => {
            cancelled = true;
        };
    }, [selectedKey]);

    function scrollByPage(direction: -1 | 1) {
        const el = scrollerRef.current;
        el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
    }

    const overflowing = canScroll.left || canScroll.right;

    const arrowClasses = (visible: boolean) =>
        cn(
            'grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border border-edge text-fg-muted transition-colors hover:border-edge-strong hover:text-fg disabled:pointer-events-none disabled:opacity-40',
            !visible && 'invisible',
        );

    return (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                aria-label="Earlier playdays"
                disabled={!canScroll.left}
                onClick={() => scrollByPage(-1)}
                className={arrowClasses(overflowing)}
            >
                <Chevron direction="left" />
            </button>

            <div
                ref={scrollerRef}
                onScroll={updateScrollState}
                data-swipe-ignore
                className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
            >
                {playdays.map((day) => {
                    const active = day.key === selectedKey;
                    return (
                        <button
                            key={day.key}
                            type="button"
                            data-key={day.key}
                            aria-pressed={active}
                            onClick={() => onSelect(day.key)}
                            className={cn(
                                'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1 font-medium text-sm transition-colors',
                                active
                                    ? 'border-transparent bg-accent text-white'
                                    : 'border-edge text-fg-muted hover:border-edge-strong hover:text-fg',
                            )}
                        >
                            {day.hasLive && (
                                <span
                                    aria-hidden
                                    className={cn(
                                        'mr-1.5 inline-block size-1.5 rounded-full motion-safe:animate-pulse',
                                        active ? 'bg-white' : 'bg-live',
                                    )}
                                />
                            )}
                            {day.label}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                aria-label="Later playdays"
                disabled={!canScroll.right}
                onClick={() => scrollByPage(1)}
                className={arrowClasses(overflowing)}
            >
                <Chevron direction="right" />
            </button>
        </div>
    );
}
