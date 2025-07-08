# Testing Guide for Trash Collection Project

This guide explains how to test the photo and video upload functionality using automated scripts.

## Quick Tests (No File Uploads)

For quick testing of API endpoints and pages:

```bash
./tests/quick_test.sh
```

This tests:
- ✅ Main page loading
- ✅ API endpoints (available models, detection results, trash data)
- ✅ Video upload page

## Full Upload Tests

### Option 1: Bash Script (Recommended)

```bash
./tests/test_uploads.sh
```

This comprehensive script:
- ✅ Creates test image and video files
- ✅ Tests photo upload with location data
- ✅ Tests video upload with detection
- ✅ Tests all API endpoints
- ✅ Tests all pages
- ✅ Cleans up test files automatically

### Option 2: Python Script

```bash
python tests/test_uploads.py
```

Same functionality as the bash script but written in Python.

## Manual Testing with curl

### Test Photo Upload

```bash
# Create a test image (if you have ImageMagick)
convert -size 100x100 xc:red test_image.jpg

# Upload photo with location data
curl -X POST \
  -F "image=@test_image.jpg" \
  -F "latitude=37.7749" \
  -F "longitude=-122.4194" \
  -F "trash_type=plastic" \
  -F "estimated_kg=0.5" \
  -F "sparcity=medium" \
  -F "cleanliness=moderate" \
  http://localhost:8000/api/upload-photo
```

### Test Video Upload

```bash
# Create a test video (if you have ffmpeg)
ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=1 \
  -f lavfi -i sine=frequency=1000:duration=5 \
  -c:v libx264 -c:a aac -shortest test_video.mp4 -y

# Upload video with location data
curl -X POST \
  -F "video=@test_video.mp4" \
  -F "latitude=37.7749" \
  -F "longitude=-122.4194" \
  -F "model=yolov8s-smart" \
  http://localhost:8000/api/upload-video
```

### Test API Endpoints

```bash
# Available detection models
curl http://localhost:8000/api/available-models

# Detection results
curl http://localhost:8000/api/detection-results

# Trash data (for map)
curl http://localhost:8000/api/trash-data
```

## What Each Test Does

### Photo Upload Test
- Creates a test image file
- Uploads it with location data (San Francisco coordinates)
- Includes trash type, weight, sparcity, and cleanliness
- Verifies the upload succeeds and returns a report ID

### Video Upload Test
- Creates a test video file (5 seconds, 320x240)
- Uploads it with location data
- Uses the `yolov8s-smart` detection model
- Processes the video for trash detection
- Saves detected trash to the database
- Verifies the upload succeeds and returns detection results

### API Endpoint Tests
- **Available Models**: Lists all detection models
- **Detection Results**: Shows recent video detection results
- **Trash Data**: Returns all trash reports for the map

## Expected Results

### Successful Photo Upload
```json
{
  "success": true,
  "report_id": "uuid-here",
  "message": "Photo uploaded successfully"
}
```

### Successful Video Upload
```json
{
  "success": true,
  "detection_id": "uuid-here",
  "results": {
    "total_objects_detected": 5,
    "trash_objects_detected": 3,
    "estimated_weight_kg": 0.25,
    "category_counts": {
      "plastic": 2,
      "paper": 1
    }
  }
}
```

## Troubleshooting

### Server Not Running
```
❌ Server is not responding
   Make sure the server is running with: python app.py
```

**Solution**: Start the server first:
```bash
source .venv/bin/activate
python app.py
```

### OpenCV Not Installed
```
❌ Video upload error: No module named 'cv2'
```

**Solution**: Install OpenCV in your virtual environment:
```bash
source .venv/bin/activate
pip install opencv-python-headless
```

### File Upload Fails
```
❌ Photo/Video upload failed! (HTTP 500)
```

**Solution**: Check server logs for specific error messages. Common issues:
- Missing dependencies
- File permissions
- Database connection issues

## Test Files Location

Test files are created in the `test_files/` directory and automatically cleaned up after testing.

## Integration with pytest

The automated tests complement the existing pytest tests in the `tests/` directory:

```bash
# Run unit tests
pytest tests/ -v

# Run upload tests
./tests/test_uploads.sh

# Run both
pytest tests/ -v && ./test_uploads.sh
```

## Continuous Testing

For development, you can run tests automatically:

```bash
# Watch for changes and run tests
watch -n 5 './tests/quick_test.sh'
```

This will run quick tests every 5 seconds to verify the server is working. 