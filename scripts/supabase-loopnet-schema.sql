-- LoopNet Tables Schema for Supabase
-- This creates exact replicas of Aurora PostgreSQL tables

-- Table 1: property_listings
-- Stores basic property listing information from LoopNet API
CREATE TABLE IF NOT EXISTS property_listings (
    listing_id VARCHAR(50) NOT NULL,
    state_id VARCHAR(10) NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    state_code CHAR(2),
    last_scraped_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    active_inactive BOOLEAN DEFAULT true,
    last_checked TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_date_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    date_time_inactive TIMESTAMPTZ,

    PRIMARY KEY (listing_id, state_id)
);

-- Create index for active listings
CREATE INDEX IF NOT EXISTS idx_property_listings_active
ON property_listings(active_inactive)
WHERE active_inactive = true;

-- Create index for state lookups
CREATE INDEX IF NOT EXISTS idx_property_listings_state
ON property_listings(state_code);

-- Create index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_property_listings_location
ON property_listings(latitude, longitude);


-- Table 2: property_details
-- Stores comprehensive property information from LoopNet ExtendedDetails API
CREATE TABLE IF NOT EXISTS property_details (
    listing_id VARCHAR(50) NOT NULL,
    state_id VARCHAR(10) NOT NULL,

    -- Basic Information
    title TEXT,
    subtitle TEXT,
    description TEXT,

    -- Location Details
    street_address VARCHAR(255),
    city VARCHAR(100),
    state_code VARCHAR(50),
    zip_code VARCHAR(20),
    country_code VARCHAR(10),

    -- Property Characteristics
    property_type VARCHAR(100),
    property_type_id INTEGER,
    building_size VARCHAR(50),
    lot_size VARCHAR(50),
    year_built INTEGER,
    year_renovated INTEGER,
    number_of_units INTEGER,
    parking_ratio VARCHAR(50),

    -- Financial Information
    price VARCHAR(50),
    price_per_sf VARCHAR(50),
    cap_rate VARCHAR(20),
    sale_type VARCHAR(100),
    lease_rate VARCHAR(50),
    lease_type VARCHAR(100),
    available_space VARCHAR(50),

    -- Broker & Listing Information
    broker_name VARCHAR(255),
    broker_company VARCHAR(255),
    listing_url TEXT,
    ad_package VARCHAR(50),
    listing_type VARCHAR(100),
    sale_status_code INTEGER,

    -- Images
    images_count INTEGER,
    primary_image_url TEXT,

    -- JSONB Fields (Structured Data)
    raw_data JSONB,
    full_response JSONB,
    sale_summary JSONB,
    lease_summary JSONB,
    property_facts JSONB,
    carousel JSONB,
    highlights JSONB,
    amenities JSONB,
    unit_mix_info JSONB,
    units JSONB,
    tenant JSONB,
    broker_details JSONB,
    demographics JSONB,
    transportation JSONB,
    nearby_amenities JSONB,
    financial_summaries JSONB,
    portfolio_summary JSONB,
    attachments JSONB,

    -- Tracking & Metadata
    fetch_status VARCHAR(20),
    fetch_attempts INTEGER,
    fetch_error TEXT,
    last_fetched TIMESTAMP,
    details_fetched_at TIMESTAMP,
    details_last_updated TIMESTAMP,
    active_inactive BOOLEAN,
    date_time_inactive TIMESTAMPTZ,
    created_date_time TIMESTAMPTZ,
    created_at TIMESTAMP,
    last_updated DATE,

    PRIMARY KEY (listing_id, state_id),
    FOREIGN KEY (listing_id, state_id)
        REFERENCES property_listings(listing_id, state_id)
        ON DELETE CASCADE
);

-- Create indexes for property_details
-- Note: Creating indexes after table is fully defined
CREATE INDEX IF NOT EXISTS idx_property_details_fetch_status ON property_details(fetch_status);
CREATE INDEX IF NOT EXISTS idx_property_details_property_type ON property_details(property_type);
CREATE INDEX IF NOT EXISTS idx_property_details_city ON property_details(city);
CREATE INDEX IF NOT EXISTS idx_property_details_active ON property_details(active_inactive) WHERE active_inactive = true;
CREATE INDEX IF NOT EXISTS idx_property_details_raw_data_gin ON property_details USING GIN (raw_data);
CREATE INDEX IF NOT EXISTS idx_property_details_property_facts_gin ON property_details USING GIN (property_facts);

-- Comments for documentation
COMMENT ON TABLE property_listings IS 'Basic LoopNet property listings scraped from search API';
COMMENT ON TABLE property_details IS 'Detailed LoopNet property information from ExtendedDetails API';

COMMENT ON COLUMN property_listings.listing_id IS 'Unique identifier from LoopNet API';
COMMENT ON COLUMN property_listings.state_id IS 'State identifier from LoopNet API';
COMMENT ON COLUMN property_listings.active_inactive IS 'Whether listing is currently active on LoopNet';

COMMENT ON COLUMN property_details.fetch_status IS 'Status: pending, success, error, or invalid';
COMMENT ON COLUMN property_details.raw_data IS 'Complete API response from LoopNet ExtendedDetails';
COMMENT ON COLUMN property_details.property_facts IS 'Key property facts and features from API';
