require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const { promisify } = require('util');
const { supabase } = require('./supabase-config');
const { saveAllPropertyData, getCompletePropertyData, getSearchHistory } = require('./database-helpers');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;

// API Keys
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ZONEOMICS_API_KEY = process.env.ZONEOMICS_API_KEY;
const ATTOM_API_KEY = process.env.ATTOM_API_KEY;
const LOOPNET_API_KEY = process.env.LOOPNET_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Census API routes
const censusRoutes = require('./backend/src/routes/census');
app.use('/api/census', censusRoutes);

// Helper function to execute curl commands
async function executeCurl(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error('Curl stderr:', stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Curl error:', error);
    throw error;
  }
}

// Helper function for LoopNet API requests
async function loopNetRequest(endpoint, data) {
  const url = `https://loopnet-api.p.rapidapi.com/loopnet${endpoint}`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': 'loopnet-api.p.rapidapi.com',
      'x-rapidapi-key': LOOPNET_API_KEY
    },
    body: JSON.stringify(data)
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('LoopNet API error:', error);
    throw error;
  }
}

// ===== LOOPNET API ENDPOINTS =====

// 9. LoopNet - Find City
app.post('/api/loopnet/find-city', async (req, res) => {
  try {
    const { keywords } = req.body;
    const result = await loopNetRequest('/helper/findCity', { keywords });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. LoopNet - Search by Coordinates
app.post('/api/loopnet/search-by-coordinates', async (req, res) => {
  try {
    const { lat, lon, radius, type } = req.body; // type: 'sale' or 'lease'
    const endpoint = type === 'lease' ? '/lease/searchByCoordination' : '/sale/searchByCoordination';
    const data = { lat, lon };
    if (radius) data.radius = radius;

    const result = await loopNetRequest(endpoint, data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. LoopNet - Search by City
app.post('/api/loopnet/search-by-city', async (req, res) => {
  try {
    const { cityId, limit, type } = req.body; // type: 'sale' or 'lease'
    const endpoint = type === 'lease' ? '/lease/searchByCity' : '/sale/searchByCity';
    const data = { cityId };
    if (limit) data.limit = limit;

    const result = await loopNetRequest(endpoint, data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. LoopNet - Get Property Details
app.post('/api/loopnet/property-details', async (req, res) => {
  try {
    const { listingId, type } = req.body; // type: 'sale', 'lease', or 'auction'
    let endpoint;

    switch(type) {
      case 'lease':
        endpoint = '/property/leaseDetails';
        break;
      case 'auction':
        endpoint = '/property/auctionDetails';
        break;
      default:
        endpoint = '/property/saleDetails';
    }

    const result = await loopNetRequest(endpoint, { listingId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 13. LoopNet - Advanced Sale Search
app.post('/api/loopnet/advanced-search', async (req, res) => {
  try {
    const { filters } = req.body;
    const result = await loopNetRequest('/sale/advanceSearch', filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== END LOOPNET ENDPOINTS =====

// 1. Google Address Validation API
app.post('/api/validate-address', async (req, res) => {
  try {
    const { address } = req.body;

    const curlCommand = `curl -s -X POST "https://addressvalidation.googleapis.com/v1:validateAddress?key=${GOOGLE_API_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"address": {"addressLines": ["${address}"]}}'`;

    const result = await executeCurl(curlCommand);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Google Street View - Returns image URL
app.get('/api/streetview', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&fov=90&pitch=0&key=${GOOGLE_API_KEY}`;
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Zoneomics API
app.get('/api/zoning', async (req, res) => {
  try {
    const { address } = req.query;
    const encodedAddress = encodeURIComponent(address);

    const curlCommand = `curl -s "https://api.zoneomics.com/v2/zoneDetail?address=${encodedAddress}&api_key=${ZONEOMICS_API_KEY}"`;

    const result = await executeCurl(curlCommand);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. ATTOM Property Detail
app.get('/api/attom/property-detail', async (req, res) => {
  try {
    const { address1, address2 } = req.query;
    const encodedAddress1 = encodeURIComponent(address1);
    const encodedAddress2 = encodeURIComponent(address2);

    const curlCommand = `curl -s -X GET "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detailmortgageowner?address1=${encodedAddress1}&address2=${encodedAddress2}" \
      -H "Accept: application/json" \
      -H "APIKey: ${ATTOM_API_KEY}"`;

    const result = await executeCurl(curlCommand);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. ATTOM AVM Valuation
app.get('/api/attom/avm', async (req, res) => {
  try {
    const { address1, address2 } = req.query;
    const encodedAddress1 = encodeURIComponent(address1);
    const encodedAddress2 = encodeURIComponent(address2);

    const curlCommand = `curl -s -X GET "https://api.gateway.attomdata.com/propertyapi/v1.0.0/attomavm/detail?address1=${encodedAddress1}&address2=${encodedAddress2}" \
      -H "Accept: application/json" \
      -H "APIKey: ${ATTOM_API_KEY}"`;

    const result = await executeCurl(curlCommand);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. ATTOM Tax Assessment
app.get('/api/attom/tax-assessment', async (req, res) => {
  try {
    const { address1, address2 } = req.query;
    const encodedAddress1 = encodeURIComponent(address1);
    const encodedAddress2 = encodeURIComponent(address2);

    const curlCommand = `curl -s -X GET "https://api.gateway.attomdata.com/propertyapi/v1.0.0/assessment/detail?address1=${encodedAddress1}&address2=${encodedAddress2}" \
      -H "Accept: application/json" \
      -H "APIKey: ${ATTOM_API_KEY}"`;

    const result = await executeCurl(curlCommand);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. ATTOM Home Equity
app.get('/api/attom/home-equity', async (req, res) => {
  try {
    const { address1, address2 } = req.query;
    const encodedAddress1 = encodeURIComponent(address1);
    const encodedAddress2 = encodeURIComponent(address2);

    const curlCommand = `curl -s -X GET "https://api.gateway.attomdata.com/propertyapi/v1.0.0/valuation/homeequity?address1=${encodedAddress1}&address2=${encodedAddress2}" \
      -H "Accept: application/json" \
      -H "APIKey: ${ATTOM_API_KEY}"`;

    const result = await executeCurl(curlCommand);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. ATTOM Foreclosure Details
app.get('/api/attom/foreclosure', async (req, res) => {
  try {
    const { address1, address2 } = req.query;
    const encodedAddress1 = encodeURIComponent(address1);
    const encodedAddress2 = encodeURIComponent(address2);

    const curlCommand = `curl -s -X GET "https://api.gateway.attomdata.com/property/v3/preforeclosuredetails?address1=${encodedAddress1}&address2=${encodedAddress2}" \
      -H "Accept: application/json" \
      -H "APIKey: ${ATTOM_API_KEY}"`;

    const result = await executeCurl(curlCommand);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aggregate endpoint - calls all APIs at once
app.post('/api/property/search', async (req, res) => {
  try {
    const { address } = req.body;

    // Step 1: Validate address with Google
    const validationCommand = `curl -s -X POST "https://addressvalidation.googleapis.com/v1:validateAddress?key=${GOOGLE_API_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"address": {"addressLines": ["${address}"]}}'`;

    const validationResult = await executeCurl(validationCommand);

    if (!validationResult.result || !validationResult.result.address) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const validatedAddress = validationResult.result.address;
    const formattedAddress = validatedAddress.formattedAddress;
    const location = validatedAddress.addressComponents;
    const geocode = validationResult.result.geocode?.location;

    // Parse address for ATTOM API (needs address1 and address2 format)
    const streetAddress = validatedAddress.addressComponents
      .filter(c => ['street_number', 'route'].some(t => c.componentType === t))
      .map(c => c.componentName.text)
      .join(' ');

    const cityStateZip = validatedAddress.addressComponents
      .filter(c => ['locality', 'administrative_area_level_1', 'postal_code'].some(t => c.componentType === t))
      .map(c => c.componentName.text)
      .join(', ');

    // Make all API calls in parallel
    const [zoningData, propertyData, avmData, taxData, equityData, foreclosureData] = await Promise.allSettled([
      executeCurl(`curl -s "https://api.zoneomics.com/v2/zoneDetail?address=${encodeURIComponent(formattedAddress)}&api_key=${ZONEOMICS_API_KEY}"`),
      executeCurl(`curl -s -X GET "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detailmortgageowner?address1=${encodeURIComponent(streetAddress)}&address2=${encodeURIComponent(cityStateZip)}" -H "Accept: application/json" -H "APIKey: ${ATTOM_API_KEY}"`),
      executeCurl(`curl -s -X GET "https://api.gateway.attomdata.com/propertyapi/v1.0.0/attomavm/detail?address1=${encodeURIComponent(streetAddress)}&address2=${encodeURIComponent(cityStateZip)}" -H "Accept: application/json" -H "APIKey: ${ATTOM_API_KEY}"`),
      executeCurl(`curl -s -X GET "https://api.gateway.attomdata.com/propertyapi/v1.0.0/assessment/detail?address1=${encodeURIComponent(streetAddress)}&address2=${encodeURIComponent(cityStateZip)}" -H "Accept: application/json" -H "APIKey: ${ATTOM_API_KEY}"`),
      executeCurl(`curl -s -X GET "https://api.gateway.attomdata.com/propertyapi/v1.0.0/valuation/homeequity?address1=${encodeURIComponent(streetAddress)}&address2=${encodeURIComponent(cityStateZip)}" -H "Accept: application/json" -H "APIKey: ${ATTOM_API_KEY}"`),
      executeCurl(`curl -s -X GET "https://api.gateway.attomdata.com/property/v3/preforeclosuredetails?address1=${encodeURIComponent(streetAddress)}&address2=${encodeURIComponent(cityStateZip)}" -H "Accept: application/json" -H "APIKey: ${ATTOM_API_KEY}"`)
    ]);

    // Generate Street View URL
    const streetViewUrl = geocode
      ? `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${geocode.latitude},${geocode.longitude}&fov=90&pitch=0&key=${GOOGLE_API_KEY}`
      : null;

    // Prepare aggregated data
    const aggregatedData = {
      address: {
        original: address,
        formatted: formattedAddress,
        components: validatedAddress.addressComponents,
        geocode: geocode
      },
      streetView: {
        url: streetViewUrl,
        latitude: geocode?.latitude,
        longitude: geocode?.longitude
      },
      zoning: zoningData.status === 'fulfilled' ? zoningData.value : { error: zoningData.reason },
      property: propertyData.status === 'fulfilled' ? propertyData.value : { error: propertyData.reason },
      avm: avmData.status === 'fulfilled' ? avmData.value : { error: avmData.reason },
      taxAssessment: taxData.status === 'fulfilled' ? taxData.value : { error: taxData.reason },
      homeEquity: equityData.status === 'fulfilled' ? equityData.value : { error: equityData.reason },
      foreclosure: foreclosureData.status === 'fulfilled' ? foreclosureData.value : { error: foreclosureData.reason }
    };

    // Save to normalized database tables
    try {
      const addressId = await saveAllPropertyData(aggregatedData, 'DEMO');
      console.log(`✓ Saved property data to database (address_id: ${addressId})`);

      // Add address_id to response
      aggregatedData.address_id = addressId;
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Don't fail the request if database save fails
    }

    // Return aggregated data
    res.json(aggregatedData);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Supabase endpoints for database operations

// Save property search to database
app.post('/api/property/save', async (req, res) => {
  try {
    const { address, formatted_address, latitude, longitude, property_data } = req.body;

    const { data, error } = await supabase
      .from('property_searches')
      .insert([
        {
          address,
          formatted_address,
          latitude,
          longitude,
          property_data,
          user_id: 'DEMO'
        }
      ])
      .select();

    if (error) throw error;

    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get search history
app.get('/api/property/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.user_id || 'DEMO';

    const data = await getSearchHistory(userId, limit);

    res.json({ success: true, data });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific search by ID
app.get('/api/property/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get complete property data from normalized tables
    const data = await getCompletePropertyData(id);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search properties by address
app.get('/api/property/search-history', async (req, res) => {
  try {
    const { address } = req.query;
    const userId = req.query.user_id || 'DEMO';

    const { data, error } = await supabase
      .from('property_searches')
      .select('*')
      .eq('user_id', userId)
      .ilike('address', `%${address}%`)
      .order('search_timestamp', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== LOOPNET LISTINGS ENDPOINTS =====

// Get LoopNet listings with filters and pagination
app.get('/api/loopnet/listings', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      property_type,
      city,
      state_code,
      price_min,
      price_max,
      building_size_min,
      building_size_max,
      lot_size_min,
      lot_size_max,
      sort_by = 'last_updated',
      sort_order = 'desc',
      search
    } = req.query;

    // Build query - join with property_listings to get coordinates
    let query = supabase
      .from('property_details')
      .select(`
        *,
        property_listings!inner(latitude, longitude, listing_id, state_id)
      `, { count: 'exact' });

    // FILTER OUT INCOMPLETE LISTINGS - Only show properties with titles (indicates complete data)
    query = query.not('title', 'is', null);

    // Apply filters
    if (property_type) {
      query = query.eq('property_type', property_type);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (state_code) {
      query = query.eq('state_code', state_code);
    }

    // Price filters (need to handle string prices)
    if (price_min || price_max) {
      query = query.not('price', 'is', null);
    }

    // Building size filters
    if (building_size_min || building_size_max) {
      query = query.not('building_size', 'is', null);
    }

    // Lot size filters
    if (lot_size_min || lot_size_max) {
      query = query.not('lot_size', 'is', null);
    }

    // Search in title and description
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    // Sorting
    const validSortFields = ['last_updated', 'price', 'building_size', 'lot_size', 'city', 'title'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'last_updated';
    query = query.order(sortField, { ascending: sort_order === 'asc', nullsFirst: false });

    const { data, error, count } = await query;

    if (error) throw error;

    // Flatten the joined data structure
    const flattenedData = data?.map(item => {
      const coords = item.property_listings?.[0] || item.property_listings || {};
      return {
        ...item,
        latitude: coords.latitude,
        longitude: coords.longitude,
        listing_id: item.listing_id || coords.listing_id,
        state_id: item.state_id || coords.state_id,
        property_listings: undefined // Remove the nested object
      };
    }) || [];

    // Get unique values for filters
    const { data: propertyTypes } = await supabase
      .from('property_details')
      .select('property_type')
      .not('property_type', 'is', null);

    const { data: cities } = await supabase
      .from('property_details')
      .select('city')
      .not('city', 'is', null);

    const { data: states } = await supabase
      .from('property_details')
      .select('state_code')
      .not('state_code', 'is', null);

    // Get unique values
    const uniquePropertyTypes = [...new Set(propertyTypes?.map(p => p.property_type) || [])].sort();
    const uniqueCities = [...new Set(cities?.map(c => c.city) || [])].sort();
    const uniqueStates = [...new Set(states?.map(s => s.state_code) || [])].sort();

    res.json({
      success: true,
      data: flattenedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      },
      filters: {
        propertyTypes: uniquePropertyTypes,
        cities: uniqueCities,
        states: uniqueStates
      }
    });
  } catch (error) {
    console.error('Listings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single listing details
app.get('/api/loopnet/listings/:listing_id/:state_id', async (req, res) => {
  try {
    const { listing_id, state_id } = req.params;

    const { data, error } = await supabase
      .from('property_details')
      .select('*')
      .eq('listing_id', listing_id)
      .eq('state_id', state_id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Listing detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get listing statistics
app.get('/api/loopnet/stats', async (req, res) => {
  try {
    // Get total count - ONLY COMPLETE LISTINGS
    const { count: totalListings } = await supabase
      .from('property_details')
      .select('*', { count: 'exact', head: true })
      .not('title', 'is', null);

    // Get count by property type - ONLY COMPLETE LISTINGS
    const { data: byType } = await supabase
      .from('property_details')
      .select('property_type')
      .not('title', 'is', null)
      .not('property_type', 'is', null);

    // Get count by city (top 10) - ONLY COMPLETE LISTINGS
    const { data: byCity } = await supabase
      .from('property_details')
      .select('city')
      .not('title', 'is', null)
      .not('city', 'is', null);

    const typeCounts = byType?.reduce((acc, item) => {
      acc[item.property_type] = (acc[item.property_type] || 0) + 1;
      return acc;
    }, {});

    const cityCounts = byCity?.reduce((acc, item) => {
      acc[item.city] = (acc[item.city] || 0) + 1;
      return acc;
    }, {});

    const topCities = Object.entries(cityCounts || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }));

    res.json({
      success: true,
      stats: {
        totalListings,
        byPropertyType: typeCounts,
        topCities
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== MAP-SPECIFIC ENDPOINTS =====

// Get default map center (state with most listings)
app.get('/api/loopnet/map-center', async (req, res) => {
  try {
    // Get all listings with coordinates from property_listings joined with property_details
    const { data: listings } = await supabase
      .from('property_listings')
      .select('latitude, longitude, property_details!inner(state_code, title)')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('property_details.title', 'is', null);

    if (!listings || listings.length === 0) {
      // Fallback to center of USA
      return res.json({
        success: true,
        center: {
          latitude: 39.8283,
          longitude: -98.5795,
          zoom: 5
        }
      });
    }

    // Count by state and collect coordinates
    const stateCounts = listings.reduce((acc, item) => {
      const state_code = item.property_details?.state_code;
      if (!state_code) return acc;

      if (!acc[state_code]) {
        acc[state_code] = [];
      }
      const lat = parseFloat(item.latitude);
      const lon = parseFloat(item.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        acc[state_code].push({ lat, lon });
      }
      return acc;
    }, {});

    // Find state with most listings
    const topState = Object.entries(stateCounts)
      .sort((a, b) => b[1].length - a[1].length)[0];

    if (!topState || topState[1].length === 0) {
      return res.json({
        success: true,
        center: {
          latitude: 39.8283,
          longitude: -98.5795,
          zoom: 5
        }
      });
    }

    // Calculate center of listings in top state
    const coords = topState[1];
    const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
    const avgLon = coords.reduce((sum, c) => sum + c.lon, 0) / coords.length;

    // Determine zoom level based on listing count
    let zoom = 10;
    if (coords.length > 100) zoom = 9;
    else if (coords.length > 50) zoom = 10;
    else if (coords.length > 10) zoom = 11;
    else zoom = 12;

    res.json({
      success: true,
      center: {
        latitude: avgLat,
        longitude: avgLon,
        zoom: zoom,
        state: topState[0],
        state_code: topState[0],
        count: coords.length
      }
    });

  } catch (error) {
    console.error('Map center error:', error);
    res.json({
      success: true,
      center: {
        latitude: 39.8283,
        longitude: -98.5795,
        zoom: 5
      }
    });
  }
});

// Get bounds for a specific state
app.get('/api/loopnet/state-bounds/:stateCode', async (req, res) => {
  try {
    const { stateCode } = req.params;

    // Get all listings with coordinates for this state
    const { data: listings } = await supabase
      .from('property_listings')
      .select('latitude, longitude, property_details!inner(state_code, title)')
      .eq('property_details.state_code', stateCode)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('property_details.title', 'is', null);

    if (!listings || listings.length === 0) {
      return res.json({
        success: false,
        error: 'No properties found for this state'
      });
    }

    // Calculate bounds
    const lats = listings.map(l => parseFloat(l.latitude)).filter(l => !isNaN(l));
    const lons = listings.map(l => parseFloat(l.longitude)).filter(l => !isNaN(l));

    const north = Math.max(...lats);
    const south = Math.min(...lats);
    const east = Math.max(...lons);
    const west = Math.min(...lons);

    const centerLat = (north + south) / 2;
    const centerLon = (east + west) / 2;

    // Calculate zoom level based on bounds
    const latDiff = north - south;
    const lonDiff = east - west;
    const maxDiff = Math.max(latDiff, lonDiff);

    let zoom = 10;
    if (maxDiff > 10) zoom = 6;
    else if (maxDiff > 5) zoom = 7;
    else if (maxDiff > 2) zoom = 8;
    else if (maxDiff > 1) zoom = 9;
    else if (maxDiff > 0.5) zoom = 10;
    else zoom = 11;

    res.json({
      success: true,
      bounds: {
        north,
        south,
        east,
        west,
        center: {
          latitude: centerLat,
          longitude: centerLon
        },
        zoom,
        count: listings.length,
        state_code: stateCode
      }
    });

  } catch (error) {
    console.error('State bounds error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get listings within bounding box
app.get('/api/loopnet/listings/bounds', async (req, res) => {
  try {
    const {
      north,
      south,
      east,
      west,
      limit = 1000
    } = req.query;

    if (!north || !south || !east || !west) {
      return res.status(400).json({
        success: false,
        error: 'Bounding box coordinates required (north, south, east, west)'
      });
    }

    // Query listings within bounds
    const { data, error } = await supabase
      .from('property_details')
      .select('*')
      .not('title', 'is', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', parseFloat(south))
      .lte('latitude', parseFloat(north))
      .gte('longitude', parseFloat(west))
      .lte('longitude', parseFloat(east))
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      data,
      count: data ? data.length : 0,
      bounds: { north, south, east, west }
    });

  } catch (error) {
    console.error('Bounds query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get coordinate statistics
app.get('/api/loopnet/coordinates/stats', async (req, res) => {
  try {
    // Total listings with coordinates
    const { count: withCoords } = await supabase
      .from('property_details')
      .select('*', { count: 'exact', head: true })
      .not('title', 'is', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Total listings
    const { count: totalCount } = await supabase
      .from('property_details')
      .select('*', { count: 'exact', head: true })
      .not('title', 'is', null);

    const withoutCoords = totalCount - withCoords;

    // Get coordinate range (sample)
    const { data: coordRanges } = await supabase
      .from('property_details')
      .select('latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(1000);

    let bounds = null;
    if (coordRanges && coordRanges.length > 0) {
      const lats = coordRanges.map(c => parseFloat(c.latitude)).filter(n => !isNaN(n));
      const lons = coordRanges.map(c => parseFloat(c.longitude)).filter(n => !isNaN(n));
      if (lats.length > 0 && lons.length > 0) {
        bounds = {
          north: Math.max(...lats),
          south: Math.min(...lats),
          east: Math.max(...lons),
          west: Math.min(...lons)
        };
      }
    }

    res.json({
      success: true,
      stats: {
        withCoordinates: withCoords || 0,
        withoutCoordinates: withoutCoords || 0,
        total: totalCount || 0,
        percentageWithCoords: totalCount > 0 ? ((withCoords / totalCount) * 100).toFixed(2) : '0.00',
        bounds
      }
    });

  } catch (error) {
    console.error('Coordinate stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Property Dashboard API running on http://localhost:${PORT}`);
  console.log(`📊 Frontend: http://localhost:${PORT}`);
  console.log(`💾 Database: Connected to Supabase`);
});
