'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function handleSignout() {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    }

    return (
        <div className="userMenu" ref={ref}>
            <button type="button" className="userMenuTrigger" onClick={() => setOpen(!open)}>
                <span className="navUsername">{username}</span>
                <span className={`userMenuArrow ${open ? 'open' : ''}`}>▾</span>
            </button>

            {open && (
                <div className="userMenuDropdown">
                    <Link href="/profile" className="userMenuLink" onClick={() => setOpen(false)}>
                        Profile
                    </Link>
                    <button type="button" className="userMenuSignOut" onClick={handleSignout}>
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
