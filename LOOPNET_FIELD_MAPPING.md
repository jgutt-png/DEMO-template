# LoopNet Field Mapping Strategy

## Executive Summary

This document provides a comprehensive mapping strategy for extracting data from the `full_response` JSONB column and populating structured columns in the `property_details` table.

### Key Findings

- **Total Records**: 31,431 LoopNet property records
- **Data Structure Variations**: 2 main patterns identified
  - **Pattern A (60%)**: Data wrapped in `data` array - `full_response.data[0].*`
  - **Pattern B (40%)**: Data at root level - `full_response.*`
- **Fill Rate**: Most columns are 0-50% filled, but all data exists in `full_response`

---

## Data Structure Overview

### Pattern A: Wrapped Response (Most Common)
```json
{
  "status": "success",
  "message": "Property details retrieved",
  "data": [
    {
      "title": "Property Name",
      "address": "123 Main St",
      "saleSummary": {...},
      "broker": {...},
      ...
    }
  ]
}
```

### Pattern B: Direct Response
```json
{
  "title": "Property Name",
  "address": "123 Main St",
  "saleSummary": {...},
  "broker": {...},
  ...
}
```

---

## Complete Field Mapping Table

### Basic Information

| Database Column | Primary Path | Fallback Path | Data Type | Transformation | Notes |
|----------------|--------------|---------------|-----------|----------------|-------|
| `title` | `data[0].title` | `title` | string | None | Property listing title |
| `subtitle` | `data[0].subtitle` | `subtitle` | string | None | Property tagline/subtitle |
| `description` | `data[0].description` | `description` | text | Clean HTML/newlines | Long property description |

**Extraction Logic:**
```javascript
// Always try data[0] first, then root level
const listing = fullResponse.data?.[0] || fullResponse;
const title = listing.title || null;
```

---

### Location Details

| Database Column | Primary Path | Fallback Path | Additional Sources | Transformation | Notes |
|----------------|--------------|---------------|-------------------|----------------|-------|
| `street_address` | `data[0].address` | `address` | - | Trim whitespace | Full street address |
| `city` | Extract from `location` | `brokersDetails[0].city` | - | Extract from "in City, ST" format | May need parsing |
| `state_code` | Extract from `location` | `brokersDetails[0].sc` | `saleSummary.state` | Extract 2-letter code | Multiple possible sources |
| `zip_code` | `saleSummary.zipCode` | `saleSummary.zip` | Parse from address | Extract digits only | May be embedded in address |
| `country_code` | `data[0].countryCode` | `countryCode` | Default: "US" | Uppercase | Default to US if missing |

**Extraction Logic:**
```javascript
const listing = fullResponse.data?.[0] || fullResponse;

// Address - straightforward
const street_address = listing.address || null;

// City/State - parse from location field
const location = listing.location || ''; // e.g., "in Topeka, KS"
const locationMatch = location.match(/in\s+([^,]+),\s+([A-Z]{2})/);
const city = locationMatch?.[1] || listing.brokersDetails?.[0]?.city || null;
const state_code = locationMatch?.[2] || listing.brokersDetails?.[0]?.sc || null;

// Zip code - multiple sources
const zip_code = listing.saleSummary?.zipCode ||
                 listing.saleSummary?.zip ||
                 listing.address?.match(/\b\d{5}\b/)?.[0] ||
                 null;

// Country
const country_code = (listing.countryCode || 'US').toUpperCase();
```

---

### Property Characteristics

| Database Column | Primary Path | Fallback Path | Data Type | Transformation | Notes |
|----------------|--------------|---------------|-----------|----------------|-------|
| `property_type` | `saleSummary.propertyType` | `propertyFacts.propertyType` | string | None | e.g., "Land", "Office", "Retail" |
| `property_type_id` | `saleSummary.propertyTypeId` | - | integer | Parse int | Numeric property type code |
| `building_size` | `saleSummary.buildingSize` | `propertyFacts.buildingSize` | string | Keep as string | e.g., "10,000 SF" |
| `lot_size` | `saleSummary.lotSize` | `leaseSummary.lotSize` | string | Keep as string | e.g., "0.26 AC", "1.5 acres" |
| `year_built` | `saleSummary.yearBuilt` | `propertyFacts.yearBuilt` | integer | Parse int | 4-digit year |
| `year_renovated` | `saleSummary.yearRenovated` | - | integer | Parse int | 4-digit year |
| `number_of_units` | `saleSummary.numberOfUnits` | - | integer | Parse int | Residential/multi-unit count |
| `parking_ratio` | `saleSummary.parkingRatio` | `leaseSummary.parkingRatio` | string | Keep as string | e.g., "4.0/1,000 SF" |

