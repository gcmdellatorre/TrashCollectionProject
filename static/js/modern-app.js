console.log('🚀 MODERN MAMALAND APP IS RUNNING!');

// Global variables accessible to all functions
let map = null;
let modalMap = null;
let selectedLocation = null;
let currentSearchLocation = null;
let currentSearchRadius = 1; // Default 1km
let searchMarkers = [];
let searchRadiusCircle = null; // Add this to track the radius circle
let browserLocation = null; // Store user's browser location
let locationMap = null;
let locationModalInstance = null; // SINGLE INSTANCE FOR THE LOCATION MODAL

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

// Global functions accessible from HTML
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
            
            // Center map with smooth animation
            map.setView([lat, lng], 12, { animate: true });
            
            // Add radius circle visualization
            if (searchRadiusCircle) {
                map.removeLayer(searchRadiusCircle);
            }
            searchRadiusCircle = L.circle([lat, lng], {
                radius: currentSearchRadius * 1000, // Convert km to meters
                color: '#0ea5e9',
                fillColor: '#0ea5e9',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(map);
            
            // Enable find dirty places button
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

// Global function to initialize modal map
window.initializeModalMap = function() {
    if (!modalMap) {
        // Get the modal map container
        const mapContainer = document.getElementById('modal-map-container');
        if (!mapContainer) {
            console.error('Modal map container not found');
            return;
        }
        
        // Ensure the container has proper dimensions
        mapContainer.style.height = '300px';
        mapContainer.style.minHeight = '250px';
        mapContainer.style.maxHeight = '400px';
        
        // Initialize the map
        modalMap = L.map('modal-map-container').setView([0, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(modalMap);
        
        // Add click handler for manual location selection
        modalMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // Clear previous markers
            modalMap.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    modalMap.removeLayer(layer);
                }
            });
            
            // Add marker at clicked location
            const marker = L.marker([lat, lng]).addTo(modalMap);
            marker.bindPopup(`Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
            
            selectedLocation = { lat, lng };
            
            // Update UI
            updateModalLocationDisplay(`Manual selection: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            enableConfirmButton();
        });
        
        // Ensure the map doesn't interfere with modal scrolling
        modalMap.on('load', function() {
            console.log('Modal map loaded successfully');
            // Force a resize to ensure proper rendering
            setTimeout(() => {
                modalMap.invalidateSize();
            }, 100);
        });
    }
};

// Function to show a custom confirmation prompt
function showLocationConfirmation(title, message, onConfirm, onDecline) {
    const prompt = document.getElementById('location-confirmation-prompt');
    const titleEl = document.getElementById('confirmation-title');
    const messageEl = document.getElementById('confirmation-message');
    const confirmBtn = document.getElementById('confirmation-confirm-btn');
    const declineBtn = document.getElementById('confirmation-decline-btn');

    if (!prompt || !titleEl || !messageEl || !confirmBtn || !declineBtn) {
        console.error('Confirmation prompt elements not found!');
        // Fallback to native confirm
        if (window.confirm(message)) {
            onConfirm();
        } else {
            onDecline();
        }
        return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;

    // Clone and replace buttons to remove old event listeners
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

// Show location selector page overlay
window.showLocationSelector = function() {
    const page = document.getElementById('locationSelectorPage');
    if (page) {
        page.classList.add('show');
        document.body.style.overflow = 'hidden';
        initializeLocationMap();
    }
};

// Close location selector page overlay
window.closeLocationSelector = function() {
    const page = document.getElementById('locationSelectorPage');
    if (page) {
        page.classList.remove('show');
        document.body.style.overflow = '';
        selectedLocation = null;
        
        // Clear the map
        if (locationMap) {
            locationMap.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    locationMap.removeLayer(layer);
                }
            });
        }
        
        // Reset UI
        document.getElementById('location-search').value = '';
        const display = document.getElementById('selected-location-display');
        if (display) {
            display.classList.add('hidden');
        }
        disableConfirmButton();
    }
};

// Initialize location map for the page overlay
function initializeLocationMap() {
    if (!locationMap) {
        const mapContainer = document.getElementById('location-map');
        if (!mapContainer) {
            console.error('Location map container not found');
            return;
        }
        
        // Initialize the map
        locationMap = L.map('location-map').setView([0, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(locationMap);
        
        // Add click handler for manual location selection
        locationMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // Clear previous markers
            locationMap.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    locationMap.removeLayer(layer);
                }
            });
            
            // Add marker at clicked location
            const marker = L.marker([lat, lng]).addTo(locationMap);
            marker.bindPopup(`Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
            
            selectedLocation = { lat, lng };
            
            // Update UI
            updateLocationDisplay(`Manual selection: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            enableConfirmButton();
        });
    }
    
    // Force a resize to ensure proper rendering
    setTimeout(() => {
        locationMap.invalidateSize();
    }, 100);
}

