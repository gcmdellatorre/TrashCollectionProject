//
// Mamaland Trash Collection App - Modern JavaScript
//

// =================================================================================
//
//  CORE APPLICATION STATE & GLOBAL VARIABLES
//
// =================================================================================

let map = null;
let locationMap = null; // Map for the full-page selector
let browserLocation = null;
let selectedLocation = null; // Store selected {lat, lng}
let locationMapMarker = null; // Marker for the location map
let lastSearchedLocation = null; // Store the last successfully searched location
let allTrashData = []; // Store all trash points
let markersOnMap = []; // Store references to Leaflet markers

// Add these global variables
let currentVideoFile = null;
let currentPhotoFile = null;  // ← This was missing!
let currentDetectionData = null;
let radiusCircle = null; // Track the radius circle on main map

// Robust global clearVideoFlow function
function clearVideoFlow() {
    // Clear state
    currentVideoFile = null;
    currentDetectionData = null;

    // Clear file input
    const videoFileInput = document.getElementById('video-file-input');
    if (videoFileInput) videoFileInput.value = '';

    // Clear coordinates
    const videoLatitude = document.getElementById('video-latitude');
    const videoLongitude = document.getElementById('video-longitude');
    if (videoLatitude) videoLatitude.value = '';
    if (videoLongitude) videoLongitude.value = '';

    // Stop any ongoing recording
    if (window.mediaRecorder && window.mediaRecorder.state === 'recording') {
        window.mediaRecorder.stop();
    }

    // Hide preview
    const videoPreviewContainer = document.getElementById('video-preview-container');
    if (videoPreviewContainer) videoPreviewContainer.classList.add('hidden');

    // Clear video preview
    const videoPreview = document.getElementById('video-preview');
    if (videoPreview && videoPreview.tagName === 'VIDEO') {
        videoPreview.pause();
        videoPreview.removeAttribute('src');
        videoPreview.load();
    } else if (videoPreview) {
        videoPreview.innerHTML = 'Your browser does not support the video tag.';
    }

    // Hide or clear report/results
    const videoReportContainer = document.getElementById('video-report-container');
    if (videoReportContainer) videoReportContainer.classList.add('hidden');

    // Hide error/status/results UI
    if (typeof hideLocationStatus === 'function') hideLocationStatus();
    if (typeof hideManualLocationSection === 'function') hideManualLocationSection();
    if (typeof hideDetectButton === 'function') hideDetectButton();
    if (typeof hideSubmitButton === 'function') hideSubmitButton();
    if (typeof hideVideoResults === 'function') hideVideoResults();
    if (typeof hideVideoError === 'function') hideVideoError();
}

// Global submitVideoReport function
async function submitVideoReport() {
    console.log('submitVideoReport function called');
    console.log('currentDetectionData:', currentDetectionData);
    console.log('currentVideoFile:', currentVideoFile);
    
    if (!currentDetectionData || !currentVideoFile) {
        showVideoError('No detection results to submit. Please run detection first.');
        return;
    }
    
    const formData = new FormData();
    formData.append('video', currentVideoFile);
    formData.append('latitude', document.getElementById('video-latitude').value);
    formData.append('longitude', document.getElementById('video-longitude').value);
    formData.append('model', document.getElementById('modelSelect').value);
    formData.append('detection_data', JSON.stringify(currentDetectionData));
    
    try {
        const response = await fetch('/api/submit-video-report', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
                    if (response.ok) {
                console.log('About to show notification after successful video report submit');
                window.showNotification('Report submitted successfully!', 'success');
                clearVideoFlow();
                loadMapData(); // Refresh map
            } else {
            showVideoError(result.message || 'Failed to submit report');
        }
    } catch (error) {
        showVideoError('Network error: ' + error.message);
    }
}

// =================================================================================
//
//  CORE APPLICATION FUNCTIONS
//
// =================================================================================

// Global notification system
window.showNotification = function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;

    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-black',
        info: 'bg-blue-500 text-white'
    };

    notification.className += ` ${colors[type]}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
};

// Global function to update submit button visibility
window.updateSubmitButtonVisibility = function() {
    const submitBtn = document.getElementById('submit-btn');
    const fileInput = document.getElementById('file');
    const latInput = document.getElementById('latitude'); // if there is latitude I need longitude as well
    
    const photoPreviewContainer = document.getElementById('photo-preview-container');

    if (submitBtn && fileInput && latInput ) { // if there is lat there s should be lon as well
        const hasFile = fileInput.files.length > 0;
        const hasCoordinates = latInput.value && latInput.value.trim() !== '';
        const hasPhotoPreview = photoPreviewContainer && !photoPreviewContainer.classList.contains('hidden');

        if ((hasFile || hasPhotoPreview) && hasCoordinates) {
            submitBtn.classList.remove('hidden');
            submitBtn.classList.add('fade-in');
        } else {
            submitBtn.classList.add('hidden');
        }
    }
};

window.searchMainMap = function() {
    const query = document.getElementById('main-map-search').value;
    if (!query) return;

    const searchUrl = `/api/search-location?q=${encodeURIComponent(query)}`;

    fetch(searchUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);

            lastSearchedLocation = { lat, lng }; // Save the searched location
            map.setView([lat, lng], 12, { animate: true });

            window.showNotification(`Found: ${result.display_name}`, 'success');
        } else {
            window.showNotification('Location not found. Please try a different search term.', 'error');
        }
    })
    .catch(error => {
        console.error('Search error:', error);
        window.showNotification('Error searching for location. Please check your connection.', 'error');
    });
};

// =================================================================================
//
//  VIDEO FLOW HELPER FUNCTIONS (GLOBAL SCOPE)
//
// =================================================================================

function showDetectButton() {
    const detectBtn = document.getElementById('video-detect-btn');
    if (detectBtn) {
        detectBtn.classList.remove('hidden');
    }
}

function hideDetectButton() {
    const detectBtn = document.getElementById('video-detect-btn');
    if (detectBtn) {
        detectBtn.classList.add('hidden');
    }
}

function showSubmitButton() {
    // Fix: Use the correct button ID from HTML
    const submitReportBtn = document.getElementById('video-submit-btn');
    if (submitReportBtn) {
        submitReportBtn.classList.remove('hidden');
    }
}

function hideSubmitButton() {
    // Fix: Use the correct button ID from HTML
    const submitReportBtn = document.getElementById('video-submit-btn');
    if (submitReportBtn) {
        submitReportBtn.classList.add('hidden');
    }
}

// Add missing functions for photo flow buttons
function showPhotoDetectButton() {
    const detectBtn = document.getElementById('detect-photo-btn');
    if (detectBtn) {
        detectBtn.classList.remove('hidden');
        detectBtn.disabled = false;
    }
}

function hidePhotoDetectButton() {
    const detectBtn = document.getElementById('detect-photo-btn');
    if (detectBtn) {
        detectBtn.classList.add('hidden');
        detectBtn.disabled = true;
    }
}

function showPhotoSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.classList.remove('hidden');
    }
}

function hidePhotoSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.classList.add('hidden');
    }
}

function showManualSubmitButton() {
    const manualSubmitBtn = document.getElementById('manual-submit-btn');
    if (manualSubmitBtn) {
        manualSubmitBtn.classList.remove('hidden');
    }
}

function hideManualSubmitButton() {
    const manualSubmitBtn = document.getElementById('manual-submit-btn');
    if (manualSubmitBtn) {
        manualSubmitBtn.classList.add('hidden');
    }
}

function showVideoResults(data) {
    const resultsSection = document.getElementById('video-results-section');
    const resultsContent = document.getElementById('video-results-content');
    if (resultsSection && resultsContent) {
        resultsSection.classList.remove('hidden');
        resultsContent.innerHTML = generateVideoResultsHTML(data);
        
        // Attach the handler directly to the button
        const submitBtn = resultsContent.querySelector('#submit-video-report-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Submit video report button clicked');
                submitVideoReport();
            });
        }
    }
}

function hideVideoResults() {
    const resultsSection = document.getElementById('video-results-section');
    if (resultsSection) {
        resultsSection.classList.add('hidden');
    }
}

function showVideoError(msg) {
    const errorSection = document.getElementById('video-error-section');
    const errorMessage = document.getElementById('video-error-message');
    if (errorSection && errorMessage) {
        errorSection.classList.remove('hidden');
        errorMessage.textContent = msg;
    }
}

function hideVideoError() {
    const errorSection = document.getElementById('video-error-section');
    if (errorSection) {
        errorSection.classList.add('hidden');
    }
}

function showLocationStatus(message) {
    const locationStatus = document.getElementById('video-location-status');
    const locationStatusText = document.getElementById('video-location-status-text');
    if (locationStatus && locationStatusText) {
        locationStatus.classList.remove('hidden');
        locationStatusText.textContent = message;
    }
}

function hideLocationStatus() {
    const locationStatus = document.getElementById('video-location-status');
    if (locationStatus) {
        locationStatus.classList.add('hidden');
    }
}

function showManualLocationSection() {
    const manualLocationSection = document.getElementById('video-manual-location-section');
    if (manualLocationSection) {
        manualLocationSection.classList.remove('hidden');
    }
}

function hideManualLocationSection() {
    const manualLocationSection = document.getElementById('video-manual-location-section');
    if (manualLocationSection) {
        manualLocationSection.classList.add('hidden');
    }
}

function generateVideoResultsHTML(data) {
    const categoryBreakdown = data.category_counts ? 
        Object.entries(data.category_counts).map(([cat, count]) => 
            `<span class='inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs mr-1 mb-1'>${cat.replace(/_/g, ' ')}: ${count}</span>`
        ).join('') : '';
    const simpleCategoryBreakdown = data.simple_category_counts ? 
        Object.entries(data.simple_category_counts).map(([cat, count]) => 
            `<span class='inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-xs mr-1 mb-1'>${cat}: ${count}</span>`
        ).join('') : '';
    const environmentalBreakdown = data.environmental_impact_breakdown ? 
        Object.entries(data.environmental_impact_breakdown).map(([impact, count]) => {
            const colorClass = impact === 'high_impact' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                             impact === 'medium_impact' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                             'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            return `<span class='inline-block px-2 py-1 rounded ${colorClass} text-xs mr-1 mb-1'>${impact.replace(/_/g, ' ')}: ${count}</span>`;
        }).join('') : '';
    const recyclingBreakdown = data.recycling_category_breakdown ? 
        Object.entries(data.recycling_category_breakdown).map(([recycling, count]) => {
            const colorClass = recycling === 'highly_recyclable' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                             recycling === 'moderately_recyclable' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                             recycling === 'difficult_recyclable' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                             'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            return `<span class='inline-block px-2 py-1 rounded ${colorClass} text-xs mr-1 mb-1'>${recycling.replace(/_/g, ' ')}: ${count}</span>`;
        }).join('') : '';
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div>
                <h6 class="font-semibold text-gray-700 dark:text-gray-200 mb-1"><i class="bi bi-box"></i> Detection Summary</h6>
                <ul class="text-sm text-gray-600 dark:text-gray-300">
                    <li><strong>Trash Objects:</strong> ${data.trash_objects_detected || data.total_objects || 0}</li>
                    <li><strong>Natural Objects:</strong> ${data.natural_objects_filtered || 0}</li>
                    <li><strong>Total Detected:</strong> ${data.total_objects_detected || data.total_objects || 0}</li>
                    <li><strong>Estimated Weight:</strong> ${data.estimated_weight_kg || 0} kg</li>
                    <li><strong>Processing Time:</strong> ${data.processing_time ? data.processing_time.toFixed(2) + 's' : 'N/A'}</li>
                </ul>
            </div>
        <div class="mt-2">
            <h6 class="font-semibold text-gray-700 dark:text-gray-200 mb-1"><i class="bi bi-tags"></i> Detailed Category Breakdown</h6>
            <div class="mb-2">${categoryBreakdown || '<em class="text-gray-500 dark:text-gray-400">No trash objects detected</em>'}</div>
        </div>
        ${simpleCategoryBreakdown ? `
        <div class="mt-2">
            <h6 class="font-semibold text-gray-700 dark:text-gray-200 mb-1"><i class="bi bi-list-ul"></i> Simple Categories (Database)</h6>
            <div class="mb-2">${simpleCategoryBreakdown}</div>
        </div>
        ` : ''}
        ${environmentalBreakdown ? `
        <div class="mt-2">
            <h6 class="font-semibold text-gray-700 dark:text-gray-200 mb-1"><i class="bi bi-exclamation-triangle"></i> Environmental Impact</h6>
            <div class="mb-2">${environmentalBreakdown}</div>
        </div>
        ` : ''}
        ${recyclingBreakdown ? `
        <div class="mt-2">
            <h6 class="font-semibold text-gray-700 dark:text-gray-200 mb-1"><i class="bi bi-recycle"></i> Recycling Potential</h6>
            <div class="mb-2">${recyclingBreakdown}</div>
        </div>
        ` : ''}
        <div class="mt-4">
            <button id="submit-video-report-btn" class="w-full px-4 py-3 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">
                <i class="bi bi-check-circle mr-2"></i> Submit AI Report
            </button>
        </div>
    `;
}

