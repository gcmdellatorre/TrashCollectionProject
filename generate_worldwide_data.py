#!/usr/bin/env python3
"""
Worldwide Trash Data Generator
Cleans the database and generates 500 realistic trash data points all over the world
"""

import random
import asyncio
import requests
from datetime import datetime, timedelta
from utils.db_utils import save_trash_report, initialize_database, get_all_trash_reports
from utils.database import SessionLocal, TrashReport
from PIL import Image
import io
import os
import shutil

# Create a single 1x1 pixel image once and reuse it
_dummy_image_cache = None

def get_dummy_image() -> bytes:
    """Get a minimal 1x1 pixel dummy image (cached)"""
    global _dummy_image_cache
    
    if _dummy_image_cache is None:
        # Create minimal 1x1 pixel white image
        image = Image.new('RGB', (1, 1), (255, 255, 255))
        img_bytes = io.BytesIO()
        image.save(img_bytes, format='JPEG', quality=50)
        _dummy_image_cache = img_bytes.getvalue()
        print("Created minimal dummy image (1x1 pixel)")
    
    return _dummy_image_cache

def clear_database():
    """Clear all data from database"""
    print("🗑️  Clearing database...")
    
    db = SessionLocal()
    try:
        deleted_count = db.query(TrashReport).count()
        db.query(TrashReport).delete()
        db.commit()
        print(f"🗑️  Deleted {deleted_count} entries from database")
        
        # Also clean up image files
        images_dir = "data/images"
        if os.path.exists(images_dir):
            shutil.rmtree(images_dir)
            os.makedirs(images_dir, exist_ok=True)
            print("🗑️  Cleaned up image files")
            
    except Exception as e:
        print(f"Error clearing database: {e}")
        db.rollback()
    finally:
        db.close()

