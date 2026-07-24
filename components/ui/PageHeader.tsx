import type { ReactNode } from 'react';

export function PageHeader({
    title,
    subtitle,
}: {
    title: string;
    subtitle?: ReactNode | undefined;
}) {
    return (
        <header className="border-b border-edge pb-5">
            <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
        </header>
    );
}
