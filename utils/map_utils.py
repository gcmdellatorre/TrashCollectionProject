import folium
import os
from utils.db_utils import get_all_trash_reports
from utils.geo_functions import calculate_dirtiness_score
import tempfile

def generate_map(center_lat=None, center_lng=None, zoom_start=2):
    """
    Generate a Folium map with all trash data points
    
    Args:
        center_lat: Optional center latitude
        center_lng: Optional center longitude  
        zoom_start: Initial zoom level (default: 2 for world view)
    """
    
    # Get all entries from database
    reports = get_all_trash_reports()
    
    # Determine map center
    if center_lat and center_lng:
        map_center = [center_lat, center_lng]
    elif reports:
        # Center on first report if no center specified
        map_center = [reports[0]["latitude"], reports[0]["longitude"]]
        zoom_start = 10
    else:
        # Default world view
        map_center = [20, 0]
        zoom_start = 2
    
    # Create the map
    trash_map = folium.Map(
        location=map_center, 
        zoom_start=zoom_start,
        tiles='OpenStreetMap'
    )
    
    # Add markers for each trash data point
    for report in reports:
        # Skip entries without location data
        if not (report.get("latitude") and report.get("longitude")):
            continue
        
        # Calculate dirtiness score for color coding
        dirtiness_score = calculate_dirtiness_score(report)
        
        # Determine marker color based on dirtiness score
        if dirtiness_score >= 80:
            icon_color = 'red'      # Very dirty
            icon_symbol = '⚠️'
        elif dirtiness_score >= 60:
            icon_color = 'orange'   # Moderately dirty
            icon_symbol = '🗑️'
        elif dirtiness_score >= 40:
            icon_color = 'yellow'   # Somewhat dirty
            icon_symbol = '📦'
        else:
            icon_color = 'green'    # Relatively clean
            icon_symbol = '♻️'
        
        # Choose icon color based on trash type (fallback)
        trash_type_colors = {
            'plastic': 'blue',
            'paper': 'green', 
            'metal': 'gray',
            'glass': 'lightgreen',
            'organic': 'brown',
            'electronic': 'purple',
            'mixed': 'red'
        }
        
        if dirtiness_score < 40:  # Use trash type color for cleaner areas
            icon_color = trash_type_colors.get(report.get('trash_type'), 'blue')
        
        # Create detailed popup content
        popup_content = f"""
        <div style="min-width: 250px;">
            <h5 style="margin-bottom: 10px; color: #333;">
                {icon_symbol} Trash Report
            </h5>
            
            <table style="width: 100%; font-size: 12px;">
                <tr>
                    <td><strong>Location:</strong></td>
                    <td>{report['latitude']:.4f}, {report['longitude']:.4f}</td>
                </tr>
                <tr>
                    <td><strong>Timestamp:</strong></td>
                    <td>{report.get('timestamp', 'Unknown')}</td>
                </tr>
                <tr>
                    <td><strong>Trash Type:</strong></td>
                    <td>{report.get('trash_type', 'Not specified').title()}</td>
                </tr>
                <tr>
                    <td><strong>Weight:</strong></td>
                    <td>{report.get('estimated_kg', 'Unknown')} kg</td>
                </tr>
                <tr>
                    <td><strong>Sparcity:</strong></td>
                    <td>{report.get('sparcity', 'Not specified').title()}</td>
                </tr>
                <tr>
                    <td><strong>Cleanliness:</strong></td>
                    <td>{report.get('cleanliness', 'Not specified').title()}</td>
                </tr>
                <tr>
                    <td><strong>Dirtiness Score:</strong></td>
                    <td><span style="font-weight: bold; color: {'red' if dirtiness_score >= 60 else 'orange' if dirtiness_score >= 40 else 'green'};">
                        {dirtiness_score:.1f}/100
                    </span></td>
                </tr>
            </table>
            
            {f'<br><img src="/api/image/{report["image_blob_id"]}?thumbnail=true" style="max-width: 200px; max-height: 150px; border-radius: 4px;" alt="Trash image">' if report.get('image_blob_id') else ''}
        </div>
        """
        
        # Add marker to map
        folium.Marker(
            location=[report["latitude"], report["longitude"]],
            popup=folium.Popup(popup_content, max_width=300),
            tooltip=f"{report.get('trash_type', 'Unknown').title()} - {report.get('estimated_kg', '?')}kg",
            icon=folium.Icon(
                color=icon_color,
                icon='trash' if icon_color in ['red', 'orange'] else 'recycle',
                prefix='fa'
            )
        ).add_to(trash_map)
    
    # Add a legend
    add_map_legend(trash_map)
    
    # Add statistics overlay
    add_statistics_overlay(trash_map, reports)
    
    return trash_map

def add_map_legend(map_obj):
    """Add a legend to explain marker colors"""
    legend_html = '''
    <div style="position: fixed; 
                top: 10px; left: 50px; width: 200px; height: 120px; 
                background-color: white; border:2px solid grey; z-index:9999; 
                font-size:14px; padding: 10px; border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
    <h6 style="margin-top: 0; color: #333;">🗺️ Map Legend</h6>
    <p style="margin: 5px 0;"><i class="fa fa-map-marker" style="color:red"></i> Very Dirty (80+ score)</p>
    <p style="margin: 5px 0;"><i class="fa fa-map-marker" style="color:orange"></i> Moderately Dirty (60-79)</p>
    <p style="margin: 5px 0;"><i class="fa fa-map-marker" style="color:gold"></i> Somewhat Dirty (40-59)</p>
    <p style="margin: 5px 0;"><i class="fa fa-map-marker" style="color:green"></i> Relatively Clean (&lt;40)</p>
    </div>
    '''
    map_obj.get_root().html.add_child(folium.Element(legend_html))

