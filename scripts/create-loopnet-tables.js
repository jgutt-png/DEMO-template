const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_PROJECT_REF = 'your_supabase_project_ref_here';
const SUPABASE_ACCESS_TOKEN = 'your_supabase_access_token_here';

// Read the SQL file
const sqlPath = path.join(__dirname, 'supabase-loopnet-schema.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

// Use Management API to execute SQL
async function createLoopNetTables() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      query: sqlContent
    });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: body });
        } else {
          resolve({ success: false, error: body, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

console.log('Creating LoopNet tables in Supabase...\n');
console.log('Tables to create:');
console.log('  1. property_listings');
console.log('  2. property_details');
console.log('  + Indexes and comments\n');

createLoopNetTables()
  .then(result => {
    if (result.success) {
      console.log('✓ LoopNet tables created successfully!');
      console.log('\nTables created:');
      console.log('  ✓ property_listings - Basic LoopNet listings');
      console.log('  ✓ property_details - Detailed property information');
      console.log('\nYou can now view them in Supabase dashboard:');
      console.log('  https://supabase.com/dashboard/project/your_supabase_project_ref_here/editor');
    } else {
      console.log('✗ Failed to create tables');
      console.log('Status:', result.status);
      console.log('Error:', result.error);
      console.log('\nNote: You may need to run the SQL manually in the Supabase dashboard.');
      console.log('File location: scripts/supabase-loopnet-schema.sql');
    }
  })
  .catch(error => {
    console.error('✗ Error:', error.message);
    console.log('\nNote: You may need to run the SQL manually in the Supabase dashboard.');
    console.log('File location: scripts/supabase-loopnet-schema.sql');
  });
