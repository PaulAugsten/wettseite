import { Skeleton } from '@/components/ui/Skeleton';

function HeaderSkeleton() {
    return (
        <div className="border-edge border-b pb-5">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="mt-2 h-4 w-72" />
        </div>
    );
}

function CardGridSkeleton() {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
            </div>
        </div>
    );
}

/** Mirrors the home and [game] pages: header + tournament card grid. */
export function TournamentListSkeleton() {
    return (
        <div className="flex flex-col gap-10">
            <HeaderSkeleton />
            <CardGridSkeleton />
        </div>
    );
}

export function TournamentDetailSkeleton() {
    return (
        <div className="flex flex-col gap-8">
            <HeaderSkeleton />
            <div className="flex flex-col gap-6">
                <Skeleton className="h-11 w-full sm:w-72" />
                <div className="flex gap-2 overflow-hidden">
                    <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
                    <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
                    <Skeleton className="h-8 w-28 shrink-0 rounded-full" />
                </div>
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
            </div>
        </div>
    );
}
