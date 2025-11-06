# Map Implementation Guide

## Quick Start - Get Map Running in 30 Minutes

This guide walks through implementing the Zillow-style map interface from MVP to production-ready.

### Prerequisites

- Node.js 18+ installed
- Supabase project configured
- Google Maps API key
- Existing `/api/loopnet/listings` endpoint working

### Files You Need

```
/Users/default/property-dashboard/
├── MAP_ARCHITECTURE.md           # Complete architecture documentation
├── map-api-implementation.js      # Ready-to-use API endpoint code
├── migrations/
│   └── 001_map_optimizations.sql # Database indexes and optimizations
└── IMPLEMENTATION_GUIDE.md        # This file
```

---

## Phase 1: Database Setup (10 minutes)

### Step 1: Run the migration

```bash
# Connect to your Supabase database
# Option A: Using Supabase CLI
supabase db push

# Option B: Run SQL directly in Supabase Studio
# 1. Open https://app.supabase.com
# 2. Go to SQL Editor
# 3. Copy contents of migrations/001_map_optimizations.sql
# 4. Execute the SQL

# Option C: Using psql
psql $DATABASE_URL -f migrations/001_map_optimizations.sql
```

### Step 2: Verify indexes were created

```bash
node -e "
const { supabase } = require('./supabase-config');
(async () => {
  // Test bounding box query performance
  const start = Date.now();
  const { data, error } = await supabase
    .from('property_listings')
    .select('listing_id, latitude, longitude')
    .gte('latitude', 40.5)
    .lte('latitude', 41.0)
    .gte('longitude', -74.5)
    .lte('longitude', -73.5)
    .eq('active_inactive', true)
    .limit(100);

  const duration = Date.now() - start;
  console.log('Query returned', data?.length, 'results in', duration, 'ms');
  console.log(duration < 100 ? '✓ Performance looks good!' : '⚠ Query is slow, check indexes');
})();
"
```

Expected output:
```
Query returned 100 results in 45 ms
✓ Performance looks good!
```

---

## Phase 2: Backend API Setup (15 minutes)

### Step 1: Add map endpoints to server.js

Open `/Users/default/property-dashboard/server.js` and add the following:

```javascript
// Add this after your existing LoopNet endpoints (around line 560)

// ===== MAP API ENDPOINTS =====

// 1. State statistics (for default map center)
app.get('/api/loopnet/stats/by-state', async (req, res) => {
  try {
    // Use cached version if available
    const cached = statsCache?.get('state-stats');
    if (cached) {
      return res.json(cached);
    }

    // Query state statistics from materialized view
    const { data, error } = await supabase
      .from('state_statistics')
      .select('*')
      .order('property_count', { ascending: false });

    if (error) throw error;

    // Format response
    const result = {
      success: true,
      defaultCenter: {
        lat: 39.8283,
        lng: -98.5795,
        zoom: 4,
        reason: "US geographic center"
      },
      states: data.map(s => ({
        stateCode: s.state_code,
        stateName: getStateName(s.state_code),
        count: s.property_count,
        center: {
          lat: parseFloat(s.center_lat),
          lng: parseFloat(s.center_lng)
        },
        bounds: {
          north: parseFloat(s.north_bound),
          south: parseFloat(s.south_bound),
          east: parseFloat(s.east_bound),
          west: parseFloat(s.west_bound)
        },
        citiesCount: s.cities_count,
        propertyTypesCount: s.property_types_count
      })),
      totalProperties: data.reduce((sum, s) => sum + s.property_count, 0),
      statesWithProperties: data.length
    };

    // Cache for 1 hour
    if (statsCache) {
      statsCache.set('state-stats', result);
    }

    res.json(result);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Map viewport query
app.get('/api/loopnet/listings/map', async (req, res) => {
  // Copy implementation from map-api-implementation.js
  // See full code in that file
});

// 3. Single property coordinates
app.get('/api/loopnet/listings/:listing_id/:state_id/coordinates', async (req, res) => {
  // Copy implementation from map-api-implementation.js
});

// 4. Combined viewport (map + list)
app.get('/api/loopnet/listings/viewport', async (req, res) => {
  // Copy implementation from map-api-implementation.js
});

// Helper functions
function getStateName(code) {
  const states = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };
  return states[code] || code;
}

// ===== END MAP ENDPOINTS =====
```

