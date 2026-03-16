import { createClient } from '@supabase/supabase-js';

export const supabaseConfigured = true;

export const supabase = createClient(
  'https://qfcwxpslgledmizlozlp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmY3d4cHNsZ2xlZG1pemxvemxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2Nzg0NDcsImV4cCI6MjA4OTI1NDQ0N30.DoVI2YAcwvv9oxxrSm5Bx3Wl3eemZj3sAVTabpPXlco',
);

export type { User, Session } from '@supabase/supabase-js';
