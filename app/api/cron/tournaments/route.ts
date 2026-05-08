import { NextResponse } from 'next/server';
import { scrapeTournaments } from '@/lib/supabase/api/scraper/rainbow-six-siege/tournaments_scraper';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    scrapeTournaments(true);

    return NextResponse.json({ success: true });
}
