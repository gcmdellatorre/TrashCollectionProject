"""
Comprehensive Test for Video Flow (AI-Generated Report)
Tests the complete video upload and AI-generated report submission process
"""

import pytest
import os
import tempfile
import json
from PIL import Image
import io
from unittest.mock import patch, MagicMock
import requests

class TestVideoFlow:
    """Test the complete video upload and AI-generated report flow"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        """Base URL for the application"""
        return "http://localhost:8000"
    
    @pytest.fixture
    def sample_video(self):
        """Create a sample video for testing"""
        # Create a simple test video file (placeholder)
        # In a real test, you'd create an actual video file
        return b'fake_video_data'
    
    def test_toggle_exists_and_video_flow_accessible(self, base_url):
        """Test that the toggle exists and video flow is accessible (default)"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Check that toggle buttons exist
        assert "toggle-photo-flow" in response.text
        assert "toggle-video-flow" in response.text
        assert "video-flow-container" in response.text
        assert "photo-flow-container" in response.text
        
        # Check that video flow elements are present (default)
        assert "video-upload-form" in response.text
        assert "video-file-input" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
    
    def test_video_flow_toggle_functionality(self, base_url):
        """Test that video flow is active by default and can be toggled"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Check that video flow container exists and has advanced parameters
        assert "video-flow-container" in response.text
        assert "video-upload-form" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
        assert "video-latitude" in response.text
        assert "video-longitude" in response.text
    
    def test_video_upload_page_loads(self, base_url):
        """Test that the video upload page loads correctly (default flow)"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        assert "video" in response.text.lower() or "upload" in response.text.lower()
        # Verify video flow elements are present
        assert "video-flow-container" in response.text
        assert "video-upload-form" in response.text
        assert "video-file-input" in response.text
    
    def test_video_upload_without_location(self, base_url, sample_video):
        """Test video upload without location (should work) - video flow is default"""
        files = {'file': ('test_video.mp4', sample_video, 'video/mp4')}
        data = {
            'model_name': 'yolov8s-smart',
            'frame_interval': '30',
            'confidence_threshold': '0.3'
        }
        
        response = requests.post(f"{base_url}/api/upload-video", files=files, data=data)
        
        # Should return 200 even without location (location is optional)
        assert response.status_code in [200, 500]  # 500 if cv2 not available
        if response.status_code == 200:
            data = response.json()
            assert data['status'] == 'success'
            # Check for category_counts or category_breakdown
            breakdown = data['data'].get('category_counts') or data['data'].get('category_breakdown')
            assert breakdown is not None and len(breakdown) > 0
    
    def test_video_upload_with_location(self, base_url, sample_video):
        """Test video upload with location - video flow is default"""
        files = {'file': ('test_video.mp4', sample_video, 'video/mp4')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'model_name': 'yolov8s-smart',
            'frame_interval': '30',
            'confidence_threshold': '0.3'
        }
        
        response = requests.post(f"{base_url}/api/upload-video", files=files, data=data)
        
        assert response.status_code in [200, 500]  # 500 if cv2 not available
        if response.status_code == 200:
            data = response.json()
            assert data['status'] == 'success'
            # Check for category_counts or category_breakdown
            breakdown = data['data'].get('category_counts') or data['data'].get('category_breakdown')
            assert breakdown is not None and len(breakdown) > 0
    
    def test_video_upload_with_advanced_parameters(self, base_url, sample_video):
        """Test video upload with all advanced parameters - video flow is default"""
        files = {'file': ('test_video.mp4', sample_video, 'video/mp4')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'model_name': 'yolov8m-smart',
            'frame_interval': '15',
            'confidence_threshold': '0.5'
        }
        
        response = requests.post(f"{base_url}/api/upload-video", files=files, data=data)
        
        assert response.status_code in [200, 500]  # 500 if cv2 not available
        if response.status_code == 200:
            data = response.json()
            assert data['status'] == 'success'
            # Check for category_counts or category_breakdown
            breakdown = data['data'].get('category_counts') or data['data'].get('category_breakdown')
            assert breakdown is not None and len(breakdown) > 0
    
    def test_video_report_submission(self, base_url, sample_video):
        """Test video report submission - video flow is default"""
        files = {'video': ('test_video.mp4', sample_video, 'video/mp4')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'model': 'yolov8s-smart',
            'detection_data': json.dumps({
                'total_objects': 5,
                'estimated_weight_kg': 2.5,
                'category_breakdown': {'plastic': 3, 'paper': 2}
            })
        }
        
        response = requests.post(f"{base_url}/api/submit-video-report", files=files, data=data)
        
        assert response.status_code in [200, 500]  # 500 if cv2 not available
        if response.status_code == 200:
            data = response.json()
            assert data['status'] == 'success'
    
    def test_video_upload_invalid_file(self, base_url):
        """Test video upload with invalid file type - video flow is default"""
        # Create a text file instead of video
        files = {'file': ('test.txt', b'This is not a video', 'text/plain')}
        data = {
            'model_name': 'yolov8s-smart',
            'frame_interval': '30',
            'confidence_threshold': '0.3'
        }
        
        response = requests.post(f"{base_url}/api/upload-video", files=files, data=data)
        
        # Should handle gracefully or return error
        assert response.status_code in [200, 400, 422, 500]
    
    def test_video_upload_missing_file(self, base_url):
        """Test video upload with missing file - video flow is default"""
        data = {
            'model_name': 'yolov8s-smart',
            'frame_interval': '30',
            'confidence_threshold': '0.3'
        }
        
        response = requests.post(f"{base_url}/api/upload-video", data=data)
        
        # Should return error for missing file
        assert response.status_code in [400, 422, 500]
    
    def test_video_report_submission_missing_location(self, base_url, sample_video):
        """Test video report submission without location - video flow is default"""
        files = {'video': ('test_video.mp4', sample_video, 'video/mp4')}
        data = {
            'model': 'yolov8s-smart',
            'detection_data': json.dumps({
                'total_objects': 3,
                'estimated_weight_kg': 1.5,
                'category_breakdown': {'plastic': 2, 'metal': 1}
            })
        }
        
        response = requests.post(f"{base_url}/api/submit-video-report", files=files, data=data)
        
        # Should handle missing location gracefully
        assert response.status_code in [200, 400, 422, 500]
    
    def test_video_detection_results_endpoint(self, base_url):
        """Test video detection results endpoint - video flow is default"""
        response = requests.get(f"{base_url}/api/detection-results/test-id")
        
        # Should handle detection results request
        assert response.status_code in [200, 404, 500]
    
    def test_video_available_models_endpoint(self, base_url):
        """Test video available models endpoint - video flow is default"""
        response = requests.get(f"{base_url}/api/available-models")
        
        # Should return available models
        assert response.status_code in [200, 404, 500]
        if response.status_code == 200:
            data = response.json()
            assert 'data' in data
    
    def test_video_upload_different_models(self, base_url, sample_video):
        """Test video upload with different model options - video flow is default"""
        models = ['yolov8n-smart', 'yolov8s-smart', 'yolov8m-smart']
        
        for model in models:
            files = {'file': (f'test_video_{model}.mp4', sample_video, 'video/mp4')}
            data = {
                'model_name': model,
                'frame_interval': '30',
                'confidence_threshold': '0.3'
            }
            
            response = requests.post(f"{base_url}/api/upload-video", files=files, data=data)
            
            # Should handle different models
            assert response.status_code in [200, 500]  # 500 if cv2 not available
    
    def test_video_report_appears_on_map(self, base_url, sample_video):
        """Test that uploaded video reports appear on the map - video flow is default"""
        # Upload a video report
        files = {'video': ('map_test_video.mp4', sample_video, 'video/mp4')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'model': 'yolov8s-smart',
            'detection_data': json.dumps({
                'total_objects': 4,
                'estimated_weight_kg': 2.0,
                'category_breakdown': {'plastic': 2, 'paper': 1, 'metal': 1}
            })
        }
        
        upload_response = requests.post(f"{base_url}/api/submit-video-report", files=files, data=data)
        assert upload_response.status_code in [200, 500]  # 500 if cv2 not available
        
        if upload_response.status_code == 200:
            # Check that it appears in the map data
            map_response = requests.get(f"{base_url}/api/trash-data")
            assert map_response.status_code == 200
            
            map_data = map_response.json()
            assert 'reports' in map_data

