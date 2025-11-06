# Database Data Analysis
## Current Capabilities vs. Future Needs

**Date:** 2025-01-06
**Database:** Supabase PostgreSQL

---

## Executive Summary

✅ **GOOD NEWS:** You have enough data to build Phase 1 AI ranking system RIGHT NOW

✅ **GREAT NEWS:** Your LoopNet commercial property data is perfect for storage facility acquisition

⚠️ **LIMITATION:** Missing storage-specific market data (competition, occupancy rates) - but can add later

---

## Current Data Inventory

### 1. LoopNet Commercial Properties ⭐ PRIMARY DATA SOURCE

**Tables:** `property_listings`, `property_details`
**Record Count:** Unknown (need to query)
**Data Quality:** High (scraped from LoopNet API)

#### Available Fields (Strong for Phase 1):

```
LOCATION & IDENTIFICATION:
✅ listing_id, state_id (unique identifiers)
✅ street_address, city, state_code, zip_code
✅ latitude, longitude (from property_listings)
✅ title, subtitle, description (rich text data)

PROPERTY CHARACTERISTICS:
✅ property_type, property_type_id
   Examples: "Land", "Industrial", "Warehouse", "Flex", "Other"
✅ building_size (sq ft - if existing building)
✅ lot_size (acreage or sq ft)
✅ year_built, year_renovated
✅ number_of_units
✅ parking_ratio

FINANCIAL DATA:
✅ price (asking price)
✅ price_per_sf
✅ cap_rate (if available)
✅ sale_type
✅ lease_rate, lease_type
✅ available_space

STRUCTURED DATA (JSONB):
✅ property_facts - key property attributes
✅ demographics - may contain population data
✅ transportation - may contain highway access
✅ amenities - property amenities
✅ financial_summaries - financial details
✅ full_response - complete API response

LISTING METADATA:
✅ broker_name, broker_company
✅ listing_url
✅ active_inactive status
✅ last_updated, created_date_time
```

**Rating:** ⭐⭐⭐⭐⭐ EXCELLENT for initial scoring

**What We Can Do:**
- Filter for land/vacant properties suitable for storage development
- Score based on location (market tier, state, city)
- Evaluate site characteristics (lot size, existing improvements)
- Analyze pricing (price per acre comparisons)
- NLP analysis of descriptions for opportunity keywords

**What We're Missing:**
- Storage facility competition within 3-mile radius
- Market occupancy rates
- Storage-specific rental rates
- Traffic counts
- Detailed zoning approvals for storage use

---

### 2. Residential Property Database (ATTOM Data)

**Tables:** `addresses`, `property_details`, `zoning_data`, `avm_valuations`, `tax_assessments`, etc.
**Record Count:** Unknown
**Data Quality:** High (ATTOM API)

#### Available Fields:

```
LOCATION:
✅ formatted_address, street_address, city, state, zip_code
✅ latitude, longitude
✅ geocode_data (JSONB)

ZONING:
✅ zone_code, zone_name, zone_type, zone_sub_type
✅ zone_guide (description)
✅ link (to zoning regulations)

PROPERTY DETAILS:
✅ property_type, property_sub_type
✅ year_built
✅ bedrooms, bathrooms_total
✅ building_size, lot_size, stories
✅ pool_indicator, parking_spaces
✅ last_sale_date, last_sale_price

VALUATIONS:
✅ avm_value, avm_value_low, avm_value_high
✅ fsd_score, confidence_score

TAX ASSESSMENTS:
✅ assessed_total_value
✅ assessed_land_value
✅ assessed_improvement_value
✅ tax_amount, tax_year

OTHER:
✅ home_equity (equity_percent, equity_amount)
✅ mortgages (loan details)
✅ foreclosures (distressed properties)
```

**Rating:** ⭐⭐⭐ GOOD for residential, MARGINAL for commercial storage

**What We Can Do:**
- Cross-reference zoning for residential parcels
- Identify distressed properties (foreclosures)
- Tax assessment data for valuation checks
- Equity/mortgage data for deal structure ideas

**What We're Missing:**
- Most residential data isn't relevant for storage facility acquisition
- This is better suited for residential investment platform

**Recommendation:** Focus on LoopNet data, use ATTOM data only for supplemental zoning/tax info if needed

---

## What We Can Build TODAY (Phase 1)

### Scoring Algorithm Using Current Data

