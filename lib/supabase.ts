// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://danaoibpconugfevymki.supabase.co';  
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbmFvaWJwY29udWdmZXZ5bWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzODYzNDksImV4cCI6MjA4OTk2MjM0OX0.cKz8y5S3JeiD6dAYLfXF2FNW3r9ectFnpwl4OdBFPmo';                        // ← sostituisci

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});