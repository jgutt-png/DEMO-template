/**
 * US Census Bureau API Integration
 * American Community Survey (ACS) 5-Year Estimates
 *
 * Documentation: https://www.census.gov/data/developers/data-sets/acs-5year.html
 */

const axios = require('axios');

class CensusAPI {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.CENSUS_API_KEY;
    this.baseURL = 'https://api.census.gov/data';

    // ACS 5-Year Estimates (most reliable for small areas)
    this.acsYear = '2022'; // Latest available
    this.dataset = `${this.acsYear}/acs/acs5`;

    // Cache for API responses (Census data doesn't change frequently)
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Get demographics for a location (3-5 mile radius)
   * @param {number} latitude
   * @param {number} longitude
   * @param {number} radiusMiles - Default 3-5 miles (ideal for storage analysis)
   */
  async getDemographics(latitude, longitude, radiusMiles = 4) {
    const cacheKey = `${latitude},${longitude},${radiusMiles}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      // Step 1: Get Census tract/block group for coordinates
      const geo = await this.geocodeToTract(latitude, longitude);

      // Step 2: Fetch ACS data for tract (neighborhood level)
      const tractData = await this.fetchACSData(geo.state, geo.county, geo.tract);

      // Step 3: Fetch ACS data for block group (hyperlocal level)
      const blockData = await this.fetchACSDataBlockGroup(geo.state, geo.county, geo.tract, geo.block_group);

      // Step 4: Fetch county data (cached per county)
      const countyData = await this.fetchCountyData(geo.state, geo.county, geo.county_name);

      // Step 5: Combine all data
      const enriched = this.calculateStorageMetrics(
        tractData,
        blockData,
        countyData,
        latitude,
        longitude,
        radiusMiles,
        geo
      );

      // Cache result
      this.cache.set(cacheKey, {
        data: enriched,
        timestamp: Date.now()
      });

      return enriched;

    } catch (error) {
      console.error('Census API error:', error.message);
      throw new Error(`Failed to fetch demographics: ${error.message}`);
    }
  }

  /**
   * Convert lat/long to Census geography (state, county, tract, block group)
   */
  async geocodeToTract(latitude, longitude) {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates`;

    const response = await axios.get(url, {
      params: {
        x: longitude,
        y: latitude,
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        format: 'json'
      }
    });

    if (!response.data?.result?.geographies) {
      throw new Error('No Census geography found for coordinates');
    }

    const tract = response.data.result.geographies['Census Tracts']?.[0];
    const blockGroup = response.data.result.geographies['2020 Census Blocks']?.[0];
    const county = response.data.result.geographies['Counties']?.[0];

    if (!tract || !county) {
      throw new Error('Could not determine Census tract for location');
    }

    // Extract block group from GEOID (last digit of block group is from block GEOID)
    const block_group = blockGroup ? blockGroup.BLKGRP : '1';

    return {
      state: tract.STATE,
      county: tract.COUNTY,
      tract: tract.TRACT,
      block_group: block_group,
      geoid: tract.GEOID,
      name: tract.NAME,
      county_name: county.NAME,
      county_geoid: county.GEOID
    };
  }

