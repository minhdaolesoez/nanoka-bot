import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getCurrentWord } from '../modules/noitu/index.js';

export const data = new SlashCommandBuilder()
    .setName('noitu_help')
    .setDescription('Hiển thị hướng dẫn game nối từ');

export async function execute(interaction) {
    const helpEmbed = new EmbedBuilder()
        .setTitle('🎮 Moi Nối Từ - Hướng dẫn sử dụng')
        .setDescription('Bot game nối từ Tiếng Việt với từ gồm 2 chữ')
        .setColor(0x00ff00)
        .addFields(
            {
                name: '🎯 Commands Chính',
                value: '`/noitu_add` - Thêm phòng game nối từ\n`/noitu_remove` - Xóa phòng game nối từ\n`/newgame` - Bắt đầu game mới\n`/stats` - Xem thống kê cá nhân',
                inline: false
            },
            {
                name: '📚 Tiện ích',
                value: '`/tratu [từ]` - Tra cứu từ điển\n`/noitu_mode [bot|pvp]` - Đặt chế độ chơi của kênh\n`/noitu_help` - Hiển thị hướng dẫn này',
                inline: false
            },
            {
                name: '🎮 Cách chơi',
                value: 'Nhập từ gồm 2 chữ.\n• Chế độ bot: bot sẽ đưa ra từ tiếp theo.\n• Chế độ PvP: bot chỉ kiểm tra và thả reaction (✅ đúng, ❌ sai/ko có từ, 🔴 đã lặp, ⚠️ sai format).\n• Từ không có trong từ điển sẽ được coi là sai.',
                inline: false
            },
            {
                name: '📖 Ví dụ',
                value: '```\nBot: thế chân\nUser: chân trời\nBot: trời xanh\nUser: xanh lục\n...```',
                inline: false
            }
        )
        .setFooter({ text: 'Game nối từ Tiếng Việt - 60,000+ từ' })
        .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed] });

    // Show current word if available
    if (interaction.guild) {
        const currentWord = getCurrentWord(interaction.channel.id, null, false);
        if (currentWord) {
            await interaction.channel.send(`Từ hiện tại: **${currentWord}**`);
        }
    }
}
