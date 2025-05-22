import folium
import json

def generate_map(db_path="data/db.json", output_path="data/map.html"):
    with open(db_path, "r") as f:
        db = json.load(f)

    m = folium.Map(location=[0, 0], zoom_start=2)

    for item in db.values():
        if 'latitude' in item and 'longitude' in item:
            folium.Marker(
                location=[item['latitude'], item['longitude']],
                popup=f"{item.get('trash_type', 'Unknown')} - {item.get('estimated_kg', '?')} kg"
            ).add_to(m)

    m.save(output_path)
