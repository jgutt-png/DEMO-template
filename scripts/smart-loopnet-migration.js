#!/usr/bin/env node

/**
 * Smart LoopNet Data Migration Script
 *
 * Intelligently extracts data from full_response JSONB and populates structured columns
 * with comprehensive fallback logic, validation, and error handling.
 *
 * Features:
 * - Handles two data structure patterns (wrapped and direct)
 * - Multiple fallback paths for each field
 * - Data validation and cleaning
 * - Detailed progress tracking
 * - Dry-run mode for testing
 * - Error logging and recovery
 * - Incremental processing
 *
 * Usage:
 *   node smart-loopnet-migration.js [options]
 *
 * Options:
 *   --batch-size <n>     Number of records per batch (default: 500)
 *   --limit <n>          Maximum records to process (default: all)
 *   --offset <n>         Starting offset (default: 0)
 *   --dry-run            Test without updating database
 *   --verbose            Show detailed logging
 *   --help               Show this help message
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration from command line arguments
const args = parseArgs(process.argv.slice(2));
const config = {
    batchSize: args['batch-size'] || 500,
    limit: args['limit'] || null,
    offset: args['offset'] || 0,
    dryRun: args['dry-run'] || false,
    verbose: args['verbose'] || false
};

// Statistics tracking
const stats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    warnings: [],
    errors: [],
    startTime: Date.now()
};

// Field extraction statistics
const fieldStats = {
    title: { found: 0, missing: 0 },
    address: { found: 0, missing: 0 },
    property_type: { found: 0, missing: 0 },
    price: { found: 0, missing: 0 },
    broker_name: { found: 0, missing: 0 }
};

/**
 * Main migration function
 */
