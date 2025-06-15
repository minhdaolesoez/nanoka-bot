from bot_setup import bot
import discord  # type: ignore
from warn_logic import (
    warn_user_logic,
    check_warnings_logic,
    remove_warnings_logic,
    clear_warnings_logic,
    remove_timeout_logic,
)
from channels import setup_quarantine_channel, setup_log_channel
import sys
import os

sys.path.append('../Fun/number_count')
from counting_setup import setup_counting_channel, setup_counting_in_existing_channel # type: ignore
from counting_logic import get_counting_stats # type: ignore


# SLASH COMMANDS
@bot.tree.command(name="warn", description="Warn a user")
async def warn_slash(
    interaction: discord.Interaction, user: discord.Member, reason: str
):
    # Check if user has permission to warn
    if not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message(
            "❌ You don't have permission to warn users!", ephemeral=True
        )
        return

    await warn_user_logic(
        user,
        interaction.user,
        reason,
        interaction.guild,
        interaction.response.send_message,
    )


@bot.tree.command(name="warnings", description="Check warnings for a user")
async def warnings_slash(interaction: discord.Interaction, user: discord.Member = None):
    # Default to command user if no user specified
    if user is None:
        user = interaction.user

    # Check permissions - users can check their own warnings, moderators can check anyone's
    if (
        user.id != interaction.user.id
        and not interaction.user.guild_permissions.kick_members
    ):
        await interaction.response.send_message(
            "❌ You can only check your own warnings, or you need moderator permissions to check other users' warnings!",
            ephemeral=True,
        )
        return

    await check_warnings_logic(
        user, interaction.user, interaction.response.send_message, ephemeral=True
    )


@bot.tree.command(
    name="removewarnings",
    description="Remove a specific amount of warnings from a user",
)
async def removewarnings_slash(
    interaction: discord.Interaction, user: discord.Member, amount: int
):
    # Check permissions (moderators can remove warnings)
    if not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message(
            "❌ You need to be a moderator to remove warnings!", ephemeral=True
        )
        return

    if amount <= 0:
        await interaction.response.send_message(
            "❌ Amount must be a positive number!", ephemeral=True
        )
        return

    await remove_warnings_logic(
        user,
        interaction.user,
        interaction.guild,
        amount,
        interaction.response.send_message,
        ephemeral=True,
    )


@bot.tree.command(name="clearwarnings", description="Clear all warnings for a user")
async def clearwarnings_slash(interaction: discord.Interaction, user: discord.Member):
    # Check permissions (only admins can clear warnings)
    if not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message(
            "❌ You need to be a moderator to clear warnings!", ephemeral=True
        )
        return

    await clear_warnings_logic(
        user,
        interaction.user,
        interaction.guild,
        interaction.response.send_message,
        ephemeral=True,
    )


@bot.tree.command(
    name="setupquarantine",
    description="Setup quarantine channel (auto-bans non-moderators who post)",
)
async def setupquarantine_slash(
    interaction: discord.Interaction, category_name: str = "Moderation"
):
    """Setup quarantine channel with slash command"""
    # Check for specific permissions instead of administrator
    if not (
        interaction.user.guild_permissions.manage_channels
        and interaction.user.guild_permissions.manage_roles
    ):
        await interaction.response.send_message(
            "❌ You need 'Manage Channels' and 'Manage Roles' permissions to set up a quarantine channel!",
            ephemeral=True,
        )
        return

    await setup_quarantine_channel(
        interaction.guild,
        interaction.user,
        interaction.response.send_message,
        category_name,
        ephemeral=True,
    )


@bot.tree.command(
    name="setuplog", description="Setup log channel for moderation actions"
)
async def setuplog_slash(
    interaction: discord.Interaction, category_name: str = "Moderation"
):
    """Setup log channel with slash command"""
    # Check for specific permissions instead of administrator
    if not (
        interaction.user.guild_permissions.manage_channels
        and interaction.user.guild_permissions.manage_roles
    ):
        await interaction.response.send_message(
            "❌ You need 'Manage Channels' and 'Manage Roles' permissions to set up a log channel!",
            ephemeral=True,
        )
        return

    await setup_log_channel(
        interaction.guild,
        interaction.user,
        interaction.response.send_message,
        category_name,
        ephemeral=True,
    )


