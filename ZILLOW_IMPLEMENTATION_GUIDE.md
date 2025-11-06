# Zillow-Style Implementation Guide
## Ready-to-Use Code Snippets

This guide provides copy-paste ready code for implementing the Zillow-style split-screen interface.

---

## 1. Complete HTML Structure

```html
<!DOCTYPE html>
<html lang="en" class="h-full bg-gray-50">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Commercial Property Listings - Map View</title>

    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Custom Styles -->
    <link rel="stylesheet" href="listings-style.css">
    <link rel="stylesheet" href="listings-map.css">
</head>
<body class="h-full">
    <!-- Sidebar (existing) -->
    <div class="sidebar">
        <!-- Your existing sidebar code -->
    </div>

    <!-- Main Content Area -->
    <div class="main-app-container">

        <!-- STICKY FILTER HEADER -->
        <header class="map-filter-header">
            <div class="filter-header-content">
                <!-- Left: Primary Filters -->
                <div class="filter-header-left">
                    <!-- Search Input -->
                    <div class="search-input-wrapper">
                        <i class="fas fa-search"></i>
                        <input
                            type="text"
                            id="map-search-input"
                            placeholder="Search by address, city, or ZIP..."
                            class="search-input"
                        />
                    </div>

                    <!-- Property Type Filter -->
                    <select id="property-type-filter" class="filter-select">
                        <option value="">All Property Types</option>
                        <option value="office">Office</option>
                        <option value="retail">Retail</option>
                        <option value="industrial">Industrial</option>
                        <option value="multifamily">Multifamily</option>
                        <option value="land">Land</option>
                    </select>

                    <!-- City Filter -->
                    <select id="city-filter" class="filter-select">
                        <option value="">All Cities</option>
                    </select>

                    <!-- Price Filter Button -->
                    <button class="filter-button" id="price-filter-btn">
                        <span>Price</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>

                    <!-- More Filters Button -->
                    <button class="filter-button" id="more-filters-btn">
                        <i class="fas fa-sliders-h"></i>
                        <span>More Filters</span>
                        <span class="filter-badge" id="active-filters-count" style="display: none;">0</span>
                    </button>
                </div>

                <!-- Right: Stats & Actions -->
                <div class="filter-header-right">
                    <div class="results-count">
                        <strong id="total-properties-count">0</strong> properties
                    </div>

                    <!-- Mobile View Toggle -->
                    <button class="view-toggle-btn" id="mobile-view-toggle">
                        <i class="fas fa-map"></i>
                        <span id="view-toggle-text">Map</span>
                    </button>
                </div>
            </div>

            <!-- Advanced Filters Dropdown Panel -->
            <div class="advanced-filters-panel" id="advanced-filters-panel" style="display: none;">
                <div class="advanced-filters-grid">
                    <!-- Price Range -->
                    <div class="filter-group">
                        <label>Price Range</label>
                        <div class="range-inputs">
                            <input type="number" id="price-min" placeholder="Min" class="range-input" />
                            <span class="range-separator">–</span>
                            <input type="number" id="price-max" placeholder="Max" class="range-input" />
                        </div>
                    </div>

                    <!-- Building Size -->
                    <div class="filter-group">
                        <label>Building Size (SF)</label>
                        <div class="range-inputs">
                            <input type="number" id="building-min" placeholder="Min" class="range-input" />
                            <span class="range-separator">–</span>
                            <input type="number" id="building-max" placeholder="Max" class="range-input" />
                        </div>
                    </div>

                    <!-- Lot Size -->
                    <div class="filter-group">
                        <label>Lot Size (SF)</label>
                        <div class="range-inputs">
                            <input type="number" id="lot-min" placeholder="Min" class="range-input" />
                            <span class="range-separator">–</span>
                            <input type="number" id="lot-max" placeholder="Max" class="range-input" />
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="filter-actions">
                        <button class="btn-primary btn-small" id="apply-advanced-filters">
                            Apply Filters
                        </button>
                        <button class="btn-secondary btn-small" id="clear-advanced-filters">
                            Clear All
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- SPLIT SCREEN CONTAINER -->
        <div class="split-screen-container">

            <!-- LEFT: MAP CONTAINER -->
            <div class="map-container" id="map-view">
                <!-- Leaflet Map -->
                <div id="property-map" class="property-map"></div>

                <!-- Map Controls -->
                <div class="map-controls">
                    <!-- Zoom Controls -->
                    <div class="map-control-group">
                        <button class="map-control-btn" id="zoom-in-btn" title="Zoom in">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="map-control-btn" id="zoom-out-btn" title="Zoom out">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>

                    <!-- Map Style Toggle -->
                    <button class="map-control-btn" id="map-style-btn" title="Change map style">
                        <i class="fas fa-layer-group"></i>
                    </button>

                    <!-- Recenter Button -->
                    <button class="map-control-btn" id="recenter-btn" title="Reset view">
                        <i class="fas fa-compress-arrows-alt"></i>
                    </button>
                </div>

                <!-- Map Legend -->
                <div class="map-legend">
                    <div class="legend-item">
                        <span class="legend-marker marker-available"></span>
                        <span>Available</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-marker marker-pending"></span>
                        <span>Pending</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-marker marker-sold"></span>
                        <span>Sold</span>
                    </div>
                </div>

                <!-- Redo Search Button (appears on map move) -->
                <button class="redo-search-btn" id="redo-search-btn" style="display: none;">
                    <i class="fas fa-redo"></i>
                    <span>Redo search in this area</span>
                </button>

                <!-- Map Loading Overlay -->
                <div class="map-loading-overlay" id="map-loading" style="display: none;">
                    <div class="loading-spinner-large"></div>
                    <p class="loading-text">Loading properties...</p>
                </div>
            </div>

            <!-- RIGHT: LISTINGS PANEL -->
            <div class="listings-panel" id="list-view">
                <!-- Listings Header -->
                <div class="listings-header">
                    <div class="results-info">
                        <h2 class="results-title">
                            <span id="listings-count">0</span> properties
                        </h2>
                        <p class="results-subtitle" id="listings-location">in San Francisco, CA</p>
                    </div>

                    <div class="sort-controls">
                        <label for="sort-select" class="sort-label">Sort by:</label>
                        <select id="sort-select" class="sort-select">
                            <option value="relevant">Most Relevant</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="newest">Newest First</option>
                            <option value="size-large">Largest Size</option>
                        </select>
                    </div>
                </div>

                <!-- Scrollable Listings Container -->
                <div class="listings-scroll-container" id="listings-scroll">
                    <!-- Listings Grid -->
                    <div class="listings-grid-vertical" id="listings-grid">
                        <!-- Listing cards will be inserted here dynamically -->
                    </div>

                    <!-- Infinite Scroll Loader -->
                    <div class="infinite-loader" id="infinite-loader" style="display: none;">
                        <div class="spinner-small"></div>
                        <p>Loading more properties...</p>
                    </div>
                </div>

                <!-- Empty State -->
                <div class="empty-state-container" id="listings-empty" style="display: none;">
                    <div class="empty-state-icon">
                        <i class="fas fa-search-location"></i>
                    </div>
                    <h3 class="empty-state-title">No properties found</h3>
                    <p class="empty-state-text">
                        Try adjusting your filters or search in a different area
                    </p>
                    <div class="empty-state-actions">
                        <button class="btn-primary" id="clear-all-filters">
                            Clear All Filters
                        </button>
                        <button class="btn-secondary" id="expand-search-btn">
                            Expand Search Area
                        </button>
                    </div>
                </div>

                <!-- Loading State (Skeleton) -->
                <div class="listings-loading-state" id="listings-loading" style="display: none;">
                    <div class="listing-card-skeleton"></div>
                    <div class="listing-card-skeleton"></div>
                    <div class="listing-card-skeleton"></div>
                </div>
            </div>

        </div>
    </div>

    <!-- Property Detail Modal -->
    <div class="modal" id="property-detail-modal" style="display: none;">
        <div class="modal-overlay" id="modal-overlay"></div>
        <div class="modal-content">
            <button class="modal-close" id="modal-close-btn">&times;</button>
            <div id="modal-body">
                <!-- Property details inserted here -->
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
    <script src="listings-map.js"></script>
    <script src="listings.js"></script>
</body>
</html>
```

