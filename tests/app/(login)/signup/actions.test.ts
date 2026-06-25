import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { signup } from '@/app/(login)/signup/actions';
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
                    single: async () => ({ data: existingProfile }),
                }),
            }),
        })),
        auth: { signUp },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    return { signUp };
}

describe('signup', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns an error when a required field is missing', async () => {
        const result = await signup(
            { message: '' },
            buildFormData({ email: '', password: 'pw', username: 'name' }),
        );
        expect(result).toEqual({ message: 'Missing fields', errors: '500' });
    });

    it('rejects a username that is already taken', async () => {
        mockSupabase({ existingProfile: { id: 'existing' } });

        const result = await signup(
            { message: '' },
            buildFormData({ email: 'a@b.com', password: 'pw', username: 'taken' }),
        );

        expect(result).toEqual({ message: 'Username already taken', errors: '500' });
    });

    it('surfaces the Supabase error message when sign-up fails', async () => {
        mockSupabase({ signUpError: { message: 'email already registered' } });

        const result = await signup(
            { message: '' },
            buildFormData({ email: 'a@b.com', password: 'pw', username: 'newname' }),
        );

        expect(result).toEqual({ message: 'email already registered', errors: '500' });
    });

    it('creates the user, revalidates and redirects home on success', async () => {
        const { signUp } = mockSupabase({});

        await expect(
            signup(
                { message: '' },
                buildFormData({ email: 'a@b.com', password: 'pw', username: 'newname' }),
            ),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(signUp).toHaveBeenCalledWith({
            email: 'a@b.com',
            password: 'pw',
            options: { data: { username: 'newname' } },
        });
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        expect(redirect).toHaveBeenCalledWith('/');
    });
});
