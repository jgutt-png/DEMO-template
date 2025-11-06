# Product Requirements Document: AI Property Investment Ranking Platform

**Version:** 1.0
**Date:** November 6, 2025
**Status:** Pre-Development

---

## 1. Problem Statement

Commercial real estate investors waste 10-15 hours per week manually analyzing properties, comparing cap rates, and evaluating investment potential across multiple listings. Current tools provide raw data but no actionable investment guidance, forcing investors to build complex spreadsheets and rely on gut instinct. We need an AI-powered platform that automatically ranks properties by investment potential, generates clear investment theses, and learns from user feedback to provide personalized recommendations.

---

## 2. Core Features

1. **AI Investment Scoring** - Machine learning model analyzes 50+ property features (cap rate, price/sqft, market trends, location metrics) to generate 0-100 investment scores, with global ranking across all properties

2. **Automated Investment Theses** - LLM-generated analysis for each property with strengths, risks, financial projections, and clear buy/pass recommendations, tiered by property score (GPT-4 for top properties, templates for lower-tier)

3. **Smart Rankings Dashboard** - Sortable list view with filters for property type, location, score range, and investment criteria; displays key metrics at-a-glance with map integration

4. **User Feedback Loop** - 5-star rating system with comments for each property; system learns user preferences and continuously improves ML model based on collective feedback

5. **Personalized Recommendations** - After 3+ ratings, platform adapts to individual user preferences (risk tolerance, property types, geographic focus) using collaborative filtering

6. **Property Comparison Tool** - Side-by-side comparison of multiple properties with normalized metrics, relative rankings, and differential analysis

7. **Batch Processing Pipeline** - Nightly job that recalculates features, scores all properties, generates theses, and retrains model weekly when feedback threshold is met

---

## 3. User Personas

### Primary: Active Commercial Investor "Sarah"
- **Profile:** 35-45 years old, owns 5-10 commercial properties, evaluates 20-30 new opportunities monthly
- **Pain Points:** Limited time for analysis, difficulty comparing properties objectively, unsure which deals deserve deeper diligence
- **Goals:** Quickly identify top 3-5 properties worth detailed review, avoid bad deals, optimize portfolio ROI
- **Technical Comfort:** Medium - uses Excel, comfortable with dashboards and metrics
- **Success Metric:** Reduces screening time from 15 hours/week to 2 hours/week

### Secondary: Real Estate Analyst "Marcus"
- **Profile:** 28-35 years old, works for investment firm, analyzes 50+ properties weekly for portfolio managers
- **Pain Points:** Manual data aggregation, subjective ranking methods, inconsistent analysis quality
- **Goals:** Standardize analysis process, defend recommendations with data, scale coverage without hiring
- **Technical Comfort:** High - comfortable with data tools, APIs, and automation
- **Success Metric:** Increases property coverage by 3x while maintaining analysis quality

### Tertiary: New Investor "Jennifer"
- **Profile:** 30-40 years old, looking to make first commercial property investment, lacks experience
- **Pain Points:** Doesn't know what makes a good deal, overwhelmed by data, fears making costly mistakes
- **Goals:** Education through clear explanations, confidence in first purchase, avoid beginner traps
- **Technical Comfort:** Low-medium - uses consumer apps, needs simple interfaces
- **Success Metric:** Makes first informed investment decision within 30 days of using platform

---

## 4. Success Metrics

### Product Adoption (North Star)
- **Primary:** 10+ user ratings per property (measures engagement depth)
- **Secondary:** 60% week-4 retention rate (measures product-market fit)

### ML Performance
- **NDCG@10:** >0.85 (measures ranking quality - users find best properties in top 10)
- **Average User Rating:** >4.0/5.0 stars (measures user agreement with AI scores)
- **Feedback Rate:** >10% (users rate at least 10% of viewed properties)

