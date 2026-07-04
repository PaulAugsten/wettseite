'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { createClient } from '@/lib/supabase/client';

const itemClasses =
    'block w-full rounded-sm px-3 py-2 text-left text-sm no-underline transition-colors';

export default function UserMenu({ username }: { username: string | null }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    async function handleSignout() {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    }

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-1.5 rounded-md border border-edge bg-transparent px-3.5 py-1.5 text-[0.95rem] text-fg-muted transition-colors hover:border-edge-strong hover:bg-white/5 hover:text-fg"
                onClick={() => setOpen(!open)}
            >
                <span>{username}</span>
                <span
                    aria-hidden
                    className={cn(
                        'inline-block text-xs transition-transform duration-200',
                        open && 'rotate-180',
                    )}
                >
                    ▾
                </span>
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute top-[calc(100%+8px)] right-0 z-200 flex min-w-40 flex-col gap-0.5 rounded-md border border-edge bg-overlay p-1.5 shadow-overlay"
                >
                    <Link
                        role="menuitem"
                        href="/account"
                        onClick={() => setOpen(false)}
                        className={cn(itemClasses, 'text-fg-muted hover:bg-white/5 hover:text-fg')}
                    >
                        Profile
                    </Link>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignout}
                        className={cn(itemClasses, 'text-danger-fg hover:bg-danger/10')}
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
