import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { signup } from '@/app/(login)/signup/actions';
import { initialAuthState } from '@/app/(login)/types';
import { createClient } from '@/lib/supabase/server';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
    redirect: vi.fn(() => {
        throw new Error('NEXT_REDIRECT');
    }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

function buildFormData(fields: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
    }
    return formData;
}

function mockSupabase({
    existingProfile = null,
    signUpError = null,
    signUpUser = { id: 'new-user' },
}: {
    existingProfile?: { id: string } | null;
    signUpError?: { message: string } | null;
    signUpUser?: { id: string } | null;
}) {
    const signUp = vi.fn(async () => ({
        data: { user: signUpError ? null : signUpUser },
        error: signUpError,
    }));

    vi.mocked(createClient).mockResolvedValue({
        from: vi.fn(() => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ data: existingProfile }),
                }),
            }),
        })),
        auth: { signUp },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    return { signUp };
}

const VALID_FORM = {
    email: 'a@b.com',
    password: 'longenough123',
    username: 'newname',
};

describe('signup', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns a validation error for an invalid email', async () => {
        const result = await signup(
            initialAuthState,
            buildFormData({ ...VALID_FORM, email: 'not-an-email' }),
        );
        expect(result).toEqual({ error: 'Enter a valid email address' });
    });

    it('returns a validation error for a too-short password', async () => {
        const result = await signup(
            initialAuthState,
            buildFormData({ ...VALID_FORM, password: 'short' }),
        );
        expect(result).toEqual({ error: 'Password must be at least 8 characters' });
    });

    it('returns a validation error for a username with invalid characters', async () => {
        const result = await signup(
            initialAuthState,
            buildFormData({ ...VALID_FORM, username: 'bad name!' }),
        );
        expect(result).toEqual({
            error: 'Username can only contain letters, numbers and underscores',
        });
    });

    it('rejects a username that is already taken', async () => {
        mockSupabase({ existingProfile: { id: 'existing' } });

        const result = await signup(
            initialAuthState,
            buildFormData({ ...VALID_FORM, username: 'taken' }),
        );

        expect(result).toEqual({ error: 'Username already taken' });
    });

    it('surfaces the Supabase error message when sign-up fails', async () => {
        mockSupabase({ signUpError: { message: 'email already registered' } });

        const result = await signup(initialAuthState, buildFormData(VALID_FORM));

        expect(result).toEqual({ error: 'email already registered' });
    });

    it('creates the user, revalidates and redirects home on success', async () => {
        const { signUp } = mockSupabase({});

        await expect(signup(initialAuthState, buildFormData(VALID_FORM))).rejects.toThrow(
            'NEXT_REDIRECT',
        );

        expect(signUp).toHaveBeenCalledWith({
            email: 'a@b.com',
            password: 'longenough123',
            options: { data: { username: 'newname' } },
        });
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        expect(redirect).toHaveBeenCalledWith('/');
    });
});
