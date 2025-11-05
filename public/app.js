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

// Load last search on page load
window.addEventListener('DOMContentLoaded', () => {
    const lastSearch = localStorage.getItem('lastSearch');
    if (lastSearch) {
        try {
            const { address, data } = JSON.parse(lastSearch);
            document.getElementById('addressInput').value = address;
            // Optionally auto-load the last search results
            // Uncomment below to auto-load
            // currentPropertyData = data;
            // ... populate UI with data
        } catch (e) {
            console.error('Error loading last search:', e);
        }
    }
});
