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
from utils.db_utils import save_to_db, get_all_entries
from forms.report_form import parse_optional_form
import time

app = FastAPI()

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
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        
        # Save the uploaded file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        print(f"File saved to: {file_path}")
        
        # Extract metadata from image
        metadata = extract_metadata(file_path)
        print(f"Extracted metadata: {metadata}")
        
        # If no GPS in image but we have form data, use form coordinates
        if ('latitude' not in metadata or 'longitude' not in metadata) and latitude and longitude:
            print(f"Using form coordinates: lat={latitude}, lng={longitude}")
            metadata['latitude'] = latitude
            metadata['longitude'] = longitude
        
        # Add timestamp if not present
        if 'timestamp' not in metadata:
            metadata['timestamp'] = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())
        
        # Add file path
        metadata['file_path'] = file_path
        
        # Handle manual form data if provided
        if fill_form == 'true':
            print("Processing manual form data")
            form_data = parse_optional_form(trash_type, estimated_kg, sparcity, cleanliness)
            metadata.update(form_data)
            print(f"Added form data: {form_data}")
        
        # Save to database
        save_to_db(metadata, file_path)
        
        print(f"Final metadata saved: {metadata}")
        
        return JSONResponse(content={
            "status": "success", 
            "message": "File uploaded successfully",
            "metadata": metadata
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
    # Create metadata with location and timestamp
    import time
    metadata = {
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": timestamp or time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime()),
        "file_path": "test_data_entry"  # No actual file
    }
    
    # Handle form data
    form_data = parse_optional_form(trash_type, estimated_kg, sparcity, cleanliness)
    metadata.update(form_data)
    
    # Save to DB
    save_to_db(metadata, "test_data_entry")
    
    return JSONResponse(content={"status": "success", "metadata": metadata})

@app.get("/map", response_class=HTMLResponse)
async def get_map():
    from utils.map_utils import generate_map
    map_html = generate_map()
    return map_html

@app.get("/api/trash-data")
async def get_trash_data():
    entries = get_all_entries()
    return JSONResponse(content=entries)

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

