'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { AuthActionState } from '@/app/(login)/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';

export type AuthField = {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'password';
    autoComplete: string;
};

export function AuthForm({
    title,
    subtitle,
    fields,
    submitLabel,
    action,
    footer,
}: {
    title: string;
    subtitle: string;
    fields: AuthField[];
    submitLabel: string;
    action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
    footer: { text: string; linkLabel: string; href: string };
}) {
    const [state, formAction, pending] = useActionState(action, { message: '' });

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
            <Link href="/" className="font-extrabold text-2xl text-fg tracking-tight no-underline">
                wettsite
            </Link>

            <Card className="w-full max-w-md p-8">
                <div className="mb-6 flex flex-col gap-1">
                    <h1 className="font-semibold text-2xl text-fg tracking-tight">{title}</h1>
                    <p className="text-fg-muted text-sm">{subtitle}</p>
                </div>

                {state.errors && (
                    <p
                        role="alert"
                        className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-danger-fg text-sm"
                    >
                        {state.message}
                    </p>
                )}

                <form acceptCharset="UTF-8" className="flex flex-col gap-4">
                    {fields.map((field) => (
                        <FormField key={field.id} id={field.id} label={field.label}>
                            <Input
                                id={field.id}
                                name={field.name}
                                type={field.type}
                                autoComplete={field.autoComplete}
                                autoCapitalize="none"
                                autoCorrect="off"
                                required
                            />
                        </FormField>
                    ))}

                    <Button
                        type="submit"
                        formAction={formAction}
                        disabled={pending}
                        className="mt-2 w-full"
                    >
                        {pending ? 'Please wait…' : submitLabel}
                    </Button>
                </form>

                <p className="mt-6 text-center text-fg-muted text-sm">
                    {footer.text}{' '}
                    <Link
                        href={footer.href}
                        className="font-semibold text-accent-fg hover:underline"
                    >
                        {footer.linkLabel}
                    </Link>
                </p>
            </Card>
        </main>
    );
}
