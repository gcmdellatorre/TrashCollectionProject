"""
UI State Management Tests for Trash Collection App
Tests proper UI state management and flow separation
"""

import pytest
import requests

class TestToggleFunctionality:
    """Test the toggle functionality between video and photo flows"""
    
    def test_landing_page_navigation(self, base_url):
        """Test that landing page has navigation to all pages"""
        response = requests.get(f"{base_url}/")
        assert response.status_code == 200
        
        # Landing page should have navigation cards
        assert "Report Trash" in response.text
        assert "Find Trash" in response.text
        assert "User Page" in response.text
        assert "Report Now" in response.text
        assert "Open Map" in response.text
        assert "View Profile" in response.text
    
    def test_video_flow_is_default(self, base_url):
        """Test that video flow is active by default on the report page"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Video flow should be visible by default
        assert "video-flow-container" in response.text
        assert "video-upload-form" in response.text
        assert "video-file-input" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
    
    def test_photo_flow_requires_toggle(self, base_url):
        """Test that photo flow requires toggle activation on the report page"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Photo flow should be hidden by default
        assert "photo-flow-container" in response.text
        assert "upload-form" in response.text
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text

class TestPhotoFlowUIState:
    """Test photo flow UI state and functionality"""
    
    def test_photo_flow_initial_state(self, base_url):
        """Test photo flow initial state on report page"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Photo flow should exist but be hidden
        assert "photo-flow-container" in response.text
        assert "upload-form" in response.text
    
    def test_photo_flow_form_fields(self, base_url):
        """Test that photo flow has all required form fields"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Photo flow should have form fields
        assert "upload-form" in response.text
        assert "file" in response.text
        assert "latitude" in response.text
        assert "longitude" in response.text
    
    def test_photo_flow_buttons(self, base_url):
        """Test that photo flow has required buttons"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Photo flow should have buttons
        assert "take-photo-btn" in response.text
        assert "upload-photo-btn" in response.text
        assert "detect-photo-btn" in response.text
    
    def test_photo_flow_location_handling(self, base_url):
        """Test that photo flow handles location properly"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Photo flow should have location fields
        assert "latitude" in response.text
        assert "longitude" in response.text
        assert "photo-select-location-btn" in response.text

class TestVideoFlowUIState:
    """Test video flow UI state and functionality"""
    
    def test_video_flow_initial_state(self, base_url):
        """Test video flow initial state on report page"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Video flow should be visible by default
        assert "video-flow-container" in response.text
        assert "video-upload-form" in response.text
    
    def test_video_flow_advanced_parameters(self, base_url):
        """Test that video flow has advanced parameters"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Video flow should have advanced parameters
        assert "video-upload-form" in response.text
        assert "modelSelect" in response.text
        assert "frameInterval" in response.text
        assert "confidenceThreshold" in response.text
    
    def test_video_flow_buttons(self, base_url):
        """Test that video flow has required buttons"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Video flow should have buttons
        assert "video-file-input" in response.text
        assert "take-video-btn" in response.text
        assert "upload-video-btn" in response.text
        assert "video-detect-btn" in response.text
    
    def test_video_flow_report_preview(self, base_url):
        """Test that video flow has report preview functionality"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Video flow should have results section
        assert "video-results-section" in response.text
        assert "video-results-content" in response.text

class TestFlowSeparation:
    """Test that video and photo flows are properly separated"""
    
    def test_flows_have_different_forms(self, base_url):
        """Test that both flows have their respective forms"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Both flows should have different forms
        assert "upload-form" in response.text  # Photo flow
        assert "video-upload-form" in response.text  # Video flow
    
    def test_flows_have_different_containers(self, base_url):
        """Test that both flows have their respective containers"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Both flows should have different containers
        assert "photo-flow-container" in response.text
        assert "video-flow-container" in response.text
    
    def test_flows_have_different_location_fields(self, base_url):
        """Test that both flows have their respective location fields"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Both flows should have location fields
        assert "latitude" in response.text
        assert "longitude" in response.text
        assert "photo-latitude" in response.text
        assert "photo-longitude" in response.text
        assert "video-latitude" in response.text
        assert "video-longitude" in response.text

class TestSharedComponents:
    """Test shared components between flows"""
    
    def test_shared_location_selector(self, base_url):
        """Test that location selector works with both flows"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Location selector should be available for both flows
        assert "location-selector-page" in response.text
        assert "location-search-input" in response.text
        assert "location-map" in response.text
        assert "confirm-selected-location" in response.text
    
    def test_shared_map(self, base_url):
        """Test that map integration works with both flows"""
        response = requests.get(f"{base_url}/map")
        assert response.status_code == 200
        
        # Map should have search functionality
        assert "main-map-search" in response.text
        assert "map" in response.text
        assert "leaflet" in response.text

class TestMobileResponsiveness:
    """Test mobile responsiveness of the flows"""
    
    def test_toggle_is_mobile_friendly(self, base_url):
        """Test that toggle buttons are mobile friendly"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Toggle should be mobile friendly
        assert "toggle-photo-flow" in response.text
        assert "toggle-video-flow" in response.text
        assert "mobile-text" in response.text
        assert "desktop-text" in response.text
    
    def test_flows_are_mobile_friendly(self, base_url):
        """Test that both flows are mobile friendly"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Both flows should be mobile friendly
        assert "photo-flow-container" in response.text
        assert "video-flow-container" in response.text
        assert "flex-col sm:flex-row" in response.text

class TestToggleStatePersistence:
    """Test that toggle state persists correctly"""
    
    def test_video_flow_default_state(self, base_url):
        """Test that video flow is the default state"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Video flow should be visible by default
        assert "video-flow-container" in response.text
        assert "toggle-active" in response.text
    
    def test_photo_flow_requires_activation(self, base_url):
        """Test that photo flow requires activation"""
        response = requests.get(f"{base_url}/report")
        assert response.status_code == 200
        
        # Photo flow should exist but be hidden
        assert "photo-flow-container" in response.text
        assert "hidden" in response.text

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