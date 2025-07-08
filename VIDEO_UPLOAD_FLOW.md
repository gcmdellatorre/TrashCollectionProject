# Video Upload Flow

The video upload flow now matches the photo upload flow for a consistent user experience.

## Flow Overview

1. **User selects video** (Take Video or Upload Video button)
2. **Video duration validation** (must be ≤ 10 seconds)
3. **Location extraction attempt** (try to get GPS from video metadata)
4. **If location found**: Proceed with upload and detection
5. **If no location**: Show location selector for manual selection
6. **After location selection**: Proceed with upload and detection
7. **Success**: Show results and refresh map

## Key Changes

### Frontend (JavaScript)

- **Removed location requirement** from `uploadVideo()` function
- **Added `processVideoForLocation()`** function to handle location extraction
- **Added `showVideoLocationSelector()`** function for manual location selection
- **Added `extractCoordinatesFromVideo()`** placeholder for future GPS extraction
- **Integrated with existing location selector** modal

### Backend (Python)

- **Already supports optional location** - no changes needed
- **Only saves to database** when location is provided
- **Processes video for detection** regardless of location

## User Experience

### Before (Old Flow)
1. User clicks video button
2. User selects video file
3. **Error: "Please select a location first"**
4. User has to manually select location first
5. User has to upload video again

### After (New Flow)
1. User clicks video button
2. User selects video file
3. System tries to extract location from video
4. **If location found**: Upload proceeds automatically
5. **If no location**: Location selector opens automatically
6. User selects location on map
7. Upload proceeds automatically
8. Success message and map refresh

## Technical Implementation

### Location Extraction
```javascript
function extractCoordinatesFromVideo(file) {
    return new Promise((resolve) => {
        // Placeholder for future GPS extraction from video metadata
        // Currently returns null to test manual location selection
        resolve(null);
    });
}
```

### Location Selector Integration
```javascript
function showVideoLocationSelector(videoFile) {
    // Store video file for later use
    window.pendingVideoFile = videoFile;
    
    // Open existing location selector
    openLocationSelector();
    
    // Override confirm function to handle video upload
    // Restore original function after upload
}
```

### Upload Process
```javascript
function uploadVideo(file) {
    const formData = new FormData();
    formData.append('video', file);
    
    // Add location if available (optional)
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    
    if (latitude && longitude) {
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
    }
    
    // Proceed with upload
    fetch('/api/upload-video', {
        method: 'POST',
        body: formData
    })
    // ... handle response
}
```

## Benefits

1. **Consistent UX**: Video flow now matches photo flow
2. **No upfront location requirement**: Users can upload first, select location later
3. **Automatic location extraction**: Future enhancement for GPS-enabled videos
4. **Seamless integration**: Uses existing location selector components
5. **Better error handling**: Clear feedback at each step

## Future Enhancements

1. **Real GPS extraction**: Implement actual GPS metadata extraction from videos
2. **Frame analysis**: Extract location from video frames if metadata is missing
3. **Batch processing**: Handle multiple videos with same location
4. **Location suggestions**: Suggest nearby locations based on video content

## Testing

Run the video flow tests to verify functionality:
```bash
python tests/test_video_flow.py
```

This ensures:
- Video upload works without location
- Location selector integration works
- Backend handles optional location correctly
- Duration validation still works
- Success flow clears inputs and refreshes map 