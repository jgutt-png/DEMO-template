// ===== State Management =====
let currentPage = 1;
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
let markerClusterGroup = null;
let markers = new Map(); // listing_id -> marker reference
let currentListingsData = []; // Cache of current listings
let mapBounds = null;
let clusteringEnabled = true;
let selectedMarkerId = null;
let defaultMapCenter = [39.8283, -98.5795]; // Geographic center of USA
let defaultMapZoom = 5;

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
    startAutoRefresh();
});

// ===== Event Listeners =====
function initializeEventListeners() {
    // Pagination
    elements.prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadListings();
        }
    });

    elements.nextPage.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadListings();
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
            attributionControl: true,
            minZoom: 3,
            maxZoom: 18
        }).setView(defaultState.center, defaultState.zoom);

        // Add Carto light tiles (Zillow-style)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Add zoom control (bottom right)
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        // Initialize marker cluster group
        markerClusterGroup = L.markerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 80,
            iconCreateFunction: function(cluster) {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count > 100) size = 'large';
                else if (count > 10) size = 'medium';

                return L.divIcon({
                    html: '<div><span>' + count + '</span></div>',
                    className: 'marker-cluster marker-cluster-' + size,
                    iconSize: L.point(40, 40)
                });
            }
        });

        map.addLayer(markerClusterGroup);

        // Map event listeners
        map.on('moveend', debounce(handleMapMoveEnd, 500));
        map.on('zoomend', handleMapZoomEnd);

        // Custom control event listeners
        document.getElementById('recenter-map').addEventListener('click', recenterMap);
        document.getElementById('toggle-clusters').addEventListener('click', toggleClustering);
        const resetButton = document.getElementById('reset-filters');
        if (resetButton) {
            resetButton.addEventListener('click', resetMapView);
        }

        if (mapLoading) mapLoading.style.display = 'none';
        console.log('Map initialized successfully');

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
    if (currentListingsData.length > 0 && markerClusterGroup) {
        const bounds = markerClusterGroup.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    } else {
        map.setView(defaultMapCenter, defaultMapZoom);
    }
}

function toggleClustering() {
    clusteringEnabled = !clusteringEnabled;
    const btn = document.getElementById('toggle-clusters');

    if (clusteringEnabled) {
        map.addLayer(markerClusterGroup);
        btn.classList.remove('active');
        btn.title = 'Disable clustering';
    } else {
        map.removeLayer(markerClusterGroup);
        markers.forEach(marker => marker.addTo(map));
        btn.classList.add('active');
        btn.title = 'Enable clustering';
    }
}

function resetMapView() {
    clearFilters();
    recenterMap();
}

