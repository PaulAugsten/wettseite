import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
    it.each([
        ['live', 'Live'],
        ['scheduled', 'Upcoming'],
        ['planned', 'Upcoming'],
        ['finished', 'Finished'],
    ] as const)('shows the default label for %s', (status, label) => {
        render(<StatusBadge status={status} />);

        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('allows overriding the label', () => {
        render(<StatusBadge status="finished" label="Final" />);

        expect(screen.getByText('Final')).toBeInTheDocument();
        expect(screen.queryByText('Finished')).not.toBeInTheDocument();
    });
});