@bot.tree.command(name="removetimeout", description="Remove timeout from a user")
async def removetimeout_slash(interaction: discord.Interaction, user: discord.Member):
    # Check permissions (moderators can remove timeouts)
    if not interaction.user.guild_permissions.kick_members:
        await interaction.response.send_message(
            "❌ You need to be a moderator to remove timeouts!", ephemeral=True
        )
        return

    await remove_timeout_logic(
        user, interaction.user, interaction.response.send_message, ephemeral=True
    )


@bot.tree.command(name="setupcounting", description="Setup a counting channel for the server")
async def setupcounting_slash(
    interaction: discord.Interaction, 
    channel: discord.TextChannel = None,
    category_name: str = "Fun"
):
    """Setup counting channel with slash command"""
    # Check for specific permissions
    if not (
        interaction.user.guild_permissions.manage_channels
        and interaction.user.guild_permissions.manage_roles
    ):
        await interaction.response.send_message(
            "❌ You need 'Manage Channels' and 'Manage Roles' permissions to set up a counting channel!",
            ephemeral=True,
        )
        return

    if channel:
        # Setup counting in the specified existing channel
        await setup_counting_in_existing_channel(
            channel,
            interaction.user,
            interaction.response.send_message,
            ephemeral=True,
        )
    else:
        # Create a new counting channel
        await setup_counting_channel(
            interaction.guild,
            interaction.user,
            interaction.response.send_message,
            category_name,
            ephemeral=True,
        )


@bot.tree.command(name="countingstats", description="View counting statistics")
async def countingstats_slash(
    interaction: discord.Interaction, user: discord.Member = None
):
    """View counting statistics for server or specific user"""

    if user:
        # Get user-specific stats
        stats = await get_counting_stats(interaction.guild.id, user)
        if not stats:
            await interaction.response.send_message(
                "❌ No counting channel set up for this server!", ephemeral=True
            )
            return

        embed = discord.Embed(
            title=f"🔢 Counting Stats for {user.display_name}",
            color=discord.Color.blue(),
        )
        embed.set_thumbnail(url=user.display_avatar.url)
        embed.add_field(name="✅ Correct", value=f"{stats['correct']}", inline=True)
        embed.add_field(name="❌ Failed", value=f"{stats['failed']}", inline=True)
        embed.add_field(name="🎯 Accuracy", value=f"{stats['accuracy']:.1f}%", inline=True)

    else:
        # Get server stats
        stats = await get_counting_stats(interaction.guild.id)
        if not stats:
            await interaction.response.send_message(
                "❌ No counting channel set up for this server!", ephemeral=True
            )
            return

        embed = discord.Embed(
            title=f"🔢 Server Counting Stats",
            color=discord.Color.blue(),
        )
        embed.add_field(name="🔢 Current Number", value=f"{stats['current_number']}", inline=True)
        embed.add_field(name="🏆 High Score", value=f"{stats['high_score']}", inline=True)
        embed.add_field(name="📊 Total Counts", value=f"{stats['total_counts']}", inline=True)

        # Show top 5 counters
        user_stats = stats["user_stats"]
        if user_stats:
            sorted_users = sorted(
                user_stats.items(), key=lambda x: x[1]["correct"], reverse=True
            )[:5]
            leaderboard = ""
            for i, (user_id, user_data) in enumerate(sorted_users, 1):
                user_obj = interaction.guild.get_member(int(user_id))
                user_name = user_obj.display_name if user_obj else "Unknown User"
                leaderboard += f"{i}. {user_name}: {user_data['correct']} correct\n"

            if leaderboard:
                embed.add_field(
                    name="🏅 Top Counters", value=leaderboard, inline=False
                )

    await interaction.response.send_message(embed=embed, ephemeral=True)
