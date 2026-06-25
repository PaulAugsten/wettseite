import { parseWikitextDate } from './date_parser';
import type TeamResolver from './teamnames_resolver';
import type { Match, Tournament } from './types';
import { extractCommentContent, getGroup, getParam, getRound } from './wikitext_parser';

export function calculateMatchScore(text: string): {
    team1Score: number;
    team2Score: number;
} {
    const team1ScoreMatch = text.match(/\|opponent1={{TeamOpponent\|[^|]+\|score=([A-Z0-9]+)/);
    const team2ScoreMatch = text.match(/\|opponent2={{TeamOpponent\|[^|]+\|score=([A-Z0-9]+)/);

    const team1ScoreText = team1ScoreMatch?.[1];
    const team2ScoreText = team2ScoreMatch?.[1];

    if (team1ScoreText && team2ScoreText) {
        const team1Score = team1ScoreText;
        const team2Score = team2ScoreText;

        if (team1Score === 'W' || team2Score === 'FF') {
            return { team1Score: 1, team2Score: 0 };
        } else if (team2Score === 'W' || team1Score === 'FF') {
            return { team1Score: 0, team2Score: 1 };
        }

        if (!Number.isNaN(parseInt(team1Score, 10)) && !Number.isNaN(parseInt(team2Score, 10))) {
            return {
                team1Score: parseInt(team1Score, 10),
                team2Score: parseInt(team2Score, 10),
            };
        }
    }

    let team1Score = 0;
    let team2Score = 0;
    let mapIndex = 1;

    while (true) {
        const mapPattern = new RegExp(`\\|map${mapIndex}={{Map\\|map=([^|]+)\\|([^}]+)}}`, 's');

        const mapMatch = text.match(mapPattern);

        const mapContent = mapMatch?.[2];
        if (!mapContent) {
            break;
        }

        const finishedMatch = mapContent.match(/finished=([^|}\n]+)/);
        const finished = finishedMatch?.[1]?.trim() ?? 'false';

        if (finished === 'skip') {
            mapIndex++;
            continue;
        }

        let t1Total = 0;
        let t2Total = 0;

        const score1Match = mapContent.match(/score1=(\d+)/);
        const score2Match = mapContent.match(/score2=(\d+)/);
        const score1Text = score1Match?.[1];
        const score2Text = score2Match?.[1];

        // old format
        if (score1Text && score2Text) {
            t1Total = parseInt(score1Text, 10);
            t2Total = parseInt(score2Text, 10);
        } else {
            const t1atk = parseInt(mapContent.match(/t1atk=(\d+)/)?.[1] || '0', 10);
            const t1def = parseInt(mapContent.match(/t1def=(\d+)/)?.[1] || '0', 10);
            const t2atk = parseInt(mapContent.match(/t2atk=(\d+)/)?.[1] || '0', 10);
            const t2def = parseInt(mapContent.match(/t2def=(\d+)/)?.[1] || '0', 10);
            const t1otatk = parseInt(mapContent.match(/t1otatk=(\d+)/)?.[1] || '0', 10);
            const t1otdef = parseInt(mapContent.match(/t1otdef=(\d+)/)?.[1] || '0', 10);
            const t2otatk = parseInt(mapContent.match(/t2otatk=(\d+)/)?.[1] || '0', 10);
            const t2otdef = parseInt(mapContent.match(/t2otdef=(\d+)/)?.[1] || '0', 10);

            t1Total = t1atk + t1def + t1otatk + t1otdef;
            t2Total = t2atk + t2def + t2otatk + t2otdef;
        }

        if (t1Total > t2Total) {
            team1Score++;
        } else if (t2Total > t1Total) {
            team2Score++;
        }

        mapIndex++;
    }

    return { team1Score, team2Score };
}

export function parseMatch(text: string, teamResolver: TeamResolver): Match | null {
    const match_id = getParam(text, 'r6esports');
    const team1_name = getParam(text, 'opponent1');
    const team2_name = getParam(text, 'opponent2');
    const finished = getParam(text, 'finished');
    const dateText = getParam(text, 'date');
    const scores = calculateMatchScore(text);
    const team1_score = scores?.team1Score;
    const team2_score = scores?.team2Score;
    let winner_id = null;

    if (!(match_id && team1_name && team2_name)) {
        console.error(
            `missing Matchid: ${match_id}, team1 name: ${team1_name} or team2 name: ${team2_name}`,
        );
        return null;
    }

    const team1_id = teamResolver.resolveTeamId(team1_name, parseInt(match_id, 10));
    const team2_id = teamResolver.resolveTeamId(team2_name, parseInt(match_id, 10));

    if (!team1_id) {
        console.warn(`Unknown team: ${team1_name}`);
        return null;
    }
    if (!team2_id) {
        console.warn(`Unknown team: ${team2_name}`);
        return null;
    }

    if (!dateText) {
        console.error(`missing date text${dateText}`);
        return null;
    }

    const date = parseWikitextDate(dateText);
    if (!date) {
        console.error(`missing date${date}`);
        return null;
    }

    let status: 'planned' | 'live' | 'finished' = 'planned';
    if (finished === 'true') status = 'finished';
    else if (new Date() > new Date(date)) status = 'live';

    if (team1_score > team2_score && status === 'finished') {
        winner_id = team1_id;
    } else if (team1_score < team2_score && status === 'finished') {
        winner_id = team2_id;
    }

    return {
        external_id: parseInt(match_id, 10),
        game_id: teamResolver.getGameId(),
        tournament_id: 0,
        stage: '',
        group: '',
        bracket: '',
        round: '',
        team1_id,
        team2_id,
        team1_score,
        team2_score,
        winner_id,
        status,
        date,
    };
}

export function parseMatchesFromStage(
    text: string,
    tournament: Tournament,
    stage: string | null,
    teamResolver: TeamResolver,
) {
    const matches: Match[] = [];
    const lines = text.split('\n');

    let currentMatchText: string[] = [];
    let insideMatch = false;
    let currentRound: string | null = null;
    let currentGroup: string | null = null;
    let depth = 0;

    for (const line of lines) {
        if (!insideMatch && line.trim().startsWith('<!--') && line.includes('-->')) {
            currentRound = extractCommentContent(line);
        } else if (
            !insideMatch &&
            line.includes('header=') &&
            line.includes('Match') &&
            !line.includes('dateheader')
        ) {
            currentRound = getRound(line, 'header');
        } else if (!insideMatch) {
            const hiddenSortMatch = line.trim().match(/^===={{HiddenSort\|(.+?)}}====$/);
            const hiddenSortContent = hiddenSortMatch?.[1];
            if (hiddenSortContent) {
                currentRound = hiddenSortContent.trim();
            }
        }

        if (!insideMatch && line.includes('Group')) {
            const group = getGroup(line);
            if (group) {
                currentGroup = group;
            }
        }

        if (/{{Match\b/.test(line.trim())) {
            if (insideMatch && currentMatchText.length > 0) {
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamResolver);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id ?? 0;
                    parsedMatch.stage = stage ?? '';
                    parsedMatch.round = currentRound ?? '';
                    parsedMatch.group = '';
                    parsedMatch.bracket = '';

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup ?? '';
                    } else if (stage === 'Playoffs') {
                        if (currentRound?.includes('Upper')) {
                            parsedMatch.bracket = 'Upper';
                        } else if (currentRound?.includes('Lower')) {
                            parsedMatch.bracket = 'Lower';
                        } else {
                            parsedMatch.bracket = 'Single';
                        }
                    }
                    matches.push(parsedMatch);
                }
            }

            currentMatchText = [line];
            insideMatch = true;
            depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

            if (depth === 0) {
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamResolver);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id ?? 0;
                    parsedMatch.stage = stage ?? '';
                    parsedMatch.round = currentRound ?? '';
                    parsedMatch.group = '';
                    parsedMatch.bracket = '';

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup ?? '';
                    } else if (stage === 'Playoffs') {
                        if (currentRound?.includes('Upper')) {
                            parsedMatch.bracket = 'Upper';
                        } else if (currentRound?.includes('Lower')) {
                            parsedMatch.bracket = 'Lower';
                        } else {
                            parsedMatch.bracket = 'Single';
                        }
                    }
                    matches.push(parsedMatch);
                }
                currentMatchText = [];
                insideMatch = false;
            }
            continue;
        }

        if (insideMatch) {
            currentMatchText.push(line);
            depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

            if (depth === 0) {
                const parsedMatch = parseMatch(currentMatchText.join('\n'), teamResolver);
                if (parsedMatch) {
                    parsedMatch.tournament_id = tournament.id ?? 0;
                    parsedMatch.stage = stage ?? '';
                    parsedMatch.round = currentRound ?? '';
                    parsedMatch.group = '';
                    parsedMatch.bracket = '';

                    if (stage?.includes('Group')) {
                        parsedMatch.group = currentGroup ?? '';
                    } else if (stage === 'Playoffs') {
                        if (currentRound?.includes('Upper')) {
                            parsedMatch.bracket = 'Upper';
                        } else if (currentRound?.includes('Lower')) {
                            parsedMatch.bracket = 'Lower';
                        } else {
                            parsedMatch.bracket = 'Single';
                        }
                    }
                    matches.push(parsedMatch);
                }
                currentMatchText = [];
                insideMatch = false;
            }
        }
    }

    return matches;
}
