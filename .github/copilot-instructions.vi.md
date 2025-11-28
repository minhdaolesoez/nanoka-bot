# Nanoka Bot - Hướng Dẫn AI Coding

> 📖 **Ngôn ngữ tài liệu:** [English](./copilot-instructions.md) | [Tiếng Việt](#)

**Repository:** https://github.com/minhdaolesoez/nanoka-bot

## Tổng Quan Dự Án
Bot Discord.js v14 với các tính năng: quản lý server, game Nối Từ (tiếng Việt), Word Chain (tiếng Anh), đếm số, hệ thống cảnh cáo và cách ly.

## Kiến Trúc

### Cấu Trúc Thư Mục
```
nodejs/src/
├── index.js          # Entry point, load commands/events, chạy timeout checkers
├── commands/         # Slash commands (export { data, execute })
├── events/           # Discord.js event handlers (export { name, once, execute })
├── modules/          # Business logic, phân chia theo tính năng
│   ├── noitu/        # Game nối từ tiếng Việt
│   ├── wordchain/    # Game word chain tiếng Anh
│   └── *.js          # Tính năng quản lý (warnings, quarantine, counting)
└── assets/           # Dữ liệu tĩnh (wordPairs.json)
```

### Module Pattern
Mỗi game module có cấu trúc:
- `constants.js` - Hằng số game, status codes, response codes
- `db.js` - Lưu trữ JSON file (đọc/ghi vào thư mục `data/`)
- `gameEngine.js` - Logic game chính, quản lý state
- `index.js` - Re-export tất cả functions

**Ví dụ module export** (xem `modules/noitu/index.js`):
```javascript
export * from './gameLogic.js';
export * from './gameEngine.js';
// ...
```

### Lưu Trữ Dữ Liệu
Tất cả modules sử dụng shared database utility (`utils/database.js`) với:
- **In-memory caching** - dữ liệu load 1 lần, giữ trong memory
- **Debounced writes** - gom saves mỗi 5 giây để giảm I/O
- **Graceful shutdown** - flush pending writes khi tắt

**Cách dùng:**
```javascript
import { createStore } from '../utils/database.js';

const store = createStore('store_name', { /* default data */ });

// Đọc (trả về cached reference)
const data = store.data;

// Ghi (schedule debounced save)
store.data.key = value;
store.save();
```

Data files lưu tại `nodejs/data/`: `noitu_data.json`, `warnings.json`, `counting_channels.json`, v.v.

## Các Pattern Quan Trọng

### Cấu Trúc Command
Commands phải export `data` (SlashCommandBuilder) và `execute` (async function):
```javascript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('command_name')
    .setDescription('Mô tả');

export async function execute(interaction) {
    // Implementation
}
```

### Cấu Trúc Event
Events export `name`, `once`, và `execute`:
```javascript
import { Events } from 'discord.js';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message) {
    // Implementation
}
```

### Kiểm Tra Quyền
Dùng `PermissionFlagsBits` cho commands quản lý:
```javascript
if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return interaction.reply({ content: "❌ Không có quyền", ephemeral: true });
}
```

### Response Codes Pattern
Cả hai game modules dùng response code enums để xử lý lỗi nhất quán:
- `RESPONSE_CODES.OK`, `RESPONSE_CODES.REPEATED`, `RESPONSE_CODES.INVALID_WORD`, v.v.
- Xem `modules/noitu/constants.js` và `modules/wordchain/constants.js`

## Hệ Thống Cảnh Cáo
Định nghĩa trong `modules/warnLogic.js`:
| Lần cảnh cáo | Hành động |
|--------------|-----------|
| Lần 1 | Chỉ cảnh cáo |
| Lần 2 | Timeout 30 phút |
| Lần 3 | Timeout 3 giờ |
| Lần 4 | Timeout 7 ngày |
| Lần 5+ | Kick khỏi server |

## Hệ Thống Game

### Nối Từ Tiếng Việt
- Dùng `wordPairs.json` - ~60k cặp từ được index theo âm tiết đầu
- Từ phải có đúng 2 âm tiết tiếng Việt
- Chuẩn hóa dấu tiếng Việt qua `normalizeVietnamese()`
- Chế độ: `bot` (đấu với AI) và `pvp` (nhiều người chơi)
- 3 câu sai = thua game

### English Word Chain
- Từ được validate qua Dictionary API (`https://api.dictionaryapi.dev`)
- Prefix: `;` (ví dụ: `;apple`)
- 10 giây mỗi lượt, hết giờ bị loại
- Tối thiểu 2 người chơi

## Phát Triển

### Commands
```bash
cd nodejs
npm install
npm run dev    # Tự động restart khi có thay đổi
npm start      # Production
```

### Biến Môi Trường
Tạo file `.env` với:
```
DISCORD_TOKEN=your_token
```

### Thêm Command Mới
1. Tạo file trong `src/commands/` với `data` và `execute` exports
2. Commands tự động load khi bot khởi động

### Thêm Event Mới
1. Tạo file trong `src/events/` với `name`, `once`, `execute` exports
2. Events tự động load khi khởi động

## Quy Ước
- ES Modules (`"type": "module"` trong package.json)
- Dùng `fileURLToPath(import.meta.url)` thay cho `__dirname`
- Tất cả IDs lưu dạng string (`String(userId)`)
- Dùng EmbedBuilder cho Discord messages đẹp
- Tất cả UI/text hiển thị cho user nên dùng tiếng Anh
