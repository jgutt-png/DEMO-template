const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = 'your_supabase_key_here';

async function setupDatabase() {
    console.log('Setting up Supabase database...');

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Read SQL file
    const sqlPath = path.join(__dirname, 'supabase-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL schema...');
    console.log('\nNote: You need to run this SQL in the Supabase SQL Editor:');
    console.log('1. Go to https://supabase.com/dashboard/project/your_supabase_project_ref_here/sql');
    console.log('2. Copy the contents of supabase-schema.sql');
    console.log('3. Paste and run it in the SQL Editor\n');

    // Test connection
    const { data, error } = await supabase
        .from('property_searches')
        .select('count')
        .limit(1);

    if (error && error.code === '42P01') {
        console.log('✗ Table does not exist yet. Please run the SQL schema first.');
        return;
    }

    if (error) {
        console.log('✗ Connection error:', error.message);
        return;
    }

    console.log('✓ Successfully connected to Supabase!');
    console.log('✓ Database is ready to use.');
}

setupDatabase().catch(console.error);
