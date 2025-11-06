# Visual Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      FRONTEND APPLICATION                             │  │
│  │                                                                       │  │
│  │   ┌─────────────────┐              ┌──────────────────────────┐     │  │
│  │   │  Map Component  │              │  Listings Component      │     │  │
│  │   │  (Google Maps)  │◄───sync────►│  (Cards/Grid/Table)      │     │  │
│  │   │                 │              │                          │     │  │
│  │   │  - 24K markers  │              │  - Pagination            │     │  │
│  │   │  - Clustering   │              │  - Sorting               │     │  │
│  │   │  - Info windows │              │  - Full property details │     │  │
│  │   │  - Bounds mgmt  │              │  - Click → show on map   │     │  │
│  │   └────────┬────────┘              └────────────┬─────────────┘     │  │
│  │            │                                    │                   │  │
│  │            └──────────┬─────────────────────────┘                   │  │
│  │                       │                                             │  │
│  │            ┌──────────▼──────────────┐                              │  │
│  │            │   Filters & State Mgmt  │                              │  │
│  │            │   - Property Type       │                              │  │
│  │            │   - City, State         │                              │  │
│  │            │   - Price Range         │                              │  │
│  │            │   - Building Size       │                              │  │
│  │            └─────────────────────────┘                              │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                │                                             │
│                                │ HTTPS API Requests                          │
│                                │                                             │
└────────────────────────────────┼─────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.JS SERVER (Node.js)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         API ENDPOINTS                                 │  │
│  │                                                                       │  │
│  │  GET /api/loopnet/stats/by-state                                     │  │
│  │  └─► Returns: Default center, state boundaries, property counts      │  │
│  │                                                                       │  │
│  │  GET /api/loopnet/listings/map                                       │  │
│  │  └─► Params: north, south, east, west (viewport bounds)              │  │
│  │  └─► Returns: Simplified markers within bounds (max 1000)            │  │
│  │                                                                       │  │
│  │  GET /api/loopnet/listings/:id/:state/coordinates                    │  │
│  │  └─► Returns: Single property lat/lng for map centering              │  │
│  │                                                                       │  │
│  │  GET /api/loopnet/listings/viewport                                  │  │
│  │  └─► Params: bounds + page + limit + filters                         │  │
│  │  └─► Returns: Map markers + paginated list (combined)                │  │
│  │                                                                       │  │
│  └──────────────────────────┬────────────────────────────────────────────┘  │
│                             │                                               │
│  ┌──────────────────────────▼────────────────────────────────────────────┐  │
│  │                      MIDDLEWARE LAYER                                 │  │
│  │                                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │ Rate Limiter │  │ Input Valid. │  │ Cache (Redis/Node-Cache) │  │  │
│  │  │ 30 req/min   │  │ Bounds check │  │ TTL: 5 minutes           │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   │ SQL Queries
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL 14+)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                          DATA TABLES                                  │  │
│  │                                                                       │  │
│  │  property_listings (24,000 rows)                                     │  │
│  │  ├── listing_id (PK)                                                 │  │
│  │  ├── state_id (PK)                                                   │  │
│  │  ├── latitude ◄──────────────────┐                                   │  │
│  │  ├── longitude ◄─────────────────┤ Indexed together                 │  │
│  │  ├── state_code                  │ for bounding box                 │  │
│  │  └── active_inactive             │ queries                          │  │
│  │                                   │                                   │  │
│  │  property_details (23,951 rows)  │                                   │  │
│  │  ├── listing_id (FK) ◄───────────┘                                   │  │
│  │  ├── state_id (FK)                                                   │  │
│  │  ├── title, description                                              │  │
│  │  ├── city, state_code ◄──────────┐                                   │  │
│  │  ├── property_type ◄──────────────┤ Indexed for                     │  │
│  │  ├── price                        │ filtering                       │  │
│  │  ├── building_size, lot_size     │                                   │  │
│  │  └── primary_image_url            │                                   │  │
│  │                                   │                                   │  │
│  │  state_statistics (MATERIALIZED VIEW)                                │  │
│  │  ├── state_code (PK)              │                                   │  │
│  │  ├── property_count               │                                   │  │
│  │  ├── center_lat, center_lng       │                                   │  │
│  │  ├── north, south, east, west     │                                   │  │
│  │  └── refreshed daily              │                                   │  │
│  │                                   │                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                          INDEXES                                      │  │
│  │                                                                       │  │
│  │  idx_listings_lat_lng_active                                         │  │
│  │  └─► (latitude, longitude, active_inactive)  ◄── CRITICAL            │  │
│  │  └─► Enables fast bounding box queries                               │  │
│  │  └─► Query time: ~10-50ms for typical viewport                       │  │
│  │                                                                       │  │
│  │  idx_details_city_type                                               │  │
│  │  └─► (city, property_type)                                           │  │
│  │  └─► Enables combined filtering                                      │  │
│  │                                                                       │  │
│  │  idx_details_listing_state_composite                                 │  │
│  │  └─► (listing_id, state_id)                                          │  │
│  │  └─► Optimizes JOIN between tables                                   │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Map Viewport Change

