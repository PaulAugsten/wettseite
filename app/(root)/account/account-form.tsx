'use client';
import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Avatar from './avatar';

export default function AccountForm({ user }: { user: User | null }) {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
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
                console.log(error);
                throw error;
            }

            if (data) {
                setFullname(data.full_name);
                setUsername(data.username);
                setWebsite(data.website);
                setAvatarUrl(data.avatar_url);
            }
        } catch {
            alert('Error loading user data!');
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
            alert('Profile updated!');
        } catch {
            alert('Error updating the data!');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="form-widget">
            {/* ... */}

            <Avatar
                uid={user?.id ?? null}
                url={avatar_url}
                size={150}
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

            <div>
                <label htmlFor="email">Email</label>
                <input id="email" type="text" value={user?.email} disabled />
            </div>
            <div>
                <label htmlFor="fullname">Full Name</label>
                <input
                    id="fullname"
                    type="text"
                    value={fullname || ''}
                    onChange={(e) => setFullname(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="username">Username</label>
                <input
                    id="username"
                    type="text"
                    value={username || ''}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="website">Website</label>
                <input
                    id="website"
                    type="url"
                    value={website || ''}
                    onChange={(e) => setWebsite(e.target.value)}
                />
            </div>

            <div>
                <button
                    type="button"
                    className="button primary block"
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
                    {loading ? 'Loading ...' : 'Update'}
                </button>
            </div>

            <div>
                <form action="/auth/signout" method="post">
                    <button className="button block" type="submit">
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    );
}
