import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TournamentTabs from '@/components/TournamentTabs';
import type { Match, StandingsRow } from '@/lib/types';

vi.mock('next/navigation', () => ({ usePathname: () => '/rainbow-six-siege/test-major' }));
vi.mock('@/app/(root)/[game]/[tournament]/actions', () => ({ submitPrediction: vi.fn() }));

const match: Match = {
    id: 1,
    date: '2099-01-01T18:00:00.000Z',
    team1: { id: 1, name: 'Team Liquid', short_name: 'TL', slug: 'team-liquid' },
    team2: { id: 2, name: 'Team Vitality', short_name: 'VIT', slug: 'team-vitality' },
    team1_score: 0,
    team2_score: 0,
    winner_id: 0,
    status: 'planned',
    round: '',
    stage: '',
    group: '',
    bracket: '',
};

const standings: StandingsRow[] = [
    { user_id: 'a', username: 'Alice', points: 5, total_predictions: 10 },
];

function renderTabs() {
    return render(
        <TournamentTabs
            matches={[match]}
            standings={standings}
            statsByMatch={{}}
            userPicks={{}}
            isLoggedIn={false}
        />,
    );
}

function swipe(
    element: Element,
    from: { x: number; y: number },
    to: { x: number; y: number },
    target: Element = element,
) {
    fireEvent.touchStart(element, {
        touches: [{ clientX: from.x, clientY: from.y, target }],
    });
    fireEvent.touchEnd(element, {
        changedTouches: [{ clientX: to.x, clientY: to.y }],
    });
}

describe('TournamentTabs', () => {
    it('shows matches first and switches to standings on tab click', () => {
        renderTabs();

        expect(screen.getByRole('tab', { name: 'Matches' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.getByText('Team Liquid')).toBeVisible();

        fireEvent.click(screen.getByRole('tab', { name: 'Standings' }));

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(document.getElementById('panel-matches')).toHaveClass('hidden');
        expect(document.getElementById('panel-standings')).not.toHaveClass('hidden');
    });

    it('switches to standings on a left swipe and back on a right swipe', () => {
        const { container } = renderTabs();
        const root = container.firstElementChild as Element;

        swipe(root, { x: 300, y: 200 }, { x: 100, y: 210 });
        expect(screen.getByRole('tab', { name: 'Standings' })).toHaveAttribute(
            'aria-selected',
            'true',
        );

        swipe(root, { x: 100, y: 200 }, { x: 300, y: 190 });
        expect(screen.getByRole('tab', { name: 'Matches' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('ignores short and mostly vertical moves', () => {
        const { container } = renderTabs();
        const root = container.firstElementChild as Element;

        swipe(root, { x: 300, y: 200 }, { x: 260, y: 205 }); // too short
        swipe(root, { x: 300, y: 100 }, { x: 180, y: 400 }); // scrolling down
        expect(screen.getByRole('tab', { name: 'Matches' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('does not switch tabs when the swipe starts on the playday strip', () => {
        const { container } = renderTabs();
        const root = container.firstElementChild as Element;
        const strip = container.querySelector('[data-swipe-ignore]') as Element;

        fireEvent.touchStart(strip, { touches: [{ clientX: 300, clientY: 200 }] });
        fireEvent.touchEnd(root, { changedTouches: [{ clientX: 100, clientY: 200 }] });

        expect(screen.getByRole('tab', { name: 'Matches' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });
});