  /**
   * Fetch American Community Survey (ACS) 5-Year data
   *
   * Key variables for storage facility analysis:
   * B01003_001E - Total Population
   * B19013_001E - Median Household Income
   * B25003_002E - Owner-occupied housing units
   * B25003_003E - Renter-occupied housing units
   * B25002_001E - Total housing units
   * B25002_003E - Vacant housing units
   * B01002_001E - Median age
   * B17001_002E - Population below poverty level
   * B23025_005E - Unemployed
   */
  async fetchACSData(state, county, tract) {
    const variables = [
      'B01003_001E',  // Total population
      'B19013_001E',  // Median household income
      'B25003_001E',  // Total occupied housing units
      'B25003_002E',  // Owner-occupied
      'B25003_003E',  // Renter-occupied
      'B25002_001E',  // Total housing units
      'B25002_003E',  // Vacant units
      'B01002_001E',  // Median age
      'B17001_002E',  // Below poverty
      'B17001_001E',  // Total for poverty calculation
      'B23025_005E',  // Unemployed
      'B23025_003E',  // Total in labor force
      'B11001_001E',  // Total households
      'B25010_001E'   // Average household size
    ].join(',');

    const url = `${this.baseURL}/${this.dataset}`;

    const response = await axios.get(url, {
      params: {
        get: variables,
        for: `tract:${tract}`,
        in: `state:${state}+county:${county}`,
        key: this.apiKey
      }
    });

    // Parse response (first row is headers, second is data)
    const headers = response.data[0];
    const values = response.data[1];

    const data = {};
    headers.forEach((header, i) => {
      data[header] = values[i];
    });

    return {
      total_population: parseInt(data.B01003_001E) || 0,
      median_household_income: parseInt(data.B19013_001E) || 0,
      occupied_housing_units: parseInt(data.B25003_001E) || 0,
      owner_occupied_units: parseInt(data.B25003_002E) || 0,
      renter_occupied_units: parseInt(data.B25003_003E) || 0,
      total_housing_units: parseInt(data.B25002_001E) || 0,
      vacant_units: parseInt(data.B25002_003E) || 0,
      median_age: parseFloat(data.B01002_001E) || 0,
      below_poverty: parseInt(data.B17001_002E) || 0,
      total_for_poverty: parseInt(data.B17001_001E) || 0,
      unemployed: parseInt(data.B23025_005E) || 0,
      labor_force: parseInt(data.B23025_003E) || 0,
      total_households: parseInt(data.B11001_001E) || 0,
      avg_household_size: parseFloat(data.B25010_001E) || 0,
      state_fips: data.state,
      county_fips: data.county,
      tract_fips: data.tract
    };
  }

  /**
   * Fetch ACS data for Block Group (hyperlocal - ~1000 people)
   */
  async fetchACSDataBlockGroup(state, county, tract, blockGroup) {
    const variables = [
      'B01003_001E',  // Total population
      'B25003_002E',  // Owner-occupied
      'B25003_003E'   // Renter-occupied
    ].join(',');

    const url = `${this.baseURL}/${this.dataset}`;

    try {
      const response = await axios.get(url, {
        params: {
          get: variables,
          for: `block group:${blockGroup}`,
          in: `state:${state}+county:${county}+tract:${tract}`,
          key: this.apiKey
        }
      });

      const headers = response.data[0];
      const values = response.data[1];

      const data = {};
      headers.forEach((header, i) => {
        data[header] = values[i];
      });

      return {
        block_total_population: parseInt(data.B01003_001E) || 0,
        block_owner_occupied: parseInt(data.B25003_002E) || 0,
        block_renter_occupied: parseInt(data.B25003_003E) || 0,
        block_group_fips: data['block group']
      };
    } catch (error) {
      console.warn(`Block group data not available: ${error.message}`);
      return {
        block_total_population: null,
        block_owner_occupied: null,
        block_renter_occupied: null,
        block_group_fips: blockGroup
      };
    }
  }

