# Normalized Database Guide

## Overview

The Property Dashboard now uses a **normalized database structure** with separate tables for each data source (Zoneomics, ATTOM, Google APIs). This provides better data organization, query performance, and analytics capabilities.

## Database Architecture

### Master Table: `addresses`
Central table that stores validated property addresses and links all other data.

**Columns:**
- `id` (UUID) - Primary key
- `original_address` - User input address
- `formatted_address` - Google-validated address
- `street_address`, `city`, `state`, `zip_code` - Parsed components
- `latitude`, `longitude` - Coordinates
- `geocode_data` (JSONB) - Full geocode response
- `user_id` - User identifier (default: 'DEMO')
- `first_searched_at` - When first searched
- `last_searched_at` - Most recent search
- `search_count` - Number of times searched
- `created_at`, `updated_at` - Timestamps

### Related Tables (All linked via `address_id` foreign key)

#### 1. `street_view_data`
Stores Google Street View information
- `street_view_url` - Image URL
- `latitude`, `longitude` - View coordinates

#### 2. `zoning_data`
Stores Zoneomics zoning information
- `zone_code` - Zoning code (e.g., "R-1")
- `zone_name` - Full zone name
- `zone_type` - Zone category
- `zone_sub_type` - Subcategory
- `zone_guide` - Zoning guidelines text
- `city_name`, `state_name` - Location
- `link` - URL to full zoning code
- `last_updated` - Zoning data update date
- `raw_data` (JSONB) - Complete API response

#### 3. `property_details`
Stores ATTOM property characteristics
- `property_type` - Type (e.g., "Single Family")
- `property_sub_type` - Subtype
- `year_built` - Construction year
- `bedrooms`, `bathrooms_total` - Room counts
- `building_size`, `lot_size` - Square footage
- `stories` - Number of floors
- `pool_indicator` - Has pool?
- `parking_spaces` - Parking capacity
- `last_sale_date`, `last_sale_price` - Sale history
- `raw_data` (JSONB) - Complete API response

#### 4. `avm_valuations`
Stores ATTOM Automated Valuation Model data
- `avm_value` - Estimated value
- `avm_value_low`, `avm_value_high` - Value range
- `fsd_score` - Forecast Standard Deviation
- `confidence_score` - Valuation confidence
- `event_date` - Valuation date
- `raw_data` (JSONB) - Complete API response

#### 5. `tax_assessments`
Stores ATTOM tax assessment data
- `assessed_total_value` - Total assessed value
- `assessed_land_value` - Land value
- `assessed_improvement_value` - Building value
- `assessment_year` - Tax year
- `tax_amount` - Annual taxes
- `tax_year` - Tax period
- `raw_data` (JSONB) - Complete API response

#### 6. `home_equity`
Stores ATTOM home equity information
- `equity_percent` - Equity percentage
- `equity_amount` - Equity dollar amount
- `raw_data` (JSONB) - Complete API response

#### 7. `mortgages`
Stores ATTOM mortgage records (can have multiple per address)
- `loan_amount` - Mortgage amount
- `lender_name` - Lending institution
- `loan_type` - Type of loan
- `recording_date` - Date recorded
- `mortgage_term` - Loan term (months)
- `interest_rate` - Rate percentage
- `raw_data` (JSONB) - Complete API response

#### 8. `foreclosures`
Stores ATTOM foreclosure information
- `foreclosure_status` - Current status
- `foreclosure_date` - Date initiated
- `foreclosure_amount` - Amount owed
- `auction_date` - Scheduled auction
- `raw_data` (JSONB) - Complete API response

## Benefits of Normalized Structure

### 1. **Better Query Performance**
```sql
-- Find all properties with pools
SELECT a.formatted_address, pd.year_built, pd.pool_indicator
FROM addresses a
JOIN property_details pd ON a.id = pd.address_id
WHERE pd.pool_indicator = true;

-- Find properties by zoning type
SELECT a.formatted_address, z.zone_code, z.zone_type
FROM addresses a
JOIN zoning_data z ON a.id = z.address_id
WHERE z.zone_type = 'Residential';
```

### 2. **Data Integrity**
- Foreign key constraints ensure data consistency
- No duplicate data across searches
- Easier to update specific fields

### 3. **Analytics Capabilities**
```sql
-- Average AVM by city
SELECT a.city, AVG(av.avm_value) as avg_value
FROM addresses a
JOIN avm_valuations av ON a.id = av.address_id
GROUP BY a.city;

-- Properties searched multiple times
SELECT formatted_address, search_count
FROM addresses
WHERE search_count > 1
ORDER BY search_count DESC;
```

### 4. **Storage Efficiency**
- No redundant data storage
- Can update individual fields without touching entire record
- Raw JSON stored separately for reference

### 5. **Flexible Queries**
```sql
-- Complete property view (uses the built-in view)
SELECT * FROM complete_property_data WHERE city = 'Appleton';

-- Custom queries
SELECT a.formatted_address, pd.bedrooms, pd.bathrooms_total,
       av.avm_value, ta.assessed_total_value
FROM addresses a
LEFT JOIN property_details pd ON a.id = pd.address_id
LEFT JOIN avm_valuations av ON a.id = av.address_id
LEFT JOIN tax_assessments ta ON a.id = ta.address_id
WHERE a.city = 'Appleton'
AND pd.bedrooms >= 3;
```

