# Nanoka Bot

> 📖 **Ngôn ngữ:** [English](./README.md) | [Tiếng Việt](#)

Bot Discord hỗ trợ quản lý server với các tính năng: cảnh cáo, cách ly, đếm số, game Nối Từ tiếng Việt và Word Chain tiếng Anh.

## Tính Năng

### Lệnh Quản Lý
- `/warn <user> <reason>` - Cảnh cáo người dùng (tự động timeout/kick theo số lần cảnh cáo)
- `/warnings [user]` - Xem danh sách cảnh cáo của người dùng
- `/removewarnings <user> <amount>` - Xóa một số lượng cảnh cáo
- `/clearwarnings <user>` - Xóa toàn bộ cảnh cáo
- `/removetimeout <user>` - Gỡ timeout cho người dùng
- `/setupquarantine [category]` - Tạo kênh cách ly (tự động ban người không phải mod khi đăng tin)
- `/setuplog [category]` - Tạo kênh log hành động quản lý

### Lệnh Giải Trí
- `/setupcounting [channel] [category]` - Thiết lập kênh đếm số
- `/countingstats [user]` - Xem thống kê đếm số

### Nối Từ - Game Tiếng Việt (`/noituvi`)
- `/noituvi add [channel]` - Thêm kênh chơi Nối Từ
- `/noituvi remove` - Xóa kênh hiện tại khỏi game
- `/noituvi mode <mode>` - Chuyển chế độ chơi (bot vs pvp)
- `/noituvi newgame` - Reset và bắt đầu game mới
- `/noituvi stats` - Xem thống kê của bạn
- `/noituvi lookup <word>` - Tra từ điển tiếng Việt
- `/noituvi help` - Hiển thị luật chơi và các lệnh

### Word Chain - Game Tiếng Anh (`/noituen`)
- `/noituen start` - Bắt đầu trận Word Chain
- `/noituen join` - Tham gia trận đang diễn ra
- `/noituen define <word>` - Tra nghĩa từ tiếng Anh
- `/noituen stats [user]` - Xem thống kê người chơi
- `/noituen help` - Hiển thị luật chơi và các lệnh

### Giám Sát Server (`/server`)
- `/server status` - Xem trạng thái tất cả server (Minecraft + Debian)
- `/server list` - Liệt kê các server Minecraft
- `/server minecraft <server>` - Xem chi tiết server Minecraft
- `/server command <server> <command>` - Gửi lệnh đến server Minecraft

### Hệ Thống Cảnh Cáo
- Lần 1: Chỉ cảnh cáo
- Lần 2: Timeout 30 phút
- Lần 3: Timeout 3 giờ
- Lần 4: Timeout 7 ngày
- Lần 5+: Kick khỏi server

### Hệ Thống Cách Ly
- Bất kỳ ai không phải mod đăng tin trong kênh cách ly sẽ bị ban tự động
- Tất cả lệnh ban được ghi log chi tiết

### Game Đếm Số
- Người dùng đếm theo thứ tự từ 1
- Không được đếm 2 lần liên tiếp
- Số có thể kèm text phía sau
- Dùng `resetnum` để reset thủ công

### Luật Chơi Nối Từ
- Game nối từ tiếng Việt với ~60,000 cặp từ
- Mỗi từ phải có 2 âm tiết tiếng Việt
- Từ tiếp theo phải bắt đầu bằng âm tiết cuối của từ trước
- Từ không được lặp lại trong game
- **Chế độ Bot**: Chơi với bot - bot tự động trả lời
- **Chế độ PvP**: Chơi với người khác - luân phiên nối từ
- 3 lần sai = Thua cuộc

### Luật Chơi Word Chain
- Game nhiều người chơi theo lượt
- Mỗi từ phải bắt đầu bằng **chữ cái cuối** của từ trước
- Từ phải hợp lệ trong từ điển tiếng Anh (kiểm tra qua API)
- 10 giây mỗi lượt - hết giờ sẽ bị loại!
- Người cuối cùng còn lại thắng
- Gõ `;từ` để gửi (ví dụ: `;apple`)

## Cài Đặt

1. Clone repository:
   ```bash
   git clone https://github.com/minhdaolesoez/nanoka-bot.git
   cd nanoka-bot/nodejs
   ```

2. Cài đặt dependencies:
   ```bash
   npm install
   ```

3. Tạo file `.env`:
   ```bash
   cp .env.example .env
   ```

4. Thêm Discord bot token vào `.env`:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   ```

5. Chạy bot:
   ```bash
   npm start
   ```

   Chế độ development với auto-restart:
   ```bash
   npm run dev
   ```

## Yêu Cầu

- Node.js 18.0.0 trở lên
- Discord.js 14.x
- Discord bot token với các intents:
  - Server Members Intent
  - Message Content Intent

## Cấu Trúc Dự Án

```
nodejs/
├── package.json
├── .env.example
├── .gitignore
└── src/
    ├── index.js              # Entry point chính
    ├── assets/
    │   └── wordPairs.json    # Từ điển tiếng Việt (60k từ)
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
    │   ├── noituvi.js        # Nối Từ tiếng Việt (gộp)
    │   ├── noituen.js        # Word Chain tiếng Anh (gộp)
    │   └── server.js         # Giám sát server (Crafty + Dashdot)
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
        ├── noitu/            # Game nối từ tiếng Việt
        │   ├── index.js
        │   ├── constants.js
        │   ├── db.js
        │   ├── gameEngine.js
        │   ├── gameLogic.js
        │   └── wordProcessing.js
        ├── wordchain/        # Game word chain tiếng Anh
        │   ├── index.js
        │   ├── constants.js
        │   ├── db.js
        │   └── gameEngine.js
        └── server/           # Giám sát server
            ├── index.js
            ├── constants.js
            ├── craftyClient.js   # Minecraft (Crafty Controller)
            └── dashdotClient.js  # Debian (Dashdot)
```

## Lưu Trữ Dữ Liệu

Dữ liệu được lưu trong các file JSON tại thư mục `data/`:
- `warnings.json` - Cảnh cáo người dùng
- `quarantine_channels.json` - Cài đặt kênh cách ly
- `counting_channels.json` - Dữ liệu game đếm số
- `noitu_data.json` - Dữ liệu game Nối Từ (kênh, người dùng, thống kê)
- `wordchain_data.json` - Dữ liệu game Word Chain

## Credits

- Game Nối Từ lấy cảm hứng từ [minhqnd/Noi-Tu-Discord](https://github.com/minhqnd/Noi-Tu-Discord)
- Từ điển tiếng Việt từ [Noi-Tu-Discord releases](https://github.com/minhqnd/Noi-Tu-Discord/releases)
- Game Word Chain lấy cảm hứng từ [peaceknight05/Uncia](https://github.com/peaceknight05/Uncia)

## License

ISC
