import type { UnknownTeam } from './_shared/team-resolver';
import type { Match, Tournament } from './_shared/types';

export type GameScraper = {
    scrapeTournaments(recent: boolean): Promise<Tournament[]>;
    scrapeMatches(tournamentIds: number[]): Promise<{
        gameId: number;
        matches: Match[];
        unknownTeams: UnknownTeam[];
        overview?: unknown;
    }>;
};

export type ScrapeTournamentsResult = {
    scraped: number;
    persisted: number;
};

export type GameMatchResult = {
    gameSlug: string;
    gameId: number;
    unknownTeams: UnknownTeam[];
    overview?: unknown;
};

export type ScrapeMatchesResult = {
    scraped: number;
    persisted: number;
    unknownTeams: number;
    perGame: GameMatchResult[];
    tournamentsFinished: number;
};
