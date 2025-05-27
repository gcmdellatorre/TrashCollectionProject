# 🗑️ Trash Detection & Reporting App

A comprehensive web application for reporting and tracking trash locations with advanced geospatial analysis capabilities.

## ✨ Features

### 📸 Smart Image Upload
- **Drag & drop interface** for easy image uploads
- **Automatic GPS extraction** from image EXIF data
- **Interactive map selection** when GPS data is unavailable
- **Real-time coordinate validation** and feedback

### 🗺️ Advanced Geospatial Analysis
- **Find closest dirty places** to any location
- **Intelligent dirtiness scoring** based on multiple factors
- **Area clustering** to identify problematic zones
- **Location search** with address geocoding
- **Interactive map** with real-time markers and summaries

### 📊 Comprehensive Data Management
- **SQLite database** for metadata storage
- **Blob storage system** for images (local/MinIO)
- **RESTful API** for data access
- **Test data generation** for development and testing

### 🎯 Smart Search & Discovery
- **Search by address** or coordinates
- **Distance-based filtering** (configurable radius)
- **Dirtiness ranking algorithm** considering:
  - Trash weight and volume
  - Cleanliness level
  - Sparcity (density)
  - Trash type severity

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd trash-detection-app
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Create test data (optional)**
```bash
# Create 50 test entries
python create_trash_dataset.py create

# Create 100 test entries
python create_trash_dataset.py create 100

# View database statistics
python create_trash_dataset.py stats
```

4. **Start the application**
```bash
python app.py
```

5. **Open your browser**
Navigate to `http://localhost:8000`

## 📱 Usage

### Uploading Trash Reports

1. **Take a photo** of trash with GPS-enabled camera, or use any image
2. **Visit the app** and drag/drop your image
3. **Verify location** - coordinates are extracted automatically or select manually
4. **Fill optional details** (trash type, weight, cleanliness level)
5. **Submit report** - your data is saved and immediately available

### Finding Dirty Places

1. **Use the search bar** on the map
2. **Enter any address** or location name
3. **View results** - see numbered markers for closest dirty places
4. **Check summary** - area statistics appear in the top-right
5. **Click markers** for detailed information

### Viewing All Data

- **Interactive map**: Visit `/map` for a Folium-based overview
- **API access**: Use `/api/trash-data` for raw JSON data
- **Database inspection**: Use SQLite browser on `data/trash_reports.db`

## 🛠️ API Reference

### Core Endpoints

#### Upload Trash Report
```http
POST /upload
Content-Type: multipart/form-data

file: image file
latitude: float (optional if GPS in image)
longitude: float (optional if GPS in image)
fill_form: "true" (optional)
trash_type: string (optional)
estimated_kg: float (optional)
sparcity: "low"|"medium"|"high" (optional)
cleanliness: "good"|"moderate"|"poor"|"very_poor" (optional)
```

#### Get All Reports
```http
GET /api/trash-data
Response: JSON array of trash reports
```

#### Find Dirty Places
```http
GET /api/find-dirty-places?lat=40.7128&lng=-74.0060&limit=5&max_distance=25
Response: {
  "search_location": {"lat": 40.7128, "lng": -74.0060},
  "summary": {...},
  "dirty_places": [...]
}
```

#### Location Summary
```http
GET /api/location-summary?lat=40.7128&lng=-74.0060&radius=10
Response: {
  "total_reports": 15,
  "total_estimated_kg": 45.2,
  "most_common_trash_type": "plastic",
  "avg_dirtiness_score": 67.3
}
```

#### Serve Images
```http
GET /api/image/{blob_id}?thumbnail=true
Response: JPEG image data
```

## 🗄️ Database Management

### View Database Statistics
```bash
python create_trash_dataset.py stats
```

### Create Test Data
```bash
# Create 50 entries (default)
python create_trash_dataset.py create

# Create custom number
python create_trash_dataset.py create 200
```

### Clear All Data
```bash
python create_trash_dataset.py clear
```

### Direct Database Access
```bash
# Using SQLite command line
sqlite3 data/trash_reports.db

# View all tables
.tables

# View table structure
.schema trash_reports

# Query data
SELECT * FROM trash_reports LIMIT 5;
```

