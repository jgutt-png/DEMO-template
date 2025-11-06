-- Census Demographics Table
-- Stores American Community Survey (ACS) data for property locations

CREATE TABLE IF NOT EXISTS census_demographics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Link to property
    listing_id VARCHAR(50),
    state_id VARCHAR(10),
    address_id UUID REFERENCES addresses(id),

    -- Location info
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_miles DECIMAL(4, 2) DEFAULT 3.0,

    -- Census Geography
    census_tract TEXT,
    state_fips VARCHAR(2),
    county_fips VARCHAR(3),
    tract_fips VARCHAR(6),

    -- Population Data
    total_population INTEGER,
    median_age DECIMAL(4, 1),
    total_households INTEGER,
    avg_household_size DECIMAL(3, 2),
    population_density_per_sq_mile INTEGER,

    -- Housing Data (CRITICAL for storage analysis)
    total_housing_units INTEGER,
    occupied_housing_units INTEGER,
    vacant_units INTEGER,
    vacancy_rate DECIMAL(4, 1),
    owner_occupied_units INTEGER,
    owner_percentage DECIMAL(4, 1),
    renter_occupied_units INTEGER,
    renter_percentage DECIMAL(4, 1),  -- KEY METRIC

    -- Economic Data
    median_household_income INTEGER,
    below_poverty INTEGER,
    poverty_rate DECIMAL(4, 1),
    unemployed INTEGER,
    unemployment_rate DECIMAL(4, 1),

    -- Storage Demand Analysis
    storage_demand_score DECIMAL(3, 2),  -- 0-1 scale
    storage_demand_level VARCHAR(20),    -- Excellent, Strong, Good, Fair, Weak
    key_factors_positive TEXT[],
    key_factors_negative TEXT[],
    key_factors_neutral TEXT[],

    -- Metadata
    data_year VARCHAR(4) DEFAULT '2022',
    dataset_name TEXT DEFAULT 'ACS 5-Year Estimates',
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(listing_id, state_id),
    FOREIGN KEY (listing_id, state_id)
        REFERENCES property_listings(listing_id, state_id)
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_census_listing ON census_demographics(listing_id, state_id);
CREATE INDEX IF NOT EXISTS idx_census_address ON census_demographics(address_id);
CREATE INDEX IF NOT EXISTS idx_census_location ON census_demographics(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_census_demand_score ON census_demographics(storage_demand_score DESC);
CREATE INDEX IF NOT EXISTS idx_census_demand_level ON census_demographics(storage_demand_level);
CREATE INDEX IF NOT EXISTS idx_census_renter_pct ON census_demographics(renter_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_census_income ON census_demographics(median_household_income);
CREATE INDEX IF NOT EXISTS idx_census_fetched ON census_demographics(fetched_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_census_demographics_updated_at
    BEFORE UPDATE ON census_demographics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE census_demographics ENABLE ROW LEVEL SECURITY;

-- Policy (allow all for now)
CREATE POLICY "Allow all operations" ON census_demographics FOR ALL USING (true);

-- Useful view: Properties with demographics
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
    cd.storage_demand_score,
    cd.storage_demand_level,
    cd.key_factors_positive,
    cd.key_factors_negative,
    cd.fetched_at as demographics_fetched_at
FROM property_listings pl
LEFT JOIN property_details pd ON pl.listing_id = pd.listing_id AND pl.state_id = pd.state_id
LEFT JOIN census_demographics cd ON pl.listing_id = cd.listing_id AND pl.state_id = cd.state_id
WHERE pl.active_inactive = true;

COMMENT ON TABLE census_demographics IS 'US Census Bureau demographic data for property locations (3-mile radius)';
COMMENT ON COLUMN census_demographics.renter_percentage IS 'Percentage of renter-occupied housing units - KEY METRIC for storage demand';
COMMENT ON COLUMN census_demographics.storage_demand_score IS 'Calculated storage facility demand score (0-1), higher is better';
COMMENT ON COLUMN census_demographics.storage_demand_level IS 'Qualitative demand level: Excellent/Strong/Good/Fair/Weak';