function haversineDistance(coords1, coords2) {
    function toRad(x) {
        return x * Math.PI / 180;
    }

    const R = 6371; // km
    const dLat = toRad(coords2.lat - coords1.lat);
    const dLon = toRad(coords2.lng - coords1.lng);
    const lat1 = toRad(coords1.lat);
    const lat2 = toRad(coords2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

function findNearbyTrash() {
    const searchCenter = lastSearchedLocation || browserLocation;

    if (!searchCenter) {
        window.showNotification('Could not determine a location. Please search for one or enable location services.', 'error');
        if (!browserLocation) {
            requestUserLocationOnLoad();
        }
        return;
    }

    const radius = document.getElementById('radius-slider').value;
    const nearbyPoints = allTrashData.filter(point => {
        const pointCoords = { lat: point.latitude, lng: point.longitude };
        const distance = haversineDistance(searchCenter, pointCoords);
        return distance <= radius;
    });

    // Clear existing markers and add only nearby ones
    markersOnMap.forEach(marker => marker.remove());
    markersOnMap = [];
    
    // Remove existing radius circle if it exists
    if (radiusCircle) {
        map.removeLayer(radiusCircle);
        radiusCircle = null;
    }

    // Add radius visualizer on the map
    radiusCircle = L.circle([searchCenter.lat, searchCenter.lng], {
        color: '#0ea5e9',
        fillColor: '#0ea5e9',
        fillOpacity: 0.1,
        radius: radius * 1000 // Convert km to meters
    }).addTo(map);

    // Fit map to show the entire radius circle with some padding
    const bounds = radiusCircle.getBounds();
    map.fitBounds(bounds, {
        padding: [20, 20], // Add 20px padding on all sides
        maxZoom: 15 // Don't zoom in too much for large radius
    });

    if (nearbyPoints.length > 0) {
        nearbyPoints.forEach(point => addModernMarker(point));
        window.showNotification(`Found ${nearbyPoints.length} trash points within ${radius} km.`, 'success');
    } else {
        window.showNotification(`No trash found within ${radius} km of your selected location.`, 'info');
    }
}

// =================================================================================
//
//  FULL PAGE LOCATION SELECTOR LOGIC
//
// =================================================================================

function openLocationSelector() {
    const locationSelectorPage = document.getElementById('location-selector-page');
    if (locationSelectorPage) {
        // Use the correct CSS class for showing the location selector
        locationSelectorPage.classList.add('visible');
        
        // Initialize location map if not already done
        if (!locationMap) {
            setTimeout(() => {
                initializeLocationMap();
            }, 100);
        }
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('Please select a location on the map', 'info');
        }
    } else {
        console.error('Location selector page not found');
    }
}

function closeLocationSelector() {
    const selectorPage = document.getElementById('location-selector-page');
    if (selectorPage) {
        selectorPage.classList.remove('visible');
    }
    
    // Clean up the location map to prevent re-initialization issues
    if (locationMap) {
        try {
            locationMap.remove();
            locationMap = null;
            locationMapMarker = null;
            console.log('Location map cleaned up');
        } catch (error) {
            console.error('Error cleaning up location map:', error);
        }
    }
}

function initializeLocationMap() {
    // Check if map is already initialized
    if (locationMap) {
        console.log('Location map already initialized, skipping...');
        return;
    }
    
    // Check if the container exists
    const mapContainer = document.getElementById('location-map');
    if (!mapContainer) {
        console.error('Location map container not found');
        return;
    }
    
    try {
        locationMap = L.map('location-map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(locationMap);

        locationMap.on('click', function(e) {
            selectedLocation = { lat: e.latlng.lat, lng: e.latlng.lng };

            if (locationMapMarker) {
                locationMap.removeLayer(locationMapMarker);
            }

            locationMapMarker = L.marker(e.latlng).addTo(locationMap);
            
            const selectedLocationInfo = document.getElementById('selected-location-info');
            const confirmBtn = document.getElementById('confirm-selected-location');
            
            if (selectedLocationInfo) {
                selectedLocationInfo.textContent = `Selected: ${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`;
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
            }
        });

        // Handle search within the location selector
        const searchInput = document.getElementById('location-search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchLocationOnSelectorMap(searchInput.value);
                }
            });
        }
        
        console.log('Location map initialized successfully');
    } catch (error) {
        console.error('Error initializing location map:', error);
    }
}

function searchLocationOnSelectorMap(query) {
    if (!query) return;
    const searchUrl = `/api/search-location?q=${encodeURIComponent(query)}`;

    fetch(searchUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                locationMap.setView([lat, lng], 13);
                window.showNotification(`Found: ${result.display_name}`, 'info');
            } else {
                window.showNotification('Location not found.', 'error');
            }
        })
        .catch(error => {
            console.error('Location search error:', error);
            window.showNotification('Error searching for location.', 'error');
        });
}

function confirmLocationSelection() {
    // Try to detect which flow is active
    const photoFlowVisible = document.getElementById('photo-flow-container') && !document.getElementById('photo-flow-container').classList.contains('hidden');
    const videoFlowVisible = document.getElementById('video-flow-container') && !document.getElementById('video-flow-container').classList.contains('hidden');

    // Get selected coordinates from the map marker
    let lat = null, lng = null;
    if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
        lat = selectedLocation.lat;
        lng = selectedLocation.lng;
    } else {
        // fallback: try to get from hidden fields
        lat = document.getElementById('latitude')?.value || document.getElementById('photo-latitude')?.value || document.getElementById('video-latitude')?.value;
        lng = document.getElementById('longitude')?.value || document.getElementById('photo-longitude')?.value || document.getElementById('video-longitude')?.value;
    }

    if (lat && lng) {
        // Close the location selector
        closeLocationSelector();

        // Update the correct hidden fields
        if (photoFlowVisible) {
            document.getElementById('photo-latitude').value = lat;
            document.getElementById('photo-longitude').value = lng;
            // Update UI for photo flow
            const locationStatusText = document.getElementById('location-status-text');
            if (locationStatusText) {
                locationStatusText.textContent = `Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
            }
            hidePhotoManualLocationSection();
            const coordinatesInfo = document.getElementById('coordinates-info');
            const coordinatesText = document.getElementById('coordinates-text');
            if (coordinatesInfo && coordinatesText) {
                coordinatesText.textContent = `Location: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
                coordinatesInfo.classList.remove('hidden');
            }
            if (window.showNotification) window.showNotification(`Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`, 'success');
            // Enable next step in photo flow
            if (currentPhotoFile) {
                const reportMethod = document.querySelector('input[name="photo-report-method"]:checked')?.value;
                if (reportMethod === 'ai') {
                    showPhotoDetectButton(); // Use the new function
                } else {
                    showManualSubmitButton(); // Use the new function
                }
            }
        } else if (videoFlowVisible) {
            document.getElementById('video-latitude').value = lat;
            document.getElementById('video-longitude').value = lng;
            // Update UI for video flow
            const videoLocationStatus = document.getElementById('video-location-status');
            if (videoLocationStatus) {
                videoLocationStatus.textContent = `Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
            }
            if (window.showNotification) window.showNotification(`Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`, 'success');
            // Enable next step in video flow
            if (currentVideoFile) {
                showDetectButton(); // Show the video detect button
            }
        } else {
            // fallback: update generic fields
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
            if (window.showNotification) window.showNotification(`Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`, 'success');
        }
    } else {
        if (window.showNotification) window.showNotification('Please select a valid location.', 'error');
    }
}

// =================================================================================
//
//  FORM & MAP LOGIC
//
// =================================================================================

function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        // add min zoom to avoid going to far ?
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function loadMapData() {
    fetch('/api/trash-data')
    .then(response => response.json())
    .then(response => {
        if (response.status === 'success' && response.reports) {
            allTrashData = response.reports; // Store all data
            console.log(`Loaded ${allTrashData.length} trash data points`);
            allTrashData.forEach(point => addModernMarker(point));
        } else {
            console.log('No trash data available or error in response');
        }
    })
    .catch(error => {
        console.error('Error loading map data:', error);
    });
}

function addModernMarker(point) {
    const colors = {
        plastic: '#0ea5e9',
        paper: '#22c55e',
        metal: '#f59e0b',
        glass: '#8b5cf6',
        organic: '#84cc16',
        electronic: '#ef4444'
    };
    const iconColor = colors[point.trash_type] || '#64748b';

    const marker = L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
            className: 'modern-marker',
            html: `<div class="marker-container" style="background-color: ${iconColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        })
    }).addTo(map);

    const popupContent = `
        <div class="modern-popup">
            <div class="popup-header"><span class="trash-type-badge" style="background-color: ${iconColor}">${point.trash_type || 'Unknown'}</span></div>
            <div class="popup-content">
                <div class="popup-item"><strong>Weight:</strong> ${point.estimated_kg || 'Unknown'} kg</div>
                <div class="popup-item"><strong>Cleanliness:</strong> ${point.cleanliness || 'Unknown'}</div>
                <div class="popup-item"><strong>Reported:</strong> ${point.timestamp ? new Date(point.timestamp).toLocaleDateString() : 'Just now'}</div>
            </div>
        </div>`;
    marker.bindPopup(popupContent);
    markersOnMap.push(marker); // Keep track of markers
}

