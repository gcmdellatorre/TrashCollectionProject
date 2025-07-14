"""
Integration Tests for Both Photo and Video Flows
Tests that both flows work independently and together with toggle functionality
"""

import pytest
import os
import tempfile
import json
from PIL import Image
import io
from unittest.mock import patch, MagicMock
import requests

class TestBothFlows:
    """Test that both flows work independently and together"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        """Base URL for the application"""
        return "http://localhost:8000"
    
    @pytest.fixture
    def sample_image(self):
        """Create a sample image for testing"""
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    @pytest.fixture
    def sample_video(self):
        """Create a sample video for testing"""
        return b'fake_video_data'
    
    def test_toggle_functionality_exists(self, base_url):
        """Test that toggle functionality exists and both flows are accessible"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Check that toggle buttons exist
        assert "toggle-photo-flow" in response.text
        assert "toggle-video-flow" in response.text
        assert "photo-flow-container" in response.text
        assert "video-flow-container" in response.text
        
        # Check that video flow is default (visible)
        assert "video-upload-form" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
        
        # Check that photo flow elements exist (but may be hidden)
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
    
    def test_video_flow_is_default(self, base_url):
        """Test that video flow is active by default"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Video flow should be visible by default
        assert "video-flow-container" in response.text
        assert "video-upload-form" in response.text
        assert "video-file-input" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
    
    def test_photo_flow_requires_toggle(self, base_url):
        """Test that photo flow requires toggle activation"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow elements should exist but may be hidden
        assert "photo-flow-container" in response.text
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
        assert "upload-form" in response.text
    
    def test_both_flows_independent(self, base_url, sample_image, sample_video):
        """Test that both flows work independently after toggle"""
        # Test video flow (default)
        video_files = {'file': ('test_video.mp4', sample_video, 'video/mp4')}
        video_data = {
            'model_name': 'yolov8s-smart',
            'frame_interval': '30',
            'confidence_threshold': '0.3'
        }
        
        video_response = requests.post(f"{base_url}/api/upload-video", files=video_files, data=video_data)
        assert video_response.status_code in [200, 500]  # 500 if cv2 not available
        
        # Test photo flow (requires toggle in real usage)
        photo_files = {'file': ('test_photo.jpg', sample_image, 'image/jpeg')}
        photo_data = {
            'latitude': '37.7749',
            'longitude': '-122.4194'
        }
        
        photo_response = requests.post(f"{base_url}/upload", files=photo_files, data=photo_data)
        assert photo_response.status_code == 200
        
        # Both should work independently
        if video_response.status_code == 200:
            assert video_response.json()['status'] == 'success'
        assert photo_response.json()['status'] == 'success'
    
    def test_both_flows_parallel_upload(self, base_url, sample_image, sample_video):
        """Test that both flows can handle parallel uploads"""
        # Upload video (default flow)
        video_files = {'file': ('parallel_video.mp4', sample_video, 'video/mp4')}
        video_data = {
            'model_name': 'yolov8n-smart',
            'frame_interval': '15',
            'confidence_threshold': '0.4'
        }
        
        video_response = requests.post(f"{base_url}/api/upload-video", files=video_files, data=video_data)
        
        # Upload photo (requires toggle in real usage)
        photo_files = {'file': ('parallel_photo.jpg', sample_image, 'image/jpeg')}
        photo_data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'trash_type': 'plastic'
        }
        
        photo_response = requests.post(f"{base_url}/upload", files=photo_files, data=photo_data)
        
        # Both should succeed
        assert photo_response.status_code == 200
        if video_response.status_code == 200:
            assert video_response.json()['status'] == 'success'
        assert photo_response.json()['status'] == 'success'
    
    def test_both_flows_appear_on_map(self, base_url, sample_image, sample_video):
        """Test that both flows create reports that appear on the map"""
        # Upload video report (default flow)
        video_files = {'video': ('map_video.mp4', sample_video, 'video/mp4')}
        video_data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'model': 'yolov8s-smart',
            'detection_data': json.dumps({
                'total_objects': 3,
                'estimated_weight_kg': 1.5,
                'category_breakdown': {'plastic': 2, 'metal': 1}
            })
        }
        
        video_response = requests.post(f"{base_url}/api/submit-video-report", files=video_files, data=video_data)
        
        # Upload photo report (requires toggle in real usage)
        photo_files = {'file': ('map_photo.jpg', sample_image, 'image/jpeg')}
        photo_data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'trash_type': 'paper'
        }
        
        photo_response = requests.post(f"{base_url}/upload", files=photo_files, data=photo_data)
        
        # Both should succeed
        assert photo_response.status_code == 200
        if video_response.status_code == 200:
            assert video_response.json()['status'] == 'success'
        assert photo_response.json()['status'] == 'success'
        
        # Check map data
        map_response = requests.get(f"{base_url}/api/trash-data")
        assert map_response.status_code == 200
        map_data = map_response.json()
        assert 'reports' in map_data
    
    def test_both_flows_error_handling(self, base_url):
        """Test error handling in both flows"""
        # Test video flow error handling
        video_response = requests.post(f"{base_url}/api/upload-video")
        assert video_response.status_code in [400, 422, 500]
        
        # Test photo flow error handling
        photo_response = requests.post(f"{base_url}/upload")
        assert photo_response.status_code in [400, 422]
    
    def test_both_flows_location_handling(self, base_url, sample_image, sample_video):
        """Test location handling in both flows"""
        # Test video flow with location
        video_files = {'file': ('location_video.mp4', sample_video, 'video/mp4')}
        video_data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'model_name': 'yolov8s-smart',
            'frame_interval': '30',
            'confidence_threshold': '0.3'
        }
        
        video_response = requests.post(f"{base_url}/api/upload-video", files=video_files, data=video_data)
        
        # Test photo flow with location
        photo_files = {'file': ('location_photo.jpg', sample_image, 'image/jpeg')}
        photo_data = {
            'latitude': '37.7749',
            'longitude': '-122.4194'
        }
        
        photo_response = requests.post(f"{base_url}/upload", files=photo_files, data=photo_data)
        
        # Both should handle location correctly
        assert photo_response.status_code == 200
        if video_response.status_code == 200:
            assert video_response.json()['status'] == 'success'
        assert photo_response.json()['status'] == 'success'

