'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export default function NavLinks() {
    const pathname = usePathname();

    const links = [
        { href: '/rainbow-six-siege', label: 'Rainbow 6' },
        { href: '/football', label: 'Football' },
    ];

    return (
        <div className="flex flex-1 items-center gap-2">
            {links.map((link) => {
                const active = pathname.startsWith(link.href);
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'rounded-sm px-3 py-1.5 text-[0.95rem] no-underline transition-colors',
                            active
                                ? 'bg-white/10 font-semibold text-fg'
                                : 'font-medium text-fg-muted hover:bg-white/5 hover:text-fg',
                        )}
                    >
                        {link.label}
                    </Link>
                );
            })}
        </div>
    );
}
