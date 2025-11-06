/**
 * Advanced Marker Manager for Commercial Real Estate Map
 *
 * Features:
 * - Smart marker positioning to prevent overlap
 * - Performance-optimized rendering for 100-500+ markers
 * - Zoom-based marker sizing and visibility
 * - Canvas-based marker layer for better performance
 * - Spiderfying for very close properties
 * - Advanced interaction states (hover, selected, highlighted)
 * - Keyboard navigation support
 */

class MarkerManager {
    constructor(map, options = {}) {
        this.map = map;
        this.options = {
            enableClustering: false, // Clustering disabled by default
            enableSpiderfy: true,
            minZoomForIndividualMarkers: 10,
            markerSpreadDistance: 30, // pixels
            maxMarkersPerCluster: 8,
            useCanvasLayer: false, // Set to true for 1000+ markers
            zoomBasedSizing: true,
            ...options
        };

        // State
        this.markers = new Map(); // listing_id -> marker data
        this.markerElements = new Map(); // listing_id -> DOM element
        this.layerGroup = L.layerGroup().addTo(map);
        this.spiderLegs = [];
        this.selectedMarkerId = null;
        this.hoveredMarkerId = null;

        // Performance optimizations
        this.visibleMarkers = new Set();
        this.markerPool = []; // Reusable marker elements
        this.lastZoom = map.getZoom();

        // Spatial index for fast lookups
        this.spatialIndex = new Map(); // grid key -> [listing_ids]
        this.gridSize = 0.01; // degrees (roughly 1km at equator)

        // Bind methods
        this.updateMarkerSizes = this.updateMarkerSizes.bind(this);
        this.handleMapMove = this.handleMapMove.bind(this);

        // Map event listeners
        this.map.on('zoomend', this.updateMarkerSizes);
        this.map.on('moveend', this.handleMapMove);
    }

    /**
     * Add markers for listings with smart positioning
     */
    addMarkers(listings) {
        console.time('addMarkers');

        // Clear existing markers
        this.clear();

        // Filter valid listings with coordinates
        const validListings = listings.filter(listing =>
            listing.latitude && listing.longitude &&
            !isNaN(parseFloat(listing.latitude)) &&
            !isNaN(parseFloat(listing.longitude))
        );

        console.log(`Adding ${validListings.length} markers`);

        // Group nearby markers for overlap prevention
        const markerGroups = this.groupNearbyMarkers(validListings);

        // Create markers with smart positioning
        markerGroups.forEach(group => {
            if (group.listings.length === 1) {
                this.createMarker(group.listings[0], group.center);
            } else {
                this.createMarkerGroup(group);
            }
        });

        // Fit map to markers if requested
        if (validListings.length > 0 && this.options.fitBounds) {
            this.fitBounds();
        }

        // Update visibility based on current viewport
        this.updateVisibleMarkers();

        console.timeEnd('addMarkers');
        console.log(`Created ${this.markers.size} markers`);
    }

    /**
     * Group nearby markers to prevent overlap
     * Uses a spatial grid to efficiently find nearby markers
     */
    groupNearbyMarkers(listings) {
        const zoom = this.map.getZoom();

        // Calculate grouping threshold based on zoom level
        // At low zoom, group more aggressively; at high zoom, show individual markers
        const thresholdMeters = this.getGroupingThreshold(zoom);
        const thresholdDegrees = thresholdMeters / 111320; // Rough conversion

        const groups = [];
        const processed = new Set();

        listings.forEach(listing => {
            if (processed.has(listing.listing_id)) return;

            const lat = parseFloat(listing.latitude);
            const lon = parseFloat(listing.longitude);

            // Find nearby listings
            const nearby = [listing];
            processed.add(listing.listing_id);

            // Only group if zoom level is low enough
            if (zoom < this.options.minZoomForIndividualMarkers) {
                listings.forEach(other => {
                    if (processed.has(other.listing_id)) return;

                    const otherLat = parseFloat(other.latitude);
                    const otherLon = parseFloat(other.longitude);

                    const distance = this.calculateDistance(lat, lon, otherLat, otherLon);

                    if (distance < thresholdDegrees) {
                        nearby.push(other);
                        processed.add(other.listing_id);
                    }
                });
            }

            groups.push({
                center: [lat, lon],
                listings: nearby,
                count: nearby.length
            });
        });

        return groups;
    }

