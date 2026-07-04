'use client';
import Image from 'next/image';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Avatar({
    uid,
    url,
    size,
    onUpload,
}: {
    uid: string | null;
    url: string | null;
    size: number;
    onUpload: (url: string) => void;
}) {
    const supabase = createClient();

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const downloadImage = useCallback(
        async (path: string) => {
            const { data, error } = await supabase.storage.from('avatars').download(path);

            if (error || !data) return null;

            return URL.createObjectURL(data);
        },
        [supabase],
    );

    useEffect(() => {
        if (!url) {
            return;
        }

        let objectUrl: string | null = null;

        const run = async () => {
            objectUrl = await downloadImage(url);
            if (objectUrl) {
                setAvatarUrl(objectUrl);
            }
        };

        void run();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [url, downloadImage]);

    const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
        try {
            setUploading(true);
            setError(null);

            const file = event.target.files?.[0];
            if (!file) {
                throw new Error('You must select an image to upload.');
            }

            const fileExt = file.name.split('.').pop();
            const filePath = `${uid}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            onUpload(filePath);
        } catch {
            setError('Error uploading avatar.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            {avatarUrl ? (
                <Image
                    width={size}
                    height={size}
                    src={avatarUrl}
                    alt="Avatar"
                    className="rounded-full border border-edge object-cover"
                    style={{ height: size, width: size }}
                />
            ) : (
                <div
                    aria-hidden
                    className="rounded-full border border-edge bg-surface"
                    style={{ height: size, width: size }}
                />
            )}
            <div className="flex flex-col gap-1.5">
                <label
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border border-edge px-3 py-1.5 font-semibold text-fg-muted text-sm transition-colors hover:border-edge-strong hover:bg-white/5 hover:text-fg"
                    htmlFor="single"
                >
                    {uploading ? 'Uploading…' : 'Upload avatar'}
                </label>
                <input
                    className="sr-only"
                    type="file"
                    id="single"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                />
                {error && (
                    <p role="alert" className="text-danger-fg text-xs">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}
