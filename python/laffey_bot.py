import discord  # type: ignore
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv # type: ignore
from discord.ext import commands # type: ignore

load_dotenv()
token = os.getenv("DISCORD_TOKEN")

# Bot setup with slash commands enabled
bot = commands.Bot(command_prefix=".", intents=discord.Intents.all())

# Files to store data
WARNINGS_FILE = "warnings.json"
QUARANTINE_FILE = "quarantine_channels.json"

def load_warnings():
    """Load warnings data from JSON file"""
    try:
        with open(WARNINGS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_warnings(warnings_data):
    """Save warnings data to JSON file"""
    with open(WARNINGS_FILE, 'w') as f:
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
        "guild_id": guild_id
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
    warnings_data[user_id_str] = current_warnings[:-removed_count] if removed_count > 0 else current_warnings
    
    save_warnings(warnings_data)
    remaining_count = len(warnings_data[user_id_str])
    
    return removed_count, remaining_count

def load_quarantine_channels():
    """Load quarantine channels data from JSON file"""
    try:
        with open(QUARANTINE_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_quarantine_channels(quarantine_data):
    """Save quarantine channels data to JSON file"""
    with open(QUARANTINE_FILE, 'w') as f:
        json.dump(quarantine_data, f, indent=2)

def increment_ban_counter(guild_id):
    """Increment the auto-ban counter for a guild"""
    quarantine_data = load_quarantine_channels()
    guild_str = str(guild_id)
    
    if guild_str not in quarantine_data:
        quarantine_data[guild_str] = {"channels": [], "log_channel": None, "ban_count": 0}
    elif isinstance(quarantine_data[guild_str], list):
        # Convert old format to new format
        quarantine_data[guild_str] = {"channels": quarantine_data[guild_str], "log_channel": None, "ban_count": 0}
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
        quarantine_data[guild_str] = {"channels": quarantine_data[guild_str], "log_channel": None}
    
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
        quarantine_data[guild_str] = {"channels": quarantine_data[guild_str], "log_channel": None}
    
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

@bot.event
async def on_ready():
    print(f"Bot logged in as {bot.user}!")
    try:
        # For instant sync to specific guild (replace YOUR_GUILD_ID)
        # guild = discord.Object(id=YOUR_GUILD_ID)
        # synced = await bot.tree.sync(guild=guild)
        
        # For global sync (up to 1 hour delay)
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"Failed to sync commands: {e}")

# Helper function for warn logic
async def warn_user_logic(user, moderator, reason, guild, response_func):
    """Shared logic for warning users (used by both prefix and slash commands)"""
    # Prevent warning bots or yourself
    if user.bot:
        await response_func("❌ You cannot warn bots!")
        return
    
    if user.id == moderator.id:
        await response_func("❌ You cannot warn yourself!")
        return
    
    # Add warning to database
    warning_count = add_warning(user.id, moderator.id, reason, guild.id)
    
    # Create warning embed
    embed = discord.Embed(
        title="⚠️ User Warned",
        color=discord.Color.orange(),
        timestamp=datetime.now()
    )
    embed.add_field(name="User", value=f"{user.mention} ({user})", inline=True)
    embed.add_field(name="Moderator", value=f"{moderator.mention}", inline=True)
    embed.add_field(name="Warning Count", value=f"{warning_count}", inline=True)
    embed.add_field(name="Reason", value=reason, inline=False)
    
    # Log the warning action
    log_channel_id = get_log_channel(guild.id)
    if log_channel_id:
        log_channel = guild.get_channel(log_channel_id)
        if log_channel:
            log_embed = discord.Embed(
                title="⚠️ Warning Issued",
                color=discord.Color.orange(),
                timestamp=datetime.now()
            )
            log_embed.add_field(name="User", value=f"{user.mention} ({user})", inline=True)
            log_embed.add_field(name="Moderator", value=f"{moderator.mention}", inline=True)
            log_embed.add_field(name="Warning Count", value=f"{warning_count}", inline=True)
            log_embed.add_field(name="Reason", value=reason, inline=False)
            await log_channel.send(embed=log_embed)
    
# Auto-timeout and action logic
    action_taken = "Warning issued"
    timeout_duration = None
    kick_user = False

    if warning_count == 2:
        timeout_duration = timedelta(minutes=30)
        action_taken = "⏰ 30 minute timeout applied (2nd warning)"
    elif warning_count == 3:
        timeout_duration = timedelta(hours=3)
        action_taken = "⏰ 3 hour timeout applied (3rd warning)"
    elif warning_count == 4:
        timeout_duration = timedelta(days=7)
        action_taken = "⏰ 7 day timeout applied (4th warning)"
    elif warning_count >= 5:
        kick_user = True
        action_taken = "🚫 User kicked (5th warning)"

# Then apply punishment
    if timeout_duration:
        try:
            await user.timeout(timeout_duration, reason=f"Auto-timeout: {warning_count} warnings")
            embed.add_field(name="Action Taken", value=action_taken, inline=False)
            embed.color = discord.Color.red()
            
            # Log the timeout action
            if log_channel_id:
                log_channel = guild.get_channel(log_channel_id)
                if log_channel:
                    timeout_embed = discord.Embed(
                        title="⏰ Auto-Timeout Applied",
                        color=discord.Color.red(),
                        timestamp=datetime.now()
                    )
                    timeout_embed.add_field(name="User", value=f"{user.mention} ({user})", inline=True)
                    timeout_embed.add_field(name="Moderator", value="Auto-moderation", inline=True)
                    timeout_embed.add_field(name="Duration", value=str(timeout_duration), inline=True)
                    timeout_embed.add_field(name="Reason", value=f"Auto-timeout: {warning_count} warnings", inline=False)
                    await log_channel.send(embed=timeout_embed)
                    
        except discord.Forbidden:
            embed.add_field(name="⚠️ Error", value="Could not apply timeout - insufficient permissions", inline=False)
        except Exception as e:
            embed.add_field(name="⚠️ Error", value=f"Failed to apply timeout: {str(e)}", inline=False)
    elif kick_user:
        try:
            await user.kick(reason=f"Auto-kick: {warning_count} warnings")
            embed.add_field(name="Action Taken", value=action_taken, inline=False)
            embed.color = discord.Color.red()
            
            # Log the kick action
            if log_channel_id:
                log_channel = guild.get_channel(log_channel_id)
                if log_channel:
                    kick_embed = discord.Embed(
                        title="🚫 Auto-Kick Applied",
                        color=discord.Color.red(),
                        timestamp=datetime.now()
                    )
                    kick_embed.add_field(name="User", value=f"{user.mention} ({user})", inline=True)
                    kick_embed.add_field(name="Moderator", value="Auto-moderation", inline=True)
                    kick_embed.add_field(name="Reason", value=f"Auto-kick: {warning_count} warnings", inline=False)
                    await log_channel.send(embed=kick_embed)
                    
        except discord.Forbidden:
            embed.add_field(name="⚠️ Error", value="Could not kick user - insufficient permissions", inline=False)
        except Exception as e:
            embed.add_field(name="⚠️ Error", value=f"Failed to kick user: {str(e)}", inline=False)

    await response_func(embed=embed)

# Helper function for warnings check logic
async def check_warnings_logic(user, moderator, response_func, ephemeral=False):
    """Shared logic for checking warnings (used by both prefix and slash commands)"""
    warnings = get_user_warnings(user.id)
    
    embed = discord.Embed(
        title=f"📋 Warnings for {user.display_name}",
        color=discord.Color.blue(),
        timestamp=datetime.now()
    )
    embed.set_thumbnail(url=user.display_avatar.url)
    
    if not warnings:
        embed.description = "This user has no warnings."
        embed.color = discord.Color.green()
    else:
        embed.description = f"Total warnings: **{len(warnings)}**"
        
        # Show last 5 warnings
        recent_warnings = warnings[-5:]
        for i, warning in enumerate(recent_warnings, 1):
            moderator_user = bot.get_user(warning['moderator_id'])
            mod_name = moderator_user.display_name if moderator_user else "Unknown Moderator"
            
            # Parse timestamp
            warning_time = datetime.fromisoformat(warning['timestamp'])
            time_str = warning_time.strftime("%Y-%m-%d %H:%M UTC")
            
            embed.add_field(
                name=f"Warning {len(warnings) - len(recent_warnings) + i}",
                value=f"**Reason:** {warning['reason']}\n**Moderator:** {mod_name}\n**Date:** {time_str}",
                inline=False
            )
        
        if len(warnings) > 5:
            embed.set_footer(text=f"Showing latest 5 of {len(warnings)} warnings")
    
    if ephemeral:
        await response_func(embed=embed, ephemeral=True)
    else:
        await response_func(embed=embed)

# Helper function for remove warnings logic
async def remove_warnings_logic(user, moderator, guild, amount, response_func, ephemeral=False):
    """Shared logic for removing specific amount of warnings"""
    removed, remaining = remove_warnings(user.id, amount)
    
    if removed == 0:
        error_msg = f"❌ {user.display_name} has no warnings to remove!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return
    
    embed = discord.Embed(
        title="🗑️ Warnings Removed",
        description=f"Removed **{removed}** warning(s) from {user.mention}",
        color=discord.Color.yellow(),
        timestamp=datetime.now()
    )
    embed.add_field(name="Moderator", value=moderator.mention, inline=True)
    embed.add_field(name="Remaining Warnings", value=f"{remaining}", inline=True)
    
    # Log the warning removal action
    log_channel_id = get_log_channel(guild.id)
    if log_channel_id:
        log_channel = guild.get_channel(log_channel_id)
        if log_channel:
            log_embed = discord.Embed(
                title="🗑️ Warnings Removed",
                color=discord.Color.yellow(),
                timestamp=datetime.now()
            )
            log_embed.add_field(name="User", value=f"{user.mention} ({user})", inline=True)
            log_embed.add_field(name="Moderator", value=moderator.mention, inline=True)
            log_embed.add_field(name="Removed", value=f"{removed}", inline=True)
            log_embed.add_field(name="Remaining", value=f"{remaining}", inline=True)
            await log_channel.send(embed=log_embed)
    
    if ephemeral:
        await response_func(embed=embed, ephemeral=True)
    else:
        await response_func(embed=embed)

async def clear_warnings_logic(user, moderator, guild, response_func, ephemeral=False):
    """Shared logic for clearing warnings (used by both prefix and slash commands)"""
    warnings_data = load_warnings()
    user_id_str = str(user.id)
    
    if user_id_str not in warnings_data or not warnings_data[user_id_str]:
        error_msg = f"❌ {user.display_name} has no warnings to clear!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return
    
    old_count = len(warnings_data[user_id_str])
    warnings_data[user_id_str] = []
    save_warnings(warnings_data)
    
    embed = discord.Embed(
        title="🗑️ Warnings Cleared",
        description=f"Cleared **{old_count}** warning(s) for {user.mention}",
        color=discord.Color.green(),
        timestamp=datetime.now()
    )
    embed.add_field(name="Moderator", value=moderator.mention, inline=True)
    
    # Log the warning clearing action
    log_channel_id = get_log_channel(guild.id)
    if log_channel_id:
        log_channel = guild.get_channel(log_channel_id)
        if log_channel:
            log_embed = discord.Embed(
                title="🗑️ Warnings Cleared",
                color=discord.Color.green(),
                timestamp=datetime.now()
            )
            log_embed.add_field(name="User", value=f"{user.mention} ({user})", inline=True)
            log_embed.add_field(name="Moderator", value=moderator.mention, inline=True)
            log_embed.add_field(name="Cleared", value=f"{old_count}", inline=True)
            await log_channel.send(embed=log_embed)
    
    if ephemeral:
        await response_func(embed=embed, ephemeral=True)
    else:
        await response_func(embed=embed)

# Helper function for remove timeout logic
async def remove_timeout_logic(user, moderator, response_func, ephemeral=False):
    """Shared logic for removing timeouts (used by both prefix and slash commands)"""
    # Check if user is actually timed out
    if user.timed_out_until is None:
        error_msg = f"❌ {user.display_name} is not currently timed out!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return
    
    try:
        # Remove timeout by setting it to None
        await user.timeout(None, reason=f"Timeout removed by {moderator}")
        
        # Send confirmation to moderator
        embed = discord.Embed(
            title="⏰ Timeout Removed",
            description=f"Timeout removed for {user.mention}",
            color=discord.Color.green(),
            timestamp=datetime.now()
        )
        embed.add_field(name="Moderator", value=moderator.mention, inline=True)
        embed.add_field(name="User", value=f"{user.mention} ({user})", inline=True)
        
        # Log the timeout removal action
        log_channel_id = get_log_channel(moderator.guild.id)
        if log_channel_id:
            log_channel = moderator.guild.get_channel(log_channel_id)
            if log_channel:
                log_embed = discord.Embed(
                    title="⏰ Timeout Removed",
                    color=discord.Color.green(),
                    timestamp=datetime.now()
                )
                log_embed.add_field(name="User", value=f"{user.mention} ({user})", inline=True)
                log_embed.add_field(name="Moderator", value=moderator.mention, inline=True)
                log_embed.add_field(name="Reason", value=f"Timeout removed by {moderator}", inline=False)
                await log_channel.send(embed=log_embed)
        
        if ephemeral:
            await response_func(embed=embed, ephemeral=True)
        else:
            await response_func(embed=embed)
            
    except discord.Forbidden:
        error_msg = "❌ Could not remove timeout - insufficient permissions!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
    except Exception as e:
        error_msg = f"❌ Failed to remove timeout: {str(e)}"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)

