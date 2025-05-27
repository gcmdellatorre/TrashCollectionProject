from sqlalchemy.orm import Session
from utils.database import TrashReport, get_db, create_tables
from utils.blob_storage import blob_service
from typing import List, Dict, Any
import json

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
        
        report = TrashReport(
            latitude=latitude,
            longitude=longitude,
            image_blob_id=blob_id,
            image_filename=filename,
            trash_type=trash_type,
            estimated_kg=estimated_kg,
            sparcity=sparcity,
            cleanliness=cleanliness,
            device_info=json.dumps(device_info) if device_info else None
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