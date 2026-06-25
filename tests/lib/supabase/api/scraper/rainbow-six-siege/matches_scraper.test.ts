import { describe, expect, it } from 'vitest';
import { generateBatchRequests } from '@/lib/supabase/api/scraper/rainbow-six-siege/matches_scraper';

describe('generateBatchRequests', () => {
    it('batches pages into groups of 50 joined by |', () => {
        const pages = Array.from({ length: 3 }, (_, i) => `Page_${i}`);
        expect(generateBatchRequests(pages)).toEqual(['Page_0|Page_1|Page_2']);
    });

    it('starts a new batch every 50 pages', () => {
        const pages = Array.from({ length: 51 }, (_, i) => `Page_${i}`);
        const batches = generateBatchRequests(pages);
        expect(batches).toHaveLength(2);
        expect(batches[1]).toBe('Page_50');
    });
});
