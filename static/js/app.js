document.addEventListener('DOMContentLoaded', function() {
    console.log('App initializing...');
    
    // Global variables
    let map;
    let modalMap;
    let selectedLocation = null;
    
    // Global variables to track search state
    let currentSearchLocation = null;
    let currentSearchRadius = null;
    let searchMarkers = []; // Track all search-related markers and circles
    
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
                console.log('Refreshing map and clearing search results');
                clearSearchResults();
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
        
        // Find dirty places button
        const findDirtyBtn = document.getElementById('find-dirty-btn');
        if (findDirtyBtn) {
            findDirtyBtn.addEventListener('click', function() {
                if (currentSearchLocation) {
                    const radiusInput = document.getElementById('search-radius');
                    const radius = radiusInput ? parseFloat(radiusInput.value) || 1 : 1;
                    findClosestDirtyPlaces(currentSearchLocation.lat, currentSearchLocation.lng, radius);
                } else {
                    alert('Please search for a location first.');
                }
            });
        }
        
        // Add radius input event listener
        const radiusInput = document.getElementById('search-radius');
        if (radiusInput) {
            radiusInput.addEventListener('change', function() {
                const value = parseFloat(this.value);
                if (value < 1) this.value = 1;
                if (value > 100) this.value = 100;
                
                // Update find dirty button tooltip with new radius
                const findDirtyBtn = document.getElementById('find-dirty-btn');
                if (currentSearchLocation && findDirtyBtn) {
                    findDirtyBtn.title = `Click to find dirty places within ${this.value}km of the selected location`;
                }
            });
        }
    }
    
    // Search functionality for main map
    function searchMainMap(query) {
        console.log('Searching main map for:', query);
        
        // Get radius from input
        const radiusInput = document.getElementById('search-radius');
        const radius = radiusInput ? parseFloat(radiusInput.value) || 1 : 1;
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        
        // Show loading state
        const searchBtn = document.getElementById('main-map-search-btn');
        const findDirtyBtn = document.getElementById('find-dirty-btn');
        const originalText = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching...';
        searchBtn.disabled = true;
        
        // Clear previous search results
        clearSearchResults();
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const result = data[0];
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);
                    
                    console.log('Location found on main map:', lat, lng);
                    
                    // Store current search location
                    currentSearchLocation = { lat, lng };
                    currentSearchRadius = radius;
                    
                    // Center main map on found location
                    map.setView([lat, lng], 12);
                    
                    // Add search marker
                    const searchMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'search-marker',
                            html: `<div style="background-color: #ff6b6b; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(map);
                    
                    searchMarker.bindPopup(`<strong>Search Result:</strong><br>${result.display_name}`).openPopup();
                    searchMarkers.push(searchMarker);
                    
                    // Enable the "Find Dirty Places" button
                    findDirtyBtn.disabled = false;
                    findDirtyBtn.title = `Click to find dirty places within ${radius}km of this location`;
                    
                } else {
                    alert('Location not found. Please try a different search term.');
                    // Disable find dirty button if location not found
                    findDirtyBtn.disabled = true;
                    findDirtyBtn.title = "First search for a location, then click to find dirty places";
                }
            })
            .catch(error => {
                console.error('Main map search error:', error);
                alert('Error searching for location. Please try again.');
                findDirtyBtn.disabled = true;
            })
            .finally(() => {
                // Restore button state
                searchBtn.innerHTML = originalText;
                searchBtn.disabled = false;
            });
    }
    
    function findClosestDirtyPlaces(lat = null, lng = null, radius = null) {
        // Use stored location and current radius if not provided
        if (!lat || !lng) {
            if (!currentSearchLocation) {
                alert('Please search for a location first.');
                return;
            }
            lat = currentSearchLocation.lat;
            lng = currentSearchLocation.lng;
        }
        
        // Get current radius from input
        const radiusInput = document.getElementById('search-radius');
        radius = radius || (radiusInput ? parseFloat(radiusInput.value) || 1 : 1);
        
        console.log('Finding dirty places near:', lat, lng, 'within', radius, 'km');
        
        // Clear previous dirty place markers but keep search location
        clearDirtyPlaceMarkers();
        
        // Add search radius circle
        const radiusCircle = L.circle([lat, lng], {
            color: '#ff6b6b',
            fillColor: '#ff6b6b',
            fillOpacity: 0.1,
            radius: radius * 1000, // Convert km to meters
            weight: 2,
            dashArray: '5, 5'
        }).addTo(map);
        
        radiusCircle.bindPopup(`Search radius: ${radius}km`);
        searchMarkers.push(radiusCircle);
        
        // Show loading state for find dirty button
        const findDirtyBtn = document.getElementById('find-dirty-btn');
        const originalText = findDirtyBtn.innerHTML;
        findDirtyBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Searching...';
        findDirtyBtn.disabled = true;
        
        fetch(`/api/find-dirty-places?lat=${lat}&lng=${lng}&limit=5&max_distance=${radius}`)
            .then(response => response.json())
            .then(data => {
                console.log('Dirty places response:', data);
                
                if (data.dirty_places && data.dirty_places.length > 0) {
                    // Show location summary with found results
                    showLocationSummary(data.summary, radius, true);
                    
                    // Add numbered markers for dirty places
                    data.dirty_places.forEach((place, index) => {
                        const dirtyMarker = L.marker([place.latitude, place.longitude], {
                            icon: L.divIcon({
                                className: 'dirty-place-marker',
                                html: `<div style="background-color: #8B4513; color: white; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
                                iconSize: [25, 25],
                                iconAnchor: [12, 12]
                            })
                        }).addTo(map);
                        
                        dirtyMarker.bindPopup(`
                            <div style="min-width: 200px;">
                                <h6>🗑️ Dirty Place #${index + 1}</h6>
                                <p><strong>Distance:</strong> ${place.distance_km}km</p>
                                <p><strong>Type:</strong> ${place.trash_type || 'Unknown'}</p>
                                <p><strong>Weight:</strong> ${place.estimated_kg || '?'}kg</p>
                                <p><strong>Dirtiness Score:</strong> ${place.dirtiness_score}/100</p>
                                <p><strong>Combined Score:</strong> ${place.combined_score.toFixed(1)}</p>
                            </div>
                        `);
                        
                        searchMarkers.push(dirtyMarker);
                    });
                    
                } else {
                    // Show no results message with correct radius
                    showLocationSummary({
                        message: `No dirty places found within ${radius}km of this location. This area seems clean! 🌟`
                    }, radius, false);
                }
            })
            .catch(error => {
                console.error('Error finding dirty places:', error);
                showLocationSummary({
                    message: `Error searching for dirty places within ${radius}km. Please try again.`
                }, radius, false);
            })
            .finally(() => {
                // Restore button state
                findDirtyBtn.innerHTML = originalText;
                findDirtyBtn.disabled = false;
            });
    }
    
    function showLocationSummary(summary, radius, hasResults) {
        // Create or update summary display
        let summaryDiv = document.getElementById('location-summary');
        if (!summaryDiv) {
            summaryDiv = document.createElement('div');
            summaryDiv.id = 'location-summary';
            summaryDiv.style.cssText = `
                position: absolute;
                top: 60px;
                right: 20px;
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 300px;
                z-index: 1000;
                border-left: 4px solid #007bff;
            `;
            document.getElementById('map-container').appendChild(summaryDiv);
        }
        
        if (summary.message) {
            // No results or error message
            summaryDiv.innerHTML = `
                <div style="color: ${hasResults ? '#007bff' : '#28a745'};">
                    ${summary.message}
                </div>
            `;
        } else {
            // Results found - show detailed summary
            summaryDiv.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 10px;">📍 Area Summary</div>
                <div><strong>Reports found:</strong> ${summary.total_reports}</div>
                <div><strong>Total waste:</strong> ${summary.total_estimated_kg}kg</div>
                <div><strong>Most common:</strong> ${summary.most_common_trash_type}</div>
                <div><strong>Avg. dirtiness:</strong> ${summary.avg_dirtiness_score}/100</div>
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    Within ${radius}km radius
                </div>
            `;
        }
        
        // Auto-hide after 20 seconds
        setTimeout(() => {
            if (summaryDiv && summaryDiv.parentNode) {
                summaryDiv.parentNode.removeChild(summaryDiv);
            }
        }, 20000);
    }
    
    function clearSearchResults() {
        // Remove all search-related markers and circles
        searchMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
        searchMarkers = [];
        
        // Remove summary if it exists
        const summaryDiv = document.getElementById('location-summary');
        if (summaryDiv && summaryDiv.parentNode) {
            summaryDiv.parentNode.removeChild(summaryDiv);
        }
        
        // Reset search state
        currentSearchLocation = null;
        currentSearchRadius = null;
        
        // Disable find dirty button
        const findDirtyBtn = document.getElementById('find-dirty-btn');
        findDirtyBtn.disabled = true;
        findDirtyBtn.title = "First search for a location, then click to find dirty places";
    }
    
    function clearDirtyPlaceMarkers() {
        // Remove only dirty place markers and radius circle, keep search location marker
        const markersToRemove = [];
        searchMarkers.forEach((marker, index) => {
            // Keep the first marker (search location), remove others
            if (index > 0) {
                map.removeLayer(marker);
                markersToRemove.push(index);
            }
        });
        
        // Remove from array (in reverse order to maintain indices)
        markersToRemove.reverse().forEach(index => {
            searchMarkers.splice(index, 1);
        });
        
        // Remove summary
        const summaryDiv = document.getElementById('location-summary');
        if (summaryDiv && summaryDiv.parentNode) {
            summaryDiv.parentNode.removeChild(summaryDiv);
        }
    }
    
    // Handle file input change
    function handleFileInputChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('File selected:', file.name);
        
        // Show file preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('file-preview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px;">`;
            preview.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
        
        // Check for GPS coordinates
        checkCoordinates(file);
    }
    
    function checkCoordinates(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/api/check-coordinates', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Coordinate check response:', data);
            
            const coordsInfo = document.getElementById('coordinates-info');
            const locationModal = document.getElementById('locationModal');
            
            if (data.has_coordinates) {
                coordsInfo.innerHTML = `
                    <div class="alert alert-success">
                        <i class="bi bi-geo-alt-fill"></i> GPS coordinates found: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}
                    </div>
                `;
                coordsInfo.classList.remove('d-none');
                
                // Enable submit button since we have coordinates
                updateSubmitButtonVisibility();
            } else {
                coordsInfo.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-geo-alt"></i> No GPS coordinates found in image. 
                        <button type="button" class="btn btn-sm btn-outline-primary ms-2" data-bs-toggle="modal" data-bs-target="#locationModal">
                            Select Location
                        </button>
                    </div>
                `;
                coordsInfo.classList.remove('d-none');
                
                // Disable submit button until location is selected
                updateSubmitButtonVisibility();
            }
        })
        .catch(error => {
            console.error('Error checking coordinates:', error);
            const coordsInfo = document.getElementById('coordinates-info');
            coordsInfo.innerHTML = `
                <div class="alert alert-danger">
                    Error checking GPS coordinates. You can still select location manually.
                    <button type="button" class="btn btn-sm btn-outline-primary ms-2" data-bs-toggle="modal" data-bs-target="#locationModal">
                        Select Location
                    </button>
                </div>
            `;
            coordsInfo.classList.remove('d-none');
        });
    }
    
    function updateSubmitButtonVisibility() {
        const submitButton = document.getElementById('submit-button');
        const coordsInfo = document.getElementById('coordinates-info');
        const formCheckbox = document.getElementById('fill-form-check');
        
        // Check if we have coordinates (either from GPS or manual selection)
        const hasCoordinates = coordsInfo && !coordsInfo.classList.contains('d-none') && 
                              (coordsInfo.innerHTML.includes('GPS coordinates found') || 
                               coordsInfo.innerHTML.includes('Location selected'));
        
        // Check if form is required and filled
        const formRequired = formCheckbox && formCheckbox.checked;
        const formFilled = !formRequired || checkFormFilled();
        
        if (hasCoordinates && formFilled) {
            submitButton.classList.remove('d-none');
        } else {
            submitButton.classList.add('d-none');
        }
    }
    
    function checkFormFilled() {
        const trashType = document.getElementById('trash_type').value;
        const estimatedKg = document.getElementById('estimated_kg').value;
        const sparcity = document.getElementById('sparcity').value;
        const cleanliness = document.getElementById('cleanliness').value;
        
        return trashType && estimatedKg && sparcity && cleanliness;
    }
    
    function handleUploadFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitButton = document.getElementById('submit-button');
        
        // Show loading state
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Uploading...';
        submitButton.disabled = true;
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Upload response:', data);
            
            if (data.success) {
                // Show success message
                alert('Trash report uploaded successfully!');
                
                // Reset form
                event.target.reset();
                document.getElementById('file-preview').classList.add('d-none');
                document.getElementById('coordinates-info').classList.add('d-none');
                document.getElementById('details-form').classList.add('d-none');
                document.getElementById('fill-form-check').checked = false;
                
                // Refresh map data
                loadMapData();
            } else {
                alert('Error uploading report: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            alert('Error uploading report. Please try again.');
        })
        .finally(() => {
            // Restore button state
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
            updateSubmitButtonVisibility();
        });
    }
    
    // Modal map functionality
    function initializeModalMap() {
        console.log('Initializing modal map');
        
        if (!modalMap) {
            modalMap = L.map('modal-map-container').setView([51.505, -0.09], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(modalMap);
            
            // Add click event to modal map
            modalMap.on('click', function(e) {
                const lat = e.latlng.lat;
                const lng = e.latlng.lng;
                
                console.log('Modal map clicked:', lat, lng);
                
                // Clear existing markers
                modalMap.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        modalMap.removeLayer(layer);
                    }
                });
                
                // Add new marker
                const marker = L.marker([lat, lng]).addTo(modalMap);
                marker.bindPopup(`Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`).openPopup();
                
                selectedLocation = { lat, lng };
                document.getElementById('selected-location').innerHTML = 
                    `<strong>Selected:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                document.getElementById('confirm-location').disabled = false;
            });
        }
        
        // Refresh map size when modal is shown
        setTimeout(() => {
            modalMap.invalidateSize();
        }, 200);
    }
    
    // Modal search functionality
    function searchModalMap(query) {
        console.log('Searching modal map for:', query);
        
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
    
    // Confirm location selection
    function confirmLocation() {
        if (selectedLocation) {
            console.log('Location confirmed:', selectedLocation);
            
            const coordsInfo = document.getElementById('coordinates-info');
            coordsInfo.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-geo-alt-fill"></i> Location selected: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}
                    <input type="hidden" name="latitude" value="${selectedLocation.lat}">
                    <input type="hidden" name="longitude" value="${selectedLocation.lng}">
                </div>
            `;
            coordsInfo.classList.remove('d-none');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('locationModal'));
            modal.hide();
            
            // Update submit button visibility
            updateSubmitButtonVisibility();
        }
    }
    
    // Make functions globally available
    window.initializeModalMap = initializeModalMap;
    window.searchModalMap = searchModalMap;
    window.confirmLocation = confirmLocation;
}); 