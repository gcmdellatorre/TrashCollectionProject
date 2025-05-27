import random
from datetime import datetime, timedelta
from utils.db_utils import save_trash_report, initialize_database
from PIL import Image
import io
import os

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

def generate_test_data(num_entries: int = 50):
    """Generate test data and save to database"""
    
    # Initialize database
    initialize_database()
    print(f"Creating {num_entries} test entries...")
    
    # Define possible values
    trash_types = ['plastic', 'paper', 'metal', 'glass', 'organic', 'electronic', 'mixed']
    sparcity_levels = ['low', 'medium', 'high']
    cleanliness_levels = ['good', 'moderate', 'poor', 'very_poor']
    
    # Define some interesting locations around the world
    locations = [
        # Major cities
        (40.7128, -74.0060, "New York"),
        (51.5074, -0.1278, "London"), 
        (48.8566, 2.3522, "Paris"),
        (35.6762, 139.6503, "Tokyo"),
        (-33.8688, 151.2093, "Sydney"),
        (37.7749, -122.4194, "San Francisco"),
        (52.5200, 13.4050, "Berlin"),
        (55.7558, 37.6176, "Moscow"),
        (-22.9068, -43.1729, "Rio de Janeiro"),
        (19.4326, -99.1332, "Mexico City"),
        
        # Coastal areas (more trash)
        (25.7617, -80.1918, "Miami Beach"),
        (36.1627, -86.7816, "Nashville"),
        (34.0522, -118.2437, "Los Angeles"),
        (41.9028, 12.4964, "Rome"),
        (39.9042, 116.4074, "Beijing"),
        
        # Random locations
        (45.4215, -75.6972, "Ottawa"),
        (59.9139, 10.7522, "Oslo"),
        (41.3851, 2.1734, "Barcelona"),
        (-37.8136, 144.9631, "Melbourne"),
        (1.3521, 103.8198, "Singapore")
    ]
    
    # Get the dummy image once
    dummy_image_data = get_dummy_image()
    
    created_count = 0
    
    for i in range(num_entries):
        try:
            # Random location
            lat, lng, location_name = random.choice(locations)
            
            # Add some random variation to coordinates (within ~1km)
            lat += random.uniform(-0.01, 0.01)
            lng += random.uniform(-0.01, 0.01)
            
            # Random trash data
            trash_type = random.choice(trash_types)
            estimated_kg = round(random.uniform(0.1, 10.0), 1)
            sparcity = random.choice(sparcity_levels)
            cleanliness = random.choice(cleanliness_levels)
            
            # Use the same dummy image for all entries
            filename = f"test_{trash_type}_{i+1}.jpg"
            
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
            if created_count % 10 == 0:  # Progress every 10 entries
                print(f"✓ Created {created_count}/{num_entries} entries...")
            
        except Exception as e:
            print(f"✗ Error creating entry {i+1}: {e}")
    
    print(f"\n🎉 Successfully created {created_count} test entries!")
    print(f"Database location: data/trash_reports.db")
    print(f"Images stored in: data/images/")

def clear_database():
    """Clear all data from database (use with caution!)"""
    from utils.database import SessionLocal, TrashReport
    
    response = input("⚠️  This will delete ALL data from the database. Are you sure? (type 'yes' to confirm): ")
    if response.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    db = SessionLocal()
    try:
        deleted_count = db.query(TrashReport).count()
        db.query(TrashReport).delete()
        db.commit()
        print(f"🗑️  Deleted {deleted_count} entries from database")
        
        # Also clean up image files
        import shutil
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

def view_database_stats():
    """Show statistics about the current database"""
    from utils.db_utils import get_all_trash_reports
    
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
    for trash_type, count in sorted(trash_counts.items()):
        print(f"     {trash_type}: {count}")
    
    # Show date range
    timestamps = [report.get('timestamp') for report in reports if report.get('timestamp')]
    if timestamps:
        timestamps.sort()
        print(f"   Date range: {timestamps[0]} to {timestamps[-1]}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "create":
            num_entries = int(sys.argv[2]) if len(sys.argv) > 2 else 50
            generate_test_data(num_entries)
            
        elif command == "clear":
            clear_database()
            
        elif command == "stats":
            view_database_stats()
            
        else:
            print("Unknown command. Use: create, clear, or stats")
    else:
        print("🗂️  Trash Dataset Manager")
        print("Usage:")
        print("  python create_trash_dataset.py create [number]  # Create test data (default: 50)")
        print("  python create_trash_dataset.py clear           # Clear all data")
        print("  python create_trash_dataset.py stats           # Show database stats")
        print()
        
        # Show current stats
        view_database_stats()