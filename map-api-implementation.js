// =====================================================================
// MAP API IMPLEMENTATION - Ready to integrate into server.js
// =====================================================================
// This file contains complete implementations of all map-related endpoints
// Copy these into your server.js file

const { supabase } = require('./supabase-config');

// =====================================================================
// 1. GET /api/loopnet/stats/by-state
// Purpose: Determine default map center and state-level statistics
// =====================================================================

app.get('/api/loopnet/stats/by-state', async (req, res) => {
  try {
    // Get state-level aggregations
    const { data: stateData, error: stateError } = await supabase
      .from('property_details')
      .select('state_code')
      .not('state_code', 'is', null)
      .not('title', 'is', null);

    if (stateError) throw stateError;

    // Count by state
    const stateCounts = {};
    stateData?.forEach(p => {
      stateCounts[p.state_code] = (stateCounts[p.state_code] || 0) + 1;
    });

    // Get coordinates for each state's center and bounds
    const statePromises = Object.keys(stateCounts).map(async (stateCode) => {
      const { data, error } = await supabase
        .from('property_listings')
        .select('latitude, longitude, property_details!inner(state_code)')
        .eq('property_details.state_code', stateCode)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .eq('active_inactive', true)
        .limit(1000);

      if (error || !data || data.length === 0) return null;

      const lats = data.map(p => parseFloat(p.latitude));
      const lngs = data.map(p => parseFloat(p.longitude));

      return {
        stateCode,
        stateName: getStateName(stateCode),
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
    });

    const stateCoords = (await Promise.all(statePromises)).filter(Boolean);

    // US geographic center (default fallback)
    const defaultCenter = {
      lat: 39.8283,
      lng: -98.5795,
      zoom: 4,
      reason: "US geographic center"
    };

    // Calculate overall bounds
    const allLats = stateCoords.flatMap(s => [s.bounds.north, s.bounds.south]);
    const allLngs = stateCoords.flatMap(s => [s.bounds.east, s.bounds.west]);

    const totalProperties = Object.values(stateCounts).reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      defaultCenter,
      overallBounds: {
        north: Math.max(...allLats),
        south: Math.min(...allLats),
        east: Math.max(...allLngs),
        west: Math.min(...allLngs)
      },
      states: stateCoords.sort((a, b) => b.count - a.count),
      totalProperties,
      statesWithProperties: Object.keys(stateCounts).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats by state error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================================
// 2. GET /api/loopnet/listings/map
// Purpose: Return listings within map viewport bounds
// =====================================================================

app.get('/api/loopnet/listings/map', async (req, res) => {
  try {
    const {
      north,
      south,
      east,
      west,
      cluster,
      zoom,
      property_type,
      city,
      state_code,
      price_min,
      price_max,
      search
    } = req.query;

    // Validate required bounds
    if (!north || !south || !east || !west) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: north, south, east, west'
      });
    }

    // Parse and validate bounds
    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    // Validate coordinate ranges
    if (bounds.north < -90 || bounds.north > 90 ||
        bounds.south < -90 || bounds.south > 90 ||
        bounds.east < -180 || bounds.east > 180 ||
        bounds.west < -180 || bounds.west > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinate bounds'
      });
    }

    if (bounds.north <= bounds.south) {
      return res.status(400).json({
        success: false,
        error: 'North bound must be greater than south bound'
      });
    }

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
          primary_image_url,
          building_size,
          lot_size
        )
      `)
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .eq('active_inactive', true)
      .not('property_details.title', 'is', null);

    // Apply filters
    if (property_type) {
      query = query.eq('property_details.property_type', property_type);
    }

    if (city) {
      query = query.ilike('property_details.city', `%${city}%`);
    }

    if (state_code) {
      query = query.eq('property_details.state_code', state_code);
    }

    if (search) {
      query = query.or(
        `property_details.title.ilike.%${search}%,property_details.description.ilike.%${search}%`,
        { foreignTable: 'property_details' }
      );
    }

    // Limit to prevent overload
    query = query.limit(1000);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data to map-friendly format
    const properties = data.map(p => ({
      listingId: p.listing_id,
      stateId: p.state_id,
      lat: parseFloat(p.latitude),
      lng: parseFloat(p.longitude),
      title: p.property_details.title,
      city: p.property_details.city,
      stateCode: p.property_details.state_code,
      propertyType: p.property_details.property_type,
      price: p.property_details.price,
      buildingSize: p.property_details.building_size,
      lotSize: p.property_details.lot_size,
      imageUrl: p.property_details.primary_image_url,
      url: `/listings/${p.listing_id}/${p.state_id}`
    }));

    // Clustering logic (if requested and count > 200)
    const shouldCluster = cluster === 'true' && properties.length > 200;

    if (shouldCluster) {
      const zoomLevel = parseInt(zoom) || 10;
      const clusters = performClustering(properties, zoomLevel);

      return res.json({
        success: true,
        type: 'clusters',
        count: properties.length,
        clusteredCount: clusters.length,
        viewport: bounds,
        clusters,
        hasMore: properties.length === 1000
      });
    }

    // Return individual points
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================================
// 3. GET /api/loopnet/listings/:listing_id/:state_id/coordinates
// Purpose: Fast coordinate lookup for single property
// =====================================================================

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
        property_details!inner(title, city, state_code)
      `)
      .eq('listing_id', listing_id)
      .eq('state_id', state_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Listing not found'
        });
      }
      throw error;
    }

    if (!data.latitude || !data.longitude) {
      return res.status(404).json({
        success: false,
        error: 'Coordinates not available for this listing'
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
      city: data.property_details.city,
      stateCode: data.property_details.state_code
    });

  } catch (error) {
    console.error('Coordinates lookup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================================
// 4. GET /api/loopnet/listings/viewport
// Purpose: Combined endpoint for both map markers AND listing cards
// =====================================================================

app.get('/api/loopnet/listings/viewport', async (req, res) => {
  try {
    const {
      north, south, east, west,
      page = 1,
      limit = 20,
      sort_by = 'last_updated',
      sort_order = 'desc',
      property_type,
      city,
      state_code,
      price_min,
      price_max,
      search
    } = req.query;

    // Validate viewport bounds
    if (!north || !south || !east || !west) {
      return res.status(400).json({
        success: false,
        error: 'Missing viewport bounds: north, south, east, west'
      });
    }

    const bounds = {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west)
    };

    // Build base query with bounds
    const buildBaseQuery = () => {
      let query = supabase
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

      // Apply filters
      if (property_type) {
        query = query.eq('property_details.property_type', property_type);
      }
      if (city) {
        query = query.ilike('property_details.city', `%${city}%`);
      }
      if (state_code) {
        query = query.eq('property_details.state_code', state_code);
      }
      if (search) {
        query = query.or(
          `property_details.title.ilike.%${search}%,property_details.description.ilike.%${search}%`
        );
      }

      return query;
    };

    // Execute map query (simplified data, no pagination, limited to 1000)
    let mapQuery = buildBaseQuery();
    mapQuery = mapQuery.select(`
      listing_id,
      state_id,
      latitude,
      longitude,
      property_details!inner(title, price, property_type)
    `).limit(1000);

    const { data: mapData } = await mapQuery;

    // Execute list query (full data, with pagination and sorting)
    let listQuery = buildBaseQuery();

    const validSortFields = ['last_updated', 'price', 'building_size', 'lot_size', 'city', 'title'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'last_updated';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    listQuery = listQuery
      .range(offset, offset + parseInt(limit) - 1)
      .order(`property_details.${sortField}`, {
        ascending: sort_order === 'asc',
        nullsFirst: false
      });

    const { data: listData, count } = await listQuery;

    // Get available filter values (for filter dropdowns)
    const { data: filterData } = await supabase
      .from('property_details')
      .select('property_type, city, state_code')
      .not('title', 'is', null)
      .limit(10000);

    const uniqueTypes = [...new Set(filterData?.map(p => p.property_type).filter(Boolean))].sort();
    const uniqueCities = [...new Set(filterData?.map(p => p.city).filter(Boolean))].sort();
    const uniqueStates = [...new Set(filterData?.map(p => p.state_code).filter(Boolean))].sort();

    // Format response
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
          price: p.property_details.price,
          propertyType: p.property_details.property_type
        })) || []
      },
      list: {
        data: listData?.map(p => ({
          listingId: p.listing_id,
          stateId: p.state_id,
          lat: parseFloat(p.latitude),
          lng: parseFloat(p.longitude),
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
        propertyTypes: uniqueTypes,
        cities: uniqueCities.slice(0, 100), // Limit to top 100 cities
        states: uniqueStates
      },
      viewport: bounds
    });

  } catch (error) {
    console.error('Viewport listings error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Simple grid-based clustering algorithm
 * Groups nearby properties into clusters based on zoom level
 */
function performClustering(properties, zoom) {
  // Grid size decreases as zoom increases (more detail at higher zoom)
  // At zoom 10: ~50km grid
  // At zoom 15: ~1.5km grid
  const gridSize = 0.5 / Math.pow(2, zoom - 10);
  const clusters = new Map();

  properties.forEach(prop => {
    // Round coordinates to grid cell
    const gridLat = Math.floor(prop.lat / gridSize) * gridSize;
    const gridLng = Math.floor(prop.lng / gridSize) * gridSize;
    const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;

    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key).push(prop);
  });

  // Convert clusters to response format
  return Array.from(clusters.values()).map(group => {
    // Single property - return as point
    if (group.length === 1) {
      return {
        type: 'point',
        ...group[0]
      };
    }

    // Multiple properties - return as cluster
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
      },
      // Include sample properties for preview
      sample: group.slice(0, 3).map(p => ({
        listingId: p.listingId,
        title: p.title,
        price: p.price
      }))
    };
  });
}

/**
 * Get full state name from state code
 */
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

// =====================================================================
// EXPORT (if using as module)
// =====================================================================

module.exports = {
  performClustering,
  getStateName
};
