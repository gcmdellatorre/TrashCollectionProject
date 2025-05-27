import math
from typing import List, Dict, Tuple, Optional
from utils.db_utils import get_all_trash_reports

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    return c * r

def calculate_dirtiness_score(report: Dict) -> float:
    """
    Calculate a dirtiness score for a trash report
    Higher score = dirtier place
    """
    score = 0.0
    
    # Base score from estimated weight
    if report.get('estimated_kg'):
        score += report['estimated_kg'] * 10  # 10 points per kg
    
    # Sparcity multiplier
    sparcity_multipliers = {
        'low': 1.0,
        'medium': 1.5,
        'high': 2.0
    }
    score *= sparcity_multipliers.get(report.get('sparcity', 'medium'), 1.5)
    
    # Cleanliness penalty (lower cleanliness = higher score)
    cleanliness_multipliers = {
        'good': 0.5,
        'moderate': 1.0,
        'poor': 1.5,
        'very_poor': 2.0
    }
    score *= cleanliness_multipliers.get(report.get('cleanliness', 'moderate'), 1.0)
    
    # Trash type weights (some types are "dirtier" than others)
    trash_type_weights = {
        'organic': 1.5,      # Smelly, attracts pests
        'mixed': 1.4,        # Usually messier
        'plastic': 1.2,      # Visible pollution
        'electronic': 1.1,   # Toxic
        'paper': 1.0,        # Biodegradable
        'glass': 0.9,        # Clean but dangerous
        'metal': 0.8         # Usually cleaner
    }
    score *= trash_type_weights.get(report.get('trash_type', 'mixed'), 1.0)
    
    return score

def find_closest_dirty_places(
    search_lat: float, 
    search_lng: float, 
    limit: int = 5,
    max_distance_km: float = 50.0
) -> List[Dict]:
    """
    Find the closest dirty places to a given location
    Returns list of reports sorted by distance, with dirtiness scores
    """
    reports = get_all_trash_reports()
    
    if not reports:
        return []
    
    # Calculate distance and dirtiness for each report
    enriched_reports = []
    
    for report in reports:
        if not (report.get('latitude') and report.get('longitude')):
            continue
            
        # Calculate distance
        distance = haversine_distance(
            search_lat, search_lng,
            report['latitude'], report['longitude']
        )
        
        # Skip if too far
        if distance > max_distance_km:
            continue
        
        # Calculate dirtiness score
        dirtiness_score = calculate_dirtiness_score(report)
        
        # Add enriched data
        enriched_report = {
            **report,
            'distance_km': round(distance, 2),
            'dirtiness_score': round(dirtiness_score, 1),
            'combined_score': round(dirtiness_score / (distance + 0.1), 2)  # Closer + dirtier = higher score
        }
        
        enriched_reports.append(enriched_report)
    
    # Sort by combined score (dirtiness/distance ratio) - higher is "worse"
    enriched_reports.sort(key=lambda x: x['combined_score'], reverse=True)
    
    return enriched_reports[:limit]

