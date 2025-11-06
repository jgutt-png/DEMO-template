-- Add Block Group and County data columns to census_demographics

ALTER TABLE census_demographics
  -- Add block group FIPS code
  ADD COLUMN IF NOT EXISTS block_group_fips VARCHAR(1),

  -- Add county name
  ADD COLUMN IF NOT EXISTS county_name TEXT,

  -- Block group data (hyperlocal - ~1,000 people)
  ADD COLUMN IF NOT EXISTS block_population INTEGER,
  ADD COLUMN IF NOT EXISTS block_owner_occupied INTEGER,
  ADD COLUMN IF NOT EXISTS block_renter_occupied INTEGER,
  ADD COLUMN IF NOT EXISTS block_renter_percentage DECIMAL(4, 1),

  -- County data (regional context)
  ADD COLUMN IF NOT EXISTS county_population INTEGER,
  ADD COLUMN IF NOT EXISTS county_median_income INTEGER,
  ADD COLUMN IF NOT EXISTS county_median_age DECIMAL(4, 1),
  ADD COLUMN IF NOT EXISTS county_renter_percentage DECIMAL(4, 1);

-- Update radius_miles default to 4 (3-5 mile radius)
ALTER TABLE census_demographics
  ALTER COLUMN radius_miles SET DEFAULT 4.0;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_census_block_group ON census_demographics(block_group_fips);
CREATE INDEX IF NOT EXISTS idx_census_county_name ON census_demographics(county_name);
CREATE INDEX IF NOT EXISTS idx_census_block_renter ON census_demographics(block_renter_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_census_county_renter ON census_demographics(county_renter_percentage DESC);

-- Update comments
COMMENT ON COLUMN census_demographics.radius_miles IS '3-5 mile radius for demographic analysis (based on Census Tract size)';
COMMENT ON COLUMN census_demographics.block_renter_percentage IS 'Block group renter percentage - hyperlocal data (~1,000 people)';
COMMENT ON COLUMN census_demographics.county_renter_percentage IS 'County renter percentage - regional context';
