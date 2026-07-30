import type { GameScraper } from '../types';
import { scrapeRainbowSixSiegeMatches } from './matches';
import { scrapeRainbowSixSiegeTournaments } from './tournaments';

export const GAME_SLUG = 'rainbow-six-siege';
export const TOURNAMENTS_URL = 'https://liquipedia.net/rainbowsix/S-Tier_Tournaments';
export const WIKI = 'rainbowsix';

export const rainbowSixSiegeScraper: GameScraper = {
    scrapeTournaments: scrapeRainbowSixSiegeTournaments,
    scrapeMatches: scrapeRainbowSixSiegeMatches,
};