## How Data Flows

### When a Property is Searched:

1. **Address Validation** (Google API)
   - Address validated and geocoded
   - Saved/updated in `addresses` table
   - Returns `address_id`

2. **Parallel Data Fetching**
   - All APIs called simultaneously
   - Street View URL generated

3. **Database Storage** (Parallel)
   - Each data source saved to its respective table
   - All linked to same `address_id`
   - Uses `upsert` to update existing data

4. **Response**
   - Aggregated data returned to frontend
   - Includes `address_id` for future reference

### When Loading Previous Search:

1. **Fetch by Address ID**
   - Single query to get address
   - Parallel queries to all related tables

2. **Data Reconstruction**
   - Raw JSON data retrieved from each table
   - Assembled into original format
   - Returned to frontend

## API Endpoints

### Save Property Search
```javascript
POST /api/property/search
// Automatically saves to all tables
```

### Get Search History
```javascript
GET /api/property/history?limit=10&user_id=DEMO
// Returns addresses with metadata
```

### Get Complete Property Data
```javascript
GET /api/property/:address_id
// Fetches from all tables and reconstructs
```

## Database Helper Functions

Located in `database-helpers.js`:

- `saveAddress()` - Save/update address
- `saveStreetView()` - Save street view data
- `saveZoningData()` - Save Zoneomics data
- `savePropertyDetails()` - Save ATTOM property details
- `saveMortgages()` - Save ATTOM mortgage records
- `saveAVMValuation()` - Save ATTOM AVM data
- `saveTaxAssessment()` - Save ATTOM tax data
- `saveHomeEquity()` - Save ATTOM equity data
- `saveForeclosureData()` - Save ATTOM foreclosure data
- `saveAllPropertyData()` - Master save function
- `getCompletePropertyData()` - Fetch and reconstruct all data
- `getSearchHistory()` - Get recent searches

## Example Queries

### View All Tables for an Address
```sql
-- Get address ID first
SELECT id FROM addresses WHERE formatted_address LIKE '%Appleton%' LIMIT 1;

-- Then query each table (replace with actual ID)
SELECT * FROM addresses WHERE id = 'your-uuid-here';
SELECT * FROM street_view_data WHERE address_id = 'your-uuid-here';
SELECT * FROM zoning_data WHERE address_id = 'your-uuid-here';
SELECT * FROM property_details WHERE address_id = 'your-uuid-here';
SELECT * FROM avm_valuations WHERE address_id = 'your-uuid-here';
SELECT * FROM tax_assessments WHERE address_id = 'your-uuid-here';
SELECT * FROM home_equity WHERE address_id = 'your-uuid-here';
SELECT * FROM mortgages WHERE address_id = 'your-uuid-here';
SELECT * FROM foreclosures WHERE address_id = 'your-uuid-here';
```

### Use the Complete View
```sql
-- Much easier - all data joined automatically
SELECT * FROM complete_property_data
WHERE formatted_address LIKE '%Appleton%';
```

### Analytics Examples
```sql
-- Properties by type
SELECT property_type, COUNT(*) as count
FROM property_details
GROUP BY property_type;

-- Zone code distribution
SELECT zone_code, COUNT(*) as count
FROM zoning_data
GROUP BY zone_code
ORDER BY count DESC;

-- Value vs Assessment comparison
SELECT
    a.formatted_address,
    av.avm_value as estimated_value,
    ta.assessed_total_value as assessed_value,
    (av.avm_value - ta.assessed_total_value) as difference
FROM addresses a
JOIN avm_valuations av ON a.id = av.address_id
JOIN tax_assessments ta ON a.id = ta.address_id
ORDER BY difference DESC;
```

## Viewing Data in Supabase Dashboard

1. Go to Table Editor:
   https://supabase.com/dashboard/project/your_supabase_project_ref_here/editor

2. Browse each table individually or use SQL Editor for complex queries

3. Use the `complete_property_data` view for a full picture

## Migration from Old Structure

The old `property_searches` table stored everything as JSONB. The new structure:

**Old:**
- 1 table with JSONB blob
- Hard to query specific fields
- Duplicate data for repeated searches

**New:**
- 9 normalized tables
- Easy field-level queries
- Efficient storage with relationships
- Better performance and analytics

## Performance Considerations

- **Indexes** on all foreign keys for fast joins
- **JSONB columns** retain full API responses
- **View** (`complete_property_data`) pre-joins all tables
- **Upsert** operations prevent duplicates
- **Parallel saves** for fast data insertion

## Files

- `supabase-normalized-schema.sql` - Complete schema definition
- `database-helpers.js` - Helper functions for data operations
- `server.js` - Updated to use normalized structure
- `create-tables.js` - Automated table creation script

---

**Your property dashboard now has enterprise-grade database architecture! 🎉**
