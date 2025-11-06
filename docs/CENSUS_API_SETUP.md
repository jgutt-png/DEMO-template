# Census API Integration Setup

## Overview

The Census API integration enriches property listings with demographic data from the US Census Bureau's American Community Survey (ACS). This data is critical for analyzing storage facility demand in each property's 3-mile radius.

## Files Created

### Backend Service
- `/backend/src/services/census/CensusAPI.js` - Census API client with demand scoring algorithm
- `/backend/src/routes/census.js` - Express routes for Census API endpoints

### Database
- `/migrations/002_census_demographics.sql` - Database schema for storing demographics
- `run-migration.js` - Migration runner script (provides instructions)

### Server Integration
- `server.js` - Updated to mount Census API routes at `/api/census`

## Database Migration

⚠️ **IMPORTANT:** Before using the Census API, you must create the `census_demographics` table.

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open `/migrations/002_census_demographics.sql`
6. Copy the entire contents
7. Paste into the SQL editor
8. Click **Run**

### Option 2: PostgreSQL CLI (if you have direct access)

```bash
# Get your connection string from Supabase dashboard
psql "postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres" -f migrations/002_census_demographics.sql
```

### Verify Migration

```bash
node run-migration.js
```

This will check if the table exists and provide instructions if not.

## Census API Key

Your Census API key is configured in `backend/src/routes/census.js`:

```javascript
const census = new CensusAPI('50076e92f117dd465e96d431111e6b3005f4a9b4');
```

**Security Note:** For production, move this to an environment variable:

```javascript
const census = new CensusAPI(process.env.CENSUS_API_KEY);
```

And add to `.env`:
```
CENSUS_API_KEY=50076e92f117dd465e96d431111e6b3005f4a9b4
```

## API Endpoints

### 1. Enrich Single Property

**Endpoint:** `POST /api/census/enrich/:listing_id/:state_id`

**Example:**
```bash
curl -X POST http://localhost:3000/api/census/enrich/31194820/13
```

**Optional Body:**
```json
{
  "radius_miles": 3
}
```

**Response:**
```json
{
  "success": true,
  "property": {
    "listing_id": "31194820",
    "state_id": "13"
  },
  "demographics": {
    "location": {
      "latitude": 41.559308,
      "longitude": -90.599889,
      "radius_miles": 3,
      "tract_name": "Census Tract 19163000300"
    },
    "population": {
      "total": 45230,
      "median_age": 38.5,
      "total_households": 18500,
      "population_density_per_sq_mile": 1598
    },
    "housing": {
      "renter_percentage": 42.5,
      "median_household_income": 68500,
      "vacancy_rate": 6.5
    },
    "storage_analysis": {
      "demand_score": 0.87,
      "demand_level": "Excellent",
      "key_factors": {
        "positive": [
          "Ideal renter percentage (42.5%) drives storage demand",
          "Target income range ($68K) for storage customers"
        ],
        "negative": [],
        "neutral": []
      }
    }
  },
  "summary": {
    "population": 45230,
    "renter_percentage": 42.5,
    "median_income": 68500,
    "demand_score": 0.87,
    "demand_level": "Excellent"
  }
}
```

### 2. Batch Enrich Properties

**Endpoint:** `POST /api/census/enrich-batch`

**Body:**
```json
{
  "state_code": "TX",
  "limit": 50,
  "radius_miles": 3
}
```

**Response:**
```json
{
  "success": true,
  "total": 50,
  "enriched": 48,
  "failed": 2,
  "errors": [
    {
      "listing_id": "123",
      "error": "No Census geography found for coordinates"
    }
  ]
}
```

### 3. Get Stored Demographics

**Endpoint:** `GET /api/census/property/:listing_id/:state_id`

**Example:**
```bash
curl http://localhost:3000/api/census/property/31194820/13
```

### 4. Get Statistics

**Endpoint:** `GET /api/census/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_enriched": 1250,
    "demand_distribution": {
      "excellent": 120,
      "strong": 380,
      "good": 450,
      "fair": 250,
      "weak": 50
    },
    "averages": {
      "demand_score": 0.68,
      "renter_percentage": 38.2,
      "median_income": 62400
    }
  }
}
```

