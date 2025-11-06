const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugRecord(listingId) {
    const { data, error } = await supabase
        .from('property_details')
        .select('*')
        .eq('listing_id', listingId)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('\n📋 Record Debug Info:');
    console.log('Listing ID:', data.listing_id);
    console.log('State ID:', data.state_id);
    console.log('Current Title:', data.title);
    console.log('Current Property Type:', data.property_type);
    console.log('\n📦 Full Response Structure:');

    if (data.full_response) {
        const fr = data.full_response;

        console.log('\nTop-level keys:', Object.keys(fr));

        // Check for data array
        if (fr.data && Array.isArray(fr.data)) {
            console.log('\n✓ Has data array, length:', fr.data.length);
            if (fr.data[0]) {
                console.log('  data[0] keys:', Object.keys(fr.data[0]));
                console.log('  data[0].title:', fr.data[0].title);
                console.log('  data[0].saleSummary?.title:', fr.data[0].saleSummary?.title);
            }
        }

        // Check direct fields
        console.log('\nDirect fields:');
        console.log('  title:', fr.title);
        console.log('  saleSummary?.title:', fr.saleSummary?.title);

        console.log('\n\nFull Response Sample:');
        console.log(JSON.stringify(fr, null, 2).substring(0, 2000));
    }
}

const listingId = process.argv[2] || '11032884';
debugRecord(listingId).catch(console.error);
