const { supabase } = require('./supabase-config');

async function checkGeoData() {
    console.log('Checking geospatial data quality...\n');
    
    // 1. Check coordinate data quality in property_listings
    const { data: coordStats, error: coordError } = await supabase
        .from('property_listings')
        .select('listing_id, state_id, latitude, longitude, state_code')
        .limit(1000);
    
    if (coordError) {
        console.error('Error fetching data:', coordError);
        return;
    }
    
    const total = coordStats.length;
    const withCoords = coordStats.filter(p => p.latitude && p.longitude).length;
    const withoutCoords = total - withCoords;
    
    console.log('Property Listings Coordinate Quality:');
    console.log('- Total properties sampled:', total);
    console.log('- With valid coordinates:', withCoords, `(${(withCoords/total*100).toFixed(1)}%)`);
    console.log('- Missing coordinates:', withoutCoords, `(${(withoutCoords/total*100).toFixed(1)}%)`);

    // 2. Get state distribution
    const { data: stateStats } = await supabase
        .from('property_listings')
        .select('state_code')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
    
    const stateCounts = {};
    stateStats?.forEach(p => {
        stateCounts[p.state_code] = (stateCounts[p.state_code] || 0) + 1;
    });
    
    console.log('\nTop States by Property Count:');
    Object.entries(stateCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([state, count]) => {
            console.log(`  ${state}: ${count}`);
        });

    // 3. Get bounding box of all properties
    if (withCoords > 0) {
        const validCoords = coordStats.filter(p => p.latitude && p.longitude);
        const lats = validCoords.map(p => parseFloat(p.latitude));
        const lngs = validCoords.map(p => parseFloat(p.longitude));
        
        console.log('\nGeographic Bounding Box:');
        console.log('- North:', Math.max(...lats).toFixed(4));
        console.log('- South:', Math.min(...lats).toFixed(4));
        console.log('- East:', Math.max(...lngs).toFixed(4));
        console.log('- West:', Math.min(...lngs).toFixed(4));
        console.log('- Center:', 
            ((Math.max(...lats) + Math.min(...lats)) / 2).toFixed(4), ',',
            ((Math.max(...lngs) + Math.min(...lngs)) / 2).toFixed(4)
        );
    }

    // 4. Check property_details table
    const { count: detailsCount } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .not('title', 'is', null);
    
    console.log('\nProperty Details:');
    console.log('- Complete listings:', detailsCount);

    // 5. Sample some coordinates to verify data quality
    console.log('\nSample Coordinates (first 5):');
    coordStats.slice(0, 5).forEach(p => {
        console.log(`  ${p.state_code}: [${p.latitude}, ${p.longitude}]`);
    });
}

checkGeoData().catch(console.error).finally(() => process.exit(0));
