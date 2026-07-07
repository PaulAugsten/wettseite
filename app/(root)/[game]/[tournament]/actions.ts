'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types';

/**
 * Discriminated union so new prediction modes can be added per sport without
 * reshaping the action. Football score predictions become a second variant
 * (`kind: 'score'` with `team1Score`/`team2Score`, stored in the existing
 * `predicted_team1_score`/`predicted_team2_score` columns).
 */
const predictionInputSchema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('winner'),
        matchId: z.number().int().positive(),
        teamId: z.number().int().positive(),
    }),
]);

export type PredictionInput = z.infer<typeof predictionInputSchema>;

export async function submitPrediction(
    input: PredictionInput,
    path: string,
): Promise<ActionResult> {
    const parsed = predictionInputSchema.safeParse(input);
    if (!parsed.success || !path.startsWith('/')) {
        return { success: false, error: 'Invalid prediction' };
    }
    const prediction = parsed.data;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'You must be logged in to predict' };
    }

    const { data: match } = await supabase
        .from('matches')
        .select('date, status, team1_id, team2_id')
        .eq('id', prediction.matchId)
        .single();

    if (match?.status !== 'planned' || !match.date || new Date() >= new Date(match.date)) {
        return { success: false, error: 'Prediction deadline has passed' };
    }

    if (prediction.teamId !== match.team1_id && prediction.teamId !== match.team2_id) {
        return { success: false, error: 'Invalid team for this match' };
    }

    const { error } = await supabase.from('predictions').upsert(
        {
            user_id: user.id,
            match_id: prediction.matchId,
            predicted_winner_id: prediction.teamId,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, match_id' },
    );

    if (error) {
        console.error('Error saving prediction:', error);
        return { success: false, error: 'Could not save your prediction. Please try again.' };
    }

    revalidatePath(path);
    return { success: true };
}
