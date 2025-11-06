-- Remove analysis/scoring columns from census_demographics
-- Keep only raw Census Bureau data

ALTER TABLE census_demographics
  DROP COLUMN IF EXISTS storage_demand_score,
  DROP COLUMN IF EXISTS storage_demand_level,
  DROP COLUMN IF EXISTS key_factors_positive,
  DROP COLUMN IF EXISTS key_factors_negative,
  DROP COLUMN IF EXISTS key_factors_neutral;

-- Drop indexes related to removed columns
DROP INDEX IF EXISTS idx_census_demand_score;
DROP INDEX IF EXISTS idx_census_demand_level;

-- Update view to remove analysis columns
CREATE OR REPLACE VIEW properties_with_demographics AS
SELECT
    pl.listing_id,
    pl.state_id,
    pl.latitude,
    pl.longitude,
    pl.state_code,
    pd.city,
    pd.property_type,
    pd.lot_size,
    pd.price,
    cd.total_population,
    cd.median_household_income,
    cd.renter_percentage,
    cd.median_age,
    cd.poverty_rate,
    cd.unemployment_rate,
    cd.vacancy_rate,
    cd.fetched_at as demographics_fetched_at
FROM property_listings pl
LEFT JOIN property_details pd ON pl.listing_id = pd.listing_id AND pl.state_id = pd.state_id
LEFT JOIN census_demographics cd ON pl.listing_id = cd.listing_id AND pl.state_id = cd.state_id
WHERE pl.active_inactive = true;

-- Update comments
COMMENT ON TABLE census_demographics IS 'US Census Bureau demographic data for property locations (3-mile radius) - RAW DATA ONLY';
COMMENT ON COLUMN census_demographics.renter_percentage IS 'Percentage of renter-occupied housing units from Census ACS data';
