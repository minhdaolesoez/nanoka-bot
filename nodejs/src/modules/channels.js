import { EmbedBuilder, PermissionOverwrites, ChannelType, PermissionFlagsBits } from 'discord.js';
import { addQuarantineChannel, setLogChannel } from './quarantine.js';

/**
 * Setup quarantine channel with proper permissions
 */
export async function setupQuarantineChannel(guild, moderator, responseFunc, categoryName = 'Moderation', ephemeral = false) {
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
        const quarantineChannel = await guild.channels.create({
            name: 'quarantine-zone',
            type: ChannelType.GuildText,
            parent: category.id,
            topic: 'Quarantine channel. Any non-moderator who sends a message here will be automatically banned.',
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone
                    deny: [
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.CreatePublicThreads,
                        PermissionFlagsBits.CreatePrivateThreads,
                        PermissionFlagsBits.SendMessagesInThreads,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.AddReactions,
                        PermissionFlagsBits.UseApplicationCommands,
                    ],
                    allow: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: guild.members.me.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.ManageMessages,
                    ],
                },
            ],
        });

        // Add channel to database
        addQuarantineChannel(guild.id, quarantineChannel.id);

        // Create warning message
        const warningEmbed = new EmbedBuilder()
            .setTitle('⚠️ QUARANTINE ZONE - WARNING ⚠️')
            .setDescription("**This is a quarantine channel. Do not send messages here unless you're a moderator.**")
            .setColor(0xFF0000)
            .addFields(
                { name: '⚠️ Automatic Ban Warning', value: 'Any non-moderator who sends a message here will be **automatically banned**!', inline: false },
                { name: 'Purpose', value: 'This channel is used by moderators to segregate problematic content and ban violators.', inline: false }
            )
            .setFooter({ text: `Channel created by ${moderator.tag}` });

        await quarantineChannel.send({ embeds: [warningEmbed] });

        // Success message
        const embed = new EmbedBuilder()
            .setTitle('🚫 Quarantine Channel Setup Complete')
            .setDescription(`Successfully set up quarantine channel: ${quarantineChannel}. Non-moderators posting here will be banned.`)
            .setColor(0xFF0000)
            .setTimestamp()
            .addFields({ name: 'Moderator', value: `${moderator}`, inline: true });

        await responseFunc({ embeds: [embed], ephemeral });
        return quarantineChannel;

    } catch (error) {
        const errorMsg = "❌ I don't have permission to create or configure the quarantine channel!";
        await responseFunc({ content: errorMsg, ephemeral });
        return null;
    }
}

/**
 * Setup log channel with proper permissions
 */
export async function setupLogChannel(guild, moderator, responseFunc, categoryName = 'Moderation', ephemeral = false) {
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
        const logChannel = await guild.channels.create({
            name: 'mod-logs',
            type: ChannelType.GuildText,
            parent: category.id,
            topic: 'Moderation logs channel. All moderation actions are recorded here. Visible to everyone, read-only.',
            permissionOverwrites: [
                {
                    id: guild.id, // @everyone
                    deny: [
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.CreatePublicThreads,
                        PermissionFlagsBits.CreatePrivateThreads,
                        PermissionFlagsBits.SendMessagesInThreads,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.AddReactions,
                        PermissionFlagsBits.UseApplicationCommands,
                    ],
                    allow: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: guild.members.me.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.AttachFiles,
                    ],
                },
            ],
        });

        // Set as log channel in database
        setLogChannel(guild.id, logChannel.id);

        // Success message
        const embed = new EmbedBuilder()
            .setTitle('📝 Log Channel Setup Complete')
            .setDescription(`Successfully set up log channel: ${logChannel}. It is visible to everyone (read-only).`)
            .setColor(0x0000FF)
            .setTimestamp()
            .addFields(
                { name: 'Moderator', value: `${moderator}`, inline: true },
                { name: 'Information', value: 'All moderation actions will be logged in this channel.', inline: false }
            );

        await responseFunc({ embeds: [embed], ephemeral });
        return logChannel;

    } catch (error) {
        const errorMsg = "❌ I don't have permission to create or configure the log channel!";
        await responseFunc({ content: errorMsg, ephemeral });
        return null;
    }
}
