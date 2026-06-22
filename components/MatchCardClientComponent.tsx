'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { predict } from '@/app/(root)/[game]/[tournament]/actions';

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
    winner_id: number;
    status: string;
    round: string;
    stage: string;
    group: string;
    bracket: string;
};

type Props = {
    match: Match;
    userPrediction: number | null;
    stats: { team1: number; team2: number; total: number };
    isLoggedIn: boolean;
};

export default function MatchCard({
    match,
    userPrediction,
    stats,
    isLoggedIn,
}: Props) {
    const [localPrediction, setLocalPrediction] = useState<number | null>(
        userPrediction,
    );
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();

    const canPredict =
        isLoggedIn &&
        match.status === 'planned' &&
        new Date() < new Date(match.date);

    const team1PredictionPercentage =
        stats.total > 0 ? Math.round((stats.team1 / stats.total) * 100) : 50;
    const team2PredictionPercentage =
        stats.total > 0 ? Math.round((stats.team2 / stats.total) * 100) : 50;

    async function handlePredict(teamId: number) {
        if (!canPredict || loading) return;
        setLoading(true);
        setLocalPrediction(teamId);
        await predict(match.id, teamId, pathname);
        setLoading(false);
    }

    return (
        <div className="matchCard">
            <div className="matchTeams">
                <button
                    type="button"
                    className={`matchTeam matchTeamLeft matchTeamBtn ${canPredict ? 'matchTeamClickable' : ''} ${localPrediction === match.team1.id ? 'matchTeamPredicted' : ''}`}
                    onClick={() => match.team1 && handlePredict(match.team1.id)}
                    disabled={!canPredict || loading}
                >
                    <p className="matchTeamName">
                        {match.team1?.name ?? 'TBD'}
                    </p>
                    <p className="matchTeamShort">
                        {match.team1?.short_name ?? ''}
                    </p>
                    {localPrediction === match.team1.id && (
                        <span
                            className={
                                match.status === 'finished'
                                    ? localPrediction === match.winner_id
                                        ? 'matchPredictedBadgeCorrect'
                                        : 'matchPredictedBadgeWrong'
                                    : 'matchPredictedBadge'
                            }
                        >
                            Your Pick ✓
                        </span>
                    )}
                </button>

                <div className="matchScore">
                    {match.status === 'finished' ? (
                        <span className="matchScoreText">
                            {match.team1_score} - {match.team2_score}
                        </span>
                    ) : match.status === 'live' ? (
                        <span className="matchScoreLive">LIVE</span>
                    ) : (
                        <span className="matchScoreTime">
                            {new Date(match.date).toLocaleDateString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    className={`matchTeam matchTeamRight matchTeamBtn ${canPredict ? 'matchTeamClickable' : ''} ${localPrediction === match.team2.id ? 'matchTeamPredicted' : ''}`}
                    onClick={() => match.team2 && handlePredict(match.team2.id)}
                    disabled={!canPredict || loading}
                >
                    <p className="matchTeamName">{match.team2.name ?? 'TBD'}</p>
                    <p className="matchTeamShort">
                        {match.team2.short_name ?? ''}
                    </p>
                    {localPrediction === match.team2.id && (
                        <span
                            className={
                                match.status === 'finished'
                                    ? localPrediction === match.winner_id
                                        ? 'matchPredictedBadgeCorrect'
                                        : 'matchPredictedBadgeWrong'
                                    : 'matchPredictedBadge'
                            }
                        >
                            Your Pick ✓
                        </span>
                    )}
                </button>
            </div>

            {stats.total > 0 && match.status !== 'planned' && (
                <div className="predictionBar">
                    <span className="predictionPrecentage predictionPercentageLeft">
                        {team1PredictionPercentage}%
                    </span>
                    <div className="predictionBarTrack">
                        <div
                            className="predictionBarFill"
                            style={{ width: `${team1PredictionPercentage}%` }}
                        />
                    </div>
                    <span className="predictionPrecentage predictionPercentageRight">
                        {team2PredictionPercentage}%
                    </span>
                </div>
            )}

            <div className="matchFooter">
                {match.round && (
                    <span className="matchRound">{match.round}</span>
                )}
                {match.stage && (
                    <span className="matchStage">{match.stage}</span>
                )}
                {!isLoggedIn && match.status === 'planned' && (
                    <span className="matchLoginHint">Log in to predict</span>
                )}
                <span
                    className={`matchStatusBadge ${match.status === 'finished' ? 'statusFinished' : match.status === 'live' ? 'statusLive' : 'statusUpcoming'}`}
                >
                    {match.status === 'finished'
                        ? 'Final'
                        : match.status === 'live'
                          ? 'Live'
                          : new Date(match.date).toLocaleDateString('en-GB', {
                                month: 'short',
                                day: 'numeric',
                            })}
                </span>
            </div>
        </div>
    );
}
