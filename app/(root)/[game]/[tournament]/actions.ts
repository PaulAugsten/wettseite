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

    const { error } = await supabase.from('predictions').upsert(
        {
            user_id: user.id,
            match_id: matchId,
            predicted_winne_id: teamId,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, matchid' },
    );

    if (error) {
        return { error: error.message };
    }

    revalidatePath(path);
    return { success: true };
}
