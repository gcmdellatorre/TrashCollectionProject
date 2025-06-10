# app.py
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import uuid
import json
from utils.geo_utils import extract_metadata
from utils.file_utils import save_file
from utils.db_utils import save_trash_report, get_all_trash_reports, initialize_database
from forms.report_form import parse_optional_form
import time
from contextlib import asynccontextmanager
from utils.geo_functions import find_closest_dirty_places, get_location_summary, geocode_location

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    initialize_database()
    print("Database initialized")
    
    # Auto-seed with sample data if database is empty (good for demos)
    try:
        reports = get_all_trash_reports()
        if len(reports) == 0:
            print("Database is empty - creating sample data for demo...")
            await create_sample_data_internal(count=10)
            print("✅ Sample data created successfully!")
        else:
            print(f"Database already has {len(reports)} reports - skipping auto-seed")
    except Exception as e:
        print(f"⚠️ Auto-seeding failed (app will continue): {e}")
        # Don't crash the app if seeding fails
    
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

UPLOAD_FOLDER = "data/images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

async def create_sample_data_internal(count: int = 20):
    """Internal function to create sample data (used by startup and API)"""
    import random
    from PIL import Image
    import io
    
    # Create a minimal dummy image
    dummy_image = Image.new('RGB', (1, 1), color='white')
    img_bytes = io.BytesIO()
    dummy_image.save(img_bytes, format='JPEG')
    dummy_image_data = img_bytes.getvalue()
    
    # Sample data
    trash_types = ['plastic', 'paper', 'metal', 'glass', 'organic', 'electronic']
    sparcity_levels = ['low', 'medium', 'high']
    cleanliness_levels = ['good', 'moderate', 'poor', 'very_poor']
    
    # Interesting locations around the world
    locations = [
        (40.7128, -74.0060, "New York"),
        (51.5074, -0.1278, "London"), 
        (48.8566, 2.3522, "Paris"),
        (35.6762, 139.6503, "Tokyo"),
        (-33.8688, 151.2093, "Sydney"),
        (37.7749, -122.4194, "San Francisco"),
        (52.5200, 13.4050, "Berlin"),
        (25.7617, -80.1918, "Miami Beach"),
        (34.0522, -118.2437, "Los Angeles"),
        (41.9028, 12.4964, "Rome")
    ]
    
    created_count = 0
    
    for i in range(count):
        # Random location with slight variation
        lat, lng, location_name = random.choice(locations)
        lat += random.uniform(-0.01, 0.01)  # ~1km variation
        lng += random.uniform(-0.01, 0.01)
        
        # Random trash data
        trash_type = random.choice(trash_types)
        estimated_kg = round(random.uniform(0.1, 10.0), 1)
        sparcity = random.choice(sparcity_levels)
        cleanliness = random.choice(cleanliness_levels)
        
        # Save to database
        report_id = save_trash_report(
            latitude=lat,
            longitude=lng,
            image_data=dummy_image_data,
            filename=f"sample_{trash_type}_{i+1}.jpg",
            trash_type=trash_type,
            estimated_kg=estimated_kg,
            sparcity=sparcity,
            cleanliness=cleanliness
        )
        
        created_count += 1
    
    return created_count

@app.get("/", response_class=HTMLResponse)
async def home():
    with open("static/index.html", "r") as file:
        return file.read()

