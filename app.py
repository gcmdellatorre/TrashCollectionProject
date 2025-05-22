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
    fill_form: bool = Form(False),
    trash_type: str = Form(None),
    estimated_kg: float = Form(None),
    sparcity: str = Form(None),
    cleanliness: str = Form(None)
):
    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_FOLDER, file_id + "_" + file.filename)
    await save_file(file, file_path)

    # Extract metadata from file
    metadata = extract_metadata(file_path)

    # Handle optional form
    if fill_form:
        form_data = parse_optional_form(trash_type, estimated_kg, sparcity, cleanliness)
        metadata.update(form_data)

    # Save to DB
    save_to_db(metadata, file_path)

    return JSONResponse(content={"status": "success", "metadata": metadata})

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