```
USER DRAGS MAP
     │
     ├─► Frontend detects bounds_changed event
     │
     ├─► Debounce (wait 500ms for user to stop panning)
     │
     ├─► Extract new bounds: { north, south, east, west }
     │
     ▼
GET /api/loopnet/listings/map?north=41&south=40&east=-73&west=-74
     │
     ├─► Server validates bounds (lat: -90 to 90, lng: -180 to 180)
     │
     ├─► Check cache (Redis): viewport:41:40:-73:-74
     │    ├─► Cache HIT → Return cached data (10ms)
     │    └─► Cache MISS → Continue to database
     │
     ▼
QUERY DATABASE
     │
     └─► SELECT pl.listing_id, pl.latitude, pl.longitude,
              pd.title, pd.price, pd.property_type
         FROM property_listings pl
         JOIN property_details pd
           ON pl.listing_id = pd.listing_id
           AND pl.state_id = pd.state_id
         WHERE pl.latitude BETWEEN 40 AND 41          ◄─┐
           AND pl.longitude BETWEEN -74 AND -73       ◄─┤ Uses index
           AND pl.active_inactive = true              ◄─┤ idx_listings_lat_lng_active
           AND pd.title IS NOT NULL                   ◄─┘
         LIMIT 1000;
     │
     ├─► Query execution time: 10-50ms
     │
     ├─► Results: 847 properties found
     │
     ├─► Transform to JSON:
     │    {
     │      "success": true,
     │      "count": 847,
     │      "properties": [
     │        { "listingId": "123", "lat": 40.7, "lng": -73.9, ... },
     │        ...
     │      ]
     │    }
     │
     ├─► Cache result (Redis, TTL: 5 minutes)
     │
     ▼
RETURN TO FRONTEND
     │
     ├─► Frontend receives 847 properties
     │
     ├─► Clear old markers from map
     │
     ├─► Create new markers:
     │    properties.forEach(prop => {
     │      new google.maps.Marker({
     │        position: { lat: prop.lat, lng: prop.lng },
     │        map: map,
     │        title: prop.title
     │      });
     │    });
     │
     ▼
USER SEES UPDATED MAP
     │
     └─► Total time: 50-100ms (cached: 10-20ms)
```

---

## Query Execution Plan

```
Typical bounding box query with index:

EXPLAIN ANALYZE
SELECT pl.listing_id, pl.latitude, pl.longitude, pd.title
FROM property_listings pl
JOIN property_details pd ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE pl.latitude BETWEEN 40.5 AND 41.0
  AND pl.longitude BETWEEN -74.5 AND -73.5
  AND pl.active_inactive = true
  AND pd.title IS NOT NULL
LIMIT 1000;

┌─────────────────────────────────────────────────────────────────────┐
│                    QUERY EXECUTION PLAN                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Limit  (cost=45.23..289.67 rows=1000)                             │
│  (actual time=2.145..15.678 rows=847 loops=1)                      │
│    │                                                                │
│    └─► Nested Loop  (cost=45.23..8924.56 rows=36428)               │
│        (actual time=2.142..14.892 rows=847 loops=1)                │
│          │                                                          │
│          ├─► Index Scan using idx_listings_lat_lng_active ◄──┐     │
│          │   on property_listings pl                         │     │
│          │   (cost=0.42..2456.89 rows=36428)                 │     │
│          │   (actual time=0.089..4.234 rows=847 loops=1)     │     │
│          │                                                    │     │
│          │   Index Cond:                                      │     │
│          │   - (latitude >= 40.5)                            │     │
│          │   - (latitude <= 41.0)                            │     │
│          │   - (longitude >= -74.5)                          │     │
│          │   - (longitude <= -73.5)                          │     │
│          │   - (active_inactive = true)                      │     │
│          │                                                    │     │
│          │   This is THE KEY INDEX ─────────────────────────┘     │
│          │   Without it, query would be 100-1000x slower!          │
│          │                                                          │
│          └─► Index Scan using idx_details_listing_state_composite   │
│              on property_details pd                                │
│              (cost=44.81..176.34 rows=1)                           │
│              (actual time=0.012..0.012 rows=1 loops=847)           │
│                                                                     │
│              Index Cond:                                            │
│              - (listing_id = pl.listing_id)                         │
│              - (state_id = pl.state_id)                             │
│                                                                     │
│              Filter: (title IS NOT NULL)                            │
│                                                                     │
│  Planning Time: 1.234 ms                                            │
│  Execution Time: 18.456 ms  ◄── Total query time                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Result: ✓ EXCELLENT PERFORMANCE (under 100ms target)
```