// Marker Management
function createMarkerForListing(listing) {
    if (!listing.latitude || !listing.longitude) return null;

    const lat = parseFloat(listing.latitude);
    const lon = parseFloat(listing.longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return null;
    }

    // Format price for marker
    let priceText = '';
    if (listing.price) {
        const priceNum = parseFloat(listing.price.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(priceNum)) {
            priceText = priceNum >= 1000000
                ? '$' + (priceNum / 1000000).toFixed(1) + 'M'
                : priceNum >= 1000
                ? '$' + Math.round(priceNum / 1000) + 'K'
                : '$' + Math.round(priceNum);
        }
    }

    const marker = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'custom-marker-icon',
            html: '<span>' + (priceText || '$') + '</span>',
            iconSize: null,
            iconAnchor: [0, 0],
            popupAnchor: [0, -10]
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
    markerClusterGroup.clearLayers();
    markers.clear();

    const validMarkers = [];
    listings.forEach(listing => {
        const marker = createMarkerForListing(listing);
        if (marker) validMarkers.push(marker);
    });

    markerClusterGroup.addLayers(validMarkers);
    console.log(`Added ${validMarkers.length} markers to map`);

    if (validMarkers.length > 0 && !mapBounds) {
        setTimeout(() => {
            const bounds = markerClusterGroup.getBounds();
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
            // The dropdown will be populated when loadListings() runs
            // and populateFilterDropdowns() will set the value automatically
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

            // Fit map to state bounds
            if (stateBounds && stateBounds.north && stateBounds.south && stateBounds.east && stateBounds.west) {
                const bounds = L.latLngBounds(
                    [stateBounds.south, stateBounds.west],
                    [stateBounds.north, stateBounds.east]
                );
                map.fitBounds(bounds, { padding: [50, 50] });
            } else if (center) {
                // Fallback to center point
                map.setView([center.latitude, center.longitude], zoom || 7);
            }
        }
    } catch (error) {
        console.error('Error snapping to state:', error);
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

        // Update state
        totalPages = result.pagination.totalPages;
        availableFilters = result.filters;

        // Update UI
        populateFilterDropdowns(result.filters);
        renderListings(result.data);
        updatePagination(result.pagination);
        updateResultsCount(result.pagination);

        // Show/hide empty state
        if (result.data.length === 0) {
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
        const priceNum = parseFloat(listing.price.replace(/[^0-9.-]+/g, ''));
        if (!isNaN(priceNum)) {
            priceDisplay = priceNum >= 1000000
                ? '$' + (priceNum / 1000000).toFixed(1) + 'M'
                : priceNum >= 1000
                ? '$' + (priceNum / 1000).toFixed(0) + 'K'
                : '$' + Math.round(priceNum).toLocaleString();
        }
    }

    // Format location
    const location = [listing.city, listing.state_code]
        .filter(Boolean)
        .join(', ') || 'Location Not Available';

    // Get property type
    const propertyType = listing.property_type || 'Commercial';
    const isLand = propertyType.toLowerCase().includes('land');

    // Build details
    let detailsHtml = '';
    if (isLand) {
        if (listing.lot_size) {
            detailsHtml = `
                <div class="listing-card-detail-item">
                    <span class="listing-card-detail-label">Lot Size</span>
                    <span>${listing.lot_size}</span>
                </div>
            `;
        }
    } else {
        if (listing.building_size) {
            detailsHtml += `
                <div class="listing-card-detail-item">
                    <span class="listing-card-detail-label">Building</span>
                    <span>${listing.building_size}</span>
                </div>
            `;
        }
        if (listing.lot_size) {
            detailsHtml += `
                <div class="listing-card-detail-item">
                    <span class="listing-card-detail-label">Lot</span>
                    <span>${listing.lot_size}</span>
                </div>
            `;
        }
    }

    // Image
    const imageUrl = listing.primary_image_url || 'https://via.placeholder.com/400x200?text=No+Image';

    card.innerHTML = `
        <div class="listing-card-compact">
            <div class="listing-card-image">
                <img src="${imageUrl}" alt="${listing.title || 'Property'}"
                     onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
                <div class="listing-card-price-badge">${priceDisplay}</div>
            </div>
            <div class="listing-card-content">
                <h3 class="listing-card-title">${listing.title || 'Untitled Property'}</h3>
                <div class="listing-card-location">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C5.243 0 3 2.243 3 5c0 3.375 5 11 5 11s5-7.625 5-11c0-2.757-2.243-5-5-5zm0 7.5c-1.381 0-2.5-1.119-2.5-2.5S6.619 2.5 8 2.5s2.5 1.119 2.5 2.5S9.381 7.5 8 7.5z"/>
                    </svg>
                    ${location}
                </div>
                ${detailsHtml ? `<div class="listing-card-details">${detailsHtml}</div>` : ''}
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

function updatePagination(pagination) {
    elements.pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
    elements.prevPage.disabled = pagination.page === 1;
    elements.nextPage.disabled = pagination.page === pagination.totalPages;
    elements.pagination.style.display = pagination.totalPages > 1 ? 'flex' : 'none';
}

function updateResultsCount(pagination) {
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    elements.resultsCount.textContent = `Showing ${start}-${end} of ${pagination.total} properties`;
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
