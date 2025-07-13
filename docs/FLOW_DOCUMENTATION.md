# Trash Collection App - Flow Documentation

This document describes the two separate flows implemented in the trash collection application: the **Photo Flow** (Manual Report) and the **Video Flow** (AI-Generated Report).

## Overview

The application supports two distinct workflows for reporting trash:

1. **Photo Flow**: Manual report submission with user-provided data
2. **Video Flow**: AI-generated report based on video analysis

Both flows work independently and in parallel, sharing common infrastructure like location selection and map display.

## Photo Flow (Manual Report)

### Flow Steps:
1. **Upload Picture**: User selects or captures a photo
2. **Detect Location**: System attempts to extract location from photo metadata
3. **Manual Location**: If location not detected, user can add it manually
4. **Fill Report**: User optionally fills in report details (trash type, weight, etc.)
5. **Submit Report**: Manual report is saved to database

### Technical Implementation:

#### Frontend (`static/js/modern-app.js`):
- `handlePhotoCapture()` - Processes photo file selection
- `processPhotoForLocation()` - Attempts location extraction
- `extractCoordinatesFromImage()` - Extracts GPS from EXIF data
- `handleUploadFormSubmit()` - Submits manual report form

#### Backend (`app.py`):
- `POST /upload` - Handles photo upload and manual report submission
- Supports optional fields: `trash_type`, `estimated_kg`, `sparcity`, `cleanliness`

#### Database:
- Saves to `trash_reports` table with `source = 'manual'`

### Example Usage:
```javascript
// Photo flow automatically triggered when user selects photo
// Location extraction attempted, manual location selector shown if needed
// User fills form and submits
```

## Video Flow (AI-Generated Report)

### Flow Steps:
1. **Upload Video**: User selects or records a video (max 10 seconds)
2. **Detect Location**: System attempts to extract location from video metadata
3. **Manual Location**: If location not detected, user can add it manually
4. **AI Analysis**: Video is processed for trash detection using YOLOv8
5. **Show Report Preview**: AI detection results displayed as report preview
6. **Submit AI Report**: AI-generated report is saved to database

### Technical Implementation:

#### Frontend (`static/js/modern-app.js`):
- `handleVideoFileChange()` - Processes video file selection
- `processVideoForLocation()` - Attempts location extraction
- `uploadVideo()` - Uploads video for AI processing
- `showVideoDetectionReport()` - Displays AI results as report preview
- `submitVideoReport()` - Submits AI-generated report
- `generateVideoReportContent()` - Creates report preview HTML

#### Backend (`app.py`):
- `POST /api/upload-video` - Handles video upload and AI processing
- `POST /api/submit-video-report` - Submits AI-generated report
- `GET /api/detection-results` - Lists detection results
- `GET /api/available-models` - Lists available AI models

#### AI Processing (`ml/trash_detection_v2.py`):
- Uses YOLOv8 models for trash detection
- Smart filtering to exclude natural elements
- Returns detection results with object counts and weight estimates

#### Database:
- Saves to `trash_reports` table with `source = 'video_detection'`

### Example Usage:
```javascript
// Video flow automatically triggered when user selects video
// Location extraction attempted, manual location selector shown if needed
// Video uploaded for AI processing
// AI results shown as report preview
// User can submit AI-generated report
```

## Shared Infrastructure

Both flows share common components:

### Location Selection:
- `openLocationSelector()` - Opens location picker modal
- `closeLocationSelector()` - Closes location picker
- `confirmLocationSelection()` - Confirms selected location
- Uses Leaflet map for location selection

### Map Integration:
- `loadMapData()` - Loads all reports on map
- `addModernMarker()` - Adds new report markers
- Both flows update the same map view

### Notification System:
- `showNotification()` - Shows success/error messages
- Consistent messaging across both flows

## Testing

### Running Tests:

#### Individual Flow Tests:
```bash
# Test photo flow only
./tests/run_tests.sh photo

# Test video flow only  
./tests/run_tests.sh video

# Test both flows integration
./tests/run_tests.sh both

# Run all tests
./tests/run_tests.sh all
```

#### Python Test Runner:
```bash
# Run all tests
python tests/run_all_flow_tests.py

# Run specific test
python tests/run_all_flow_tests.py photo
python tests/run_all_flow_tests.py video
python tests/run_all_flow_tests.py both
```

### Test Coverage:

#### Photo Flow Tests (`tests/test_photo_flow.py`):
- ✅ Photo upload page loads
- ✅ Photo upload without location
- ✅ Photo upload with location
- ✅ Photo upload with full report data
- ✅ Invalid file handling
- ✅ Large file handling
- ✅ Reports appear on map
- ✅ Error handling
- ✅ Coordinate extraction
- ✅ Form validation
- ✅ Optional fields handling

#### Video Flow Tests (`tests/test_video_flow.py`):
- ✅ Video upload page loads
- ✅ Video upload without location
- ✅ Video upload with location
- ✅ Video report submission
- ✅ Invalid file handling
- ✅ Missing file handling
- ✅ Missing location handling
- ✅ Detection results endpoint
- ✅ Available models endpoint
- ✅ Different model support
- ✅ Reports appear on map

#### Integration Tests (`tests/test_both_flows.py`):
- ✅ Both flows work independently
- ✅ Parallel upload support
- ✅ Shared location selector
- ✅ Shared map integration
- ✅ Shared notification system
- ✅ Consistent form validation
- ✅ UI element verification

### Test Requirements:
- Server must be running on `http://localhost:8000`
- OpenCV must be installed for video processing
- YOLOv8 models must be available

## API Endpoints

### Photo Flow:
- `POST /upload` - Upload photo and submit manual report

### Video Flow:
- `POST /api/upload-video` - Upload video for AI processing
- `POST /api/submit-video-report` - Submit AI-generated report
- `GET /api/detection-results` - List detection results
- `GET /api/available-models` - List available AI models

### Shared:
- `GET /api/trash-data` - Get all reports for map
- `GET /api/search-location` - Search for locations
- `GET /api/geocode` - Geocode addresses

## Database Schema

Both flows save to the same `trash_reports` table:

```sql
CREATE TABLE trash_reports (
    id INTEGER PRIMARY KEY,
    latitude REAL,
    longitude REAL,
    image_data BLOB,
    filename TEXT,
    trash_type TEXT,
    estimated_kg REAL,
    sparcity TEXT,
    cleanliness TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'manual'  -- 'manual' or 'video_detection'
);
```

## Error Handling

### Photo Flow Errors:
- Invalid file type → Graceful error message
- Missing file → Form validation error
- Invalid coordinates → Location validation error

### Video Flow Errors:
- Invalid file type → 400/422 error response
- Missing file → 400/422 error response
- Missing location → Location validation error
- AI processing failure → Error message with details

### Shared Errors:
- Server not running → Connection error
- Database errors → Internal server error
- Network issues → Timeout/connection error

## Future Enhancements

### Photo Flow:
- [ ] EXIF data extraction for location
- [ ] Image compression for large files
- [ ] Multiple photo upload support

### Video Flow:
- [ ] Real-time video processing
- [ ] Multiple video format support
- [ ] Advanced AI model selection
- [ ] Video preview before processing

### Shared:
- [ ] Offline support
- [ ] Batch upload support
- [ ] Advanced location search
- [ ] Report editing capabilities 