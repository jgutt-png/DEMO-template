# AI-Powered Property Investment Analysis Platform
## Comprehensive System Architecture Document

**Version:** 1.0
**Date:** 2025-11-06
**Status:** Design Specification

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [System Context Diagram](#system-context-diagram)
5. [Component Architecture](#component-architecture)
6. [Data Models & Database Schema](#data-models--database-schema)
7. [ML Pipeline Architecture](#ml-pipeline-architecture)
8. [Feature Engineering Strategy](#feature-engineering-strategy)
9. [Feedback Loop & Reinforcement Learning](#feedback-loop--reinforcement-learning)
10. [API Design](#api-design)
11. [Serving Architecture](#serving-architecture)
12. [Technology Stack](#technology-stack)
13. [Deployment Strategy](#deployment-strategy)
14. [Monitoring & Observability](#monitoring--observability)
15. [Scalability Analysis](#scalability-analysis)
16. [Cost Optimization](#cost-optimization)
17. [Security Considerations](#security-considerations)
18. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This document defines the architecture for an AI-powered property investment analysis platform that ranks properties by investment quality, generates investment theses, and continuously improves through user feedback.

**Key Design Decisions:**
- **Separation of Concerns:** Analysis Engine, Learning Engine, and Serving Layer are independent
- **Hybrid ML Approach:** Combine traditional ML (ranking) with LLMs (thesis generation)
- **Batch + Real-time:** Pre-computed scores with real-time personalization
- **Cost-Aware LLM Usage:** Cached embeddings, batch processing, and tier-based generation
- **Cold Start Mitigation:** Feature-based baseline model before user feedback

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Investment Analysis Platform                   │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │   Property     │  │   Investment   │  │   Learning     │       │
│  │   Analysis     │─▶│   Ranking      │◀─│   Engine       │       │
│  │   Engine       │  │   Engine       │  │   (ML Loop)    │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│         │                     │                    ▲                │
│         │                     │                    │                │
│         ▼                     ▼                    │                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │   Thesis       │  │   Serving      │  │   Feedback     │       │
│  │   Generator    │  │   Layer        │  │   Collector    │       │
│  │   (LLM)        │  │   (API)        │  │                │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Supabase      │
                    │   PostgreSQL    │
                    └─────────────────┘
```

---

## Architecture Principles

### 1. Long-term Maintainability
- **Clear Boundaries:** Each component has well-defined responsibilities
- **Stateless Services:** ML models and APIs can scale independently
- **Version Control:** Track model versions, feature definitions, and theses

### 2. Scalability First
- **10,000+ Properties:** Batch scoring for all properties, indexed for fast retrieval
- **1M+ Properties Future:** Partition by geography, incremental updates
- **Concurrent Users:** Personalization layer uses pre-computed features

### 3. Cost Optimization
- **LLM Tier System:**
  - Tier 1 (Top 10%): GPT-4 detailed analysis
  - Tier 2 (Next 40%): GPT-3.5 standard analysis
  - Tier 3 (Bottom 50%): Template-based analysis
- **Caching Strategy:** Store embeddings, cache thesis by property features
- **Batch Processing:** Generate theses overnight, update on property changes only

### 4. Evidence-Based ML
- **Baseline Model:** Use property fundamentals (cap rate, price/sqft, location) before feedback
- **Incremental Learning:** Don't retrain from scratch, use online learning where appropriate
- **A/B Testing:** Track ranking algorithm performance continuously

---

## System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          External Systems                               │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Google     │  │   ATTOM      │  │   LoopNet    │                │
│  │   Maps API   │  │   Property   │  │   Listings   │                │
│  │              │  │   Data       │  │   API        │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│         │                  │                  │                         │
└─────────┼──────────────────┼──────────────────┼─────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Data Ingestion Layer                               │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Property   │  │   Feature    │  │   Data       │                │
│  │   Enrichment │─▶│   Extraction │─▶│   Validation │                │
│  │   Service    │  │   Pipeline   │  │   & Storage  │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Supabase PostgreSQL Database                       │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Property   │  │   ML         │  │   User       │                │
│  │   Tables     │  │   Artifacts  │  │   Feedback   │                │
│  │   (Existing) │  │   & Scores   │  │   & Prefs    │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI/ML Processing Layer                             │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Feature Engineering Service                             │          │
│  │  - Property metrics calculation                          │          │
│  │  - Market comparables analysis                           │          │
│  │  - Investment ratio computation                          │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Ranking Engine (ML Model)                               │          │
│  │  - Gradient Boosting (XGBoost/LightGBM)                  │          │
│  │  - Baseline: Rule-based scoring                          │          │
│  │  - Output: Investment quality score (0-100)              │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Thesis Generation Service (LLM)                         │          │
│  │  - Tier-based model selection (GPT-4/3.5/template)       │          │
│  │  - Structured prompt engineering                         │          │
│  │  - Output: Investment thesis (pros/cons/verdict)         │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Personalization Engine                                  │          │
│  │  - User preference modeling (collaborative filtering)    │          │
│  │  - Re-ranking based on user history                      │          │
│  │  - Output: Personalized rankings                         │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Reinforcement Learning Loop                             │          │
│  │  - Collect user feedback (ratings, comments)             │          │
│  │  - Update model weights (online learning)                │          │
│  │  - Retrain periodically (weekly batch)                   │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API & Serving Layer (Node.js/Express)              │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Rankings   │  │   Thesis     │  │   Feedback   │                │
│  │   API        │  │   API        │  │   API        │                │
│  │   (GET)      │  │   (GET)      │  │   (POST)     │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Frontend Application                               │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Property   │  │   Investment │  │   Feedback   │                │
│  │   Listings   │  │   Rankings   │  │   Interface  │                │
│  │   (Map View) │  │   (Scored)   │  │   (Ratings)  │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Property Analysis Engine

**Responsibility:** Calculate investment metrics from raw property data

```
Input: Property Data (from Supabase)
  │
  ├─▶ Financial Metrics
  │   ├─ Cap Rate = NOI / Purchase Price
  │   ├─ Price per Sqft = Price / Building Size
  │   ├─ Cash-on-Cash Return
  │   └─ Equity Multiple Projection
  │
  ├─▶ Market Metrics
  │   ├─ Days on Market
  │   ├─ Discount from AVM
  │   ├─ Comparable Sales Analysis
  │   └─ Market Trend Score
  │
  ├─▶ Risk Metrics
  │   ├─ Foreclosure Status
  │   ├─ Equity Position
  │   ├─ Mortgage Coverage Ratio
  │   └─ Zoning Compliance
  │
  └─▶ Location Metrics
      ├─ Neighborhood Score (census data)
      ├─ Proximity to Amenities
      ├─ Growth Potential (demographic trends)
      └─ Crime Rate Index

Output: Feature Vector (50+ features per property)
```

**Implementation:**
- **Service:** `/services/property-analysis-service.js`
- **Frequency:** Run on property insert/update + nightly batch refresh
- **Storage:** `property_features` table

---

### 2. Investment Ranking Engine

**Responsibility:** Score properties 0-100 based on investment quality

**Model Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│  Ranking Model Pipeline                                     │
│                                                             │
│  Feature Vector (50+ features)                             │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────────────────┐        │
│  │  Phase 1: Baseline Rule-Based Model            │        │
│  │  (Used until sufficient feedback collected)    │        │
│  │                                                 │        │
│  │  Score = w1*CapRate + w2*PriceDiscount +       │        │
│  │          w3*LocationScore + w4*RiskScore       │        │
│  │                                                 │        │
│  │  Weights from domain expertise                 │        │
│  └────────────────────────────────────────────────┘        │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────────────────┐        │
│  │  Phase 2: Gradient Boosting Model              │        │
│  │  (LightGBM - fast training/inference)          │        │
│  │                                                 │        │
│  │  Input: 50+ features                           │        │
│  │  Output: Investment Score (0-100)              │        │
│  │  Objective: NDCG (ranking quality)             │        │
│  │  Training: User ratings as labels              │        │
│  │                                                 │        │
│  │  Hyperparameters:                              │        │
│  │  - num_leaves: 31                              │        │
│  │  - learning_rate: 0.05                         │        │
│  │  - n_estimators: 100                           │        │
│  └────────────────────────────────────────────────┘        │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────────────────┐        │
│  │  Phase 3: Personalization Layer                │        │
│  │  (Re-rank based on user preferences)           │        │
│  │                                                 │        │
│  │  For each user:                                │        │
│  │  - Identify similar users (collaborative)      │        │
│  │  - Extract preference vector                   │        │
│  │  - Adjust scores: score' = score * pref_weight │        │
│  │                                                 │        │
│  └────────────────────────────────────────────────┘        │
│         │                                                   │
│         ▼                                                   │
│  Final Ranked List (personalized)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Cold Start Strategy:**
1. **Week 1-2:** Use rule-based baseline with domain expert weights
2. **Week 3+:** Introduce ML model trained on initial user feedback
3. **Month 2+:** Full personalization engine activated

---

### 3. Thesis Generation Service (LLM)

**Responsibility:** Generate human-readable investment analysis

**Tier-Based Generation:**

```
┌─────────────────────────────────────────────────────────────┐
│  Thesis Generation Decision Tree                            │
│                                                             │
│  Property Investment Score                                 │
│         │                                                   │
│         ├─▶ Score >= 80 (Top 10%)                          │
│         │   ├─ Model: GPT-4 Turbo                          │
│         │   ├─ Length: 400-600 words                       │
│         │   ├─ Analysis: Deep dive + comps                 │
│         │   └─ Cost: ~$0.02/property                       │
│         │                                                   │
│         ├─▶ Score 50-79 (Next 40%)                         │
│         │   ├─ Model: GPT-3.5 Turbo                        │
│         │   ├─ Length: 200-300 words                       │
│         │   ├─ Analysis: Standard template                 │
│         │   └─ Cost: ~$0.002/property                      │
│         │                                                   │
│         └─▶ Score < 50 (Bottom 50%)                        │
│             ├─ Model: Template Engine                      │
│             ├─ Length: 100-150 words                       │
│             ├─ Analysis: Key metrics only                  │
│             └─ Cost: ~$0/property                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Prompt Engineering:**

```json
{
  "system_prompt": "You are a commercial real estate investment analyst. Analyze properties objectively using provided data. Structure your analysis as: 1) Investment Thesis, 2) Strengths, 3) Risks, 4) Verdict.",

  "user_prompt_template": "Analyze this commercial property:\n\nProperty Type: {property_type}\nPrice: {price}\nLocation: {city}, {state}\n\nFinancial Metrics:\n- Cap Rate: {cap_rate}%\n- Price/Sqft: ${price_per_sqft}\n- NOI: ${noi}\n\nMarket Data:\n- Days on Market: {days_on_market}\n- AVM: ${avm_value}\n- Discount: {discount}%\n\nProvide a {tier_length} investment analysis.",

  "output_format": {
    "thesis": "string (1-2 sentences)",
    "strengths": ["string", "string", "string"],
    "risks": ["string", "string", "string"],
    "verdict": "BUY | HOLD | PASS",
    "confidence": "HIGH | MEDIUM | LOW"
  }
}
```

**Caching Strategy:**
- Cache by property feature hash (price tier, cap rate bucket, location)
- Invalidate on property data update
- Expected cache hit rate: 30-40%

---

## Data Models & Database Schema

### New Tables (Extend Existing Supabase Schema)

```sql
-- ========================================
-- AI/ML TABLES FOR INVESTMENT ANALYSIS
-- ========================================

-- 1. Property Features (Engineered for ML)
CREATE TABLE IF NOT EXISTS property_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,

    -- Financial Features
    cap_rate DECIMAL(5, 2),                    -- Capitalization rate
    price_per_sqft DECIMAL(10, 2),             -- Price per square foot
    noi_estimate DECIMAL(12, 2),               -- Net Operating Income
    cash_on_cash_return DECIMAL(5, 2),         -- Cash-on-cash return
    equity_multiple_5yr DECIMAL(4, 2),         -- Projected 5-year equity multiple

    -- Market Features
    days_on_market INTEGER,                     -- Days property has been listed
    price_discount_pct DECIMAL(5, 2),          -- Discount from AVM
    comparable_avg_price DECIMAL(12, 2),       -- Average price of comparables
    market_trend_score DECIMAL(5, 2),          -- -100 to 100 (bearish to bullish)

    -- Risk Features
    foreclosure_risk_score DECIMAL(5, 2),      -- 0-100 (low to high risk)
    equity_position_pct DECIMAL(5, 2),         -- Owner equity percentage
    mortgage_coverage_ratio DECIMAL(5, 2),     -- NOI / Mortgage Payment

    -- Location Features
    neighborhood_score DECIMAL(5, 2),          -- 0-100 composite score
    walkability_score DECIMAL(5, 2),           -- Walk Score API
    crime_index DECIMAL(5, 2),                 -- 0-100 (safe to dangerous)
    growth_potential_score DECIMAL(5, 2),      -- Based on demographics

    -- Metadata
    feature_version VARCHAR(20) DEFAULT 'v1.0',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(address_id, feature_version)
);

-- 2. Investment Rankings (ML Model Output)
CREATE TABLE IF NOT EXISTS investment_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,

    -- Ranking Scores
    investment_score DECIMAL(5, 2) NOT NULL,   -- 0-100 composite score
    baseline_score DECIMAL(5, 2),              -- Rule-based score
    ml_score DECIMAL(5, 2),                    -- ML model score

    -- Score Components
    financial_score DECIMAL(5, 2),             -- Financial metrics score
    market_score DECIMAL(5, 2),                -- Market conditions score
    risk_score DECIMAL(5, 2),                  -- Risk assessment score
    location_score DECIMAL(5, 2),              -- Location quality score

    -- Ranking Position
    global_rank INTEGER,                        -- Rank among all properties
    category_rank INTEGER,                      -- Rank within property type
    state_rank INTEGER,                         -- Rank within state

    -- Model Metadata
    model_version VARCHAR(50),                  -- e.g., "lightgbm_v1.2"
    confidence_score DECIMAL(5, 2),            -- Model confidence 0-100

    -- Timestamps
    scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(address_id, model_version)
);

-- 3. Investment Theses (LLM Generated)
CREATE TABLE IF NOT EXISTS investment_theses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,

    -- Thesis Content
    thesis_summary TEXT NOT NULL,              -- 1-2 sentence summary
    strengths JSONB,                           -- Array of strength points
    risks JSONB,                               -- Array of risk points
    verdict VARCHAR(10),                       -- BUY, HOLD, PASS
    confidence VARCHAR(10),                    -- HIGH, MEDIUM, LOW

    -- Full Analysis
    detailed_analysis TEXT,                    -- Full LLM output

    -- Generation Metadata
    tier VARCHAR(20),                          -- "premium", "standard", "basic"
    model_used VARCHAR(50),                    -- "gpt-4-turbo", "gpt-3.5-turbo", "template"
    prompt_version VARCHAR(20),                -- Track prompt evolution
    generation_cost_usd DECIMAL(6, 4),         -- Track LLM costs

    -- Cache Key (for deduplication)
    feature_hash VARCHAR(64),                  -- MD5 of relevant features

    -- Timestamps
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(address_id, prompt_version)
);

-- 4. User Feedback (Ratings & Comments)
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES addresses(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,             -- User identifier

    -- Feedback Data
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,                              -- Optional text feedback

    -- Context
    ranking_shown INTEGER,                     -- What rank was shown to user
    score_shown DECIMAL(5, 2),                 -- What score was shown
    model_version VARCHAR(50),                 -- Which model version

    -- Implicit Signals
    time_spent_seconds INTEGER,               -- Time viewing property
    clicked_through BOOLEAN DEFAULT FALSE,     -- Did user click for details

    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate ratings
    UNIQUE(address_id, user_id)
);

-- 5. User Preferences (Learned Patterns)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,

    -- Preference Weights (learned from feedback)
    preferred_property_types JSONB,            -- {"Retail": 0.8, "Office": 0.2}
    preferred_locations JSONB,                 -- {"CA": 0.6, "TX": 0.4}
    risk_tolerance DECIMAL(5, 2),              -- 0-100 (conservative to aggressive)
    preferred_price_range JSONB,               -- {"min": 500000, "max": 5000000}

    -- Feature Importance (personalized)
    feature_weights JSONB,                     -- Weights for different features

    -- Similar Users (collaborative filtering)
    similar_users JSONB,                       -- Array of similar user_ids

    -- Metadata
    feedback_count INTEGER DEFAULT 0,          -- Number of ratings submitted
    last_feedback_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ML Model Versions (Track Model Evolution)
CREATE TABLE IF NOT EXISTS ml_model_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_version VARCHAR(50) NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL,           -- "baseline", "lightgbm", "personalized"

    -- Model Artifacts
    model_path TEXT,                           -- S3/storage path to serialized model
    feature_list JSONB,                        -- List of features used
    hyperparameters JSONB,                     -- Model configuration

    -- Performance Metrics
    train_ndcg DECIMAL(5, 4),                 -- Training NDCG score
    val_ndcg DECIMAL(5, 4),                   -- Validation NDCG score
    test_ndcg DECIMAL(5, 4),                  -- Test NDCG score
    user_satisfaction_avg DECIMAL(3, 2),      -- Average user rating

    -- Training Metadata
    training_samples INTEGER,                  -- Number of training examples
    training_duration_seconds INTEGER,
    deployed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT FALSE,           -- Currently serving

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Feedback Processing Queue (For Async Updates)
CREATE TABLE IF NOT EXISTS feedback_processing_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID REFERENCES user_feedback(id),

    status VARCHAR(20) DEFAULT 'pending',      -- pending, processing, completed, failed
    processing_type VARCHAR(50),               -- "model_update", "preference_update"

    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Property Features
CREATE INDEX idx_property_features_address ON property_features(address_id);
CREATE INDEX idx_property_features_cap_rate ON property_features(cap_rate DESC);
CREATE INDEX idx_property_features_calculated ON property_features(calculated_at DESC);

-- Rankings
CREATE INDEX idx_rankings_address ON investment_rankings(address_id);
CREATE INDEX idx_rankings_score ON investment_rankings(investment_score DESC);
CREATE INDEX idx_rankings_global_rank ON investment_rankings(global_rank ASC);
CREATE INDEX idx_rankings_model_version ON investment_rankings(model_version);

-- Theses
CREATE INDEX idx_theses_address ON investment_theses(address_id);
CREATE INDEX idx_theses_feature_hash ON investment_theses(feature_hash);
CREATE INDEX idx_theses_generated ON investment_theses(generated_at DESC);

-- Feedback
CREATE INDEX idx_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_feedback_address ON user_feedback(address_id);
CREATE INDEX idx_feedback_submitted ON user_feedback(submitted_at DESC);
CREATE INDEX idx_feedback_rating ON user_feedback(rating);

-- User Preferences
CREATE INDEX idx_user_prefs_user ON user_preferences(user_id);
CREATE INDEX idx_user_prefs_feedback_count ON user_preferences(feedback_count DESC);

-- Queue
CREATE INDEX idx_queue_status ON feedback_processing_queue(status);
CREATE INDEX idx_queue_created ON feedback_processing_queue(created_at ASC);

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- Complete Investment Profile
CREATE OR REPLACE VIEW v_investment_profiles AS
SELECT
    a.id AS address_id,
    a.formatted_address,
    a.city,
    a.state,
    pd.property_type,
    pd.building_size,
    pd.last_sale_price,

    -- Features
    pf.cap_rate,
    pf.price_per_sqft,
    pf.market_trend_score,
    pf.neighborhood_score,

    -- Rankings
    ir.investment_score,
    ir.global_rank,
    ir.category_rank,
    ir.confidence_score,

    -- Thesis
    it.thesis_summary,
    it.verdict,
    it.strengths,
    it.risks,

    -- Feedback Stats
    COUNT(uf.id) AS feedback_count,
    AVG(uf.rating) AS avg_rating,

    -- Timestamps
    pf.calculated_at AS features_updated,
    ir.scored_at AS ranking_updated,
    it.generated_at AS thesis_updated

FROM addresses a
LEFT JOIN property_details pd ON a.id = pd.address_id
LEFT JOIN property_features pf ON a.id = pf.address_id
LEFT JOIN investment_rankings ir ON a.id = ir.address_id
LEFT JOIN investment_theses it ON a.id = it.address_id
LEFT JOIN user_feedback uf ON a.id = uf.address_id
GROUP BY a.id, a.formatted_address, a.city, a.state,
         pd.property_type, pd.building_size, pd.last_sale_price,
         pf.cap_rate, pf.price_per_sqft, pf.market_trend_score, pf.neighborhood_score,
         ir.investment_score, ir.global_rank, ir.category_rank, ir.confidence_score,
         it.thesis_summary, it.verdict, it.strengths, it.risks,
         pf.calculated_at, ir.scored_at, it.generated_at;

-- Top Ranked Properties (Global)
CREATE OR REPLACE VIEW v_top_investments AS
SELECT
    ir.global_rank,
    a.formatted_address,
    a.city,
    a.state,
    pd.property_type,
    ir.investment_score,
    it.verdict,
    it.thesis_summary,
    AVG(uf.rating) AS avg_user_rating,
    COUNT(uf.id) AS rating_count
FROM investment_rankings ir
JOIN addresses a ON ir.address_id = a.id
LEFT JOIN property_details pd ON a.id = pd.address_id
LEFT JOIN investment_theses it ON a.id = it.address_id
LEFT JOIN user_feedback uf ON a.id = uf.address_id
WHERE ir.model_version = (
    SELECT model_version FROM ml_model_versions WHERE is_active = TRUE LIMIT 1
)
GROUP BY ir.global_rank, a.formatted_address, a.city, a.state,
         pd.property_type, ir.investment_score, it.verdict, it.thesis_summary
ORDER BY ir.global_rank ASC;

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_property_features_updated_at BEFORE UPDATE
    ON property_features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rankings_updated_at BEFORE UPDATE
    ON investment_rankings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_theses_updated_at BEFORE UPDATE
    ON investment_theses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_prefs_updated_at BEFORE UPDATE
    ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-enqueue feedback for processing
CREATE OR REPLACE FUNCTION enqueue_feedback_processing()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO feedback_processing_queue (feedback_id, processing_type)
    VALUES (NEW.id, 'model_update');

    INSERT INTO feedback_processing_queue (feedback_id, processing_type)
    VALUES (NEW.id, 'preference_update');

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER enqueue_new_feedback AFTER INSERT
    ON user_feedback FOR EACH ROW EXECUTE FUNCTION enqueue_feedback_processing();
```

---

## ML Pipeline Architecture

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ML Pipeline Flow                                │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  1. DATA INGESTION                                       │          │
│  │     - Property data from Supabase                        │          │
│  │     - User feedback stream                               │          │
│  │     - External market data                               │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  2. FEATURE ENGINEERING                                  │          │
│  │     Service: /services/feature-engineering-service.js    │          │
│  │     Schedule: Nightly batch + real-time on new property │          │
│  │     Output: property_features table                      │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  3. MODEL TRAINING                                       │          │
│  │     Trigger: Weekly or after 100+ new feedback records   │          │
│  │     Framework: Python scikit-learn / LightGBM            │          │
│  │     Process:                                             │          │
│  │       a. Fetch features + feedback labels                │          │
│  │       b. Train/validate/test split (70/15/15)            │          │
│  │       c. Hyperparameter tuning (Optuna)                  │          │
│  │       d. Train final model                               │          │
│  │       e. Evaluate (NDCG, Precision@K, user satisfaction) │          │
│  │       f. Save model artifact to S3                       │          │
│  │       g. Register in ml_model_versions table             │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  4. BATCH SCORING                                        │          │
│  │     Service: /services/batch-scoring-service.js          │          │
│  │     Schedule: Nightly after model training               │          │
│  │     Process:                                             │          │
│  │       a. Load active model                               │          │
│  │       b. Score all properties (bulk inference)           │          │
│  │       c. Calculate rankings (global, category, state)    │          │
│  │       d. Update investment_rankings table                │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  5. THESIS GENERATION                                    │          │
│  │     Service: /services/thesis-generation-service.js      │          │
│  │     Schedule: After batch scoring                        │          │
│  │     Process:                                             │          │
│  │       a. Select properties needing thesis (new/updated)  │          │
│  │       b. Tier assignment (score-based)                   │          │
│  │       c. Check cache (feature_hash)                      │          │
│  │       d. Generate via LLM or template                    │          │
│  │       e. Store in investment_theses table                │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  6. PERSONALIZATION                                      │          │
│  │     Service: Real-time at query time                     │          │
│  │     Process:                                             │          │
│  │       a. Fetch user preferences                          │          │
│  │       b. Apply preference weights to scores              │          │
│  │       c. Re-rank results                                 │          │
│  │       d. Return personalized list                        │          │
│  └──────────────────────────────────────────────────────────┘          │
│                          │                                              │
│                          ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  7. FEEDBACK LOOP                                        │          │
│  │     Trigger: User submits rating/comment                 │          │
│  │     Process:                                             │          │
│  │       a. Store in user_feedback table                    │          │
│  │       b. Enqueue processing (async)                      │          │
│  │       c. Update user_preferences (collaborative filter)  │          │
│  │       d. Accumulate for next training batch              │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Training Process (Python Service)

**File:** `/ml/training/train_ranking_model.py`

```python
"""
Investment Ranking Model Training Pipeline
"""

import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import ndcg_score
import joblib
import os
from datetime import datetime

class RankingModelTrainer:
    def __init__(self, db_connection):
        self.db = db_connection
        self.model_version = f"lightgbm_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def fetch_training_data(self):
        """Fetch features + feedback labels from Supabase"""
        query = """
        SELECT
            pf.*,
            AVG(uf.rating) as user_rating,
            COUNT(uf.id) as rating_count
        FROM property_features pf
        JOIN user_feedback uf ON pf.address_id = uf.address_id
        WHERE pf.feature_version = 'v1.0'
        GROUP BY pf.id
        HAVING COUNT(uf.id) >= 1  -- At least 1 rating
        """
        return pd.read_sql(query, self.db)

    def prepare_features(self, df):
        """Select and transform features"""
        feature_cols = [
            'cap_rate', 'price_per_sqft', 'noi_estimate',
            'cash_on_cash_return', 'equity_multiple_5yr',
            'days_on_market', 'price_discount_pct', 'market_trend_score',
            'foreclosure_risk_score', 'equity_position_pct',
            'neighborhood_score', 'walkability_score', 'growth_potential_score'
        ]

        X = df[feature_cols].fillna(0)
        y = df['user_rating']  # Target: average user rating

        return X, y, feature_cols

    def train_model(self, X_train, y_train, X_val, y_val):
        """Train LightGBM ranking model"""
        train_data = lgb.Dataset(X_train, label=y_train)
        val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

        params = {
            'objective': 'lambdarank',
            'metric': 'ndcg',
            'ndcg_eval_at': [10, 20, 50],
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': 1
        }

        model = lgb.train(
            params,
            train_data,
            num_boost_round=100,
            valid_sets=[train_data, val_data],
            valid_names=['train', 'valid'],
            early_stopping_rounds=10
        )

        return model

    def evaluate_model(self, model, X_test, y_test):
        """Calculate NDCG and other metrics"""
        predictions = model.predict(X_test)

        # NDCG calculation
        ndcg_10 = ndcg_score([y_test], [predictions], k=10)
        ndcg_20 = ndcg_score([y_test], [predictions], k=20)

        return {
            'ndcg@10': ndcg_10,
            'ndcg@20': ndcg_20,
            'num_samples': len(X_test)
        }

    def save_model(self, model, feature_list, metrics):
        """Save model artifact and register in database"""
        # Save model file
        model_path = f'/models/{self.model_version}.pkl'
        joblib.dump(model, model_path)

        # Register in database
        self.db.execute("""
            INSERT INTO ml_model_versions (
                model_version, model_type, model_path,
                feature_list, val_ndcg, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            self.model_version,
            'lightgbm',
            model_path,
            json.dumps(feature_list),
            metrics['ndcg@10'],
            True  # Set as active
        ))

        # Deactivate old models
        self.db.execute("""
            UPDATE ml_model_versions
            SET is_active = FALSE
            WHERE model_version != %s
        """, (self.model_version,))

    def run(self):
        """Execute full training pipeline"""
        print(f"[{self.model_version}] Starting training pipeline...")

        # 1. Fetch data
        df = self.fetch_training_data()
        print(f"Fetched {len(df)} training samples")

        if len(df) < 50:
            print("Not enough training data (need 50+). Skipping training.")
            return

        # 2. Prepare features
        X, y, feature_list = self.prepare_features(df)

        # 3. Split data
        X_train, X_temp, y_train, y_temp = train_test_split(
            X, y, test_size=0.3, random_state=42
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, random_state=42
        )

        # 4. Train model
        model = self.train_model(X_train, y_train, X_val, y_val)

        # 5. Evaluate
        metrics = self.evaluate_model(model, X_test, y_test)
        print(f"Evaluation: {metrics}")

        # 6. Save model
        self.save_model(model, feature_list, metrics)

        print(f"[{self.model_version}] Training complete!")
        return self.model_version
```

---

## Feature Engineering Strategy

### Feature Categories

**1. Financial Features (12 features)**
```javascript
{
  // Return Metrics
  cap_rate: calculateCapRate(noi, purchase_price),
  cash_on_cash_return: calculateCashOnCash(annual_cash_flow, down_payment),
  equity_multiple_5yr: projectEquityMultiple(purchase_price, noi, 5),
  irr_estimate_10yr: estimateIRR(cash_flows, 10),

  // Price Metrics
  price_per_sqft: price / building_size,
  price_per_unit: price / number_of_units,
  price_discount_pct: ((avm_value - price) / avm_value) * 100,

  // Valuation Ratios
  price_to_rent_ratio: price / annual_rent,
  debt_service_coverage: noi / annual_debt_service,

  // Profitability
  noi_estimate: calculateNOI(gross_income, operating_expenses),
  gross_rent_multiplier: price / annual_rent,
  operating_expense_ratio: operating_expenses / gross_income
}
```

**2. Market Features (10 features)**
```javascript
{
  // Listing Metrics
  days_on_market: days_since_listed,
  price_changes_count: number_of_price_reductions,
  current_price_vs_original: (current_price / original_price) - 1,

  // Comparables
  comparable_avg_price: avgPriceOfComparables(city, property_type, size_range),
  comparable_avg_cap_rate: avgCapRateOfComparables(),

  // Market Trends
  market_trend_score: calculateMarketTrendScore(city, state),
  inventory_level: getInventoryLevel(city, property_type),
  median_time_to_sale: getMedianTimeToSale(city),

  // Demand Indicators
  view_count: property_view_count,
  inquiry_count: number_of_inquiries
}
```

**3. Risk Features (8 features)**
```javascript
{
  // Foreclosure Risk
  foreclosure_risk_score: assessForeclosureRisk(foreclosure_status, equity),

  // Financial Risk
  equity_position_pct: equity_amount / avm_value,
  mortgage_coverage_ratio: noi / mortgage_payment,
  ltv_ratio: loan_amount / avm_value,

  // Property Risk
  age_risk_score: calculateAgeRisk(year_built),
  deferred_maintenance_score: estimateDeferredMaintenance(age, condition),

  // Market Risk
  vacancy_risk: getAreaVacancyRate(city, property_type),
  tenant_quality_score: assessTenantQuality(tenant_data)
}
```

**4. Location Features (12 features)**
```javascript
{
  // Neighborhood Quality
  neighborhood_score: getCompositeNeighborhoodScore(lat, lon),
  median_income_area: getCensusMedianIncome(census_tract),
  unemployment_rate: getAreaUnemploymentRate(county),

  // Amenities
  walkability_score: getWalkScore(lat, lon),
  transit_score: getTransitScore(lat, lon),
  school_rating_avg: getSchoolRatings(lat, lon),

  // Demographics
  population_growth_5yr: getPopulationGrowth(city, 5),
  median_age_area: getCensusMedianAge(census_tract),

  // Crime & Safety
  crime_index: getCrimeIndex(zip_code),

  // Economic Indicators
  job_growth_rate: getJobGrowthRate(metro_area),
  gdp_growth_rate: getGDPGrowth(state),
  housing_supply_ratio: getHousingSupplyRatio(city)
}
```

**5. Property Characteristics (8 features)**
```javascript
{
  // Physical
  building_size_sqft: building_size,
  lot_size_sqft: lot_size,
  year_built: year_built,
  stories: number_of_stories,

  // Type Encoding
  property_type_encoded: oneHotEncode(property_type),

  // Condition
  condition_score: assessCondition(year_built, recent_renovations),

  // Parking & Amenities
  parking_ratio: parking_spaces / building_size,
  amenity_score: calculateAmenityScore(pool, gym, etc)
}
```

### Feature Engineering Pipeline

**File:** `/services/feature-engineering-service.js`

```javascript
const { supabase } = require('../supabase-config');

class FeatureEngineeringService {

  async calculateFeaturesForProperty(addressId) {
    // Fetch all property data
    const propertyData = await this.fetchPropertyData(addressId);

    // Calculate feature groups
    const financialFeatures = this.calculateFinancialFeatures(propertyData);
    const marketFeatures = this.calculateMarketFeatures(propertyData);
    const riskFeatures = this.calculateRiskFeatures(propertyData);
    const locationFeatures = await this.calculateLocationFeatures(propertyData);
    const propertyFeatures = this.calculatePropertyFeatures(propertyData);

    // Combine all features
    const features = {
      address_id: addressId,
      ...financialFeatures,
      ...marketFeatures,
      ...riskFeatures,
      ...locationFeatures,
      ...propertyFeatures,
      feature_version: 'v1.0',
      calculated_at: new Date().toISOString()
    };

    // Upsert to database
    await this.saveFeatures(features);

    return features;
  }

  calculateFinancialFeatures(data) {
    const price = data.last_sale_price || data.avm_value || 0;
    const building_size = data.building_size || 1;
    const noi = this.estimateNOI(data);

    return {
      cap_rate: (noi / price) * 100,
      price_per_sqft: price / building_size,
      noi_estimate: noi,
      price_discount_pct: data.avm_value
        ? ((data.avm_value - price) / data.avm_value) * 100
        : 0,
      // ... more features
    };
  }

  calculateMarketFeatures(data) {
    const listed_date = data.listed_date || new Date();
    const days_on_market = Math.floor(
      (new Date() - new Date(listed_date)) / (1000 * 60 * 60 * 24)
    );

    return {
      days_on_market,
      // ... more features
    };
  }

  calculateRiskFeatures(data) {
    const equity_pct = data.equity_percent || 100;
    const foreclosure_status = data.foreclosure_status || 'none';

    let foreclosure_risk = 0;
    if (foreclosure_status !== 'none') foreclosure_risk = 80;
    else if (equity_pct < 20) foreclosure_risk = 50;
    else if (equity_pct < 40) foreclosure_risk = 25;

    return {
      foreclosure_risk_score: foreclosure_risk,
      equity_position_pct: equity_pct,
      // ... more features
    };
  }

  async calculateLocationFeatures(data) {
    // Call external APIs for location data
    const walkScore = await this.getWalkScore(data.latitude, data.longitude);
    const censusData = await this.getCensusData(data.zip_code);

    return {
      walkability_score: walkScore,
      median_income_area: censusData.median_income,
      // ... more features
    };
  }

  async batchCalculateFeatures(addressIds) {
    console.log(`Calculating features for ${addressIds.length} properties...`);

    const results = [];
    for (const addressId of addressIds) {
      try {
        const features = await this.calculateFeaturesForProperty(addressId);
        results.push({ addressId, success: true });
      } catch (error) {
        console.error(`Error for ${addressId}:`, error);
        results.push({ addressId, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = { FeatureEngineeringService };
```

---

## Feedback Loop & Reinforcement Learning

### Feedback Collection Flow

```
User Interaction
     │
     ├─▶ Explicit Feedback
     │   ├─ Star Rating (1-5)
     │   ├─ Text Comment
     │   └─ Verdict Agree/Disagree
     │
     └─▶ Implicit Feedback
         ├─ Time Spent Viewing
         ├─ Click-through Rate
         ├─ Save/Bookmark Action
         └─ Inquiry/Contact Action

          │
          ▼
    ┌──────────────────────┐
    │  user_feedback       │
    │  table (INSERT)      │
    └──────────────────────┘
          │
          ▼
    ┌──────────────────────┐
    │  Auto-trigger        │
    │  (database trigger)  │
    └──────────────────────┘
          │
          ▼
    ┌──────────────────────┐
    │  feedback_processing │
    │  _queue (2 records)  │
    │  - model_update      │
    │  - preference_update │
    └──────────────────────┘
          │
          ▼
    ┌──────────────────────┐
    │  Async Worker        │
    │  Process Queue       │
    └──────────────────────┘
          │
          ├─▶ Update user_preferences (immediate)
          │
          └─▶ Accumulate for model retraining (batch)
```

### Reinforcement Learning Strategy

**Phase 1: Supervised Learning (Week 1-4)**
- Use explicit ratings as labels
- Train ranking model to predict user ratings
- Objective: Maximize NDCG (ranking quality)

**Phase 2: Contextual Bandits (Month 2+)**
- Explore/Exploit tradeoff
- Thompson Sampling or Upper Confidence Bound (UCB)
- Personalized ranking per user

**Phase 3: Full RL (Month 6+)**
- Multi-armed bandit with delayed rewards
- Reward signal: Did user inquire/purchase?
- Policy: π(property | user_context) → ranking

### User Preference Learning

**File:** `/services/preference-learning-service.js`

```javascript
class PreferenceLearningService {

  async updateUserPreferences(userId, feedbackId) {
    // Fetch user's feedback history
    const feedbackHistory = await this.getUserFeedback(userId);

    // Extract patterns
    const preferences = {
      preferred_property_types: this.extractTypePreferences(feedbackHistory),
      preferred_locations: this.extractLocationPreferences(feedbackHistory),
      risk_tolerance: this.calculateRiskTolerance(feedbackHistory),
      preferred_price_range: this.extractPriceRange(feedbackHistory),
      feature_weights: this.learnFeatureWeights(feedbackHistory)
    };

    // Find similar users (collaborative filtering)
    const similarUsers = await this.findSimilarUsers(userId, preferences);

    // Upsert preferences
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        similar_users: JSON.stringify(similarUsers),
        feedback_count: feedbackHistory.length,
        last_feedback_at: new Date().toISOString()
      });
  }

  extractTypePreferences(feedback) {
    // Count ratings by property type
    const typeCounts = {};
    const typeRatings = {};

    feedback.forEach(f => {
      const type = f.property_type;
      if (!typeCounts[type]) {
        typeCounts[type] = 0;
        typeRatings[type] = [];
      }
      typeCounts[type]++;
      typeRatings[type].push(f.rating);
    });

    // Calculate preference weights (avg rating * frequency)
    const preferences = {};
    Object.keys(typeRatings).forEach(type => {
      const avgRating = typeRatings[type].reduce((a, b) => a + b, 0) / typeRatings[type].length;
      const frequency = typeCounts[type] / feedback.length;
      preferences[type] = avgRating * frequency;
    });

    return preferences;
  }

  learnFeatureWeights(feedback) {
    // Simple approach: correlation between feature values and ratings
    // Advanced: Train a linear model per user

    const features = ['cap_rate', 'price_discount_pct', 'neighborhood_score'];
    const weights = {};

    features.forEach(feature => {
      const correlation = this.calculateCorrelation(
        feedback.map(f => f[feature]),
        feedback.map(f => f.rating)
      );
      weights[feature] = Math.max(0, correlation); // Only positive correlations
    });

    return weights;
  }

  async findSimilarUsers(userId, preferences) {
    // Fetch all user preferences
    const { data: allPrefs } = await supabase
      .from('user_preferences')
      .select('*')
      .neq('user_id', userId);

    // Calculate similarity scores
    const similarities = allPrefs.map(otherUser => ({
      user_id: otherUser.user_id,
      similarity: this.calculateUserSimilarity(preferences, otherUser)
    }));

    // Return top 10 most similar users
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
      .map(s => s.user_id);
  }

  calculateUserSimilarity(prefs1, prefs2) {
    // Cosine similarity on feature weights
    const weights1 = prefs1.feature_weights || {};
    const weights2 = prefs2.feature_weights || {};

    const features = new Set([
      ...Object.keys(weights1),
      ...Object.keys(weights2)
    ]);

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    features.forEach(f => {
      const w1 = weights1[f] || 0;
      const w2 = weights2[f] || 0;
      dotProduct += w1 * w2;
      mag1 += w1 * w1;
      mag2 += w2 * w2;
    });

    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }
}
```

---

## API Design

### REST API Endpoints

```
┌─────────────────────────────────────────────────────────────┐
│  Investment Analysis API                                    │
│  Base URL: /api/investment                                  │
└─────────────────────────────────────────────────────────────┘

1. GET /api/investment/rankings
   Description: Get ranked list of properties
   Query Parameters:
     - user_id (optional): Personalized rankings
     - limit (default: 20): Number of results
     - offset (default: 0): Pagination
     - property_type (optional): Filter by type
     - state (optional): Filter by state
     - min_score (optional): Minimum investment score

   Response:
   {
     "success": true,
     "data": [
       {
         "address_id": "uuid",
         "formatted_address": "string",
         "investment_score": 87.5,
         "global_rank": 12,
         "verdict": "BUY",
         "thesis_summary": "string",
         "property_type": "Retail",
         "city": "San Francisco",
         "state": "CA",
         "price": 2500000,
         "cap_rate": 6.5
       }
     ],
     "pagination": {
       "limit": 20,
       "offset": 0,
       "total": 10000
     }
   }

2. GET /api/investment/property/:addressId
   Description: Get full investment analysis for property

   Response:
   {
     "success": true,
     "data": {
       "address_id": "uuid",
       "property_details": {...},
       "investment_score": 87.5,
       "score_components": {
         "financial_score": 90,
         "market_score": 85,
         "risk_score": 88,
         "location_score": 87
       },
       "global_rank": 12,
       "category_rank": 3,
       "thesis": {
         "summary": "string",
         "strengths": ["point1", "point2"],
         "risks": ["risk1", "risk2"],
         "verdict": "BUY",
         "confidence": "HIGH"
       },
       "features": {...},
       "user_feedback": {
         "avg_rating": 4.2,
         "count": 15,
         "your_rating": null
       }
     }
   }

3. POST /api/investment/feedback
   Description: Submit user feedback
   Body:
   {
     "address_id": "uuid",
     "user_id": "string",
     "rating": 4,
     "comment": "Great opportunity",
     "time_spent_seconds": 45
   }

   Response:
   {
     "success": true,
     "message": "Feedback recorded",
     "feedback_id": "uuid"
   }

4. GET /api/investment/user/:userId/preferences
   Description: Get learned user preferences

   Response:
   {
     "success": true,
     "data": {
       "user_id": "string",
       "preferred_property_types": {
         "Retail": 0.8,
         "Office": 0.6
       },
       "risk_tolerance": 65,
       "feedback_count": 23,
       "personalization_active": true
     }
   }

5. GET /api/investment/recommendations
   Description: Personalized property recommendations
   Query Parameters:
     - user_id (required)
     - limit (default: 10)

   Response:
   {
     "success": true,
     "data": {
       "recommendations": [...],
       "reason": "Based on your preferences and similar users"
     }
   }

6. GET /api/investment/compare
   Description: Compare multiple properties
   Query Parameters:
     - address_ids: comma-separated UUIDs

   Response:
   {
     "success": true,
     "data": {
       "properties": [...],
       "comparison_matrix": {...}
     }
   }

7. POST /api/investment/batch-score
   Description: Trigger batch scoring job (admin only)

   Response:
   {
     "success": true,
     "job_id": "uuid",
     "status": "queued"
   }

8. GET /api/investment/model/status
   Description: Get current model version and metrics

   Response:
   {
     "success": true,
     "data": {
       "active_model": "lightgbm_20251106_120000",
       "val_ndcg": 0.87,
       "training_samples": 1523,
       "deployed_at": "2025-11-06T12:00:00Z",
       "user_satisfaction": 4.2
     }
   }
```

### API Implementation Example

**File:** `/routes/investment-routes.js`

```javascript
const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase-config');
const { PersonalizationService } = require('../services/personalization-service');

// GET /api/investment/rankings
router.get('/rankings', async (req, res) => {
  try {
    const {
      user_id,
      limit = 20,
      offset = 0,
      property_type,
      state,
      min_score
    } = req.query;

    // Build query
    let query = supabase
      .from('v_investment_profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (property_type) query = query.eq('property_type', property_type);
    if (state) query = query.eq('state', state);
    if (min_score) query = query.gte('investment_score', parseFloat(min_score));

    // Pagination
    query = query.range(offset, offset + limit - 1);

    // Default ordering
    query = query.order('global_rank', { ascending: true });

    const { data, error, count } = await query;
    if (error) throw error;

    // Apply personalization if user_id provided
    let results = data;
    if (user_id) {
      const personalizationService = new PersonalizationService();
      results = await personalizationService.personalizeRankings(user_id, data);
    }

    res.json({
      success: true,
      data: results,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count
      }
    });

  } catch (error) {
    console.error('Rankings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/investment/feedback
router.post('/feedback', async (req, res) => {
  try {
    const {
      address_id,
      user_id,
      rating,
      comment,
      time_spent_seconds
    } = req.body;

    // Validation
    if (!address_id || !user_id || !rating) {
      return res.status(400).json({
        success: false,
        error: 'address_id, user_id, and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'rating must be between 1 and 5'
      });
    }

    // Get current ranking shown to user
    const { data: ranking } = await supabase
      .from('investment_rankings')
      .select('investment_score, global_rank, model_version')
      .eq('address_id', address_id)
      .single();

    // Insert feedback
    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        address_id,
        user_id,
        rating,
        comment,
        time_spent_seconds,
        ranking_shown: ranking?.global_rank,
        score_shown: ranking?.investment_score,
        model_version: ranking?.model_version
      })
      .select()
      .single();

    if (error) throw error;

    // Feedback processing will be triggered by database trigger

    res.json({
      success: true,
      message: 'Feedback recorded',
      feedback_id: data.id
    });

  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

## Serving Architecture

### Batch vs Real-Time Decision Matrix

```
┌─────────────────────────────────────────────────────────────┐
│  Operation              │  Batch  │  Real-time  │  Hybrid  │
├─────────────────────────┼─────────┼─────────────┼──────────┤
│  Feature Engineering    │    ✓    │             │          │
│  Model Training         │    ✓    │             │          │
│  Property Scoring       │    ✓    │             │          │
│  Thesis Generation      │    ✓    │             │          │
│  Rank Calculation       │    ✓    │             │          │
│  Personalization        │         │      ✓      │          │
│  Feedback Collection    │         │      ✓      │          │
│  Preference Update      │         │             │    ✓     │
│  Model Update           │    ✓    │             │          │
└─────────────────────────────────────────────────────────────┘
```

### Serving Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Request Flow                                 │
│                                                                 │
│  User Request (/api/investment/rankings?user_id=123)           │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │  API Gateway (Express)                           │          │
│  │  - Rate limiting                                 │          │
│  │  - Authentication                                │          │
│  │  - Request validation                            │          │
│  └──────────────────────────────────────────────────┘          │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Caching Layer (Redis)                           │          │
│  │  - Check cache for rankings                      │          │
│  │  - TTL: 5 minutes (global), 1 hour (user)        │          │
│  └──────────────────────────────────────────────────┘          │
│         │                                                       │
│         ├─ Cache Hit ────────────────────────┐                 │
│         │                                     │                 │
│         │                                     ▼                 │
│         │                           ┌──────────────────┐       │
│         │                           │  Return Cached   │       │
│         │                           │  Results         │       │
│         │                           └──────────────────┘       │
│         │                                                       │
│         └─ Cache Miss                                          │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Database Query (Supabase)                       │          │
│  │  - Fetch pre-computed rankings                   │          │
│  │  - Join with property details                    │          │
│  │  - Apply filters                                 │          │
│  └──────────────────────────────────────────────────┘          │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Personalization Engine                          │          │
│  │  - Fetch user preferences                        │          │
│  │  - Re-rank results                               │          │
│  │  - Apply collaborative filtering                 │          │
│  └──────────────────────────────────────────────────┘          │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Response Formatting                             │          │
│  │  - Serialize JSON                                │          │
│  │  - Cache result (write-through)                  │          │
│  │  - Return to client                              │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Performance Targets

```
┌──────────────────────────────────────────────────────┐
│  Endpoint                  │  P50   │  P95   │ P99  │
├────────────────────────────┼────────┼────────┼──────┤
│  GET /rankings (cached)    │  20ms  │  50ms  │ 100ms│
│  GET /rankings (uncached)  │ 100ms  │ 200ms  │ 500ms│
│  GET /property/:id         │  50ms  │ 100ms  │ 200ms│
│  POST /feedback            │  30ms  │  80ms  │ 150ms│
│  GET /recommendations      │ 150ms  │ 300ms  │ 600ms│
└──────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Recommended Stack

```yaml
Backend:
  Runtime: Node.js 18+
  Framework: Express.js
  Database: Supabase (PostgreSQL 14+)
  Cache: Redis (for API responses, session data)
  Queue: BullMQ (for async job processing)

ML/AI:
  Training: Python 3.9+ (scikit-learn, LightGBM, pandas)
  LLM: OpenAI API (GPT-4 Turbo, GPT-3.5 Turbo)
  Embeddings: sentence-transformers (for caching)
  Serving:
    - Option 1: ONNX Runtime (for production inference)
    - Option 2: Python microservice (FastAPI)

Data Processing:
  ETL: Node.js scripts (nightly cron jobs)
  Feature Store: Supabase tables (property_features)
  External APIs:
    - Google Maps API (geocoding, places)
    - Census API (demographics)
    - Walk Score API (location quality)

Infrastructure:
  Hosting:
    - Backend: Railway / Render / Fly.io
    - ML Service: Modal / Railway
    - Database: Supabase Cloud
  Storage:
    - Model Artifacts: S3-compatible (Supabase Storage)
    - Logs: CloudWatch / Datadog
  Monitoring:
    - Application: Sentry (error tracking)
    - Performance: New Relic / Datadog
    - ML Metrics: Custom dashboard (Supabase + Chart.js)

Frontend:
  Framework: Vanilla JS (existing)
  Maps: Leaflet.js (existing)
  Charts: Chart.js (for analytics)

Development:
  Version Control: Git
  CI/CD: GitHub Actions
  Testing:
    - Unit: Jest
    - Integration: Supertest
    - E2E: Playwright (optional)
```

### Key Dependencies

**Backend (`package.json`)**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "node-fetch": "^3.3.0",
    "redis": "^4.6.0",
    "bullmq": "^4.0.0",
    "openai": "^4.20.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.0",
    "nodemon": "^3.0.0"
  }
}
```

**ML Service (`requirements.txt`)**
```
pandas==2.1.0
numpy==1.24.0
scikit-learn==1.3.0
lightgbm==4.1.0
optuna==3.4.0
psycopg2-binary==2.9.9
python-dotenv==1.0.0
fastapi==0.104.0
uvicorn==0.24.0
pydantic==2.5.0
joblib==1.3.2
onnx==1.15.0
onnxruntime==1.16.0
```

---

## Deployment Strategy

### Phase 1: Foundation (Week 1-2)

```
┌─────────────────────────────────────────────┐
│  Deliverables:                              │
│  1. Database schema deployed to Supabase    │
│  2. Feature engineering service deployed    │
│  3. Baseline ranking model (rule-based)     │
│  4. Basic APIs (rankings, property detail)  │
│  5. LLM thesis generation (template-based)  │
└─────────────────────────────────────────────┘

Steps:
1. Run SQL migration: supabase-ai-schema.sql
2. Deploy feature engineering service (nightly cron)
3. Implement baseline ranking algorithm
4. Deploy API endpoints
5. Test with existing property data
```

### Phase 2: ML Model (Week 3-4)

```
┌─────────────────────────────────────────────┐
│  Deliverables:                              │
│  1. ML training pipeline (Python)           │
│  2. Initial model trained on seed data      │
│  3. Batch scoring service                   │
│  4. Model versioning system                 │
│  5. Feedback collection API                 │
└─────────────────────────────────────────────┘

Steps:
1. Collect seed feedback (manual ratings or synthetic)
2. Train initial LightGBM model
3. Deploy model to serving layer
4. Implement batch scoring job
5. Launch feedback collection
```

### Phase 3: Personalization (Week 5-6)

```
┌─────────────────────────────────────────────┐
│  Deliverables:                              │
│  1. User preference learning service        │
│  2. Personalization engine                  │
│  3. Collaborative filtering                 │
│  4. Recommendations API                     │
│  5. User dashboard (view preferences)       │
└─────────────────────────────────────────────┘

Steps:
1. Implement preference learning algorithm
2. Build personalization layer
3. Deploy collaborative filtering
4. Test with real users
5. Monitor personalization quality
```

### Phase 4: Advanced LLM (Week 7-8)

```
┌─────────────────────────────────────────────┐
│  Deliverables:                              │
│  1. Tier-based LLM thesis generation        │
│  2. Prompt engineering optimization         │
│  3. Thesis caching system                   │
│  4. Cost monitoring dashboard               │
│  5. Quality evaluation metrics              │
└─────────────────────────────────────────────┘

Steps:
1. Implement tier logic (GPT-4/3.5/template)
2. Optimize prompts for quality and cost
3. Deploy caching layer (Redis + feature hashing)
4. Monitor LLM costs and quality
5. A/B test thesis quality
```

### Phase 5: Continuous Learning (Week 9+)

```
┌─────────────────────────────────────────────┐
│  Deliverables:                              │
│  1. Automated model retraining pipeline     │
│  2. Online learning for rapid updates       │
│  3. A/B testing framework                   │
│  4. Performance monitoring dashboard        │
│  5. Alerting system for model degradation   │
└─────────────────────────────────────────────┘

Steps:
1. Set up weekly retraining schedule
2. Implement online learning for preferences
3. Deploy A/B testing (multiple models)
4. Monitor NDCG, user satisfaction over time
5. Alert on model performance drops
```

---

## Monitoring & Observability

### Metrics to Track

**1. ML Model Performance**
```javascript
{
  // Ranking Quality
  ndcg_at_10: 0.87,           // Normalized Discounted Cumulative Gain
  ndcg_at_20: 0.85,
  precision_at_10: 0.75,       // % of top 10 that users rate highly

  // User Satisfaction
  avg_user_rating: 4.2,        // Average rating of all feedback
  feedback_rate: 0.15,         // % of users who provide feedback
  rating_distribution: {
    5: 0.45,
    4: 0.30,
    3: 0.15,
    2: 0.07,
    1: 0.03
  },

  // Model Drift
  feature_drift_score: 0.05,   // KL divergence from training distribution
  prediction_drift_score: 0.03,

  // Personalization
  personalization_lift: 1.25,  // Personalized vs non-personalized satisfaction
  cold_start_users: 152,       // Users with <3 ratings
}
```

**2. LLM Performance**
```javascript
{
  // Cost
  total_cost_usd: 45.23,
  cost_per_thesis: 0.008,
  tier_breakdown: {
    gpt4: { count: 150, cost: 30.00 },
    gpt35: { count: 600, cost: 15.00 },
    template: { count: 750, cost: 0.23 }
  },

  // Quality
  cache_hit_rate: 0.35,
  avg_generation_time_ms: 1200,
  thesis_length_avg: 285,

  // User Engagement
  thesis_read_rate: 0.68,      // % of users who read full thesis
  thesis_helpful_rate: 0.82    // % who find it helpful (survey)
}
```

**3. API Performance**
```javascript
{
  // Latency
  p50_latency_ms: { rankings: 45, property: 32, feedback: 18 },
  p95_latency_ms: { rankings: 150, property: 95, feedback: 55 },
  p99_latency_ms: { rankings: 350, property: 220, feedback: 120 },

  // Throughput
  requests_per_second: 45,

  // Errors
  error_rate: 0.002,
  timeout_rate: 0.0005,

  // Cache
  cache_hit_rate: 0.65
}
```

**4. Business Metrics**
```javascript
{
  // Engagement
  daily_active_users: 523,
  avg_properties_viewed: 12,
  avg_feedback_per_user: 3.2,

  // Conversion
  inquiry_rate: 0.08,          // % of viewed properties with inquiry
  top_10_inquiry_rate: 0.18,   // Inquiry rate for top-ranked

  // Retention
  week_1_retention: 0.45,
  week_4_retention: 0.28
}
```

### Monitoring Dashboard

**Tools:**
- **Application Metrics:** Datadog / New Relic / Prometheus
- **ML Metrics:** Custom dashboard (Supabase + Chart.js)
- **Error Tracking:** Sentry
- **Logs:** CloudWatch / Datadog

**Dashboard Panels:**

```
┌─────────────────────────────────────────────────────────────┐
│  Investment Analysis Platform - Monitoring Dashboard        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Model NDCG      │  │  User Satisfaction│               │
│  │  Current: 0.87   │  │  Avg: 4.2 / 5.0   │               │
│  │  (Line chart)    │  │  (Gauge)          │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Latency (P95)                                   │  │
│  │  (Time series: rankings, property, feedback)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  LLM Costs       │  │  Cache Hit Rate  │               │
│  │  Daily: $45      │  │  65%             │               │
│  │  (Bar chart)     │  │  (Pie chart)     │               │
│  └──────────────────┘  └──────────────────┘               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Feedback Volume (Last 7 Days)                       │  │
│  │  (Bar chart by day)                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Recent Alerts                                       │  │
│  │  • Model NDCG dropped below 0.85 (4 hours ago)       │  │
│  │  • LLM costs exceeded $50/day (2 hours ago)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Alerting Rules

```yaml
alerts:
  - name: model_performance_degradation
    condition: ndcg_at_10 < 0.80
    severity: critical
    action: notify_ml_team, trigger_retraining

  - name: user_satisfaction_drop
    condition: avg_user_rating < 3.5
    severity: high
    action: notify_product_team

  - name: llm_cost_spike
    condition: daily_llm_cost > 100
    severity: medium
    action: notify_ops_team, reduce_gpt4_tier

  - name: api_latency_high
    condition: p95_latency_ms > 500
    severity: high
    action: notify_ops_team, check_db_performance

  - name: cache_hit_rate_low
    condition: cache_hit_rate < 0.40
    severity: low
    action: notify_ops_team, review_cache_policy

  - name: feedback_volume_drop
    condition: daily_feedback_count < 50
    severity: medium
    action: notify_product_team, check_ux
```

---

## Scalability Analysis

### Current Scale: 10,000 Properties

**Batch Scoring Performance:**
```
Properties: 10,000
Features per property: 50
Model inference: ~1ms per property
Total scoring time: 10 seconds
Ranking calculation: 2 seconds
Thesis generation (tiered):
  - GPT-4 (1,000): ~60 seconds
  - GPT-3.5 (4,000): ~80 seconds
  - Template (5,000): ~5 seconds
Total batch time: ~3 minutes

Frequency: Nightly (acceptable)
```

**API Serving:**
```
Queries per second: 10-50
Concurrent users: 100-500
Database queries: <100ms (indexed)
Cache hit rate: 60-70%
Response time: <200ms (p95)

Bottlenecks: None at this scale
```

### Target Scale: 100,000 Properties

**Optimizations Needed:**

1. **Database Partitioning**
   - Partition by state or region
   - Use materialized views for rankings
   - Index optimization on score columns

2. **Batch Processing**
   - Parallel scoring (split by chunks)
   - Incremental updates (only changed properties)
   - Distributed training (if model becomes large)

3. **Caching Strategy**
   - Increase cache TTL for stable rankings
   - Pre-generate top 1000 rankings
   - Edge caching (CDN for static rankings)

4. **LLM Optimization**
   - Increase cache hit rate to 50%+
   - Reduce GPT-4 tier to top 5%
   - Batch API calls to OpenAI

**Projected Performance:**
```
Batch scoring time: ~30 minutes
Thesis generation: ~15 minutes (with caching)
API response time: <300ms (p95)
Database load: Moderate (with partitioning)
```

### Future Scale: 1,000,000+ Properties

**Architecture Changes:**

1. **Distributed System**
   - Multiple regional databases (geo-sharding)
   - Microservices for each component
   - Message queue for async processing (Kafka/RabbitMQ)

2. **ML Pipeline**
   - Spark/Dask for distributed training
   - Model sharding (per region or property type)
   - Online learning for rapid updates

3. **Serving**
   - Elasticsearch for fast ranking queries
   - GraphQL for flexible queries
   - Read replicas for high availability

4. **Cost Management**
   - Move to self-hosted LLM for tier 2/3
   - Aggressive caching (90%+ hit rate)
   - Approximate nearest neighbors for recommendations

---

## Cost Optimization

### Monthly Cost Estimate (10,000 Properties)

```
┌────────────────────────────────────────────────────┐
│  Service                  │  Monthly Cost          │
├───────────────────────────┼────────────────────────┤
│  Supabase (Pro)           │  $25                   │
│  - Database storage       │  included              │
│  - 100GB bandwidth        │  included              │
│                           │                        │
│  OpenAI API               │  $150-300              │
│  - GPT-4 (1000/month)     │  ~$60                  │
│  - GPT-3.5 (4000/month)   │  ~$40                  │
│  - Embeddings             │  ~$20                  │
│  - Buffer                 │  ~$30                  │
│                           │                        │
│  Redis (Upstash/Railway)  │  $10-20                │
│                           │                        │
│  Backend Hosting          │  $20-50                │
│  (Railway/Render)         │                        │
│                           │                        │
│  ML Service Hosting       │  $20-40                │
│  (Modal/Railway)          │                        │
│                           │                        │
│  External APIs            │  $50-100               │
│  - Walk Score API         │  ~$20                  │
│  - Census API             │  Free                  │
│  - Weather/Crime APIs     │  ~$30                  │
│                           │                        │
│  Monitoring/Logs          │  $30-50                │
│  (Sentry, Datadog)        │                        │
│                           │                        │
│  TOTAL                    │  $305-580/month        │
└────────────────────────────────────────────────────┘
```

### Cost Optimization Strategies

**1. LLM Cost Reduction**
```javascript
// Current: All properties get LLM thesis
// Optimized: Tiered approach

const tierOptimization = {
  before: {
    gpt4: 10000 * 0.02,      // $200
    gpt35: 0,
    template: 0,
    total: 200
  },
  after: {
    gpt4: 1000 * 0.02,       // $20
    gpt35: 4000 * 0.005,     // $20
    template: 5000 * 0,      // $0
    total: 40
  },
  savings: 160  // $160/month (80% reduction)
};
```

**2. Caching Strategy**
```javascript
// Cache theses by feature similarity
const cachingImpact = {
  cache_hit_rate: 0.40,      // 40% of requests hit cache
  llm_calls_saved: 4000,     // Out of 10,000
  cost_savings: 4000 * 0.01, // $40/month

  cache_storage_cost: 5,     // Redis storage
  net_savings: 35            // $35/month
};
```

**3. Batch Processing**
```javascript
// Use OpenAI batch API (50% discount)
const batchOptimization = {
  standard_api: 10000 * 0.01,  // $100
  batch_api: 10000 * 0.005,    // $50
  savings: 50                   // $50/month
};
```

**4. Self-Hosted Alternative (Advanced)**
```javascript
// For tier 3 (template), use local model
const selfHostedOption = {
  setup_cost: 500,             // One-time
  monthly_inference_cost: 10,  // GPU runtime
  replacement_llm_cost: 40,    // Replaces tier 3
  net_savings: 30,             // After amortization

  tradeoff: "Slightly lower quality, full control"
};
```

**Total Optimized Cost: $200-350/month**

---

## Security Considerations

### Data Protection

1. **User Feedback Privacy**
   - Hash user IDs before storage
   - Anonymize feedback for model training
   - GDPR compliance (right to deletion)

2. **API Keys**
   - Never expose in frontend
   - Rotate regularly (monthly)
   - Use environment variables

3. **Database Security**
   - Row-level security (RLS) in Supabase
   - Encrypted connections (SSL/TLS)
   - Regular backups

4. **Rate Limiting**
   ```javascript
   // Prevent API abuse
   const rateLimits = {
     rankings: '100 requests/hour per IP',
     feedback: '50 requests/hour per user',
     batch_operations: 'Admin only'
   };
   ```

5. **Input Validation**
   - Sanitize all user inputs (feedback comments)
   - Prevent SQL injection
   - Validate rating ranges (1-5)

### Model Security

1. **Model Versioning**
   - Track all model versions
   - Ability to rollback to previous version
   - Audit trail of model changes

2. **Adversarial Attacks**
   - Monitor for feedback manipulation
   - Detect coordinated rating campaigns
   - Flag suspicious patterns

3. **Data Poisoning**
   - Review outlier feedback
   - Weight recent feedback higher
   - Human review for extreme cases

---

## Implementation Roadmap

### Sprint 1-2: Foundation (Weeks 1-2)

**Goals:**
- Deploy database schema
- Implement feature engineering
- Launch baseline ranking system

**Tasks:**
- [ ] Run SQL migration (`supabase-ai-schema.sql`)
- [ ] Create feature engineering service
- [ ] Implement baseline ranking algorithm (rule-based)
- [ ] Deploy API endpoints (rankings, property detail)
- [ ] Create template-based thesis generation
- [ ] Test with 100 properties
- [ ] Deploy to staging environment

**Deliverables:**
- Working API endpoints
- Baseline rankings for all properties
- Basic investment theses

---

### Sprint 3-4: ML Model (Weeks 3-4)

**Goals:**
- Train first ML model
- Deploy batch scoring
- Launch feedback collection

**Tasks:**
- [ ] Collect seed feedback (50+ properties)
- [ ] Build Python training pipeline
- [ ] Train LightGBM model
- [ ] Deploy model serving layer
- [ ] Implement batch scoring job
- [ ] Create feedback API
- [ ] Test model quality (NDCG)
- [ ] Deploy to production

**Deliverables:**
- Trained ML model
- Nightly batch scoring job
- Feedback collection system

---

### Sprint 5-6: Personalization (Weeks 5-6)

**Goals:**
- Learn user preferences
- Personalize rankings
- Implement collaborative filtering

**Tasks:**
- [ ] Build preference learning service
- [ ] Implement personalization engine
- [ ] Create user similarity algorithm
- [ ] Deploy recommendations API
- [ ] Test with 10+ users
- [ ] Monitor personalization lift
- [ ] Add user preferences dashboard

**Deliverables:**
- Personalized rankings
- Recommendations endpoint
- User preferences tracking

---

### Sprint 7-8: Advanced LLM (Weeks 7-8)

**Goals:**
- Optimize thesis generation
- Reduce LLM costs
- Improve thesis quality

**Tasks:**
- [ ] Implement tier-based generation
- [ ] Optimize prompts for each tier
- [ ] Deploy caching layer (Redis)
- [ ] Set up cost monitoring
- [ ] A/B test thesis quality
- [ ] Implement batch LLM API
- [ ] Monitor cache hit rates

**Deliverables:**
- Tiered LLM system
- 40%+ cache hit rate
- 80%+ cost reduction

---

### Sprint 9+: Continuous Improvement

**Goals:**
- Automate model retraining
- Monitor performance
- Iterate based on feedback

**Tasks:**
- [ ] Set up weekly retraining pipeline
- [ ] Implement A/B testing framework
- [ ] Create monitoring dashboard
- [ ] Set up alerting system
- [ ] Conduct user research
- [ ] Iterate on features
- [ ] Optimize for scale

**Deliverables:**
- Automated ML pipeline
- Performance monitoring
- Continuous model improvement

---

## Conclusion

This architecture provides a **scalable, cost-effective, and maintainable** system for AI-powered property investment analysis. The key design decisions prioritize:

1. **Separation of Concerns:** Independent components for analysis, ranking, thesis generation, and personalization
2. **Hybrid Approach:** Pre-computed batch scores + real-time personalization
3. **Cost Optimization:** Tiered LLM usage and aggressive caching
4. **Cold Start Mitigation:** Rule-based baseline before sufficient user feedback
5. **Continuous Learning:** Automated feedback loop for model improvement

**Next Steps:**
1. Review this architecture with stakeholders
2. Prioritize features for MVP
3. Begin implementation with Sprint 1
4. Iterate based on user feedback and performance metrics

**Success Metrics:**
- NDCG@10 > 0.85 (ranking quality)
- User satisfaction > 4.0/5.0
- API latency P95 < 300ms
- LLM costs < $300/month (10K properties)
- Personalization lift > 1.2x

---

**Document Maintained By:** AI/ML Team
**Last Updated:** 2025-11-06
**Status:** Draft for Review
