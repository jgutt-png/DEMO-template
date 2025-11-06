# Phase 1 Implementation Plan
## AI Property Ranking System (Storage Facility Acquisition)

**Target:** Build MVP using ONLY existing database data
**Timeline:** 2-4 weeks
**Cost:** $0 (uses existing infrastructure)

---

## Database Analysis Summary

### Available Data (Current Schema)

#### LoopNet Commercial Properties (`property_details`)
```sql
✅ HAVE:
- title, subtitle, description (text for NLP)
- street_address, city, state_code, zip_code
- property_type, property_type_id
- building_size (sq ft - often for existing buildings)
- lot_size (acreage)
- year_built, year_renovated
- price, price_per_sf
- property_facts (JSONB - contains structured data)
- demographics (JSONB - may contain population data)
- transportation (JSONB - may contain access info)
- raw_data, full_response (JSONB - full API response)
- latitude, longitude (from property_listings join)

❌ DON'T HAVE (yet):
- Traffic counts
- Storage facility competition data
- Market occupancy rates
- Storage-specific zoning approvals
- Development cost estimates
- Pro forma projections
```

#### Residential Property Database (`addresses` + related tables)
```sql
✅ HAVE:
- Addresses with lat/long
- Zoning: zone_code, zone_name, zone_type, zone_guide
- Property details: property_type, year_built, bedrooms, bathrooms, building_size, lot_size
- AVM valuations: avm_value, confidence_score
- Tax data: assessed_total_value, assessed_land_value, tax_amount
- Foreclosure status
- Equity data

❌ DON'T HAVE (yet):
- Commercial use zoning details
- Storage facility specific attributes
```

### Key Insight

**LoopNet data (`property_details`)** is your goldmine for storage acquisition! This is commercial property data which is exactly what you need for land acquisition.

---

## Phase 1 Features We CAN Extract

### 1. Location Quality Score (Using Existing Data)

```javascript
location: {
  // From property_details
  state: state_code,
  city: city,
  zip: zip_code,
  coordinates: { lat, lng },

  // Derived features
  marketTier: calculateMarketTier(city, state),  // Tier 1/2/3 markets
  urbanDensity: estimateFromZipCode(zip_code),   // Urban/suburban/rural
  coastalProximity: calculateCoastalDistance(lat, lng),

  // From demographics JSONB (if available)
  population: demographics?.population,
  medianIncome: demographics?.medianIncome,
  // ... extract what's available in demographics field
}
```

### 2. Site Characteristics Score (Using Existing Data)

```javascript
site: {
  // Direct from property_details
  lotSize: parseFloat(lot_size),  // Usually in acres or sq ft
  existingBuildingSize: parseFloat(building_size),
  yearBuilt: year_built,

  // From zoning_data (if joined)
  zoningCode: zone_code,
  zoningType: zone_type,  // Commercial, Industrial, etc.
  zoningName: zone_name,

  // Derived
  developmentPotential: hasExistingBuilding ? 'redevelopment' : 'greenfield',
  clearSpan: calculateUsableAcreage(lotSize, existingBuildingSize),
}
```

### 3. Financial Score (Using Existing Data)

```javascript
financials: {
  // From property_details
  askingPrice: parsePrice(price),
  pricePerSF: parseFloat(price_per_sf),
  capRate: parseFloat(cap_rate),  // If available

  // From tax_assessments (if joined)
  assessedValue: assessed_total_value,
  landValue: assessed_land_value,
  taxAmount: tax_amount,

  // Calculated
  pricePerAcre: askingPrice / lotSizeAcres,
  taxRate: taxAmount / assessedValue,

  // Estimated development economics (simple model)
  estimatedDevCost: estimateStorageDevelopmentCost(lotSize),
  roughIRR: calculateBasicIRR(price, lotSize, marketTier)
}
```

### 4. Property Type Filtering

```javascript
// Filter for storage-suitable properties
suitablePropertyTypes: [
  'Land',
  'Industrial',
  'Warehouse',
  'Flex',
  'Other',  // Often vacant land
  'Special Purpose'
]

// Exclude
unsuitablePropertyTypes: [
  'Office',
  'Retail',
  'Multi-Family',
  'Hospitality',
  'Healthcare'
]
```

