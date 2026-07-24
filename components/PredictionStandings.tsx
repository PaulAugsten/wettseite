import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import type { StandingsRow } from '@/lib/types';

const headerCellClasses =
    'px-2 pb-2.5 text-left font-semibold text-fg-muted text-xs uppercase tracking-wider';
const cellClasses = 'border-edge border-t px-2 py-2.5 text-sm';
const medalColors = ['text-amber-400', 'text-slate-400', 'text-amber-700'];

export default function PredictionStandings({ standings }: { standings: StandingsRow[] }) {
    const sorted = standings.toSorted((a, b) => b.points - a.points);

    if (sorted.length === 0) return null;

    return (
        <Card className="p-4 sm:p-5">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className={headerCellClasses}>#</th>
                        <th className={headerCellClasses}>User</th>
                        <th className={cn(headerCellClasses, 'text-right')}>Picks</th>
                        <th className={cn(headerCellClasses, 'text-right')}>Points</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((s, i) => (
                        <tr key={s.user_id}>
                            <td
                                className={cn(
                                    cellClasses,
                                    'w-6 font-mono text-xs tabular-nums',
                                    i < 3 ? cn('font-bold', medalColors[i]) : 'text-fg-muted',
                                )}
                            >
                                {i + 1}
                            </td>
                            <td className={cn(cellClasses, 'text-fg')}>{s.username}</td>
                            <td
                                className={cn(
                                    cellClasses,
                                    'text-right font-mono text-fg-muted tabular-nums',
                                )}
                            >
                                {s.total_predictions}
                            </td>
                            <td
                                className={cn(
                                    cellClasses,
                                    'text-right font-bold font-mono text-accent-fg tabular-nums',
                                )}
                            >
                                {s.points}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}