### Business Impact
- **Time Saved:** Users report 75%+ reduction in property screening time (measured via survey)
- **Investment Confidence:** 80%+ of users report increased confidence in decisions (measured quarterly)
- **Portfolio Performance:** Track user-rated properties' actual ROI performance vs. AI prediction (6-month lag)

### System Performance
- **API Latency:** P95 <200ms for rankings endpoint, <100ms for property details
- **Cache Hit Rate:** >60% (reduces database load and improves speed)
- **Batch Processing:** Complete nightly pipeline in <45 minutes for 10,000 properties

### Cost Efficiency
- **LLM Cost:** <$0.01 per property per month (target: $60 total for 10K properties)
- **Total Operating Cost:** <$350/month at 10K property scale
- **Cost per Active User:** <$10/month (sustainable unit economics)

---

## 5. MVP Scope (Weeks 1-4)

### Must-Have Features
1. **Database Schema** - 7 new tables: property_features, investment_rankings, investment_theses, user_feedback, user_preferences, ml_model_versions, feedback_processing_queue
2. **Feature Engineering** - Calculate 30 core features per property (financial, market, location)
3. **Baseline Ranking Model** - Rule-based scoring system using domain expert weights (no ML training yet)
4. **Rankings API** - GET /api/investment/rankings with filters for property type, score range, location
5. **Property Detail API** - GET /api/investment/property/:id returns full analysis with thesis
6. **Template-Based Theses** - Structured text generation using property features (no LLM costs)
7. **Feedback Collection** - POST /api/investment/feedback endpoint with 5-star rating and optional comment
8. **Basic Frontend** - Rankings table with sort/filter, property detail modal, rating widget

### Out of Scope for MVP
- ML model training (use rule-based baseline)
- LLM-generated theses (use templates)
- Personalization (show global rankings to all users)
- Property comparison tool
- User authentication (implement simple session-based tracking)
- Mobile app (web-only)

### MVP Success Criteria
- All 10,000 existing properties have investment scores
- Rankings API responds in <200ms P95
- 5+ test users complete 20+ ratings each (100+ total feedback records)
- Template theses cover all property types
- Zero downtime during nightly batch processing

---

## 6. V1 Features (Weeks 5-8)

### V1.0 Additions
1. **ML Model Training** - Train LightGBM model on collected feedback data (requires 100+ ratings)
2. **Tiered LLM Generation** - Tier 1 (top 10%): GPT-4 analysis, Tier 2 (40%): GPT-3.5, Tier 3 (50%): templates
3. **Basic Personalization** - After 3+ user ratings, adjust rankings based on learned preferences
4. **Collaborative Filtering** - "Users like you also liked..." recommendations
5. **Model Retraining Pipeline** - Weekly automatic retraining when feedback threshold met
6. **Caching Layer** - Redis cache for rankings (5-min TTL) and property details (1-hour TTL)
7. **User Preferences Dashboard** - Show user what system learned about their preferences
8. **Property Comparison** - Compare up to 4 properties side-by-side

### V1.0 Success Criteria
- NDCG@10 >0.85 (ML model outperforms baseline)
- LLM costs <$60/month for 10K properties
- Personalization increases user satisfaction by 20%+ (measured via rating uplift)
- Cache hit rate >60%
- 30+ active users with 50+ ratings each

---

## 7. V2 Features (Months 3-6)

### V2.0 Additions
1. **Advanced Personalization** - Risk tolerance profiling, preferred geographic markets, investment timeline matching
2. **A/B Testing Framework** - Test different model versions, thesis formats, ranking algorithms
3. **Portfolio Tracking** - Users mark owned/interested properties, track portfolio-level metrics
4. **Market Intelligence** - Aggregate insights from user behavior (which markets getting most attention)
5. **Alerts & Notifications** - Email/SMS when new high-scoring properties match user preferences
6. **API for Third-Party Integration** - Allow other platforms to consume investment scores
7. **Advanced Analytics Dashboard** - User activity metrics, model performance tracking, cost monitoring
8. **Mobile-Responsive Design** - Optimize for tablet/mobile viewing