### 5. NLP-Based Opportunity Detection

```javascript
// Analyze title + description for storage indicators
descriptionSignals: {
  // Positive indicators in description
  storageKeywords: ['storage', 'warehouse', 'self storage', 'mini storage'],
  developmentKeywords: ['vacant', 'land', 'development opportunity', 'build-to-suit'],
  accessKeywords: ['highway', 'interstate', 'main road', 'high traffic'],

  // Extract from property_facts JSONB
  propertyFactsSignals: extractFromJSON(property_facts),
}
```

---

## Phase 1 Scoring Algorithm

### Rule-Based Composite Score (0-100)

```javascript
class StorageSiteScorer {
  scoreSite(property) {
    const scores = {
      location: this.scoreLocation(property),        // 35 points
      site: this.scoreSiteQuality(property),          // 25 points
      financials: this.scoreFinancials(property),     // 25 points
      opportunity: this.scoreOpportunity(property),   // 15 points
    };

    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

    return {
      overallScore: totalScore,
      breakdown: scores,
      features: this.extractFeatures(property),
      reasoning: this.generateReasoning(scores, property)
    };
  }

  scoreLocation(property) {
    // 35 points max
    let score = 0;

    // Market tier (15 pts)
    const tier = this.getMarketTier(property.city, property.state_code);
    if (tier === 1) score += 15;      // Top markets (Atlanta, Dallas, Phoenix)
    else if (tier === 2) score += 12; // Secondary markets
    else if (tier === 3) score += 8;  // Tertiary markets

    // Urban density (10 pts)
    const density = this.estimateDensity(property.zip_code);
    if (density === 'suburban') score += 10;  // Sweet spot for storage
    else if (density === 'urban') score += 7;
    else if (density === 'rural') score += 3;

    // State favorability (10 pts) - based on storage industry data
    const stateFactor = this.getStateFactor(property.state_code);
    score += stateFactor * 10;  // 0-1 multiplier

    return score;
  }

  scoreSiteQuality(property) {
    // 25 points max
    let score = 0;

    // Lot size (10 pts) - 3-7 acres ideal for storage
    const acres = this.convertToAcres(property.lot_size);
    if (acres >= 3 && acres <= 7) score += 10;
    else if (acres >= 2 && acres < 3) score += 7;
    else if (acres >= 7 && acres <= 10) score += 7;
    else if (acres >= 1) score += 4;

    // Existing improvements (10 pts)
    if (!property.building_size || property.building_size === 0) {
      score += 10;  // Vacant land preferred (cheaper)
    } else if (this.isTeardown(property)) {
      score += 5;   // Teardown potential
    }

    // Zoning favorability (5 pts)
    if (this.isStorageFriendlyZoning(property.zone_type, property.zone_code)) {
      score += 5;
    } else if (this.isCommercialOrIndustrial(property.zone_type)) {
      score += 3;
    }

    return score;
  }

  scoreFinancials(property) {
    // 25 points max
    let score = 0;

    // Price per acre (15 pts) - $50-150K/acre sweet spot varies by market
    const pricePerAcre = this.calculatePricePerAcre(property);
    const marketPricing = this.getMarketPricing(property.state_code);

    if (pricePerAcre < marketPricing.low) score += 15;      // Great deal
    else if (pricePerAcre < marketPricing.mid) score += 12; // Good deal
    else if (pricePerAcre < marketPricing.high) score += 8; // Fair
    else score += 3;  // Expensive

    // Rough ROI potential (10 pts) - simple heuristic
    const estimatedIRR = this.estimateBasicIRR(property);
    if (estimatedIRR > 0.25) score += 10;      // >25% IRR
    else if (estimatedIRR > 0.20) score += 8;  // 20-25%
    else if (estimatedIRR > 0.15) score += 5;  // 15-20%

    return score;
  }

  scoreOpportunity(property) {
    // 15 points max - qualitative factors
    let score = 0;

    // Description analysis (10 pts)
    const description = (property.title + ' ' + property.description).toLowerCase();

    // Positive keywords
    const positiveKeywords = [
      'storage', 'warehouse', 'flex space', 'development',
      'vacant', 'land', 'opportunity', 'high traffic',
      'highway', 'interstate', 'main road', 'visibility'
    ];

    const keywordCount = positiveKeywords.filter(kw => description.includes(kw)).length;
    score += Math.min(keywordCount * 2, 10);

    // Property type bonus (5 pts)
    if (this.isIdealPropertyType(property.property_type)) {
      score += 5;
    }

    return score;
  }
}
```

