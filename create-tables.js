require('dotenv').config();
const https = require('https');
const fs = require('fs');

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// Read the SQL file
const sqlContent = fs.readFileSync('./supabase-normalized-schema.sql', 'utf8');

// Split SQL into individual statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: `${SUPABASE_PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'apikey': process.env.SUPABASE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
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

// Alternative: Use Management API
async function createTableViaManagementAPI() {
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

console.log('Creating tables in Supabase...\n');
console.log('Using Management API...\n');

createTableViaManagementAPI()
  .then(result => {
    if (result.success) {
      console.log('✓ Tables created successfully!');
      console.log('Response:', result.data);
    } else {
      console.log('✗ Failed to create tables');
      console.log('Status:', result.status);
      console.log('Error:', result.error);
      console.log('\nNote: You may need to run the SQL manually in the Supabase dashboard.');
      console.log('See SETUP_DATABASE.md for instructions.');
    }
  })
  .catch(error => {
    console.error('✗ Error:', error.message);
    console.log('\nNote: You may need to run the SQL manually in the Supabase dashboard.');
    console.log('See SETUP_DATABASE.md for instructions.');
  });