function setupEventListeners() {
    const fileInput = document.getElementById('file');
    fileInput.addEventListener('change', handleFileInputChange);

    const uploadForm = document.getElementById('upload-form');
    // Note: Photo form submission is handled separately in setupPhotoFormSubmission()
    // to avoid conflicts between old and new handlers

    // Main map search
    document.getElementById('main-map-search-btn').addEventListener('click', window.searchMainMap);

    // Refresh map button
    const refreshMapBtn = document.getElementById('refresh-map');
    if (refreshMapBtn) {
        refreshMapBtn.addEventListener('click', function() {
            console.log('Refresh map button clicked');
            loadMapData();
            window.showNotification('Map data refreshed!', 'success');
        });
    }

    // Nearby trash functionality
    document.getElementById('find-nearby-btn').addEventListener('click', findNearbyTrash);
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValue = document.getElementById('radius-value');
    radiusSlider.addEventListener('input', () => {
        radiusValue.textContent = radiusSlider.value;
    });

    // Event listeners for the new full-page selector
    const manualLocationButton = document.getElementById('manual-location-section').querySelector('button');
    if (manualLocationButton) {
        manualLocationButton.addEventListener('click', openLocationSelector);
    }
    document.getElementById('close-location-selector').addEventListener('click', closeLocationSelector);
    document.getElementById('confirm-selected-location').addEventListener('click', confirmLocationSelection);

    // Video upload buttons
    const takeVideoBtn = document.getElementById('take-video-btn');
    const uploadVideoBtn = document.getElementById('upload-video-btn');
    const videoFileInput = document.getElementById('video-file');
    
    if (takeVideoBtn && videoFileInput) {
        takeVideoBtn.addEventListener('click', function() {
            videoFileInput.value = '';
            videoFileInput.removeAttribute('multiple');
            videoFileInput.setAttribute('capture', 'environment');
            videoFileInput.click();
        });
    }
    
    if (uploadVideoBtn && videoFileInput) {
        uploadVideoBtn.addEventListener('click', function() {
            videoFileInput.value = '';
            videoFileInput.removeAttribute('capture');
            videoFileInput.click();
        });
    }
    
    if (videoFileInput) {
        videoFileInput.addEventListener('change', handleVideoFileChange);
    }
    
    // Add event listeners for video report buttons (will be added dynamically)
    // document.addEventListener('click', function(e) {
    //     if (e.target && e.target.id === 'submit-video-report-btn') {
    //         submitVideoReport();
    //     }
    //     if (e.target && e.target.id === 'edit-video-report-btn') {
    //         // TODO: Implement edit functionality
    //         window.showNotification('Edit functionality coming soon!', 'info');
    //     }
    // });

    // Dark mode toggle functionality
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }

    // Initialize dark mode from localStorage
    initializeDarkMode();
    
    // Photo detection button
    const detectPhotoBtn = document.getElementById('detect-photo-btn');
    if (detectPhotoBtn) {
        detectPhotoBtn.addEventListener('click', detectPhotoWithAI);
    }
    
    // Photo mode toggle
    const photoModeRadios = document.querySelectorAll('input[name="photo-report-method"]');
    photoModeRadios.forEach(radio => {
        radio.addEventListener('change', handlePhotoModeToggle);
    });
    
    // Photo manual location button
    const photoSelectLocationBtn = document.getElementById('photo-select-location-btn');
    if (photoSelectLocationBtn) {
        photoSelectLocationBtn.addEventListener('click', openLocationSelector);
    }

    // Location selector functionality
    setupLocationSelector();
}

// Dark mode functionality
function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    if (isDark) {
        html.classList.remove('dark');
        localStorage.setItem('darkMode', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('darkMode', 'dark');
    }
}

function initializeDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    const html = document.documentElement;
    if (!savedMode) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            html.classList.add('dark');
            localStorage.setItem('darkMode', 'dark');
        }
    } else if (savedMode === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
}

function handleFileInputChange(event) {
    const file = event.target.files[0];
    if (file) {
        handlePhotoCapture(file);
    }
}

function handleVideoFileChange(event) {
    const file = event.target.files[0];
    if (file) {
        // Check video duration (max 10 seconds)
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = function() {
            const duration = video.duration;
            if (duration > 10) {
                window.showNotification('Video must be 10 seconds or shorter. Please select a shorter video.', 'error');
                event.target.value = '';
                return;
            }
            
            // Process video for location first (similar to photo flow)
            processVideoForLocation(file);
        };
        
        video.onerror = function() {
            window.showNotification('Error reading video file. Please try another video.', 'error');
            event.target.value = '';
        };
        
        video.src = URL.createObjectURL(file);
    }
}

function uploadVideo(file) {
    const formData = new FormData();
    formData.append('video', file);
    
    // Add location data if available
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    
    if (latitude && longitude) {
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
    }
    
    // Add model selection
            formData.append('model', 'yolov8s');
    
    // Show upload progress
    window.showNotification('Uploading video for trash detection...', 'info');
    
    fetch('/api/upload-video', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.showNotification('Video processed successfully! Review the AI-generated report below.', 'success');
            
            // Show the AI detection results as a report preview
            showVideoDetectionReport(data.data, file);
            
            // Clear the file input
            document.getElementById('video-file').value = '';
        } else {
            window.showNotification(data.message || 'Video upload failed.', 'error');
        }
    })
    .catch(error => {
        console.error('Video upload error:', error);
        window.showNotification('Video upload failed. Please try again.', 'error');
    });
}

function extractCoordinatesFromImage(arrayBuffer) {
    return new Promise((resolve) => {
        // This is a placeholder; in a real app, you'd use a library like exif-js
        // For now, we simulate failure to test the manual flow
        resolve(null);
    });
}

function handleUploadFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    if (!submitBtn || submitBtn.disabled) return;

    const form = event.target;
    const formData = new FormData(form);
    
    // Create a new FormData object to filter out empty optional fields
    const filteredFormData = new FormData();

    // Append required fields
    filteredFormData.append('file', formData.get('file'));
    filteredFormData.append('latitude', formData.get('latitude'));
    filteredFormData.append('longitude', formData.get('longitude'));

    // Only append optional fields if they have a value
    const trashType = formData.get('trash_type');
    if (trashType) {
        filteredFormData.append('trash_type', trashType);
    }

    const estimatedKg = formData.get('estimated_kg');
    if (estimatedKg) {
        filteredFormData.append('estimated_kg', estimatedKg);
    }

    const sparcity = formData.get('sparcity');
    if (sparcity) {
        filteredFormData.append('sparcity', sparcity);
    }

    const cleanliness = formData.get('cleanliness');
    if (cleanliness) {
        filteredFormData.append('cleanliness', cleanliness);
    }

    if (!formData.get('file') || formData.get('file').size === 0) {
        window.showNotification('Please select an image file to upload.', 'error');
        return;
    }
    
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin mr-2"></i>Submitting...';
    submitBtn.disabled = true;

    fetch('/upload', {
        method: 'POST',
        body: filteredFormData // Use the filtered data
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.showNotification('Report submitted successfully!', 'success');
            
            // Add the new marker to the map
            addModernMarker({
                id: data.report_id,
                latitude: parseFloat(data.metadata.latitude),
                longitude: parseFloat(data.metadata.longitude),
                ...data.metadata
            });
            map.panTo([parseFloat(data.metadata.latitude), parseFloat(data.metadata.longitude)]);

            // Manually reset the UI instead of using form.reset()
            const photoPreviewContainer = document.getElementById('photo-preview-container');
            const photoPreview = document.getElementById('photo-preview');
            const detailsForm = document.getElementById('details-form');
            const manualDetailsToggle = document.getElementById('manual-details-toggle');
            const coordinatesInfo = document.getElementById('coordinates-info');
            const submitBtn = document.getElementById('submit-btn');
            const manualLocationSection = document.getElementById('manual-location-section');
            
            if (photoPreviewContainer) photoPreviewContainer.classList.add('hidden');
            if (photoPreview) photoPreview.src = '';
            if (detailsForm) detailsForm.classList.add('hidden');
            if (manualDetailsToggle) manualDetailsToggle.classList.add('hidden');
            if (coordinatesInfo) coordinatesInfo.classList.add('hidden');
            if (submitBtn) submitBtn.classList.add('hidden');
            if (manualLocationSection) manualLocationSection.classList.add('hidden');
            
            // Clear input fields with null checks
            if (form) {
                const fileInput = form.querySelector('#file');
                const latitudeInput = form.querySelector('#latitude');
                const longitudeInput = form.querySelector('#longitude');
                const trashTypeInput = form.querySelector('#trash-type');
                const estimatedKgInput = form.querySelector('#estimated-kg');
                const sparcityInput = form.querySelector('#sparcity');
                const cleanlinessInput = form.querySelector('#cleanliness');
                
                if (fileInput) fileInput.value = '';
                if (latitudeInput) latitudeInput.value = '';
                if (longitudeInput) longitudeInput.value = '';
                if (trashTypeInput) trashTypeInput.value = '';
                if (estimatedKgInput) estimatedKgInput.value = '';
                if (sparcityInput) sparcityInput.value = '';
                if (cleanlinessInput) cleanlinessInput.value = '';
            } else {
                // Fallback: clear fields by ID if form is not available
                const fileInput = document.getElementById('file');
                const latitudeInput = document.getElementById('latitude');
                const longitudeInput = document.getElementById('longitude');
                const trashTypeInput = document.getElementById('trash-type');
                const estimatedKgInput = document.getElementById('estimated-kg');
                const sparcityInput = document.getElementById('sparcity');
                const cleanlinessInput = document.getElementById('cleanliness');
                
                if (fileInput) fileInput.value = '';
                if (latitudeInput) latitudeInput.value = '';
                if (longitudeInput) longitudeInput.value = '';
                if (trashTypeInput) trashTypeInput.value = '';
                if (estimatedKgInput) estimatedKgInput.value = '';
                if (sparcityInput) sparcityInput.value = '';
                if (cleanlinessInput) cleanlinessInput.value = '';
            }
            
        } else {
            window.showNotification(data.message || 'An error occurred.', 'error');
        }
    })
    .catch(error => {
        console.error('Submission error:', error);
        window.showNotification('Submission failed.', 'error');
    })
    .finally(() => {
        if (submitBtn) {
            submitBtn.innerHTML = 'Submit Report';
            submitBtn.disabled = false;
        }
    });
}

