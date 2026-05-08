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

    if (error) {
        console.log('Error fetching games: ', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// EXAMPLE: If a function is frequently reused, or used in various places, it should be implemented here as a separate utility function. The above serves merely as an example; currently, it is used only on the homepage.