def generate_worldwide_data(num_entries: int = 500):
    """Generate worldwide trash data points"""
    
    # Initialize database
    initialize_database()
    print(f"🌍 Creating {num_entries} worldwide trash data points...")
    
    # Define possible values
    trash_types = ['plastic', 'paper', 'metal', 'glass', 'organic', 'electronic', 'mixed']
    sparcity_levels = ['low', 'medium', 'high']
    cleanliness_levels = ['good', 'moderate', 'poor', 'very_poor']
    
    # Worldwide locations - major cities and interesting places
    locations = [
        # North America
        (40.7128, -74.0060, "New York, USA"),
        (37.7749, -122.4194, "San Francisco, USA"),
        (34.0522, -118.2437, "Los Angeles, USA"),
        (25.7617, -80.1918, "Miami, USA"),
        (45.4215, -75.6972, "Ottawa, Canada"),
        (43.6532, -79.3832, "Toronto, Canada"),
        (19.4326, -99.1332, "Mexico City, Mexico"),
        
        # Europe
        (51.5074, -0.1278, "London, UK"),
        (48.8566, 2.3522, "Paris, France"),
        (52.5200, 13.4050, "Berlin, Germany"),
        (41.9028, 12.4964, "Rome, Italy"),
        (41.3851, 2.1734, "Barcelona, Spain"),
        (59.9139, 10.7522, "Oslo, Norway"),
        (55.7558, 37.6176, "Moscow, Russia"),
        (52.3676, 4.9041, "Amsterdam, Netherlands"),
        (47.3769, 8.5417, "Zurich, Switzerland"),
        (59.3293, 18.0686, "Stockholm, Sweden"),
        (50.8503, 4.3517, "Brussels, Belgium"),
        (48.2082, 16.3738, "Vienna, Austria"),
        (50.0755, 14.4378, "Prague, Czech Republic"),
        
        # Asia
        (35.6762, 139.6503, "Tokyo, Japan"),
        (39.9042, 116.4074, "Beijing, China"),
        (31.2304, 121.4737, "Shanghai, China"),
        (22.3193, 114.1694, "Hong Kong"),
        (1.3521, 103.8198, "Singapore"),
        (13.7563, 100.5018, "Bangkok, Thailand"),
        (14.5995, 120.9842, "Manila, Philippines"),
        (3.1390, 101.6869, "Kuala Lumpur, Malaysia"),
        (6.2088, 106.8456, "Jakarta, Indonesia"),
        (28.6139, 77.2090, "New Delhi, India"),
        (19.0760, 72.8777, "Mumbai, India"),
        (12.9716, 77.5946, "Bangalore, India"),
        (37.5665, 126.9780, "Seoul, South Korea"),
        (25.0330, 121.5654, "Taipei, Taiwan"),
        (21.3069, -157.8583, "Honolulu, USA"),
        
        # Oceania
        (-33.8688, 151.2093, "Sydney, Australia"),
        (-37.8136, 144.9631, "Melbourne, Australia"),
        (-27.4698, 153.0251, "Brisbane, Australia"),
        (-31.9505, 115.8605, "Perth, Australia"),
        (-41.2866, 174.7756, "Wellington, New Zealand"),
        (-36.8485, 174.7633, "Auckland, New Zealand"),
        
        # South America
        (-22.9068, -43.1729, "Rio de Janeiro, Brazil"),
        (-23.5505, -46.6333, "São Paulo, Brazil"),
        (-34.6037, -58.3816, "Buenos Aires, Argentina"),
        (-33.4489, -70.6693, "Santiago, Chile"),
        (-12.0464, -77.0428, "Lima, Peru"),
        (4.7110, -74.0721, "Bogotá, Colombia"),
        (10.4806, -66.9036, "Caracas, Venezuela"),
        
        # Africa
        (-26.2041, 28.0473, "Johannesburg, South Africa"),
        (-33.9249, 18.4241, "Cape Town, South Africa"),
        (30.0444, 31.2357, "Cairo, Egypt"),
        (6.5244, 3.3792, "Lagos, Nigeria"),
        (-1.2921, 36.8219, "Nairobi, Kenya"),
        (9.0820, 8.6753, "Abuja, Nigeria"),
        (33.9716, -6.8498, "Rabat, Morocco"),
        (36.7525, 3.0420, "Algiers, Algeria"),
        (14.7179, -17.4677, "Dakar, Senegal"),
        
        # Middle East
        (25.2048, 55.2708, "Dubai, UAE"),
        (24.7136, 46.6753, "Riyadh, Saudi Arabia"),
        (31.9539, 35.9106, "Amman, Jordan"),
        (33.3152, 44.3661, "Baghdad, Iraq"),
        (35.6892, 51.3890, "Tehran, Iran"),
        (32.0853, 34.7818, "Tel Aviv, Israel"),
        
        # Coastal and Beach Areas (more trash)
        (25.7617, -80.1918, "Miami Beach, USA"),
        (36.1627, -86.7816, "Nashville, USA"),
        (25.2048, 55.2708, "Dubai Marina, UAE"),
        (1.3521, 103.8198, "Sentosa Island, Singapore"),
        (-33.8688, 151.2093, "Bondi Beach, Australia"),
        (35.6762, 139.6503, "Odaiba, Japan"),
        (48.8566, 2.3522, "Seine River, France"),
        (51.5074, -0.1278, "Thames River, UK"),
        (40.7128, -74.0060, "Hudson River, USA"),
        (37.7749, -122.4194, "Golden Gate, USA"),
        (34.0522, -118.2437, "Santa Monica Pier, USA"),
        (25.7617, -80.1918, "South Beach, USA"),
        (22.3193, 114.1694, "Victoria Harbour, Hong Kong"),
        (1.3521, 103.8198, "Marina Bay, Singapore"),
        (35.6762, 139.6503, "Tokyo Bay, Japan"),
        (39.9042, 116.4074, "Haihe River, China"),
        (31.2304, 121.4737, "Huangpu River, China"),
        (13.7563, 100.5018, "Chao Phraya River, Thailand"),
        (14.5995, 120.9842, "Manila Bay, Philippines"),
        (3.1390, 101.6869, "Strait of Malacca, Malaysia"),
        (6.2088, 106.8456, "Java Sea, Indonesia"),
        (28.6139, 77.2090, "Yamuna River, India"),
        (19.0760, 72.8777, "Arabian Sea, India"),
        (12.9716, 77.5946, "Vrishabhavathi River, India"),
        (37.5665, 126.9780, "Han River, South Korea"),
        (25.0330, 121.5654, "Tamsui River, Taiwan"),
        (21.3069, -157.8583, "Pacific Ocean, Hawaii"),
        (-33.8688, 151.2093, "Tasman Sea, Australia"),
        (-37.8136, 144.9631, "Port Phillip Bay, Australia"),
        (-27.4698, 153.0251, "Moreton Bay, Australia"),
        (-31.9505, 115.8605, "Indian Ocean, Australia"),
        (-41.2866, 174.7756, "Cook Strait, New Zealand"),
        (-36.8485, 174.7633, "Hauraki Gulf, New Zealand"),
        (-22.9068, -43.1729, "Guanabara Bay, Brazil"),
        (-23.5505, -46.6333, "Tietê River, Brazil"),
        (-34.6037, -58.3816, "Río de la Plata, Argentina"),
        (-33.4489, -70.6693, "Pacific Ocean, Chile"),
        (-12.0464, -77.0428, "Pacific Ocean, Peru"),
        (4.7110, -74.0721, "Magdalena River, Colombia"),
        (10.4806, -66.9036, "Caribbean Sea, Venezuela"),
        (-26.2041, 28.0473, "Vaal River, South Africa"),
        (-33.9249, 18.4241, "Atlantic Ocean, South Africa"),
        (30.0444, 31.2357, "Nile River, Egypt"),
        (6.5244, 3.3792, "Gulf of Guinea, Nigeria"),
        (-1.2921, 36.8219, "Indian Ocean, Kenya"),
        (9.0820, 8.6753, "Niger River, Nigeria"),
        (33.9716, -6.8498, "Atlantic Ocean, Morocco"),
        (36.7525, 3.0420, "Mediterranean Sea, Algeria"),
        (14.7179, -17.4677, "Atlantic Ocean, Senegal"),
        (25.2048, 55.2708, "Persian Gulf, UAE"),
        (24.7136, 46.6753, "Red Sea, Saudi Arabia"),
        (31.9539, 35.9106, "Dead Sea, Jordan"),
        (33.3152, 44.3661, "Tigris River, Iraq"),
        (35.6892, 51.3890, "Caspian Sea, Iran"),
        (32.0853, 34.7818, "Mediterranean Sea, Israel")
    ]
    
    # Get the dummy image once
    dummy_image_data = get_dummy_image()
    
    created_count = 0
    
    for i in range(num_entries):
        try:
            # Random location
            lat, lng, location_name = random.choice(locations)
            
            # Add some random variation to coordinates (within ~2km)
            lat += random.uniform(-0.02, 0.02)
            lng += random.uniform(-0.02, 0.02)
            
            # Random trash data
            trash_type = random.choice(trash_types)
            estimated_kg = round(random.uniform(0.1, 15.0), 1)
            sparcity = random.choice(sparcity_levels)
            cleanliness = random.choice(cleanliness_levels)
            
            # Use the same dummy image for all entries
            filename = f"worldwide_{trash_type}_{i+1}.jpg"
            
            # Save to database
            report_id = save_trash_report(
                latitude=lat,
                longitude=lng,
                image_data=dummy_image_data,  # Reuse the same image
                filename=filename,
                trash_type=trash_type,
                estimated_kg=estimated_kg,
                sparcity=sparcity,
                cleanliness=cleanliness
            )
            
            created_count += 1
            if created_count % 50 == 0:  # Progress every 50 entries
                print(f"✓ Created {created_count}/{num_entries} worldwide entries...")
            
        except Exception as e:
            print(f"✗ Error creating entry {i+1}: {e}")
    
    print(f"\n🎉 Successfully created {created_count} worldwide trash data points!")
    print(f"🌍 Data points distributed across 6 continents and 50+ countries")
    print(f"🗺️  Database location: data/trash_reports.db")
    print(f"📸 Images stored in: data/images/")

