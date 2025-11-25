import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COUNTING_FILE = join(__dirname, '..', '..', '..', 'data', 'counting_channels.json');

function ensureDataDir() {
    const dataDir = dirname(COUNTING_FILE);
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
}

/**
 * Initialize counting file if it doesn't exist
 */
export function initializeCountingFile() {
    ensureDataDir();
    if (!existsSync(COUNTING_FILE)) {
        try {
            writeFileSync(COUNTING_FILE, JSON.stringify({}, null, 2));
            console.log(`File created: ${COUNTING_FILE} initialized with {}.`);
        } catch (error) {
            console.error(`Error creating file ${COUNTING_FILE}:`, error);
        }
    }
}

/**
 * Load counting channels data from JSON file
 */
export function loadCountingChannels() {
    ensureDataDir();
    
    if (!existsSync(COUNTING_FILE)) {
        return {};
    }

    try {
        const data = readFileSync(COUNTING_FILE, 'utf8');
        if (!data.trim()) {
            return {};
        }
        return JSON.parse(data);
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.log(`Warning: Counting data file found but is empty or corrupt. Starting with empty data: ${COUNTING_FILE}`);
            return {};
        }
        throw error;
    }
}

/**
 * Save counting channels data to JSON file
 */
export function saveCountingChannels(countingData) {
    ensureDataDir();
    writeFileSync(COUNTING_FILE, JSON.stringify(countingData, null, 2));
}

/**
 * Add a channel as counting channel for a guild
 */
export function addCountingChannel(guildId, channelId) {
    const countingData = loadCountingChannels();
    const guildStr = String(guildId);

    if (!countingData[guildStr]) {
        countingData[guildStr] = {
            channel_id: null,
            current_number: 0,
            last_user_id: null,
            high_score: 0,
            total_counts: 0,
            user_stats: {}
        };
    }

    countingData[guildStr].channel_id = channelId;
    saveCountingChannels(countingData);
    return true;
}

/**
 * Get the counting channel for a guild
 */
export function getCountingChannel(guildId) {
    const countingData = loadCountingChannels();
    const guildStr = String(guildId);

    if (countingData[guildStr]) {
        return countingData[guildStr].channel_id;
    }
    return null;
}

/**
 * Check if a channel is the counting channel for a guild
 */
export function isCountingChannel(guildId, channelId) {
    const countingData = loadCountingChannels();
    const guildStr = String(guildId);

    if (countingData[guildStr]) {
        return countingData[guildStr].channel_id === channelId;
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
