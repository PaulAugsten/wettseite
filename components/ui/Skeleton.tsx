import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn('rounded-md bg-white/5 motion-safe:animate-pulse', className)}
        />
    );
}
