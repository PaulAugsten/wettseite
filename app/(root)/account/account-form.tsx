'use client';
import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
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
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<Status>(null);
    const [fullname, setFullname] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [website, setWebsite] = useState<string | null>(null);
    const [avatar_url, setAvatarUrl] = useState<string | null>(null);

    const getProfile = useCallback(async () => {
        try {
            setLoading(true);

            const { data, error, status } = await supabase
                .from('profiles')
                .select('full_name, username, website, avatar_url')
                .eq('id', user?.id)
                .single();

            if (error && status !== 406) {
                throw error;
            }

            if (data) {
                setFullname(data.full_name);
                setUsername(data.username);
                setWebsite(data.website);
                setAvatarUrl(data.avatar_url);
            }
        } catch {
            setStatus({ type: 'error', text: 'Error loading user data.' });
        } finally {
            setLoading(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- getProfile sets loading state for the initial fetch
        getProfile();
    }, [getProfile]);

    async function updateProfile({
        username,
        website,
        avatar_url,
    }: {
        username: string | null;
        fullname: string | null;
        website: string | null;
        avatar_url: string | null;
    }) {
        if (!user) return;

        try {
            setLoading(true);

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                full_name: fullname,
                username,
                website,
                avatar_url,
                updated_at: new Date().toISOString(),
            });
            if (error) throw error;
            setStatus({ type: 'success', text: 'Profile updated!' });
        } catch {
            setStatus({ type: 'error', text: 'Error updating the profile.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
            <PageHeader title="Account" subtitle="Manage your profile." />

            <Card className="flex flex-col gap-5 p-6">
                <Avatar
                    uid={user?.id ?? null}
                    url={avatar_url}
                    size={96}
                    onUpload={(url) => {
                        setAvatarUrl(url);
                        updateProfile({
                            fullname,
                            username,
                            website,
                            avatar_url: url,
                        });
                    }}
                />

                <FormField id="email" label="Email">
                    <Input id="email" type="text" value={user?.email ?? ''} disabled />
                </FormField>
                <FormField id="fullname" label="Full name">
                    <Input
                        id="fullname"
                        type="text"
                        value={fullname || ''}
                        onChange={(e) => setFullname(e.target.value)}
                    />
                </FormField>
                <FormField id="username" label="Username">
                    <Input
                        id="username"
                        type="text"
                        value={username || ''}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </FormField>
                <FormField id="website" label="Website">
                    <Input
                        id="website"
                        type="url"
                        value={website || ''}
                        onChange={(e) => setWebsite(e.target.value)}
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
                        onClick={() =>
                            updateProfile({
                                fullname,
                                username,
                                website,
                                avatar_url,
                            })
                        }
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