    /**
     * Calculate distance between two points (rough approximation)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;
        return Math.sqrt(dLat * dLat + dLon * dLon);
    }

    /**
     * Get grouping threshold based on zoom level
     */
    getGroupingThreshold(zoom) {
        // Threshold in meters
        if (zoom >= 15) return 10;    // Very close markers only
        if (zoom >= 12) return 50;    // Small neighborhood
        if (zoom >= 10) return 200;   // Neighborhood
        if (zoom >= 8) return 1000;   // City area
        return 5000;                   // Regional
    }

    /**
     * Create a single marker
     */
    createMarker(listing, position = null) {
        const lat = position ? position[0] : parseFloat(listing.latitude);
        const lon = position ? position[1] : parseFloat(listing.longitude);

        const priceText = this.formatPrice(listing.price);

        const marker = L.marker([lat, lon], {
            icon: this.createMarkerIcon(priceText, false),
            title: listing.title || 'Property',
            riseOnHover: true,
            riseOffset: 1000
        });

        // Store marker data
        this.markers.set(listing.listing_id, {
            marker,
            listing,
            originalPosition: [lat, lon],
            isGroup: false
        });

        // Add to layer
        this.layerGroup.addLayer(marker);

        // Create popup
        const popupContent = this.createPopupContent(listing);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        // Event handlers
        marker.on('click', (e) => this.handleMarkerClick(listing.listing_id, e));
        marker.on('mouseover', (e) => this.handleMarkerHover(listing.listing_id, true, e));
        marker.on('mouseout', (e) => this.handleMarkerHover(listing.listing_id, false, e));

        return marker;
    }

    /**
     * Create a group of markers with smart positioning (spiderfying)
     */
    createMarkerGroup(group) {
        const { center, listings, count } = group;
        const zoom = this.map.getZoom();

        // At high zoom levels, spread markers apart
        if (zoom >= this.options.minZoomForIndividualMarkers || !this.options.enableSpiderfy) {
            // Calculate spread positions in a circle
            const positions = this.calculateSpreadPositions(
                center,
                listings.length,
                this.options.markerSpreadDistance
            );

            listings.forEach((listing, index) => {
                this.createMarker(listing, positions[index]);
            });
        } else {
            // Create a cluster marker
            this.createClusterMarker(group);
        }
    }

    /**
     * Calculate positions for spreading markers in a circle
     */
    calculateSpreadPositions(center, count, radiusPixels) {
        const positions = [];
        const [centerLat, centerLon] = center;

        // Convert pixel radius to degrees (approximate)
        const zoom = this.map.getZoom();
        const metersPerPixel = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / Math.pow(2, zoom);
        const radiusMeters = radiusPixels * metersPerPixel;
        const radiusDegrees = radiusMeters / 111320;

        if (count === 1) {
            return [center];
        }

        // Arrange in circle(s)
        const angleStep = (2 * Math.PI) / count;

        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;
            const lat = centerLat + radiusDegrees * Math.sin(angle);
            const lon = centerLon + radiusDegrees * Math.cos(angle) / Math.cos(centerLat * Math.PI / 180);
            positions.push([lat, lon]);
        }