  /**
   * Fetch ACS data for County (cached per county to avoid redundant calls)
   */
  async fetchCountyData(state, county, countyName) {
    const cacheKey = `county_${state}_${county}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const variables = [
      'B01003_001E',  // Total population
      'B19013_001E',  // Median household income
      'B25003_001E',  // Total occupied housing units
      'B25003_002E',  // Owner-occupied
      'B25003_003E',  // Renter-occupied
      'B01002_001E'   // Median age
    ].join(',');

    const url = `${this.baseURL}/${this.dataset}`;

    const response = await axios.get(url, {
      params: {
        get: variables,
        for: `county:${county}`,
        in: `state:${state}`,
        key: this.apiKey
      }
    });

    const headers = response.data[0];
    const values = response.data[1];

    const data = {};
    headers.forEach((header, i) => {
      data[header] = values[i];
    });

    const countyData = {
      county_name: countyName,
      county_total_population: parseInt(data.B01003_001E) || 0,
      county_median_household_income: parseInt(data.B19013_001E) || 0,
      county_occupied_housing: parseInt(data.B25003_001E) || 0,
      county_owner_occupied: parseInt(data.B25003_002E) || 0,
      county_renter_occupied: parseInt(data.B25003_003E) || 0,
      county_median_age: parseFloat(data.B01002_001E) || 0
    };

    // Cache county data
    this.cache.set(cacheKey, {
      data: countyData,
      timestamp: Date.now()
    });

    return countyData;
  }

  /**
   * Calculate storage-specific metrics from raw Census data
   */
  calculateStorageMetrics(tractData, blockData, countyData, latitude, longitude, radiusMiles, geo) {
    // Calculate percentages from tract data (primary source)
    const renter_percentage = tractData.occupied_housing_units > 0
      ? tractData.renter_occupied_units / tractData.occupied_housing_units
      : 0;

    const owner_percentage = tractData.occupied_housing_units > 0
      ? tractData.owner_occupied_units / tractData.occupied_housing_units
      : 0;

    const vacancy_rate = tractData.total_housing_units > 0
      ? tractData.vacant_units / tractData.total_housing_units
      : 0;

    const poverty_rate = tractData.total_for_poverty > 0
      ? tractData.below_poverty / tractData.total_for_poverty
      : 0;

    const unemployment_rate = tractData.labor_force > 0
      ? tractData.unemployed / tractData.labor_force
      : 0;

    // Block group renter percentage (hyperlocal)
    const block_renter_pct = (blockData.block_owner_occupied + blockData.block_renter_occupied) > 0
      ? blockData.block_renter_occupied / (blockData.block_owner_occupied + blockData.block_renter_occupied)
      : null;

    // County renter percentage (regional context)
    const county_renter_pct = countyData.county_occupied_housing > 0
      ? countyData.county_renter_occupied / countyData.county_occupied_housing
      : 0;

    return {
      location: {
        latitude,
        longitude,
        radius_miles: radiusMiles,
        tract_name: `Census Tract ${tractData.tract_fips}`,
        state_fips: tractData.state_fips,
        county_fips: tractData.county_fips,
        block_group_fips: blockData.block_group_fips,
        county_name: countyData.county_name
      },

      // Tract-level data (neighborhood - ~4,000 people, 3-5 mile radius)
      population: {
        total: tractData.total_population,
        median_age: tractData.median_age,
        total_households: tractData.total_households,
        avg_household_size: tractData.avg_household_size,
        population_density_per_sq_mile: Math.round(tractData.total_population / (Math.PI * radiusMiles * radiusMiles))
      },

      housing: {
        total_units: tractData.total_housing_units,
        occupied_units: tractData.occupied_housing_units,
        vacant_units: tractData.vacant_units,
        vacancy_rate: Math.round(vacancy_rate * 1000) / 10,
        owner_occupied: tractData.owner_occupied_units,
        owner_percentage: Math.round(owner_percentage * 1000) / 10,
        renter_occupied: tractData.renter_occupied_units,
        renter_percentage: Math.round(renter_percentage * 1000) / 10
      },

      economic: {
        median_household_income: tractData.median_household_income,
        below_poverty: tractData.below_poverty,
        poverty_rate: Math.round(poverty_rate * 1000) / 10,
        unemployed: tractData.unemployed,
        unemployment_rate: Math.round(unemployment_rate * 1000) / 10
      },

      // Block group data (hyperlocal - ~1,000 people, immediate area)
      block_group: {
        population: blockData.block_total_population,
        owner_occupied: blockData.block_owner_occupied,
        renter_occupied: blockData.block_renter_occupied,
        renter_percentage: block_renter_pct !== null ? Math.round(block_renter_pct * 1000) / 10 : null
      },

      // County data (regional context)
      county: {
        population: countyData.county_total_population,
        median_household_income: countyData.county_median_household_income,
        median_age: countyData.county_median_age,
        renter_percentage: Math.round(county_renter_pct * 1000) / 10
      },

      metadata: {
        data_year: this.acsYear,
        dataset: 'ACS 5-Year Estimates',
        fetched_at: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate storage demand score (0-1 scale)
   * Based on storage industry research
   */
  calculateStorageDemandScore(factors) {
    let score = 0;

    // Renter percentage (35% weight) - MOST IMPORTANT
    // Sweet spot: 35-50% renters
    if (factors.renter_percentage >= 0.35 && factors.renter_percentage <= 0.50) {
      score += 0.35;
    } else if (factors.renter_percentage >= 0.30 && factors.renter_percentage < 0.35) {
      score += 0.30;
    } else if (factors.renter_percentage > 0.50 && factors.renter_percentage <= 0.60) {
      score += 0.30;
    } else if (factors.renter_percentage >= 0.25) {
      score += 0.20;
    } else {
      score += 0.10;
    }

    // Income level (30% weight)
    // Sweet spot: $45K-$100K (can afford storage, need it)
    const income = factors.median_household_income;
    if (income >= 50000 && income <= 100000) {
      score += 0.30;
    } else if (income >= 40000 && income < 50000) {
      score += 0.25;
    } else if (income > 100000 && income <= 150000) {
      score += 0.25;
    } else if (income >= 30000) {
      score += 0.15;
    } else {
      score += 0.05;
    }

    // Age profile (20% weight)
    // Sweet spot: 28-40 (young professionals, families, transient)
    const age = factors.median_age;
    if (age >= 28 && age <= 40) {
      score += 0.20;
    } else if (age >= 25 && age < 28) {
      score += 0.15;
    } else if (age > 40 && age <= 45) {
      score += 0.15;
    } else if (age >= 20) {
      score += 0.10;
    } else {
      score += 0.05;
    }

    // Density (10% weight)
    // 2,000-8,000 people per sq mile is ideal
    const density = factors.population_density;
    if (density >= 2000 && density <= 8000) {
      score += 0.10;
    } else if (density >= 1000 && density < 2000) {
      score += 0.08;
    } else if (density > 8000 && density <= 12000) {
      score += 0.08;
    } else if (density >= 500) {
      score += 0.05;
    } else {
      score += 0.02;
    }

    // Poverty rate (5% weight) - inverse relationship
    if (factors.poverty_rate < 0.10) {
      score += 0.05;
    } else if (factors.poverty_rate < 0.15) {
      score += 0.03;
    } else {
      score += 0.01;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get demand level description
   */
  getDemandLevel(score) {
    if (score >= 0.80) return 'Excellent';
    if (score >= 0.65) return 'Strong';
    if (score >= 0.50) return 'Good';
    if (score >= 0.35) return 'Fair';
    return 'Weak';
  }

  /**
   * Identify key positive/negative factors
   */
  getKeyFactors(data) {
    const factors = {
      positive: [],
      negative: [],
      neutral: []
    };

    // Renter percentage
    const renterPct = data.renter_percentage * 100;
    if (renterPct >= 35 && renterPct <= 50) {
      factors.positive.push(`Ideal renter percentage (${renterPct.toFixed(1)}%) drives storage demand`);
    } else if (renterPct >= 25 && renterPct < 35) {
      factors.neutral.push(`Moderate renter percentage (${renterPct.toFixed(1)}%)`);
    } else if (renterPct < 25) {
      factors.negative.push(`Low renter percentage (${renterPct.toFixed(1)}%) may limit demand`);
    } else {
      factors.neutral.push(`High renter percentage (${renterPct.toFixed(1)}%)`);
    }

    // Income
    const income = data.median_household_income;
    if (income >= 50000 && income <= 100000) {
      factors.positive.push(`Target income range ($${(income/1000).toFixed(0)}K) for storage customers`);
    } else if (income < 40000) {
      factors.negative.push(`Below-target income ($${(income/1000).toFixed(0)}K) may limit affordability`);
    } else if (income > 100000) {
      factors.neutral.push(`High income ($${(income/1000).toFixed(0)}K) - may have larger homes with storage`);
    }

    // Age
    const age = data.median_age;
    if (age >= 28 && age <= 40) {
      factors.positive.push(`Young professional demographic (median age ${age.toFixed(1)}) is transient`);
    } else if (age < 28) {
      factors.neutral.push(`Young population (median age ${age.toFixed(1)}) - students/early career`);
    } else if (age > 45) {
      factors.negative.push(`Older population (median age ${age.toFixed(1)}) tends to be more settled`);
    }

    // Poverty
    const povertyPct = data.poverty_rate * 100;
    if (povertyPct > 15) {
      factors.negative.push(`Elevated poverty rate (${povertyPct.toFixed(1)}%) may reduce demand`);
    } else if (povertyPct < 10) {
      factors.positive.push(`Low poverty rate (${povertyPct.toFixed(1)}%) indicates economic health`);
    }

    return factors;
  }

  /**
   * Batch fetch demographics for multiple properties
   */
  async batchGetDemographics(properties, radiusMiles = 3) {
    const results = [];

    // Process in batches of 10 to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (prop) => {
          try {
            const demographics = await this.getDemographics(
              prop.latitude,
              prop.longitude,
              radiusMiles
            );

            return {
              listing_id: prop.listing_id,
              state_id: prop.state_id,
              success: true,
              demographics
            };
          } catch (error) {
            return {
              listing_id: prop.listing_id,
              state_id: prop.state_id,
              success: false,
              error: error.message
            };
          }
        })
      );

      results.push(...batchResults);

      // Brief delay between batches
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

module.exports = CensusAPI;
