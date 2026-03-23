import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

type Tournament = {
    name: string;
    game_id: number;
    location: string;
    start_date: string;
    end_date: string;
    status: 'scheduled' | 'live' | 'finished';
    url: string;
};

type Match = {
    match_id: string;
    tournament_id: number;
    stage: string | null;
    group: string | null;
    bracket: string;
    round: string;
    team1_name: string;
    team2_name: string;
    team1_score: number | null;
    team2_score: number | null;
    status: 'scheduled' | 'live' | 'finished';
    date: string;
};

function getStage(el: Element, $: cheerio.CheerioAPI) {
    let current = $(el);

    while (current.length) {
        const previous = current.prev();

        if (previous.is('h2, h3, h4')) {
            return previous.text().trim();
        }

        current = current.parent();
    }

    return null;
}

function getGroup(el: Element, $: cheerio.CheerioAPI) {
    let current = $(el);

    while (current.length) {
        const previous = current.prev();

        if (previous.is('h2, h3, h4, h5')) {
            const text = previous.text().trim();

            const match = text.match(/Group\s+([A-Z])/i);
            if (match) {
                return match[1];
            }
        }

        current = current.parent();
    }

    return null;
}

function getRound(el: Element, $: cheerio.CheerioAPI) {
    return $(el).closest('.brkts-bracket').find('.brkts-header').first().text().trim();
}

function getMatchStatus(el: Element, $: cheerio.CheerioAPI): 'scheduled' | 'live' | 'finished' {
    const hasScore = $(el).find('.match-info-header-scoreholder-score').length > 0;
    const isFinished = $(el).find(".timer-object[data-finished='finished']").length > 0;

    if (!hasScore) return 'scheduled';
    if (isFinished) return 'finished';
    return 'live';
}

function parseDateRange(input: string, year: number) {
    // input has format: "Feb 2 - 15"
    const [month_part, start_day, , end_day] = input.split(' ');

    const month_short = month_part.trim().replace('.', '');
    const month_map: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
    };

    const month_index = month_map[month_short];
    if (month_index === undefined) throw new Error('Invalid month');

    // TODO: start und end datum an die Spiele anpassen
    const start_date = new Date(Date.UTC(year, month_index, parseInt(start_day), 0, 0, 0));
    const end_date = new Date(Date.UTC(year, month_index, parseInt(end_day), 23, 59, 59));

    return { start_date, end_date };
}

function normalizeTeams(team1: string, team2: string) {
    return [team1, team2].sort();
}

function generateMatchId(match: Match) {
    const [team1_name_sorted, team2_name_sorted] = normalizeTeams(
        match.team1_name,
        match.team2_name,
    );

    const raw = [
        match.tournament_id,
        match.stage,
        match.group,
        match.round,
        team1_name_sorted,
        team2_name_sorted,
        match.date,
    ].join('|');

    return crypto.createHash('md5').update(raw).digest('hex');
}

