#!/usr/bin/env python3
"""
Debug script to test can detection with different settings
"""

import os
import sys
import logging

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ml.trash_detection_v2 import create_trash_detector

# Set up logging to see all details
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def debug_can_detection(image_path=None):
    """Debug can detection with different settings"""
    
    # Create detector
    detector = create_trash_detector('yolov8n')
    
    # Print model info and environment for debugging
    print(f"[DEBUG] Model file: {detector.model_config['filename']}")
    print(f"[DEBUG] Model name: {detector.model_config['name']}")
    print(f"[DEBUG] Model description: {detector.model_config['description']}")
    import sys as _sys
    import torch
    import ultralytics
    print(f"[DEBUG] Python version: {_sys.version}")
    print(f"[DEBUG] torch version: {torch.__version__}")
    print(f"[DEBUG] ultralytics version: {ultralytics.__version__}")
    
    # Test with your can image
    if image_path is None:
        image_path = "can_image.jpeg"  # Default
    
    if not os.path.exists(image_path):
        logger.error(f"Can image not found: {image_path}")
        logger.info("Please provide the image path as an argument or rename your can image to 'can_image.jpeg'")
        return
    
    logger.info(f"Testing can detection with image: {image_path}")
    
    # Test with very low confidence thresholds
    for confidence in [0.1, 0.2, 0.3, 0.4, 0.5]:
        logger.info(f"\n{'='*50}")
        logger.info(f"=== Testing with confidence threshold: {confidence} ===")
        logger.info(f"{'='*50}")
        
        try:
            results = detector.detect_trash_in_image(image_path, confidence)
            
            logger.info(f"Results for confidence {confidence}:")
            logger.info(f"  - Total objects: {results.get('total_objects', 0)}")
            logger.info(f"  - Trash objects: {results.get('trash_objects', 0)}")
            logger.info(f"  - Natural objects: {results.get('natural_objects', 0)}")
            
            # Show debug info if available
            debug_info = results.get('debug_info', {})
            if debug_info:
                raw_detections = debug_info.get('raw_detections', [])
                logger.info(f"  - Raw detections: {len(raw_detections)}")
                
                if raw_detections:
                    logger.info("  - Raw detection details:")
                    for det in raw_detections:
                        logger.info(f"    * {det['class_name']}: {det['confidence']:.3f} (ID: {det['class_id']})")
                else:
                    logger.warning("  - NO RAW DETECTIONS FOUND!")
                    logger.warning("  - This means YOLO is not detecting ANYTHING in the image")
                    logger.warning("  - Possible issues:")
                    logger.warning("    - Image format not supported")
                    logger.warning("    - Image is corrupted")
                    logger.warning("    - Image is too small/large")
                    logger.warning("    - Image doesn't contain recognizable objects")
            
            # Show trash detections
            trash_detections = results.get('trash_detections', [])
            if trash_detections:
                logger.info("  - Trash detections:")
                for det in trash_detections:
                    logger.info(f"    * {det['class_name']}: {det['confidence']:.3f} -> {det['category']}")
            else:
                logger.warning("  - No trash detections found")
                
        except Exception as e:
            logger.error(f"Error testing with confidence {confidence}: {e}")
            import traceback
            traceback.print_exc()

def test_model_classes():
    """Test what classes the model knows about"""
    logger.info("\n" + "="*50)
    logger.info("TESTING MODEL CLASSES")
    logger.info("="*50)
    
    detector = create_trash_detector('yolov8n')
    
    # Print model info and environment for debugging
    print(f"[DEBUG] Model file: {detector.model_config['filename']}")
    print(f"[DEBUG] Model name: {detector.model_config['name']}")
    print(f"[DEBUG] Model description: {detector.model_config['description']}")
    import sys as _sys
    import torch
    import ultralytics
    print(f"[DEBUG] Python version: {_sys.version}")
    print(f"[DEBUG] torch version: {torch.__version__}")
    print(f"[DEBUG] ultralytics version: {ultralytics.__version__}")
    
    # Get model info
    model_info = detector.get_model_info()
    logger.info(f"Model: {model_info.get('name', 'Unknown')}")
    logger.info(f"Description: {model_info.get('description', 'Unknown')}")
    
    # Check if model has class names
    if hasattr(detector.model, 'names'):
        logger.info(f"Number of classes: {len(detector.model.names)}")
        logger.info("Available classes:")
        
        # Look for can-related classes
        can_classes = []
        for class_id, class_name in detector.model.names.items():
            if 'can' in class_name.lower() or 'bottle' in class_name.lower() or 'container' in class_name.lower():
                can_classes.append((class_id, class_name))
                logger.info(f"  * {class_id}: {class_name}")
        
        if can_classes:
            logger.info(f"Found {len(can_classes)} can-related classes")
        else:
            logger.warning("No can-related classes found in model!")
            logger.info("First 20 classes:")
            for i, (class_id, class_name) in enumerate(detector.model.names.items()):
                if i >= 20:
                    break
                logger.info(f"  * {class_id}: {class_name}")
    else:
        logger.error("Model doesn't have class names!")

if __name__ == "__main__":
    # First test what classes the model knows
    test_model_classes()
    
    # Then test can detection
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    debug_can_detection(image_path) 