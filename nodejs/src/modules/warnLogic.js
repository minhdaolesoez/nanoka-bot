import { EmbedBuilder } from 'discord.js';
import { addWarning, getUserWarnings, removeWarnings, loadWarnings, saveWarnings } from './warnings.js';
import { getLogChannel } from './quarantine.js';
import { client } from '../index.js';

// Timeout durations in milliseconds
const TIMEOUT_30_MIN = 30 * 60 * 1000;
const TIMEOUT_3_HOURS = 3 * 60 * 60 * 1000;
const TIMEOUT_7_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Shared logic for warning users
 */
export async function warnUserLogic(user, moderator, reason, guild, responseFunc) {
    // Prevent warning bots or yourself
    if (user.bot) {
        await responseFunc({ content: '❌ You cannot warn bots!' });
        return;
    }

    if (user.id === moderator.id) {
        await responseFunc({ content: '❌ You cannot warn yourself!' });
        return;
    }

    // Add warning to database
    const warningCount = addWarning(user.id, moderator.id, reason, guild.id);

    // Create warning embed
    const embed = new EmbedBuilder()
        .setTitle('⚠️ User Warned')
        .setColor(0xFFA500)
        .setTimestamp()
        .addFields(
            { name: 'User', value: `${user} (${user.tag})`, inline: true },
            { name: 'Moderator', value: `${moderator}`, inline: true },
            { name: 'Warning Count', value: `${warningCount}`, inline: true },
            { name: 'Reason', value: reason, inline: false }
        );

    // Log the warning action
    const logChannelId = getLogChannel(guild.id);
    if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('⚠️ Warning Issued')
                .setColor(0xFFA500)
                .setTimestamp()
                .addFields(
                    { name: 'User', value: `${user} (${user.tag})`, inline: true },
                    { name: 'Moderator', value: `${moderator}`, inline: true },
                    { name: 'Warning Count', value: `${warningCount}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                );
            await logChannel.send({ embeds: [logEmbed] });
        }
    }

    // Auto-timeout and action logic
    let actionTaken = 'Warning issued';
    let timeoutDuration = null;
    let kickUser = false;

    if (warningCount === 2) {
        timeoutDuration = TIMEOUT_30_MIN;
        actionTaken = '⏰ 30 minute timeout applied (2nd warning)';
    } else if (warningCount === 3) {
        timeoutDuration = TIMEOUT_3_HOURS;
        actionTaken = '⏰ 3 hour timeout applied (3rd warning)';
    } else if (warningCount === 4) {
        timeoutDuration = TIMEOUT_7_DAYS;
        actionTaken = '⏰ 7 day timeout applied (4th warning)';
    } else if (warningCount >= 5) {
        kickUser = true;
        actionTaken = '🚫 User kicked (5th warning)';
    }

    // Apply punishment
    const member = guild.members.cache.get(user.id);
    
    if (timeoutDuration && member) {
        try {
            await member.timeout(timeoutDuration, `Auto-timeout: ${warningCount} warnings`);
            embed.addFields({ name: 'Action Taken', value: actionTaken, inline: false });
            embed.setColor(0xFF0000);

            // Log the timeout action
            if (logChannelId) {
                const logChannel = guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const durationStr = warningCount === 2 ? '30 minutes' : 
                                       warningCount === 3 ? '3 hours' : '7 days';
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('⏰ Auto-Timeout Applied')
                        .setColor(0xFF0000)
                        .setTimestamp()
                        .addFields(
                            { name: 'User', value: `${user} (${user.tag})`, inline: true },
                            { name: 'Moderator', value: 'Auto-moderation', inline: true },
                            { name: 'Duration', value: durationStr, inline: true },
                            { name: 'Reason', value: `Auto-timeout: ${warningCount} warnings`, inline: false }
                        );
                    await logChannel.send({ embeds: [timeoutEmbed] });
                }
            }
        } catch (error) {
            embed.addFields({ name: '⚠️ Error', value: 'Could not apply timeout - insufficient permissions', inline: false });
        }
    } else if (kickUser && member) {
        try {
            await member.kick(`Auto-kick: ${warningCount} warnings`);
            embed.addFields({ name: 'Action Taken', value: actionTaken, inline: false });
            embed.setColor(0xFF0000);

            // Log the kick action
            if (logChannelId) {
                const logChannel = guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const kickEmbed = new EmbedBuilder()
                        .setTitle('🚫 Auto-Kick Applied')
                        .setColor(0xFF0000)
                        .setTimestamp()
                        .addFields(
                            { name: 'User', value: `${user} (${user.tag})`, inline: true },
                            { name: 'Moderator', value: 'Auto-moderation', inline: true },
                            { name: 'Reason', value: `Auto-kick: ${warningCount} warnings`, inline: false }
                        );
                    await logChannel.send({ embeds: [kickEmbed] });
                }
            }
        } catch (error) {
            embed.addFields({ name: '⚠️ Error', value: 'Could not kick user - insufficient permissions', inline: false });
        }
    }

    await responseFunc({ embeds: [embed] });
}

/**
 * Shared logic for checking warnings
 */
export async function checkWarningsLogic(user, moderator, responseFunc, ephemeral = false) {
    const warnings = getUserWarnings(user.id);

    const embed = new EmbedBuilder()
        .setTitle(`📋 Warnings for ${user.displayName || user.username}`)
        .setColor(0x0000FF)
        .setTimestamp()
        .setThumbnail(user.displayAvatarURL());

    if (!warnings.length) {
        embed.setDescription('This user has no warnings.');
        embed.setColor(0x00FF00);
    } else {
        embed.setDescription(`Total warnings: **${warnings.length}**`);

        // Show last 5 warnings
        const recentWarnings = warnings.slice(-5);
        for (let i = 0; i < recentWarnings.length; i++) {
            const warning = recentWarnings[i];
            let modName = 'Unknown Moderator';
            try {
                const moderatorUser = await client.users.fetch(warning.moderator_id);
                modName = moderatorUser.displayName || moderatorUser.username;
            } catch (e) {
                // Ignore fetch errors
            }

            const warningTime = new Date(warning.timestamp);
            const timeStr = warningTime.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

            embed.addFields({
                name: `Warning ${warnings.length - recentWarnings.length + i + 1}`,
                value: `**Reason:** ${warning.reason}\n**Moderator:** ${modName}\n**Date:** ${timeStr}`,
                inline: false
            });
        }

        if (warnings.length > 5) {
            embed.setFooter({ text: `Showing latest 5 of ${warnings.length} warnings` });
        }
    }

    await responseFunc({ embeds: [embed], ephemeral });
}

/**
 * Shared logic for removing specific amount of warnings
 */
export async function removeWarningsLogic(user, moderator, guild, amount, responseFunc, ephemeral = false) {
    const { removed, remaining } = removeWarnings(user.id, amount);

    if (removed === 0) {
        const errorMsg = `❌ ${user.displayName || user.username} has no warnings to remove!`;
        await responseFunc({ content: errorMsg, ephemeral });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Warnings Removed')
        .setDescription(`Removed **${removed}** warning(s) from ${user}`)
        .setColor(0xFFFF00)
        .setTimestamp()
        .addFields(
            { name: 'Moderator', value: `${moderator}`, inline: true },
            { name: 'Remaining Warnings', value: `${remaining}`, inline: true }
        );

    // Log the warning removal action
    const logChannelId = getLogChannel(guild.id);
    if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🗑️ Warnings Removed')
                .setColor(0xFFFF00)
                .setTimestamp()
                .addFields(
                    { name: 'User', value: `${user} (${user.tag})`, inline: true },
                    { name: 'Moderator', value: `${moderator}`, inline: true },
                    { name: 'Removed', value: `${removed}`, inline: true },
                    { name: 'Remaining', value: `${remaining}`, inline: true }
                );
            await logChannel.send({ embeds: [logEmbed] });
        }
    }

    await responseFunc({ embeds: [embed], ephemeral });
}

/**
 * Shared logic for clearing warnings
 */
export async function clearWarningsLogic(user, moderator, guild, responseFunc, ephemeral = false) {
    const warningsData = loadWarnings();
    const userIdStr = String(user.id);

    if (!warningsData[userIdStr] || !warningsData[userIdStr].length) {
        const errorMsg = `❌ ${user.displayName || user.username} has no warnings to clear!`;
        await responseFunc({ content: errorMsg, ephemeral });
        return;
    }

    const oldCount = warningsData[userIdStr].length;
    warningsData[userIdStr] = [];
    saveWarnings(warningsData);

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Warnings Cleared')
        .setDescription(`Cleared **${oldCount}** warning(s) for ${user}`)
        .setColor(0x00FF00)
        .setTimestamp()
        .addFields({ name: 'Moderator', value: `${moderator}`, inline: true });

    // Log the warning clearing action
    const logChannelId = getLogChannel(guild.id);
    if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🗑️ Warnings Cleared')
                .setColor(0x00FF00)
                .setTimestamp()
                .addFields(
                    { name: 'User', value: `${user} (${user.tag})`, inline: true },
                    { name: 'Moderator', value: `${moderator}`, inline: true },
                    { name: 'Cleared', value: `${oldCount}`, inline: true }
                );
            await logChannel.send({ embeds: [logEmbed] });
        }
    }

    await responseFunc({ embeds: [embed], ephemeral });
}

/**
 * Shared logic for removing timeouts
 */
export async function removeTimeoutLogic(user, moderator, responseFunc, ephemeral = false) {
    const member = moderator.guild.members.cache.get(user.id);
    
    if (!member || !member.communicationDisabledUntil) {
        const errorMsg = `❌ ${user.displayName || user.username} is not currently timed out!`;
        await responseFunc({ content: errorMsg, ephemeral });
        return;
    }

    try {
        await member.timeout(null, `Timeout removed by ${moderator.tag}`);

        const embed = new EmbedBuilder()
            .setTitle('⏰ Timeout Removed')
            .setDescription(`Timeout removed for ${user}`)
            .setColor(0x00FF00)
            .setTimestamp()
            .addFields(
                { name: 'Moderator', value: `${moderator}`, inline: true },
                { name: 'User', value: `${user} (${user.tag})`, inline: true }
            );

        // Log the timeout removal action
        const logChannelId = getLogChannel(moderator.guild.id);
        if (logChannelId) {
            const logChannel = moderator.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('⏰ Timeout Removed')
                    .setColor(0x00FF00)
                    .setTimestamp()
                    .addFields(
                        { name: 'User', value: `${user} (${user.tag})`, inline: true },
                        { name: 'Moderator', value: `${moderator}`, inline: true },
                        { name: 'Reason', value: `Timeout removed by ${moderator.tag}`, inline: false }
                    );
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        await responseFunc({ embeds: [embed], ephemeral });

    } catch (error) {
        if (error.code === 50013) {
            await responseFunc({ content: "❌ Could not remove timeout - insufficient permissions!", ephemeral });
        } else {
            await responseFunc({ content: `❌ Failed to remove timeout: ${error.message}`, ephemeral });
        }
    }
}
