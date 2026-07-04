import { Button } from '@/components/ui/Button';
import { ErrorPanel } from '@/components/ui/ErrorPanel';

export default function ErrorPage() {
    return (
        <main className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md">
                <ErrorPanel
                    title="Sorry, something went wrong"
                    description="The link may have expired or already been used."
                    action={<Button href="/">Back to home</Button>}
                />
            </div>
        </main>
    );
}