**Extraction Logic:**
```javascript
const listing = fullResponse.data?.[0] || fullResponse;
const saleSummary = listing.saleSummary || {};
const leaseSummary = listing.leaseSummary || {};
const propertyFacts = listing.propertyFacts || {};

const property_type = saleSummary.propertyType || propertyFacts.propertyType || null;
const property_type_id = saleSummary.propertyTypeId ? parseInt(saleSummary.propertyTypeId) : null;
const building_size = saleSummary.buildingSize || propertyFacts.buildingSize || null;
const lot_size = saleSummary.lotSize || leaseSummary.lotSize || propertyFacts.landAcres || null;
const year_built = saleSummary.yearBuilt ? parseInt(saleSummary.yearBuilt) :
                   propertyFacts.yearBuilt ? parseInt(propertyFacts.yearBuilt) : null;
const year_renovated = saleSummary.yearRenovated ? parseInt(saleSummary.yearRenovated) : null;
const number_of_units = saleSummary.numberOfUnits ? parseInt(saleSummary.numberOfUnits) : null;
const parking_ratio = saleSummary.parkingRatio || leaseSummary.parkingRatio || null;
```

---

### Financial Information

| Database Column | Primary Path | Fallback Path | Additional Sources | Transformation | Notes |
|----------------|--------------|---------------|-------------------|----------------|-------|
| `price` | `saleSummary.price` | `propertyFacts.price` | `saleSummary.lots[0].price` | Keep as string | e.g., "$95K", "$1.2M" |
| `price_per_sf` | `saleSummary.pricePerSquareFoot` | `propertyFacts.pricePerSF` | - | Keep as string | Price per square foot |
| `cap_rate` | `saleSummary.capRate` | `propertyFacts.capRate` | - | Keep as string | Capitalization rate |
| `sale_type` | `saleSummary.saleType` | `propertyFacts.saleType` | - | None | e.g., "Investment", "Owner User" |
| `lease_rate` | `leaseSummary.rentalRate` | `leaseSummary.leaseRate` | - | Keep as string | Monthly/annual lease rate |
| `lease_type` | `leaseSummary.leaseType` | - | - | None | Type of lease agreement |
| `available_space` | `leaseSummary.totalSpaceAvailable` | `spaces` | - | Keep as string | Available leasable space |

**Extraction Logic:**
```javascript
const listing = fullResponse.data?.[0] || fullResponse;
const saleSummary = listing.saleSummary || {};
const leaseSummary = listing.leaseSummary || {};
const propertyFacts = listing.propertyFacts || {};

// Price - multiple fallbacks
const price = saleSummary.price ||
              propertyFacts.price ||
              saleSummary.lots?.[0]?.price ||
              null;

const price_per_sf = saleSummary.pricePerSquareFoot ||
                     propertyFacts.pricePerSF ||
                     null;

const cap_rate = saleSummary.capRate ||
                 propertyFacts.capRate ||
                 null;

const sale_type = saleSummary.saleType ||
                  propertyFacts.saleType ||
                  null;

// Lease information
const lease_rate = leaseSummary.rentalRate ||
                   leaseSummary.leaseRate ||
                   null;

const lease_type = leaseSummary.leaseType || null;

const available_space = leaseSummary.totalSpaceAvailable ||
                        (listing.spaces ? JSON.stringify(listing.spaces) : null) ||
                        null;
```

---

### Broker & Listing Information

| Database Column | Primary Path | Fallback Path | Data Type | Transformation | Notes |
|----------------|--------------|---------------|-----------|----------------|-------|
| `broker_name` | `broker.name` | `brokersDetails[0].name` | string | None | Primary broker name |
| `broker_company` | `broker.company` | `brokersDetails[0].company` | string | None | Brokerage firm name |
| `listing_url` | `listingUrl` | `ownerUrl` | text | Build from listing ID | May need to construct |
| `ad_package` | `adPackage` | - | string | None | Premium listing level |
| `listing_type` | `listingType` | - | string | None | e.g., "land for sale", "for lease" |
| `sale_status_code` | `saleSummary.saleStatusCode` | - | integer | Parse int | 1=Active, 2=Pending, etc. |

