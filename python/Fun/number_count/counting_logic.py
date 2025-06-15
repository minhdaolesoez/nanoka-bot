import json
import discord  # type: ignore
import re
from counting_setup import load_counting_channels, save_counting_channels, is_counting_channel

def extract_first_number(text):
    """Extract the first number from text, handling various separators and formats"""
    # Remove leading/trailing whitespace
    text = text.strip()
    
    # Look for the first sequence of digits at the start of the message
    # This regex finds digits at the beginning, potentially followed by separators
    match = re.match(r'^(\d+)', text)
    
    if match:
        return int(match.group(1))
    
    return None

async def handle_counting_message(message):
    """Handle messages in counting channels"""
    if not message.guild or message.author.bot:
        return
    
    if not is_counting_channel(message.guild.id, message.channel.id):
        return
    
    # Load counting data
    counting_data = load_counting_channels()
    guild_str = str(message.guild.id)
    
    if guild_str not in counting_data:
        return
    
    guild_data = counting_data[guild_str]
    current_number = guild_data.get("current_number", 0)
    last_user_id = guild_data.get("last_user_id")
    
    # Check for reset phrases first
    if message.content.strip().lower() in ["resetnum", "resetnum"]:
        # Reset counting
        guild_data["current_number"] = 0
        guild_data["last_user_id"] = None
        save_counting_channels(counting_data)
        
        embed = discord.Embed(
            title="🔄 Counting Reset!",
            description=f"Counting has been manually reset by {message.author.mention}. Next number: **1**",
            color=discord.Color.orange(),
        )
        embed.add_field(name="Previous Count", value=f"{current_number}", inline=True)
        embed.add_field(name="High Score", value=f"{guild_data.get('high_score', 0)}", inline=True)
        
        await message.channel.send(embed=embed)
        return
    
    # Extract the first number from the message
    user_number = extract_first_number(message.content)
    
    if user_number is None:
        # No valid number found, delete the message and send warning
        try:
            await message.delete()
            warning_msg = await message.channel.send(f"❌ {message.author.mention}, no valid number found! Current number: **{current_number + 1}**")
            # Auto-delete the warning message after 5 seconds
            await warning_msg.delete(delay=5)
        except:
            pass
        return
    
    expected_number = current_number + 1
    correct_number = user_number == expected_number
    same_user = last_user_id == message.author.id
    
    if correct_number and not same_user:
        # Correct number and different user - success!
        try:
            await message.add_reaction("<a:tick:1382402150365397022>")
        except:
            pass
        
        # Update counting data
        guild_data["current_number"] = user_number
        guild_data["last_user_id"] = message.author.id
        guild_data["total_counts"] = guild_data.get("total_counts", 0) + 1
        
        # Update high score
        if user_number > guild_data.get("high_score", 0):
            guild_data["high_score"] = user_number
            
            # Celebrate new high score
            if user_number % 10 == 0 or user_number > 50:
                embed = discord.Embed(
                    title="🎉 New High Score!",
                    description=f"Congratulations! The server reached **{user_number}**!",
                    color=discord.Color.gold(),
                )
                embed.add_field(name="Achievement by", value=message.author.mention, inline=True)
                await message.channel.send(embed=embed)
        
        # Update user stats
        user_stats = guild_data.get("user_stats", {})
        user_id_str = str(message.author.id)
        if user_id_str not in user_stats:
            user_stats[user_id_str] = {"correct": 0, "failed": 0}
        user_stats[user_id_str]["correct"] += 1
        guild_data["user_stats"] = user_stats
        
        save_counting_channels(counting_data)
        
    else:
        # Wrong number or same user - send warning but don't reset!
        try:
            await message.add_reaction("<:no:761520109864747030>")
        except:
            pass
        
        # Create warning message based on the error
        if same_user:
            warning_text = f"❌ {message.author.mention}, you can't count twice in a row! Wait for someone else to count. Current number: **{current_number + 1}**"
        else:
            warning_text = f"❌ {message.author.mention}, wrong number! Expected **{expected_number}**, got **{user_number}**. Current number: **{current_number + 1}**"
        
        try:
            # Send warning message and auto-delete after 5 seconds
            warning_msg = await message.channel.send(warning_text)
            await warning_msg.delete(delay=5)
        except:
            pass
        
        # Update user stats (failed attempt)
        user_stats = guild_data.get("user_stats", {})
        user_id_str = str(message.author.id)
        if user_id_str not in user_stats:
            user_stats[user_id_str] = {"correct": 0, "failed": 0}
        user_stats[user_id_str]["failed"] += 1
        guild_data["user_stats"] = user_stats
        
        save_counting_channels(counting_data)

async def get_counting_stats(guild_id, user=None):
    """Get counting statistics for a guild or specific user"""
    counting_data = load_counting_channels()
    guild_str = str(guild_id)
    
    if guild_str not in counting_data:
        return None
    
    guild_data = counting_data[guild_str]
    
    if user:
        # Get stats for specific user
        user_stats = guild_data.get("user_stats", {}).get(str(user.id), {"correct": 0, "failed": 0})
        return {
            "user": user,
            "correct": user_stats["correct"],
            "failed": user_stats["failed"],
            "accuracy": user_stats["correct"] / (user_stats["correct"] + user_stats["failed"]) * 100 if (user_stats["correct"] + user_stats["failed"]) > 0 else 0
        }
    else:
        # Get server stats
        return {
            "current_number": guild_data.get("current_number", 0),
            "high_score": guild_data.get("high_score", 0),
            "total_counts": guild_data.get("total_counts", 0),
            "user_stats": guild_data.get("user_stats", {})
        }
