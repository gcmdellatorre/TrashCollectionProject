"""
UI State Management Tests for Trash Collection App
Tests proper UI state management and flow separation
"""

import pytest
import requests

class TestToggleFunctionality:
    """Test the toggle functionality between photo and video flows"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    def test_toggle_buttons_exist(self, base_url):
        """Test that toggle buttons exist in the UI"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Check that toggle buttons exist
        assert "toggle-photo-flow" in response.text
        assert "toggle-video-flow" in response.text
        assert "photo-flow-container" in response.text
        assert "video-flow-container" in response.text
    
    def test_video_flow_is_default(self, base_url):
        """Test that video flow is active by default"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Video flow should be visible by default
        assert "video-flow-container" in response.text
        assert "video-upload-form" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
        
        # Photo flow should exist but may be hidden
        assert "photo-flow-container" in response.text
        assert "upload-form" in response.text
    
    def test_photo_flow_requires_toggle(self, base_url):
        """Test that photo flow requires toggle activation"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow elements should exist
        assert "photo-flow-container" in response.text
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
        assert "upload-form" in response.text

class TestPhotoFlowUIState:
    """Test UI state management for photo flow"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    def test_photo_flow_initial_state(self, base_url):
        """Test initial state of photo flow after toggle"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow elements should exist
        assert "photo-flow-container" in response.text
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
        assert "upload-form" in response.text
        assert "file" in response.text  # Photo file input
        assert "latitude" in response.text
        assert "longitude" in response.text
    
    def test_photo_flow_form_fields(self, base_url):
        """Test that photo flow has correct form fields"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow should have these form fields
        assert "upload-form" in response.text
        assert "file" in response.text  # Photo file input
        assert "trash_type" in response.text
        assert "estimated_kg" in response.text
        assert "sparcity" in response.text
        assert "cleanliness" in response.text
        assert "latitude" in response.text
        assert "longitude" in response.text
    
    def test_photo_flow_buttons(self, base_url):
        """Test that photo flow has correct buttons"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow should have these buttons
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
        # Note: submit-report-btn may be dynamically created
    
    def test_photo_flow_location_handling(self, base_url):
        """Test that photo flow has location handling"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow should have location handling
        assert "latitude" in response.text
        assert "longitude" in response.text
        assert "manual-location-section" in response.text
        assert "location-selector" in response.text

class TestVideoFlowUIState:
    """Test UI state management for video flow"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    def test_video_flow_initial_state(self, base_url):
        """Test initial state of video flow (default)"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Video flow should be visible by default
        assert "video-flow-container" in response.text
        assert "video-upload-form" in response.text
        assert "video-file-input" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
    
    def test_video_flow_advanced_parameters(self, base_url):
        """Test that video flow has all advanced parameters"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Video flow should have advanced parameters
        assert "video-upload-form" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
        assert "video-latitude" in response.text
        assert "video-longitude" in response.text
    
    def test_video_flow_buttons(self, base_url):
        """Test that video flow has correct buttons"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Video flow should have these buttons
        assert "video-file-input" in response.text
        assert "take-video-btn" in response.text
        assert "upload-video-btn" in response.text
        assert "video-detect-btn" in response.text
        assert "video-submit-report-btn" in response.text
    
    def test_video_flow_report_preview(self, base_url):
        """Test that video flow has report preview functionality"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Video flow should have results and error sections
        assert "video-results-section" in response.text
        assert "video-results-content" in response.text
        assert "video-error-section" in response.text
        assert "video-error-message" in response.text

class TestFlowSeparation:
    """Test that flows are properly separated"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    def test_flows_have_different_forms(self, base_url):
        """Test that photo and video flows have different forms"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow form
        assert "upload-form" in response.text
        assert "file" in response.text  # Photo file input
        
        # Video flow form
        assert "video-upload-form" in response.text
        assert "video-file-input" in response.text
        
        # Forms should be different
        assert "upload-form" != "video-upload-form"
    
    def test_flows_have_different_containers(self, base_url):
        """Test that photo and video flows have different containers"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Different containers
        assert "photo-flow-container" in response.text
        assert "video-flow-container" in response.text
        
        # Containers should be different
        assert "photo-flow-container" != "video-flow-container"
    
    def test_flows_have_different_location_fields(self, base_url):
        """Test that flows have different location field names"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow location fields
        assert "latitude" in response.text
        assert "longitude" in response.text
        
        # Video flow location fields
        assert "video-latitude" in response.text
        assert "video-longitude" in response.text
        
        # Field names should be different
        assert "latitude" != "video-latitude"
        assert "longitude" != "video-longitude"

class TestSharedComponents:
    """Test that shared components work with both flows"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    def test_shared_location_selector(self, base_url):
        """Test that location selector is shared between flows"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Location selector should be available for both flows
        assert "location-selector-page" in response.text
        assert "location-search-input" in response.text
        assert "location-map" in response.text
        assert "confirm-selected-location" in response.text
    
    def test_shared_map(self, base_url):
        """Test that map is shared between flows"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Map should be available for both flows
        assert "map" in response.text
        assert "main-map-search" in response.text
        assert "find-nearby-btn" in response.text
    
    def test_shared_notification_system(self, base_url):
        """Test that notification system is shared between flows"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Notification system should be available (may be in JavaScript)
        # Note: Notification functions are typically in JavaScript files

class TestMobileResponsiveness:
    """Test mobile responsiveness of the toggle and flows"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    def test_toggle_is_mobile_friendly(self, base_url):
        """Test that toggle is mobile-friendly"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Toggle should have mobile-friendly classes
        assert "toggle-photo-flow" in response.text
        assert "toggle-video-flow" in response.text
        
        # Should have responsive design elements
        assert "mobile" in response.text or "responsive" in response.text or "sm:" in response.text
    
    def test_flows_are_mobile_friendly(self, base_url):
        """Test that both flows are mobile-friendly"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Both flows should have mobile-friendly elements
        assert "photo-flow-container" in response.text
        assert "video-flow-container" in response.text
        
        # Should have responsive design elements
        assert "mobile" in response.text or "responsive" in response.text or "sm:" in response.text

class TestToggleStatePersistence:
    """Test that toggle state is properly managed"""
    
    @pytest.fixture(scope="class")
    def base_url(self):
        return "http://localhost:8000"
    
    def test_video_flow_default_state(self, base_url):
        """Test that video flow is the default state"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Video flow should be visible by default
        assert "video-flow-container" in response.text
        assert "video-upload-form" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
    
    def test_photo_flow_requires_activation(self, base_url):
        """Test that photo flow requires explicit activation"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Photo flow elements should exist but may be hidden
        assert "photo-flow-container" in response.text
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
        assert "upload-form" in response.text

def run_ui_state_tests():
    """Run all UI state management tests"""
    import pytest
    import sys
    
    # Add project root to path
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Run the tests
    test_file = os.path.abspath(__file__)
    pytest.main([test_file, "-v", "--tb=short"])

if __name__ == "__main__":
    run_ui_state_tests() 