---

## Implementation Steps

### Step 1: Database Additions (Week 1, Day 1-2)

```sql
-- New table: Property Rankings
CREATE TABLE property_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Link to LoopNet property OR regular address
    listing_id VARCHAR(50),
    state_id VARCHAR(10),
    address_id UUID REFERENCES addresses(id),

    -- Scores
    overall_score DECIMAL(5,2),  -- 0-100
    location_score DECIMAL(4,2),
    site_score DECIMAL(4,2),
    financial_score DECIMAL(4,2),
    opportunity_score DECIMAL(4,2),

    -- Features (for ML later)
    features JSONB,

    -- Metadata
    model_version VARCHAR(20) DEFAULT 'rule_v1',
    scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(listing_id, state_id),
    CONSTRAINT check_scores CHECK (
        overall_score >= 0 AND overall_score <= 100 AND
        location_score >= 0 AND location_score <= 35 AND
        site_score >= 0 AND site_score <= 25 AND
        financial_score >= 0 AND financial_score <= 25 AND
        opportunity_score >= 0 AND opportunity_score <= 15
    )
);

CREATE INDEX idx_rankings_overall_score ON property_rankings(overall_score DESC);
CREATE INDEX idx_rankings_listing ON property_rankings(listing_id, state_id);
CREATE INDEX idx_rankings_scored_at ON property_rankings(scored_at DESC);

-- New table: User Feedback
CREATE TABLE user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Property reference
    ranking_id UUID REFERENCES property_rankings(id),
    listing_id VARCHAR(50),
    state_id VARCHAR(10),
    address_id UUID,

    -- User
    user_id TEXT NOT NULL,
    user_email TEXT,

    -- Feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low', 'pass')),
    would_pursue BOOLEAN,

    -- Detailed feedback
    notes TEXT,
    pros TEXT[],
    cons TEXT[],
    deal_breakers TEXT[],

    -- Category ratings
    location_rating INTEGER CHECK (location_rating IS NULL OR (location_rating >= 1 AND location_rating <= 5)),
    site_rating INTEGER CHECK (site_rating IS NULL OR (site_rating >= 1 AND site_rating <= 5)),
    financial_rating INTEGER CHECK (financial_rating IS NULL OR (financial_rating >= 1 AND financial_rating <= 5)),

    -- Implicit signals
    time_spent_seconds INTEGER,
    viewed_street_view BOOLEAN DEFAULT false,
    viewed_zoning BOOLEAN DEFAULT false,
    exported_data BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_rating ON user_feedback(rating DESC);
CREATE INDEX idx_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX idx_feedback_would_pursue ON user_feedback(would_pursue) WHERE would_pursue = true;
```

### Step 2: Scoring Service (Week 1, Day 3-5)

Create: `/backend/src/services/scoring/StorageSiteScorer.js`

