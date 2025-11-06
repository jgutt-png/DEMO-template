# Zillow-Style Commercial Property Listings Interface
## Comprehensive Design Specification Document

---

## Executive Summary

This document provides detailed specifications for transforming the existing property listings interface into a Zillow-style split-screen layout featuring an interactive map (50% left) synchronized with scrollable property listings (50% right). The design emphasizes rapid development, modern aesthetics, and seamless user interactions.

---

## 1. LAYOUT ARCHITECTURE

### 1.1 Overall Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ STICKY FILTER HEADER (Full Width, z-index: 200)            │
│ Height: 72px                                                │
└─────────────────────────────────────────────────────────────┘
┌──────────────────────────┬──────────────────────────────────┐
│                          │                                  │
│  INTERACTIVE MAP         │  SCROLLABLE LISTINGS PANEL       │
│  (Fixed 50% Width)       │  (Fixed 50% Width)              │
│  Height: calc(100vh-72px)│  Height: calc(100vh-72px)       │
│                          │  Overflow-y: scroll              │
│  - Leaflet Map           │  - Results Count Header          │
│  - Custom Markers        │  - Listing Cards (Vertical)     │
│  - Zoom Controls         │  - Infinite Scroll/Pagination   │
│  - Map Style Toggle      │  - Empty/Loading States         │
│                          │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### 1.2 Responsive Breakpoints

**Desktop (1024px+)**: Split-screen layout
- Map: 50% left, fixed position
- Listings: 50% right, scrollable

**Tablet (768px - 1023px)**: Stacked with toggle
- Map: Full width, collapsible to 40% height
- Listings: Full width below map, or toggle to full screen
- Floating toggle button to switch views

**Mobile (<768px)**: Tab-based navigation
- Tab bar at top: "Map" | "List"
- Each view takes full screen
- Quick switch between views with smooth transitions

---

## 2. VISUAL DESIGN SYSTEM

### 2.1 Color Palette

```css
/* Primary Colors - Commercial Property Theme */
--brand-primary: #006AFF;        /* Bright Blue - CTAs, Selected States */
--brand-primary-dark: #0052CC;   /* Hover states */
--brand-primary-light: #E6F2FF;  /* Subtle backgrounds */

/* Map Colors */
--map-marker-default: #006AFF;
--map-marker-hover: #FF385C;     /* Airbnb-style red on hover */
--map-marker-selected: #FF385C;
--map-cluster-bg: #006AFF;

/* Semantic Colors */
--success: #10B981;              /* Green - Available */
--warning: #F59E0B;              /* Amber - Pending */
--error: #EF4444;                /* Red - Sold */
--info: #3B82F6;                 /* Blue - New Listing */

/* Neutral Palette */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

/* Surface Colors */
--surface-white: #FFFFFF;
--surface-elevated: #FFFFFF;
--surface-overlay: rgba(0, 0, 0, 0.5);

/* Borders & Dividers */
--border-light: #E5E7EB;
--border-medium: #D1D5DB;
--border-focus: #006AFF;
```

### 2.2 Typography Scale

```css
/* Font Family */
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
                'Helvetica Neue', Arial, sans-serif;

/* Type Scale (Mobile-first) */
--text-hero: 32px/40px;        /* Map overlays, hero moments */
--text-h1: 28px/36px;          /* Page titles */
--text-h2: 24px/32px;          /* Section headers */
--text-h3: 20px/28px;          /* Card titles */
--text-h4: 18px/26px;          /* Subheadings */
--text-body: 16px/24px;        /* Default body text */
--text-small: 14px/20px;       /* Secondary info */
--text-tiny: 12px/16px;        /* Captions, labels */

/* Font Weights */
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
--weight-extrabold: 800;

/* Desktop Adjustments (1024px+) */
@media (min-width: 1024px) {
  --text-hero: 40px/48px;
  --text-h1: 32px/40px;
  --text-h2: 28px/36px;
}
```

### 2.3 Spacing System

Based on 4px base unit (Tailwind-compatible):

```css
--space-1: 4px;    /* 0.25rem - Tight */
--space-2: 8px;    /* 0.5rem - Small */
--space-3: 12px;   /* 0.75rem - Default small */
--space-4: 16px;   /* 1rem - Default medium */
--space-5: 20px;   /* 1.25rem - Comfortable */
--space-6: 24px;   /* 1.5rem - Large */
--space-8: 32px;   /* 2rem - XL */
--space-10: 40px;  /* 2.5rem - XXL */
--space-12: 48px;  /* 3rem - Section spacing */
--space-16: 64px;  /* 4rem - Hero spacing */
```

### 2.4 Elevation & Shadows

```css
/* Shadow System */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
             0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
             0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
             0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Map-specific Shadows */
--shadow-marker: 0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-marker-hover: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
```

### 2.5 Border Radius

```css
--radius-sm: 4px;    /* Small elements */
--radius-md: 8px;    /* Cards, buttons */
--radius-lg: 12px;   /* Larger cards */
--radius-xl: 16px;   /* Hero cards */
--radius-2xl: 24px;  /* Modals */
--radius-full: 9999px; /* Pills, markers */
```

