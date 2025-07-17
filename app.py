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
            await create_sample_data_internal(count=100)
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

@app.get("/video-upload", response_class=HTMLResponse)
async def video_upload_page():
    """Serve the video upload page"""
    with open("static/video-upload.html", "r") as file:
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

@app.post("/api/seed-worldwide-data")
async def seed_worldwide_data():
    """Seed database with worldwide trash data (500 points)"""
    try:
        # Import the worldwide data generator
        from generate_worldwide_data import generate_worldwide_trash_data
        
        # Generate 500 worldwide data points
        created_count = await generate_worldwide_trash_data()
        
        return JSONResponse(content={
            "status": "success",
            "message": f"Created {created_count} worldwide trash data points",
            "count": created_count
        })
        
    except Exception as e:
        print(f"Error seeding worldwide data: {e}")
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
        
        # Check if file is empty or null
        if not file_data or len(file_data) == 0:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "File is empty or null"}
            )
        
        # Convert estimated_kg to float, or None if empty/invalid
        final_estimated_kg = None
        if estimated_kg and estimated_kg.strip():
            try:
                final_estimated_kg = float(estimated_kg)
            except (ValueError, TypeError):
                pass  # Keep it as None if conversion fails

        # Extract metadata from image
        temp_path = f"temp_{uuid.uuid4()}"
        try:
            with open(temp_path, "wb") as temp_file:
                temp_file.write(file_data)
            
            metadata = extract_metadata(temp_path)
        except Exception as e:
            # If metadata extraction fails, use provided coordinates or defaults
            metadata = {}
            print(f"Metadata extraction failed: {e}")
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
        # Determine final coordinates
        try:
            final_latitude = float(latitude) if latitude else metadata.get('latitude')
            final_longitude = float(longitude) if longitude else metadata.get('longitude')
        except (ValueError, TypeError):
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Invalid coordinates provided. Please provide valid latitude and longitude values."}
            )

        # If no coordinates found, use default coordinates (for testing/demo purposes)
        if not final_latitude or not final_longitude:
            # Use a default location (San Francisco) if no coordinates are provided
            final_latitude = 37.7749
            final_longitude = -122.4194
            print("No GPS coordinates found or provided. Using default coordinates.")

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

@app.get("/report", response_class=HTMLResponse)
async def get_report():
    with open("static/report.html", "r") as file:
        return file.read()

@app.get("/user", response_class=HTMLResponse)
async def get_user():
    with open("static/user.html", "r") as file:
        return file.read()
    
@app.get("/api/trash-data")
async def get_trash_data():
    """
    Endpoint to get all trash reports from the database.
    """
    try:
        reports = get_all_trash_reports()
        return JSONResponse(content={"status": "success", "reports": reports})
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
        # Read file data
        file_data = await file.read()
        
        # Check if file is empty or null
        if not file_data or len(file_data) == 0:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "File is empty or null"}
            )
        
        # Save temporarily to extract GPS data
        temp_path = f"temp_{uuid.uuid4()}"
        try:
            with open(temp_path, "wb") as temp_file:
                temp_file.write(file_data)
            
            metadata = extract_metadata(temp_path)
        except Exception as e:
            # If metadata extraction fails, return no GPS
            metadata = {}
            print(f"Metadata extraction failed: {e}")
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
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

# ============================================================================
# VIDEO PROCESSING AND TRASH DETECTION ENDPOINTS
# ============================================================================

