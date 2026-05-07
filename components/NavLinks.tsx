'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks() {
    const pathname = usePathname();

    const links = [
        { href: '/rainbow-six-siege', label: 'Rainbow 6' },
        { href: '/football', label: 'Football' },
    ];

    return (
        <div className="navLinks">
            {links.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={`navLink ${pathname.startsWith(link.href) ? 'navLinkActive' : ''}`}
                >
                    {link.label}
                </Link>
            ))}
        </div>
    );
}
