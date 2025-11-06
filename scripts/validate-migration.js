#!/usr/bin/env node

/**
 * Migration Validation Script
 *
 * Validates the results of the LoopNet data migration by checking:
 * - Fill rates for all columns
 * - Data quality issues
 * - Comparison before/after migration
 * - Identification of problem records
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function validateMigration() {
    console.log('🔍 Migration Validation Report\n');
    console.log('='.repeat(80));

    // 1. Get total counts
    const { count: totalRecords } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true });

    const { count: recordsWithData } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .not('full_response', 'is', null);

    console.log('\n📊 Overall Statistics:');
    console.log(`   Total Records: ${totalRecords?.toLocaleString()}`);
    console.log(`   Records with API Data: ${recordsWithData?.toLocaleString()}`);
    console.log(`   Records without Data: ${(totalRecords - recordsWithData)?.toLocaleString()}`);

    // 2. Field fill rates
    console.log('\n\n📋 Column Fill Rates:');
    console.log('-'.repeat(80));

    const fields = [
        // Basic
        'title', 'subtitle', 'description',
        // Location
        'street_address', 'city', 'state_code', 'zip_code', 'country_code',
        // Property
        'property_type', 'property_type_id', 'building_size', 'lot_size',
        'year_built', 'year_renovated', 'number_of_units', 'parking_ratio',
        // Financial
        'price', 'price_per_sf', 'cap_rate', 'sale_type',
        'lease_rate', 'lease_type', 'available_space',
        // Broker
        'broker_name', 'broker_company', 'listing_url', 'listing_type', 'sale_status_code',
        // Images
        'images_count', 'primary_image_url',
        // JSONB
        'sale_summary', 'lease_summary', 'property_facts', 'carousel',
        'highlights', 'amenities', 'broker_details', 'attachments'
    ];

    const fillRates = [];

    for (const field of fields) {
        const { count: filledCount } = await supabase
            .from('property_details')
            .select('*', { count: 'exact', head: true })
            .not('full_response', 'is', null)
            .not(field, 'is', null)
            .neq(field, '');

        const fillRate = recordsWithData > 0 ? ((filledCount / recordsWithData) * 100).toFixed(1) : 0;
        const emptyCount = recordsWithData - filledCount;

        fillRates.push({ field, filled: filledCount, empty: emptyCount, rate: parseFloat(fillRate) });

        const icon = fillRate > 80 ? '✓' :
                     fillRate > 50 ? '⚠️' :
                     fillRate > 20 ? '❌' : '💀';

        console.log(`${icon} ${field.padEnd(25)} ${fillRate.toString().padStart(5)}% (${filledCount?.toLocaleString()}/${recordsWithData?.toLocaleString()})`);
    }

    // 3. Critical field analysis
    console.log('\n\n🎯 Critical Field Analysis:');
    console.log('-'.repeat(80));

    const criticalFields = ['title', 'property_type', 'street_address', 'price', 'broker_name'];
    const criticalStats = fillRates.filter(f => criticalFields.includes(f.field));

    criticalStats.forEach(stat => {
        const status = stat.rate > 80 ? 'GOOD' :
                       stat.rate > 50 ? 'FAIR' :
                       stat.rate > 20 ? 'POOR' : 'CRITICAL';

        console.log(`   ${stat.field.padEnd(20)} ${status.padStart(8)} - ${stat.rate}% filled`);
    });

    // 4. Find problem records
    console.log('\n\n🔎 Problem Records:');
    console.log('-'.repeat(80));

    // Records with data but no title
    const { count: noTitle } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .not('full_response', 'is', null)
        .is('title', null);

    // Records with data but no property type
    const { count: noPropertyType } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .not('full_response', 'is', null)
        .is('property_type', null);

    // Records with data but no location
    const { count: noLocation } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .not('full_response', 'is', null)
        .is('street_address', null)
        .is('city', null);

    // Records with data but no price or lease info
    const { count: noFinancial } = await supabase
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .not('full_response', 'is', null)
        .is('price', null)
        .is('lease_rate', null);

    console.log(`   Missing Title: ${noTitle?.toLocaleString()}`);
    console.log(`   Missing Property Type: ${noPropertyType?.toLocaleString()}`);
    console.log(`   Missing Location: ${noLocation?.toLocaleString()}`);
    console.log(`   Missing Financial Info: ${noFinancial?.toLocaleString()}`);

    // 5. Sample problem records
    if (noTitle > 0) {
        console.log('\n\n📝 Sample Records Missing Title:');
        console.log('-'.repeat(80));

        const { data: samples } = await supabase
            .from('property_details')
            .select('listing_id, state_id, property_type, city, full_response')
            .not('full_response', 'is', null)
            .is('title', null)
            .limit(5);

        samples?.forEach(record => {
            console.log(`   ${record.listing_id} (${record.state_id})`);
            console.log(`      Type: ${record.property_type || 'N/A'}`);
            console.log(`      City: ${record.city || 'N/A'}`);
            console.log(`      Has full_response: ${record.full_response ? 'Yes' : 'No'}`);

            // Check structure
            const hasDataArray = record.full_response?.data ? 'Yes' : 'No';
            const hasDirectTitle = record.full_response?.title ? 'Yes' : 'No';
            console.log(`      Has data array: ${hasDataArray}`);
            console.log(`      Has direct title: ${hasDirectTitle}`);
            console.log('');
        });
    }

    // 6. Data structure analysis
    console.log('\n📦 Data Structure Analysis:');
    console.log('-'.repeat(80));

    const { data: structureSamples } = await supabase
        .from('property_details')
        .select('full_response')
        .not('full_response', 'is', null)
        .limit(100);

    let wrappedCount = 0;
    let directCount = 0;

    structureSamples?.forEach(record => {
        if (record.full_response?.data && Array.isArray(record.full_response.data)) {
            wrappedCount++;
        } else if (record.full_response?.title || record.full_response?.saleSummary) {
            directCount++;
        }
    });

    console.log(`   Wrapped Response (data array): ${wrappedCount}/100`);
    console.log(`   Direct Response: ${directCount}/100`);

    // 7. Quality scores
    console.log('\n\n⭐ Data Quality Scores:');
    console.log('-'.repeat(80));

    const overallScore = criticalStats.reduce((sum, stat) => sum + stat.rate, 0) / criticalStats.length;

    console.log(`   Overall Quality: ${overallScore.toFixed(1)}%`);

    const grade = overallScore > 90 ? 'A (Excellent)' :
                  overallScore > 80 ? 'B (Good)' :
                  overallScore > 70 ? 'C (Fair)' :
                  overallScore > 60 ? 'D (Poor)' : 'F (Critical Issues)';

    console.log(`   Quality Grade: ${grade}`);

    // Recommendations
    console.log('\n\n💡 Recommendations:');
    console.log('-'.repeat(80));

    const recommendations = [];

    if (noTitle > recordsWithData * 0.1) {
        recommendations.push('⚠️  High number of records missing titles - investigate extraction logic');
    }

    if (noPropertyType > recordsWithData * 0.1) {
        recommendations.push('⚠️  High number of records missing property type - critical field');
    }

    if (noLocation > recordsWithData * 0.2) {
        recommendations.push('⚠️  Many records missing location data - improve city/state parsing');
    }

    if (noFinancial > recordsWithData * 0.3) {
        recommendations.push('⚠️  Many records missing financial info - check sale/lease summary extraction');
    }

    const lowFillFields = fillRates.filter(f => f.rate < 30 && !['year_renovated', 'number_of_units'].includes(f.field));
    if (lowFillFields.length > 0) {
        recommendations.push(`⚠️  ${lowFillFields.length} fields have < 30% fill rate - consider additional fallback paths`);
    }

    if (recommendations.length === 0) {
        console.log('   ✓ No major issues detected - migration appears successful!');
    } else {
        recommendations.forEach(rec => console.log(`   ${rec}`));
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Validation Complete!\n');
}

validateMigration().catch(error => {
    console.error('❌ Validation error:', error);
    process.exit(1);
});
