import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';
import NavLinks from '@/components/NavLinks';
import UserMenu from '@/components/UserMenu';
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
        <div className="rootLayout">
            <InstallPrompt></InstallPrompt>

            <nav className="navbar">
                <div className="navInner">
                    <Link href="/" className="navLogo">
                        wettsite
                    </Link>

                    <NavLinks />

                    <div className="navAuth">
                        {user ? (
                            <UserMenu username={username} />
                        ) : (
                            <>
                                <Link href="/login" className="navBtn navBtnOutline">
                                    Log in
                                </Link>
                                <Link href="/signup" className="navBtn navBtnFilled">
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main className="pageContent">{children}</main>
        </div>
    );
}
