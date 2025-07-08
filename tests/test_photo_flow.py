"""
Comprehensive Test for Photo Flow (Manual Report)
Tests the complete photo upload and manual report submission process
"""

import pytest
import os
import tempfile
import json
from PIL import Image
import io
from unittest.mock import patch, MagicMock
import requests

class TestPhotoFlow:
    """Test the complete photo upload and manual report flow"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        """Base URL for the application"""
        return "http://localhost:8000"
    
    @pytest.fixture
    def sample_image(self):
        """Create a sample image for testing"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    def test_toggle_exists_and_photo_flow_accessible(self, base_url):
        """Test that the toggle exists and photo flow can be accessed"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Check that toggle buttons exist
        assert "toggle-photo-flow" in response.text
        assert "toggle-video-flow" in response.text
        assert "photo-flow-container" in response.text
        assert "video-flow-container" in response.text
    
    def test_photo_flow_toggle_functionality(self, base_url):
        """Test that clicking photo toggle shows photo flow"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Check that photo flow container exists and can be toggled
        assert "photo-flow-container" in response.text
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
    
    def test_photo_upload_page_loads(self, base_url):
        """Test that the photo upload page loads correctly after toggle"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        assert "photo" in response.text.lower() or "upload" in response.text.lower()
        # Verify photo flow elements are present
        assert "photo-flow-container" in response.text
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
    
    def test_photo_upload_without_location(self, base_url, sample_image):
        """Test photo upload without location (should work) - requires toggle to photo flow first"""
        files = {'file': ('test_photo.jpg', sample_image, 'image/jpeg')}
        
        response = requests.post(f"{base_url}/upload", files=files)
        
        # Should return 200 even without location (location is optional)
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        assert 'report_id' in data
    
    def test_photo_upload_with_location(self, base_url, sample_image):
        """Test photo upload with location - requires toggle to photo flow first"""
        files = {'file': ('test_photo.jpg', sample_image, 'image/jpeg')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194'
        }
        
        response = requests.post(f"{base_url}/upload", files=files, data=data)
        
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        assert 'report_id' in data
    
    def test_photo_upload_with_full_report(self, base_url, sample_image):
        """Test photo upload with complete manual report data - requires toggle to photo flow first"""
        files = {'file': ('test_photo.jpg', sample_image, 'image/jpeg')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'trash_type': 'plastic',
            'estimated_kg': '2.5',
            'sparcity': 'medium',
            'cleanliness': 'poor'
        }
        
        response = requests.post(f"{base_url}/upload", files=files, data=data)
        
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        assert 'report_id' in data
        assert 'metadata' in data
    
    def test_photo_upload_invalid_file(self, base_url):
        """Test photo upload with invalid file type - requires toggle to photo flow first"""
        # Create a text file instead of image
        files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
        
        response = requests.post(f"{base_url}/upload", files=files)
        
        # Should handle gracefully or return error
        assert response.status_code in [200, 400, 422]
    
    def test_photo_upload_large_file(self, base_url):
        """Test photo upload with large file - requires toggle to photo flow first"""
        # Create a large image (simulate large file)
        img = Image.new('RGB', (2000, 2000), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG', quality=95)
        img_bytes.seek(0)
        
        files = {'file': ('large_photo.jpg', img_bytes.getvalue(), 'image/jpeg')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194'
        }
        
        response = requests.post(f"{base_url}/upload", files=files, data=data)
        
        # Should handle large files
        assert response.status_code in [200, 413]  # 413 if too large
    
    def test_photo_report_appears_on_map(self, base_url, sample_image):
        """Test that uploaded photo reports appear on the map - requires toggle to photo flow first"""
        # Upload a photo
        files = {'file': ('map_test_photo.jpg', sample_image, 'image/jpeg')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            'trash_type': 'paper'
        }
        
        upload_response = requests.post(f"{base_url}/upload", files=files, data=data)
        assert upload_response.status_code == 200
        
        # Check that it appears in the map data
        map_response = requests.get(f"{base_url}/api/trash-data")
        assert map_response.status_code == 200
        
        map_data = map_response.json()
        assert 'reports' in map_data
        
        # Find our uploaded report
        uploaded_report = None
        for report in map_data['reports']:
            if report.get('trash_type') == 'paper':
                uploaded_report = report
                break
        
        assert uploaded_report is not None
        assert uploaded_report['latitude'] == 37.7749
        assert uploaded_report['longitude'] == -122.4194
    
    def test_photo_upload_error_handling(self, base_url):
        """Test error handling in photo upload - requires toggle to photo flow first"""
        # Test with missing file
        response = requests.post(f"{base_url}/upload")
        assert response.status_code in [400, 422]  # Should return error
    
    def test_photo_upload_coordinate_extraction(self, base_url):
        """Test coordinate extraction from photo metadata - requires toggle to photo flow first"""
        # This would test EXIF data extraction if implemented
        # For now, just test that the endpoint exists
        files = {'file': ('test_photo.jpg', b'fake_image_data', 'image/jpeg')}
        
        response = requests.post(f"{base_url}/api/check-coordinates", files=files)
        
        # Should handle coordinate extraction request
        assert response.status_code in [200, 400, 422]
    
    def test_photo_upload_form_validation(self, base_url, sample_image):
        """Test form validation for photo upload - requires toggle to photo flow first"""
        # Test with invalid latitude/longitude
        files = {'file': ('test_photo.jpg', sample_image, 'image/jpeg')}
        data = {
            'latitude': 'invalid_lat',
            'longitude': 'invalid_lng'
        }
        
        response = requests.post(f"{base_url}/upload", files=files, data=data)
        
        # Should handle invalid coordinates gracefully
        assert response.status_code in [200, 400, 422]
    
    def test_photo_upload_optional_fields(self, base_url, sample_image):
        """Test that optional fields work correctly - requires toggle to photo flow first"""
        files = {'file': ('test_photo.jpg', sample_image, 'image/jpeg')}
        data = {
            'latitude': '37.7749',
            'longitude': '-122.4194',
            # Only some optional fields
            'trash_type': 'metal',
            'estimated_kg': '1.0'
            # Missing sparcity and cleanliness
        }
        
        response = requests.post(f"{base_url}/upload", files=files, data=data)
        
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        
        # Check that provided fields are saved
        if 'metadata' in data:
            metadata = data['metadata']
            assert metadata.get('trash_type') == 'metal'
            assert float(metadata.get('estimated_kg', 0)) == 1.0

class TestPhotoFlowFrontend:
    """Test the frontend aspects of the photo flow"""
    
    def test_photo_buttons_exist(self):
        """Test that photo upload buttons exist in the HTML"""
        with open("static/index.html", "r") as f:
            content = f.read()
        
        # Check for photo buttons
        assert 'take-photo-btn' in content
        assert 'upload-photo-btn' in content
        assert 'file' in content  # File input
    
    def test_photo_javascript_functions(self):
        """Test that required JavaScript functions exist"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for required functions
        required_functions = [
            'handlePhotoCapture',
            'processPhotoForLocation',
            'handleUploadFormSubmit',
            'setupPhotoCapture'
        ]
        
        for func_name in required_functions:
            assert f"function {func_name}" in content, f"Function {func_name} not found"
    
    def test_photo_form_elements(self):
        """Test that photo form elements exist"""
        with open("static/index.html", "r") as f:
            content = f.read()
        
        # Check for form elements
        form_elements = [
            'upload-form',
            'file',
            'latitude',
            'longitude',
            'trash-type',
            'estimated-kg',
            'sparcity',
            'cleanliness',
            'submit-btn'
        ]
        
        for element_id in form_elements:
            assert element_id in content, f"Form element {element_id} not found"
    
    def test_photo_location_handling(self):
        """Test that photo location handling is implemented"""
        with open("static/js/modern-app.js", "r") as f:
            content = f.read()
        
        # Check for location handling
        assert 'extractCoordinatesFromImage' in content
        assert 'processPhotoForLocation' in content
        assert 'manual-location-section' in content

def run_photo_flow_tests():
    """Run all photo flow tests"""
    tests = [
        TestPhotoFlow,
        TestPhotoFlowFrontend
    ]
    
    passed = 0
    failed = 0
    
    print("Running Photo Flow Tests...")
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
    success = run_photo_flow_tests()
    exit(0 if success else 1) 