@app.post("/api/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    latitude: str = Form(None),
    longitude: str = Form(None),
    frame_interval: int = Form(60),
    confidence_threshold: float = Form(0.5),
    model_name: str = Form('yolov8n-taco')
):
    """
    Upload and process video for trash detection
    """
    try:
        # Validate file type
        if not file.content_type.startswith('video/'):
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "File must be a video"}
            )
        
        # Read video data
        video_data = await file.read()
        
        # Import video processing utilities
        from utils.video_utils import process_uploaded_video
        
        # Process video for trash detection
        detection_id, results = process_uploaded_video(
            video_data=video_data,
            filename=file.filename,
            frame_interval=frame_interval,
            confidence_threshold=confidence_threshold,
            model_name=model_name
        )
        
        # Prepare response
        response_data = {
            "detection_id": detection_id,
            "total_objects": results.get('total_objects_detected', 0),
            "estimated_weight_kg": results.get('estimated_weight_kg', 0),
            "category_counts": results.get('category_counts', {}),
            "processing_time": results.get('processing_time'),
            "timestamp": results.get('timestamp'),
            "video_info": {
                "original_filename": results.get('original_filename'),
                "file_size_mb": results.get('video_size_mb', 0),
                "total_frames_processed": results.get('total_frames_processed', 0)
            }
        }
        
        # If coordinates provided, save detected trash to database
        if latitude and longitude:
            try:
                # Create a thumbnail from first frame for the report
                from utils.video_utils import create_video_processor
                processor = create_video_processor()
                video_path = processor.base_storage_path / results.get('original_filename', 'video.mp4')
                
                thumbnail_data = None
                if video_path.exists():
                    # Extract first frame as thumbnail
                    import cv2
                    cap = cv2.VideoCapture(str(video_path))
                    ret, frame = cap.read()
                    if ret:
                        # Convert frame to bytes
                        import io
                        from PIL import Image
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        pil_image = Image.fromarray(frame_rgb)
                        img_bytes = io.BytesIO()
                        pil_image.save(img_bytes, format='JPEG')
                        thumbnail_data = img_bytes.getvalue()
                    cap.release()
                
                # Save detected trash reports to database
                from utils.db_utils import save_detected_trash_reports
                report_ids = save_detected_trash_reports(
                    detection_results=results,
                    video_path=str(video_path),
                    latitude=float(latitude),
                    longitude=float(longitude),
                    video_thumbnail_data=thumbnail_data
                )
                
                response_data["trash_report_ids"] = report_ids
                response_data["reports_created"] = len(report_ids)
                
            except Exception as e:
                print(f"Warning: Could not save detected trash reports: {e}")
                import traceback
                traceback.print_exc()
        
        return JSONResponse(content={
            "status": "success",
            "message": "Video processed successfully",
            "data": response_data
        })
        
    except Exception as e:
        import traceback
        print(f"Video processing error: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.post("/api/submit-video-report")
async def submit_video_report(
    video: UploadFile = File(...),
    latitude: str = Form(...),
    longitude: str = Form(...),
            model: str = Form('yolov8s'),
    detection_data: str = Form(None)
):
    """
    Submit a video report with AI detection results
    """
    try:
        # Validate file type
        if not video.content_type.startswith('video/'):
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "File must be a video"}
            )
        
        # Parse detection data if provided
        parsed_detection_data = None
        if detection_data:
            try:
                parsed_detection_data = json.loads(detection_data)
            except json.JSONDecodeError:
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": "Invalid detection data format"}
                )
        
        # Read video data
        video_data = await video.read()
        
        # Import video processing utilities
        from utils.video_utils import process_uploaded_video
        
        # Process video for trash detection
        detection_id, results = process_uploaded_video(
            video_data=video_data,
            filename=video.filename,
            model_name=model
        )
        
        # Create a thumbnail from first frame for the report
        from utils.video_utils import create_video_processor
        processor = create_video_processor()
        video_path = processor.base_storage_path / results.get('original_filename', 'video.mp4')
        
        thumbnail_data = None
        if video_path.exists():
            try:
                # Extract first frame as thumbnail
                import cv2
                cap = cv2.VideoCapture(str(video_path))
                ret, frame = cap.read()
                if ret:
                    # Convert frame to bytes
                    import io
                    from PIL import Image
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(frame_rgb)
                    img_bytes = io.BytesIO()
                    pil_image.save(img_bytes, format='JPEG')
                    thumbnail_data = img_bytes.getvalue()
                cap.release()
            except Exception as e:
                print(f"Warning: Could not create thumbnail: {e}")
        
        # Save detected trash reports to database
        from utils.db_utils import save_detected_trash_reports
        report_ids = save_detected_trash_reports(
            detection_results=results,
            video_path=str(video_path),
            latitude=float(latitude),
            longitude=float(longitude),
            video_thumbnail_data=thumbnail_data
        )
        
        # Get the first report ID for response
        report_id = report_ids[0] if report_ids else None
        
        return JSONResponse(content={
            "status": "success",
            "message": "Video report submitted successfully",
            "report_id": report_id,
            "reports_created": len(report_ids),
            "detection_id": detection_id
        })
        
    except Exception as e:
        import traceback
        print(f"Video report submission error: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/api/detection-results/{detection_id}")
