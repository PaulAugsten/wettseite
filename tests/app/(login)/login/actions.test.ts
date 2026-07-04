import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { login } from '@/app/(login)/login/actions';
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
    email,
    rpcError = null,
    signInError = null,
}: {
    email?: string | null;
    rpcError?: { message: string } | null;
    signInError?: { message: string } | null;
}) {
    const rpc = vi.fn(async () => ({ data: email ?? null, error: rpcError }));
    const signInWithPassword = vi.fn(async () => ({ error: signInError }));

    vi.mocked(createClient).mockResolvedValue({
        rpc,
        auth: { signInWithPassword },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    return { rpc, signInWithPassword };
}

describe('login', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns a validation error when username or password is missing', async () => {
        const result = await login(initialAuthState, buildFormData({ username: '', password: '' }));
        expect(result).toEqual({ error: 'Enter your username' });
    });

    it('returns the generic credentials error when the username cannot be resolved', async () => {
        mockSupabase({ email: null });

        const result = await login(
            initialAuthState,
            buildFormData({ username: 'ghost', password: 'secret' }),
        );

        // Same message as a wrong password, so responses don't reveal
        // whether a username exists.
        expect(result).toEqual({ error: 'Invalid username or password' });
    });

    it('returns the generic credentials error when sign-in fails', async () => {
        mockSupabase({ email: 'user@example.com', signInError: { message: 'bad password' } });

        const result = await login(
            initialAuthState,
            buildFormData({ username: 'someuser', password: 'wrong' }),
        );

        expect(result).toEqual({ error: 'Invalid username or password' });
    });

    it('revalidates and redirects home on success', async () => {
        const { signInWithPassword } = mockSupabase({ email: 'user@example.com' });

        await expect(
            login(initialAuthState, buildFormData({ username: 'someuser', password: 'correct' })),
        ).rejects.toThrow('NEXT_REDIRECT');

        expect(signInWithPassword).toHaveBeenCalledWith({
            email: 'user@example.com',
            password: 'correct',
        });
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        expect(redirect).toHaveBeenCalledWith('/');
    });
});
