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

    it('assigns top1/top2/top3 rank classes to the first three rows', () => {
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
        expect(rows[0]?.querySelector('td')?.className).toContain('top1');
        expect(rows[1]?.querySelector('td')?.className).toContain('top2');
        expect(rows[2]?.querySelector('td')?.className).toContain('top3');
        expect(rows[3]?.querySelector('td')?.className).not.toMatch(/top\d/);
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
