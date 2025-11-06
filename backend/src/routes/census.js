const express = require('express');
const router = express.Router();
const { supabase } = require('../../../supabase-config');
const CensusAPI = require('../services/census/CensusAPI');

// Initialize Census API with your key
const census = new CensusAPI('50076e92f117dd465e96d431111e6b3005f4a9b4');

/**
 * POST /api/census/enrich/:listing_id/:state_id
 * Fetch and store Census demographics for a single property
 */
router.post('/enrich/:listing_id/:state_id', async (req, res) => {
  try {
    const { listing_id, state_id } = req.params;
    const { radius_miles = 3 } = req.body;

    // Get property coordinates
    const { data: property, error: propError } = await supabase
      .from('property_listings')
      .select('latitude, longitude')
      .eq('listing_id', listing_id)
      .eq('state_id', state_id)
      .single();

    if (propError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (!property.latitude || !property.longitude) {
      return res.status(400).json({ error: 'Property missing coordinates' });
    }

    // Fetch Census data
    console.log(`Fetching Census data for ${listing_id} at (${property.latitude}, ${property.longitude})`);

    const demographics = await census.getDemographics(
      property.latitude,
      property.longitude,
      radius_miles
    );

    // Store in database
    const { data: saved, error: saveError } = await supabase
      .from('census_demographics')
      .upsert({
        listing_id,
        state_id,
        latitude: property.latitude,
        longitude: property.longitude,
        radius_miles,

        // Census geography
        census_tract: demographics.location.tract_name,
        state_fips: demographics.location.state_fips,
        county_fips: demographics.location.county_fips,
        block_group_fips: demographics.location.block_group_fips,
        county_name: demographics.location.county_name,

        // Population
        total_population: demographics.population.total,
        median_age: demographics.population.median_age,
        total_households: demographics.population.total_households,
        avg_household_size: demographics.population.avg_household_size,
        population_density_per_sq_mile: demographics.population.population_density_per_sq_mile,

        // Housing
        total_housing_units: demographics.housing.total_units,
        occupied_housing_units: demographics.housing.occupied_units,
        vacant_units: demographics.housing.vacant_units,
        vacancy_rate: demographics.housing.vacancy_rate,
        owner_occupied_units: demographics.housing.owner_occupied,
        owner_percentage: demographics.housing.owner_percentage,
        renter_occupied_units: demographics.housing.renter_occupied,
        renter_percentage: demographics.housing.renter_percentage,

        // Economic
        median_household_income: demographics.economic.median_household_income,
        below_poverty: demographics.economic.below_poverty,
        poverty_rate: demographics.economic.poverty_rate,
        unemployed: demographics.economic.unemployed,
        unemployment_rate: demographics.economic.unemployment_rate,

        // Block group data
        block_population: demographics.block_group.population,
        block_owner_occupied: demographics.block_group.owner_occupied,
        block_renter_occupied: demographics.block_group.renter_occupied,
        block_renter_percentage: demographics.block_group.renter_percentage,

        // County data
        county_population: demographics.county.population,
        county_median_income: demographics.county.median_household_income,
        county_median_age: demographics.county.median_age,
        county_renter_percentage: demographics.county.renter_percentage,

        // Metadata
        data_year: demographics.metadata.data_year,
        dataset_name: demographics.metadata.dataset,
        fetched_at: demographics.metadata.fetched_at
      }, {
        onConflict: 'listing_id,state_id'
      })
      .select()
      .single();

    if (saveError) throw saveError;

    res.json({
      success: true,
      property: { listing_id, state_id },
      demographics: saved,
      summary: {
        population: demographics.population.total,
        renter_percentage: demographics.housing.renter_percentage,
        median_income: demographics.economic.median_household_income
      }
    });

  } catch (error) {
    console.error('Census enrichment error:', error);
    res.status(500).json({
      error: error.message,
      details: error.response?.data || null
    });
  }
});

/**
 * POST /api/census/enrich-batch
 * Batch enrich multiple properties
 */
router.post('/enrich-batch', async (req, res) => {
  try {
    const { state_code, limit = 50, radius_miles = 3 } = req.body;

    // Get properties without demographics
    let query = supabase
      .from('property_listings')
      .select('listing_id, state_id, latitude, longitude')
      .eq('active_inactive', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (state_code) {
      query = query.eq('state_code', state_code);
    }

    query = query.limit(limit);

    const { data: properties, error: propError } = await query;

    if (propError) throw propError;

    console.log(`Batch enriching ${properties.length} properties...`);

    // Filter out properties that already have demographics
    const { data: existing } = await supabase
      .from('census_demographics')
      .select('listing_id, state_id');

    const existingSet = new Set(
      existing?.map(e => `${e.listing_id}:${e.state_id}`) || []
    );

    const toEnrich = properties.filter(
      p => !existingSet.has(`${p.listing_id}:${p.state_id}`)
    );

    console.log(`${toEnrich.length} properties need enrichment (${properties.length - toEnrich.length} already have data)`);

    if (toEnrich.length === 0) {
      return res.json({
        success: true,
        message: 'All properties already have demographics',
        total: 0,
        enriched: 0,
        skipped: properties.length
      });
    }

    // Batch fetch demographics
    const results = await census.batchGetDemographics(toEnrich, radius_miles);

    // Store successful results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    for (const result of successful) {
      const demo = result.demographics;

      await supabase.from('census_demographics').upsert({
        listing_id: result.listing_id,
        state_id: result.state_id,
        latitude: demo.location.latitude,
        longitude: demo.location.longitude,
        radius_miles,

        census_tract: demo.location.tract_name,
        state_fips: demo.location.state_fips,
        county_fips: demo.location.county_fips,
        block_group_fips: demo.location.block_group_fips,
        county_name: demo.location.county_name,

        total_population: demo.population.total,
        median_age: demo.population.median_age,
        total_households: demo.population.total_households,
        avg_household_size: demo.population.avg_household_size,
        population_density_per_sq_mile: demo.population.population_density_per_sq_mile,

        total_housing_units: demo.housing.total_units,
        occupied_housing_units: demo.housing.occupied_units,
        vacant_units: demo.housing.vacant_units,
        vacancy_rate: demo.housing.vacancy_rate,
        owner_occupied_units: demo.housing.owner_occupied,
        owner_percentage: demo.housing.owner_percentage,
        renter_occupied_units: demo.housing.renter_occupied,
        renter_percentage: demo.housing.renter_percentage,

        median_household_income: demo.economic.median_household_income,
        below_poverty: demo.economic.below_poverty,
        poverty_rate: demo.economic.poverty_rate,
        unemployed: demo.economic.unemployed,
        unemployment_rate: demo.economic.unemployment_rate,

        block_population: demo.block_group.population,
        block_owner_occupied: demo.block_group.owner_occupied,
        block_renter_occupied: demo.block_group.renter_occupied,
        block_renter_percentage: demo.block_group.renter_percentage,

        county_population: demo.county.population,
        county_median_income: demo.county.median_household_income,
        county_median_age: demo.county.median_age,
        county_renter_percentage: demo.county.renter_percentage,

        data_year: demo.metadata.data_year,
        dataset_name: demo.metadata.dataset,
        fetched_at: demo.metadata.fetched_at
      }, {
        onConflict: 'listing_id,state_id'
      });
    }

    res.json({
      success: true,
      total: results.length,
      enriched: successful.length,
      failed: failed.length,
      errors: failed.map(f => ({ listing_id: f.listing_id, error: f.error }))
    });

  } catch (error) {
    console.error('Batch enrichment error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/census/property/:listing_id/:state_id
 * Get stored demographics for a property
 */
router.get('/property/:listing_id/:state_id', async (req, res) => {
  try {
    const { listing_id, state_id } = req.params;

    const { data, error } = await supabase
      .from('census_demographics')
      .select('*')
      .eq('listing_id', listing_id)
      .eq('state_id', state_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Demographics not found',
          message: 'Use POST /api/census/enrich/:listing_id/:state_id to fetch'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      demographics: data
    });

  } catch (error) {
    console.error('Get demographics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/census/stats
 * Get overall demographics statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { data: allDemographics } = await supabase
      .from('census_demographics')
      .select('renter_percentage, median_household_income, total_population, median_age');

    const stats = {
      total_enriched: allDemographics.length,
      averages: {
        renter_percentage: allDemographics.reduce((sum, d) => sum + (d.renter_percentage || 0), 0) / allDemographics.length,
        median_income: allDemographics.reduce((sum, d) => sum + (d.median_household_income || 0), 0) / allDemographics.length,
        population: allDemographics.reduce((sum, d) => sum + (d.total_population || 0), 0) / allDemographics.length,
        median_age: allDemographics.reduce((sum, d) => sum + (d.median_age || 0), 0) / allDemographics.length
      }
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
