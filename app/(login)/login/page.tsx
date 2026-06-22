'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login } from './actions';
import styles from './login.module.css';

export default function LoginPage() {
    const [state, loginFormAction] = useActionState(login, { message: '' });

    return (
        <main>
            <div className={styles.loginContainer}>
                <div className={styles.loginCard}>
                    <div className={styles.loginHeader}>
                        <h2>Welcome Back</h2>
                        <p>Sign in to your account</p>

                        <div
                            className={`${styles.errorMessage} ${state.errors ? styles.show : ''}`}
                        >
                            <p>{state.message}</p>
                        </div>
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
                                    required
                                />
                                <span className={styles.focusBorder}></span>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <div
                                className={`${styles.inputWrapper} ${styles.passwordWrapper}`}
                            >
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                />
                                <span className={styles.focusBorder}></span>
                            </div>
                            <Link
                                className={styles.forgotPassword}
                                href="/password_reset"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <div className={styles.formOptions}>
                            <div className={styles.rememberWrapper}>
                                <input type="checkbox" id="remember" />
                                <label
                                    className={styles.checkboxLabel}
                                    htmlFor="remember"
                                >
                                    <span className={styles.checkmark}></span>
                                    Remember me
                                </label>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className={`${styles.btn} ${styles.loginBtn}`}
                            formAction={loginFormAction}
                        >
                            <span className={styles.btnText}>Sign in</span>
                            <span className={styles.btnLoader}></span>
                        </button>
                        <div className={styles.loginFooter}>
                            <p>
                                Don&apos;t have an account?&nbsp;
                                <Link
                                    className={styles.signupLink}
                                    href="/signup"
                                >
                                    Sign Up
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