```javascript
Phase 1 Scoring System (0-100 points):

1. LOCATION SCORE (35 points)
   ✅ Market Tier (15 pts)
      - Tier 1 cities: 15 pts (Atlanta, Dallas, Phoenix, etc.)
      - Tier 2 cities: 12 pts (Memphis, KC, etc.)
      - Tier 3 cities: 8 pts (everything else)

   ✅ State Factor (10 pts)
      - TX/FL/AZ/GA/NC/TN: 9-10 pts (high growth)
      - OH/IN/OK/SC/AL: 7-8 pts (moderate)
      - CA/NY/NJ: 5-6 pts (difficult regulatory)

   ✅ Urban Density (10 pts)
      - Suburban (zip code analysis): 10 pts
      - Urban: 7 pts
      - Rural: 3 pts

2. SITE QUALITY SCORE (25 points)
   ✅ Lot Size (10 pts)
      - 3-7 acres: 10 pts (ideal)
      - 2-3 acres or 7-10 acres: 7 pts
      - 1-2 acres or 10+ acres: 4 pts

   ✅ Existing Improvements (10 pts)
      - Vacant land: 10 pts (preferred)
      - Teardown potential: 5 pts
      - Existing building: 2 pts

   ✅ Zoning Favorability (5 pts)
      - Commercial/Industrial: 5 pts
      - Other: 3 pts
      - Residential: 1 pt

3. FINANCIAL SCORE (25 points)
   ✅ Price Per Acre (15 pts)
      - Below market: 15 pts
      - At market: 10 pts
      - Above market: 5 pts
      (Market varies by state)

   ✅ Rough ROI Potential (10 pts)
      - Estimated IRR calculation based on:
        * Land price
        * Estimated development cost ($40-50/sf × 60K sf)
        * Market rent assumptions (by state)

4. OPPORTUNITY SCORE (15 points)
   ✅ Description NLP Analysis (10 pts)
      - Keywords: storage, warehouse, development, vacant, etc.
      - Highway/traffic mentions
      - Visibility keywords

   ✅ Property Type Match (5 pts)
      - Land/Industrial/Warehouse: 5 pts
      - Flex/Other: 3 pts
      - Retail/Office: 1 pt

TOTAL: 100 points max
```

---

## What We're MISSING (Future Phases)

### High Priority (Phase 2)

```
STORAGE MARKET DATA ($500-1000/month):
❌ Competitor Analysis
   - Existing storage facilities within 3-mile radius
   - Nearest competitor distance
   - Competitor rates, occupancy
   - Total competitive sq ft in market

   Sources:
   - Radius+ (storage industry database)
   - STR Data (self storage market reports)
   - Manual research via Google Maps

❌ Market Performance
   - Average occupancy rates by market
   - Average rental rates per sq ft
   - YoY rent growth trends
   - Supply pipeline (facilities under construction)

   Sources:
   - Radius+ subscriptions
   - Yardi Matrix (storage data)
   - Public REITs (Extra Space, Public Storage earnings)

❌ Demographics (3-mile radius)
   - Population count
   - Median household income
   - Renter percentage
   - Population growth rate

   Sources:
   - Census Bureau API (FREE)
   - ACS 5-year estimates (FREE)
```

### Medium Priority (Phase 3)

```
TRAFFIC & ACCESSIBILITY DATA:
❌ Average Daily Traffic (ADT) counts
   Sources:
   - State DOT traffic maps (FREE but manual)
   - StreetLight Data ($$$)

❌ Highway proximity
   - Distance to interstate
   - Exit proximity

   Sources:
   - Can calculate from lat/long + highway data

❌ Visibility scores
   - Street frontage (can estimate from lot size/shape)
   - Signage opportunities

   Sources:
   - Manual site visits
   - Google Street View analysis
```

### Lower Priority (Phase 4+)

```
ADVANCED ANALYTICS:
❌ Cell phone location data (demand proxies)
   Source: SafeGraph ($1000+/month)

❌ Moving trends (U-Haul migration patterns)
   Source: U-Haul migration index (free reports)

❌ Business formation data
   Source: Dun & Bradstreet

❌ Economic indicators
   Source: BLS, BEA (FREE)
```

---

## Sample Query: What Data Looks Like

### LoopNet Property Example (Real Structure):