async def get_detection_results(detection_id: str):
    """
    Get detailed results for a specific detection
    """
    try:
        from utils.video_utils import get_detection_summary
        
        summary = get_detection_summary(detection_id)
        if summary:
            return JSONResponse(content={
                "status": "success",
                "data": summary
            })
        else:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "Detection results not found"}
            )
            
    except Exception as e:
        print(f"Error retrieving detection results: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/api/detection-results")
async def list_detection_results():
    """
    List all available detection results
    """
    try:
        from utils.video_utils import create_video_processor
        
        processor = create_video_processor()
        results = processor.list_detection_results()
        
        return JSONResponse(content={
            "status": "success",
            "data": results
        })
        
    except Exception as e:
        print(f"Error listing detection results: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.get("/api/available-models")
async def get_available_models():
    """
    Get list of available trash detection models
    """
    try:
        from ml.trash_detection_v2 import create_trash_detector
        
        detector = create_trash_detector()
        models = detector.list_available_models()
        
        return JSONResponse(content={
            "status": "success",
            "data": models
        })
        
    except Exception as e:
        print(f"Error getting available models: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.post("/api/detect-photo")
async def detect_photo(
    file: UploadFile = File(...),
    latitude: str = Form(...),
    longitude: str = Form(...),
    model_name: str = Form("yolov8n"),
    confidence_threshold: float = Form(0.3)
):
    """
    Detect trash in a photo and save results to database
    """
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "File must be an image"}
            )
        
        # Save image temporarily
        temp_path = f"temp_photo_{uuid.uuid4()}.jpg"
        file_content = await file.read()
        with open(temp_path, "wb") as temp_file:
            temp_file.write(file_content)
        
        # Print temp file path and size for debugging
        import os
        print(f"[DEBUG] Saved uploaded image to: {temp_path}")
        print(f"[DEBUG] Uploaded image size: {os.path.getsize(temp_path)} bytes")
        
        # Process image with trash detection
        from ml.trash_detection_v2 import create_trash_detector
        detector = create_trash_detector(model_name)
        
        # Print model info and environment for debugging
        print(f"[DEBUG] Model file: {detector.model_config['filename']}")
        print(f"[DEBUG] Model name: {detector.model_config['name']}")
        print(f"[DEBUG] Model description: {detector.model_config['description']}")
        import sys
        import torch
        import ultralytics
        print(f"[DEBUG] Python version: {sys.version}")
        print(f"[DEBUG] torch version: {torch.__version__}")
        print(f"[DEBUG] ultralytics version: {ultralytics.__version__}")

        print(f"[DEBUG] /api/detect-photo: confidence_threshold={confidence_threshold}")
        results = detector.detect_trash_in_image(temp_path, confidence_threshold)
        print(f"[DEBUG] /api/detect-photo: all_detections={results.get('all_detections')}")
        print(f"[DEBUG] /api/detect-photo: trash_detections={results.get('trash_detections')}")
        
        # DO NOT DELETE temp file (for debugging)
        # os.remove(temp_path)
        
        # Save results to database
        from utils.db_utils import save_trash_report
        
        # Create a summary of detected items
        detected_items = []
        total_confidence = 0
        if results and "trash_detections" in results:
            for detection in results["trash_detections"]:
                detected_items.append({
                    "class": detection.get("class_name", "unknown"),
                    "confidence": detection.get("confidence", 0),
                    "bbox": detection.get("bbox", [])
                })
                total_confidence += detection.get("confidence", 0)
        
        # Determine trash type from detections
        trash_type = "mixed"
        if detected_items:
            # Get the most confident detection
            best_detection = max(detected_items, key=lambda x: x["confidence"])
            class_name = best_detection["class"].lower()
            
            # Map detection classes to trash types
            if any(word in class_name for word in ["bottle", "can", "plastic"]):
                trash_type = "plastic"
            elif any(word in class_name for word in ["paper", "cardboard", "newspaper"]):
                trash_type = "paper"
            elif any(word in class_name for word in ["metal", "can", "aluminum"]):
                trash_type = "metal"
            elif any(word in class_name for word in ["glass", "bottle"]):
                trash_type = "glass"
            elif any(word in class_name for word in ["food", "organic", "fruit"]):
                trash_type = "organic"
            elif any(word in class_name for word in ["phone", "electronic", "device"]):
                trash_type = "electronic"
        
        # Estimate weight based on number of detections
        estimated_kg = min(len(detected_items) * 0.5, 10.0)  # 0.5kg per item, max 10kg
        
        # Determine sparcity based on number of detections
        if len(detected_items) <= 2:
            sparcity = "low"
        elif len(detected_items) <= 5:
            sparcity = "medium"
        else:
            sparcity = "high"
        
        # Determine cleanliness based on average confidence
        avg_confidence = total_confidence / len(detected_items) if detected_items else 0
        if avg_confidence > 0.8:
            cleanliness = "good"
        elif avg_confidence > 0.6:
            cleanliness = "moderate"
        elif avg_confidence > 0.4:
            cleanliness = "poor"
        else:
            cleanliness = "very_poor"
        
        # Save to database
        report_id = save_trash_report(
            latitude=float(latitude),
            longitude=float(longitude),
            image_data=file_content,
            filename=file.filename,
            trash_type=trash_type,
            estimated_kg=estimated_kg,
            sparcity=sparcity,
            cleanliness=cleanliness
        )
        
        return JSONResponse(content={
            "status": "success",
            "message": "Photo detection completed successfully",
            "report_id": report_id,
            "detections": detected_items,
            "summary": {
                "trash_type": trash_type,
                "estimated_kg": estimated_kg,
                "sparcity": sparcity,
                "cleanliness": cleanliness,
                "total_detections": len(detected_items)
            }
        })
        
    except Exception as e:
        import traceback
        print(f"Photo detection error: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.post("/api/process-image")
async def process_image(
    file: UploadFile = File(...),
    confidence_threshold: float = Form(0.3)
):
    """
    Process a single image for trash detection
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "File must be an image"}
            )
        
        # Save image temporarily
        temp_path = f"temp_image_{uuid.uuid4()}.jpg"
        with open(temp_path, "wb") as temp_file:
            temp_file.write(await file.read())
        
        # Process image
        from ml.trash_detection_v2 import create_trash_detector
        detector = create_trash_detector()
        
        results = detector.detect_trash_in_image(temp_path, confidence_threshold)
        
        # Clean up
        os.remove(temp_path)
        
        return JSONResponse(content={
            "status": "success",
            "data": results
        })
        
    except Exception as e:
        print(f"Image processing error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.delete("/api/detection-results/{detection_id}")
async def delete_detection_results(detection_id: str):
    """
    Delete detection results and associated video
    """
    try:
        from utils.video_utils import create_video_processor
        
        processor = create_video_processor()
        results = processor.get_detection_results(detection_id)
        
        if not results:
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "Detection results not found"}
            )
        
        # Delete results file
        for results_file in processor.results_path.glob(f"detection_{detection_id}_*.json"):
            results_file.unlink()
        
        # Delete associated video if it exists
        video_path = results.get('video_path')
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
        
        return JSONResponse(content={
            "status": "success",
            "message": "Detection results deleted successfully"
        })
        
    except Exception as e:
        print(f"Error deleting detection results: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
        
if __name__ == "__main__":
    import os
    
    # Get port from environment variable or default to 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Get host from environment variable (for Render deployment)
    host = os.environ.get("RENDER_HOST", "0.0.0.0")

    print(f"Starting server at {host}:{port}")
    
    uvicorn.run("app:app", host=host, port=port, reload=True)

