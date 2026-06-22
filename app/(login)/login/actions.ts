'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface LoginState {
    message: string;
    errors?: string;
}

export async function login(
    _previousState: LoginState,
    formData: FormData,
): Promise<LoginState> {
    const supabase = await createClient();

    // TODO: implement validation
    const data = {
        username: formData.get('username') as string,
        password: formData.get('password') as string,
    };

    if (!data.username || !data.password) {
        return { message: 'Missing username or password', errors: '500' };
    }

    const { data: email, error: profileError } = await supabase.rpc(
        'get_email_by_username',
        {
            p_username: data.username,
        },
    );

    if (profileError || !email) {
        return { message: 'User not found', errors: '500' };
    }

    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: data.password,
    });

    if (error) {
        return { message: 'Invalid credentials', errors: '500' };
    }

    revalidatePath('/', 'layout');
    redirect('/');

    //unreachable at the moment because of the redirect
    // return { success: true };
}
