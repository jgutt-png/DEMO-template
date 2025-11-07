// Global state
let currentPropertyData = null;

// Utility functions
function formatCurrency(value) {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatNumber(value) {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Tab switching
function switchTab(tabName) {
    // Hide all content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Remove active state from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active', 'border-purple-600', 'text-purple-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });

    // Show selected content
    document.getElementById(`content-${tabName}`).classList.remove('hidden');

    // Add active state to selected tab
    const activeTab = document.getElementById(`tab-${tabName}`);
    activeTab.classList.add('active', 'border-purple-600', 'text-purple-600');
    activeTab.classList.remove('border-transparent', 'text-gray-500');
}

// Main search function
async function searchProperty() {
    const addressInput = document.getElementById('addressInput');
    const address = addressInput.value.trim();

    if (!address) {
        alert('Please enter an address');
        return;
    }

    // Show loading state
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');

    try {
        // Call the aggregated search endpoint
        const response = await fetch('/api/property/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        currentPropertyData = data;

        // Store in localStorage
        localStorage.setItem('lastSearch', JSON.stringify({
            address,
            data,
            timestamp: new Date().toISOString()
        }));

        // Hide loading, show results
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');

        // Populate the UI
        populateAddressDetails(data.address, data.streetView);
        populateMap(data.address.geocode, data.address.formatted);
        populateKeyMetrics(data);
        populatePropertyDetails(data.property);
        populateZoningDetails(data.zoning);
        populateValuationDetails(data.avm);
        populateFinancialDetails(data);
        populateRawData(data);

    } catch (error) {
        console.error('Search error:', error);
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('errorState').classList.remove('hidden');
        document.getElementById('errorMessage').textContent = error.message;
    }
}

// Populate functions
function populateAddressDetails(addressData, streetViewData) {
    const container = document.getElementById('addressDetails');

    let streetViewHtml = '';
    if (streetViewData && streetViewData.url) {
        streetViewHtml = `
            <div class="border-t pt-3">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    <i class="fas fa-street-view mr-1"></i>Street View
                </p>
                <img
                    src="${streetViewData.url}"
                    alt="Street View"
                    class="w-full h-48 object-cover rounded-lg"
                    onerror="this.src='https://via.placeholder.com/600x400?text=Street+View+Not+Available'"
                >
            </div>
        `;
    }

    const html = `
        <div class="space-y-3">
            <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Original Input</p>
                <p class="text-sm text-gray-700 mt-1">${addressData.original}</p>
            </div>
            <div class="border-t pt-3">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Validated Address</p>
                <p class="text-base font-semibold text-gray-800 mt-1">${addressData.formatted}</p>
            </div>
            ${addressData.geocode ? `
            <div class="border-t pt-3">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Coordinates</p>
                <p class="text-sm text-gray-700 mt-1">
                    <i class="fas fa-map-pin text-purple-500 mr-1"></i>
                    ${addressData.geocode.latitude.toFixed(6)}, ${addressData.geocode.longitude.toFixed(6)}
                </p>
            </div>
            ` : ''}
            ${streetViewHtml}
        </div>
    `;

    container.innerHTML = html;
}

function populateMap(geocode, formattedAddress) {
    const container = document.getElementById('mapContainer');

    if (!geocode) {
        container.innerHTML = `
            <div class="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                <div class="text-center text-gray-500">
                    <i class="fas fa-map text-3xl mb-2"></i>
                    <p class="text-sm">Map not available</p>
                </div>
            </div>
        `;
        return;
    }

    // Create map
    const map = new google.maps.Map(container, {
        center: { lat: geocode.latitude, lng: geocode.longitude },
        zoom: 18,
        mapTypeId: 'hybrid', // Shows satellite + labels
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
            mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
        },
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
    });

    // Add marker
    const marker = new google.maps.Marker({
        position: { lat: geocode.latitude, lng: geocode.longitude },
        map: map,
        title: formattedAddress,
        animation: google.maps.Animation.DROP,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#667eea',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="padding: 8px;">
                <h3 style="font-weight: 600; color: #667eea; margin-bottom: 4px;">Property Location</h3>
                <p style="font-size: 13px; color: #4a5568;">${formattedAddress}</p>
                <p style="font-size: 11px; color: #718096; margin-top: 4px;">
                    ${geocode.latitude.toFixed(6)}, ${geocode.longitude.toFixed(6)}
                </p>
            </div>
        `
    });

    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });

    // Show info window by default
    setTimeout(() => {
        infoWindow.open(map, marker);
    }, 500);
}

function populateStreetView(streetViewData) {
    const container = document.getElementById('streetViewContainer');

    if (streetViewData.url) {
        container.innerHTML = `
            <img
                src="${streetViewData.url}"
                alt="Street View"
                class="w-full h-64 object-cover rounded-lg"
                onerror="this.src='https://via.placeholder.com/600x400?text=Street+View+Not+Available'"
            >
        `;
    } else {
        container.innerHTML = `
            <div class="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <div class="text-center text-gray-500">
                    <i class="fas fa-image text-4xl mb-2"></i>
                    <p>Street view not available</p>
                </div>
            </div>
        `;
    }
}

function populateKeyMetrics(data) {
    // AVM Value
    const avmValue = data.avm?.property?.[0]?.avm?.amount?.value ||
                     data.avm?.property?.[0]?.avm?.amountRangeHigh?.value;
    document.getElementById('avmValue').textContent = formatCurrency(avmValue);

    // Tax Assessment
    const taxValue = data.taxAssessment?.property?.[0]?.assessment?.assessed?.assdTtlValue;
    document.getElementById('taxValue').textContent = formatCurrency(taxValue);

    // Zone Type
    const zoneCode = data.zoning?.data?.zone_details?.zone_code || 'N/A';
    const zoneName = data.zoning?.data?.zone_details?.zone_name || '';
    document.getElementById('zoneType').textContent = zoneCode;
    document.getElementById('zoneType').title = zoneName;

    // Property Type
    const propertyType = data.property?.property?.[0]?.summary?.propType || 'N/A';
    document.getElementById('propertyType').textContent = propertyType;
}

function populatePropertyDetails(propertyData) {
    const container = document.getElementById('propertyDetails');

    if (!propertyData || !propertyData.property || propertyData.property.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Property details not available</p>';
        return;
    }

    const property = propertyData.property[0];
    const summary = property.summary || {};
    const building = property.building || {};
    const lot = property.lot || {};

    const details = [
        { label: 'Property Type', value: summary.propType, icon: 'fa-home' },
        { label: 'Property SubType', value: summary.propSubType, icon: 'fa-building' },
        { label: 'Year Built', value: summary.yearBuilt, icon: 'fa-calendar' },
        { label: 'Bedrooms', value: building.rooms?.beds, icon: 'fa-bed' },
        { label: 'Bathrooms', value: building.rooms?.bathsTotal, icon: 'fa-bath' },
        { label: 'Building Size', value: building.size?.bldgSize ? `${formatNumber(building.size.bldgSize)} sq ft` : null, icon: 'fa-ruler-combined' },
        { label: 'Lot Size', value: lot.lotSize1 ? `${formatNumber(lot.lotSize1)} sq ft` : null, icon: 'fa-map' },
        { label: 'Stories', value: building.summary?.stories, icon: 'fa-layer-group' },
        { label: 'Pool', value: lot.poolInd ? 'Yes' : 'No', icon: 'fa-swimming-pool' },
        { label: 'Garage', value: building.parking?.prkgSize ? `${building.parking.prkgSize} spaces` : null, icon: 'fa-car' },
        { label: 'Last Sale Date', value: summary.saleTransDate ? formatDate(summary.saleTransDate) : null, icon: 'fa-calendar-check' },
        { label: 'Last Sale Price', value: summary.saleAmnt ? formatCurrency(summary.saleAmnt) : null, icon: 'fa-dollar-sign' }
    ];

    let html = '';
    details.forEach(detail => {
        if (detail.value && detail.value !== 'N/A' && detail.value !== 'null') {
            html += `
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-start space-x-3">
                        <div class="bg-purple-100 rounded-lg p-2">
                            <i class="fas ${detail.icon} text-purple-600"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-xs text-gray-500 uppercase tracking-wide">${detail.label}</p>
                            <p class="text-base font-semibold text-gray-800 mt-1">${detail.value}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html || '<p class="text-gray-500">No property details available</p>';
}

function populateZoningDetails(zoningData) {
    const container = document.getElementById('zoningDetails');

    if (!zoningData || !zoningData.data || !zoningData.data.zone_details) {
        container.innerHTML = '<p class="text-gray-500">Zoning information not available</p>';
        return;
    }

    const zone = zoningData.data.zone_details;
    const meta = zoningData.data.meta;

    const html = `
        <div class="space-y-6">
            <!-- Zone Header -->
            <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm opacity-90">Zone Code</p>
                        <h3 class="text-3xl font-bold mt-1">${zone.zone_code}</h3>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-full p-4">
                        <i class="fas fa-map-marked-alt text-3xl"></i>
                    </div>
                </div>
                <p class="text-lg mt-3 font-medium">${zone.zone_name}</p>
            </div>

            <!-- Zone Details Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <p class="text-xs text-blue-600 font-semibold uppercase tracking-wide">Type</p>
                    <p class="text-lg font-bold text-blue-900 mt-1">${zone.zone_type}</p>
                </div>
                <div class="bg-green-50 rounded-lg p-4 border border-green-100">
                    <p class="text-xs text-green-600 font-semibold uppercase tracking-wide">Sub-Type</p>
                    <p class="text-lg font-bold text-green-900 mt-1">${zone.zone_sub_type}</p>
                </div>
                <div class="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <p class="text-xs text-purple-600 font-semibold uppercase tracking-wide">City</p>
                    <p class="text-lg font-bold text-purple-900 mt-1">${meta.city_name}</p>
                </div>
            </div>

            <!-- Zone Guide -->
            <div class="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    <i class="fas fa-info-circle text-purple-600 mr-2"></i>Zone Guidelines
                </h4>
                <p class="text-gray-700 leading-relaxed">${zone.zone_guide}</p>
            </div>

            <!-- Additional Info -->
            <div class="flex items-center justify-between text-sm text-gray-600">
                <div>
                    <i class="fas fa-calendar-alt mr-2"></i>
                    Last Updated: ${formatDate(meta.last_updated)}
                </div>
                ${zone.link ? `
                <a href="${zone.link}" target="_blank" class="text-purple-600 hover:text-purple-700 font-medium">
                    View Full Code <i class="fas fa-external-link-alt ml-1"></i>
                </a>
                ` : ''}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function populateValuationDetails(avmData) {
    const container = document.getElementById('valuationDetails');

    if (!avmData || !avmData.property || avmData.property.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Valuation data not available</p>';
        return;
    }

    const property = avmData.property[0];
    const avm = property.avm || {};

    const html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Current Valuation -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                <p class="text-sm text-green-700 font-semibold uppercase tracking-wide">Current AVM Value</p>
                <p class="text-4xl font-bold text-green-900 mt-2">${formatCurrency(avm.amount?.value)}</p>
                ${avm.eventDate?.value ? `
                    <p class="text-sm text-green-600 mt-2">
                        <i class="fas fa-calendar mr-1"></i>
                        As of ${formatDate(avm.eventDate.value)}
                    </p>
                ` : ''}
            </div>

            <!-- Value Range -->
            ${avm.amountRangeLow && avm.amountRangeHigh ? `
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <p class="text-sm text-blue-700 font-semibold uppercase tracking-wide">Estimated Range</p>
                <div class="mt-2 space-y-2">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-blue-600">Low:</span>
                        <span class="text-lg font-bold text-blue-900">${formatCurrency(avm.amountRangeLow.value)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-blue-600">High:</span>
                        <span class="text-lg font-bold text-blue-900">${formatCurrency(avm.amountRangeHigh.value)}</span>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- FSD Score -->
            ${avm.fsd ? `
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                <p class="text-sm text-purple-700 font-semibold uppercase tracking-wide">FSD Score</p>
                <p class="text-4xl font-bold text-purple-900 mt-2">${avm.fsd}</p>
                <p class="text-sm text-purple-600 mt-2">Forecast Standard Deviation</p>
            </div>
            ` : ''}

            <!-- Confidence Score -->
            ${avm.confidenceScore ? `
            <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
                <p class="text-sm text-yellow-700 font-semibold uppercase tracking-wide">Confidence Score</p>
                <p class="text-4xl font-bold text-yellow-900 mt-2">${avm.confidenceScore}</p>
                <div class="mt-2 bg-yellow-200 rounded-full h-2">
                    <div class="bg-yellow-600 h-2 rounded-full" style="width: ${avm.confidenceScore}%"></div>
                </div>
            </div>
            ` : ''}
        </div>
    `;

    container.innerHTML = html;
}

function populateFinancialDetails(data) {
    const container = document.getElementById('financialDetails');

    const taxData = data.taxAssessment?.property?.[0]?.assessment?.assessed;
    const equityData = data.homeEquity?.property?.[0];
    const mortgageData = data.property?.property?.[0]?.mortgage;

    let html = '';

    // Tax Assessment
    if (taxData) {
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-file-invoice-dollar text-blue-600 mr-2"></i>
                    Tax Assessment
                </h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600">Total Assessed Value</p>
                        <p class="text-xl font-bold text-gray-800">${formatCurrency(taxData.assdTtlValue)}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Land Value</p>
                        <p class="text-xl font-bold text-gray-800">${formatCurrency(taxData.assdLandValue)}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Improvement Value</p>
                        <p class="text-xl font-bold text-gray-800">${formatCurrency(taxData.assdImpValue)}</p>
                    </div>
                    ${taxData.assdYear ? `
                    <div>
                        <p class="text-sm text-gray-600">Assessment Year</p>
                        <p class="text-xl font-bold text-gray-800">${taxData.assdYear}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Home Equity
    if (equityData) {
        const equity = equityData.vintage?.equity;
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-chart-pie text-green-600 mr-2"></i>
                    Home Equity
                </h4>
                <div class="grid grid-cols-2 gap-4">
                    ${equity?.equityPercent ? `
                    <div>
                        <p class="text-sm text-gray-600">Equity Percentage</p>
                        <p class="text-xl font-bold text-gray-800">${equity.equityPercent}%</p>
                    </div>
                    ` : ''}
                    ${equity?.equityAmount ? `
                    <div>
                        <p class="text-sm text-gray-600">Equity Amount</p>
                        <p class="text-xl font-bold text-gray-800">${formatCurrency(equity.equityAmount)}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Mortgage Information
    if (mortgageData && mortgageData.length > 0) {
        const mortgage = mortgageData[0];
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-hand-holding-usd text-purple-600 mr-2"></i>
                    Mortgage Information
                </h4>
                <div class="grid grid-cols-2 gap-4">
                    ${mortgage.amount ? `
                    <div>
                        <p class="text-sm text-gray-600">Loan Amount</p>
                        <p class="text-xl font-bold text-gray-800">${formatCurrency(mortgage.amount)}</p>
                    </div>
                    ` : ''}
                    ${mortgage.lenderName ? `
                    <div>
                        <p class="text-sm text-gray-600">Lender</p>
                        <p class="text-xl font-bold text-gray-800">${mortgage.lenderName}</p>
                    </div>
                    ` : ''}
                    ${mortgage.recordingDate ? `
                    <div>
                        <p class="text-sm text-gray-600">Recording Date</p>
                        <p class="text-xl font-bold text-gray-800">${formatDate(mortgage.recordingDate)}</p>
                    </div>
                    ` : ''}
                    ${mortgage.loanType ? `
                    <div>
                        <p class="text-sm text-gray-600">Loan Type</p>
                        <p class="text-xl font-bold text-gray-800">${mortgage.loanType}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    container.innerHTML = html || '<p class="text-gray-500">Financial data not available</p>';
}

function populateRawData(data) {
    const container = document.getElementById('rawDataContent');
    container.textContent = JSON.stringify(data, null, 2);
}

// Load search history from Supabase
async function loadSearchHistory() {
    try {
        const response = await fetch('/api/property/history?limit=10');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            displaySearchHistory(result.data);
            document.getElementById('searchHistory').classList.remove('hidden');
        } else {
            alert('No search history found');
        }
    } catch (error) {
        console.error('Error loading history:', error);
        alert('Failed to load search history');
    }
}

// Display search history
function displaySearchHistory(searches) {
    const historyList = document.getElementById('historyList');

    const html = searches.map(search => {
        const date = new Date(search.search_timestamp).toLocaleString();
        return `
            <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition cursor-pointer"
                 onclick="loadSearchById('${search.id}')">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <p class="font-semibold text-gray-800">${search.formatted_address || search.address}</p>
                        <p class="text-sm text-gray-500 mt-1">
                            <i class="fas fa-clock mr-1"></i>${date}
                        </p>
                    </div>
                    <div style="color: #0a2d5f;">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    historyList.innerHTML = html;
}

// Load a specific search by ID
async function loadSearchById(id) {
    try {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('searchHistory').classList.add('hidden');

        const response = await fetch(`/api/property/${id}`);
        const result = await response.json();

        if (result.success) {
            const search = result.data;
            currentPropertyData = search.property_data;

            // Update address input
            document.getElementById('addressInput').value = search.address;

            // Hide loading, show results
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('resultsSection').classList.remove('hidden');

            // Populate the UI with saved data
            const data = search.property_data;
            populateAddressDetails(data.address, data.streetView);
            populateMap(data.address.geocode, data.address.formatted);
            populateKeyMetrics(data);
            populatePropertyDetails(data.property);
            populateZoningDetails(data.zoning);
            populateValuationDetails(data.avm);
            populateFinancialDetails(data);
            populateRawData(data);
        } else {
            throw new Error('Failed to load search');
        }
    } catch (error) {
        console.error('Error loading search:', error);
        document.getElementById('loadingState').classList.add('hidden');
        alert('Failed to load search from history');
    }
}

// Toggle history visibility
function toggleHistory() {
    document.getElementById('searchHistory').classList.add('hidden');
}

// Load last search on page load (from Supabase)
window.addEventListener('DOMContentLoaded', async () => {
    // Check if URL parameter requests showing search history
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showHistory') === 'true') {
        loadSearchHistory();
        return;
    }

    try {
        const response = await fetch('/api/property/history?limit=1');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const lastSearch = result.data[0];
            document.getElementById('addressInput').value = lastSearch.address;
            // Optionally auto-load the last search results
            // Uncomment below to auto-load
            // loadSearchById(lastSearch.id);
        }
    } catch (e) {
        console.error('Error loading last search:', e);
    }
});

// ===== LOOPNET FUNCTIONALITY =====

// Load LoopNet properties near current location
async function loadLoopNetProperties(type = 'sale') {
    if (!currentPropertyData || !currentPropertyData.address || !currentPropertyData.address.geocode) {
        alert('Please search for a property first');
        return;
    }

    const geocode = currentPropertyData.address.geocode;

    // Show loading state
    document.getElementById('loopnetEmpty').classList.add('hidden');
    document.getElementById('loopnetResults').classList.add('hidden');
    document.getElementById('loopnetLoading').classList.remove('hidden');

    try {
        // Search by coordinates (5000m = ~3 miles radius)
        const response = await fetch('/api/loopnet/search-by-coordinates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat: geocode.latitude,
                lon: geocode.longitude,
                radius: 5000,
                type: type
            })
        });

        const result = await response.json();

        // Hide loading
        document.getElementById('loopnetLoading').classList.add('hidden');

        if (result.status === 'success' && result.data && result.data.length > 0) {
            displayLoopNetProperties(result.data, type);
            document.getElementById('loopnetResults').classList.remove('hidden');
        } else {
            document.getElementById('loopnetEmpty').classList.remove('hidden');
            document.getElementById('loopnetEmpty').innerHTML = `
                <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No ${type} properties found within 3 miles</p>
                <button onclick="loadLoopNetProperties('${type === 'sale' ? 'lease' : 'sale'}')"
                        class="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                    Try ${type === 'sale' ? 'Lease' : 'Sale'} Properties
                </button>
            `;
        }
    } catch (error) {
        console.error('LoopNet error:', error);
        document.getElementById('loopnetLoading').classList.add('hidden');
        document.getElementById('loopnetEmpty').classList.remove('hidden');
        document.getElementById('loopnetEmpty').innerHTML = `
            <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
            <p class="text-red-500">Error loading LoopNet data: ${error.message}</p>
        `;
    }
}

// Display LoopNet properties in the UI
function displayLoopNetProperties(properties, type) {
    const container = document.getElementById('loopnetPropertyList');

    const html = properties.map(property => {
        const listingId = property.listingId || 'N/A';
        const title = property.title || 'Property';
        const address = property.address || 'Address not available';
        const price = property.saleSummary?.price || property.leaseSummary?.price || 'Contact for price';
        const propertyType = property.saleSummary?.propertyType || property.leaseSummary?.propertyType || 'Commercial';
        const size = property.saleSummary?.buildingSize || property.leaseSummary?.buildingSize || '';
        const imageUrl = property.images?.[0] || property.image || 'https://via.placeholder.com/400x300?text=No+Image';

        return `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer"
                 onclick="viewLoopNetDetails('${listingId}', '${type}')">
                <div class="relative">
                    <img src="${imageUrl}" alt="${title}"
                         class="w-full h-48 object-cover"
                         onerror="this.src='https://via.placeholder.com/400x300?text=Commercial+Property'">
                    <div class="absolute top-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        ${type === 'sale' ? 'FOR SALE' : 'FOR LEASE'}
                    </div>
                </div>
                <div class="p-4">
                    <h4 class="font-semibold text-gray-800 mb-2 truncate">${title}</h4>
                    <p class="text-sm text-gray-600 mb-2 truncate">
                        <i class="fas fa-map-marker-alt mr-1"></i>${address}
                    </p>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-lg font-bold text-purple-600">${price}</span>
                        <span class="text-sm text-gray-500">${propertyType}</span>
                    </div>
                    ${size ? `
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-ruler-combined mr-1"></i>${size}
                    </p>
                    ` : ''}
                    <button class="mt-3 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition">
                        <i class="fas fa-eye mr-1"></i>View Details
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// View detailed information about a LoopNet property
async function viewLoopNetDetails(listingId, type) {
    try {
        const response = await fetch('/api/loopnet/property-details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                listingId,
                type
            })
        });

        const result = await response.json();

        if (result.status === 'success' && result.data && result.data.length > 0) {
            const property = result.data[0];
            showLoopNetModal(property, type);
        } else {
            alert('Could not load property details');
        }
    } catch (error) {
        console.error('Error loading details:', error);
        alert('Error loading property details: ' + error.message);
    }
}

// Show property details in a modal
function showLoopNetModal(property, type) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    const price = property.saleSummary?.price || property.leaseSummary?.price || 'Contact for price';
    const description = property.description || 'No description available';
    const broker = property.broker || {};

    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 class="text-xl font-bold text-gray-800">${property.title || 'Property Details'}</h3>
                <button onclick="this.closest('.fixed').remove()"
                        class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-2xl"></i>
                </button>
            </div>
            <div class="p-6">
                ${property.images && property.images.length > 0 ? `
                <div class="mb-6">
                    <img src="${property.images[0]}" alt="Property"
                         class="w-full h-96 object-cover rounded-lg">
                </div>
                ` : ''}
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p class="text-sm text-gray-600">Price</p>
                        <p class="text-2xl font-bold text-purple-600">${price}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Address</p>
                        <p class="text-lg font-semibold text-gray-800">${property.address || 'N/A'}</p>
                    </div>
                </div>
                <div class="mb-6">
                    <h4 class="font-semibold text-gray-800 mb-2">Description</h4>
                    <p class="text-gray-600 whitespace-pre-wrap">${description}</p>
                </div>
                ${broker.name ? `
                <div class="border-t pt-4">
                    <h4 class="font-semibold text-gray-800 mb-2">Contact</h4>
                    <p class="text-gray-700">${broker.name}</p>
                    <p class="text-gray-600">${broker.company || ''}</p>
                    <p class="text-gray-600">${broker.phone || ''}</p>
                    <p class="text-gray-600">${broker.email || ''}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}