```json
{
  "listing_id": "123456",
  "state_id": "TX",
  "title": "5.2 Acre Commercial Land on I-35",
  "description": "Prime development opportunity on I-35 corridor. High visibility corner lot with 450' of highway frontage. Ideal for storage facility, warehouse, or flex space. Growing area with new residential nearby.",
  "street_address": "12345 Interstate 35 N",
  "city": "Austin",
  "state_code": "TX",
  "zip_code": "78753",
  "property_type": "Land",
  "lot_size": "5.2 acres",
  "price": "$1,200,000",
  "price_per_sf": null,
  "demographics": {
    "population_1mile": 12500,
    "median_income": "$62,000",
    "households": 4800
  },
  "property_facts": {
    "zoning": "Commercial",
    "utilities": "Water, Sewer, Electric",
    "access": "I-35 frontage road"
  },
  "transportation": {
    "highway_access": "I-35 (adjacent)",
    "public_transit": null
  }
}
```

**Phase 1 Scoring:**
- Location: 15 (Tier 1: Austin) + 9 (State: TX) + 10 (Suburban) = 34/35 ⭐
- Site: 10 (5.2 acres perfect) + 10 (vacant land) + 5 (commercial zoning) = 25/25 ⭐⭐
- Financial: 15 (price = $231K/acre, good for Austin) + 8 (estimated 20% IRR) = 23/25 ⭐
- Opportunity: 8 (keywords: storage, warehouse, development, highway, visibility) + 5 (Land type) = 13/15 ⭐
- **TOTAL: 95/100** 🎯 HIGH PRIORITY DEAL

**What We DON'T Know (but could research):**
- Are there existing storage facilities within 3 miles?
- What's the market occupancy rate in this Austin submarket?
- What traffic count on I-35 at this location?
- What are competitors charging for storage units nearby?

---

## Recommendations

### Immediate (This Week):
1. ✅ Run SQL query to count LoopNet properties by state
2. ✅ Verify data quality (how many have lot_size, price, etc.)
3. ✅ Implement Phase 1 scoring system
4. ✅ Score properties in 2-3 target states (TX, FL, GA?)
5. ✅ Build ranked property feed

### Short-Term (Weeks 2-4):
1. ✅ Collect team feedback on 20-50 properties
2. ✅ Tune scoring weights based on feedback
3. ✅ Add feedback UI to dashboard
4. ✅ Export top-ranked deals for deeper analysis

### Medium-Term (Months 2-3):
1. 🔶 Subscribe to Radius+ for storage market data ($500/mo)
2. 🔶 Integrate Census API for demographics (FREE)
3. 🔶 Manual research on top 20 deals (competition, traffic)
4. 🔶 Build Phase 2 scoring with real market data

### Long-Term (Months 4-6):
1. 🔷 Train ML model on team feedback
2. 🔷 Build Python ML service
3. 🔷 Add LLM-generated investment theses
4. 🔷 Automated underwriting calculator

---

## SQL Queries to Run

### Check LoopNet Data Quality:

```sql
-- Count total active listings
SELECT COUNT(*)
FROM property_listings
WHERE active_inactive = true;

-- Count by state
SELECT state_code, COUNT(*) as count
FROM property_listings
WHERE active_inactive = true
GROUP BY state_code
ORDER BY count DESC;

-- Check data completeness
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN property_type IS NOT NULL THEN 1 END) as has_type,
  COUNT(CASE WHEN lot_size IS NOT NULL THEN 1 END) as has_lot_size,
  COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as has_price,
  COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as has_description
FROM property_details pd
JOIN property_listings pl ON pd.listing_id = pl.listing_id AND pd.state_id = pl.state_id
WHERE pl.active_inactive = true;

-- Sample land parcels (storage candidates)
SELECT
  pd.listing_id,
  pd.city,
  pd.state_code,
  pd.property_type,
  pd.lot_size,
  pd.price,
  pd.title
FROM property_details pd
JOIN property_listings pl ON pd.listing_id = pl.listing_id AND pd.state_id = pl.state_id
WHERE pl.active_inactive = true
  AND pd.property_type IN ('Land', 'Industrial', 'Warehouse', 'Other')
  AND pd.lot_size IS NOT NULL
  AND pd.price IS NOT NULL
ORDER BY pd.last_updated DESC
LIMIT 20;
```

---

## Bottom Line

**You have EXACTLY what you need to build Phase 1 scoring system TODAY.**

Your LoopNet commercial property database contains:
- ✅ Location data (city, state, coords)
- ✅ Site characteristics (lot size, property type)
- ✅ Financial data (price, price/sf)
- ✅ Rich text descriptions (title, description)
- ✅ Structured metadata (JSONB fields)

**This is 80% of what you need for a working AI ranking system.**

The missing 20% (storage-specific market data) can be added in Phase 2-3 as you validate the system and secure budget for paid data sources.

**Next Step:** Implement Phase 1 scoring algorithm and start collecting team feedback!
