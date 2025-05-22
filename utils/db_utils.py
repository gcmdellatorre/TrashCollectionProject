import json
import os
import uuid

def save_to_db(metadata, file_path, db_path="data/db.json"):
    db = {}
    if os.path.exists(db_path):
        with open(db_path, "r") as f:
            db = json.load(f)

    entry_id = str(uuid.uuid4())
    db[entry_id] = {
        **metadata,
        "file_path": file_path
    }

    with open(db_path, "w") as f:
        json.dump(db, f, indent=4)

def get_all_entries():
    """Retrieve all entries from the database"""
    # This is just a placeholder - implement based on your actual DB setup
    # For a simple test, you might use a simple JSON file or SQLite
    
    # Example with a JSON file:
    import json
    import os
    
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
    # This is just a placeholder - implement based on your actual DB setup
    import json
    import os
    
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