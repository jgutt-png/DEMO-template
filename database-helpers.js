const { supabase } = require('./supabase-config');

/**
 * Save or update address and return address_id
 */
async function saveAddress(addressData, geocode, userId = 'DEMO') {
    const { original, formatted, components } = addressData;

    // Parse address components
    let city = '', state = '', zipCode = '', streetAddress = '';
    if (components) {
        components.forEach(comp => {
            if (comp.componentType === 'locality') city = comp.componentName.text;
            if (comp.componentType === 'administrative_area_level_1') state = comp.componentName.text;
            if (comp.componentType === 'postal_code') zipCode = comp.componentName.text;
        });
        streetAddress = components
            .filter(c => ['street_number', 'route'].includes(c.componentType))
            .map(c => c.componentName.text)
            .join(' ');
    }

    // Check if address already exists
    const { data: existing, error: searchError } = await supabase
        .from('addresses')
        .select('id, search_count')
        .eq('formatted_address', formatted)
        .eq('user_id', userId)
        .single();

    if (existing) {
        // Update existing address
        const { data, error } = await supabase
            .from('addresses')
            .update({
                last_searched_at: new Date().toISOString(),
                search_count: existing.search_count + 1
            })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } else {
        // Insert new address
        const { data, error } = await supabase
            .from('addresses')
            .insert([{
                original_address: original,
                formatted_address: formatted,
                street_address: streetAddress,
                city,
                state,
                zip_code: zipCode,
                latitude: geocode?.latitude,
                longitude: geocode?.longitude,
                geocode_data: geocode,
                user_id: userId
            }])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    }
}

/**
 * Save street view data
 */
async function saveStreetView(addressId, streetViewData) {
    if (!streetViewData || !streetViewData.url) return;

    const { data, error } = await supabase
        .from('street_view_data')
        .upsert([{
            address_id: addressId,
            street_view_url: streetViewData.url,
            latitude: streetViewData.latitude,
            longitude: streetViewData.longitude
        }], { onConflict: 'address_id' })
        .select();

    if (error) throw error;
    return data;
}

/**
 * Save zoning data from Zoneomics
 */
async function saveZoningData(addressId, zoningData) {
    if (!zoningData || !zoningData.data || zoningData.error) return;

    const zone = zoningData.data.zone_details;
    const meta = zoningData.data.meta;

    if (!zone) return;

    const { data, error } = await supabase
        .from('zoning_data')
        .upsert([{
            address_id: addressId,
            zone_code: zone.zone_code,
            zone_name: zone.zone_name,
            zone_type: zone.zone_type,
            zone_sub_type: zone.zone_sub_type,
            zone_guide: zone.zone_guide,
            city_name: meta?.city_name,
            state_name: meta?.state_name,
            link: zone.link,
            last_updated: meta?.last_updated,
            raw_data: zoningData
        }], { onConflict: 'address_id' })
        .select();

    if (error) throw error;
    return data;
}

/**
 * Save ATTOM property details
 */
async function savePropertyDetails(addressId, propertyData) {
    if (!propertyData || !propertyData.property || propertyData.property.length === 0 || propertyData.error) return;

    const property = propertyData.property[0];
    const summary = property.summary || {};
    const building = property.building || {};
    const lot = property.lot || {};

    const { data, error } = await supabase
        .from('property_details')
        .upsert([{
            address_id: addressId,
            property_type: summary.propType,
            property_sub_type: summary.propSubType,
            year_built: summary.yearBuilt,
            bedrooms: building.rooms?.beds,
            bathrooms_total: building.rooms?.bathsTotal,
            building_size: building.size?.bldgSize,
            lot_size: lot.lotSize1,
            stories: building.summary?.stories,
            pool_indicator: lot.poolInd || false,
            parking_spaces: building.parking?.prkgSize,
            last_sale_date: summary.saleTransDate,
            last_sale_price: summary.saleAmnt,
            raw_data: propertyData
        }], { onConflict: 'address_id' })
        .select();

    if (error) throw error;
    return data;
}

/**
 * Save ATTOM mortgage data
 */
async function saveMortgages(addressId, propertyData) {
    if (!propertyData || !propertyData.property || propertyData.property.length === 0 || propertyData.error) return;

    const mortgages = propertyData.property[0].mortgage;
    if (!mortgages || mortgages.length === 0) return;

    // Save each mortgage (can have multiple)
    const mortgageRecords = mortgages.map(m => ({
        address_id: addressId,
        loan_amount: m.amount,
        lender_name: m.lenderName,
        loan_type: m.loanType,
        recording_date: m.recordingDate,
        mortgage_term: m.term,
        interest_rate: m.interestRate,
        raw_data: m
    }));

    const { data, error } = await supabase
        .from('mortgages')
        .insert(mortgageRecords)
        .select();

    if (error && error.code !== '23505') throw error; // Ignore duplicate errors
    return data;
}

/**
 * Save ATTOM AVM valuation
 */
async function saveAVMValuation(addressId, avmData) {
    if (!avmData || !avmData.property || avmData.property.length === 0 || avmData.error) return;

    const avm = avmData.property[0].avm || {};

    const { data, error } = await supabase
        .from('avm_valuations')
        .upsert([{
            address_id: addressId,
            avm_value: avm.amount?.value,
            avm_value_low: avm.amountRangeLow?.value,
            avm_value_high: avm.amountRangeHigh?.value,
            fsd_score: avm.fsd,
            confidence_score: avm.confidenceScore,
            event_date: avm.eventDate?.value,
            raw_data: avmData
        }], { onConflict: 'address_id' })
        .select();

    if (error) throw error;
    return data;
}