### V2.0 Success Criteria
- System scales to 100,000+ properties with <300ms P95 latency
- Personalization lift >1.3x (personalized rankings 30% better than global)
- User retention week-4 >40%
- API integration with 1+ external platform
- 200+ active users

---

## 8. Key Risks & Mitigation

### Technical Risks

**Risk:** ML model overfits to small initial user base (10-20 early users)
**Mitigation:** Maintain rule-based baseline as fallback, require 100+ ratings before switching to ML, use regularization and cross-validation, monitor NDCG on holdout set

**Risk:** LLM costs spiral if usage exceeds projections
**Mitigation:** Implement strict tiered generation (only top 10% get GPT-4), cache aggressively (40%+ hit rate), set hard monthly spending caps with alerts, template fallback if budget exceeded

**Risk:** Nightly batch processing fails or takes too long as property count grows
**Mitigation:** Implement incremental processing (only changed properties), parallelize feature calculation, set 45-min timeout with alerts, pre-calculate rankings for common filter combinations

**Risk:** Data quality issues (missing fields, incorrect values) break feature engineering
**Mitigation:** Add data validation layer, handle missing values with imputation strategies, log data quality metrics per property, manual review of bottom-ranked properties

### Product Risks

**Risk:** Users disagree with AI rankings and lose trust in system
**Mitigation:** Show feature importance/explanation for each score, allow users to adjust feature weights, collect feedback on "surprising" scores, A/B test different scoring algorithms

**Risk:** Cold start problem - new users see irrelevant global rankings
**Mitigation:** Add onboarding questionnaire (property types, budget, location preferences), show most-viewed properties initially, switch to personalization after just 3 ratings

**Risk:** Investment theses are generic/unhelpful and users ignore them
**Mitigation:** A/B test thesis formats, include specific numbers/projections, highlight unique property features, collect thumbs up/down on thesis quality

**Risk:** Low engagement - users don't provide feedback ratings
**Mitigation:** Gamification (badges for 10/50/100 ratings), show impact of feedback ("helped improve 147 recommendations"), require rating to unlock comparison tool

### Business Risks

**Risk:** Competitors (Zillow, CoStar) launch similar AI features
**Mitigation:** Move fast to build feedback moat (more ratings = better model), focus on commercial properties where competitors weaker, emphasize personalization as differentiator

**Risk:** Legal liability if users make bad investments based on AI recommendations
**Mitigation:** Clear disclaimers ("educational purposes only, not financial advice"), terms of service with liability waiver, encourage users to conduct own due diligence

**Risk:** Unit economics don't work (LLM/API costs too high per user)
**Mitigation:** Aggressive caching, freemium model (limit free users to top 100 properties), B2B pricing for high-volume users, self-serve exit if costs exceed $500/month

---

## 9. Open Questions

### Product Questions
1. **Pricing Model:** Should this be B2C subscription ($49-99/month), B2B enterprise licensing, or usage-based API pricing? Need user interviews to validate willingness to pay.

2. **Property Source:** Will we scrape LoopNet/CoStar listings, integrate via API, or require users to import properties? API preferred but costs unclear.

3. **Investment Thesis Depth:** Do users want 2-3 sentence summaries or 500-word detailed analyses? May vary by user type - need A/B testing.

4. **Feedback Incentives:** What motivates users to rate properties? Monetary rewards, unlocked features, community leaderboard? Test multiple approaches.

5. **Mobile Priority:** 30% of traffic is mobile - should we build responsive web or native app? Start web-responsive, monitor mobile usage patterns.

### Technical Questions
1. **Model Retraining Frequency:** Weekly retraining too slow? Too fast? Monitor model drift rate and user feedback velocity to optimize.

2. **Feature Selection:** Which of the 50+ features actually matter? Run feature importance analysis after collecting 500+ ratings.

3. **Collaborative Filtering Approach:** User-based or item-based CF? Matrix factorization or neural CF? Start simple (user-based) and evolve.

