import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPlayerStats } from '../modules/wordchain/index.js';

export const data = new SlashCommandBuilder()
    .setName('wc_stats')
    .setDescription('View Word Chain statistics')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('User to view stats for (leave empty for yourself)')
            .setRequired(false));

export async function execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const stats = getPlayerStats(targetUser.id);

    const winRate = stats.gamesPlayed > 0 
        ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) 
        : 0;

    const avgPoints = stats.gamesPlayed > 0
        ? (stats.totalPoints / stats.gamesPlayed).toFixed(1)
        : 0;

    const embed = new EmbedBuilder()
        .setTitle(`📊 Word Chain Stats`)
        .setDescription(`Statistics for **${targetUser.displayName}**`)
        .addFields(
            { name: '🎮 Games Played', value: `${stats.gamesPlayed}`, inline: true },
            { name: '🏆 Games Won', value: `${stats.gamesWon}`, inline: true },
            { name: '📈 Win Rate', value: `${winRate}%`, inline: true },
            { name: '📝 Total Words', value: `${stats.totalWords}`, inline: true },
            { name: '⭐ Total Points', value: `${stats.totalPoints}`, inline: true },
            { name: '🔥 Best Streak', value: `${stats.bestStreak}`, inline: true },
            { name: '📊 Avg Points/Game', value: `${avgPoints}`, inline: true }
        )
        .setColor(0x5865F2)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
