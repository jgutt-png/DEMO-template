# AI Property Ranking System - Learning Implementation Plan

## Overview
Build an AI system that learns from 5-10 acquisition analysts' behavior to recommend storage facility land deals based on their acquisition preferences.

**Key Principle:** The system learns by watching users rank deals (good vs bad), then applies those patterns to recommend new properties.

---

## Phase 1: Data Collection & Feature Engineering (Week 1-2)

### 1.1 User Behavior Tracking Database Schema

```sql
-- Track which properties users interact with
CREATE TABLE user_property_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    listing_id VARCHAR(50) NOT NULL,
    state_id VARCHAR(10) NOT NULL,

    -- Interaction types
    viewed BOOLEAN DEFAULT false,
    view_duration_seconds INTEGER,
    clicked_details BOOLEAN DEFAULT false,

    -- Explicit feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),  -- 1=Bad Deal, 5=Great Deal
    saved BOOLEAN DEFAULT false,
    flagged_for_review BOOLEAN DEFAULT false,
    notes TEXT,

    -- Implicit signals
    scroll_depth DECIMAL(4,2),  -- How far they scrolled (0-100%)
    time_on_page INTEGER,
    return_visits INTEGER DEFAULT 1,

    -- Timestamps
    first_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rated_at TIMESTAMP WITH TIME ZONE,

    FOREIGN KEY (listing_id, state_id)
        REFERENCES property_listings(listing_id, state_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_interactions_user ON user_property_interactions(user_id);
CREATE INDEX idx_interactions_property ON user_property_interactions(listing_id, state_id);
CREATE INDEX idx_interactions_rating ON user_property_interactions(rating DESC);
CREATE INDEX idx_interactions_saved ON user_property_interactions(saved) WHERE saved = true;

-- Track user preferences over time
CREATE TABLE user_preference_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,

    -- Learned preferences (updated by ML model)
    preferred_states TEXT[],  -- ['TX', 'FL', 'GA']
    preferred_property_types TEXT[],  -- ['Land', 'Industrial']

    -- Price range preferences (learned from rated properties)
    min_price_preference INTEGER,
    max_price_preference INTEGER,
    avg_rated_price INTEGER,

    -- Size preferences
    min_lot_size_preference DECIMAL(10,2),
    max_lot_size_preference DECIMAL(10,2),

    -- Demographic preferences (learned from Census data of highly-rated properties)
    preferred_renter_pct_min DECIMAL(4,1),
    preferred_renter_pct_max DECIMAL(4,1),
    preferred_income_min INTEGER,
    preferred_income_max INTEGER,

    -- Model metadata
    total_properties_rated INTEGER DEFAULT 0,
    model_confidence DECIMAL(4,3),  -- 0-1, how confident the model is
    last_model_update TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store ML model predictions for each user-property pair
CREATE TABLE property_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    listing_id VARCHAR(50) NOT NULL,
    state_id VARCHAR(10) NOT NULL,

    -- Model predictions
    predicted_rating DECIMAL(3,2),  -- Predicted rating 1.00-5.00
    confidence_score DECIMAL(4,3),  -- Model confidence 0-1
    recommendation_rank INTEGER,  -- 1 = top recommendation

    -- Feature importance (top 5 reasons for this score)
    top_feature_1 TEXT,
    top_feature_1_value TEXT,
    top_feature_2 TEXT,
    top_feature_2_value TEXT,
    top_feature_3 TEXT,
    top_feature_3_value TEXT,

    -- Metadata
    model_version VARCHAR(20),
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, listing_id, state_id),
    FOREIGN KEY (listing_id, state_id)
        REFERENCES property_listings(listing_id, state_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_recommendations_user ON property_recommendations(user_id);
CREATE INDEX idx_recommendations_score ON property_recommendations(predicted_rating DESC);
CREATE INDEX idx_recommendations_rank ON property_recommendations(user_id, recommendation_rank);
```

### 1.2 Feature Engineering

Extract features from existing data for ML model:

**Property Features (LoopNet data):**
- `price` (normalize by market)
- `lot_size` (acres)
- `property_type` (one-hot encoded)
- `state_code` (one-hot encoded)
- `city` (group by market tier)
- `days_on_market` (if available)

**Demographic Features (Census data - 3 levels):**
- **Tract level (primary):**
  - `renter_percentage` (KEY METRIC)
  - `median_household_income`
  - `median_age`
  - `population_density_per_sq_mile`
  - `unemployment_rate`
  - `poverty_rate`
  - `vacancy_rate`

