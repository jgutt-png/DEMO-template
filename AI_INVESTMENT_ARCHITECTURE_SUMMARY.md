# AI Investment Platform - Architecture Summary

## Quick Reference Guide

### System Overview (High-Level)

```
Property Data (Supabase)
        ↓
Feature Engineering (Node.js)
        ↓
Investment Ranking (ML Model - LightGBM)
        ↓
Thesis Generation (LLM - GPT-4/3.5/Template)
        ↓
Personalization (User Preferences)
        ↓
API Serving (Express)
        ↓
Frontend (Map + Rankings)
        ↓
User Feedback (Ratings + Comments)
        ↓
[Loop back to Model Training]
```

---

## Key Components

### 1. Data Models (7 New Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `property_features` | ML features (50+ per property) | cap_rate, price_per_sqft, neighborhood_score |
| `investment_rankings` | Scored properties | investment_score, global_rank, model_version |
| `investment_theses` | LLM-generated analysis | thesis_summary, strengths, risks, verdict |
| `user_feedback` | User ratings & comments | rating (1-5), comment, time_spent |
| `user_preferences` | Learned preferences | preferred_types, risk_tolerance, feature_weights |
| `ml_model_versions` | Model tracking | model_path, ndcg, is_active |
| `feedback_processing_queue` | Async job queue | status, processing_type |

---

### 2. ML Pipeline Flow

```
┌─────────────────────────────────────────────────────────┐
│ NIGHTLY BATCH PROCESS                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Feature Engineering (10 min)                       │
│     → Calculate 50+ features for all properties        │
│     → Store in property_features table                 │
│                                                         │
│  2. Model Scoring (5 min)                              │
│     → Load active model                                │
│     → Score all properties (0-100)                     │
│     → Store in investment_rankings table               │
│                                                         │
│  3. Thesis Generation (30 min)                         │
│     → Tier 1 (top 10%): GPT-4 analysis                │
│     → Tier 2 (next 40%): GPT-3.5 analysis             │
│     → Tier 3 (bottom 50%): Template                    │
│     → Store in investment_theses table                 │
│                                                         │
│  4. Model Retraining (Weekly, if feedback > 100)       │
│     → Fetch features + user ratings                    │
│     → Train LightGBM model                             │
│     → Evaluate (NDCG@10 target > 0.85)                 │
│     → Deploy if improved                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 3. API Endpoints

| Endpoint | Method | Purpose | Latency Target |
|----------|--------|---------|----------------|
| `/api/investment/rankings` | GET | Get ranked properties (with filters) | <200ms (P95) |
| `/api/investment/property/:id` | GET | Full investment analysis | <100ms |
| `/api/investment/feedback` | POST | Submit rating/comment | <50ms |
| `/api/investment/recommendations` | GET | Personalized recommendations | <300ms |
| `/api/investment/user/:id/preferences` | GET | User learned preferences | <50ms |
| `/api/investment/compare` | GET | Compare multiple properties | <200ms |

---

### 4. Feature Engineering (50+ Features)

**Financial Features (12):**
- cap_rate, price_per_sqft, noi_estimate, cash_on_cash_return
- equity_multiple_5yr, price_discount_pct, debt_service_coverage

**Market Features (10):**
- days_on_market, comparable_avg_price, market_trend_score
- inventory_level, median_time_to_sale

**Risk Features (8):**
- foreclosure_risk_score, equity_position_pct, mortgage_coverage_ratio
- ltv_ratio, vacancy_risk, tenant_quality_score

**Location Features (12):**
- neighborhood_score, walkability_score, crime_index
- population_growth_5yr, median_income_area, job_growth_rate

**Property Features (8):**
- building_size, lot_size, year_built, condition_score
- property_type_encoded, amenity_score

---

### 5. LLM Cost Optimization

**Tier Strategy:**

| Tier | Score Range | Model | Cost/Property | Volume | Total Cost |
|------|-------------|-------|---------------|--------|------------|
| 1 | 80-100 (Top 10%) | GPT-4 Turbo | $0.02 | 1,000 | $20/month |
| 2 | 50-79 (Next 40%) | GPT-3.5 Turbo | $0.005 | 4,000 | $20/month |
| 3 | 0-49 (Bottom 50%) | Template | $0.00 | 5,000 | $0/month |

**Total: $40/month (80% cost reduction vs all GPT-4)**

**Caching:**
- Cache by feature hash (price tier + cap rate bucket + location)
- Expected hit rate: 40%+
- Additional savings: $15-20/month

---

### 6. Feedback Loop

```
User rates property (1-5 stars)
        ↓
INSERT into user_feedback table
        ↓
Database trigger fires
        ↓
Enqueue 2 jobs:
  1. Update user_preferences (immediate)
  2. Accumulate for model retraining (weekly)
        ↓
Preference Learning Service:
  - Extract type preferences
  - Calculate risk tolerance
  - Learn feature weights
  - Find similar users
        ↓
Store in user_preferences table
        ↓
Next API call: Apply personalization
```

---

### 7. Serving Architecture

**Request Flow:**

```
User Request → API Gateway → Cache Check
                                 ↓
                         [Cache Hit] → Return
                                 ↓
                         [Cache Miss]
                                 ↓
                     Query Database (pre-computed rankings)
                                 ↓
                     Apply Personalization (if user_id)
                                 ↓
                     Write to Cache → Return
