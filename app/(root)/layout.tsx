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

            <nav className="sticky top-0 z-100 border-b border-edge bg-bg/85 backdrop-blur-md">
                <div className="flex min-h-(--navbar-height) w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6 sm:py-0">
                    <Link
                        href="/"
                        className="mr-2 text-xl font-extrabold tracking-tight text-fg no-underline sm:mr-4 sm:text-2xl"
                    >
                        wettsite
                    </Link>

                    <NavLinks />

                    <div className="ml-auto flex items-center gap-2">
                        {user ? (
                            <UserMenu username={username} />
                        ) : (
                            <>
                                <Button href="/login" variant="outline" size="sm">
                                    Log in
                                </Button>
                                <Button href="/signup" size="sm">
                                    Sign up
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        </div>
    );
}