```javascript
const MARKET_TIERS = {
  // Tier 1: Top 25 MSAs for storage
  1: ['Atlanta', 'Dallas', 'Phoenix', 'Houston', 'Charlotte', 'Austin', 'Tampa', 'Orlando', 'Las Vegas', 'Nashville', 'Jacksonville', 'Raleigh', 'Denver', 'San Antonio', 'Indianapolis'],

  // Tier 2: Secondary growth markets
  2: ['Memphis', 'Oklahoma City', 'Kansas City', 'Richmond', 'Louisville', 'Columbus', 'Cincinnati', 'Birmingham', 'Greenville', 'Tucson'],

  // Tier 3: Everything else
  3: []
};

const STATE_FACTORS = {
  // Based on storage industry growth and regulations
  'TX': 0.95, 'FL': 0.95, 'AZ': 0.90, 'GA': 0.90, 'NC': 0.90, 'TN': 0.90,
  'OH': 0.80, 'IN': 0.80, 'SC': 0.85, 'AL': 0.85, 'OK': 0.85, 'NV': 0.90,
  'CA': 0.60, 'NY': 0.50, 'NJ': 0.50, // Difficult regulatory environments
  'default': 0.70
};

const MARKET_PRICING = {
  // Price per acre benchmarks by state (in thousands)
  'TX': { low: 60, mid: 100, high: 150 },
  'FL': { low: 80, mid: 120, high: 180 },
  'AZ': { low: 70, mid: 110, high: 160 },
  'GA': { low: 65, mid: 95, high: 140 },
  'CA': { low: 200, mid: 400, high: 600 },
  'default': { low: 50, mid: 100, high: 150 }
};

class StorageSiteScorer {
  constructor() {
    this.version = 'rule_v1.0';
  }

  async scoreProperty(property) {
    // Extract and normalize data
    const normalized = this.normalizeProperty(property);

    // Calculate component scores
    const scores = {
      location: this.scoreLocation(normalized),
      site: this.scoreSiteQuality(normalized),
      financials: this.scoreFinancials(normalized),
      opportunity: this.scoreOpportunity(normalized)
    };

    const overall = Object.values(scores).reduce((sum, s) => sum + s, 0);

    // Extract features for future ML
    const features = this.extractFeatures(normalized);

    return {
      overall_score: overall,
      ...scores,
      features,
      model_version: this.version,
      reasoning: this.generateReasoning(scores, normalized)
    };
  }

  normalizeProperty(property) {
    return {
      // ... normalization logic
      listing_id: property.listing_id,
      state_id: property.state_id,
      city: property.city,
      state_code: property.state_code,
      zip_code: property.zip_code,
      lot_size: this.parseSize(property.lot_size),
      building_size: this.parseSize(property.building_size),
      price: this.parsePrice(property.price),
      zone_type: property.zone_type,
      zone_code: property.zone_code,
      property_type: property.property_type,
      year_built: property.year_built,
      description: (property.title || '') + ' ' + (property.description || ''),
      demographics: property.demographics || {},
      property_facts: property.property_facts || {}
    };
  }

  // ... implementation of scoring methods from above
}

module.exports = StorageSiteScorer;
```

### Step 3: API Endpoints (Week 2, Day 1-2)

Create: `/backend/src/routes/rankings.js`

