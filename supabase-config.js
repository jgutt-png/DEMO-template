require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Create and export Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = {
    supabase,
    SUPABASE_URL,
    SUPABASE_KEY
};
