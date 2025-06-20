console.log('🚀 MODERN MAMALAND APP IS RUNNING!');

// Global variables accessible to all functions
let map;
let modalMap = null;
let selectedLocation = null;
let currentSearchLocation = null;
let currentSearchRadius = null;
let searchMarkers = [];
let searchRadiusCircle = null; // Add this to track the radius circle
let browserLocation = null; // Store user's browser location

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
let locationMap = null;
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
    console.log('=== MODERN APP INITIALIZATION ===');
    
    // Initialize all functionality
    initMap();
    setupEventListeners();
    setupMobileFeatures();
    setupPhotoCapture(); // Add photo capture setup
    requestUserLocationOnLoad(); // Ask for user's location
    
    // Initialize map with modern styling
    function initMap() {
        if (!map) {
            map = L.map('map-container').setView([20, 0], 2);
            
            // Modern map tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        }
        
        loadMapData();
    }
    
    // Load data points with modern markers
    function loadMapData() {
        fetch('/api/trash-data')
            .then(response => response.json())
            .then(data => {
                // Handle the new API response format
                const reports = data.data || data; // Support both new format (data.data) and old format (data)
                
                if (!Array.isArray(reports)) {
                    console.error('Invalid data format received:', data);
                    return;
                }
                
                reports.forEach(report => {
                    addModernMarker(report);
                });
                console.log(`Loaded ${reports.length} trash data points`);
            })
            .catch(error => {
                console.error('Error loading map data:', error);
                window.showNotification('Error loading map data', 'error');
            });
    }
    
    // Add modern markers with improved styling
    function addModernMarker(point) {
        const colors = {
            plastic: '#0ea5e9',    // primary blue
            paper: '#22c55e',      // accent green
            metal: '#f59e0b',      // amber
            glass: '#8b5cf6',      // purple
            organic: '#84cc16',    // lime
            electronic: '#ef4444'  // red
        };
        
        const iconColor = colors[point.trash_type] || '#64748b'; // default gray
        
        const marker = L.marker([point.latitude, point.longitude], {
            icon: L.divIcon({
                className: 'modern-marker',
                html: `
                    <div class="marker-container" style="
                        background-color: ${iconColor}; 
                        width: 16px; 
                        height: 16px; 
                        border-radius: 50%; 
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        transition: all 0.2s ease;
                    "></div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(map);
        
        const popupContent = `
            <div class="modern-popup">
                <div class="popup-header">
                    <span class="trash-type-badge" style="background-color: ${iconColor}">${point.trash_type || 'Unknown'}</span>
                </div>
                <div class="popup-content">
                    <div class="popup-item">
                        <strong>Weight:</strong> ${point.estimated_kg || 'Unknown'} kg
                    </div>
                    <div class="popup-item">
                        <strong>Sparcity:</strong> ${point.sparcity || 'Unknown'}
                    </div>
                    <div class="popup-item">
                        <strong>Cleanliness:</strong> ${point.cleanliness || 'Unknown'}
                    </div>
                    <div class="popup-item">
                        <strong>Reported:</strong> ${new Date(point.timestamp).toLocaleDateString()}
                    </div>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
    }
    
    // Set up modern event listeners
    function setupEventListeners() {
        console.log('Setting up modern event listeners');
        
        // File input with drag and drop
        const fileInput = document.getElementById('file');
        const fileUploadArea = document.querySelector('.file-upload-area');
        
        if (fileInput) {
            fileInput.addEventListener('change', handleFileInputChange);
            
            // Drag and drop functionality
            if (fileUploadArea) {
                fileUploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    fileUploadArea.classList.add('dragover');
                });
                
                fileUploadArea.addEventListener('dragleave', () => {
                    fileUploadArea.classList.remove('dragover');
                });
                
                fileUploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    fileUploadArea.classList.remove('dragover');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        fileInput.files = files;
                        handleFileInputChange({ target: fileInput });
                    }
                });
            }
        }
        
        // Form submission
        const uploadForm = document.getElementById('upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', handleUploadFormSubmit);
        }
        
        // Manual details toggle with modern animation
        const formCheckbox = document.getElementById('fill-form-check');
        if (formCheckbox) {
            formCheckbox.addEventListener('change', function() {
                const detailsForm = document.getElementById('details-form');
                
                if (this.checked) {
                    detailsForm.classList.remove('hidden');
                    detailsForm.classList.add('fade-in');
                } else {
                    detailsForm.classList.add('hidden');
                }
                
                window.updateSubmitButtonVisibility();
            });
        }
        
        // Map refresh with loading state
        const refreshButton = document.getElementById('refresh-map');
        if (refreshButton) {
            refreshButton.addEventListener('click', function() {
                this.classList.add('loading');
                this.innerHTML = '<i class="bi bi-arrow-clockwise animate-spin mr-1"></i>Refreshing...';
                
                setTimeout(() => {
                    clearSearchResults();
                    loadMapData();
                    this.classList.remove('loading');
                    this.innerHTML = '<i class="bi bi-arrow-clockwise mr-1"></i>Refresh';
                }, 500);
            });
        }
        
        // Search functionality
        const mainMapSearchBtn = document.getElementById('main-map-search-btn');
        const mainMapSearchInput = document.getElementById('main-map-search');
        
        if (mainMapSearchBtn && mainMapSearchInput) {
            mainMapSearchBtn.addEventListener('click', function() {
                const query = mainMapSearchInput.value.trim();
                if (query) {
                    window.searchMainMap(query);
                }
            });
            
            // Enter key support
            mainMapSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const query = this.value.trim();
                    if (query) {
                        window.searchMainMap(query);
                    }
                }
            });
        }
        
        // Custom tooltip for find-dirty-btn
        const findDirtyBtn = document.getElementById('find-dirty-btn');
        if (findDirtyBtn) {
            let tooltip = null;
            
            findDirtyBtn.addEventListener('mouseenter', function(e) {
                // Remove existing tooltip if any
                if (tooltip) {
                    tooltip.remove();
                }
                
                // Get button position
                const rect = this.getBoundingClientRect();
                
                // Create tooltip
                tooltip = document.createElement('div');
                tooltip.textContent = 'Discover trash hotspots';
                tooltip.style.cssText = `
                    position: fixed;
                    background: rgba(55, 65, 81, 0.95);
                    color: white;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 999999;
                    pointer-events: none;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    left: ${rect.left + (rect.width / 2)}px;
                    top: ${rect.top - 8}px;
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                    transition: opacity 0.2s ease-out;
                `;
                
                document.body.appendChild(tooltip);
                
                // Trigger fade in
                setTimeout(() => {
                    if (tooltip) {
                        tooltip.style.opacity = '1';
                    }
                }, 10);
            });
            
            findDirtyBtn.addEventListener('mouseleave', function() {
                if (tooltip) {
                    tooltip.style.opacity = '0';
                    setTimeout(() => {
                        if (tooltip) {
                            tooltip.remove();
                            tooltip = null;
                        }
                    }, 200);
                }
            });
            
            // Click event for finding dirty places
            findDirtyBtn.addEventListener('click', function() {
                if (currentSearchLocation && currentSearchRadius) {
                    findClosestDirtyPlaces(currentSearchLocation.lat, currentSearchLocation.lng, currentSearchRadius);
                } else {
                    window.showNotification('Please search for a location first and set a radius', 'warning');
                }
            });
        }
        
        // Radius input change handler
        const radiusInput = document.getElementById('search-radius');
        if (radiusInput) {
            radiusInput.addEventListener('change', function() {
                const newRadius = parseInt(this.value) || 1;
                currentSearchRadius = newRadius;
                
                // Update radius circle if it exists
                if (searchRadiusCircle && currentSearchLocation) {
                    map.removeLayer(searchRadiusCircle);
                    searchRadiusCircle = L.circle([currentSearchLocation.lat, currentSearchLocation.lng], {
                        radius: newRadius * 1000, // Convert km to meters
                        color: '#0ea5e9',
                        fillColor: '#0ea5e9',
                        fillOpacity: 0.1,
                        weight: 2
                    }).addTo(map);
                }
            });
        }
    }
    
    // Mobile-specific features
    function setupMobileFeatures() {
        // Touch-friendly interactions
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.classList.add('btn-mobile');
        });
        
        // Mobile navigation (if needed)
        if (window.innerWidth <= 768) {
            setupMobileNavigation();
        }
        
        // Responsive map height
        window.addEventListener('resize', () => {
            if (map) {
                map.invalidateSize();
            }
        });
    }
    
    // Mobile navigation setup
    function setupMobileNavigation() {
        // Add mobile-specific classes
        document.body.classList.add('mobile-view');
        
        // Ensure touch targets are large enough
        const touchTargets = document.querySelectorAll('button, input, select');
        touchTargets.forEach(target => {
            target.style.minHeight = '44px';
        });
    }
    
    // Modern file handling
    function handleFileInputChange(event) {
        console.log('handleFileInputChange called with files:', event.target.files);
        const file = event.target.files[0];
        if (file) {
            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
            handlePhotoCapture(file);
        } else {
            console.log('No file selected');
        }
    }
    
    // Enhanced coordinate checking
    function checkCoordinatesSimple(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;
            
            // Simple coordinate extraction (you might want to use a proper EXIF library)
            try {
                // This is a simplified version - in production, use a proper EXIF library
                const coordinates = extractCoordinatesFromImage(arrayBuffer);
                if (coordinates) {
                    document.getElementById('latitude').value = coordinates.lat;
                    document.getElementById('longitude').value = coordinates.lng;
                    
                    const coordinatesInfo = document.getElementById('coordinates-info');
                    const coordinatesText = document.getElementById('coordinates-text');
                    
                    if (coordinatesInfo && coordinatesText) {
                        coordinatesText.textContent = `Location: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
                        coordinatesInfo.classList.remove('hidden');
                        coordinatesInfo.classList.add('fade-in');
                    }
                    
                    window.updateSubmitButtonVisibility();
                }
            } catch (error) {
                console.log('No coordinates found in image');
            }
        };
        reader.readAsArrayBuffer(file);
    }
    
    // Simple coordinate extraction (placeholder)
    function extractCoordinatesFromImage(arrayBuffer) {
        return new Promise((resolve, reject) => {
            try {
                // Convert array buffer to base64 for EXIF extraction
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                
                // Try to extract EXIF data using a simple approach
                // Look for GPS coordinates in the image data
                const gpsLatitudeMatch = base64.match(/GPSLatitude[^}]*?([0-9]+\.[0-9]+)/i);
                const gpsLongitudeMatch = base64.match(/GPSLongitude[^}]*?([0-9]+\.[0-9]+)/i);
                
                if (gpsLatitudeMatch && gpsLongitudeMatch) {
                    const lat = parseFloat(gpsLatitudeMatch[1]);
                    const lng = parseFloat(gpsLongitudeMatch[1]);
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        console.log('GPS coordinates found in image:', { lat, lng });
                        resolve({ latitude: lat, longitude: lng });
                        return;
                    }
                }
                
                // If no GPS found, try to use the backend API
                console.log('No GPS found in image, trying backend extraction...');
                
                // Create a blob and send to backend for EXIF extraction
                const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
                const formData = new FormData();
                formData.append('file', blob, 'photo.jpg');
                
                fetch('/api/check-coordinates', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Backend coordinate extraction result:', data);
                    if (data.latitude && data.longitude) {
                        resolve({ latitude: data.latitude, longitude: data.longitude });
                    } else {
                        console.log('No coordinates found by backend either');
                        resolve(null);
                    }
                })
                .catch(error => {
                    console.error('Backend coordinate extraction failed:', error);
                    resolve(null);
                });
                
            } catch (error) {
                console.error('Error extracting coordinates:', error);
                resolve(null);
            }
        });
    }
    
    // Modern form submission
    function handleUploadFormSubmit(event) {
        // This function should ONLY be triggered by a user click on the submit button.
        // We prevent default to handle submission via fetch.
        event.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        const isSubmitting = submitBtn.disabled;

        if (isSubmitting) {
            console.log('Form submission already in progress. Ignoring additional trigger.');
            return;
        }

        const formData = new FormData(event.target);
        
        // Debug: Log form data
        console.log('handleUploadFormSubmit triggered. Form data:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        // Validate required fields
        const file = formData.get('file');
        const latitude = formData.get('latitude');
        const longitude = formData.get('longitude');
        
        if (!file || file.size === 0) {
            window.showNotification('Please select an image file to upload.', 'error');
            return;
        }
        
        // Validate coordinates - ensure they are valid numbers
        const latNum = parseFloat(latitude);
        const lngNum = parseFloat(longitude);
        
        if (!latitude || !longitude || isNaN(latNum) || isNaN(lngNum)) {
            window.showNotification('Please select a valid location', 'error');
            return;
        }
        
        // Create a new FormData with properly typed values
        const cleanFormData = new FormData();
        
        // Add the file
        cleanFormData.append('file', file);
        
        // Add coordinates as numbers
        cleanFormData.append('latitude', latNum.toString());
        cleanFormData.append('longitude', lngNum.toString());
        
        // Handle manual form data
        const fillFormCheckbox = document.getElementById('fill-form-check');
        if (fillFormCheckbox && fillFormCheckbox.checked) {
            cleanFormData.append('fill_form', 'true');
            
            // Get manual fields and ensure they are strings (even if empty)
            const trashType = formData.get('trash_type') || '';
            const estimatedKg = formData.get('estimated_kg') || '';
            const sparcity = formData.get('sparcity') || '';
            const cleanliness = formData.get('cleanliness') || '';
            
            cleanFormData.append('trash_type', trashType);
            
            // Only append estimated_kg if it's a valid number
            if (estimatedKg && estimatedKg.trim() !== '') {
                const kgNum = parseFloat(estimatedKg);
                if (!isNaN(kgNum)) {
                    cleanFormData.append('estimated_kg', kgNum.toString());
                }
            }
            
            cleanFormData.append('sparcity', sparcity);
            cleanFormData.append('cleanliness', cleanliness);
        } else {
            // If manual details are not enabled, set empty values
            cleanFormData.append('fill_form', 'false');
            cleanFormData.append('trash_type', '');
            // Don't append estimated_kg at all when manual form is not enabled
            cleanFormData.append('sparcity', '');
            cleanFormData.append('cleanliness', '');
        }
        
        // Show loading state
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin mr-2"></i>Submitting...';
        submitBtn.disabled = true;
        
        console.log('Final form data being sent:');
        for (let [key, value] of cleanFormData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        fetch('/upload', {
            method: 'POST',
            body: cleanFormData
        })
        .then(response => {
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Error response text:', text);
                    throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            if (data.status === 'success' || data.success) {
                window.showNotification('Report submitted successfully!', 'success');
                event.target.reset();

                // Add the new point to the map immediately
                if (map && data.metadata) {
                    try {
                        const newPoint = {
                            id: data.report_id,
                            latitude: parseFloat(data.metadata.latitude),
                            longitude: parseFloat(data.metadata.longitude),
                            // Use other metadata if available, otherwise use defaults
                            trash_type: data.metadata.trash_type || 'Mixed',
                            estimated_kg: data.metadata.estimated_kg || 1,
                            cleanliness: data.metadata.cleanliness || 3,
                        };
                        console.log('Adding new trash point to map:', newPoint);
                        addModernMarker(newPoint);
                        // Optionally, pan the map to the new point
                        map.panTo([newPoint.latitude, newPoint.longitude]);
                    } catch (e) {
                        console.error("Error adding new marker to map:", e);
                        // Fallback to full refresh if adding the marker fails
                        loadMapData();
                    }
                } else {
                    // Fallback to full refresh if map or metadata is not available
                    loadMapData();
                }

                // Reset photo preview
                const photoPreviewContainer = document.getElementById('photo-preview-container');
                const manualLocationSection = document.getElementById('manual-location-section');
                if (photoPreviewContainer) {
                    photoPreviewContainer.classList.add('hidden');
                }
                if (manualLocationSection) {
                    manualLocationSection.classList.add('hidden');
                }
                
                // Reset location status
                const locationStatus = document.getElementById('location-status');
                const locationStatusText = document.getElementById('location-status-text');
                if (locationStatus && locationStatusText) {
                    locationStatus.classList.remove('bg-green-50', 'border-green-200', 'bg-yellow-50', 'border-yellow-200', 'bg-blue-50', 'border-blue-200');
                    locationStatus.classList.add('bg-gray-50', 'border-gray-200');
                    locationStatusText.textContent = 'Checking photo for location data...';
                }
                
                document.getElementById('coordinates-info').classList.add('hidden');
                document.getElementById('details-form').classList.add('hidden');
                document.getElementById('fill-form-check').checked = false;
                
                // Hide the manual details checkbox section
                const fillFormCheck = document.getElementById('fill-form-check');
                const manualDetailsToggle = document.getElementById('manual-details-toggle');
                if (fillFormCheck) {
                    fillFormCheck.checked = false;
                }
                if (manualDetailsToggle) {
                    manualDetailsToggle.classList.add('hidden');
                }
                
                window.updateSubmitButtonVisibility();
                
                // Refresh map data
                loadMapData();
            } else {
                const errorMessage = data.message || data.error || 'Error submitting report';
                console.error('Server error:', errorMessage);
                window.showNotification(errorMessage, 'error');
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            const errorMessage = error.message || 'Error submitting report. Please try again.';
            window.showNotification(errorMessage, 'error');
        })
        .finally(() => {
            submitBtn.innerHTML = 'Submit Report';
            submitBtn.disabled = false;
        });
    }
    
    // Clear search results
    function clearSearchResults() {
        searchMarkers.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        searchMarkers = [];
        
        // Remove radius circle
        if (searchRadiusCircle) {
            map.removeLayer(searchRadiusCircle);
            searchRadiusCircle = null;
        }
        
        currentSearchLocation = null;
        currentSearchRadius = null;
        
        const findDirtyBtn = document.getElementById('find-dirty-btn');
        if (findDirtyBtn) {
            findDirtyBtn.disabled = true;
            findDirtyBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Find closest dirty places
    function findClosestDirtyPlaces(lat, lng, radius) {
        const findDirtyBtn = document.getElementById('find-dirty-btn');
        findDirtyBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin mr-1"></i>Searching...';
        findDirtyBtn.disabled = true;
        
        // Ensure radius circle is visible and properly sized
        if (searchRadiusCircle) {
            map.removeLayer(searchRadiusCircle);
        }
        searchRadiusCircle = L.circle([lat, lng], {
            radius: radius * 1000, // Convert km to meters
            color: '#ef4444', // Red color for dirty places search
            fillColor: '#ef4444',
            fillOpacity: 0.1,
            weight: 2
        }).addTo(map);
        
        fetch(`/api/find-dirty-places?lat=${lat}&lng=${lng}&max_distance=${radius}`)
            .then(response => response.json())
            .then(data => {
                // Handle the correct response format from backend
                const places = data.dirty_places?.dirty_places || data.dirty_places || [];
                const success = places.length > 0;
                
                if (success) {
                    places.forEach(place => {
                        const marker = L.marker([place.latitude, place.longitude], {
                            icon: L.divIcon({
                                className: 'dirty-place-marker',
                                html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            })
                        }).addTo(map);
                        
                        marker.bindPopup(`
                            <div class="modern-popup">
                                <div class="popup-header">
                                    <span class="trash-type-badge bg-red-500">Dirty Area</span>
                                </div>
                                <div class="popup-content">
                                    <div class="popup-item">
                                        <strong>Distance:</strong> ${place.distance_km.toFixed(2)} km
                                    </div>
                                    <div class="popup-item">
                                        <strong>Trash Type:</strong> ${place.trash_type || 'Unknown'}
                                    </div>
                                    <div class="popup-item">
                                        <strong>Weight:</strong> ${place.estimated_kg || 'Unknown'} kg
                                    </div>
                                    <div class="popup-item">
                                        <strong>Dirtiness Score:</strong> ${place.dirtiness_score || 'Unknown'}
                                    </div>
                                </div>
                            </div>
                        `);
                        
                        searchMarkers.push(marker);
                    });
                    
                    window.showNotification(`Found ${places.length} dirty areas nearby`, 'success');
                } else {
                    // Show summary message if available
                    const message = data.dirty_places?.summary?.message || data.summary?.message || 'No dirty areas found in the specified radius';
                    window.showNotification(message, 'info');
                }
            })
            .catch(error => {
                console.error('Error finding dirty places:', error);
                window.showNotification('Error searching for dirty places', 'error');
            })
            .finally(() => {
                findDirtyBtn.innerHTML = '<i class="bi bi-trash"></i>';
                findDirtyBtn.disabled = false;
            });
    }
    
    // Initialize modal when it's shown
    const locationModal = document.getElementById('locationModal');
    if (locationModal) {
        console.log('Location modal found, setting up event listeners');
        
        // Ensure modal is hidden by default
        locationModal.classList.remove('show');
        locationModal.style.display = 'none';
        
        locationModal.addEventListener('shown.bs.modal', function() {
            console.log('Modal shown event triggered');
            
            // Ensure modal is properly sized
            const modalDialog = locationModal.querySelector('.modal-dialog');
            const modalContent = locationModal.querySelector('.modal-content');
            const modalBody = locationModal.querySelector('.modal-body');
            
            if (modalDialog) {
                modalDialog.style.margin = '1rem auto';
                modalDialog.style.maxHeight = '90vh';
            }
            
            if (modalContent) {
                modalContent.style.maxHeight = '90vh';
                modalContent.style.display = 'flex';
                modalContent.style.flexDirection = 'column';
                modalContent.style.overflow = 'hidden';
            }
            
            if (modalBody) {
                modalBody.style.flex = '1';
                modalBody.style.overflowY = 'auto';
                modalBody.style.webkitOverflowScrolling = 'touch';
            }
            
            // Initialize map after a short delay to ensure DOM is ready
            setTimeout(() => {
                window.initializeModalMap();
                
                // Force map resize after initialization
                if (modalMap) {
                    setTimeout(() => {
                        modalMap.invalidateSize();
                    }, 200);
                }
            }, 100);
            
            // Reset modal state
            selectedLocation = null;
            disableConfirmButton();
            const display = document.getElementById('selected-location-display');
            if (display) {
                display.classList.add('hidden');
            }
            const searchInput = document.getElementById('location-search');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Ensure buttons are visible
            setTimeout(() => {
                ensureModalButtonsVisible();
            }, 300);
            
            // Handle mobile keyboard appearance
            if (window.innerWidth <= 768) {
                // Listen for viewport changes (keyboard appearance)
                const handleViewportChange = () => {
                    console.log('Viewport changed, adjusting modal');
                    const modalFooter = locationModal.querySelector('.modal-footer');
                    if (modalFooter) {
                        // Ensure footer stays visible above keyboard
                        modalFooter.style.position = 'sticky';
                        modalFooter.style.bottom = '0';
                        modalFooter.style.zIndex = '9999';
                    }
                };
                
                // Use ResizeObserver to detect viewport changes
                if (window.ResizeObserver) {
                    const resizeObserver = new ResizeObserver(handleViewportChange);
                    resizeObserver.observe(document.body);
                } else {
                    // Fallback for older browsers
                    window.addEventListener('resize', handleViewportChange);
                    window.addEventListener('orientationchange', handleViewportChange);
                }
            }
        });
        
        locationModal.addEventListener('hidden.bs.modal', function() {
            console.log('Modal hidden event triggered');
            // Clean up when modal is closed
            if (modalMap) {
                modalMap.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        modalMap.removeLayer(layer);
                    }
                });
            }
        });
        
        // Debug: Check if modal is accidentally shown
        setTimeout(() => {
            if (locationModal.classList.contains('show') || locationModal.style.display === 'block') {
                console.warn('Modal appears to be shown by default - hiding it');
                locationModal.classList.remove('show');
                locationModal.style.display = 'none';
            }
        }, 1000);
    } else {
        console.error('Location modal not found!');
    }
    
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/static/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }

    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button if needed
        const installButton = document.getElementById('install-app-btn');
        if (installButton) {
            installButton.style.display = 'block';
            installButton.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                    installButton.style.display = 'none';
                });
            });
        }
    });
    
    console.log('=== MODERN APP INITIALIZATION COMPLETE ===');

    // Handle photo capture and processing
    function handlePhotoCapture(file) {
        console.log('handlePhotoCapture called with file:', file.name, 'size:', file.size);

        // Attach file to the form's file input
        const fileInput = document.getElementById('file');
        if (fileInput) {
            try {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                console.log('File attached to form input:', fileInput.files[0].name, 'size:', fileInput.files[0].size);
            } catch (err) {
                console.error('Error attaching file to input:', err);
            }
        }
        
        // Hide manual details section initially
        const fillFormCheck = document.getElementById('fill-form-check');
        const detailsForm = document.getElementById('details-form');
        const manualDetailsToggle = document.getElementById('manual-details-toggle');
        if (fillFormCheck) {
            fillFormCheck.checked = false;
        }
        if (manualDetailsToggle) {
            manualDetailsToggle.classList.add('hidden');
        }
        if (detailsForm) {
            detailsForm.classList.add('hidden');
        }
        
        // Show photo preview
        const photoPreviewContainer = document.getElementById('photo-preview-container');
        const photoPreview = document.getElementById('photo-preview');
        
        if (photoPreviewContainer && photoPreview) {
            const reader = new FileReader();
            reader.onload = function(e) {
                photoPreview.src = e.target.result;
                photoPreviewContainer.classList.remove('hidden');
                photoPreviewContainer.classList.add('fade-in');
            };
            reader.readAsDataURL(file);
        }
        
        // Process photo for location
        processPhotoForLocation(file);
    }

    // Process photo to extract location
    function processPhotoForLocation(file) {
        console.log('processPhotoForLocation called with file:', file.name);
        const locationStatusText = document.getElementById('location-status-text');
        const manualLocationSection = document.getElementById('manual-location-section');

        const setLocation = (lat, lng, source) => {
            console.log('setLocation called with:', { lat, lng, source });
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
            
            const locationStatus = document.getElementById('location-status');
            locationStatusText.textContent = `Location from ${source}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            locationStatus.className = 'p-3 rounded-lg border bg-green-50 border-green-200 text-green-700 text-sm flex items-center gap-2';
            
            manualLocationSection.classList.add('hidden');
            window.showNotification(`Location set using ${source}!`, 'success');
            
            console.log('About to call showManualDetailsSection');
            try {
                showManualDetailsSection();
            } catch (error) {
                console.error('Error in showManualDetailsSection:', error);
            }
            
            // Update submit button visibility after showing manual details
            setTimeout(() => {
                window.updateSubmitButtonVisibility();
            }, 500);
        };

        const promptForAlternativeLocation = () => {
            // First, check if browser location is available and ask the user
            if (browserLocation && browserLocation.lat && browserLocation.lng) {
                showLocationConfirmation(
                    'Use Current Location?',
                    `We couldn't find GPS data in the photo. Would you like to use your current device location (${browserLocation.lat.toFixed(4)}, ${browserLocation.lng.toFixed(4)})?`,
                    () => { // onConfirm
                        setLocation(browserLocation.lat, browserLocation.lng, 'your device');
                    },
                    () => { // onDecline, user wants to select manually
                        console.log('User declined browser location. Showing manual selector.');
                        locationStatusText.textContent = 'Please select the report location on the map.';
                        manualLocationSection.classList.remove('hidden');
                        // Directly show the modal for manual selection
                        const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));
                        locationModal.show();
                        window.initializeModalMap();
                    }
                );
            } else {
                // If no browser location, go straight to manual selection
                console.log('No browser location available. Showing manual selector directly.');
                window.showNotification('Please select the report location on the map.', 'info');
                locationStatusText.textContent = 'Please select the report location on the map.';
                manualLocationSection.classList.remove('hidden');
                const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));
                locationModal.show();
                window.initializeModalMap();
            }
        };
        
        const reader = new FileReader();
        reader.onload = function(e) {
            extractCoordinatesFromImage(e.target.result)
                .then(exifCoords => {
                    if (exifCoords) {
                        // GPS found in photo, ask for confirmation
                        showLocationConfirmation(
                            'Photo Location Found',
                            `Your photo's location data says it was taken near ${exifCoords.latitude.toFixed(4)}, ${exifCoords.longitude.toFixed(4)}. Is this where the trash is?`,
                            () => { // onConfirm
                                setLocation(exifCoords.latitude, exifCoords.longitude, 'photo GPS');
                            },
                            () => { // onDecline
                                promptForAlternativeLocation();
                            }
                        );
                    } else {
                        // No GPS in photo, try browser location
                         promptForAlternativeLocation();
                    }
                })
                .catch(error => {
                    console.error('Error processing photo for location:', error);
                    window.showNotification('Error processing photo. Please proceed with manual location selection.', 'error');
                    promptForAlternativeLocation();
                });
        };
        reader.readAsArrayBuffer(file);
    }
    
    // Function to show manual details section
    function showManualDetailsSection() {
        console.log('showManualDetailsSection called');
        const fillFormCheck = document.getElementById('fill-form-check');
        const detailsForm = document.getElementById('details-form');
        const manualDetailsToggle = document.getElementById('manual-details-toggle');
        
        console.log('Elements found:', { fillFormCheck, detailsForm, manualDetailsToggle });
        
        // Add a small delay for smoother transition
        setTimeout(() => {
            if (manualDetailsToggle) {
                console.log('Showing manual details toggle');
                manualDetailsToggle.classList.remove('hidden');
                manualDetailsToggle.classList.add('fade-in');
            } else {
                console.log('manualDetailsToggle not found');
            }
            
            // Automatically show the details form
            if (detailsForm) {
                console.log('Automatically showing details form');
                detailsForm.classList.remove('hidden');
                detailsForm.classList.add('fade-in');
                
                // Also show the submit button
                const submitBtn = document.getElementById('submit-btn');
                if (submitBtn) {
                    submitBtn.classList.remove('hidden');
                }
            }
            
            // Add event listener for checkbox if not already added
            if (fillFormCheck && !fillFormCheck.hasAttribute('data-listener-added')) {
                fillFormCheck.setAttribute('data-listener-added', 'true');
                fillFormCheck.checked = true; // Auto-check the checkbox
                fillFormCheck.addEventListener('change', function() {
                    console.log('Checkbox changed:', this.checked);
                    if (this.checked) {
                        detailsForm.classList.remove('hidden');
                        detailsForm.classList.add('fade-in');
                    } else {
                        detailsForm.classList.add('hidden');
                    }
                });
            }
        }, 300); // 300ms delay for smoother transition
    }

    // Setup photo capture functionality
    function setupPhotoCapture() {
        const takePhotoBtn = document.getElementById('take-photo-btn');
        const uploadPhotoBtn = document.getElementById('upload-photo-btn');
        const retakePhotoBtn = document.getElementById('retake-photo-btn');
        const fileInput = document.getElementById('file');
        const photoPreviewContainer = document.getElementById('photo-preview-container');
        const photoPreview = document.getElementById('photo-preview');
        const locationStatus = document.getElementById('location-status');
        const locationStatusText = document.getElementById('location-status-text');
        const manualLocationSection = document.getElementById('manual-location-section');
        
        // Take Photo button - opens camera
        if (takePhotoBtn) {
            takePhotoBtn.addEventListener('click', function() {
                // Create a temporary file input for camera capture
                const cameraInput = document.createElement('input');
                cameraInput.type = 'file';
                cameraInput.accept = 'image/*';
                cameraInput.capture = 'environment'; // Use back camera
                
                cameraInput.addEventListener('change', function(e) {
                    if (e.target.files && e.target.files[0]) {
                        handlePhotoCapture(e.target.files[0]);
                    }
                });
                
                cameraInput.click();
            });
        }
        
        // Upload Photo button - opens file picker
        if (uploadPhotoBtn) {
            uploadPhotoBtn.addEventListener('click', function() {
                fileInput.click();
            });
        }
        
        // Retake Photo button
        if (retakePhotoBtn) {
            retakePhotoBtn.addEventListener('click', function() {
                resetPhotoCapture();
            });
        }
        
        // Reset photo capture
        function resetPhotoCapture() {
            photoPreviewContainer.classList.add('hidden');
            manualLocationSection.classList.add('hidden');
            
            // Hide manual details section
            const fillFormCheck = document.getElementById('fill-form-check');
            const detailsForm = document.getElementById('details-form');
            const manualDetailsToggle = document.getElementById('manual-details-toggle');
            if (fillFormCheck) {
                fillFormCheck.checked = false;
            }
            if (manualDetailsToggle) {
                manualDetailsToggle.classList.add('hidden');
            }
            if (detailsForm) {
                detailsForm.classList.add('hidden');
            }
            
            locationStatus.classList.remove('bg-green-50', 'border-green-200', 'bg-yellow-50', 'border-yellow-200', 'bg-blue-50', 'border-blue-200');
            locationStatus.classList.add('bg-gray-50', 'border-gray-200');
            locationStatusText.textContent = 'Checking photo for location data...';
            
            // Clear file input
            fileInput.value = '';
            
            // Don't clear coordinates - let them remain if they were previously set
            // This prevents 422 errors when submitting forms
            // document.getElementById('latitude').value = '';
            // document.getElementById('longitude').value = '';
            
            // Update submit button
            window.updateSubmitButtonVisibility();
        }
    }

    // Request user's location on page load
    function requestUserLocationOnLoad() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    console.log('Device location obtained:', position.coords);
                    // Store for later use
                    browserLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    window.deviceLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                },
                function(error) {
                    if (error.code === error.PERMISSION_DENIED) {
                        console.log('Location permission denied by user');
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        console.log('Location information unavailable');
                    } else if (error.code === error.TIMEOUT) {
                        console.log('Location request timed out');
                    } else if (error.message && error.message.includes('secure origins')) {
                        console.log('Geolocation requires HTTPS or localhost. Using http://0.0.0.0:8000 may cause this issue.');
                    } else {
                        console.log('Could not get browser location:', error.message);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        } else {
            console.log('Geolocation not supported by this browser');
        }
    }
}); 