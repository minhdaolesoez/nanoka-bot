import { EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { createStore } from '../utils/database.js';

// Create store with caching and debounced writes
const store = createStore('counting_channels', {});

/**
 * Initialize counting file (no-op, handled by store)
 */
export function initializeCountingFile() {
    // No-op: store handles initialization automatically
}

/**
 * Load counting channels data (returns cached data)
 */
export function loadCountingChannels() {
    return store.data;
}

/**
 * Save counting channels data (schedules debounced write)
 */
export function saveCountingChannels() {
    store.save();
}

/**
 * Ensure guild data structure exists
 */
function ensureGuildData(guildId) {
    const guildStr = String(guildId);
    
    if (!store.data[guildStr]) {
        store.data[guildStr] = {
            channel_id: null,
            current_number: 0,
            last_user_id: null,
            high_score: 0,
            total_counts: 0,
            user_stats: {}
        };
    }
    
    return store.data[guildStr];
}

/**
 * Add a channel as counting channel for a guild
 */
export function addCountingChannel(guildId, channelId) {
    const guildData = ensureGuildData(guildId);
    guildData.channel_id = channelId;
    store.save();
    return true;
}

/**
 * Get the counting channel for a guild
 */
export function getCountingChannel(guildId) {
    const guildStr = String(guildId);

    if (store.data[guildStr]) {
        return store.data[guildStr].channel_id;
    }
    return null;
}

/**
 * Check if a channel is the counting channel for a guild
 */
export function isCountingChannel(guildId, channelId) {
    const guildStr = String(guildId);

    if (store.data[guildStr]) {
        return store.data[guildStr].channel_id === channelId;
    }
    return false;
}

/**
 * Setup counting channel with proper permissions
 */
export async function setupCountingChannel(guild, moderator, responseFunc, categoryName = 'Fun', ephemeral = false) {
    // Check permissions
    if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const errorMsg = "❌ I don't have permission to create channels!";
        await responseFunc({ content: errorMsg, ephemeral });
        return null;
    }

    // Find or create category
    let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
        try {
            category = await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
            });
        } catch (error) {
            const errorMsg = "❌ I don't have permission to create categories!";
            await responseFunc({ content: errorMsg, ephemeral });
            return null;
        }
    }

    try {
        const countingChannel = await guild.channels.create({
            name: 'counting',
            type: ChannelType.GuildText,
            parent: category.id,
            topic: "Count numbers in order! Start with 1. Don't count twice in a row!",
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone
                    deny: [
                        PermissionFlagsBits.CreatePublicThreads,
                        PermissionFlagsBits.CreatePrivateThreads,
                        PermissionFlagsBits.SendMessagesInThreads,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.AddReactions,
                        PermissionFlagsBits.UseApplicationCommands,
                    ],
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                    ],
                },
                {
                    id: guild.members.me.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.AddReactions,
                    ],
                },
            ],
        });

        // Add channel to database
        addCountingChannel(guild.id, countingChannel.id);

        // Create initial message
        const initialEmbed = new EmbedBuilder()
            .setTitle('🔢 Counting Channel')
            .setDescription("Welcome to the counting channel! Here's how it works:")
            .setColor(0x0000FF)
            .addFields(
                { name: '📋 Rules', value: "• Count in order starting from 1\n• Don't count twice in a row\n• Numbers can have text/symbols after them\n• Use 'resetnum' to manually reset", inline: false },
                { name: '🎯 Goal', value: 'Try to reach the highest number possible as a server!', inline: false }
            )
            .setFooter({ text: `Channel created by ${moderator.tag} • Start counting with '1'!` });

        await countingChannel.send({ embeds: [initialEmbed] });

        // Success message
        const embed = new EmbedBuilder()
            .setTitle('🔢 Counting Channel Setup Complete')
            .setDescription(`Successfully set up counting channel: ${countingChannel}`)
            .setColor(0x00FF00)
            .setTimestamp()
            .addFields(
                { name: 'Moderator', value: `${moderator}`, inline: true },
                { name: 'Next Number', value: '1', inline: true }
            );

        await responseFunc({ embeds: [embed], ephemeral });
        return countingChannel;

    } catch (error) {
        const errorMsg = "❌ I don't have permission to create or configure the counting channel!";
        await responseFunc({ content: errorMsg, ephemeral });
        return null;
    }
}

/**
 * Setup counting in an existing channel
 */
export async function setupCountingInExistingChannel(channel, moderator, responseFunc, ephemeral = false) {
    // Check permissions
    if (!channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        const errorMsg = "❌ I don't have permission to manage messages in that channel!";
        await responseFunc({ content: errorMsg, ephemeral });
        return null;
    }

    if (!channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.AddReactions)) {
        const errorMsg = "❌ I don't have permission to add reactions in that channel!";
        await responseFunc({ content: errorMsg, ephemeral });
        return null;
    }

    try {
        // Add channel to database
        addCountingChannel(channel.guild.id, channel.id);

        // Create initial message
        const initialEmbed = new EmbedBuilder()
            .setTitle('🔢 Counting Channel Setup')
            .setDescription("This channel has been set up for counting! Here's how it works:")
            .setColor(0x0000FF)
            .addFields(
                { name: '📋 Rules', value: "• Count in order starting from 1\n• Don't count twice in a row\n• Numbers can have text/symbols after them\n• Use 'resetnum' to manually reset", inline: false },
                { name: '🎯 Goal', value: 'Try to reach the highest number possible as a server!', inline: false }
            )
            .setFooter({ text: `Channel configured by ${moderator.tag} • Start counting with '1'!` });

        await channel.send({ embeds: [initialEmbed] });

        // Success message
        const embed = new EmbedBuilder()
            .setTitle('🔢 Counting Setup Complete')
            .setDescription(`Successfully set up counting in ${channel}`)
            .setColor(0x00FF00)
            .setTimestamp()
            .addFields(
                { name: 'Moderator', value: `${moderator}`, inline: true },
                { name: 'Channel', value: `${channel}`, inline: true },
                { name: 'Next Number', value: '1', inline: true }
            );

        await responseFunc({ embeds: [embed], ephemeral });
        return channel;

    } catch (error) {
        const errorMsg = `❌ Failed to setup counting in that channel: ${error.message}`;
        await responseFunc({ content: errorMsg, ephemeral });
        return null;
    }
}