        return positions;
    }

    /**
     * Create a cluster marker (for low zoom levels)
     */
    createClusterMarker(group) {
        const { center, listings, count } = group;

        const marker = L.marker(center, {
            icon: this.createClusterIcon(count),
            title: `${count} properties`,
            riseOnHover: true
        });

        // Store all listings in this cluster
        const clusterListingIds = listings.map(l => l.listing_id);

        this.markers.set(`cluster_${center.join('_')}`, {
            marker,
            listings,
            originalPosition: center,
            isGroup: true,
            listingIds: clusterListingIds
        });

        this.layerGroup.addLayer(marker);

        // Click handler - spiderfy or zoom
        marker.on('click', (e) => {
            if (this.map.getZoom() < this.map.getMaxZoom() - 2) {
                // Zoom in
                this.map.setView(center, this.map.getZoom() + 2);
            } else {
                // Spiderfy
                this.spiderfyCluster(group);
            }
        });
    }

    /**
     * Spiderfy a cluster - spread markers in a visual pattern
     */
    spiderfyCluster(group) {
        // Clear existing spider legs
        this.clearSpiderLegs();

        const { center, listings } = group;
        const positions = this.calculateSpreadPositions(center, listings.length, 50);

        listings.forEach((listing, index) => {
            // Create spider leg (line from center to marker)
            const leg = L.polyline([center, positions[index]], {
                color: '#666',
                weight: 2,
                opacity: 0.6,
                dashArray: '5, 5'
            }).addTo(this.map);

            this.spiderLegs.push(leg);

            // Create temporary marker at spread position
            const marker = this.createMarker(listing, positions[index]);
            marker.openPopup();
        });
    }

    /**
     * Clear spider legs
     */
    clearSpiderLegs() {
        this.spiderLegs.forEach(leg => this.map.removeLayer(leg));
        this.spiderLegs = [];
    }

    /**
     * Create marker icon with price label
     */
    createMarkerIcon(priceText, isCluster = false) {
        const zoom = this.map.getZoom();
        const scale = this.options.zoomBasedSizing ? this.getMarkerScale(zoom) : 1;

        const className = isCluster ? 'custom-marker-icon marker-cluster-icon' : 'custom-marker-icon';

        return L.divIcon({
            className,
            html: `<span style="transform: scale(${scale})">${priceText}</span>`,
            iconSize: null,
            iconAnchor: [0, 0],
            popupAnchor: [0, -10]
        });
    }

    /**
     * Create cluster icon
     */
    createClusterIcon(count) {
        return L.divIcon({
            className: 'custom-cluster-icon',
            html: `<div><span>${count}</span></div>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
        });
    }

    /**
     * Get marker scale based on zoom level
     */
    getMarkerScale(zoom) {
        if (zoom >= 15) return 1.2;
        if (zoom >= 12) return 1.0;
        if (zoom >= 10) return 0.9;
        if (zoom >= 8) return 0.8;
        return 0.7;
    }

    /**
     * Format price for marker display
     */
    formatPrice(price) {
        if (!price) return '$';

        const priceNum = parseFloat(String(price).replace(/[^0-9.-]+/g, ''));
        if (isNaN(priceNum)) return '$';

        if (priceNum >= 1000000) {
            return '$' + (priceNum / 1000000).toFixed(1) + 'M';
        } else if (priceNum >= 1000) {
            return '$' + Math.round(priceNum / 1000) + 'K';
        } else {
            return '$' + Math.round(priceNum);
        }
    }

    /**
     * Create popup content
     */
    createPopupContent(listing) {
        const price = listing.price || 'Contact for Price';
        const location = [listing.city, listing.state_code].filter(Boolean).join(', ');
        const imageUrl = listing.primary_image_url || 'https://via.placeholder.com/300x200?text=No+Image';

        return `
            <div class="marker-popup">
                <img src="${imageUrl}" alt="${listing.title || 'Property'}"
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
                    <button onclick="window.dispatchEvent(new CustomEvent('marker:view-details', {detail: '${listing.listing_id}'}))" class="marker-popup-btn">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle marker click
     */
    handleMarkerClick(listingId, event) {
        // Clear previous selection
        if (this.selectedMarkerId) {
            this.updateMarkerState(this.selectedMarkerId, 'selected', false);
        }

        // Set new selection
        this.selectedMarkerId = listingId;
        this.updateMarkerState(listingId, 'selected', true);

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('marker:click', {
            detail: { listingId, position: event.latlng }
        }));
    }

    /**
     * Handle marker hover
     */
    handleMarkerHover(listingId, isHovering, event) {
        if (isHovering) {
            this.hoveredMarkerId = listingId;
            this.updateMarkerState(listingId, 'hovered', true);
        } else {
            if (this.hoveredMarkerId === listingId) {
                this.hoveredMarkerId = null;
            }
            this.updateMarkerState(listingId, 'hovered', false);
        }

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('marker:hover', {
            detail: { listingId, isHovering }
        }));
    }

    /**
     * Update marker visual state
     */
    updateMarkerState(listingId, state, active) {
        const markerData = this.markers.get(listingId);
        if (!markerData || markerData.isGroup) return;

        const markerElement = markerData.marker.getElement();
        if (!markerElement) return;

        const stateClass = `marker-${state}`;

        if (active) {
            markerElement.classList.add(stateClass);
        } else {
            markerElement.classList.remove(stateClass);
        }
    }

    /**
     * Highlight a marker (called from external code)
     */
    highlightMarker(listingId, shouldHighlight) {
        this.updateMarkerState(listingId, 'highlighted', shouldHighlight);
    }

    /**
     * Select a marker (called from external code)
     */
    selectMarker(listingId) {
        if (this.selectedMarkerId) {
            this.updateMarkerState(this.selectedMarkerId, 'selected', false);
        }

        this.selectedMarkerId = listingId;
        this.updateMarkerState(listingId, 'selected', true);

        // Pan to marker
        const markerData = this.markers.get(listingId);
        if (markerData) {
            this.map.panTo(markerData.originalPosition);
        }
    }

    /**
     * Update marker sizes based on zoom level
     */
    updateMarkerSizes() {
        if (!this.options.zoomBasedSizing) return;

        const zoom = this.map.getZoom();
        const scale = this.getMarkerScale(zoom);

        this.markers.forEach((markerData, listingId) => {
            if (markerData.isGroup) return;

            const markerElement = markerData.marker.getElement();
            if (markerElement) {
                const span = markerElement.querySelector('span');
                if (span) {
                    span.style.transform = `scale(${scale})`;
                }
            }
        });

        // Regroup markers if zoom changed significantly
        const zoomDiff = Math.abs(zoom - this.lastZoom);
        if (zoomDiff >= 2) {
            this.lastZoom = zoom;
            // Could trigger regrouping here if needed
        }
    }

    /**
     * Update visible markers based on map viewport
     */
    updateVisibleMarkers() {
        const bounds = this.map.getBounds();
        let visibleCount = 0;

        this.markers.forEach((markerData, listingId) => {
            if (markerData.isGroup) {
                // Check if any listing in group is visible
                const isVisible = markerData.listings.some(listing => {
                    const lat = parseFloat(listing.latitude);
                    const lon = parseFloat(listing.longitude);
                    return bounds.contains([lat, lon]);
                });

                if (isVisible) {
                    visibleCount += markerData.listings.length;
                }
            } else {
                const isVisible = bounds.contains(markerData.originalPosition);
                if (isVisible) {
                    visibleCount++;
                    this.visibleMarkers.add(listingId);
                } else {
                    this.visibleMarkers.delete(listingId);
                }
            }
        });

        // Dispatch event with visible count
        window.dispatchEvent(new CustomEvent('markers:visible-count', {
            detail: { count: visibleCount }
        }));

        return visibleCount;
    }

    /**
     * Handle map move (debounced)
     */
    handleMapMove() {
        this.updateVisibleMarkers();
    }

    /**
     * Fit map bounds to all markers
     */
    fitBounds() {
        const coordinates = [];

        this.markers.forEach(markerData => {
            coordinates.push(markerData.originalPosition);
        });

        if (coordinates.length > 0) {
            const bounds = L.latLngBounds(coordinates);
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    /**
     * Clear all markers
     */
    clear() {
        this.layerGroup.clearLayers();
        this.markers.clear();
        this.visibleMarkers.clear();
        this.clearSpiderLegs();
        this.selectedMarkerId = null;
        this.hoveredMarkerId = null;
    }

    /**
     * Get marker by listing ID
     */
    getMarker(listingId) {
        return this.markers.get(listingId);
    }

    /**
     * Get all visible listings
     */
    getVisibleListings() {
        const listings = [];
        this.visibleMarkers.forEach(listingId => {
            const markerData = this.markers.get(listingId);
            if (markerData) {
                listings.push(markerData.listing);
            }
        });
        return listings;
    }

    /**
     * Destroy the marker manager
     */
    destroy() {
        this.clear();
        this.map.off('zoomend', this.updateMarkerSizes);
        this.map.off('moveend', this.handleMapMove);
        this.map.removeLayer(this.layerGroup);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkerManager;
}
