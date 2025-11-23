import json
import discord # type: ignore
import os
from datetime import datetime

COUNTING_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "counting_channels.json")

def initialize_counting_file():
    """Tạo file JSON mặc định với nội dung {} nếu nó chưa tồn tại."""
    if not os.path.exists(COUNTING_FILE):
        try:
            # Đảm bảo thư mục 'data' tồn tại trước khi tạo file
            data_dir = os.path.dirname(COUNTING_FILE)
            if not os.path.exists(data_dir):
                os.makedirs(data_dir)
                
            with open(COUNTING_FILE, "w") as f:
                json.dump({}, f)  # Ghi đối tượng JSON rỗng vào file
            print(f"File created: {COUNTING_FILE} initialized with {{}}.")
        except Exception as e:
            print(f"Error creating file {COUNTING_FILE}: {e}")

def load_counting_channels():
    """Load counting channels data from JSON file"""
    try:
        with open(COUNTING_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        # Handle case where file exists but is empty or contains invalid JSON
        print(f"Warning: Counting data file found but is empty or corrupt. Starting with empty data: {COUNTING_FILE}")
        return {}

def save_counting_channels(counting_data):
    """Save counting channels data to JSON file"""
    with open(COUNTING_FILE, "w") as f:
        json.dump(counting_data, f, indent=2)

def add_counting_channel(guild_id, channel_id):
    """Add a channel as counting channel for a guild"""
    counting_data = load_counting_channels()
    guild_str = str(guild_id)
    
    if guild_str not in counting_data:
        counting_data[guild_str] = {
            "channel_id": None,
            "current_number": 0,
            "last_user_id": None,
            "high_score": 0,
            "total_counts": 0,
            "user_stats": {}
        }
    
    counting_data[guild_str]["channel_id"] = channel_id
    save_counting_channels(counting_data)
    return True

def get_counting_channel(guild_id):
    """Get the counting channel for a guild"""
    counting_data = load_counting_channels()
    guild_str = str(guild_id)
    
    if guild_str in counting_data:
        return counting_data[guild_str].get("channel_id")
    return None

def is_counting_channel(guild_id, channel_id):
    """Check if a channel is the counting channel for a guild"""
    counting_data = load_counting_channels()
    guild_str = str(guild_id)
    
    if guild_str in counting_data:
        return counting_data[guild_str].get("channel_id") == channel_id
    return False

async def setup_counting_channel(guild, moderator, response_func, category_name="Fun", ephemeral=False):
    """Setup counting channel with proper permissions"""
    
    # Check if we have the necessary permissions
    if not guild.me.guild_permissions.manage_channels:
        error_msg = "❌ I don't have permission to create channels!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None

    # Create or find a category for fun channels
    category = None
    for existing_category in guild.categories:
        if existing_category.name.lower() == category_name.lower():
            category = existing_category
            break

    if not category:
        try:
            category = await guild.create_category(category_name)
        except discord.Forbidden:
            error_msg = "❌ I don't have permission to create categories!"
            if ephemeral:
                await response_func(error_msg, ephemeral=True)
            else:
                await response_func(error_msg)
            return None

    # Create counting channel
    counting_channel = None
    try:
        everyone_role = guild.default_role
        counting_overwrites = {
            everyone_role: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                create_public_threads=False,
                create_private_threads=False,
                send_messages_in_threads=False,
                attach_files=False,
                add_reactions=False,
                use_application_commands=False,
            ),
            guild.me: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                embed_links=True,
                attach_files=True,
                manage_messages=True,
                add_reactions=True,
            ),
        }

        counting_channel = await guild.create_text_channel(
            name="counting",
            category=category,
            overwrites=counting_overwrites,
            topic="Count numbers in order! Start with 1. Don't count twice in a row!",
        )

        # Add channel to the database
        add_counting_channel(guild.id, counting_channel.id)

        # Create initial message in the counting channel
        initial_embed = discord.Embed(
            title="🔢 Counting Channel",
            description="Welcome to the counting channel! Here's how it works:",
            color=discord.Color.blue(),
        )
        initial_embed.add_field(
            name="📋 Rules",
            value="• Count in order starting from 1\n• Don't count twice in a row\n• Numbers can have text/symbols after them\n• Use 'resetnum' to manually reset",
            inline=False,
        )
        initial_embed.add_field(
            name="🎯 Goal",
            value="Try to reach the highest number possible as a server!",
            inline=False,
        )
        initial_embed.set_footer(text=f"Channel created by {moderator} • Start counting with '1'!")

        await counting_channel.send(embed=initial_embed)

        # Send success message
        embed = discord.Embed(
            title="🔢 Counting Channel Setup Complete",
            description=f"Successfully set up counting channel: {counting_channel.mention}",
            color=discord.Color.green(),
            timestamp=datetime.now(),
        )
        embed.add_field(name="Moderator", value=moderator.mention, inline=True)
        embed.add_field(name="Next Number", value="1", inline=True)

        if ephemeral:
            await response_func(embed=embed, ephemeral=True)
        else:
            await response_func(embed=embed)

    except discord.Forbidden:
        error_msg = "❌ I don't have permission to create or configure the counting channel!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None

    return counting_channel

async def setup_counting_in_existing_channel(channel, moderator, response_func, ephemeral=False):
    """Setup counting in an existing channel"""
    
    # Check if we have the necessary permissions in this channel
    if not channel.permissions_for(channel.guild.me).manage_messages:
        error_msg = "❌ I don't have permission to manage messages in that channel!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None

    if not channel.permissions_for(channel.guild.me).add_reactions:
        error_msg = "❌ I don't have permission to add reactions in that channel!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None

    try:
        # Add channel to the database
        add_counting_channel(channel.guild.id, channel.id)

        # Create initial message in the counting channel
        initial_embed = discord.Embed(
            title="🔢 Counting Channel Setup",
            description="This channel has been set up for counting! Here's how it works:",
            color=discord.Color.blue(),
        )
        initial_embed.add_field(
            name="📋 Rules",
            value="• Count in order starting from 1\n• Don't count twice in a row\n• Numbers can have text/symbols after them\n• Use 'resetnum' to manually reset",
            inline=False,
        )
        initial_embed.add_field(
            name="🎯 Goal",
            value="Try to reach the highest number possible as a server!",
            inline=False,
        )
        initial_embed.set_footer(text=f"Channel configured by {moderator} • Start counting with '1'!")

        await channel.send(embed=initial_embed)

        # Send success message
        embed = discord.Embed(
            title="🔢 Counting Setup Complete",
            description=f"Successfully set up counting in {channel.mention}",
            color=discord.Color.green(),
            timestamp=datetime.now(),
        )
        embed.add_field(name="Moderator", value=moderator.mention, inline=True)
        embed.add_field(name="Channel", value=channel.mention, inline=True)
        embed.add_field(name="Next Number", value="1", inline=True)

        if ephemeral:
            await response_func(embed=embed, ephemeral=True)
        else:
            await response_func(embed=embed)

    except discord.Forbidden:
        error_msg = "❌ I don't have permission to send messages in that channel!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None
    except Exception as e:
        error_msg = f"❌ Failed to setup counting in that channel: {str(e)}"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None

    return channel
