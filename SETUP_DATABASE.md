# Database Setup Instructions

## Create Tables in Supabase

Follow these steps to create the database tables:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/your_supabase_project_ref_here/sql

2. Click "New Query"

3. Copy and paste the entire contents of `supabase-schema.sql` into the editor

4. Click "Run" to execute the SQL

5. You should see a success message indicating the table was created

### Option 2: Verify Table Creation

After running the SQL, you can verify the table was created by running:

```sql
SELECT * FROM property_searches LIMIT 1;
```

### What Gets Created

The script creates:
- `property_searches` table with columns for storing property search data
- Indexes for faster queries on address, user_id, and timestamp
- Row Level Security (RLS) policies
- Automatic timestamp update trigger

### Test the Integration

Once the table is created, restart your server:

```bash
npm start
```

Then search for a property. The data will automatically be saved to Supabase!

## Check Your Data

View your saved searches:
- Dashboard: https://supabase.com/dashboard/project/your_supabase_project_ref_here/editor
- Or use the API: http://localhost:3000/api/property/history
