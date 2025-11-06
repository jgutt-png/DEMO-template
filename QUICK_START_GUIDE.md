# LoopNet Migration Quick Start Guide

## TL;DR - Fast Track

```bash
# 1. Test on 100 records (dry-run, no changes)
node scripts/smart-loopnet-migration.js --limit 100 --dry-run --verbose

# 2. If test looks good, run full migration
node scripts/smart-loopnet-migration.js --batch-size 500 --verbose

# 3. Validate results
node scripts/validate-migration.js
```

**Expected Time**: 35-45 minutes for full migration of 31,431 records

---

## What This Migration Does

**Problem**: All your LoopNet data is locked in `full_response` JSONB column. Columns like `title`, `address`, `price` are empty.

**Solution**: Extract data from `full_response` and populate structured columns for better querying and performance.

**Result**: 90%+ of records will have searchable, indexed data in proper columns.

---

## Pre-Flight Checklist

- [ ] You have Node.js installed
- [ ] You have access to Supabase database
- [ ] You've reviewed the sample output below
- [ ] **IMPORTANT**: You've backed up your database (optional but recommended)

---

## Step-by-Step Migration

### Step 1: Test Migration (RECOMMENDED)

Run a test on 100 records without modifying the database:

```bash
node scripts/smart-loopnet-migration.js --limit 100 --dry-run --verbose
```

**Expected Output**:
```
🚀 Smart LoopNet Data Migration
⚠️  DRY RUN MODE - No data will be updated
📊 Total records to process: 100
⏰ Started at: 11/6/2025, 9:18:39 AM

✅ Migration Complete!
📊 Final Statistics:
   Total Processed: 100
   Successfully Updated: 100
   Success Rate: 100.0%

📈 Field Extraction Rates:
   ✓ title                90.0%
   ✓ property_type        90.0%
   ✓ broker_name          90.0%
   ⚠️ price                70.0%
```

