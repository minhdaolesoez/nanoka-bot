import json
import os
from datetime import datetime

WARNINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "warnings.json")


def load_warnings():
    """Load warnings data from JSON file"""
    try:
        with open(WARNINGS_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_warnings(warnings_data):
    """Save warnings data to JSON file"""
    with open(WARNINGS_FILE, "w") as f:
        json.dump(warnings_data, f, indent=2)


def get_user_warnings(user_id):
    """Get warning count for a specific user"""
    warnings_data = load_warnings()
    return warnings_data.get(str(user_id), [])


def add_warning(user_id, moderator_id, reason, guild_id):
    """Add a warning to a user"""
    warnings_data = load_warnings()
    user_id_str = str(user_id)

    if user_id_str not in warnings_data:
        warnings_data[user_id_str] = []

    warning = {
        "moderator_id": moderator_id,
        "reason": reason,
        "timestamp": datetime.now().isoformat(),
        "guild_id": guild_id,
    }

    warnings_data[user_id_str].append(warning)
    save_warnings(warnings_data)
    return len(warnings_data[user_id_str])


def remove_warnings(user_id, amount):
    """Remove a specific amount of warnings from a user"""
    warnings_data = load_warnings()
    user_id_str = str(user_id)

    if user_id_str not in warnings_data or not warnings_data[user_id_str]:
        return 0, 0  # No warnings to remove

    current_warnings = warnings_data[user_id_str]
    original_count = len(current_warnings)

    # Remove the specified amount (from the end, removing most recent first)
    removed_count = min(amount, original_count)
    warnings_data[user_id_str] = (
        current_warnings[:-removed_count] if removed_count > 0 else current_warnings
    )

    save_warnings(warnings_data)
    remaining_count = len(warnings_data[user_id_str])

    return removed_count, remaining_count
