/**
 * Migration Runner
 * Executes the census_demographics table migration
 */

require('dotenv').config();
const { supabase } = require('./supabase-config');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('📦 Running Census Demographics Migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '002_census_demographics.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement via Supabase RPC
    // Note: Supabase JS client doesn't support raw DDL directly,
    // so we need to use the SQL editor in the Supabase dashboard

    console.log('⚠️  Manual Migration Required\n');
    console.log('The Supabase JavaScript client does not support executing DDL statements.');
    console.log('Please follow these steps to create the census_demographics table:\n');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('2. Navigate to your project: https://your_supabase_project_ref_here.supabase.co');
    console.log('3. Click on "SQL Editor" in the left sidebar');
    console.log('4. Click "New Query"');
    console.log('5. Copy the contents of migrations/002_census_demographics.sql');
    console.log('6. Paste into the SQL editor');
    console.log('7. Click "Run" to execute\n');
    console.log('Alternatively, if you have direct PostgreSQL access:');
    console.log('psql "postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres" -f migrations/002_census_demographics.sql\n');

    // Try to verify if table exists
    const { data, error } = await supabase
      .from('census_demographics')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ Table census_demographics already exists!');
      console.log('Migration not needed.\n');
      return;
    }

    if (error && error.code === 'PGRST204') {
      console.log('❌ Table census_demographics does not exist.');
      console.log('Please run the migration manually as described above.\n');
    }

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

runMigration();
