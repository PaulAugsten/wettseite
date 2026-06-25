import { createAdminClient } from '@/lib/supabase/admin';

export async function getGameId(gameSlug: string): Promise<number | undefined> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.from('games').select(`id`).eq('slug', gameSlug).single();

    if (error || !data) {
        console.log('Error getting game_id from DB:', error);
        return undefined;
    }

    return data.id;
}