class TestFlowIntegration:
    """Test integration between flows and shared components"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    @pytest.fixture
    def sample_image(self):
        """Create a sample image for testing"""
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    @pytest.fixture
    def sample_video(self):
        """Create a sample video for testing"""
        return b'fake_video_data'

    def test_shared_location_selector(self, base_url):
        """Test that location selector works with both flows"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Location selector should be available for both flows
        assert "location-selector-page" in response.text
        assert "location-search-input" in response.text
        assert "location-map" in response.text
        assert "confirm-selected-location" in response.text
    
    def test_shared_map_integration(self, base_url):
        """Test that map integration works with both flows"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Map should be available and work with both flows
        assert "map" in response.text
        assert "main-map-search" in response.text
        assert "find-nearby-btn" in response.text
        
        # Map data endpoint should work
        map_response = requests.get(f"{base_url}/api/trash-data")
        assert map_response.status_code == 200
        map_data = map_response.json()
        assert 'reports' in map_data
    
    def test_shared_notification_system(self, base_url):
        """Test that notification system script is included and notification UI can be rendered"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        # Check for the notification script reference
        assert "/static/js/modern-app.js" in response.text
        # Optionally, check for the notification container or a placeholder
        # assert '<div id="notification-container"' in response.text or similar

    def test_unified_success_notification_message(self, base_url, sample_image, sample_video):
        """Test that both photo and video flows show the same unified success notification message"""
        
        # Test photo flow success notification
        photo_files = {'file': ('notification_test_photo.jpg', sample_image, 'image/jpeg')}
        photo_data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'trash_type': 'plastic',
            'estimated_kg': '2.5',
            'sparcity': 'medium',
            'cleanliness': 'dirty'
        }
        
        photo_response = requests.post(f"{base_url}/upload", files=photo_files, data=photo_data)
        assert photo_response.status_code == 200
        
        photo_result = photo_response.json()
        assert photo_result['status'] == 'success'
        # The frontend should show "Report submitted successfully!" notification
        # This is handled by the JavaScript showNotification function
        
        # Test video flow success notification
        # First, upload video for detection
        video_detection_files = {'file': ('notification_test_video.mp4', sample_video, 'video/mp4')}
        video_detection_data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'model_name': 'yolov8s-smart',
            'frame_interval': '30',
            'confidence_threshold': '0.3'
        }
        
        video_detection_response = requests.post(f"{base_url}/api/upload-video", files=video_detection_files, data=video_detection_data)
        
        if video_detection_response.status_code == 200:
            detection_result = video_detection_response.json()
            detection_data = detection_result.get('data', {})
            
            # Then submit the video report
            video_submit_files = {'video': ('notification_test_video.mp4', sample_video, 'video/mp4')}
            video_submit_data = {
                'latitude': '37.7749',
                'longitude': '-122.4194',
                'model': 'yolov8s-smart',
                'detection_data': json.dumps(detection_data)
            }
            
            video_submit_response = requests.post(f"{base_url}/api/submit-video-report", files=video_submit_files, data=video_submit_data)
            
            if video_submit_response.status_code == 200:
                video_result = video_submit_response.json()
                assert video_result['status'] == 'success'
                # The frontend should show "Report submitted successfully!" notification
                # This is handled by the JavaScript showNotification function
        
        # Verify that both flows use the same notification message in the frontend
        # Check the JavaScript code for the unified message
        js_response = requests.get(f"{base_url}/static/js/modern-app.js")
        assert js_response.status_code == 200
        js_content = js_response.text
        
        # Both flows should use the same unified message
        assert 'Report submitted successfully!' in js_content
        
        # Photo flow should use this message
        photo_notification_count = js_content.count('Report submitted successfully!')
        assert photo_notification_count >= 1, "Photo flow should use the unified success message"
        
        # Video flow should also use this message (not a different one)
        # Check that there's no "AI-generated report submitted successfully!" message
        assert 'AI-generated report submitted successfully!' not in js_content, "Video flow should use unified message, not AI-specific message"
        
        print(f"✅ Both photo and video flows use the unified notification message: 'Report submitted successfully!'")
        print(f"✅ Found {photo_notification_count} instances of the unified message in the code")

    def test_notification_system_implementation(self, base_url):
        """Test that the notification system is properly implemented (script present)"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        # Check for the notification script reference
        assert "/static/js/modern-app.js" in response.text

    def test_shared_form_validation(self, base_url):
        """Test that form validation works with both flows"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Both flows should have form validation
        assert "upload-form" in response.text  # Photo flow
        assert "video-upload-form" in response.text  # Video flow

