# Nanoka Bot (Node.js)

A Discord moderation bot with warnings, quarantine, counting, and Vietnamese word chain game features. Migrated from Python to Node.js.

## Features

### Moderation Commands
- `/warn <user> <reason>` - Warn a user (auto-timeout/kick based on warning count)
- `/warnings [user]` - Check warnings for a user
- `/removewarnings <user> <amount>` - Remove specific amount of warnings
- `/clearwarnings <user>` - Clear all warnings for a user
- `/removetimeout <user>` - Remove timeout from a user
- `/setupquarantine [category]` - Create a quarantine channel (auto-bans non-moderators who post)
- `/setuplog [category]` - Create a moderation log channel

### Fun Commands
- `/setupcounting [channel] [category]` - Setup a counting channel
- `/countingstats [user]` - View counting statistics

### Nối Từ (Vietnamese Word Chain Game) Commands
- `/noitu_add [channel]` - Add a channel to play Nối Từ
- `/noitu_remove` - Remove current channel from the game
- `/noitu_mode <mode>` - Switch game mode (bot vs pvp)
- `/newgame` - Reset and start a new game
- `/stats` - View your game statistics
- `/tratu <word>` - Look up word in Vietnamese dictionary
- `/noitu_help` - Show game rules and commands

### Warning System
- 1st warning: Warning only
- 2nd warning: 30 minute timeout
- 3rd warning: 3 hour timeout
- 4th warning: 7 day timeout
- 5th+ warning: User kicked

### Quarantine System
- Any non-moderator who posts in the quarantine channel is automatically banned
- All bans are logged with detailed user information

### Counting Game
- Users count in order starting from 1
- Can't count twice in a row
- Numbers can have text after them
- Use `resetnum` to manually reset

### Nối Từ Game Rules
- Vietnamese word chain game with ~60,000 word pairs
- Each word must be a 2-syllable Vietnamese word
- Next word must start with the last syllable of the previous word
- Words cannot be repeated within a game
- **Bot Mode**: Play against the bot - bot responds with a word automatically
- **PvP Mode**: Play with other users - take turns chaining words
- **DM Support**: Play privately in direct messages with the bot
- 3 wrong answers = Game Over

## Installation

1. Clone the repository
2. Navigate to the nodejs folder:
   ```bash
   cd nodejs
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

5. Add your Discord bot token to `.env`:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   ```

6. Run the bot:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## Requirements

- Node.js 18.0.0 or higher
- Discord.js 14.x
- A Discord bot token with the following intents enabled:
  - Server Members Intent
  - Message Content Intent

## Project Structure

```
nodejs/
├── package.json
├── .env.example
├── .gitignore
└── src/
    ├── index.js              # Main entry point
    ├── assets/
    │   └── wordPairs.json    # Vietnamese word dictionary (60k words)
    ├── commands/             # Slash commands
    │   ├── warn.js
    │   ├── warnings.js
    │   ├── removewarnings.js
    │   ├── clearwarnings.js
    │   ├── removetimeout.js
    │   ├── setupquarantine.js
    │   ├── setuplog.js
    │   ├── setupcounting.js
    │   ├── countingstats.js
    │   ├── noitu_add.js
    │   ├── noitu_remove.js
    │   ├── noitu_mode.js
    │   ├── newgame.js
    │   ├── stats.js
    │   ├── tratu.js
    │   └── noitu_help.js
    ├── events/               # Discord event handlers
    │   ├── ready.js
    │   ├── interactionCreate.js
    │   └── messageCreate.js
    └── modules/              # Core logic modules
        ├── quarantine.js
        ├── warnings.js
        ├── channels.js
        ├── warnLogic.js
        ├── countingSetup.js
        ├── countingLogic.js
        └── noitu/            # Word chain game modules
            ├── index.js
            ├── constants.js
            ├── db.js
            ├── gameEngine.js
            ├── gameLogic.js
            └── wordProcessing.js
```

## Data Storage

Data is stored in JSON files in the `data/` folder (shared with the Python version):
- `warnings.json` - User warnings
- `quarantine_channels.json` - Quarantine channel settings
- `counting_channels.json` - Counting game data
- `noitu_data.json` - Nối Từ game data (channels, users, stats)

## Credits

- Word chain game inspired by [minhqnd/Noi-Tu-Discord](https://github.com/minhqnd/Noi-Tu-Discord)
- Vietnamese word dictionary from [Noi-Tu-Discord releases](https://github.com/minhqnd/Noi-Tu-Discord/releases)

## License

ISC
