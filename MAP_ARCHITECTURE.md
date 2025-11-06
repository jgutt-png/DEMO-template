# Property Map Architecture - Complete Design

## Executive Summary

This document defines the complete architecture for a Zillow-style map-based property browsing interface. The system handles 24,000+ properties with geospatial queries, clustering, filtering, and real-time synchronization between map and list views.

**Key Findings:**
- 100% coordinate coverage across all properties
- Geographic spread: US (Alaska to Hawaii, coast to coast)
- Primary data source: `property_listings` (coordinates) + `property_details` (metadata)
- Database: Supabase PostgreSQL (standard, no PostGIS required)
- Current API: Basic pagination exists at `/api/loopnet/listings`

---

## 1. Database Schema Analysis

### Current Tables

```
property_listings (24,000+ records)
├── listing_id (VARCHAR PRIMARY KEY)
├── state_id (VARCHAR PRIMARY KEY)
├── latitude (NUMERIC) ✓ 100% coverage
├── longitude (NUMERIC) ✓ 100% coverage
├── state_code (CHAR(2)) ⚠ NULL in many records
├── active_inactive (BOOLEAN)
└── timestamps

property_details (23,951 complete records)
├── listing_id (FK to property_listings)
├── state_id (FK to property_listings)
├── title (TEXT) - indicator of complete data
├── city (VARCHAR)
├── property_type (VARCHAR)
├── price (VARCHAR)
├── building_size (VARCHAR)
├── lot_size (VARCHAR)
└── [40+ additional fields]
```

### Geographic Coverage

```
Bounding Box of All Properties:
North: 64.8478° (Alaska)
South: 19.4961° (Hawaii)
East: -68.5054° (Maine)
West: -158.1052° (Alaska/Hawaii)
Center: 42.1719°, -113.3053° (Idaho/Wyoming border)
```

### Data Quality Issues

1. **state_code is NULL** in property_listings - need to populate from property_details
2. **Incomplete details** - Only 23,951 of 24,000 have full details (99.8%)
3. **Price format** - Stored as VARCHAR ("$95K"), needs parsing for range filters
4. **Size format** - Building/lot sizes also VARCHAR ("5,000 SF")

### Recommended Index Strategy

```sql
-- Already exists (from schema):
CREATE INDEX idx_property_listings_location ON property_listings(latitude, longitude);
CREATE INDEX idx_property_details_city ON property_details(city);
CREATE INDEX idx_property_details_property_type ON property_details(property_type);

-- CRITICAL NEW INDEXES for map queries:

-- 1. Bounding box queries (most important)
CREATE INDEX idx_listings_lat_lng_composite ON property_listings(latitude, longitude)
WHERE active_inactive = true;

-- 2. State aggregation (for default map center)
CREATE INDEX idx_property_details_state_code ON property_details(state_code)
WHERE state_code IS NOT NULL;

-- 3. Combined filters (city + type + price presence)
CREATE INDEX idx_details_filter_combo ON property_details(city, property_type)
WHERE title IS NOT NULL;

-- 4. Join optimization (foreign key index)
CREATE INDEX idx_details_listing_state_fk ON property_details(listing_id, state_id);

-- 5. Price filtering (once normalized)
-- After converting price to numeric column:
-- CREATE INDEX idx_details_price_numeric ON property_details(price_numeric)
-- WHERE price_numeric IS NOT NULL;
```

### Geospatial Query Strategy

**Vanilla PostgreSQL Approach (Recommended)**

Since we don't have PostGIS, we'll use simple bounding box queries:

```sql
-- Bounding box query (very efficient with composite index)
SELECT
    pl.listing_id,
    pl.state_id,
    pl.latitude,
    pl.longitude,
    pd.title,
    pd.city,
    pd.property_type,
    pd.price,
    pd.primary_image_url
FROM property_listings pl
JOIN property_details pd ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    pl.latitude BETWEEN ? AND ?    -- South to North
    AND pl.longitude BETWEEN ? AND ? -- West to East
    AND pl.active_inactive = true
    AND pd.title IS NOT NULL         -- Only complete listings
LIMIT 1000;
```

**Performance Characteristics:**
- With composite index: ~10-50ms for typical viewport
- Without clustering: Returns up to 1000 points
- With clustering: Backend reduces to ~200 clusters

**Why Not PostGIS?**
- Supabase free tier may not include PostGIS
- Simple bounding box queries are sufficient for this use case
- PostgreSQL's btree indexes handle lat/lng ranges efficiently
- Can add PostGIS later if needed (via `ST_DWithin` for radius searches)

---

## 2. API Design

### API Endpoint Specifications

#### a) GET /api/loopnet/stats/by-state

**Purpose:** Determine default map center and provide state-level overview

**Query Parameters:**
- None

**Response Format:**
```json
{
  "success": true,
  "defaultCenter": {
    "lat": 39.8283,
    "lng": -98.5795,
    "zoom": 4,
    "reason": "US geographic center"
  },
  "states": [
    {
      "stateCode": "CA",
      "stateName": "California",
      "count": 3245,
      "center": { "lat": 36.7783, "lng": -119.4179 },
      "bounds": {
        "north": 42.0095,
        "south": 32.5295,
        "east": -114.1312,
        "west": -124.4096
      }
    }
  ],
  "totalProperties": 23951,
  "statesWithProperties": 48
}
```

