import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PredictionStandings from '@/components/PredictionStandings';

describe('PredictionStandings', () => {
    it('renders nothing when there are no standings', () => {
        const { container } = render(<PredictionStandings standings={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('sorts users by points descending', () => {
        render(
            <PredictionStandings
                standings={[
                    { user_id: 'a', username: 'Alice', points: 5, total_predictions: 10 },
                    { user_id: 'b', username: 'Bob', points: 20, total_predictions: 10 },
                    { user_id: 'c', username: 'Carol', points: 10, total_predictions: 10 },
                ]}
            />,
        );

        const rows = screen.getAllByRole('row').slice(1); // skip header row
        const usernames = rows.map((row) => row.textContent);
        expect(usernames[0]).toContain('Bob');
        expect(usernames[1]).toContain('Carol');
        expect(usernames[2]).toContain('Alice');
    });

    it('numbers the ranks sequentially', () => {
        render(
            <PredictionStandings
                standings={[
                    { user_id: 'a', username: 'Alice', points: 30, total_predictions: 10 },
                    { user_id: 'b', username: 'Bob', points: 20, total_predictions: 10 },
                    { user_id: 'c', username: 'Carol', points: 10, total_predictions: 10 },
                    { user_id: 'd', username: 'Dave', points: 5, total_predictions: 10 },
                ]}
            />,
        );

        const rows = screen.getAllByRole('row').slice(1);
        const ranks = rows.map((row) => row.querySelector('td')?.textContent);
        expect(ranks).toEqual(['1', '2', '3', '4']);
    });

    it('does not mutate the standings array passed in', () => {
        const standings = [
            { user_id: 'a', username: 'Alice', points: 5, total_predictions: 10 },
            { user_id: 'b', username: 'Bob', points: 20, total_predictions: 10 },
        ];
        render(<PredictionStandings standings={standings} />);

        expect(standings[0]?.username).toBe('Alice');
        expect(standings[1]?.username).toBe('Bob');
    });
});
