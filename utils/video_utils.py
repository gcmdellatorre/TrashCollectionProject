"""
Video utilities for trash detection system
Handles video upload, storage, and processing integration
"""

import os
import uuid
import json
import tempfile
from typing import Dict, Optional, Tuple
from pathlib import Path
import logging
from datetime import datetime
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoProcessor:
    """Handles video processing and storage for trash detection"""
    
    def __init__(self, base_storage_path: str = "data/videos"):
        """
        Initialize video processor
        
        Args:
            base_storage_path: Base directory for video storage
        """
        self.base_storage_path = Path(base_storage_path)
        self.results_path = Path("data/detection_results")
        
        # Create necessary directories
        self.base_storage_path.mkdir(parents=True, exist_ok=True)
        self.results_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Video processor initialized with storage path: {self.base_storage_path}")
    
    def save_uploaded_video(self, video_data: bytes, filename: str) -> str:
        """
        Save uploaded video to storage
        
        Args:
            video_data: Raw video data
            filename: Original filename
            
        Returns:
            Path to saved video file
        """
        try:
            # Generate unique filename
            file_ext = Path(filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            video_path = self.base_storage_path / unique_filename
            
            # Save video
            with open(video_path, 'wb') as f:
                f.write(video_data)
            
            logger.info(f"Video saved: {video_path}")
            return str(video_path)
            
        except Exception as e:
            logger.error(f"Error saving video: {e}")
            raise
    
    def process_video_for_detection(self, video_path: str, 
                                  frame_interval: int = 30,
                                  confidence_threshold: float = 0.3,
                                  model_name: str = 'yolov8n-coco') -> Dict:
        """
        Process video using enhanced trash detection
        
        Args:
            video_path: Path to video file
            frame_interval: Extract every Nth frame
            confidence_threshold: Minimum confidence for detections
            model_name: Name of the model to use ('yolov8n-smart', 'yolov8s-smart', 'yolov8m-smart')
            
        Returns:
            Detection results dictionary
        """
        try:
            # Import here to avoid circular imports
            from ml.trash_detection_v2 import process_video_with_trash_detection
            
            logger.info(f"Processing video for detection: {video_path}")
            
            # Process video with smart trash detection
            results = process_video_with_trash_detection(
                video_path=video_path,
                model_name=model_name,
                frame_interval=frame_interval,
                confidence_threshold=confidence_threshold
            )
            
            # Add metadata
            results['original_filename'] = Path(video_path).name
            results['video_size_mb'] = self._get_file_size_mb(video_path)
            
            return results
            
        except Exception as e:
            logger.error(f"Error processing video for detection: {e}")
            raise
    
    def save_detection_results(self, results: Dict, detection_id: Optional[str] = None) -> str:
        """
        Save detection results to JSON file
        
        Args:
            results: Detection results dictionary
            detection_id: Optional custom detection ID
            
        Returns:
            Path to saved results file
        """
        try:
            # Use provided ID or generate one
            if not detection_id:
                detection_id = results.get('detection_id', str(uuid.uuid4()))
            
            # Create filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            results_filename = f"detection_{detection_id}_{timestamp}.json"
            results_path = self.results_path / results_filename
            
            # Save results
            with open(results_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"Detection results saved: {results_path}")
            return str(results_path)
            
        except Exception as e:
            logger.error(f"Error saving detection results: {e}")
            raise
    
    def get_detection_results(self, detection_id: str) -> Optional[Dict]:
        """
        Retrieve detection results by ID
        
        Args:
            detection_id: Detection ID to retrieve
            
        Returns:
            Detection results dictionary or None if not found
        """
        try:
            # Search for results file
            for results_file in self.results_path.glob(f"detection_{detection_id}_*.json"):
                with open(results_file, 'r') as f:
                    return json.load(f)
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving detection results: {e}")
            return None
    
    def list_detection_results(self) -> list:
        """
        List all available detection results
        
        Returns:
            List of detection result files
        """
        try:
            results = []
            for results_file in self.results_path.glob("detection_*.json"):
                try:
                    with open(results_file, 'r') as f:
                        data = json.load(f)
                        results.append({
                            'file_path': str(results_file),
                            'detection_id': data.get('detection_id'),
                            'timestamp': data.get('timestamp'),
                            'total_objects': data.get('total_objects_detected', 0),
                            'estimated_weight': data.get('estimated_weight_kg', 0),
                            'video_path': data.get('video_path')
                        })
                except Exception as e:
                    logger.warning(f"Error reading results file {results_file}: {e}")
                    continue
            
            # Sort by timestamp (newest first)
            results.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return results
            
        except Exception as e:
            logger.error(f"Error listing detection results: {e}")
            return []
    
    def cleanup_old_videos(self, max_age_days: int = 7):
        """
        Clean up old video files
        
        Args:
            max_age_days: Maximum age in days before deletion
        """
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_days * 24 * 60 * 60
            
            deleted_count = 0
            for video_file in self.base_storage_path.glob("*"):
                if video_file.is_file():
                    file_age = current_time - video_file.stat().st_mtime
                    if file_age > max_age_seconds:
                        video_file.unlink()
                        deleted_count += 1
            
            logger.info(f"Cleaned up {deleted_count} old video files")
            
        except Exception as e:
            logger.error(f"Error cleaning up old videos: {e}")
    
    def _get_file_size_mb(self, file_path: str) -> float:
        """Get file size in MB"""
        try:
            size_bytes = os.path.getsize(file_path)
            return round(size_bytes / (1024 * 1024), 2)
        except:
            return 0.0
    
    def get_video_info(self, video_path: str) -> Dict:
        """
        Get basic video information
        
        Args:
            video_path: Path to video file
            
        Returns:
            Dictionary with video information
        """
        try:
            import cv2
            
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video: {video_path}")
            
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0
            
            cap.release()
            
            return {
                'fps': fps,
                'frame_count': frame_count,
                'width': width,
                'height': height,
                'duration_seconds': round(duration, 2),
                'file_size_mb': self._get_file_size_mb(video_path)
            }
            
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            return {
                'error': str(e),
                'file_size_mb': self._get_file_size_mb(video_path)
            }


# Utility functions for easy integration
def create_video_processor(storage_path: str = "data/videos") -> VideoProcessor:
    """Create and return a VideoProcessor instance"""
    return VideoProcessor(storage_path)

def process_uploaded_video(video_data: bytes, filename: str,
                          frame_interval: int = 30,
                          confidence_threshold: float = 0.3,
                          model_name: str = 'yolov8s-smart') -> Tuple[str, Dict]:
    """
    Process uploaded video and return detection results
    
    Args:
        video_data: Raw video data
        filename: Original filename
        frame_interval: Extract every Nth frame
        confidence_threshold: Minimum confidence for detections
        model_name: Name of the model to use ('yolov8n-smart', 'yolov8s-smart', 'yolov8m-smart')
        
    Returns:
        Tuple of (detection_id, results_dict)
    """
    processor = create_video_processor()
    
    # Save video
    video_path = processor.save_uploaded_video(video_data, filename)
    
    # Process for detection with enhanced model
    results = processor.process_video_for_detection(
        video_path, frame_interval, confidence_threshold, model_name
    )
    
    # Save results
    results_path = processor.save_detection_results(results)
    
    return results['detection_id'], results

def get_detection_summary(detection_id: str) -> Optional[Dict]:
    """
    Get summary of detection results
    
    Args:
        detection_id: Detection ID
        
    Returns:
        Summary dictionary or None if not found
    """
    processor = create_video_processor()
    results = processor.get_detection_results(detection_id)
    
    if results:
        return {
            'detection_id': results.get('detection_id'),
            'total_objects': results.get('total_objects_detected', 0),
            'estimated_weight_kg': results.get('estimated_weight_kg', 0),
            'category_counts': results.get('category_counts', {}),
            'timestamp': results.get('timestamp'),
            'processing_time': results.get('processing_time'),
            'video_info': results.get('video_size_mb', 0)
        }
    
    return None

if __name__ == "__main__":
    # Example usage
    processor = VideoProcessor()
    print("Video processor initialized successfully!")
    print(f"Storage path: {processor.base_storage_path}")
    print(f"Results path: {processor.results_path}") 