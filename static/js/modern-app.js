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
    const latInput = document.getElementById('latitude');
    const photoPreviewContainer = document.getElementById('photo-preview-container');

    if (submitBtn && fileInput && latInput) {
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
    
    map.setView([searchCenter.lat, searchCenter.lng], 12, { animate: true });

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
    const selectorPage = document.getElementById('location-selector-page');
    selectorPage.classList.add('visible');
    
    // Initialize the map only if it hasn't been already
    if (!locationMap) {
        initializeLocationMap();
    } else {
        // If map already exists, just make sure its size is correct
        setTimeout(() => locationMap.invalidateSize(), 100);
    }
}

function closeLocationSelector() {
    const selectorPage = document.getElementById('location-selector-page');
    selectorPage.classList.remove('visible');
}

function initializeLocationMap() {
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
        
        document.getElementById('selected-location-info').textContent = 
            `Selected: ${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`;
            
        document.getElementById('confirm-selected-location').disabled = false;
    });

    // Handle search within the location selector
    const searchInput = document.getElementById('location-search-input');
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLocationOnSelectorMap(searchInput.value);
        }
    });
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
    if (selectedLocation) {
        document.getElementById('latitude').value = selectedLocation.lat;
        document.getElementById('longitude').value = selectedLocation.lng;
        
        const coordsText = `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`;
        document.getElementById('coordinates-text').textContent = `Location set to: ${coordsText}`;
        document.getElementById('coordinates-info').classList.remove('hidden');
        
        showManualDetailsSection();
        closeLocationSelector();
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
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function loadMapData() {
    fetch('/api/trash-data')
    .then(response => response.json())
    .then(response => {
        if (response.status === 'success' && response.data) {
            allTrashData = response.data; // Store all data
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
    uploadForm.addEventListener('submit', handleUploadFormSubmit);

    // Main map search
    document.getElementById('main-map-search-btn').addEventListener('click', window.searchMainMap);

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
}

function handleFileInputChange(event) {
    const file = event.target.files[0];
    if (file) {
        handlePhotoCapture(file);
    }
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
    if (submitBtn.disabled) return;

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
            document.getElementById('photo-preview-container').classList.add('hidden');
            document.getElementById('photo-preview').src = '';
            document.getElementById('details-form').classList.add('hidden');
            document.getElementById('manual-details-toggle').classList.add('hidden');
            document.getElementById('coordinates-info').classList.add('hidden');
            document.getElementById('submit-btn').classList.add('hidden');
            
            // Clear input fields
            form.querySelector('#file').value = '';
            form.querySelector('#latitude').value = '';
            form.querySelector('#longitude').value = '';
            form.querySelector('#trash-type').value = '';
            form.querySelector('#estimated-kg').value = '';
            form.querySelector('#sparcity').value = '';
            form.querySelector('#cleanliness').value = '';
            
        } else {
            window.showNotification(data.message || 'An error occurred.', 'error');
        }
    })
    .catch(error => {
        console.error('Submission error:', error);
        window.showNotification('Submission failed.', 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = 'Submit Report';
        submitBtn.disabled = false;
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

function handlePhotoCapture(file) {
    if(!file) return;

    const fileInput = document.getElementById('file');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('photo-preview').src = e.target.result;
        document.getElementById('photo-preview-container').classList.remove('hidden');
    };
    reader.readAsDataURL(file);

    processPhotoForLocation(file);
}

function processPhotoForLocation(file) {
    extractCoordinatesFromImage(file)
    .then(coords => {
        const statusText = document.getElementById('location-status-text');
        if (coords) {
            document.getElementById('latitude').value = coords.latitude;
            document.getElementById('longitude').value = coords.longitude;
            statusText.textContent = `Photo location found: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
            showManualDetailsSection();
        } else {
            statusText.textContent = 'No GPS data found in photo. Please select location.';
            document.getElementById('manual-location-section').classList.remove('hidden');
        }
    });
}

function showManualDetailsSection() {
    document.getElementById('manual-details-toggle').classList.remove('hidden');
    document.getElementById('fill-form-check').checked = true;
    document.getElementById('details-form').classList.remove('hidden');
    window.updateSubmitButtonVisibility();
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

// =================================================================================
//
//  APP INITIALIZATION
//
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== MODERN APP INITIALIZATION START ===');

    // Unregister all service workers to break cache
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
                console.log('Service Worker unregistered successfully.');
            }
        }).catch(function(err) {
            console.error('Service Worker unregistration failed: ', err);
        });
    }

    // Initialize all functionality
    initMap();
    loadMapData();
    setupEventListeners();
    setupPhotoCapture();
    requestUserLocationOnLoad();

    console.log('=== MODERN APP INITIALIZATION COMPLETE ===');
});