import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={cn(
                'w-full rounded-sm border border-edge bg-surface px-3 py-2 text-sm text-fg transition-colors placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
        />
    );
}
