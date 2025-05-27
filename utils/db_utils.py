import json
import os
import uuid

def get_all_entries():
    """Retrieve all entries from the database"""
    db_file = "data/trash_data.json"
    if not os.path.exists(db_file):
        return []
    
    try:
        with open(db_file, "r") as f:
            entries = json.load(f)
        return entries
    except Exception as e:
        print(f"Error reading database: {e}")
        return []

def save_to_db(metadata, file_path):
    """Save metadata to the database"""
    db_file = "data/trash_data.json"
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    
    # Read existing data
    entries = []
    if os.path.exists(db_file):
        try:
            with open(db_file, "r") as f:
                entries = json.load(f)
        except:
            entries = []
    
    # Add new entry
    metadata["file_path"] = file_path
    entries.append(metadata)
    
    # Write updated data
    with open(db_file, "w") as f:
        json.dump(entries, f, indent=2)
    
    print(f"Saved entry to database: {metadata}")