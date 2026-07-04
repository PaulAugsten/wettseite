/**
 * Returns the value of a required environment variable, failing fast with a
 * descriptive error instead of letting `undefined` propagate into clients.
 *
 * Pass the value explicitly (e.g. `requireEnv('FOO', process.env.FOO)`) so
 * Next.js can statically inline `NEXT_PUBLIC_*` variables in client bundles.
 */
export function requireEnv(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
