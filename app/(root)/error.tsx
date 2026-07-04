'use client'; // Error boundaries must be Client Components

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorPanel } from '@/components/ui/ErrorPanel';

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <ErrorPanel
            title="Something went wrong"
            description="An unexpected error occurred. Try again, if it keeps happening, check back later."
            action={<Button onClick={() => reset()}>Try again</Button>}
        />
    );
}
