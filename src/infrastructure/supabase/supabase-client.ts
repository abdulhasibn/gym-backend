import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { AppConfig } from '../../config/environment';

/**
 * The only file in the codebase that may call `createClient` (cursor-database.mdc).
 * Constructed once per process lifetime by the composition root and injected
 * into repositories — never imported directly by presentation/application/domain code.
 */
export function createSupabaseInfraClient(config: Pick<AppConfig, 'supabase'>): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false },
  });
}
