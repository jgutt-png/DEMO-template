const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runSchema() {
    console.log('Creating LoopNet tables in Supabase...\n');
    console.log('This script will run the SQL from supabase-loopnet-schema.sql');
    console.log('Please run this SQL manually in the Supabase SQL Editor:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/your_supabase_project_ref_here/sql');
    console.log('2. Click "New Query"');
    console.log('3. Copy the contents of: scripts/supabase-loopnet-schema.sql');
    console.log('4. Paste and click "Run"\n');

    console.log('Alternatively, here is the SQL to run:\n');
    console.log('='  .repeat(80));

    const sqlPath = path.join(__dirname, 'supabase-loopnet-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(sqlContent);
    console.log('=' .repeat(80));

    console.log('\nAfter running the SQL, you can verify the tables were created by running:');
    console.log('  SELECT tablename FROM pg_tables WHERE schemaname = \'public\' AND tablename LIKE \'property%\';');
}

runSchema();
