import { SlashCommandBuilder } from 'discord.js';
import { getUserStats } from '../modules/noitu/index.js';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Xem thống kê nối từ hiện tại');

export async function execute(interaction) {
    const userId = interaction.user.id;
    const isDM = !interaction.guild;
    const channelId = isDM ? null : interaction.channel.id;

    const stats = getUserStats(channelId, userId, isDM);

    const heading = isDM 
        ? `Thống kê của ${interaction.user}` 
        : `Thống kê của ${interaction.user} trong kênh này`;
    
    const statsText = `> Chuỗi hiện tại: **${stats.currentStreak}** | Cao nhất: **${stats.bestStreak}** | Thắng: **${stats.wins}**`;

    await interaction.reply({
        content: `${heading}\n${statsText}`
    });

    if (stats.word) {
        await interaction.channel.send(`Từ hiện tại: **${stats.word}**`);
    }
}