- **Block level (hyperlocal validation):**
  - `block_renter_percentage`
  - `block_population`

- **County level (market context):**
  - `county_renter_percentage`
  - `county_median_income`
  - `county_population`

**Derived Features:**
- `price_per_acre` = price / lot_size
- `renter_density` = total_population * (renter_percentage / 100)
- `income_stability_score` = (median_income / county_median_income) * (1 - unemployment_rate)
- `market_demand_proxy` = renter_percentage * (median_income / 1000)
- `block_tract_renter_diff` = block_renter_percentage - renter_percentage (hyperlocal variance)

**Target Variable:**
- `user_rating` (1-5 stars) from user_property_interactions table

---

## Phase 2: Initial ML Model (Week 2-3)

### 2.1 Algorithm Selection

**Start Simple - Gradient Boosting (XGBoost or LightGBM):**

Why?
- Handles mixed feature types (numerical + categorical)
- Built-in feature importance
- Works well with small datasets (5-10 users × 50-100 rated properties each)
- Fast training and inference
- Interpretable (can explain predictions)

**Alternative if very little data:** Start with rule-based scoring using documented criteria, then transition to ML as more feedback accumulates.

### 2.2 Training Data Preparation

```python
# Pseudo-code for feature extraction
def extract_features(property_id):
    # Get property data
    property = db.query("SELECT * FROM property_listings WHERE listing_id = ?", property_id)
    details = db.query("SELECT * FROM property_details WHERE listing_id = ?", property_id)
    census = db.query("SELECT * FROM census_demographics WHERE listing_id = ?", property_id)

    features = {
        # Property features
        'price': property.price,
        'lot_size': details.lot_size,
        'price_per_acre': property.price / details.lot_size,
        'property_type_land': 1 if details.property_type == 'Land' else 0,
        'property_type_industrial': 1 if details.property_type == 'Industrial' else 0,

        # State one-hot encoding (top 10 states)
        'state_TX': 1 if property.state_code == 'TX' else 0,
        'state_FL': 1 if property.state_code == 'FL' else 0,
        'state_GA': 1 if property.state_code == 'GA' else 0,
        # ... more states

        # Census tract features
        'renter_percentage': census.renter_percentage,
        'median_income': census.median_household_income,
        'median_age': census.median_age,
        'population_density': census.population_density_per_sq_mile,
        'unemployment_rate': census.unemployment_rate,
        'vacancy_rate': census.vacancy_rate,

        # Block group features
        'block_renter_pct': census.block_renter_percentage,
        'block_population': census.block_population,

        # County features
        'county_renter_pct': census.county_renter_percentage,
        'county_median_income': census.county_median_income,

        # Derived features
        'renter_density': census.total_population * (census.renter_percentage / 100),
        'income_stability': (census.median_household_income / census.county_median_income) * (1 - census.unemployment_rate),
        'market_demand_proxy': census.renter_percentage * (census.median_household_income / 1000),
        'block_tract_variance': abs(census.block_renter_percentage - census.renter_percentage)
    }

    return features

def prepare_training_data(user_id):
    # Get all rated properties by this user
    rated = db.query("""
        SELECT listing_id, state_id, rating
        FROM user_property_interactions
        WHERE user_id = ? AND rating IS NOT NULL
    """, user_id)

    X = []  # Features
    y = []  # Ratings

    for row in rated:
        features = extract_features(row.listing_id)
        X.append(features)
        y.append(row.rating)

    return X, y
```

### 2.3 Model Training Pipeline

**Option 1: Per-User Models (Personalized)**
- Train separate model for each user
- Pros: Highly personalized, captures individual preferences
- Cons: Requires more data per user (50+ ratings minimum)
- Best for: Users with different acquisition strategies

**Option 2: Global Model with User Features**
- Single model that includes user_id as feature
- Pros: Shares knowledge across users, works with less data
- Cons: Less personalized
- Best for: Users with similar preferences

**Recommended Hybrid Approach:**
1. Start with global model (all users combined)
2. Once each user has 50+ ratings, train personalized models
3. Use global model as fallback for new users