---

## 3. COMPONENT SPECIFICATIONS

### 3.1 Sticky Filter Header

**Dimensions:**
- Height: 72px
- Padding: 16px 24px
- Position: sticky, top: 0
- Z-index: 200 (above map and listings)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Search Input] [Type] [City] [Price] [More ▼] | 1,234 Props│
└─────────────────────────────────────────────────────────────┘
```

**HTML Structure:**
```html
<header class="map-filter-header">
  <div class="filter-header-content">
    <!-- Left: Primary Filters -->
    <div class="filter-header-left">
      <div class="search-input-wrapper">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Search by address, city, or ZIP..." />
      </div>

      <select class="filter-select">
        <option>All Property Types</option>
        <option>Office</option>
        <option>Retail</option>
        <option>Industrial</option>
      </select>

      <select class="filter-select">
        <option>All Cities</option>
      </select>

      <button class="filter-button" id="price-filter-btn">
        <span>Price</span>
        <i class="fas fa-chevron-down"></i>
      </button>

      <button class="filter-button" id="more-filters-btn">
        <i class="fas fa-sliders-h"></i>
        <span>More Filters</span>
        <span class="filter-badge">3</span>
      </button>
    </div>

    <!-- Right: Stats & View Toggle -->
    <div class="filter-header-right">
      <div class="results-count">
        <strong>1,234</strong> properties
      </div>

      <!-- Mobile only: View toggle -->
      <button class="view-toggle-btn" id="toggle-view">
        <i class="fas fa-map"></i>
        <span>Map</span>
      </button>
    </div>
  </div>
</header>
```

**CSS Specifications:**
```css
.map-filter-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: var(--surface-white);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  z-index: 200;
  display: flex;
  align-items: center;
}

.filter-header-content {
  width: 100%;
  max-width: 100%;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.filter-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.search-input-wrapper {
  position: relative;
  min-width: 280px;
  max-width: 360px;
  flex: 1;
}

.search-input-wrapper i {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  font-size: 14px;
}

.search-input-wrapper input {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 36px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-input-wrapper input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--brand-primary-light);
}

.filter-select {
  height: 40px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  background: var(--surface-white);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.filter-select:hover {
  border-color: var(--gray-400);
}

.filter-button {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  background: var(--surface-white);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-button:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}

.filter-button.active {
  background: var(--brand-primary);
  color: white;
  border-color: var(--brand-primary);
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--brand-primary);
  color: white;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.results-count {
  font-size: 14px;
  color: var(--gray-600);
  white-space: nowrap;
}

.results-count strong {
  color: var(--gray-900);
  font-weight: 600;
}

/* Mobile View Toggle */
.view-toggle-btn {
  display: none; /* Show only on mobile */
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 1023px) {
  .view-toggle-btn {
    display: flex;
  }
}
```

**Interactive States:**
1. **Default**: Clean, unobtrusive
2. **Hover**: Subtle background color change
3. **Active Filter**: Blue background with white text
4. **Focus**: Blue ring around focused input
5. **Dropdown Open**: Dropdown panel appears below with smooth animation

---

### 3.2 Interactive Map (Left Panel)

**Dimensions:**
- Width: 50% of viewport (calc(50vw - 124px) accounting for sidebar)
- Height: calc(100vh - 72px) /* Full height minus header */
- Position: fixed
- Left: 248px (sidebar width)
- Top: 72px (header height)

**Leaflet Configuration:**
```javascript
// Map initialization
const mapConfig = {
  center: [37.7749, -122.4194], // San Francisco default
  zoom: 12,
  minZoom: 3,
  maxZoom: 18,
  scrollWheelZoom: true,
  zoomControl: false, // Custom controls
};

// Tile layers
const mapStyles = {
  default: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO',
  },
};

// Marker clustering
const clusterConfig = {
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  chunkedLoading: true,
  chunkInterval: 200,
  chunkDelay: 50,
};
```

**HTML Structure:**
```html
<div class="map-container">
  <!-- Leaflet Map -->
  <div id="property-map" class="property-map"></div>

  <!-- Map Controls Overlay -->
  <div class="map-controls">
    <!-- Zoom Controls -->
    <div class="map-control-group zoom-controls">
      <button class="map-control-btn" id="zoom-in">
        <i class="fas fa-plus"></i>
      </button>
      <button class="map-control-btn" id="zoom-out">
        <i class="fas fa-minus"></i>
      </button>
    </div>

    <!-- Map Style Toggle -->
    <div class="map-control-group style-controls">
      <button class="map-control-btn" id="map-style-toggle" title="Change map style">
        <i class="fas fa-layer-group"></i>
      </button>
    </div>

    <!-- Recenter Button -->
    <button class="map-control-btn recenter-btn" id="recenter-map" title="Reset map view">
      <i class="fas fa-compress-arrows-alt"></i>
    </button>
  </div>

  <!-- Map Legend -->
  <div class="map-legend">
    <div class="legend-item">
      <span class="legend-marker" style="background: var(--map-marker-default);"></span>
      <span>Available</span>
    </div>
    <div class="legend-item">
      <span class="legend-marker" style="background: var(--warning);"></span>
      <span>Pending</span>
    </div>
    <div class="legend-item">
      <span class="legend-marker" style="background: var(--error);"></span>
      <span>Sold</span>
    </div>
  </div>

  <!-- Loading Overlay -->
  <div class="map-loading" id="map-loading" style="display: none;">
    <div class="spinner"></div>
    <p>Loading properties...</p>
  </div>
