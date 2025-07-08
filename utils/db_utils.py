from sqlalchemy.orm import Session
from utils.database import TrashReport, get_db, create_tables
from utils.blob_storage import blob_service
from typing import List, Dict, Any
import json
import uuid
from datetime import datetime

def initialize_database():
    """Initialize database tables"""
    create_tables()

def save_trash_report(
    latitude: float,
    longitude: float,
    image_data: bytes,
    filename: str,
    trash_type: str = None,
    estimated_kg: float = None,
    sparcity: str = None,
    cleanliness: str = None,
    device_info: dict = None
) -> str:
    """
    Save trash report to database and blob storage
    Returns: report_id
    """
    try:
        # Upload image to blob storage
        blob_id = blob_service.upload_image(image_data, filename)
        
        # Save metadata to database
        db = next(get_db())
        
        # Ensure device_info is a dict and add source
        if device_info is None:
            device_info = {}
        device_info['source'] = 'manual'
        
        # Ensure all fields are present
        report = TrashReport(
            latitude=latitude,
            longitude=longitude,
            image_blob_id=blob_id,
            image_filename=filename,
            trash_type=trash_type if trash_type is not None else None,
            estimated_kg=estimated_kg if estimated_kg is not None else None,
            sparcity=sparcity if sparcity is not None else None,
            cleanliness=cleanliness if cleanliness is not None else None,
            device_info=json.dumps(device_info)
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        print(f"Saved trash report: {report.id}")
        return report.id
        
    except Exception as e:
        print(f"Error saving trash report: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def save_detected_trash_reports(
    detection_results: Dict,
    video_path: str,
    latitude: float,
    longitude: float,
    video_thumbnail_data: bytes = None
) -> List[str]:
    """
    Save detected trash items from video processing to database
    
    Args:
        detection_results: Results from trash detection processing
        video_path: Path to the original video file
        latitude: Latitude of the video location
        longitude: Longitude of the video location
        video_thumbnail_data: Optional thumbnail image data
    
    Returns:
        List of report IDs created
    """
    try:
        report_ids = []
        db = next(get_db())
        
        # Get trash detection data from results
        trash_objects_detected = detection_results.get('trash_objects_detected', 0)
        category_counts = detection_results.get('category_counts', {})
        simple_category_counts = detection_results.get('simple_category_counts', {})
        total_weight = detection_results.get('estimated_weight_kg', 0)
        
        if trash_objects_detected == 0 or not category_counts:
            print("No trash items detected in video")
            return []
        
        # Create a summary report for the video
        if video_thumbnail_data:
            # Save video thumbnail as main image
            thumbnail_filename = f"video_thumbnail_{detection_results.get('detection_id', str(uuid.uuid4()))}.jpg"
            blob_id = blob_service.upload_image(video_thumbnail_data, thumbnail_filename)
        else:
            # Use a placeholder or default image
            thumbnail_filename = "video_detection_placeholder.jpg"
            blob_id = "placeholder"
        
        # Create main video detection report
        main_report = TrashReport(
            latitude=latitude,
            longitude=longitude,
            image_blob_id=blob_id,
            image_filename=thumbnail_filename,
            trash_type="mixed",  # Use 'mixed' for main video report since it contains multiple types
            estimated_kg=total_weight,
            sparcity="detected",
            cleanliness="detected",
            device_info=json.dumps({
                'detection_id': detection_results.get('detection_id'),
                'model_used': detection_results.get('model_used'),
                'video_path': video_path,
                'total_objects': detection_results.get('total_objects_detected', 0),
                'trash_objects': detection_results.get('trash_objects_detected', 0),
                'granular_category_counts': category_counts,  # Store detailed categories
                'simple_category_counts': simple_category_counts,  # Store simple categories
                'detection_timestamp': detection_results.get('timestamp'),
                'source': 'video_detection'
            })
        )
        
        db.add(main_report)
        db.commit()
        db.refresh(main_report)
        report_ids.append(main_report.id)
        
        # Create individual reports for each simple trash category with significant counts
        for simple_category, count in simple_category_counts.items():
            if count > 0:
                # Calculate weight for this category using simple category weights
                weight_per_item = {
                    'plastic': 0.05,
                    'paper': 0.02,
                    'metal': 0.1,
                    'glass': 0.3,
                    'electronic': 0.5,
                    'organic': 0.03
                }
                category_weight = count * weight_per_item.get(simple_category, 0.03)
                
                # Create individual category report using simple category for database compatibility
                category_report = TrashReport(
                    latitude=latitude,
                    longitude=longitude,
                    image_blob_id=blob_id,  # Same thumbnail
                    image_filename=thumbnail_filename,
                    trash_type=simple_category,  # Use simple category for database compatibility
                    estimated_kg=round(category_weight, 2),
                    sparcity="detected",
                    cleanliness="detected",
                    device_info=json.dumps({
                        'detection_id': detection_results.get('detection_id'),
                        'granular_category': category_counts,  # Store granular categories in metadata
                        'simple_category': simple_category,
                        'count': count,
                        'model_used': detection_results.get('model_used'),
                        'video_path': video_path,
                        'source': 'video_detection_category'
                    })
                )
                
                db.add(category_report)
                db.commit()
                db.refresh(category_report)
                report_ids.append(category_report.id)
        
        print(f"Saved {len(report_ids)} detected trash reports from video")
        return report_ids
        
    except Exception as e:
        print(f"Error saving detected trash reports: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def get_all_trash_reports() -> List[Dict[Any, Any]]:
    """Get all trash reports"""
    try:
        db = next(get_db())
        reports = db.query(TrashReport).all()
        return [report.to_dict() for report in reports]
    except Exception as e:
        print(f"Error retrieving reports: {e}")
        return []
    finally:
        db.close()

def get_trash_report_by_id(report_id: str) -> Dict[Any, Any]:
    """Get specific trash report"""
    try:
        db = next(get_db())
        report = db.query(TrashReport).filter(TrashReport.id == report_id).first()
        return report.to_dict() if report else None
    except Exception as e:
        print(f"Error retrieving report: {e}")
        return None
    finally:
        db.close()

# Legacy compatibility functions
def get_all_entries():
    """Legacy function for compatibility"""
    return get_all_trash_reports()

def save_to_db(metadata, file_path):
    """Legacy function - convert to new format"""
    # This is for backward compatibility
    # You'll need to adapt this based on your current metadata structure
    pass