```python
# Training script (Python/Node.js hybrid)
import xgboost as xgb
import numpy as np
from sklearn.model_selection import train_test_split

def train_user_model(user_id):
    # Prepare data
    X, y = prepare_training_data(user_id)

    if len(X) < 20:
        print(f"Not enough data for {user_id}, using global model")
        return None

    # Split train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train XGBoost model
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=100,
        max_depth=4,  # Keep shallow to avoid overfitting
        learning_rate=0.1,
        random_state=42
    )

    model.fit(X_train, y_train)

    # Evaluate
    test_score = model.score(X_test, y_test)
    print(f"Model R² score: {test_score}")

    # Get feature importance
    importance = model.feature_importances_
    feature_names = list(X[0].keys())
    top_features = sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True)[:10]

    print("Top 10 features:")
    for feature, score in top_features:
        print(f"  {feature}: {score:.3f}")

    # Save model
    model.save_model(f'models/user_{user_id}_model.json')

    # Update user preference profile based on feature importance
    update_user_preferences(user_id, top_features, test_score)

    return model

def update_user_preferences(user_id, top_features, model_confidence):
    # Extract learned preferences from top features
    # E.g., if 'renter_percentage' is important, analyze typical values in highly-rated properties

    highly_rated = db.query("""
        SELECT cd.renter_percentage, cd.median_household_income, pd.lot_size, pl.price
        FROM user_property_interactions upi
        JOIN property_listings pl ON upi.listing_id = pl.listing_id
        JOIN property_details pd ON upi.listing_id = pd.listing_id
        JOIN census_demographics cd ON upi.listing_id = cd.listing_id
        WHERE upi.user_id = ? AND upi.rating >= 4
    """, user_id)

    db.execute("""
        UPDATE user_preference_profiles
        SET
            preferred_renter_pct_min = ?,
            preferred_renter_pct_max = ?,
            preferred_income_min = ?,
            preferred_income_max = ?,
            min_lot_size_preference = ?,
            max_lot_size_preference = ?,
            model_confidence = ?,
            last_model_update = NOW()
        WHERE user_id = ?
    """,
        np.percentile([r.renter_percentage for r in highly_rated], 25),
        np.percentile([r.renter_percentage for r in highly_rated], 75),
        np.percentile([r.median_household_income for r in highly_rated], 25),
        np.percentile([r.median_household_income for r in highly_rated], 75),
        np.min([r.lot_size for r in highly_rated]),
        np.max([r.lot_size for r in highly_rated]),
        model_confidence,
        user_id
    )
```

---

## Phase 3: API Integration (Week 3)

### 3.1 New API Endpoints

```javascript
// GET /api/recommendations/:user_id
// Returns top 50 recommended properties for this user
router.get('/recommendations/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { state_code, limit = 50 } = req.query;

  // Get recommendations from database (pre-computed)
  let query = supabase
    .from('property_recommendations')
    .select(`
      *,
      property_listings(*),
      property_details(*),
      census_demographics(*)
    `)
    .eq('user_id', user_id)
    .order('recommendation_rank', { ascending: true })
    .limit(limit);

  if (state_code) {
    query = query.eq('property_listings.state_code', state_code);
  }

  const { data, error } = await query;

  res.json({
    success: true,
    recommendations: data,
    user_profile: await getUserProfile(user_id)
  });
});

// POST /api/interactions
// Track user interaction with a property
router.post('/interactions', async (req, res) => {
  const {
    user_id,
    listing_id,
    state_id,
    viewed,
    rating,
    saved,
    notes,
    view_duration_seconds
  } = req.body;

  // Upsert interaction
  const { data, error } = await supabase
    .from('user_property_interactions')
    .upsert({
      user_id,
      listing_id,
      state_id,
      viewed,
      rating,
      saved,
      notes,
      view_duration_seconds,
      last_viewed_at: new Date().toISOString(),
      ...(rating && { rated_at: new Date().toISOString() })
    }, {
      onConflict: 'user_id,listing_id,state_id'
    })
    .select()
    .single();

  // If this is a rating, trigger model retraining (async)
  if (rating) {
    // Check if user has enough data for personalized model
    const { count } = await supabase
      .from('user_property_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .not('rating', 'is', null);

    if (count >= 20) {
      // Trigger retraining (queue job for Python service)
      await triggerModelRetraining(user_id);
    }
  }

  res.json({ success: true, interaction: data });
});

// POST /api/ml/retrain/:user_id
// Manually trigger model retraining for a user
router.post('/ml/retrain/:user_id', async (req, res) => {
  const { user_id } = req.params;

  // Call Python ML service
  const result = await axios.post('http://localhost:5000/train', {
    user_id
  });

  // Regenerate recommendations
  await regenerateRecommendations(user_id);

  res.json({
    success: true,
    model_metrics: result.data
  });
});

// GET /api/analytics/user-insights/:user_id
// Get insights about what the user prefers
router.get('/analytics/user-insights/:user_id', async (req, res) => {
  const { user_id } = req.params;

  // Get user profile
  const { data: profile } = await supabase
    .from('user_preference_profiles')
    .select('*')
    .eq('user_id', user_id)
    .single();

  // Get rating distribution
  const { data: ratings } = await supabase
    .from('user_property_interactions')
    .select('rating')
    .eq('user_id', user_id)
    .not('rating', 'is', null);

  const ratingCounts = {
    5: ratings.filter(r => r.rating === 5).length,
    4: ratings.filter(r => r.rating === 4).length,
    3: ratings.filter(r => r.rating === 3).length,
    2: ratings.filter(r => r.rating === 2).length,
    1: ratings.filter(r => r.rating === 1).length
  };

  // Get top characteristics of highly-rated properties
  const { data: topProperties } = await supabase
    .from('user_property_interactions')
    .select(`
      *,
      property_listings(*),
      census_demographics(*)
    `)
    .eq('user_id', user_id)
    .gte('rating', 4);

  const insights = {
    profile,
    rating_distribution: ratingCounts,
    total_properties_rated: ratings.length,
    highly_rated_characteristics: {
      avg_renter_pct: avg(topProperties.map(p => p.census_demographics.renter_percentage)),
      avg_income: avg(topProperties.map(p => p.census_demographics.median_household_income)),
      preferred_states: mostCommon(topProperties.map(p => p.property_listings.state_code)),
      avg_price: avg(topProperties.map(p => p.property_listings.price))
    }
  };

  res.json({ success: true, insights });
});
```

