# Template Setup Guide

This guide will help you set up this property dashboard template with your own API keys and database.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Supabase account (free tier available)
- API keys from the services you want to use

## Step 1: Clone the Repository

```bash
git clone https://github.com/jgutt-png/DEMO-template.git
cd DEMO-template
npm install
```

## Step 2: Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open `.env` and replace the placeholder values with your actual credentials:

```env
# API Keys - Replace with your actual keys
GOOGLE_API_KEY=your_google_api_key_here
ZONEOMICS_API_KEY=your_zoneomics_api_key_here
ATTOM_API_KEY=your_attom_api_key_here
LOOPNET_API_KEY=your_loopnet_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
SUPABASE_PROJECT_REF=your_supabase_project_ref_here
SUPABASE_ACCESS_TOKEN=your_supabase_access_token_here

# Server Configuration
PORT=3000
```

## Step 3: Obtain API Keys

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
4. Create credentials (API key)
5. Copy the API key to your `.env` file

### Zoneomics API
1. Sign up at [Zoneomics](https://www.zoneomics.com/)
2. Navigate to your account settings
3. Generate an API key
4. Copy the API key to your `.env` file

### ATTOM Data API
1. Sign up at [ATTOM Data Solutions](https://api.developer.attomdata.com/)
2. Subscribe to the APIs you need
3. Copy your API key from the dashboard
4. Add it to your `.env` file

### LoopNet API (via RapidAPI)
1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to the LoopNet API
3. Copy your RapidAPI key
4. Add it to your `.env` file

## Step 4: Set Up Supabase Database

### Create a Supabase Project
1. Go to [Supabase](https://app.supabase.com/)
2. Click "New Project"
3. Fill in your project details
4. Wait for the project to be provisioned

### Get Your Supabase Credentials
1. In your Supabase project dashboard, click "Settings" → "API"
2. Copy the following values to your `.env` file:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`
   - **Project Reference ID** (from URL) → `SUPABASE_PROJECT_REF`

### Run Database Schema
1. Go to the SQL Editor in your Supabase dashboard
2. Click "New Query"
3. Copy the contents of `supabase-normalized-schema.sql`
4. Paste and click "Run"

Alternatively, you can run:
```bash
node setup-database.js
```

## Step 5: Start the Application

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
├── public/              # Frontend files
├── backend/             # Backend services
├── scripts/             # Utility scripts
├── migrations/          # Database migrations
├── server.js            # Main server file
├── .env                 # Your environment variables (not in git)
├── .env.example         # Template for environment variables
└── supabase-*.sql       # Database schema files
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, change the `PORT` value in your `.env` file.

### Database Connection Issues
- Verify your `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Ensure you've run the database schema
- Check your Supabase project is active

### API Rate Limits
Most APIs have rate limits on free tiers. If you encounter errors:
- Check your API usage in respective dashboards
- Consider upgrading your API plan
- Implement caching to reduce API calls

## Security Notes

**IMPORTANT:** Never commit your `.env` file to git. It contains sensitive credentials.

- The `.env` file is already in `.gitignore`
- Only share `.env.example` publicly
- Rotate your API keys if they are ever exposed
- Use environment-specific keys for development vs production

## Optional Services

You can run the application without all APIs. The app will gracefully handle missing services:

- **Google Maps**: Required for map display
- **Zoneomics**: Optional - provides zoning data
- **ATTOM**: Optional - provides property valuations
- **LoopNet**: Optional - provides commercial listings

Simply leave the API keys blank for services you don't want to use.

## Need Help?

- Review the main [README.md](README.md) for feature documentation
- Check the [QUICKSTART.md](QUICKSTART.md) for basic usage
- File an issue on GitHub if you encounter problems

## License

This template is provided as-is for educational and commercial use.
