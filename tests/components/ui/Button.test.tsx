import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
    it('renders a link when href is given', () => {
        render(<Button href="/login">Log in</Button>);

        const link = screen.getByRole('link', { name: 'Log in' });
        expect(link).toHaveAttribute('href', '/login');
    });

    it('renders a native button defaulting to type="button"', () => {
        render(<Button>Save</Button>);

        expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
    });

    it('keeps an explicit type="submit"', () => {
        render(<Button type="submit">Send</Button>);

        expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
    });

    it('supports the disabled attribute', () => {
        render(<Button disabled>Save</Button>);

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
});
