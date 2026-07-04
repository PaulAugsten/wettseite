import { render, screen } from '@testing-library/react';
import Link from 'next/link';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
    it('renders title and description', () => {
        render(<EmptyState title="No matches yet" description="Check back later." />);

        expect(screen.getByText('No matches yet')).toBeInTheDocument();
        expect(screen.getByText('Check back later.')).toBeInTheDocument();
    });

    it('renders an optional action', () => {
        render(<EmptyState title="Nothing here" action={<Link href="/">Back to home</Link>} />);

        expect(screen.getByRole('link', { name: 'Back to home' })).toBeInTheDocument();
    });
});
