import { rainbowSixSiegeScraper } from './rainbow-six-siege';
import type { GameScraper } from './types';

const scrapers: Record<string, GameScraper> = {
    'rainbow-six-siege': rainbowSixSiegeScraper,
};

export function getScraper(slug: string): GameScraper {
    const scraper = scrapers[slug];
    if (!scraper) {
        throw new Error(`No scraper registered for game "${slug}"`);
    }
    return scraper;
}

export function getScraperSlugs(): string[] {
    return Object.keys(scrapers);
}