4. **Caching Strategy:** Cache at application layer (Redis) or database layer (materialized views)? Test both for latency/cost tradeoffs.

5. **Scalability Threshold:** At what property count do we need to switch from single database to distributed system? 100K? 500K? Plan architecture migration.

### Data Questions
1. **Historical Performance Data:** Can we access actual ROI data for properties to validate our predictions? Partner with property management platforms?

2. **Market Data Freshness:** How often do we refresh external data (comparable sales, market trends)? Daily? Weekly? Balance freshness vs. API costs.

3. **User Privacy:** How do we anonymize user feedback while maintaining personalization quality? Hash user IDs? Aggregate preferences?

---

## 10. Technical Dependencies

### Critical Path Dependencies
1. **Supabase Database** - Need Pro plan ($25/month) for row-level security and 8GB storage
2. **OpenAI API Access** - GPT-4 Turbo and GPT-3.5 API keys, $50 initial budget
3. **Redis Instance** - Upstash free tier (10K requests/day) sufficient for MVP
4. **Property Data API** - LoopNet API via RapidAPI ($50-100/month) for commercial listings
5. **ATTOM Data API** - Property valuation and market data ($50-100/month)

### Nice-to-Have Dependencies
- Monitoring: Sentry (free tier), Datadog (skip for MVP)
- Queue: BullMQ (add in V1 for async processing)
- ML Serving: ONNX Runtime (add in V1 for faster inference)

---

## 11. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Set up database schema (7 tables)
- Implement feature engineering service (30 core features)
- Build baseline rule-based ranking algorithm
- Create basic REST API (rankings, property detail, feedback)
- **Milestone:** All properties have scores, API returns rankings <200ms

### Phase 2: ML Model (Weeks 3-4)
- Collect 100+ feedback ratings via test users
- Train initial LightGBM model in Python
- Deploy model scoring in batch pipeline
- Integrate ML scores into API (with rule-based fallback)
- **Milestone:** ML model achieves NDCG@10 >0.75 on holdout set

### Phase 3: Intelligence (Weeks 5-6)
- Implement tiered LLM generation (GPT-4/3.5/template)
- Add thesis caching with feature-based keys
- Build basic personalization (prefer user-rated property types)
- Create user preferences API endpoint
- **Milestone:** LLM costs <$60/month, users see personalized rankings

### Phase 4: Optimization (Weeks 7-8)
- Deploy Redis caching layer
- Implement weekly model retraining pipeline
- Add collaborative filtering recommendations
- Build property comparison tool
- **Milestone:** Cache hit rate >60%, P95 latency <200ms

### Phase 5: Scale (Weeks 9-12)
- A/B testing framework for models and features
- Advanced personalization (risk profiles, market preferences)
- Analytics dashboard for monitoring
- Performance optimization for 100K+ properties
- **Milestone:** System stable at 100+ active users, 100K properties

---

## 12. User Stories (Core)

**US-001: View Ranked Properties**
As an active investor, I want to see all properties ranked by investment score so that I can quickly identify the most promising opportunities.
**Acceptance Criteria:**
- Given I load the rankings page, when the API returns results, then I see properties sorted by investment score (high to low)
- Given I apply filters (property type, location, score range), when I submit, then results update in <200ms
- Given I hover over a score, when tooltip appears, then I see score breakdown (financial, market, location sub-scores)

**US-002: View Investment Thesis**
As an active investor, I want to read a clear investment thesis for each property so that I understand why it's ranked high or low.
**Acceptance Criteria:**
- Given I click a property, when detail modal opens, then I see thesis with sections: Summary, Strengths, Risks, Recommendation
- Given property is top 10%, when thesis loads, then it's GPT-4 generated with specific financial projections
- Given property is bottom 50%, when thesis loads, then it's template-based (loads instantly)

