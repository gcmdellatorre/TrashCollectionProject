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

@app.get("/", response_class=HTMLResponse)
async def home():
    with open("static/index.html", "r") as file:
        return file.read()

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
async def find_dirty_places(
    lat: float = None,
    lng: float = None,
    address: str = None,
    limit: int = 5,
    max_distance: float = 50.0
):
    """Find closest dirty places to a location"""
    try:
        # Get coordinates
        if address and not (lat and lng):
            coords = geocode_location(address)
            if coords:
                lat, lng = coords
            else:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Could not find coordinates for the given address"}
                )
        
        if not (lat and lng):
            return JSONResponse(
                status_code=400,
                content={"error": "Please provide either lat/lng or address"}
            )
        
        # Find dirty places
        dirty_places = find_closest_dirty_places(lat, lng, limit, max_distance)
        
        # Get location summary
        summary = get_location_summary(lat, lng)
        
        return JSONResponse(content={
            "search_location": {"lat": lat, "lng": lng},
            "summary": summary,
            "dirty_places": dirty_places
        })
        
    except Exception as e:
        print(f"Error finding dirty places: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
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
    uvicorn.run(app, host="0.0.0.0", port=8000)

