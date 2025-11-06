-- Property searches table
CREATE TABLE IF NOT EXISTS property_searches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address TEXT NOT NULL,
    formatted_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    search_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    property_data JSONB NOT NULL,
    user_id TEXT DEFAULT 'DEMO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster address lookups
CREATE INDEX IF NOT EXISTS idx_property_searches_address ON property_searches(address);
CREATE INDEX IF NOT EXISTS idx_property_searches_user_id ON property_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_property_searches_timestamp ON property_searches(search_timestamp DESC);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_property_searches_updated_at BEFORE UPDATE
    ON property_searches FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE property_searches ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations for authenticated users" ON property_searches
    FOR ALL USING (true);