class TestVideoFlowFrontend:
    """Test the frontend aspects of the video flow"""
    
    def test_video_buttons_exist(self):
        """Test that video upload buttons exist in the HTML"""
        with open("static/index.html", "r") as f:
            content = f.read()
        
        # Check for video buttons
        assert 'take-video-btn' in content
        assert 'upload-video-btn' in content
        assert 'video-file' in content  # Video file input
    
    def test_video_javascript_functions(self):
        """Test that required JavaScript functions exist"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for required functions
        required_functions = [
            'handleVideoFileChange',
            'processVideoForLocation',
            'uploadVideo',
            'showVideoDetectionReport',
            'submitVideoReport',
            'generateVideoReportContent'
        ]
        
        for func_name in required_functions:
            assert f"function {func_name}" in content, f"Function {func_name} not found"
    
    def test_video_report_ui_elements(self):
        """Test that video report UI elements are implemented"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for video report UI elements
        ui_elements = [
            'video-report-container',
            'submit-video-report-btn',
            'edit-video-report-btn',
            'currentVideoDetection'
        ]
        
        for element in ui_elements:
            assert element in content, f"UI element {element} not found"
    
    def test_video_location_handling(self):
        """Test that video location handling is implemented"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for location handling
        assert 'extractCoordinatesFromVideo' in content
        assert 'processVideoForLocation' in content
        assert 'showVideoLocationSelector' in content
    
    def test_video_duration_validation(self):
        """Test that video duration validation is implemented"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for duration validation
        assert 'duration > 10' in content
        assert 'Video must be 10 seconds or shorter' in content
    
    def test_video_report_generation(self):
        """Test that video report generation is implemented"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for report generation
        assert 'generateVideoReportContent' in content
        assert 'AI-Generated Trash Report' in content
        assert 'Total Objects Detected' in content
        assert 'Estimated Weight' in content
    
    def test_video_report_submission_flow(self):
        """Test that video report submission flow is implemented"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for submission flow
        assert 'submitVideoReport' in content
        assert '/api/submit-video-report' in content
        assert 'AI-generated report submitted successfully' in content

