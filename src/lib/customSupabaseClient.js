import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zdakltjokthwczhbuygs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkYWtsdGpva3Rod2N6aGJ1eWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMjQ5MTIsImV4cCI6MjA3OTYwMDkxMn0.HmJyVSvZvRN_rKmOx7Xtxf_kHi9TyOZEPN_OX9fuSME';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