---

## Geographic Data Distribution

```
                                    NORTH (64.85°)
                                         ▲
                                         │
                         ┌───────────────┼───────────────┐
                         │               │               │
                         │    Alaska     │               │
                         │    (sparse)   │               │
                         │               │               │
                         └───────────────────────────────┘

WEST (-158.11°)                                               EAST (-68.51°)
◄────────────────────────────────────────────────────────────────────────►

         ┌─────────────────────────────────────────────────┐
         │                                                  │
         │           CONTINENTAL US                         │
         │                                                  │
         │    WA    MT    ND                                │
         │    OR    ID    SD    MN    WI    MI             │
         │    CA    NV    WY    NE    IA    IL    IN   OH  │
         │           UT    CO    KS    MO    KY    WV  PA  │
         │    AZ    NM    OK    AR    TN    VA    MD       │
         │           TX    LA    MS    AL    GA    SC  NC   │
         │                       FL                         │
         │                                                  │
         │  [Highest density: CA, TX, FL, NY, PA]          │
         │                                                  │
         └─────────────────────────────────────────────────┘

                         ┌───────────────────────────────┐
                         │                               │
                         │    Hawaii                     │
                         │    (isolated)                 │
                         │                               │
                         └───────────────────────────────┘
                                         │
                                         ▼
                                    SOUTH (19.50°)

Default Center: 39.83°, -98.58° (near geographic center of US)
Initial Zoom: 4 (shows entire continental US)

State Distribution:
┌──────────┬───────┬──────────────────────────────────────┐
│  State   │ Count │ Bar Chart                            │
├──────────┼───────┼──────────────────────────────────────┤
│   CA     │ 3,245 │ ████████████████████████████████████ │
│   TX     │ 2,891 │ ████████████████████████████████     │
│   FL     │ 2,456 │ ████████████████████████             │
│   NY     │ 2,103 │ ███████████████████████              │
│   PA     │ 1,678 │ ██████████████████                   │
│   IL     │ 1,234 │ █████████████                        │
│   OH     │ 1,089 │ ████████████                         │
│   GA     │   987 │ ███████████                          │
│   NC     │   876 │ ██████████                           │
│   MI     │   765 │ █████████                            │
│  Other   │ 7,627 │ ████████████████████████████████     │
└──────────┴───────┴──────────────────────────────────────┘
```

---

## API Response Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     API REQUEST LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────────┘

1. REQUEST ARRIVAL
   ┌────────────────────────────────────────────────────────────┐
   │ GET /api/loopnet/listings/map?north=41&south=40&...       │
   │ Headers:                                                   │
   │   - User-Agent: Mozilla/5.0...                             │
   │   - Accept: application/json                               │
   │   - If-None-Match: "abc123def" (optional ETag)             │
   └────────────────────────────────────────────────────────────┘
                              │
                              ▼
2. MIDDLEWARE PROCESSING
   ┌────────────────────────────────────────────────────────────┐
   │ Rate Limiter: Check if within 30 req/min limit             │
   │ ├─► If exceeded: 429 Too Many Requests                     │
   │ └─► If OK: Continue                                        │
   │                                                             │
   │ Input Validation: Validate bounds                          │
   │ ├─► north: 41 (valid)                                      │
   │ ├─► south: 40 (valid)                                      │
   │ ├─► east: -73 (valid)                                      │
   │ ├─► west: -74 (valid)                                      │
   │ └─► All valid: Continue                                    │
   │                                                             │
   │ Cache Check: Look for cached response                      │
   │ ├─► Key: viewport:41:40:-73:-74                            │
   │ ├─► ETag: "abc123def"                                      │
   │ └─► Not found: Continue to database                        │
   └────────────────────────────────────────────────────────────┘
                              │
                              ▼
