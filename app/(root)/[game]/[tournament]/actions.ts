'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function predict(matchId: number, teamId: number, path: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in to predict' };
    }

    const { data: match } = await supabase
        .from('matches')
        .select('date, status, team1_id, team2_id')
        .eq('id', matchId)
        .single();

    if (!match || match.status !== 'planned' || new Date() >= new Date(match.date)) {
        return { error: 'Prediction deadline has passed' };
    }

    if (teamId !== match.team1_id && teamId !== match.team2_id) {
        return { error: 'Invalid team for this match' };
    }

    const { error } = await supabase.from('predictions').upsert(
        {
            user_id: user.id,
            match_id: matchId,
            predicted_winner_id: teamId,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, match_id' },
    );

    if (error) {
        return { error: error.message };
    }

    revalidatePath(path);
    return { success: true };
}
