const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Configuration
const CONFIG = {
  BATCH_SIZE: 50,                    // Properties per batch
  DELAY_BETWEEN_BATCHES: 2000,       // 2 seconds between batches
  DAILY_API_LIMIT: 50000,            // Census API daily limit
  CALLS_PER_PROPERTY: 3,             // tract + block + county calls
  MAX_RETRIES: 3,                    // Retry failed properties
  RETRY_DELAY: 5000,                 // 5 seconds before retry
  SERVER_URL: 'http://localhost:3000'
};

// Calculate max properties per day
const MAX_PROPERTIES_PER_DAY = Math.floor(CONFIG.DAILY_API_LIMIT / CONFIG.CALLS_PER_PROPERTY);

// Progress tracking
let stats = {
  startTime: new Date(),
  totalProperties: 0,
  processedToday: 0,
  enriched: 0,
  failed: 0,
  skipped: 0,
  apiCallsToday: 0,
  errors: []
};

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Print progress update
 */
function printProgress() {
  const elapsed = Date.now() - stats.startTime;
  const rate = stats.processedToday / (elapsed / 1000 / 60); // per minute
  const remaining = stats.totalProperties - stats.processedToday;
  const eta = remaining / rate;

  console.log('\n' + '='.repeat(80));
  console.log(`📊 PROGRESS UPDATE`);
  console.log('='.repeat(80));
  console.log(`Total Properties: ${stats.totalProperties.toLocaleString()}`);
  console.log(`Processed Today: ${stats.processedToday.toLocaleString()} / ${MAX_PROPERTIES_PER_DAY.toLocaleString()}`);
  console.log(`  ✅ Enriched: ${stats.enriched.toLocaleString()}`);
  console.log(`  ⏭️  Skipped: ${stats.skipped.toLocaleString()} (already enriched)`);
  console.log(`  ❌ Failed: ${stats.failed.toLocaleString()}`);
  console.log(`API Calls Today: ${stats.apiCallsToday.toLocaleString()} / ${CONFIG.DAILY_API_LIMIT.toLocaleString()}`);
  console.log(`Elapsed Time: ${formatDuration(elapsed)}`);
  console.log(`Processing Rate: ${rate.toFixed(1)} properties/minute`);
  if (remaining > 0 && rate > 0) {
    console.log(`Estimated Time Remaining: ${formatDuration(eta * 60 * 1000)}`);
  }
  console.log('='.repeat(80) + '\n');
}

/**
 * Enrich a single property
 */
async function enrichProperty(property, retryCount = 0) {
  try {
    const response = await axios.post(
      `${CONFIG.SERVER_URL}/api/census/enrich/${property.listing_id}/${property.state_id}`,
      { radius_miles: 3 },
      { timeout: 30000 } // 30 second timeout
    );

    if (response.data.success) {
      stats.enriched++;
      stats.apiCallsToday += CONFIG.CALLS_PER_PROPERTY;
      return { success: true };
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    // Check if already exists
    if (error.response?.status === 409 || error.message.includes('already exists')) {
      stats.skipped++;
      return { success: true, skipped: true };
    }

    // Retry logic
    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(`   ⚠️  Retry ${retryCount + 1}/${CONFIG.MAX_RETRIES} for ${property.listing_id}...`);
      await sleep(CONFIG.RETRY_DELAY);
      return enrichProperty(property, retryCount + 1);
    }

    // Failed after retries
    stats.failed++;
    stats.errors.push({
      listing_id: property.listing_id,
      state_id: property.state_id,
      error: error.message,
      response: error.response?.data
    });
    return { success: false, error: error.message };
  }
}

/**
 * Process a batch of properties
 */
async function processBatch(properties, batchNumber, totalBatches) {
  console.log(`\n🔄 Processing Batch ${batchNumber}/${totalBatches} (${properties.length} properties)`);

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];

    // Check daily limit
    if (stats.processedToday >= MAX_PROPERTIES_PER_DAY) {
      console.log('\n⚠️  Daily API limit reached!');
      return { limitReached: true };
    }

    process.stdout.write(`   [${i + 1}/${properties.length}] Enriching ${property.listing_id}... `);

    const result = await enrichProperty(property);
    stats.processedToday++;

    if (result.skipped) {
      process.stdout.write('⏭️  Skipped (already exists)\n');
    } else if (result.success) {
      process.stdout.write('✅ Done\n');
    } else {
      process.stdout.write(`❌ Failed: ${result.error}\n`);
    }
  }

  return { limitReached: false };
}

/**
 * Get properties to enrich, ordered by state
 */
