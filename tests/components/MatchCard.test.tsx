import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { submitPrediction } from '@/app/(root)/[game]/[tournament]/actions';
import MatchCard from '@/components/MatchCard';
import type { Match } from '@/lib/types';

vi.mock('next/navigation', () => ({ usePathname: () => '/rainbow-six-siege/test-major' }));
vi.mock('@/app/(root)/[game]/[tournament]/actions', () => ({ submitPrediction: vi.fn() }));

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

const noStats = { team1: 0, team2: 0, total: 0, team1Voters: [], team2Voters: [] };

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

    it('submits a winner prediction with the current path on click', async () => {
        vi.mocked(submitPrediction).mockResolvedValue({ success: true });
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

        expect(submitPrediction).toHaveBeenCalledWith(
            { kind: 'winner', matchId: 1, teamId: 1 },
            '/rainbow-six-siege/test-major',
        );
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
                stats={{ team1: 8, team2: 2, total: 10, team1Voters: [], team2Voters: [] }}
                isLoggedIn={true}
            />,
        );

        expect(screen.getByText('2 - 0')).toBeInTheDocument();
        expect(screen.getByText('✓ Correct pick')).toBeInTheDocument();
        expect(screen.getByText('Team Liquid').closest('button')).toHaveClass('border-success');
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
                stats={{ team1: 2, team2: 8, total: 10, team1Voters: [], team2Voters: [] }}
                isLoggedIn={true}
            />,
        );

        expect(screen.getByText('✕ Wrong pick')).toBeInTheDocument();
        expect(screen.getByText('Team Liquid').closest('button')).toHaveClass('border-danger');
    });

    it('highlights the picked team with the accent box before the match is decided', () => {
        render(
            <MatchCard match={buildMatch()} userPrediction={1} stats={noStats} isLoggedIn={true} />,
        );

        const button = screen.getByText('Team Liquid').closest('button');
        expect(button).toHaveClass('border-accent');
        expect(button).not.toHaveClass('border-transparent');
    });

    it('reveals who picked which team once the match has started', async () => {
        const user = userEvent.setup();
        render(
            <MatchCard
                match={buildMatch({ status: 'live' })}
                userPrediction={null}
                stats={{
                    team1: 2,
                    team2: 1,
                    total: 3,
                    team1Voters: ['alice', 'bob'],
                    team2Voters: ['carol'],
                }}
                isLoggedIn={true}
            />,
        );

        await user.click(screen.getByRole('button', { name: /3 picks/ }));

        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.getByText('bob')).toBeInTheDocument();
        expect(screen.getByText('carol')).toBeInTheDocument();
    });

    it('marks winning and losing voters on a finished match', async () => {
        const user = userEvent.setup();
        render(
            <MatchCard
                match={buildMatch({
                    status: 'finished',
                    team1_score: 3,
                    team2_score: 1,
                    winner_id: 1,
                })}
                userPrediction={null}
                stats={{
                    team1: 1,
                    team2: 2,
                    total: 3,
                    team1Voters: ['alice'],
                    team2Voters: ['bob', 'carol'],
                }}
                isLoggedIn={true}
            />,
        );

        await user.click(screen.getByRole('button', { name: /3 picks/ }));

        expect(screen.getByText('alice').closest('li')).toHaveTextContent(/✓/);
        expect(screen.getByText('bob').closest('li')).toHaveTextContent(/✕/);
        expect(screen.getByText('carol').closest('li')).toHaveTextContent(/✕/);
    });

    it('hides individual picks while the match is still open', async () => {
        const user = userEvent.setup();
        render(
            <MatchCard
                match={buildMatch()}
                userPrediction={null}
                stats={{
                    team1: 2,
                    team2: 0,
                    total: 2,
                    team1Voters: ['alice', 'bob'],
                    team2Voters: [],
                }}
                isLoggedIn={true}
            />,
        );

        await user.click(screen.getByRole('button', { name: /2 picks/ }));

        expect(screen.queryByText('alice')).not.toBeInTheDocument();
        expect(
            screen.getByText('Who picked what is revealed once the match starts.'),
        ).toBeInTheDocument();
    });

    it('shows no picks toggle when nobody has predicted', () => {
        render(
            <MatchCard
                match={buildMatch()}
                userPrediction={null}
                stats={noStats}
                isLoggedIn={true}
            />,
        );

        expect(screen.queryByRole('button', { name: /picks?$/ })).not.toBeInTheDocument();
    });
});
