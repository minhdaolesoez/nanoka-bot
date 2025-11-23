import json
import os

QUARANTINE_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "quarantine_channels.json")

def load_quarantine_channels():
    """Tải dữ liệu kênh cách ly từ file JSON, tự tạo file nếu cần và xử lý lỗi giải mã JSON."""
    
    # 1. Đảm bảo thư mục 'data' tồn tại
    data_dir = os.path.dirname(QUARANTINE_FILE)
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    
    # 2. Xử lý file không tồn tại
    if not os.path.exists(QUARANTINE_FILE) or os.stat(QUARANTINE_FILE).st_size == 0:
        try:
            # Tạo file mới với nội dung JSON rỗng hợp lệ: {}
            with open(QUARANTINE_FILE, "w") as f:
                json.dump({}, f)
            print(f"File created/initialized: {QUARANTINE_FILE} with {{}}.")
            return {}
        except Exception as e:
            print(f"Error creating/initializing file {QUARANTINE_FILE}: {e}")
            return {} # Trả về dữ liệu rỗng nếu tạo file thất bại

    # 3. Xử lý lỗi đọc file (JSONDecodeError)
    try:
        with open(QUARANTINE_FILE, "r") as f:
            return json.load(f)
            
    except json.JSONDecodeError:
        # Xử lý trường hợp file tồn tại nhưng bị hỏng JSON
        print(f"Warning: Quarantine data file is corrupt. Overwriting with empty data.")
        # Ghi đè lại đối tượng JSON rỗng hợp lệ để sửa chữa file
        with open(QUARANTINE_FILE, "w") as f:
             json.dump({}, f)
        return {}

def save_quarantine_channels(quarantine_data):
    """Save quarantine channels data to JSON file"""
    with open(QUARANTINE_FILE, "w") as f:
        json.dump(quarantine_data, f, indent=2)


def increment_ban_counter(guild_id):
    """Increment the auto-ban counter for a guild"""
    quarantine_data = load_quarantine_channels()
    guild_str = str(guild_id)

    if guild_str not in quarantine_data:
        quarantine_data[guild_str] = {
            "channels": [],
            "log_channel": None,
            "ban_count": 0,
        }
    elif isinstance(quarantine_data[guild_str], list):
        # Convert old format to new format
        quarantine_data[guild_str] = {
            "channels": quarantine_data[guild_str],
            "log_channel": None,
            "ban_count": 0,
        }
    elif "ban_count" not in quarantine_data[guild_str]:
        # Add ban_count to existing dict format
        quarantine_data[guild_str]["ban_count"] = 0

    quarantine_data[guild_str]["ban_count"] += 1
    save_quarantine_channels(quarantine_data)
    return quarantine_data[guild_str]["ban_count"]


def get_ban_count(guild_id):
    """Get the current auto-ban count for a guild"""
    quarantine_data = load_quarantine_channels()
    guild_str = str(guild_id)

    if guild_str in quarantine_data and isinstance(quarantine_data[guild_str], dict):
        return quarantine_data[guild_str].get("ban_count", 0)
    return 0


def set_log_channel(guild_id, channel_id):
    """Set the log channel for a guild"""
    quarantine_data = load_quarantine_channels()
    guild_str = str(guild_id)

    if guild_str not in quarantine_data:
        quarantine_data[guild_str] = {"channels": [], "log_channel": None}
    elif isinstance(quarantine_data[guild_str], list):
        # Convert old format to new format
        quarantine_data[guild_str] = {
            "channels": quarantine_data[guild_str],
            "log_channel": None,
        }

    quarantine_data[guild_str]["log_channel"] = channel_id
    save_quarantine_channels(quarantine_data)


def get_log_channel(guild_id):
    """Get the log channel for a guild"""
    quarantine_data = load_quarantine_channels()
    guild_str = str(guild_id)

    if guild_str in quarantine_data:
        if isinstance(quarantine_data[guild_str], dict):
            return quarantine_data[guild_str].get("log_channel")
        else:
            # Old format, no log channel set
            return None
    return None


def add_quarantine_channel(guild_id, channel_id):
    """Add a channel as quarantine channel for a guild"""
    quarantine_data = load_quarantine_channels()
    guild_str = str(guild_id)

    if guild_str not in quarantine_data:
        quarantine_data[guild_str] = {"channels": [], "log_channel": None}
    elif isinstance(quarantine_data[guild_str], list):
        # Convert old format to new format
        quarantine_data[guild_str] = {
            "channels": quarantine_data[guild_str],
            "log_channel": None,
        }

    if channel_id not in quarantine_data[guild_str]["channels"]:
        quarantine_data[guild_str]["channels"].append(channel_id)
        save_quarantine_channels(quarantine_data)
        return True
    return False


def is_quarantine_channel(guild_id, channel_id):
    """Check if a channel is a quarantine channel"""
    quarantine_data = load_quarantine_channels()
    guild_str = str(guild_id)

    if guild_str in quarantine_data:
        if isinstance(quarantine_data[guild_str], dict):
            return channel_id in quarantine_data[guild_str]["channels"]
        else:
            # Old format
            return channel_id in quarantine_data[guild_str]
    return False