// Search location in the page overlay
window.searchLocation = function() {
    const query = document.getElementById('location-search').value;
    if (!query) {
        console.log("Search query is empty.");
        return;
    }

    const searchUrl = `/api/search-location?q=${encodeURIComponent(query)}`;

    fetch(searchUrl)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            
            // Clear previous markers
            locationMap.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    locationMap.removeLayer(layer);
                }
            });
            
            // Center map and add marker
            locationMap.setView([lat, lng], 15);
            const marker = L.marker([lat, lng]).addTo(locationMap);
            marker.bindPopup(`Found: ${result.display_name}`).openPopup();
            
            selectedLocation = { lat, lng };
            
            // Update UI
            updateLocationDisplay(`Found: ${result.display_name}`);
            enableConfirmButton();
        } else {
            window.showNotification('Location not found. Please try a different search term.', 'error');
        }
    })
    .catch(error => {
        console.error('Search error:', error);
        window.showNotification('Error searching for location. Please check your connection.', 'error');
    });
};

// Update location display
function updateLocationDisplay(locationText) {
    const display = document.getElementById('selected-location-display');
    const text = document.getElementById('selected-location-text');
    
    if (display && text) {
        text.textContent = locationText;
        display.classList.remove('hidden');
    }
}

// Function to update the selected location display in modal
function updateModalLocationDisplay(locationText) {
    const display = document.getElementById('selected-location-display');
    const text = document.getElementById('selected-location-text');
    
    if (display && text) {
        text.textContent = locationText;
        display.classList.remove('hidden');
        display.classList.add('fade-in');
    }
}

// Function to ensure modal buttons are always visible and functional
function ensureModalButtonsVisible() {
    const modalFooter = document.querySelector('#locationModal .modal-footer');
    const confirmBtn = document.getElementById('confirm-location-btn');
    const cancelBtn = document.querySelector('#locationModal button[data-bs-dismiss="modal"]');
    
    console.log('Ensuring modal buttons are visible...');
    console.log('Modal footer found:', !!modalFooter);
    console.log('Confirm button found:', !!confirmBtn);
    console.log('Cancel button found:', !!cancelBtn);
    
    if (modalFooter) {
        modalFooter.style.display = 'flex';
        modalFooter.style.visibility = 'visible';
        modalFooter.style.opacity = '1';
        modalFooter.style.zIndex = '1003';
        modalFooter.style.pointerEvents = 'auto';
        
        // On mobile, use sticky positioning to stay above keyboard
        if (window.innerWidth <= 768) {
            modalFooter.style.position = 'sticky';
            modalFooter.style.bottom = '0';
            modalFooter.style.left = '0';
            modalFooter.style.right = '0';
            modalFooter.style.zIndex = '9999';
            modalFooter.style.flexShrink = '0';
            modalFooter.style.marginTop = 'auto';
            modalFooter.style.paddingBottom = 'max(1rem, env(safe-area-inset-bottom))';
        } else {
            modalFooter.style.position = 'relative';
        }
        
        console.log('Modal footer styles applied');
    }
    
    if (confirmBtn) {
        confirmBtn.style.display = 'block';
        confirmBtn.style.visibility = 'visible';
        confirmBtn.style.opacity = '1';
        confirmBtn.style.pointerEvents = 'auto';
        confirmBtn.style.zIndex = '1004';
        console.log('Confirm button ensured visible');
    } else {
        console.error('Confirm button not found!');
    }
    
    if (cancelBtn) {
        cancelBtn.style.display = 'block';
        cancelBtn.style.visibility = 'visible';
        cancelBtn.style.opacity = '1';
        cancelBtn.style.pointerEvents = 'auto';
        cancelBtn.style.zIndex = '1004';
        console.log('Cancel button ensured visible');
    } else {
        console.error('Cancel button not found!');
    }
    
    // Force a reflow to ensure styles are applied
    if (modalFooter) {
        modalFooter.offsetHeight;
    }
}

