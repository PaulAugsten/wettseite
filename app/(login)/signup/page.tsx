'use client';

import { useActionState } from 'react';
import { signup } from './actions';
import styles from './signup.module.css';
import Link from 'next/link';

export default function SignupPage() {
    const [state, signupFormAction] = useActionState(signup, { message: '' });

    return (
        <main>
            <div className={styles.signupContainer}>
                <div className={styles.signupCard}>
                    <div className={styles.signupHeader}>
                        <h2>Create your account</h2>
                        <p>Sign up below</p>
                    </div>
                    <div className={`${styles.errorMessage} ${state.errors ? styles.show : ''}`}>
                        <p>{state.message}</p>
                    </div>

                    <form acceptCharset="UTF-8">
                        <div className={styles.formGroup}>
                            <div className={styles.inputWrapper}>
                                <label htmlFor="username">Username</label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    autoComplete="username"
                                    autoFocus
                                    required
                                />
                                <span className={styles.focusBorder}></span>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <div className={styles.inputWrapper}>
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    autoComplete="email"
                                    required
                                />
                                <span className={styles.focusBorder}></span>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <div className={`${styles.inputWrapper} ${styles.passwordWrapper}`}>
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            className={`${styles.btn} ${styles.signupBtn}`}
                            formAction={signupFormAction}
                        >
                            <span className={styles.btnText}>Sign up</span>
                            <span className={styles.btnLoader}></span>
                        </button>
                        <div className={styles.signupFooter}>
                            <p>
                                Already have an account?&nbsp;
                                <Link className={styles.loginLink} href="/login">
                                    Log in
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
