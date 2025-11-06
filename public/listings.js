// ===== State Management =====
let currentPage = 1;
const ITEMS_PER_PAGE = 25;
let allLoadedListings = []; // Store all listings for the selected state
let currentFilters = {
    search: '',
    property_type: '',
    city: '',
    state_code: '',
    price_min: '',
    price_max: '',
    building_size_min: '',
    building_size_max: '',
    lot_size_min: '',
    lot_size_max: '',
    sort_by: 'last_updated',
    sort_order: 'desc'
};
let totalPages = 1;
let availableFilters = {
    propertyTypes: [],
    cities: [],
    states: []
};
let autoRefreshInterval = null;

// ===== Map State Management =====
let map = null;
let markerLayerGroup = null; // Changed from markerClusterGroup - NO CLUSTERING
let markers = new Map(); // listing_id -> marker reference
let currentListingsData = []; // Cache of current listings
let mapBounds = null;
let clusteringEnabled = false; // DISABLED BY DEFAULT
let selectedMarkerId = null;
let defaultMapCenter = [39.8283, -98.5795]; // Geographic center of USA
let defaultMapZoom = 5;
let allStatesLayer = null; // Layer for all state boundaries
let currentSelectedState = null; // Currently selected state code

// Debounce function for map events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== DOM Elements =====
const elements = {
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    emptyState: document.getElementById('empty-state'),
    listingsGrid: document.getElementById('listings-grid'),
    pagination: document.getElementById('pagination'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    pageInfo: document.getElementById('page-info'),
    resultsCount: document.getElementById('results-count'),
    totalListings: document.getElementById('total-listings'),
    errorMessage: document.getElementById('error-message'),
    advancedFilters: document.getElementById('advanced-filters'),
    toggleAdvancedFilters: document.getElementById('toggle-advanced-filters'),

    // Filter inputs
    searchInput: document.getElementById('search-input'),
    propertyType: document.getElementById('property-type'),
    city: document.getElementById('city'),
    state: document.getElementById('state'),
    priceMin: document.getElementById('price-min'),
    priceMax: document.getElementById('price-max'),
    buildingSizeMin: document.getElementById('building-size-min'),
    buildingSizeMax: document.getElementById('building-size-max'),
    lotSizeMin: document.getElementById('lot-size-min'),
    lotSizeMax: document.getElementById('lot-size-max'),
    sortBy: document.getElementById('sort-by'),
    sortOrder: document.getElementById('sort-order'),

    // Buttons
    applyFilters: document.getElementById('apply-filters'),
    clearFilters: document.getElementById('clear-filters'),
    clearFiltersEmpty: document.getElementById('clear-filters-empty'),
    retryButton: document.getElementById('retry-button'),

    // Modal
    modal: document.getElementById('property-modal'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalClose: document.getElementById('modal-close'),
    modalBody: document.getElementById('modal-body')
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    initializeMap();
    await autoSelectState();
    loadListings();
    loadStats();
    // startAutoRefresh(); // Disabled: only load once per state selection
});

// ===== Event Listeners =====
function initializeEventListeners() {
    // Pagination
    elements.prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCurrentPage();
            updatePagination();
            updateResultsCount();
            // Scroll to top of listings
            elements.listingsGrid.scrollTop = 0;
        }
    });

    elements.nextPage.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderCurrentPage();
            updatePagination();
            updateResultsCount();
            // Scroll to top of listings
            elements.listingsGrid.scrollTop = 0;
        }
    });

    // Filters
    elements.applyFilters.addEventListener('click', applyFilters);
    elements.clearFilters.addEventListener('click', clearFilters);
    elements.clearFiltersEmpty.addEventListener('click', clearFilters);
    elements.retryButton.addEventListener('click', loadListings);

    // State dropdown change
    elements.state.addEventListener('change', async () => {
        currentPage = 1;
        currentFilters.state_code = elements.state.value;

        // Snap map to selected state
        if (elements.state.value) {
            await snapMapToState(elements.state.value);
        }

        loadListings();
    });

    // Toggle advanced filters
    elements.toggleAdvancedFilters.addEventListener('click', () => {
        const panel = elements.advancedFilters;
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    });

    // Enter key on search
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });

    // Modal close
    elements.modalClose.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', closeModal);
}