</div>
```

**CSS Specifications:**
```css
.map-container {
  position: fixed;
  left: 248px; /* Sidebar width */
  top: 72px; /* Header height */
  width: calc(50vw - 124px);
  height: calc(100vh - 72px);
  background: var(--gray-100);
  z-index: 10;
}

.property-map {
  width: 100%;
  height: 100%;
}

/* Map Controls */
.map-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
}

.map-control-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--surface-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.map-control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-white);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--gray-700);
}

.map-control-btn:hover {
  background: var(--gray-50);
  color: var(--brand-primary);
}

.map-control-btn:active {
  background: var(--gray-100);
}

.recenter-btn {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

/* Map Legend */
.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: var(--surface-white);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  display: flex;
  gap: 16px;
  z-index: 1000;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--gray-700);
}

.legend-marker {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  border: 2px solid white;
  box-shadow: var(--shadow-sm);
}

/* Map Loading Overlay */
.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 2000;
}

/* Responsive */
@media (max-width: 1023px) {
  .map-container {
    position: relative;
    left: 0;
    top: 0;
    width: 100%;
    height: 400px;
  }
}
```

---

### 3.3 Custom Map Markers

**Marker Design Specifications:**

**Default Marker (Unselected):**
```css
/* Marker Styles */
.custom-marker {
  width: auto;
  min-width: 60px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-white);
  border: 2px solid var(--brand-primary);
  border-radius: var(--radius-lg);
  padding: 0 12px;
  box-shadow: var(--shadow-marker);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 700;
  color: var(--gray-900);
  position: relative;
  z-index: 100;
}

/* Marker Arrow/Tail */
.custom-marker::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid var(--brand-primary);
}

/* Hover State */
.custom-marker:hover {
  background: var(--brand-primary);
  color: white;
  border-color: var(--brand-primary);
  transform: scale(1.1);
  box-shadow: var(--shadow-marker-hover);
  z-index: 200;
}

.custom-marker:hover::after {
  border-top-color: var(--brand-primary);
}

/* Selected/Active State */
.custom-marker.active {
  background: var(--map-marker-selected);
  color: white;
  border-color: var(--map-marker-selected);
  transform: scale(1.15);
  box-shadow: var(--shadow-marker-hover);
  z-index: 300;
}

.custom-marker.active::after {
  border-top-color: var(--map-marker-selected);
}

/* Status Colors */
.custom-marker.status-pending {
  border-color: var(--warning);
}

.custom-marker.status-sold {
  border-color: var(--error);
  opacity: 0.7;
}
```

**Marker Clustering:**
```css
.marker-cluster {
  background: var(--brand-primary);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  box-shadow: var(--shadow-md);
  border: 3px solid white;
}

.marker-cluster.large {
  width: 50px;
  height: 50px;
  font-size: 16px;
}

.marker-cluster:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-lg);
}
```

**JavaScript Implementation:**
```javascript
// Create custom marker
function createCustomMarker(property) {
  const icon = L.divIcon({
    className: 'custom-marker-wrapper',
    html: `
      <div class="custom-marker ${property.status ? 'status-' + property.status : ''}"
           data-property-id="${property.id}">
        ${formatPrice(property.price)}
      </div>
    `,
    iconSize: [60, 36],
    iconAnchor: [30, 42],
    popupAnchor: [0, -42],
  });

  const marker = L.marker([property.lat, property.lng], { icon });

  // Hover events
  marker.on('mouseover', function() {
    showPropertyPreview(property);
  });

  marker.on('mouseout', function() {
    hidePropertyPreview();
  });

  // Click events
  marker.on('click', function() {
    selectProperty(property.id);
    scrollToListing(property.id);
  });

  return marker;
}