// Enable confirm button
function enableConfirmButton() {
    const confirmBtn = document.getElementById('confirm-location-btn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Disable confirm button
function disableConfirmButton() {
    const confirmBtn = document.getElementById('confirm-location-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// Confirm location selection
window.confirmLocation = function() {
    if (selectedLocation) {
        // Update form fields
        document.getElementById('latitude').value = selectedLocation.lat;
        document.getElementById('longitude').value = selectedLocation.lng;
        
        // Update coordinates display
        const coordinatesInfo = document.getElementById('coordinates-info');
        const coordinatesText = document.getElementById('coordinates-text');
        if (coordinatesInfo && coordinatesText) {
            coordinatesText.textContent = `Location: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`;
            coordinatesInfo.classList.remove('hidden');
        }
        
        // Hide manual location section
        const manualSection = document.getElementById('manual-location-section');
        if (manualSection) {
            manualSection.classList.add('hidden');
        }
        
        // Close the location selector
        closeLocationSelector();
        
        // Show success notification
        window.showNotification('Location selected successfully!', 'success');
        
        // Update submit button visibility
        window.updateSubmitButtonVisibility();
    }
};

window.searchModalMap = function(query) {
    if (!modalMap) {
        window.initializeModalMap();
    }
    
    if (!query.trim()) {
        window.showNotification('Please enter a location to search', 'warning');
        return;
    }
    
    const searchBtn = document.getElementById('search-btn');
    const originalText = searchBtn.innerHTML;
    
    // Show loading state
    searchBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin mr-1"></i>Searching...';
    searchBtn.disabled = true;
    searchBtn.classList.add('loading');
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                // Clear previous markers
                modalMap.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        modalMap.removeLayer(layer);
                    }
                });
                
                // Center map and add marker
                modalMap.setView([lat, lng], 15);
                const marker = L.marker([lat, lng]).addTo(modalMap);
                marker.bindPopup(`Found: ${result.display_name}`).openPopup();
                
                selectedLocation = { lat, lng };
                
                // Update UI
                updateModalLocationDisplay(`Found: ${result.display_name}`);
                console.log('Location found, enabling confirm button...');
                enableConfirmButton();
                
                // Ensure buttons are visible after a short delay
                setTimeout(() => {
                    ensureModalButtonsVisible();
                }, 100);
                
                // Multiple attempts to ensure buttons are visible (especially for mobile)
                setTimeout(() => {
                    ensureModalButtonsVisible();
                    console.log('Second attempt to ensure buttons visible');
                }, 300);
                
                setTimeout(() => {
                    ensureModalButtonsVisible();
                    console.log('Third attempt to ensure buttons visible');
                }, 500);
                
                // Debug: Check button state after enabling
                setTimeout(() => {
                    const confirmBtn = document.getElementById('confirm-location-btn');
                    const cancelBtn = document.querySelector('#locationModal button[data-bs-dismiss="modal"]');
                    const modalFooter = document.querySelector('#locationModal .modal-footer');
                    
                    console.log('Confirm button state:', {
                        exists: !!confirmBtn,
                        disabled: confirmBtn?.disabled,
                        display: confirmBtn?.style.display,
                        visibility: confirmBtn?.style.visibility,
                        classes: confirmBtn?.className,
                        offsetHeight: confirmBtn?.offsetHeight
                    });
                    console.log('Cancel button state:', {
                        exists: !!cancelBtn,
                        display: cancelBtn?.style.display,
                        visibility: cancelBtn?.style.visibility,
                        offsetHeight: cancelBtn?.offsetHeight
                    });
                    console.log('Modal footer state:', {
                        exists: !!modalFooter,
                        display: modalFooter?.style.display,
                        visibility: modalFooter?.style.visibility,
                        offsetHeight: modalFooter?.offsetHeight
                    });
                    
                    // If buttons are still not visible, force them to be visible
                    if (confirmBtn && (confirmBtn.style.display === 'none' || confirmBtn.style.visibility === 'hidden' || confirmBtn.offsetHeight === 0)) {
                        console.log('Forcing confirm button to be visible');
                        ensureModalButtonsVisible();
                    }
                    
                    // On mobile, ensure the footer is at the bottom
                    if (window.innerWidth <= 768) {
                        if (modalFooter) {
                            modalFooter.style.position = 'sticky';
                            modalFooter.style.bottom = '0';
                            modalFooter.style.left = '0';
                            modalFooter.style.right = '0';
                            modalFooter.style.zIndex = '9999';
                            modalFooter.style.flexShrink = '0';
                            modalFooter.style.marginTop = 'auto';
                            console.log('Mobile footer positioned sticky at bottom');
                            
                            // Ensure modal body is scrollable
                            const modalBody = document.querySelector('#locationModal .modal-body');
                            if (modalBody) {
                                modalBody.style.flex = '1';
                                modalBody.style.overflowY = 'auto';
                                modalBody.style.webkitOverflowScrolling = 'touch';
                                console.log('Modal body made scrollable');
                            }
                        }
                    }
                }, 200);
                
                window.showNotification(`Location selected: ${result.display_name}`, 'success');
            } else {
                window.showNotification('Location not found. Please try a different search term.', 'error');
                disableConfirmButton();
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            window.showNotification('Error searching for location', 'error');
            disableConfirmButton();
        })
        .finally(() => {
            searchBtn.innerHTML = originalText;
            searchBtn.disabled = false;
            searchBtn.classList.remove('loading');
        });
};

