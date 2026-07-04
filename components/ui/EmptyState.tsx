import type { ReactNode } from 'react';

export function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-edge bg-surface/60 px-6 py-14 text-center">
            <p className="text-base font-semibold text-fg">{title}</p>
            {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}