---

## 2. Complete CSS (listings-map.css)

```css
/* =========================================
   ZILLOW-STYLE MAP VIEW STYLES
   ========================================= */

:root {
    /* Color System */
    --brand-primary: #006AFF;
    --brand-primary-dark: #0052CC;
    --brand-primary-light: #E6F2FF;

    --map-marker-default: #006AFF;
    --map-marker-hover: #FF385C;
    --map-marker-selected: #FF385C;

    --status-available: #10B981;
    --status-pending: #F59E0B;
    --status-sold: #EF4444;
    --status-new: #3B82F6;

    /* Layout */
    --header-height: 72px;
    --sidebar-width: 248px;

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    --shadow-marker: 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-marker-hover: 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* =========================================
   MAIN APP CONTAINER
   ========================================= */

.main-app-container {
    margin-left: var(--sidebar-width);
    height: 100vh;
    display: flex;
    flex-direction: column;
}

/* =========================================
   STICKY FILTER HEADER
   ========================================= */

.map-filter-header {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    height: var(--header-height);
    background: white;
    border-bottom: 1px solid #E5E7EB;
    box-shadow: var(--shadow-sm);
    z-index: 200;
    display: flex;
    flex-direction: column;
}

.filter-header-content {
    width: 100%;
    padding: 0 24px;
    height: var(--header-height);
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

.filter-header-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

/* Search Input */
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
    color: #9CA3AF;
    font-size: 14px;
    pointer-events: none;
}

.search-input {
    width: 100%;
    height: 40px;
    padding: 0 12px 0 36px;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s ease;
    background: white;
}

.search-input:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px var(--brand-primary-light);
}

/* Filter Select */
.filter-select {
    height: 40px;
    padding: 0 32px 0 12px;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
}

.filter-select:hover {
    border-color: #9CA3AF;
}

.filter-select:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px var(--brand-primary-light);
}

/* Filter Button */
.filter-button {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.filter-button:hover {
    background: #F9FAFB;
    border-color: #9CA3AF;
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
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
}

/* Results Count */
.results-count {
    font-size: 14px;
    color: #6B7280;
    white-space: nowrap;
}

.results-count strong {
    color: #111827;
    font-weight: 600;
}

/* View Toggle (Mobile Only) */
.view-toggle-btn {
    display: none;
    align-items: center;
    gap: 6px;
    height: 40px;
    padding: 0 16px;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.view-toggle-btn:hover {
    background: var(--brand-primary-dark);
}

/* Advanced Filters Panel */
.advanced-filters-panel {
    border-top: 1px solid #E5E7EB;
    background: #F9FAFB;
    padding: 20px 24px;
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
    }
    to {
        opacity: 1;
        max-height: 500px;
        padding-top: 20px;
        padding-bottom: 20px;
    }
}

.advanced-filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    align-items: end;
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.filter-group label {
    font-size: 13px;
    font-weight: 600;
    color: #6B7280;
}

.range-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
}

.range-input {
    flex: 1;
    height: 36px;
    padding: 0 12px;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 14px;
}

.range-separator {
    color: #6B7280;
    font-weight: 500;
}

.filter-actions {
    display: flex;
    gap: 8px;
}

/* =========================================
   SPLIT SCREEN CONTAINER
   ========================================= */

.split-screen-container {
    flex: 1;
    display: flex;
    overflow: hidden;
}

/* =========================================
   MAP CONTAINER (LEFT 50%)
   ========================================= */

.map-container {
    width: 50%;
    height: 100%;
    position: relative;
    background: #F3F4F6;
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
    background: white;
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    overflow: hidden;
}

.map-control-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #374151;
}

.map-control-btn:hover {
    background: #F9FAFB;
    color: var(--brand-primary);
}

.map-control-btn:active {
    background: #F3F4F6;
}

.map-control-btn:not(:first-child) {
    border-top: 1px solid #E5E7EB;
}

/* Single control buttons */
.map-controls > .map-control-btn {
    border-radius: 8px;
    box-shadow: var(--shadow-md);
}

/* Map Legend */
.map-legend {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: white;
    padding: 12px 16px;
    border-radius: 8px;
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
    color: #374151;
}

.legend-marker {
    width: 12px;
    height: 12px;
    border-radius: 9999px;
    border: 2px solid white;
    box-shadow: var(--shadow-sm);
}

.legend-marker.marker-available {
    background: var(--status-available);
}

.legend-marker.marker-pending {
    background: var(--status-pending);
}

.legend-marker.marker-sold {
    background: var(--status-sold);
}

/* Redo Search Button */
.redo-search-btn {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
    z-index: 1001;
    animation: slideDown 0.3s ease-out;
}

.redo-search-btn:hover {
    background: var(--brand-primary-dark);
    transform: translateX(-50%) translateY(-1px);
    box-shadow: var(--shadow-xl);
}

/* Map Loading Overlay */
.map-loading-overlay {
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

.loading-spinner-large {
    width: 48px;
    height: 48px;
    border: 4px solid #E5E7EB;
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    font-size: 14px;
    color: #6B7280;
    font-weight: 500;
}

/* =========================================
   CUSTOM MAP MARKERS
   ========================================= */

.custom-marker-wrapper {
    position: relative;
}

.custom-marker {
    width: auto;
    min-width: 60px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 2px solid var(--map-marker-default);
    border-radius: 12px;
    padding: 0 12px;
    box-shadow: var(--shadow-marker);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    position: relative;
    z-index: 100;
}

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
    border-top: 6px solid var(--map-marker-default);
}

.custom-marker:hover {
    background: var(--map-marker-hover);
    color: white;
    border-color: var(--map-marker-hover);
    transform: scale(1.1);
    box-shadow: var(--shadow-marker-hover);
    z-index: 200;
}

.custom-marker:hover::after {
    border-top-color: var(--map-marker-hover);
}

.custom-marker.active {
    background: var(--map-marker-selected);
    color: white;
    border-color: var(--map-marker-selected);
    transform: scale(1.15);
    box-shadow: var(--shadow-marker-hover);
    z-index: 300;
    animation: markerBounce 0.5s ease;
}

.custom-marker.active::after {
    border-top-color: var(--map-marker-selected);
}

@keyframes markerBounce {
    0%, 100% { transform: scale(1.15) translateY(0); }
    50% { transform: scale(1.15) translateY(-5px); }
}

/* Status variations */
.custom-marker.status-pending {
    border-color: var(--status-pending);
}

.custom-marker.status-sold {
    border-color: var(--status-sold);
    opacity: 0.7;
}

/* Marker Clusters */
.marker-cluster {
    background: var(--brand-primary);
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    box-shadow: var(--shadow-md);
    border: 3px solid white;
    transition: all 0.2s ease;
}

.marker-cluster:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-lg);
}

.marker-cluster.large {
    width: 50px;
    height: 50px;
    font-size: 16px;
}

/* =========================================
   LISTINGS PANEL (RIGHT 50%)
   ========================================= */

.listings-panel {
    width: 50%;
    height: 100%;
    background: #F9FAFB;
    display: flex;
    flex-direction: column;
}

/* Listings Header */
.listings-header {
    padding: 24px;
    background: white;
    border-bottom: 1px solid #E5E7EB;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-shrink: 0;
}

.results-info {
    flex: 1;
}

.results-title {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 4px 0;
}

.results-subtitle {
    font-size: 14px;
    color: #6B7280;
    margin: 0;
}

.sort-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.sort-label {
    font-size: 14px;
    color: #6B7280;
}

.sort-select {
    height: 36px;
    padding: 0 32px 0 12px;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
}

/* Scrollable Container */
.listings-scroll-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
}

.listings-scroll-container::-webkit-scrollbar {
    width: 8px;
}

.listings-scroll-container::-webkit-scrollbar-track {
    background: #F3F4F6;
}

.listings-scroll-container::-webkit-scrollbar-thumb {
    background: #D1D5DB;
    border-radius: 4px;
}

.listings-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #9CA3AF;
}

/* Listings Grid */
.listings-grid-vertical {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* =========================================
   LISTING CARD (HORIZONTAL)
   ========================================= */

.listing-card-horizontal {
    display: flex;
    background: white;
    border-radius: 12px;
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

/* Card Image Section */
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

/* Status Badge */
.status-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.status-badge.status-new {
    background: var(--status-new);
    color: white;
}

.status-badge.status-pending {
    background: var(--status-pending);
    color: white;
}

.status-badge.status-sold {
    background: var(--status-sold);
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
    border-radius: 8px;
    cursor: pointer;
    color: #374151;
    transition: all 0.2s ease;
}

.quick-action-btn:hover {
    background: white;
    color: var(--brand-primary);
    transform: scale(1.1);
}

.quick-action-btn.active {
    color: #EF4444;
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
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
}

/* Card Content Section */
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
    color: #111827;
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
    color: #6B7280;
}

.card-location i {
    color: #9CA3AF;
}

/* Details Grid */
.card-details-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding: 12px 0;
    border-top: 1px solid #E5E7EB;
    border-bottom: 1px solid #E5E7EB;
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
    background: #F3F4F6;
    border-radius: 8px;
    color: #6B7280;
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
    color: #111827;
    line-height: 1;
}

.detail-label {
    font-size: 11px;
    color: #6B7280;
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
    background: #F3F4F6;
    color: #374151;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
}

/* Card Footer */
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
    color: #6B7280;
}

.agent-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
}

.listed-date {
    font-size: 13px;
    color: #9CA3AF;
}

/* =========================================
   LOADING & EMPTY STATES
   ========================================= */

.infinite-loader {
    padding: 32px;
    text-align: center;
    color: #6B7280;
    font-size: 14px;
}

.spinner-small {
    width: 24px;
    height: 24px;
    border: 3px solid #E5E7EB;
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 12px;
}

/* Empty State */
.empty-state-container {
    padding: 80px 40px;
    text-align: center;
    background: white;
    border-radius: 12px;
    margin: 20px 24px;
}

.empty-state-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F3F4F6;
    border-radius: 50%;
    color: #9CA3AF;
    font-size: 36px;
}

.empty-state-title {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 12px 0;
}

.empty-state-text {
    font-size: 16px;
    color: #6B7280;
    margin: 0 0 32px 0;
}

.empty-state-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}

/* Loading Skeleton */
.listing-card-skeleton {
    display: flex;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    height: 240px;
    margin-bottom: 16px;
}

.skeleton-image {
    width: 280px;
    background: linear-gradient(
        90deg,
        #E5E7EB 25%,
        #F3F4F6 50%,
        #E5E7EB 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* =========================================
   BUTTONS
   ========================================= */

.btn-primary {
    padding: 10px 20px;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary:hover {
    background: var(--brand-primary-dark);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.btn-secondary {
    padding: 10px 20px;
    background: white;
    color: #6B7280;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-secondary:hover {
    background: #F9FAFB;
    color: #111827;
}

.btn-small {
    padding: 6px 12px;
    font-size: 13px;
}

/* =========================================
   RESPONSIVE DESIGN
   ========================================= */

/* Tablet (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
    .main-app-container {
        margin-left: 0;
    }

    .split-screen-container {
        flex-direction: column;
    }

    .map-container {
        width: 100%;
        height: 400px;
    }

    .listings-panel {
        width: 100%;
        height: auto;
        min-height: 600px;
    }

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

/* Mobile (<768px) */
@media (max-width: 767px) {
    .main-app-container {
        margin-left: 0;
    }

    .filter-header-content {
        flex-direction: column;
        align-items: stretch;
        height: auto;
        padding: 12px 16px;
    }

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

    .filter-header-right {
        width: 100%;
        justify-content: space-between;
    }

    .view-toggle-btn {
        display: flex;
    }

    .split-screen-container {
        flex-direction: column;
    }

    .map-container,
    .listings-panel {
        width: 100%;
    }

    .map-container {
        height: calc(100vh - 200px);
    }

    .listings-panel {
        height: auto;
        min-height: calc(100vh - 200px);
    }

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

    .advanced-filters-grid {
        grid-template-columns: 1fr;
    }
}
```

