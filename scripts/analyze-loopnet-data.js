const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeLoopNetData() {
    console.log('🔍 Analyzing LoopNet Database...\n');

    // 1. Count total records
    const { count: totalListings, error: countError } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting records:', countError);
        return;
    }

    console.log(`📊 Total Records: ${totalListings}\n`);

    // 2. Get sample records to analyze structure
    const { data: sampleRecords, error: sampleError } = await supabase
        .from('property_details')
        .select('*')
        .limit(10);

    if (sampleError) {
        console.error('Error fetching sample records:', sampleError);
        return;
    }

    console.log('📋 Sample Record Analysis:\n');

    // 3. Analyze which columns are empty
    if (sampleRecords && sampleRecords.length > 0) {
        const firstRecord = sampleRecords[0];
        const columns = Object.keys(firstRecord);

        console.log('🔍 Column Fill Status:');
        console.log('─'.repeat(80));

        const emptyColumns = [];
        const filledColumns = [];

        for (const column of columns) {
            if (column === 'full_response' || column === 'raw_data') continue;

            const emptyCount = sampleRecords.filter(r => !r[column] || r[column] === null || r[column] === '').length;
            const fillRate = ((sampleRecords.length - emptyCount) / sampleRecords.length * 100).toFixed(1);

            if (fillRate < 50) {
                emptyColumns.push(column);
                console.log(`❌ ${column.padEnd(30)} ${fillRate}% filled`);
            } else {
                filledColumns.push(column);
                console.log(`✓  ${column.padEnd(30)} ${fillRate}% filled`);
            }
        }

        console.log('\n📊 Summary:');
        console.log(`  Mostly Empty Columns: ${emptyColumns.length}`);
        console.log(`  Mostly Filled Columns: ${filledColumns.length}`);

        // 4. Analyze full_response structure
        console.log('\n🔬 Analyzing full_response JSONB Structure:\n');

        const recordsWithData = sampleRecords.filter(r => r.full_response && Object.keys(r.full_response).length > 0);
        const recordsWithoutData = sampleRecords.filter(r => !r.full_response || Object.keys(r.full_response).length === 0);

        console.log(`  Records with API data: ${recordsWithData.length}/${sampleRecords.length}`);
        console.log(`  Records without API data: ${recordsWithoutData.length}/${sampleRecords.length}\n`);

        if (recordsWithData.length > 0) {
            console.log('📦 Available Fields in full_response:');
            console.log('─'.repeat(80));

            const fullResponse = recordsWithData[0].full_response;
            console.log(JSON.stringify(fullResponse, null, 2).substring(0, 2000) + '...\n');

            // Show top-level keys
            console.log('Top-level keys in full_response:');
            Object.keys(fullResponse).forEach(key => {
                console.log(`  - ${key}`);
            });
        }

        // 5. Check for records without useful data
        const { count: emptyRecords } = await supabase
            .from('property_details')
            .select('*', { count: 'exact', head: true })
            .or('full_response.is.null,raw_data.is.null');

        console.log('\n🧹 Data Quality:');
        console.log(`  Records potentially needing cleanup: ${emptyRecords || 0}`);

        // 6. Show specific examples of missing data
        console.log('\n📝 Empty Column Examples (columns that should be filled):');
        console.log('─'.repeat(80));

        const importantColumns = [
            'title', 'description', 'property_type', 'building_size',
            'lot_size', 'price', 'broker_name', 'listing_url'
        ];

        for (const col of importantColumns) {
            const { count: emptyCount } = await supabase
                .from('property_details')
                .select('*', { count: 'exact', head: true })
                .or(`${col}.is.null,${col}.eq.`);

            const fillRate = totalListings > 0 ? (((totalListings - (emptyCount || 0)) / totalListings) * 100).toFixed(1) : 0;
            const status = fillRate > 80 ? '✓' : fillRate > 50 ? '⚠️' : '❌';
            console.log(`${status} ${col.padEnd(20)} ${fillRate}% filled (${emptyCount || 0} empty)`);
        }
    }

    // 7. Sample records without data
    console.log('\n🔍 Sample Records Without API Data:');
    console.log('─'.repeat(80));

    const { data: emptyData, error: emptyError } = await supabase
        .from('property_details')
        .select('listing_id, state_id, fetch_status, full_response')
        .or('full_response.is.null')
        .limit(5);

    if (emptyData && emptyData.length > 0) {
        emptyData.forEach(record => {
            console.log(`  Listing: ${record.listing_id} (${record.state_id})`);
            console.log(`  Status: ${record.fetch_status}`);
            console.log(`  Has Data: ${record.full_response ? 'Yes' : 'No'}`);
            console.log('');
        });
    } else {
        console.log('  ✓ No records without data found!');
    }

    console.log('\n✅ Analysis Complete!\n');
}

analyzeLoopNetData().catch(console.error);