```

**Performance:**
- Global rankings: Cached for 5 minutes
- Personalized rankings: Cached for 1 hour per user
- Property details: Cached for 1 hour
- Cache hit rate target: 60-70%

---

### 8. Technology Stack

**Backend:**
- Runtime: Node.js 18+
- Framework: Express.js
- Database: Supabase (PostgreSQL)
- Cache: Redis (Upstash/Railway)
- Queue: BullMQ

**ML/AI:**
- Training: Python (scikit-learn, LightGBM)
- LLM: OpenAI API (GPT-4 Turbo, GPT-3.5)
- Serving: ONNX Runtime or FastAPI

**Infrastructure:**
- Hosting: Railway / Render
- ML Service: Modal / Railway
- Storage: Supabase Storage (models)
- Monitoring: Sentry + Datadog

---

### 9. Cost Estimate (10,000 Properties)

| Service | Monthly Cost |
|---------|-------------|
| Supabase Pro | $25 |
| OpenAI API | $150-300 (optimized to $40-60) |
| Redis Cache | $10-20 |
| Backend Hosting | $20-50 |
| ML Service | $20-40 |
| External APIs | $50-100 |
| Monitoring | $30-50 |
| **TOTAL** | **$200-350/month** |

---

### 10. Scalability Targets

| Scale | Properties | Batch Time | API Latency | Strategy |
|-------|-----------|------------|-------------|----------|
| Current | 10,000 | 3 min | <200ms | Single DB, simple caching |
| Near-term | 100,000 | 30 min | <300ms | DB partitioning, increased caching |
| Future | 1,000,000+ | 2-4 hours | <300ms | Distributed system, Elasticsearch, geo-sharding |

---

### 11. Key Metrics to Monitor

**ML Performance:**
- NDCG@10 (target: >0.85)
- Average user rating (target: >4.0/5.0)
- Feedback rate (target: >10%)
- Personalization lift (target: >1.2x)

**System Performance:**
- API latency P95 (target: <300ms)
- Cache hit rate (target: >60%)
- Error rate (target: <0.5%)

**Cost Metrics:**
- LLM cost per property (target: <$0.01)
- Total monthly cost (target: <$350)
- Cost per user (track trend)

---

### 12. Implementation Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **1. Foundation** | Weeks 1-2 | DB schema, feature engineering, baseline ranking, basic API |
| **2. ML Model** | Weeks 3-4 | Training pipeline, LightGBM model, batch scoring, feedback API |
| **3. Personalization** | Weeks 5-6 | Preference learning, collaborative filtering, recommendations |
| **4. Advanced LLM** | Weeks 7-8 | Tier-based generation, caching, cost optimization |
| **5. Continuous Learning** | Week 9+ | Auto-retraining, A/B testing, monitoring dashboard |

---

### 13. Cold Start Problem Solutions

**New Properties (no feedback):**
- Use baseline rule-based score
- Base on property fundamentals (cap rate, price/sqft, location)
- As feedback arrives, gradually shift to ML score

**New Users (no history):**
- Show global rankings initially
- After 3+ ratings, activate personalization
- Use collaborative filtering from similar users

**New System (no training data):**
- Start with rule-based baseline (domain expert weights)
- Collect seed feedback (manual ratings or user testing)
- Train first ML model after 50+ feedback records
- Continuously improve with more data

---

### 14. Security Checklist

- [ ] Hash user IDs in database
- [ ] Implement rate limiting (100 req/hour per IP)
- [ ] Sanitize all user inputs (feedback comments)
- [ ] Enable row-level security (RLS) in Supabase
- [ ] Rotate API keys monthly
- [ ] Monitor for feedback manipulation
- [ ] GDPR compliance (right to deletion)
- [ ] Encrypt all data in transit (SSL/TLS)

---

### 15. Quick Start Commands

**Deploy Database Schema:**
```bash
# Connect to Supabase and run:
psql $DATABASE_URL < /path/to/supabase-ai-schema.sql
```

**Start Feature Engineering:**
```bash
node services/feature-engineering-service.js --batch --all
```

**Train ML Model:**
```bash
cd ml/training
python train_ranking_model.py
```

**Start API Server:**
```bash
npm start
# Or with auto-reload:
npm run dev
```

**Run Batch Scoring:**
```bash
node services/batch-scoring-service.js
```

---

## Success Criteria

### MVP (End of Week 4)
- ✓ All properties have investment scores
- ✓ Rankings API returns sorted list (<200ms)
- ✓ Investment theses generated for all properties
- ✓ Users can submit feedback
- ✓ NDCG@10 > 0.75 (baseline)

### V1.0 (End of Week 8)
- ✓ ML model achieving NDCG@10 > 0.85
- ✓ User satisfaction > 4.0/5.0
- ✓ Personalization live for users with 3+ ratings
- ✓ LLM costs < $60/month (10K properties)
- ✓ Cache hit rate > 60%
- ✓ API latency P95 < 200ms

### V2.0 (Month 6+)
- ✓ Continuous model retraining (weekly)
- ✓ A/B testing framework operational
- ✓ Monitoring dashboard deployed
- ✓ System scales to 100K+ properties
- ✓ Personalization lift > 1.3x
- ✓ User retention week-4 > 30%

---

## Architecture Diagrams Reference

For detailed diagrams, see main document:
- **System Context Diagram:** Page 7
- **Component Architecture:** Page 9
- **ML Pipeline:** Page 28
- **Feedback Loop:** Page 35
- **Serving Architecture:** Page 42
- **Data Models:** Page 18

---

**For full architecture details, refer to:** `AI_INVESTMENT_ARCHITECTURE.md`
