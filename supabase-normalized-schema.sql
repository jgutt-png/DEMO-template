-- ========================================
-- NORMALIZED SCHEMA FOR PROPERTY DASHBOARD
-- ========================================

-- 1. Main addresses table (master table)
CREATE TABLE IF NOT EXISTS addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_address TEXT NOT NULL,
    formatted_address TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geocode_data JSONB,
    user_id TEXT DEFAULT 'DEMO',
    first_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    search_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Google Street View data
CREATE TABLE IF NOT EXISTS street_view_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    street_view_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address_id)
);

-- 3. Zoneomics zoning data
CREATE TABLE IF NOT EXISTS zoning_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    zone_code TEXT,
    zone_name TEXT,
    zone_type TEXT,
    zone_sub_type TEXT,
    zone_guide TEXT,
    city_name TEXT,
    state_name TEXT,
    link TEXT,
    last_updated TIMESTAMP WITH TIME ZONE,
    raw_data JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address_id)
);

-- 4. ATTOM Property details
CREATE TABLE IF NOT EXISTS property_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    property_type TEXT,
    property_sub_type TEXT,
    year_built INTEGER,
    bedrooms INTEGER,
    bathrooms_total DECIMAL(4, 2),
    building_size INTEGER,
    lot_size INTEGER,
    stories INTEGER,
    pool_indicator BOOLEAN,
    parking_spaces INTEGER,
    last_sale_date DATE,
    last_sale_price DECIMAL(12, 2),
    raw_data JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address_id)
);

-- 5. ATTOM AVM Valuations
CREATE TABLE IF NOT EXISTS avm_valuations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    avm_value DECIMAL(12, 2),
    avm_value_low DECIMAL(12, 2),
    avm_value_high DECIMAL(12, 2),
    fsd_score DECIMAL(6, 2),
    confidence_score DECIMAL(5, 2),
    event_date DATE,
    raw_data JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address_id)
);

-- 6. ATTOM Tax assessments
CREATE TABLE IF NOT EXISTS tax_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    assessed_total_value DECIMAL(12, 2),
    assessed_land_value DECIMAL(12, 2),
    assessed_improvement_value DECIMAL(12, 2),
    assessment_year INTEGER,
    tax_amount DECIMAL(10, 2),
    tax_year INTEGER,
    raw_data JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address_id)
);

-- 7. ATTOM Home equity
CREATE TABLE IF NOT EXISTS home_equity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    equity_percent DECIMAL(5, 2),
    equity_amount DECIMAL(12, 2),
    raw_data JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address_id)
);

-- 8. ATTOM Mortgage data
CREATE TABLE IF NOT EXISTS mortgages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    loan_amount DECIMAL(12, 2),
    lender_name TEXT,
    loan_type TEXT,
    recording_date DATE,
    mortgage_term INTEGER,
    interest_rate DECIMAL(5, 3),
    raw_data JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ATTOM Foreclosure data
CREATE TABLE IF NOT EXISTS foreclosures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    foreclosure_status TEXT,
    foreclosure_date DATE,
    foreclosure_amount DECIMAL(12, 2),
    auction_date DATE,
    raw_data JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(address_id)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Addresses table indexes
CREATE INDEX IF NOT EXISTS idx_addresses_original ON addresses(original_address);
CREATE INDEX IF NOT EXISTS idx_addresses_formatted ON addresses(formatted_address);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_last_searched ON addresses(last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_addresses_city_state ON addresses(city, state);
CREATE INDEX IF NOT EXISTS idx_addresses_zip ON addresses(zip_code);

-- Foreign key indexes for joins
CREATE INDEX IF NOT EXISTS idx_street_view_address ON street_view_data(address_id);
CREATE INDEX IF NOT EXISTS idx_zoning_address ON zoning_data(address_id);
CREATE INDEX IF NOT EXISTS idx_property_details_address ON property_details(address_id);
CREATE INDEX IF NOT EXISTS idx_avm_address ON avm_valuations(address_id);
CREATE INDEX IF NOT EXISTS idx_tax_address ON tax_assessments(address_id);
CREATE INDEX IF NOT EXISTS idx_equity_address ON home_equity(address_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_address ON mortgages(address_id);
CREATE INDEX IF NOT EXISTS idx_foreclosures_address ON foreclosures(address_id);

-- Zoning specific indexes
CREATE INDEX IF NOT EXISTS idx_zoning_zone_code ON zoning_data(zone_code);
CREATE INDEX IF NOT EXISTS idx_zoning_zone_type ON zoning_data(zone_type);

-- Property specific indexes
CREATE INDEX IF NOT EXISTS idx_property_type ON property_details(property_type);
CREATE INDEX IF NOT EXISTS idx_property_year_built ON property_details(year_built);

-- AVM specific indexes
CREATE INDEX IF NOT EXISTS idx_avm_value ON avm_valuations(avm_value);

-- Tax specific indexes
CREATE INDEX IF NOT EXISTS idx_tax_year ON tax_assessments(tax_year);

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE
    ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_street_view_updated_at BEFORE UPDATE
    ON street_view_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoning_updated_at BEFORE UPDATE
    ON zoning_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_details_updated_at BEFORE UPDATE
    ON property_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avm_updated_at BEFORE UPDATE
    ON avm_valuations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_updated_at BEFORE UPDATE
    ON tax_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equity_updated_at BEFORE UPDATE
    ON home_equity FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mortgages_updated_at BEFORE UPDATE
    ON mortgages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foreclosures_updated_at BEFORE UPDATE
    ON foreclosures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE street_view_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE avm_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_equity ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgages ENABLE ROW LEVEL SECURITY;
ALTER TABLE foreclosures ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, can restrict later)
CREATE POLICY "Allow all operations" ON addresses FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON street_view_data FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON zoning_data FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON property_details FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON avm_valuations FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tax_assessments FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON home_equity FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON mortgages FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON foreclosures FOR ALL USING (true);

-- ========================================
-- USEFUL VIEWS
-- ========================================

-- Complete property view (joins all tables)
CREATE OR REPLACE VIEW complete_property_data AS
SELECT
    a.*,
    sv.street_view_url,
    z.zone_code, z.zone_name, z.zone_type, z.zone_guide,
    pd.property_type, pd.year_built, pd.bedrooms, pd.bathrooms_total,
    pd.building_size, pd.lot_size, pd.last_sale_price,
    av.avm_value, av.avm_value_low, av.avm_value_high, av.confidence_score,
    ta.assessed_total_value, ta.assessment_year,
    he.equity_percent, he.equity_amount,
    f.foreclosure_status
FROM addresses a
LEFT JOIN street_view_data sv ON a.id = sv.address_id
LEFT JOIN zoning_data z ON a.id = z.address_id
LEFT JOIN property_details pd ON a.id = pd.address_id
LEFT JOIN avm_valuations av ON a.id = av.address_id
LEFT JOIN tax_assessments ta ON a.id = ta.address_id
LEFT JOIN home_equity he ON a.id = he.address_id
LEFT JOIN foreclosures f ON a.id = f.address_id;
