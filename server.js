const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const { promisify } = require('util');
const { supabase } = require('./supabase-config');
const { saveAllPropertyData, getCompletePropertyData, getSearchHistory } = require('./database-helpers');

const execAsync = promisify(exec);

const app = express();
const PORT = 3000;

// API Keys
const GOOGLE_API_KEY = 'your_google_api_key_here';
const ZONEOMICS_API_KEY = 'your_zoneomics_api_key_here';
const ATTOM_API_KEY = 'your_attom_api_key_here';
const LOOPNET_API_KEY = '9e05046019mshd408c82bdc33c54p1c845fjsn997415e8f471';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

app.listen(PORT, () => {
  console.log(`🚀 Property Dashboard API running on http://localhost:${PORT}`);
  console.log(`📊 Frontend: http://localhost:${PORT}`);
  console.log(`💾 Database: Connected to Supabase`);
});
