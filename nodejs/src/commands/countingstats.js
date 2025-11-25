import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getCountingStats } from '../modules/countingLogic.js';

export const data = new SlashCommandBuilder()
    .setName('countingstats')
    .setDescription('View counting statistics')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('View stats for a specific user')
            .setRequired(false));

export async function execute(interaction) {
    const user = interaction.options.getUser('user');

    if (user) {
        // Get user-specific stats
        const stats = getCountingStats(interaction.guild.id, user);
        if (!stats) {
            await interaction.reply({
                content: '❌ No counting channel set up for this server!',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🔢 Counting Stats for ${user.displayName || user.username}`)
            .setColor(0x0000FF)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '✅ Correct', value: `${stats.correct}`, inline: true },
                { name: '❌ Failed', value: `${stats.failed}`, inline: true },
                { name: '🎯 Accuracy', value: `${stats.accuracy.toFixed(1)}%`, inline: true }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        // Get server stats
        const stats = getCountingStats(interaction.guild.id);
        if (!stats) {
            await interaction.reply({
                content: '❌ No counting channel set up for this server!',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🔢 Server Counting Stats')
            .setColor(0x0000FF)
            .addFields(
                { name: '🔢 Current Number', value: `${stats.current_number}`, inline: true },
                { name: '🏆 High Score', value: `${stats.high_score}`, inline: true },
                { name: '📊 Total Counts', value: `${stats.total_counts}`, inline: true }
            );

        // Show top 5 counters
        const userStats = stats.user_stats;
        if (userStats && Object.keys(userStats).length > 0) {
            const sortedUsers = Object.entries(userStats)
                .sort((a, b) => b[1].correct - a[1].correct)
                .slice(0, 5);

            let leaderboard = '';
            for (let i = 0; i < sortedUsers.length; i++) {
                const [userId, userData] = sortedUsers[i];
                const member = interaction.guild.members.cache.get(userId);
                const userName = member ? member.displayName : 'Unknown User';
                leaderboard += `${i + 1}. ${userName}: ${userData.correct} correct\n`;
            }

            if (leaderboard) {
                embed.addFields({ name: '🏅 Top Counters', value: leaderboard, inline: false });
            }
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
