-- =====================================================================
-- MAP OPTIMIZATION MIGRATION
-- =====================================================================
-- Purpose: Add indexes and materialized views for map-based queries
-- Run this migration before deploying map API endpoints
-- Estimated time: 2-5 minutes on 24,000 properties
-- =====================================================================

-- =====================================================================
-- STEP 1: Fix missing state_code in property_listings
-- =====================================================================

-- Copy state_code from property_details to property_listings
-- This enables efficient state-based filtering
UPDATE property_listings pl
SET state_code = pd.state_code
FROM property_details pd
WHERE pl.listing_id = pd.listing_id
  AND pl.state_id = pd.state_id
  AND pl.state_code IS NULL
  AND pd.state_code IS NOT NULL;

-- Verify update
-- Expected: Most NULL state_codes should now be populated
-- SELECT COUNT(*) FROM property_listings WHERE state_code IS NULL;

-- =====================================================================
-- STEP 2: Create composite indexes for geospatial queries
-- =====================================================================

-- Index for bounding box queries (CRITICAL for map performance)
-- This is the most important index - covers 90% of map queries
CREATE INDEX IF NOT EXISTS idx_listings_lat_lng_active
ON property_listings(latitude, longitude, active_inactive)
WHERE active_inactive = true
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- Index for state-based queries
CREATE INDEX IF NOT EXISTS idx_listings_state_code
ON property_listings(state_code)
WHERE state_code IS NOT NULL
  AND active_inactive = true;

-- Index for city filtering (often used with map)
CREATE INDEX IF NOT EXISTS idx_details_city_type
ON property_details(city, property_type)
WHERE title IS NOT NULL;

-- Index to optimize joins between property_listings and property_details
CREATE INDEX IF NOT EXISTS idx_details_listing_state_composite
ON property_details(listing_id, state_id);

-- Index for state aggregations
CREATE INDEX IF NOT EXISTS idx_details_state_code
ON property_details(state_code)
WHERE state_code IS NOT NULL
  AND title IS NOT NULL;

-- =====================================================================
-- STEP 3: Create materialized view for state statistics
-- =====================================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS state_statistics;

-- Create materialized view for fast state-level aggregations
-- This pre-computes state boundaries and counts
CREATE MATERIALIZED VIEW state_statistics AS
SELECT
    pd.state_code,
    COUNT(*) as property_count,
    AVG(pl.latitude)::numeric(10, 6) as center_lat,
    AVG(pl.longitude)::numeric(11, 6) as center_lng,
    MAX(pl.latitude)::numeric(10, 6) as north_bound,
    MIN(pl.latitude)::numeric(10, 6) as south_bound,
    MAX(pl.longitude)::numeric(11, 6) as east_bound,
    MIN(pl.longitude)::numeric(11, 6) as west_bound,
    COUNT(DISTINCT pd.city) as cities_count,
    COUNT(DISTINCT pd.property_type) as property_types_count,
    NOW() as last_updated
FROM property_listings pl
JOIN property_details pd
    ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    pl.active_inactive = true
    AND pd.title IS NOT NULL
    AND pl.latitude IS NOT NULL
    AND pl.longitude IS NOT NULL
    AND pd.state_code IS NOT NULL
GROUP BY pd.state_code;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_state_stats_state_code
ON state_statistics(state_code);

-- Grant access to view
-- COMMENT: Adjust role name if different from 'authenticated'
GRANT SELECT ON state_statistics TO authenticated;
GRANT SELECT ON state_statistics TO anon;

-- =====================================================================
-- STEP 4: Create function to refresh state statistics
-- =====================================================================

-- Function to refresh the materialized view
-- Call this daily or when bulk property updates occur
CREATE OR REPLACE FUNCTION refresh_state_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY state_statistics;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_state_statistics() TO authenticated;

-- =====================================================================
-- STEP 5: Add helpful database comments
-- =====================================================================

COMMENT ON INDEX idx_listings_lat_lng_active IS
'Composite index for bounding box queries. Critical for map performance.';

COMMENT ON MATERIALIZED VIEW state_statistics IS
'Pre-computed state-level statistics and boundaries. Refresh daily or after bulk updates.';

