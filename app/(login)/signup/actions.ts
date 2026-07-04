'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { AuthActionState } from '@/app/(login)/types';
import { createClient } from '@/lib/supabase/server';

const signupSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'Username must be at least 3 characters')
        .max(24, 'Username must be at most 24 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
    email: z.email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function signup(
    _previousState: AuthActionState,
    formData: FormData,
): Promise<AuthActionState> {
    const parsed = signupSchema.safeParse({
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const { username, email, password } = parsed.data;
    const supabase = await createClient();

    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

    if (existingProfile) {
        return { error: 'Username already taken' };
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username },
        },
    });

    if (error || !data.user) {
        return { error: error?.message ?? 'Signup failed' };
    }

    revalidatePath('/', 'layout');
    redirect('/');
}
