const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function analyzeActiveProperties() {
  console.log('📊 ANALYZING ACTIVE PROPERTIES FOR CENSUS ENRICHMENT\n');
  console.log('='.repeat(80));

  // 1. Total active properties with complete data
  const { count: activeCount, error: activeError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .eq('active_inactive', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .not('state_id', 'is', null);

  if (activeError) {
    console.error('Error counting active properties:', activeError);
    return;
  }

  console.log(`\n✓ Active Properties with Complete Data: ${activeCount.toLocaleString()}`);

  // 2. Check how many already have census data
  const { count: enrichedCount, error: enrichedError } = await supabase
    .from('census_demographics')
    .select('*', { count: 'exact', head: true });

  console.log(`✓ Already Enriched: ${enrichedCount.toLocaleString()}`);
  console.log(`✓ Need Enrichment: ${(activeCount - enrichedCount).toLocaleString()}`);
  console.log(`✓ Completion: ${((enrichedCount / activeCount) * 100).toFixed(2)}%`);

  // 3. Get enriched IDs to filter them out
  const { data: enrichedData, error: enrichedDataError } = await supabase
    .from('census_demographics')
    .select('listing_id, state_id');

  const enrichedSet = new Set();
  if (!enrichedDataError && enrichedData) {
    enrichedData.forEach(row => {
      enrichedSet.add(`${row.listing_id}-${row.state_id}`);
    });
  }

  // 4. Get state distribution - need to paginate due to large dataset
  console.log('\n' + '='.repeat(80));
  console.log('STATE DISTRIBUTION (Fetching all active properties):\n');

  let allActiveProps = [];
  let start = 0;
  const pageSize = 1000;

  while (true) {
    const { data: page, error: pageError } = await supabase
      .from('property_listings')
      .select('listing_id, state_id, state_code')
      .eq('active_inactive', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('state_id', 'is', null)
      .range(start, start + pageSize - 1);

    if (pageError) {
      console.error('Error fetching page:', pageError);
      break;
    }

    if (!page || page.length === 0) break;

    allActiveProps = allActiveProps.concat(page);
    start += pageSize;

    process.stdout.write(`\rFetched ${allActiveProps.length} properties...`);

    if (page.length < pageSize) break; // Last page
  }

  console.log(`\rFetched ${allActiveProps.length} total active properties.`);

  // Filter out already enriched
  const needsEnrichment = allActiveProps.filter(p =>
    !enrichedSet.has(`${p.listing_id}-${p.state_id}`)
  );

  console.log(`\nProperties needing enrichment: ${needsEnrichment.length.toLocaleString()}`);

  // Count by state
  const stateCounts = {};
  needsEnrichment.forEach(p => {
    const key = p.state_code || p.state_id;
    stateCounts[key] = (stateCounts[key] || 0) + 1;
  });

  const sortedStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1]);

  console.log('\n' + '='.repeat(80));
  console.log('STATE DISTRIBUTION (Top 20):\n');
  console.log('State | Properties to Enrich');
  console.log('-'.repeat(40));

  sortedStates.slice(0, 20).forEach(([state, count]) => {
    console.log(`${state.padEnd(6)}| ${count.toString().padStart(19)}`);
  });

  // 5. API Usage Calculation
  console.log('\n' + '='.repeat(80));
  console.log('API USAGE ESTIMATES:\n');

  const remaining = needsEnrichment.length;
  const callsPerProperty = 3; // tract, block group, county
  const estimatedCalls = remaining * callsPerProperty;
  const dailyLimit = 50000;
  const daysNeeded = Math.ceil(estimatedCalls / dailyLimit);

  console.log(`✓ Properties to Enrich: ${remaining.toLocaleString()}`);
  console.log(`✓ API Calls per Property: ${callsPerProperty} (tract + block group + county)`);
  console.log(`✓ Estimated Total API Calls: ${estimatedCalls.toLocaleString()}`);
  console.log(`✓ Daily API Limit: ${dailyLimit.toLocaleString()}`);
  console.log(`✓ Estimated Days Needed: ${daysNeeded} days`);
  console.log(`✓ Properties per Day: ~${Math.floor(dailyLimit / callsPerProperty).toLocaleString()}`);

  // 6. Batch Plan
  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDED BATCH PLAN:\n');

  const propertiesPerDay = Math.floor(dailyLimit / callsPerProperty);
  const batchSize = 50;
  const delayBetweenBatches = 2000; // 2 seconds
  const batchesPerDay = Math.floor(propertiesPerDay / batchSize);
  const avgSecondsPerProperty = 0.5; // Estimated API response time

  console.log(`✓ Batch Size: ${batchSize} properties`);
  console.log(`✓ Delay Between Batches: ${delayBetweenBatches}ms`);
  console.log(`✓ Max Batches per Day: ~${batchesPerDay}`);
  console.log(`✓ Estimated Runtime per Day: ~${Math.ceil((batchesPerDay * ((batchSize * avgSecondsPerProperty) + (delayBetweenBatches / 1000))) / 60)} minutes`);

  // 7. State Priority
  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDED STATE PROCESSING ORDER:\n');

  const allStates = sortedStates.map(([state]) => state);
  console.log(allStates.join(', '));

  // 8. Daily breakdown
  console.log('\n' + '='.repeat(80));
  console.log('ESTIMATED DAILY BREAKDOWN:\n');

  let totalProcessed = 0;
  let day = 1;

  while (totalProcessed < remaining && day <= 5) {
    const todayTarget = Math.min(propertiesPerDay, remaining - totalProcessed);
    const batches = Math.ceil(todayTarget / batchSize);
    const runtime = Math.ceil((batches * ((batchSize * avgSecondsPerProperty) + (delayBetweenBatches / 1000))) / 60);

    console.log(`Day ${day}: Process ${todayTarget.toLocaleString()} properties (${batches} batches, ~${runtime} min)`);
    totalProcessed += todayTarget;
    day++;
  }

  console.log(`\nTotal completion: ${day - 1} days`);

  console.log('\n' + '='.repeat(80));
}

analyzeActiveProperties()
  .then(() => {
    console.log('\n✅ Analysis complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
