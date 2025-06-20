console.log('🚀 MODERN MAMALAND APP IS RUNNING!');

console.log('🔍 DEBUGGING HTML ELEMENTS:');
console.log('file-preview:', !!document.getElementById('file-preview'));
console.log('coordinates-info:', !!document.getElementById('coordinates-info'));
console.log('submit-btn:', !!document.getElementById('submit-btn'));
console.log('modal-map:', !!document.getElementById('modal-map'));
console.log('locationModal:', !!document.getElementById('locationModal'));

// List ALL elements with IDs:
const allElements = document.querySelectorAll('[id]');
console.log('ALL ELEMENTS WITH IDs:');
allElements.forEach(el => console.log('-', el.id, el.tagName));

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== MODERN APP INITIALIZATION ===');
    
    // Global variables
    let map;
    let modalMap = null;
    let selectedLocation = null;
    let currentSearchLocation = null;
    let currentSearchRadius = null;
    let searchMarkers = [];
    
    // Initialize the application
    initMap();
    setupEventListeners();
    setupMobileFeatures();
    
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
                // Clear existing markers
                map.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        map.removeLayer(layer);
                    }
                });
                
                const validEntries = data.filter(point => point.latitude && point.longitude);
                
                if (validEntries.length > 0) {
                    validEntries.forEach(point => {
                        addModernMarker(point);
                    });
                    console.log(`Loaded ${validEntries.length} trash data points`);
                } else {
                    console.log('No valid data points with coordinates found');
                }
            })
            .catch(error => {
                console.error('Error loading map data:', error);
                showNotification('Error loading map data', 'error');
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
                
                updateSubmitButtonVisibility();
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
                    searchMainMap(query);
                }
            });
            
            // Enter key support
            mainMapSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const query = this.value.trim();
                    if (query) {
                        searchMainMap(query);
                    }
                }
            });
        }
        
        // Find dirty places button
        const findDirtyBtn = document.getElementById('find-dirty-btn');
        if (findDirtyBtn) {
            findDirtyBtn.addEventListener('click', function() {
                if (currentSearchLocation) {
                    findClosestDirtyPlaces(currentSearchLocation.lat, currentSearchLocation.lng, currentSearchRadius);
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
    
    // Modern search functionality
    function searchMainMap(query) {
        if (!query.trim()) {
            showNotification('Please enter a location to search', 'warning');
            return;
        }
        
        const searchBtn = document.getElementById('main-map-search-btn');
        const originalText = searchBtn.innerHTML;
        
        // Show loading state
        searchBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin"></i>';
        searchBtn.disabled = true;
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const result = data[0];
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    
                    currentSearchLocation = { lat, lng };
                    currentSearchRadius = parseInt(document.getElementById('search-radius').value) || 1;
                    
                    // Center map with smooth animation
                    map.setView([lat, lng], 12, { animate: true });
                    
                    // Enable find dirty places button
                    const findDirtyBtn = document.getElementById('find-dirty-btn');
                    if (findDirtyBtn) {
                    findDirtyBtn.disabled = false;
                        findDirtyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                    
                    showNotification(`Found: ${result.display_name}`, 'success');
                } else {
                    showNotification('Location not found. Please try a different search term.', 'error');
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                showNotification('Error searching for location. Please check your connection.', 'error');
            })
            .finally(() => {
                searchBtn.innerHTML = originalText;
                searchBtn.disabled = false;
            });
    }
    
    // Modern notification system
    function showNotification(message, type = 'info') {
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
    }
        
    // Modern file handling
    function handleFileInputChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Show preview
        const previewContainer = document.getElementById('preview-container');
        const imagePreview = document.getElementById('image-preview');
        
        if (previewContainer && imagePreview) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                previewContainer.classList.remove('hidden');
                previewContainer.classList.add('fade-in');
            };
            reader.readAsDataURL(file);
        }
        
        // Check for coordinates
        checkCoordinatesSimple(file);
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
                    
                    updateSubmitButtonVisibility();
            }
            } catch (error) {
                console.log('No coordinates found in image');
            }
        };
        reader.readAsArrayBuffer(file);
    }
    
    // Simple coordinate extraction (placeholder)
    function extractCoordinatesFromImage(arrayBuffer) {
        // This is a placeholder - implement proper EXIF extraction
        // For now, return null to indicate no coordinates found
        return null;
    }

    // Update submit button visibility
    function updateSubmitButtonVisibility() {
            const submitBtn = document.getElementById('submit-btn');
        const fileInput = document.getElementById('file');
            const latInput = document.getElementById('latitude');
        
        if (submitBtn && fileInput && latInput) {
            const hasFile = fileInput.files.length > 0;
            const hasCoordinates = latInput.value && latInput.value.trim() !== '';
            
            if (hasFile && hasCoordinates) {
                submitBtn.classList.remove('hidden');
                submitBtn.classList.add('fade-in');
            } else {
                submitBtn.classList.add('hidden');
            }
        }
    }
    
    // Modern form submission
    function handleUploadFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitBtn = document.getElementById('submit-btn');
        
        // Show loading state
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split animate-spin mr-2"></i>Submitting...';
        submitBtn.disabled = true;
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Report submitted successfully!', 'success');
                event.target.reset();
                document.getElementById('preview-container').classList.add('hidden');
                document.getElementById('coordinates-info').classList.add('hidden');
                document.getElementById('details-form').classList.add('hidden');
                document.getElementById('fill-form-check').checked = false;
                updateSubmitButtonVisibility();
                
                // Refresh map data
                loadMapData();
            } else {
                showNotification(data.error || 'Error submitting report', 'error');
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            showNotification('Error submitting report. Please try again.', 'error');
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
        
        fetch(`/api/find-dirty-places?lat=${lat}&lng=${lng}&radius=${radius}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.places.length > 0) {
                    data.places.forEach(place => {
                        const marker = L.marker([place.lat, place.lng], {
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
                                        <strong>Distance:</strong> ${place.distance.toFixed(2)} km
                                    </div>
                                    <div class="popup-item">
                                        <strong>Reports:</strong> ${place.report_count}
                                    </div>
                                </div>
                            </div>
                        `);
                        
                        searchMarkers.push(marker);
                    });
                    
                    showNotification(`Found ${data.places.length} dirty areas nearby`, 'success');
                } else {
                    showNotification('No dirty areas found in the specified radius', 'info');
                }
            })
            .catch(error => {
                console.error('Error finding dirty places:', error);
                showNotification('Error searching for dirty places', 'error');
            })
            .finally(() => {
                findDirtyBtn.innerHTML = '<i class="bi bi-trash"></i>';
                findDirtyBtn.disabled = false;
        });
    }
    
    // Initialize modal map
    function initializeModalMap() {
        if (!modalMap) {
            modalMap = L.map('modal-map-container').setView([0, 0], 2);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(modalMap);
    }
    }
    
    // Search modal map
    function searchModalMap(query) {
        if (!modalMap) {
            initializeModalMap();
        }
        
        if (!query.trim()) {
            showNotification('Please enter a location to search', 'warning');
            return;
        }
        
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
                    showNotification(`Location selected: ${result.display_name}`, 'success');
                } else {
                    showNotification('Location not found. Please try a different search term.', 'error');
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                showNotification('Error searching for location', 'error');
            });
        }
        
    // Confirm location
    function confirmLocation() {
        if (selectedLocation) {
            document.getElementById('latitude').value = selectedLocation.lat;
            document.getElementById('longitude').value = selectedLocation.lng;
            
            const coordinatesInfo = document.getElementById('coordinates-info');
            const coordinatesText = document.getElementById('coordinates-text');
            
            if (coordinatesInfo && coordinatesText) {
                coordinatesText.textContent = `Location: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`;
                coordinatesInfo.classList.remove('hidden');
                coordinatesInfo.classList.add('fade-in');
            }
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('locationModal'));
            if (modal) {
                modal.hide();
            }
            
            updateSubmitButtonVisibility();
            showNotification('Location confirmed!', 'success');
        } else {
            showNotification('Please select a location first', 'warning');
        }
    }
    
    // Initialize modal when it's shown
    const locationModal = document.getElementById('locationModal');
    if (locationModal) {
        locationModal.addEventListener('shown.bs.modal', function() {
            setTimeout(initializeModalMap, 100);
            });
        }
    
    console.log('=== MODERN APP INITIALIZATION COMPLETE ===');
});

// Global functions for modal
function searchModalMap(query) {
    // This will be called from the modal
    if (window.searchModalMap) {
        window.searchModalMap(query);
    }
}

function confirmLocation() {
    // This will be called from the modal
    if (window.confirmLocation) {
        window.confirmLocation();
    }
} 

