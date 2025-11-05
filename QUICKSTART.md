# Quick Start Guide

## Getting Started in 3 Steps

### 1. Install Dependencies

#### Option A: Using the install script (Recommended)
```bash
cd property-dashboard
./install.sh
```

#### Option B: Manual installation
```bash
cd property-dashboard
npm install
```

If you get permission errors, run:
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

### 2. Start the Server

```bash
npm start
```

You should see:
```
🚀 Property Dashboard API running on http://localhost:3000
📊 Frontend: http://localhost:3000
```

### 3. Use the Dashboard

1. Open your browser to: **http://localhost:3000**
2. Enter an address in the search box
3. Click "Search" or press Enter
4. View the aggregated property data!

## Example Addresses to Try

```
4706 New Horizons Blvd Appleton, WI 54914
123 Main St Miami, FL 33101
1600 Amphitheatre Parkway Mountain View, CA 94043
```

## What You'll See

The dashboard displays:

- ✅ **Validated Address** - Google-verified address format
- 🏠 **Street View** - Property imagery
- 📊 **Key Metrics** - AVM value, tax assessment, zoning, property type
- 🏢 **Property Details** - Beds, baths, sq ft, year built, etc.
- 🗺️ **Zoning Information** - Zone codes, types, regulations
- 💰 **Valuation** - AVM estimates and confidence scores
- 📈 **Financial Data** - Tax assessment, equity, mortgage info
- 🔍 **Raw Data** - Complete JSON response from all APIs

## Tabs

Navigate between different data views:

1. **Property Details** - Basic property information
2. **Zoning** - Zoning codes and regulations
3. **Valuation** - AVM estimates and ranges
4. **Financial** - Tax, equity, and mortgage data
5. **Raw Data** - Complete API responses in JSON

## Troubleshooting

### Port 3000 is already in use
Edit `server.js` and change:
```javascript
const PORT = 3001; // or any available port
```

### API returns errors
- Verify API keys are valid
- Check you have API credits remaining
- Try a different address

### Can't install dependencies
Try:
```bash
npm cache clean --force
npm install --legacy-peer-deps
```

## Features

✨ **Real-time API Integration**
- Google Address Validation
- Google Street View
- Zoneomics Zoning Data
- ATTOM Property Data (5 different endpoints)

🎨 **Modern UI**
- Tailwind CSS styling
- Responsive design
- Tab-based navigation
- Loading states & error handling

💾 **Local Storage**
- Caches last search
- Faster repeat lookups

## API Endpoints

The backend exposes these endpoints:

```
POST /api/property/search          # Main search endpoint (calls all APIs)
POST /api/validate-address         # Google address validation
GET  /api/streetview              # Street view image URL
GET  /api/zoning                  # Zoneomics zoning data
GET  /api/attom/property-detail   # ATTOM property details
GET  /api/attom/avm               # ATTOM AVM valuation
GET  /api/attom/tax-assessment    # ATTOM tax assessment
GET  /api/attom/home-equity       # ATTOM home equity
GET  /api/attom/foreclosure       # ATTOM foreclosure data
```

## Data Flow

```
User enters address
    ↓
Google validates address
    ↓
Formatted address used for:
    ├─ Zoneomics API (zoning data)
    ├─ Google Street View (imagery)
    ├─ ATTOM Property Detail (basic info)
    ├─ ATTOM AVM (valuation)
    ├─ ATTOM Tax Assessment
    ├─ ATTOM Home Equity
    └─ ATTOM Foreclosure
    ↓
All data aggregated and displayed
```

## Next Steps

Ready to integrate LoopNet and Crexi? Add their API endpoints to `server.js` and update the UI in `public/index.html`!

Need help? Check `README.md` for more detailed documentation.
