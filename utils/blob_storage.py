from minio import Minio
from minio.error import S3Error
import os
import uuid
from io import BytesIO
from PIL import Image
import logging

class BlobStorageService:
    def __init__(self, use_local_storage=True):
        self.use_local_storage = use_local_storage
        self.local_storage_path = "data/images"
        
        if not use_local_storage:
            # Only initialize MinIO if explicitly requested
            try:
                self.client = Minio(
                    "localhost:9000",
                    access_key="minioadmin", 
                    secret_key="minioadmin",
                    secure=False
                )
                self.bucket_name = "trash-images"
                self._ensure_bucket_exists()
                print("MinIO blob storage initialized")
            except Exception as e:
                print(f"MinIO not available, falling back to local storage: {e}")
                self.use_local_storage = True
        
        if self.use_local_storage:
            # Ensure local storage directory exists
            os.makedirs(self.local_storage_path, exist_ok=True)
            print("Local file storage initialized")
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist (MinIO only)"""
        if self.use_local_storage:
            return
            
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                print(f"Created bucket: {self.bucket_name}")
        except S3Error as e:
            print(f"Error creating bucket: {e}")
    
    def upload_image(self, file_data: bytes, filename: str) -> str:
        """Upload image to storage (local or MinIO)"""
        blob_id = str(uuid.uuid4())
        file_extension = os.path.splitext(filename)[1] or '.jpg'
        
        if self.use_local_storage:
            return self._upload_local(file_data, blob_id, file_extension, filename)
        else:
            return self._upload_minio(file_data, blob_id, file_extension)
    
    def _upload_local(self, file_data: bytes, blob_id: str, file_extension: str, original_filename: str) -> str:
        """Upload to local file system"""
        try:
            # Save original image
            image_filename = f"{blob_id}_{original_filename}"
            image_path = os.path.join(self.local_storage_path, image_filename)
            
            with open(image_path, 'wb') as f:
                f.write(file_data)
            
            # Create thumbnail
            thumbnail_filename = f"{blob_id}_thumb{file_extension}"
            thumbnail_path = os.path.join(self.local_storage_path, thumbnail_filename)
            
            thumbnail_data = self._create_thumbnail(file_data)
            with open(thumbnail_path, 'wb') as f:
                f.write(thumbnail_data)
            
            print(f"Uploaded image locally: {image_path}")
            return blob_id
            
        except Exception as e:
            print(f"Error uploading image locally: {e}")
            raise
    
    def _upload_minio(self, file_data: bytes, blob_id: str, file_extension: str) -> str:
        """Upload to MinIO"""
        try:
            blob_key = f"{blob_id}{file_extension}"
            thumbnail_key = f"thumbnails/{blob_id}_thumb{file_extension}"
            
            # Upload original image
            self.client.put_object(
                self.bucket_name,
                blob_key,
                BytesIO(file_data),
                length=len(file_data),
                content_type="image/jpeg"
            )
            
            # Create and upload thumbnail
            thumbnail_data = self._create_thumbnail(file_data)
            self.client.put_object(
                self.bucket_name,
                thumbnail_key,
                BytesIO(thumbnail_data),
                length=len(thumbnail_data),
                content_type="image/jpeg"
            )
            
            print(f"Uploaded image to MinIO: {blob_key}")
            return blob_id
            
        except Exception as e:
            print(f"Error uploading image to MinIO: {e}")
            raise
    
    def get_image(self, blob_id: str, thumbnail: bool = False) -> bytes:
        """Get image from storage"""
        if self.use_local_storage:
            return self._get_image_local(blob_id, thumbnail)
        else:
            return self._get_image_minio(blob_id, thumbnail)
    
    def _get_image_local(self, blob_id: str, thumbnail: bool = False) -> bytes:
        """Get image from local storage"""
        try:
            if thumbnail:
                # Find thumbnail file
                for file in os.listdir(self.local_storage_path):
                    if file.startswith(f"{blob_id}_thumb"):
                        file_path = os.path.join(self.local_storage_path, file)
                        break
                else:
                    raise FileNotFoundError(f"Thumbnail not found for blob_id: {blob_id}")
            else:
                # Find original file
                for file in os.listdir(self.local_storage_path):
                    if file.startswith(blob_id) and not file.endswith("_thumb.jpg"):
                        file_path = os.path.join(self.local_storage_path, file)
                        break
                else:
                    raise FileNotFoundError(f"Image not found for blob_id: {blob_id}")
            
            with open(file_path, 'rb') as f:
                return f.read()
                
        except Exception as e:
            print(f"Error retrieving local image: {e}")
            raise
    
    def _get_image_minio(self, blob_id: str, thumbnail: bool = False) -> bytes:
        """Get image from MinIO"""
        try:
            file_extension = ".jpeg"
            if thumbnail:
                blob_key = f"thumbnails/{blob_id}_thumb{file_extension}"
            else:
                blob_key = f"{blob_id}{file_extension}"
            
            response = self.client.get_object(self.bucket_name, blob_key)
            return response.read()
            
        except Exception as e:
            print(f"Error retrieving MinIO image: {e}")
            raise
    
    def get_image_url(self, blob_id: str, thumbnail: bool = False) -> str:
        """Get URL for image"""
        if self.use_local_storage:
            # For local storage, return a path that can be served by FastAPI
            if thumbnail:
                return f"/images/{blob_id}_thumb.jpg"
            else:
                return f"/images/{blob_id}.jpg"
        else:
            return self._get_image_url_minio(blob_id, thumbnail)
    
    def _get_image_url_minio(self, blob_id: str, thumbnail: bool = False) -> str:
        """Get presigned URL for MinIO image"""
        try:
            file_extension = ".jpeg"
            if thumbnail:
                blob_key = f"thumbnails/{blob_id}_thumb{file_extension}"
            else:
                blob_key = f"{blob_id}{file_extension}"
            
            url = self.client.presigned_get_object(
                self.bucket_name, 
                blob_key, 
                expires=3600
            )
            return url
            
        except Exception as e:
            print(f"Error generating MinIO image URL: {e}")
            raise
    
    def _create_thumbnail(self, image_data: bytes, size: tuple = (300, 300)) -> bytes:
        """Create thumbnail from image data"""
        try:
            image = Image.open(BytesIO(image_data))
            image.thumbnail(size, Image.Resampling.LANCZOS)
            
            output = BytesIO()
            image.save(output, format='JPEG', quality=85)
            return output.getvalue()
            
        except Exception as e:
            print(f"Error creating thumbnail: {e}")
            return image_data

# Global instance - defaults to local storage for development
blob_service = BlobStorageService(use_local_storage=True) 