async def setup_quarantine_channel(guild, moderator, response_func, category_name="Moderation", ephemeral=False):
    """Setup quarantine channel with proper permissions"""
    
    # First, check if we have the necessary permissions
    if not guild.me.guild_permissions.manage_channels:
        error_msg = "❌ I don't have permission to create channels!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None
        
    # Create or find a category for moderation channels
    category = None
    for existing_category in guild.categories:
        if existing_category.name.lower() == category_name.lower():
            category = existing_category
            break
    
    if not category:
        # Create a new category
        try:
            category = await guild.create_category(category_name)
        except discord.Forbidden:
            error_msg = "❌ I don't have permission to create categories!"
            if ephemeral:
                await response_func(error_msg, ephemeral=True)
            else:
                await response_func(error_msg)
            return None
    
    # Create quarantine channel with proper permissions
    quarantine_channel = None
    try:
        everyone_role = guild.default_role
        quarantine_overwrites = {
            everyone_role: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=False, # Prevent everyone from sending messages
                create_public_threads=False,
                create_private_threads=False,
                send_messages_in_threads=False,
                attach_files=False,
                add_reactions=False, 
                use_application_commands=False
            ),
            guild.me: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                embed_links=True,
                attach_files=True,
                manage_messages=True
            )
        }
        
        quarantine_channel = await guild.create_text_channel(
            name="quarantine-zone", 
            category=category,
            overwrites=quarantine_overwrites,
            topic="Quarantine channel. Any non-moderator who sends a message here will be automatically banned." # Restored topic
        )
        
        # Add channel to the database
        add_quarantine_channel(guild.id, quarantine_channel.id)
        
        # Create a warning message in the quarantine channel
        warning_embed = discord.Embed(
            title="⚠️ QUARANTINE ZONE - WARNING ⚠️",
            description="**This is a quarantine channel. Do not send messages here unless you're a moderator.**", # Restored description
            color=discord.Color.red() # Restored color
        )
        warning_embed.add_field(
            name="⚠️ Automatic Ban Warning",
            value="Any non-moderator who sends a message here will be **automatically banned**!", # Restored warning
            inline=False
        )
        warning_embed.add_field(
            name="Purpose",
            value="This channel is used by moderators to segregate problematic content and ban violators.", # Restored purpose
            inline=False
        )
        warning_embed.set_footer(text=f"Channel created by {moderator}")
        
        await quarantine_channel.send(embed=warning_embed)
    
        # Send success message
        embed = discord.Embed(
            title="🚫 Quarantine Channel Setup Complete", 
            description=f"Successfully set up quarantine channel: {quarantine_channel.mention}. Non-moderators posting here will be banned.",
            color=discord.Color.red(), # Restored color
            timestamp=datetime.now()
        )
        embed.add_field(name="Moderator", value=moderator.mention, inline=True)
        
        if ephemeral:
            await response_func(embed=embed, ephemeral=True)
        else:
            await response_func(embed=embed)
        
    except discord.Forbidden:
        error_msg = "❌ I don't have permission to create or configure the quarantine channel!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None
    
    return quarantine_channel

