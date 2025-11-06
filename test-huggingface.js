/**
 * Test Hugging Face BART API with sample property data
 */

const { propertyToText, analyzeWithBart } = require('./huggingface-bart');

// Sample property data
const sampleProperty = {
  address: '4706 New Horizons Blvd Appleton, WI',
  property_type: 'Single Family Residential',
  year_built: 2005,
  bedrooms: 3,
  bathrooms: 2,
  building_size: 1800,
  avm_value: 285000,
  zone_type: 'Residential'
};

async function test() {
  console.log('🧪 Testing Hugging Face BART API\n');
  console.log('=' .repeat(60));

  // Convert to text
  const description = propertyToText(sampleProperty);
  console.log('\n📝 Property Description:');
  console.log(description);

  console.log('\n⏳ Analyzing with BART (via Hugging Face API)...\n');

  try {
    const result = await analyzeWithBart(description);

    console.log('✅ Success! Results:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n' + '=' .repeat(60));
    console.log('📊 Interpretation:');

    if (Array.isArray(result) && result.length > 0) {
      console.log(`\nTop Prediction: ${result[0].label}`);
      console.log(`Confidence: ${(result[0].score * 100).toFixed(2)}%`);

      if (result.length > 1) {
        console.log('\nOther possibilities:');
        result.slice(1).forEach((pred, i) => {
          console.log(`  ${i + 2}. ${pred.label} (${(pred.score * 100).toFixed(2)}%)`);
        });
      }
    }

    console.log('\n💡 Note: The model returns numeric labels (LABEL_0, LABEL_1, etc.)');
    console.log('   without documentation. We need to test multiple properties');
    console.log('   to reverse-engineer what each label means.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('Authorization')) {
      console.log('\n⚠️  You need to set your Hugging Face API token:');
      console.log('   1. Get a free token at: https://huggingface.co/settings/tokens');
      console.log('   2. Export it: export HUGGINGFACE_API_KEY=your_token_here');
      console.log('   3. Run this test again');
    }
  }

  console.log('\n' + '=' .repeat(60));
}

test();