// Format price for display
function formatPrice(price) {
  if (price >= 1000000) {
    return '$' + (price / 1000000).toFixed(1) + 'M';
  } else if (price >= 1000) {
    return '$' + (price / 1000).toFixed(0) + 'K';
  }
  return '$' + price.toLocaleString();
}
```

---

### 3.4 Scrollable Listings Panel (Right)

**Dimensions:**
- Width: 50% of viewport (calc(50vw - 124px))
- Height: calc(100vh - 72px)
- Position: fixed
- Right: 0
- Top: 72px
- Overflow-y: scroll

**HTML Structure:**
```html
<div class="listings-panel">
  <!-- Listings Header -->
  <div class="listings-header">
    <div class="results-info">
      <h2 class="results-count">1,234 properties</h2>
      <p class="results-subtitle">in San Francisco, CA</p>
    </div>

    <div class="sort-controls">
      <select class="sort-select" id="sort-listings">
        <option value="relevant">Most Relevant</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
        <option value="newest">Newest First</option>
        <option value="size">Largest Size</option>
      </select>
    </div>
  </div>

  <!-- Listings Grid -->
  <div class="listings-scroll-container" id="listings-scroll">
    <div class="listings-grid-vertical" id="listings-grid">
      <!-- Listing cards inserted here -->
    </div>

    <!-- Infinite Scroll Loader -->
    <div class="infinite-loader" id="infinite-loader" style="display: none;">
      <div class="spinner-small"></div>
      <p>Loading more properties...</p>
    </div>
  </div>

  <!-- Empty State -->
  <div class="empty-state" id="listings-empty" style="display: none;">
    <i class="fas fa-search" style="font-size: 48px; color: var(--gray-300);"></i>
    <h3>No properties found</h3>
    <p>Try adjusting your filters or search area</p>
    <button class="btn-primary" id="clear-all-filters">
      Clear All Filters
    </button>
  </div>
</div>
```

**CSS Specifications:**
```css
.listings-panel {
  position: fixed;
  right: 0;
  top: 72px;
  width: calc(50vw - 124px);
  height: calc(100vh - 72px);
  background: var(--gray-50);
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.listings-header {
  padding: 24px;
  background: var(--surface-white);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.results-info h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0 0 4px 0;
}

.results-subtitle {
  font-size: 14px;
  color: var(--gray-600);
  margin: 0;
}

.sort-select {
  height: 36px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  background: var(--surface-white);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.listings-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

.listings-grid-vertical {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Custom Scrollbar */
.listings-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.listings-scroll-container::-webkit-scrollbar-track {
  background: var(--gray-100);
}

.listings-scroll-container::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: 4px;
}

.listings-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

/* Infinite Loader */
.infinite-loader {
  padding: 32px;
  text-align: center;
  color: var(--gray-500);
  font-size: 14px;
}

.spinner-small {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-light);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

/* Responsive */
@media (max-width: 1023px) {
  .listings-panel {
    position: relative;
    right: 0;
    top: 0;
    width: 100%;
    height: auto;
    min-height: calc(100vh - 72px - 400px);
  }
}
```

---

### 3.5 Listing Card (Horizontal Layout)

**Design for vertical scrolling in panel:**

**HTML Structure:**
```html
<div class="listing-card-horizontal" data-property-id="123">
  <!-- Image Section -->
  <div class="listing-card-image">
    <img src="property.jpg" alt="Property" />

    <!-- Status Badge -->
    <div class="status-badge status-new">New</div>

    <!-- Quick Actions -->
    <div class="card-quick-actions">
      <button class="quick-action-btn" title="Save">
        <i class="far fa-heart"></i>
      </button>
      <button class="quick-action-btn" title="Share">
        <i class="fas fa-share-alt"></i>
      </button>
    </div>

    <!-- Image Counter -->
    <div class="image-counter">
      <i class="fas fa-camera"></i>
      <span>12</span>
    </div>
  </div>

  <!-- Content Section -->
  <div class="listing-card-content">
    <!-- Header -->
    <div class="card-header">
      <h3 class="card-title">Modern Office Building in SOMA</h3>
      <div class="card-price">$8,500,000</div>
    </div>

    <!-- Location -->
    <div class="card-location">
      <i class="fas fa-map-marker-alt"></i>
      <span>123 Market Street, San Francisco, CA 94103</span>
    </div>

    <!-- Details Grid -->
    <div class="card-details-grid">
      <div class="detail-item">
        <span class="detail-icon"><i class="fas fa-building"></i></span>
        <div class="detail-info">
          <span class="detail-value">45,000</span>
          <span class="detail-label">SF Building</span>
        </div>
      </div>

      <div class="detail-item">
        <span class="detail-icon"><i class="fas fa-vector-square"></i></span>
        <div class="detail-info">
          <span class="detail-value">12,000</span>
          <span class="detail-label">SF Lot</span>
        </div>
      </div>

      <div class="detail-item">
        <span class="detail-icon"><i class="fas fa-dollar-sign"></i></span>
        <div class="detail-info">
          <span class="detail-value">$189</span>
          <span class="detail-label">Price/SF</span>
        </div>
      </div>

      <div class="detail-item">
        <span class="detail-icon"><i class="fas fa-calendar"></i></span>
        <div class="detail-info">
          <span class="detail-value">1985</span>
          <span class="detail-label">Year Built</span>
        </div>
      </div>
    </div>

    <!-- Tags -->
    <div class="card-tags">
      <span class="tag">Office</span>
      <span class="tag">High-Traffic</span>
      <span class="tag">Parking</span>
    </div>

    <!-- Footer -->
    <div class="card-footer">
      <div class="listed-by">
        <img src="agent.jpg" class="agent-avatar" />
        <span class="agent-name">Listed by John Smith</span>
      </div>
      <span class="listed-date">2 days ago</span>
    </div>
  </div>
</div>
```

**CSS Specifications:**
```css
.listing-card-horizontal {
  display: flex;
  background: var(--surface-white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
  min-height: 240px;
}

.listing-card-horizontal:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
  border-color: var(--brand-primary);
}

.listing-card-horizontal.selected {
  border-color: var(--map-marker-selected);
  box-shadow: 0 0 0 3px rgba(255, 56, 92, 0.1);
}

/* Image Section */
.listing-card-image {
  position: relative;
  width: 280px;
  flex-shrink: 0;
  overflow: hidden;
}

.listing-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.listing-card-horizontal:hover .listing-card-image img {
  transform: scale(1.05);
}

.status-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.status-new {
  background: var(--info);
  color: white;
}

.status-badge.status-pending {
  background: var(--warning);
  color: white;
}

.status-badge.status-sold {
  background: var(--error);
  color: white;
}

/* Quick Actions */
.card-quick-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.listing-card-horizontal:hover .card-quick-actions {
  opacity: 1;
}

.quick-action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--gray-700);
  transition: all 0.2s ease;
}

