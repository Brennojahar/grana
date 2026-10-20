import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null quando o projeto ainda não tem Supabase configurado: o app roda em modo local. */
export const supabase: SupabaseClient | null =
  url && chave
    ? createClient(url, chave, {
        // PKCE devolve o código na query (?code=), que não briga com as rotas do app.
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'grana:sessao' },
      })
    : null;