---

## 3. JavaScript Initialization (listings-map.js)

```javascript
// =========================================
// ZILLOW-STYLE MAP & LISTINGS
// =========================================

let map;
let markersLayer;
let properties = [];
let selectedPropertyId = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeEventListeners();
    loadProperties();
});

// =========================================
// MAP INITIALIZATION
// =========================================

function initializeMap() {
    // Create map
    map = L.map('property-map', {
        center: [37.7749, -122.4194], // San Francisco
        zoom: 12,
        scrollWheelZoom: true,
        zoomControl: false,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
    }).addTo(map);

    // Create marker cluster group
    markersLayer = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        chunkedLoading: true,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 10) size = 'medium';
            if (count > 50) size = 'large';

            return L.divIcon({
                html: `<div class="marker-cluster ${size}">${count}</div>`,
                className: 'marker-cluster-wrapper',
                iconSize: L.point(40, 40),
            });
        }
    });

    map.addLayer(markersLayer);
}

// =========================================
// CREATE CUSTOM MARKERS
// =========================================

function createMarker(property) {
    const price = formatPrice(property.price);

    const icon = L.divIcon({
        className: 'custom-marker-wrapper',
        html: `
            <div class="custom-marker ${property.status ? 'status-' + property.status : ''}"
                 data-property-id="${property.id}">
                ${price}
            </div>
        `,
        iconSize: [60, 36],
        iconAnchor: [30, 42],
        popupAnchor: [0, -42],
    });

    const marker = L.marker([property.lat, property.lng], {
        icon: icon,
        propertyId: property.id,
    });

    // Click event
    marker.on('click', function() {
        selectProperty(property.id);
        scrollToListing(property.id);
    });

    return marker;
}

// =========================================
// LOAD & RENDER PROPERTIES
// =========================================

async function loadProperties() {
    try {
        showMapLoading();

        // Fetch properties from API
        const response = await fetch('/api/properties');
        const data = await response.json();

        properties = data.properties || [];

        renderMarkers();
        renderListings();
        updateResultsCount();

        hideMapLoading();
    } catch (error) {
        console.error('Error loading properties:', error);
        showError('Failed to load properties');
    }
}

function renderMarkers() {
    markersLayer.clearLayers();

    properties.forEach(property => {
        if (property.lat && property.lng) {
            const marker = createMarker(property);
            markersLayer.addLayer(marker);
        }
    });
}

function renderListings() {
    const grid = document.getElementById('listings-grid');
    grid.innerHTML = '';

    if (properties.length === 0) {
        showEmptyState();
        return;
    }

    properties.forEach(property => {
        const card = createListingCard(property);
        grid.appendChild(card);
    });
}

// =========================================
// CREATE LISTING CARD
// =========================================

function createListingCard(property) {
    const card = document.createElement('div');
    card.className = 'listing-card-horizontal';
    card.dataset.propertyId = property.id;

    card.innerHTML = `
        <div class="listing-card-image">
            <img src="${property.image || '/images/placeholder.jpg'}" alt="${property.title}" />
            ${property.status === 'new' ? '<div class="status-badge status-new">New</div>' : ''}
            <div class="card-quick-actions">
                <button class="quick-action-btn" title="Save">
                    <i class="far fa-heart"></i>
                </button>
                <button class="quick-action-btn" title="Share">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
            <div class="image-counter">
                <i class="fas fa-camera"></i>
                <span>${property.imageCount || 1}</span>
            </div>
        </div>
        <div class="listing-card-content">
            <div class="card-header">
                <h3 class="card-title">${property.title}</h3>
                <div class="card-price">${formatPrice(property.price)}</div>
            </div>
            <div class="card-location">
                <i class="fas fa-map-marker-alt"></i>
                <span>${property.address}, ${property.city}, ${property.state}</span>
            </div>
            <div class="card-details-grid">
                <div class="detail-item">
                    <span class="detail-icon"><i class="fas fa-building"></i></span>
                    <div class="detail-info">
                        <span class="detail-value">${formatNumber(property.buildingSize)}</span>
                        <span class="detail-label">SF Building</span>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="detail-icon"><i class="fas fa-vector-square"></i></span>
                    <div class="detail-info">
                        <span class="detail-value">${formatNumber(property.lotSize)}</span>
                        <span class="detail-label">SF Lot</span>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="detail-icon"><i class="fas fa-dollar-sign"></i></span>
                    <div class="detail-info">
                        <span class="detail-value">$${property.pricePerSF || 0}</span>
                        <span class="detail-label">Price/SF</span>
                    </div>
                </div>
                <div class="detail-item">
                    <span class="detail-icon"><i class="fas fa-calendar"></i></span>
                    <div class="detail-info">
                        <span class="detail-value">${property.yearBuilt || 'N/A'}</span>
                        <span class="detail-label">Year Built</span>
                    </div>
                </div>
            </div>
            <div class="card-tags">
                ${property.tags ? property.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
            </div>
            <div class="card-footer">
                <div class="listed-by">
                    <img src="${property.agent?.avatar || '/images/agent-placeholder.jpg'}" class="agent-avatar" />
                    <span class="agent-name">Listed by ${property.agent?.name || 'Agent'}</span>
                </div>
                <span class="listed-date">${formatDate(property.listedDate)}</span>
            </div>
        </div>
    `;

    // Add event listeners
    card.addEventListener('click', () => {
        selectProperty(property.id);
        centerMapOnProperty(property);
    });

    card.addEventListener('mouseenter', () => {
        highlightMarker(property.id);
    });

    card.addEventListener('mouseleave', () => {
        unhighlightMarker(property.id);
    });

    return card;
}

// =========================================
// SYNCHRONIZATION
// =========================================

function selectProperty(propertyId) {
    selectedPropertyId = propertyId;

    // Update listing cards
    document.querySelectorAll('.listing-card-horizontal').forEach(card => {
        if (card.dataset.propertyId === propertyId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Update markers
    document.querySelectorAll('.custom-marker').forEach(marker => {
        if (marker.dataset.propertyId === propertyId) {
            marker.classList.add('active');
        } else {
            marker.classList.remove('active');
        }
    });
}

function scrollToListing(propertyId) {
    const card = document.querySelector(`[data-property-id="${propertyId}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function centerMapOnProperty(property) {
    if (property.lat && property.lng) {
        map.flyTo([property.lat, property.lng], 15, {
            duration: 1.5,
            easeLinearity: 0.5,
        });
    }
}

function highlightMarker(propertyId) {
    const marker = document.querySelector(`[data-property-id="${propertyId}"].custom-marker`);
    if (marker && !marker.classList.contains('active')) {
        marker.classList.add('hover');
    }
}

function unhighlightMarker(propertyId) {
    const marker = document.querySelector(`[data-property-id="${propertyId}"].custom-marker`);
    if (marker) {
        marker.classList.remove('hover');
    }
}

// =========================================
// EVENT LISTENERS
// =========================================

function initializeEventListeners() {
    // Zoom controls
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
        map.zoomIn();
    });

    document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
        map.zoomOut();
    });

    // Recenter button
    document.getElementById('recenter-btn')?.addEventListener('click', () => {
        map.setView([37.7749, -122.4194], 12);
    });

    // Filter toggles
    document.getElementById('more-filters-btn')?.addEventListener('click', () => {
        toggleAdvancedFilters();
    });

    // Apply filters
    document.getElementById('apply-advanced-filters')?.addEventListener('click', () => {
        applyFilters();
    });

    // Clear filters
    document.getElementById('clear-advanced-filters')?.addEventListener('click', () => {
        clearFilters();
    });

    // Sort change
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
        sortProperties(e.target.value);
    });
}

