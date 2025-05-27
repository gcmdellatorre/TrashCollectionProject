from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

Base = declarative_base()

class TrashReport(Base):
    __tablename__ = 'trash_reports'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Image reference
    image_blob_id = Column(String, nullable=False)  # Reference to blob storage
    image_filename = Column(String, nullable=False)
    
    # Trash metadata
    trash_type = Column(String)
    estimated_kg = Column(Float)
    sparcity = Column(String)
    cleanliness = Column(String)
    
    # Additional metadata
    device_info = Column(Text)  # JSON string for camera/device info
    weather_conditions = Column(String)  # Could be added later
    
    def to_dict(self):
        return {
            'id': self.id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'image_blob_id': self.image_blob_id,
            'image_filename': self.image_filename,
            'trash_type': self.trash_type,
            'estimated_kg': self.estimated_kg,
            'sparcity': self.sparcity,
            'cleanliness': self.cleanliness,
            'device_info': self.device_info
        }

# Database setup
DATABASE_URL = "sqlite:///data/trash_reports.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 