// ===== Map Initialization =====
async function initializeMap() {
    const mapLoading = document.getElementById('map-loading');
    if (mapLoading) mapLoading.style.display = 'block';

    try {
        // Get optimal default map center
        const defaultState = await getDefaultMapCenter();

        // Initialize Leaflet map
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false,  // Disable attribution
            minZoom: 3,
            maxZoom: 18
        }).setView(defaultState.center, defaultState.zoom);

        // Add Carto light tiles (professional style)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '',  // Remove attribution text
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Add zoom control (bottom right)
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        // Initialize marker layer group (NO CLUSTERING)
        markerLayerGroup = L.layerGroup();
        markerLayerGroup.addTo(map);

        // Map event listeners
        map.on('moveend', debounce(handleMapMoveEnd, 500));
        map.on('zoomend', handleMapZoomEnd);

        // Custom control event listeners
        document.getElementById('recenter-map').addEventListener('click', recenterMap);

        // Toggle clusters button - hidden by default since clustering is disabled
        const toggleClustersBtn = document.getElementById('toggle-clusters');
        if (toggleClustersBtn) {
            toggleClustersBtn.style.display = 'none'; // Hide clustering toggle
        }

        const resetButton = document.getElementById('reset-filters');
        if (resetButton) {
            resetButton.addEventListener('click', resetMapView);
        }

        if (mapLoading) mapLoading.style.display = 'none';
        console.log('Map initialized successfully (clustering disabled)');

    } catch (error) {
        console.error('Error initializing map:', error);
        if (mapLoading) {
            mapLoading.innerHTML = '<p class="error-message">Failed to load map</p>';
        }
    }
}

// Get default map center
async function getDefaultMapCenter() {
    try {
        const response = await fetch('/api/loopnet/map-center');
        const result = await response.json();

        if (result.success && result.center) {
            return {
                center: [result.center.latitude, result.center.longitude],
                zoom: result.center.zoom || 7
            };
        }
    } catch (error) {
        console.error('Error getting default map center:', error);
    }

    return {
        center: defaultMapCenter,
        zoom: defaultMapZoom
    };
}

// Map Event Handlers
function handleMapMoveEnd() {
    mapBounds = map.getBounds();
    updateVisibleCount();
}

function handleMapZoomEnd() {
    mapBounds = map.getBounds();
    updateVisibleCount();
}

function recenterMap() {
    if (currentListingsData.length > 0 && markers.size > 0) {
        const bounds = L.latLngBounds();
        markers.forEach(marker => {
            bounds.extend(marker.getLatLng());
        });
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    } else {
        map.setView(defaultMapCenter, defaultMapZoom);
    }
}

function resetMapView() {
    clearFilters();
    recenterMap();
}

// Get property type icon SVG
function getPropertyTypeIcon(propertyType) {
    const type = (propertyType || '').toLowerCase();

    // Retail
    if (type.includes('retail') || type.includes('store') || type.includes('shopping')) {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>';
    }

    // Office
    if (type.includes('office')) {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>';
    }

    // Industrial/Warehouse
    if (type.includes('industrial') || type.includes('warehouse') || type.includes('manufacturing')) {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M22 21V7L14 3v4l-8-4v18h16zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm6 8h-4v-2h2v-2h-2v-2h2v-2h-2V9h4v10z"/></svg>';
    }

    // Land
    if (type.includes('land')) {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z"/></svg>';
    }

    // Multifamily/Apartment
    if (type.includes('multi') || type.includes('apartment') || type.includes('residential')) {
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z"/></svg>';
    }

    // Default - Building icon
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 15.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>';
}