// =========================================
// HELPER FUNCTIONS
// =========================================

function formatPrice(price) {
    if (price >= 1000000) {
        return '$' + (price / 1000000).toFixed(1) + 'M';
    } else if (price >= 1000) {
        return '$' + (price / 1000).toFixed(0) + 'K';
    }
    return '$' + price.toLocaleString();
}

function formatNumber(num) {
    if (!num) return 'N/A';
    return num.toLocaleString();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
}

function showMapLoading() {
    document.getElementById('map-loading').style.display = 'flex';
}

function hideMapLoading() {
    document.getElementById('map-loading').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('listings-empty').style.display = 'block';
    document.getElementById('listings-grid').style.display = 'none';
}

function hideEmptyState() {
    document.getElementById('listings-empty').style.display = 'none';
    document.getElementById('listings-grid').style.display = 'flex';
}

function updateResultsCount() {
    const count = properties.length;
    document.getElementById('total-properties-count').textContent = count;
    document.getElementById('listings-count').textContent = count;
}

function toggleAdvancedFilters() {
    const panel = document.getElementById('advanced-filters-panel');
    const btn = document.getElementById('more-filters-btn');

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.classList.add('active');
    } else {
        panel.style.display = 'none';
        btn.classList.remove('active');
    }
}

function applyFilters() {
    // Implement filter logic
    console.log('Applying filters...');
    loadProperties(); // Reload with filters
}