async function migrateLoopNetData() {
    console.log('🚀 Smart LoopNet Data Migration\n');
    console.log('='.repeat(80));

    if (config.dryRun) {
        console.log('⚠️  DRY RUN MODE - No data will be updated\n');
    }

    console.log('Configuration:');
    console.log(`  Batch Size: ${config.batchSize}`);
    console.log(`  Limit: ${config.limit || 'All records'}`);
    console.log(`  Offset: ${config.offset}`);
    console.log(`  Verbose: ${config.verbose ? 'Yes' : 'No'}`);
    console.log('\n' + '='.repeat(80) + '\n');

    try {
        // Get total count
        const { count: totalRecords, error: countError } = await supabase
            .from('property_details')
            .select('*', { count: 'exact', head: true })
            .not('full_response', 'is', null);

        if (countError) {
            throw new Error(`Failed to count records: ${countError.message}`);
        }

        stats.total = config.limit ? Math.min(config.limit, totalRecords) : totalRecords;

        console.log(`📊 Total records to process: ${stats.total.toLocaleString()}`);
        console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);

        // Process in batches
        let currentOffset = config.offset;

        while (currentOffset < stats.total) {
            const batchEnd = Math.min(currentOffset + config.batchSize, stats.total);

            await processBatch(currentOffset, batchEnd);

            currentOffset = batchEnd;

            // Progress report
            printProgress();
        }

        // Final summary
        printFinalSummary();

        // Save detailed log
        saveLogFile();

    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * Process a single batch of records
 */
async function processBatch(startOffset, endOffset) {
    const batchSize = endOffset - startOffset;

    if (config.verbose) {
        console.log(`\n📦 Processing batch: ${startOffset} to ${endOffset}`);
    }

    // Fetch batch
    const { data: batch, error: fetchError } = await supabase
        .from('property_details')
        .select('listing_id, state_id, full_response, title, property_type')
        .not('full_response', 'is', null)
        .range(startOffset, endOffset - 1);

    if (fetchError) {
        const errorMsg = `Batch fetch failed (${startOffset}-${endOffset}): ${fetchError.message}`;
        console.error(`\n❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        stats.errors += batchSize;
        stats.processed += batchSize;
        return;
    }

    if (!batch || batch.length === 0) {
        if (config.verbose) {
            console.log('   No records in batch');
        }
        return;
    }

    // Process each record
    for (const record of batch) {
        await processRecord(record);
    }
}

/**
 * Process a single record
 */
async function processRecord(record) {
    try {
        // Extract data using smart extraction logic
        const extractedData = extractDataFromResponse(record.full_response, record);

        if (!extractedData) {
            stats.skipped++;
            stats.processed++;

            if (config.verbose) {
                console.log(`   ⚠️  Skipped ${record.listing_id}: No extractable data`);
            }

            return;
        }

        // Validate extracted data
        const validation = validateExtractedData(extractedData);

        if (validation.warnings.length > 0 && config.verbose) {
            validation.warnings.forEach(warning => {
                console.log(`   ⚠️  ${record.listing_id}: ${warning}`);
            });
        }

        // Update database (unless dry run)
        if (!config.dryRun) {
            const { error: updateError } = await supabase
                .from('property_details')
                .update(extractedData)
                .eq('listing_id', record.listing_id)
                .eq('state_id', record.state_id);

            if (updateError) {
                const errorMsg = `Update failed for ${record.listing_id}: ${updateError.message}`;
                stats.errors.push(errorMsg);
                stats.errors++;

                if (config.verbose) {
                    console.error(`   ❌ ${errorMsg}`);
                }
            } else {
                stats.updated++;

                if (config.verbose) {
                    console.log(`   ✓ Updated ${record.listing_id}`);
                }
            }
        } else {
            stats.updated++; // Count as updated in dry run

            if (config.verbose) {
                console.log(`   ✓ Would update ${record.listing_id}`);
            }
        }

        stats.processed++;

    } catch (error) {
        const errorMsg = `Processing error for ${record.listing_id}: ${error.message}`;
        stats.errors.push(errorMsg);
        stats.errors++;
        stats.processed++;

        if (config.verbose) {
            console.error(`   ❌ ${errorMsg}`);
        }
    }
}

/**
 * Smart data extraction with fallback logic
 */
function extractDataFromResponse(fullResponse, record) {
    if (!fullResponse || typeof fullResponse !== 'object') {
        return null;
    }

    // Handle both wrapped (data array) and direct response patterns
    const listing = fullResponse.data?.[0] || fullResponse;

    // If still no valid data, return null
    if (!listing || typeof listing !== 'object') {
        return null;
    }

    // Extract nested objects once for reuse
    const saleSummary = listing.saleSummary || {};
    const leaseSummary = listing.leaseSummary || {};
    const propertyFacts = listing.propertyFacts || {};
    const broker = listing.broker || {};
    const brokersDetails = Array.isArray(listing.brokersDetails) ? listing.brokersDetails : [];

    // Parse location for city/state
    const locationData = parseLocation(listing.location, brokersDetails[0]);

    // Build extracted data object
    const extracted = {
        // Basic Information
        title: cleanString(listing.title || saleSummary.title || leaseSummary.title),
        subtitle: cleanString(listing.subtitle),
        description: cleanDescription(listing.description || listing.summary),

        // Location Details
        street_address: cleanString(listing.address),
        city: locationData.city || cleanString(brokersDetails[0]?.city),
        state_code: locationData.state || cleanString(brokersDetails[0]?.sc),
        zip_code: extractZipCode(listing.address, saleSummary),
        country_code: cleanString(listing.countryCode || 'US').toUpperCase(),

        // Property Characteristics
        property_type: cleanString(saleSummary.propertyType || propertyFacts.propertyType),
        property_type_id: parseInteger(saleSummary.propertyTypeId),
        building_size: cleanString(saleSummary.buildingSize || propertyFacts.buildingSize),
        lot_size: cleanString(saleSummary.lotSize || leaseSummary.lotSize || propertyFacts.landAcres),
        year_built: parseYear(saleSummary.yearBuilt || propertyFacts.yearBuilt),
        year_renovated: parseYear(saleSummary.yearRenovated),
        number_of_units: parseInteger(saleSummary.numberOfUnits),
        parking_ratio: cleanString(saleSummary.parkingRatio || leaseSummary.parkingRatio),

        // Financial Information
        price: cleanString(saleSummary.price || propertyFacts.price || saleSummary.lots?.[0]?.price),
        price_per_sf: cleanString(saleSummary.pricePerSquareFoot || propertyFacts.pricePerSF),
        cap_rate: cleanString(saleSummary.capRate || propertyFacts.capRate),
        sale_type: cleanString(saleSummary.saleType || propertyFacts.saleType),
        lease_rate: cleanString(leaseSummary.rentalRate || leaseSummary.leaseRate),
        lease_type: cleanString(leaseSummary.leaseType),
        available_space: cleanString(leaseSummary.totalSpaceAvailable),

        // Broker & Listing Information
        broker_name: cleanString(broker.name || brokersDetails[0]?.name),
        broker_company: cleanString(broker.company || brokersDetails[0]?.company),
        listing_url: buildListingUrl(listing.listingUrl, listing.ownerUrl, listing.listingId, record.listing_id),
        ad_package: cleanString(listing.adPackage),
        listing_type: cleanString(listing.listingType),
        sale_status_code: parseInteger(saleSummary.saleStatusCode),

        // Images
        images_count: Array.isArray(listing.carousel) ? listing.carousel.length : 0,
        primary_image_url: listing.carousel?.[0]?.url || listing.primaryImageUrl || null,

        // JSONB Fields (store complete objects, filtered)
        sale_summary: cleanJsonbObject(saleSummary),
        lease_summary: cleanJsonbObject(leaseSummary),
        property_facts: cleanJsonbObject(propertyFacts),
        carousel: cleanJsonbArray(listing.carousel),
        highlights: cleanJsonbArray(listing.highlights),
        amenities: cleanJsonbObject(listing.amenities),
        unit_mix_info: cleanJsonbObject(listing.unitMixInfo),
        units: cleanJsonbArray(listing.units),
        tenant: cleanJsonbObject(listing.tenant),
        broker_details: cleanJsonbObject(brokersDetails.length > 0 ? brokersDetails : broker),
        demographics: cleanJsonbObject(listing.demographics),
        transportation: cleanJsonbArray(listing.transportation),
        nearby_amenities: cleanJsonbObject(listing.nearbyAmenities),
        financial_summaries: cleanJsonbObject(listing.finAndTaxSummaries),
        portfolio_summary: cleanJsonbObject(listing.portfolioSummary),
        attachments: cleanJsonbArray(listing.attachments)
    };

    // Update field statistics
    updateFieldStats(extracted);

    return extracted;
}

/**
 * Parse location string for city and state
 */
function parseLocation(locationString, brokerInfo) {
    if (!locationString || typeof locationString !== 'string') {
        return { city: null, state: null };
    }

    // Pattern: "in City, ST" or "City, ST"
    const match = locationString.match(/(?:in\s+)?([^,]+),\s*([A-Z]{2})\b/i);

    if (match) {
        return {
            city: match[1].trim(),
            state: match[2].toUpperCase()
        };
    }

    return { city: null, state: null };
}

/**
 * Extract zip code from various sources
 */
function extractZipCode(address, saleSummary) {
    // Try saleSummary first
    if (saleSummary?.zipCode) return cleanString(saleSummary.zipCode);
    if (saleSummary?.zip) return cleanString(saleSummary.zip);

    // Try extracting from address
    if (address && typeof address === 'string') {
        const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
        if (match) return match[1];
    }

    return null;
}

/**
 * Build LoopNet listing URL
 */
function buildListingUrl(listingUrl, ownerUrl, apiListingId, dbListingId) {
    if (listingUrl) return cleanString(listingUrl);
    if (ownerUrl) return cleanString(ownerUrl);

    const listingId = apiListingId || dbListingId;
    if (listingId) {
        return `https://www.loopnet.com/Listing/${listingId}/`;
    }

    return null;
}

/**
 * Validation functions
 */
function validateExtractedData(data) {
    const warnings = [];

    // Check critical fields
    if (!data.title) {
        warnings.push('Missing title');
    }

    if (!data.property_type) {
        warnings.push('Missing property type');
    }

    if (!data.street_address && !data.city) {
        warnings.push('Missing location information');
    }

    if (!data.price && !data.lease_rate) {
        warnings.push('Missing financial information');
    }

    if (!data.broker_name) {
        warnings.push('Missing broker name');
    }

    return { warnings };
}

/**
 * Data cleaning functions
 */
function cleanString(value) {
    if (!value || value === '') return null;
    if (typeof value !== 'string') return String(value);

    const cleaned = value.trim();
    return cleaned === '' ? null : cleaned;
}

function cleanDescription(text) {
    if (!text || typeof text !== 'string') return null;

    return text
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
        .trim() || null;
}

function parseInteger(value) {
    if (value === null || value === undefined || value === '') return null;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
}

function parseYear(value) {
    const year = parseInteger(value);

    // Validate year range
    if (year && (year < 1800 || year > 2100)) {
        return null;
    }

    return year;
}

function cleanJsonbObject(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // If array, check length
    if (Array.isArray(obj)) {
        return obj.length > 0 ? obj : null;
    }

    // Check if object has any non-null values
    const values = Object.values(obj);
    const hasValue = values.some(v => {
        if (v === null || v === undefined || v === '') return false;
        if (typeof v === 'object' && Object.keys(v).length === 0) return false;
        return true;
    });

    return hasValue ? obj : null;
}

function cleanJsonbArray(arr) {
    if (!Array.isArray(arr)) return null;
    return arr.length > 0 ? arr : null;
}

/**
 * Update field statistics
 */
function updateFieldStats(data) {
    Object.keys(fieldStats).forEach(field => {
        if (data[field]) {
            fieldStats[field].found++;
        } else {
            fieldStats[field].missing++;
        }
    });
}

/**
 * Progress reporting
 */
function printProgress() {
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = stats.processed / elapsed;
    const remaining = stats.total - stats.processed;
    const eta = remaining / rate;

    const percentage = ((stats.processed / stats.total) * 100).toFixed(1);

    console.log(`\n⏳ Progress: ${stats.processed.toLocaleString()}/${stats.total.toLocaleString()} (${percentage}%)`);
    console.log(`   Updated: ${stats.updated.toLocaleString()} | Skipped: ${stats.skipped.toLocaleString()} | Errors: ${stats.errors}`);
    console.log(`   Rate: ${rate.toFixed(1)} records/sec | ETA: ${formatTime(eta)}`);
}

/**
 * Final summary report
 */
function printFinalSummary() {
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const successRate = ((stats.updated / stats.processed) * 100).toFixed(1);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration Complete!\n');
    console.log('📊 Final Statistics:');
    console.log(`   Total Processed: ${stats.processed.toLocaleString()}`);
    console.log(`   Successfully Updated: ${stats.updated.toLocaleString()}`);
    console.log(`   Skipped: ${stats.skipped.toLocaleString()}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Success Rate: ${successRate}%`);
    console.log(`   Total Time: ${formatTime(elapsed)}`);
    console.log(`   Average Rate: ${(stats.processed / elapsed).toFixed(1)} records/sec`);

    console.log('\n📈 Field Extraction Rates:');
    Object.entries(fieldStats).forEach(([field, counts]) => {
        const total = counts.found + counts.missing;
        const rate = total > 0 ? ((counts.found / total) * 100).toFixed(1) : 0;
        const icon = rate > 80 ? '✓' : rate > 50 ? '⚠️' : '❌';
        console.log(`   ${icon} ${field.padEnd(20)} ${rate}% (${counts.found}/${total})`);
    });

    if (stats.errors > 0) {
        console.log(`\n⚠️  ${stats.errors} errors occurred. See log file for details.`);
    }

    console.log('\n' + '='.repeat(80));
}

/**
 * Save detailed log file
 */
function saveLogFile() {
    const logData = {
        timestamp: new Date().toISOString(),
        config: config,
        statistics: stats,
        fieldStats: fieldStats,
        duration: (Date.now() - stats.startTime) / 1000
    };

    const logFilename = `migration-log-${Date.now()}.json`;
    const logPath = `/Users/default/property-dashboard/scripts/logs/${logFilename}`;

    // Ensure logs directory exists
    const logsDir = '/Users/default/property-dashboard/scripts/logs';
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    console.log(`\n💾 Detailed log saved to: ${logPath}`);
}

/**
 * Utility functions
 */
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(0)}s`;
    } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    }
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].substring(2);

            // Boolean flags
            if (key === 'dry-run' || key === 'verbose' || key === 'help') {
                args[key] = true;
            }
            // Value arguments
            else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
                args[key] = argv[i + 1];
                i++; // Skip next
            }
        }
    }
    return args;
}

function showHelp() {
    console.log(`
Smart LoopNet Data Migration Script

Usage:
  node smart-loopnet-migration.js [options]

Options:
  --batch-size <n>     Number of records per batch (default: 500)
  --limit <n>          Maximum records to process (default: all)
  --offset <n>         Starting offset (default: 0)
  --dry-run            Test without updating database
  --verbose            Show detailed logging
  --help               Show this help message

Examples:
  # Test on 100 records without updating
  node smart-loopnet-migration.js --limit 100 --dry-run

  # Process all records with verbose logging
  node smart-loopnet-migration.js --verbose

  # Process in small batches starting from offset 5000
  node smart-loopnet-migration.js --batch-size 100 --offset 5000

  # Process first 10,000 records
  node smart-loopnet-migration.js --limit 10000
`);
}

/**
 * Entry point
 */
if (args['help']) {
    showHelp();
    process.exit(0);
}

migrateLoopNetData().catch(error => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
});