def add_statistics_overlay(map_obj, reports):
    """Add statistics overlay to the map"""
    if not reports:
        return
    
    # Calculate statistics
    total_reports = len(reports)
    total_weight = sum(r.get('estimated_kg', 0) for r in reports if r.get('estimated_kg'))
    
    # Count by trash type
    trash_counts = {}
    for report in reports:
        trash_type = report.get('trash_type', 'unknown')
        trash_counts[trash_type] = trash_counts.get(trash_type, 0) + 1
    
    most_common = max(trash_counts.items(), key=lambda x: x[1]) if trash_counts else ('unknown', 0)
    
    # Calculate average dirtiness
    dirtiness_scores = [calculate_dirtiness_score(r) for r in reports]
    avg_dirtiness = sum(dirtiness_scores) / len(dirtiness_scores) if dirtiness_scores else 0
    
    stats_html = f'''
    <div style="position: fixed; 
                bottom: 10px; right: 10px; width: 250px; 
                background-color: white; border:2px solid grey; z-index:9999; 
                font-size:12px; padding: 15px; border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
    <h6 style="margin-top: 0; color: #333;">📊 Global Statistics</h6>
    <p style="margin: 3px 0;"><strong>Total Reports:</strong> {total_reports}</p>
    <p style="margin: 3px 0;"><strong>Total Weight:</strong> {total_weight:.1f} kg</p>
    <p style="margin: 3px 0;"><strong>Most Common:</strong> {most_common[0].title()}</p>
    <p style="margin: 3px 0;"><strong>Avg. Dirtiness:</strong> {avg_dirtiness:.1f}/100</p>
    <p style="margin: 3px 0; font-size: 10px; color: #666;">Click markers for details</p>
    </div>
    '''
    map_obj.get_root().html.add_child(folium.Element(stats_html))

def generate_area_map(center_lat, center_lng, radius_km=5, zoom_start=12):
    """
    Generate a focused map for a specific area with nearby trash reports
    
    Args:
        center_lat: Center latitude
        center_lng: Center longitude
        radius_km: Radius to search for reports (default: 5km)
        zoom_start: Initial zoom level (default: 12)
    """
    from utils.geo_functions import haversine_distance
    
    # Get all reports
    all_reports = get_all_trash_reports()
    
    # Filter reports within radius
    nearby_reports = []
    for report in all_reports:
        if not (report.get('latitude') and report.get('longitude')):
            continue
        
        distance = haversine_distance(
            center_lat, center_lng,
            report['latitude'], report['longitude']
        )
        
        if distance <= radius_km:
            report['distance_km'] = round(distance, 2)
            nearby_reports.append(report)
    
    # Create map centered on specified location
    area_map = folium.Map(
        location=[center_lat, center_lng],
        zoom_start=zoom_start
    )
    
    # Add center marker
    folium.Marker(
        location=[center_lat, center_lng],
        popup="Search Center",
        tooltip="Search Center",
        icon=folium.Icon(color='blue', icon='crosshairs', prefix='fa')
    ).add_to(area_map)
    
    # Add radius circle
    folium.Circle(
        location=[center_lat, center_lng],
        radius=radius_km * 1000,  # Convert km to meters
        popup=f"Search Radius: {radius_km}km",
        color='blue',
        fill=False,
        weight=2,
        opacity=0.6
    ).add_to(area_map)
    
    # Add nearby trash markers
    for i, report in enumerate(nearby_reports):
        dirtiness_score = calculate_dirtiness_score(report)
        
        popup_content = f"""
        <div style="min-width: 200px;">
            <h6>🗑️ Report #{i+1}</h6>
            <p><strong>Distance:</strong> {report['distance_km']}km</p>
            <p><strong>Type:</strong> {report.get('trash_type', 'Unknown')}</p>
            <p><strong>Weight:</strong> {report.get('estimated_kg', '?')}kg</p>
            <p><strong>Dirtiness:</strong> {dirtiness_score:.1f}/100</p>
        </div>
        """
        
        # Color based on dirtiness
        color = 'red' if dirtiness_score >= 60 else 'orange' if dirtiness_score >= 40 else 'green'
        
        folium.Marker(
            location=[report["latitude"], report["longitude"]],
            popup=folium.Popup(popup_content, max_width=250),
            tooltip=f"#{i+1} - {report['distance_km']}km away",
            icon=folium.Icon(color=color, icon='trash', prefix='fa')
        ).add_to(area_map)
    
    return area_map

def save_map_to_file(map_obj, filename="temp_map.html"):
    """Save a Folium map to an HTML file and return the content"""
    
    # Use temporary file to avoid conflicts
    with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as temp_file:
        map_obj.save(temp_file.name)
        temp_filename = temp_file.name
    
    try:
        # Read the HTML content
        with open(temp_filename, "r", encoding='utf-8') as f:
            map_html = f.read()
        return map_html
    finally:
        # Clean up temporary file
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

def generate_map_html():
    """Generate map HTML for the /map endpoint"""
    map_obj = generate_map()
    return save_map_to_file(map_obj)

# Legacy compatibility function
def generate_map_legacy():
    """Legacy function for backward compatibility"""
    return generate_map_html() 