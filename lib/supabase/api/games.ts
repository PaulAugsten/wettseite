import { createClient } from '@/lib/supabase/server';

type Game = {
    id: number;
    name: string;
    type: string;
    slug: string;
    created_at: string;
};

export async function getGames(): Promise<{ data: Game[] | null; error: Error | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase.from('games').select('*');

    console.log(data);

    if (error) {
        console.log('Error fetching games: ', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// EXAMPLE: Wenn eine funktion oft wiederverwendet wird / an verschiedenen Stellen dann hier als seperate utility funktion. Das obige ist nur ein beispiel, es wird derweil nur auf der Homepage verwendet
