from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import datetime

def extract_metadata(image_path):
    image = Image.open(image_path)
    exif_data = image._getexif() or {}
    metadata = {}

    for tag, value in exif_data.items():
        tag_name = TAGS.get(tag, tag)
        if tag_name == "DateTimeOriginal":
            metadata["timestamp"] = str(value)
        elif tag_name == "GPSInfo":
            gps_info = {}
            for key in value:
                decode = GPSTAGS.get(key, key)
                gps_info[decode] = value[key]
            metadata.update(parse_gps_info(gps_info))

    return metadata

def parse_gps_info(gps_info):
    def to_degrees(value):
        """Converts a GPS coordinate value to degrees."""
        if isinstance(value, (int, float)):
            return float(value)
        if hasattr(value, 'numerator') and hasattr(value, 'denominator'):
             # It's a single IFDRational object
            return float(value.numerator) / float(value.denominator)
        if isinstance(value, tuple) and len(value) == 3:
            # It's a tuple of IFDRational objects (D, M, S)
            d, m, s = value
            
            # Helper to convert each part, which can be a number or a rational
            def convert_part(part):
                if isinstance(part, (int, float)):
                    return float(part)
                if hasattr(part, 'numerator') and hasattr(part, 'denominator'):
                    return float(part.numerator) / float(part.denominator)
                if isinstance(part, tuple) and len(part) == 2: # Should be IFDRational
                    return float(part[0]) / float(part[1])
                return 0 # Default case
                
            degrees = convert_part(d)
            minutes = convert_part(m)
            seconds = convert_part(s)
            
            return degrees + (minutes / 60.0) + (seconds / 3600.0)
        return 0 # Return 0 for any other unexpected format

    # Handle cases where GPS info might be missing or in an unexpected format
    lat_val = gps_info.get("GPSLatitude")
    lon_val = gps_info.get("GPSLongitude")

    if not lat_val or not lon_val:
        return {}

    lat = to_degrees(lat_val)
    lon = to_degrees(lon_val)

    if gps_info.get("GPSLatitudeRef") == "S":
        lat = -lat
    if gps_info.get("GPSLongitudeRef") == "W":
        lon = -lon

    return {"latitude": lat, "longitude": lon}