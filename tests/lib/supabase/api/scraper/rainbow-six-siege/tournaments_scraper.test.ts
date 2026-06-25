import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getTournamentMetaData,
    shouldIncludeTournament,
} from '@/lib/supabase/api/scraper/rainbow-six-siege/tournaments_scraper';

vi.mock('axios');

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(async () => ({ data: { id: 7 }, error: null })),
                })),
            })),
        })),
    })),
}));

function tournamentHtml({
    name = 'R6 Test Major - Finals',
    city = 'Paris',
    countryTitle = 'France',
    prizePool = '$100,000',
    startDate = 'January 1, 2024',
    endDate = 'January 10, 2024',
} = {}) {
    return `
        <html><body>
        <div class="infobox-header wiki-backgroundcolor-light">${name}</div>
        <div class="infobox-cell-2 infobox-description">Location:</div>
        <div>${city}&nbsp;<a title="${countryTitle}">${countryTitle}</a><br></div>
        <div class="infobox-cell-2 infobox-description">Prize Pool:</div>
        <div>${prizePool}</div>
        <div class="infobox-cell-2 infobox-description">Start Date:</div>
        <div>${startDate}</div>
        <div class="infobox-cell-2 infobox-description">End Date:</div>
        <div>${endDate}</div>
        </body></html>
    `;
}

describe('shouldIncludeTournament', () => {
    it.each([
        'Six Invitational 2024',
        'Six Major Spring',
        'World Cup 2024',
        'RE:L0:AD 2024',
    ])('includes recognized top-tier tournament names: %s', (name) => {
        expect(shouldIncludeTournament(name)).toBe(true);
    });

    it('excludes tournaments that do not match a known tier keyword', () => {
        expect(shouldIncludeTournament('Random Weekly Cup')).toBe(false);
    });

    it('excludes "One" branded events even if otherwise matching', () => {
        expect(shouldIncludeTournament('Six Major One')).toBe(false);
    });
});

describe('getTournamentMetaData', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('extracts name, location and prize pool from the infobox', async () => {
        vi.setSystemTime(new Date('2024-01-05T00:00:00Z'));
        vi.mocked(axios.get).mockResolvedValue({ data: tournamentHtml() });

        const tournament = await getTournamentMetaData(
            'https://liquipedia.net/rainbowsix/Test_Major',
        );

        expect(tournament.name).toBe('Test Major');
        expect(tournament.location).toContain('France');
        expect(tournament.prize_pool).toBe('$100,000');
        expect(tournament.game_id).toBe(7);
        expect(tournament.url).toBe('https://liquipedia.net/rainbowsix/Test_Major');
    });

    it('marks a tournament as scheduled when "now" is before the start date', async () => {
        vi.setSystemTime(new Date('2023-12-01T00:00:00Z'));
        vi.mocked(axios.get).mockResolvedValue({ data: tournamentHtml() });

        const tournament = await getTournamentMetaData(
            'https://liquipedia.net/rainbowsix/Test_Major',
        );
        expect(tournament.status).toBe('scheduled');
    });

    it('marks a tournament as live while within its date range', async () => {
        vi.setSystemTime(new Date('2024-01-05T00:00:00Z'));
        vi.mocked(axios.get).mockResolvedValue({ data: tournamentHtml() });

        const tournament = await getTournamentMetaData(
            'https://liquipedia.net/rainbowsix/Test_Major',
        );
        expect(tournament.status).toBe('live');
    });

    it('marks a tournament as finished once well past the end date', async () => {
        vi.setSystemTime(new Date('2024-02-20T00:00:00Z'));
        vi.mocked(axios.get).mockResolvedValue({ data: tournamentHtml() });

        const tournament = await getTournamentMetaData(
            'https://liquipedia.net/rainbowsix/Test_Major',
        );
        expect(tournament.status).toBe('finished');
    });
});