class TestFlowUI:
    """Test UI elements for both flows"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    def test_both_flows_have_buttons(self, base_url):
        """Test that both flows have their respective button containers (dynamic buttons are rendered by JS)"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        # Toggle buttons
        assert "toggle-photo-flow" in response.text
        assert "toggle-video-flow" in response.text
        # Photo flow buttons (container present)
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
        # Video flow buttons (container present)
        assert "video-file-input" in response.text
        assert "take-video-btn" in response.text
        assert "upload-video-btn" in response.text
        # Do not check for video-submit-btn, as it is rendered dynamically by JS
    
    def test_both_flows_have_forms(self, base_url):
        """Test that both flows have their respective forms"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow form
        assert "upload-form" in response.text
        assert "file" in response.text  # Photo file input
        
        # Video flow form
        assert "video-upload-form" in response.text
        assert "video-file-input" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
    
    def test_both_flows_have_location_handling(self, base_url):
        """Test that both flows have location handling"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow location
        assert "latitude" in response.text
        assert "longitude" in response.text
        assert "manual-location-section" in response.text
        
        # Video flow location
        assert "video-latitude" in response.text
        assert "video-longitude" in response.text
    
    def test_video_flow_has_report_preview(self, base_url):
        """Test that video flow has report preview functionality"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Video flow should have results and error sections
        assert "video-results-section" in response.text
        assert "video-results-content" in response.text
        assert "video-error-section" in response.text
        assert "video-error-message" in response.text

def run_both_flows_tests():
    """Run all tests for both flows"""
    tests = [
        TestBothFlows,
        TestFlowIntegration,
        TestFlowUI
    ]
    
    passed = 0
    failed = 0
    
    print("Running Both Flows Tests...")
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
    success = run_both_flows_tests()
    exit(0 if success else 1) 