@app.post("/api/seed-database")
async def seed_database(count: int = 20):
    """Create sample test data for the production database"""
    try:
        created_count = await create_sample_data_internal(count)
        
        return JSONResponse(content={
            "status": "success",
            "message": f"Created {created_count} sample trash reports",
            "count": created_count
        })
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    latitude: float = Form(None),
    longitude: float = Form(None),
    fill_form: str = Form(None),
    trash_type: str = Form(None),
    estimated_kg: float = Form(None),
    sparcity: str = Form(None),
    cleanliness: str = Form(None)
):
    try:
        # Read file data
        file_data = await file.read()
        
        print(f"Processing file: {file.filename}")
        
        # Extract metadata from image
        # Save temporarily to extract GPS data
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as temp_file:
            temp_file.write(file_data)
        
        metadata = extract_metadata(temp_path)
        os.remove(temp_path)  # Clean up temp file
        
        print(f"Extracted metadata: {metadata}")
        
        # Use form coordinates if no GPS in image
        if ('latitude' not in metadata or 'longitude' not in metadata):
            if latitude and longitude:
                print(f"Using form coordinates: lat={latitude}, lng={longitude}")
                final_latitude = latitude
                final_longitude = longitude
            else:
                raise ValueError("No GPS coordinates found in image and none provided in form")
        else:
            final_latitude = metadata['latitude']
            final_longitude = metadata['longitude']
        
        # Handle manual form data if provided
        form_data = {}
        if fill_form == 'true':
            print("Processing manual form data")
            form_data = parse_optional_form(trash_type, estimated_kg, sparcity, cleanliness)
            print(f"Form data: {form_data}")
        
        # Save to new database system
        report_id = save_trash_report(
            latitude=final_latitude,
            longitude=final_longitude,
            image_data=file_data,
            filename=file.filename,
            trash_type=form_data.get('trash_type'),
            estimated_kg=form_data.get('estimated_kg'),
            sparcity=form_data.get('sparcity'),
            cleanliness=form_data.get('cleanliness')
        )
        
        print(f"Saved trash report with ID: {report_id}")
        
        return JSONResponse(content={
            "status": "success", 
            "message": "File uploaded successfully",
            "report_id": report_id,
            "metadata": {
                "latitude": final_latitude,
                "longitude": final_longitude,
                **form_data
            }
        })
        
    except Exception as e:
        print(f"Upload error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.post("/test-data")
async def add_test_data(
    latitude: float = Form(...),
    longitude: float = Form(...),
    timestamp: str = Form(None),
    trash_type: str = Form(None),
    estimated_kg: float = Form(None),
    sparcity: str = Form(None),
    cleanliness: str = Form(None)
):
    try:
        # Handle form data
        form_data = parse_optional_form(trash_type, estimated_kg, sparcity, cleanliness)
        
        # Create a dummy image for test data (1x1 pixel)
        from PIL import Image
        import io
        dummy_image = Image.new('RGB', (1, 1), color='white')
        img_bytes = io.BytesIO()
        dummy_image.save(img_bytes, format='JPEG')
        dummy_image_data = img_bytes.getvalue()
        
        # Save to new database system
        report_id = save_trash_report(
            latitude=latitude,
            longitude=longitude,
            image_data=dummy_image_data,
            filename="test_data.jpg",
            trash_type=form_data.get('trash_type'),
            estimated_kg=form_data.get('estimated_kg'),
            sparcity=form_data.get('sparcity'),
            cleanliness=form_data.get('cleanliness')
        )
        
        return JSONResponse(content={
            "status": "success", 
            "report_id": report_id,
            "metadata": {
                "latitude": latitude,
                "longitude": longitude,
                **form_data
            }
        })
        
    except Exception as e:
        print(f"Test data error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/map", response_class=HTMLResponse)
async def get_map():
    from utils.map_utils import generate_map
    map_html = generate_map()
    return map_html

@app.get("/api/trash-data")
async def get_trash_data():
    try:
        reports = get_all_trash_reports()
        # Convert to format expected by frontend
        entries = []
        for report in reports:
            entry = {
                "latitude": report["latitude"],
                "longitude": report["longitude"],
                "timestamp": report["timestamp"],
                "file_path": f"blob:{report['image_blob_id']}",  # Indicate it's a blob reference
                "trash_type": report.get("trash_type"),
                "estimated_kg": report.get("estimated_kg"),
                "sparcity": report.get("sparcity"),
                "cleanliness": report.get("cleanliness")
            }
            entries.append(entry)
        
        return JSONResponse(content=entries)
    except Exception as e:
        print(f"Error getting trash data: {e}")
        return JSONResponse(content=[])

@app.post("/api/check-coordinates")
async def check_coordinates(file: UploadFile = File(...)):
    """Check if uploaded image has GPS coordinates"""
    try:
        # Save file temporarily
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Extract metadata
        metadata = extract_metadata(temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        # Check if coordinates exist
        has_coordinates = 'latitude' in metadata and 'longitude' in metadata
        
        response = {
            "has_coordinates": has_coordinates
        }
        
        if has_coordinates:
            response["latitude"] = metadata["latitude"]
            response["longitude"] = metadata["longitude"]
        
        return JSONResponse(content=response)
        
    except Exception as e:
        print(f"Error checking coordinates: {e}")
        return JSONResponse(content={"has_coordinates": False})

# Add endpoint to serve images from blob storage
@app.get("/api/image/{blob_id}")
async def get_image(blob_id: str, thumbnail: bool = False):
    """Serve images from blob storage"""
    try:
        from utils.blob_storage import blob_service
        image_data = blob_service.get_image(blob_id, thumbnail=thumbnail)
        
        from fastapi.responses import Response
        return Response(
            content=image_data,
            media_type="image/jpeg",
            headers={"Cache-Control": "max-age=3600"}
        )
    except Exception as e:
        print(f"Error serving image: {e}")
        return JSONResponse(
            status_code=404,
            content={"error": "Image not found"}
        )

@app.get("/api/find-dirty-places")
async def find_dirty_places_endpoint(
    lat: float,
    lng: float,
    limit: int = 5,
    max_distance: float = 25  # This should be the radius parameter
):
    """Find closest dirty places to a location"""
    try:
        result = find_closest_dirty_places(lat, lng, limit, max_distance)
        return JSONResponse(content=result)
    except Exception as e:
        print(f"Error finding dirty places: {e}")
        return JSONResponse(
            content={"error": "Failed to find dirty places"}, 
            status_code=500
        )

@app.get("/api/location-summary")
async def location_summary(lat: float, lng: float, radius: float = 5.0):
    """Get summary of trash situation around a location"""
    try:
        summary = get_location_summary(lat, lng, radius)
        return JSONResponse(content=summary)
    except Exception as e:
        print(f"Error getting location summary: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

