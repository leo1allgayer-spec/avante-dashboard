import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import type { Database } from './typesClients';

export const supabaseClients = supabase as unknown as SupabaseClient<Database>;

export default supabaseClients;
