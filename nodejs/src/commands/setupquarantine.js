import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { setupQuarantineChannel } from '../modules/channels.js';
import { addQuarantineChannel } from '../modules/quarantine.js';

export const data = new SlashCommandBuilder()
    .setName('setupquarantine')
    .setDescription('Setup quarantine channel (auto-bans non-moderators who post)')
    .addBooleanOption(option =>
        option.setName('current')
            .setDescription('Use current channel as honeypot instead of creating new one')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('category')
            .setDescription('The category name for the new channel (only if creating new)')
            .setRequired(false));

export async function execute(interaction) {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
        !interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        await interaction.reply({
            content: "❌ You need 'Manage Channels' and 'Ban Members' permissions to set up a quarantine channel!",
            ephemeral: true
        });
        return;
    }

    const useCurrent = interaction.options.getBoolean('current') || false;

    if (useCurrent) {
        // Setup current channel as honeypot
        const currentChannel = interaction.channel;

        // Check if bot has required permissions
        const botPermissions = currentChannel.permissionsFor(interaction.guild.members.me);
        if (!botPermissions.has(PermissionFlagsBits.BanMembers) ||
            !botPermissions.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({
                content: "❌ I need 'Ban Members' and 'Manage Messages' permissions in this channel!",
                ephemeral: true
            });
            return;
        }

        try {
            // Add channel to quarantine/honeypot database
            const added = addQuarantineChannel(interaction.guild.id, currentChannel.id);

            if (!added) {
                await interaction.reply({
                    content: "⚠️ This channel is already set up as a honeypot!",
                    ephemeral: true
                });
                return;
            }

            // Create warning message in the channel
            const warningEmbed = new EmbedBuilder()
                .setTitle('🍯 HONEYPOT ACTIVE - WARNING 🍯')
                .setDescription("**This channel is now a honeypot. Do not send messages here unless you're a moderator.**")
                .setColor(0xFF6B00)
                .addFields(
                    { name: '⚠️ Automatic Ban Warning', value: 'Any non-moderator who sends a message here will be **automatically banned**!', inline: false },
                    { name: 'Purpose', value: 'This honeypot is used to catch and remove raiders, bots, and rule violators.', inline: false }
                )
                .setFooter({ text: `Honeypot activated by ${interaction.user.tag}` })
                .setTimestamp();

            await currentChannel.send({ embeds: [warningEmbed] });

            // Success message to the moderator
            const successEmbed = new EmbedBuilder()
                .setTitle('🍯 Honeypot Setup Complete')
                .setDescription(`Successfully set up ${currentChannel} as a honeypot. Non-moderators posting here will be automatically banned.`)
                .setColor(0x00FF00)
                .setTimestamp()
                .addFields(
                    { name: 'Channel', value: `${currentChannel}`, inline: true },
                    { name: 'Moderator', value: `${interaction.user}`, inline: true }
                );

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error setting up honeypot:', error);
            await interaction.reply({
                content: "❌ An error occurred while setting up the honeypot!",
                ephemeral: true
            });
        }
    } else {
        // Create new quarantine channel (original behavior)
        const categoryName = interaction.options.getString('category') || 'Moderation';

        await setupQuarantineChannel(
            interaction.guild,
            interaction.user,
            (options) => interaction.reply(options),
            categoryName,
            true
        );
    }
}
