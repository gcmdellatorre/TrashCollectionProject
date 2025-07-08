# Trash Collection App - Test Suite

This directory contains comprehensive tests for the Trash Collection application, focusing on the two main flows: **Photo Flow** (Manual Report) and **Video Flow** (AI-Generated Report).

## Test Structure

### Core Flow Tests
- **`test_photo_flow.py`** - Comprehensive tests for photo upload and manual report submission
- **`test_video_flow.py`** - Comprehensive tests for video upload and AI-generated report submission
- **`test_both_flows.py`** - Integration tests ensuring both flows work independently and together
- **`test_ui_state_management.py`** - Tests for proper UI state management and flow separation

### Test Runners
- **`run_all_flow_tests.py`** - Master test runner for all flow tests
- **`run_tests.sh`** - Bash script for easy test execution

### Documentation
- **`README.md`** - This file
- **`TESTING.md`** - Detailed testing instructions and examples

## Running Tests

### Quick Start
```bash
# Run all tests
./tests/run_tests.sh

# Run specific flow tests
./tests/run_tests.sh photo
./tests/run_tests.sh video
./tests/run_tests.sh both
```

### Python Test Runner
```bash
# Run all tests
python tests/run_all_flow_tests.py

# Run specific tests
python tests/run_all_flow_tests.py photo
python tests/run_all_flow_tests.py video
python tests/run_all_flow_tests.py both
```

### Individual Test Files
```bash
# Run individual test files
python tests/test_photo_flow.py
python tests/test_video_flow.py
python tests/test_both_flows.py
python tests/test_ui_state_management.py
```

## Test Coverage

### Photo Flow Tests (`test_photo_flow.py`)
- ✅ Photo upload page loading
- ✅ Photo upload with/without location
- ✅ Complete manual report submission
- ✅ Invalid file handling
- ✅ Large file handling
- ✅ Map integration
- ✅ Error handling
- ✅ Form validation
- ✅ UI state management

### Video Flow Tests (`test_video_flow.py`)
- ✅ Video upload page loading
- ✅ Video upload with/without location
- ✅ AI report submission
- ✅ Invalid file handling
- ✅ Missing file/location handling
- ✅ Detection results endpoints
- ✅ Model availability
- ✅ Map integration
- ✅ UI state management

### Integration Tests (`test_both_flows.py`)
- ✅ Independent flow operation
- ✅ Parallel upload support
- ✅ Shared infrastructure (location selector, map, notifications)
- ✅ UI element verification
- ✅ Flow separation

### UI State Management Tests (`test_ui_state_management.py`)
- ✅ Photo flow UI reset after submission
- ✅ Video flow UI separation from photo flow
- ✅ Video report display elements
- ✅ Form field clearing
- ✅ UI element visibility management

## Test Requirements

### Server Requirements
- Server must be running on `http://localhost:8000`
- Database must be initialized
- Sample data should be available

### Dependencies
- `requests` - For API testing
- `PIL` (Pillow) - For image creation in tests
- `pytest` - For test framework (optional)

### Environment Setup
```bash
# Install test dependencies
pip install requests pillow pytest

# Start the server
python app.py
```

## Test Categories

### Backend API Tests
- Endpoint availability and response format
- File upload handling
- Database integration
- Error handling

### Frontend UI Tests
- UI element presence and functionality
- JavaScript function availability
- Form validation
- User interaction flows

### Integration Tests
- End-to-end flow testing
- Cross-flow compatibility
- Shared component functionality

### UI State Management Tests
- Proper UI element showing/hiding
- Form field clearing
- Flow separation
- State reset after completion

## Test Results

### Expected Output
```
Running Photo Flow Tests...
==================================================
✅ Photo upload page loads
✅ Photo upload without location
✅ Photo upload with location
...
==================================================
Results: 12 passed, 0 failed

Running Video Flow Tests...
==================================================
✅ Video upload page loads
✅ Video upload without location
...
==================================================
Results: 12 passed, 0 failed

Running Both Flows Tests...
==================================================
✅ Both flows work independently
✅ Parallel upload support
...
==================================================
Results: 8 passed, 0 failed

Running UI State Management Tests...
==================================================
✅ Photo flow UI state management verified
✅ Video flow UI state management verified
✅ Video report UI elements verified
✅ UI separation between flows verified
==================================================
Results: 4 passed, 0 failed
```

## Troubleshooting

### Common Issues

#### Server Not Running
```
❌ Server is not running on http://localhost:8000
   Please start the server with: python app.py
```
**Solution**: Start the server with `python app.py`

#### Missing Dependencies
```
ModuleNotFoundError: No module named 'requests'
```
**Solution**: Install dependencies with `pip install requests pillow pytest`

#### OpenCV Issues (Video Flow)
```
No module named 'cv2'
```
**Solution**: Install OpenCV with `pip install opencv-python`

### Test Debugging
- Check server logs for backend errors
- Verify database connectivity
- Ensure all required files exist
- Check network connectivity for external API calls

## Contributing

When adding new features:
1. Add corresponding tests to the appropriate flow test file
2. Update UI state management tests if UI changes are made
3. Run all tests to ensure no regressions
4. Update this README if test structure changes

## Test Maintenance

### Regular Tasks
- Run tests after any code changes
- Update tests when API endpoints change
- Verify UI tests when frontend changes
- Clean up test data periodically

### Test Data
- Tests create temporary files and database entries
- Cleanup is handled automatically in most cases
- Manual cleanup may be needed for failed tests 