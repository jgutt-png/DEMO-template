const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://your_supabase_project_ref_here.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Recursive function to analyze nested structure
function analyzeStructure(obj, path = '', depth = 0, maxDepth = 5) {
    const results = [];

    if (!obj || depth >= maxDepth) return results;

    const indent = '  '.repeat(depth);

    if (Array.isArray(obj)) {
        results.push(`${indent}${path} [ARRAY] (${obj.length} items)`);
        if (obj.length > 0) {
            const sample = obj[0];
            results.push(...analyzeStructure(sample, `${path}[0]`, depth + 1, maxDepth));
        }
    } else if (typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const newPath = path ? `${path}.${key}` : key;

            if (value === null || value === undefined) {
                results.push(`${indent}${newPath}: null`);
            } else if (Array.isArray(value)) {
                results.push(`${indent}${newPath}: [ARRAY] (${value.length} items)`);
                if (value.length > 0) {
                    results.push(...analyzeStructure(value[0], `${newPath}[0]`, depth + 1, maxDepth));
                }
            } else if (typeof value === 'object') {
                results.push(`${indent}${newPath}: {OBJECT}`);
                results.push(...analyzeStructure(value, newPath, depth + 1, maxDepth));
            } else {
                const valuePreview = typeof value === 'string' && value.length > 50
                    ? `"${value.substring(0, 50)}..."`
                    : JSON.stringify(value);
                results.push(`${indent}${newPath}: ${typeof value} = ${valuePreview}`);
            }
        });
    }

    return results;
}

// Function to find all paths to a specific field name
function findFieldPaths(obj, targetField, currentPath = '', paths = []) {
    if (!obj || typeof obj !== 'object') return paths;

    Object.keys(obj).forEach(key => {
        const value = obj[key];
        const newPath = currentPath ? `${currentPath}.${key}` : key;

        if (key === targetField) {
            paths.push({
                path: newPath,
                type: Array.isArray(value) ? 'array' : typeof value,
                value: Array.isArray(value) ? `[${value.length} items]` : value
            });
        }

        if (typeof value === 'object' && value !== null) {
            findFieldPaths(value, targetField, newPath, paths);
        }

        if (Array.isArray(value) && value.length > 0) {
            findFieldPaths(value[0], targetField, `${newPath}[0]`, paths);
        }
    });

    return paths;
}