.quick-action-btn:hover {
  background: white;
  color: var(--brand-primary);
  transform: scale(1.1);
}

.quick-action-btn.active {
  color: var(--error);
}

/* Image Counter */
.image-counter {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
}

/* Content Section */
.listing-card-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--gray-900);
  line-height: 1.3;
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-price {
  font-size: 20px;
  font-weight: 800;
  color: var(--brand-primary);
  white-space: nowrap;
}

.card-location {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--gray-600);
}

.card-location i {
  color: var(--gray-400);
}

/* Details Grid */
.card-details-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-100);
  border-radius: var(--radius-md);
  color: var(--gray-600);
  font-size: 14px;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--gray-900);
  line-height: 1;
}

.detail-label {
  font-size: 11px;
  color: var(--gray-500);
  line-height: 1;
}

/* Tags */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 10px;
  background: var(--gray-100);
  color: var(--gray-700);
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 500;
}

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.listed-by {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--gray-600);
}

.agent-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.listed-date {
  font-size: 13px;
  color: var(--gray-500);
}
```

---

## 4. INTERACTIVE BEHAVIORS

### 4.1 Map-to-Listing Synchronization

**Marker Click → Highlight Listing:**
```javascript
// When marker is clicked
function onMarkerClick(propertyId) {
  // 1. Update marker visual state
  setActiveMarker(propertyId);

  // 2. Scroll to corresponding listing card
  const listingCard = document.querySelector(`[data-property-id="${propertyId}"]`);
  if (listingCard) {
    listingCard.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  // 3. Highlight the listing card
  listingCard.classList.add('selected');

  // 4. Remove highlight from other cards
  document.querySelectorAll('.listing-card-horizontal').forEach(card => {
    if (card.dataset.propertyId !== propertyId) {
      card.classList.remove('selected');
    }
  });
}
```

**Listing Hover → Highlight Marker:**
```javascript
// When listing card is hovered
function onListingHover(propertyId) {
  // Find and highlight corresponding marker
  const marker = markers[propertyId];
  if (marker) {
    marker.getElement().classList.add('hover');

    // Optionally bring to front
    marker.setZIndexOffset(1000);
  }
}

function onListingLeave(propertyId) {
  const marker = markers[propertyId];
  if (marker) {
    marker.getElement().classList.remove('hover');
    marker.setZIndexOffset(0);
  }
}
```

**Listing Click → Center Map:**
```javascript
// When listing card is clicked
function onListingClick(propertyId) {
  const property = properties.find(p => p.id === propertyId);
  if (property) {
    // Center map on property
    map.flyTo([property.lat, property.lng], 16, {
      animate: true,
      duration: 1.5
    });

    // Highlight marker
    setActiveMarker(propertyId);

    // Update selected state
    updateSelectedListing(propertyId);
  }
}
```

### 4.2 Map Movement → Update Listings

```javascript
// When map bounds change (pan/zoom)
function onMapMove() {
  // Debounce to avoid excessive calls
  clearTimeout(mapMoveTimeout);
  mapMoveTimeout = setTimeout(() => {
    const bounds = map.getBounds();

    // Fetch properties in new bounds
    fetchPropertiesInBounds(bounds);

    // Show "Redo search in this area" button if bounds changed significantly
    if (boundsChangedSignificantly(originalBounds, bounds)) {
      showRedoSearchButton();
    }
  }, 300);
}

// Redo search button
function showRedoSearchButton() {
  const btn = document.getElementById('redo-search-btn');
  if (btn) {
    btn.style.display = 'flex';
    btn.classList.add('slide-down');
  }
}
```

### 4.3 Filter Changes

```javascript
// When filters are applied
function onFiltersApply() {
  // Show loading states
  showMapLoading();
  showListingsLoading();

  // Fetch filtered data
  const filters = getActiveFilters();
  Promise.all([
    fetchFilteredProperties(filters),
    updateMapMarkers(filters)
  ]).then(() => {
    hideMapLoading();
    hideListingsLoading();
    updateResultsCount();
  });
}
```

### 4.4 Infinite Scroll

```javascript
// Intersection Observer for infinite scroll
const infiniteLoader = document.getElementById('infinite-loader');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !isLoading && hasMoreResults) {
      loadMoreListings();
    }
  });
}, { threshold: 0.1 });

