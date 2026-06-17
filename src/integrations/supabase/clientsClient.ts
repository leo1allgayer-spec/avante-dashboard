import { createClient } from '@supabase/supabase-js';
import type { Database } from './typesClients';

const SUPABASE_URL = "https://ckabqsggkjebaaliyszn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrYWJxc2dna2plYmFhbGl5c3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzU1NjcsImV4cCI6MjA5MDA1MTU2N30.xFsxS_EyM27KWiHr2pswEyi5yPX3HXPkC4-GWN4PrTk";

export const supabaseClients = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-clients-auth-token', // Chave de armazenamento dedicada para evitar colisão de login
  }
});
export default supabaseClients;
