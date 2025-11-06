/**
 * Property Analysis using OpenAI GPT-4
 * Much better results than BART + explainable
 */

const fetch = require('node-fetch');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_KEY_HERE';

/**
 * Convert property data to text description
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
 * Analyze property with GPT-4
 */
async function analyzeProperty(propertyData) {
  const description = propertyToText(propertyData);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a real estate analyst. Analyze properties and provide:
1. Investment Category (value-add, stable, distressed, luxury, etc.)
2. Market Segment (affordable, mid-range, high-end)
3. Investment Score (1-10)
4. Key Insights (2-3 bullet points)

Return as JSON: {"category": "", "segment": "", "score": 0, "insights": []}`
          },
          {
            role: 'user',
            content: description
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);

    return {
      property: propertyData,
      description,
      analysis
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

module.exports = {
  propertyToText,
  analyzeProperty
};
