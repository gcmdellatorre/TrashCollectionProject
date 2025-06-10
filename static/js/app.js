console.log('🚀 NEW CODE IS RUNNING!');

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
    console.log('=== DOM LOADED - DEBUGGING START ===');
    console.log('Looking for modal elements...');
    
    // Check if modal exists
    const locationModal = document.getElementById('locationModal');
    console.log('locationModal found:', !!locationModal);
    
    // Check if modal map container exists
    const modalMapContainer = document.getElementById('modal-map');
    console.log('modal-map container found:', !!modalMapContainer);
    
    // Check if search button exists
    const searchBtn = document.getElementById('search-btn');
    console.log('search-btn found:', !!searchBtn);
    
    // List all modal-related elements
    const modalElements = ['locationModal', 'modal-map', 'search-btn', 'location-search', 'confirm-location', 'selected-location'];
    modalElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}:`, !!element, element ? 'EXISTS' : 'MISSING');
    });
    
    console.log('=== DEBUGGING END ===');
    
    console.log('App initializing...');
    
    // Global variables
    let map;
    let modalMap = null;
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
            console.log('Upload form found, adding submit event listener');
            uploadForm.addEventListener('submit', handleUploadFormSubmit);
        } else {
            console.error('Upload form not found!');
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
            mainMapSearchBtn.addEventListener('click', function() {
                const query = mainMapSearchInput.value.trim();
                if (query) {
                    searchMainMap(query);
                }
            });
            
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
                
                const findDirtyBtn = document.getElementById('find-dirty-btn');
                if (currentSearchLocation && findDirtyBtn) {
                    findDirtyBtn.title = `Click to find dirty places within ${this.value}km of the selected location`;
                }
            });
        }
        
        // Modal event listeners with extra debugging
        if (locationModal) {
            console.log('Setting up modal event listeners...');
            
            locationModal.addEventListener('shown.bs.modal', function() {
                console.log('🔥 MODAL SHOWN EVENT FIRED');
                console.log('Modal map container exists:', !!document.getElementById('modal-map'));
                initializeModalMap();
            });
            
            locationModal.addEventListener('hidden.bs.modal', function() {
                console.log('🔥 MODAL HIDDEN EVENT FIRED');
                if (modalMap) {
                    modalMap.remove();
                    modalMap = null;
                }
                selectedLocation = null;
            });
        } else {
            console.error('❌ LOCATION MODAL NOT FOUND - HTML PROBLEM!');
        }
        
        // SEARCH BUTTON - Make sure this works
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'search-btn') {
                console.log('Search button clicked via delegation');
                const query = document.getElementById('location-search').value;
                if (query && query.trim()) {
                    searchModalMap(query.trim());
                } else {
                    alert('Please enter a location to search for.');
                }
            }
        });
        
        // SEARCH INPUT ENTER KEY
        document.addEventListener('keypress', function(e) {
            if (e.target && e.target.id === 'location-search' && e.key === 'Enter') {
                console.log('Enter pressed in search input');
                const query = e.target.value.trim();
                if (query) {
                    searchModalMap(query);
                }
            }
        });
        
        // CONFIRM BUTTON
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'confirm-location') {
                console.log('Confirm button clicked');
                confirmLocation();
            }
        });
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
    
    // Handle file input change - Check multiple possible preview elements
    function handleFileInputChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('✅ File selected:', file.name);
        
        // Skip preview entirely - just show an alert
        alert(`Image selected: ${file.name}\nNow checking for GPS coordinates...`);
        
        // Check coordinates
        checkCoordinatesSimple(file);
    }

    function checkCoordinatesSimple(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/api/check-coordinates', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('✅ Coordinates response:', data);
            
            if (data.has_coordinates) {
                alert(`GPS coordinates found!\nLat: ${data.latitude}\nLng: ${data.longitude}`);
                // Set coordinates
                const latInput = document.getElementById('latitude');
                const lngInput = document.getElementById('longitude');
                if (latInput) latInput.value = data.latitude;
                if (lngInput) lngInput.value = data.longitude;
            } else {
                alert('No GPS coordinates found.\nClick OK, then use the location selection.');
            }
        })
        .catch(error => {
            console.error('Coordinate check failed:', error);
            alert('Could not check GPS coordinates, but you can still select location manually.');
        });
    }
    
    // Add this function that's being called but missing:
    function showSubmitButtonForTesting() {
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.classList.remove('d-none');
            submitBtn.style.display = 'block';
            submitBtn.disabled = false;
            console.log('🔧 Submit button forced visible for testing');
        } else {
            console.log('❌ Submit button not found in HTML');
        }
    }

    // Update the updateSubmitButtonVisibility function with better debugging
    function updateSubmitButtonVisibility() {
        try {
            const submitBtn = document.getElementById('submit-btn');
            const latInput = document.getElementById('latitude');
            const lngInput = document.getElementById('longitude');
            const fileInput = document.getElementById('file');
            
            console.log('🔍 Submit button check:', {
                submitBtn: !!submitBtn,
                latInput: !!latInput,
                lngInput: !!lngInput,
                fileInput: !!fileInput
            });
            
            if (!submitBtn) {
                console.log('❌ Submit button not found');
                return;
            }
            
            const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
            const hasCoords = latInput && lngInput && latInput.value && lngInput.value;
            
            console.log('📋 Requirements check:', { 
                hasFile, 
                hasCoords,
                fileCount: fileInput?.files?.length || 0,
                lat: latInput?.value || 'none',
                lng: lngInput?.value || 'none'
            });
            
            // FOR TESTING: Always show the button
            submitBtn.classList.remove('d-none');
            submitBtn.style.display = 'block';
            
            if (hasFile && hasCoords) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '🚀 Submit Report';
                console.log('✅ Submit button ENABLED');
            } else {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '⏳ Need image + location';
                console.log('⏳ Submit button disabled - missing requirements');
            }
            
        } catch (error) {
            console.log('❌ Submit button update failed:', error);
        }
    }
    
    function handleUploadFormSubmit(event) {
        event.preventDefault();
        console.log('🚀 Form submission started');
        
        const form = event.target;
        const formData = new FormData(form);
        
        // Get coordinates
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        
        if (!latInput.value || !lngInput.value) {
            alert('Please ensure you have selected a location.');
            return;
        }
        
        // FIXED: Ensure coordinates are added as numbers, not strings
        formData.set('latitude', parseFloat(latInput.value));
        formData.set('longitude', parseFloat(lngInput.value));
        
        // FIXED: Make sure file is properly included
        const fileInput = document.getElementById('file');
        if (fileInput.files[0]) {
            formData.set('file', fileInput.files[0]);
        }
        
        // IMPROVED: Always set form fields with defaults
        const formCheckbox = document.getElementById('fill-form-check');
        const fillForm = formCheckbox && formCheckbox.checked;
        
        // Set fill_form flag
        formData.set('fill_form', fillForm ? 'true' : 'false');
        
        // ALWAYS set optional form fields with defaults
        const trashType = document.getElementById('trash-type');
        const estimatedKg = document.getElementById('estimated-kg');
        const sparcity = document.getElementById('sparcity');
        const cleanliness = document.getElementById('cleanliness');
        
        // Set defaults or actual values
        formData.set('trash_type', (fillForm && trashType && trashType.value) ? trashType.value : 'unknown');
        formData.set('estimated_kg', (fillForm && estimatedKg && estimatedKg.value) ? parseFloat(estimatedKg.value) : 0.0);
        formData.set('sparcity', (fillForm && sparcity && sparcity.value) ? sparcity.value : 'unknown');
        formData.set('cleanliness', (fillForm && cleanliness && cleanliness.value) ? cleanliness.value : 'unknown');
        
        // DEBUG: Log all form data
        console.log('📋 Form data being sent:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }
        
        // Show loading state
        const submitButton = document.getElementById('submit-btn');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Uploading...';
        submitButton.disabled = true;
        
        // Submit the form
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('📡 Response status:', response.status);
            
            // IMPROVED: Handle different response types
            if (response.status === 422) {
                return response.text().then(text => {
                    console.log('❌ 422 Error details:', text);
                    throw new Error(`Validation error: ${text}`);
                });
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('✅ Upload successful:', data);
            alert('Report submitted successfully! 🎉');
            
            // Reset form
            form.reset();
            latInput.value = '';
            lngInput.value = '';
            
            // Clear coordinates display
            const coordsInfo = document.getElementById('coordinates-info');
            if (coordsInfo) {
                coordsInfo.innerHTML = '';
                coordsInfo.classList.add('d-none');
            }
            
            // Hide details form
            const detailsForm = document.getElementById('details-form');
            if (detailsForm) {
                detailsForm.classList.add('d-none');
            }
            
            // Clear image preview
            const previewContainer = document.getElementById('preview-container');
            if (previewContainer) {
                previewContainer.classList.add('d-none');
            }
            
            // 🗺️ RELOAD MAP DATA - This will show your new report!
            loadMapData();
            
            console.log('🔄 Map data reloaded - your new report should be visible!');
            
        })
        .catch(error => {
            console.error('❌ Upload error:', error);
            alert('Error uploading report: ' + error.message);
        })
        .finally(() => {
            // Restore button state
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
            updateSubmitButtonVisibility();
        });
    }
    
    // Simple modal map initialization
    function initializeModalMap() {
        console.log('🗺️ INITIALIZING MODAL MAP');
        
        // Clean up existing map
        if (modalMap) {
            modalMap.remove();
            modalMap = null;
        }
        
        // Create map with world view
        modalMap = L.map('modal-map').setView([20, 0], 2);
        
        // Add tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(modalMap);
        
        // Handle clicks
        modalMap.on('click', function(e) {
            selectedLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
            
            // Clear old markers
            modalMap.eachLayer(layer => {
                if (layer instanceof L.Marker) modalMap.removeLayer(layer);
            });
            
            // Add new marker
            L.marker([e.latlng.lat, e.latlng.lng]).addTo(modalMap);
            
            // Update UI
            document.getElementById('selected-location').innerHTML = 
                `<strong>Selected:</strong> ${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
            document.getElementById('confirm-location').disabled = false;
        });
        
        // Fix size
        setTimeout(() => modalMap.invalidateSize(), 100);
        
        console.log('✅ MODAL MAP CREATED');
    }

    function searchModalMap(query) {
        console.log('🔍 SEARCHING FOR:', query);
        
        if (!query) {
            alert('Please enter a location');
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
                    
                    console.log('📍 FOUND LOCATION:', lat, lng);
                    
                    // Make sure map exists
                    if (!modalMap) {
                        console.log('❌ NO MAP - CREATING ONE');
                        initializeModalMap();
                        setTimeout(() => updateMapWithLocation(lat, lng, result.display_name), 500);
                    } else {
                        updateMapWithLocation(lat, lng, result.display_name);
                    }
                } else {
                    alert('Location not found');
                }
            })
            .catch(error => {
                console.error('Search error:', error);
                alert('Search failed');
            });
    }

    function updateMapWithLocation(lat, lng, name) {
        console.log('🗺️ UPDATING MAP WITH:', lat, lng);
        
        if (!modalMap) {
            console.error('❌ MODAL MAP MISSING');
            return;
        }
        
        // Clear markers
        modalMap.eachLayer(layer => {
            if (layer instanceof L.Marker) modalMap.removeLayer(layer);
        });
        
        // Update map
        if (modalMap && modalMap.setView) {
            modalMap.setView([lat, lng], 13);
            L.marker([lat, lng]).addTo(modalMap).bindPopup(name).openPopup();
        } else {
            console.log('Modal map not ready, initializing...');
            setTimeout(() => {
                initializeModalMap();
                if (modalMap) {
                    modalMap.setView([lat, lng], 13);
                }
            }, 1000);
        }
        
        // Store selection
        selectedLocation = { lat, lng };
        
        // Update UI
        document.getElementById('selected-location').innerHTML = `<strong>Found:</strong> ${name}`;
        document.getElementById('confirm-location').disabled = false;
    }

    function confirmLocation() {
        console.log('📍 Confirm location called, selectedLocation:', selectedLocation);
        
        if (!selectedLocation) {
            alert('Please select a location first');
            return;
        }
        
        // Set coordinates in the form
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        
        if (latInput && lngInput) {
            latInput.value = selectedLocation.lat;
            lngInput.value = selectedLocation.lng;
            
            console.log('✅ Coordinates set:', selectedLocation.lat, selectedLocation.lng);
            
            // Show coordinates info
            const coordsInfo = document.getElementById('coordinates-info');
            if (coordsInfo) {
                coordsInfo.innerHTML = `
                    <div class="alert alert-success">
                        <strong>📍 Location Set:</strong><br>
                        Latitude: ${selectedLocation.lat.toFixed(6)}<br>
                        Longitude: ${selectedLocation.lng.toFixed(6)}
                    </div>
                `;
                coordsInfo.classList.remove('d-none');
            }
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('locationModal'));
            if (modal) {
                modal.hide();
            }
            
            // Update submit button - should now be enabled
            updateSubmitButtonVisibility();
            
            console.log('🎉 Location confirmed and submit button should be ready!');
            
        } else {
            console.log('❌ Could not find latitude/longitude inputs');
            alert('Error: Form inputs not found');
        }
    }

    // Make functions global for HTML onclick
    window.initializeModalMap = initializeModalMap;
    window.searchModalMap = searchModalMap;  
    window.confirmLocation = confirmLocation;

    // Initialize when modal opens
    document.addEventListener('DOMContentLoaded', function() {
        const modal = document.getElementById('locationModal');
        if (modal) {
            modal.addEventListener('shown.bs.modal', function() {
                console.log('🔥 MODAL OPENED - INITIALIZING MAP');
                setTimeout(initializeModalMap, 200);
            });
        }
    });

    // REPLACE all modal map code with this simple version:
    window.openLocationModal = function() {
        alert('Location selection opened!\nCheck console for map initialization...');
        console.log('🗺️ Attempting to create modal map...');
        
        setTimeout(() => {
            const mapContainer = document.getElementById('modal-map');
            console.log('Map container found:', !!mapContainer);
            
            if (mapContainer) {
                try {
                    if (window.modalMap) {
                        window.modalMap.remove();
                    }
                    
                    window.modalMap = L.map('modal-map').setView([45.4408, 12.3155], 10); // Venice
                    
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.modalMap);
                    
                    console.log('✅ Modal map created successfully!');
                    alert('Map created! You should see it now.');
                    
                } catch (error) {
                    console.error('❌ Map creation failed:', error);
                    alert('Map creation failed: ' + error.message);
                }
            } else {
                console.error('❌ No modal-map container found!');
                alert('Modal map container missing from HTML!');
            }
        }, 1000);
    };

    window.searchModalMap = function(query) {
        alert(`Searching for: ${query}`);
        console.log('🔍 Search initiated for:', query);
    };

    // Call this when DOM loads to make button visible immediately
    setTimeout(() => {
        showSubmitButtonForTesting();
        updateSubmitButtonVisibility();
    }, 1000);
}); 

