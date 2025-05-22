import requests
import time
import random

# Base URL for your FastAPI app
BASE_URL = "http://localhost:8000"

# Test data points - Different locations with varying trash types
test_data = [
    # San Francisco area
    {"latitude": 37.7749, "longitude": -122.4194, "trash_type": "plastic", "estimated_kg": 2.5, "sparcity": "medium", "cleanliness": "poor"},
    {"latitude": 37.7739, "longitude": -122.4312, "trash_type": "paper", "estimated_kg": 1.2, "sparcity": "low", "cleanliness": "moderate"},
    {"latitude": 37.7833, "longitude": -122.4167, "trash_type": "metal", "estimated_kg": 3.4, "sparcity": "high", "cleanliness": "very_poor"},
    {"latitude": 37.8044, "longitude": -122.2712, "trash_type": "glass", "estimated_kg": 4.1, "sparcity": "medium", "cleanliness": "poor"},
    {"latitude": 37.7695, "longitude": -122.4856, "trash_type": "plastic", "estimated_kg": 5.2, "sparcity": "high", "cleanliness": "very_poor"},
    
    # New York area
    {"latitude": 40.7128, "longitude": -74.0060, "trash_type": "plastic", "estimated_kg": 3.7, "sparcity": "high", "cleanliness": "poor"},
    {"latitude": 40.7282, "longitude": -73.9942, "trash_type": "organic", "estimated_kg": 2.3, "sparcity": "medium", "cleanliness": "moderate"},
    {"latitude": 40.7484, "longitude": -73.9857, "trash_type": "paper", "estimated_kg": 1.8, "sparcity": "low", "cleanliness": "good"},
    
    # Tokyo area
    {"latitude": 35.6762, "longitude": 139.6503, "trash_type": "electronic", "estimated_kg": 4.2, "sparcity": "low", "cleanliness": "good"},
    {"latitude": 35.6895, "longitude": 139.6917, "trash_type": "plastic", "estimated_kg": 1.4, "sparcity": "medium", "cleanliness": "moderate"},
    
    # London area
    {"latitude": 51.5074, "longitude": -0.1278, "trash_type": "glass", "estimated_kg": 3.1, "sparcity": "medium", "cleanliness": "moderate"},
    {"latitude": 51.5226, "longitude": -0.1058, "trash_type": "plastic", "estimated_kg": 2.7, "sparcity": "high", "cleanliness": "poor"}
]

def add_test_data():
    print(f"Adding {len(test_data)} test data points...")
    
    for i, data in enumerate(test_data):
        # Add timestamp to make entries unique
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(time.time() - random.randint(0, 86400 * 7)))  # Random time in the last week
        
        # Prepare data for POST request
        form_data = {
            "latitude": data["latitude"],
            "longitude": data["longitude"],
            "timestamp": timestamp,
            "trash_type": data["trash_type"],
            "estimated_kg": data["estimated_kg"],
            "sparcity": data["sparcity"],
            "cleanliness": data["cleanliness"]
        }
        
        # Make POST request to add test data
        response = requests.post(f"{BASE_URL}/test-data", data=form_data)
        
        if response.status_code == 200:
            print(f"✅ Added data point {i+1}/{len(test_data)}: {data['trash_type']} at {data['latitude']},{data['longitude']}")
        else:
            print(f"❌ Failed to add data point {i+1}: {response.status_code} - {response.text}")
            
        # Small delay to prevent flooding the server
        time.sleep(0.2)
        
    print("Test dataset creation completed!")

if __name__ == "__main__":
    add_test_data()