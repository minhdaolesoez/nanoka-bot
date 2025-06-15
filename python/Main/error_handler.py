from bot_setup import bot
import discord # type: ignore
from datetime import datetime
from quarantine import is_quarantine_channel, increment_ban_counter, get_log_channel
import sys
import os
sys.path.append('../Fun/number_count')
from counting_logic import handle_counting_message # type: ignore

# Error handling for slash commands
@bot.tree.error
async def on_app_command_error(
    interaction: discord.Interaction, error: discord.app_commands.AppCommandError
):
    if isinstance(error, discord.app_commands.MissingPermissions):
        await interaction.response.send_message(
            "❌ You don't have permission to use this command!", ephemeral=True
        )
    else:
        await interaction.response.send_message(
            "❌ An error occurred while processing the command.", ephemeral=True
        )
        print(f"Command error: {error}")


@bot.event
async def on_message(message):
    # Ignore bot messages
    if message.author.bot:
        return

    # Handle counting messages first
    await handle_counting_message(message)

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
                    timestamp=datetime.now(),
                )

                # Basic user information
                embed.add_field(
                    name="👤 User",
                    value=f"{message.author} ({message.author.id})",
                    inline=True,
                )
                embed.add_field(
                    name="📝 Display Name",
                    value=message.author.display_name,
                    inline=True,
                )
                embed.add_field(
                    name="🏷️ Username", value=f"@{message.author.name}", inline=True
                )

                # Account information
                embed.add_field(
                    name="📅 Account Created",
                    value=f"<t:{int(message.author.created_at.timestamp())}:F>",
                    inline=True,
                )
                embed.add_field(
                    name="📥 Joined Server",
                    value=(
                        f"<t:{int(message.author.joined_at.timestamp())}:F>"
                        if message.author.joined_at
                        else "Unknown"
                    ),
                    inline=True,
                )
                embed.add_field(
                    name="🆔 User ID", value=f"`{message.author.id}`", inline=True
                )

                # Channel and message information
                embed.add_field(
                    name="📍 Channel", value=message.channel.mention, inline=True
                )
                embed.add_field(
                    name="🏠 Guild",
                    value=f"{message.guild.name} (`{message.guild.id}`)",
                    inline=True,
                )
                embed.add_field(
                    name="🕒 Message Time",
                    value=f"<t:{int(message.created_at.timestamp())}:F>",
                    inline=True,
                )

                # Message content (with length limit)
                message_content = (
                    message.content if message.content else "*No text content*"
                )
                if len(message_content) > 1000:
                    message_content = message_content[:1000] + "..."
                embed.add_field(
                    name="💬 Message Content",
                    value=f"```{message_content}```",
                    inline=False,
                )

                # User roles (excluding @everyone)
                user_roles = [
                    role.mention
                    for role in message.author.roles
                    if role != message.guild.default_role
                ]
                if user_roles:
                    roles_text = ", ".join(user_roles[:10])  # Limit to first 10 roles
                    if len(user_roles) > 10:
                        roles_text += f" and {len(user_roles) - 10} more..."
                    embed.add_field(name="🎭 Roles", value=roles_text, inline=False)
                else:
                    embed.add_field(name="🎭 Roles", value="No roles", inline=False)

                # Additional user information
                embed.add_field(
                    name="🤖 Bot Account",
                    value="Yes" if message.author.bot else "No",
                    inline=True,
                )

                # Check if user is on mobile (fix the mobile status check)
                is_mobile = "Unknown"
                if (
                    hasattr(message.author, "mobile_status")
                    and message.author.mobile_status != discord.Status.offline
                ):
                    is_mobile = "Yes"
                elif hasattr(message.author, "mobile_status"):
                    is_mobile = "No"
                embed.add_field(name="📱 Mobile", value=is_mobile, inline=True)

                # Check mutual guilds (this may not be available for all users)
                mutual_guilds_count = "Unknown"
                try:
                    if hasattr(message.author, "mutual_guilds"):
                        mutual_guilds_count = (
                            f"{len(message.author.mutual_guilds)} servers"
                        )
                except:
                    pass
                embed.add_field(
                    name="👥 Mutual Servers", value=mutual_guilds_count, inline=True
                )

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
                    timestamp=datetime.now(),
                )
                counter_embed.add_field(
                    name="Latest Ban",
                    value=f"{message.author.mention} (`{message.author.id}`)",
                    inline=False,
                )
                counter_embed.set_footer(text=f"Ban #{ban_count}")

                await message.channel.send(embed=counter_embed)

            except discord.Forbidden:
                # If bot can't ban, send error message
                embed = discord.Embed(
                    title="⚠️ Quarantine Channel Alert",
                    description=f"{message.author.mention} posted in quarantine channel but I couldn't ban them!",
                    color=discord.Color.orange(),
                )
                await message.channel.send(embed=embed)
            except Exception as e:
                print(f"Error in quarantine channel handler: {e}")

    # Process commands
    await bot.process_commands(message)
