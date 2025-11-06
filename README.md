# Property Dashboard

A comprehensive property intelligence dashboard that integrates data from multiple sources including LoopNet, Zoneomics, ATTOM Data, and Google Maps.

## Features

- **Property Search**: Search properties by address with autocomplete
- **Commercial Listings**: Browse and filter commercial property listings
- **Interactive Maps**: View properties on an interactive map with clustering
- **Zoning Information**: Access detailed zoning data for properties
- **Property Analytics**: View comprehensive property metrics and valuations
- **Search History**: Track your recent property searches

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account (for database)
- API keys for:
  - Google Maps API
  - Zoneomics API
  - ATTOM Data API
  - LoopNet API (via RapidAPI)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/jgutt-png/DEMO-template.git
cd DEMO-template
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your API keys in the `.env` file:
```env
GOOGLE_API_KEY=your_google_api_key_here
ZONEOMICS_API_KEY=your_zoneomics_api_key_here
ATTOM_API_KEY=your_attom_api_key_here
LOOPNET_API_KEY=your_loopnet_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
PORT=3000
```

5. Update the Google Maps API key in `public/index.html` (line 9):
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_API_KEY&libraries=places"></script>
```
Replace `YOUR_GOOGLE_API_KEY` with your actual Google Maps API key.

## Database Setup

The application uses Supabase for data storage. Run the database migration scripts to set up the required tables:

```bash
node scripts/create-loopnet-tables.js
```

## Running the Application

Start the development server:
```bash
node server.js
```

The application will be available at `http://localhost:3000`

## Project Structure

```
.
├── public/              # Frontend files
│   ├── index.html      # Main dashboard page
│   ├── listings.html   # Property listings page
│   ├── listings.js     # Listings functionality
│   └── app.js          # Main app logic
├── scripts/            # Database and utility scripts
├── server.js           # Express server
├── supabase-config.js  # Supabase configuration
├── database-helpers.js # Database utility functions
└── .env                # Environment variables (not in repo)
```

## API Endpoints

### LoopNet API
- `POST /api/loopnet/find-city` - Find cities by keywords
- `POST /api/loopnet/search-by-coordinates` - Search properties by coordinates
- `POST /api/loopnet/search-by-city` - Search properties by city
- `GET /api/loopnet/listings` - Get all listings
- `GET /api/loopnet/stats` - Get listing statistics

### Property Data
- `POST /api/search` - Search property by address
- `POST /api/zoning` - Get zoning information
- `POST /api/valuation` - Get property valuation

## API Keys Setup

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Maps JavaScript API and Places API
4. Create credentials (API key)

### Zoneomics API
Contact Zoneomics for API access

### ATTOM Data API
Sign up at [ATTOM Data Solutions](https://api.developer.attomdata.com/)

### LoopNet API
Access through [RapidAPI](https://rapidapi.com/):
1. Sign up for RapidAPI
2. Subscribe to LoopNet API
3. Get your API key from the dashboard

## Contributing

This is a demo template. Feel free to fork and customize for your needs.

## License

MIT License

## Support

For questions or issues, please open an issue on GitHub.
