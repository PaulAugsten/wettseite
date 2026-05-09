import MatchCard from '@/components/MatchCardClientComponent';
import PredictionStandings from '@/components/PredictionStandings';
import { createClient } from '@/lib/supabase/server';

type TournamentPageParameters = {
    params: {
        game: string;
        tournament: string;
    };
};

type Team = {
    id: number;
    name: string;
    short_name: string;
    slug: string;
};

type Match = {
    id: number;
    date: string;
    team1: Team;
    team2: Team;
    team1_score: number;
    team2_score: number;
    status: string;
    round: string | null;
    stage: string | null;
    group: string | null;
    bracket: string | null;
};

function MatchSection({
    title,
    matches,
    userPredictionMap,
    predictionStats,
    isLoggedIn,
}: {
    title: string;
    matches: Match[];
    userPredictionMap: Map<number, number>;
    predictionStats: Map<number, { team1: number; team2: number; total: number }>;
    isLoggedIn: boolean;
}) {
    if (matches.length === 0) return null;
    return (
        <div className="tournamentSection">
            <h2 className="tournamentSectionTitle">{title}</h2>
            <div className="matchList">
                {matches.map((match) => (
                    <MatchCard
                        key={match.id}
                        match={match}
                        userPrediction={userPredictionMap.get(match.id) ?? null}
                        stats={predictionStats.get(match.id) ?? { team1: 0, team2: 0, total: 0 }}
                        isLoggedIn={isLoggedIn}
                    />
                ))}
            </div>
        </div>
    );
}

export default async function Tournament({ params }: TournamentPageParameters) {
    const { game, tournament } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('tournaments')
        .select(
            `*,
            matches!matches_tournament_id_fkey (
                *,
                team1:teams!matches_team1_id_fkey (id, name, short_name, slug),
                team2:teams!matches_team2_id_fkey (id, name, short_name, slug)
            )`,
        )
        .eq('slug', tournament)
        .order('date', { referencedTable: 'matches', ascending: true })
        .single();

    if (error || !data) {
        console.log(error);
        return <div>No Events found</div>;
    }

    const matches = data.matches as Match[];
    const matchIds = matches.map((m) => m.id);

    const { data: allPredictions } = await supabase
        .from('predictions')
        .select('match_id, predicted_winner_id')
        .in('match_id', matchIds);

    const { data: userPredictions } = user
        ? await supabase
              .from('predictions')
              .select('match_id, predicted_winner_id')
              .eq('user_id', user.id)
              .in('match_id', matchIds)
        : { data: [] };

    const { data: prediction_standings } = await supabase
        .from('prediction_standings')
        .select('*')
        .eq('tournament_id', data.id);

    const userPredictionMap = new Map(
        (userPredictions ?? []).map((p) => [p.match_id, p.predicted_winner_id]),
    );

    const predictionStats = new Map<number, { team1: number; team2: number; total: number }>();
    for (const match of matches) {
        const matchPredictions = (allPredictions ?? []).filter((p) => p.match_id === match.id);
        const team1Count = matchPredictions.filter(
            (p) => p.predicted_winner_id === match.team1?.id,
        ).length;
        const team2Count = matchPredictions.filter(
            (p) => p.predicted_winner_id === match.team2?.id,
        ).length;
        predictionStats.set(match.id, {
            team1: team1Count,
            team2: team2Count,
            total: matchPredictions.length,
        });
    }

    const live = matches.filter((m) => m.status === 'live');
    const upcoming = matches.filter((m) => m.status === 'planned');
    const finished = matches.filter((m) => m.status === 'finished');

    return (
        <div className="gamePage">
            <div className="gamePageHeader">
                <h1 className="gamePageTitle">{data.name}</h1>
                {data.start_date && data.end_date && (
                    <p className="gamePageSubtitle">
                        {new Date(data.start_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(data.end_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}
                    </p>
                )}
            </div>

            <div className="tournamentLayout">
                <div className="matchesColumn">
                    <MatchSection
                        title="Live"
                        matches={live}
                        userPredictionMap={userPredictionMap}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                    <MatchSection
                        title="Upcoming"
                        matches={upcoming}
                        userPredictionMap={userPredictionMap}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                    <MatchSection
                        title="Finished"
                        matches={finished}
                        userPredictionMap={userPredictionMap}
                        predictionStats={predictionStats}
                        isLoggedIn={!!user}
                    />
                </div>
                <div className="standingsColumn">
                    <PredictionStandings standings={prediction_standings ?? []} />
                </div>
            </div>
        </div>
    );

    /*
    return (
        <div>
            <h1 className="text-6xl font-bold">{data.name}</h1>
            <h2 className="text-4xl font-semibold">Upcoming Matches:</h2>

            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols">
                {(data?.matches as Match[]).map((match) => (
                    <div
                        key={match.id}
                        className="bg-white shadow-md rounded-lg p-4 transition t..."
                    >
                        <h3 className="text-lg font-bold mb-2">{match.team1?.name}</h3>
                        <h3 className="text-lg font-bold mb-2">{match.team2?.name}</h3>
                        <p className="text-gray-600">Match ID: {match.id}</p>
                        <p className="text-gray-500 text-sm">Date: {match.date}</p>
                        <p className="text-gray-500 text-sm">Status: {match.status}</p>
                        <Link target="_blank" href={`https://siege.gg/matches/${match.id}`}>
                            Link
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );*/
}
