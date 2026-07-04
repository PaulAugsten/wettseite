import type { ReactNode } from 'react';

/**
 * Label + control + hint/error row. Pass the control as children with the same
 * `id`; when showing an error, give the control aria-describedby={`${id}-error`}.
 */
export function FormField({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string | null;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-fg-muted">
                {label}
            </label>
            {children}
            {hint && !error && (
                <p id={`${id}-hint`} className="text-xs text-fg-subtle">
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${id}-error`} role="alert" className="text-xs text-danger-fg">
                    {error}
                </p>
            )}
        </div>
    );
}