async def setup_log_channel(guild, moderator, response_func, category_name="Moderation", ephemeral=False):
    """Setup log channel with proper permissions"""
    
    # First, check if we have the necessary permissions
    if not guild.me.guild_permissions.manage_channels:
        error_msg = "❌ I don't have permission to create channels!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None
        
    # Create or find a category for moderation channels
    category = None
    for existing_category in guild.categories:
        if existing_category.name.lower() == category_name.lower():
            category = existing_category
            break
    
    if not category:
        # Create a new category
        try:
            category = await guild.create_category(category_name)
        except discord.Forbidden:
            error_msg = "❌ I don't have permission to create categories!"
            if ephemeral:
                await response_func(error_msg, ephemeral=True)
            else:
                await response_func(error_msg)
            return None
    
    # Create logs channel
    log_channel = None
    try:
        everyone_role = guild.default_role
        log_overwrites = {
            everyone_role: discord.PermissionOverwrite(
                view_channel=True, # Allow everyone to view the log channel
                send_messages=False,
                create_public_threads=False,
                create_private_threads=False,
                send_messages_in_threads=False,
                attach_files=False,
                add_reactions=False, # Typically, users shouldn't react to logs
                use_application_commands=False # Prevent slash commands from being used by @everyone
            ),
            guild.me: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                embed_links=True,
                attach_files=True
            )
        }
        
        log_channel = await guild.create_text_channel(
            name="mod-logs",
            category=category,
            overwrites=log_overwrites,
            topic="Moderation logs channel. All moderation actions are recorded here. Visible to everyone, read-only." # Updated topic
        )
        
        # Set as log channel in database
        set_log_channel(guild.id, log_channel.id)
        
        # Send success message
        embed = discord.Embed(
            title="📝 Log Channel Setup Complete",
            description=f"Successfully set up log channel: {log_channel.mention}. It is visible to everyone (read-only).",
            color=discord.Color.blue(),
            timestamp=datetime.now()
        )
        embed.add_field(name="Moderator", value=moderator.mention, inline=True)
        embed.add_field(
            name="Information",
            value="All moderation actions will be logged in this channel.",
            inline=False
        )
        
        if ephemeral:
            await response_func(embed=embed, ephemeral=True)
        else:
            await response_func(embed=embed)
        
    except discord.Forbidden:
        error_msg = "❌ I don't have permission to create or configure the log channel!"
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None
    
    return log_channel