// Marker Management
function createMarkerForListing(listing) {
    if (!listing.latitude || !listing.longitude) return null;

    const lat = parseFloat(listing.latitude);
    const lon = parseFloat(listing.longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return null;
    }

    // Get icon based on property type
    const iconSvg = getPropertyTypeIcon(listing.property_type);

    const marker = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'custom-marker-icon',
            html: iconSvg,
            iconSize: [40, 40],
            iconAnchor: [20, 40], // Bottom-center of the circle
            popupAnchor: [0, -40]
        }),
        title: listing.title || 'Property'
    });

    const popupContent = createMarkerPopup(listing);
    marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
    });

    marker.on('click', () => handleMarkerClick(listing, marker));
    marker.on('mouseover', () => handleMarkerHover(listing, marker, true));
    marker.on('mouseout', () => handleMarkerHover(listing, marker, false));

    markers.set(listing.listing_id, marker);
    return marker;
}

function createMarkerPopup(listing) {
    const price = listing.price || 'Contact for Price';
    const location = [listing.city, listing.state_code].filter(Boolean).join(', ');
    const imageUrl = listing.primary_image_url || 'https://via.placeholder.com/300x200?text=No+Image';

    return `
        <div class="marker-popup">
            <img src="${imageUrl}" alt="${listing.title}"
                 onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            <div class="marker-popup-content">
                <div class="marker-popup-price">${price}</div>
                <h4>${listing.title || 'Untitled Property'}</h4>
                <p>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C5.243 0 3 2.243 3 5c0 3.375 5 11 5 11s5-7.625 5-11c0-2.757-2.243-5-5-5zm0 7.5c-1.381 0-2.5-1.119-2.5-2.5S6.619 2.5 8 2.5s2.5 1.119 2.5 2.5S9.381 7.5 8 7.5z"/>
                    </svg>
                    ${location}
                </p>
                <button onclick="scrollToListing('${listing.listing_id}')">
                    View Details
                </button>
            </div>
        </div>
    `;
}

function addMarkersToMap(listings) {
    // Clear existing markers
    markerLayerGroup.clearLayers();
    markers.clear();

    const validMarkers = [];
    listings.forEach(listing => {
        const marker = createMarkerForListing(listing);
        if (marker) {
            validMarkers.push(marker);
            markerLayerGroup.addLayer(marker);
        }
    });

    console.log(`Added ${validMarkers.length} markers to map (clustering disabled)`);

    // Fit bounds to show all markers on first load
    if (validMarkers.length > 0 && !mapBounds) {
        setTimeout(() => {
            const bounds = L.latLngBounds();
            markers.forEach(marker => {
                bounds.extend(marker.getLatLng());
            });
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }, 100);
    }
}

// Marker Interaction Handlers
function handleMarkerClick(listing, marker) {
    if (selectedMarkerId) {
        const prevMarker = markers.get(selectedMarkerId);
        if (prevMarker) {
            const prevIcon = prevMarker.getElement();
            if (prevIcon) prevIcon.classList.remove('marker-selected');
        }
    }

    selectedMarkerId = listing.listing_id;
    const markerIcon = marker.getElement();
    if (markerIcon) markerIcon.classList.add('marker-selected');

    // Smooth zoom to property
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom < 14 ? 14 : currentZoom;

    map.flyTo(marker.getLatLng(), targetZoom, {
        duration: 1.5,
        easeLinearity: 0.25
    });

    scrollToListing(listing.listing_id);
}

function handleMarkerHover(listing, marker, isHovering) {
    const markerIcon = marker.getElement();
    if (!markerIcon) return;

    if (isHovering) {
        markerIcon.classList.add('marker-hovered');
        highlightListing(listing.listing_id, true);
    } else {
        markerIcon.classList.remove('marker-hovered');
        highlightListing(listing.listing_id, false);
    }
}

