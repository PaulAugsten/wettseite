import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';
import NavLinks from '@/components/NavLinks';
import UserMenu from '@/components/UserMenu';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    let username: string | null = null;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

        username = profile?.username ?? user.email ?? null;
    }

    return (
        <div className="flex min-h-screen flex-col">
            <InstallPrompt />

            <nav className="sticky top-0 z-100 h-(--navbar-height) border-b border-edge bg-bg/85 backdrop-blur-md">
                <div className="flex h-full w-full items-center gap-4 px-6">
                    <Link
                        href="/"
                        className="mr-4 text-2xl font-extrabold tracking-tight text-fg no-underline"
                    >
                        wettsite
                    </Link>

                    <NavLinks />

                    <div className="flex items-center gap-2">
                        {user ? (
                            <UserMenu username={username} />
                        ) : (
                            <>
                                <Button href="/login" variant="outline">
                                    Log in
                                </Button>
                                <Button href="/signup">Sign up</Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        </div>
    );
}