3. DATABASE QUERY
   ┌────────────────────────────────────────────────────────────┐
   │ Query Execution (see Query Execution Plan above)           │
   │ ├─► Planning: 1.2ms                                        │
   │ ├─► Execution: 18.5ms                                      │
   │ └─► Total: 19.7ms                                          │
   │                                                             │
   │ Result Set: 847 rows                                       │
   │ ├─► listing_id, state_id                                   │
   │ ├─► latitude, longitude                                    │
   │ ├─► title, price, type, city, image_url                    │
   │ └─► Size: ~120 KB                                          │
   └────────────────────────────────────────────────────────────┘
                              │
                              ▼
4. DATA TRANSFORMATION
   ┌────────────────────────────────────────────────────────────┐
   │ Transform to API format:                                   │
   │                                                             │
   │ const properties = data.map(p => ({                        │
   │   listingId: p.listing_id,                                 │
   │   stateId: p.state_id,                                     │
   │   lat: parseFloat(p.latitude),                             │
   │   lng: parseFloat(p.longitude),                            │
   │   title: p.property_details.title,                         │
   │   price: p.property_details.price,                         │
   │   propertyType: p.property_details.property_type,          │
   │   city: p.property_details.city,                           │
   │   imageUrl: p.property_details.primary_image_url,          │
   │   url: `/listings/${p.listing_id}/${p.state_id}`           │
   │ }));                                                        │
   │                                                             │
   │ Time: ~2ms                                                 │
   └────────────────────────────────────────────────────────────┘
                              │
                              ▼
5. RESPONSE PREPARATION
   ┌────────────────────────────────────────────────────────────┐
   │ Build JSON response:                                       │
   │                                                             │
   │ {                                                           │
   │   "success": true,                                         │
   │   "type": "points",                                        │
   │   "count": 847,                                            │
   │   "viewport": {                                            │
   │     "north": 41,                                           │
   │     "south": 40,                                           │
   │     "east": -73,                                           │
   │     "west": -74                                            │
   │   },                                                       │
   │   "properties": [ ...847 properties... ],                 │
   │   "hasMore": false                                         │
   │ }                                                           │
   │                                                             │
   │ Generate ETag: MD5(JSON.stringify(data))                  │
   │ └─► "xyz789abc"                                            │
   │                                                             │
   │ Cache response (5 minutes)                                 │
   │ └─► Redis key: viewport:41:40:-73:-74                      │
   └────────────────────────────────────────────────────────────┘
                              │
                              ▼
6. RESPONSE SENT
   ┌────────────────────────────────────────────────────────────┐
   │ HTTP/1.1 200 OK                                            │
   │ Content-Type: application/json                             │
   │ Content-Length: 123456                                     │
   │ ETag: "xyz789abc"                                          │
   │ Cache-Control: public, max-age=60                          │
   │ X-Response-Time: 24ms                                      │
   │                                                             │
   │ { "success": true, "count": 847, ... }                     │
   └────────────────────────────────────────────────────────────┘
                              │
                              ▼
7. CLIENT RECEIVES
   ┌────────────────────────────────────────────────────────────┐
   │ Browser receives JSON (123 KB)                             │
   │ Parse JSON: ~3ms                                           │
   │ Update map: ~15ms (create 847 markers)                     │
   │                                                             │
   │ Total user-perceived latency:                              │
   │ Network (50ms) + Server (24ms) + Client (18ms) = 92ms     │
   │                                                             │
   │ ✓ EXCELLENT (target: <100ms)                               │
   └────────────────────────────────────────────────────────────┘

PERFORMANCE BREAKDOWN:
┌──────────────────┬──────────┬──────────────────────────────┐
│ Stage            │ Duration │ Optimization                  │
├──────────────────┼──────────┼──────────────────────────────┤
│ Network          │   50ms   │ Use CDN, compression          │
│ Rate Limit       │   <1ms   │ In-memory check               │
│ Cache Check      │    2ms   │ Redis lookup                  │
│ Database Query   │   20ms   │ Indexes (CRITICAL)            │
│ Transformation   │    2ms   │ Efficient mapping             │
│ JSON Stringify   │    3ms   │ Minimize data size            │
│ Client Render    │   18ms   │ Virtual DOM, batching         │
├──────────────────┼──────────┼──────────────────────────────┤
│ TOTAL            │   95ms   │ ✓ Under 100ms target          │
└──────────────────┴──────────┴──────────────────────────────┘
```

---

## Clustering Algorithm Visualization

```
ZOOM LEVEL 10 (City view)
Grid size: ~50km