// Listing Interaction Handlers
function scrollToListing(listingId) {
    const listingCard = document.querySelector(`[data-listing-id="${listingId}"]`);
    if (listingCard) {
        listingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        listingCard.classList.add('scroll-highlight');
        setTimeout(() => {
            listingCard.classList.remove('scroll-highlight');
        }, 1500);
    }
}

function highlightListing(listingId, shouldHighlight) {
    const listingCard = document.querySelector(`[data-listing-id="${listingId}"]`);
    if (listingCard) {
        if (shouldHighlight) {
            listingCard.classList.add('highlighted');
        } else {
            listingCard.classList.remove('highlighted');
        }
    }
}

function updateVisibleCount() {
    if (!mapBounds) return;

    const visibleCount = currentListingsData.filter(listing => {
        if (!listing.latitude || !listing.longitude) return false;
        const lat = parseFloat(listing.latitude);
        const lon = parseFloat(listing.longitude);
        return mapBounds.contains([lat, lon]);
    }).length;

    const countElement = document.getElementById('visible-count');
    if (countElement) {
        countElement.textContent = visibleCount;
    }
}

// Make scrollToListing globally accessible for popup buttons
window.scrollToListing = scrollToListing;

// Auto-select state with most properties
async function autoSelectState() {
    try {
        const response = await fetch('/api/loopnet/map-center');
        const result = await response.json();

        if (result.success && result.center && result.center.state_code) {
            const stateCode = result.center.state_code;
            currentFilters.state_code = stateCode;

            // Snap map to state and draw boundary
            await snapMapToState(stateCode);
        }
    } catch (error) {
        console.error('Error auto-selecting state:', error);
    }
}

// Snap map to selected state
async function snapMapToState(stateCode) {
    try {
        const response = await fetch(`/api/loopnet/state-bounds/${stateCode}`);
        const result = await response.json();

        if (result.success && result.bounds && map) {
            const { center, zoom, bounds: stateBounds } = result.bounds;

            // Fit map to state bounds with generous padding to zoom out more
            if (stateBounds && stateBounds.north && stateBounds.south && stateBounds.east && stateBounds.west) {
                const bounds = L.latLngBounds(
                    [stateBounds.south, stateBounds.west],
                    [stateBounds.north, stateBounds.east]
                );
                // Use larger padding to zoom out more and center better
                map.fitBounds(bounds, {
                    padding: [100, 100],  // More padding = less zoom
                    maxZoom: 8            // Limit maximum zoom level
                });
            } else if (center) {
                // Fallback to center point with lower zoom
                map.setView([center.latitude, center.longitude], Math.min(zoom || 7, 7));
            }

            // Draw state boundary
            await drawStateBoundary(stateCode);
        }
    } catch (error) {
        console.error('Error snapping to state:', error);
    }
}

