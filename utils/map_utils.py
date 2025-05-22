import folium
import os
from utils.db_utils import get_all_entries

def generate_map():
    """Generate a map with all trash data points"""
    # Create a map centered at a default location
    # (you can change this to center based on data points)
    map_center = [0, 0]  # Default center
    
    # Get all entries from database
    entries = get_all_entries()
    
    # If we have entries, center map on first entry
    if entries:
        map_center = [entries[0]["latitude"], entries[0]["longitude"]]
    
    trash_map = folium.Map(location=map_center, zoom_start=10)
    
    # Add markers for each trash data point
    for entry in entries:
        # Skip entries without location data
        if "latitude" not in entry or "longitude" not in entry:
            continue
            
        # Create popup with information
        popup_text = f"""
        <b>Timestamp:</b> {entry.get('timestamp', 'Unknown')}<br>
        <b>Trash Type:</b> {entry.get('trash_type', 'Not specified')}<br>
        <b>Estimated Weight:</b> {entry.get('estimated_kg', 'Not specified')} kg<br>
        <b>Sparcity:</b> {entry.get('sparcity', 'Not specified')}<br>
        <b>Cleanliness:</b> {entry.get('cleanliness', 'Not specified')}<br>
        """
        
        # Choose icon color based on trash type
        icon_color = 'red'  # Default
        if entry.get('trash_type') == 'plastic':
            icon_color = 'blue'
        elif entry.get('trash_type') == 'paper':
            icon_color = 'green'
        elif entry.get('trash_type') == 'metal':
            icon_color = 'orange'
        
        folium.Marker(
            location=[entry["latitude"], entry["longitude"]],
            popup=folium.Popup(popup_text, max_width=300),
            icon=folium.Icon(color=icon_color)
        ).add_to(trash_map)
    
    # Save map to a temporary file
    map_file = "temp_map.html"
    trash_map.save(map_file)
    
    # Read the HTML content
    with open(map_file, "r") as f:
        map_html = f.read()
    
    # Clean up temp file
    os.remove(map_file)
    
    return map_html 