function setupPhotoCapture() {
    document.getElementById('take-photo-btn').addEventListener('click', () => {
        const cameraInput = document.createElement('input');
        cameraInput.type = 'file';
        cameraInput.accept = 'image/*';
        cameraInput.capture = 'environment';
        cameraInput.onchange = (e) => handlePhotoCapture(e.target.files[0]);
        cameraInput.click();
    });

    document.getElementById('upload-photo-btn').addEventListener('click', () => {
        document.getElementById('file').click();
    });
}

function setupPhotoDetection() {
    // Show detection toggle when photo is selected
    const detectionToggle = document.getElementById("detection-toggle");
    const aiDetectionSection = document.getElementById("ai-detection-section");
    const manualDetailsToggle = document.getElementById("manual-details-toggle");
    const detailsForm = document.getElementById("details-form");
    
    if (detectionToggle) {
        detectionToggle.classList.remove("hidden");
    }
    
    // Default to AI detection
    const aiRadio = document.querySelector('input[name="report-method"][value="ai"]');
    if (aiRadio) {
        aiRadio.checked = true;
        aiDetectionSection.classList.remove("hidden");
        manualDetailsToggle.classList.add("hidden");
        detailsForm.classList.add("hidden");
    }
    
    // Handle radio button changes
    const radioButtons = document.querySelectorAll('input[name="report-method"]');
    radioButtons.forEach(radio => {
        radio.addEventListener("change", function() {
            if (this.value === "ai") {
                aiDetectionSection.classList.remove("hidden");
                manualDetailsToggle.classList.add("hidden");
                detailsForm.classList.add("hidden");
            } else {
                aiDetectionSection.classList.add("hidden");
                manualDetailsToggle.classList.remove("hidden");
                detailsForm.classList.add("hidden");
            }
        });
    });
    
    // Handle manual details toggle
    const fillFormCheck = document.getElementById("fill-form-check");
    if (fillFormCheck) {
        fillFormCheck.addEventListener("change", function() {
            if (this.checked) {
                detailsForm.classList.remove("hidden");
            } else {
                detailsForm.classList.add("hidden");
            }
        });
    }
}

async function detectPhotoWithAI() {
    // Use the correct element IDs and add null checks
    const fileInput = document.getElementById("file");
    const latitudeInput = document.getElementById("photo-latitude") || document.getElementById("latitude");
    const longitudeInput = document.getElementById("photo-longitude") || document.getElementById("longitude");
    const modelSelect = document.getElementById("photo-model-select");
    const confidenceSelect = document.getElementById("photo-confidence-threshold");
    const detectBtn = document.getElementById("detect-photo-btn");
    const progressBar = document.getElementById("photo-detection-progress");
    const statusText = document.getElementById("photo-detection-status");
    const resultsDiv = document.getElementById("photo-detection-results");
    const errorDiv = document.getElementById("photo-detection-error");
    
    // Check if required elements exist
    if (!fileInput) {
        console.error('File input not found');
        showPhotoDetectionError("File input not found");
        return;
    }
    
    if (!latitudeInput || !longitudeInput) {
        console.error('Location inputs not found');
        showPhotoDetectionError("Location inputs not found");
        return;
    }
    
    if (!currentPhotoFile && !fileInput.files[0]) {
        showPhotoDetectionError("Please select a photo first");
        return;
    }
    
    if (!latitudeInput.value || !longitudeInput.value) {
        showPhotoDetectionError("Location coordinates are required");
        return;
    }
    
    // Show loading state
    if (detectBtn) {
        detectBtn.disabled = true;
        const btnText = detectBtn.querySelector(".btn-text");
        const loadingSpinner = detectBtn.querySelector(".loading-spinner");
        if (btnText) btnText.textContent = "Detecting...";
        if (loadingSpinner) loadingSpinner.classList.remove("hidden");
    }
    
    if (progressBar) progressBar.classList.remove("hidden");
    if (errorDiv) errorDiv.classList.add("hidden");
    if (resultsDiv) resultsDiv.classList.add("hidden");
    
    // Update progress
    updatePhotoDetectionProgress(10, "Preparing image...");
    
    const formData = new FormData();
    // Use currentPhotoFile if available, otherwise use file input
    const fileToUpload = currentPhotoFile || fileInput.files[0];
    formData.append("file", fileToUpload);
    formData.append("latitude", latitudeInput.value);
    formData.append("longitude", longitudeInput.value);
    
    // Add model and confidence if available
    if (modelSelect && modelSelect.value) {
        formData.append("model_name", modelSelect.value);
    } else {
        formData.append("model_name", "yolov8n"); // Default
    }
    
    if (confidenceSelect && confidenceSelect.value) {
        formData.append("confidence_threshold", confidenceSelect.value);
    } else {
        formData.append("confidence_threshold", "0.3"); // Default
    }
    
    try {
        updatePhotoDetectionProgress(30, "Uploading image...");
        
        const response = await fetch("/api/detect-photo", {
            method: "POST",
            body: formData
        });
        
        updatePhotoDetectionProgress(70, "Processing results...");
        
        const result = await response.json();
        
        if (response.ok) {
            updatePhotoDetectionProgress(100, "Detection complete!");
            showPhotoDetectionResults(result);
            if (window.showNotification) {
                window.showNotification("Photo detection completed successfully!", "success");
            }
        } else {
            throw new Error(result.message || "Detection failed");
        }
    } catch (error) {
        console.error("Photo detection error:", error);
        showPhotoDetectionError(error.message);
    } finally {
        // Reset button state
        if (detectBtn) {
            detectBtn.disabled = false;
            const btnText = detectBtn.querySelector(".btn-text");
            const loadingSpinner = detectBtn.querySelector(".loading-spinner");
            if (btnText) btnText.textContent = "Detect Trash with AI";
            if (loadingSpinner) loadingSpinner.classList.add("hidden");
        }
    }
}

function updatePhotoDetectionProgress(percentage, message) {
    const progressBar = document.getElementById("photo-detection-progress");
    const progressFill = progressBar.querySelector(".bg-blue-600");
    const statusText = document.getElementById("photo-detection-status");
    
    if (progressFill) {
        progressFill.style.width = percentage + "%";
    }
    if (statusText) {
        statusText.textContent = message;
    }
}

function showPhotoDetectionResults(result) {
    const resultsDiv = document.getElementById("photo-detection-results");
    const contentDiv = document.getElementById("photo-detection-content");
    const submitBtn = document.getElementById("submit-btn");
    
    if (!resultsDiv || !contentDiv) return;
    
    const summary = result.summary;
    const detections = result.detections;
    
    let content = `<div class="space-y-3">`;
    content += `<div><strong>Detected Items:</strong> ${summary.total_detections}</div>`;
    content += `<div><strong>Trash Type:</strong> ${summary.trash_type}</div>`;
    content += `<div><strong>Estimated Weight:</strong> ${summary.estimated_kg} kg</div>`;
    content += `<div><strong>Sparcity:</strong> ${summary.sparcity}</div>`;
    content += `<div><strong>Cleanliness:</strong> ${summary.cleanliness}</div>`;
    
    if (detections && detections.length > 0) {
        content += `<div class="mt-3"><strong>Detected Objects:</strong></div>`;
        content += `<ul class="list-disc list-inside text-xs space-y-1">`;
        detections.forEach(detection => {
            content += `<li>${detection.class} (${(detection.confidence * 100).toFixed(1)}% confidence)</li>`;
        });
        content += `</ul>`;
    }
    
    content += `</div>`;
    
    contentDiv.innerHTML = content;
    resultsDiv.classList.remove("hidden");
    
    // Show the submit button after successful AI detection
    if (submitBtn) {
        submitBtn.classList.remove("hidden");
    }
}

function showPhotoDetectionError(message) {
    const errorDiv = document.getElementById("photo-detection-error");
    const errorMessage = document.getElementById("photo-detection-error-message");
    
    if (errorDiv && errorMessage) {
        errorMessage.textContent = message;
        errorDiv.classList.remove("hidden");
    }
}

