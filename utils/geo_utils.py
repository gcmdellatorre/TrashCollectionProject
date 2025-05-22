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
        d, m, s = value
        return d[0]/d[1] + m[0]/m[1]/60 + s[0]/s[1]/3600

    lat = to_degrees(gps_info.get("GPSLatitude", (0, 0, 0)))
    lon = to_degrees(gps_info.get("GPSLongitude", (0, 0, 0)))

    if gps_info.get("GPSLatitudeRef") == "S":
        lat = -lat
    if gps_info.get("GPSLongitudeRef") == "W":
        lon = -lon

    return {"latitude": lat, "longitude": lon}