COMMENT ON FUNCTION refresh_state_statistics() IS
'Refreshes state statistics materialized view. Run daily via cron or after bulk property updates.';

-- =====================================================================
-- STEP 6: Create helper view for map queries (optional)
-- =====================================================================

-- This view simplifies common map queries
CREATE OR REPLACE VIEW map_properties AS
SELECT
    pl.listing_id,
    pl.state_id,
    pl.latitude,
    pl.longitude,
    pl.state_code as listing_state_code,
    pl.active_inactive,
    pd.title,
    pd.city,
    pd.state_code,
    pd.property_type,
    pd.price,
    pd.building_size,
    pd.lot_size,
    pd.primary_image_url,
    pd.last_updated
FROM property_listings pl
JOIN property_details pd
    ON pl.listing_id = pd.listing_id
    AND pl.state_id = pd.state_id
WHERE
    pl.active_inactive = true
    AND pd.title IS NOT NULL
    AND pl.latitude IS NOT NULL
    AND pl.longitude IS NOT NULL;

COMMENT ON VIEW map_properties IS
'Simplified view for map queries. Pre-joins property_listings and property_details.';

GRANT SELECT ON map_properties TO authenticated;
GRANT SELECT ON map_properties TO anon;

-- =====================================================================
-- STEP 7: Analyze tables for query planner
-- =====================================================================

-- Update statistics for query planner
ANALYZE property_listings;
ANALYZE property_details;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Run these queries to verify the migration succeeded:

-- 1. Check index sizes (should be reasonable, not exceeding table size)
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE tablename IN ('property_listings', 'property_details')
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- 2. Verify state_code population
-- SELECT
--     COUNT(*) as total,
--     COUNT(state_code) as with_state_code,
--     COUNT(*) - COUNT(state_code) as missing_state_code
-- FROM property_listings;

-- 3. Check materialized view data
-- SELECT
--     state_code,
--     property_count,
--     center_lat,
--     center_lng,
--     cities_count
-- FROM state_statistics
-- ORDER BY property_count DESC
-- LIMIT 10;

-- 4. Test a bounding box query (should use idx_listings_lat_lng_active)
-- EXPLAIN ANALYZE
-- SELECT pl.listing_id, pl.latitude, pl.longitude, pd.title
-- FROM property_listings pl
-- JOIN property_details pd ON pl.listing_id = pd.listing_id AND pl.state_id = pd.state_id
-- WHERE pl.latitude BETWEEN 40.5 AND 41.0
--   AND pl.longitude BETWEEN -74.5 AND -73.5
--   AND pl.active_inactive = true
--   AND pd.title IS NOT NULL
-- LIMIT 100;
-- Expected: "Index Scan using idx_listings_lat_lng_active"

-- =====================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================================

-- If you need to rollback this migration:

-- DROP MATERIALIZED VIEW IF EXISTS state_statistics CASCADE;
-- DROP VIEW IF EXISTS map_properties;
-- DROP FUNCTION IF EXISTS refresh_state_statistics();
-- DROP INDEX IF EXISTS idx_listings_lat_lng_active;
-- DROP INDEX IF EXISTS idx_listings_state_code;
-- DROP INDEX IF EXISTS idx_details_city_type;
-- DROP INDEX IF EXISTS idx_details_listing_state_composite;
-- DROP INDEX IF EXISTS idx_details_state_code;

-- =====================================================================
-- POST-MIGRATION MAINTENANCE
-- =====================================================================

-- Schedule these maintenance tasks:

-- 1. Refresh state statistics daily at 2 AM:
--    SELECT cron.schedule('refresh-state-stats', '0 2 * * *', 'SELECT refresh_state_statistics()');

-- 2. Reindex weekly to prevent index bloat:
--    REINDEX INDEX CONCURRENTLY idx_listings_lat_lng_active;

-- 3. Vacuum analyze monthly:
--    VACUUM ANALYZE property_listings;
--    VACUUM ANALYZE property_details;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Map optimization migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Verify indexes with verification queries above';
    RAISE NOTICE '2. Test map API endpoints';
    RAISE NOTICE '3. Schedule daily refresh of state_statistics';
    RAISE NOTICE '4. Monitor query performance in production';
END $$;