## 🏗️ Architecture

### Backend Stack
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **SQLite** - Lightweight database
- **Pillow** - Image processing
- **MinIO** - Object storage (optional)

### Frontend Stack
- **Vanilla JavaScript** - No framework dependencies
- **Leaflet** - Interactive maps
- **Bootstrap** - UI components
- **OpenStreetMap** - Map tiles

### Storage Architecture
- **Metadata**: SQLite database (`data/trash_reports.db`)
- **Images**: Local filesystem (`data/images/`) or MinIO
- **Thumbnails**: Auto-generated for performance

## 🔧 Configuration

### Environment Variables
```bash
# Database (optional, defaults to SQLite)
DATABASE_URL=sqlite:///data/trash_reports.db

# MinIO Object Storage (optional, defaults to local storage)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Development vs Production

#### Development (Default)
- SQLite database
- Local file storage
- Single server deployment

#### Production Setup
- PostgreSQL database
- MinIO/S3 object storage
- Load balancer + multiple instances

## 📊 Dirtiness Scoring Algorithm

The app uses a sophisticated algorithm to rank trash locations:

### Base Score
- **Weight factor**: 10 points per kg of trash
- **Volume consideration**: Estimated from image analysis

### Multipliers
- **Sparcity levels**:
  - Low: 1.0x
  - Medium: 1.5x  
  - High: 2.0x

- **Cleanliness levels**:
  - Good: 0.5x
  - Moderate: 1.0x
  - Poor: 1.5x
  - Very Poor: 2.0x

- **Trash type weights**:
  - Organic: 1.5x (attracts pests)
  - Mixed: 1.4x (usually messier)
  - Plastic: 1.2x (visible pollution)
  - Electronic: 1.1x (toxic)
  - Paper: 1.0x (biodegradable)
  - Glass: 0.9x (clean but dangerous)
  - Metal: 0.8x (usually cleaner)

### Combined Score
`Final Score = (Base Score × Sparcity × Cleanliness × Trash Type) / Distance`

This ensures closer, dirtier places rank higher in search results.

## 🧪 Testing

### Manual Testing
1. **Upload test images** with and without GPS data
2. **Search various locations** to test geospatial features
3. **Test form validation** with invalid inputs
4. **Check API endpoints** with curl or Postman

### Automated Test Data
```bash
# Create realistic test dataset
python create_trash_dataset.py create 100

# Test search functionality
curl "http://localhost:8000/api/find-dirty-places?address=New York&limit=3"
```

### Performance Testing
```bash
# Create large dataset
python create_trash_dataset.py create 1000

# Test search performance
time curl "http://localhost:8000/api/find-dirty-places?lat=40.7128&lng=-74.0060"
```

## 🐛 Troubleshooting

### Common Issues

#### "No GPS coordinates found"
- **Solution**: Use the manual location selector or add GPS data to your image

#### "MinIO connection failed"
- **Solution**: App automatically falls back to local storage - no action needed

#### "Database locked"
- **Solution**: Restart the application - SQLite handles concurrent access

#### "Search returns no results"
- **Solution**: Increase search radius or create test data in that area

### Debug Mode
```bash
# Run with debug logging
python app.py --debug

# Check database contents
python create_trash_dataset.py stats
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Follow PEP 8 for Python code
- Use meaningful variable names
- Add docstrings to functions
- Comment complex algorithms

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenStreetMap** for map data
- **Leaflet** for interactive maps
- **FastAPI** for the excellent web framework
- **SQLAlchemy** for database management
- **Bootstrap** for UI components

## 🔮 Future Roadmap

### Short Term
- [ ] User authentication system
- [ ] Mobile-responsive design improvements
- [ ] Batch upload functionality
- [ ] Export data to CSV/JSON

### Medium Term
- [ ] Machine learning for automatic trash classification
- [ ] Real-time notifications for new reports
- [ ] Community cleanup event coordination
- [ ] Environmental impact metrics

### Long Term
- [ ] Mobile app (React Native/Flutter)
- [ ] Integration with city waste management systems
- [ ] Predictive analytics for trash accumulation
- [ ] Gamification and community challenges

---

**Made with ❤️ for a cleaner world** 🌍