'use client'; // Error boundaries must be Client Components

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorPanel } from '@/components/ui/ErrorPanel';
import './globals.css';

export default function GlobalError({
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
        <html lang="en">
            <body>
                <main className="flex min-h-screen items-center justify-center px-4">
                    <div className="w-full max-w-md">
                        <ErrorPanel
                            title="Something went wrong"
                            description="An unexpected error occurred. Try again — if it keeps happening, check back later."
                            action={<Button onClick={() => reset()}>Try again</Button>}
                        />
                    </div>
                </main>
            </body>
        </html>
    );
}