**US-003: Provide Feedback**
As an active investor, I want to rate properties I've reviewed so that the system learns my preferences and improves recommendations.
**Acceptance Criteria:**
- Given I view a property, when I click rating widget, then I can select 1-5 stars and optionally add comment
- Given I submit rating, when API confirms, then I see "Thank you" message and rating count increments
- Given I have rated 3+ properties, when I reload rankings, then I see "Personalized for you" indicator

**US-004: Compare Properties**
As a real estate analyst, I want to compare multiple properties side-by-side so that I can make objective recommendations.
**Acceptance Criteria:**
- Given I select 2-4 properties, when I click "Compare", then I see side-by-side table with normalized metrics
- Given I compare properties, when viewing scores, then I see which property wins on each dimension (color-coded)
- Given I finish comparison, when I click export, then I download CSV with all comparison data

**US-005: Receive Personalized Recommendations**
As an active investor, I want recommendations based on my past ratings so that I discover properties matching my investment criteria.
**Acceptance Criteria:**
- Given I have 3+ ratings, when I visit recommendations page, then I see properties personalized to my preferences
- Given I view recommendations, when I hover "Why recommended?", then I see explanation based on my rating history
- Given no recommendations available, when page loads, then I see most-viewed properties by users like me

---

## 13. Non-Functional Requirements

### Performance
- API response time: P95 <200ms for rankings, <100ms for property details, <50ms for feedback submission
- Batch processing: Complete nightly pipeline in <45 minutes for 10K properties, <4 hours for 100K
- Page load time: First Contentful Paint <1.5s, Time to Interactive <3s

### Scalability
- Support 10K properties (MVP), 100K properties (V1), 1M+ properties (V2)
- Handle 100 concurrent users (MVP), 1,000 concurrent users (V1)
- Graceful degradation: serve cached results if batch processing fails

### Reliability
- Uptime: 99.5% (3.6 hours downtime/month acceptable for MVP)
- Data durability: Zero data loss for user feedback (use database transactions)
- Error handling: Graceful fallbacks (rule-based if ML fails, template if LLM fails)

### Security
- Authentication: Session-based for MVP, JWT for V1
- Authorization: Row-level security in Supabase (users only see own feedback)
- Input validation: Sanitize all user inputs (feedback comments), SQL injection prevention
- Rate limiting: 100 API requests per hour per IP (prevent abuse)
- Data privacy: Hash user IDs, GDPR compliance (right to deletion)

### Maintainability
- Code coverage: >70% for critical paths (feature engineering, scoring, API)
- Documentation: API docs (OpenAPI spec), architecture diagrams, runbooks
- Monitoring: Error tracking (Sentry), performance monitoring (basic Datadog alternative)
- Logging: Structured logs for debugging (batch processing, model scoring)

---

## 14. Success Criteria Summary

### MVP Launch (End of Week 4)
- 100+ user feedback ratings collected
- All properties have investment scores and theses
- Rankings API stable with <200ms P95 latency
- 5+ test users actively using platform daily

### V1.0 Launch (End of Week 8)
- ML model achieving NDCG@10 >0.85
- User satisfaction >4.0/5.0 average rating
- Personalization active for users with 3+ ratings
- LLM costs optimized to <$60/month
- 30+ active users, 60% week-4 retention

### V2.0 Launch (Month 6)
- System scales to 100K+ properties
- 200+ active users, 40% week-4 retention
- Personalization lift >1.3x vs. global rankings
- A/B testing framework operational
- Monitoring dashboard deployed

---

**Document Owner:** Product Manager
**Engineering Lead:** TBD
**Design Lead:** TBD
**Stakeholders:** Investors (beta testers), Data Science team, Engineering team

**Next Steps:**
1. Technical feasibility review with engineering (Week 1)
2. User interviews with 5 commercial investors (Week 1)
3. Data source validation (LoopNet API access, ATTOM Data pricing) (Week 1)
4. Database schema approval and implementation (Week 1-2)
5. Feature engineering prototype (Week 2)
