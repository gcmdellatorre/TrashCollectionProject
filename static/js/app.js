document.addEventListener('DOMContentLoaded', function() {
    console.log('App initializing...');
    
    // Global variables
    let map;
    let modalMap;
    let selectedLocation = null;
    
    // Initialize the application
    initMap();
    setupEventListeners();
    
    // Initialize map
    function initMap() {
        if (!map) {
            // Set default view to world view (zoom level 2)
            map = L.map('map-container').setView([20, 0], 2);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        }
        
        loadMapData();
    }
    
    // Load data points onto map
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
                
                // Add new markers - only for entries with coordinates
                const validEntries = data.filter(point => point.latitude && point.longitude);
                
                if (validEntries.length > 0) {
                    validEntries.forEach(point => {
                        addMarker(point);
                    });
                    
                    // DON'T auto-center on first point - keep world view
                    // map.setView([validEntries[0].latitude, validEntries[0].longitude], 10);
                    console.log(`Loaded ${validEntries.length} trash data points on map`);
                } else {
                    console.log('No valid data points with coordinates found');
                }
            })
            .catch(error => {
                console.error('Error loading map data:', error);
            });
    }
    
    // Add a marker to the map
    function addMarker(point) {
        let iconColor = 'red';
        if (point.trash_type === 'plastic') iconColor = 'blue';
        else if (point.trash_type === 'paper') iconColor = 'green';
        else if (point.trash_type === 'metal') iconColor = 'orange';
        else if (point.trash_type === 'glass') iconColor = 'purple';
        else if (point.trash_type === 'organic') iconColor = 'green';
        else if (point.trash_type === 'electronic') iconColor = 'gray';
        
        const marker = L.marker([point.latitude, point.longitude], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            })
        }).addTo(map);
        
        const popupContent = `
            <div>
                <strong>Trash Type:</strong> ${point.trash_type || 'Unknown'}<br>
                <strong>Estimated Weight:</strong> ${point.estimated_kg || 'Unknown'} kg<br>
                <strong>Sparcity:</strong> ${point.sparcity || 'Unknown'}<br>
                <strong>Cleanliness:</strong> ${point.cleanliness || 'Unknown'}<br>
                <strong>Reported:</strong> ${new Date(point.timestamp).toLocaleString()}<br>
            </div>
        `;
        
        marker.bindPopup(popupContent);
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        console.log('Setting up event listeners');
        
        // File input change event
        const fileInput = document.getElementById('file');
        if (fileInput) {
            console.log('File input found, adding event listener');
            fileInput.addEventListener('change', handleFileInputChange);
        } else {
            console.error('File input not found!');
        }
        
        // Form submission
        const uploadForm = document.getElementById('upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', handleUploadFormSubmit);
        }
        
        // Manual details checkbox
        const formCheckbox = document.getElementById('fill-form-check');
        if (formCheckbox) {
            formCheckbox.addEventListener('change', function() {
                const detailsForm = document.getElementById('details-form');
                
                if (this.checked) {
                    detailsForm.classList.remove('d-none');
                    console.log('Manual details form shown');
                } else {
                    detailsForm.classList.add('d-none');
                    console.log('Manual details form hidden');
                }
                
                updateSubmitButtonVisibility();
            });
        }
        
        // Map refresh button - manual refresh only
        const refreshButton = document.getElementById('refresh-map');
        if (refreshButton) {
            refreshButton.addEventListener('click', function() {
                console.log('Manual map refresh requested');
                loadMapData();
            });
        }
        
        // Main map search functionality
        const mainMapSearchBtn = document.getElementById('main-map-search-btn');
        const mainMapSearchInput = document.getElementById('main-map-search');
        
        if (mainMapSearchBtn && mainMapSearchInput) {
            // Search button click
            mainMapSearchBtn.addEventListener('click', function() {
                const query = mainMapSearchInput.value.trim();
                if (query) {
                    searchMainMap(query);
                }
            });
            
            // Enter key in search input
            mainMapSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const query = this.value.trim();
                    if (query) {
                        searchMainMap(query);
                    }
                }
            });
        }
    }
    
    // Search functionality for main map
    function searchMainMap(query) {
        console.log('Searching main map for:', query);
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        
        // Show loading state
        const searchBtn = document.getElementById('main-map-search-btn');
        const originalText = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching...';
        searchBtn.disabled = true;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const result = data[0];
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    
                    console.log('Location found on main map:', lat, lng);
                    
                    // Center main map on found location with appropriate zoom
                    map.setView([lat, lng], 12);
                    
                    // Add a temporary marker for the searched location
                    const searchMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'search-marker',
                            html: `<div style="background-color: #ff6b6b; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(map);
                    
                    searchMarker.bindPopup(`<strong>Search Result:</strong><br>${result.display_name}`).openPopup();
                    
                    // Remove search marker after 10 seconds
                    setTimeout(() => {
                        map.removeLayer(searchMarker);
                    }, 10000);
                    
                } else {
                    alert('Location not found. Please try a different search term.');
                }
            })
            .catch(error => {
                console.error('Main map search error:', error);
                alert('Error searching for location. Please try again.');
            })
            .finally(() => {
                // Restore button state
                searchBtn.innerHTML = originalText;
                searchBtn.disabled = false;
            });
    }
    
    // Update submit button visibility based on form state
    function updateSubmitButtonVisibility() {
        const submitBtn = document.getElementById('submit-btn');
        const fileInput = document.getElementById('file');
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        
        // Show submit button if we have a file and either:
        // 1. We have coordinates, OR
        // 2. We're in the process of getting coordinates (location flow started)
        const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
        const hasLocation = latitude && longitude;
        const locationFlowStarted = document.getElementById('location-status') !== null;
        
        if (hasFile && (hasLocation || locationFlowStarted)) {
            submitBtn.style.display = 'block';
            submitBtn.disabled = !hasLocation; // Disable if no location yet
            
            if (!hasLocation) {
                submitBtn.textContent = 'Please Set Location First';
                submitBtn.className = 'btn btn-secondary';
            } else {
                submitBtn.textContent = 'Submit Report';
                submitBtn.className = 'btn btn-primary';
            }
        } else {
            submitBtn.style.display = 'none';
        }
    }
    
    // Handle file input change - start the UX flow
    function handleFileInputChange(e) {
        console.log('File input changed!');
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
            
            // Show image preview
            const reader = new FileReader();
            reader.onload = function(e) {
                console.log('Image loaded for preview');
                const preview = document.getElementById('image-preview');
                if (preview) {
                    preview.src = e.target.result;
                    const previewContainer = document.getElementById('preview-container');
                    if (previewContainer) {
                        previewContainer.classList.remove('d-none');
                    }
                }
            }
            reader.readAsDataURL(file);
            
            // Start location detection flow
            console.log('Starting location detection flow...');
            startLocationDetectionFlow(file);
        } else {
            console.log('No file selected');
        }
    }
    
    // Start the location detection flow
    function startLocationDetectionFlow(file) {
        console.log('Starting location detection flow for file:', file.name);
        
        // Clear any previous location data
        selectedLocation = null;
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        if (latInput) latInput.value = '';
        if (lngInput) lngInput.value = '';
        
        // Remove any existing status messages
        const existingStatus = document.getElementById('location-status');
        if (existingStatus) {
            console.log('Removing existing status message');
            existingStatus.remove();
        }
        
        // Step 1: Try to extract GPS from image
        extractGPSFromImage(file);
    }
    
    // Step 1: Extract GPS data from image
    function extractGPSFromImage(file) {
        console.log('Attempting to extract GPS from image:', file.name);
        
        // Show status immediately
        showLocationStatus('Checking image for GPS data...', 'info');
        
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('Making request to /api/check-coordinates');
        
        fetch('/api/check-coordinates', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('GPS check response:', data);
            
            if (data.has_coordinates) {
                // Success! GPS found
                selectedLocation = {
                    lat: data.latitude,
                    lng: data.longitude
                };
                document.getElementById('latitude').value = data.latitude;
                document.getElementById('longitude').value = data.longitude;
                
                showLocationStatus(`GPS coordinates found in image! Location set to ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`, 'success');
                console.log('GPS coordinates extracted successfully');
            } else {
                // No GPS found, move to step 2
                console.log('No GPS found in image, requesting user location');
                requestUserLocation();
            }
        })
        .catch(error => {
            console.error('Error checking GPS:', error);
            showLocationStatus('Error checking GPS data. Please choose how to set your location:', 'warning');
            // If GPS check fails, move to step 2
            requestUserLocation();
        });
    }
    
    // Step 2: Request user's current location
    function requestUserLocation() {
        console.log('Requesting user location');
        
        showLocationStatus('No GPS data found in image. Please choose how to set your location:', 'warning');
        
        const statusElement = document.getElementById('location-status');
        if (statusElement) {
            statusElement.innerHTML += `
                <div class="mt-2">
                    <button type="button" id="share-location-btn" class="btn btn-primary btn-sm me-2">
                        <i class="bi bi-geo-alt"></i> Share My Location
                    </button>
                    <button type="button" id="select-on-map-btn" class="btn btn-outline-secondary btn-sm">
                        <i class="bi bi-map"></i> Select on Map
                    </button>
                </div>
            `;
            
            setTimeout(() => {
                const shareBtn = document.getElementById('share-location-btn');
                const mapBtn = document.getElementById('select-on-map-btn');
                
                if (shareBtn) {
                    shareBtn.onclick = function() {
                        console.log('Share location button clicked');
                        if (!navigator.geolocation) {
                            showMapSelector();
                            return;
                        }
                        
                        showLocationStatus('Getting your current location...', 'info');
                        
                        navigator.geolocation.getCurrentPosition(
                            function(position) {
                                console.log('Geolocation success:', position.coords);
                                selectedLocation = {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude
                                };
                                document.getElementById('latitude').value = position.coords.latitude;
                                document.getElementById('longitude').value = position.coords.longitude;
                                
                                showLocationStatus(`Current location detected! Location set to ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`, 'success');
                                updateSubmitButtonVisibility(); // Enable submit button
                            },
                            function(error) {
                                console.log('Geolocation failed:', error.message);
                                showLocationStatus('Unable to access your location. Please select your location on the map.', 'warning');
                                showMapSelector();
                            },
                            {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 300000
                            }
                        );
                    };
                }
                
                if (mapBtn) {
                    mapBtn.onclick = function() {
                        console.log('Select on map button clicked');
                        showMapSelector();
                    };
                }
            }, 100);
        }
    }
    
    // Step 3: Show map selector modal
    function showMapSelector() {
        console.log('Opening map selector modal');
        
        const modalElement = document.getElementById('locationModal');
        if (!modalElement) {
            console.error('Location modal not found in DOM!');
            alert('Error: Location selection modal not found. Please refresh the page and try again.');
            return;
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
        // Initialize the modal map when modal is shown
        modalElement.addEventListener('shown.bs.modal', function() {
            console.log('Modal shown, initializing map');
            initializeModalMap();
        }, { once: true });
    }
    
    // Initialize the modal map
    function initializeModalMap() {
        console.log('Initializing modal map');
        
        const defaultLat = map ? map.getCenter().lat : 40.7128;
        const defaultLng = map ? map.getCenter().lng : -74.0060;
        
        modalMap = L.map('modal-map').setView([defaultLat, defaultLng], 10);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(modalMap);
        
        let selectedMarker = null;
        
        modalMap.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            console.log('Modal map clicked at:', lat, lng);
            
            selectedLocation = { lat, lng };
            
            if (selectedMarker) {
                selectedMarker.setLatLng(e.latlng);
            } else {
                selectedMarker = L.marker(e.latlng).addTo(modalMap);
            }
            
            document.getElementById('selected-location').innerHTML = 
                `<strong>Selected:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            document.getElementById('confirm-location').disabled = false;
            
            selectedMarker.bindPopup(`Selected location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`).openPopup();
        });
        
        // Handle location search
        document.getElementById('search-btn').onclick = function() {
            const query = document.getElementById('location-search').value.trim();
            if (query) {
                searchLocation(query);
            }
        };
        
        // Handle confirm button
        document.getElementById('confirm-location').onclick = function() {
            if (selectedLocation) {
                document.getElementById('latitude').value = selectedLocation.lat;
                document.getElementById('longitude').value = selectedLocation.lng;
                
                showLocationStatus(`Location selected! Set to ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`, 'success');
                
                bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
            }
        };
        
        setTimeout(() => {
            modalMap.invalidateSize();
        }, 200);
    }
    
    // Search for location using Nominatim
    function searchLocation(query) {
        console.log('Searching for location:', query);
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const result = data[0];
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    
                    console.log('Location found:', lat, lng);
                    
                    modalMap.setView([lat, lng], 15);
                    
                    const marker = L.marker([lat, lng]).addTo(modalMap);
                    marker.bindPopup(`Found: ${result.display_name}`).openPopup();
                    
                    selectedLocation = { lat, lng };
                    document.getElementById('selected-location').innerHTML = 
                        `<strong>Found:</strong> ${result.display_name}`;
                    document.getElementById('confirm-location').disabled = false;
                } else {
                    alert('Location not found. Please try a different search term or click on the map.');
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                alert('Error searching for location. Please try clicking on the map instead.');
            });
    }
    
    // Show location status message
    function showLocationStatus(message, type) {
        console.log('Showing location status:', message, type);
        
        const existingStatus = document.getElementById('location-status');
        if (existingStatus) existingStatus.remove();
        
        const statusElement = document.createElement('div');
        statusElement.id = 'location-status';
        statusElement.className = `alert alert-${type} mt-2`;
        statusElement.innerHTML = message;
        
        const fileInput = document.getElementById('file');
        if (fileInput && fileInput.parentNode) {
            fileInput.parentNode.insertBefore(statusElement, fileInput.nextSibling);
            console.log('Status message inserted into DOM');
            
            // Update submit button visibility
            updateSubmitButtonVisibility();
        } else {
            console.error('Could not insert status message - file input or parent not found');
        }
    }
    
    // Handle form submission
    function handleUploadFormSubmit(e) {
        e.preventDefault();
        console.log('Form submitted');
        
        const formData = new FormData();
        const fileInput = document.getElementById('file');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select an image file');
            return;
        }
        
        formData.append('file', file);
        
        // Add location data if available
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        
        if (latitude && longitude) {
            formData.append('latitude', latitude);
            formData.append('longitude', longitude);
        }
        
        // Add manual form data if checkbox is checked
        const fillFormCheck = document.getElementById('fill-form-check');
        if (fillFormCheck && fillFormCheck.checked) {
            formData.append('fill_form', 'true');
            
            const trashType = document.getElementById('trash-type').value;
            const estimatedKg = document.getElementById('estimated-kg').value;
            const sparcity = document.getElementById('sparcity').value;
            const cleanliness = document.getElementById('cleanliness').value;
            
            if (trashType) formData.append('trash_type', trashType);
            if (estimatedKg) formData.append('estimated_kg', estimatedKg);
            if (sparcity) formData.append('sparcity', sparcity);
            if (cleanliness) formData.append('cleanliness', cleanliness);
        }
        
        // Submit form
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            alert('Report submitted successfully!');
            loadMapData();
            resetForm();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error submitting report. Please try again.');
        });
    }
    
    // Reset form after submission
    function resetForm() {
        document.getElementById('upload-form').reset();
        document.getElementById('preview-container').classList.add('d-none');
        document.getElementById('details-form').classList.add('d-none');
        
        const existingStatus = document.getElementById('location-status');
        if (existingStatus) existingStatus.remove();
        
        selectedLocation = null;
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
    }
}); 