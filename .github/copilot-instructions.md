# Nanoka Bot - AI Coding Instructions

> 📖 **Documentation Language:** [English](#) | [Tiếng Việt](./copilot-instructions.vi.md)

**Repository:** https://github.com/minhdaolesoez/nanoka-bot

## Project Overview
A Discord.js v14 moderation bot with Vietnamese word chain (Nối Từ), English word chain, counting game, warnings system, and quarantine features.

## Architecture

### Core Structure
```
nodejs/src/
├── index.js          # Bot entry point, loads commands/events, runs timeout checkers
├── commands/         # Slash commands (export { data, execute })
├── events/           # Discord.js event handlers (export { name, once, execute })
├── modules/          # Business logic, separated by feature
│   ├── noitu/        # Vietnamese word chain game
│   ├── wordchain/    # English word chain game
│   └── *.js          # Moderation features (warnings, quarantine, counting)
└── assets/           # Static data (wordPairs.json)
```

### Module Pattern
Each game module follows this structure:
- `constants.js` - Game constants, status codes, response codes
- `db.js` - JSON file persistence (read/write to `data/` folder)
- `gameEngine.js` - Core game logic, state management
- `index.js` - Re-exports all module functions

**Example module export pattern** (see `modules/noitu/index.js`):
```javascript
export * from './gameLogic.js';
export * from './gameEngine.js';
// ...
```

### Data Persistence
All modules use a shared database utility (`utils/database.js`) with:
- **In-memory caching** - data loaded once, kept in memory
- **Debounced writes** - batches saves every 5 seconds to reduce I/O
- **Graceful shutdown** - flushes pending writes on exit

**Usage pattern:**
```javascript
import { createStore } from '../utils/database.js';

const store = createStore('store_name', { /* default data */ });

// Read (returns cached reference)
const data = store.data;

// Write (schedules debounced save)
store.data.key = value;
store.save();
```

Data files stored in `nodejs/data/`: `noitu_data.json`, `warnings.json`, `counting_channels.json`, etc.

## Key Patterns

### Command Structure
Commands must export `data` (SlashCommandBuilder) and `execute` (async function):
```javascript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('command_name')
    .setDescription('Description');

export async function execute(interaction) {
    // Implementation
}
```

### Event Structure
Events export `name`, `once`, and `execute`:
```javascript
import { Events } from 'discord.js';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message) {
    // Implementation
}
```

### Permission Checks
Use `PermissionFlagsBits` for moderation commands:
```javascript
if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return interaction.reply({ content: "❌ No permission", ephemeral: true });
}
```

### Response Codes Pattern
Both game modules use response code enums for consistent error handling:
- `RESPONSE_CODES.OK`, `RESPONSE_CODES.REPEATED`, `RESPONSE_CODES.INVALID_WORD`, etc.
- Check `modules/noitu/constants.js` and `modules/wordchain/constants.js`

## Warning Escalation System
Defined in `modules/warnLogic.js`:
| Warning # | Action |
|-----------|--------|
| 1st | Warning only |
| 2nd | 30 minute timeout |
| 3rd | 3 hour timeout |
| 4th | 7 day timeout |
| 5th+ | User kicked |

## Game Systems

### Vietnamese Word Chain (Nối Từ)
- Uses `wordPairs.json` - ~60k word pairs indexed by first syllable
- Words must be 2 Vietnamese syllables
- Normalizes Vietnamese diacritics via `normalizeVietnamese()`
- Modes: `bot` (vs AI) and `pvp` (multiplayer)
- 3 wrong answers = game over

### English Word Chain
- Words validated via external Dictionary API (`https://api.dictionaryapi.dev`)
- Prefix: `;` (e.g., `;apple`)
- 10-second turn timer with knockout
- Minimum 2 players required

## Development

### Commands
```bash
cd nodejs
npm install
npm run dev    # Auto-restart on changes
npm start      # Production
```

### Environment
Create `.env` with:
```
DISCORD_TOKEN=your_token
```

### Adding New Commands
1. Create file in `src/commands/` with `data` and `execute` exports
2. Commands auto-load from the folder on bot startup

### Adding New Events
1. Create file in `src/events/` with `name`, `once`, `execute` exports
2. Events auto-load on startup

## Conventions
- ES Modules (`"type": "module"` in package.json)
- Use `fileURLToPath(import.meta.url)` for `__dirname` equivalent
- All IDs stored as strings (`String(userId)`)
- EmbedBuilder for rich Discord messages
- All UI/user-facing text should be in English
