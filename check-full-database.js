const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkFullDatabase() {
  console.log('🔍 CHECKING FULL DATABASE STATUS\n');
  console.log('='.repeat(80));

  // Get total count
  const { count: total, error: totalError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });

  console.log(`Total rows in property_listings: ${total}`);

  // Sample some rows to see data structure
  const { data: sample, error: sampleError } = await supabase
    .from('property_listings')
    .select('listing_id, state_id, latitude, longitude, property_name, address, city')
    .limit(10);

  console.log('\nSample of first 10 properties:');
  console.log(JSON.stringify(sample, null, 2));

  // Count by data completeness
  const { data: allProps, error: allError } = await supabase
    .from('property_listings')
    .select('listing_id, state_id, latitude, longitude');

  let withCoords = 0;
  let withState = 0;
  let withBoth = 0;
  let noData = 0;

  allProps.forEach(p => {
    const hasCoords = p.latitude !== null && p.longitude !== null;
    const hasState = p.state_id !== null;

    if (hasCoords) withCoords++;
    if (hasState) withState++;
    if (hasCoords && hasState) withBoth++;
    if (!hasCoords && !hasState) noData++;
  });

  console.log('\nData Completeness:');
  console.log(`Total Properties: ${allProps.length}`);
  console.log(`With Coordinates: ${withCoords}`);
  console.log(`With State: ${withState}`);
  console.log(`With Both (valid for Census): ${withBoth}`);
  console.log(`No Data: ${noData}`);

  console.log('\n' + '='.repeat(80));
}

checkFullDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
