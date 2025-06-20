//
// Mamaland Trash Collection App - Modern JavaScript
//

// =================================================================================
//
//  CORE APPLICATION STATE & GLOBAL VARIABLES
//
// =================================================================================

let map = null;
let modalMap = null;
let locationMap = null;
let browserLocation = null;
let selectedLocation = null;
let searchRadiusCircle = null;
let currentSearchLocation = null;
let currentSearchRadius = 1; // Default 1km
let locationModalInstance = null; // SINGLE INSTANCE FOR THE LOCATION MODAL


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

            currentSearchLocation = { lat, lng };
            currentSearchRadius = parseInt(document.getElementById('search-radius').value) || 1;

            map.setView([lat, lng], 12, { animate: true });

            if (searchRadiusCircle) {
                map.removeLayer(searchRadiusCircle);
            }
            searchRadiusCircle = L.circle([lat, lng], {
                radius: currentSearchRadius * 1000,
                color: '#0ea5e9',
                fillColor: '#0ea5e9',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(map);

            const findDirtyBtn = document.getElementById('find-dirty-btn');
            if (findDirtyBtn) {
                findDirtyBtn.disabled = false;
                findDirtyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }

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

window.initializeModalMap = function() {
    if (!modalMap) {
        const mapContainer = document.getElementById('modal-map-container');
        if (!mapContainer) {
            console.error('Modal map container not found');
            return;
        }

        mapContainer.style.height = '300px';
        modalMap = L.map('modal-map-container').setView([0, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(modalMap);

        modalMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            modalMap.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    modalMap.removeLayer(layer);
                }
            });

            const marker = L.marker([lat, lng]).addTo(modalMap);
            marker.bindPopup(`Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();

            selectedLocation = { lat, lng };
            document.getElementById('selected-location-display').textContent = `Manual selection: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            document.getElementById('confirm-location-btn').disabled = false;
        });

        setTimeout(() => modalMap.invalidateSize(), 100);
    }
};

function showLocationConfirmation(title, message, onConfirm, onDecline) {
    const prompt = document.getElementById('location-confirmation-prompt');
    const titleEl = document.getElementById('confirmation-title');
    const messageEl = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirmation-confirm-btn');
    const declineBtn = document.getElementById('confirmation-decline-btn');

    if (!prompt || !titleEl || !messageEl || !confirmBtn || !declineBtn) {
        if (window.confirm(message)) {
            onConfirm();
        } else {
            onDecline();
        }
        return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    const newDeclineBtn = declineBtn.cloneNode(true);
    declineBtn.parentNode.replaceChild(newDeclineBtn, declineBtn);

    newConfirmBtn.addEventListener('click', () => {
        prompt.classList.add('hidden');
        onConfirm();
    });

    newDeclineBtn.addEventListener('click', () => {
        prompt.classList.add('hidden');
        onDecline();
    });

    prompt.classList.remove('hidden');
}

function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function loadMapData() {
    fetch('/api/data')
    .then(response => response.json())
    .then(data => {
        console.log(`Loaded ${data.length} trash data points`);
        data.forEach(point => addModernMarker(point));
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
}

function setupEventListeners() {
    const fileInput = document.getElementById('file');
    fileInput.addEventListener('change', handleFileInputChange);

    const uploadForm = document.getElementById('upload-form');
    uploadForm.addEventListener('submit', handleUploadFormSubmit);

    document.getElementById('confirm-location-btn').addEventListener('click', () => {
        if (selectedLocation) {
            document.getElementById('latitude').value = selectedLocation.lat;
            document.getElementById('longitude').value = selectedLocation.lng;
            showManualDetailsSection();
            if(locationModalInstance) locationModalInstance.hide();
        }
    });
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

    const formData = new FormData(event.target);
    const file = formData.get('file');

    if (!file || file.size === 0) {
        window.showNotification('Please select an image file to upload.', 'error');
        return;
    }
    
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin mr-2"></i>Submitting...';
    submitBtn.disabled = true;

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.showNotification('Report submitted successfully!', 'success');
            event.target.reset();
            addModernMarker({
                id: data.report_id,
                latitude: parseFloat(data.metadata.latitude),
                longitude: parseFloat(data.metadata.longitude),
                ...data.metadata
            });
            map.panTo([parseFloat(data.metadata.latitude), parseFloat(data.metadata.longitude)]);
            document.getElementById('photo-preview-container').classList.add('hidden');
            document.getElementById('details-form').classList.add('hidden');
            document.getElementById('manual-details-toggle').classList.add('hidden');
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
        if (coords) {
            showLocationConfirmation('Photo Location Found', `Use location from photo: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}?`, 
            () => {
                document.getElementById('latitude').value = coords.latitude;
                document.getElementById('longitude').value = coords.longitude;
                showManualDetailsSection();
            }, 
            promptForAlternativeLocation);
        } else {
            promptForAlternativeLocation();
        }
    });
}

function promptForAlternativeLocation() {
    if (browserLocation) {
        showLocationConfirmation('Use Device Location?', `Use your current location: ${browserLocation.lat.toFixed(4)}, ${browserLocation.lng.toFixed(4)}?`, 
        () => {
            document.getElementById('latitude').value = browserLocation.lat;
            document.getElementById('longitude').value = browserLocation.lng;
            showManualDetailsSection();
        }, 
        () => {
            if(locationModalInstance) locationModalInstance.show();
        });
    } else {
        if(locationModalInstance) locationModalInstance.show();
    }
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

console.log('=== MODERN APP INITIALIZATION START ===');

// Initialize the location modal instance once and for all
const locationModalEl = document.getElementById('locationModal');
if (locationModalEl) {
    locationModalInstance = new bootstrap.Modal(locationModalEl);
    console.log('Location modal instance created successfully.');
} else {
    console.error("CRITICAL: Location modal element not found!");
}

// Initialize all functionality
initMap();
loadMapData();
setupEventListeners();
setupPhotoCapture();
requestUserLocationOnLoad();

console.log('=== MODERN APP INITIALIZATION COMPLETE ===');