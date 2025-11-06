const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeCleanupCandidates() {
    console.log('🔍 Analyzing Records for Cleanup...\n');

    // 1. Records with error status and no data
    const { count: errorNoData } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .eq('fetch_status', 'error')
        .is('full_response', null);

    console.log(`❌ Error status + No full_response: ${errorNoData}`);

    // 2. Records with no full_response at all
    const { count: noFullResponse } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .is('full_response', null);

    console.log(`📭 No full_response data: ${noFullResponse}`);

    // 3. Records with empty full_response
    const { data: sampleEmpty } = await supabase
        .from('property_details')
        .select('listing_id, state_id, full_response')
        .not('full_response', 'is', null)
        .limit(100);

    let emptyResponseCount = 0;
    if (sampleEmpty) {
        emptyResponseCount = sampleEmpty.filter(r => {
            const fr = r.full_response;
            return !fr.data || fr.data.length === 0 || Object.keys(fr).length === 0;
        }).length;
    }

    console.log(`🗑️  Sample with empty full_response data: ${emptyResponseCount}/100\n`);

    // 4. Show sample records to be deleted
    console.log('📋 Sample Records to be Deleted:');
    console.log('─'.repeat(80));

    const { data: samples } = await supabase
        .from('property_details')
        .select('listing_id, state_id, fetch_status, fetch_error, full_response')
        .is('full_response', null)
        .limit(10);

    if (samples) {
        samples.forEach(record => {
            console.log(`  ${record.listing_id} (${record.state_id})`);
            console.log(`    Status: ${record.fetch_status}`);
            console.log(`    Error: ${record.fetch_error?.substring(0, 100) || 'N/A'}`);
            console.log('');
        });
    }

    console.log(`\n💡 Total records that can be safely deleted: ${noFullResponse || 0}\n`);

    return noFullResponse || 0;
}

async function cleanupInvalidRecords(dryRun = true) {
    console.log('🧹 Starting LoopNet Data Cleanup...\n');

    if (dryRun) {
        console.log('⚠️  DRY RUN MODE - No data will be deleted\n');
    } else {
        console.log('🔴 LIVE MODE - Records will be permanently deleted!\n');
    }

    // Analyze first
    const totalToDelete = await analyzeCleanupCandidates();

    if (totalToDelete === 0) {
        console.log('✅ No records to clean up!');
        return;
    }

    if (!dryRun) {
        console.log(`\n⚠️  About to delete ${totalToDelete} records...`);
        console.log('⏳ Starting deletion in 5 seconds...');
        console.log('   Press Ctrl+C to cancel\n');

        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🗑️  Deleting records with no API data...\n');

        // Delete records with no full_response
        const { error: deleteError, count: deletedCount } = await supabase
            .from('property_details')
            .delete({ count: 'exact' })
            .is('full_response', null);

        if (deleteError) {
            console.error('❌ Error during deletion:', deleteError);
            return;
        }

        console.log(`\n✅ Cleanup Complete!`);
        console.log(`   Deleted ${deletedCount} records\n`);

        // Show new totals
        const { count: remainingRecords } = await supabase
            .from('property_details')
            .select('*', { count: 'exact', head: true });

        console.log('📊 After Cleanup:');
        console.log(`   Total records remaining: ${remainingRecords}`);
        console.log(`   Records with valid data: ${remainingRecords}\n`);
    } else {
        console.log(`\n💡 Dry run complete. To actually delete records, run:`);
        console.log(`   node cleanup-loopnet-data.js --execute\n`);
    }
}

// Get command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

if (args.includes('--help')) {
    console.log('Usage: node cleanup-loopnet-data.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --execute  Actually delete the records (default is dry run)');
    console.log('  --help     Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node cleanup-loopnet-data.js            # Dry run (analyze only)');
    console.log('  node cleanup-loopnet-data.js --execute  # Actually delete records');
    console.log('');
    console.log('What gets deleted:');
    console.log('  - Records with fetch_status = "error" and no full_response data');
    console.log('  - Records with empty or null full_response');
    console.log('');
    process.exit(0);
}

cleanupInvalidRecords(dryRun).catch(console.error);