async function getPropertiesToEnrich() {
  console.log('📋 Fetching properties to enrich...\n');

  // Get already enriched IDs
  const { data: enrichedData } = await supabase
    .from('census_demographics')
    .select('listing_id, state_id');

  const enrichedSet = new Set();
  if (enrichedData) {
    enrichedData.forEach(row => {
      enrichedSet.add(`${row.listing_id}-${row.state_id}`);
    });
  }

  console.log(`   Already enriched: ${enrichedSet.size.toLocaleString()}`);

  // Fetch all active properties with pagination
  let allProperties = [];
  let start = 0;
  const pageSize = 1000;

  while (true) {
    const { data: page, error } = await supabase
      .from('property_listings')
      .select('listing_id, state_id, state_code')
      .eq('active_inactive', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('state_id', 'is', null)
      .range(start, start + pageSize - 1);

    if (error) throw error;
    if (!page || page.length === 0) break;

    allProperties = allProperties.concat(page);
    start += pageSize;
    process.stdout.write(`\r   Fetched ${allProperties.length.toLocaleString()} properties...`);

    if (page.length < pageSize) break;
  }

  console.log(`\r   Fetched ${allProperties.length.toLocaleString()} total active properties.`);

  // Filter out already enriched
  const needsEnrichment = allProperties.filter(p =>
    !enrichedSet.has(`${p.listing_id}-${p.state_id}`)
  );

  console.log(`   Need enrichment: ${needsEnrichment.toLocaleString()}`);

  // Sort by state to optimize county caching
  needsEnrichment.sort((a, b) => {
    const stateA = a.state_code || a.state_id;
    const stateB = b.state_code || b.state_id;
    return stateA.localeCompare(stateB);
  });

  return needsEnrichment;
}

/**
 * Save error log
 */
async function saveErrorLog() {
  if (stats.errors.length === 0) return;

  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `census-errors-${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify(stats.errors, null, 2));
  console.log(`\n💾 Error log saved to: ${filename}`);
}

/**
 * Main enrichment process
 */
async function main() {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('🚀 CENSUS DATA BATCH ENRICHMENT');
  console.log('='.repeat(80));
  console.log(`Batch Size: ${CONFIG.BATCH_SIZE}`);
  console.log(`Delay Between Batches: ${CONFIG.DELAY_BETWEEN_BATCHES}ms`);
  console.log(`Daily Limit: ${MAX_PROPERTIES_PER_DAY.toLocaleString()} properties`);
  console.log(`Server: ${CONFIG.SERVER_URL}`);
  console.log('='.repeat(80) + '\n');

  // Check server is running
  try {
    await axios.get(`${CONFIG.SERVER_URL}/health`);
  } catch (error) {
    console.error('❌ Server is not running! Start it with: node server.js');
    process.exit(1);
  }

  // Get properties to enrich
  const properties = await getPropertiesToEnrich();
  stats.totalProperties = properties.length;

  if (properties.length === 0) {
    console.log('\n✅ All properties are already enriched!');
    process.exit(0);
  }

  console.log(`\n📦 Will process ${properties.length.toLocaleString()} properties`);

  // Split into batches
  const batches = [];
  for (let i = 0; i < properties.length; i += CONFIG.BATCH_SIZE) {
    batches.push(properties.slice(i, i + CONFIG.BATCH_SIZE));
  }

  console.log(`📦 Split into ${batches.length.toLocaleString()} batches\n`);

  // Process batches
  const totalBatches = batches.length;
  let limitReached = false;

  for (let i = 0; i < batches.length; i++) {
    const batchNumber = i + 1;

    // Process batch
    const result = await processBatch(batches[i], batchNumber, totalBatches);

    if (result.limitReached) {
      limitReached = true;
      break;
    }

    // Print progress every 10 batches
    if (batchNumber % 10 === 0) {
      printProgress();
    }

    // Delay before next batch (except last one)
    if (i < batches.length - 1 && !result.limitReached) {
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
    }
  }

  // Final progress report
  console.log('\n');
  printProgress();

  if (limitReached) {
    console.log('⚠️  Daily API limit reached!');
    console.log('   Run this script again tomorrow to continue enrichment.\n');
  } else {
    console.log('✅ All properties processed!\n');
  }

  // Save error log if there were failures
  await saveErrorLog();

  // Final summary
  console.log('='.repeat(80));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Processed: ${stats.processedToday.toLocaleString()}`);
  console.log(`  ✅ Successfully Enriched: ${stats.enriched.toLocaleString()}`);
  console.log(`  ⏭️  Skipped (already done): ${stats.skipped.toLocaleString()}`);
  console.log(`  ❌ Failed: ${stats.failed.toLocaleString()}`);
  console.log(`Total Runtime: ${formatDuration(Date.now() - stats.startTime)}`);
  console.log('='.repeat(80) + '\n');

  if (stats.failed > 0) {
    console.log(`⚠️  ${stats.failed} properties failed. Check error log for details.\n`);
  }

  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Shutting down gracefully...');
  printProgress();
  await saveErrorLog();
  process.exit(0);
});

// Run main process
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  saveErrorLog();
  process.exit(1);
});
