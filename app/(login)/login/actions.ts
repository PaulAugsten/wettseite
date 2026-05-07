'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface LoginState {
    message: string;
    errors?: string;
}

export async function login(previousState: LoginState, formData: FormData): Promise<LoginState> {
    const supabase = await createClient();

    // TODO: implement validation
    const data = {
        username: formData.get('username') as string,
        password: formData.get('password') as string,
    };

    if (!data.username || !data.password) {
        return { message: 'Missing username or password', errors: '500' };
    }

    const { response, error } = await supabase.functions.invoke('username-login', {
        body: data,
    });

    console.log(response);

    if (error) {
        return { message: 'Login failed', errors: '500' };
    }

    revalidatePath('/', 'layout');
    redirect('/');

    //unreachable at the moment because of the redirect
    // return { success: true };
}