// Global test function to manually show manual details form
window.testShowManualDetails = function() {
    console.log('Testing manual details form display...');
    const fillFormCheck = document.getElementById('fill-form-check');
    const detailsForm = document.getElementById('details-form');
    const manualDetailsToggle = document.getElementById('manual-details-toggle');
    const submitBtn = document.getElementById('submit-btn');
    
    console.log('Elements found:', { 
        fillFormCheck: !!fillFormCheck, 
        detailsForm: !!detailsForm, 
        manualDetailsToggle: !!manualDetailsToggle,
        submitBtn: !!submitBtn 
    });
    
    if (manualDetailsToggle) {
        manualDetailsToggle.classList.remove('hidden');
        console.log('✓ Manual details toggle shown');
    }
    
    if (detailsForm) {
        detailsForm.classList.remove('hidden');
        console.log('✓ Details form shown');
    }
    
    if (fillFormCheck) {
        fillFormCheck.checked = true;
        console.log('✓ Checkbox checked');
    }
    
    if (submitBtn) {
        submitBtn.classList.remove('hidden');
        console.log('✓ Submit button shown');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== MODERN APP INITIALIZATION START ===');
    
    // Initialize the location modal instance on the window object to make it globally accessible
    const locationModalEl = document.getElementById('locationModal');
    if (locationModalEl) {
        window.locationModalInstance = new bootstrap.Modal(locationModalEl);
        console.log('Location modal instance created successfully.');
    } else {
        console.error("CRITICAL: Location modal element not found on DOMContentLoaded!");
    }
    
    // Initialize all functionality
    initMap();
    loadMapData();
    setupEventListeners();
    setupPhotoCapture();
    requestUserLocationOnLoad();
    
    console.log('=== MODERN APP INITIALIZATION COMPLETE ===');
});

function requestUserLocationOnLoad() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                browserLocation = { lat, lng };
                console.log('Browser location:', browserLocation);
                promptForAlternativeLocation();
            },
            (error) => {
                console.error('Error getting browser location:', error);
                promptForAlternativeLocation();
            }
        );
    } else {
        console.error('Geolocation is not supported by this browser.');
        promptForAlternativeLocation();
    }
}

function promptForAlternativeLocation() {
    const locationStatusText = document.getElementById('location-status-text');
    const manualLocationSection = document.getElementById('manual-location-section');
    
    if (browserLocation) {
        // If browser location is available, show confirmation
        showLocationConfirmation(
            'Location Confirmation',
            'Do you want to use the browser location?',
            () => {
                console.log('User accepted browser location.');
                locationStatusText.textContent = 'Using browser location.';
                manualLocationSection.classList.add('hidden');
                if (window.locationModalInstance) {
                    window.locationModalInstance.show();
                    window.initializeModalMap();
                } else {
                    console.error("Location modal was not initialized, cannot show.");
                }
            },
            () => { // onDecline, user wants to select manually
                console.log('User declined browser location. Showing manual selector.');
                locationStatusText.textContent = 'Please select the report location on the map.';
                manualLocationSection.classList.remove('hidden');
                if (window.locationModalInstance) {
                    window.locationModalInstance.show();
                    window.initializeModalMap();
                } else {
                    console.error("Location modal was not initialized, cannot show.");
                }
            }
        );
    } else {
        // If no browser location, go straight to manual selection
        console.log('No browser location available. Showing manual selector directly.');
        window.showNotification('Please select the report location on the map.', 'info');
        locationStatusText.textContent = 'Please select the report location on the map.';
        manualLocationSection.classList.remove('hidden');
        if (window.locationModalInstance) {
            window.locationModalInstance.show();
            window.initializeModalMap();
        } else {
            console.error("Location modal was not initialized, cannot show.");
        }
    }
} 