def find_dirtiest_areas_in_radius(
    center_lat: float,
    center_lng: float,
    radius_km: float = 10.0,
    min_reports: int = 3
) -> List[Dict]:
    """
    Find areas with clusters of dirty reports within a radius
    Returns areas with high concentration of trash
    """
    reports = get_all_trash_reports()
    
    if len(reports) < min_reports:
        return []
    
    # Group reports by approximate location (grid-based clustering)
    grid_size = 0.01  # Roughly 1km grid
    location_clusters = {}
    
    for report in reports:
        if not (report.get('latitude') and report.get('longitude')):
            continue
            
        # Check if within radius
        distance = haversine_distance(
            center_lat, center_lng,
            report['latitude'], report['longitude']
        )
        
        if distance > radius_km:
            continue
        
        # Create grid key
        grid_lat = round(report['latitude'] / grid_size) * grid_size
        grid_lng = round(report['longitude'] / grid_size) * grid_size
        grid_key = f"{grid_lat},{grid_lng}"
        
        if grid_key not in location_clusters:
            location_clusters[grid_key] = []
        
        location_clusters[grid_key].append({
            **report,
            'distance_from_center': round(distance, 2),
            'dirtiness_score': calculate_dirtiness_score(report)
        })
    
    # Analyze clusters
    dirty_areas = []
    
    for grid_key, cluster_reports in location_clusters.items():
        if len(cluster_reports) < min_reports:
            continue
        
        # Calculate cluster statistics
        avg_lat = sum(r['latitude'] for r in cluster_reports) / len(cluster_reports)
        avg_lng = sum(r['longitude'] for r in cluster_reports) / len(cluster_reports)
        total_dirtiness = sum(r['dirtiness_score'] for r in cluster_reports)
        avg_distance = sum(r['distance_from_center'] for r in cluster_reports) / len(cluster_reports)
        
        dirty_area = {
            'center_lat': round(avg_lat, 6),
            'center_lng': round(avg_lng, 6),
            'report_count': len(cluster_reports),
            'total_dirtiness_score': round(total_dirtiness, 1),
            'avg_dirtiness_score': round(total_dirtiness / len(cluster_reports), 1),
            'distance_from_search': round(avg_distance, 2),
            'reports': cluster_reports
        }
        
        dirty_areas.append(dirty_area)
    
    # Sort by total dirtiness score
    dirty_areas.sort(key=lambda x: x['total_dirtiness_score'], reverse=True)
    
    return dirty_areas

def get_location_summary(lat: float, lng: float, radius_km: float = 5.0) -> Dict:
    """
    Get a summary of trash situation around a location
    """
    reports = get_all_trash_reports()
    
    nearby_reports = []
    for report in reports:
        if not (report.get('latitude') and report.get('longitude')):
            continue
            
        distance = haversine_distance(lat, lng, report['latitude'], report['longitude'])
        if distance <= radius_km:
            nearby_reports.append({
                **report,
                'distance_km': round(distance, 2),
                'dirtiness_score': calculate_dirtiness_score(report)
            })
    
    if not nearby_reports:
        return {
            'total_reports': 0,
            'radius_km': radius_km,
            'message': f"No trash reports found within {radius_km}km of this location."
        }
    
    # Calculate statistics
    total_weight = sum(r.get('estimated_kg', 0) for r in nearby_reports)
    avg_dirtiness = sum(r['dirtiness_score'] for r in nearby_reports) / len(nearby_reports)
    
    # Count by trash type
    trash_types = {}
    for report in nearby_reports:
        trash_type = report.get('trash_type', 'unknown')
        trash_types[trash_type] = trash_types.get(trash_type, 0) + 1
    
    # Find most common trash type
    most_common_trash = max(trash_types.items(), key=lambda x: x[1]) if trash_types else ('unknown', 0)
    
    return {
        'total_reports': len(nearby_reports),
        'radius_km': radius_km,
        'total_estimated_kg': round(total_weight, 1),
        'avg_dirtiness_score': round(avg_dirtiness, 1),
        'most_common_trash_type': most_common_trash[0],
        'trash_type_breakdown': trash_types,
        'closest_dirty_place': nearby_reports[0] if nearby_reports else None
    }

# Geocoding helper (for converting addresses to coordinates)
def geocode_location(address: str) -> Optional[Tuple[float, float]]:
    """
    Convert an address to coordinates using Nominatim (OpenStreetMap)
    Returns (latitude, longitude) or None if not found
    """
    import urllib.parse
    import urllib.request
    import json
    
    try:
        # URL encode the address
        encoded_address = urllib.parse.quote(address)
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded_address}&limit=1"
        
        # Make request
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
        
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
        
        return None
        
    except Exception as e:
        print(f"Geocoding error: {e}")
        return None 