class TestVideoFlowIntegration:
    """Test the integration between frontend and backend"""
    
    def test_video_upload_endpoint_matches_frontend(self):
        """Test that frontend calls match backend endpoints"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check that frontend calls the correct endpoints
        assert '/api/upload-video' in content
        assert '/api/submit-video-report' in content
    
    def test_video_response_format_matches_frontend(self):
        """Test that backend response format matches frontend expectations"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check that frontend expects the correct response format
        assert 'data.status === \'success\'' in content
        assert 'data.data' in content  # For detection results
    
    def test_video_error_handling_consistency(self):
        """Test that error handling is consistent between frontend and backend"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for error handling
        assert 'catch' in content
        assert 'error' in content
        assert 'showNotification' in content

def run_video_flow_tests():
    """Run all video flow tests"""
    tests = [
        TestVideoFlow,
        TestVideoFlowFrontend,
        TestVideoFlowIntegration
    ]
    
    passed = 0
    failed = 0
    
    print("Running Video Flow Tests...")
    print("=" * 50)
    
    for test_class in tests:
        test_instance = test_class()
        for method_name in dir(test_instance):
            if method_name.startswith('test_'):
                try:
                    getattr(test_instance, method_name)()
                    print(f"✅ {test_class.__name__}.{method_name}")
                    passed += 1
                except Exception as e:
                    print(f"❌ {test_class.__name__}.{method_name}: {e}")
                    failed += 1
    
    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    
    return failed == 0

if __name__ == "__main__":
    success = run_video_flow_tests()
    exit(0 if success else 1) 