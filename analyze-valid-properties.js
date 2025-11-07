const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function analyzeValidProperties() {
  console.log('📊 ANALYZING VALID PROPERTIES FOR CENSUS ENRICHMENT\n');
  console.log('='.repeat(80));

  // 1. Find properties with complete data (coordinates + state required for census API)
  const { data: validProperties, error: validError } = await supabase
    .from('property_listings')
    .select('listing_id, state_id, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .not('state_id', 'is', null);

  if (validError) {
    console.error('Error fetching valid properties:', validError);
    return;
  }

  console.log(`\n✓ Properties with Complete Data: ${validProperties.length.toLocaleString()}`);

  // 2. Check how many already have census data
  const { data: enrichedData, error: enrichedError } = await supabase
    .from('census_demographics')
    .select('listing_id, state_id');

  const enrichedSet = new Set();
  if (!enrichedError && enrichedData) {
    enrichedData.forEach(row => {
      enrichedSet.add(row.listing_id);
    });
  }

  console.log(`✓ Already Enriched: ${enrichedSet.size.toLocaleString()}`);

  const needsEnrichment = validProperties.filter(p => !enrichedSet.has(p.listing_id));
  console.log(`✓ Need Enrichment: ${needsEnrichment.length.toLocaleString()}`);

  // 3. State distribution of properties needing enrichment
  console.log('\n' + '='.repeat(80));
  console.log('STATE DISTRIBUTION (Properties Needing Enrichment):\n');

  const stateCounts = {};
  needsEnrichment.forEach(p => {
    const state = p.state_id;
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  });

  const sortedStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1]);

  console.log('State | Properties to Enrich');
  console.log('-'.repeat(40));

  sortedStates.forEach(([state, count]) => {
    console.log(`${state.padEnd(6)}| ${count.toString().padStart(19)}`);
  });

  // 4. API Usage Calculation
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

  // 5. Batch Plan
  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDED BATCH PLAN:\n');

  const propertiesPerDay = Math.floor(dailyLimit / callsPerProperty);
  const batchSize = 50; // Increase from 10 to 50 for efficiency
  const delayBetweenBatches = 2000; // 2 seconds for safety
  const batchesPerDay = Math.floor(propertiesPerDay / batchSize);

  console.log(`✓ Batch Size: ${batchSize} properties`);
  console.log(`✓ Delay Between Batches: ${delayBetweenBatches}ms`);
  console.log(`✓ Batches per Day: ~${batchesPerDay}`);
  console.log(`✓ Runtime per Day: ~${Math.ceil((batchesPerDay * ((batchSize * 0.5) + (delayBetweenBatches / 1000))) / 60)} minutes`);

  // 6. State Priority Recommendation
  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDED STATE PROCESSING ORDER (Top 15):\n');

  const topStates = sortedStates.slice(0, 15);
  topStates.forEach(([state, count], index) => {
    console.log(`${(index + 1).toString().padStart(2)}. State ${state}: ${count.toLocaleString()} properties`);
  });

  // 7. Daily breakdown
  console.log('\n' + '='.repeat(80));
  console.log('ESTIMATED DAILY BREAKDOWN:\n');

  let totalProcessed = 0;
  let day = 1;

  while (totalProcessed < remaining && day <= 3) {
    const todayTarget = Math.min(propertiesPerDay, remaining - totalProcessed);
    console.log(`Day ${day}: Process ${todayTarget.toLocaleString()} properties (${Math.ceil(todayTarget / batchSize)} batches)`);
    totalProcessed += todayTarget;
    day++;
  }

  console.log('\n' + '='.repeat(80));
}

analyzeValidProperties()
  .then(() => {
    console.log('\n✅ Analysis complete!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
