# Map API Quick Reference

## Endpoints Summary

### 1. GET /api/loopnet/stats/by-state

**Purpose**: Get default map center and state-level statistics

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "defaultCenter": {
    "lat": 39.8283,
    "lng": -98.5795,
    "zoom": 4
  },
  "states": [
    {
      "stateCode": "CA",
      "stateName": "California",
      "count": 3245,
      "center": { "lat": 36.7783, "lng": -119.4179 },
      "bounds": { "north": 42.01, "south": 32.53, "east": -114.13, "west": -124.41 }
    }
  ],
  "totalProperties": 23951
}
```

**Use Case**: Page load - determine where to center map initially

**Cache**: 1 hour

**Performance**: <100ms

---

### 2. GET /api/loopnet/listings/map

**Purpose**: Get properties within map viewport

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| north | float | Yes | Northern latitude bound (-90 to 90) |
| south | float | Yes | Southern latitude bound (-90 to 90) |
| east | float | Yes | Eastern longitude bound (-180 to 180) |
| west | float | Yes | Western longitude bound (-180 to 180) |
| cluster | boolean | No | Enable server-side clustering (default: false) |
| zoom | int | No | Map zoom level (for clustering density) |
| property_type | string | No | Filter by property type |
| city | string | No | Filter by city |
| state_code | string | No | Filter by state (2-letter code) |
| search | string | No | Search in title/description |

**Response**:
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

**Use Case**: Map panning/zooming - fetch properties in new viewport

**Cache**: 5 minutes

**Performance**: 10-50ms (cached: 5-10ms)

**Rate Limit**: 30 requests/minute

---

### 3. GET /api/loopnet/listings/:listing_id/:state_id/coordinates

**Purpose**: Get coordinates for a specific property

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| listing_id | string | Yes | Property listing ID |
| state_id | string | Yes | Property state ID |

**Response**:
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

**Use Case**: Clicking property card in list view → center map on that property

**Cache**: 1 hour (coordinates don't change often)

**Performance**: <20ms

---

### 4. GET /api/loopnet/listings/viewport

**Purpose**: Combined endpoint - returns both map markers AND paginated list

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| north | float | Yes | Northern latitude bound |
| south | float | Yes | Southern latitude bound |
| east | float | Yes | Eastern longitude bound |
| west | float | Yes | Western longitude bound |
| page | int | No | Page number (default: 1) |
| limit | int | No | Items per page (default: 20, max: 100) |
| sort_by | string | No | Sort field (default: "last_updated") |
| sort_order | string | No | "asc" or "desc" (default: "desc") |
| property_type | string | No | Filter by property type |
| city | string | No | Filter by city |
| state_code | string | No | Filter by state |
| search | string | No | Search in title/description |

**Response**:
```json
{
  "success": true,
  "map": {
    "type": "points",
    "count": 847,
    "properties": [ /* Simplified markers */ ]
  },
  "list": {
    "data": [ /* Full property details */ ],
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

**Use Case**: Single request to update both map and list view

**Cache**: 5 minutes

**Performance**: 20-100ms

**Rate Limit**: 30 requests/minute

---

## Common Usage Patterns

### Pattern 1: Initial Page Load

```javascript
// Step 1: Get default center
const stats = await fetch('/api/loopnet/stats/by-state');
const { defaultCenter } = await stats.json();

// Step 2: Initialize map
const map = new google.maps.Map(document.getElementById('map'), {
  center: { lat: defaultCenter.lat, lng: defaultCenter.lng },
  zoom: defaultCenter.zoom
});

// Step 3: Load initial properties
const bounds = map.getBounds();
const ne = bounds.getNorthEast();
const sw = bounds.getSouthWest();

const response = await fetch(
  `/api/loopnet/listings/map?` +
  `north=${ne.lat()}&south=${sw.lat()}&` +
  `east=${ne.lng()}&west=${sw.lng()}`
);

const { properties } = await response.json();
// Render markers...
```

### Pattern 2: Map Pan/Zoom

```javascript
let boundsTimeout;

map.addListener('bounds_changed', () => {
  // Debounce to avoid excessive requests
  clearTimeout(boundsTimeout);

  boundsTimeout = setTimeout(async () => {
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const response = await fetch(
      `/api/loopnet/listings/map?` +
      `north=${ne.lat()}&south=${sw.lat()}&` +
      `east=${ne.lng()}&west=${sw.lng()}`
    );

    const { properties } = await response.json();

    // Clear old markers
    markers.forEach(m => m.setMap(null));

    // Add new markers
    properties.forEach(prop => {
      const marker = new google.maps.Marker({
        position: { lat: prop.lat, lng: prop.lng },
        map: map
      });
      markers.push(marker);
    });
  }, 500); // Wait 500ms after user stops panning
});
```

### Pattern 3: Click Property Card → Show on Map

```javascript
async function showPropertyOnMap(listingId, stateId) {
  // Fetch coordinates
  const response = await fetch(
    `/api/loopnet/listings/${listingId}/${stateId}/coordinates`
  );

  const { coordinates } = await response.json();

  // Pan map to property
  map.panTo({ lat: coordinates.lat, lng: coordinates.lng });
  map.setZoom(15);

  // Find and highlight marker
  const marker = markers.find(
    m => m.listingId === listingId && m.stateId === stateId
  );

  if (marker) {
    // Bounce animation
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 2000);

    // Open info window
    infoWindow.open(map, marker);
  }
}
```

### Pattern 4: Filter Change

```javascript
async function applyFilters(filters) {
  const bounds = map.getBounds();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const params = new URLSearchParams({
    north: ne.lat(),
    south: sw.lat(),
    east: ne.lng(),
    west: sw.lng(),
    ...filters // property_type, city, etc.
  });

  // Use combined endpoint to update both map and list
  const response = await fetch(
    `/api/loopnet/listings/viewport?${params}`
  );

  const { map: mapData, list: listData } = await response.json();

  // Update map markers
  updateMarkers(mapData.properties);

  // Update list view
  updateListView(listData.data);

  // Update pagination
  updatePagination(listData.pagination);
}
```

### Pattern 5: Pagination (List Only)

```javascript
async function changePage(pageNumber) {
  const bounds = map.getBounds();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const params = new URLSearchParams({
    north: ne.lat(),
    south: sw.lat(),
    east: ne.lng(),
    west: sw.lng(),
    page: pageNumber,
    limit: 20
  });

  const response = await fetch(
    `/api/loopnet/listings/viewport?${params}`
  );

  const { list } = await response.json();

  // Update only the list, keep map unchanged
  updateListView(list.data);
  updatePagination(list.pagination);

  // Note: Map stays the same - markers represent ALL items in viewport,
  // not just current page
}
```

---

## Error Handling

### Example: Handle All Error Cases

```javascript
async function fetchMapData(bounds) {
  try {
    const response = await fetch(
      `/api/loopnet/listings/map?` +
      `north=${bounds.north}&south=${bounds.south}&` +
      `east=${bounds.east}&west=${bounds.west}`
    );

    // Rate limit
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      showError(`Too many requests. Please wait ${retryAfter} seconds.`);
      return;
    }

    // Bad request (invalid bounds)
    if (response.status === 400) {
      const error = await response.json();
      showError(error.error);
      return;
    }

    // Server error
    if (response.status >= 500) {
      showError('Server error. Please try again later.');
      return;
    }

    const data = await response.json();

    // No properties found
    if (data.count === 0) {
      showMessage('No properties found in this area. Try zooming out.');
      return;
    }

    // Success
    return data.properties;

  } catch (error) {
    // Network error
    console.error('Network error:', error);
    showError('Unable to connect to server. Check your internet connection.');
  }
}
```

---

## Performance Tips

### 1. Use Debouncing

Always debounce map movement events to avoid excessive API calls:

```javascript
let debounceTimer;
const DEBOUNCE_DELAY = 500; // ms

map.addListener('bounds_changed', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchMapData, DEBOUNCE_DELAY);
});
```

### 2. Cache Responses

Use browser cache with ETags:

```javascript
async function fetchWithCache(url) {
  const cached = localStorage.getItem(url);
  const headers = {};

  if (cached) {
    const { etag, data, timestamp } = JSON.parse(cached);

    // If cache is less than 5 minutes old, use it
    if (Date.now() - timestamp < 5 * 60 * 1000) {
      return data;
    }

    // Otherwise, check with server using ETag
    headers['If-None-Match'] = etag;
  }

  const response = await fetch(url, { headers });

  if (response.status === 304) {
    // Not modified, use cached version
    return JSON.parse(cached).data;
  }

  const data = await response.json();
  const etag = response.headers.get('ETag');

  // Store in cache
  localStorage.setItem(url, JSON.stringify({
    etag,
    data,
    timestamp: Date.now()
  }));

  return data;
}
```

### 3. Virtualize Large Lists

For lists with many items, use virtualization:

```javascript
import { FixedSizeList } from 'react-window';

function PropertyList({ properties }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={properties.length}
      itemSize={120}
      width="100%"
    >
      {({ index, style }) => (
        <PropertyCard
          key={properties[index].listingId}
          property={properties[index]}
          style={style}
        />
      )}
    </FixedSizeList>
  );
}
```

### 4. Load Images Lazily

Use lazy loading for property images:

```javascript
<img
  src={property.imageUrl}
  loading="lazy"
  alt={property.title}
  onError={(e) => {
    e.target.src = '/placeholder-image.jpg';
  }}
/>
```

### 5. Batch Marker Updates

Update markers in batches to avoid UI jank:

```javascript
function updateMarkers(properties) {
  // Clear old markers
  markers.forEach(m => m.setMap(null));
  markers = [];

  // Add new markers in batches
  const BATCH_SIZE = 50;
  let i = 0;

  function addBatch() {
    const end = Math.min(i + BATCH_SIZE, properties.length);

    for (; i < end; i++) {
      const prop = properties[i];
      const marker = new google.maps.Marker({
        position: { lat: prop.lat, lng: prop.lng },
        map: map
      });
      markers.push(marker);
    }

    if (i < properties.length) {
      requestAnimationFrame(addBatch);
    }
  }

  addBatch();
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/loopnet/stats/by-state | 10 | 15 minutes |
| /api/loopnet/listings/map | 30 | 1 minute |
| /api/loopnet/listings/:id/coordinates | 100 | 15 minutes |
| /api/loopnet/listings/viewport | 30 | 1 minute |

**Headers Returned**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process data |
| 304 | Not Modified | Use cached version |
| 400 | Bad Request | Check parameters |
| 404 | Not Found | Handle gracefully |
| 429 | Too Many Requests | Retry after delay |
| 500 | Server Error | Show error message, retry |
| 503 | Service Unavailable | Retry with exponential backoff |

---

## Testing Commands

```bash
# Test state statistics
curl "http://localhost:3000/api/loopnet/stats/by-state" | jq .

# Test map viewport
curl "http://localhost:3000/api/loopnet/listings/map?north=41&south=40&east=-73&west=-74" | jq .

# Test with filters
curl "http://localhost:3000/api/loopnet/listings/map?north=41&south=40&east=-73&west=-74&property_type=Office" | jq .

# Test coordinates
curl "http://localhost:3000/api/loopnet/listings/10794955/17/coordinates" | jq .

# Test combined viewport
curl "http://localhost:3000/api/loopnet/listings/viewport?north=41&south=40&east=-73&west=-74&page=1&limit=10" | jq .

# Test invalid bounds
curl "http://localhost:3000/api/loopnet/listings/map?north=100&south=40&east=-73&west=-74"
# Expected: 400 Bad Request

# Load test
ab -n 100 -c 10 "http://localhost:3000/api/loopnet/listings/map?north=41&south=40&east=-73&west=-74"
```

---

## Database Queries Reference

### Check Index Usage

```sql
-- Verify bounding box query uses index
EXPLAIN ANALYZE
SELECT pl.listing_id, pl.latitude, pl.longitude
FROM property_listings pl
WHERE pl.latitude BETWEEN 40 AND 41
  AND pl.longitude BETWEEN -74 AND -73
  AND pl.active_inactive = true
LIMIT 1000;

-- Expected: "Index Scan using idx_listings_lat_lng_active"
```

### Refresh State Statistics

```sql
-- Refresh materialized view (run daily)
REFRESH MATERIALIZED VIEW CONCURRENTLY state_statistics;

-- Check last update
SELECT state_code, property_count, last_updated
FROM state_statistics
ORDER BY property_count DESC
LIMIT 5;
```

### Find Properties Without Coordinates

```sql
-- Audit missing coordinates
SELECT COUNT(*)
FROM property_listings
WHERE latitude IS NULL
   OR longitude IS NULL;

-- Get list for geocoding
SELECT listing_id, state_id
FROM property_listings pl
JOIN property_details pd
  ON pl.listing_id = pd.listing_id
  AND pl.state_id = pd.state_id
WHERE (pl.latitude IS NULL OR pl.longitude IS NULL)
  AND pd.street_address IS NOT NULL
LIMIT 100;
```

---

## Troubleshooting

### Slow Queries

**Symptom**: Queries taking >100ms

**Solution**:
```bash
# Check if indexes exist
psql $DATABASE_URL -c "\d property_listings"

# Look for: idx_listings_lat_lng_active

# If missing, recreate:
psql $DATABASE_URL -f migrations/001_map_optimizations.sql

# Analyze tables
psql $DATABASE_URL -c "ANALYZE property_listings; ANALYZE property_details;"
```

### No Data Returned

**Symptom**: Empty results from API

**Check**:
```bash
# Verify coordinates exist
node -e "
const { supabase } = require('./supabase-config');
(async () => {
  const { count } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null);
  console.log('Properties with coordinates:', count);
})();
"
```

### CORS Errors

**Symptom**: Browser console shows CORS error

**Solution**:
Add to server.js:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-06
**Purpose**: Quick API reference and usage guide