# SLASH COMMANDS
@bot.tree.command(name="warn", description="Warn a user")
async def warn_slash(interaction: discord.Interaction, user: discord.Member, reason: str):
    # Check if user has permission to warn
    if not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message("❌ You don't have permission to warn users!", ephemeral=True)
        return
    
    await warn_user_logic(user, interaction.user, reason, interaction.guild, interaction.response.send_message)

@bot.tree.command(name="warnings", description="Check warnings for a user")
async def warnings_slash(interaction: discord.Interaction, user: discord.Member = None):
    # Default to command user if no user specified
    if user is None:
        user = interaction.user
    
    # Check permissions - users can check their own warnings, moderators can check anyone's
    if user.id != interaction.user.id and not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message("❌ You can only check your own warnings, or you need moderator permissions to check other users' warnings!", ephemeral=True)
        return
    
    await check_warnings_logic(user, interaction.user, interaction.response.send_message, ephemeral=True)

@bot.tree.command(name="removewarnings", description="Remove a specific amount of warnings from a user")
async def removewarnings_slash(interaction: discord.Interaction, user: discord.Member, amount: int):
    # Check permissions (moderators can remove warnings)
    if not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message("❌ You need to be a moderator to remove warnings!", ephemeral=True)
        return
    
    if amount <= 0:
        await interaction.response.send_message("❌ Amount must be a positive number!", ephemeral=True)
        return
    
    await remove_warnings_logic(user, interaction.user, interaction.guild, amount, interaction.response.send_message, ephemeral=True)

