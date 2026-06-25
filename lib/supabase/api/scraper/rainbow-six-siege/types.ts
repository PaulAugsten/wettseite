export type Tournament = {
    id?: number;
    name: string;
    game_id: number;
    location: string;
    prize_pool: string;
    start_date: string;
    end_date: string;
    status: 'scheduled' | 'live' | 'finished';
    url: string;
};

export type Match = {
    external_id: number;
    game_id: number;
    tournament_id: number;
    stage: string;
    group: string;
    bracket: string;
    round: string;
    team1_id: number;
    team2_id: number;
    team1_score: number | null;
    team2_score: number | null;
    winner_id: number | null;
    status: 'planned' | 'live' | 'finished';
    date: string;
};