**Extraction Logic:**
```javascript
const listing = fullResponse.data?.[0] || fullResponse;
const broker = listing.broker || {};
const brokersDetails = listing.brokersDetails || [];
const saleSummary = listing.saleSummary || {};

const broker_name = broker.name || brokersDetails[0]?.name || null;
const broker_company = broker.company || brokersDetails[0]?.company || null;

// Construct listing URL if not provided
const listingId = listing.listingId || listingId;
const listing_url = listing.listingUrl ||
                    listing.ownerUrl ||
                    (listingId ? `https://www.loopnet.com/Listing/${listingId}/` : null);

const ad_package = listing.adPackage || null;
const listing_type = listing.listingType || null;
const sale_status_code = saleSummary.saleStatusCode ?
                         parseInt(saleSummary.saleStatusCode) : null;
```

---

### Images

| Database Column | Primary Path | Fallback Path | Transformation | Notes |
|----------------|--------------|---------------|----------------|-------|
| `images_count` | `carousel.length` | Count images array | Parse int | Total number of images |
| `primary_image_url` | `carousel[0].url` | `primaryImageUrl` | None | First image in carousel |

**Extraction Logic:**
```javascript
const listing = fullResponse.data?.[0] || fullResponse;
const carousel = listing.carousel || [];

const images_count = Array.isArray(carousel) ? carousel.length : 0;
const primary_image_url = carousel[0]?.url ||
                          listing.primaryImageUrl ||
                          null;
```

---

### JSONB Fields (Store Complete Objects)

These fields store complete nested objects/arrays as JSONB for future querying:

| Database Column | Primary Path | Fallback Path | Notes |
|----------------|--------------|---------------|-------|
| `sale_summary` | `saleSummary` | - | Complete sale details object |
| `lease_summary` | `leaseSummary` | - | Complete lease details object |
| `property_facts` | `propertyFacts` | - | Key property facts and features |
| `carousel` | `carousel` | - | Array of image objects |
| `highlights` | `highlights` | - | Array of property highlights |
| `amenities` | `amenities` | - | Property amenities object/array |
| `unit_mix_info` | `unitMixInfo` | - | Unit mix breakdown |
| `units` | `units` | - | Individual unit details array |
| `tenant` | `tenant` | - | Tenant information |
| `broker_details` | `brokersDetails` | `broker` | Complete broker information |
| `demographics` | `demographics` | - | Area demographics data |
| `transportation` | `transportation` | - | Transportation access info |
| `nearby_amenities` | `nearbyAmenities` | - | Nearby points of interest |
| `financial_summaries` | `finAndTaxSummaries` | - | Financial statements |
| `portfolio_summary` | `portfolioSummary` | - | Portfolio details if applicable |
| `attachments` | `attachments` | - | Marketing materials/documents |

**Extraction Logic:**
```javascript
const listing = fullResponse.data?.[0] || fullResponse;

