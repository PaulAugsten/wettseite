import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Service-role client that bypasses RLS. Server-only (cron routes, scraper
 * scripts) — must never be imported from client code.
 */
export function createAdminClient() {
    return createClient<Database>(
        requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
        requireEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );
}