function handlePhotoCapture(file) {
    if (!file) {
        console.error('No file provided to handlePhotoCapture');
        return;
    }
    
    // Set the global photo file
    currentPhotoFile = file;
    
    // Show photo preview
    const photoPreview = document.getElementById('photo-preview');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    
    if (photoPreview && photoPreviewContainer) {
        const reader = new FileReader();
        reader.onload = function(e) {
            photoPreview.src = e.target.result;
            photoPreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    processPhotoForLocation(file);
    
    // Setup photo detection functionality
    setupPhotoDetection();
}

// Update the processPhotoForLocation function to properly show location selection
function processPhotoForLocation(file) {
    if (!file) {
        console.error('No file provided to processPhotoForLocation');
        return;
    }
    
    // Set the global photo file
    currentPhotoFile = file;
    
    // Show photo preview safely
    const photoPreview = document.getElementById('photo-preview');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    
    if (photoPreview && photoPreviewContainer) {
        photoPreview.src = URL.createObjectURL(file);
        photoPreviewContainer.classList.remove('hidden');
    }
    
    // Show location status safely
    const locationStatus = document.getElementById('location-status');
    const locationStatusText = document.getElementById('location-status-text');
    
    if (locationStatus && locationStatusText) {
        locationStatusText.textContent = 'Photo selected. Please choose a location for detection.';
        locationStatus.classList.remove('hidden');
    }
    
    // Try to extract coordinates from photo (placeholder)
    // In a real implementation, you might extract GPS data from photo
    console.log('Processing photo for location:', file.name);
    
    // For now, always show manual location selection since we don't have GPS extraction
    showPhotoManualLocationSection();
}

// Add function to show manual location section for photos
function showPhotoManualLocationSection() {
    const manualLocationSection = document.getElementById('manual-location-section');
    if (manualLocationSection) {
        manualLocationSection.classList.remove('hidden');
    }
}

// Add function to hide manual location section for photos
function hidePhotoManualLocationSection() {
    const manualLocationSection = document.getElementById('manual-location-section');
    if (manualLocationSection) {
        manualLocationSection.classList.add('hidden');
    }
}

function processVideoForLocation(file) {
    // For videos, we'll try to extract location from the first frame
    // This is a simplified approach - in a real app, you might want to analyze multiple frames
    extractCoordinatesFromVideo(file)
    .then(coords => {
        if (coords) {
            document.getElementById('video-latitude').value = coords.latitude;
            document.getElementById('video-longitude').value = coords.longitude;
            window.showNotification(`Video location found: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, 'success');
            // Proceed with upload since we have location
            uploadVideo(file);
        } else {
            window.showNotification('No GPS data found in video. Please select location manually.', 'info');
            // Show location selector for manual selection
            showVideoLocationSelector(file);
        }
    })
    .catch(error => {
        console.error('Error processing video for location:', error);
        window.showNotification('Could not extract location from video. Please select location manually.', 'info');
        showVideoLocationSelector(file);
    });
}

function extractCoordinatesFromVideo(file) {
    return new Promise((resolve) => {
        // This is a placeholder; in a real app, you'd extract GPS data from video metadata
        // For now, we simulate failure to test the manual flow
        resolve(null);
    });
}

function showVideoLocationSelector(videoFile) {
    // Store the video file for later use
    window.pendingVideoFile = videoFile;
    
    // Show a notification with instructions
    window.showNotification('Please select a location for your video upload.', 'info');
    
    // Open the location selector modal
    openLocationSelector();
    
    // Override the confirm location function for video uploads
    const originalConfirmLocation = window.confirmLocationSelection;
    window.confirmLocationSelection = function() {
        // Get the selected location
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        
        if (latitude && longitude) {
            // Close the location selector
            closeLocationSelector();
            
            // Proceed with video upload
            if (window.pendingVideoFile) {
                uploadVideo(window.pendingVideoFile);
                window.pendingVideoFile = null;
            }
            
            // Restore original function
            window.confirmLocationSelection = originalConfirmLocation;
        } else {
            window.showNotification('Please select a valid location.', 'error');
        }
    };
}

function showVideoDetectionReport(detectionData, videoFile) {
    // Store detection data for later submission
    window.currentVideoDetection = {
        data: detectionData,
        file: videoFile
    };
    
    // Hide photo report fields and manual details section
    document.getElementById('details-form').classList.add('hidden');
    document.getElementById('manual-details-toggle').classList.add('hidden');
    document.getElementById('coordinates-info').classList.add('hidden');
    document.getElementById('submit-btn').classList.add('hidden');
    document.getElementById('manual-location-section').classList.add('hidden');
    
    // Create or get the video report container
    let videoReportContainer = document.getElementById('video-report-container');
    if (!videoReportContainer) {
        videoReportContainer = document.createElement('div');
        videoReportContainer.id = 'video-report-container';
        videoReportContainer.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 p-6 mb-4';
        document.querySelector('.container').appendChild(videoReportContainer);
    }
    
    // Generate report content from detection data
    const reportContent = generateVideoReportContent(detectionData);
    videoReportContainer.innerHTML = reportContent;
    
    // Show the container
    videoReportContainer.classList.remove('hidden');
    
    // Scroll to the report
    videoReportContainer.scrollIntoView({ behavior: 'smooth' });

    // Attach the handler directly to the button
    const submitBtn = videoReportContainer.querySelector('#video-submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            submitVideoReport();
        });
    }
}

function showManualDetailsSection() {
    document.getElementById('manual-details-toggle').classList.remove('hidden');
    document.getElementById('fill-form-check').checked = true;
    document.getElementById('details-form').classList.remove('hidden');
    window.updateSubmitButtonVisibility();
}

function handlePhotoModeToggle(event) {
    const selectedMode = event.target.value;
    const aiSection = document.getElementById('ai-detection-section');
    const manualSection = document.getElementById('manual-report-section');
    
    // Clear any existing results or errors first
    hidePhotoResults();
    hidePhotoError();
    
    if (selectedMode === 'ai') {
        // Show AI detection section, hide manual section
        aiSection.classList.remove('hidden');
        manualSection.classList.add('hidden');
        
        // Clear manual form data when switching to AI mode
        clearManualFormData();
        
        // Hide manual submit button, show AI detect button if photo and location are available
        hideManualSubmitButton();
        
        // Check if we have photo and location to show detect button
        const hasPhoto = currentPhotoFile !== null;
        const hasLocation = document.getElementById('photo-latitude')?.value && document.getElementById('photo-longitude')?.value;
        
        if (hasPhoto && hasLocation) {
            showPhotoDetectButton();
        } else {
            hidePhotoDetectButton();
        }
        
        // Hide any existing submit buttons
        hidePhotoSubmitButton();
        
    } else if (selectedMode === 'manual') {
        // Show manual section, hide AI section
        aiSection.classList.add('hidden');
        manualSection.classList.remove('hidden');
        
        // Hide AI-related buttons
        hidePhotoDetectButton();
        hidePhotoSubmitButton();
        
        // Check if we have photo and location to show manual submit button
        const hasPhoto = currentPhotoFile !== null;
        const hasLocation = document.getElementById('photo-latitude')?.value && document.getElementById('photo-longitude')?.value;
        
        if (hasPhoto && hasLocation) {
            showManualSubmitButton();
        } else {
            hideManualSubmitButton();
        }
    }
}

// Add helper function to clear manual form data
function clearManualFormData() {
    const manualTrashType = document.getElementById('manual-trash-type');
    const manualEstimatedKg = document.getElementById('manual-estimated-kg');
    const manualSparcity = document.getElementById('manual-sparcity');
    const manualCleanliness = document.getElementById('manual-cleanliness');
    
    if (manualTrashType) manualTrashType.value = '';
    if (manualEstimatedKg) manualEstimatedKg.value = '';
    if (manualSparcity) manualSparcity.value = '';
    if (manualCleanliness) manualCleanliness.value = '';
}

function requestUserLocationOnLoad() {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            browserLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        },
        () => {
            console.log("Could not get browser location.");
        }
    );
}

// =====================
// TOGGLE LOGIC
// =====================
function setupFlowToggle() {
    const videoToggle = document.getElementById('toggle-video-flow');
    const photoToggle = document.getElementById('toggle-photo-flow');
    const videoContainer = document.getElementById('video-flow-container');
    const photoContainer = document.getElementById('photo-flow-container');

    function showVideoFlow() {
        videoContainer.classList.remove('hidden');
        photoContainer.classList.add('hidden');
        videoToggle.classList.add('bg-primary-600', 'text-white', 'toggle-active', 'border-0');
        videoToggle.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-100', 'dark:hover:bg-gray-600');
        photoToggle.classList.remove('bg-primary-600', 'text-white', 'toggle-active', 'border-0');
        photoToggle.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-100', 'dark:hover:bg-gray-600', 'border-0');
    }
    function showPhotoFlow() {
        videoContainer.classList.add('hidden');
        photoContainer.classList.remove('hidden');
        photoToggle.classList.add('bg-primary-600', 'text-white', 'toggle-active', 'border-0');
        photoToggle.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-100', 'dark:hover:bg-gray-600');
        videoToggle.classList.remove('bg-primary-600', 'text-white', 'toggle-active', 'border-0');
        videoToggle.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50', 'dark:bg-gray-700', 'dark:text-gray-100', 'dark:hover:bg-gray-600', 'border-0');
    }
    // Default: video flow
    showVideoFlow();
    videoToggle.addEventListener('click', showVideoFlow);
    photoToggle.addEventListener('click', showPhotoFlow);
}

// =================================================================================
//
//  VIDEO FLOW LOGIC (STREAMLINED)
//
// =================================================================================
function setupVideoFlow() {
    const takeVideoBtn = document.getElementById('take-video-btn');
    const uploadVideoBtn = document.getElementById('upload-video-btn');
    const videoFileInput = document.getElementById('video-file-input');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const videoPreview = document.getElementById('video-preview');
    const retakeVideoBtn = document.getElementById('retake-video-btn');
    const confidenceThreshold = document.getElementById('confidenceThreshold');
    const confidenceValue = document.getElementById('confidenceValue');
    const locationStatus = document.getElementById('video-location-status');
    const locationStatusText = document.getElementById('video-location-status-text');
    const manualLocationSection = document.getElementById('video-manual-location-section');
    const selectLocationBtn = document.getElementById('video-select-location-btn');
    const detectBtn = document.getElementById('video-detect-btn');
    const submitReportBtn = document.getElementById('video-submit-report-btn');
    const resultsSection = document.getElementById('video-results-section');
    const resultsContent = document.getElementById('video-results-content');
    const errorSection = document.getElementById('video-error-section');
    const errorMessage = document.getElementById('video-error-message');
    
    let mediaRecorder = null;
    let recordedChunks = [];
    
    // Update confidence value display
    if (confidenceThreshold && confidenceValue) {
        confidenceThreshold.addEventListener('input', function() {
            confidenceValue.textContent = this.value;
        });
    }
    
    // Take Video Button
    if (takeVideoBtn) {
        takeVideoBtn.addEventListener('click', function() {
            // Check if we're on a mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // On mobile, trigger the file input directly to open native camera
                videoFileInput.click();
            } else {
                // On desktop, use the browser camera API
                startVideoCapture();
            }
        });
    }
    
    // Upload Video Button
    if (uploadVideoBtn) {
        uploadVideoBtn.addEventListener('click', function() {
            videoFileInput.click();
        });
    }
    
    // File input change
    if (videoFileInput) {
        videoFileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                const file = this.files[0];
                console.log('Video file selected:', file.name, 'Size:', file.size, 'Type:', file.type);
                handleVideoSelected(file);
            }
        });
    }
    
    // Retake Video Button
    if (retakeVideoBtn) {
        retakeVideoBtn.addEventListener('click', function() {
            clearVideoFlow();
        });
    }
    
    // Start video capture
    function startVideoCapture() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showVideoError('Video capture is not supported in this browser');
            return;
        }
        
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment' // Use back camera on mobile
            },
            audio: false 
        })
        .then(function(stream) {
            // Create video element for preview
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            
            // Replace video preview content
            videoPreview.innerHTML = '';
            videoPreview.appendChild(video);
            
            // Show preview container
            videoPreviewContainer.classList.remove('hidden');
            
            // Start recording
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            
            recordedChunks = [];
            
            mediaRecorder.ondataavailable = function(event) {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = function() {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const file = new File([blob], 'recorded_video.webm', { type: 'video/webm' });
                handleVideoSelected(file);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };
            
            // Start recording
            mediaRecorder.start();
            
            // Stop recording after 10 seconds
            setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 10000);
            
        })
        .catch(function(error) {
            console.error('Error accessing camera:', error);
            showVideoError('Could not access camera: ' + error.message);
        });
    }
    
    // Handle video selection
    function handleVideoSelected(file) {
        currentVideoFile = file;
        showVideoPreview(file);
        hideVideoError();
        hideVideoResults();
        hideDetectButton();
        hideSubmitButton();
        
        // Try to extract location from video
        processVideoForLocation(file);
    }
    
    function showVideoPreview(file) {
        // Show preview container
        videoPreviewContainer.classList.remove('hidden');
        
        // Set video source
        const videoUrl = URL.createObjectURL(file);
        videoPreview.src = videoUrl;
        videoPreview.load();
        
        // Update location status
        showLocationStatus('Checking video for location data...');
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Process video for location
    function processVideoForLocation(file) {
        showLocationStatus('Checking video for location data...');
        
        // Try to extract coordinates from video metadata
        extractCoordinatesFromVideo(file).then(coordinates => {
            if (coordinates) {
                // Location found in video
                document.getElementById('video-latitude').value = coordinates.lat;
                document.getElementById('video-longitude').value = coordinates.lng;
                showLocationStatus(`Location found: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`);
                hideManualLocationSection();
                showDetectButton();
            } else {
                // No location in video, show manual selection
                showLocationStatus('No location data found in video');
                showManualLocationSection();
            }
        }).catch(error => {
            console.error('Error extracting location from video:', error);
            showLocationStatus('Error checking video location');
            showManualLocationSection();
        });
    }
    
    // Location selector for video flow
    if (selectLocationBtn) {
        selectLocationBtn.addEventListener('click', function() {
            openLocationSelector();
        });
    }
    
    // Detect button
    if (detectBtn) {
        detectBtn.addEventListener('click', async function() {
            if (!currentVideoFile) {
                showVideoError('No video file selected');
                return;
            }
            
            const latitude = document.getElementById('video-latitude').value;
            const longitude = document.getElementById('video-longitude').value;
            
            if (!latitude || !longitude) {
                showVideoError('Please select a location first');
                return;
            }
            
            try {
                // Use server-side detection
                console.log('🔄 Using server-side detection...');
                await performVideoDetection();
            } catch (error) {
                console.error('Video detection error:', error);
                showVideoError('Detection failed: ' + error.message);
            }
        });
    }
    
    // Remove the event listeners for discard and rerun since we removed those buttons



    // Perform server-side video detection
    async function performVideoDetection() {
        setVideoLoading(true);
        hideVideoError();
        hideVideoResults();
        
        const formData = new FormData();
        formData.append('file', currentVideoFile);
        formData.append('model_name', document.getElementById('modelSelect').value);
        formData.append('frame_interval', document.getElementById('frameInterval').value);
        formData.append('confidence_threshold', confidenceThreshold.value);
        formData.append('latitude', document.getElementById('video-latitude').value);
        formData.append('longitude', document.getElementById('video-longitude').value);
        
        // Set a timeout for the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout
        
        try {
            const response = await fetch('/api/upload-video', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const result = await response.json();
            
            if (response.ok && result.data) {
                currentDetectionData = result.data;
                showVideoResults(result.data);
                hideDetectButton();
                showSubmitButton();
            } else {
                showVideoError(result.message || 'Detection failed');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                showVideoError('Detection timed out after 5 minutes. Please try a shorter video or contact support.');
            } else {
                showVideoError('Network error: ' + error.message);
            }
        } finally {
            setVideoLoading(false);
        }
    }
    
    // UI helper functions
    function setVideoLoading(isLoading) {
        const btn = detectBtn;
        const progressBar = document.getElementById('video-progress-bar');
        const progressFill = progressBar ? progressBar.querySelector('div') : null;
        
        if (btn) {
            btn.disabled = isLoading;
            
            if (isLoading) {
                // Show loading state with progress
                btn.innerHTML = '<span class="loading-spinner"><i class="bi bi-arrow-clockwise animate-spin"></i></span><span class="btn-text">Processing Video...</span>';
                
                // Show progress bar
                if (progressBar) {
                    progressBar.classList.remove('hidden');
                    progressFill.style.width = '0%';
                }
                
                // Show status message
                showVideoStatus('Initializing detection model...');
                
                // Simulate progress updates
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress > 90) progress = 90; // Don't go to 100% until done
                    
                    if (progressFill) {
                        progressFill.style.width = progress + '%';
                    }
                    
                    // Update status messages
                    if (progress < 20) {
                        showVideoStatus('Loading AI model...');
                    } else if (progress < 40) {
                        showVideoStatus('Processing video frames...');
                    } else if (progress < 60) {
                        showVideoStatus('Detecting objects...');
                    } else if (progress < 80) {
                        showVideoStatus('Analyzing results...');
                    } else {
                        showVideoStatus('Finalizing detection...');
                    }
                }, 2000); // Update every 2 seconds
                
                // Store interval for cleanup
                btn.dataset.progressInterval = progressInterval;
                
            } else {
                // Reset to normal state
                btn.innerHTML = '<span class="loading-spinner hidden"><i class="bi bi-arrow-clockwise animate-spin"></i></span><span class="btn-text">Detect Trash</span>';
                
                // Hide progress bar
                if (progressBar) {
                    progressBar.classList.add('hidden');
                }
                
                // Clear progress interval
                if (btn.dataset.progressInterval) {
                    clearInterval(parseInt(btn.dataset.progressInterval));
                    delete btn.dataset.progressInterval;
                }
                
                // Hide status
                hideVideoStatus();
            }
        }
    }
    
    function showVideoStatus(message) {
        const statusElement = document.getElementById('video-location-status');
        const statusText = document.getElementById('video-location-status-text');
        
        if (statusElement && statusText) {
            statusElement.classList.remove('hidden');
            statusElement.className = 'mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg';
            statusText.innerHTML = `<i class="bi bi-hourglass-split mr-2"></i>${message}`;
        }
    }
    
    function hideVideoStatus() {
        const statusElement = document.getElementById('video-location-status');
        if (statusElement) {
            statusElement.classList.add('hidden');
        }
    }
    
    
    

}

// =================================================================================
//
//  APP INITIALIZATION
//
// =================================================================================

// Add this function to handle photo form submission
function setupPhotoFormSubmission() {
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handlePhotoFormSubmission(e);
        });
    }
}

async function handlePhotoFormSubmission(event) {
    const reportMethod = document.querySelector('input[name="photo-report-method"]:checked')?.value;
    
    if (reportMethod === 'ai') {
        // For AI mode, check if we already have detection results
        const resultsSection = document.getElementById('photo-detection-results');
        if (resultsSection && !resultsSection.classList.contains('hidden')) {
            // AI detection has already been performed, submit the results
            const detectionData = window.currentDetectionData;
            if (detectionData) {
                await submitPhotoAIReport(detectionData);
            } else {
                // Fallback: submit a basic report with the photo and location
                await submitBasicPhotoReport();
            }
        } else {
            // No AI detection has been performed yet, show error
            window.showNotification('Please run AI detection first by clicking "Detect with AI"', 'error');
        }
    } else if (reportMethod === 'manual') {
        // Handle manual report submission
        await handleManualReportSubmission();
    }
}

// Add a fallback function to submit basic photo report
async function submitBasicPhotoReport() {
    if (!currentPhotoFile) {
        window.showNotification('No photo file available', 'error');
        return;
    }
    
    const latitude = document.getElementById('photo-latitude')?.value || document.getElementById('latitude')?.value;
    const longitude = document.getElementById('photo-longitude')?.value || document.getElementById('longitude')?.value;
    
    if (!latitude || !longitude) {
        window.showNotification('No location coordinates available', 'error');
        return;
    }
    
    // Create form data with basic information
    const formData = new FormData();
    formData.append('file', currentPhotoFile);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('report_type', 'photo_report');
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.showNotification('Photo report submitted successfully!', 'success');
            clearPhotoFlow();
            loadMapData(); // Refresh map
        } else {
            window.showNotification(result.message || 'Failed to submit photo report', 'error');
        }
    } catch (error) {
        console.error('Photo report submission error:', error);
        window.showNotification('Network error: ' + error.message, 'error');
    }
}

async function handleAIDetectionSubmission() {
    if (!currentPhotoFile) {
        window.showNotification('Please select a photo first', 'error');
        return;
    }
    
    // Check for location coordinates (photo flow uses photo-latitude/photo-longitude)
    const latitude = document.getElementById('photo-latitude')?.value || document.getElementById('latitude')?.value;
    const longitude = document.getElementById('photo-longitude')?.value || document.getElementById('longitude')?.value;
    
    if (!latitude || !longitude) {
        window.showNotification('Please select a location first', 'error');
        return;
    }
    
    try {
        await performPhotoDetection();
    } catch (error) {
        console.error('AI detection error:', error);
        window.showNotification('AI detection failed: ' + error.message, 'error');
    }
}

async function handleManualReportSubmission() {
    let trashType = document.getElementById('manual-trash-type').value;
    let estimatedKg = document.getElementById('manual-estimated-kg').value;
    let sparcity = document.getElementById('manual-sparcity').value;
    let cleanliness = document.getElementById('manual-cleanliness').value;
    
    // Manual report should work even with empty fields - only require photo and location
    // Optional: show a warning if fields are empty but don't block submission
    if (!trashType || !estimatedKg || !sparcity || !cleanliness) {
        console.log('Manual report fields are empty, but proceeding with submission');
        // Set default values for empty fields
        if (!trashType) trashType = 'unknown';
        if (!estimatedKg) estimatedKg = '0.1';
        if (!sparcity) sparcity = 'medium';
        if (!cleanliness) cleanliness = 'medium';
    }
    
    if (!currentPhotoFile) {
        window.showNotification('Please select a photo first', 'error');
        return;
    }
    
    // Check for location coordinates (photo flow uses photo-latitude/photo-longitude)
    const latitude = document.getElementById('photo-latitude')?.value || document.getElementById('latitude')?.value;
    const longitude = document.getElementById('photo-longitude')?.value || document.getElementById('longitude')?.value;
    
    if (!latitude || !longitude) {
        window.showNotification('Please select a location first', 'error');
        return;
    }
    
    // Submit manual report
    const formData = new FormData();
    formData.append('file', currentPhotoFile);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('trash_type', trashType);
    formData.append('estimated_kg', estimatedKg);
    formData.append('sparcity', sparcity);
    formData.append('cleanliness', cleanliness);
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.showNotification('Manual report submitted successfully!', 'success');
            clearPhotoFlow();
            loadMapData(); // Refresh map
        } else {
            window.showNotification(result.message || 'Failed to submit manual report', 'error');
        }
    } catch (error) {
        console.error('Manual report submission error:', error);
        window.showNotification('Network error: ' + error.message, 'error');
    }
}

// Add function to clear photo flow
function clearPhotoFlow() {
    currentPhotoFile = null;
    
    // Clear stored detection data
    window.currentDetectionData = null;
    
    // Clear file input
    const photoFileInput = document.getElementById('file');
    if (photoFileInput) photoFileInput.value = '';
    
    // Clear coordinates (photo flow uses photo-latitude/photo-longitude)
    const latitude = document.getElementById('photo-latitude') || document.getElementById('latitude');
    const longitude = document.getElementById('photo-longitude') || document.getElementById('longitude');
    if (latitude) latitude.value = '';
    if (longitude) longitude.value = '';
    
    // Hide preview
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    if (photoPreviewContainer) photoPreviewContainer.classList.add('hidden');
    
    // Clear photo preview
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview) {
        photoPreview.src = '';
    }
    
    // Hide results and errors
    hidePhotoResults();
    hidePhotoError();
    
    // Reset manual form
    const manualReportSection = document.getElementById('manual-report-section');
    if (manualReportSection) manualReportSection.classList.add('hidden');
    
    // Reset form fields
    document.getElementById('manual-trash-type').value = '';
    document.getElementById('manual-estimated-kg').value = '';
    document.getElementById('manual-sparcity').value = '';
    document.getElementById('manual-cleanliness').value = '';
    
    // Hide all submit buttons
    hideManualSubmitButton();
    hidePhotoSubmitButton();
    hidePhotoDetectButton();
}

// Update the setupPhotoFlow function to include location button setup
function setupPhotoFlow() {
    // Setup photo capture (take photo and upload photo buttons)
    setupPhotoCapture();
    
    // Setup photo detection
    setupPhotoDetection();
    
    // Add form submission handling
    setupPhotoFormSubmission();
    
    // Add radio button change handler for report method
    const reportMethodRadios = document.querySelectorAll('input[name="photo-report-method"]');
    reportMethodRadios.forEach(radio => {
        radio.addEventListener('change', handlePhotoModeToggle);
    });
    
    // Setup photo file input change handler
    const photoFileInput = document.getElementById('file');
    if (photoFileInput) {
        photoFileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                handlePhotoCapture(file);
            }
        });
    }
    
    // Setup photo location selection button
    const photoSelectLocationBtn = document.getElementById('photo-select-location-btn');
    if (photoSelectLocationBtn) {
        photoSelectLocationBtn.addEventListener('click', function() {
            openLocationSelector();
        });
    }
    
    // Setup retake photo button
    const retakePhotoBtn = document.getElementById('retake-photo-btn');
    if (retakePhotoBtn) {
        retakePhotoBtn.addEventListener('click', function() {
            clearPhotoFlow();
        });
    }
}

// Update the confirmLocationSelection function to handle photo flow
function confirmLocationSelection() {
    // Try to detect which flow is active
    const photoFlowVisible = document.getElementById('photo-flow-container') && !document.getElementById('photo-flow-container').classList.contains('hidden');
    const videoFlowVisible = document.getElementById('video-flow-container') && !document.getElementById('video-flow-container').classList.contains('hidden');

    // Get selected coordinates from the map marker
    let lat = null, lng = null;
    if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
        lat = selectedLocation.lat;
        lng = selectedLocation.lng;
    } else {
        // fallback: try to get from hidden fields
        lat = document.getElementById('latitude')?.value || document.getElementById('photo-latitude')?.value || document.getElementById('video-latitude')?.value;
        lng = document.getElementById('longitude')?.value || document.getElementById('photo-longitude')?.value || document.getElementById('video-longitude')?.value;
    }

    if (lat && lng) {
        // Close the location selector
        closeLocationSelector();

        // Update the correct hidden fields
        if (photoFlowVisible) {
            document.getElementById('photo-latitude').value = lat;
            document.getElementById('photo-longitude').value = lng;
            // Update UI for photo flow
            const locationStatusText = document.getElementById('location-status-text');
            if (locationStatusText) {
                locationStatusText.textContent = `Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
            }
            hidePhotoManualLocationSection();
            const coordinatesInfo = document.getElementById('coordinates-info');
            const coordinatesText = document.getElementById('coordinates-text');
            if (coordinatesInfo && coordinatesText) {
                coordinatesText.textContent = `Location: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
                coordinatesInfo.classList.remove('hidden');
            }
            if (window.showNotification) window.showNotification(`Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`, 'success');
            // Enable next step in photo flow
            if (currentPhotoFile) {
                const reportMethod = document.querySelector('input[name="photo-report-method"]:checked')?.value;
                if (reportMethod === 'ai') {
                    showPhotoDetectButton(); // Use the new function
                } else {
                    showManualSubmitButton(); // Use the new function
                }
            }
        } else if (videoFlowVisible) {
            document.getElementById('video-latitude').value = lat;
            document.getElementById('video-longitude').value = lng;
            // Update UI for video flow
            const videoLocationStatus = document.getElementById('video-location-status');
            if (videoLocationStatus) {
                videoLocationStatus.textContent = `Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
            }
            if (window.showNotification) window.showNotification(`Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`, 'success');
            // Enable next step in video flow
            if (currentVideoFile) {
                showDetectButton(); // Show the video detect button
            }
        } else {
            // fallback: update generic fields
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
            if (window.showNotification) window.showNotification(`Location selected: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`, 'success');
        }
    } else {
        if (window.showNotification) window.showNotification('Please select a valid location.', 'error');
    }
}

// Update the openLocationSelector function to work for both photo and video flows
function openLocationSelector() {
    const locationSelectorPage = document.getElementById('location-selector-page');
    if (locationSelectorPage) {
        // Use the correct CSS class for showing the location selector
        locationSelectorPage.classList.add('visible');
        
        // Initialize location map if not already done
        if (!locationMap) {
            setTimeout(() => {
                initializeLocationMap();
            }, 100);
        }
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('Please select a location on the map', 'info');
        }
    } else {
        console.error('Location selector page not found');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== MODERN APP INITIALIZATION START ===');

    // Initialize dark mode
    initializeDarkMode();
    
    // Initialize map
    initMap();
    loadMapData();
    
    // Setup flow toggle (PHOTO/VIDEO TOGGLE)
    setupFlowToggle();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup video flow
    setupVideoFlow();
    
    // Setup photo flow (includes form submission)
    setupPhotoFlow();

    console.log('=== MODERN APP INITIALIZATION COMPLETE ===');
});

// Add the missing generateVideoReportContent function
function generateVideoReportContent(detectionData) {
    if (!detectionData) {
        return '<div class="text-red-600 dark:text-red-400">No detection data available</div>';
    }
    
    const totalObjects = detectionData.total_objects || 0;
    const trashObjects = detectionData.trash_objects || 0;
    const categoryCounts = detectionData.category_counts || {};
    const estimatedWeight = detectionData.estimated_weight_kg || 0;
    const modelUsed = detectionData.model_used || 'Unknown';
    
    let categoryHTML = '';
    if (Object.keys(categoryCounts).length > 0) {
        categoryHTML = '<div class="mt-3"><h6 class="font-medium text-gray-700 dark:text-gray-200 mb-2">Detected Categories:</h6><ul class="text-sm text-gray-600 dark:text-gray-300">';
        for (const [category, count] of Object.entries(categoryCounts)) {
            categoryHTML += `<li>• ${category}: ${count} objects</li>`;
        }
        categoryHTML += '</ul></div>';
    }
    
    return `
        <div class="space-y-3">
            <h5 class="font-semibold text-gray-800 dark:text-gray-100">AI-Generated Trash Report</h5>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                    <div class="font-medium text-blue-800 dark:text-blue-200">Total Objects</div>
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-300">${totalObjects}</div>
                </div>
                <div class="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                    <div class="font-medium text-green-800 dark:text-green-200">Trash Objects</div>
                    <div class="text-2xl font-bold text-green-600 dark:text-green-300">${trashObjects}</div>
                </div>
                <div class="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
                    <div class="font-medium text-yellow-800 dark:text-yellow-200">Estimated Weight</div>
                    <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-300">${estimatedWeight.toFixed(2)} kg</div>
                </div>
                <div class="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg">
                    <div class="font-medium text-purple-800 dark:text-purple-200">Model Used</div>
                    <div class="text-sm font-bold text-purple-600 dark:text-purple-300">${modelUsed}</div>
                </div>
            </div>
            ${categoryHTML}
            <div class="mt-4">
                <button type="button" 
                        id="video-submit-btn"
                        class="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">
                    <i class="bi bi-send mr-2"></i>
                    Submit AI Report
                </button>
            </div>
        </div>
    `;
}

// Add these helper functions for safe element access
function showPhotoResults(data) {
    const resultsContainer = document.getElementById('photo-detection-content');
    const resultsSection = document.getElementById('photo-detection-results');
    
    if (resultsContainer && resultsSection) {
        // Store the detection data globally for later submission
        window.currentDetectionData = data;
        
        resultsContainer.innerHTML = generatePhotoResultsHTML(data);
        resultsSection.classList.remove('hidden');
        
        // Hide detect button and show submit button after AI detection is complete
        hidePhotoDetectButton();
        showPhotoSubmitButton();
    } else {
        console.warn('Photo results elements not found');
    }
}

function generatePhotoResultsHTML(data) {
    if (!data) {
        return '<div class="text-red-600 dark:text-red-400">No detection data available</div>';
    }
    
    const totalObjects = data.total_objects || data.all_detections?.length || 0;
    const trashObjects = data.trash_objects || data.trash_detections?.length || 0;
    const estimatedWeight = data.estimated_weight_kg || 0;
    const modelUsed = data.model_used || 'Unknown';
    
    let detectionDetails = '';
    if (data.trash_detections && data.trash_detections.length > 0) {
        detectionDetails = '<div class="mt-3"><h6 class="font-medium text-gray-700 dark:text-gray-200 mb-2">Detected Trash Objects:</h6><ul class="text-sm text-gray-600 dark:text-gray-300">';
        data.trash_detections.forEach(detection => {
            const confidence = (detection.confidence * 100).toFixed(1);
            detectionDetails += `<li>• ${detection.class_name} (${confidence}% confidence)</li>`;
        });
        detectionDetails += '</ul></div>';
    }
    
    return `
        <div class="space-y-3">
            <h5 class="font-semibold text-gray-800 dark:text-gray-100">AI-Generated Trash Report</h5>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                    <div class="font-medium text-blue-800 dark:text-blue-200">Total Objects</div>
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-300">${totalObjects}</div>
                </div>
                <div class="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                    <div class="font-medium text-green-800 dark:text-green-200">Trash Objects</div>
                    <div class="text-2xl font-bold text-green-600 dark:text-green-300">${trashObjects}</div>
                </div>
                <div class="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
                    <div class="font-medium text-yellow-800 dark:text-yellow-200">Estimated Weight</div>
                    <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-300">${estimatedWeight.toFixed(2)} kg</div>
                </div>
                <div class="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-lg">
                    <div class="font-medium text-purple-800 dark:text-purple-200">Model Used</div>
                    <div class="text-sm font-bold text-purple-600 dark:text-purple-300">${modelUsed}</div>
                </div>
            </div>
            ${detectionDetails}
        </div>
    `;
}

function showPhotoError(msg) {
    const errorElement = document.getElementById('photo-detection-error-message');
    const errorSection = document.getElementById('photo-detection-error');
    
    if (errorElement && errorSection) {
        errorElement.textContent = msg;
        errorSection.classList.remove('hidden');
    } else {
        console.warn('Photo error elements not found, showing notification instead');
        window.showNotification(msg, 'error');
    }
}

function hidePhotoResults() {
    const resultsSection = document.getElementById('photo-detection-results');
    if (resultsSection) {
        resultsSection.classList.add('hidden');
    }
}

function hidePhotoError() {
    const errorSection = document.getElementById('photo-detection-error');
    if (errorSection) {
        errorSection.classList.add('hidden');
    }
}

// Add this new function to setup location selector
function setupLocationSelector() {
    const locationSelectorPage = document.getElementById('location-selector-page');
    const closeLocationSelectorBtn = document.getElementById('close-location-selector');
    const locationSearchInput = document.getElementById('location-search-input');
    const confirmSelectedLocationBtn = document.getElementById('confirm-selected-location');
    
    // Close location selector
    if (closeLocationSelectorBtn) {
        closeLocationSelectorBtn.addEventListener('click', function() {
            closeLocationSelector();
        });
    }
    
    // Location search in selector
    if (locationSearchInput) {
        locationSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchLocationOnSelectorMap(this.value);
            }
        });
    }
    
    // Confirm location selection
    if (confirmSelectedLocationBtn) {
        confirmSelectedLocationBtn.addEventListener('click', function() {
            confirmLocationSelection();
        });
    }
}

