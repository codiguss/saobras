import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This is the client-side supabase instance that will automatically set cookies
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
