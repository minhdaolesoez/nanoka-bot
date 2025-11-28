# Nanoka Bot

> 📖 **Language:** [English](#) | [Tiếng Việt](./README.vi.md)

A Discord moderation bot with warnings, quarantine, counting, Vietnamese word chain game, and English word chain game features.

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

### Nối Từ - Vietnamese Word Chain (`/noituvi`)
- `/noituvi add [channel]` - Add a channel to play Nối Từ
- `/noituvi remove` - Remove current channel from the game
- `/noituvi mode <mode>` - Switch game mode (bot vs pvp)
- `/noituvi newgame` - Reset and start a new game
- `/noituvi stats` - View your game statistics
- `/noituvi lookup <word>` - Look up word in Vietnamese dictionary
- `/noituvi help` - Show game rules and commands

### English Word Chain (`/noituen`)
- `/noituen start` - Start an English Word Chain match
- `/noituen join` - Join an ongoing match
- `/noituen define <word>` - Look up word definition
- `/noituen stats [user]` - View player statistics
- `/noituen help` - Show game rules and commands

### Server Monitoring (`/server`)
- `/server status` - View all server statuses (Minecraft + Debian)
- `/server list` - List all Minecraft servers
- `/server minecraft <server>` - View specific Minecraft server stats
- `/server command <server> <command>` - Send command to Minecraft server

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
- 3 wrong answers = Game Over

### English Word Chain Rules
- Multiplayer turn-based word game
- Each word must start with the **last letter** of the previous word
- Words must be valid English words (verified by dictionary API)
- 10 seconds per turn - run out of time and you're knocked out!
- Last player standing wins
- Type `;word` to submit (e.g., `;apple`)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/minhdaolesoez/nanoka-bot.git
   cd nanoka-bot/nodejs
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Add your Discord bot token to `.env`:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   ```

5. Run the bot:
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
    │   ├── noituvi.js        # Vietnamese Word Chain (consolidated)
    │   ├── noituen.js        # English Word Chain (consolidated)
    │   └── server.js         # Server monitoring (Crafty + Dashdot)
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
        ├── noitu/            # Vietnamese word chain game
        │   ├── index.js
        │   ├── constants.js
        │   ├── db.js
        │   ├── gameEngine.js
        │   ├── gameLogic.js
        │   └── wordProcessing.js
        ├── wordchain/        # English word chain game
        │   ├── index.js
        │   ├── constants.js
        │   ├── db.js
        │   └── gameEngine.js
        └── server/           # Server monitoring
            ├── index.js
            ├── constants.js
            ├── craftyClient.js   # Minecraft (Crafty Controller)
            └── dashdotClient.js  # Debian (Dashdot)
```

## Data Storage

Data is stored in JSON files in the `data/` folder:
- `warnings.json` - User warnings
- `quarantine_channels.json` - Quarantine channel settings
- `counting_channels.json` - Counting game data
- `noitu_data.json` - Nối Từ game data (channels, users, stats)
- `wordchain_data.json` - English Word Chain game data

## Credits

- Vietnamese word chain game inspired by [minhqnd/Noi-Tu-Discord](https://github.com/minhqnd/Noi-Tu-Discord)
- Vietnamese word dictionary from [Noi-Tu-Discord releases](https://github.com/minhqnd/Noi-Tu-Discord/releases)
- English word chain game inspired by [peaceknight05/Uncia](https://github.com/peaceknight05/Uncia)

## License

ISC
