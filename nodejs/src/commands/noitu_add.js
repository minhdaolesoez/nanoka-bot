import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { addNoituChannel, resetChannelGame } from '../modules/noitu/index.js';

export const data = new SlashCommandBuilder()
    .setName('noitu_add')
    .setDescription('Thêm kênh hiện tại vào game nối từ');

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
    const added = addNoituChannel(channelId);

    if (added) {
        const newWord = resetChannelGame(channelId);
        await interaction.reply({
            content: `> **Đã thêm phòng game nối từ, bot sẽ trả lời mọi tin nhắn từ phòng này!**\n\n🎮 **Game mới đã bắt đầu!**\nTừ hiện tại: **${newWord}**`
        });
    } else {
        await interaction.reply({
            content: '> **Phòng hiện tại đã có trong cơ sở dữ liệu!**'
        });
    }
}
