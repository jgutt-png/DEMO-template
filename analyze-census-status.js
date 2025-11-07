const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function analyzeCensusStatus() {
  console.log('📊 ANALYZING CENSUS DATA STATUS\n');
  console.log('='.repeat(80));

  // 1. Total properties
  const { count: totalCount, error: totalError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('Error counting properties:', totalError);
    return;
  }

  console.log(`\n✓ Total Properties: ${totalCount.toLocaleString()}`);

  // 2. Properties with census data
  const { count: enrichedCount, error: enrichedError } = await supabase
    .from('census_demographics')
    .select('*', { count: 'exact', head: true });

  if (enrichedError) {
    console.error('Error counting enriched properties:', enrichedError);
    return;
  }

  console.log(`✓ Properties with Census Data: ${enrichedCount.toLocaleString()}`);
  console.log(`✓ Properties Remaining: ${(totalCount - enrichedCount).toLocaleString()}`);
  console.log(`✓ Completion: ${((enrichedCount / totalCount) * 100).toFixed(2)}%`);

  // 3. State distribution
  console.log('\n' + '='.repeat(80));
  console.log('STATE DISTRIBUTION:\n');

  const { data: stateData, error: stateError } = await supabase
    .from('property_listings')
    .select('state_id');

  if (stateError) {
    console.error('Error fetching state data:', stateError);
    return;
  }

  // Count by state
  const stateCounts = {};
  stateData.forEach(row => {
    const state = row.state_id || 'NULL';
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  });

  // Get enriched counts by state
  const { data: enrichedStateData, error: enrichedStateError } = await supabase
    .from('census_demographics')
    .select('state_id');

  const enrichedStateCounts = {};
  if (!enrichedStateError && enrichedStateData) {
    enrichedStateData.forEach(row => {
      const state = row.state_id || 'NULL';
      enrichedStateCounts[state] = (enrichedStateCounts[state] || 0) + 1;
    });
  }

  // Sort by count descending
  const sortedStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Top 20 states

  console.log('State | Total Props | Enriched | Remaining | % Complete');
  console.log('-'.repeat(80));

  sortedStates.forEach(([state, count]) => {
    const enriched = enrichedStateCounts[state] || 0;
    const remaining = count - enriched;
    const pct = ((enriched / count) * 100).toFixed(1);
    console.log(
      `${state.padEnd(6)}| ${count.toString().padStart(11)} | ${enriched.toString().padStart(8)} | ${remaining.toString().padStart(9)} | ${pct.padStart(6)}%`
    );
  });

  // 4. API Usage Calculation
  console.log('\n' + '='.repeat(80));
  console.log('API USAGE ESTIMATES:\n');

  const remaining = totalCount - enrichedCount;
  const callsPerProperty = 3; // tract, block group, county (though county is cached)
  const estimatedCalls = remaining * callsPerProperty;
  const dailyLimit = 50000;
  const daysNeeded = Math.ceil(estimatedCalls / dailyLimit);

  console.log(`✓ Properties to Enrich: ${remaining.toLocaleString()}`);
  console.log(`✓ API Calls per Property: ${callsPerProperty} (tract + block group + county)`);
  console.log(`✓ Estimated Total API Calls: ${estimatedCalls.toLocaleString()}`);
  console.log(`✓ Daily API Limit: ${dailyLimit.toLocaleString()}`);
  console.log(`✓ Estimated Days Needed: ${daysNeeded} days`);
  console.log(`✓ Properties per Day: ~${Math.floor(dailyLimit / callsPerProperty).toLocaleString()}`);

  // 5. Batch Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('BATCH RECOMMENDATIONS:\n');

  const propertiesPerDay = Math.floor(dailyLimit / callsPerProperty);
  const batchSize = 10; // Current batch size
  const delayBetweenBatches = 1000; // 1 second
  const batchesPerDay = Math.floor(propertiesPerDay / batchSize);

  console.log(`✓ Recommended Batch Size: ${batchSize} properties`);
  console.log(`✓ Delay Between Batches: ${delayBetweenBatches}ms`);
  console.log(`✓ Batches per Day: ~${batchesPerDay}`);
  console.log(`✓ Time per Day: ~${Math.ceil((batchesPerDay * (delayBetweenBatches / 1000)) / 60)} minutes`);

  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDED STATE PRIORITY (Top 10):\n');

  const priorityStates = sortedStates.slice(0, 10).map(([state]) => state);
  console.log(priorityStates.join(', '));

  console.log('\n' + '='.repeat(80));
}

analyzeCensusStatus()
  .then(() => {
    console.log('\n✅ Analysis complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
