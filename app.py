# app.py
from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
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
from utils.blob_storage import blob_service
import httpx

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
            await create_sample_data_internal(count=25)
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

@app.get("/api/search-location")
async def search_location_proxy(q: str):
    """Proxy for Nominatim search to avoid CORS issues."""
    nominatim_url = f"https://nominatim.openstreetmap.org/search"
    params = {
        "q": q,
        "format": "json",
        "limit": 1
    }
    headers = {
        "User-Agent": "MamaLand Trash Collection App/1.0"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(nominatim_url, params=params, headers=headers)
            response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes
            return JSONResponse(content=response.json())
        except httpx.HTTPStatusError as e:
            # Forward the status code and detail from Nominatim's error
            raise HTTPException(status_code=e.response.status_code, detail=f"Error from Nominatim: {e.response.text}")
        except httpx.RequestError as e:
            # Handle network errors
            raise HTTPException(status_code=503, detail=f"Service unavailable: Could not connect to Nominatim. {e}")

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
    latitude: str = Form(None),
    longitude: str = Form(None),
    trash_type: str = Form(None),
    estimated_kg: str = Form(None),  # Accept as string
    sparcity: str = Form(None),
    cleanliness: str = Form(None)
):
    try:
        # Read file data
        file_data = await file.read()
        
        # Convert estimated_kg to float, or None if empty/invalid
        final_estimated_kg = None
        if estimated_kg and estimated_kg.strip():
            try:
                final_estimated_kg = float(estimated_kg)
            except (ValueError, TypeError):
                pass  # Keep it as None if conversion fails

        # Extract metadata from image
        temp_path = f"temp_{uuid.uuid4()}"
        with open(temp_path, "wb") as temp_file:
            temp_file.write(file_data)
        
        metadata = extract_metadata(temp_path)
        os.remove(temp_path)
        
        # Determine final coordinates
        final_latitude = float(latitude) if latitude else metadata.get('latitude')
        final_longitude = float(longitude) if longitude else metadata.get('longitude')

        if not final_latitude or not final_longitude:
            raise ValueError("No GPS coordinates found or provided.")

        # Save to database
        report_id = save_trash_report(
            latitude=final_latitude,
            longitude=final_longitude,
            image_data=file_data,
            filename=file.filename,
            trash_type=trash_type if trash_type else None,
            estimated_kg=final_estimated_kg,
            sparcity=sparcity if sparcity else None,
            cleanliness=cleanliness if cleanliness else None
        )
        
        print(f"Saved trash report with ID: {report_id}")
        
        # Prepare metadata for response, ensuring kg is a number or null
        response_metadata = {
            "latitude": final_latitude,
            "longitude": final_longitude,
            "trash_type": trash_type,
            "estimated_kg": final_estimated_kg,
            "sparcity": sparcity,
            "cleanliness": cleanliness
        }
        
        return JSONResponse(content={
            "status": "success", 
            "message": "File uploaded successfully",
            "report_id": report_id,
            "metadata": response_metadata
        })
        
    except Exception as e:
        import traceback
        print(f"Upload error: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.post("/test-data")
async def add_test_data(
    latitude: str = Form(...),
    longitude: str = Form(...),
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
            latitude=float(latitude),
            longitude=float(longitude),
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
                "latitude": float(latitude),
                "longitude": float(longitude),
                **form_data
            }
        })
        
    except Exception as e:
        print(f"Error creating test data: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/map", response_class=HTMLResponse)
async def get_map():
    with open("static/map.html", "r") as file:
        return file.read()
    
@app.get("/api/trash-data")
async def get_trash_data():
    """
    Endpoint to get all trash reports from the database.
    """
    try:
        reports = get_all_trash_reports()
        return JSONResponse(content={"status": "success", "data": reports})
    except Exception as e:
        print(f"Error fetching trash data: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Could not retrieve trash data"}
        )

@app.post("/api/check-coordinates")
async def check_coordinates(file: UploadFile = File(...)):
    """
    Endpoint to check if an image has GPS coordinates.
    """
    try:
        # Save temporarily to extract GPS data
        temp_path = f"temp_{uuid.uuid4()}"
        with open(temp_path, "wb") as temp_file:
            temp_file.write(await file.read())
        
        metadata = extract_metadata(temp_path)
        os.remove(temp_path)

        has_gps = 'latitude' in metadata and 'longitude' in metadata
        
        return JSONResponse(content={
            "status": "success",
            "has_gps": has_gps,
            "coordinates": {
                "latitude": metadata.get('latitude'),
                "longitude": metadata.get('longitude')
            }
        })

    except Exception as e:
        print(f"Error checking coordinates: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/api/image/{blob_id}")
async def get_image(blob_id: str, thumbnail: bool = False):
    """
    Retrieve an image from Azure Blob Storage.
    If 'thumbnail' is true, it returns a smaller version of the image.
    """
    try:
        image_data, mime_type = blob_service.get_blob(blob_id, thumbnail=thumbnail)
        return HTMLResponse(content=image_data, media_type=mime_type)
    except Exception as e:
        return JSONResponse(status_code=404, content={"message": str(e)})

@app.get("/api/find-dirty-places")
async def find_dirty_places_endpoint(
    lat: float,
    lng: float,
    limit: int = 5,
    max_distance: float = 25  # This should be the radius parameter
):
    try:
        dirty_places = find_closest_dirty_places(lat, lng, limit=limit, max_distance_km=max_distance)
        return JSONResponse(content={"status": "success", "dirty_places": dirty_places})
    except Exception as e:
        print(f"Error finding dirty places: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Error finding dirty places: {str(e)}"}
        )

@app.get("/api/location-summary")
async def location_summary(lat: float, lng: float, radius: float = 5.0):
    summary = get_location_summary(lat, lng, radius)
    return JSONResponse(content=summary)

@app.get("/api/geocode")
async def geocode(q: str):
    """Geocode a location string into coordinates."""
    try:
        result = geocode_location(q)
        if result:
            return JSONResponse(content={"status": "success", "data": result})
        else:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Location not found"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
        
if __name__ == "__main__":
    import os
    
    # Get port from environment variable or default to 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Get host from environment variable (for Render deployment)
    host = os.environ.get("RENDER_HOST", "0.0.0.0")

    print(f"Starting server at {host}:{port}")
    
    uvicorn.run("app:app", host=host, port=port, reload=True)