// Store complete objects, filtering out null/empty
const sale_summary = listing.saleSummary || null;
const lease_summary = listing.leaseSummary || null;
const property_facts = listing.propertyFacts || null;
const carousel = listing.carousel && listing.carousel.length > 0 ? listing.carousel : null;
const highlights = listing.highlights && listing.highlights.length > 0 ? listing.highlights : null;
const amenities = listing.amenities || null;
const unit_mix_info = listing.unitMixInfo || null;
const units = listing.units || null;
const tenant = listing.tenant || null;
const broker_details = listing.brokersDetails || listing.broker || null;
const demographics = listing.demographics || null;
const transportation = listing.transportation || null;
const nearby_amenities = listing.nearbyAmenities || null;
const financial_summaries = listing.finAndTaxSummaries || null;
const portfolio_summary = listing.portfolioSummary || null;
const attachments = listing.attachments || null;
```

---

## Edge Cases & Data Quality Issues

### 1. Missing Location Data

**Issue**: City and state are often embedded in the `location` field as free text.

**Example**: `"location": "in Topeka, KS"`

**Solution**:
```javascript
function extractCityState(location) {
    // Pattern: "in City, ST" or "City, ST"
    const match = location?.match(/(?:in\s+)?([^,]+),\s*([A-Z]{2})\b/i);
    if (match) {
        return {
            city: match[1].trim(),
            state: match[2].toUpperCase()
        };
    }
    return { city: null, state: null };
}
```

### 2. Inconsistent Number Formats

**Issue**: Numbers stored as strings with formatting: "$1.2M", "10,000 SF", "0.26 AC"

**Solution**: Store as-is (VARCHAR) to preserve original formatting. Create computed columns if numerical operations needed.

### 3. Multiple Broker Contacts

**Issue**: `brokersDetails` is an array, but we only have single broker columns.

**Solution**:
- Store primary broker (index 0) in `broker_name` and `broker_company`
- Store complete array in `broker_details` JSONB for full access

### 4. Wrapped vs Direct Response Structure

**Issue**: 60% of records have `data` array wrapper, 40% don't.

**Solution**:
```javascript
function getListingData(fullResponse) {
    // Try data array first, fall back to root
    return fullResponse.data?.[0] || fullResponse;
}
```

### 5. Empty vs Null JSONB Objects

**Issue**: Some objects are empty `{}` or have all null values.

**Solution**:
```javascript
function cleanJsonbObject(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // If array, check if empty
    if (Array.isArray(obj)) {
        return obj.length > 0 ? obj : null;
    }

    // If object, check if all values are null
    const values = Object.values(obj);
    const hasNonNullValue = values.some(v => v !== null && v !== undefined && v !== '');

    return hasNonNullValue ? obj : null;
}
```

### 6. HTML in Description Fields

**Issue**: Some descriptions contain HTML tags or excessive newlines.

**Solution**:
```javascript
function cleanDescription(text) {
    if (!text) return null;

    return text
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
        .trim();
}
```

---

## Data Transformation Rules

### String Fields
- Trim whitespace
- Convert empty strings to NULL
- Remove HTML tags from descriptions
- Preserve original formatting for display (e.g., "$1.2M", "10,000 SF")

### Numeric Fields
- Parse integers carefully (handle null/undefined)
- Don't parse formatted numbers (keep as strings)
- Validate year ranges (1800-2100)

### JSONB Fields
- Filter out empty objects `{}`
- Filter out empty arrays `[]`
- Filter out objects with all null values
- Preserve structure for future querying

### URL Fields
- Validate URL format
- Construct LoopNet URLs if listing ID available
- Handle relative vs absolute paths

---

## Validation Rules

### Required Fields (Should Not Be Null)
- `title` - Every listing should have a title
- `listing_type` - Should indicate sale/lease
- `property_type` - Should specify property category

### Recommended Fields (Warn If Missing)
- `street_address` - Critical for mapping
- `price` or `lease_rate` - Financial info expected
- `broker_name` - Contact information important
- `images_count` - Listings should have photos

### Optional Fields
- Most other fields may legitimately be null depending on listing type

---

## Migration Strategy

### Phase 1: Test Migration (Recommended)
```bash
# Test on small sample first
node scripts/smart-loopnet-migration.js --limit 100 --dry-run
```

### Phase 2: Incremental Migration
```bash
# Process in batches of 500
node scripts/smart-loopnet-migration.js --batch-size 500
```

### Phase 3: Validation
```bash
# Run validation query
node scripts/validate-migration.js
```

### Phase 4: Full Migration
```bash
# Process all 31,431 records
node scripts/smart-loopnet-migration.js --batch-size 1000
```

---

## Performance Considerations

### Batch Size
- **Recommended**: 500-1000 records per batch
- **Too small** (< 100): Slow due to overhead
- **Too large** (> 2000): Risk of timeout/memory issues

### Indexing
Ensure these indexes exist before migration:
```sql
CREATE INDEX IF NOT EXISTS idx_property_details_fetch_status
    ON property_details(fetch_status);

CREATE INDEX IF NOT EXISTS idx_property_details_full_response_gin
    ON property_details USING GIN (full_response);
```

### Error Handling
- Log all errors with listing_id and state_id
- Continue processing on individual record failures
- Generate error summary report at end

---

## SQL Validation Queries

### Check Fill Rates After Migration
```sql
SELECT
    COUNT(*) as total_records,
    COUNT(title) as has_title,
    COUNT(street_address) as has_address,
    COUNT(property_type) as has_property_type,
    COUNT(price) as has_price,
    COUNT(broker_name) as has_broker,
    COUNT(carousel) as has_images,
    ROUND(100.0 * COUNT(title) / COUNT(*), 2) as title_fill_rate,
    ROUND(100.0 * COUNT(street_address) / COUNT(*), 2) as address_fill_rate,
    ROUND(100.0 * COUNT(property_type) / COUNT(*), 2) as property_type_fill_rate,
    ROUND(100.0 * COUNT(price) / COUNT(*), 2) as price_fill_rate