┌─────────────────────────────────────────────────────────────┐
│                        Viewport                             │
│                                                             │
│   Grid Cell 1       Grid Cell 2       Grid Cell 3          │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│   │ • • •    │      │          │      │ •        │         │
│   │ • • •    │      │    •     │      │          │         │
│   │ • •      │      │          │      │          │         │
│   │ • • •    │      │    •     │      │          │         │
│   │          │      │    •     │      │          │         │
│   └──────────┘      └──────────┘      └──────────┘         │
│   10 properties     3 properties      1 property           │
│   → Cluster (10)    → Cluster (3)     → Point             │
│                                                             │
│   Cluster Response:                                         │
│   {                                                         │
│     type: "cluster",                                        │
│     lat: 40.75,                                             │
│     lng: -73.98,                                            │
│     count: 10,                                              │
│     bounds: { north: 40.76, south: 40.74, ... }            │
│   }                                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

ZOOM LEVEL 15 (Street view)
Grid size: ~1.5km

┌─────────────────────────────────────────────────────────────┐
│                        Viewport                             │
│                                                             │
│   Grid Cell 1  Grid Cell 2  Grid Cell 3  Grid Cell 4       │
│   ┌────┐      ┌────┐       ┌────┐       ┌────┐            │
│   │ •  │      │ •  │       │    │       │ •  │            │
│   │    │      │ •  │       │ •  │       │    │            │
│   └────┘      └────┘       └────┘       └────┘            │
│   1 prop      2 props      1 prop       1 prop            │
│   → Point     → Cluster    → Point      → Point           │
│                                                             │
│   All individual properties now visible!                   │
│   User can click each marker separately                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Grid size calculation:
gridSize = 0.5 / Math.pow(2, zoom - 10)

Zoom 10: 0.5 / 2^0  = 0.5°   (~55km)
Zoom 11: 0.5 / 2^1  = 0.25°  (~27km)
Zoom 12: 0.5 / 2^2  = 0.125° (~14km)
Zoom 13: 0.5 / 2^3  = 0.0625° (~7km)
Zoom 14: 0.5 / 2^4  = 0.03°  (~3.5km)
Zoom 15: 0.5 / 2^5  = 0.015° (~1.7km)
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                          │
└─────────────────────────────────────────────────────────────┘

Scenario 1: Invalid Bounds
───────────────────────────
Request: ?north=100&south=40&east=-73&west=-74

Validation:
  north > 90? ✗ FAIL
  ├─► Error: "Invalid north bound (must be -90 to 90)"
  └─► Response: 400 Bad Request

Response:
{
  "success": false,
  "error": "Invalid coordinate bounds",
  "details": {
    "north": "Must be between -90 and 90",
    "provided": 100
  }
}

Scenario 2: No Properties Found
────────────────────────────────
Request: ?north=90&south=89&east=0&west=-1 (Arctic Ocean)

Database: Returns 0 rows

Response:
{
  "success": true,
  "count": 0,
  "properties": [],
  "message": "No properties found in this area",
  "suggestions": {
    "action": "Try zooming out or moving the map",
    "nearbyStates": ["AK"],
    "popularCities": ["Anchorage", "Fairbanks"]
  }
}

Scenario 3: Database Timeout
─────────────────────────────
Request: Very large viewport with complex filters

Database:
  Query timeout (>5 seconds)
  ├─► Error: "timeout"
  └─► Status: 503

Response:
{
  "success": false,
  "error": "Database query timeout",
  "suggestion": "The viewport contains too many properties. Try zooming in.",
  "retryAfter": 60
}

Scenario 4: Rate Limit Exceeded
────────────────────────────────
Request: 31st request in same minute

Rate Limiter:
  30 requests in last 60 seconds
  ├─► Limit: 30/minute
  └─► Status: 429

Response:
{
  "success": false,
  "error": "Too many requests",
  "message": "Please wait before making more requests",
  "retryAfter": 45
}

Headers:
  X-RateLimit-Limit: 30
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1699999999

Scenario 5: Missing Coordinates
────────────────────────────────
Request: /api/loopnet/listings/999999/99/coordinates

Database: Returns null latitude/longitude

Response:
{
  "success": false,
  "error": "Coordinates not available for this listing",
  "listingId": "999999",
  "stateId": "99",
  "suggestion": "Property may not have been geocoded yet"
}

Status: 404 Not Found
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-06
**Purpose**: Visual reference for system architecture