// =================================================================================
//
//  MISSING PHOTO FLOW FUNCTIONS
//
// =================================================================================

// Add the missing processPhotoForLocation function with proper location handling
function processPhotoForLocation(file) {
    if (!file) {
        console.error('No file provided to processPhotoForLocation');
        return;
    }
    
    // Set the global photo file
    currentPhotoFile = file;
    
    // Show photo preview safely
    const photoPreview = document.getElementById('photo-preview');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    if (photoPreview && photoPreviewContainer) {
        const reader = new FileReader();
        reader.onload = function(e) {
            photoPreview.src = e.target.result;
            photoPreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
    
    // Show location status
    const locationStatusText = document.getElementById('location-status-text');
    if (locationStatusText) {
        locationStatusText.textContent = 'Checking photo for location data...';
    }
    
    // Try to extract coordinates from photo
    extractCoordinatesFromImage(file)
        .then(coordinates => {
            if (coordinates && coordinates.latitude && coordinates.longitude) {
                // Photo has GPS data
                const latitudeField = document.getElementById('photo-latitude') || document.getElementById('latitude');
                const longitudeField = document.getElementById('photo-longitude') || document.getElementById('longitude');
                
                if (latitudeField && longitudeField) {
                    latitudeField.value = coordinates.latitude;
                    longitudeField.value = coordinates.longitude;
                }
                
                // Update location status
                if (locationStatusText) {
                    locationStatusText.textContent = `Location found: ${parseFloat(coordinates.latitude).toFixed(4)}, ${parseFloat(coordinates.longitude).toFixed(4)}`;
                }
                
                // Show coordinates info
                const coordinatesInfo = document.getElementById('coordinates-info');
                const coordinatesText = document.getElementById('coordinates-text');
                if (coordinatesInfo && coordinatesText) {
                    coordinatesText.textContent = `Location: ${parseFloat(coordinates.latitude).toFixed(4)}, ${parseFloat(coordinates.longitude).toFixed(4)}`;
                    coordinatesInfo.classList.remove('hidden');
                }
                
                // Show the appropriate next step based on report method
                const reportMethod = document.querySelector('input[name="photo-report-method"]:checked')?.value;
                if (reportMethod === 'ai') {
                    // Show AI detection button
                    showPhotoDetectButton();
                    // Hide manual submit button
                    hideManualSubmitButton();
                } else {
                    // Show manual report section and submit button
                    const manualReportSection = document.getElementById('manual-report-section');
                    if (manualReportSection) {
                        manualReportSection.classList.remove('hidden');
                    }
                    showManualSubmitButton();
                    // Hide AI detect button
                    hidePhotoDetectButton();
                }
            } else {
                // No GPS data found, show manual location selection
                showPhotoManualLocationSection();
            }
        })
        .catch(error => {
            console.error('Error extracting coordinates:', error);
            // Show manual location selection on error
            showPhotoManualLocationSection();
        });
}

// Add the missing performPhotoDetection function
function performPhotoDetection() {
    if (!currentPhotoFile) {
        showPhotoError('No photo file selected');
        return;
    }
    
    const latitude = document.getElementById('photo-latitude')?.value || document.getElementById('latitude')?.value;
    const longitude = document.getElementById('photo-longitude')?.value || document.getElementById('longitude')?.value;
    
    if (!latitude || !longitude) {
        showPhotoError('Please select a location first');
        return;
    }
    
    // Show detection progress
    const progressDiv = document.getElementById('photo-detection-progress');
    const statusDiv = document.getElementById('photo-detection-status');
    if (progressDiv) progressDiv.classList.remove('hidden');
    if (statusDiv) statusDiv.textContent = 'Initializing AI model...';
    
    // Hide previous results and errors
    hidePhotoResults();
    hidePhotoError();
    
    // Get detection parameters
    const modelName = document.getElementById('photo-model-select')?.value || 'yolov8n';
    const confidenceThreshold = document.getElementById('photo-confidence-threshold')?.value || '0.3';
    
    // Create form data
    const formData = new FormData();
    formData.append('file', currentPhotoFile);
    formData.append('model_name', modelName);
    formData.append('confidence_threshold', confidenceThreshold);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    
    // Perform detection
    fetch('/api/detect-photo', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (progressDiv) progressDiv.classList.add('hidden');
        
        if (data.status === 'success') {
            showPhotoResults(data);
        } else {
            showPhotoError(data.message || 'Detection failed');
        }
    })
    .catch(error => {
        console.error('Detection error:', error);
        if (progressDiv) progressDiv.classList.add('hidden');
        showPhotoError('Detection failed: ' + error.message);
    });
}

// Add new function to submit AI detection results
async function submitPhotoAIReport(detectionData) {
    if (!currentPhotoFile) {
        window.showNotification('No photo file available', 'error');
        return;
    }
    
    const latitude = document.getElementById('photo-latitude')?.value || document.getElementById('latitude')?.value;
    const longitude = document.getElementById('photo-longitude')?.value || document.getElementById('longitude')?.value;
    
    if (!latitude || !longitude) {
        window.showNotification('No location coordinates available', 'error');
        return;
    }
    
    // Create form data with detection results
    const formData = new FormData();
    formData.append('file', currentPhotoFile);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('detection_data', JSON.stringify(detectionData));
    formData.append('report_type', 'ai_detection');
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.showNotification('AI report submitted successfully!', 'success');
            clearPhotoFlow();
            loadMapData(); // Refresh map
        } else {
            window.showNotification(result.message || 'Failed to submit AI report', 'error');
        }
    } catch (error) {
        console.error('AI report submission error:', error);
        window.showNotification('Network error: ' + error.message, 'error');
    }
}