---

## Phase 4: Python ML Service (Week 3-4)

Create lightweight Python microservice for ML training and inference:

```python
# ml-service/app.py
from flask import Flask, request, jsonify
import xgboost as xgb
import psycopg2
import os
import numpy as np

app = Flask(__name__)

# Supabase connection
DB_URL = os.getenv('SUPABASE_DB_URL')

def get_db_connection():
    return psycopg2.connect(DB_URL)

@app.route('/train', methods=['POST'])
def train_model():
    data = request.json
    user_id = data['user_id']

    # Fetch training data
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT
            pl.price,
            pd.lot_size,
            pd.property_type,
            pl.state_code,
            cd.renter_percentage,
            cd.median_household_income,
            cd.median_age,
            cd.unemployment_rate,
            cd.vacancy_rate,
            cd.block_renter_percentage,
            cd.county_renter_percentage,
            upi.rating
        FROM user_property_interactions upi
        JOIN property_listings pl ON upi.listing_id = pl.listing_id
        JOIN property_details pd ON upi.listing_id = pd.listing_id
        JOIN census_demographics cd ON upi.listing_id = cd.listing_id
        WHERE upi.user_id = %s AND upi.rating IS NOT NULL
    """

    cursor.execute(query, (user_id,))
    rows = cursor.fetchall()

    if len(rows) < 20:
        return jsonify({'error': 'Not enough training data', 'min_required': 20, 'current': len(rows)}), 400

    # Prepare features and labels
    X = prepare_features(rows)
    y = [row[-1] for row in rows]  # ratings

    # Train model
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1
    )

    model.fit(X, y)

    # Save model
    model_path = f'models/user_{user_id}.json'
    model.save_model(model_path)

    # Get feature importance
    importance = dict(zip(FEATURE_NAMES, model.feature_importances_))

    return jsonify({
        'success': True,
        'model_path': model_path,
        'training_samples': len(rows),
        'feature_importance': importance
    })

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    user_id = data['user_id']
    property_ids = data['property_ids']  # List of [listing_id, state_id] tuples

    # Load user model
    model_path = f'models/user_{user_id}.json'
    if not os.path.exists(model_path):
        return jsonify({'error': 'Model not found, please train first'}), 404

    model = xgb.XGBRegressor()
    model.load_model(model_path)

    # Fetch property features
    conn = get_db_connection()
    predictions = []

    for listing_id, state_id in property_ids:
        features = fetch_property_features(conn, listing_id, state_id)
        if features is None:
            continue

        X = prepare_features([features])
        pred = model.predict(X)[0]

        # Get feature contributions (SHAP-like)
        feature_importance = get_top_features(model, features)

        predictions.append({
            'listing_id': listing_id,
            'state_id': state_id,
            'predicted_rating': float(pred),
            'top_features': feature_importance
        })

    return jsonify({
        'success': True,
        'predictions': predictions
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

---

## Phase 5: Frontend Integration (Week 4)

### 5.1 Property Rating UI

Add rating functionality to property cards:

```javascript
// In listings.html
async function rateProperty(listingId, stateId, rating) {
    const userId = getCurrentUserId(); // Get from session/auth

    const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            listing_id: listingId,
            state_id: stateId,
            rating: rating,
            viewed: true
        })
    });

    if (response.ok) {
        showNotification('Rating saved! Model will update shortly.');
        updatePropertyCard(listingId, rating);
    }
}