## Storage Demand Scoring

The Census API calculates a storage demand score (0-1 scale) based on:

### Factors (Weights)

1. **Renter Percentage (35%)** - KEY METRIC
   - Sweet spot: 35-50%
   - Renters are primary storage facility customers

2. **Income Level (30%)**
   - Sweet spot: $50K-$100K
   - Can afford storage, likely need it

3. **Age Profile (20%)**
   - Sweet spot: 28-40 years
   - Young professionals, transient, families

4. **Population Density (10%)**
   - Sweet spot: 2,000-8,000 per sq mile
   - Urban enough for demand, not too dense

5. **Poverty Rate (5%)**
   - Lower is better
   - Inverse relationship with demand

### Demand Levels

- **Excellent:** 0.80+ score
- **Strong:** 0.65-0.79 score
- **Good:** 0.50-0.64 score
- **Fair:** 0.35-0.49 score
- **Weak:** 0-0.34 score

## Data Sources

### US Census Bureau APIs

1. **Geocoding API**
   - Converts lat/long to Census tract
   - Endpoint: `geocoding.geo.census.gov`
   - No API key required

2. **American Community Survey (ACS) 5-Year**
   - Most reliable for small areas
   - Dataset: `2022/acs/acs5`
   - 14 variables fetched per property

### Variables Fetched

```
B01003_001E - Total Population
B19013_001E - Median Household Income
B25003_001E - Total Occupied Housing Units
B25003_002E - Owner-Occupied Units
B25003_003E - Renter-Occupied Units (KEY!)
B25002_001E - Total Housing Units
B25002_003E - Vacant Units
B01002_001E - Median Age
B17001_002E - Below Poverty Level
B17001_001E - Total for Poverty Calculation
B23025_005E - Unemployed
B23025_003E - Total Labor Force
B11001_001E - Total Households
B25010_001E - Average Household Size
```

## Caching

The Census API service includes a 24-hour cache to reduce API calls and improve performance:

```javascript
this.cache = new Map();
this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
```

Census data doesn't change frequently, so 24-hour caching is safe.

## Rate Limiting

The batch endpoint processes properties in batches of 10 with a 1-second delay:

```javascript
const batchSize = 10;
// ... process batch ...
await new Promise(resolve => setTimeout(resolve, 1000));
```

Census Bureau API limits:
- 500 requests per IP per day (without key)
- 50,000 requests per IP per day (with key)

## Next Steps

1. ✅ Create census_demographics table (run migration)
2. ✅ Test single property enrichment
3. 🔲 Batch enrich all properties in target states
4. 🔲 Integrate demographics into property ranking algorithm
5. 🔲 Display demand scores in frontend UI

## Testing

```bash
# Start server
node server.js

# Test single property enrichment
curl -X POST http://localhost:3000/api/census/enrich/31194820/13

# Test batch enrichment (Texas properties)
curl -X POST http://localhost:3000/api/census/enrich-batch \
  -H "Content-Type: application/json" \
  -d '{"state_code": "TX", "limit": 10}'

# Check statistics
curl http://localhost:3000/api/census/stats
```

## Troubleshooting

### "Table census_demographics not found"

Run the database migration (see Database Migration section above).

### "No Census geography found for coordinates"

The property's lat/long might be invalid or outside the US. Check that latitude and longitude are populated in property_listings table.

### "Failed to fetch demographics"

Check Census API key is valid and request rate limits haven't been exceeded.

## Database Schema

The `census_demographics` table stores:

- **Location data:** lat, long, radius, Census tract
- **Population:** total, age, households, density
- **Housing:** renter %, owner %, vacancy rate (KEY METRICS)
- **Economic:** income, poverty, unemployment
- **Storage analysis:** demand score, demand level, key factors
- **Metadata:** data year, dataset, fetch timestamp

Primary key: `(listing_id, state_id)`

Foreign key: References `property_listings(listing_id, state_id)`

## Documentation

- Census API Docs: https://www.census.gov/data/developers/data-sets/acs-5year.html
- ACS Variables: https://api.census.gov/data/2022/acs/acs5/variables.html
- Geocoding API: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