### Step 2: Add optional caching (recommended)

```bash
npm install node-cache
```

Add to top of server.js:
```javascript
const NodeCache = require('node-cache');
const statsCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
```

### Step 3: Test the endpoints

```bash
# Start server
node server.js

# In another terminal, test the endpoints:

# Test 1: State statistics
curl "http://localhost:3000/api/loopnet/stats/by-state" | jq .

# Expected: List of states with property counts and bounds

# Test 2: Map viewport
curl "http://localhost:3000/api/loopnet/listings/map?north=41&south=40&east=-73&west=-74" | jq .

# Expected: Array of properties within bounds

# Test 3: Single property coordinates
curl "http://localhost:3000/api/loopnet/listings/10794955/17/coordinates" | jq .

# Expected: Coordinates for specific property
```

---

## Phase 3: Frontend Implementation (varies)

### Option A: Minimal HTML + Google Maps (Quick Test)

Create `/Users/default/property-dashboard/public/map-test.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Property Map Test</title>
    <style>
        #map { height: 100vh; width: 100%; }
        body { margin: 0; padding: 0; }
    </style>
</head>
<body>
    <div id="map"></div>

    <script>
        let map;
        let markers = [];

        async function initMap() {
            // Get default center from API
            const statsRes = await fetch('/api/loopnet/stats/by-state');
            const stats = await statsRes.json();
            const center = stats.defaultCenter;

            // Initialize map
            map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: center.lat, lng: center.lng },
                zoom: center.zoom
            });

            // Load initial properties
            await loadMapProperties();

            // Reload when map stops moving
            let moveTimeout;
            map.addListener('bounds_changed', () => {
                clearTimeout(moveTimeout);
                moveTimeout = setTimeout(loadMapProperties, 500);
            });
        }

        async function loadMapProperties() {
            const bounds = map.getBounds();
            if (!bounds) return;

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();

            // Fetch properties in viewport
            const res = await fetch(
                `/api/loopnet/listings/map?` +
                `north=${ne.lat()}&south=${sw.lat()}&` +
                `east=${ne.lng()}&west=${sw.lng()}`
            );

            const data = await res.json();

            // Clear old markers
            markers.forEach(m => m.setMap(null));
            markers = [];

            // Add new markers
            data.properties?.forEach(prop => {
                const marker = new google.maps.Marker({
                    position: { lat: prop.lat, lng: prop.lng },
                    map: map,
                    title: prop.title
                });

                // Add info window
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="max-width: 200px;">
                            <h3 style="margin: 0 0 8px 0;">${prop.title}</h3>
                            <p style="margin: 4px 0;">
                                <strong>Price:</strong> ${prop.price || 'N/A'}<br>
                                <strong>Type:</strong> ${prop.propertyType || 'N/A'}<br>
                                <strong>City:</strong> ${prop.city || 'N/A'}
                            </p>
                            <a href="/listings/${prop.listingId}/${prop.stateId}"
                               target="_blank">View Details</a>
                        </div>
                    `
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });

                markers.push(marker);
            });

            console.log(`Loaded ${data.properties?.length || 0} properties`);
        }
    </script>

    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_API_KEY&callback=initMap" async defer></script>
</body>
</html>
```

Test it:
```bash
open http://localhost:3000/map-test.html
```

### Option B: React Component (Production)

Create `/Users/default/property-dashboard/src/components/PropertyMap.jsx`:

```javascript
import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';

