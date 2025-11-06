# Property Intelligence Dashboard

A modern property data aggregation dashboard that integrates multiple APIs to provide comprehensive property insights.

## Features

- **Address Validation**: Uses Google Address Validation API to ensure accurate addresses
- **Street View**: Displays Google Street View imagery of the property
- **Zoning Data**: Integrates with Zoneomics API for zoning information
- **Property Details**: Fetches comprehensive property data from ATTOM Data API
- **Valuations**: Shows AVM (Automated Valuation Model) estimates
- **Tax Assessment**: Displays tax assessment information
- **Financial Data**: Includes home equity and mortgage information
- **Foreclosure Data**: Shows any foreclosure details if available
- **Cloud Storage**: Automatically saves searches to Supabase database
- **Search History**: View and reload your recent property searches
- **Cross-Device Sync**: Access your search history from any device

## APIs Integrated

1. **Google APIs**
   - Address Validation API
   - Street View Static API

2. **Zoneomics API**
   - Zone Detail endpoint

3. **ATTOM Data APIs**
   - Property Detail with Mortgage/Owner
   - AVM Valuation
   - Tax Assessment
   - Home Equity
   - Foreclosure Details

4. **Supabase Database**
   - Cloud PostgreSQL database
   - Stores search history and results
   - Real-time data synchronization

## Installation

1. Navigate to the project directory:
   ```bash
   cd property-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. **Setup Supabase Database** (Required):

   Before running the app, you must create the database tables:

   a. Go to Supabase SQL Editor:
      https://supabase.com/dashboard/project/your_supabase_project_ref_here/sql

   b. Click "New Query"

   c. Copy and paste the contents of `supabase-schema.sql`

   d. Click "Run"

   See `SETUP_DATABASE.md` for detailed instructions.

## Running the Application

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Enter a property address in the search box (e.g., "4706 New Horizons Blvd Appleton, WI 54914")
2. Click "Search" or press Enter
3. The dashboard will:
   - Validate the address with Google
   - Fetch data from all APIs simultaneously
   - **Automatically save the search to Supabase**
   - Display organized results in multiple tabs
4. Navigate between tabs to view different data categories:
   - **Property Details**: Basic property information
   - **Zoning**: Zoning codes and regulations
   - **Valuation**: AVM estimates and value ranges
   - **Financial**: Tax, equity, and mortgage data
   - **Raw Data**: Complete JSON response from all APIs
5. **View Search History**:
   - Click "View Recent Searches" to see your last 10 searches
   - Click any previous search to instantly reload its data
   - No need to re-fetch from APIs - instant loading!

## Architecture

### Backend (server.js)
- Express.js server running on port 3000
- Proxy endpoints for all API calls
- Uses curl commands for API requests
- Handles CORS for local development
- Aggregates data from multiple sources

### Frontend
- **index.html**: Modern Tailwind CSS dashboard UI
- **app.js**: JavaScript for API calls and dynamic content rendering
- Responsive design that works on desktop and mobile
- Tab-based navigation for organized data display
- Loading states and error handling

## API Keys

All API keys are configured in `server.js`:
- Google API Key: `your_google_api_key_here`
- Zoneomics API Key: `your_zoneomics_api_key_here`
- ATTOM API Key: `your_attom_api_key_here`

## Project Structure

```
property-dashboard/
├── server.js              # Express backend server
├── package.json           # Node.js dependencies
├── README.md             # This file
└── public/
    ├── index.html        # Frontend dashboard UI
    └── app.js            # Frontend JavaScript
```

## Development

The application uses:
- **Backend**: Node.js, Express, node-fetch
- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **APIs**: RESTful HTTP requests via curl

## Example Searches

Try these addresses to test the application:
- `4706 New Horizons Blvd Appleton, WI 54914`
- `123 Main St Miami, FL 33101`
- Any valid US address

## Troubleshooting

### Port already in use
If port 3000 is already in use, you can change it in `server.js`:
```javascript
const PORT = 3001; // Change to any available port
```

### API Errors
- Check that all API keys are valid and have sufficient credits
- Verify your internet connection
- Check the browser console for detailed error messages

### npm Install Issues
If you encounter permission issues with npm, try:
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

## Future Enhancements

- [ ] Add LoopNet and Crexi API integration
- [ ] Implement AI-powered property analysis
- [ ] Add comparison view for multiple properties
- [ ] Export reports to PDF
- [ ] Save favorite properties
- [ ] Add map view with nearby properties
- [ ] Implement user authentication
- [ ] Add property alerts and notifications

## License

This is a demo application for educational purposes.
