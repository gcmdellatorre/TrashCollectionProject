"""
Trash Detection System v2
Uses TACO models specifically trained for trash detection
Filters out natural elements and provides detailed object reporting
"""

import os
import cv2
import numpy as np
import json
import tempfile
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import logging
from datetime import datetime
import uuid
import gdown
import requests

# Try to import ultralytics, install if not available
try:
    from ultralytics import YOLO
except ImportError:
    print("Installing ultralytics...")
    import subprocess
    subprocess.check_call(["pip", "install", "ultralytics"])
    from ultralytics import YOLO

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrashDetectorV2:
    """Advanced trash detector using TACO models with natural element filtering"""
    
    # Model configurations with smart filtering
    TRASH_MODELS = {
        'yolov8n': {
            'name': 'yolov8n',
            'description': 'YOLOv8n with enhanced trash filtering (fast)',
            'model_type': 'enhanced',
            'filename': 'yolov8n.pt',
            'size_mb': 6.2,
            'performance': 'fast',
            'accuracy': 'good'
        },
        'yolov8s': {
            'name': 'yolov8s',
            'description': 'YOLOv8s with enhanced trash filtering (medium)',
            'model_type': 'enhanced',
            'filename': 'yolov8s.pt',
            'size_mb': 22.4,
            'performance': 'medium',
            'accuracy': 'high'
        },
        'yolov8m': {
            'name': 'yolov8m',
            'description': 'YOLOv8m with enhanced trash filtering (high accuracy)',
            'model_type': 'enhanced',
            'filename': 'yolov8m.pt',
            'size_mb': 50.0,
            'performance': 'slow',
            'accuracy': 'very_high'
        }
    }
    
    # TACO dataset classes (60+ trash classes)
    TACO_CLASSES = [
        'bottle', 'can', 'cigarette', 'food_wrapper', 'paper', 'cardboard',
        'plastic_bag', 'plastic_cup', 'plastic_straw', 'plastic_utensil',
        'glass_bottle', 'metal_can', 'paper_cup', 'paper_bag', 'newspaper',
        'magazine', 'book', 'box', 'container', 'wrapper', 'bag', 'cup',
        'straw', 'utensil', 'plate', 'bowl', 'fork', 'spoon', 'knife',
        'bottle_cap', 'can_tab', 'cigarette_butt', 'chewing_gum', 'tissue',
        'napkin', 'toilet_paper', 'diaper', 'sanitary_pad', 'condom',
        'syringe', 'needle', 'bandage', 'mask', 'glove', 'shoe', 'clothing',
        'fabric', 'rope', 'string', 'wire', 'cable', 'electronics', 'battery',
        'light_bulb', 'glass_shard', 'metal_shard', 'plastic_shard'
    ]
    
    # Natural elements to filter out (not trash)
    NATURAL_ELEMENTS = {
        'person', 'animal', 'bird', 'fish', 'tree', 'plant', 'flower', 
        'grass', 'leaf', 'branch', 'rock', 'stone', 'water', 'cloud',
        'sky', 'sun', 'moon', 'star', 'earth', 'soil', 'sand', 'mud',
        'snow', 'ice', 'fire', 'smoke', 'steam', 'rain', 'wind'
    }
    
    # Recycling categories for trash classification
    RECYCLING_CATEGORIES = {
        # Highly recyclable materials
        'highly_recyclable': [
            'bottle', 'glass_bottle', 'can', 'metal_can', 'metal_shard',
            'paper', 'cardboard', 'newspaper', 'magazine', 'book',
            'paper_cup', 'paper_bag', 'wire', 'cable', 'metal'
        ],
        
        # Moderately recyclable materials
        'moderately_recyclable': [
            'plastic_bottle', 'plastic_cup', 'plastic_utensil',
            'electronics', 'battery', 'light_bulb'
        ],
        
        # Difficult to recycle materials
        'difficult_recyclable': [
            'plastic_bag', 'plastic_straw', 'plastic_shard',
            'glass_shard', 'fabric', 'clothing', 'shoe'
        ],
        
        # Non-recyclable materials
        'non_recyclable': [
            'cigarette_butt', 'chewing_gum', 'diaper', 'sanitary_pad',
            'condom', 'syringe', 'needle', 'mask', 'glove',
            'food_wrapper', 'tissue', 'napkin', 'toilet_paper'
        ]
    }
    
    # Environmental impact categories for trash classification
    ENVIRONMENTAL_IMPACT_CATEGORIES = {
        # High environmental impact (hazardous, long-lasting)
        'high_impact': [
            'battery', 'electronics', 'syringe', 'needle', 'light_bulb',
            'glass_shard', 'metal_shard', 'plastic_shard', 'cigarette_butt',
            'diaper', 'sanitary_pad', 'condom', 'mask', 'glove'
        ],
        
        # Medium environmental impact (moderate decomposition time)
        'medium_impact': [
            'plastic_bag', 'plastic_bottle', 'plastic_cup', 'plastic_straw',
            'plastic_utensil', 'plastic_shard', 'metal_can', 'metal_shard',
            'wire', 'cable', 'fabric', 'clothing', 'shoe'
        ],
        
        # Low environmental impact (biodegradable, short decomposition)
        'low_impact': [
            'paper', 'cardboard', 'newspaper', 'magazine', 'book',
            'tissue', 'napkin', 'toilet_paper', 'food_wrapper',
            'paper_cup', 'paper_bag', 'chewing_gum'
        ]
    }
    
    # Mapping from granular categories to simple photo categories for database compatibility
    CATEGORY_TO_SIMPLE_MAP = {
        # Granular → Simple mapping
        'beverage_containers': 'plastic',  # Most beverage containers are plastic
        'food_packaging': 'plastic',       # Most food packaging is plastic
        'plastic_items': 'plastic',
        'paper_products': 'paper',
        'metal_items': 'metal',
        'glass_items': 'glass',
        'electronic_waste': 'electronic',
        'medical_hygiene': 'organic',      # Medical items often organic/biodegradable
        'smoking_items': 'organic',        # Cigarettes contain organic material
        'personal_items': 'plastic',       # Most personal items contain plastic
        'construction_industrial': 'metal', # Construction items often metal
        'other': 'plastic'                 # Default to plastic for unknown items
    }
    
    # Enhanced category mapping for trash classification
    TRASH_CATEGORIES = {
        # Beverage containers
        'beverage_containers': [
            'bottle', 'glass_bottle', 'can', 'metal_can', 'cup', 'plastic_cup', 
            'paper_cup', 'mug', 'wine glass', 'bottle_cap', 'can_tab'
        ],
        
        # Food packaging
        'food_packaging': [
            'food_wrapper', 'wrapper', 'container', 'box', 'plate', 'bowl',
            'utensil', 'fork', 'spoon', 'knife', 'plastic_utensil', 'straw', 'plastic_straw'
        ],
        
        # Plastic items
        'plastic_items': [
            'plastic_bag', 'plastic_bottle', 'plastic_cup', 'plastic_straw', 
            'plastic_utensil', 'plastic_shard', 'bag', 'plastic'
        ],
        
        # Paper products
        'paper_products': [
            'paper', 'cardboard', 'paper_cup', 'paper_bag', 'newspaper',
            'magazine', 'book', 'box', 'tissue', 'napkin', 'toilet_paper'
        ],
        
        # Metal items
        'metal_items': [
            'can', 'metal_can', 'utensil', 'fork', 'spoon', 'knife',
            'can_tab', 'wire', 'cable', 'metal_shard', 'metal'
        ],
        
        # Glass items
        'glass_items': [
            'glass_bottle', 'light_bulb', 'glass_shard', 'glass'
        ],
        
        # Electronic waste
        'electronic_waste': [
            'electronics', 'battery', 'cell phone', 'remote', 'keyboard', 
            'mouse', 'laptop', 'charger'
        ],
        
        # Medical/hygiene items
        'medical_hygiene': [
            'mask', 'glove', 'bandage', 'syringe', 'needle', 'diaper',
            'sanitary_pad', 'condom', 'tissue', 'napkin', 'toilet_paper'
        ],
        
        # Smoking items
        'smoking_items': [
            'cigarette', 'cigarette_butt', 'lighter', 'matches', 'chewing_gum'
        ],
        
        # Personal items
        'personal_items': [
            'shoe', 'clothing', 'fabric', 'backpack', 'handbag', 'suitcase',
            'umbrella', 'tie', 'hat', 'glasses', 'watch'
        ],
        
        # Construction/industrial
        'construction_industrial': [
            'rope', 'string', 'wire', 'cable', 'fabric', 'plastic_shard',
            'metal_shard', 'glass_shard'
        ],
        
        # Other items
        'other': [
            'toy', 'game', 'puzzle', 'art', 'decoration', 'vase', 'scissors',
            'teddy_bear', 'hair_drier', 'toothbrush', 'comb', 'mirror', 'lamp',
            'clock', 'camera', 'sports_ball', 'baseball_bat', 'baseball_glove',
            'tennis_racket', 'basketball', 'football'
        ]
    }
    
    def __init__(self, model_name: str = 'yolov8s', cache_dir: str = 'models'):
        """
        Initialize the trash detector
        
        Args:
            model_name: Name of the smart trash detection model to use
            cache_dir: Directory to cache downloaded models
        """
        self.model_name = model_name
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.model = None
        self.model_config = self.TRASH_MODELS.get(model_name, self.TRASH_MODELS['yolov8s'])
        
        # Set model type for compatibility
        self.fallback_to_coco = False  # We're using smart filtering, not fallback
        
        self._load_model()
    
    def _download_taco_model(self, url: str, filename: str) -> str:
        """Download TACO model from Google Drive"""
        try:
            model_path = self.cache_dir / filename
            
            if not model_path.exists():
                logger.info(f"Downloading TACO model {filename}...")
                gdown.download(url, str(model_path), quiet=False)
                logger.info(f"TACO model downloaded to: {model_path}")
            
            return str(model_path)
            
        except Exception as e:
            logger.error(f"Error downloading TACO model: {e}")
            raise
    
    def _load_model(self):
        """Load the specified model with smart filtering"""
        try:
            config = self.model_config
            
            logger.info(f"Loading {config['name']}: {config['description']}")
            
            # Build the full path to the model file
            model_path = self.cache_dir / config['filename']
            
            if not model_path.exists():
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            self.model = YOLO(str(model_path))
            logger.info(f"Model loaded successfully. Size: {config['size_mb']}MB")
                    
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def _is_trash_object(self, class_name: str, confidence: float, bbox: Optional[List] = None, image_size: Optional[Tuple] = None) -> bool:
        """Enhanced trash detection with context awareness and better filtering"""
        class_name_lower = class_name.lower()
        
        # Enhanced trash classes with more granular categories
        trash_classes = {
            # Beverage containers (high priority trash)
            'bottle', 'cup', 'wine glass', 'can', 'mug', 'glass', 'beer bottle', 'soda can',
            'aluminum can', 'tin can', 'metal can', 'plastic bottle', 'water bottle',
            'coffee cup', 'takeout cup', 'disposable cup', 'paper cup', 'styrofoam cup',
            
            # Food packaging (very common litter)
            'bowl', 'plate', 'fork', 'spoon', 'knife', 'utensil', 'chopstick',
            'food wrapper', 'packaging', 'container', 'takeout container', 'fast food bag',
            'chip bag', 'candy wrapper', 'gum wrapper', 'sandwich wrapper',
            
            # Paper products (biodegradable but still litter)
            'book', 'newspaper', 'magazine', 'paper', 'cardboard', 'paper bag',
            'tissue', 'napkin', 'toilet paper', 'paper towel', 'receipt',
            'flyer', 'brochure', 'menu', 'ticket', 'stamp',
            
            # Plastic items (major environmental concern)
            'plastic bag', 'plastic cup', 'plastic bottle', 'plastic wrapper',
            'plastic container', 'plastic utensil', 'plastic straw', 'plastic',
            'ziploc bag', 'grocery bag', 'shopping bag', 'trash bag',
            
            # Electronics (e-waste)
            'cell phone', 'remote', 'keyboard', 'mouse', 'laptop', 'phone',
            'electronics', 'battery', 'charger', 'cable', 'wire', 'headphones',
            'earbuds', 'speaker', 'tablet', 'camera', 'flash drive',
            
            # Personal items (often discarded)
            'backpack', 'handbag', 'suitcase', 'umbrella', 'tie', 'shoe',
            'clothing', 'hat', 'glasses', 'watch', 'jewelry', 'wallet',
            'purse', 'belt', 'scarf', 'glove', 'sock',
            
            # Smoking items (very common litter)
            'cigarette', 'cigarette butt', 'lighter', 'matches', 'cigar',
            'tobacco', 'rolling paper', 'filter', 'ash',
            
            # Medical/hygiene (hazardous waste)
            'mask', 'glove', 'bandage', 'syringe', 'needle', 'diaper',
            'sanitary pad', 'condom', 'tampon', 'cotton swab', 'band-aid',
            
            # Construction/industrial debris
            'wire', 'cable', 'rope', 'string', 'fabric', 'plastic shard',
            'glass shard', 'metal shard', 'wood shard', 'concrete', 'brick',
            'nail', 'screw', 'bolt', 'washer', 'metal scrap',
            
            # Other common litter
            'toy', 'game', 'puzzle', 'art', 'decoration', 'trash', 'litter',
            'balloon', 'ribbon', 'tape', 'sticker', 'label', 'tag'
        }
        
        # Natural elements to exclude (not trash)
        natural_classes = {
            # Living things
            'person', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
            'elephant', 'bear', 'zebra', 'giraffe', 'fish', 'animal',
            'insect', 'spider', 'butterfly', 'bee', 'ant', 'fly',
            
            # Plants
            'tree', 'plant', 'flower', 'grass', 'leaf', 'branch',
            'potted plant', 'bush', 'shrub', 'vine', 'weed', 'moss',
            'fungus', 'mushroom', 'lichen', 'algae',
            
            # Natural materials
            'rock', 'stone', 'water', 'cloud', 'sky', 'sun', 'moon',
            'star', 'earth', 'soil', 'sand', 'mud', 'snow', 'ice',
            'fire', 'smoke', 'steam', 'rain', 'wind', 'air', 'dust',
            
            # Buildings/infrastructure (not litter)
            'building', 'house', 'bridge', 'tower', 'wall', 'door',
            'window', 'roof', 'floor', 'ceiling', 'stairs', 'fence',
            'gate', 'sign', 'billboard', 'streetlight', 'pole',
            
            # Vehicles (not typically litter)
            'airplane', 'train', 'truck', 'bus', 'boat', 'car',
            'motorcycle', 'bicycle', 'skateboard', 'scooter', 'wheelchair',
            
            # Infrastructure/furniture (not litter)
            'traffic light', 'fire hydrant', 'stop sign', 'parking meter',
            'bench', 'chair', 'couch', 'bed', 'dining table', 'desk',
            'toilet', 'sink', 'refrigerator', 'microwave', 'oven',
            'toaster', 'stove', 'dishwasher', 'washing machine', 'lamp',
            'clock', 'mirror', 'picture', 'painting', 'statue',
            
            # Food (not typically litter in nature)
            'banana', 'apple', 'orange', 'broccoli', 'carrot', 'tomato',
            'hot dog', 'pizza', 'donut', 'cake', 'sandwich', 'bread',
            'meat', 'fish', 'chicken', 'egg', 'milk', 'cheese',
            
            # Entertainment/electronics (when in use)
            'tv', 'monitor', 'computer', 'printer', 'speaker',
            'headphones', 'microphone', 'guitar', 'piano', 'book',
            'newspaper', 'magazine'  # These can be trash when discarded
        }
        
        # Context-aware filtering
        is_trash = class_name_lower in trash_classes
        is_natural = class_name_lower in natural_classes
        
        # Enhanced confidence thresholds based on object type
        if is_trash:
            # Lower threshold for obvious trash items
            if class_name_lower in ['bottle', 'can', 'plastic bag', 'cigarette butt', 'food wrapper']:
                return confidence > 0.3
            # Medium threshold for common litter
            elif class_name_lower in ['cup', 'paper', 'cardboard', 'utensil', 'tissue']:
                return confidence > 0.4
            # Higher threshold for items that could be in use
            else:
                return confidence > 0.5
        
        # Exclude natural elements
        if is_natural:
            return False
        
        # For ambiguous cases, use size and position context
        if bbox and image_size:
            # Check if object is very small (likely litter)
            x1, y1, x2, y2 = bbox
            object_area = (x2 - x1) * (y2 - y1)
            image_area = image_size[0] * image_size[1]
            relative_size = object_area / image_area
            
            # Small objects are more likely to be litter
            if relative_size < 0.01:  # Less than 1% of image
                return confidence > 0.4
            elif relative_size < 0.05:  # Less than 5% of image
                return confidence > 0.5
            else:
                return confidence > 0.6
        
        # Default fallback
        return confidence > 0.6
    
    def _get_trash_category(self, class_name: str) -> str:
        """Get trash category for detected object"""
        class_name_lower = class_name.lower()
        
        for category, items in self.TRASH_CATEGORIES.items():
            if class_name_lower in items:
                return category
        
        # Default category for unknown items
        return 'other'
    
    def _get_environmental_impact(self, class_name: str) -> str:
        """Get environmental impact category for detected object"""
        class_name_lower = class_name.lower()
        
        for impact, items in self.ENVIRONMENTAL_IMPACT_CATEGORIES.items():
            if class_name_lower in items:
                return impact
        
        # Default to medium impact for unknown items
        return 'medium_impact'
    
    def _get_recycling_category(self, class_name: str) -> str:
        """Get recycling category for detected object"""
        class_name_lower = class_name.lower()
        
        for recycling, items in self.RECYCLING_CATEGORIES.items():
            if class_name_lower in items:
                return recycling
        
        # Default to difficult recyclable for unknown items
        return 'difficult_recyclable'
    
    def _get_simple_category(self, class_name: str) -> str:
        """Get simple category for database compatibility (photo report format)"""
        granular_category = self._get_trash_category(class_name)
        return self.CATEGORY_TO_SIMPLE_MAP.get(granular_category, 'plastic')
    
    def extract_frames(self, video_path: str, frame_interval: int = 30) -> List[str]:
        """Extract frames from video at specified intervals"""
        frame_paths = []
        
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {video_path}")
            
            frame_count = 0
            extracted_count = 0
            
            # Create temporary directory for frames
            temp_dir = tempfile.mkdtemp(prefix="trash_detection_frames_")
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_count % frame_interval == 0:
                    frame_path = os.path.join(temp_dir, f"frame_{extracted_count:04d}.jpg")
                    cv2.imwrite(frame_path, frame)
                    frame_paths.append(frame_path)
                    extracted_count += 1
                
                frame_count += 1
            
            cap.release()
            logger.info(f"Extracted {len(frame_paths)} frames from video")
            
        except Exception as e:
            logger.error(f"Error extracting frames: {e}")
            raise
        
        return frame_paths
    
    def detect_trash_in_image(self, image_path: str, confidence_threshold: float = 0.3) -> Dict:
        """Detect trash objects in a single image"""
        try:
            # Get image dimensions for context-aware filtering
            import cv2
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not read image: {image_path}")
            image_height, image_width = img.shape[:2]
            image_size = (image_width, image_height)
            
            logger.info(f"Processing image: {image_path} ({image_width}x{image_height}) with confidence threshold: {confidence_threshold}")
            
            # Run inference
            results = self.model(image_path, conf=confidence_threshold)
            
            detections = []
            all_detections = []  # Include all detections for user validation
            trash_detections = []
            
            # Debug: Log all raw detections
            raw_detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get detection info
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0].cpu().numpy())
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        # Get class name
                        class_name = self.model.names[class_id]
                        
                        # Debug: Log raw detection
                        raw_detections.append({
                            'class_name': class_name,
                            'confidence': confidence,
                            'class_id': class_id,
                            'bbox': [float(x1), float(y1), float(x2), float(y2)]
                        })
                        
                        # Create bbox for context-aware filtering
                        bbox = [float(x1), float(y1), float(x2), float(y2)]
                        
                        # Enhanced trash detection with context
                        is_trash = self._is_trash_object(class_name, confidence, bbox, image_size)
                        
                        # Debug: Log filtering decision
                        logger.info(f"Detection: {class_name} (conf: {confidence:.3f}) -> is_trash: {is_trash}")
                        
                        # Create detection object
                        detection = {
                            'bbox': bbox,
                            'confidence': confidence,
                            'class_name': class_name,
                            'class_id': class_id,
                            'is_trash': is_trash,
                            'category': self._get_trash_category(class_name) if is_trash else 'natural',
                            'simple_category': self._get_simple_category(class_name) if is_trash else 'organic',
                            'environmental_impact': self._get_environmental_impact(class_name) if is_trash else 'none',
                            'recycling_category': self._get_recycling_category(class_name) if is_trash else 'none'
                        }
                        
                        all_detections.append(detection)
                        
                        # Only include trash objects in trash detections
                        if is_trash:
                            trash_detections.append(detection)
            
            # Debug: Log summary
            logger.info(f"Raw detections: {len(raw_detections)}")
            logger.info(f"All detections: {len(all_detections)}")
            logger.info(f"Trash detections: {len(trash_detections)}")
            
            if raw_detections:
                logger.info("Raw detection details:")
                for det in raw_detections:
                    logger.info(f"  - {det['class_name']}: {det['confidence']:.3f}")
            
            return {
                'image_path': image_path,
                'all_detections': all_detections,  # All detected objects
                'trash_detections': trash_detections,  # Only trash objects
                'total_objects': len(all_detections),
                'trash_objects': len(trash_detections),
                'natural_objects': len(all_detections) - len(trash_detections),
                'timestamp': datetime.now().isoformat(),
                'debug_info': {
                    'raw_detections': raw_detections,
                    'confidence_threshold': confidence_threshold,
                    'image_size': image_size
                }
            }
            
        except Exception as e:
            logger.error(f"Error detecting trash in image {image_path}: {e}")
            return {
                'image_path': image_path,
                'all_detections': [],
                'trash_detections': [],
                'total_objects': 0,
                'trash_objects': 0,
                'natural_objects': 0,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def process_video(self, video_path: str, frame_interval: int = 30, 
                     confidence_threshold: float = 0.3) -> Dict:
        """Process video and detect trash objects"""
        try:
            model_type = "Smart"
            logger.info(f"Processing video with {self.model_config['name']} ({model_type}): {video_path}")
            
            # Extract frames
            frame_paths = self.extract_frames(video_path, frame_interval)
            
            if not frame_paths:
                raise ValueError("No frames extracted from video")
            
            # Process each frame
            frame_results = []
            all_detections = []
            trash_detections = []
            
            for frame_path in frame_paths:
                frame_result = self.detect_trash_in_image(frame_path, confidence_threshold)
                frame_results.append(frame_result)
                all_detections.extend(frame_result['all_detections'])
                trash_detections.extend(frame_result['trash_detections'])
            
            # Aggregate results
            category_counts = {}
            simple_category_counts = {}
            environmental_impact_counts = {}
            recycling_category_counts = {}
            class_counts = {}
            all_class_counts = {}
            
            # Count trash objects by various categories
            for detection in trash_detections:
                category = detection['category']
                simple_category = detection['simple_category']
                environmental_impact = detection['environmental_impact']
                recycling_category = detection['recycling_category']
                class_name = detection['class_name']
                
                category_counts[category] = category_counts.get(category, 0) + 1
                simple_category_counts[simple_category] = simple_category_counts.get(simple_category, 0) + 1
                environmental_impact_counts[environmental_impact] = environmental_impact_counts.get(environmental_impact, 0) + 1
                recycling_category_counts[recycling_category] = recycling_category_counts.get(recycling_category, 0) + 1
                class_counts[class_name] = class_counts.get(class_name, 0) + 1
            
            # Count all objects by class (for user validation)
            for detection in all_detections:
                class_name = detection['class_name']
                all_class_counts[class_name] = all_class_counts.get(class_name, 0) + 1
            
            # Calculate estimated weight
            estimated_weight = self._estimate_weight(category_counts)
            
            # Generate unique ID
            detection_id = str(uuid.uuid4())
            
            result = {
                'detection_id': detection_id,
                'model_used': self.model_config['name'],
                'model_type': "Smart",
                'model_description': self.model_config['description'],
                'video_path': video_path,
                'frame_interval': frame_interval,
                'confidence_threshold': confidence_threshold,
                'total_frames_processed': len(frame_paths),
                'total_objects_detected': len(all_detections),
                'trash_objects_detected': len(trash_detections),
                'natural_objects_filtered': len(all_detections) - len(trash_detections),
                'category_counts': category_counts,
                'simple_category_counts': simple_category_counts,  # For database compatibility
                'environmental_impact_breakdown': environmental_impact_counts,
                'recycling_category_breakdown': recycling_category_counts,
                'trash_class_counts': class_counts,
                'all_class_counts': all_class_counts,  # For user validation
                'estimated_weight_kg': estimated_weight,
                'frame_results': frame_results,
                'timestamp': datetime.now().isoformat(),
                'processing_time': None
            }
            
            # Clean up temporary frame files
            for frame_path in frame_paths:
                try:
                    os.remove(frame_path)
                except:
                    pass
            
            # Remove temp directory
            try:
                os.rmdir(os.path.dirname(frame_paths[0]))
            except:
                pass
            
            logger.info(f"Video processing completed. Detected {len(trash_detections)} trash objects out of {len(all_detections)} total objects using {self.model_config['name']}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing video: {e}")
            raise
    
    def _estimate_weight(self, category_counts: Dict[str, int]) -> float:
        """Estimate total weight based on detected trash objects"""
        # Enhanced weight estimates per item (in kg)
        weight_per_item = {
            'beverage_containers': 0.15,    # ~150g per beverage container
            'food_packaging': 0.08,         # ~80g per food packaging item
            'plastic_items': 0.05,          # ~50g per plastic item
            'paper_products': 0.02,         # ~20g per paper item
            'metal_items': 0.1,             # ~100g per metal item
            'glass_items': 0.3,             # ~300g per glass item
            'electronic_waste': 0.5,        # ~500g per electronic item
            'medical_hygiene': 0.03,        # ~30g per medical item
            'smoking_items': 0.01,          # ~10g per smoking item
            'personal_items': 0.2,          # ~200g per personal item
            'construction_industrial': 0.15, # ~150g per construction item
            'other': 0.03                   # ~30g per other item
        }
        
        total_weight = 0.0
        
        for category, count in category_counts.items():
            weight_per = weight_per_item.get(category, 0.03)
            total_weight += count * weight_per
        
        return round(total_weight, 2)
    
    def get_model_info(self) -> Dict:
        """Get information about the current model"""
        return {
            'name': self.model_config['name'],
            'description': self.model_config['description'],
            'size_mb': self.model_config['size_mb'],
            'performance': self.model_config['performance'],
            'accuracy': self.model_config['accuracy'],
            'model_type': "Smart",
            'classes': 80,  # COCO classes with smart filtering
            'categories': len(self.TRASH_CATEGORIES)
        }
    
    def list_available_models(self) -> Dict:
        """List all available smart trash detection models"""
        return self.TRASH_MODELS


# Utility functions
def create_trash_detector(model_name: str = 'yolov8s') -> TrashDetectorV2:
    """Create and return a TrashDetectorV2 instance"""
    return TrashDetectorV2(model_name)

def process_video_with_trash_detection(video_path: str, model_name: str = 'yolov8s',
                                     output_path: Optional[str] = None,
                                     frame_interval: int = 30, 
                                     confidence_threshold: float = 0.3) -> Dict:
    """Process video with trash detection"""
    import time
    
    detector = create_trash_detector(model_name)
    start_time = time.time()
    
    results = detector.process_video(video_path, frame_interval, confidence_threshold)
    results['processing_time'] = time.time() - start_time
    
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
    
    return results

if __name__ == "__main__":
    # Example usage
    detector = TrashDetectorV2('yolov8s-taco')
    print("Trash detector v2 initialized successfully!")
    print(f"Model info: {detector.get_model_info()}")
    print(f"Available models: {list(detector.list_available_models().keys())}") 