const PropertyMap = () => {
  const [map, setMap] = useState(null);
  const [properties, setProperties] = useState([]);
  const [center, setCenter] = useState({ lat: 39.8283, lng: -98.5795 });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loading, setLoading] = useState(false);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY'
  });

  // Load default center on mount
  useEffect(() => {
    fetch('/api/loopnet/stats/by-state')
      .then(res => res.json())
      .then(data => {
        setCenter(data.defaultCenter);
      });
  }, []);

  // Load properties when bounds change
  const handleBoundsChanged = () => {
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    setLoading(true);

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    fetch(
      `/api/loopnet/listings/map?` +
      `north=${ne.lat()}&south=${sw.lat()}&` +
      `east=${ne.lng()}&west=${sw.lng()}`
    )
      .then(res => res.json())
      .then(data => {
        setProperties(data.properties || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load properties:', err);
        setLoading(false);
      });
  };

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <GoogleMap
        center={center}
        zoom={4}
        mapContainerStyle={{ width: '100%', height: '100%' }}
        onLoad={setMap}
        onBoundsChanged={handleBoundsChanged}
      >
        {properties.map(prop => (
          <Marker
            key={`${prop.listingId}-${prop.stateId}`}
            position={{ lat: prop.lat, lng: prop.lng }}
            onClick={() => setSelectedProperty(prop)}
          />
        ))}

        {selectedProperty && (
          <InfoWindow
            position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
            onCloseClick={() => setSelectedProperty(null)}
          >
            <div style={{ maxWidth: 200 }}>
              <h3>{selectedProperty.title}</h3>
              <p>
                <strong>Price:</strong> {selectedProperty.price || 'N/A'}<br />
                <strong>Type:</strong> {selectedProperty.propertyType || 'N/A'}<br />
                <strong>City:</strong> {selectedProperty.city || 'N/A'}
              </p>
              <a href={selectedProperty.url}>View Details</a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {loading && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          padding: '8px 16px',
          borderRadius: 4,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          Loading properties...
        </div>
      )}
    </div>
  );
};

export default PropertyMap;
```

Install dependencies:
```bash
npm install @react-google-maps/api
```

---

## Phase 4: Testing & Validation

### Performance Benchmarks

```bash
# Create a test script
cat > test-map-performance.js << 'EOF'
const fetch = require('node-fetch');

async function testMapPerformance() {
  const testCases = [
    { name: 'NYC area', north: 40.917, south: 40.477, east: -73.700, west: -74.259 },
    { name: 'LA area', north: 34.337, south: 33.704, east: -118.155, west: -118.668 },
    { name: 'Wide view', north: 50, south: 30, east: -70, west: -120 }
  ];

  for (const test of testCases) {
    const start = Date.now();

    const res = await fetch(
      `http://localhost:3000/api/loopnet/listings/map?` +
      `north=${test.north}&south=${test.south}&` +
      `east=${test.east}&west=${test.west}`
    );

    const data = await res.json();
    const duration = Date.now() - start;

    console.log(`${test.name}:`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Properties: ${data.properties?.length || 0}`);
    console.log(`  Status: ${duration < 100 ? '✓ PASS' : '⚠ SLOW'}`);
    console.log();
  }
}

testMapPerformance().catch(console.error);
EOF

node test-map-performance.js
```

Expected output:
```
NYC area:
  Duration: 45ms
  Properties: 234
  Status: ✓ PASS

LA area:
  Duration: 62ms
  Properties: 456
  Status: ✓ PASS

Wide view:
  Duration: 89ms
  Properties: 1000
  Status: ✓ PASS
```

### Functional Tests

```bash
# Test all endpoints
cat > test-map-endpoints.sh << 'EOF'
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "Testing Map API Endpoints..."
echo

# Test 1: State statistics
echo "1. Testing /api/loopnet/stats/by-state"
curl -s "$BASE_URL/api/loopnet/stats/by-state" | jq '.success, .states | length'
echo

# Test 2: Map viewport
echo "2. Testing /api/loopnet/listings/map"
curl -s "$BASE_URL/api/loopnet/listings/map?north=41&south=40&east=-73&west=-74" | jq '.success, .count'
echo

# Test 3: Single property coordinates
echo "3. Testing /api/loopnet/listings/:id/coordinates"
curl -s "$BASE_URL/api/loopnet/listings/10794955/17/coordinates" | jq '.success, .coordinates'
echo

# Test 4: Viewport combined
echo "4. Testing /api/loopnet/listings/viewport"
curl -s "$BASE_URL/api/loopnet/listings/viewport?north=41&south=40&east=-73&west=-74&page=1&limit=10" | jq '.success, .map.count, .list.pagination.total'
echo

echo "All tests completed!"
EOF

chmod +x test-map-endpoints.sh
./test-map-endpoints.sh
```

---

## Phase 5: Optimization & Monitoring

### Add Redis Caching (Optional)

```bash
npm install redis
```

Add to server.js:
```javascript
const redis = require('redis');
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', err => console.log('Redis Client Error', err));
redisClient.connect();

// Cache middleware
async function cacheMiddleware(req, res, next) {
  const cacheKey = `map:${req.url}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to cache response
    res.json = (data) => {
      redisClient.setEx(cacheKey, 300, JSON.stringify(data)); // 5 min cache
      return originalJson(data);
    };

    next();
  } catch (err) {
    console.error('Cache error:', err);
    next();
  }
}

// Apply to map endpoints
app.get('/api/loopnet/listings/map', cacheMiddleware, async (req, res) => {
  // ... existing code
});
```

### Add Request Logging

```bash
npm install winston morgan
```

Add to server.js:
```javascript
const winston = require('winston');
const morgan = require('morgan');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// HTTP request logging
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Log slow queries
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Slow request', {
        method: req.method,
        url: req.url,
        duration,
        query: req.query
      });
    }
  });
  next();
});
```

---

## Troubleshooting

### Issue: Queries are slow (>500ms)

**Solution:**
```bash
# Check if indexes exist
psql $DATABASE_URL -c "
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('property_listings', 'property_details')
  AND indexname LIKE 'idx_%';
