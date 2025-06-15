import discord  # type: ignore
import os
from dotenv import load_dotenv  # type: ignore
from discord.ext import commands  # type: ignore

load_dotenv()
token = os.getenv("DISCORD_TOKEN")

# Bot setup with slash commands enabled
bot = commands.Bot(command_prefix=".", intents=discord.Intents.all())


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
