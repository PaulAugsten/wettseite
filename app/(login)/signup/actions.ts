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
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        options: {
            // emailRedirectTo: 'https://example.com/welcome',
            data: {
                username: formData.get('username') as string,
            },
        },
    };

    const { error } = await supabase.auth.signUp(data);

    if (error) {
        console.log('Signup error:', error);
        redirect('/error');
    }

    revalidatePath('/', 'layout');
    redirect('/');
}
