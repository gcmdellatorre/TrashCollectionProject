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
