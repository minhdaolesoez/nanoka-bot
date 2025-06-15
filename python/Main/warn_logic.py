from bot_warnings import (
    add_warning,
    get_user_warnings,
    remove_warnings,
    load_warnings,
    save_warnings,
)
import discord # type: ignore
from datetime import datetime, timedelta
from quarantine import get_log_channel
from bot_setup import bot


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
        title="⚠️ User Warned", color=discord.Color.orange(), timestamp=datetime.now()
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
                timestamp=datetime.now(),
            )
            log_embed.add_field(
                name="User", value=f"{user.mention} ({user})", inline=True
            )
            log_embed.add_field(
                name="Moderator", value=f"{moderator.mention}", inline=True
            )
            log_embed.add_field(
                name="Warning Count", value=f"{warning_count}", inline=True
            )
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
            await user.timeout(
                timeout_duration, reason=f"Auto-timeout: {warning_count} warnings"
            )
            embed.add_field(name="Action Taken", value=action_taken, inline=False)
            embed.color = discord.Color.red()

            # Log the timeout action
            if log_channel_id:
                log_channel = guild.get_channel(log_channel_id)
                if log_channel:
                    timeout_embed = discord.Embed(
                        title="⏰ Auto-Timeout Applied",
                        color=discord.Color.red(),
                        timestamp=datetime.now(),
                    )
                    timeout_embed.add_field(
                        name="User", value=f"{user.mention} ({user})", inline=True
                    )
                    timeout_embed.add_field(
                        name="Moderator", value="Auto-moderation", inline=True
                    )
                    timeout_embed.add_field(
                        name="Duration", value=str(timeout_duration), inline=True
                    )
                    timeout_embed.add_field(
                        name="Reason",
                        value=f"Auto-timeout: {warning_count} warnings",
                        inline=False,
                    )
                    await log_channel.send(embed=timeout_embed)

        except discord.Forbidden:
            embed.add_field(
                name="⚠️ Error",
                value="Could not apply timeout - insufficient permissions",
                inline=False,
            )
        except Exception as e:
            embed.add_field(
                name="⚠️ Error", value=f"Failed to apply timeout: {str(e)}", inline=False
            )
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
                        timestamp=datetime.now(),
                    )
                    kick_embed.add_field(
                        name="User", value=f"{user.mention} ({user})", inline=True
                    )
                    kick_embed.add_field(
                        name="Moderator", value="Auto-moderation", inline=True
                    )
                    kick_embed.add_field(
                        name="Reason",
                        value=f"Auto-kick: {warning_count} warnings",
                        inline=False,
                    )
                    await log_channel.send(embed=kick_embed)

        except discord.Forbidden:
            embed.add_field(
                name="⚠️ Error",
                value="Could not kick user - insufficient permissions",
                inline=False,
            )
        except Exception as e:
            embed.add_field(
                name="⚠️ Error", value=f"Failed to kick user: {str(e)}", inline=False
            )

    await response_func(embed=embed)


# Helper function for warnings check logic
async def check_warnings_logic(user, moderator, response_func, ephemeral=False):
    """Shared logic for checking warnings (used by both prefix and slash commands)"""
    warnings = get_user_warnings(user.id)

    embed = discord.Embed(
        title=f"📋 Warnings for {user.display_name}",
        color=discord.Color.blue(),
        timestamp=datetime.now(),
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
            moderator_user = bot.get_user(warning["moderator_id"])
            mod_name = (
                moderator_user.display_name if moderator_user else "Unknown Moderator"
            )

            # Parse timestamp
            warning_time = datetime.fromisoformat(warning["timestamp"])
            time_str = warning_time.strftime("%Y-%m-%d %H:%M UTC")

            embed.add_field(
                name=f"Warning {len(warnings) - len(recent_warnings) + i}",
                value=f"**Reason:** {warning['reason']}\n**Moderator:** {mod_name}\n**Date:** {time_str}",
                inline=False,
            )

        if len(warnings) > 5:
            embed.set_footer(text=f"Showing latest 5 of {len(warnings)} warnings")

    if ephemeral:
        await response_func(embed=embed, ephemeral=True)
    else:
        await response_func(embed=embed)


# Helper function for remove warnings logic
async def remove_warnings_logic(
    user, moderator, guild, amount, response_func, ephemeral=False
):
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
        timestamp=datetime.now(),
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
                timestamp=datetime.now(),
            )
            log_embed.add_field(
                name="User", value=f"{user.mention} ({user})", inline=True
            )
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
        timestamp=datetime.now(),
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
                timestamp=datetime.now(),
            )
            log_embed.add_field(
                name="User", value=f"{user.mention} ({user})", inline=True
            )
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
            timestamp=datetime.now(),
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
                    timestamp=datetime.now(),
                )
                log_embed.add_field(
                    name="User", value=f"{user.mention} ({user})", inline=True
                )
                log_embed.add_field(
                    name="Moderator", value=moderator.mention, inline=True
                )
                log_embed.add_field(
                    name="Reason", value=f"Timeout removed by {moderator}", inline=False
                )
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