def view_database_stats():
    """Show statistics about the current database"""
    reports = get_all_trash_reports()
    
    if not reports:
        print("📊 Database is empty")
        return
    
    print(f"📊 Database Statistics:")
    print(f"   Total entries: {len(reports)}")
    
    # Count by trash type
    trash_counts = {}
    for report in reports:
        trash_type = report.get('trash_type', 'unknown')
        trash_counts[trash_type] = trash_counts.get(trash_type, 0) + 1
    
    print(f"   By trash type:")
    for trash_type, count in sorted(trash_counts.items(), key=lambda x: (x[0] is None, x[0] or '')):
        print(f"     {trash_type or 'unknown'}: {count}")
    
    # Show geographic distribution
    print(f"   Geographic distribution:")
    continents = {
        'North America': 0,
        'South America': 0,
        'Europe': 0,
        'Asia': 0,
        'Africa': 0,
        'Oceania': 0
    }
    
    for report in reports:
        lat = report.get('latitude', 0)
        lng = report.get('longitude', 0)
        
        if 15 <= lat <= 75 and -170 <= lng <= -50:
            continents['North America'] += 1
        elif -60 <= lat <= 15 and -90 <= lng <= -30:
            continents['South America'] += 1
        elif 35 <= lat <= 75 and -10 <= lng <= 40:
            continents['Europe'] += 1
        elif 5 <= lat <= 55 and 60 <= lng <= 150:
            continents['Asia'] += 1
        elif -40 <= lat <= 40 and -20 <= lng <= 60:
            continents['Africa'] += 1
        elif -50 <= lat <= -10 and 110 <= lng <= 180:
            continents['Oceania'] += 1
    
    for continent, count in continents.items():
        if count > 0:
            print(f"     {continent}: {count} points")

def main():
    """Main function to run the worldwide data generation"""
    print("🌍 Worldwide Trash Data Generator")
    print("=" * 50)
    
    # Show current stats
    print("\n📊 Current database status:")
    view_database_stats()
    
    # Ask for confirmation
    response = input("\n⚠️  This will CLEAR the database and create 500 new worldwide data points. Continue? (type 'yes' to confirm): ")
    if response.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    # Clear database
    clear_database()
    
    # Generate worldwide data
    generate_worldwide_data(500)
    
    # Show final stats
    print("\n📊 Final database status:")
    view_database_stats()
    
    print("\n✅ Worldwide data generation complete!")
    print("🌍 Your map now has 500 realistic trash data points from around the world!")

if __name__ == "__main__":
    main() 