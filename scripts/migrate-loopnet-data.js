const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Extract data from full_response and map to columns
function extractDataFromResponse(fullResponse) {
    if (!fullResponse || !fullResponse.data || fullResponse.data.length === 0) {
        return null;
    }

    const listing = fullResponse.data[0];

    return {
        // Basic Information
        title: listing.title || null,
        subtitle: listing.subtitle || null,
        description: listing.summary || listing.description || null,

        // Location Details
        street_address: listing.address || null,
        city: listing.city || null,
        state_code: listing.state || null,
        zip_code: listing.zipCode || listing.zip || null,
        country_code: listing.countryCode || 'US',

        // Property Characteristics
        property_type: listing.propertyType || listing.property_type || null,
        property_type_id: listing.propertyTypeId || listing.property_type_id || null,
        building_size: listing.buildingSize || listing.building_size || null,
        lot_size: listing.lotSize || listing.lot_size || null,
        year_built: listing.yearBuilt || listing.year_built || null,
        year_renovated: listing.yearRenovated || listing.year_renovated || null,
        number_of_units: listing.numberOfUnits || listing.number_of_units || null,
        parking_ratio: listing.parkingRatio || listing.parking_ratio || null,

        // Financial Information
        price: listing.price || listing.listPrice || null,
        price_per_sf: listing.pricePerSF || listing.price_per_sf || null,
        cap_rate: listing.capRate || listing.cap_rate || null,
        sale_type: listing.saleType || listing.sale_type || null,
        lease_rate: listing.leaseRate || listing.lease_rate || null,
        lease_type: listing.leaseType || listing.lease_type || null,
        available_space: listing.availableSpace || listing.available_space || null,

        // Broker & Listing Information
        broker_name: listing.broker?.name || null,
        broker_company: listing.broker?.company || null,
        listing_url: listing.url || listing.listingUrl || listing.listing_url || null,
        ad_package: listing.adPackage || listing.ad_package || null,
        listing_type: listing.listingType || listing.listing_type || null,
        sale_status_code: listing.saleStatusCode || listing.sale_status_code || null,

        // Images
        images_count: listing.carousel?.length || 0,
        primary_image_url: listing.carousel?.[0]?.url || listing.primaryImageUrl || null,

        // JSONB Fields
        sale_summary: listing.saleSummary || null,
        lease_summary: listing.leaseSummary || null,
        property_facts: listing.propertyFacts || null,
        carousel: listing.carousel || null,
        highlights: listing.highlights || null,
        amenities: listing.amenities || null,
        unit_mix_info: listing.unitMixInfo || null,
        units: listing.units || null,
        tenant: listing.tenant || null,
        broker_details: listing.broker || null,
        demographics: listing.demographics || null,
        transportation: listing.transportation || null,
        nearby_amenities: listing.nearbyAmenities || null,
        financial_summaries: listing.financialSummaries || null,
        portfolio_summary: listing.portfolioSummary || null,
        attachments: listing.attachments || null
    };
}

async function migrateData(batchSize = 100, maxRecords = null) {
    console.log('🚀 Starting LoopNet Data Migration...\n');

    // Get total count of records with full_response
    const { count: totalRecords } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .not('full_response', 'is', null);

    console.log(`📊 Total records with API data: ${totalRecords}\n`);

    const recordsToProcess = maxRecords || totalRecords;
    let processed = 0;
    let updated = 0;
    let errors = 0;

    console.log(`⚙️  Processing ${recordsToProcess} records in batches of ${batchSize}...\n`);

    // Process in batches
    for (let offset = 0; offset < recordsToProcess; offset += batchSize) {
        const { data: batch, error: fetchError } = await supabase
            .from('property_details')
            .select('listing_id, state_id, full_response')
            .not('full_response', 'is', null)
            .range(offset, offset + batchSize - 1);

        if (fetchError) {
            console.error(`❌ Error fetching batch at offset ${offset}:`, fetchError);
            errors += batchSize;
            continue;
        }

        if (!batch || batch.length === 0) {
            break;
        }

        // Update each record in the batch
        for (const record of batch) {
            try {
                const extractedData = extractDataFromResponse(record.full_response);

                if (extractedData) {
                    const { error: updateError } = await supabase
                        .from('property_details')
                        .update(extractedData)
                        .eq('listing_id', record.listing_id)
                        .eq('state_id', record.state_id);

                    if (updateError) {
                        console.error(`❌ Error updating ${record.listing_id}:`, updateError.message);
                        errors++;
                    } else {
                        updated++;
                    }
                }

                processed++;

                // Progress update every 100 records
                if (processed % 100 === 0) {
                    const progress = ((processed / recordsToProcess) * 100).toFixed(1);
                    console.log(`⏳ Progress: ${processed}/${recordsToProcess} (${progress}%) - Updated: ${updated}, Errors: ${errors}`);
                }

            } catch (error) {
                console.error(`❌ Error processing ${record.listing_id}:`, error.message);
                errors++;
                processed++;
            }
        }
    }

    console.log('\n✅ Migration Complete!\n');
    console.log('📊 Summary:');
    console.log(`  Total Processed: ${processed}`);
    console.log(`  Successfully Updated: ${updated}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Success Rate: ${((updated / processed) * 100).toFixed(1)}%\n`);
}

// Get command line arguments
const args = process.argv.slice(2);
const batchSize = parseInt(args[0]) || 100;
const maxRecords = args[1] ? parseInt(args[1]) : null;

if (args.includes('--help')) {
    console.log('Usage: node migrate-loopnet-data.js [batchSize] [maxRecords]');
    console.log('');
    console.log('  batchSize  - Number of records to process at once (default: 100)');
    console.log('  maxRecords - Maximum number of records to process (default: all)');
    console.log('');
    console.log('Examples:');
    console.log('  node migrate-loopnet-data.js           # Process all records, 100 at a time');
    console.log('  node migrate-loopnet-data.js 50        # Process all records, 50 at a time');
    console.log('  node migrate-loopnet-data.js 100 1000  # Process first 1000 records');
    process.exit(0);
}

migrateData(batchSize, maxRecords).catch(console.error);
