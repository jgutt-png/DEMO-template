const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = 'your_supabase_key_here';

// Create and export Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
    supabase,
    SUPABASE_URL,
    SUPABASE_KEY
};