// Draw all state boundaries with interactive selection
async function drawStateBoundary(selectedStateCode) {
    try {
        // Remove existing boundaries if present
        if (allStatesLayer) {
            map.removeLayer(allStatesLayer);
            allStatesLayer = null;
        }

        currentSelectedState = selectedStateCode;

        // Map state codes to full names for the GeoJSON API
        const stateCodeToName = {
            'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
            'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
            'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
            'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
            'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
            'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
            'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
            'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
            'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
            'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
            'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
            'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
            'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
        };

        // Create reverse mapping
        const stateNameToCode = {};
        for (let [code, name] of Object.entries(stateCodeToName)) {
            stateNameToCode[name] = code;
        }

        // Fetch all state boundaries from public GeoJSON API
        const geoJsonUrl = `https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json`;
        const response = await fetch(geoJsonUrl);
        const geojson = await response.json();

        // Create a GeoJSON layer with all states
        allStatesLayer = L.geoJSON(geojson, {
            style: function(feature) {
                const stateName = feature.properties.name;
                const stateCode = stateNameToCode[stateName];
                const isSelected = stateCode === selectedStateCode;

                if (isSelected) {
                    // Selected state always shows blue border
                    return {
                        color: '#3b82f6',
                        weight: 3,
                        opacity: 1,
                        fillColor: 'transparent',
                        fillOpacity: 0
                    };
                } else {
                    // Other states invisible by default
                    return {
                        color: 'transparent',
                        weight: 3,
                        opacity: 0,
                        fillColor: 'transparent',
                        fillOpacity: 0
                    };
                }
            },
            onEachFeature: function(feature, layer) {
                const stateName = feature.properties.name;
                const stateCode = stateNameToCode[stateName];
                const isSelected = stateCode === selectedStateCode;

                if (stateCode) {
                    // Only add hover effects to NON-selected states
                    if (!isSelected) {
                        layer.on('mouseover', function(e) {
                            e.target.setStyle({
                                color: '#3b82f6',           // Blue outline
                                weight: 3,
                                opacity: 1,
                                fillColor: '#3b82f6',
                                fillOpacity: 0.12
                            });
                        });

                        layer.on('mouseout', function(e) {
                            e.target.setStyle({
                                color: 'transparent',
                                weight: 3,
                                opacity: 0,
                                fillColor: 'transparent',
                                fillOpacity: 0
                            });
                        });

                        layer.on('click', async function(e) {
                            // Select this state
                            currentFilters.state_code = stateCode;
                            elements.state.value = stateCode;

                            // Snap to state and reload
                            await snapMapToState(stateCode);
                            loadListings();
                        });

                        // Add tooltip only to non-selected states
                        layer.bindTooltip(stateName, {
                            permanent: false,
                            direction: 'center',
                            className: 'state-tooltip'
                        });
                    }
                }
            }
        }).addTo(map);

        console.log(`Drew all US states with ${selectedStateCode} selected`);
    } catch (error) {
        console.error('Error drawing state boundaries:', error);
    }
}

