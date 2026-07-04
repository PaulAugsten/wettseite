import { NextResponse } from 'next/server';
import { scrapeTournaments } from '@/lib/scraper/rainbow-six-siege/tournaments';

// Scraping visits one Liquipedia page per tournament; allow time for that.
export const maxDuration = 300;

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await scrapeTournaments({ persist: true });
        return NextResponse.json({ ok: true, ...result });
    } catch (error) {
        console.error('Tournament scrape failed:', error);
        return NextResponse.json({ ok: false, error: 'Scrape failed' }, { status: 500 });
    }
}
