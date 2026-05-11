'use client';
import { useEffect, useState } from 'react';

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
        <div className="installPrompt">
            {installPrompt ? (
                <>
                    <p className="installPromptText">
                        Add Wettsite to your homescreen for the best experience!
                    </p>
                    <button
                        className="installPromptBtn installPromptBtnPrimary"
                        onClick={() => {
                            installPrompt.prompt();
                            setInstallPrompt(null);
                        }}
                    >
                        Install
                    </button>
                    <button
                        className="installPromptBtn installPromptBtnPrimary"
                        onClick={() => setDismissed(true)}
                    >
                        Dismiss
                    </button>
                </>
            ) : (
                <>
                    <p className="installPromptText">
                        Add Wettsite to your homescreenfor the best experience by tapping the{' '}
                        <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
                    </p>
                    <div className="installPromptActions">
                        <button
                            className="installPromptBtn installPromptBtnPrimary"
                            onClick={() => setDismissed(true)}
                        >
                            Got it
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