// Add star rating to each property card
function addRatingUI(propertyElement, listingId, stateId) {
    const ratingHtml = `
        <div class="rating-container">
            <span>Rate this deal:</span>
            ${[1,2,3,4,5].map(star => `
                <span class="star" onclick="rateProperty('${listingId}', '${stateId}', ${star})">
                    ★
                </span>
            `).join('')}
        </div>
    `;

    propertyElement.insertAdjacentHTML('beforeend', ratingHtml);
}
```

### 5.2 Recommendations View

New page to show AI-recommended properties:

```html
<!-- recommendations.html -->
<div class="recommendations-page">
    <h1>Your Personalized Recommendations</h1>

    <div class="user-insights">
        <h3>What you typically prefer:</h3>
        <ul id="preference-list"></ul>
    </div>

    <div class="recommended-properties">
        <!-- Property cards sorted by predicted rating -->
    </div>
</div>

<script>
async function loadRecommendations() {
    const userId = getCurrentUserId();

    const response = await fetch(`/api/recommendations/${userId}?limit=100`);
    const data = await response.json();

    // Display recommendations
    const container = document.querySelector('.recommended-properties');
    data.recommendations.forEach(rec => {
        const card = createPropertyCard(rec.property_listings, rec.property_details);

        // Add prediction info
        card.insertAdjacentHTML('beforeend', `
            <div class="ai-prediction">
                <span class="predicted-score">AI Score: ${rec.predicted_rating.toFixed(1)}/5.0</span>
                <span class="confidence">Confidence: ${(rec.confidence_score * 100).toFixed(0)}%</span>
                <div class="top-reasons">
                    <strong>Why we recommend this:</strong>
                    <ul>
                        <li>${rec.top_feature_1}: ${rec.top_feature_1_value}</li>
                        <li>${rec.top_feature_2}: ${rec.top_feature_2_value}</li>
                        <li>${rec.top_feature_3}: ${rec.top_feature_3_value}</li>
                    </ul>
                </div>
            </div>
        `);

        container.appendChild(card);
    });
}
</script>
```

---

## Implementation Timeline

### Week 1-2: Data Collection
- ✅ Census API integration (DONE)
- [ ] Create user interaction tracking tables
- [ ] Add rating UI to frontend
- [ ] Collect initial ratings (goal: 50-100 per user)

### Week 2-3: ML Model
- [ ] Set up Python ML service
- [ ] Implement feature extraction
- [ ] Train initial models
- [ ] Generate first recommendations

### Week 3-4: API & Frontend
- [ ] Build recommendation API endpoints
- [ ] Create recommendations page
- [ ] Add user insights dashboard
- [ ] Deploy to production

### Week 4+: Iteration
- [ ] Monitor model performance
- [ ] Retrain as more data accumulates
- [ ] Add advanced features (trend detection, auto-underwriting)

---

## Success Metrics

### Short-term (1 month):
- 50+ rated properties per user
- Model accuracy: R² > 0.6 on test set
- Users spend 30% less time reviewing bad deals

### Medium-term (3 months):
- Model accuracy: R² > 0.75
- 80% of top-10 recommendations get 4+ stars
- Identify 1-2 acquisition opportunities from AI recommendations

### Long-term (6 months):
- Fully automated deal screening
- Investment thesis generation
- Predictive underwriting

---

## Cold Start Problem

**Challenge:** New users have no ratings yet.

**Solutions:**
1. **Use global model** - Train on all users' ratings combined
2. **Expert seeding** - Have experienced analyst rate 20 properties to bootstrap
3. **Rule-based fallback** - Use documented storage criteria until enough data
4. **Transfer learning** - Use patterns from similar users

---

## Next Steps

1. **Enrich Census data for top states** (TX, FL, GA) - Get ~5,000 properties with demographics
2. **Create interaction tracking tables** - Deploy schema to Supabase
3. **Build rating UI** - Let users start rating properties
4. **Collect 2 weeks of rating data** - Aim for 50-100 ratings per user
5. **Train first models** - See if patterns emerge
6. **Iterate** - Improve features, tune models, add capabilities
