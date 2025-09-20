import { supabase } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const code = url.searchParams.get('code');
  
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  
  return {
    success: true
  };
};