@bot.tree.command(name="clearwarnings", description="Clear all warnings for a user")
async def clearwarnings_slash(interaction: discord.Interaction, user: discord.Member):
    # Check permissions (only admins can clear warnings)
    if not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message("❌ You need to be a moderator to clear warnings!", ephemeral=True)
        return
    
    await clear_warnings_logic(user, interaction.user, interaction.guild, interaction.response.send_message, ephemeral=True)

@bot.tree.command(name="setupquarantine", description="Setup quarantine channel (auto-bans non-moderators who post)")
async def setupquarantine_slash(interaction: discord.Interaction, category_name: str = "Moderation"):
    """Setup quarantine channel with slash command"""
    # Check for specific permissions instead of administrator
    if not (interaction.user.guild_permissions.manage_channels and interaction.user.guild_permissions.manage_roles):
        await interaction.response.send_message("❌ You need 'Manage Channels' and 'Manage Roles' permissions to set up a quarantine channel!", ephemeral=True)
        return
    
    await setup_quarantine_channel(interaction.guild, interaction.user, interaction.response.send_message, category_name, ephemeral=True)

@bot.tree.command(name="setuplog", description="Setup log channel for moderation actions")
async def setuplog_slash(interaction: discord.Interaction, category_name: str = "Moderation"):
    """Setup log channel with slash command"""
    # Check for specific permissions instead of administrator
    if not (interaction.user.guild_permissions.manage_channels and interaction.user.guild_permissions.manage_roles):
        await interaction.response.send_message("❌ You need 'Manage Channels' and 'Manage Roles' permissions to set up a log channel!", ephemeral=True)
        return
    
    await setup_log_channel(interaction.guild, interaction.user, interaction.response.send_message, category_name, ephemeral=True)

