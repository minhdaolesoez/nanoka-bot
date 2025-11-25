import { EmbedBuilder } from 'discord.js';
import { loadCountingChannels, saveCountingChannels, isCountingChannel } from './countingSetup.js';

/**
 * Extract the first number from text
 */
function extractFirstNumber(text) {
    const trimmed = text.trim();
    const match = trimmed.match(/^(\d+)/);
    
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

/**
 * Handle messages in counting channels
 */
export async function handleCountingMessage(message) {
    if (!message.guild || message.author.bot) return;
    
    if (!isCountingChannel(message.guild.id, message.channel.id)) return;

    // Load counting data
    const countingData = loadCountingChannels();
    const guildStr = String(message.guild.id);

    if (!countingData[guildStr]) return;

    const guildData = countingData[guildStr];
    const currentNumber = guildData.current_number || 0;
    const lastUserId = guildData.last_user_id;

    // Check for reset phrases first
    if (message.content.trim().toLowerCase() === 'resetnum') {
        // Reset counting
        guildData.current_number = 0;
        guildData.last_user_id = null;
        saveCountingChannels(countingData);

        const embed = new EmbedBuilder()
            .setTitle('🔄 Counting Reset!')
            .setDescription(`Counting has been manually reset by ${message.author}. Next number: **1**`)
            .setColor(0xFFA500)
            .addFields(
                { name: 'Previous Count', value: `${currentNumber}`, inline: true },
                { name: 'High Score', value: `${guildData.high_score || 0}`, inline: true }
            );

        await message.channel.send({ embeds: [embed] });
        return;
    }

    // Extract the first number from the message
    const userNumber = extractFirstNumber(message.content);

    if (userNumber === null) {
        // No valid number found, delete the message and send warning
        try {
            await message.delete();
            const warningMsg = await message.channel.send(
                `❌ ${message.author}, no valid number found! Current number: **${currentNumber + 1}**`
            );
            setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
        } catch (e) {
            // Ignore errors
        }
        return;
    }

    const expectedNumber = currentNumber + 1;
    const correctNumber = userNumber === expectedNumber;
    const sameUser = lastUserId === message.author.id;

    if (correctNumber && !sameUser) {
        // Correct number and different user - success!
        try {
            await message.react('<a:tick:1382402150365397022>').catch(() => 
                message.react('✅').catch(() => {})
            );
        } catch (e) {
            // Ignore reaction errors
        }

        // Update counting data
        guildData.current_number = userNumber;
        guildData.last_user_id = message.author.id;
        guildData.total_counts = (guildData.total_counts || 0) + 1;

        // Update high score
        if (userNumber > (guildData.high_score || 0)) {
            guildData.high_score = userNumber;

            // Celebrate new high score
            if (userNumber % 10 === 0 || userNumber > 50) {
                const embed = new EmbedBuilder()
                    .setTitle('🎉 New High Score!')
                    .setDescription(`Congratulations! The server reached **${userNumber}**!`)
                    .setColor(0xFFD700)
                    .addFields({ name: 'Achievement by', value: `${message.author}`, inline: true });
                await message.channel.send({ embeds: [embed] });
            }
        }

        // Update user stats
        const userStats = guildData.user_stats || {};
        const userIdStr = String(message.author.id);
        if (!userStats[userIdStr]) {
            userStats[userIdStr] = { correct: 0, failed: 0 };
        }
        userStats[userIdStr].correct += 1;
        guildData.user_stats = userStats;

        saveCountingChannels(countingData);

    } else {
        // Wrong number or same user - send warning but don't reset!
        try {
            await message.react('<:no:761520109864747030>').catch(() => 
                message.react('❌').catch(() => {})
            );
        } catch (e) {
            // Ignore reaction errors
        }

        // Create warning message based on the error
        let warningText;
        if (sameUser) {
            warningText = `❌ ${message.author}, you can't count twice in a row! Wait for someone else to count. Current number: **${currentNumber + 1}**`;
        } else {
            warningText = `❌ ${message.author}, wrong number! Expected **${expectedNumber}**, got **${userNumber}**. Current number: **${currentNumber + 1}**`;
        }

        try {
            const warningMsg = await message.channel.send(warningText);
            setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
        } catch (e) {
            // Ignore errors
        }

        // Update user stats (failed attempt)
        const userStats = guildData.user_stats || {};
        const userIdStr = String(message.author.id);
        if (!userStats[userIdStr]) {
            userStats[userIdStr] = { correct: 0, failed: 0 };
        }
        userStats[userIdStr].failed += 1;
        guildData.user_stats = userStats;

        saveCountingChannels(countingData);
    }
}

/**
 * Get counting statistics for a guild or specific user
 */
export function getCountingStats(guildId, user = null) {
    const countingData = loadCountingChannels();
    const guildStr = String(guildId);

    if (!countingData[guildStr]) {
        return null;
    }

    const guildData = countingData[guildStr];

    if (user) {
        // Get stats for specific user
        const userStats = (guildData.user_stats || {})[String(user.id)] || { correct: 0, failed: 0 };
        const total = userStats.correct + userStats.failed;
        return {
            user: user,
            correct: userStats.correct,
            failed: userStats.failed,
            accuracy: total > 0 ? (userStats.correct / total) * 100 : 0
        };
    } else {
        // Get server stats
        return {
            current_number: guildData.current_number || 0,
            high_score: guildData.high_score || 0,
            total_counts: guildData.total_counts || 0,
            user_stats: guildData.user_stats || {}
        };
    }
}
