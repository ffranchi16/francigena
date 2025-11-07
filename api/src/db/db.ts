import { createClient, SupabaseClient } from '@supabase/supabase-js';

/* !!!!!!!!!!!!!!!!!!!!!!!! queste chiavi vanno messe da un file di configurazione */
const supabase: SupabaseClient = createClient(
    'https://avmqydeqjbreybkmznlr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bXF5ZGVxamJyZXlia216bmxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDEyMTYzNSwiZXhwIjoyMDY5Njk3NjM1fQ.5Z_CkLXxg12eE3sdTh1tVLKrJvtbmYYm50VKB-oWA-4',
    {
        auth: {
            persistSession: false, // disabilita la persistenza della sessione perchè da problemi
            autoRefreshToken: false
        }
    }
);

export default supabase;