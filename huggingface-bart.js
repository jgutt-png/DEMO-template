/**
 * Hugging Face BART Integration
 * No local storage needed - uses cloud API
 */

const fetch = require('node-fetch');

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || 'YOUR_TOKEN_HERE';
const MODEL_URL = 'https://api-inference.huggingface.co/models/interneuronai/real_estate_listing_analysis_bart';

/**
 * Convert property data to text description for BART
 */
function propertyToText(propertyData) {
  const parts = [];

  if (propertyData.address) parts.push(`Property at ${propertyData.address}`);
  if (propertyData.property_type) parts.push(`${propertyData.property_type}`);
  if (propertyData.year_built) parts.push(`built in ${propertyData.year_built}`);
  if (propertyData.bedrooms) parts.push(`${propertyData.bedrooms} bedrooms`);
  if (propertyData.bathrooms) parts.push(`${propertyData.bathrooms} bathrooms`);
  if (propertyData.building_size) parts.push(`${propertyData.building_size} sq ft`);
  if (propertyData.avm_value) parts.push(`valued at $${propertyData.avm_value.toLocaleString()}`);
  if (propertyData.zone_type) parts.push(`zoned ${propertyData.zone_type}`);

  return parts.join(', ') + '.';
}

/**
 * Analyze property with Hugging Face BART API
 */
async function analyzeWithBart(text) {
  try {
    const response = await fetch(MODEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw error;
  }
}

module.exports = {
  propertyToText,
  analyzeWithBart
};