async function analyzeFullResponseStructure() {
    console.log('🔍 Deep Analysis of full_response JSONB Structure\n');
    console.log('='.repeat(80) + '\n');

    // Get 20 sample records with full_response data
    const { data: samples, error } = await supabase
        .from('property_details')
        .select('listing_id, state_id, property_type, full_response')
        .not('full_response', 'is', null)
        .limit(20);

    if (error) {
        console.error('Error fetching samples:', error);
        return;
    }

    console.log(`📊 Analyzing ${samples.length} sample records with full_response data\n`);

    // Analyze first record in detail
    console.log('📦 DETAILED STRUCTURE ANALYSIS (First Record)\n');
    console.log('-'.repeat(80));

    const firstRecord = samples[0];
    console.log(`Listing: ${firstRecord.listing_id}`);
    console.log(`Property Type: ${firstRecord.property_type || 'N/A'}\n`);

    const structure = analyzeStructure(firstRecord.full_response);
    structure.forEach(line => console.log(line));

    // Save complete sample to file
    console.log('\n💾 Saving complete sample to file...');
    fs.writeFileSync(
        '/Users/default/property-dashboard/scripts/sample-full-response.json',
        JSON.stringify(firstRecord.full_response, null, 2)
    );
    console.log('   Saved to: scripts/sample-full-response.json\n');

    // Analyze field variations across all samples
    console.log('\n📊 FIELD VARIATION ANALYSIS\n');
    console.log('-'.repeat(80));

    const fieldPaths = new Map();
    const importantFields = [
        'title', 'subtitle', 'summary', 'description',
        'address', 'city', 'state', 'zipCode', 'zip',
        'propertyType', 'property_type', 'buildingSize', 'building_size',
        'lotSize', 'lot_size', 'yearBuilt', 'year_built',
        'price', 'listPrice', 'pricePerSF', 'capRate',
        'broker', 'brokerName', 'brokerCompany',
        'carousel', 'images', 'primaryImage',
        'highlights', 'amenities', 'propertyFacts',
        'saleSummary', 'leaseSummary', 'units', 'tenant'
    ];

    samples.forEach((record, index) => {
        importantFields.forEach(field => {
            const paths = findFieldPaths(record.full_response, field);
            if (paths.length > 0) {
                if (!fieldPaths.has(field)) {
                    fieldPaths.set(field, []);
                }
                paths.forEach(p => {
                    const existing = fieldPaths.get(field).find(x => x.path === p.path);
                    if (existing) {
                        existing.count++;
                    } else {
                        fieldPaths.get(field).push({ ...p, count: 1 });
                    }
                });
            }
        });
    });

    // Display field path analysis
    console.log('Found paths for important fields:\n');

    fieldPaths.forEach((paths, fieldName) => {
        console.log(`\n${fieldName}:`);
        paths.sort((a, b) => b.count - a.count);
        paths.forEach(p => {
            console.log(`  ${p.path} (found in ${p.count}/${samples.length} samples)`);
        });
    });

    // Analyze top-level structure consistency
    console.log('\n\n📋 TOP-LEVEL STRUCTURE CONSISTENCY\n');
    console.log('-'.repeat(80));

    const topLevelKeys = new Map();
    samples.forEach(record => {
        if (record.full_response) {
            Object.keys(record.full_response).forEach(key => {
                topLevelKeys.set(key, (topLevelKeys.get(key) || 0) + 1);
            });
        }
    });

    const sortedKeys = Array.from(topLevelKeys.entries()).sort((a, b) => b[1] - a[1]);
    console.log('Top-level keys (frequency):');
    sortedKeys.forEach(([key, count]) => {
        const percentage = ((count / samples.length) * 100).toFixed(1);
        console.log(`  ${key.padEnd(30)} ${count}/${samples.length} (${percentage}%)`);
    });

    // Analyze data array structure if it exists
    console.log('\n\n📦 DATA ARRAY STRUCTURE ANALYSIS\n');
    console.log('-'.repeat(80));

    const dataArraySamples = samples.filter(s => s.full_response?.data && Array.isArray(s.full_response.data));
    console.log(`Records with data array: ${dataArraySamples.length}/${samples.length}\n`);

    if (dataArraySamples.length > 0) {
        const dataKeys = new Map();
        dataArraySamples.forEach(record => {
            if (record.full_response.data[0]) {
                Object.keys(record.full_response.data[0]).forEach(key => {
                    dataKeys.set(key, (dataKeys.get(key) || 0) + 1);
                });
            }
        });

        const sortedDataKeys = Array.from(dataKeys.entries()).sort((a, b) => b[1] - a[1]);
        console.log('Keys in data[0] object (frequency):');
        sortedDataKeys.forEach(([key, count]) => {
            const percentage = ((count / dataArraySamples.length) * 100).toFixed(1);
            console.log(`  ${key.padEnd(30)} ${count}/${dataArraySamples.length} (${percentage}%)`);
        });
    }

    // Create comprehensive mapping analysis
    console.log('\n\n📊 FIELD MAPPING CANDIDATES\n');
    console.log('-'.repeat(80));

    const mappingAnalysis = {
        basic: ['title', 'subtitle', 'description', 'summary'],
        location: ['address', 'city', 'state', 'zipCode', 'zip', 'street_address'],
        property: ['propertyType', 'property_type', 'buildingSize', 'building_size', 'lotSize',
                   'lot_size', 'yearBuilt', 'year_built', 'yearRenovated', 'numberOfUnits', 'parkingRatio'],
        financial: ['price', 'listPrice', 'pricePerSF', 'price_per_sf', 'capRate', 'cap_rate',
                    'saleType', 'leaseRate', 'leaseType', 'availableSpace'],
        broker: ['broker', 'brokerName', 'brokerCompany', 'listingAgent'],
        media: ['carousel', 'images', 'primaryImage', 'primaryImageUrl'],
        jsonb: ['saleSummary', 'leaseSummary', 'propertyFacts', 'highlights', 'amenities',
                'unitMixInfo', 'units', 'tenant', 'demographics', 'transportation']
    };

    Object.entries(mappingAnalysis).forEach(([category, fields]) => {
        console.log(`\n${category.toUpperCase()} FIELDS:`);
        fields.forEach(field => {
            const paths = findFieldPaths(samples[0].full_response, field);
            if (paths.length > 0) {
                console.log(`  ✓ ${field.padEnd(25)} -> ${paths[0].path}`);
            } else {
                console.log(`  ✗ ${field.padEnd(25)} NOT FOUND`);
            }
        });
    });

    console.log('\n\n✅ Analysis Complete!\n');
}

analyzeFullResponseStructure().catch(console.error);