function clearFilters() {
    // Clear all filter inputs
    document.querySelectorAll('.filter-select').forEach(select => {
        select.value = '';
    });
    document.querySelectorAll('.range-input').forEach(input => {
        input.value = '';
    });
    loadProperties();
}

function sortProperties(sortBy) {
    // Implement sorting logic
    console.log('Sorting by:', sortBy);
}
```

---

## 4. Sample Data for Testing

```javascript
// Sample property data
const sampleProperties = [
    {
        id: '1',
        title: 'Modern Office Building in SOMA',
        subtitle: 'Prime Location with High Traffic',
        address: '123 Market Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94103',
        lat: 37.7879,
        lng: -122.4075,
        price: 8500000,
        pricePerSF: 189,
        propertyType: 'Office',
        buildingSize: 45000,
        lotSize: 12000,
        yearBuilt: 1985,
        status: 'available',
        listedDate: '2025-11-04',
        image: '/images/property-1.jpg',
        imageCount: 12,
        agent: {
            name: 'John Smith',
            avatar: '/images/agent-1.jpg',
        },
        tags: ['Office', 'High-Traffic', 'Parking'],
    },
    // Add more properties...
];
```

---

## Implementation Checklist

- [ ] Add Leaflet CSS and JS to HTML
- [ ] Create `listings-map.css` file
- [ ] Create `listings-map.js` file
- [ ] Update HTML structure for split-screen
- [ ] Initialize Leaflet map
- [ ] Create custom marker styles
- [ ] Implement marker-to-listing sync
- [ ] Add filter functionality
- [ ] Test responsive layout
- [ ] Add loading states
- [ ] Implement infinite scroll
- [ ] Test on mobile devices

---

**Files:**
- `/Users/default/property-dashboard/ZILLOW_DESIGN_SPEC.md` (Complete specs)
- `/Users/default/property-dashboard/ZILLOW_QUICK_REFERENCE.md` (Quick ref)
- `/Users/default/property-dashboard/ZILLOW_IMPLEMENTATION_GUIDE.md` (This file)