FROM property_details
WHERE full_response IS NOT NULL;
```

### Identify Problem Records
```sql
-- Records with full_response but no extracted data
SELECT listing_id, state_id, fetch_status
FROM property_details
WHERE full_response IS NOT NULL
  AND title IS NULL
  AND description IS NULL
  AND property_type IS NULL
LIMIT 20;
```

### Verify Data Structure Patterns
```sql
-- Check for data array wrapper
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE full_response ? 'data') as has_data_array,
    COUNT(*) FILTER (WHERE full_response ? 'title') as has_direct_title
FROM property_details
WHERE full_response IS NOT NULL;
```

---

## Known Issues & Solutions

### Issue 1: City/State Parsing Failures
**Symptom**: `city` and `state_code` remain NULL after migration

**Causes**:
- Non-standard location format
- International listings (Canada, etc.)
- Location field missing

**Solutions**:
- Fallback to broker location
- Parse from address field
- Manual review for international properties

### Issue 2: Duplicate Broker Information
**Symptom**: Multiple brokers listed, unclear which is primary

**Solution**: Always use index [0] as primary, store all in `broker_details` JSONB

### Issue 3: Inconsistent Property Type Values
**Symptom**: Various formats: "Office", "Office Building", "Office/Flex"

**Solution**:
- Store original value in `property_type`
- Use `property_type_id` for standardized categorization
- Create mapping table if needed

---

## Future Enhancements

### 1. Normalized Property Types
Create lookup table for standardized property types:
```sql
CREATE TABLE property_type_lookup (
    type_id INT PRIMARY KEY,
    type_name VARCHAR(100),
    category VARCHAR(50),
    description TEXT
);
```

### 2. Parsed Financial Fields
Add computed columns for numerical operations:
```sql
ALTER TABLE property_details
ADD COLUMN price_numeric DECIMAL,
ADD COLUMN building_size_sf INTEGER,
ADD COLUMN lot_size_acres DECIMAL;
```

### 3. Geocoding Enhancement
Use address data to update `property_listings` coordinates:
```sql
UPDATE property_listings pl
SET latitude = geocoded.lat,
    longitude = geocoded.lng
FROM geocoded_addresses geocoded
WHERE pl.listing_id = geocoded.listing_id;
```

### 4. Full-Text Search
Enable full-text search on key fields:
```sql
ALTER TABLE property_details
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    to_tsvector('english',
        COALESCE(title, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(street_address, '') || ' ' ||
        COALESCE(city, '')
    )
) STORED;

CREATE INDEX idx_property_details_search
ON property_details USING GIN (search_vector);
```

---

## Migration Checklist

- [ ] Backup database before migration
- [ ] Run analysis script to understand current state
- [ ] Review sample records manually
- [ ] Test migration on 100 records
- [ ] Validate test results
- [ ] Run full migration in batches
- [ ] Check fill rates after migration
- [ ] Review error logs
- [ ] Run validation queries
- [ ] Update application code to use new columns
- [ ] Monitor application performance
- [ ] Create database indexes if needed
- [ ] Document any anomalies found

---

## Support & Troubleshooting

### Debug Individual Record
```javascript
// In Node.js console or script
const { supabase } = require('./supabase-config');

async function debugRecord(listingId, stateId) {
    const { data } = await supabase
        .from('property_details')
        .select('full_response')
        .eq('listing_id', listingId)
        .eq('state_id', stateId)
        .single();

    console.log(JSON.stringify(data.full_response, null, 2));
}

debugRecord('10794955', 'KS');
```

### Common Error Messages

**"Cannot read property 'data' of null"**
- Cause: full_response is null or malformed
- Solution: Check fetch_status and fetch_error fields

**"Duplicate key value violates unique constraint"**
- Cause: Trying to insert duplicate listing_id/state_id
- Solution: Use UPDATE instead of INSERT, or UPSERT

**"Invalid input syntax for type integer"**
- Cause: Trying to parse non-numeric string
- Solution: Add type validation before parseInt()

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-06 | 1.0 | Initial field mapping documentation | Analysis Script |

---

## Appendix: Complete Sample Record

See `/scripts/sample-full-response.json` for a complete example of the full_response structure.

### Quick Reference: Most Important Paths

```javascript
// Always start with this
const listing = fullResponse.data?.[0] || fullResponse;

// Then extract
const title = listing.title;
const address = listing.address;
const description = listing.description;
const propertyType = listing.saleSummary?.propertyType;
const price = listing.saleSummary?.price;
const brokerName = listing.broker?.name || listing.brokersDetails?.[0]?.name;
const images = listing.carousel;
```
