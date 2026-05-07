'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface SignupState {
    message: string;
    errors?: string;
}

export async function signup(previousState: SignupState, formData: FormData): Promise<SignupState> {
    const supabase = await createClient();

    // TODO: implement validation

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;

    if (!email || !password || !username) {
        return { message: 'Missing fields', errors: '500' };
    }

    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

    if (existingProfile) {
        return { message: 'Username already taken', errors: '500' };
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error || !data.user) {
        return { message: error?.message ?? 'Signup failed', errors: '500' };
    }

    const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username,
    });

    if (profileError) {
        return { message: 'Failed to create profile', errors: '500' };
    }

    revalidatePath('/', 'layout');
    redirect('/');
}