async function scrapePlayoffMatches(tournament_id: number, url: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );

    const matches: Match[] = [];

    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Alle bracket matches (alle matches die auf url zu sehen sind) -> group stage auf anderer seite
    $('.brkts-bracket').each((i, bracketEl) => {
        const headers = $(bracketEl)
            .find('.brkts-round-header > div')
            .map((i, el) =>
                $(el)
                    .contents()
                    .filter(function () {
                        return this.type === 'text';
                    })
                    .text(),
            )
            .get();

        const rounds = $(bracketEl).find('.brkts-round-body');
        console.log('Found .brkts-match:', headers.length);
        console.log('Found .brkts-match:', headers);

        console.log('Found .brkts-match:', rounds.length);

        rounds.each((roundIndex, roundEl) => {
            const roundName = headers[roundIndex];

            console.log(roundName);

            $(roundEl)
                .find('.brkts-match')
                .each((i, matchEl) => {
                    const teams = $(matchEl).find('.brkts-opponent-entry');

                    const stage = getStage(matchEl, $);
                    const group = getGroup(matchEl, $);
                    const bracket = $(matchEl)
                        .closest('.brkts-bracket')
                        .prevAll('h4')
                        .first()
                        .text();
                    const round = getRound(matchEl, $);

                    const team1_name = teams
                        .not('.brkts-opponent-entry-last')
                        .find('.hidden-xs')
                        .text()
                        .trim();
                    const team2_name = teams
                        .filter('.brkts-opponent-entry-last')
                        .find('.hidden-xs')
                        .text()
                        .trim();

                    const team1_score_text = teams
                        .not('.brkts-opponent-entry-last')
                        .find('.brkts-opponent-score-inner')
                        .text()
                        .trim();
                    const team2_score_text = teams
                        .filter('.brkts-opponent-entry-last')
                        .find('.brkts-opponent-score-inner')
                        .text()
                        .trim();

                    const team1_score = team1_score_text ? parseInt(team1_score_text) : null;
                    const team2_score = team2_score_text ? parseInt(team2_score_text) : null;

                    const winner = $(matchEl)
                        .find('.brkts-opponent-entry-left.brkts-opponent-win')
                        .find('.hidden-xs')
                        .text()
                        .trim();

                    const status = getMatchStatus(matchEl, $);

                    const date = $(matchEl).find('.match-info-countdown').text().trim();

                    if (team1_name && team2_name) {
                        const match_id_data = {
                            match_id: '',
                            tournament_id,
                            stage,
                            group,
                            bracket,
                            round,
                            team1_name,
                            team2_name,
                            team1_score,
                            team2_score,
                            status,
                            date,
                        };
                        const match_id = generateMatchId(match_id_data);

                        matches.push({
                            match_id,
                            tournament_id,
                            stage,
                            group,
                            bracket,
                            round,
                            team1_name,
                            team2_name,
                            team1_score,
                            team2_score,
                            status,
                            date,
                        });

                        console.log(
                            // match_id,
                            stage,
                            group,
                            bracket,
                            roundName,
                            team1_name,
                            team2_name,
                            team1_score,
                            team2_score,
                            winner,
                            status,
                            date,
                        );
                    }
                });
        });
    });

    console.log(`Found ${matches.length} matches`);

    /*
    const { data: upsertedMatches, error } = await supabase
        .from('matches')
        .upsert(matches, {
            onConflict: 'external_id',
            ignoreDuplicates: false,
        })
        .select();
    

    if (error) {
        console.error('Error scraping matches: ', error);
        throw error;
    }
    */
}

async function scrapeTournaments(url: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const tournaments: Tournament[] = [];

    $('.card.card--link.w-100').each((i, tournamentEl) => {
        const name = $(tournamentEl).find('.ml-1 > h2').text().trim();

        const href = $(tournamentEl).attr('href');

        const location = $(tournamentEl).find('.meta__item.text-muted').first().text().trim();

        const tournament_duration = $(tournamentEl)
            .find('.meta__item.text-muted')
            .last()
            .text()
            .trim();

        const yearStr = name.split(' ').at(-1);
        if (!yearStr) return;
        const year = yearStr.trim();

        const { start_date, end_date } = parseDateRange(tournament_duration, parseInt(year));

        let status = 'live';
        if (new Date() < start_date) {
            status = 'scheduled';
        } else if (new Date() > end_date) {
            status = 'finished';
        }

        const url_parts = url.split('/');
        url_parts.pop();
        const tournament_url = url_parts.join('/') + href;

        /* tournaments.push({
            name,
        }); */

        console.log(name, href, location, start_date, end_date, year, status, tournament_url);
    });
}

/*
game_id: number;
status: 'scheduled' | 'live' | 'finished';
url: string;
*/
scrapeTournaments('https://siege.gg/competitions?page=1&tier=1&type=Major').catch(console.error);
