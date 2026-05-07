import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <div className="rootLayout">
            <nav className="navbar">
                <div className="navInner">
                    <Link href="/" className="navLogo">
                        wettsite
                    </Link>

                    <div className="navLinks">
                        <Link href="/football" className="navLink">
                            Fussball
                        </Link>
                        <Link href="/rainbow-six-siege" className="navLink">
                            Rainbow 6
                        </Link>
                    </div>

                    <div className="navAuth">
                        {user ? (
                            <>
                                <span className="navUsername">{user.email}</span>
                                <form action="/auth/signout" method="post">
                                    <button className="navBtn navBtnOutline">
                                        Sign <output></output>
                                    </button>
                                </form>
                            </>
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
