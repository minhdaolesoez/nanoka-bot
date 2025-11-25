import { SlashCommandBuilder } from 'discord.js';
import { removeNoituChannel, isNoituChannel } from '../modules/noitu/index.js';

export const data = new SlashCommandBuilder()
    .setName('noitu_remove')
    .setDescription('Xóa kênh hiện tại khỏi game nối từ');

export async function execute(interaction) {
    // Check if in DM
    if (!interaction.guild) {
        await interaction.reply({
            content: '❌ Lệnh này chỉ dùng trong kênh server.',
            ephemeral: true
        });
        return;
    }

    const channelId = interaction.channel.id;

    if (isNoituChannel(channelId)) {
        removeNoituChannel(channelId);
        await interaction.reply({
            content: '> **Đã xóa phòng game nối từ và toàn bộ dữ liệu của phòng này.**'
        });
    } else {
        await interaction.reply({
            content: '> **Không thể xóa vì chưa thêm phòng.**'
        });
    }
}
