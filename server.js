const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const app = express();
const PORT = 3000;

// API Keys
const GOOGLE_API_KEY = 'your_google_api_key_here';
const ZONEOMICS_API_KEY = 'your_zoneomics_api_key_here';
const ATTOM_API_KEY = 'your_attom_api_key_here';

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

    // Return aggregated data
    res.json({
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
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Property Dashboard API running on http://localhost:${PORT}`);
  console.log(`📊 Frontend: http://localhost:${PORT}`);
});