// ===== API Calls =====
async function loadListings() {
    showLoading();

    try {
        // Build query params - load all properties for selected state
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10000, // High limit to get all properties in a state
            ...currentFilters
        });

        // Remove empty values
        for (let [key, value] of [...params.entries()]) {
            if (!value) params.delete(key);
        }

        const response = await fetch(`/api/loopnet/listings?${params}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to load listings');
        }

        // Store all loaded listings
        allLoadedListings = result.data;

        // Calculate pagination based on ITEMS_PER_PAGE
        totalPages = Math.ceil(allLoadedListings.length / ITEMS_PER_PAGE);

        // Update state
        availableFilters = result.filters;

        // Update UI
        populateFilterDropdowns(result.filters);
        renderCurrentPage();
        updatePagination();
        updateResultsCount();

        // Show/hide empty state
        if (allLoadedListings.length === 0) {
            showEmptyState();
        } else {
            hideAllStates();
        }

    } catch (error) {
        console.error('Error loading listings:', error);
        showError(error.message);
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/loopnet/stats');
        const result = await response.json();

        if (result.success) {
            elements.totalListings.textContent = `${result.stats.totalListings.toLocaleString()} Total Listings`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadPropertyDetails(listingId, stateId) {
    try {
        const response = await fetch(`/api/loopnet/listings/${listingId}/${stateId}`);
        const result = await response.json();

        if (result.success) {
            showPropertyModal(result.data);
        } else {
            alert('Failed to load property details');
        }
    } catch (error) {
        console.error('Error loading property details:', error);
        alert('Failed to load property details');
    }
}

// ===== Rendering Functions =====
function renderCurrentPage() {
    // Calculate start and end indices for current page
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageListings = allLoadedListings.slice(startIndex, endIndex);

    // Clear and render
    elements.listingsGrid.innerHTML = '';

    // Store all listings for map interactions (not just current page)
    currentListingsData = allLoadedListings;

    pageListings.forEach(listing => {
        const card = createListingCard(listing);
        elements.listingsGrid.appendChild(card);
    });

    // Update map markers with ALL listings (not just current page)
    if (map) {
        addMarkersToMap(allLoadedListings);
        updateVisibleCount();
    }
}

function renderListings(listings) {
    elements.listingsGrid.innerHTML = '';

    // Store current listings for map interactions
    currentListingsData = listings;

    listings.forEach(listing => {
        const card = createListingCard(listing);
        elements.listingsGrid.appendChild(card);
    });

    // Update map markers
    if (map) {
        addMarkersToMap(listings);
        updateVisibleCount();
    }
}

function createListingCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card';
    card.setAttribute('data-listing-id', listing.listing_id);
    card.onclick = () => loadPropertyDetails(listing.listing_id, listing.state_id);

    // Add hover event to highlight marker
    card.onmouseenter = () => {
        const marker = markers.get(listing.listing_id);
        if (marker) {
            const markerIcon = marker.getElement();
            if (markerIcon) markerIcon.classList.add('marker-hovered');
        }
    };

    card.onmouseleave = () => {
        const marker = markers.get(listing.listing_id);
        if (marker) {
            const markerIcon = marker.getElement();
            if (markerIcon) markerIcon.classList.remove('marker-hovered');
        }
    };

    // Format price
    let priceDisplay = 'Contact for Price';
    if (listing.price) {
        const priceStr = listing.price.toString();

        // Check if already formatted with M or K
        if (priceStr.includes('M') || priceStr.includes('K')) {
            // Already formatted, just ensure it has $ prefix
            priceDisplay = priceStr.startsWith('$') ? priceStr : '$' + priceStr;
        } else {
            // Parse and format raw number
            const priceNum = parseFloat(priceStr.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(priceNum)) {
                priceDisplay = priceNum >= 1000000
                    ? '$' + (priceNum / 1000000).toFixed(3) + 'M'
                    : priceNum >= 1000
                    ? '$' + (priceNum / 1000).toFixed(0) + 'K'
                    : '$' + Math.round(priceNum).toLocaleString();
            }
        }
    }

    // Format location
    const city = listing.city || '';
    const stateCode = listing.state_code || '';
    const zipCode = listing.zip_code || '';
    const fullLocation = [city, stateCode, zipCode].filter(Boolean).join(', ') || 'Location Not Available';

    // Get property type
    const propertyType = listing.property_type || 'Commercial';
    const isLand = propertyType.toLowerCase().includes('land');

    // Build size/type line
    let sizeTypeLine = '';
    if (listing.building_size) {
        sizeTypeLine = `${listing.building_size} ${propertyType} Available`;
    } else if (listing.lot_size) {
        sizeTypeLine = `${listing.lot_size} ${propertyType} Available`;
    } else {
        sizeTypeLine = `${propertyType} Available`;
    }

    // Build key details list (1/3 column)
    let detailsList = [];

    if (listing.year_built) {
        detailsList.push(`Built in ${listing.year_built}`);
    }

    if (listing.price) {
        const priceNum = parseFloat(listing.price.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(priceNum)) {
            const pricePerSF = priceNum / (listing.building_size ? parseFloat(listing.building_size.replace(/[^0-9.-]+/g, '')) : 1);
            if (pricePerSF > 0 && pricePerSF < 1000) {
                detailsList.push(`$${pricePerSF.toFixed(2)} SF/YR`);
            }
        }
    }

    if (listing.building_size && !isLand) {
        detailsList.push(`${listing.building_size} Building`);
    }

    if (listing.lot_size) {
        detailsList.push(`${listing.lot_size} ${isLand ? 'Land' : 'Lot'}`);
    }

    if (listing.number_of_units && listing.number_of_units > 0) {
        detailsList.push(`${listing.number_of_units} Units Available`);
    } else {
        detailsList.push('1 Space Available Now');
    }

    // Create description (using title as description for now)
    const description = listing.description || listing.title || 'Commercial property available for lease or sale.';

    // Image
    const imageUrl = listing.primary_image_url || 'https://via.placeholder.com/400x200?text=No+Image';

    card.innerHTML = `
        <div class="listing-card-compact">
            <div class="listing-card-top">
                <div class="listing-card-top-left">
                    <div class="listing-card-address">${listing.title || 'Untitled Property'}</div>
                    <div class="listing-card-price">${priceDisplay}</div>
                </div>
                <div class="listing-card-top-right">
                    <div class="listing-card-size-type">${sizeTypeLine}</div>
                    <div class="listing-card-full-location">${fullLocation}</div>
                </div>
            </div>
            <div class="listing-card-image">
                <img src="${imageUrl}" alt="${listing.title || 'Property'}"
                     onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
            </div>
            <div class="listing-card-bottom">
                <div class="listing-card-details-list">
                    ${detailsList.map(detail => `<div class="listing-detail-item">${detail}</div>`).join('')}
                </div>
                <div class="listing-card-description">
                    <p>${description}</p>
                </div>
            </div>
        </div>
    `;

    return card;
}

function populateFilterDropdowns(filters) {
    // Property Types
    if (filters.propertyTypes?.length > 0 && elements.propertyType.options.length === 1) {
        filters.propertyTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            elements.propertyType.appendChild(option);
        });
    }

    // Cities
    if (filters.cities?.length > 0 && elements.city.options.length === 1) {
        filters.cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            elements.city.appendChild(option);
        });
    }

    // States
    if (filters.states?.length > 0 && elements.state.options.length === 1) {
        filters.states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            elements.state.appendChild(option);
        });

        // Set the current filter value if it exists
        if (currentFilters.state_code && filters.states.includes(currentFilters.state_code)) {
            elements.state.value = currentFilters.state_code;
        }
    }
}

function updatePagination() {
    elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    elements.prevPage.disabled = currentPage === 1;
    elements.nextPage.disabled = currentPage === totalPages;
    elements.pagination.style.display = totalPages > 1 ? 'flex' : 'none';
}

function updateResultsCount() {
    const total = allLoadedListings.length;
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, total);
    elements.resultsCount.textContent = `Showing ${start}-${end} of ${total} properties`;
}

// ===== Property Detail Modal =====
function showPropertyModal(property) {
    const imageUrl = property.primary_image_url || 'https://via.placeholder.com/800x400?text=No+Image';
    const location = [property.street_address, property.city, property.state_code, property.zip_code]
        .filter(Boolean)
        .join(', ') || 'Address Not Available';

    // Check if it's a land property
    const isLand = property.property_type && property.property_type.toLowerCase().includes('land');
    const displayPropertyType = isLand ? 'Land' : (property.property_type || 'N/A');
    const displayPrice = property.price || 'Price Available upon Inquiry';

    // Build property details section based on type
    let propertyDetailsHtml = `
        <div class="modal-detail">
            <strong>Property Type:</strong>
            <span>${displayPropertyType}</span>
        </div>
        <div class="modal-detail">
            <strong>Price:</strong>
            <span>${displayPrice}</span>
        </div>
    `;

    // For land, only show lot size
    if (isLand) {
        propertyDetailsHtml += `
            <div class="modal-detail">
                <strong>Lot Size:</strong>
                <span>${property.lot_size || 'N/A'}</span>
            </div>
        `;
    } else {
        // For buildings, show both
        propertyDetailsHtml += `
            <div class="modal-detail">
                <strong>Building Size:</strong>
                <span>${property.building_size || 'N/A'}</span>
            </div>
            <div class="modal-detail">
                <strong>Lot Size:</strong>
                <span>${property.lot_size || 'N/A'}</span>
            </div>
        `;
    }

    // Add optional fields
    if (property.year_built) {
        propertyDetailsHtml += `
            <div class="modal-detail">
                <strong>Year Built:</strong>
                <span>${property.year_built}</span>
            </div>
        `;
    }
    if (property.number_of_units) {
        propertyDetailsHtml += `
            <div class="modal-detail">
                <strong>Units:</strong>
                <span>${property.number_of_units}</span>
            </div>
        `;
    }

    elements.modalBody.innerHTML = `
        <div class="modal-property">
            <img src="${imageUrl}" alt="${property.title}" class="modal-image" onerror="this.src='https://via.placeholder.com/800x400?text=No+Image'">
            <h2>${property.title || 'Untitled Property'}</h2>
            <p class="modal-subtitle">${property.subtitle || ''}</p>

            <div class="modal-section">
                <h3>Location</h3>
                <p>${location}</p>
            </div>

            <div class="modal-section">
                <h3>Property Details</h3>
                <div class="modal-details-grid">
                    ${propertyDetailsHtml}
                </div>
            </div>

            ${property.description ? `
            <div class="modal-section">
                <h3>Description</h3>
                <p>${property.description}</p>
            </div>
            ` : ''}

            ${property.broker_name || property.broker_company ? `
            <div class="modal-section">
                <h3>Broker Information</h3>
                <p>
                    ${property.broker_name ? `<strong>${property.broker_name}</strong><br>` : ''}
                    ${property.broker_company || ''}
                </p>
            </div>
            ` : ''}

            ${property.listing_url ? `
            <div class="modal-section">
                <a href="${property.listing_url}" target="_blank" class="btn-primary">View on LoopNet</a>
            </div>
            ` : ''}
        </div>
    `;

    elements.modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ===== Filter Functions =====
function applyFilters() {
    currentPage = 1;
    currentFilters = {
        search: elements.searchInput.value.trim(),
        property_type: elements.propertyType.value,
        city: elements.city.value,
        state_code: elements.state.value,
        price_min: elements.priceMin.value,
        price_max: elements.priceMax.value,
        building_size_min: elements.buildingSizeMin.value,
        building_size_max: elements.buildingSizeMax.value,
        lot_size_min: elements.lotSizeMin.value,
        lot_size_max: elements.lotSizeMax.value,
        sort_by: elements.sortBy.value,
        sort_order: elements.sortOrder.value
    };
    loadListings();
}

function clearFilters() {
    // Reset all inputs
    elements.searchInput.value = '';
    elements.propertyType.value = '';
    elements.city.value = '';
    elements.state.value = '';
    elements.priceMin.value = '';
    elements.priceMax.value = '';
    elements.buildingSizeMin.value = '';
    elements.buildingSizeMax.value = '';
    elements.lotSizeMin.value = '';
    elements.lotSizeMax.value = '';
    elements.sortBy.value = 'last_updated';
    elements.sortOrder.value = 'desc';

    // Reset filters and reload
    currentPage = 1;
    currentFilters = {
        search: '',
        property_type: '',
        city: '',
        state_code: '',
        price_min: '',
        price_max: '',
        building_size_min: '',
        building_size_max: '',
        lot_size_min: '',
        lot_size_max: '',
        sort_by: 'last_updated',
        sort_order: 'desc'
    };
    loadListings();
}

// ===== State Management =====
function showLoading() {
    elements.loadingState.style.display = 'block';
    elements.errorState.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.listingsGrid.style.display = 'none';
    elements.pagination.style.display = 'none';
}

function showError(message) {
    elements.loadingState.style.display = 'none';
    elements.errorState.style.display = 'block';
    elements.emptyState.style.display = 'none';
    elements.listingsGrid.style.display = 'none';
    elements.pagination.style.display = 'none';
    elements.errorMessage.textContent = message;
}

function showEmptyState() {
    elements.loadingState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.emptyState.style.display = 'block';
    elements.listingsGrid.style.display = 'none';
    elements.pagination.style.display = 'none';
}

function hideAllStates() {
    elements.loadingState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.listingsGrid.style.display = 'grid';
}

// ===== Auto-Refresh (AppSync-like) =====
function startAutoRefresh() {
    // Refresh listings every 30 seconds
    autoRefreshInterval = setInterval(() => {
        loadListings();
        loadStats();
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopAutoRefresh);
