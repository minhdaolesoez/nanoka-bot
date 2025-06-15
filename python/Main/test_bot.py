import os
import json

# Test if data folder paths work correctly
def test_data_paths():
    base_dir = os.path.dirname(__file__)
    data_dir = os.path.join(base_dir, "..", "..", "data")
    
    print(f"Base directory: {base_dir}")
    print(f"Data directory: {data_dir}")
    print(f"Data directory exists: {os.path.exists(data_dir)}")
    
    # Test each JSON file
    files = ["warnings.json", "quarantine_channels.json", "counting_channels.json"]
    for file in files:
        file_path = os.path.join(data_dir, file)
        print(f"{file}: {os.path.exists(file_path)}")

if __name__ == "__main__":
    test_data_paths()
