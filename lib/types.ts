type Game = {
    id: number;
    name: string;
    slug: string;
};

export type GameWithTournaments = Game & {
    tournaments: Tournament[];
};

export type TournamentStatus = 'scheduled' | 'live' | 'finished';

export type Tournament = {
    id: number;
    name: string;
    location: string;
    prize_pool: string;
    status: TournamentStatus;
    slug: string;
    start_date: string;
    end_date: string;
};

export type Team = {
    id: number;
    name: string;
    short_name: string;
    slug: string;
};

export type MatchStatus = 'planned' | 'live' | 'finished';

export type Match = {
    id: number;
    date: string;
    team1: Team;
    team2: Team;
    team1_score: number;
    team2_score: number;
    winner_id: number;
    status: MatchStatus;
    round: string;
    stage: string;
    group: string;
    bracket: string;
};

export type PredictionStats = {
    team1: number;
    team2: number;
    total: number;
};

export type StandingsRow = {
    user_id: string;
    username: string;
    points: number;
    total_predictions: number;
};
