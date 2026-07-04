import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { predict } from '@/app/(root)/[game]/[tournament]/actions';
import MatchCard from '@/components/MatchCard';
import type { Match } from '@/lib/types';

vi.mock('next/navigation', () => ({ usePathname: () => '/rainbow-six-siege/test-major' }));
vi.mock('@/app/(root)/[game]/[tournament]/actions', () => ({ predict: vi.fn() }));

const team1 = { id: 1, name: 'Team Liquid', short_name: 'TL', slug: 'team-liquid' };
const team2 = { id: 2, name: 'Team Vitality', short_name: 'VIT', slug: 'team-vitality' };

function buildMatch(overrides: Partial<Match> = {}): Match {
    return {
        id: 1,
        date: '2099-01-01T00:00:00.000Z',
        team1,
        team2,
        team1_score: 0,
        team2_score: 0,
        winner_id: 0,
        status: 'planned',
        round: '',
        stage: '',
        group: '',
        bracket: '',
        ...overrides,
    };
}

const noStats = { team1: 0, team2: 0, total: 0 };

describe('MatchCard', () => {
    it('shows a login hint and disables prediction buttons when logged out', () => {
        render(
            <MatchCard
                match={buildMatch()}
                userPrediction={null}
                stats={noStats}
                isLoggedIn={false}
            />,
        );

        expect(screen.getByText('Log in to predict')).toBeInTheDocument();
        expect(screen.getByText('Team Liquid').closest('button')).toBeDisabled();
        expect(screen.getByText('Team Vitality').closest('button')).toBeDisabled();
    });

    it('enables prediction buttons for a logged-in user before the match starts', () => {
        render(
            <MatchCard
                match={buildMatch()}
                userPrediction={null}
                stats={noStats}
                isLoggedIn={true}
            />,
        );

        expect(screen.getByText('Team Liquid').closest('button')).toBeEnabled();
        expect(screen.queryByText('Log in to predict')).not.toBeInTheDocument();
    });

    it('disables prediction buttons once the match is no longer planned', () => {
        render(
            <MatchCard
                match={buildMatch({ status: 'live' })}
                userPrediction={null}
                stats={noStats}
                isLoggedIn={true}
            />,
        );

        expect(screen.getByText('Team Liquid').closest('button')).toBeDisabled();
        expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('calls predict with the match id, team id and current path on click', async () => {
        vi.mocked(predict).mockResolvedValue({ success: true });
        const user = userEvent.setup();

        render(
            <MatchCard
                match={buildMatch()}
                userPrediction={null}
                stats={noStats}
                isLoggedIn={true}
            />,
        );

        await user.click(screen.getByText('Team Liquid').closest('button')!);

        expect(predict).toHaveBeenCalledWith(1, 1, '/rainbow-six-siege/test-major');
    });

    it('shows the final score and a correct-pick badge for a finished match', () => {
        render(
            <MatchCard
                match={buildMatch({
                    status: 'finished',
                    team1_score: 2,
                    team2_score: 0,
                    winner_id: 1,
                })}
                userPrediction={1}
                stats={{ team1: 8, team2: 2, total: 10 }}
                isLoggedIn={true}
            />,
        );

        expect(screen.getByText('2 - 0')).toBeInTheDocument();
        expect(screen.getByText('✓ Correct pick')).toBeInTheDocument();
    });

    it('shows a wrong-pick badge when the prediction did not match the winner', () => {
        render(
            <MatchCard
                match={buildMatch({
                    status: 'finished',
                    team1_score: 0,
                    team2_score: 2,
                    winner_id: 2,
                })}
                userPrediction={1}
                stats={{ team1: 2, team2: 8, total: 10 }}
                isLoggedIn={true}
            />,
        );

        expect(screen.getByText('✕ Wrong pick')).toBeInTheDocument();
    });

    it('renders the crowd-prediction percentages once the match is decided', () => {
        render(
            <MatchCard
                match={buildMatch({ status: 'live' })}
                userPrediction={null}
                stats={{ team1: 3, team2: 1, total: 4 }}
                isLoggedIn={true}
            />,
        );

        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('25%')).toBeInTheDocument();
    });
});
