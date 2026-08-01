/**
 * Returns the value of a required environment variable, failing fast with a
 * descriptive error
 */
export function requireEnv(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
