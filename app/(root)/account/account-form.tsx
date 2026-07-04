'use client';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { createClient } from '@/lib/supabase/client';
import Avatar from './avatar';

type Status = { type: 'success' | 'error'; text: string } | null;

export default function AccountForm({ user }: { user: User | null }) {
    const supabase = createClient();
    // There's nothing to load without a user, so start idle in that case.
    const [loading, setLoading] = useState(user !== null);
    const [status, setStatus] = useState<Status>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            return;
        }

        let ignore = false;

        const getProfile = async () => {
            try {
                const { data, error } = await createClient()
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', user.id)
                    .maybeSingle();

                if (ignore) {
                    return;
                }

                if (error) {
                    setStatus({ type: 'error', text: 'Error loading user data.' });
                } else if (data) {
                    setUsername(data.username);
                    setAvatarUrl(data.avatar_url);
                }
            } catch {
                if (ignore) {
                    return;
                }
                setStatus({ type: 'error', text: 'Error loading user data.' });
            }
            setLoading(false);
        };

        void getProfile();

        return () => {
            ignore = true;
        };
    }, [user]);

    async function updateProfile({
        username,
        avatarUrl,
    }: {
        username: string | null;
        avatarUrl: string | null;
    }) {
        if (!user || !username) {
            setStatus({ type: 'error', text: 'Username cannot be empty.' });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                username,
                avatar_url: avatarUrl,
            });
            setStatus(
                error
                    ? { type: 'error', text: 'Error updating the profile.' }
                    : { type: 'success', text: 'Profile updated!' },
            );
        } catch {
            setStatus({ type: 'error', text: 'Error updating the profile.' });
        }
        setLoading(false);
    }

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
            <PageHeader title="Account" subtitle="Manage your profile." />

            <Card className="flex flex-col gap-5 p-6">
                <Avatar
                    uid={user?.id ?? null}
                    url={avatarUrl}
                    size={96}
                    onUpload={(url) => {
                        setAvatarUrl(url);
                        updateProfile({ username, avatarUrl: url });
                    }}
                />

                <FormField id="email" label="Email">
                    <Input id="email" type="text" value={user?.email ?? ''} disabled />
                </FormField>
                <FormField id="username" label="Username">
                    <Input
                        id="username"
                        type="text"
                        value={username || ''}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </FormField>

                <p
                    role="status"
                    aria-live="polite"
                    className={cn(
                        'min-h-5 text-sm',
                        status?.type === 'error' ? 'text-danger-fg' : 'text-success-fg',
                    )}
                >
                    {status?.text}
                </p>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => updateProfile({ username, avatarUrl })}
                        disabled={loading}
                    >
                        {loading ? 'Loading…' : 'Update'}
                    </Button>

                    <form action="/auth/signout" method="post">
                        <Button variant="outline" type="submit">
                            Sign out
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
}
