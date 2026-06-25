import { describe, expect, it, vi } from 'vitest';
import { parseWikitextDate } from '@/lib/supabase/api/scraper/rainbow-six-siege/date_parser';

describe('parseWikitextDate', () => {
    it('converts a date with an explicit timezone abbreviation to UTC ISO', () => {
        const result = parseWikitextDate('March 15, 2024 - 18:00 {{Abbr/CET}}');
        expect(result).toBe('2024-03-15T17:00:00.000Z');
    });

    it('defaults to UTC when no timezone abbreviation is present', () => {
        const result = parseWikitextDate('January 1, 2024 - 12:00');
        expect(result).toBe('2024-01-01T12:00:00.000Z');
    });

    it('strips ordinal suffixes before parsing', () => {
        const result = parseWikitextDate('March 21st, 2024 - 10:00 {{Abbr/EST}}');
        expect(result).toBe('2024-03-21T15:00:00.000Z');
    });

    it('returns null for unparseable text', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(parseWikitextDate('not a date')).toBeNull();
        errorSpy.mockRestore();
    });
});