observer.observe(infiniteLoader);

async function loadMoreListings() {
  isLoading = true;
  infiniteLoader.style.display = 'flex';

  const nextPage = currentPage + 1;
  const newProperties = await fetchProperties({ page: nextPage });

  if (newProperties.length > 0) {
    appendListings(newProperties);
    currentPage = nextPage;
  } else {
    hasMoreResults = false;
    infiniteLoader.innerHTML = '<p>No more properties to show</p>';
  }

  isLoading = false;
}
```

---

## 5. RESPONSIVE DESIGN

### 5.1 Desktop (1024px+)

```css
@media (min-width: 1024px) {
  /* Split-screen layout */
  .map-container {
    display: block;
    position: fixed;
  }

  .listings-panel {
    display: flex;
    position: fixed;
  }

  .view-toggle-btn {
    display: none;
  }
}
```

### 5.2 Tablet (768px - 1023px)

```css
@media (min-width: 768px) and (max-width: 1023px) {
  /* Stacked layout with toggle */
  .map-container {
    position: relative;
    width: 100%;
    height: 400px;
    left: 0;
    top: 0;
  }

  .listings-panel {
    position: relative;
    width: 100%;
    height: auto;
    min-height: 600px;
  }

  /* Map collapse button */
  .map-collapse-btn {
    display: flex;
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;
  }

  /* Listing card adjustments */
  .listing-card-horizontal {
    flex-direction: column;
    min-height: auto;
  }

  .listing-card-image {
    width: 100%;
    height: 220px;
  }

  .card-details-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

### 5.3 Mobile (<768px)

```css
@media (max-width: 767px) {
  /* Tab-based navigation */
  .map-view-tabs {
    display: flex;
    background: var(--surface-white);
    border-bottom: 1px solid var(--border-light);
    position: sticky;
    top: 72px;
    z-index: 150;
  }

  .tab-btn {
    flex: 1;
    padding: 16px;
    border: none;
    background: transparent;
    font-size: 15px;
    font-weight: 600;
    color: var(--gray-600);
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease;
  }

  .tab-btn.active {
    color: var(--brand-primary);
    border-bottom-color: var(--brand-primary);
  }

  /* View containers */
  .map-container {
    display: none;
    position: relative;
    width: 100%;
    height: calc(100vh - 144px);
    left: 0;
    top: 0;
  }

  .map-container.active {
    display: block;
  }

  .listings-panel {
    display: none;
    position: relative;
    width: 100%;
    height: auto;
  }

  .listings-panel.active {
    display: flex;
  }

  /* Simplified listing cards */
  .listing-card-horizontal {
    flex-direction: column;
  }

  .listing-card-image {
    width: 100%;
    height: 200px;
  }

  .card-details-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  /* Filter header adjustments */
  .filter-header-left {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input-wrapper {
    min-width: 0;
    width: 100%;
  }

  .filter-select,
  .filter-button {
    width: 100%;
  }
}
```

---

## 6. ANIMATIONS & TRANSITIONS

### 6.1 Micro-interactions

```css
/* Smooth transitions for all interactive elements */
* {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Button press animation */
.btn-primary:active,
.btn-secondary:active,
.map-control-btn:active {
  transform: scale(0.95);
}

/* Card hover lift */
.listing-card-horizontal:hover {
  animation: cardLift 0.3s ease forwards;
}

@keyframes cardLift {
  to {
    transform: translateY(-2px);
  }
}

/* Marker bounce on selection */
.custom-marker.active {
  animation: markerBounce 0.5s ease;
}

@keyframes markerBounce {
  0%, 100% { transform: scale(1.15) translateY(0); }
  50% { transform: scale(1.15) translateY(-5px); }
}

/* Smooth scroll behavior */
.listings-scroll-container {
  scroll-behavior: smooth;
}

/* Loading pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}
```

### 6.2 Page Transitions

```css
/* Initial page load */
.map-container,
.listings-panel {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Filter panel slide */
.filters-advanced-panel {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Modal appear */
.modal {
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSlideUp {
  from {
    transform: translate(-50%, -45%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%);
    opacity: 1;
  }
}
```

---

## 7. STATE MANAGEMENT

### 7.1 Application States

```javascript
const AppState = {
  // View state
  currentView: 'split', // 'split', 'map', 'list'

  // Map state
  mapCenter: [37.7749, -122.4194],
  mapZoom: 12,
  mapBounds: null,
  mapStyle: 'default',

  // Listings state
  properties: [],
  selectedPropertyId: null,
  currentPage: 1,
  totalProperties: 0,
  hasMoreResults: true,

  // Filter state
  filters: {
    search: '',
    propertyType: '',
    city: '',
    state: '',
    priceMin: null,
    priceMax: null,
    buildingSizeMin: null,
    buildingSizeMax: null,
    lotSizeMin: null,
    lotSizeMax: null,
    sortBy: 'relevant',
  },

  // UI state
  isLoading: false,
  error: null,
  showAdvancedFilters: false,
};
```

### 7.2 State Update Patterns

```javascript
// Update state and trigger effects
function updateAppState(updates) {
  Object.assign(AppState, updates);
  renderApp();
}

// Specific state updates
function selectProperty(propertyId) {
  updateAppState({ selectedPropertyId: propertyId });
  highlightMarker(propertyId);
  highlightListing(propertyId);
}

function updateFilters(newFilters) {
  updateAppState({
    filters: { ...AppState.filters, ...newFilters },
    currentPage: 1, // Reset pagination
  });
  fetchFilteredProperties();
}
```

---

## 8. LOADING & EMPTY STATES

### 8.1 Loading States

```html
<!-- Map Loading -->
<div class="map-loading-overlay">
  <div class="loading-spinner-large"></div>
  <p class="loading-text">Loading properties...</p>
</div>

<!-- Listing Loading (Skeleton) -->
<div class="listing-card-skeleton">
  <div class="skeleton-image"></div>
  <div class="skeleton-content">
    <div class="skeleton-line w-70"></div>
    <div class="skeleton-line w-50"></div>
    <div class="skeleton-line w-90"></div>
  </div>
</div>
```

```css
.skeleton-line {
  height: 12px;
  background: linear-gradient(
    90deg,
    var(--gray-200) 25%,
    var(--gray-100) 50%,
    var(--gray-200) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.w-70 { width: 70%; }
.w-50 { width: 50%; }
.w-90 { width: 90%; }
```

### 8.2 Empty States

```html
<!-- No Results -->
<div class="empty-state-container">
  <div class="empty-state-icon">
    <i class="fas fa-search-location"></i>
  </div>
  <h3 class="empty-state-title">No properties found</h3>
  <p class="empty-state-text">
    Try adjusting your filters or search in a different area
  </p>
  <div class="empty-state-actions">
    <button class="btn-primary" onclick="clearAllFilters()">
      Clear All Filters
    </button>
    <button class="btn-secondary" onclick="expandMapSearch()">
      Expand Search Area
    </button>
  </div>
</div>
```

```css
.empty-state-container {
  padding: 80px 40px;
  text-align: center;
  background: var(--surface-white);
  border-radius: var(--radius-lg);
  margin: 20px;
}

.empty-state-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-100);
  border-radius: var(--radius-full);
  color: var(--gray-400);
  font-size: 36px;
}

.empty-state-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0 0 12px 0;
}

.empty-state-text {
  font-size: 16px;
  color: var(--gray-600);
  margin: 0 0 32px 0;
}

.empty-state-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
```

---

## 9. IMPLEMENTATION CHECKLIST

### Phase 1: Core Layout (Day 1)
- [ ] HTML structure for split-screen layout
- [ ] CSS for fixed map container (left 50%)
- [ ] CSS for scrollable listings panel (right 50%)
- [ ] Sticky filter header implementation
- [ ] Responsive breakpoints setup

### Phase 2: Map Integration (Day 2)
- [ ] Leaflet.js initialization
- [ ] Custom marker creation
- [ ] Marker clustering setup
- [ ] Map controls (zoom, style toggle)
- [ ] Map loading states

### Phase 3: Listing Cards (Day 2-3)
- [ ] Horizontal card component
- [ ] Card hover states
- [ ] Quick action buttons
- [ ] Image gallery integration
- [ ] Responsive card layout

### Phase 4: Interactivity (Day 3-4)
- [ ] Marker click → scroll to listing
- [ ] Listing hover → highlight marker
- [ ] Listing click → center map
- [ ] Map bounds change → update listings
- [ ] Filter application → update both views

### Phase 5: Advanced Features (Day 4-5)
- [ ] Infinite scroll implementation
- [ ] Advanced filter dropdown
- [ ] Property detail modal
- [ ] Save/share functionality
- [ ] "Redo search" button

### Phase 6: Polish & Testing (Day 5-6)
- [ ] Animations and transitions
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error handling
- [ ] Mobile testing
- [ ] Performance optimization

---

## 10. PERFORMANCE OPTIMIZATION

### 10.1 Map Performance

```javascript
// Marker clustering for performance
const markerCluster = L.markerClusterGroup({
  chunkedLoading: true,
  chunkInterval: 200,
  chunkDelay: 50,
  maxClusterRadius: 50,
});

// Debounce map move events
const debouncedMapMove = debounce(() => {
  updateVisibleListings();
}, 300);

map.on('moveend', debouncedMapMove);
```

### 10.2 Infinite Scroll Optimization

```javascript
// Intersection Observer for efficient scroll detection
const listingObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadVisibleImages(entry.target);
      }
    });
  },
  { rootMargin: '50px' }
);

// Lazy load images
function loadVisibleImages(card) {
  const img = card.querySelector('img[data-src]');
  if (img) {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  }
}
```

### 10.3 Virtual Scrolling (Optional)

For very large datasets (10,000+ properties), consider virtual scrolling:

```javascript
// Only render visible listings
const LISTING_HEIGHT = 240; // px
const VIEWPORT_HEIGHT = window.innerHeight - 72;
const VISIBLE_COUNT = Math.ceil(VIEWPORT_HEIGHT / LISTING_HEIGHT) + 2;

function getVisibleListings(scrollTop) {
  const startIndex = Math.floor(scrollTop / LISTING_HEIGHT);
  const endIndex = startIndex + VISIBLE_COUNT;
  return allProperties.slice(startIndex, endIndex);
}
```

---

## 11. ACCESSIBILITY

```html
<!-- Semantic HTML -->
<nav aria-label="Property filters">...</nav>
<main aria-label="Property map and listings">...</main>
<section aria-label="Interactive map">...</section>
<section aria-label="Property listings">...</section>

<!-- ARIA attributes -->
<button aria-label="Zoom in" aria-controls="property-map">
  <i class="fas fa-plus" aria-hidden="true"></i>
</button>

<div role="region" aria-live="polite" aria-atomic="true">
  <p>Showing 1,234 properties</p>
</div>

<!-- Keyboard navigation -->
<div class="listing-card-horizontal" tabindex="0" role="button">
  ...
</div>
```

```css
/* Focus visible for keyboard navigation */
.listing-card-horizontal:focus-visible {
  outline: 3px solid var(--brand-primary);
  outline-offset: 2px;
}

.map-control-btn:focus-visible,
.filter-button:focus-visible {
  outline: 3px solid var(--brand-primary);
  outline-offset: 2px;
}

/* Skip to content link */
.skip-to-content {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--brand-primary);
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  z-index: 9999;
}

.skip-to-content:focus {
  top: 0;
}
```

---

## 12. BROWSER SUPPORT

**Target Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Fallbacks:**
- CSS Grid → Flexbox fallback
- CSS custom properties → PostCSS fallback
- Intersection Observer → Polyfill
- Leaflet.js → Works in all modern browsers

---

## 13. ASSETS & RESOURCES

### 13.1 Required Libraries

```html
<!-- Leaflet.js -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- Leaflet MarkerCluster -->
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>

<!-- Font Awesome -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

<!-- Tailwind CSS (optional, for rapid prototyping) -->
<script src="https://cdn.tailwindcss.com"></script>
```

### 13.2 Image Specifications

**Listing Images:**
- Dimensions: 840x560px (3:2 aspect ratio)
- Format: WebP with JPEG fallback
- Quality: 80%
- Max size: 150KB

**Agent Avatars:**
- Dimensions: 56x56px (1:1 aspect ratio)
- Format: WebP with JPEG fallback
- Quality: 85%

**Placeholder:**
```html
<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 840 560'%3E%3Crect fill='%23e5e7eb' width='840' height='560'/%3E%3C/svg%3E" alt="Loading..." />
```

---

## 14. SAMPLE DATA STRUCTURE

```javascript
const sampleProperty = {
  id: '123',
  title: 'Modern Office Building in SOMA',
  subtitle: 'Prime Location with High Traffic',

  // Location
  address: '123 Market Street',
  city: 'San Francisco',
  state: 'CA',
  zipCode: '94103',
  lat: 37.7749,
  lng: -122.4194,

  // Pricing
  price: 8500000,
  pricePerSF: 189,

  // Property details
  propertyType: 'Office',
  buildingSize: 45000, // SF
  lotSize: 12000, // SF
  yearBuilt: 1985,
  parking: 'Covered parking for 50 vehicles',

  // Status
  status: 'available', // 'available', 'pending', 'sold'
  listedDate: '2025-11-04',

  // Media
  images: [
    { url: '/images/prop-123-1.jpg', caption: 'Exterior view' },
    { url: '/images/prop-123-2.jpg', caption: 'Lobby' },
  ],
  imageCount: 12,

  // Agent
  agent: {
    name: 'John Smith',
    avatar: '/images/agents/john-smith.jpg',
    company: 'Commercial Realty Group',
  },

  // Tags
  tags: ['Office', 'High-Traffic', 'Parking', 'Modern'],

  // Additional
  description: 'Full property description...',
  amenities: ['High-speed internet', 'Conference rooms', '24/7 security'],
};
```

---

## 15. FINAL NOTES

**Development Timeline:**
- Days 1-2: Core layout and map integration
- Days 3-4: Listing cards and interactivity
- Days 5-6: Polish, testing, and optimization

**Key Success Metrics:**
1. Map loads in < 2 seconds
2. Smooth scrolling at 60fps
3. Marker interactions respond in < 100ms
4. Mobile-friendly with touch gestures
5. Accessible with keyboard navigation

**Social Media Moments:**
- Split-screen view with beautiful properties
- Smooth map animations
- Hover interactions
- Filter transformations
- Mobile gestures

This design balances aesthetic appeal with implementation speed, ensuring the interface can be built within the 6-day sprint while delivering a premium, Zillow-style user experience.

---

**File:** `/Users/default/property-dashboard/ZILLOW_DESIGN_SPEC.md`
