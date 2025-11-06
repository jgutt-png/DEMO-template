# Supabase Integration Guide

## Overview

The Property Dashboard now uses Supabase as its database instead of localStorage. All property searches are automatically saved to the cloud and can be accessed across devices.

## What's Been Integrated

### Backend Changes (server.js)

1. **Automatic Save**: Every property search is now automatically saved to Supabase
2. **New API Endpoints**:
   - `GET /api/property/history` - Get recent searches (default: 10)
   - `GET /api/property/:id` - Get a specific search by ID
   - `GET /api/property/search-history?address=` - Search by address
   - `POST /api/property/save` - Manually save a search

### Frontend Changes (app.js, index.html)

1. **Search History Feature**: View your last 10 searches
2. **Load Previous Searches**: Click on any past search to instantly load its data
3. **Auto-populate Last Search**: The address field is pre-filled with your most recent search

### Database Schema (supabase-schema.sql)

Table: `property_searches`
- `id` - Unique identifier (UUID)
- `address` - Original address searched
- `formatted_address` - Google-validated address
- `latitude` / `longitude` - Property coordinates
- `property_data` - Complete JSON response from all APIs (JSONB)
- `user_id` - User identifier (default: 'DEMO')
- `search_timestamp` - When the search was performed
- `created_at` / `updated_at` - Record timestamps

## Setup Instructions

### Step 1: Create Database Tables

**IMPORTANT**: You must run the SQL schema in Supabase before using the app.

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/your_supabase_project_ref_here/sql

2. Click "New Query"

3. Copy the entire contents of `supabase-schema.sql`

4. Paste into the editor and click "Run"

5. Verify success - you should see: "Success. No rows returned"

### Step 2: Start the Server

```bash
cd property-dashboard
npm start
```

You should see:
```
🚀 Property Dashboard API running on http://localhost:3000
📊 Frontend: http://localhost:3000
💾 Database: Connected to Supabase
```

### Step 3: Test the Integration

1. Open http://localhost:3000
2. Search for a property (e.g., "4706 New Horizons Blvd Appleton, WI 54914")
3. After the search completes, click "View Recent Searches"
4. You should see your search in the history
5. Click on it to reload the data instantly

## New Features

### View Search History

Click the "View Recent Searches" button to see your last 10 property searches. Each entry shows:
- Formatted address
- Date and time of search
- Click any entry to instantly reload that search

### Instant Data Loading

When you click a search from history, the app loads the data from the database instead of calling all the APIs again. This is:
- ⚡ Much faster
- 💰 Saves API credits
- 📡 Works offline (if data is cached)

### Cross-Device Sync

Since data is stored in Supabase, you can access your search history from any device. Just use the same Supabase credentials.

## API Endpoints

### Get Search History
```bash
curl http://localhost:3000/api/property/history?limit=10&user_id=DEMO
```

### Get Specific Search
```bash
curl http://localhost:3000/api/property/{search-id}
```

### Search by Address
```bash
curl "http://localhost:3000/api/property/search-history?address=Appleton&user_id=DEMO"
```

## Database Management

### View Your Data in Supabase

1. Go to Table Editor:
   https://supabase.com/dashboard/project/your_supabase_project_ref_here/editor

2. Select `property_searches` table

3. View, edit, or delete any records

### Query Examples

Get all searches:
```sql
SELECT id, address, formatted_address, search_timestamp
FROM property_searches
ORDER BY search_timestamp DESC;
```

Get searches from today:
```sql
SELECT * FROM property_searches
WHERE search_timestamp::date = CURRENT_DATE;
```

Count total searches:
```sql
SELECT COUNT(*) FROM property_searches;
```

## Configuration Files

- `supabase-config.js` - Supabase client configuration
- `supabase-schema.sql` - Database schema
- `setup-database.js` - Helper script to test connection
- `SETUP_DATABASE.md` - Detailed setup instructions

## Troubleshooting

### "Table does not exist" error

Run the SQL schema in Supabase dashboard (Step 1 above).

### Searches not saving

Check the browser console and server logs for errors. Verify Supabase credentials are correct.

### Can't load history

Make sure the table was created successfully. Test the API endpoint directly:
```bash
curl http://localhost:3000/api/property/history
```

## Benefits of Supabase Integration

✅ **Persistent Storage**: Data survives browser clears and server restarts
✅ **Multi-Device**: Access your searches from anywhere
✅ **Queryable**: Run SQL queries on your data
✅ **Scalable**: Can handle millions of searches
✅ **Real-time**: Potential for live updates (future feature)
✅ **Secure**: Row-level security built-in
✅ **Fast**: Indexed queries return results instantly

## Future Enhancements

- [ ] User authentication (replace 'DEMO' user)
- [ ] Share searches with others
- [ ] Export search history to CSV/Excel
- [ ] Property comparison view
- [ ] Search analytics dashboard
- [ ] Email alerts for saved properties
- [ ] Mobile app integration
