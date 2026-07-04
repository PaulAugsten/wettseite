'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => void;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);

    const isIOS =
        typeof navigator !== 'undefined' &&
        /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isStandalone =
        typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
    const showIOSHint = isIOS && !isStandalone;

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    if (dismissed || (!installPrompt && !showIOSHint)) return null;

    return (
        <dialog
            open
            aria-label="Install app"
            className="fixed bottom-5 left-1/2 z-999 m-0 flex w-[calc(100%-32px)] max-w-105 -translate-x-1/2 flex-col gap-3 rounded-lg border border-edge bg-card px-5 py-4 text-inherit shadow-overlay right-auto"
        >
            {installPrompt ? (
                <>
                    <p className="text-base leading-normal text-fg">
                        Add Wettsite to your homescreen for the best experience!
                    </p>
                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            onClick={() => {
                                installPrompt.prompt();
                                setInstallPrompt(null);
                            }}
                        >
                            Install
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setDismissed(true)}
                        >
                            Dismiss
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-base leading-normal text-fg">
                        Add Wettsite to your homescreen for the best experience by tapping the{' '}
                        <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
                    </p>
                    <div className="flex gap-2">
                        <Button className="flex-1" onClick={() => setDismissed(true)}>
                            Got it
                        </Button>
                    </div>
                </>
            )}
        </dialog>
    );
}