/**
 * Save ATTOM tax assessment
 */
async function saveTaxAssessment(addressId, taxData) {
    if (!taxData || !taxData.property || taxData.property.length === 0 || taxData.error) return;

    const assessment = taxData.property[0].assessment?.assessed;
    if (!assessment) return;

    const { data, error } = await supabase
        .from('tax_assessments')
        .upsert([{
            address_id: addressId,
            assessed_total_value: assessment.assdTtlValue,
            assessed_land_value: assessment.assdLandValue,
            assessed_improvement_value: assessment.assdImpValue,
            assessment_year: assessment.assdYear,
            raw_data: taxData
        }], { onConflict: 'address_id' })
        .select();

    if (error) throw error;
    return data;
}

/**
 * Save ATTOM home equity
 */
async function saveHomeEquity(addressId, equityData) {
    if (!equityData || !equityData.property || equityData.property.length === 0 || equityData.error) return;

    const equity = equityData.property[0].vintage?.equity;
    if (!equity) return;

    const { data, error } = await supabase
        .from('home_equity')
        .upsert([{
            address_id: addressId,
            equity_percent: equity.equityPercent,
            equity_amount: equity.equityAmount,
            raw_data: equityData
        }], { onConflict: 'address_id' })
        .select();

    if (error) throw error;
    return data;
}

/**
 * Save ATTOM foreclosure data
 */
async function saveForeclosureData(addressId, foreclosureData) {
    if (!foreclosureData || foreclosureData.error) return;

    // Foreclosure data structure varies, save raw for now
    const { data, error } = await supabase
        .from('foreclosures')
        .upsert([{
            address_id: addressId,
            raw_data: foreclosureData
        }], { onConflict: 'address_id' })
        .select();

    if (error) throw error;
    return data;
}

/**
 * Save all property data (master function)
 */
async function saveAllPropertyData(searchData, userId = 'DEMO') {
    try {
        // 1. Save address first
        const addressId = await saveAddress(
            searchData.address,
            searchData.address.geocode,
            userId
        );

        console.log(`Saved address with ID: ${addressId}`);

        // 2. Save all related data in parallel
        await Promise.allSettled([
            saveStreetView(addressId, searchData.streetView),
            saveZoningData(addressId, searchData.zoning),
            savePropertyDetails(addressId, searchData.property),
            saveMortgages(addressId, searchData.property),
            saveAVMValuation(addressId, searchData.avm),
            saveTaxAssessment(addressId, searchData.taxAssessment),
            saveHomeEquity(addressId, searchData.homeEquity),
            saveForeclosureData(addressId, searchData.foreclosure)
        ]);

        console.log(`Saved all property data for address ID: ${addressId}`);

        return addressId;
    } catch (error) {
        console.error('Error saving property data:', error);
        throw error;
    }
}

/**
 * Get complete property data by address ID and reconstruct the original format
 */
async function getCompletePropertyData(addressId) {
    // Fetch all related data in parallel
    const [address, streetView, zoning, property, avm, tax, equity, mortgages, foreclosure] = await Promise.all([
        supabase.from('addresses').select('*').eq('id', addressId).single(),
        supabase.from('street_view_data').select('*').eq('address_id', addressId).single(),
        supabase.from('zoning_data').select('*').eq('address_id', addressId).single(),
        supabase.from('property_details').select('*').eq('address_id', addressId).single(),
        supabase.from('avm_valuations').select('*').eq('address_id', addressId).single(),
        supabase.from('tax_assessments').select('*').eq('address_id', addressId).single(),
        supabase.from('home_equity').select('*').eq('address_id', addressId).single(),
        supabase.from('mortgages').select('*').eq('address_id', addressId),
        supabase.from('foreclosures').select('*').eq('address_id', addressId).single()
    ]);

    // Reconstruct the original aggregated format
    return {
        address: {
            original: address.data?.original_address,
            formatted: address.data?.formatted_address,
            geocode: address.data?.geocode_data || {
                latitude: address.data?.latitude,
                longitude: address.data?.longitude
            }
        },
        streetView: streetView.data ? {
            url: streetView.data.street_view_url,
            latitude: streetView.data.latitude,
            longitude: streetView.data.longitude
        } : {},
        zoning: zoning.data?.raw_data || {},
        property: property.data?.raw_data || {},
        avm: avm.data?.raw_data || {},
        taxAssessment: tax.data?.raw_data || {},
        homeEquity: equity.data?.raw_data || {},
        foreclosure: foreclosure.data?.raw_data || {}
    };
}

/**
 * Get search history
 */
async function getSearchHistory(userId = 'DEMO', limit = 10) {
    const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', userId)
        .order('last_searched_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

module.exports = {
    saveAddress,
    saveStreetView,
    saveZoningData,
    savePropertyDetails,
    saveMortgages,
    saveAVMValuation,
    saveTaxAssessment,
    saveHomeEquity,
    saveForeclosureData,
    saveAllPropertyData,
    getCompletePropertyData,
    getSearchHistory
};