**Implementation:**
```javascript
app.get('/api/loopnet/stats/by-state', async (req, res) => {
  try {
    // Get state-level aggregations
    const { data: stateData } = await supabase
      .from('property_details')
      .select('state_code')
      .not('state_code', 'is', null)
      .not('title', 'is', null);

    // Count by state
    const stateCounts = {};
    stateData?.forEach(p => {
      stateCounts[p.state_code] = (stateCounts[p.state_code] || 0) + 1;
    });

    // Get coordinates for each state's center
    const stateCoords = await Promise.all(
      Object.keys(stateCounts).map(async (stateCode) => {
        const { data } = await supabase
          .from('property_listings')
          .select('latitude, longitude')
          .eq('state_code', stateCode)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(1000);

        if (!data || data.length === 0) return null;

        const lats = data.map(p => parseFloat(p.latitude));
        const lngs = data.map(p => parseFloat(p.longitude));

        return {
          stateCode,
          count: stateCounts[stateCode],
          center: {
            lat: (Math.max(...lats) + Math.min(...lats)) / 2,
            lng: (Math.max(...lngs) + Math.min(...lngs)) / 2
          },
          bounds: {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs)
          }
        };
      })
    );

    // US geographic center (default)
    const defaultCenter = {
      lat: 39.8283,
      lng: -98.5795,
      zoom: 4,
      reason: "US geographic center"
    };

    res.json({
      success: true,
      defaultCenter,
      states: stateCoords.filter(Boolean).sort((a, b) => b.count - a.count),
      totalProperties: Object.values(stateCounts).reduce((a, b) => a + b, 0),
      statesWithProperties: Object.keys(stateCounts).length
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

#### b) GET /api/loopnet/listings/map

**Purpose:** Return listings within map viewport bounds

**Query Parameters:**
- `north` (required): Northern latitude bound
- `south` (required): Southern latitude bound
- `east` (required): Eastern longitude bound
- `west` (required): Western longitude bound
- `cluster` (optional): 'true' to enable server-side clustering (default: false)
- `zoom` (optional): Map zoom level (for clustering density)
- Property filters (same as listings API):
  - `property_type`
  - `city`
  - `state_code`
  - `price_min` / `price_max`
  - `building_size_min` / `building_size_max`

**Response Format (without clustering):**
```json
{
  "success": true,
  "type": "points",
  "count": 847,
  "viewport": {
    "north": 40.917,
    "south": 40.477,
    "east": -73.700,
    "west": -74.259
  },
  "properties": [
    {
      "listingId": "10794955",
      "stateId": "17",
      "lat": 39.051493,
      "lng": -95.680252,
      "title": "Topeka Blvd - 711 SW",
      "city": "Topeka",
      "propertyType": "Land",
      "price": "$95K",
      "imageUrl": "https://...",
      "url": "/listings/10794955/17"
    }
  ],
  "hasMore": false
}
```

**Response Format (with clustering):**
```json
{
  "success": true,
  "type": "clusters",
  "count": 3245,
  "clusteredCount": 156,
  "viewport": { "north": 42.0, "south": 32.5, "east": -114.1, "west": -124.4 },
  "clusters": [
    {
      "type": "cluster",
      "lat": 34.0522,
      "lng": -118.2437,
      "count": 47,
      "bounds": { "north": 34.1, "south": 34.0, "east": -118.2, "west": -118.3 }
    },
    {
      "type": "point",
      "listingId": "10794955",
      "stateId": "17",
      "lat": 39.051493,
      "lng": -95.680252,
      "title": "Topeka Blvd",
      "city": "Topeka",
      "propertyType": "Land",
      "price": "$95K"
    }
  ]
}
```

**Implementation:**
```javascript
app.get('/api/loopnet/listings/map', async (req, res) => {
  try {
    const { north, south, east, west, cluster, zoom, ...filters } = req.query;

    // Validate bounds
    if (!north || !south || !east || !west) {
      return res.status(400).json({
        error: 'Missing required parameters: north, south, east, west'
      });
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    // Build query
    let query = supabase
      .from('property_listings')
      .select(`
        listing_id,
        state_id,
        latitude,
        longitude,
        property_details!inner(
          title,
          city,
          state_code,
          property_type,
          price,
          primary_image_url
        )
      `)
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .eq('active_inactive', true)
      .not('property_details.title', 'is', null);

    // Apply filters
    if (filters.property_type) {
      query = query.eq('property_details.property_type', filters.property_type);
    }
    if (filters.city) {
      query = query.ilike('property_details.city', `%${filters.city}%`);
    }
    if (filters.state_code) {
      query = query.eq('property_details.state_code', filters.state_code);
    }

    // Limit to prevent overload
    query = query.limit(1000);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data
    const properties = data.map(p => ({
      listingId: p.listing_id,
      stateId: p.state_id,
      lat: parseFloat(p.latitude),
      lng: parseFloat(p.longitude),
      title: p.property_details.title,
      city: p.property_details.city,
      propertyType: p.property_details.property_type,
      price: p.property_details.price,
      imageUrl: p.property_details.primary_image_url,
      url: `/listings/${p.listing_id}/${p.state_id}`
    }));

    // Clustering logic (if requested and count > 200)
    if (cluster === 'true' && properties.length > 200) {
      const clusters = performClustering(properties, parseInt(zoom) || 10);
      return res.json({
        success: true,
        type: 'clusters',
        count: properties.length,
        clusteredCount: clusters.length,
        viewport: bounds,
        clusters
      });
    }

    res.json({
      success: true,
      type: 'points',
      count: properties.length,
      viewport: bounds,
      properties,
      hasMore: properties.length === 1000
    });

  } catch (error) {
    console.error('Map listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple grid-based clustering algorithm
function performClustering(properties, zoom) {
  // Grid size decreases with zoom level
  const gridSize = 0.5 / Math.pow(2, zoom - 10);
  const clusters = new Map();

  properties.forEach(prop => {
    const gridLat = Math.floor(prop.lat / gridSize) * gridSize;
    const gridLng = Math.floor(prop.lng / gridSize) * gridSize;
    const key = `${gridLat},${gridLng}`;

    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key).push(prop);
  });

  // Convert clusters to response format
  return Array.from(clusters.values()).map(group => {
    if (group.length === 1) {
      return { type: 'point', ...group[0] };
    }

    const lats = group.map(p => p.lat);
    const lngs = group.map(p => p.lng);

    return {
      type: 'cluster',
      lat: lats.reduce((a, b) => a + b) / lats.length,
      lng: lngs.reduce((a, b) => a + b) / lngs.length,
      count: group.length,
      bounds: {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
      }
    };
  });
}
```

---

#### c) GET /api/loopnet/listings/:id/coordinates

**Purpose:** Fast coordinate lookup for single property (when clicking from list to map)

**URL Parameters:**
- `listing_id`: Property listing ID
- `state_id`: Property state ID

**Response Format:**
```json
{
  "success": true,
  "listingId": "10794955",
  "stateId": "17",
  "coordinates": {
    "lat": 39.051493,
    "lng": -95.680252
  },
  "title": "Topeka Blvd - 711 SW",
  "city": "Topeka"
}
```

**Implementation:**
```javascript
app.get('/api/loopnet/listings/:listing_id/:state_id/coordinates', async (req, res) => {
  try {
    const { listing_id, state_id } = req.params;

    const { data, error } = await supabase
      .from('property_listings')
      .select(`
        listing_id,
        state_id,
        latitude,
        longitude,
        property_details!inner(title, city)
      `)
      .eq('listing_id', listing_id)
      .eq('state_id', state_id)
      .single();

    if (error) throw error;

    if (!data || !data.latitude || !data.longitude) {
      return res.status(404).json({
        error: 'Coordinates not found for this listing'
      });
    }

    res.json({
      success: true,
      listingId: data.listing_id,
      stateId: data.state_id,
      coordinates: {
        lat: parseFloat(data.latitude),
        lng: parseFloat(data.longitude)
      },
      title: data.property_details.title,
      city: data.property_details.city
    });

  } catch (error) {
    console.error('Coordinates lookup error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

#### d) GET /api/loopnet/listings/viewport

**Purpose:** Combined endpoint for both map markers AND listing cards (single request)

**Query Parameters:**
- Map bounds: `north`, `south`, `east`, `west`
- Pagination: `page` (default: 1), `limit` (default: 20)
- Sorting: `sort_by`, `sort_order`
- Filters: `property_type`, `city`, `state_code`, `price_min`, `price_max`, etc.

**Response Format:**
```json
{
  "success": true,
  "map": {
    "type": "points",
    "count": 847,
    "properties": [ /* simplified markers */ ]
  },
  "list": {
    "data": [ /* full property details */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 847,
      "totalPages": 43
    }
  },
  "filters": {
    "propertyTypes": ["Land", "Office", "Retail"],
    "cities": ["Topeka", "Kansas City"],
    "states": ["KS", "MO"]
  }
}
```

**Implementation:**
```javascript
app.get('/api/loopnet/listings/viewport', async (req, res) => {
  try {
    const {
      north, south, east, west,
      page = 1,
      limit = 20,
      sort_by = 'last_updated',
      sort_order = 'desc',
      ...filters
    } = req.query;

    // Validate viewport bounds
    if (!north || !south || !east || !west) {
      return res.status(400).json({
        error: 'Missing viewport bounds'
      });
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    // Base query with bounds
    const baseQuery = supabase
      .from('property_listings')
      .select(`
        listing_id,
        state_id,
        latitude,
        longitude,
        property_details!inner(*)
      `, { count: 'exact' })
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .eq('active_inactive', true)
      .not('property_details.title', 'is', null);

    // Apply filters to both queries
    let mapQuery = baseQuery;
    let listQuery = baseQuery;

    if (filters.property_type) {
      mapQuery = mapQuery.eq('property_details.property_type', filters.property_type);
      listQuery = listQuery.eq('property_details.property_type', filters.property_type);
    }
    if (filters.city) {
      mapQuery = mapQuery.ilike('property_details.city', `%${filters.city}%`);
      listQuery = listQuery.ilike('property_details.city', `%${filters.city}%`);
    }
    // ... apply all other filters

    // Execute map query (simplified data, no pagination)
    mapQuery = mapQuery.limit(1000);
    const { data: mapData } = await mapQuery;

    // Execute list query (full data, with pagination)
    const offset = (parseInt(page) - 1) * parseInt(limit);
    listQuery = listQuery
      .range(offset, offset + parseInt(limit) - 1)
      .order(sort_by, { ascending: sort_order === 'asc' });

    const { data: listData, count } = await listQuery;

    // Get available filter values
    const { data: filterData } = await supabase
      .from('property_details')
      .select('property_type, city, state_code')
      .not('title', 'is', null);

    const uniqueTypes = [...new Set(filterData?.map(p => p.property_type).filter(Boolean))];
    const uniqueCities = [...new Set(filterData?.map(p => p.city).filter(Boolean))];
    const uniqueStates = [...new Set(filterData?.map(p => p.state_code).filter(Boolean))];

    res.json({
      success: true,
      map: {
        type: 'points',
        count: mapData?.length || 0,
        properties: mapData?.map(p => ({
          listingId: p.listing_id,
          stateId: p.state_id,
          lat: parseFloat(p.latitude),
          lng: parseFloat(p.longitude),
          title: p.property_details.title,
          price: p.property_details.price
        })) || []
      },
      list: {
        data: listData?.map(p => ({
          listingId: p.listing_id,
          stateId: p.state_id,
          ...p.property_details
        })) || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
      },
      filters: {
        propertyTypes: uniqueTypes.sort(),
        cities: uniqueCities.sort(),
        states: uniqueStates.sort()
      }
    });

  } catch (error) {
    console.error('Viewport listings error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 3. Data Flow Architecture

### Complete User Journey Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND COMPONENTS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐              ┌─────────────────────────┐  │
│  │   Map Component  │◄────sync────►│  Listings Component     │  │
│  │  (Google Maps)   │              │  (Cards/Table)          │  │
│  │                  │              │                         │  │
│  │  - Markers       │              │  - Pagination           │  │
│  │  - Clusters      │              │  - Sorting              │  │
│  │  - Bounds        │              │  - Full Details         │  │
│  └────────┬─────────┘              └───────────┬─────────────┘  │
│           │                                    │                │
│           └──────────┬─────────────────────────┘                │
│                      │                                          │
│           ┌──────────▼──────────┐                               │
│           │  Filter Panel       │                               │
│           │  - Type, City       │                               │
│           │  - Price, Size      │                               │
│           └──────────┬──────────┘                               │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       │ API Requests
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /api/loopnet/stats/by-state                                    │
│  │ Returns default center & state aggregations                  │
│  │                                                               │
│  /api/loopnet/listings/map                                      │
│  │ Returns map markers within bounds                            │
│  │                                                               │
│  /api/loopnet/listings/viewport                                 │
│  │ Returns BOTH map markers + paginated list                    │
│  │                                                               │
│  /api/loopnet/listings/:id/:state/coordinates                   │
│  │ Returns single property coordinates                          │
│  │                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Supabase Queries
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE POSTGRESQL                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  property_listings (lat/lng + FK)                               │
│  ├── Composite index on (latitude, longitude)                   │
│  └── JOIN property_details for metadata                         │
│                                                                  │
│  property_details (title, city, type, price, etc.)              │
│  ├── FK constraint to property_listings                         │
│  └── Indexes on type, city, state                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sequence Diagrams

#### 1. Page Load → Determine Default State → Center Map

```
User          Frontend       Server         Database
 │                │             │               │
 │──page load────►│             │               │
 │                │             │               │
 │                │──GET /stats/by-state────►  │
 │                │             │               │
 │                │             │──query states─►│
 │                │             │◄─state data───│
 │                │             │               │
 │                │             │──query coords─►│
 │                │             │◄─lat/lng data─│
 │                │◄─default center + states──  │
 │                │             │               │
 │                │─initialize map at center    │
 │◄─map ready────│             │               │
 │                │             │               │
 │                │──GET /listings/viewport──►  │
 │                │  (center ±50km bounds)      │
 │                │◄─map markers + list─────────│
 │                │             │               │
 │◄─show markers─│             │               │
 │◄─show listings│             │               │
```

#### 2. Map Viewport Change → Fetch Properties in Bounds

```
User          Frontend       Server         Database
 │                │             │               │
 │──drag map─────►│             │               │
 │                │─get new bounds              │
 │                │             │               │
 │                │──GET /listings/map──────►   │
 │                │  ?north=40.9&south=40.5     │
 │                │  &east=-73.7&west=-74.3     │
 │                │             │               │
 │                │             │──bounding box─►│
 │                │             │  WHERE lat BETWEEN
 │                │             │    AND lng BETWEEN
 │                │             │◄─properties───│
 │                │             │               │
 │                │◄─markers (847 results)──────│
 │                │             │               │
 │                │─clear old markers           │
 │                │─render new markers          │
 │◄─updated map──│             │               │
```

#### 3. Filter Change → Apply to Both Map and Listings

```
User          Frontend       Server         Database
 │                │             │               │
 │──select filter│             │               │
 │  "Office"─────►│             │               │
 │                │─update state                │
 │                │  filters.type = "Office"    │
 │                │             │               │
 │                │──GET /listings/viewport──►  │
 │                │  ?property_type=Office      │
 │                │  &north=...&south=...       │
 │                │             │               │
 │                │             │──filtered query│
 │                │             │◄─both datasets─│
 │                │             │               │
 │                │◄─map: 234 markers───────────│
 │                │◄─list: page 1 of 20─────────│
 │                │             │               │
 │                │─update map markers          │
 │                │─update listing cards        │
 │◄─filtered view│             │               │
```

#### 4. Pagination → Handle with Map Visible

```
User          Frontend       Server         Database
 │                │             │               │
 │──click page 2─►│             │               │
 │                │─update state (page=2)       │
 │                │             │               │
 │                │──GET /listings/viewport──►  │
 │                │  ?page=2&limit=20           │
 │                │  &north=...&south=...       │
 │                │             │               │
 │                │             │──query with   │
 │                │             │  OFFSET 20    │
 │                │             │◄─page 2 data──│
 │                │             │               │
 │                │◄─map: same markers (cached)│
 │                │◄─list: items 21-40──────────│
 │                │             │               │
 │                │─keep map unchanged          │
 │                │─update listing cards        │
 │◄─page 2 shown─│             │               │
 │                │             │               │
 │  Note: Map markers stay the same because     │
 │  they represent ALL items in viewport, not   │
 │  just current page.                          │
```

#### 5. Property Selection → Sync Between Map and List

```
User          Frontend       Server         Database
 │                │             │               │
 │──click card───►│             │               │
 │  listing #123  │             │               │
 │                │             │               │
 │                │──GET /listings/123/17/coords►│
 │                │             │               │
 │                │             │──lookup coords─►│
 │                │             │◄─lat/lng───────│
 │                │◄─coordinates────────────────│
 │                │             │               │
 │                │─pan map to coords           │
 │                │─highlight marker            │
 │                │─open info window            │
 │◄─synced view──│             │               │
 │                │             │               │
│                │             │               │
│──click marker─►│             │               │
│  on map        │             │               │
│                │─scroll list to item          │
│                │─highlight card               │
│◄─synced view──│             │               │
```

---

## 4. Performance Strategy

### Query Optimization

**1. Index-Based Bounding Box Queries**

```sql
-- Optimal query plan with composite index
EXPLAIN ANALYZE
SELECT pl.listing_id, pl.latitude, pl.longitude, pd.title
FROM property_listings pl
JOIN property_details pd ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    pl.latitude BETWEEN 40.477 AND 40.917   -- Uses index
    AND pl.longitude BETWEEN -74.259 AND -73.700  -- Uses index
    AND pl.active_inactive = true
    AND pd.title IS NOT NULL
LIMIT 1000;

-- Expected: Index Scan on idx_listings_lat_lng_composite
-- Rows: ~500-1000, Time: 10-50ms
```

**2. Limit Strategy**

```javascript
// Always limit to prevent runaway queries
const MAX_MAP_POINTS = 1000;
const MAX_LIST_ITEMS = 100;

// If count exceeds threshold, suggest clustering or zoom in
if (count > MAX_MAP_POINTS) {
  return {
    message: "Too many results. Please zoom in or enable clustering.",
    count,
    suggested_zoom: current_zoom + 2
  };
}
```

**3. Connection Pooling**

```javascript
// Already configured in Supabase client
// Default: 10 connections
// For high traffic, increase in Supabase dashboard
```

### Caching Strategy

**1. Redis Cache for Frequently Accessed Regions**

```javascript
const Redis = require('redis');
const redis = Redis.createClient({ url: process.env.REDIS_URL });

// Cache key pattern: viewport:{north}:{south}:{east}:{west}:{filters_hash}
async function getCachedViewport(bounds, filters) {
  const cacheKey = `viewport:${bounds.north}:${bounds.south}:${bounds.east}:${bounds.west}:${hashFilters(filters)}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  return null;
}

async function cacheViewport(bounds, filters, data) {
  const cacheKey = `viewport:${bounds.north}:${bounds.south}:${bounds.east}:${bounds.west}:${hashFilters(filters)}`;

  // Cache for 5 minutes
  await redis.setEx(cacheKey, 300, JSON.stringify(data));
}

// Cache invalidation: Clear cache when properties are updated
async function invalidatePropertyCache(listingId) {
  // Simple approach: clear all viewport caches
  // More sophisticated: track which viewports contain this property
  await redis.flushDb();
}
```

**2. In-Memory Cache for State Statistics**

```javascript
const NodeCache = require('node-cache');
const statsCache = new NodeCache({ stdTTL: 3600 }); // 1 hour

app.get('/api/loopnet/stats/by-state', async (req, res) => {
  const cached = statsCache.get('state-stats');
  if (cached) {
    return res.json(cached);
  }

  // ... compute stats ...

  statsCache.set('state-stats', result);
  res.json(result);
});
```

**3. Browser Cache Headers**

```javascript
// Static map tiles (if serving custom tiles)
app.use('/map-tiles', express.static('public/tiles', {
  maxAge: '7d',
  immutable: true
}));

// API responses with ETags
app.get('/api/loopnet/listings/map', async (req, res) => {
  // ... fetch data ...

  const etag = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.set('ETag', etag);
  res.set('Cache-Control', 'public, max-age=60'); // 1 minute
  res.json(data);
});
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.'
});

// Map-specific rate limit (more generous)
const mapLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute (allows smooth panning)
  message: 'Too many map requests, please slow down.'
});

app.use('/api/', apiLimiter);
app.use('/api/loopnet/listings/map', mapLimiter);
app.use('/api/loopnet/listings/viewport', mapLimiter);
```

### Lazy Loading Strategy

**1. Progressive Loading**

```javascript
// Frontend: Load in stages
async function loadMapData(bounds) {
  // Stage 1: Load simplified markers (fast)
  const markers = await fetch('/api/loopnet/listings/map?' +
    new URLSearchParams({ ...bounds, simplified: true }));
  renderMarkers(markers);

  // Stage 2: Load full details on hover (lazy)
  map.addListener('mouseover', async (marker) => {
    if (!marker.detailsLoaded) {
      const details = await fetch(`/api/loopnet/listings/${marker.id}/details`);
      marker.infoWindow.setContent(details);
      marker.detailsLoaded = true;
    }
  });
}
```

**2. Viewport Debouncing**

```javascript
// Frontend: Debounce viewport changes
let viewportChangeTimeout;

map.addListener('bounds_changed', () => {
  clearTimeout(viewportChangeTimeout);

  viewportChangeTimeout = setTimeout(() => {
    const bounds = map.getBounds();
    fetchMapData(bounds);
  }, 500); // Wait 500ms after user stops panning
});
```

### WebSocket vs Polling for Real-Time Updates

**Recommendation: Polling (for MVP)**

```javascript
// Frontend: Poll every 60 seconds for new listings
setInterval(async () => {
  const bounds = map.getBounds();
  const lastUpdate = localStorage.getItem('lastMapUpdate');

  const newListings = await fetch('/api/loopnet/listings/map?' +
    new URLSearchParams({
      ...bounds,
      updated_after: lastUpdate
    }));

  if (newListings.count > 0) {
    showNotification(`${newListings.count} new listings in your area!`);
    addNewMarkers(newListings.properties);
  }

  localStorage.setItem('lastMapUpdate', Date.now());
}, 60000);
```

**Future: WebSocket (Phase 2)**

```javascript
// Server: Socket.io for real-time updates
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('subscribe-viewport', (bounds) => {
    socket.join(`viewport:${hashBounds(bounds)}`);
  });
});

// Emit when new property added
function onNewProperty(property) {
  const affectedViewports = calculateViewportsContaining(property);
  affectedViewports.forEach(viewport => {
    io.to(`viewport:${viewport}`).emit('new-property', property);
  });
}
```

---

## 5. Error Handling & Fallbacks

### Missing Coordinates

```javascript
// Filter out properties without coordinates
query = query
  .not('latitude', 'is', null)
  .not('longitude', 'is', null);

// Log properties with missing coordinates for data quality
async function auditMissingCoordinates() {
  const { data: missing } = await supabase
    .from('property_listings')
    .select('listing_id, state_id')
    .or('latitude.is.null,longitude.is.null');

  console.warn(`${missing.length} properties missing coordinates`);
  // TODO: Geocode using Google Maps API or address data
}
```

### Invalid Bounds

```javascript
function validateBounds(bounds) {
  const errors = [];

  // Check latitude range
  if (bounds.north < -90 || bounds.north > 90) {
    errors.push('Invalid north bound (must be -90 to 90)');
  }
  if (bounds.south < -90 || bounds.south > 90) {
    errors.push('Invalid south bound (must be -90 to 90)');
  }

  // Check longitude range
  if (bounds.east < -180 || bounds.east > 180) {
    errors.push('Invalid east bound (must be -180 to 180)');
  }
  if (bounds.west < -180 || bounds.west > 180) {
    errors.push('Invalid west bound (must be -180 to 180)');
  }

  // Check logical consistency
  if (bounds.north <= bounds.south) {
    errors.push('North bound must be greater than south bound');
  }

  // Handle international date line crossing
  if (bounds.east < bounds.west) {
    // Valid case: viewport crosses -180/+180 boundary
    // Will need special query handling
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return true;
}
```

### No Properties in Viewport

```javascript
// Return helpful response when no results
if (data.length === 0) {
  return res.json({
    success: true,
    count: 0,
    properties: [],
    message: 'No properties found in this area. Try zooming out or changing filters.',
    suggestions: {
      nearbyStates: await getNearbyStates(bounds),
      popularCities: await getTopCities(10)
    }
  });
}
```

### Database Timeouts

```javascript
// Set query timeout
const { data, error } = await supabase
  .from('property_listings')
  .select('*')
  .abortSignal(AbortSignal.timeout(5000)); // 5 second timeout

if (error?.message?.includes('timeout')) {
  return res.status(503).json({
    error: 'Database query timeout. Please try zooming in or reducing filters.',
    suggestion: 'The viewport may contain too many properties.'
  });
}
```

### Fallback Center Points

```javascript
const FALLBACK_CENTERS = {
  country: {
    US: { lat: 39.8283, lng: -98.5795, zoom: 4, name: 'United States' },
  },
  state: {
    CA: { lat: 36.7783, lng: -119.4179, zoom: 6, name: 'California' },
    TX: { lat: 31.9686, lng: -99.9018, zoom: 6, name: 'Texas' },
    // ... other states
  },
  city: {
    'Los Angeles': { lat: 34.0522, lng: -118.2437, zoom: 10 },
    'New York': { lat: 40.7128, lng: -74.0060, zoom: 10 },
    // ... other cities
  }
};

async function getDefaultMapCenter() {
  try {
    // Try to get from database
    const stats = await getStateStats();
    if (stats.states.length > 0) {
      const topState = stats.states[0];
      return topState.center;
    }
  } catch (error) {
    console.error('Failed to get default center from database:', error);
  }

  // Fallback to US center
  return FALLBACK_CENTERS.country.US;
}
```

### Graceful Degradation

```javascript
// Frontend: Handle API failures gracefully
async function fetchMapData(bounds) {
  try {
    const response = await fetch('/api/loopnet/listings/map?' + params);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Map data fetch failed:', error);

    // Show cached data if available
    const cached = getCachedMapData(bounds);
    if (cached) {
      showWarning('Showing cached data. Unable to fetch latest listings.');
      return cached;
    }

    // Show empty map with error message
    showError('Unable to load properties. Please refresh the page.');
    return { properties: [] };
  }
}
```

---

## 6. Implementation Priorities

### MVP (Minimum Viable Product) - Week 1-2

**Goal:** Basic map interface with property markers

**Features:**
1. Display map centered on US with all properties as markers
2. Basic bounding box queries (no clustering)
3. Click marker → show property info window
4. Simple list view below map (no sync yet)

**API Endpoints:**
- GET /api/loopnet/stats/by-state (simplified)
- GET /api/loopnet/listings/map (basic version)

**Database:**
- Add composite index: `idx_listings_lat_lng_composite`
- Verify all coordinates are valid

**Frontend:**
- Google Maps integration
- Basic markers (default pins)
- Info windows with title, price, city

**Success Metrics:**
- All 24,000 properties visible on map
- Map loads in <3 seconds
- Marker click shows info in <500ms

---

### Phase 2 Enhancements - Week 3-4

**Goal:** Synchronized map + list view with filtering

**Features:**
1. Map and list sync (click card → highlight marker)
2. Filter panel (type, city, price range)
3. Pagination for list view
4. Custom marker icons by property type
5. Viewport-based list updates

**API Endpoints:**
- GET /api/loopnet/listings/viewport (combined endpoint)
- GET /api/loopnet/listings/:id/coordinates

**Frontend:**
- Dual-pane layout (map left, list right)
- Filter sidebar
- Pagination controls
- Marker clustering (frontend, using markerclusterer)

**Performance:**
- Add Redis caching for common viewports
- Implement rate limiting
- Add debouncing for map movements

**Success Metrics:**
- Filter changes reflect in <1 second
- Map/list stay in sync
- No jank when panning map

---

### Phase 3 Optimizations - Week 5-6

**Goal:** Production-ready with advanced features

**Features:**
1. Server-side clustering for high-density areas
2. Progressive loading (markers first, details on hover)
3. Deep linking (share URL with map position + filters)
4. Save searches / favorite properties
5. Mobile responsive design

**API Endpoints:**
- GET /api/loopnet/listings/map?cluster=true (with clustering)
- POST /api/loopnet/searches/save
- GET /api/loopnet/searches/saved

**Performance:**
- Connection pooling optimization
- Query plan analysis and tuning
- CDN for static assets
- Image optimization (WebP, lazy loading)

**Database:**
- Add materialized view for aggregations
- Implement partial indexes for common filters
- Set up read replicas (if available in Supabase)

**Success Metrics:**
- 10,000+ concurrent users supported
- 99.9% uptime
- <100ms API response time (p95)

---

### Future Optimizations - Month 3+

**Goal:** Scale to millions of properties

**Features:**
1. WebSocket real-time updates
2. Elasticsearch for advanced search
3. ML-based property recommendations
4. Heatmap overlay (price density, etc.)
5. Virtual tours integration
6. Drawing tools (search by polygon)

**Infrastructure:**
- PostGIS migration for advanced geospatial queries
- Separate read/write databases
- GraphQL API for flexible queries
- Microservices architecture

**Database:**
- Implement PostGIS for radius searches
- Spatial indexes (R-tree, GiST)
- Partitioning by state or region
- Archive old inactive listings

**Success Metrics:**
- Sub-50ms query times at any scale
- Global CDN distribution
- Multi-region deployment

---

## 7. SQL Query Reference

### Recommended Schema Updates

```sql
-- 1. Fix state_code in property_listings (copy from property_details)
UPDATE property_listings pl
SET state_code = pd.state_code
FROM property_details pd
WHERE pl.listing_id = pd.listing_id
  AND pl.state_id = pd.state_id
  AND pl.state_code IS NULL
  AND pd.state_code IS NOT NULL;

-- 2. Add composite index for bounding box queries
CREATE INDEX idx_listings_lat_lng_active ON property_listings(latitude, longitude, active_inactive)
WHERE active_inactive = true AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Add index for state aggregations
CREATE INDEX idx_details_state_code ON property_details(state_code)
WHERE state_code IS NOT NULL AND title IS NOT NULL;

-- 4. Add index for join performance
CREATE INDEX idx_details_listing_state_composite ON property_details(listing_id, state_id);

-- 5. Create materialized view for state statistics (refresh daily)
CREATE MATERIALIZED VIEW state_statistics AS
SELECT
    pd.state_code,
    COUNT(*) as property_count,
    AVG(pl.latitude) as center_lat,
    AVG(pl.longitude) as center_lng,
    MAX(pl.latitude) as north,
    MIN(pl.latitude) as south,
    MAX(pl.longitude) as east,
    MIN(pl.longitude) as west,
    COUNT(DISTINCT pd.city) as cities_count,
    COUNT(DISTINCT pd.property_type) as property_types_count
FROM property_listings pl
JOIN property_details pd ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    pl.active_inactive = true
    AND pd.title IS NOT NULL
    AND pl.latitude IS NOT NULL
    AND pl.longitude IS NOT NULL
GROUP BY pd.state_code;

CREATE UNIQUE INDEX idx_state_stats_pk ON state_statistics(state_code);

-- Refresh command (run daily via cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY state_statistics;
```

### Common Query Patterns

```sql
-- 1. Bounding box query (map viewport)
SELECT
    pl.listing_id,
    pl.state_id,
    pl.latitude,
    pl.longitude,
    pd.title,
    pd.city,
    pd.property_type,
    pd.price,
    pd.primary_image_url
FROM property_listings pl
JOIN property_details pd ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    pl.latitude BETWEEN $1 AND $2
    AND pl.longitude BETWEEN $3 AND $4
    AND pl.active_inactive = true
    AND pd.title IS NOT NULL
LIMIT 1000;

-- 2. State aggregation (default center)
SELECT
    state_code,
    property_count,
    center_lat,
    center_lng,
    north, south, east, west
FROM state_statistics
ORDER BY property_count DESC;

-- 3. Single property coordinates lookup
SELECT
    pl.latitude,
    pl.longitude,
    pd.title,
    pd.city
FROM property_listings pl
JOIN property_details pd ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    pl.listing_id = $1
    AND pl.state_id = $2;

-- 4. Combined viewport query (map + list)
WITH viewport_properties AS (
    SELECT
        pl.listing_id,
        pl.state_id,
        pl.latitude,
        pl.longitude,
        pd.*
    FROM property_listings pl
    JOIN property_details pd ON pl.listing_id = pd.listing_id
        AND pl.state_id = pd.state_id
    WHERE
        pl.latitude BETWEEN $1 AND $2
        AND pl.longitude BETWEEN $3 AND $4
        AND pl.active_inactive = true
        AND pd.title IS NOT NULL
        -- Apply filters here
)
SELECT * FROM viewport_properties
ORDER BY pd.last_updated DESC
LIMIT 20 OFFSET $5;

-- 5. Count properties in viewport (for pagination)
SELECT COUNT(*)
FROM property_listings pl
JOIN property_details pd ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    pl.latitude BETWEEN $1 AND $2
    AND pl.longitude BETWEEN $3 AND $4
    AND pl.active_inactive = true
    AND pd.title IS NOT NULL;

-- 6. Properties missing coordinates (audit)
SELECT
    pl.listing_id,
    pl.state_id,
    pd.street_address,
    pd.city,
    pd.state_code,
    pd.zip_code
FROM property_listings pl
JOIN property_details pd ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    (pl.latitude IS NULL OR pl.longitude IS NULL)
    AND pd.title IS NOT NULL
ORDER BY pl.listing_id;
```

---

## 8. Testing Strategy

### Performance Benchmarks

```javascript
// test/performance/map-queries.test.js
const { supabase } = require('../../supabase-config');

describe('Map Query Performance', () => {
  it('should return viewport results in <100ms', async () => {
    const start = Date.now();

    const { data } = await supabase
      .from('property_listings')
      .select('*, property_details!inner(*)')
      .gte('latitude', 40.477)
      .lte('latitude', 40.917)
      .gte('longitude', -74.259)
      .lte('longitude', -73.700)
      .limit(1000);

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
    expect(data.length).toBeGreaterThan(0);
  });

  it('should handle 1000 concurrent viewport requests', async () => {
    const requests = Array(1000).fill().map(() =>
      fetch('http://localhost:3000/api/loopnet/listings/map?north=40.9&south=40.5&east=-73.7&west=-74.3')
    );

    const results = await Promise.all(requests);
    const allSuccessful = results.every(r => r.status === 200);

    expect(allSuccessful).toBe(true);
  });
});
```

### Integration Tests

```javascript
// test/integration/map-api.test.js
describe('Map API Endpoints', () => {
  describe('GET /api/loopnet/stats/by-state', () => {
    it('should return default center and state statistics', async () => {
      const res = await request(app).get('/api/loopnet/stats/by-state');

      expect(res.status).toBe(200);
      expect(res.body.defaultCenter).toHaveProperty('lat');
      expect(res.body.defaultCenter).toHaveProperty('lng');
      expect(res.body.states).toBeInstanceOf(Array);
      expect(res.body.states.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/loopnet/listings/map', () => {
    it('should require all bounds parameters', async () => {
      const res = await request(app).get('/api/loopnet/listings/map');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required parameters');
    });

    it('should return properties within bounds', async () => {
      const res = await request(app)
        .get('/api/loopnet/listings/map')
        .query({ north: 40.9, south: 40.5, east: -73.7, west: -74.3 });

      expect(res.status).toBe(200);
      expect(res.body.properties).toBeInstanceOf(Array);
      expect(res.body.count).toBeGreaterThan(0);

      // Verify all properties are within bounds
      res.body.properties.forEach(p => {
        expect(p.lat).toBeGreaterThanOrEqual(40.5);
        expect(p.lat).toBeLessThanOrEqual(40.9);
        expect(p.lng).toBeGreaterThanOrEqual(-74.3);
        expect(p.lng).toBeLessThanOrEqual(-73.7);
      });
    });
  });
});
```

---

## 9. Monitoring & Observability

### Key Metrics to Track

```javascript
// Prometheus metrics
const prometheus = require('prom-client');

const mapQueryDuration = new prometheus.Histogram({
  name: 'map_query_duration_seconds',
  help: 'Duration of map viewport queries',
  labelNames: ['has_filters', 'result_count_bucket']
});

const mapQueryErrors = new prometheus.Counter({
  name: 'map_query_errors_total',
  help: 'Total number of map query errors',
  labelNames: ['error_type']
});

const activeMapUsers = new prometheus.Gauge({
  name: 'active_map_users',
  help: 'Number of active users on map view'
});

// Instrument API endpoints
app.get('/api/loopnet/listings/map', async (req, res) => {
  const start = Date.now();

  try {
    const data = await fetchMapData(req.query);

    const duration = (Date.now() - start) / 1000;
    const bucket = data.count < 100 ? 'small' : data.count < 500 ? 'medium' : 'large';

    mapQueryDuration.labels(
      req.query.property_type ? 'true' : 'false',
      bucket
    ).observe(duration);

    res.json(data);

  } catch (error) {
    mapQueryErrors.labels(error.name).inc();
    throw error;
  }
});
```

### Logging Strategy

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'map-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log slow queries
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn('Slow query detected', {
        endpoint: req.path,
        duration,
        query: req.query
      });
    }
  });

  next();
});
```

---

## 10. Security Considerations

### Input Validation

```javascript
const { body, query, validationResult } = require('express-validator');

app.get('/api/loopnet/listings/map', [
  query('north').isFloat({ min: -90, max: 90 }),
  query('south').isFloat({ min: -90, max: 90 }),
  query('east').isFloat({ min: -180, max: 180 }),
  query('west').isFloat({ min: -180, max: 180 }),
  query('property_type').optional().isString().trim().escape(),
  query('city').optional().isString().trim().escape(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // ... handle request
});
```

### SQL Injection Prevention

```javascript
// Already protected by Supabase client's parameterized queries
// NEVER construct raw SQL with user input:

// ❌ WRONG (vulnerable to injection)
const query = `SELECT * FROM property_listings WHERE city = '${userInput}'`;

// ✅ CORRECT (parameterized)
const { data } = await supabase
  .from('property_listings')
  .select('*')
  .eq('city', userInput); // Automatically escaped
```

---

## Appendix

### Technology Stack Summary

**Backend:**
- Node.js 18+
- Express.js 4.x
- Supabase JS Client

**Database:**
- Supabase (PostgreSQL 14+)
- Standard SQL (no PostGIS required for MVP)

**Frontend (Future):**
- Google Maps JavaScript API
- React 18+ (recommended)
- TanStack Query (for data fetching)

**Optional Enhancements:**
- Redis (caching)
- Socket.io (real-time updates)
- Elasticsearch (advanced search)

### Useful Resources

- [Google Maps Viewport Documentation](https://developers.google.com/maps/documentation/javascript/reference/map#Map.getBounds)
- [PostgreSQL BETWEEN Performance](https://www.postgresql.org/docs/current/indexes-types.html)
- [Supabase Joins Documentation](https://supabase.com/docs/guides/database/joins-and-nesting)
- [Marker Clustering Libraries](https://github.com/googlemaps/js-markerclusterer)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Author:** Systems Architect
**Status:** Ready for Implementation
