import { Button } from '@/components/ui/Button';

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="font-mono text-fg-subtle text-sm">404</p>
            <h1 className="font-semibold text-2xl text-fg">Page not found</h1>
            <p className="text-fg-muted text-sm">
                The page you&apos;re looking for doesn&apos;t exist or has moved.
            </p>
            <Button href="/" className="mt-3">
                Back to home
            </Button>
        </main>
    );
}