```javascript
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const StorageSiteScorer = require('../services/scoring/StorageSiteScorer');

const scorer = new StorageSiteScorer();

/**
 * GET /api/rankings/by-state
 * Get ranked properties by state
 */
router.get('/by-state/:state_code', async (req, res) => {
  try {
    const { state_code } = req.params;
    const { limit = 50, min_score = 0 } = req.query;

    // Get properties for state
    const { data: properties, error } = await supabase
      .from('property_details')
      .select(`
        *,
        property_listings!inner(latitude, longitude)
      `)
      .eq('state_code', state_code)
      .eq('property_listings.active_inactive', true)
      .limit(500);  // Process max 500 properties

    if (error) throw error;

    // Score all properties
    const scored = await Promise.all(
      properties.map(async (prop) => {
        const score = await scorer.scoreProperty(prop);

        // Save to database
        await supabase.from('property_rankings').upsert({
          listing_id: prop.listing_id,
          state_id: prop.state_id,
          overall_score: score.overall_score,
          location_score: score.location,
          site_score: score.site,
          financial_score: score.financials,
          opportunity_score: score.opportunity,
          features: score.features,
          model_version: score.model_version
        }, {
          onConflict: 'listing_id,state_id'
        });

        return {
          ...prop,
          ranking: score
        };
      })
    );

    // Filter and sort
    const ranked = scored
      .filter(p => p.ranking.overall_score >= min_score)
      .sort((a, b) => b.ranking.overall_score - a.ranking.overall_score)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      state: state_code,
      total: ranked.length,
      properties: ranked,
      metadata: {
        model_version: scorer.version,
        scored_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Rankings error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/rankings/feedback
 * Submit user feedback on a property
 */
router.post('/feedback', async (req, res) => {
  try {
    const {
      listing_id,
      state_id,
      user_id,
      rating,
      priority,
      would_pursue,
      notes,
      pros,
      cons,
      deal_breakers,
      location_rating,
      site_rating,
      financial_rating,
      time_spent_seconds
    } = req.body;

    // Get ranking_id
    const { data: ranking } = await supabase
      .from('property_rankings')
      .select('id')
      .eq('listing_id', listing_id)
      .eq('state_id', state_id)
      .single();

    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        ranking_id: ranking?.id,
        listing_id,
        state_id,
        user_id,
        rating,
        priority,
        would_pursue,
        notes,
        pros,
        cons,
        deal_breakers,
        location_rating,
        site_rating,
        financial_rating,
        time_spent_seconds
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      feedback_id: data.id,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rankings/stats
 * Get scoring statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { data: allRankings } = await supabase
      .from('property_rankings')
      .select('overall_score, location_score, site_score, financial_score, opportunity_score');

    const { data: feedbackCount } = await supabase
      .from('user_feedback')
      .select('id', { count: 'exact', head: true });

    const stats = {
      total_properties_scored: allRankings.length,
      total_feedback_collected: feedbackCount,
      score_distribution: {
        excellent: allRankings.filter(r => r.overall_score >= 80).length,
        good: allRankings.filter(r => r.overall_score >= 60 && r.overall_score < 80).length,
        fair: allRankings.filter(r => r.overall_score >= 40 && r.overall_score < 60).length,
        poor: allRankings.filter(r => r.overall_score < 40).length
      },
      avg_scores: {
        overall: allRankings.reduce((sum, r) => sum + r.overall_score, 0) / allRankings.length,
        location: allRankings.reduce((sum, r) => sum + r.location_score, 0) / allRankings.length,
        site: allRankings.reduce((sum, r) => sum + r.site_score, 0) / allRankings.length,
        financial: allRankings.reduce((sum, r) => sum + r.financial_score, 0) / allRankings.length,
        opportunity: allRankings.reduce((sum, r) => sum + r.opportunity_score, 0) / allRankings.length
      }
    };

    res.json({ success: true, stats });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Step 4: Frontend Integration (Week 2, Day 3-5)

Add to existing dashboard:
- Ranked properties view (table with scores)
- Feedback modal/form
- State selector
- Score breakdown visualization

---

## Success Criteria (Phase 1)

### Week 2 End Goals:
- ✅ Score 500+ properties across 3-5 states
- ✅ Ranking API returns results in <2 seconds
- ✅ Team provides feedback on 20+ properties
- ✅ Score distribution looks reasonable (not all 100s or all 0s)

### Week 4 End Goals:
- ✅ Team uses system daily for deal screening
- ✅ 50+ properties with user ratings
- ✅ Feedback collected on score accuracy
- ✅ Identified 2-3 high-scoring deals worth pursuing
- ✅ Model version v1.1 with tuned weights based on feedback

---

## What Comes Next (Future Phases)

**Phase 2 (Weeks 5-8):** External data integration
- Census demographics API
- Manual competition research
- Traffic studies

**Phase 3 (Weeks 9-16):** ML model training
- Replace rules with learned model
- Python service setup
- Active learning

**Phase 4 (Weeks 17-24):** LLM integration
- AI-generated investment theses
- Deal summaries

---

## Cost Estimate

**Phase 1 Total:** $0
- Uses existing Supabase database
- No external API calls
- Node.js backend (existing)
- Manual deployment (no CI/CD yet)

**Phase 2+:** ~$150/month
- External data APIs: $50-100/month
- LLM calls: $20-50/month
- Infrastructure: $20/month (Redis cache)

---

This plan gets you a WORKING system in 2 weeks using only data you already have!
