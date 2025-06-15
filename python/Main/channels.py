import discord  # type: ignore
from quarantine import add_quarantine_channel, set_log_channel
from datetime import datetime


async def setup_quarantine_channel(
    guild, moderator, response_func, category_name="Moderation", ephemeral=False
):
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
                send_messages=False,  # Prevent everyone from sending messages
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
            ),
        }

        quarantine_channel = await guild.create_text_channel(
            name="quarantine-zone",
            category=category,
            overwrites=quarantine_overwrites,
            topic="Quarantine channel. Any non-moderator who sends a message here will be automatically banned.",  # Restored topic
        )

        # Add channel to the database
        add_quarantine_channel(guild.id, quarantine_channel.id)

        # Create a warning message in the quarantine channel
        warning_embed = discord.Embed(
            title="⚠️ QUARANTINE ZONE - WARNING ⚠️",
            description="**This is a quarantine channel. Do not send messages here unless you're a moderator.**",  # Restored description
            color=discord.Color.red(),  # Restored color
        )
        warning_embed.add_field(
            name="⚠️ Automatic Ban Warning",
            value="Any non-moderator who sends a message here will be **automatically banned**!",  # Restored warning
            inline=False,
        )
        warning_embed.add_field(
            name="Purpose",
            value="This channel is used by moderators to segregate problematic content and ban violators.",  # Restored purpose
            inline=False,
        )
        warning_embed.set_footer(text=f"Channel created by {moderator}")

        await quarantine_channel.send(embed=warning_embed)

        # Send success message
        embed = discord.Embed(
            title="🚫 Quarantine Channel Setup Complete",
            description=f"Successfully set up quarantine channel: {quarantine_channel.mention}. Non-moderators posting here will be banned.",
            color=discord.Color.red(),  # Restored color
            timestamp=datetime.now(),
        )
        embed.add_field(name="Moderator", value=moderator.mention, inline=True)

        if ephemeral:
            await response_func(embed=embed, ephemeral=True)
        else:
            await response_func(embed=embed)

    except discord.Forbidden:
        error_msg = (
            "❌ I don't have permission to create or configure the quarantine channel!"
        )
        if ephemeral:
            await response_func(error_msg, ephemeral=True)
        else:
            await response_func(error_msg)
        return None

    return quarantine_channel


async def setup_log_channel(
    guild, moderator, response_func, category_name="Moderation", ephemeral=False
):
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
                view_channel=True,  # Allow everyone to view the log channel
                send_messages=False,
                create_public_threads=False,
                create_private_threads=False,
                send_messages_in_threads=False,
                attach_files=False,
                add_reactions=False,  # Typically, users shouldn't react to logs
                use_application_commands=False,  # Prevent slash commands from being used by @everyone
            ),
            guild.me: discord.PermissionOverwrite(
                view_channel=True,
                send_messages=True,
                embed_links=True,
                attach_files=True,
            ),
        }

        log_channel = await guild.create_text_channel(
            name="mod-logs",
            category=category,
            overwrites=log_overwrites,
            topic="Moderation logs channel. All moderation actions are recorded here. Visible to everyone, read-only.",  # Updated topic
        )

        # Set as log channel in database
        set_log_channel(guild.id, log_channel.id)

        # Send success message
        embed = discord.Embed(
            title="📝 Log Channel Setup Complete",
            description=f"Successfully set up log channel: {log_channel.mention}. It is visible to everyone (read-only).",
            color=discord.Color.blue(),
            timestamp=datetime.now(),
        )
        embed.add_field(name="Moderator", value=moderator.mention, inline=True)
        embed.add_field(
            name="Information",
            value="All moderation actions will be logged in this channel.",
            inline=False,
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