**What to Look For**:
- ✅ Title should be 80%+
- ✅ Property type should be 80%+
- ✅ Broker name should be 80%+
- ⚠️ Price around 70% is normal (lease listings don't have price)

### Step 2: Run Full Migration

If test looks good, run the full migration:

```bash
node scripts/smart-loopnet-migration.js --batch-size 500 --verbose
```

**What Happens**:
- Processes all 31,431 records
- Updates columns in batches of 500
- Shows progress every 100 records
- Saves detailed log to `scripts/logs/`
- Takes approximately 35-45 minutes

**You'll See**:
```
⏳ Progress: 5000/31431 (15.9%)
   Updated: 4985 | Skipped: 5 | Errors: 10
   Rate: 15.2 records/sec | ETA: 28m 45s
```

**Safe to Cancel**: Press Ctrl+C to stop. Already processed records are saved. You can resume with `--offset`.

### Step 3: Validate Results

After migration completes, check the results:

```bash
node scripts/validate-migration.js
```

**Expected Output**:
```
🔍 Migration Validation Report

📊 Overall Statistics:
   Total Records: 31,431
   Records with API Data: 31,431

📋 Column Fill Rates:
✓ title                     90.5%
✓ property_type            92.1%
✓ street_address           88.3%
✓ city                     82.7%
✓ broker_name              91.4%
⚠️ price                    71.2%

⭐ Data Quality Scores:
   Overall Quality: 87.2%
   Quality Grade: B (Good)
```

---

## Command Line Options

### smart-loopnet-migration.js

| Option | Description | Example |
|--------|-------------|---------|
| `--limit <n>` | Process only N records | `--limit 1000` |
| `--offset <n>` | Start from record N | `--offset 5000` |
| `--batch-size <n>` | Records per batch (default: 500) | `--batch-size 1000` |
| `--dry-run` | Test without updating | `--dry-run` |
| `--verbose` | Show detailed progress | `--verbose` |
| `--help` | Show help message | `--help` |

### Common Scenarios

```bash
# Test on small sample first
node scripts/smart-loopnet-migration.js --limit 100 --dry-run

# Process first 10,000 records
node scripts/smart-loopnet-migration.js --limit 10000

# Resume from record 10,000
node scripts/smart-loopnet-migration.js --offset 10000

# Fast batch processing (less logging)
node scripts/smart-loopnet-migration.js --batch-size 1000
```

---

## Troubleshooting

### Migration is slow

**Solution**: Increase batch size
```bash
node scripts/smart-loopnet-migration.js --batch-size 1000
```

### Want to inspect a specific record

**Solution**: Use debug script
```bash
node scripts/debug-record.js <listing_id>
```

Example:
```bash
node scripts/debug-record.js 10794955
```

### Migration stopped/crashed

**Solution**: Resume from where it left off
```bash
# If it stopped at 15,000 records
node scripts/smart-loopnet-migration.js --offset 15000
```

### Low extraction rates

**Check**: Review the validation output to see which fields are low
```bash
node scripts/validate-migration.js
```

**Then**: Check the field mapping documentation
```bash
cat LOOPNET_FIELD_MAPPING.md
```

---

## What Gets Updated

### Before Migration
```sql
SELECT listing_id, title, property_type, price, broker_name
FROM property_details
LIMIT 1;
```
```
listing_id | title | property_type | price | broker_name
-----------|-------|---------------|-------|------------
10794955   | NULL  | NULL          | NULL  | NULL
```

### After Migration
```sql
SELECT listing_id, title, property_type, price, broker_name
FROM property_details
LIMIT 1;
```
```
listing_id | title                 | property_type | price  | broker_name
-----------|----------------------|---------------|--------|-------------
10794955   | Topeka Blvd - 711 SW | Land          | $95K   | Mark Rezac
```

---

## After Migration

### Recommended: Add Indexes

Speed up queries with indexes on commonly searched fields:

```sql
CREATE INDEX IF NOT EXISTS idx_property_type
    ON property_details(property_type);

CREATE INDEX IF NOT EXISTS idx_city
    ON property_details(city);

CREATE INDEX IF NOT EXISTS idx_state_code
    ON property_details(state_code);

CREATE INDEX IF NOT EXISTS idx_price
    ON property_details(price)
    WHERE price IS NOT NULL;
```

### Example Queries You Can Now Run

```sql
-- Find all office buildings in California
SELECT title, street_address, city, price
FROM property_details
WHERE property_type = 'Office'
  AND state_code = 'CA'
  AND price IS NOT NULL;

-- Properties in a specific city
SELECT title, property_type, price, broker_name
FROM property_details
WHERE city = 'San Francisco'
ORDER BY price DESC;

-- Count by property type
SELECT property_type, COUNT(*) as count
FROM property_details
WHERE property_type IS NOT NULL
GROUP BY property_type
ORDER BY count DESC;
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `LOOPNET_FIELD_MAPPING.md` | Complete field mapping documentation |
| `LOOPNET_MIGRATION_REPORT.md` | Comprehensive analysis report |
| `scripts/smart-loopnet-migration.js` | Main migration script |
| `scripts/validate-migration.js` | Validation script |
| `scripts/debug-record.js` | Debug individual records |
| `scripts/logs/migration-log-*.json` | Migration execution logs |

---

## Support

### Detailed Documentation
- Field mappings: `LOOPNET_FIELD_MAPPING.md`
- Full analysis: `LOOPNET_MIGRATION_REPORT.md`

### Debug a Record
```bash
node scripts/debug-record.js <listing_id>
```

### Check Migration Logs
```bash
ls -lt scripts/logs/
cat scripts/logs/migration-log-<timestamp>.json
```

---

## Safety Notes

1. **Dry-run is your friend**: Always test with `--dry-run` first
2. **Incremental approach**: Start with `--limit 1000`, then full run
3. **Resume capability**: Can resume with `--offset` if interrupted
4. **Logs are saved**: Every run creates a detailed log file
5. **Non-destructive**: Only updates empty columns, doesn't delete data

---

## Success Criteria

Your migration is successful if:
- ✅ Validation shows 80%+ fill rates for critical fields
- ✅ No more than 1% errors
- ✅ Completes in under 60 minutes
- ✅ Sample records look correct when inspected manually

---

## Quick Commands Reference

```bash
# Test
node scripts/smart-loopnet-migration.js --limit 100 --dry-run --verbose

# Run
node scripts/smart-loopnet-migration.js --batch-size 500 --verbose

# Validate
node scripts/validate-migration.js

# Debug
node scripts/debug-record.js <listing_id>

# Resume
node scripts/smart-loopnet-migration.js --offset <number>
```

---

**Ready to Start?** Run the test command above and you'll be migrating in minutes!
