document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    let map;
    initMap();
    
    // Set up form interactions
    setupForms();
    
    // Initialize file preview
    setupFilePreview();
    
    // Set up refresh button
    document.getElementById('refresh-map').addEventListener('click', refreshMap);
    
    // Auto refresh every 60 seconds
    setInterval(refreshMap, 60000);
    
    // Initialize map
    function initMap() {
        // Create map if it doesn't exist yet
        if (!map) {
            map = L.map('map-container').setView([0, 0], 2);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        }
        
        // Load data points
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
                
                // Add new markers
                if (data.length > 0) {
                    data.forEach(point => {
                        addMarker(point);
                    });
                    
                    // Center map on first point
                    map.setView([data[0].latitude, data[0].longitude], 10);
                }
            })
            .catch(error => {
                console.error('Error loading map data:', error);
            });
    }
    
    // Add a marker to the map
    function addMarker(point) {
        // Choose color based on trash type
        let iconColor = 'red';
        if (point.trash_type === 'plastic') iconColor = 'blue';
        else if (point.trash_type === 'paper') iconColor = 'green';
        else if (point.trash_type === 'metal') iconColor = 'orange';
        else if (point.trash_type === 'glass') iconColor = 'purple';
        else if (point.trash_type === 'organic') iconColor = 'green';
        else if (point.trash_type === 'electronic') iconColor = 'gray';
        
        // Create marker
        const marker = L.marker([point.latitude, point.longitude], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            })
        }).addTo(map);
        
        // Create popup content
        const popupContent = `
            <div>
                <strong>Trash Type:</strong> ${point.trash_type || 'Unknown'}<br>
                <strong>Estimated Weight:</strong> ${point.estimated_kg || 'Unknown'} kg<br>
                <strong>Sparcity:</strong> ${point.sparcity || 'Unknown'}<br>
                <strong>Cleanliness:</strong> ${point.cleanliness || 'Unknown'}<br>
                <strong>Reported:</strong> ${new Date(point.timestamp).toLocaleString()}<br>
            </div>
        `;
        
        // Bind popup to marker
        marker.bindPopup(popupContent);
    }
    
    // Refresh map data
    function refreshMap() {
        loadMapData();
    }
    
    // Set up form behavior
    function setupForms() {
        // Toggle details form visibility
        document.getElementById('fill-form-check').addEventListener('change', function(e) {
            const detailsForm = document.getElementById('details-form');
            if (e.target.checked) {
                detailsForm.classList.remove('d-none');
            } else {
                detailsForm.classList.add('d-none');
            }
        });
        
        // Handle upload form submission
        document.getElementById('upload-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            
            // Get file
            const fileInput = document.getElementById('file');
            if (fileInput.files.length === 0) {
                alert('Please select an image file');
                return;
            }
            formData.append('file', fileInput.files[0]);
            
            // Check if form details should be included
            const fillForm = document.getElementById('fill-form-check').checked;
            formData.append('fill_form', fillForm);
            
            // Add form fields if needed
            if (fillForm) {
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
                refreshMap();
                resetForm('upload-form');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error submitting report. Please try again.');
            });
        });
        
        // Handle test data form submission
        document.getElementById('test-data-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            
            // Get required fields
            const latitude = document.getElementById('test-latitude').value;
            const longitude = document.getElementById('test-longitude').value;
            
            if (!latitude || !longitude) {
                alert('Latitude and longitude are required');
                return;
            }
            
            formData.append('latitude', latitude);
            formData.append('longitude', longitude);
            
            // Get optional fields
            const trashType = document.getElementById('test-trash-type').value;
            const estimatedKg = document.getElementById('test-estimated-kg').value;
            const sparcity = document.getElementById('test-sparcity').value;
            const cleanliness = document.getElementById('test-cleanliness').value;
            
            if (trashType) formData.append('trash_type', trashType);
            if (estimatedKg) formData.append('estimated_kg', estimatedKg);
            if (sparcity) formData.append('sparcity', sparcity);
            if (cleanliness) formData.append('cleanliness', cleanliness);
            
            // Submit form
            fetch('/test-data', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                alert('Test data added successfully!');
                refreshMap();
                resetForm('test-data-form');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error adding test data. Please try again.');
            });
        });
    }
    
    // Set up file preview
    function setupFilePreview() {
        document.getElementById('file').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('image-preview');
                    preview.src = e.target.result;
                    document.getElementById('preview-container').classList.remove('d-none');
                }
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Reset form after submission
    function resetForm(formId) {
        document.getElementById(formId).reset();
        if (formId === 'upload-form') {
            document.getElementById('preview-container').classList.add('d-none');
            document.getElementById('details-form').classList.add('d-none');
        }
    }
}); 