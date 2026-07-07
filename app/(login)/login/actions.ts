'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { AuthActionState } from '@/app/(login)/types';
import { createClient } from '@/lib/supabase/server';

const loginSchema = z.object({
    username: z.string().trim().min(1, 'Enter your username'),
    password: z.string().min(1, 'Enter your password'),
});

// One generic message for every credential failure so responses don't reveal
// whether a username exists.
const INVALID_CREDENTIALS = 'Invalid username or password';

export async function login(
    _previousState: AuthActionState,
    formData: FormData,
): Promise<AuthActionState> {
    const parsed = loginSchema.safeParse({
        username: formData.get('username'),
        password: formData.get('password'),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const { username, password } = parsed.data;
    const supabase = await createClient();

    const { data: email, error: profileError } = await supabase.rpc('get_email_by_username', {
        p_username: username,
    });

    if (profileError || !email) {
        return { error: INVALID_CREDENTIALS };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return { error: INVALID_CREDENTIALS };
    }

    revalidatePath('/', 'layout');
    redirect('/');
}
