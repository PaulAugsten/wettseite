import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = {
    children: ReactNode;
    className?: string;
    /** Adds hover raise + border highlight for clickable cards. */
    interactive?: boolean;
    /** Renders the card as a Next.js <Link>. */
    href?: string;
};

const cardClasses = 'block rounded-lg border border-edge bg-card';
const interactiveClasses =
    'transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-edge-strong hover:shadow-[0_8px_24px_rgb(0_0_0/0.3)]';

export function Card({ children, className, interactive = false, href }: CardProps) {
    const classes = cn(cardClasses, interactive && interactiveClasses, className);

    if (href !== undefined) {
        return (
            <Link href={href} className={cn(classes, 'text-inherit no-underline')}>
                {children}
            </Link>
        );
    }

    return <div className={classes}>{children}</div>;
}