@bot.tree.command(name="removetimeout", description="Remove timeout from a user")
async def removetimeout_slash(interaction: discord.Interaction, user: discord.Member):
    # Check permissions (moderators can remove timeouts)
    if not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message("❌ You need to be a moderator to remove timeouts!", ephemeral=True)
        return
    
    await remove_timeout_logic(user, interaction.user, interaction.response.send_message, ephemeral=True)

# Error handling for slash commands
@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: discord.app_commands.AppCommandError):
    if isinstance(error, discord.app_commands.MissingPermissions):
        await interaction.response.send_message("❌ You don't have permission to use this command!", ephemeral=True)
    else:
        await interaction.response.send_message("❌ An error occurred while processing the command.", ephemeral=True)
        print(f"Command error: {error}")

@bot.event
async def on_message(message):
    # Ignore bot messages
    if message.author.bot:
        return
    
    # Check if message is in a quarantine channel
    if message.guild and is_quarantine_channel(message.guild.id, message.channel.id):
        # Check if user is a moderator (has kick_members permission)
        if not message.author.guild_permissions.kick_members:
            try:
                # Delete the message first
                await message.delete()
                
                # Clear all messages in the channel from this user
                async for msg in message.channel.history(limit=100):
                    if msg.author == message.author and not msg.author.bot:
                        try:
                            await msg.delete()
                        except:
                            pass
                
                # Ban the user
                await message.author.ban(reason="Posted in quarantine channel")
                
                # Increment ban counter
                ban_count = increment_ban_counter(message.guild.id)
                
                # Create detailed log embed with comprehensive user information
                embed = discord.Embed(
                    title="🚫 User Auto-Banned",
                    description=f"{message.author.mention} was automatically banned for posting in quarantine channel",
                    color=discord.Color.red(),
                    timestamp=datetime.now()
                )
                
                # Basic user information
                embed.add_field(name="👤 User", value=f"{message.author} ({message.author.id})", inline=True)
                embed.add_field(name="📝 Display Name", value=message.author.display_name, inline=True)
                embed.add_field(name="🏷️ Username", value=f"@{message.author.name}", inline=True)
                
                # Account information
                embed.add_field(name="📅 Account Created", value=f"<t:{int(message.author.created_at.timestamp())}:F>", inline=True)
                embed.add_field(name="📥 Joined Server", value=f"<t:{int(message.author.joined_at.timestamp())}:F>" if message.author.joined_at else "Unknown", inline=True)
                embed.add_field(name="🆔 User ID", value=f"`{message.author.id}`", inline=True)
                
                # Channel and message information
                embed.add_field(name="📍 Channel", value=message.channel.mention, inline=True)
                embed.add_field(name="🏠 Guild", value=f"{message.guild.name} (`{message.guild.id}`)", inline=True)
                embed.add_field(name="🕒 Message Time", value=f"<t:{int(message.created_at.timestamp())}:F>", inline=True)
                
                # Message content (with length limit)
                message_content = message.content if message.content else "*No text content*"
                if len(message_content) > 1000:
                    message_content = message_content[:1000] + "..."
                embed.add_field(name="💬 Message Content", value=f"```{message_content}```", inline=False)
                
                # User roles (excluding @everyone)
                user_roles = [role.mention for role in message.author.roles if role != message.guild.default_role]
                if user_roles:
                    roles_text = ", ".join(user_roles[:10])  # Limit to first 10 roles
                    if len(user_roles) > 10:
                        roles_text += f" and {len(user_roles) - 10} more..."
                    embed.add_field(name="🎭 Roles", value=roles_text, inline=False)
                else:
                    embed.add_field(name="🎭 Roles", value="No roles", inline=False)
                
                # Additional user information
                embed.add_field(name="🤖 Bot Account", value="Yes" if message.author.bot else "No", inline=True)
                
                # Check if user is on mobile (fix the mobile status check)
                is_mobile = "Unknown"
                if hasattr(message.author, 'mobile_status') and message.author.mobile_status != discord.Status.offline:
                    is_mobile = "Yes"
                elif hasattr(message.author, 'mobile_status'):
                    is_mobile = "No"
                embed.add_field(name="📱 Mobile", value=is_mobile, inline=True)
                
                # Check mutual guilds (this may not be available for all users)
                mutual_guilds_count = "Unknown"
                try:
                    if hasattr(message.author, 'mutual_guilds'):
                        mutual_guilds_count = f"{len(message.author.mutual_guilds)} servers"
                except:
                    pass
                embed.add_field(name="👥 Mutual Servers", value=mutual_guilds_count, inline=True)
                
                # User avatar
                if message.author.avatar:
                    embed.set_thumbnail(url=message.author.avatar.url)
                
                # Footer with additional context
                embed.set_footer(text=f"Auto-ban executed • Message ID: {message.id}")
                
                # Send to log channel if set, otherwise do not log
                log_channel_id = get_log_channel(message.guild.id)
                if log_channel_id:
                    log_channel = message.guild.get_channel(log_channel_id)
                    if log_channel:
                        await log_channel.send(embed=embed)
                
                # Update ban counter in quarantine channel
                counter_embed = discord.Embed(
                    title="📊 Auto-Ban Counter Updated",
                    description=f"**Total Auto-Bans: {ban_count}**",
                    color=discord.Color.dark_red(),
                    timestamp=datetime.now()
                )
                counter_embed.add_field(name="Latest Ban", value=f"{message.author.mention} (`{message.author.id}`)", inline=False)
                counter_embed.set_footer(text=f"Ban #{ban_count}")
                
                await message.channel.send(embed=counter_embed)
                
            except discord.Forbidden:
                # If bot can't ban, send error message
                embed = discord.Embed(
                    title="⚠️ Quarantine Channel Alert",
                    description=f"{message.author.mention} posted in quarantine channel but I couldn't ban them!",
                    color=discord.Color.orange()
                )
                await message.channel.send(embed=embed)
            except Exception as e:
                print(f"Error in quarantine channel handler: {e}")
    
    # Process commands
    await bot.process_commands(message)

# Run the bot
bot.run(token)