"

# If missing, re-run migration
psql $DATABASE_URL -f migrations/001_map_optimizations.sql

# Analyze tables
psql $DATABASE_URL -c "ANALYZE property_listings; ANALYZE property_details;"
```

### Issue: State statistics return empty

**Solution:**
```bash
# Check if materialized view exists
psql $DATABASE_URL -c "SELECT * FROM state_statistics LIMIT 5;"

# If empty, refresh it
psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW state_statistics;"
```

### Issue: No properties returned

**Solution:**
```bash
# Verify coordinates exist
node -e "
const { supabase } = require('./supabase-config');
(async () => {
  const { count } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  console.log('Properties with coordinates:', count);
})();
"
```

### Issue: CORS errors from frontend

**Solution:**
Add to server.js:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Add your frontend URLs
  credentials: true
}));
```

---

## Production Deployment Checklist

- [ ] Run database migration on production
- [ ] Verify all indexes created
- [ ] Set up Redis cache (optional but recommended)
- [ ] Configure rate limiting
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Enable request logging
- [ ] Set up daily cron job to refresh state_statistics
- [ ] Load test with expected traffic (use Artillery or k6)
- [ ] Set up error alerting (Sentry, Rollbar)
- [ ] Configure CDN for static assets
- [ ] Enable gzip compression
- [ ] Set up database connection pooling
- [ ] Configure backup schedule
- [ ] Document API endpoints in Swagger/OpenAPI

---

## Next Steps

1. **MVP Complete** → Test with real users, gather feedback
2. **Add Clustering** → Implement server-side clustering for dense areas
3. **Add Filters** → Integrate filter panel with map + list sync
4. **Mobile Responsive** → Optimize for mobile devices
5. **Real-time Updates** → Add WebSocket for live property updates
6. **Advanced Search** → Polygon drawing, radius search, etc.

---

## Support & Resources

- **Architecture Doc**: `/Users/default/property-dashboard/MAP_ARCHITECTURE.md`
- **API Implementation**: `/Users/default/property-dashboard/map-api-implementation.js`
- **Database Migration**: `/Users/default/property-dashboard/migrations/001_map_optimizations.sql`

- **Google Maps Docs**: https://developers.google.com/maps/documentation/javascript
- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Performance**: https://www.postgresql.org/docs/current/performance-tips.html

---

**Implementation Version**: 1.0
**Last Updated**: 2025-11-06
**Estimated Setup Time**: 30-60 minutes
